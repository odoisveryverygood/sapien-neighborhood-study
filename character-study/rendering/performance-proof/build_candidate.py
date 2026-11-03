import bpy,pathlib,math,json,time
from mathutils import Vector,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-proof';ASSET=ROOT/'rendering/performance-proof/vitruvian-source/godot_project';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/sapien-rendered-rebuild/rendered-fragment.blend'));scene=bpy.context.scene;scene.frame_set(1)
for o in scene.objects:
 if o.name.startswith('rp_carla'):o.hide_render=True
car=bpy.data.objects.get('owned_vehicle')
if car:
 for o in [car,*car.children_recursive]:o.hide_render=True

def imp(name):
 old=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ASSET/name));return [o for o in scene.objects if o not in old]
bodyobjs=imp('vitruvian_body.glb');rig=next(o for o in bodyobjs if o.type=='ARMATURE');rig.name='Performance body rig';rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
root=bpy.data.objects.new('Performance person',None);scene.collection.objects.link(root);root.location=(.45,0,0)
for o in bodyobjs:
 if not o.parent:o.parent=root
bpy.context.view_layer.update();head_rest=(rig.matrix_world@rig.pose.bones['mixamorig:Head'].matrix).copy()
headobjs=imp('vitruvian_head.glb');face=next(o for o in headobjs if o.type=='MESH' and o.data.shape_keys);face.name='Performance face · CC0 FACS'
headroot=bpy.data.objects.new('Head and hair assembly',None);scene.collection.objects.link(headroot);headroot.location=(.45,0,0)
for o in headobjs:
 if not o.parent:o.parent=headroot
hair=imp('vitruvian_hair_rigged.glb');hairrig=next(o for o in hair if o.type=='ARMATURE');hairrig.name='Performance hair rig'
for o in hair:
 if not o.parent:o.parent=headroot
brows_all=imp('vitruvian_hair.glb');brows=[]
for o in brows_all:
 if not o.name.startswith('VitBrow'):bpy.data.objects.remove(o,do_unlink=True)
 else:o.parent=headroot;brows.append(o)
c=headroot.constraints.new('CHILD_OF');c.target=rig;c.subtarget='mixamorig:Head';c.inverse_matrix=head_rest.inverted();bpy.context.view_layer.update()
# Rebuild the source's real-time materials as physical Cycles surfaces.
def image(name,space='sRGB'):
 im=bpy.data.images.load(str(ASSET/name),check_existing=True);im.colorspace_settings.name=space;return im
def material(name,col=(.3,.3,.3),rough=.6):
 m=bpy.data.materials.new('Performance '+name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough;return m
def tex(m,file,socket,space='sRGB'):
 n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=image(file,space);m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs[socket]);return n
def skin(name,prefix):
 m=material(name,rough=.52);tex(m,prefix+'_bc.png','Base Color');p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Subsurface Weight'].default_value=.06;p.inputs['Subsurface Scale'].default_value=.003;p.inputs['Specular IOR Level'].default_value=.3
 tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=image(prefix+'_n.png','Non-Color');nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal']);tex(m,prefix+'_rough.png','Roughness','Non-Color');return m
