import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Metres. Forward is +X; road level is local Y=0. The bus is an illustrative
// transit vehicle, unrelated to the behavioral results stored in the study.
const AXLES=[-2.72,2.73], HALF_WIDTH=1.225;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const Y=V(0,1,0);

function addPart(batches,geometry,material,position=[0,0,0],rotation=[0,0,0],quaternion=null){
 const q=quaternion||new T.Quaternion().setFromEuler(new T.Euler(...rotation));
 const transform=new T.Matrix4().compose(new T.Vector3(...position),q,V(1,1,1));
 const g=geometry.index?geometry.toNonIndexed():geometry;
 if(g!==geometry)geometry.dispose();
 g.applyMatrix4(transform);
 if(!batches.has(material))batches.set(material,[]);
 batches.get(material).push(g);
}

function bake(group,batches,prefix){
 for(const[material,parts]of batches){
  const geometry=mergeGeometries(parts,false);
  if(!geometry)throw Error('Bus geometry attributes could not be merged.');
  geometry.computeBoundingSphere();geometry.computeBoundingBox();
  const mesh=new T.Mesh(geometry,material);mesh.name=prefix+'-'+material.name;
  mesh.castShadow=material.name!=='glazing'&&material.name!=='destination';
  mesh.receiveShadow=true;group.add(mesh);
  for(const part of parts)part.dispose();
 }
}

function rounded(w,h,d,r=.035){
 return new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3));
}

function sidePanel(){
 const s=new T.Shape();s.moveTo(-4.48,.50);
 for(const x of AXLES){s.lineTo(x-.55,.50);s.absarc(x,.50,.55,Math.PI,0,true);}
 s.lineTo(4.48,.50);s.lineTo(4.48,1.60);s.lineTo(-4.48,1.60);s.closePath();
 return new T.ExtrudeGeometry(s,{depth:.055,bevelEnabled:false,curveSegments:16});
}

function windshield(){
 const g=new T.BufferGeometry();
 // A slightly raked, two-piece screen rather than a flat cube face.
 g.setAttribute('position',new T.Float32BufferAttribute([
  4.57,1.66,-1.045, 4.38,2.75,1.045, 4.57,1.66,1.045,
  4.57,1.66,-1.045, 4.38,2.75,-1.045, 4.38,2.75,1.045,
 ],3));
 g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,1,1,0,0,0,0,1,1,1],2));
 g.computeVertexNormals();return g;
}

function destinationMaterial(fallback){
 if(typeof document==='undefined')return fallback;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
 const ctx=canvas.getContext('2d');if(!ctx)return fallback;
 ctx.fillStyle='#101a16';ctx.fillRect(0,0,1024,128);
 ctx.fillStyle='#e0c990';ctx.font='600 68px monospace';ctx.textBaseline='middle';
 ctx.fillText('04  MERCER STREET',34,66,956);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshBasicMaterial({map,toneMapped:false});material.name='destination';return material;
}

function wheel(tireMaterial,metalMaterial){
 const group=new T.Group(),batches=new Map();
 group.name='transit-wheel';group.rotation.x=Math.PI/2;
 // The cylinder's original Y axis is the axle. After the base X rotation it
 // points across the vehicle. Change wheel.rotation.y to spin the wheel.
 addPart(batches,new T.CylinderGeometry(.47,.47,.28,32,1),tireMaterial);
 addPart(batches,new T.CylinderGeometry(.272,.272,.287,24,1),metalMaterial);
 for(const side of [-1,1]){
  addPart(batches,new T.CylinderGeometry(.108,.108,.012,20),metalMaterial,[0,side*.151,0]);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,x=Math.cos(a)*.19,z=Math.sin(a)*.19;
   // Recessed lug/hole pattern makes rotation visible without a texture.
   addPart(batches,new T.CylinderGeometry(.026,.026,.008,8),tireMaterial,[x,side*.149,z]);
  }
  // Two narrow circumferential sidewall ribs share the tire material.
  for(const radius of [.395,.435])addPart(batches,new T.TorusGeometry(radius,.007,4,36),tireMaterial,[0,side*.143,0],[Math.PI/2,0,0]);
 }
 bake(group,batches,'wheel');return group;
}

/**
 * A moderately detailed 9.2m transit bus, batched by material.
 * @returns {{group:T.Group,wheels:T.Group[]}}
 * The four returned wheel groups have base rotation.x=PI/2. To animate, assign
 * rotation.y=-travelDistance/.47 (absolute replay distance, in metres).
 */
