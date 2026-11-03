import bpy,bmesh,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'outputs/sapien-performance-refined'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'review-scene.blend'))
s=bpy.context.scene
old=bpy.data.objects.get('Continuous collar skin')
if old:bpy.data.objects.remove(old,do_unlink=True)
full=bpy.data.objects['Complete body collision']
neck=full.copy();neck.data=full.data.copy();neck.name='Continuous collar skin'
s.collection.objects.link(neck);neck.hide_render=False;neck.hide_viewport=False;neck.display_type='TEXTURED'
for m in list(neck.modifiers):
 if m.type!='ARMATURE':neck.modifiers.remove(m)
bm=bmesh.new();bm.from_mesh(neck.data)
# A shallow overlap closes the quad/triangle export boundary. Inset the overlap
# so the restored collar cannot z-fight with the morphable face.
bmesh.ops.delete(bm,geom=[f for f in bm.faces if not(1.29<f.calc_center_median().z<1.51 and abs(f.calc_center_median().x)<.14)],context='FACES')
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
bm.normal_update()
for v in bm.verts:
 fade=max(0,min(1,(v.co.z-1.46)/.02));v.co-=v.normal*.00065*fade
bm.to_mesh(neck.data);bm.free();neck.data.update()
neck.data.materials.clear()
neck.data.materials.append(bpy.data.materials['Performance Face skin'])
neck.data.materials.append(bpy.data.materials['Performance Body skin'])
uv=neck.data.uv_layers['VitruvianUV_UDIM']
for p in neck.data.polygons:
 # The original skin uses the face map in UDIM 1001 and body map in 1002.
 # Sampling the body map across that UV seam caused the dark collar shapes.
 u=sum(uv.data[i].uv.x for i in p.loop_indices)/len(p.loop_indices)
 p.material_index=0 if u<1 else 1;p.use_smooth=True
p=bpy.data.materials['Natural keratin nail'].node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.285,.168,.145,1)
p.inputs['Roughness'].default_value=.43;p.inputs['Coat Weight'].default_value=.06
p.inputs['Subsurface Weight'].default_value=.035
bpy.context.preferences.filepaths.save_version=0
s.frame_set(37);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'review-scene.blend'),compress=True)
pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='METAL';pref.get_devices()
for d in pref.devices:d.use=d.type=='METAL'
s.cycles.device='GPU';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.use_persistent_data=True
s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
for f,name in [(248,'portrait'),(155,'push'),(49,'documents')]:
 s.frame_set(f);s.render.filepath=str(OUT/'stills'/('review-'+name+'.png'));bpy.ops.render.render(write_still=True)
 print('REPAIRED_FINISH',name,flush=True)
