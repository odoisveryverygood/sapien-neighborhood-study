"""A ten-second illustrative performance with fitted contact and cloth pre-roll."""
import bpy,pathlib,math,json,sys
from mathutils import Vector,Matrix,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-refined';PRE=36;COUNT=240;FPS=24;RAISE=.08
bpy.ops.wm.open_mainfile(filepath=str(OUT/'refined-base.blend'));s=bpy.context.scene;rig=bpy.data.objects['Performance body rig'];face=bpy.data.objects['Performance face · CC0 FACS'];hr=bpy.data.objects['Head and hair assembly'];cam=s.camera
bpy.data.objects['Walnut counter'].location.z+=RAISE;cb=bpy.data.objects['Counter base'];cb.dimensions.z+=RAISE;cb.location.z+=RAISE/2
for o in s.objects:
 if o.name.startswith(('Competitor offer','Budget '))or o.name in ['Blue notebook','Notebook pages']:o.location.z+=RAISE
rig.animation_data_clear();face.data.shape_keys.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update();source=(ROOT/'rendering/performance-proof/build_candidate.py').read_text();exec(source[source.index("MAP={'head'"):source.index("rotate('spine_02'")])
eyes=[o for o in s.objects if o.name.startswith(('Eye_L_eyeball','Eye_R_eyeball'))];eye_rest={o.name:o.matrix_basis.copy()for o in eyes}
base=face.data.shape_keys.key_blocks[0];closed=face.data.shape_keys.key_blocks['Eyes_Closed_Max'];upper=face.shape_key_add(name='Upper lid follows gaze',from_mix=False);lower=face.shape_key_add(name='Lower lid follows gaze',from_mix=False)
for i,v in enumerate(base.data):
 delta=closed.data[i].co-v.co
 if delta.z<0:upper.data[i].co=v.co+delta
 elif delta.z>0:lower.data[i].co=v.co-delta*.35
body=next(o for o in s.objects if o.type=='MESH'and o.vertex_groups.get('mixamorig:RightHandMiddle3')and not o.hide_render)
tips={}
for side,word in [('l','Left'),('r','Right')]:
 groups={g.index for g in body.vertex_groups if any(g.name=='mixamorig:'+word+'Hand'+f+'3'for f in ['Index','Middle','Ring','Pinky'])};tips[side]=[v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in groups)>.35]
controller=bpy.data.objects.new('Offer follows contact',None);s.collection.objects.link(controller)
for o in list(s.objects):
 if o.name.startswith('Competitor offer'):
  w=o.matrix_world.copy();o.parent=controller;o.matrix_world=w
groom=bpy.data.objects['Individual strand groom'];lag=next(m.node_group.nodes['Hair response']for m in groom.modifiers if m.type=='NODES')
mocap=json.loads((ROOT/'rendering/performance-refinement/mocap/torso.json').read_text());mf=mocap['frames'];means={b:[sum(f[b][i]for f in mf)/len(mf)for i in range(3)]for b in ['lowerback','upperback','thorax']}
def smooth(x):
 x=max(0,min(1,x));return x*x*x*(10+x*(-15+6*x))
def cmu(b,t):
 u=max(0,min(len(mf)-1,t/10*(len(mf)-1)));i=int(u);j=min(i+1,len(mf)-1);w=u-i
 return [math.radians((mf[i][b][k]*(1-w)+mf[j][b][k]*w-means[b][k])*.16)for k in range(3)]
def curl(side,t):
 u=smooth((t-5.65)/.55)*(1-smooth((t-7.1)/.75))if side=='r'else 0
 for f,scale in [('index',.8),('middle',1),('ring',1.1),('pinky',1.12)]:
  for n,amount in [(1,.020+.065*u),(2,.025+.11*u),(3,.010+.035*u)]:
   name=f'{f}_0{n}_{side}';b=B(name);direction=(rig.matrix_world.to_3x3()@b.matrix.to_3x3().col[1]).normalized();axis=direction.cross(Vector((0,0,-1)))
   if axis.length>.001:rotate(name,axis.normalized(),amount*scale)
def support(side,target,z,t):
 contact(side,target);curl(side,t)
 for _ in range(4):
  ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();low=min((ev.matrix_world@me.vertices[i].co).z for i in tips[side]);ev.to_mesh_clear();target=target+Vector((0,0,z-low));contact(side,target)
 return target
