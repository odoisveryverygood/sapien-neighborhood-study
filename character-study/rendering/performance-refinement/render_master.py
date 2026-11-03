"""Render true 1080p frames and stream them into short resumable H.264 chunks.
Only one temporary PNG is stored, avoiding hundreds of megabytes of frame cache.
"""
import bpy,pathlib,subprocess,json,hashlib,time,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-refined';WORK=ROOT/'rendering/performance-refinement';FF='/opt/homebrew/bin/ffmpeg';PROBE='/opt/homebrew/bin/ffprobe';CH=OUT/'chunks';CH.mkdir(exist_ok=True)
src=OUT/'review-scene.blend';hh=hashlib.sha256()
with src.open('rb')as f:
 for block in iter(lambda:f.read(1024*1024),b''):hh.update(block)
scene_hash=hh.hexdigest();manifest_path=OUT/'render-manifest.json'
if manifest_path.exists():
 manifest=json.loads(manifest_path.read_text())
 if manifest['sceneSHA256']!=scene_hash:raise RuntimeError('Scene changed; do not reuse previous chunks')
else:manifest={'sceneSHA256':scene_hash,'width':1920,'height':1080,'fps':24,'sourceFrames':[37,276],'frames':[],'chunks':[]}
bpy.ops.wm.open_mainfile(filepath=str(src));s=bpy.context.scene;cloth=next(m for m in bpy.data.objects['Shirt'].modifiers if m.type=='CLOTH')
if not cloth.point_cache.is_baked:raise RuntimeError('Cloth cache was not retained')
s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.cycles.use_auto_tile=False;s.render.use_persistent_data=True;s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=20;s.render.filepath=str(WORK/'current-frame.png')
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.metalrt='ON';p.get_devices()
for d in p.devices:d.use=d.type=='METAL'
s.cycles.device='GPU';s.cycles.max_bounces=7;s.cycles.transparent_max_bounces=12
label=str(WORK/'review-label.png')
def count_frames(file):
 try:
  d=json.loads(subprocess.check_output([PROBE,'-v','error','-select_streams','v:0','-show_entries','stream=nb_frames','-of','json',str(file)]));return int(d['streams'][0]['nb_frames'])
 except Exception:return 0
for chunk in [17,18,19,7,8,9,10,11,12,13,14,15,16,0,1,2,3,4,5,6]:
 dest=CH/f'{chunk:02}.mp4';start=37+chunk*12;stop=start+12
 if dest.exists()and count_frames(dest)==12 and sum(start<=r['frame']<stop for r in manifest['frames'])==12:continue
 manifest['frames']=[r for r in manifest['frames']if not(start<=r['frame']<stop)];manifest['chunks']=[r for r in manifest['chunks']if r['chunk']!=chunk]
 proc=subprocess.Popen([FF,'-y','-v','error','-f','image2pipe','-vcodec','png','-framerate','24','-i','pipe:0','-i',label,'-filter_complex','[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]','-map','[v]','-an','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-g','24','-threads','2','-movflags','+faststart',str(dest)],stdin=subprocess.PIPE)
 try:
  for f in range(start,stop):
   s.frame_set(f);now=time.time();bpy.ops.render.render(write_still=True);data=(WORK/'current-frame.png').read_bytes();proc.stdin.write(data);manifest['frames'].append({'frame':f,'videoTime':(f-37)/24,'seconds':round(time.time()-now,3),'pngSHA256':hashlib.sha256(data).hexdigest()})
   if f in [37,49,79,100,125,155,180,210,235,248,259,276]:(OUT/'stills'/f'frame-{f:04}.png').write_bytes(data)
   manifest_path.write_text(json.dumps(manifest,indent=2));print('MASTER_FRAME',f-36,240,round(time.time()-now,2),flush=True)
  proc.stdin.close()
  if proc.wait()!=0 or count_frames(dest)!=12:raise RuntimeError('Chunk encoding failed')
 except BaseException:
  if proc.stdin and not proc.stdin.closed:proc.stdin.close()
  proc.wait();raise
 manifest['chunks'].append({'chunk':chunk,'file':str(dest),'frames':12});manifest_path.write_text(json.dumps(manifest,indent=2));print('MASTER_CHUNK',chunk+1,20,flush=True)
 if '--one-chunk' in sys.argv:break
print('MASTER_RENDER_COMPLETE'if len(manifest['frames'])==240 and len(manifest['chunks'])==20 else'MASTER_BATCH_COMPLETE',len(manifest['frames']),flush=True)
