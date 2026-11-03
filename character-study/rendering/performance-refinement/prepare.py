import bpy,pathlib,math,bmesh,json
from mathutils import Vector,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-refined';sourceroot=ROOT/'rendering/performance-proof/vitruvian-source'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'outputs/sapien-performance-proof/performance-base.blend'));s=bpy.context.scene;rig=bpy.data.objects['Performance body rig'];face=bpy.data.objects['Performance face · CC0 FACS'];root=bpy.data.objects['Performance person']
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
for k in face.data.shape_keys.key_blocks:k.value=0
bpy.context.view_layer.update()
# Remove the grey veil in the iris window and use a thin tear-film reflection.
m=bpy.data.materials['Performance Sclera'];p=m.node_tree.nodes.get('Principled BSDF');tex=next(n for n in m.node_tree.nodes if n.type=='TEX_IMAGE');r=m.node_tree.nodes.new('ShaderNodeValToRGB');r.color_ramp.elements[0].position=.10;r.color_ramp.elements[1].position=.90;m.node_tree.links.new(tex.outputs['Alpha'],r.inputs[0]);m.node_tree.links.new(r.outputs['Color'],p.inputs['Alpha']);p.inputs['Roughness'].default_value=.32
m=bpy.data.materials['Performance Cornea'];n=m.node_tree.nodes;n.clear();a=n.new('ShaderNodeBsdfTransparent');b=n.new('ShaderNodeBsdfGlossy');b.inputs['Color'].default_value=(1,1,1,1);b.inputs['Roughness'].default_value=.028;mix=n.new('ShaderNodeMixShader');mix.inputs[0].default_value=.035;out=n.new('ShaderNodeOutputMaterial');m.node_tree.links.new(a.outputs[0],mix.inputs[1]);m.node_tree.links.new(b.outputs[0],mix.inputs[2]);m.node_tree.links.new(mix.outputs[0],out.inputs['Surface'])
p=bpy.data.materials['Performance Wet eye margin'].node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.24,.15,.12,1);p.inputs['Roughness'].default_value=.28;p.inputs['Coat Weight'].default_value=.18;p.inputs['Specular IOR Level'].default_value=.22
p=bpy.data.materials['Performance Face skin'].node_tree.nodes.get('Principled BSDF');p.inputs['Subsurface Weight'].default_value=.10;p.inputs['Subsurface Scale'].default_value=.0018
# Reuse the same character's original actual lash guides, rather than drawing
# opaque eyelash cards or painting a dark line on the eyelids.
with bpy.data.libraries.load(str(sourceroot/'blender_prep/vitruvian_rigged.blend'),link=False)as(src,dst):dst.objects=['cm_vitruvian']
full=dst.objects[0];s.collection.objects.link(full);full.name='Complete body collision';full.parent=None;full.matrix_world=Matrix.Translation((.45,0,0));bpy.context.view_layer.update();ev=full.evaluated_get(bpy.context.evaluated_depsgraph_get());ps=next(p for p in ev.particle_systems if p.name=='Eyelashes');strands=[[Vector(k.co)for k in p.hair_keys][::2]for p in ps.particles];brow_ps=next(p for p in ev.particle_systems if p.name=='EyebrowsDefault');brow_strands=[[Vector(k.co)for k in p.hair_keys]for p in brow_ps.particles]
verts=[];faces=[]
for line in strands:
 off=len(verts)
 for i,pt in enumerate(line):
  t=i/(len(line)-1);v=line[min(i+1,len(line)-1)]-line[max(0,i-1)];v.normalize();u=v.cross(Vector((0,0,1))).normalized();w=v.cross(u).normalized();radius=.000030*(1-.85*t)
  for j in range(3):verts.append(pt+radius*(u*math.cos(j*math.tau/3)+w*math.sin(j*math.tau/3)))
 for i in range(len(line)-1):
  for j in range(3):faces.append((off+i*3+j,off+i*3+(j+1)%3,off+(i+1)*3+(j+1)%3,off+(i+1)*3+j))
me=bpy.data.meshes.new('Original lash fibers');me.from_pydata(verts,[],faces);me.update();lash=bpy.data.objects.new('Original character eyelashes',me);s.collection.objects.link(lash);lash.parent=root
m=bpy.data.materials.new('Natural lash pigment');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.018,.011,.006,1);p.inputs['Roughness'].default_value=.65;me.materials.append(m)
for p in me.polygons:p.use_smooth=True
bpy.context.view_layer.objects.active=lash
for o in s.objects:o.select_set(False)
lash.select_set(True);mod=lash.modifiers.new('Lashes follow eyelids and head','SURFACE_DEFORM');mod.target=face;bpy.ops.object.surfacedeform_bind(modifier=mod.name);print('LASH_BIND',mod.is_bound,len(strands),flush=True)
for ob in list(s.objects):
 if ob.name.startswith('Individual eyebrow fibers'):bpy.data.objects.remove(ob,do_unlink=True)
