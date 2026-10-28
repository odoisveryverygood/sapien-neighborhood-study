import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {Street} from './street.js';
import {buildDistrict} from './district.js';
import {buildTransitBus} from './transit-bus.js';
import {applyStreetAtmosphere} from './street-atmosphere.js';
import {buildCorner} from './corner.js';
import {residents,sampleResident,choiceMeta,exampleRun,OFFER_TIME,DECISION_TIME} from './neighborhood-data.js';
import {RenderScheduler} from './render-scheduler.js';
import {DIFFERENCE_REPLAY_DURATION,normalizeDifferenceReplay,differenceReplaySignature,differenceReplayFrame,sampleDifferenceResident} from './difference-replay.js';
import {PopulationLens} from './population-lens.js';
import {safeFrame,fitCamera,boxCorners} from './camera-framing.js';
import {prepareCharacter,updateCharacterPose,positionPhone} from './character-rig.js';
const V=(x,y,z)=>new T.Vector3(x,y,z);
const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
export class Neighborhood extends Street{
 constructor(host,options){
  super(host,{...options,renderMode:'direct'});this.scheduler=new RenderScheduler();this.renderer.shadowMap.autoUpdate=false;this.controls.addEventListener('change',()=>{this.scheduler.invalidate();this.lastCameraMotionAt=performance.now();});this.onSelect=options.onSelect;this.mode='block';this.people=[];this.selected=null;this.run=exampleRun;this.time=0;this.cameraLayout={leftInset:0,rightInset:0,topInset:64,bottomInset:0};this.routeVisible=false;this.differenceReplay=normalizeDifferenceReplay({},residents.map(r=>r.id));this.differenceSignature=differenceReplaySignature(this.differenceReplay);
  this.renderer.domElement.setAttribute('aria-label','Interactive Mercer neighborhood. Select a named person to inspect their day and response. Drag to look around; scroll to zoom.');
  this.scene.background=new T.Color('#a9b5b4');this.scene.fog=new T.Fog('#a9b5b4',48,100);
  this.controls.minDistance=2;this.controls.maxDistance=48;this.controls.minPolarAngle=.28;this.controls.maxPolarAngle=1.48;this.controls.minAzimuthAngle=-1.5;this.controls.maxAzimuthAngle=1.5;
  this.controls.addEventListener('start',()=>{this.fly=null;});
  const sun=this.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,far:65});sun.position.set(-13,20,13);sun.shadow.camera.updateProjectionMatrix();
  this.renderer.domElement.addEventListener('pointerdown',e=>{this.down=document.body.classList.contains('question-open')?null:[e.clientX,e.clientY];});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(performance.now()<(this.ignorePickUntil||0)||!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>6)return;const bounds=this.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1),this.camera);const hits=ray.intersectObjects(this.people.map(p=>p.person),true);if(hits.length){let item=hits[0].object;while(item&&!item.userData.residentId)item=item.parent;if(item)this.onSelect?.(item.userData.residentId);}});
 }
 async load(){
  const loader=new GLTFLoader();
  const tasks=residents.map(async r=>{
   const base='/assets/residents/'+r.id;
   const [gltf,motion]=await Promise.all([loader.loadAsync(base+'/person.gltf'),fetch(base+'/motion.json').then(res=>{if(!res.ok)throw Error('Missing motion for '+r.id);return res.json();})]);
   return {definition:r,gltf,motion,metadata:null};
  });
  const [loaded,hdr]=await Promise.all([Promise.all(tasks),new HDRLoader().loadAsync('/assets/environment.hdr')]);this.progress(58);
  const pmrem=new T.PMREMGenerator(this.renderer);this.env=pmrem.fromEquirectangular(hdr);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.7;hdr.dispose();pmrem.dispose();
  this.actor=new T.Group();this.scene.add(this.actor);
  for(const {definition:r,gltf,motion,metadata}of loaded){
   const actor=new T.Group(),person=gltf.scene;actor.add(person);this.actor.add(actor);person.userData.residentId=r.id;
   const morphMeshes=[];person.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;if(o.morphTargetInfluences)morphMeshes.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const key of ['map','normalMap'])if(m[key])m[key].anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());m.envMapIntensity=.6;}}});
   const rig=prepareCharacter(person,gltf.animations,metadata);
   const ring=new T.Mesh(new T.RingGeometry(.4,.46,64),new T.MeshBasicMaterial({color:r.color,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.048;this.actor.add(ring);
   const phone=new T.Group();this.actor.add(phone);this.box(.069,.137,.009,material('#182324',{metalness:.7,roughness:.3}),0,0,0,phone,.004);this.box(.059,.119,.001,new T.MeshBasicMaterial({color:'#779b99'}),0,0,.005,phone,.002);
   this.people.push({...rig,id:r.id,definition:r,actor,motion,ring,phone,position:V(...[r.origin[0],0,r.origin[1]])});
  }
  this.host.dataset.characterAssets=JSON.stringify(Object.fromEntries(this.people.map(p=>[p.id,p.metadata?.id||'rocketbox'])));
  this.studyLens=new PopulationLens(this.actor,{participantIds:residents.map(r=>r.id),colors:Object.fromEntries(Object.entries(choiceMeta).map(([choice,meta])=>[choice,meta.color])),responseTime:DECISION_TIME});
  await buildCorner(this);buildDistrict(this);this.host.dataset.district=JSON.stringify(this.districtGroup.userData.summary);this.addNeighborhoodDetails();this.makeWeather();applyStreetAtmosphere(this);this.batchStatic();this.progress(88);
  this.update(0,0);this.setView('story',true);this.update(0,0);await this.renderer.compileAsync(this.scene,this.camera);this.progress(100);
 }
 addNeighborhoodDetails(){
  const dark=material('#203e39'),cream=material('#c4bfa9'),metal=material('#3c4a49',{metalness:.55}),glass=material('#778e8e',{metalness:.45,roughness:.2});
  const signs=[];
  const sign=(text,x,y,z,w,h,color='#e3ddca',bg='#26463d')=>signs.push({text,x,y,z,w,h,color,bg});
  sign('MERCER HOUSE',-12.3,3.25,-2.29,5,.4);sign('SCHOOL WALK  →',13.3,3.25,-2.29,5,.4);sign('CAMPUS  ·  BUS 04',-11.9,2.5,4.2,2.1,.5,'#e9e2ce','#5c6d62');
  // A proper shelter and boarding area establish the waiting commuter's day.
  const shelter=new T.Group();shelter.position.set(-12.2,0,4.25);this.scene.add(shelter);
  for(const x of [-1.6,1.6])this.box(.055,2.5,.055,metal,x,1.25,0,shelter,.01);
  this.box(3.8,.12,1.5,dark,0,2.6,-.2,shelter,.025);this.box(3.3,.08,.44,cream,0,.55,0,shelter,.02);
  for(const x of [-1.35,1.35])this.box(.06,.53,.38,metal,x,.26,0,shelter,.01);
  this.box(.065,2.3,.065,dark,-2.3,1.15,.4,shelter,.01);this.box(.55,.7,.055,cream,-2.3,2.1,.4,shelter,.03);
  // A schematic route diagram identifies the commuter's destination. It carries
  // no invented departure times, service measurements or additional study facts.
  sign('04\nMERCER\n│\nCAMPUS',-14.5,2.1,4.685,.48,.62,'#28453d','#e3dfcf');
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=256*signs.length;const ctx=atlas.getContext('2d'),positions=[],uvs=[],indices=[];
  signs.forEach(({text,x,y,z,w,h,color,bg},i)=>{
   ctx.save();ctx.translate(0,i*256);ctx.scale(1024/w,256/h);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('\n');ctx.font=`500 ${h*(lines.length>1?.155:.5)}px sans-serif`;lines.forEach((line,j)=>ctx.fillText(line,w/2,h*(j+.5)/lines.length,w*.93));ctx.restore();
   const base=positions.length/3,top=1-i/signs.length,bottom=1-(i+1)/signs.length;positions.push(x-w/2,y-h/2,z,x+w/2,y-h/2,z,x-w/2,y+h/2,z,x+w/2,y+h/2,z);uvs.push(0,bottom,1,bottom,0,top,1,top);indices.push(base,base+1,base+2,base+2,base+1,base+3);
  });
  const map=new T.CanvasTexture(atlas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());const signGeo=new T.BufferGeometry();signGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));signGeo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));signGeo.setIndex(indices);signGeo.computeVertexNormals();const streetSigns=new T.Mesh(signGeo,new T.MeshBasicMaterial({map}));streetSigns.name='Study location signs / one shared atlas';this.scene.add(streetSigns);
  // Apartment windows read as a continuous block from the pulled-back camera.
  for(const x of [-20.2,-15.9,-11.6,10.4,14.7,19])for(const y of [5.4,8.1]){this.box(1.9,1.85,.12,cream,x,y,-2.65);this.box(1.65,1.6,.04,glass,x,y,-2.55);this.box(.045,1.65,.05,cream,x,y,-2.5);}

  // Service area is intentionally schematic, matching the study's authored trade-off.
  const zone=new T.Group();zone.visible=false;this.zone=zone;this.actor.add(zone);
  const patch=new T.Mesh(new T.PlaneGeometry(26,3),new T.MeshBasicMaterial({color:'#caa375',transparent:true,opacity:.13,depthWrite:false,side:T.DoubleSide}));patch.rotation.x=-Math.PI/2;patch.position.set(3,.043,1.2);zone.add(patch);
  const edge=new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(26,3)),new T.LineDashedMaterial({color:'#cca276',dashSize:.25,gapSize:.2,transparent:true,opacity:.6}));edge.rotation.x=-Math.PI/2;edge.position.copy(patch.position);edge.position.y=.049;edge.computeLineDistances();zone.add(edge);zone.userData.patch=patch;zone.userData.edge=edge;
  const transit=buildTransitBus();this.bus=transit.group;this.busWheels=transit.wheels;this.actor.add(this.bus);
  const routeGeo=new T.BufferGeometry().setFromPoints([V(0,0,0),V(1,0,0)]);this.route=new T.Line(routeGeo,new T.LineDashedMaterial({color:'#e4cfaa',dashSize:.16,gapSize:.12,transparent:true,opacity:.8,depthWrite:false}));this.actor.add(this.route);this.route.visible=false;
 }
 makeWeather(){
  let seed=9201;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  this.drops=Array.from({length:700},()=>({x:(rnd()-.5)*44,y:rnd()*10,z:(rnd()-.5)*18+5,s:.7+rnd()*.6}));
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(this.drops.length*6),3));this.rain=new T.LineSegments(geo,new T.LineBasicMaterial({color:'#cddad8',transparent:true,opacity:.22,depthWrite:false}));this.rain.frustumCulled=false;this.scene.add(this.rain);
 }
 setRun(run){this.run=run;this.poseDirty=true;this.scheduler?.invalidate();}
 /** Deterministic display encoding only; never seeks the world, camera, or active run. */
 setDifferenceReplay(input={}){
  const next=normalizeDifferenceReplay(input,residents.map(r=>r.id)),signature=differenceReplaySignature(next);
  if(signature===this.differenceSignature)return false;
  this.differenceReplay=next;this.differenceSignature=signature;this.scheduler?.invalidate();return true;
 }

 select(id,focus=true){this.scheduler?.invalidate();this.selected=id;this.filter=null;if(focus)this.setView('person');}
 setFilter(choice){this.filter=choice;this.selected=null;this.setView('block');}
 setCoverage(visible){this.coverageVisible=visible;}
 setHighlightedIds(ids){this.highlightedIds=ids;this.scheduler?.invalidate();}
 setStudyLens(state){if(!this.studyLens)return;this.scheduler?.invalidate();const wasVisible=this.studyLens.isVisibleFor(this.time);this.studyLens.set(state);if(!wasVisible&&this.studyLens.isVisibleFor(this.time)&&this.mode==='block')this.setView('block');this.host.dataset.lensState=JSON.stringify(this.studyLens.state(this.time));}
 lensMarkerPositions(){return this.studyLens?.markerPositions(this.camera,this.host.clientWidth,this.host.clientHeight)||[];}
 /** A study chapter directs attention, but never changes replay time or result data. */
 focusMoment({personId=null,view=personId?'person':'block',instant=false,showRoute=false,coverage=false,highlightIds=null}={}){
  this.selected=this.people.some(p=>p.id===personId)?personId:null;this.filter=null;
  this.routeVisible=showRoute;this.coverageVisible=coverage;this.highlightedIds=highlightIds;
  this.setView(view,instant);
 }
 /** Use CSS-pixel insets for the UI around the world. No camera reset or time seek. */
 setCameraLayout(layout={}){
  this.cameraLayout={...this.cameraLayout,...layout};this.applyCameraLayout();this.scheduler?.invalidate();
 }
 applyCameraLayout(){
  if(!this.camera||!this.host.clientWidth||!this.host.clientHeight)return;
  const w=this.host.clientWidth,h=this.host.clientHeight,frame=safeFrame(w,h,this.cameraLayout);
  this.camera.setViewOffset(w,h,frame.offsetX,frame.offsetY,w,h);this.camera.updateProjectionMatrix();
  this.host.dataset.safeFrame=JSON.stringify(frame);
 }
 setView(mode,instant=false){
  if(!['story','block','district','person','face','moment'].includes(mode))mode='block';
  if(!['story','block','district'].includes(mode)&&!this.selected)mode='block';
  this.mode=mode;this.controls.enablePan=mode==='district';this.controls.minAzimuthAngle=mode==='district'?-Infinity:-1.5;this.controls.maxAzimuthAngle=mode==='district'?Infinity:1.5;this.camera.fov=mode==='district'?44:mode==='story'?(this.host.clientWidth<700?46:40):this.host.clientWidth<700?48:36;const w=this.host.clientWidth||innerWidth,h=this.host.clientHeight||innerHeight;
  this.scene.fog.near=w<700?90:48;this.scene.fog.far=w<700?180:100;
  this.focusPass.enabled=false;this.ao.enabled=false;this.scheduler?.invalidate();
  this.controls.minDistance=mode==='face'?.7:mode==='moment'?1.7:mode==='person'?2.7:mode==='story'?9.5:12;
  this.controls.maxDistance=mode==='district'?160:mode==='face'?6:mode==='moment'?12:mode==='person'?18:100;
  const person=this.people.find(p=>p.id===this.selected),p=person?.position||V(0,0,1);
  this.storyAnchorId=mode==='story'&&w<700?(person||this.people.find(p=>p.id==='daniel'))?.id:null;
  let target,points,direction,minDistance,maxDistance;
  if(mode==='story'){
   // Street-level establishing shot: the cafe threshold, rider and student,
   // rather than a roof/road survey. The four-person block view remains separate.
   const lead=this.people.find(p=>p.id===this.storyAnchorId);
   const bounds=lead?new T.Box3(V(lead.position.x-1.7,.02,lead.position.z-.45),V(lead.position.x+1.7,3.35,lead.position.z+.45)):new T.Box3(V(-7.15,.02,-2.65),V(7.15,4.0,3.2));
   if(!lead)for(const actor of this.people.filter(p=>['daniel','maya'].includes(p.id))){bounds.expandByPoint(actor.position.clone().add(V(-.55,0,-.3)));bounds.expandByPoint(actor.position.clone().add(V(.55,2.1,.3)));}
   target=bounds.getCenter(V(0,0,0));points=boxCorners(bounds.min,bounds.max);direction=V(.48,.09,1);minDistance=lead?9.5:17;maxDistance=72;
  }else if(mode==='district'){target=V(-1.5,2.2,-.7);points=[];direction=V(.62,.46,.85);minDistance=30;maxDistance=160;}else if(mode==='block'){
   const bounds=new T.Box3();for(const actor of this.people){bounds.expandByPoint(actor.position.clone().add(V(-.65,0,-.4)));bounds.expandByPoint(actor.position.clone().add(V(.65,2.1,.4)));}
   if(bounds.isEmpty())bounds.set(V(-13,0,0),V(13,2,4));
   for(const point of this.studyLens?.fitPoints(this.time)||[])bounds.expandByPoint(point);
   bounds.expandByVector(V(1.2,.2,.8));target=bounds.getCenter(V(0,0,0));
   points=boxCorners(bounds.min,bounds.max);direction=V(.1,.28,1);minDistance=19;maxDistance=95;
  }else if(mode==='person'){
   target=V(p.x,1.0,p.z);points=boxCorners(V(p.x-.6,.025,p.z-.3),V(p.x+.6,2.02,p.z+.3));direction=V(4.5,1.2,3.6);minDistance=4.7;maxDistance=17;
  }else{
   const head=person?.head?.getWorldPosition(V(0,0,0))||V(p.x,1.65,p.z);
   if(mode==='moment'){target=head.clone().add(V(0,-.42,0));points=boxCorners(V(p.x-.7,.45,p.z-.35),V(p.x+.7,head.y+.22,p.z+.35));direction=V(.38,.08,1);minDistance=3.25;maxDistance=12;}
   else{target=head.clone().add(V(0,-.015,0));points=boxCorners(head.clone().add(V(-.38,-.28,-.12)),head.clone().add(V(.38,.28,.2)));direction=V(.14,.025,1);minDistance=1.45;maxDistance=6;}
  }
  const pos=mode==='district'?V(10,5.8,22):fitCamera(points,target,direction,{fov:this.camera.fov,aspect:this.camera.aspect,width:w,height:h,layout:this.cameraLayout,minDistance,maxDistance,padding:mode==='block'?.91:.92});
  const focusDistance=pos.distanceTo(target);this.scene.fog.near=focusDistance+18;this.scene.fog.far=focusDistance+85;
  this.applyCameraLayout();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(instant||reduced){this.camera.position.copy(pos);this.controls.target.copy(target);this.fly=null;this.controls.update();this.host.dataset.cameraSettled='true';}
  else{this.fly={fromPos:this.camera.position.clone(),fromTarget:this.controls.target.clone(),pos,target,elapsed:0,duration:['story','block'].includes(mode)?1.9:1.5};this.host.dataset.cameraSettled='false';}
 }
 update(time,dt){
  const perfStarted=performance.now();
  this.controls.update();const encodingMoving=this.differenceReplay.active&&this.differenceReplay.changedIds.length>0&&this.differenceReplay.elapsed>0&&this.differenceReplay.elapsed<DIFFERENCE_REPLAY_DURATION&&Math.abs(time-this.differenceReplay.baseTime)<1e-6;const moving=time!==this._posedAt||!!this.fly||encodingMoving||perfStarted-(this.lastCameraMotionAt||0)<180;const ratio=Math.min(devicePixelRatio,moving?1.25:1.75);if(this.renderer.getPixelRatio()!==ratio){this.renderer.setPixelRatio(ratio);this.scheduler?.invalidate();}const transitioning=this.studyLens?.requestedVisible&&[...this.studyLens.links.values()].some(link=>link.elapsed<.48);
  if(this.scheduler&&!this.scheduler.shouldRender({time,cameraMoving:!!this.fly,transitioning})){if(!this.schedulePublished||perfStarted-this.schedulePublished>1000){this.schedulePublished=perfStarted;this.host.dataset.renderSchedule=JSON.stringify({rendered:this.scheduler.rendered,skipped:this.scheduler.skipped,paused:true});}return false;}
  const poseChanged=this._posedAt!==time||this.poseDirty,differenceChanged=this._differenceRenderedSignature!==this.differenceSignature;this.time=time;let actorPoseChanged=false;
  const difference=differenceReplayFrame(this.differenceReplay,time,residents.map(r=>r.id));
  if(poseChanged||differenceChanged){
  for(const p of this.people){const plan=difference.people[p.id];p.differencePlan=plan;if(!poseChanged&&p._differencePoseKey===plan.poseKey)continue;const sampled=sampleDifferenceResident(p.definition,time,p.motion,difference),state=sampled.state;p.state=state;p.animationTime=sampled.animationTime;p._differencePoseKey=plan.poseKey;actorPoseChanged=true;if((['person','face','moment'].includes(this.mode)&&this.selected===p.id)||(this.mode==='story'&&this.storyAnchorId===p.id)){const delta=V(state.x-p.position.x,0,state.z-p.position.z);this.camera.position.add(delta);this.controls.target.add(delta);if(this.fly){for(const key of ['fromPos','fromTarget','pos','target'])this.fly[key].add(delta);}}p.position.set(state.x,state.y,state.z);p.actor.position.copy(p.position);p.actor.rotation.y=state.yaw;
   p.actor.updateMatrixWorld(true);
   updateCharacterPose(p,state,p.animationTime+p.definition.depart,{gazeTarget:state.phoneWeight>.7?()=>{positionPhone(p,p.phone,state.phoneWeight);return p.phone.position.clone();}:null});
   positionPhone(p,p.phone,state.phoneWeight);
   const record=this.run.participants.find(r=>r.id===p.id),color=time>=DECISION_TIME?choiceMeta[record.response.choice].color:p.definition.color;
   p.ring.position.set(state.x,.049,state.z);p.ring.material.color.set(color);p.ring.material.opacity=this.selected===p.id?.7:this.highlightedIds?(this.highlightedIds.includes(p.id)?.65:.035):this.selected ? .035 : .22;p.ring.scale.setScalar(this.selected===p.id?1.2:1);
  }
  if(poseChanged){
  if(this.bus){this.bus.position.set(-55+time*2.2,-.07,10.6);for(const wheel of this.busWheels||[]){wheel.rotation.set(Math.PI/2,0,0);wheel.rotateY(-time*2.2/.47);}}
  if(this.rain){const a=this.rain.geometry.attributes.position;this.drops.forEach((d,i)=>{const y=((d.y-time*3.1*d.s)%10+10)%10; a.setXYZ(i*2,d.x,y,d.z);a.setXYZ(i*2+1,d.x+.025,y+.12,d.z);});a.needsUpdate=true;}
  if(this.contactShadows){const d=new T.Object3D();this.people.forEach((p,i)=>{d.position.set(p.position.x,.043,p.position.z);d.rotation.set(-Math.PI/2,0,-p.state.yaw);d.updateMatrix();this.contactShadows.setMatrixAt(i,d.matrix);});this.contactShadows.instanceMatrix.needsUpdate=true;}
  }
  if(actorPoseChanged)this.renderer.shadowMap.needsUpdate=true;this._posedAt=time;this.poseDirty=false;this._differenceRenderedSignature=this.differenceSignature;}
  for(const p of this.people){const record=this.run.participants.find(r=>r.id===p.id),plan=difference.people[p.id];p.differencePlan=plan;p.ring.material.color.set(time>=DECISION_TIME?choiceMeta[record.response.choice].color:p.definition.color);let opacity=this.selected===p.id?.7:this.highlightedIds?(this.highlightedIds.includes(p.id)?.65:.035):this.selected?.035:.22,scale=this.selected===p.id?1.2:1;if(plan.affected&&plan.amount>0){opacity=Math.max(opacity,.68*plan.amount+.27*plan.ringPulse);scale+=.22*plan.amount+.2*plan.ringPulse;}p.ring.material.opacity=opacity;p.ring.scale.setScalar(scale);}
  this.host.dataset.differenceReplay=JSON.stringify(difference);
  if(this.zone){this.zone.visible=!!this.coverageVisible&&time>=OFFER_TIME;const improved=this.run.offer.coverageState==='improved';this.zone.userData.patch.material.color.set(improved?'#7daf9b':'#caa375');this.zone.userData.edge.material.color.set(improved?'#9fc6b5':'#cca276');}
  const selected=this.people.find(p=>p.id===this.selected);this.route.visible=!!selected&&this.routeVisible;
  if(selected){const d=selected.definition;const points=[V(d.origin[0],.054,d.origin[1]),V(selected.position.x,.054,selected.position.z)];const attr=this.route.geometry.attributes.position;points.forEach((v,i)=>attr.setXYZ(i,v.x,v.y,v.z));attr.needsUpdate=true;this.route.geometry.computeBoundingSphere();this.route.computeLineDistances();}
  if(this.fly){this.fly.elapsed+=dt;const u=Math.min(1,this.fly.elapsed/this.fly.duration),k=u*u*(3-2*u);this.camera.position.lerpVectors(this.fly.fromPos,this.fly.pos,k);this.controls.target.lerpVectors(this.fly.fromTarget,this.fly.target,k);if(u===1){this.fly=null;this.host.dataset.cameraSettled='true';}}else this.host.dataset.cameraSettled='true';
  this.controls.update();if(this.streetSky)this.streetSky.position.copy(this.camera.position);if(this.studyLens){this.studyLens.update({time,dt,camera:this.camera,anchorFor:id=>{const person=this.people.find(p=>p.id===id);return person?.head?.getWorldPosition(V(0,0,0))||person?.position.clone().add(V(0,1.75,0));}});this.host.dataset.lensState=JSON.stringify(this.studyLens.state(time));}const perfPrepared=performance.now();this.renderer.info.reset();this.renderer.render(this.scene,this.camera);this.scheduler?.didRender(time);this.host.dataset.renderSchedule=JSON.stringify({rendered:this.scheduler?.rendered,skipped:this.scheduler?.skipped,paused:false});this.perfSamples??=[];this.perfSamples.push({cpu:perfPrepared-perfStarted,render:performance.now()-perfPrepared});if(this.perfSamples.length>120)this.perfSamples.shift();if(!this.perfPublished||performance.now()-this.perfPublished>1000||time===DECISION_TIME){this.perfPublished=performance.now();const values=key=>this.perfSamples.map(s=>s[key]).sort((a,b)=>a-b),percentile=(key,q)=>+values(key)[Math.floor((this.perfSamples.length-1)*q)].toFixed(2);this.host.dataset.performance=JSON.stringify({cpuMsP50:percentile("cpu",.5),cpuMsP95:percentile("cpu",.95),submissionMsP50:percentile("render",.5),submissionMsP95:percentile("render",.95),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,pixelRatio:this.renderer.getPixelRatio(),ao:this.ao.enabled,frames:this.perfSamples.length});}this.host.dataset.drawCalls=String(this.renderer.info.render.calls);this.host.dataset.replayTime=time.toFixed(3);if(poseChanged||actorPoseChanged)this.host.dataset.worldState=JSON.stringify({time:+time.toFixed(4),people:this.people.map(p=>({id:p.id,position:p.position.toArray(),clip:p.state.clip,local:p.state.local,phone:p.state.phoneWeight,phoneTime:p.state.phoneTime,animationTime:p.animationTime})),bus:this.bus?.position.toArray(),rain:this.rain?Array.from(this.rain.geometry.attributes.position.array.slice(0,6)):[]});this.host.dataset.camera=JSON.stringify({position:this.camera.position.toArray().map(n=>+n.toFixed(6)),target:this.controls.target.toArray().map(n=>+n.toFixed(6)),mode:this.mode,person:this.selected});
 }
 resize(){if(this.camera)this.camera.fov=this.host.clientWidth<700?48:36;super.resize();if(this.cameraLayout){this.applyCameraLayout();if(this.people?.length)this.setView(this.mode,true);}}
 markerPositions(){return this.people.map(p=>{const point=V(p.position.x,2.12,p.position.z).project(this.camera);return {id:p.id,x:(point.x+1)/2*this.host.clientWidth,y:(1-point.y)/2*this.host.clientHeight,visible:point.z<1&&point.z>-1&&Math.abs(point.x)<1&&Math.abs(point.y)<1,activity:p.state?.activity};});}
}
