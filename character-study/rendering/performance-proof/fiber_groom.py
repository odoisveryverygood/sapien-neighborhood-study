"""Convert the licensed source's card guide paths into actual individual hair curves."""
import bpy,numpy as np,json,struct,pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2];BASE=ROOT/'rendering/performance-proof/vitruvian-source/godot_project'
def read_accessor(j,buffer,index):
 a=j['accessors'][index];v=j['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dtype={5126:np.float32,5125:np.uint32,5123:np.uint16}[a['componentType']];offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.frombuffer(buffer,dtype=dtype,count=a['count']*n,offset=offset).reshape(a['count'],n).copy()
def build(parent, meshname="VitHair", brow=False):
 d=(BASE/'vitruvian_hair.glb').read_bytes();n,_=struct.unpack_from('<II',d,12);j=json.loads(d[20:20+n]);bo=20+n+8;buff=d[bo:];mesh=next(m for m in j['meshes']if m['name']==meshname);p=mesh['primitives'][0];pos=read_accessor(j,buff,p['attributes']['POSITION']);uv=read_accessor(j,buff,p['attributes']['TEXCOORD_0']);pos=pos[:,[0,2,1]];pos[:,1]*=-1
 indices=read_accessor(j,buff,p['indices']).ravel().astype(np.int64);quads=indices.reshape(-1,6);qv=uv[quads,1];root_v=0.0 if qv[0].min()<1e-5 else 1.0
 root_mask=(np.abs(qv-root_v)<1e-5).any(axis=1);starts=np.flatnonzero(root_mask)
 if starts[0]!=0:raise RuntimeError('First guide root is missing')
 stops=np.r_[starts[1:],len(quads)];rng=np.random.default_rng(429);lines=[];weights=[];bad=0
 nstrand=max(2,min(12,int(np.ceil(55000/len(starts)))));samples=8 if brow else 10
 if brow:nstrand=1
 for qa,qb in zip(starts,stops):
  ids=np.unique(quads[qa:qb]);pp=pos[ids];vv=uv[ids,1];uu=uv[ids,0];levels=np.unique(np.round(vv,5));rows=[]
  if len(levels)<2 or len(levels)>100:bad+=1;continue
  for val in sorted(levels):
   ii=np.where(np.abs(vv-val)<1e-4)[0];left=pp[ii[np.argmin(uu[ii])]];right=pp[ii[np.argmax(uu[ii])]];rows.append((left,right))
  if abs(root_v-1)<1e-5:rows.reverse()
  center=np.array([(a+b)*.5 for a,b in rows])
  if np.ptp(center,axis=0).max()>.6:bad+=1;continue
  for strand in range(nstrand):
   u=.5 if brow else (strand+.5+rng.uniform(-.22,.22))/nstrand;raw=np.array([a*(1-u)+b*u for a,b in rows]);old=np.linspace(0,1,len(raw));new=np.linspace(0,1,samples);line=np.column_stack([np.interp(new,old,raw[:,k])for k in range(3)]);line+=rng.normal(0,.00008,line.shape)*new[:,None];lines.append(line);weights.extend((new**2).tolist())
 if bad>20:raise RuntimeError(f'{bad} invalid guide cards; stop instead of inventing geometry')
 points=np.concatenate(lines,axis=0).astype(np.float32);cu=bpy.data.hair_curves.new('Brow fibers' if brow else 'Individual hair fibers');cu.add_curves([samples]*len(lines));cu.attributes['position'].data.foreach_set('vector',points.ravel());ra=cu.attributes.new('radius','FLOAT','POINT');radii=np.tile(np.linspace(.000024,.000008,samples) if brow else np.linspace(.000055,.000016,samples),len(lines)).astype(np.float32);ra.data.foreach_set('value',radii);lag=cu.attributes.new('lag_weight','FLOAT','POINT');lag.data.foreach_set('value',np.array(weights,dtype=np.float32));obj=bpy.data.objects.new('Individual eyebrow fibers' if brow else 'Individual strand groom',cu);bpy.context.scene.collection.objects.link(obj);obj.parent=parent
 m=bpy.data.materials.new('Physical brown hair fibers');m.use_nodes=True;n=m.node_tree.nodes;n.clear();surf=n.new('ShaderNodeBsdfHairPrincipled');surf.parametrization='MELANIN';surf.inputs['Melanin'].default_value=.60 if brow else .62;surf.inputs['Melanin Redness'].default_value=.12;surf.inputs['Roughness'].default_value=.38;surf.inputs['Random Color'].default_value=.12;out=n.new('ShaderNodeOutputMaterial');m.node_tree.links.new(surf.outputs[0],out.inputs['Surface']);cu.materials.append(m)
 # A small, root-fixed deformation gives the tips a separately controllable lag.
 ng=bpy.data.node_groups.new('Root fixed hair response','GeometryNodeTree');ng.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');ng.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry');i=ng.nodes.new('NodeGroupInput');o=ng.nodes.new('NodeGroupOutput');setp=ng.nodes.new('GeometryNodeSetPosition');att=ng.nodes.new('GeometryNodeInputNamedAttribute');att.data_type='FLOAT';att.inputs['Name'].default_value='lag_weight';v=ng.nodes.new('ShaderNodeCombineXYZ');v.name='Hair response';scale=ng.nodes.new('ShaderNodeVectorMath');scale.operation='SCALE';ng.links.new(att.outputs['Attribute'],scale.inputs[3]);ng.links.new(v.outputs[0],scale.inputs[0]);ng.links.new(i.outputs['Geometry'],setp.inputs['Geometry']);ng.links.new(scale.outputs['Vector'],setp.inputs['Offset']);ng.links.new(setp.outputs['Geometry'],o.inputs['Geometry']);mod=obj.modifiers.new('Secondary hair response','NODES');mod.node_group=ng
 print('FIBER_GROOM',len(lines),len(points),'invalid guides',bad,flush=True);return obj
