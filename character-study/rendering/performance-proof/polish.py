import bpy,bmesh,pathlib,sys,json
from mathutils import Vector,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-proof'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'groomed-candidate.blend'));s=bpy.context.scene;rig=bpy.data.objects['Performance body rig'];headroot=bpy.data.objects['Head and hair assembly'];face=bpy.data.objects['Performance face · CC0 FACS']
oldpose={p.name:p.matrix_basis.copy() for p in rig.pose.bones}
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update()
# Import only the original full-body mesh as a temporary rest-space weight source.
with bpy.data.libraries.load(str(ROOT/'rendering/performance-proof/vitruvian-source/blender_prep/vitruvian_rigged.blend'),link=False) as (src,dst):dst.objects=['cm_vitruvian']
weight_source=dst.objects[0];s.collection.objects.link(weight_source);weight_source.name='Temporary complete skin weight source';weight_source.parent=None;weight_source.matrix_world=Matrix.Translation((.45,0,0));weight_source.modifiers.clear();weight_source.hide_render=True
shirt=next(o for o in s.objects if o.type=='MESH' and any(sl.material and sl.material.name=='Performance Slate cotton tee' for sl in o.material_slots))
# GLB splits vertices at UV seams. Weld them before smoothing or adding thickness.
bm=bmesh.new();bm.from_mesh(shirt.data);before=len(bm.verts);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(shirt.data);bm.free();shirt.data.update()
bpy.context.view_layer.objects.active=shirt
for o in s.objects:o.select_set(False)
shirt.select_set(True)
for mod in list(shirt.modifiers):
 if mod.type!='ARMATURE':shirt.modifiers.remove(mod)
shirt.vertex_groups.clear();dt=shirt.modifiers.new('Complete skin weights','DATA_TRANSFER');dt.object=weight_source;dt.use_vert_data=True;dt.data_types_verts={'VGROUP_WEIGHTS'};dt.vert_mapping='POLYINTERP_NEAREST';dt.mix_mode='REPLACE';dt.layers_vgroup_select_src='ALL';dt.layers_vgroup_select_dst='NAME'
bpy.ops.object.modifier_move_to_index(modifier=dt.name,index=0);bpy.ops.object.datalayout_transfer(modifier=dt.name);bpy.ops.object.modifier_apply(modifier=dt.name)
for mod in shirt.modifiers:
 if mod.type=='ARMATURE':mod.use_deform_preserve_volume=True
mod=shirt.modifiers.new('Stable cloth smoothing','CORRECTIVE_SMOOTH');mod.factor=.35;mod.iterations=3
mod=shirt.modifiers.new('Millimeter cloth clearance','DISPLACE');mod.strength=.002;mod.mid_level=0;mod.direction='NORMAL'
mod=shirt.modifiers.new('Continuous fabric thickness','SOLIDIFY');mod.thickness=.0014
# The head must bend through the neck rather than move as one rigid cut-out.
# Keep the morphable face, but transfer the full source's anatomical neck weights.
bpy.context.view_layer.objects.active=face;shirt.select_set(False);face.select_set(True);w=face.matrix_world.copy();face.parent=bpy.data.objects['Performance person'];face.matrix_world=w
face.vertex_groups.clear();dt=face.modifiers.new('Anatomical neck weights','DATA_TRANSFER');dt.object=weight_source;dt.use_vert_data=True;dt.data_types_verts={'VGROUP_WEIGHTS'};dt.vert_mapping='POLYINTERP_NEAREST';dt.mix_mode='REPLACE';dt.layers_vgroup_select_src='ALL';dt.layers_vgroup_select_dst='NAME';bpy.ops.object.datalayout_transfer(modifier=dt.name);bpy.ops.object.modifier_apply(modifier=dt.name)
mod=face.modifiers.new('Continuous head and neck','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True
bpy.data.objects.remove(weight_source,do_unlink=True)
body=next(o for o in s.objects if o.type=='MESH' and any(sl.material and sl.material.name=='Performance Body skin' for sl in o.material_slots))
skin=next(i for i,m in enumerate(body.data.materials) if m.name=='Performance Body skin')
for p in body.data.polygons:
 c=body.matrix_world@p.center
 if c.z>1.38 and abs(c.x-.45)<.11:p.material_index=skin
for p in rig.pose.bones:p.matrix_basis=oldpose[p.name]
bpy.context.view_layer.update()
# Replace solid-looking eyebrow ribbons with actual tapered hairs.
for o in list(s.objects):
 if o.name.startswith('VitBrow'):bpy.data.objects.remove(o,do_unlink=True)
sys.path.insert(0,str(ROOT/'rendering/performance-proof'));import fiber_groom
brows=fiber_groom.build(headroot,'VitBrowCards',True)
for k in face.data.shape_keys.key_blocks:k.value=0
# The cheeks keep fine surface relief; use less uniform specular than a plastic mask.
mat=bpy.data.materials['Performance Face skin'];p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Specular IOR Level'].default_value=.25
s.cycles.samples=40;s.render.filepath=str(OUT/'polished-face.png');bpy.context.preferences.filepaths.save_version=0
bpy.data.orphans_purge(do_recursive=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'performance-base.blend'),compress=True)
bpy.ops.render.render(write_still=True)
cam=s.camera;cam.location=(1.72,-2.35,1.66);target=Vector((.39,-.21,1.29));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=48;cam.data.dof.focus_distance=(target-cam.location).length;cam.data.dof.aperture_fstop=5.6;s.render.filepath=str(OUT/'polished-medium.png');bpy.ops.render.render(write_still=True)
print('POLISH_DONE',before,len(shirt.data.vertices),flush=True)
