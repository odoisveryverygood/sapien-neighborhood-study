import bpy,bmesh,pathlib,math,json
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-refined';bpy.ops.wm.open_mainfile(filepath=str(OUT/'performance-cloth-baked.blend'));s=bpy.context.scene;rig=bpy.data.objects['Performance body rig'];full=bpy.data.objects['Complete body collision'];body=next(o for o in s.objects if o.type=='MESH'and o.vertex_groups.get('mixamorig:RightHandMiddle3')and not o.hide_render)
# Recover the anatomical skin that the realtime export trimmed beneath the collar.
# Match the head export's exact 1.47m center cut, so a looking-up pose stays closed.
neck=full.copy();neck.data=full.data.copy();neck.name='Continuous collar skin';s.collection.objects.link(neck);neck.hide_render=False;neck.hide_viewport=False;neck.display_type='TEXTURED'
for m in list(neck.modifiers):
 if m.type!='ARMATURE':neck.modifiers.remove(m)
bm=bmesh.new();bm.from_mesh(neck.data);bmesh.ops.delete(bm,geom=[f for f in bm.faces if not(1.29<f.calc_center_median().z<=1.47 and abs(f.calc_center_median().x)<.14)],context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(neck.data);bm.free();neck.data.materials.clear();neck.data.materials.append(bpy.data.materials['Performance Body skin'])
for p in neck.data.polygons:p.material_index=0;p.use_smooth=True
inv=bpy.data.materials['Performance Invisible makeup'];idx=next((i for i,m in enumerate(body.data.materials)if m==inv),None)
if idx is None:body.data.materials.append(inv);idx=len(body.data.materials)-1
for p in body.data.polygons:
 if p.center.z>1.29 and abs(p.center.x)<.14:p.material_index=idx
# Low-profile nail plates follow the actual finger surface. These replace the
# drawn-outline look of the source texture in the document close-up.
s.frame_set(49);dg=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(dg);me=ev.to_mesh();world=[ev.matrix_world@v.co for v in me.vertices];bvh=BVHTree.FromPolygons(world,[tuple(p.vertices)for p in me.polygons],all_triangles=False);ev.to_mesh_clear()
mat=bpy.data.materials.new('Natural keratin nail');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.43,.29,.24,1);p.inputs['Roughness'].default_value=.34;p.inputs['Specular IOR Level'].default_value=.32;p.inputs['Coat Weight'].default_value=.20;p.inputs['Subsurface Weight'].default_value=.08;p.inputs['Subsurface Scale'].default_value=.0003
nail_audit=[]
for side in ['Left','Right']:
 for finger,radius in [('Index',.0044),('Middle',.0047),('Ring',.0042),('Pinky',.0034)]:
  b=rig.pose.bones['mixamorig:'+side+'Hand'+finger+'3'];head=rig.matrix_world@b.head;tail=rig.matrix_world@b.tail;along=(tail-head).normalized();up=Vector((0,0,1));up=(up-along*up.dot(along)).normalized();across=along.cross(up).normalized();center=head+(tail-head)*.62;half_length=min(.0063,(tail-head).length*.39);vertices=[];faces=[]
  def surface(x,y):
   pt=center+across*x+along*y;hit,n,_,dist=bvh.ray_cast(pt+up*.03,-up,.06)
   return hit+up*.00020 if hit is not None else None
  mid=surface(0,0)
  if mid is None:raise RuntimeError('Nail center did not hit the intended finger surface: '+side+finger)
  segments=16;chosen=None
  for attempt in range(7):
   size=.86**attempt;candidate=[mid];valid=True
   for ring in [.33,.66,1.0]:
    for k in range(segments):
     a=k*math.tau/segments;point=surface(math.cos(a)*radius*ring*size,math.sin(a)*half_length*ring*size)
     if point is None or (point-mid).length>.016:valid=False;break
     candidate.append(point)
    if not valid:break
   if valid:vertices=candidate;chosen=size;break
  if chosen is None:raise RuntimeError('No fitting nail footprint: '+side+finger)
  print('NAIL_FIT',side,finger,chosen,flush=True)
  for k in range(segments):faces.append((0,1+k,1+(k+1)%segments))
  for ring in range(2):
   a=1+ring*segments;c=a+segments
   for k in range(segments):faces.append((a+k,c+k,c+(k+1)%segments,a+(k+1)%segments))
  mesh=bpy.data.meshes.new(side+finger+' nail');mesh.from_pydata(vertices,[],faces);mesh.update();ob=bpy.data.objects.new(side+' '+finger+' natural nail',mesh);s.collection.objects.link(ob);mesh.materials.append(mat)
  for p in mesh.polygons:p.use_smooth=True
  bpy.context.view_layer.objects.active=ob
  for o in s.objects:o.select_set(False)
  ob.select_set(True);mod=ob.modifiers.new('Nail follows finger skin','SURFACE_DEFORM');mod.target=body;bpy.ops.object.surfacedeform_bind(modifier=mod.name)
  if not mod.is_bound:raise RuntimeError('Nail attachment did not bind')
  nail_audit.append({'finger':side+finger,'vertices':len(vertices),'bound':mod.is_bound,'footprintScale':chosen})
bpy.context.preferences.filepaths.save_version=0;s.frame_set(37);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'review-scene.blend'),compress=True);(OUT/'asset-finish-audit.json').write_text(json.dumps({'collarPatchVertices':len(neck.data.vertices),'nails':nail_audit},indent=2));print('ASSETS_FINISHED',flush=True)
