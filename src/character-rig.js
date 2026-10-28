import * as T from 'three';
export function prepareCharacter(person,animations,metadata=null){
 const morphMeshes=[];person.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;if(o.morphTargetInfluences)morphMeshes.push(o);}});
 const minimumRoughness=metadata?.materialCalibration?.minimumRoughness;
 if(Number.isFinite(minimumRoughness)&&minimumRoughness>=0&&minimumRoughness<=1){person.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.userData.minimumRoughnessApplied)continue;m.userData.minimumRoughnessApplied=minimumRoughness;const prior=m.onBeforeCompile;m.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, '+minimumRoughness.toFixed(3)+');');};m.customProgramCacheKey=()=> 'sapien-roughness-floor-'+minimumRoughness;m.needsUpdate=true;}});}
 const mixer=new T.AnimationMixer(person),actions=Object.fromEntries(animations.map(clip=>{const action=mixer.clipAction(clip).play();action.weight=0;return[clip.name,action];}));
 const names=metadata?.rig||{rightHand:'Bip01_R_Hand',leftHand:'Bip01_L_Hand',finger:'Bip01_R_Finger1',head:'Bip01_Head'};
 const face={};for(const name of metadata?.faceBones||[]){const bone=person.getObjectByName(name);if(bone)face[name]={bone,q:bone.quaternion.clone(),p:bone.position.clone()};}
 return {person,mixer,actions,morphMeshes,face,metadata,rightHand:person.getObjectByName(names.rightHand),leftHand:person.getObjectByName(names.leftHand),finger:person.getObjectByName(names.finger),head:person.getObjectByName(names.head)};
}
const Q=new T.Quaternion(),WQ=new T.Quaternion(),PQ=new T.Quaternion(),direction=new T.Vector3(),forward=new T.Vector3(),point=new T.Vector3();
export function updateCharacterPose(character,state,time,{faceMode='natural',gazeTarget=null}={}){
 const {actions,mixer,person,face,morphMeshes}=character;
 // Restore facial joints before applying a pose; seeking never accumulates edits.
 for(const f of Object.values(face)){f.bone.quaternion.copy(f.q);f.bone.position.copy(f.p);}
 for(const action of Object.values(actions))action.weight=0;
 actions[state.clip].weight=(1-state.phoneWeight)*(1-(state.blend?.weight||0));actions[state.clip].time=state.local;if(state.blend){actions[state.blend.clip].weight+=(1-state.phoneWeight)*state.blend.weight;actions[state.blend.clip].time=state.blend.local;}actions.phone.weight=state.phoneWeight;actions.phone.time=state.phoneTime;mixer.update(0);person.updateMatrixWorld(true);
 if(typeof gazeTarget==='function')gazeTarget=gazeTarget(character);
 const pulse=(t,period)=>{const phase=((t%period)+period)%period;return phase<.18?Math.sin(phase/.18*Math.PI):0;};
 const blink=faceMode==='neutral'||faceMode==='gaze'||faceMode==='expression'?0:faceMode==='blink'?pulse(time,1.6):pulse(time+1.3,4.7);
 for(const mesh of morphMeshes)for(const[name,index]of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=/EyeBlink/.test(name)?blink:0;
 for(const side of ['l','r']){
  const lid=face['eyelid_'+side];if(lid){const rest=character.metadata?.faceCalibration?.lidRelaxation||0;const closure=character.metadata?.faceCalibration?.blinkRotation||.85;lid.bone.quaternion.copy(lid.q).multiply(Q.setFromAxisAngle(new T.Vector3(0,0,1),-rest-(closure-rest)*blink));}
  const eye=face['eye_'+side];if(eye&&gazeTarget){eye.bone.getWorldPosition(point);direction.copy(gazeTarget).sub(point).normalize();eye.bone.getWorldQuaternion(WQ);forward.set(1,0,0).applyQuaternion(WQ).normalize();Q.setFromUnitVectors(forward,direction);const angle=2*Math.acos(Math.min(1,Math.abs(Q.w)));if(angle>.18)Q.identity().slerp(new T.Quaternion().setFromUnitVectors(forward,direction),.18/angle);WQ.premultiply(Q);eye.bone.parent.getWorldQuaternion(PQ);eye.bone.quaternion.copy(PQ.invert().multiply(WQ));}
 }
 if(faceMode==='expression'){
  const amount=(Math.sin(time*1.8)+1)/2;
  for(const side of ['l','r']){const mouth=face['mouth_'+side];if(mouth)mouth.bone.position.x+=.12*amount;const brow=face['eyebrow_'+side];if(brow)brow.bone.position.x+=.08*amount;}
  if(face.jaw)face.jaw.bone.quaternion.multiply(Q.setFromAxisAngle(new T.Vector3(0,0,1),.018*amount));
 }
 person.updateMatrixWorld(true);return {blink,gazeControlled:!!face.eye_l&&!!face.eye_r};
}
export function positionPhone(character,phone,phoneWeight){
 phone.visible=phoneWeight>.7;if(!phone.visible||!character.rightHand)return;
 const wrist=character.rightHand.getWorldPosition(new T.Vector3()),finger=(character.finger||character.rightHand).getWorldPosition(new T.Vector3());phone.position.copy(wrist.lerp(finger,.7));phone.position.y+=.035;phone.lookAt((character.head||character.rightHand).getWorldPosition(new T.Vector3()));
}
