from pathlib import Path
import subprocess,json,hashlib,statistics
from PIL import Image,ImageOps,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'outputs/sapien-performance-refined';FF='/opt/homebrew/bin/ffmpeg';FP='/opt/homebrew/bin/ffprobe'
m=json.loads((O/'render-manifest.json').read_text());frames=m['frames']
assert len(frames)==240 and sorted(x['frame']for x in frames)==list(range(37,277))
assert len(set(x['pngSHA256']for x in frames))==240
assert len(m['chunks'])==20
lst=O/'chunks/concat.txt';lst.write_text('\n'.join("file '%02d.mp4'"%i for i in range(20))+'\n')
movie=O/'public/media/character-performance.mp4';temp=movie.with_name('character-performance.tmp.mp4')
subprocess.run([FF,'-y','-v','error','-f','concat','-safe','0','-i',str(lst),'-i',str(O/'sound-design.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-af','volume=2.2','-movflags','+faststart','-t','10',str(temp)],check=True)
subprocess.run([FF,'-v','error','-i',str(temp),'-f','null','-'],check=True)
probe=json.loads(subprocess.check_output([FP,'-v','error','-count_frames','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration,sample_rate:format=duration,size','-of','json',str(temp)]))
v=next(s for s in probe['streams']if s.get('width'))
assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_read_frames']))==(1920,1080,'24/1',240)
temp.replace(movie)
Image.open(O/'stills/frame-0248.png').convert('RGB').save(O/'public/media/hero.jpg',quality=94)
# All panels are actual frames from the final rendered scene, not concept art.
canvas=Image.new('RGB',(1800,392),'#ece8de');font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',18);d=ImageDraw.Draw(canvas)
for i,(f,label)in enumerate([(49,'01  The two amounts'),(155,'02  Move the offer aside'),(248,'03  Look up across the counter')]):
 im=Image.open(O/('stills/frame-%04d.png'%f)).convert('RGB');im=im.resize((600,338),Image.Resampling.LANCZOS);canvas.paste(im,(i*600,0));d.text((i*600+18,357),label,fill='#30372e',font=font)
canvas.save(O/'evidence/sequence-frames.jpg',quality=94)
audit={'kind':'Pre-rendered 3D movie, not a real-time scene','sourceSceneSHA256':m['sceneSHA256'],'sourceFrames':240,'uniqueSourceFrameHashes':240,'renderResolution':[1920,1080],'renderFPS':24,'durationSeconds':10,'fullDecode':'passed','movieSHA256':hashlib.sha256(movie.read_bytes()).hexdigest(),'probe':probe,'meanRenderSecondsPerFrame':round(statistics.mean(x['seconds']for x in frames),3)}
if m.get('handRefinement'):
 audit['baselineSceneSHA256']=m['baselineSceneSHA256'];audit['handRefinement']=m['handRefinement']
(O/'movie-verification.json').write_text(json.dumps(audit,indent=2));print(json.dumps(audit,indent=2))
