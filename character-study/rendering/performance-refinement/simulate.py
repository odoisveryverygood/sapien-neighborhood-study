import bpy,pathlib,time,json,math
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/sapien-performance-refined';bpy.ops.wm.open_mainfile(filepath=str(OUT/'acting-unbaked-cloth.blend'));s=bpy.context.scene;shirt=bpy.data.objects['Shirt'];cloth=next(m for m in shirt.modifiers if m.type=='CLOTH');pc=cloth.point_cache;pc.frame_start=1;pc.frame_end=276;pc.use_disk_cache=False
if hasattr(pc,'compression'):pc.compression='LIGHT'
bpy.context.view_layer.objects.active=shirt
for o in s.objects:o.select_set(False)
shirt.select_set(True);s.frame_set(1);start=time.time();print('CLOTH_BAKE_START',flush=True)
with bpy.context.temp_override(scene=s,object=shirt,active_object=shirt,point_cache=pc):bpy.ops.ptcache.bake(bake=True)
print('CLOTH_BAKED',pc.is_baked,pc.info,round(time.time()-start,2),flush=True)
if not pc.is_baked:raise RuntimeError('Cloth cache did not bake; do not render an unverified simulation')
probe=shirt.copy();probe.data=shirt.data.copy();probe.name='Temporary rigid garment reference';s.collection.objects.link(probe);probe.hide_render=True
for m in list(probe.modifiers):
 if m.type=='CLOTH':probe.modifiers.remove(m)
measure=[]
for f in [37,49,100,155,210,248,276]:
 s.frame_set(f);dg=bpy.context.evaluated_depsgraph_get();ev=shirt.evaluated_get(dg);me=ev.to_mesh();ref=probe.evaluated_get(dg);rm=ref.to_mesh();pts=[ev.matrix_world@v.co for v in me.vertices];bounds=[[min(p[k]for p in pts),max(p[k]for p in pts)]for k in range(3)]
 if any(not math.isfinite(x) for b in bounds for x in b)or bounds[2][0]<.25 or bounds[2][1]>2.05 or bounds[0][0]<-1 or bounds[0][1]>2:raise RuntimeError(f'Unstable cloth at frame {f}: {bounds}')
 rms=(sum((a.co-b.co).length_squared for a,b in zip(me.vertices,rm.vertices))/len(me.vertices))**.5 if len(me.vertices)==len(rm.vertices)else None;measure.append({'frame':f,'bounds':bounds,'clothVsRigidRMSMeters':rms});ev.to_mesh_clear();ref.to_mesh_clear()
bpy.data.objects.remove(probe,do_unlink=True);s.frame_set(37);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'performance-cloth-baked.blend'),compress=True)
(OUT/'cloth-audit.json').write_text(json.dumps({'baked':pc.is_baked,'preRollFrames':36,'frameRange':[1,276],'seconds':round(time.time()-start,2),'cache':pc.info,'samples':measure,'note':'Bounds and displacement checks detect gross failures; visual review is separate.'},indent=2));print('CLOTH_SCENE_SAVED',flush=True)