spring=[0.,0.,0.,0.];lastangles=None
def pose(f):
 global lastangles
 t=(f-1)/FPS;push=smooth((t-3.65)/1.55);release=smooth((t-5.65)/.55);recover=smooth((t-6.35)/1.15);landing=smooth((t-6.95)/.85);look_up=smooth((t-7.15)/1.05)
 for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
 update();head_phase=smooth((t-1.63)/.42)-smooth((t-2.83)/.46);eye_phase=smooth((t-1.46)/.15)-smooth((t-2.65)/.15)
 for bone,src,baseangle in [('Spine','lowerback',.023),('Spine1','upperback',.019),('Spine2','thorax',.021)]:
  x,y,z=cmu(src,t);rotate(bone,(1,0,0),baseangle+x+.007*push-.006*look_up+.003*math.sin(t*1.35));rotate(bone,(0,0,1),y-.006*push);rotate(bone,(0,1,0),-z+.004*recover)
 rotate('neck',(1,0,0),.075*(1-look_up))
 delta=Vector((-.15*push,.015*push,0));controller.location=delta
 offer=Vector((.17,-.43,1.105))+delta;budget=Vector((.64,-.40,1.125));partner=Vector((-.70,-2.5,1.63))
 head_target=offer.lerp(budget,head_phase).lerp(partner,look_up);eye_target=offer.lerp(budget,eye_phase).lerp(partner,smooth((t-7.0)/.7))
 for o in eyes:o.matrix_basis=eye_rest[o.name]
 update();ep=sum((o.matrix_world.translation for o in eyes),Vector())/2;v=head_target-ep;desired_pitch=max(0,min(.75,math.atan2(-v.z,math.hypot(v.x,v.y))-.20));yaw=math.atan2(v.x,-v.y)*.83
 rotate('head',(1,0,0),max(-.05,desired_pitch-.14*(1-look_up)));rotate('head',(0,0,1),yaw)
 # Let the head contribute to large glances instead of rolling the eyes to the
 # edge of their sockets. The eyes still lead the head at the authored timings.
 for _ in range(2):
  ep=sum((o.matrix_world.translation for o in eyes),Vector())/2;desired=(head_target-ep).normalized();forward=hr.matrix_world.to_quaternion()@Vector((0,-1,0));angle=forward.angle(desired)
  if angle>.34:
   q=forward.rotation_difference(desired);partial=Quaternion().slerp(q,(angle-.34)/angle);b=B('head');w=rig.matrix_world@b.matrix;p=w.translation;b.matrix=rig.matrix_world.inverted()@Matrix.Translation(p)@partial.to_matrix().to_4x4()@Matrix.Translation(-p)@w;update()
 left=support('l',Vector((.64-.003*push,-.32+.002*recover,1.1535)),1.1222,t)
 anticip=.004*math.sin(math.pi*smooth((t-3.1)/.5))if t<3.65 else 0;lift=.027*release*(1-landing)
 right=support('r',Vector((.17,-.34,1.13))+delta+Vector((.13*recover,.055*recover,lift+anticip)),1.102+lift+anticip-.0013*landing,t)
 local_eye=[]
 for o in eyes:
  o.matrix_basis=eye_rest[o.name];update();w=o.matrix_world.copy();desired=(eye_target-w.translation).normalized();forward=hr.matrix_world.to_quaternion()@Vector((0,-1,0));angle=forward.angle(desired)
  if angle>.54:desired=Quaternion().slerp(forward.rotation_difference(desired),.54/angle)@forward
  q=(w.to_quaternion()@Vector((0,-1,0))).rotation_difference(desired);o.matrix_world=Matrix.Translation(w.translation)@q.to_matrix().to_4x4()@Matrix.Translation(-w.translation)@w;local_eye.append(hr.matrix_world.to_quaternion().inverted()@desired)
 keys=face.data.shape_keys.key_blocks
 for k in keys:k.value=0
 blink=0
 for bt in [.87,2.18,5.45,7.18,9.26]:
  dt=t-bt
  if -.07<dt<0:blink=max(blink,smooth((dt+.07)/.07))
  elif 0<=dt<.135:blink=max(blink,1-smooth(dt/.135))
 down=max(0,min(.45,sum(math.atan2(-v.z,-v.y)for v in local_eye)/2));lid=min(.34,.035+.75*down)
 keys['Upper lid follows gaze'].value=lid*(1-blink);keys['Lower lid follows gaze'].value=lid*.65*(1-blink);keys['Eyes_Closed_Max'].value=blink
 pause=smooth((t-2.35)/.35)*(1-smooth((t-3.55)/.35));keys['Thinking'].value=.035*pause;keys['Jaw_Lower'].value=.012+.008*math.sin(t*1.8)-.008*pause;keys['Smile_Lips_Closed'].value=.025*look_up;keys['Eyebrows_Raised_Left'].value=.045*look_up;keys['Eyebrows_Raised_Right'].value=.025*look_up;keys['Lips_Up_Funnel'].value=.016*pause
 angles=(yaw,desired_pitch)
 if lastangles is not None:
  targetx=max(-.006,min(.006,-.004*(angles[0]-lastangles[0])*FPS));targety=max(-.007,min(.007,.005*(angles[1]-lastangles[1])*FPS))
  for k,target in enumerate([targetx,targety]):spring[k+2]+=(140*(target-spring[k])-18*spring[k+2])/FPS;spring[k]+=spring[k+2]/FPS
 lastangles=angles;lag.inputs['X'].default_value=spring[0];lag.inputs['Y'].default_value=spring[1]
 return {'frame':f+PRE,'t':t,'paperOffset':list(delta),'rightTarget':list(right),'leftTarget':list(left),'blink':blink,'lookUp':look_up,'eyeHeadAngleDegrees':[math.degrees((hr.matrix_world.to_quaternion()@Vector((0,-1,0))).angle(o.matrix_world.to_quaternion()@Vector((0,-1,0))))for o in eyes]}
