import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {residents,sampleResident,DECISION_TIME} from '../src/neighborhood-data.js';
import {DIFFERENCE_REPLAY_DURATION,normalizeDifferenceReplay,differenceReplaySignature,differenceReplayFrame,sampleDifferenceResident} from '../src/difference-replay.js';
const ids=residents.map(p=>p.id),motions=Object.fromEntries(ids.map(id=>[id,JSON.parse(fs.readFileSync(new URL('../public/assets/residents/'+id+'/motion.json',import.meta.url)))]));
const effect=(elapsed,changedIds=['daniel','amira'],active=true)=>normalizeDifferenceReplay({active,changedIds,elapsed,baseTime:DECISION_TIME},ids);

test('only known supplied changed IDs are encoded, including zero/all changed cases',()=>{
 assert.deepEqual(normalizeDifferenceReplay({active:true,changedIds:['daniel','unknown','daniel']},ids).changedIds,['daniel']);
 const none=differenceReplayFrame(effect(2,[]),DECISION_TIME,ids),all=differenceReplayFrame(effect(2,ids),DECISION_TIME,ids);
 assert.equal(none.active,false);assert.ok(Object.values(none.people).every(p=>!p.motionActive&&p.animationTime===DECISION_TIME));
 assert.ok(Object.values(all.people).every(p=>p.motionActive&&p.animationTime>DECISION_TIME));
});

test('unchanged people and environmental time stay exactly frozen while changed people use stationary motion',()=>{
 for(const elapsed of [.1,.6,1.4,2.8,4.5]){
  const frame=differenceReplayFrame(effect(elapsed),DECISION_TIME,ids);assert.equal(frame.environmentTime,DECISION_TIME);
  for(const resident of residents){const canonical=sampleResident(resident,DECISION_TIME,motions[resident.id]),sample=sampleDifferenceResident(resident,DECISION_TIME,motions[resident.id],frame);
   if(!frame.people[resident.id].affected){assert.deepEqual(sample.state,canonical);assert.equal(sample.animationTime,DECISION_TIME);assert.equal(frame.people[resident.id].ringPulse,0);}
   else{for(const field of ['x','y','z','yaw','phoneWeight','activity'])assert.equal(sample.state[field],canonical[field]);assert.ok(['idle','wait'].includes(sample.state.clip));assert.equal(sample.state.walking,false);assert.ok(sample.state.phoneTime>canonical.phoneTime);}
  }
 }
});

test('inactive and end-of-effect samples restore the canonical body and ring state exactly',()=>{
 for(const input of [effect(2,ids,false),effect(DIFFERENCE_REPLAY_DURATION,ids),effect(100,ids)]){
  const frame=differenceReplayFrame(input,DECISION_TIME,ids);assert.equal(frame.amount,0);
  for(const resident of residents){assert.deepEqual(sampleDifferenceResident(resident,DECISION_TIME,motions[resident.id],frame).state,sampleResident(resident,DECISION_TIME,motions[resident.id]));assert.equal(frame.people[resident.id].poseKey,'canonical');assert.equal(frame.people[resident.id].ringPulse,0);}
 }
});

test('elapsed seeking and repetition produce identical motion plans without mutating source inputs',()=>{
 const input=effect(2.3),snapshot=structuredClone(input),expected=differenceReplayFrame(input,DECISION_TIME,ids);
 for(const elapsed of [4.8,.3,5,0,3.1])differenceReplayFrame(effect(elapsed),DECISION_TIME,ids);
 assert.deepEqual(differenceReplayFrame(input,DECISION_TIME,ids),expected);assert.deepEqual(input,snapshot);
 for(const resident of residents)assert.deepEqual(sampleDifferenceResident(resident,DECISION_TIME,motions[resident.id],expected),sampleDifferenceResident(resident,DECISION_TIME,motions[resident.id],differenceReplayFrame(input,DECISION_TIME,ids)));
});

test('state signatures are stable for identical, clamped and inactive inputs',()=>{
 assert.equal(differenceReplaySignature(effect(2)),differenceReplaySignature(effect(2,['amira','daniel'])));
 assert.notEqual(differenceReplaySignature(effect(2)),differenceReplaySignature(effect(2.1)));
 assert.equal(differenceReplaySignature(effect(6)),differenceReplaySignature(effect(50)));
 assert.equal(differenceReplaySignature(effect(1,ids,false)),differenceReplaySignature(effect(4,[],false)));
 assert.equal(differenceReplaySignature(effect(1,[])),differenceReplaySignature(effect(4,[])));
});

test('the encoding never changes a different replay moment or acts before response records exist',()=>{
 for(const time of [0,6,13.99,15,27]){const frame=differenceReplayFrame(effect(2),time,ids);assert.equal(frame.active,false);assert.equal(frame.environmentTime,time);for(const resident of residents)assert.deepEqual(sampleDifferenceResident(resident,time,motions[resident.id],frame).state,sampleResident(resident,time,motions[resident.id]));}
});

test('renderer API invalidates only changed effect state and preserves world context',async()=>{
 const {Neighborhood}=await import('../src/neighborhood.js');
 let invalidations=0;const camera={position:[2,3,4]},run={id:'frozen-run'},world={time:DECISION_TIME,camera,run,differenceReplay:normalizeDifferenceReplay({},ids),differenceSignature:'canonical',scheduler:{invalidate:()=>invalidations++}};
 const set=input=>Neighborhood.prototype.setDifferenceReplay.call(world,input);
 assert.equal(set({active:false}),false);assert.equal(invalidations,0);
 assert.equal(set({active:true,changedIds:['daniel','amira'],elapsed:1,baseTime:DECISION_TIME}),true);assert.equal(invalidations,1);
 assert.equal(set({active:true,changedIds:['amira','daniel','unknown'],elapsed:1,baseTime:DECISION_TIME}),false);assert.equal(invalidations,1);
 assert.equal(set({active:true,changedIds:['daniel','amira'],elapsed:2,baseTime:DECISION_TIME}),true);assert.equal(invalidations,2);
 assert.equal(set({active:false}),true);assert.equal(invalidations,3);assert.equal(set({active:false,elapsed:4,changedIds:ids}),false);assert.equal(invalidations,3);
 assert.equal(world.time,DECISION_TIME);assert.equal(world.camera,camera);assert.equal(world.run,run);
});
