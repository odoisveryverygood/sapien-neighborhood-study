import * as T from 'three';

/** A restrained morning sky and local contact grounding, with no screen-space passes. */
export function applyStreetAtmosphere(world){
 const sky=new T.Mesh(new T.SphereGeometry(145,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#819db7')},horizon:{value:new T.Color('#dce3df')}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;varying vec3 vPosition;void main(){float h=clamp(normalize(vPosition).y,0.0,1.0);vec3 color=mix(horizon,zenith,pow(h,.45));gl_FragColor=vec4(color,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'.replace(';#include',';\n#include')}));
 sky.name='Soft morning sky';sky.renderOrder=-10;sky.frustumCulled=false;world.scene.add(sky);
 world.scene.background=new T.Color('#dce3df');world.scene.fog=new T.Fog('#dce3df',48,105);
 world.scene.environmentIntensity=.62;world.renderer.toneMappingExposure=.98;
 const sun=world.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);
 sun.color.set('#ffead0');sun.intensity=2.9;sun.position.set(-18,22,14);
 Object.assign(sun.shadow.camera,{left:-26,right:26,top:24,bottom:-24,near:1,far:80});sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;sun.shadow.camera.updateProjectionMatrix();
 for(const light of world.scene.children){if(light.isHemisphereLight){light.color.set('#c4d4df');light.groundColor.set('#68695e');light.intensity=.64;}else if(light.isDirectionalLight&&!light.castShadow){light.color.set('#dce7ee');light.intensity=.42;}}
 // Existing texture detail survives close shots without the paving looking
 // embossed or glazed. People and their source materials are left untouched.
 const adjusted=new Set();world.scene.traverse(o=>{
  if(!o.isMesh)return;for(let parent=o;parent;parent=parent.parent)if(parent===world.actor)return;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!material||adjusted.has(material))continue;adjusted.add(material);
   const source=material.map?.source?.data,src=source?.currentSrc||source?.src||'';
   if(src.includes('floor-color')){material.normalScale?.set(.2,.2);material.roughness=.94;if('clearcoat'in material)material.clearcoat=0;}
   if(src.includes('plaster-color'))material.normalScale?.set(.2,.2);
   if(material.bumpScale===.025||material.name==='district / asphalt'){material.color.set('#c5cac6');material.roughness=.94;}
  }
 });
 // The map is shared by four grounded contact patches. It cannot move while time is frozen.
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,64);g.addColorStop(0,'rgba(15,22,21,.42)');g.addColorStop(.4,'rgba(15,22,21,.20)');g.addColorStop(1,'rgba(15,22,21,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const contacts=new T.InstancedMesh(new T.PlaneGeometry(1.3,.8),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),world.people.length);contacts.name='Resident contact grounding';contacts.frustumCulled=false;contacts.renderOrder=1;world.actor.add(contacts);world.contactShadows=contacts;
 world.streetSky=sky;
}