export function buildTransitBus(){
 const group=new T.Group();group.name='mercer-route-04';
 const materials={
  cream:new T.MeshStandardMaterial({color:'#d9d6c4',roughness:.48,metalness:.18}),
  green:new T.MeshStandardMaterial({color:'#21493b',roughness:.43,metalness:.25}),
  glazing:new T.MeshPhysicalMaterial({color:'#152b2d',roughness:.17,metalness:.36,clearcoat:.8,clearcoatRoughness:.12}),
  rubber:new T.MeshStandardMaterial({color:'#202726',roughness:.86,metalness:.05}),
  metal:new T.MeshStandardMaterial({color:'#a8afaa',roughness:.3,metalness:.85}),
  warm:new T.MeshStandardMaterial({color:'#eee4be',roughness:.28,emissive:'#d6bf75',emissiveIntensity:.35}),
  red:new T.MeshStandardMaterial({color:'#9d3530',roughness:.3,emissive:'#a21b15',emissiveIntensity:.28}),
 };
 for(const[name,material]of Object.entries(materials))material.name=name;
 const batches=new Map(),add=(g,m,p,r,q)=>addPart(batches,g,m,p,r,q);
 const box=(w,h,d,m,x,y,z,r=.025)=>add(rounded(w,h,d,r),m,[x,y,z]);
 const rod=(a,b,r,m)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);add(new T.CylinderGeometry(r,r,delta.length(),8),m,start.add(end).multiplyScalar(.5).toArray(),null,new T.Quaternion().setFromUnitVectors(Y,delta.normalize()));};

 // The continuous chassis and genuine arch cutouts give wheels room to sit
 // inside the body instead of attaching circles to the side of a solid box.
 box(8.90,.25,1.72,materials.rubber,0,.66,0,.06);
 box(8.92,.52,2.28,materials.green,0,1.32,0,.085);
 add(sidePanel(),materials.green,[0,0,HALF_WIDTH-.055]);
 add(sidePanel(),materials.green,[0,0,-HALF_WIDTH]);
 for(const z of [-HALF_WIDTH-.006,HALF_WIDTH+.006])for(const x of AXLES)
  add(new T.TorusGeometry(.55,.028,6,28,Math.PI),materials.rubber,[x,.50,z]);

 // A low rounded roof, two shallow ventilation housings, continuous header
 // and sill rails, and narrow pillars establish a real low-floor bus profile.
 box(9.10,.25,2.43,materials.cream,0,3.025,0,.11);
 box(3.30,.17,1.62,materials.cream,-.25,3.205,0,.07);
 box(1.15,.08,1.08,materials.rubber,-3.00,3.172,0,.035);
 for(let i=0;i<9;i++)box(.035,.012,1.20,materials.rubber,-1.55+i*.29,3.295,0,.002);
 for(const side of [-1,1]){
  const z=side*(HALF_WIDTH-.018);
  box(8.99,.15,.09,materials.cream,-.02,2.81,z,.028);
  box(8.99,.105,.085,materials.cream,-.02,1.61,z,.015);
  box(8.76,.045,.016,materials.cream,-.05,1.38,side*(HALF_WIDTH+.007),.005);
  box(8.94,1.16,.035,materials.glazing,-.03,2.20,side*(HALF_WIDTH-.045),.025);
  const panes=side<0?[-3.76,-2.29,-.82,.65,2.12,3.55]:[-3.76,-2.29,.84,2.24];
  for(const x of panes){
   const width=x===3.55?1.16:1.32;
   box(width+.075,1.11,.035,materials.rubber,x,2.20,z,.045);
   box(width,1.035,.024,materials.glazing,x,2.20,z+side*.021,.04);
   box(width-.02,.024,.018,materials.metal,x,2.45,z+side*.037,.003);
  }
  const pillars=side<0?[-4.47,-3.025,-1.555,-.085,1.385,2.84,4.20]:[-4.47,-3.025,-1.555,.12,1.57,2.94,4.25];
  for(const x of pillars)box(.065,1.19,.10,materials.cream,x,2.20,z,.016);
 }

 // Two full-height double-leaf doors on the curb side. Seams, glazing, lower
 // kick panels and handles read at street-camera distance.
 for(const x of [-.66,3.64]){
  box(1.26,2.22,.035,materials.rubber,x,1.65,HALF_WIDTH+.005,.03);
  for(const dx of [-.305,.305]){
   box(.557,1.80,.028,materials.glazing,x+dx,1.75,HALF_WIDTH+.028,.025);
   box(.557,.22,.032,materials.green,x+dx,.735,HALF_WIDTH+.03,.01);
   box(.018,1.95,.014,materials.metal,x+dx+.278,1.69,HALF_WIDTH+.05,.003);
  }
  box(.026,2.13,.04,materials.rubber,x,1.65,HALF_WIDTH+.055,.003);
  for(const dx of [-.09,.09])box(.018,.26,.021,materials.metal,x+dx,1.56,HALF_WIDTH+.061,.004);
  box(1.20,.038,.08,materials.metal,x,.55,HALF_WIDTH+.018,.005);
 }

 // Front cab. Side pillars and the raked screen are separate from the fascia.
 box(.33,1.08,2.39,materials.cream,4.43,1.075,0,.09);
 box(.34,.29,2.34,materials.green,4.44,.80,0,.055);
 add(windshield(),materials.glazing);
 for(const z of [-1.10,1.10])rod([4.59,1.61,z],[4.37,2.83,z],.045,materials.cream);
 rod([4.57,1.64,0],[4.38,2.75,0],.018,materials.rubber);
 box(.20,.10,2.20,materials.cream,4.48,1.60,0,.02);
 box(.18,.31,2.18,materials.cream,4.43,2.90,0,.04);
 const destination=destinationMaterial(materials.rubber);
 add(new T.PlaneGeometry(1.94,.235),destination,[4.535,2.90,0],[0,Math.PI/2,0]);
 box(.15,.23,2.23,materials.rubber,4.61,.65,0,.055);
 for(const z of [-.82,.82]){
  box(.09,.23,.43,materials.rubber,4.605,1.10,z,.035);
  box(.035,.135,.32,materials.warm,4.657,1.12,z,.025);
  box(.033,.045,.27,materials.warm,4.659,.99,z,.009);
 }
 box(.035,.15,.48,materials.rubber,4.65,.82,0,.01);
 // Wipers lie against the screen, with a distinct arm and blade.
 for(const z of [-.55,.55]){
  rod([4.593,1.72,z-.19],[4.478,2.28,z+.14],.009,materials.rubber);
  rod([4.475,2.25,z-.17],[4.470,2.29,z+.30],.012,materials.rubber);
 }
 for(const side of [-1,1]){
  rod([4.19,2.61,side*1.18],[4.55,2.61,side*1.51],.018,materials.rubber);
  rod([4.55,2.61,side*1.51],[4.55,2.34,side*1.51],.018,materials.rubber);
  box(.15,.32,.105,materials.rubber,4.55,2.25,side*1.51,.035);
  box(.015,.25,.075,materials.glazing,4.63,2.25,side*1.51,.015);
 }

 // Rear window, cooling grille, vertical tail-light clusters and service seams.
 box(.25,2.19,2.36,materials.cream,-4.45,1.66,0,.08);
 box(.25,.17,2.36,materials.cream,-4.45,2.82,0,.045);
 box(.28,.58,2.34,materials.green,-4.45,.91,0,.05);
 box(.022,.77,1.69,materials.rubber,-4.585,2.27,0,.04);
 box(.025,.68,1.59,materials.glazing,-4.60,2.27,0,.03);
 for(let i=0;i<7;i++)box(.018,.035,1.50,materials.rubber,-4.595,1.10+i*.065,0,.006);
 for(const z of [-.94,.94]){
  box(.035,.64,.17,materials.rubber,-4.593,1.39,z,.025);
  for(const y of [1.21,1.43,1.65])box(.021,.14,.105,materials.red,-4.617,y,z,.018);
 }
 box(.16,.22,2.22,materials.rubber,-4.63,.65,0,.05);
 box(.022,.14,.47,materials.metal,-4.725,.83,0,.008);
 for(const side of [-1,1]){
  // Service hatch edges and small marker lamps; all share existing materials.
  for(const x of [-4.10,1.55])box(.017,.59,.011,materials.rubber,x,1.04,side*(HALF_WIDTH+.009),.002);
  for(const x of [-4.15,0,4.18])box(.16,.055,.021,materials.warm,x,.76,side*(HALF_WIDTH+.02),.01);
 }
 bake(group,batches,'body');
 const wheels=[];
 for(const x of AXLES)for(const z of [-1.10,1.10]){const w=wheel(materials.rubber,materials.metal);w.position.set(x,.48,z);group.add(w);wheels.push(w);}
 let triangles=0,drawCalls=0;
 group.traverse(o=>{if(o.isMesh){drawCalls++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
 group.userData={...group.userData,drawCalls,triangles,dimensionsMetres:[9.45,3.30,3.13],wheelRadius:.47,forwardAxis:'+X',wheelSpinAxis:'rotation.y after base rotation.x=PI/2'};
 return {group,wheels};
}
