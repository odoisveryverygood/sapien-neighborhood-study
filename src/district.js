import * as T from 'three';

const V=(x,y,z)=>new T.Vector3(x,y,z);
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};

/**
 * Architectural surroundings for the existing four-person study.
 * Geometry only: no additional agents, decisions, lights or network requests.
 * Call after buildCorner(world), before world.batchStatic().
 */
export function buildDistrict(world){
 if(world.districtGroup)return world.districtGroup;
 const root=new T.Group();root.name='Mercer connected district';world.scene.add(root);world.districtGroup=root;
 const batches=new Map(),unitBox=new T.BoxGeometry(1,1,1),unitCylinder=new T.CylinderGeometry(1,1,1,10),trunkGeometry=new T.CylinderGeometry(.65,1,1,10);
 const dummy=new T.Object3D(),color=new T.Color(),random=rng(68431),materials=[];
 const material=(name,value,extras={})=>{const m=new T.MeshStandardMaterial({name,color:value,roughness:.85,...extras});materials.push(m);return m;};
 function sourceTexture(fragment,kind){let result=null;world.scene.traverse(o=>{if(result||!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){const texture=m?.[kind];const src=texture?.source?.data?.currentSrc||texture?.source?.data?.src||'';if(src.includes(fragment)){result=texture.clone();result.needsUpdate=true;break;}}});return result;}
 const brick=sourceTexture('brick-color','map'),brickNormal=sourceTexture('brick-normal','normalMap');
 const concrete=sourceTexture('concrete-color','map'),concreteNormal=sourceTexture('concrete-normal','normalMap');
 const plaster=sourceTexture('plaster-color','map')||concrete,plasterNormal=sourceTexture('plaster-normal','normalMap')||concreteNormal,plasterRough=sourceTexture('plaster-roughness','roughnessMap');for(const t of [plaster,plasterNormal,plasterRough])if(t)t.repeat.set(.55,.8);
 for(const texture of [brick,brickNormal])if(texture){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2.2,3);}
 for(const texture of [concrete,concreteNormal])if(texture){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1.1,1.4);}
 const masonry=material('district / weathered sandstone','#afa58f',{map:plaster,normalMap:plasterNormal,roughnessMap:plasterRough,normalScale:new T.Vector2(.3,.3)});
 const redBrick=material('district / muted brick','#a3816b',{map:brick,normalMap:brickNormal,normalScale:new T.Vector2(.25,.25)});
 const paleMasonry=material('district / pale limestone','#c6c4b7',{map:plaster,normalMap:plasterNormal,roughnessMap:plasterRough,normalScale:new T.Vector2(.3,.3)});
 const darkMasonry=material('district / grey masonry','#8a908b',{map:plaster,normalMap:plasterNormal,roughnessMap:plasterRough,normalScale:new T.Vector2(.3,.3)});
 const trim=material('district / limestone dressings','#c9c6b7');
 const roof=material('district / slate and zinc','#515d5e',{metalness:.18,roughness:.78});
 const metal=material('district / aged painted metal','#344342',{metalness:.38,roughness:.68});
 const wood=material('district / weathered timber','#81715b',{roughness:.88});
 const recess=material('district / recessed reveals','#273637');
 const glass=material('district / opaque cool glazing','#60777b',{metalness:.27,roughness:.29,envMapIntensity:.75});
 const glassDark=material('district / shaded glazing','#3e5358',{metalness:.21,roughness:.32,envMapIntensity:.65});
 let roadSurface;world.scene.traverse(o=>{if(o.isMesh&&o.material?.bumpScale===.025&&o.material.map)roadSurface=o.material.map;});
 const asphalt=material('district / asphalt','#92958e',{map:roadSurface||null,bumpMap:roadSurface||null,bumpScale:.02,roughness:.8});
 const pavement=material('district / stone paving','#b0b1a6',{map:concrete,normalMap:concreteNormal,normalScale:new T.Vector2(.12,.12),roughness:.91});
 const pavingEdge=material('district / curb stone','#9da69e',{roughness:.9});
 const grout=material('district / joints and soil','#626d66');
 const white=material('district / worn road paint','#c6c8b6',{roughness:1});
 const yellow=material('district / muted lane marking','#b7aa78',{roughness:1});
 const bark=material('district / bark','#686356',{roughness:1});
 const leaves=material('district / mixed canopy','#d4dac4',{roughness:1,side:T.DoubleSide});
 const planted=material('district / planted ground','#69785d',{roughness:1});

 function instance(geometry,mat,position,scale,quaternion=null,cast=true,tint=null){
  const key=geometry.uuid+'|'+mat.uuid+'|'+cast;let batch=batches.get(key);if(!batch){batch={geometry,material:mat,cast,items:[]};batches.set(key,batch);}
  dummy.position.copy(position);dummy.scale.copy(scale);dummy.quaternion.copy(quaternion||new T.Quaternion());dummy.updateMatrix();batch.items.push({matrix:dummy.matrix.clone(),tint:tint?.clone()||null});
 }
 function box(w,h,d,mat,x,y,z,{yaw=0,cast=true,tint=null,roll=0}={}){instance(unitBox,mat,V(x,y,z),V(w,h,d),new T.Quaternion().setFromEuler(new T.Euler(0,yaw,roll)),cast,tint);}
 function cylinder(radius,height,mat,x,y,z,{cast=true}={}){instance(unitCylinder,mat,V(x,y,z),V(radius,height,radius),null,cast);}
 function rod(a,b,radius,mat,cast=true){const delta=b.clone().sub(a);instance(unitCylinder,mat,a.clone().add(b).multiplyScalar(.5),V(radius,delta.length(),radius),new T.Quaternion().setFromUnitVectors(V(0,1,0),delta.normalize()),cast);}
 function faceBox(face,u,y,out,w,h,d,mat,cast=true){const c=Math.cos(face.yaw),s=Math.sin(face.yaw);box(w,h,d,mat,face.x+c*u+s*out,y,face.z-s*u+c*out,{yaw:face.yaw,cast});}

 // Paving, roads and the two intersecting side streets share the existing floor level.
 // Road top -0.06 m; pedestrian paving top +0.035 m. The original ground must sit below these.
 box(142,.06,164,grout,0,-.18,9,{cast:false});
 box(112,.02,17.7,asphalt,0,-.07,14.15,{cast:false});
 for(const x of [-33,33])box(10,.02,110,asphalt,x,-.07,4,{cast:false});
 box(112,.02,10,asphalt,0,-.07,-27,{cast:false});

 function pavingArea(x0,x1,z0,z1,tile=1.5){
  box(x1-x0,.035,z1-z0,grout,(x0+x1)/2,-.005,(z0+z1)/2,{cast:false});
  for(let x=x0+tile/2;x<x1;x+=tile)for(let z=z0+tile/2;z<z1;z+=tile){const width=Math.min(tile-.025,x1-(x-tile/2)-.025),depth=Math.min(tile-.025,z1-(z-tile/2)-.025);if(width<=0||depth<=0)continue;color.setScalar(.91+random()*.13);box(width,.04,depth,pavement,x-tile/2+width/2,.015,z-tile/2+depth/2,{cast:false,tint:color});}
 }
 // Sidewalks turn the corners of the original frontage and continue behind it.
 pavingArea(-27.9,-22.3,-22,5.2);pavingArea(22.3,27.9,-22,5.2);
 pavingArea(-22.3,22.3,-22,-18.4);pavingArea(-23,23,23.1,58);
 pavingArea(-54,-38.2,-5.7,5.2);pavingArea(38.2,54,-5.7,5.2);
 pavingArea(-54,-38.2,23.1,27.6);pavingArea(38.2,54,23.1,27.6);
 pavingArea(-54,27.9,-35.7,-32.1);pavingArea(38.2,54,-35.7,-32.1);
 for(const [x0,x1,z]of [[-54,27.9,-22.1],[-54,27.9,-32],[38.2,54,-22.1],[38.2,54,-32],[-54,27.9,23.1],[38.2,54,23.1]])box(x1-x0,.14,.18,pavingEdge,(x0+x1)/2,-.035,z,{cast:false});
 for(const x of [-28,-38,28,38])for(const [a,b]of [[-50,5.1],[23.2,58]])box(.18,.14,b-a,pavingEdge,x,-.035,(a+b)/2,{cast:false});

 // Readable crossings and stop lines; no implied simulated traffic or navigation outcomes.
 for(const x of [-33,33])for(let z=6.4;z<22;z+=1.45)box(3.6,.006,.55,white,x,-.055,z,{cast:false});
 for(const z of [-19.9,25.2])for(const side of [-1,1])for(let x=28.8;x<37.8;x+=1.35)box(.52,.006,3.3,white,x*side,-.055,z,{cast:false});
 for(const side of [-1,1])for(let x=25.5;x<53;x+=5.5)if(Math.abs(x-33)>4.5)box(2.5,.006,.085,yellow,x*side,-.055,12.8,{cast:false});
 for(const x of [-33,33])for(let z=-47;z<56;z+=5.5)if(z<3||z>25)box(.085,.006,2.6,yellow,x,-.055,z,{cast:false});
 for(let x=-52;x<54;x+=5.5)if(Math.abs(Math.abs(x)-33)>6)box(2.6,.006,.085,yellow,x,-.055,-27,{cast:false});
 for(const x of [-27.2,27.2]){box(.16,.006,6.2,white,x,-.055,17.6,{cast:false});box(1.4,.006,.1,white,x+.62,-.055,20.65,{cast:false});}

 function facade(face,width,floors,wall,{bays=Math.max(2,Math.round(width/2.6)),groundEntry=true,balconies=false,frameMat=trim,windowStyle='sash'}={}){
  const floorH=3.05,bay=width/bays;
  for(let floor=0;floor<floors;floor++){
   const base=floor*floorH,nominalBottom=base+(floor===0?.45:.88),windowTop=base+(floor===0?2.5:2.53);
   if(!(floor===0&&groundEntry))faceBox(face,0,base+(nominalBottom-base)/2,0,width,nominalBottom-base,.25,wall);
   faceBox(face,0,windowTop+(base+floorH-windowTop)/2,0,width,base+floorH-windowTop,.25,wall);
   for(let bayId=0;bayId<bays;bayId++){
    const u=-width/2+(bayId+.5)*bay,entry=groundEntry&&floor===0&&bayId===Math.floor(bays/2),windowBottom=entry?.07:nominalBottom,windowH=windowTop-windowBottom,windowW=entry?1.13:Math.min(floor===0?1.85:windowStyle==='modern'?2.1:windowStyle==='warehouse'?1.85:1.4,bay-.42),pier=(bay-windowW)/2;
    if(floor===0&&groundEntry)faceBox(face,u,windowBottom/2,0,bay,windowBottom,.25,wall);
    faceBox(face,u-windowW/2-pier/2,windowBottom+windowH/2,0,pier,windowH,.25,wall);
    faceBox(face,u+windowW/2+pier/2,windowBottom+windowH/2,0,pier,windowH,.25,wall);
    faceBox(face,u,windowBottom+windowH/2,-.1,windowW+.035,windowH+.035,.035,recess,false);
    faceBox(face,u,windowBottom+windowH/2,-.074,windowW-.1,windowH-.1,.018,(bayId+floor)%3===0?glassDark:glass,false);
    faceBox(face,u-windowW/2,windowBottom+windowH/2,.025,.075,windowH+.15,.22,frameMat);
    faceBox(face,u+windowW/2,windowBottom+windowH/2,.025,.075,windowH+.15,.22,frameMat);
    faceBox(face,u,windowTop+.03,.025,windowW+.16,.09,.22,frameMat);
    faceBox(face,u,windowBottom-.055,.07,windowW+.27,.12,.39,frameMat);
    if(!entry){faceBox(face,u,windowBottom+windowH/2,.03,.037,windowH,.065,frameMat,false);faceBox(face,u,windowBottom+windowH*(windowStyle==='modern'?.5:.62),.03,windowW,.04,.065,frameMat,false);if(windowStyle==='warehouse')faceBox(face,u,windowBottom+windowH*.3,.03,windowW,.035,.065,frameMat,false);}
    else{faceBox(face,u,windowBottom+.14,-.04,windowW-.1,.28,.055,metal);faceBox(face,u+windowW*.3,windowBottom+.95,.075,.028,.38,.07,metal);faceBox(face,u,windowTop+.25,.25,windowW+.45,.09,.9,metal);}
    if(balconies&&floor===1&&bayId%2===0){faceBox(face,u,windowBottom-.18,.45,windowW+.4,.11,1.05,trim);faceBox(face,u,windowBottom+.38,.91,windowW+.3,.045,.04,metal);for(let k=0;k<7;k++)faceBox(face,u-windowW/2+k*windowW/6,windowBottom+.12,.91,.025,.5,.035,metal,false);}
   }
   faceBox(face,0,base+floorH-.08,.07,width+.1,.09,.28,trim);
  }
  if(!groundEntry)faceBox(face,0,.16,.03,width,.3,.31,darkMasonry);else for(let bayId=0;bayId<bays;bayId++)if(bayId!==Math.floor(bays/2))faceBox(face,-width/2+(bayId+.5)*bay,.16,.03,bay,.3,.31,darkMasonry);
 }
 const pedimentGeometry=new T.BufferGeometry();pedimentGeometry.setAttribute('position',new T.Float32BufferAttribute([-.5,0,0,.5,0,0,0,1,0],3));pedimentGeometry.setIndex([0,1,2]);pedimentGeometry.computeVertexNormals();
 function roofline(x,z,w,d,height,{gable=false,wall=masonry,stepped=false}={}){
  box(w+.3,.16,d+.3,trim,x,height+.07,z);
  if(gable){
   const sections=Math.max(2,Math.round(w/4.4)),sectionW=w/sections,pitch=.32,rise=sectionW*.25*Math.tan(pitch),peak=.25+2*rise;
   for(let i=0;i<sections;i++){const center=x-w/2+(i+.5)*sectionW;for(const sign of [-1,1])box(sectionW/2+.22,.13,d+.32,roof,center+sign*sectionW/4,height+.25+rise,z,{roll:-sign*pitch});for(const side of [-1,1])instance(pedimentGeometry,wall,V(center,height,z+side*(d/2+.055)),V(sectionW,peak,1),new T.Quaternion().setFromAxisAngle(V(0,1,0),side>0?0:Math.PI));}
  }else{
   box(w,.1,d,roof,x,height+.15,z,{cast:false});
   for(const side of [-1,1]){box(w+.2,.34,.18,trim,x,height+.27,z+side*(d/2+.02));box(.18,.34,d,trim,x+side*(w/2+.02),height+.27,z);}
   if(stepped){
    const px=x-w*.05,pz=z-d*.16,pw=w*.63,pd=d*.54;box(pw,1.7,pd,darkMasonry,px,height+1.05,pz);box(pw+.2,.16,pd+.2,roof,px,height+1.97,pz);
    for(let i=-1;i<=1;i++){box(1.65,1.0,.035,glassDark,px+i*pw*.29,height+1.12,pz+pd/2+.025,{cast:false});box(.045,1.0,.06,metal,px+i*pw*.29,height+1.12,pz+pd/2+.06,{cast:false});}
   }else{box(2.1,1.0,1.8,metal,x+w*.21,height+.7,z-d*.18);box(2.28,.08,1.96,roof,x+w*.21,height+1.24,z-d*.18);}
  }
  for(const sign of [-1,1]){box(.35,1.05,.5,masonry,x+sign*w*.34,height+.64,z-d*.27);box(.46,.08,.61,roof,x+sign*w*.34,height+1.2,z-d*.27);}
 }
 function fireEscape(face,height){
  const center=-2.1,levels=Math.max(1,Math.floor(height/3.05)-1);
  for(let level=1;level<=levels;level++){
   const y=level*3.05;faceBox(face,center,y,.68,3.05,.085,1.1,metal);
   faceBox(face,center,y+.85,1.2,3.08,.035,.035,metal,false);
   for(let bar=0;bar<12;bar++)faceBox(face,center-1.43+bar*.26,y+.43,1.2,.022,.84,.025,metal,false);
   for(const side of [-1,1])faceBox(face,center+side*1.5,y-.38,.29,.06,.7,.75,metal);
   if(level<levels){const sign=level%2?1:-1;for(let step=0;step<14;step++)faceBox(face,center-sign*1.3+sign*step*.185,y+step*.218,.64,.32,.055,.8,metal);const c=Math.cos(face.yaw),sn=Math.sin(face.yaw),point=(u,v,out)=>V(face.x+c*u+sn*out,v,face.z-sn*u+c*out);for(const edge of [.22,1.03])rod(point(center-sign*1.3,y+.8,edge),point(center+sign*1.3,y+3.65,edge),.021,metal,false);}
  }
  for(const side of [-1,1])faceBox(face,center+side*.3,2.55,1.08,.035,1.05,.04,metal,false);
  for(let i=0;i<5;i++)faceBox(face,center,2.1+i*.2,1.08,.6,.035,.04,metal,false);
 }
 function building({id,x,z,w,d,floors=3,wall=masonry,front=0,gable=false,balconies=false,style='stone',escape=false}){
  const height=floors*3.05,frameMat=['warehouse','modern'].includes(style)?metal:trim;
  box(w-.5,height,d-.5,wall,x,height/2,z);
  const faces=[{x,z:z+d/2,yaw:0,width:w},{x:x+w/2,z,yaw:Math.PI/2,width:d},{x,z:z-d/2,yaw:Math.PI,width:w},{x:x-w/2,z,yaw:-Math.PI/2,width:d}];
  for(let i=0;i<faces.length;i++)facade(faces[i],faces[i].width,floors,wall,{groundEntry:i===front,balconies:balconies&&i===front,frameMat,windowStyle:style,bays:Math.max(2,Math.round(faces[i].width/(style==='modern'?3.3:style==='warehouse'?2.9:2.6)))});
  if(style==='stone')for(const side of [-1,1])faceBox(faces[front],side*(faces[front].width/2-.18),height/2,.13,.27,height-.25,.28,trim);
  if(escape)fireEscape(faces[front],height);
  roofline(x,z,w,d,height,{gable,wall,stepped:style==='modern'});root.userData.buildings.push({id,center:[x,z],width:w,depth:d,height,style});
 }
 root.userData.buildings=[];

 // The original fronts now have side/rear walls and roofs, while the cafe interior stays open.
 box(16.1,5.55,15.0,redBrick,0,6.425,-10.3);
 for(const x of [-8.08,8.08])box(.25,3.55,15.1,redBrick,x,1.775,-10.3);
 facade({x:0,z:-17.9,yaw:Math.PI},16.2,3,redBrick,{groundEntry:true});
 roofline(0,-10.3,16.5,15.4,9.25);
 root.userData.buildings.push({id:'existing-cafe-return',center:[0,-10.3],width:16.5,depth:15.4,height:9.25});
 for(const side of [-1,1]){
  const x=side*15.3;box(13.7,10.05,14.6,masonry,x,5.025,-10.7);
  facade({x:side*22.3,z:-10.7,yaw:side*Math.PI/2},14.6,3,masonry,{groundEntry:true});
  facade({x,z:-18.1,yaw:Math.PI},13.8,3,masonry,{groundEntry:true});roofline(x,-10.7,14,14.8,10.05);
  root.userData.buildings.push({id:side<0?'existing-west-return':'existing-east-return',center:[x,-10.7],width:14,depth:14.8,height:10.05});
 }
 // Articulate the actual study frontage as well as its distant surroundings.
 // These shallow reveals cast useful shadows from the lower story camera;
 // nothing protrudes into the participants' walking strip.
 for(const side of [-1,1]){
  box(13.8,.24,.32,darkMasonry,side*15.3,.2,-2.67);
  box(13.95,.15,.55,trim,side*15.3,9.9,-2.63);
  for(const x of [side*8.42,side*22.12]){
   box(.26,9.7,.28,paleMasonry,x,4.94,-2.64);
   box(.45,.27,.47,trim,x,.24,-2.61);
   box(.48,.16,.5,trim,x,9.74,-2.6);
  }
  cylinder(.042,8.9,metal,side*8.72,4.53,-2.31);
  for(const y of [.55,3.45,6.35,8.6])box(.15,.055,.12,metal,side*8.72,y,-2.33);
 }
 for(const x of [-20.2,-15.9,-11.6,10.4,14.7,19])for(const y of [5.4,8.1]){
  // Existing glazing remains visible between the new jamb returns and sills.
  for(const side of [-1,1])box(.105,1.95,.3,trim,x+side*.98,y,-2.53);
  box(2.18,.1,.36,trim,x,y+1.0,-2.5);
  box(2.24,.14,.48,trim,x,y-1.0,-2.45);
 }
 // Architecture frames both intersections; the center remains an unobstructed camera corridor.
 building({id:'west-corner',x:-46,z:-11.4,w:13.8,d:17.4,floors:4,wall:redBrick,style:'warehouse',escape:true});
 building({id:'east-corner',x:46,z:-11.6,w:13.8,d:17.8,floors:3,wall:paleMasonry});
 building({id:'northwest-terrace',x:-46,z:-43.2,w:13.8,d:14.2,floors:3,wall:darkMasonry,gable:true,style:'terrace'});
 building({id:'north-terrace-west',x:-15.1,z:-43.2,w:14.2,d:14.2,floors:4,wall:paleMasonry,balconies:true});
 building({id:'north-terrace-east',x:5.2,z:-43.2,w:16.2,d:14.2,floors:3,wall:redBrick,gable:true,style:'terrace'});
 building({id:'northeast-terrace',x:45.8,z:-43.2,w:13.6,d:14.2,floors:4,wall:masonry,style:'modern'});
 building({id:'opposite-west-corner',x:-46,z:36.4,w:13.8,d:17,floors:3,wall:paleMasonry,front:2});
 building({id:'opposite-east-corner',x:46,z:36.4,w:13.8,d:17,floors:4,wall:darkMasonry,front:2,style:'modern',escape:true});

 function bench(x,z,yaw=0){
  const local=(u,y,v,w,h,d,mat,cast=true)=>faceBox({x,z,yaw},u,y,v,w,h,d,mat,cast);
  for(const v of [-.21,0,.21])local(0,.49,v,1.8,.055,.18,wood);
  for(const y of [.78,.98])local(0,y,.32,1.8,.14,.055,wood);
  for(const u of [-.67,.67]){local(u,.26,0,.055,.46,.52,metal);local(u,.73,.34,.045,.58,.045,metal);}
 }
 for(const x of [-18.5,18.5])for(const z of [28.2,43.5])bench(x,z,Math.PI);
 const gardenBeds=[];
 for(const side of [-1,1])for(const z of [35.5,49]){
  const x=side*14.8,w=7.4,d=7.3;gardenBeds.push({x,z,w,d});
  box(w,.18,d,masonry,x,.12,z);box(w-.38,.035,d-.38,planted,x,.222,z,{cast:false});
  for(const edge of [-1,1]){box(w+.08,.08,.23,trim,x,.28,z+edge*d/2);box(.23,.08,d,trim,x+edge*w/2,.28,z);}
  // Timber seating is integrated into the edge facing the open central walk.
  for(const offset of [-1.2,0,1.2]){box(.3,.07,.95,wood,x-side*(w/2+.07),.47,z+offset);box(.075,.16,.64,metal,x-side*(w/2+.07),.355,z+offset);}
  bench(x-side*(w/2+.95),z,side*Math.PI/2);
 }
 // A subtle spine and transverse bands give the plaza a legible spatial structure.
 for(const x of [-7.8,7.8])box(.23,.012,34,pavingEdge,x,.044,40.5,{cast:false});
 for(const z of [26.8,41.9,56.5])box(44,.012,.22,pavingEdge,0,.044,z,{cast:false});

 // Low planting beds, a few grounded autumn trees, cycle stands and drains.
 for(const x of [-21.2,21.2])for(const z of [32.7,49.7]){box(1.65,.42,2.6,masonry,x,.245,z);box(1.45,.045,2.4,grout,x,.47,z,{cast:false});}
 for(const x of [-19.5,-17.3,17.3,19.5])for(const z of [24.3,55.3])cylinder(.065,.72,metal,x,.39,z);
 for(const x of [-24.5,24.5])for(const z of [-13.5,-2,26.7]){box(.7,.025,.4,metal,x,.05,z,{cast:false});for(let k=0;k<6;k++)box(.065,.028,.34,grout,x-.25+k*.1,.067,z,{cast:false});}
 for(let i=0;i<5;i++){const x=14+i*.75,z=29.4;rod(V(x,.04,z-.3),V(x,.8,z-.3),.022,metal);rod(V(x,.8,z-.3),V(x,.8,z+.3),.022,metal);rod(V(x,.8,z+.3),V(x,.04,z+.3),.022,metal);}

 const leafGeometry=new T.BufferGeometry();leafGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.045,.06,.01,.045,.06,.01,-.035,.13,.015,.035,.13,.015,0,.21,0],3));leafGeometry.setIndex([0,2,1,1,2,4,1,4,3,3,4,5]);leafGeometry.computeVertexNormals();
 function tree(x,z,seed){const r=rng(seed),height=3.9+r()*.6;instance(trunkGeometry,bark,V(x,height/2+.04,z),V(.13,height,.13));
  for(let arm=0;arm<11;arm++){const angle=arm*2.399+r()*.4,base=V(x,2.4+arm*.12,z),reach=.85+r()*1.35,end=V(x+Math.cos(angle)*reach,height+.55+r()*1.25,z+Math.sin(angle)*reach);rod(base,end,.035,bark);
   for(let branch=0;branch<3;branch++){const turn=angle+(branch-1)*.55,tip=end.clone().add(V(Math.cos(turn)*(.35+r()*.5),.35+r()*.6,Math.sin(turn)*(.35+r()*.5)));rod(end,tip,.012,bark,false);
    for(let k=0;k<42;k++){const point=tip.clone().add(V((r()-.5)*1.0,(r()-.5)*.83,(r()-.5)*1.0)),q=new T.Quaternion().setFromEuler(new T.Euler(r()*Math.PI,r()*Math.PI*2,r()*Math.PI));color.setHSL(.18+r()*.08,.22+r()*.24,.29+r()*.2);instance(leafGeometry,leaves,point,V(1,1,1).multiplyScalar(.9+r()*.6),q,true,color);}
   }
  }
 }
 for(const [x,z,seed]of [[-20.8,2.2,811],[20.8,2.2,919],[-24.9,-10,71],[24.9,-10,91],[-21.2,32.7,31],[21.2,32.7,61],[-21.2,49.7,41],[21.2,49.7,51],[-14.8,35.5,411],[14.8,35.5,511],[-14.8,49,611],[14.8,49,711]])tree(x,z,seed);

 // Ground-level planting is individual leaves rather than solid green blocks.
 for(const bed of gardenBeds){const r=rng(Math.round((bed.x+40)*100+bed.z));for(let clump=0;clump<75;clump++){const center=V(bed.x+(r()-.5)*(bed.w-.8),.27+r()*.15,bed.z+(r()-.5)*(bed.d-.8));for(let blade=0;blade<10;blade++){const q=new T.Quaternion().setFromEuler(new T.Euler((r()-.5)*1.2,r()*Math.PI*2,(r()-.5)*.9));color.setHSL(.2+r()*.1,.25+r()*.22,.25+r()*.14);instance(leafGeometry,leaves,center.clone().add(V((r()-.5)*.22,r()*.16,(r()-.5)*.22)),V(1,1,1).multiplyScalar(.85+r()*.6),q,false,color);}}}

 // Transit context remains route 04, the same route already used by the authored study.
 for(const x of [-22.2,22.2]){cylinder(.032,2.8,metal,x,1.44,26.3);box(.57,.68,.07,paleMasonry,x,2.49,26.3);box(.45,.46,.075,metal,x,2.5,26.34);}
 // One atlas gives selected frontages identity without adding a material per sign.
 // Background services are architectural dressing, not additional simulated businesses or outcomes.
 root.userData.frontageSigns=[];
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;const ctx=canvas.getContext('2d');
  const titles=['COMMON GROUND','MERCER HOUSE','04','SCHOOL WALK →','NEIGHBORHOOD SERVICES','BOOKS & PAPER','REPAIRS','COFFEE · BAKED DAILY'];
  for(let cell=0;cell<titles.length;cell++){const x=cell%4*512,y=Math.floor(cell/4)*128;ctx.fillStyle=cell===5?'#75644f':cell===6?'#4d5d59':'#344342';ctx.fillRect(x,y,512,128);ctx.fillStyle='#e1dfd0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(cell===2?'500 102px':cell===4?'500 39px':'500 48px')+' sans-serif';ctx.fillText(titles[cell],x+256,y+67,470);ctx.strokeStyle='#b8b8a455';ctx.lineWidth=2;ctx.strokeRect(x+9,y+9,494,110);}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const signMaterial=new T.MeshBasicMaterial({map:texture}),positions=[],uvs=[],indices=[];
  function sign(cell,face,y,width,height,{u=0,out=.17,crop=[0,1]}={}){
   faceBox(face,u,y,out-.035,width+.1,height+.1,.065,metal,false);
   const first=positions.length/3,c=Math.cos(face.yaw),sn=Math.sin(face.yaw),col=cell%4,row=Math.floor(cell/4),left=(col+crop[0])/4,right=(col+crop[1])/4,bottom=1-(row+1)/2,top=1-row/2;
   for(const [dx,dy]of [[-width/2,-height/2],[width/2,-height/2],[-width/2,height/2],[width/2,height/2]])positions.push(face.x+c*(u+dx)+sn*out,y+dy,face.z-sn*(u+dx)+c*out);
   uvs.push(left,bottom,right,bottom,left,top,right,top);indices.push(first,first+1,first+2,first+2,first+1,first+3);root.userData.frontageSigns.push(titles[cell]);
  }
  sign(0,{x:0,z:-18.06,yaw:Math.PI},2.86,4.8,.34);
  sign(1,{x:-15.3,z:-18.1,yaw:Math.PI},2.85,4.9,.32);
  sign(6,{x:-46,z:-2.7,yaw:0},2.82,5.2,.38);
  sign(5,{x:46,z:-2.7,yaw:0},2.82,6.2,.38);
  sign(4,{x:-46,z:27.9,yaw:Math.PI},2.82,7.4,.36);
  sign(1,{x:46,z:27.9,yaw:Math.PI},2.82,5.4,.34);
  sign(1,{x:-15.1,z:-36.1,yaw:0},2.82,5.0,.34);
  for(const x of [-22.2,22.2])sign(2,{x,z:26.35,yaw:0},2.5,.44,.44,{out:.045,crop:[.34,.66]});
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const signs=new T.Mesh(geometry,signMaterial);signs.name='district / shared frontage sign atlas';signs.castShadow=false;root.add(signs);
 }

 // Material/geometry batching keeps the richer district inexpensive to draw.
 for(const batch of batches.values()){
  const mesh=new T.InstancedMesh(batch.geometry,batch.material,batch.items.length);mesh.name=batch.material.name+(batch.cast?' / shadowed':' / unshadowed');mesh.castShadow=batch.cast;mesh.receiveShadow=true;
  for(let i=0;i<batch.items.length;i++){mesh.setMatrixAt(i,batch.items[i].matrix);if(batch.items[i].tint)mesh.setColorAt(i,batch.items[i].tint);}
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
 }
 const bounds=new T.Box3(V(-54,-.15,-51),V(54,16.2,58));world.districtBounds=bounds;
 world.districtViewPoints=[V(-50,0,-36),V(50,0,-36),V(-50,13,32),V(50,13,32),V(-22,0,49),V(22,0,49),V(0,12,-18)];
 root.userData.summary={buildings:root.userData.buildings.length,instancedBatches:batches.size,instances:[...batches.values()].reduce((sum,b)=>sum+b.items.length,0),estimatedTriangles:[...batches.values()].reduce((sum,b)=>sum+(b.geometry.index?.count||b.geometry.attributes.position.count)/3*b.items.length,0),newLights:0,newHumans:0,animatedElements:0,plantedBeds:gardenBeds.length,canopyTrees:12,architectureStyles:['stone','warehouse','terrace','modern'],clearStudyStrip:{x:[-22.3,22.3],z:[-2.3,5]},buildingFreeCameraCorridor:{x:[-23,23],z:[23.1,70]},bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},roadTop:-.06,pavingTop:.035};
 return root;
}