verts=[];faces=[]
for line in brow_strands:
 off=len(verts)
 for i,pt in enumerate(line):
  t=i/(len(line)-1);v=line[min(i+1,len(line)-1)]-line[max(0,i-1)];v.normalize();u=v.cross(Vector((0,0,1))).normalized();w=v.cross(u).normalized();radius=.000022*(1-.8*t)
  for j in range(3):verts.append(pt+radius*(u*math.cos(j*math.tau/3)+w*math.sin(j*math.tau/3)))
 for i in range(len(line)-1):
  for j in range(3):faces.append((off+i*3+j,off+i*3+(j+1)%3,off+(i+1)*3+(j+1)%3,off+(i+1)*3+j))
me=bpy.data.meshes.new('Original brow fibers');me.from_pydata(verts,[],faces);me.update();brow=bpy.data.objects.new('Original character brows',me);s.collection.objects.link(brow);brow.parent=root;m=bpy.data.materials.new('Natural brow pigment');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.065,.031,.012,1);p.inputs['Roughness'].default_value=.8;me.materials.append(m)
for p in me.polygons:p.use_smooth=True
lash.select_set(False);brow.select_set(True);bpy.context.view_layer.objects.active=brow;mod=brow.modifiers.new('Brows follow facial acting','SURFACE_DEFORM');mod.target=face;bpy.ops.object.surfacedeform_bind(modifier=mod.name);print('BROW_BIND',mod.is_bound,len(brow_strands),flush=True)
# The full skin is used only for collisions. It shares the exact source rig and
# weights with the visible body, including the skin hidden under the shirt.
full.modifiers.clear();full.parent=root;full.matrix_world=Matrix.Translation((.45,0,0));mod=full.modifiers.new('Actor collision deformation','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True;mod=full.modifiers.new('Cloth contact','COLLISION');full.collision.thickness_outer=.002;full.collision.thickness_inner=.001;full.collision.cloth_friction=4;full.hide_render=True;full.display_type='WIRE'
shirt=bpy.data.objects['Shirt']
for mod in list(shirt.modifiers):
 if mod.type!='ARMATURE':shirt.modifiers.remove(mod)
pin=shirt.vertex_groups.new(name='Collar and shoulder support')
for v in shirt.data.vertices:
 x,y,z=v.co;collar=(1 if z>1.46 and abs(x)<.13 else 0);shoulder=max(0,min(1,(z-1.37)/.09));weight=max(collar,.92*shoulder)
 if weight>0:pin.add([v.index],weight,'REPLACE')
cl=shirt.modifiers.new('Cotton cloth dynamics','CLOTH');cs=cl.settings;cs.quality=7;cs.mass=.22;cs.air_damping=3;cs.tension_stiffness=35;cs.compression_stiffness=35;cs.shear_stiffness=20;cs.bending_stiffness=.7;cs.tension_damping=8;cs.compression_damping=8;cs.shear_damping=7;cs.bending_damping=1;cs.vertex_group_mass=pin.name;cs.pin_stiffness=1;cs.use_dynamic_mesh=True
co=cl.collision_settings;co.use_collision=True;co.distance_min=.002;co.collision_quality=5;co.friction=4;co.use_self_collision=True;co.self_distance_min=.0015;co.self_friction=3;co.impulse_clamp=3;co.self_impulse_clamp=3
cl.point_cache.frame_start=1;cl.point_cache.frame_end=276
mod=shirt.modifiers.new('Fine cloth surface','CORRECTIVE_SMOOTH');mod.factor=.25;mod.iterations=2
mod=shirt.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.0014
m=bpy.data.materials['Performance Slate cotton tee'];p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.046,.054,.038,1);p.inputs['Roughness'].default_value=.9
noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=55;noise.inputs['Detail'].default_value=2;ran=m.node_tree.nodes.new('ShaderNodeMapRange');ran.inputs['To Min'].default_value=.82;ran.inputs['To Max'].default_value=.98;m.node_tree.links.new(noise.outputs['Fac'],ran.inputs[0]);m.node_tree.links.new(ran.outputs[0],p.inputs['Roughness'])
counter=bpy.data.objects['Walnut counter'];counter.modifiers.new('Fabric support on counter','COLLISION');counter.collision.thickness_outer=.0015
s.render.engine='CYCLES';s.render.resolution_x=1440;s.render.resolution_y=810;s.render.resolution_percentage=100;s.cycles.samples=32;s.cycles.use_denoising=True;s.cycles.device='GPU';pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='METAL';pref.get_devices()
for d in pref.devices:d.use=d.type=='METAL'
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'refined-base.blend'),compress=True)
print('REFINED_BASE_SAVED',flush=True)