def camera(f):
 t=(f-1)/FPS
 if t<1.75:pos=Vector((.37,-.99,2.06));target=Vector((.35,-.40,1.12));lens=45;ap=8
 elif t<7.65:pos=Vector((-.65+.025*t/10,-2.10+.03*t/10,1.49));target=Vector((.35,-.22,1.31));lens=49;ap=6.3
 else:pos=Vector((-.20,-1.10,1.63));target=Vector((.45,-.04,1.59));lens=65;ap=6.3
 cam.location=pos;cam.rotation_euler=(target-pos).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;cam.data.dof.focus_distance=(target-pos).length;cam.data.dof.aperture_fstop=ap
bake_hidden=[o for o in s.objects if o.type=='CURVES'or o.name in ['Shirt','Complete body collision','Original character brows','Original character eyelashes']or o==face]
for o in bake_hidden:o.hide_viewport=True
audit=[]
for f in range(1,COUNT+1):
 frame=f+PRE;s.frame_set(frame);audit.append(pose(f));camera(f)
 for b in rig.pose.bones:
  b.rotation_mode='QUATERNION'
  for prop in ['location','rotation_quaternion','scale']:b.keyframe_insert(prop,frame=frame)
 for o in eyes:o.rotation_mode='QUATERNION';o.keyframe_insert('rotation_quaternion',frame=frame)
 for k in face.data.shape_keys.key_blocks:k.keyframe_insert('value',frame=frame)
 for n in ['X','Y']:lag.inputs[n].keyframe_insert('default_value',frame=frame)
 controller.keyframe_insert('location',frame=frame);cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
 for p in ['lens','dof.focus_distance','dof.aperture_fstop']:cam.data.keyframe_insert(p,frame=frame)
 if f%24==0:print('ACTING_BAKE',f,COUNT,flush=True)
for o in bake_hidden:o.hide_viewport=False
for ob in [rig,face.data.shape_keys,controller,cam,cam.data,*eyes,lag.id_data]:
 if ob.animation_data and ob.animation_data.action:
  for fc in ob.animation_data.action.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
s.render.fps=FPS;s.frame_start=1;s.frame_end=COUNT+PRE;s.frame_set(1);s.cycles.samples=32;s.cycles.use_denoising=True;s.render.use_persistent_data=True;s.render.resolution_x=1440;s.render.resolution_y=810;s.render.resolution_percentage=100;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'acting-unbaked-cloth.blend'),compress=True)
(OUT/'acting-audit.json').write_text(json.dumps({'duration':10,'fps':FPS,'preRollFrames':PRE,'renderFrames':[PRE+1,PRE+COUNT],'kind':'Authored illustrative response, with attenuated/retimed CMU torso-angle variation; not a Sapien result','mocapSource':mocap['source'],'samples':audit},indent=2));print('ACTING_SAVED',flush=True)
