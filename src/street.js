import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {sampleMoment,soleHeight} from './motion.js';
import {buildCorner} from './corner.js';
class StreetAO extends GTAOPass{
 _overrideVisibility(){super._overrideVisibility();this.scene.traverse(o=>{if(o.isMesh&&o.visible&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.transparent)){o.visible=false;this._visibilityCache.push(o);}});}
}
const V=(x,y,z)=>new T.Vector3(x,y,z),ease=t=>t*t*(3-2*t);
function mat(color,extra={}){return new T.MeshStandardMaterial({color,roughness:.8,...extra});}
export class Street{
 constructor(host,{progress,renderMode='studio'}){
  this.host=host;this.progress=progress;this.mode='street';this.position=V(0,0,.5);this.activity='A moment before heading out';
  this.scene=new T.Scene();this.scene.background=new T.Color('#849295');this.scene.fog=new T.Fog('#849295',25,85);
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.info.autoReset=false;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;host.append(this.renderer.domElement);this.renderer.domElement.tabIndex=0;this.renderer.domElement.setAttribute('aria-label','Interactive street scene. Drag to orbit around Daniel; scroll to zoom. Space pauses.');
  this.camera=new T.PerspectiveCamera(36,1,.03,180);this.camera.position.set(3,1.9,4.5);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1,.5);this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.minDistance=.6;this.controls.maxDistance=18;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minPolarAngle=.3;this.controls.enablePan=false;this.controls.minAzimuthAngle=-1.3;this.controls.maxAzimuthAngle=1.3;this.controls.addEventListener('start',()=>{this.fly=null;this.autoYaw=false;});
  const sun=new T.DirectionalLight('#ffe0b5',2.4);sun.position.set(-8,12,8);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:45});sun.shadow.normalBias=.015;sun.shadow.bias=-.00015;this.scene.add(sun);this.scene.add(new T.HemisphereLight('#c7d7e3','#5c5548',.65));
  const fill=new T.DirectionalLight('#e2edf4',.8);fill.position.set(5,3,8);this.scene.add(fill);
  if(renderMode==='direct'){this.ao={enabled:false};this.focusPass={enabled:false};this.composer=null;}else{
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});target.samples=4;this.composer=new EffectComposer(this.renderer,target);this.composer.addPass(new RenderPass(this.scene,this.camera));this.ao=new StreetAO(this.scene,this.camera,1,1);this.ao.blendIntensity=.42;this.ao.updateGtaoMaterial({radius:.35,thickness:.6,samples:8,distanceFallOff:1});this.ao.updatePdMaterial({radius:3,samples:8});this.composer.addPass(this.ao);this.focusPass=new BokehPass(this.scene,this.camera,{focus:1.5,aperture:.0012,maxblur:.006});this.focusPass.enabled=false;this.composer.addPass(this.focusPass);this.composer.addPass(new OutputPass());}

  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 box(w,h,d,material,x,y,z,parent=this.scene,radius=.015){const mesh=new T.Mesh(radius?new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 async load(){
  const [gltf,hdr,motion]=await Promise.all([new GLTFLoader().loadAsync('/assets/person/person.gltf'),new HDRLoader().loadAsync('/assets/environment.hdr'),fetch('/assets/person/motion.json').then(r=>r.json())]);this.motion=motion;this.progress(70);
  const pmrem=new T.PMREMGenerator(this.renderer);this.env=pmrem.fromEquirectangular(hdr);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.6;hdr.dispose();pmrem.dispose();
  this.person=gltf.scene;this.actor=new T.Group();this.actor.add(this.person);this.scene.add(this.actor);this.morphMeshes=[];
  this.person.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;if(o.morphTargetInfluences)this.morphMeshes.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const key of ['map','normalMap'])if(m[key])m[key].anisotropy=this.renderer.capabilities.getMaxAnisotropy();m.envMapIntensity=.65;}}});
  this.mixer=new T.AnimationMixer(this.person);this.actions=Object.fromEntries(gltf.animations.map(c=>{const a=this.mixer.clipAction(c);a.play();a.weight=0;return[c.name,a];}));
  await buildCorner(this);this.batchStatic();this.progress(95);this.update(1.4,0);this.setView('street',true);await this.renderer.compileAsync(this.scene,this.camera);this.progress(100);
 }
 batchStatic(){
  this.scene.updateMatrixWorld(true);const buckets=new Map();
  this.scene.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent)return;let parent=o;while(parent){if(parent===this.actor)return;parent=parent.parent;}
   const key=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
  });
  for(const meshes of buckets.values()){if(meshes.length<3)continue;const geometries=meshes.map(o=>{let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();return g.applyMatrix4(o.matrixWorld);});const g=mergeGeometries(geometries,false);if(!g)continue;const mesh=new T.Mesh(g,meshes[0].material);mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;this.scene.add(mesh);for(const old of meshes)old.removeFromParent();for(const geo of geometries)geo.dispose();}
 }
 setView(mode,instant=false){this.mode=mode;this.focusPass.enabled=mode==='portrait';this.autoYaw=mode==='portrait';this.controls.minDistance=mode==='portrait'?.7:2.2;this.controls.maxDistance=mode==='portrait'?2.6:18;this.controls.minAzimuthAngle=mode==='portrait'?-Infinity:-1.3;this.controls.maxAzimuthAngle=mode==='portrait'?Infinity:1.3;const x=this.position.x,z=this.position.z;
  const views={street:[V(x+3,1.9,z+4.5),V(x,1.02,z)],portrait:[V(x+.65,1.72,z+1.35),V(x,1.58,z)],wide:[V(8,4.4,10),V(0,1.3,-1)]};let [pos,target]=views[mode];if(mode==='portrait')pos.sub(this.position).applyAxisAngle(V(0,1,0),this.yaw||0).add(this.position);this.fly={pos,target};if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){this.camera.position.copy(pos);this.controls.target.copy(target);this.fly=null;}this.controls.update();
 }
 update(time,dt){
  const state=sampleMoment(time,this.motion),{x,yaw}=state;this.activity=state.activity;
  const lookTime=(time+100)%this.actions.look.getClip().duration,contact=soleHeight(this.motion[state.clip],state.local)*(1-state.lookWeight)+soleHeight(this.motion.look,lookTime)*state.lookWeight;
  const next=V(x,.037-contact,.5),delta=next.clone().sub(this.position);this.position.copy(next);if(this.mode!=='wide'){this.camera.position.add(delta);this.controls.target.add(delta);if(this.fly){this.fly.pos.add(delta);this.fly.target.add(delta);}}
  if(this.mode==='portrait'&&this.autoYaw){const turn=yaw-(this.yaw||0);this.camera.position.sub(next).applyAxisAngle(V(0,1,0),turn).add(next);if(this.fly)this.fly.pos.sub(next).applyAxisAngle(V(0,1,0),turn).add(next);}this.yaw=yaw;
  if(this.actor){this.actor.position.copy(next);this.actor.rotation.y=yaw;for(const a of Object.values(this.actions))a.weight=0;this.actions[state.clip].weight=1-state.lookWeight;this.actions[state.clip].time=state.local;this.actions.look.weight=state.lookWeight;this.actions.look.time=lookTime;this.mixer.update(0);
   const blink=Math.max(0,...[1.6,4.2,9.7,10.2,15.3,20.7,25.1].map(b=>{const t=(time-b)/.16;return t>=0&&t<=1?Math.sin(t*Math.PI):0;}));for(const mesh of this.morphMeshes)for(const [name,i]of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[i]=/EyeBlink/.test(name)?blink:/MouthSmile/.test(name)?.04:0;
  }
  if(this.fly){const k=1-Math.exp(-dt*4.5);this.camera.position.lerp(this.fly.pos,k);this.controls.target.lerp(this.fly.target,k);if(this.camera.position.distanceTo(this.fly.pos)<.002)this.fly=null;}
  this.controls.update();if(this.focusPass.enabled)this.focusPass.uniforms.focus.value=this.camera.position.distanceTo(this.controls.target);this.renderer.info.reset();this.composer.render();this.host.dataset.drawCalls=String(this.renderer.info.render.calls);
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.composer?.setSize(w,h);}
}
