"""Refine the airborne hand only; keep the validated arm and garment motion.

Run after the baseline master has finished. Render a physical lower-half patch
for the four affected chunks, rather than spending another hour on the face.
"""
import bpy,pathlib,math,json,hashlib,sys,shutil
from mathutils import Vector,Matrix,Quaternion
R=pathlib.Path(__file__).resolve().parents[2];O=R/'outputs/sapien-performance-refined'
bpy.ops.wm.open_mainfile(filepath=str(O/'review-scene.blend'))
s=bpy.context.scene;original_rig=bpy.data.objects['Performance body rig'];shirt=bpy.data.objects['Shirt']
names=['mixamorig:RightHand']+['mixamorig:RightHand'+f+str(n)for f in ['Index','Middle','Ring','Pinky']for n in [1,2,3]]
before=hashlib.sha256((O/'review-scene.blend').read_bytes()).hexdigest()
audit_path=O/'hand-refinement.json'
previous=json.loads(audit_path.read_text())if audit_path.exists()else None
if previous and before!=previous['refinedSceneSHA256']:raise RuntimeError('Hand refinement source changed; inspect before resuming')
body=bpy.data.objects['cm_vitruvian']
if previous:
 rig=bpy.data.objects['Hand performance rig']
else:
 # Separate animation consumers: only the visible skin gets the hand refinement.
 # Garment, collision body, head and hair retain the original validated rig.
 rig=original_rig.copy();rig.data=original_rig.data.copy();rig.name='Hand performance rig';s.collection.objects.link(rig)
 rig.animation_data.action=original_rig.animation_data.action.copy()
 next(m for m in body.modifiers if m.type=='ARMATURE').object=rig
if any(m.type=='ARMATURE'and m.object==rig for m in shirt.modifiers):raise RuntimeError('Garment is linked to the refined skin rig')
collider=bpy.data.objects['Complete body collision']
if any(m.type=='ARMATURE'and m.object==rig for m in collider.modifiers):raise RuntimeError('Collision body is linked to the refined skin rig')
cloth=next(m for m in shirt.modifiers if m.type=='CLOTH')
if not cloth.point_cache.is_baked:raise RuntimeError('Missing baked cloth')
def smooth(x):
 x=max(0,min(1,x));return x*x*x*(10+x*(-15+6*x))
def rotate_world(b,axis,angle):
 w=rig.matrix_world@b.matrix;p=w.translation
 b.matrix=rig.matrix_world.inverted()@Matrix.Translation(p)@Quaternion(axis,angle).to_matrix().to_4x4()@Matrix.Translation(-p)@w
 bpy.context.view_layer.update()
samples=[]
for f in range(169,217):
 if previous:break
 s.frame_set(f);t=(f-37)/24
 envelope=smooth((t-5.85)/.35)*(1-smooth((t-6.85)/.50))
 if envelope<=0:continue
 b=rig.pose.bones['mixamorig:RightHand'];along=(rig.matrix_world.to_3x3()@b.matrix.to_3x3().col[1]).normalized()
 rotate_world(b,along,.055*envelope)
 for finger,scale in [('Index',.86),('Middle',1),('Ring',1.08),('Pinky',1.13)]:
  for n,amount in [(1,.10),(2,.22),(3,.08)]:
   b=rig.pose.bones['mixamorig:RightHand'+finger+str(n)];along=(rig.matrix_world.to_3x3()@b.matrix.to_3x3().col[1]).normalized();axis=along.cross(Vector((0,0,-1)))
   if axis.length>1e-5:rotate_world(b,axis.normalized(),amount*scale*envelope)
 for name in names:
  b=rig.pose.bones[name];b.rotation_mode='QUATERNION';b.keyframe_insert('rotation_quaternion',frame=f)
 samples.append({'frame':f,'t':t,'envelope':envelope})
for fc in rig.animation_data.action.fcurves:
 for k in fc.keyframe_points:k.interpolation='LINEAR'
if not cloth.point_cache.is_baked:raise RuntimeError('Cloth cache was invalidated')
if not previous:
 s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
 s.cycles.samples=32;s.cycles.use_auto_tile=False
 s.render.use_border=False;s.render.use_crop_to_border=False;s.frame_start=37;s.frame_end=276
 bpy.context.preferences.filepaths.save_version=0;s.frame_set(37)
 if shutil.disk_usage(O).free<(O/'review-scene.blend').stat().st_size+64*1024*1024:raise RuntimeError('Insufficient scratch space to save the scene safely')
 bpy.ops.wm.save_as_mainfile(filepath=str(O/'review-scene.blend'),compress=True)
 after=hashlib.sha256((O/'review-scene.blend').read_bytes()).hexdigest()
 audit_path.write_text(json.dumps({'baselineSceneSHA256':before,'refinedSceneSHA256':after,'modifiedBones':names,'skinRig':rig.name,'garmentRig':original_rig.name,'garmentAndColliderRigUnchanged':True,'clothBaked':cloth.point_cache.is_baked,'changedPoses':samples,'renderedFrames':[169,216],'renderMethod':'Physical lower-half re-render, composited over the encoded baseline outside the changed region. No generated or replacement character image.'},indent=2))
pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='METAL';pref.metalrt='ON';pref.get_devices()
for d in pref.devices:d.use=d.type=='METAL'
s.cycles.device='GPU';s.cycles.samples=32;s.cycles.use_denoising=True;s.cycles.use_auto_tile=False;s.render.use_persistent_data=True
s.cycles.max_bounces=7;s.cycles.transparent_max_bounces=12
s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
s.render.use_border=True;s.render.use_crop_to_border=True;s.render.border_min_x=0;s.render.border_max_x=1;s.render.border_min_y=0;s.render.border_max_y=.52
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=20
patches=O/'hand-patches';patches.mkdir(exist_ok=True)
rendered=0
for f in range(169,217):
 dest=patches/f'{f:04}.png'
 if dest.exists()and dest.read_bytes()[-12:]==b'\x00\x00\x00\x00IEND\xaeB`\x82':continue
 s.frame_set(f);s.render.filepath=str(dest);bpy.ops.render.render(write_still=True)
 print('HAND_PATCH',f-168,48,flush=True)
 rendered+=1
 if '--one-batch' in sys.argv and rendered>=12:break
print('HAND_BATCH_COMPLETE',rendered,flush=True)
