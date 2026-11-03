"""Composite the physically re-rendered lower half over the baseline movie.

The face, torso animation and cloth are unchanged. A feather at the unchanged
chest boundary avoids a codec/denoising seam; the hand and its shadows are fully
inside the opaque region. Keep the baseline movie and original four chunks.
"""
from pathlib import Path
import json,subprocess,hashlib,shutil,io
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/'outputs/sapien-performance-refined';W=R/'rendering/performance-refinement'
FF='/opt/homebrew/bin/ffmpeg';FP='/opt/homebrew/bin/ffprobe';movie=O/'public/media/character-performance.mp4'
baseline=W/'baseline-master.mp4'
if not baseline.exists():shutil.copyfile(movie,baseline)
backup=W/'baseline-chunks';backup.mkdir(exist_ok=True)
mp=O/'render-manifest.json';baseline_manifest=W/'baseline-render-manifest.json'
if not baseline_manifest.exists():shutil.copyfile(mp,baseline_manifest)
m=json.loads(baseline_manifest.read_text());refinement=json.loads((O/'hand-refinement.json').read_text())
decoder=subprocess.Popen([FF,'-v','error','-ss','5.5','-i',str(baseline),'-map','0:v:0','-an','-sn','-frames:v','48','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
label=Image.open(W/'review-label.png').convert('RGBA');records=[]
def read_exact(n):
 data=bytearray()
 while len(data)<n:
  part=decoder.stdout.read(n-len(data))
  if not part:raise RuntimeError('Baseline decoder ended early')
  data.extend(part)
 return bytes(data)
for chunk in range(11,15):
 dest=O/'chunks'/f'{chunk:02}.mp4';temp=dest.with_name(f'{chunk:02}.hand.tmp.mp4')
 if not(backup/dest.name).exists():shutil.copyfile(dest,backup/dest.name)
 encoder=subprocess.Popen([FF,'-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','15','-pix_fmt','yuv420p','-g','24','-threads','2','-movflags','+faststart',str(temp)],stdin=subprocess.PIPE)
 try:
  for f in range(37+chunk*12,49+chunk*12):
   base=Image.frombytes('RGB',(1920,1080),read_exact(1920*1080*3))
   p=O/'hand-patches'/f'{f:04}.png';patch=Image.open(p).convert('RGB');w,h=patch.size
   if w!=1920 or not(550<=h<=570):raise RuntimeError('Unexpected render-border dimensions')
   alpha=Image.new('L',(1920,h),255);gradient=Image.new('L',(1,32));gradient.putdata([round(255*i/32)for i in range(32)]);alpha.paste(gradient.resize((1920,32)),(0,0))
   base.paste(patch,(0,1080-h),alpha)
   im=Image.alpha_composite(base.convert('RGBA'),label).convert('RGB')
   raw=im.tobytes();encoder.stdin.write(raw)
   buf=io.BytesIO();im.save(buf,format='PNG',compress_level=1);png=buf.getvalue()
   row=next(r for r in m['frames']if r['frame']==f);row['baselinePNGHash']=row['pngSHA256'];row['pngSHA256']=hashlib.sha256(png).hexdigest();row['handPatchSHA256']=hashlib.sha256(p.read_bytes()).hexdigest();row['sourceKind']='Baseline with physically rendered lower-half refinement'
   if f in [180,195,210]:(O/'stills'/f'frame-{f:04}.png').write_bytes(png)
   records.append({'frame':f,'patchHeight':h,'compositeSHA256':row['pngSHA256']})
  encoder.stdin.close()
  if encoder.wait()!=0:raise RuntimeError('Refined chunk encoding failed')
 except BaseException:
  if not encoder.stdin.closed:encoder.stdin.close()
  encoder.wait();raise
 probe=json.loads(subprocess.check_output([FP,'-v','error','-show_entries','stream=nb_frames','-of','json',str(temp)]))
 if int(probe['streams'][0]['nb_frames'])!=12:raise RuntimeError('Wrong refined chunk frame count')
 temp.replace(dest)
if decoder.wait()!=0:raise RuntimeError('Baseline decoding failed')
m['baselineSceneSHA256']=m['sceneSHA256'];m['sceneSHA256']=refinement['refinedSceneSHA256'];m['handRefinement']={'frames':[169,216],'method':'Physical region re-render composited over baseline; unchanged face, arm trajectory and cached cloth','featherPixels':32,'baselineMovieSHA256':hashlib.sha256(baseline.read_bytes()).hexdigest()}
mp.write_text(json.dumps(m,indent=2));(O/'hand-composite-audit.json').write_text(json.dumps({'frames':records,'baselinePreserved':str(baseline),'chunks':[11,12,13,14]},indent=2))
print('HAND_COMPOSITE_COMPLETE',len(records))
