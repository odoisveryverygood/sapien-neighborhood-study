import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const P=(c,extra={})=>new T.MeshStandardMaterial({color:c,roughness:.8,...extra});
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
export async function buildCorner(world){
 const {scene}=world,box=(...a)=>world.box(...a),loader=new T.TextureLoader();
 const [brickColor,brickNormal,concreteColor,concreteNormal,plasterColor,plasterNormal,plasterRough,floorColor,floorNormal,floorRough]=await Promise.all(['brick-color.webp','brick-normal.webp','concrete-color.webp','concrete-normal.webp','plaster-color.jpg','plaster-normal.jpg','plaster-roughness.jpg','floor-color.jpg','floor-normal.jpg','floor-roughness.jpg'].map(n=>loader.loadAsync('/assets/surfaces/'+n)));
 for(const t of [plasterColor,plasterNormal,plasterRough]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(6.3,4.5);t.anisotropy=8;}plasterColor.colorSpace=T.SRGBColorSpace;
 for(const t of [floorColor,floorNormal,floorRough]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(.59,.44);t.anisotropy=8;}floorColor.colorSpace=T.SRGBColorSpace;
 for(const t of [brickColor,brickNormal,concreteColor,concreteNormal]){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=world.renderer.capabilities.getMaxAnisotropy();}
 brickColor.colorSpace=concreteColor.colorSpace=T.SRGBColorSpace;brickColor.repeat.set(4,1.8);brickNormal.repeat.copy(brickColor.repeat);concreteColor.repeat.set(.65,.65);concreteNormal.repeat.copy(concreteColor.repeat);
 const brick=P('#c9a88e',{map:brickColor,normalMap:brickNormal,normalScale:new T.Vector2(.85,.85),roughness:.94});
 const stone=new T.MeshPhysicalMaterial({color:'#dddcd1',map:floorColor,normalMap:floorNormal,roughnessMap:floorRough,normalScale:new T.Vector2(.5,.5),roughness:.85,clearcoat:.12,clearcoatRoughness:.45});
 const grout=P('#737970');box(100,.2,100,grout,0,-.225,0,undefined,0);
 const slabGeo=new RoundedBoxGeometry(1.18,.075,.88,1,.008),slabs=new T.InstancedMesh(slabGeo,stone,440),dummy=new T.Object3D(),r=random(200);let count=0;const slabColor=new T.Color();
 for(let x=-22;x<22;x++)for(let z=-4;z<6;z++){dummy.position.set(x*1.2,-.002,z*.9);dummy.updateMatrix();slabs.setMatrixAt(count,dummy.matrix);slabColor.setRGB(.82+r()*.18,.83+r()*.16,.82+r()*.16);slabs.setColorAt(count++,slabColor);}slabs.castShadow=false;slabs.receiveShadow=true;scene.add(slabs);
 const asphaltTexture=canvasTexture(512,512,(ctx,w,h)=>{const rng=random(44),d=ctx.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const q=45+rng()*25;d.data[i]=q*.9;d.data[i+1]=q*.98;d.data[i+2]=q;d.data[i+3]=255;}ctx.putImageData(d,0,0);});asphaltTexture.wrapS=asphaltTexture.wrapT=T.RepeatWrapping;asphaltTexture.repeat.set(18,5);
 box(100,.14,18,P('#92958e',{map:asphaltTexture,bumpMap:asphaltTexture,bumpScale:.025,roughness:.67}),0,-.15,14,undefined,0);
 const curb=P('#b1b4a6',{map:concreteColor,normalMap:concreteNormal,normalScale:new T.Vector2(.3,.3)});for(let x=-24;x<24;x++)box(.98,.18,.28,curb,x,-.037,5.07,undefined,.015);
 for(let x=-20;x<20;x+=5.5)box(2.5,.006,.09,P('#c3b491'),x,-.056,12.8,undefined,0);
 const paint=P('#173e34',{roughness:.62}),paintLight=P('#284b40',{roughness:.7}),trim=P('#bbb399'),black=P('#202b27',{metalness:.45,roughness:.45});
 // The façade is built around real openings, so glass reveals a furnished interior.
 box(16.4,5.8,.5,brick,0,6.3,-2.9,undefined,.015);
 for(const x of [-7.8,7.8])box(.8,3.7,.65,brick,x,1.8,-2.86);
 box(15.2,.32,.7,trim,0,3.6,-2.7);box(16.8,.19,.85,trim,0,3.87,-2.64);box(15.2,.16,.65,paint,0,3.34,-2.55);
 for(const x of [-7,-.9,.9,7]){box(.22,3.18,.36,paint,x,1.6,-2.48);box(.32,.15,.43,paintLight,x,.13,-2.43);box(.33,.2,.48,paintLight,x,3.07,-2.45);}
 for(const x of [-3.95,3.95]){
  box(5.8,.51,.24,paint,x,.29,-2.49);box(5.8,.22,.3,paint,x,2.98,-2.46);
  for(const a of [x-1.85,x,x+1.85])box(.065,2.4,.13,paint,a,1.72,-2.28,undefined,.007);
  box(5.75,.075,.15,paint,x,2.57,-2.3,undefined,.006);box(5.75,.1,.32,paintLight,x,.58,-2.35);
 }
 const glass=new T.MeshPhysicalMaterial({color:'#b7d1c9',transparent:true,opacity:.15,metalness:.2,roughness:.12,clearcoat:1,clearcoatRoughness:.05,side:T.DoubleSide,depthWrite:false});
 for(const x of [-3.95,3.95])box(5.68,2.32,.025,glass,x,1.75,-2.34,undefined,0);
 box(1.53,.09,.28,trim,0,.08,-2.28);box(1.52,.48,.2,paint,0,.35,-2.62);for(const x of [-.67,.67])box(.18,2.4,.2,paint,x,1.76,-2.62);box(1.52,.15,.2,paint,0,3.02,-2.62);box(1.17,2.06,.06,glass,0,1.7,-2.49);for(const x of [-.62,.62])box(.055,2.25,.05,paintLight,x,1.7,-2.44);box(1.23,.05,.08,paintLight,0,2.72,-2.44);box(.035,.34,.06,P('#c2b087',{metalness:.7,roughness:.3}),.43,1.36,-2.37);
 // Interior: depth, shelving, light fixtures and a coffee counter.
 box(15,.14,5.5,P('#756a54'),0,-.01,-5.3);box(15,3.7,.2,P('#b5a48a'),0,1.85,-7.9);box(15,.15,5.5,P('#3e4438'),0,3.5,-5.3);
 const woodMap=canvasTexture(512,512,(ctx,w,h)=>{const rng=random(71);ctx.fillStyle='#8b6341';ctx.fillRect(0,0,w,h);for(let i=0;i<700;i++){const y=rng()*h;ctx.strokeStyle=`rgba(${rng()>.5?'205,160,105':'63,42,24'},${.06+rng()*.1})`;ctx.lineWidth=.3+rng()*2;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(170,y+(rng()-.5)*10,340,y+(rng()-.5)*10,w,y);ctx.stroke();}});woodMap.wrapS=woodMap.wrapT=T.RepeatWrapping;
 const oak=P('#d7b78b',{map:woodMap,roughness:.53}),white=P('#e5dfcf',{roughness:.3}),chrome=P('#a7b4b0',{metalness:.9,roughness:.2});
 box(6.4,1.0,.7,oak,2.6,.53,-5.9);box(6.55,.09,.9,white,2.6,1.07,-5.88);
 for(const y of [1.65,2.25])box(6,.065,.32,oak,2.5,y,-7.55);
 for(let i=0;i<18;i++){const x=.2+i*.28;const y=i%2?1.82:2.42;const jar=new T.Mesh(new T.CylinderGeometry(.07,.07,.2,16),P(i%3?'#b79872':'#5f6c4d',{roughness:.4}));jar.position.set(x,y,-7.5);scene.add(jar);}
 box(1.55,.48,.47,chrome,2.4,1.35,-5.9);box(1.65,.07,.52,black,2.4,1.11,-5.79);box(1.45,.12,.1,black,2.4,1.47,-5.63);for(const x of [2,2.8]){cylinder(.055,.08,chrome,x,1.24,-5.55,scene);rod([x,1.2,-5.62],[x,1.19,-5.37],.025,black);cup(x,1.13,-5.57,.62);}
 cup(3.6,1.12,-5.8,.8);cup(3.87,1.12,-5.8,.8);
 // Window seating on the left gives the interior readable layers at street level.
 box(5.5,.48,.65,oak,-3.8,.3,-7.28);box(5.5,.7,.1,P('#8c7857'),-3.8,.85,-7.62);for(const x of [-5.3,-2.8]){cylinder(.46,.055,oak,x,.8,-5.8);cylinder(.035,.72,black,x,.4,-5.8);cup(x,.84,-5.8,.8);chair(x,-4.95,Math.PI);}
 sign('SLOW MORNINGS',-4.1,2.15,-7.75,3.7,.5,{bg:'#a99473',color:'#443f2c',font:'500 90px Georgia'});

 for(const x of [-4.5,-2.1,2.6,5]){
  cylinder(.014,1.05,black,x,2.95,-4.2,scene);const shade=new T.Mesh(new T.ConeGeometry(.3,.23,32,1,true),paint);shade.position.set(x,2.4,-4.2);scene.add(shade);const bulb=new T.Mesh(new T.SphereGeometry(.07,16,12),new T.MeshBasicMaterial({color:'#ffe0a1'}));bulb.position.set(x,2.32,-4.2);scene.add(bulb);if(x===2.6){const light=new T.PointLight('#ffc47a',8,7,2);light.position.set(x,2.25,-4.2);scene.add(light);}
 }
 RectAreaLightUniformsLib.init();for(const x of [0]){const inner=new T.RectAreaLight('#ffd49b',3,10,2);inner.position.set(x,2,-3);inner.lookAt(x,1,-8);scene.add(inner);}
 for(const x of [0]){const light=new T.RectAreaLight('#ffc47f',2.5,10,2);light.position.set(x,1.8,-3.3);light.lookAt(x,1.1,2);scene.add(light);}
 sign('COMMON GROUND',0,3.22,-2.31,11.7,.42,{bg:'#193e32',color:'#e8dec3',font:'500 76px Georgia',sub:''});
 // A fabric canopy has a sloping profile and a scalloped hem.
 const cloth=canvasTexture(512,256,(ctx,w,h)=>{ctx.fillStyle='#d1cbb8';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=64){ctx.fillStyle='#244b3c';ctx.fillRect(x,0,34,h);}const rng=random(1);for(let i=0;i<8000;i++){ctx.fillStyle=`rgba(29,44,30,${rng()*.08})`;ctx.fillRect(rng()*w,rng()*h,1,1);}});cloth.wrapS=cloth.wrapT=T.RepeatWrapping;cloth.repeat.set(5,1);
 const canopyGeo=new T.PlaneGeometry(14.4,1.8,36,8),pos=canopyGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),v=(pos.getY(i)+.9)/1.8;pos.setXYZ(i,x,3.65-v*.43,-2.5+v*1.8);}canopyGeo.computeVertexNormals();const canopy=new T.Mesh(canopyGeo,P('#ffffff',{map:cloth,side:T.DoubleSide}));canopy.castShadow=true;scene.add(canopy);
 const hem=new T.PlaneGeometry(14.4,.25,80,2);const hp=hem.attributes.position;for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i);hp.setY(i,y+(y<0?-.045*Math.cos(x*7):0));}hem.computeVertexNormals();const frill=new T.Mesh(hem,P('#ffffff',{map:cloth,side:T.DoubleSide}));frill.position.set(0,3.1,-.7);frill.castShadow=true;scene.add(frill);
 for(const x of [-6.8,6.8])rod([x,2.2,-2.4],[x,3.23,-.73],.025,black);
 // Upstairs windows, sills and stone trim break up the flat wall.
 for(const x of [-5.1,0,5.1])for(const y of [5.25,8.1]){
  box(2.3,2.2,.17,trim,x,y,-2.57);box(2.04,1.95,.07,black,x,y,-2.44);
  const upperGlass=new T.MeshPhysicalMaterial({color:'#718c91',metalness:.45,roughness:.16,clearcoat:1});box(1.85,1.77,.018,upperGlass,x,y,-2.38,undefined,0);
  box(.055,1.85,.05,trim,x,y,-2.32,undefined,.005);box(1.9,.055,.05,trim,x,y,-2.32,undefined,.005);box(2.48,.14,.4,trim,x,y-1.13,-2.4);
 }
 // Neighboring masonry extends beyond the frame instead of ending at a model-board edge.
 const plaster=P('#e4dfd2',{map:plasterColor,normalMap:plasterNormal,roughnessMap:plasterRough,normalScale:new T.Vector2(.45,.45),roughness:.95});
 for(const x of [-15.2,15.2]){box(14,10,.7,plaster,x,5,-3.1);box(14,.25,.8,trim,x,3.8,-2.8);for(const a of [-3,1,5]){box(2.2,2.5,.15,black,x+a,1.5,-2.66);box(1.95,2.2,.05,P('#50645e',{metalness:.3,roughness:.3}),x+a,1.55,-2.56);}}
 // Outdoor furniture sits behind the clear walking strip at z=0.5.
 for(const x of [-5.1,5.1]){table(x,-1.15);chair(x-.85,-1.12,Math.PI/2);chair(x+.85,-1.12,-Math.PI/2);cup(x+.15,.83,-1.18,.8);}
 const menu=new T.Group();menu.position.set(6.1,0,2.4);menu.rotation.y=-.22;scene.add(menu);box(.84,1.05,.055,oak,0,.72,0,menu,.015);box(.71,.9,.02,P('#28392d'),0,.72,.038,menu,.003);for(const x of [-.43,.43])rod([x,.03,-.3],[x,1.27,.02],.028,oak,menu);sign('GOOD MORNING',6.1,1.03,2.47,.65,.17,{bg:'#293d31',color:'#e1d2ad',font:'500 62px Georgia'});sign('COFFEE  &  COMPANY',6.1,.64,2.49,.65,.13,{bg:'#293d31',color:'#d1c5a7',font:'500 48px Georgia'});
 plant(-6.6,-1.2,1);plant(6.6,-1.2,.95);
 // A parked delivery cycle makes the rider's work legible without adding another person.
 const cycle=new T.Group();cycle.position.set(-8.8,.035,-1.3);cycle.rotation.y=.2;scene.add(cycle);
 const tire=P('#272e29',{roughness:.94}),frame=P('#6c775d',{metalness:.45,roughness:.42}),bag=P('#6d7851',{roughness:.96});
 const a=[-.64,.38,0],b=[.65,.38,0],crank=[0,.39,0],seat=[-.2,.94,0],stem=[.4,.94,0];
 for(const cx of [-.64,.65]){const wheel=new T.Mesh(new T.TorusGeometry(.35,.026,7,40),tire);wheel.position.set(cx,.38,0);cycle.add(wheel);const rim=new T.Mesh(new T.TorusGeometry(.317,.009,5,40),chrome);rim.position.set(cx,.38,0);cycle.add(rim);for(let i=0;i<14;i++){const ang=i*Math.PI/7;rod([cx,.38,0],[cx+Math.cos(ang)*.315,.38+Math.sin(ang)*.315,0],.0025,chrome,cycle);}}
 for(const [from,to] of [[a,seat],[seat,crank],[a,crank],[seat,stem],[crank,stem],[stem,b]])rod(from,to,.019,frame,cycle);
 rod([-.2,.89,0],[-.23,1.04,0],.012,chrome,cycle);box(.23,.05,.13,tire,-.23,1.055,0,cycle,.018);rod(stem,[.47,1.08,0],.014,chrome,cycle);rod([.47,1.08,-.19],[.47,1.08,.19],.013,chrome,cycle);
 for(const z of [-.13,.13]){rod([-.64,.43,z],[-.65,.83,z],.012,black,cycle);rod([-.96,.83,z],[-.34,.83,z],.013,black,cycle);}box(.44,.43,.36,bag,-.65,1.06,0,cycle,.025);box(.46,.035,.38,frame,-.65,1.29,0,cycle,.01);for(const x of [-.78,-.52])box(.025,.43,.367,black,x,1.065,0,cycle,.004);
 rod([-.03,.4,0],[.05,.07,.28],.01,chrome,cycle);

 sign('COFFEE · BAKED DAILY',-3.95,2.05,-2.30,3.1,.25,{bg:'transparent',color:'#eee2c1',font:'500 48px Georgia'});
 // A drain and sparse grit keep the street from reading as a clean white stage.
 box(.65,.025,.33,black,3,.048,4.3,undefined,.01);for(let i=0;i<11;i++)box(.025,.028,.28,chrome,2.72+i*.055,.053,4.3,undefined,.003);
 const wet=new T.MeshPhysicalMaterial({color:'#5d716f',roughness:.1,metalness:.15,transparent:true,opacity:.2,clearcoat:1,clearcoatRoughness:.05,depthWrite:false});for(const [x,z,s]of [[-4,3.5,1.2],[3,3.8,.8],[6,4,.65]]){const m=new T.Mesh(new T.CircleGeometry(s,60),wet);m.rotation.x=-Math.PI/2;m.position.set(x,.037,z);m.scale.set(1,.36,1);scene.add(m);}
 function cylinder(radius,height,material,x,y,z,parent=scene){const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,height,24),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function rod(a,b,radius,material,parent=scene){const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);const mesh=cylinder(radius,dir.length(),material,0,0,0,parent);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return mesh;}
 function cup(x,y,z,scale=1){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);scene.add(g);const profile=[new T.Vector2(.033,0),new T.Vector2(.044,.015),new T.Vector2(.049,.105),new T.Vector2(.045,.11),new T.Vector2(.04,.1),new T.Vector2(.037,.025)];const c=new T.Mesh(new T.LatheGeometry(profile,32),white);g.add(c);const handle=new T.Mesh(new T.TorusGeometry(.026,.007,8,24),white);handle.position.set(.055,.06,0);g.add(handle);cylinder(.037,.003,P('#3b2413',{roughness:.25}),0,.094,0,g);return g;}
 function table(x,z){cylinder(.55,.045,oak,x,.81,z);cylinder(.035,.71,black,x,.43,z);for(const a of [0,Math.PI*.5,Math.PI,Math.PI*1.5])rod([x,.15,z],[x+Math.cos(a)*.38,.05,z+Math.sin(a)*.38],.022,black);}
 function chair(x,z,rotation){const g=new T.Group();g.position.set(x,.035,z);g.rotation.y=rotation;scene.add(g);for(const dx of [-.19,.19])for(const dz of [-.19,.19])rod([dx,.03,dz],[dx,.45,dz],.017,black,g);for(let i=0;i<5;i++)box(.42,.025,.067,oak,0,.46,-.17+i*.08,g,.007);for(const x of [-.2,.2])rod([x,.4,.2],[x,.86,.24],.018,black,g);for(let i=0;i<3;i++)box(.43,.07,.025,oak,0,.65+i*.09,.23,g,.007);}
 function sign(text,x,y,z,w,h,{bg,color,font}){const map=canvasTexture(1536,256,(ctx,cw,ch)=>{if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);}ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=font;ctx.fillText(text,cw/2,ch/2,cw*.94);});const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:bg==='transparent',side:T.DoubleSide}));m.position.set(x,y,z);scene.add(m);return m;}
 function plant(x,z,scale){
  const g=new T.Group();g.position.set(x,.035,z);g.scale.setScalar(scale);scene.add(g);
  const pot=new T.Mesh(new T.CylinderGeometry(.31,.23,.55,32),P('#6b5b42',{roughness:.95}));pot.position.y=.275;pot.castShadow=pot.receiveShadow=true;g.add(pot);cylinder(.28,.02,P('#3a3323'),0,.55,0,g);
  const rng=random(x*100+900),geo=new T.PlaneGeometry(.13,.36,4,8),p=geo.attributes.position;
  for(let j=0;j<p.count;j++){const u=(p.getY(j)+.18)/.36;p.setX(j,p.getX(j)*Math.sin(u*Math.PI));p.setZ(j,Math.sin(u*Math.PI)*.04);}geo.computeVertexNormals();
  const leaves=new T.InstancedMesh(geo,P('#567e4d',{side:T.DoubleSide,roughness:.72}),75),stems=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,6),P('#5a6540'),75),d=new T.Object3D(),color=new T.Color();
  for(let i=0;i<75;i++){const angle=rng()*Math.PI*2,h=.6+rng()*.8,rad=.07+rng()*.3;
   d.position.set(Math.cos(angle)*(rad+.07),h+.1,Math.sin(angle)*(rad+.07));d.rotation.set(-.2+rng(),angle,rng()-.5);d.scale.setScalar(.85+rng()*.35);d.updateMatrix();leaves.setMatrixAt(i,d.matrix);color.setHSL(.23+rng()*.06,.22+rng()*.15,.35+rng()*.15);leaves.setColorAt(i,color);
   const a=new T.Vector3(0,.5,0),b=new T.Vector3(Math.cos(angle)*rad,h,Math.sin(angle)*rad),dir=b.clone().sub(a);d.position.copy(a.add(b).multiplyScalar(.5));d.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());d.scale.set(.006,dir.length(),.006);d.updateMatrix();stems.setMatrixAt(i,d.matrix);
  }leaves.castShadow=leaves.receiveShadow=true;stems.castShadow=true;g.add(leaves,stems);
 }
}