faceMat=skin('Face skin','vit_face');bodyMat=skin('Body skin','vit_body');shirt=material('Slate cotton tee',(.045,.072,.075),.88);pants=material('Dark trousers',(.032,.039,.041),.85);shoes=material('Shoes',(.025,.027,.026),.6)
noise=shirt.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=380;bum=shirt.node_tree.nodes.new('ShaderNodeBump');bum.inputs['Strength'].default_value=.13;bum.inputs['Distance'].default_value=.00035;shirt.node_tree.links.new(noise.outputs['Fac'],bum.inputs['Height']);shirt.node_tree.links.new(bum.outputs['Normal'],shirt.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
sclera=material('Sclera',(.72,.70,.65),.28);st=tex(sclera,'vit_sclera.png','Base Color');sclera.node_tree.links.new(st.outputs['Alpha'],sclera.node_tree.nodes.get('Principled BSDF').inputs['Alpha']);iris=material('Iris',(.10,.06,.035),.30);tex(iris,'vit_iris.png','Base Color');back=material('Pupil',(.001,.001,.001),.3);mouth=material('Mouth',rough=.52);tex(mouth,'vit_mouth.png','Base Color');cornea=material('Cornea',(.97,.98,1),.035);p=cornea.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.376
transparent=material('Invisible makeup',rough=1);transparent.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=0
wet=material('Wet eye margin',(.32,.11,.085),.13);wet.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.45
hairMat=material('Separate hair strands',rough=.64);tex(hairMat,'vit_hair_diffuse.png','Base Color');tex(hairMat,'vit_hair_opacity.png','Alpha','Non-Color');p=hairMat.node_tree.nodes.get('Principled BSDF');p.inputs['Specular IOR Level'].default_value=.22
if 'Anisotropic' in p.inputs:p.inputs['Anisotropic'].default_value=.25
hairMat.surface_render_method='DITHERED'
if hasattr(hairMat,'use_transparent_shadow'):hairMat.use_transparent_shadow=True
hn=hairMat.node_tree.nodes.new('ShaderNodeTexImage');hn.image=image('vit_hair_normal.png','Non-Color');nm=hairMat.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.3;hairMat.node_tree.links.new(hn.outputs['Color'],nm.inputs['Color']);hairMat.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
col=next(n for n in hairMat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image.name.startswith('vit_hair_diffuse'));mix=hairMat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(2.4,2.0,1.6,1);hairMat.node_tree.links.new(col.outputs['Color'],mix.inputs[1]);hairMat.node_tree.links.new(mix.outputs['Color'],p.inputs['Base Color'])
brow=material('Individual brow strands',(.045,.028,.016),.85);tex(brow,'vit_hair_atlas.png','Alpha','Non-Color')
lookup={'VitSkin':faceMat,'VitBody':bodyMat,'VitShirt':shirt,'VitPants':pants,'VitShoes':shoes,'VitSclera':sclera,'VitIris':iris,'VitEyeBack':back,'VitCornea2':cornea,'VitMouth':mouth,'VitEyeshadow':transparent,'VitTearline':wet,'VitCaruncle':wet,'VitHair':hairMat,'VitBrow':brow}
lookup['VitBrowCards']=brow;lookup['VitBrowCardsMat']=brow
new=[*bodyobjs,*headobjs,*hair,*brows]
for o in new:
 if o.type!='MESH':continue
 for slot in o.material_slots:
  if slot.material:
   name=slot.material.name.split('.')[0];slot.material=lookup.get(name,slot.material)
 for p in o.data.polygons:p.use_smooth=True
# Correct garment fit on the imported figure; keep source assets unchanged.
for o in bodyobjs:
 if o.type!='MESH':continue
 if any(sl.material==bodyMat for sl in o.material_slots):
  o.data.materials.append(transparent);mi=len(o.data.materials)-1
  for poly in o.data.polygons:
   c=o.matrix_world@poly.center
   if o.data.materials[poly.material_index]==bodyMat and .76<c.z<1.48 and abs(c.x-.45)<.21:poly.material_index=mi
 if any(sl.material==shirt for sl in o.material_slots):
  mod=o.modifiers.new('Gentle garment smoothing','CORRECTIVE_SMOOTH');mod.factor=.4;mod.iterations=5
  mod=o.modifiers.new('Fabric clearance','DISPLACE');mod.strength=.003;mod.mid_level=0;mod.direction='NORMAL'
  mod=o.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.0015
# The source had independently controllable eyes, face morphs and hair bones.
# Author the pose here; no third-party script is executed and no source mocap is used.
MAP={'head':'Head','neck':'Neck','spine_02':'Spine2','spine_01':'Spine1'}
for side,word in [('l','Left'),('r','Right')]:
 MAP.update({'upperarm_'+side:word+'Arm','lowerarm_'+side:word+'ForeArm','hand_'+side:word+'Hand'})
 for old,finger in [('middle','Middle'),('index','Index'),('pinky','Pinky'),('ring','Ring'),('thumb','Thumb')]:
  for i in [1,2,3]:MAP[f'{old}_0{i}_{side}']=word+'Hand'+finger+str(i)
def B(n):return rig.pose.bones['mixamorig:'+MAP.get(n,n)]
def update():bpy.context.view_layer.update()
def wp(n):return rig.matrix_world@B(n).matrix.translation
def rotate(n,axis,angle):
 b=B(n);w=rig.matrix_world@b.matrix;p=w.translation.copy();b.matrix=rig.matrix_world.inverted()@Matrix.Translation(p)@Matrix.Rotation(angle,4,Vector(axis))@Matrix.Translation(-p)@w;update()
def aim(n,child,target):
 b=B(n);p=wp(n);q=(wp(child)-p).normalized().rotation_difference((target-p).normalized());b.matrix=rig.matrix_world.inverted()@Matrix.Translation(p)@q.to_matrix().to_4x4()@Matrix.Translation(-p)@(rig.matrix_world@b.matrix);update()
handrest={}
for side in ['l','r']:
 z=(wp('middle_01_'+side)-wp('hand_'+side)).normalized();x=wp('index_01_'+side)-wp('pinky_01_'+side);x=(x-z*x.dot(z)).normalized();y=z.cross(x).normalized();x=y.cross(z).normalized();handrest[side]=(Matrix((x,y,z)).transposed().to_quaternion(),(rig.matrix_world@B('hand_'+side).matrix).to_quaternion())
def arm(side,target):
 a,b,c='upperarm_'+side,'lowerarm_'+side,'hand_'+side;p=wp(a);l1=(wp(b)-p).length;l2=(wp(c)-wp(b)).length;d=min(l1+l2-.001,max(.03,(target-p).length));v=(target-p).normalized();pole=Vector((.7 if side=='l'else-.7,.1,-1));pole=(pole-v*pole.dot(v)).normalized();x=(l1*l1-l2*l2+d*d)/(2*d);y=math.sqrt(max(0,l1*l1-x*x));aim(a,b,p+v*x+pole*y);aim(b,c,target)
def palm(side):
 z=Vector((.10 if side=='l'else-.08,-1,-.03)).normalized();x=Vector((-1 if side=='l'else 1,0,0));x=(x-z*x.dot(z)).normalized();y=z.cross(x).normalized();x=y.cross(z).normalized();q=Matrix((x,y,z)).transposed().to_quaternion()@handrest[side][0].inverted()@handrest[side][1];b=B('hand_'+side);w=rig.matrix_world@b.matrix;b.matrix=rig.matrix_world.inverted()@Matrix.LocRotScale(w.translation,q,w.to_scale());update()
def contact(side,target):
 wrist=target+Vector((0,.10,.08))
 for _ in range(7):arm(side,wrist);palm(side);wrist+=target-(wp('middle_01_'+side)+wp('index_02_'+side))*.5
 arm(side,wrist);palm(side)
rotate('spine_02',(1,0,0),.04);rotate('neck',(1,0,0),.08);rotate('head',(1,0,0),.34);rotate('head',(0,0,1),-.06)
contact('l',Vector((.64,-.32,1.0735)));contact('r',Vector((.17,-.34,1.05)))
for o in headobjs:
 if o.name.startswith('Eye_'):
  update();w=o.matrix_world.copy();q=(w.to_quaternion()@Vector((0,-1,0))).rotation_difference((Vector((.20,-.43,1.04))-w.translation).normalized());o.matrix_world=Matrix.Translation(w.translation)@q.to_matrix().to_4x4()@Matrix.Translation(-w.translation)@w
face.data.shape_keys.key_blocks['Eyes_Closed_Max'].value=.10
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.max_bounces=7;scene.cycles.transparent_max_bounces=12
pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='METAL';pref.get_devices()
for d in pref.devices:d.use=d.type=='METAL'
scene.cycles.device='GPU';scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
cam=scene.camera;cam.animation_data_clear();cam.data.animation_data_clear();cam.location=(1.72,-2.35,1.66);target=Vector((.39,-.21,1.29));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=48;cam.data.dof.focus_distance=(target-cam.location).length;cam.data.dof.aperture_fstop=4.8
info={'sourceRepo':'https://github.com/ibrews/VitruvianGodot','commit':'8b643c3e72f39cb2f775ddeeac1612f70a9e1606','sourceAssets':'CC0 per source NOTICE.md','motion':'Authored in this test; no source Mixamo clips used','bones':len(rig.pose.bones),'facialShapes':[k.name for k in face.data.shape_keys.key_blocks],'objects':[{'name':o.name,'type':o.type,'dimensions':list(o.dimensions)}for o in new if o.name in scene.objects],'status':'Unreviewed candidate, not accepted quality'}
bpy.context.preferences.filepaths.save_version=0
(OUT/'candidate-manifest.json').write_text(json.dumps(info,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'candidate.blend'));scene.render.filepath=str(OUT/'candidate-medium.png');bpy.ops.render.render(write_still=True);print('CANDIDATE_MEDIUM_DONE',flush=True)
cam.location=(.98,-.98,1.69);target=Vector((.45,-.04,1.60));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=70;cam.data.dof.focus_distance=(target-cam.location).length;cam.data.dof.aperture_fstop=7.1;scene.render.filepath=str(OUT/'candidate-face.png');bpy.ops.render.render(write_still=True);print('CANDIDATE_FACE_DONE',flush=True)
