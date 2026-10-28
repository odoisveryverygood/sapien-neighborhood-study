import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PopulationLens} from '../src/population-lens.js';
import {residents,choiceMeta,responseGroups,DECISION_TIME} from '../src/neighborhood-data.js';
import {sampleComparison} from '../src/comparison-data.js';

const groupsFor=run=>Object.entries(responseGroups(run)).map(([choice,memberIds])=>({choice,label:choiceMeta[choice].label,count:memberIds.length,memberIds}));
const anchors=Object.fromEntries(residents.map(person=>[person.id,new T.Vector3(person.origin[0],1.7,person.origin[1])]));
function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,16/9,.03,180);
 camera.position.set(0,8,30);camera.lookAt(0,2,2.8);camera.updateMatrixWorld(true);
 const lens=new PopulationLens(scene,{participantIds:residents.map(p=>p.id),colors:Object.fromEntries(Object.entries(choiceMeta).map(([choice,meta])=>[choice,meta.color])),responseTime:DECISION_TIME});
 const update=(time=DECISION_TIME,dt=0)=>lens.update({time,dt,camera,anchorFor:id=>anchors[id]?.clone()});
 return {lens,camera,update};
}

test('lens and labels stay hidden before the response, when disabled, or when records are not ready',()=>{
 const {lens,camera,update}=fixture(),groups=groupsFor(sampleComparison.runs.original);
 lens.set({visible:true,groups,ready:true});update(DECISION_TIME-.001);
 assert.equal(lens.group.visible,false);assert.deepEqual(lens.markerPositions(camera,1280,720),[]);assert.deepEqual(lens.fitPoints(DECISION_TIME-.001),[]);
 update();assert.equal(lens.group.visible,true);assert.equal(lens.markerPositions(camera,1280,720).length,3);
 lens.set({visible:true,groups,ready:false});update();assert.equal(lens.group.visible,false);
 lens.set({visible:false,groups,ready:true});update();assert.equal(lens.group.visible,false);
});

test('supplied membership creates exactly one link per actual participant and preserves source counts',()=>{
 const {lens,camera,update}=fixture(),groups=groupsFor(sampleComparison.runs.original),before=structuredClone(groups);
 lens.set({visible:true,groups});update();
 assert.equal(lens.links.size,residents.length);assert.deepEqual(groups,before,'The renderer must not mutate supplied records');
 for(const group of groups){assert.equal(lens.groups.find(g=>g.choice===group.choice).count,group.count);for(const id of group.memberIds)assert.equal(lens.links.get(id).choice,group.choice);}
 assert.equal(lens.markerPositions(camera,1280,720).reduce((sum,label)=>sum+label.count,0),residents.length);
 for(const link of lens.links.values())assert.ok([...link.line.geometry.attributes.position.array].every(Number.isFinite));
});

test('invalid group membership and counts suppress the lens rather than displaying a fabricated result',()=>{
 const cases=[
  ['missing outcome group',groups=>groups.pop()],
  ['duplicate outcome group',groups=>{groups[2].choice=groups[0].choice;}],
  ['unknown outcome',groups=>{groups[2].choice='invented';}],
  ['duplicate participant',groups=>{groups[2].memberIds=[groups[0].memberIds[0]];}],
  ['unknown participant',groups=>{groups[2].memberIds=['not-a-record'];}],
  ['mismatched count',groups=>{groups[0].count+=1;}],
  ['negative count',groups=>{groups[0].count=-1;}],
  ['fractional count',groups=>{groups[0].count=.5;}],
  ['empty label',groups=>{groups[0].label=' ';}],
  ['missing participant',groups=>{groups[2].memberIds=[];groups[2].count=0;}],
 ];
 for(const[name,mutate]of cases){
  const {lens,camera,update}=fixture(),groups=groupsFor(sampleComparison.runs.original);mutate(groups);lens.set({visible:true,groups});update();
  assert.equal(lens.group.visible,false,name);assert.ok(lens.state(DECISION_TIME).error,name);assert.deepEqual(lens.markerPositions(camera,1280,720),[],name);
 }
});

test('A/B changes reroute actual memberships within 0.48 seconds while hubs and camera remain fixed',()=>{
 const {lens,camera,update}=fixture(),original=sampleComparison.runs.original,improved=sampleComparison.runs.improved;
 lens.set({visible:true,groups:groupsFor(original)});update();
 const fixedHubs=[...lens.hubs.values()].map(h=>h.holder.position.toArray()),beforeCamera={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray()};
 const changed=original.participants.filter(before=>before.response.choice!==improved.participants.find(after=>after.id===before.id).response.choice);
 assert.ok(changed.length>0,'The source pair must contain actual changed records');
 const previousEnds=Object.fromEntries(changed.map(p=>[p.id,lens.links.get(p.id).end.clone()]));
 lens.set({visible:true,groups:groupsFor(improved)});update(DECISION_TIME,.24);
 for(const person of changed){const link=lens.links.get(person.id);assert.ok(link.end.distanceTo(previousEnds[person.id])>1e-5);assert.ok(link.end.distanceTo(link.target)>1e-5);}
 update(DECISION_TIME,.24);
 for(const person of improved.participants){const link=lens.links.get(person.id);assert.equal(link.choice,person.response.choice);assert.ok(link.end.distanceTo(link.target)<1e-8);}
 assert.equal(lens.links.size,residents.length);assert.deepEqual([...lens.hubs.values()].map(h=>h.holder.position.toArray()),fixedHubs);
 assert.deepEqual({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray()},beforeCamera);
 assert.ok(lens.state(DECISION_TIME).links.every(link=>!link.transitioning));
});

test('selected record link is emphasized without changing group memberships or adding inferred people',()=>{
 const {lens,update}=fixture(),groups=groupsFor(sampleComparison.runs.original),selectedId=residents[0].id;
 lens.set({visible:true,groups,selectedId});update();
 const selected=lens.links.get(selectedId);for(const[id,link]of lens.links)if(id!==selectedId)assert.ok(selected.line.material.opacity>link.line.material.opacity*3);
 assert.deepEqual(lens.state(DECISION_TIME).groups,groups);assert.equal(lens.state(DECISION_TIME).links.filter(link=>link.selected).length,1);
 lens.set({visible:true,groups,selectedId:'unknown'});update();assert.equal(lens.selectedId,null);assert.equal(lens.links.size,residents.length);
});

test('reduced motion applies the new result endpoint without an animated reroute',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');
 Object.defineProperty(globalThis,'matchMedia',{configurable:true,writable:true,value:()=>({matches:true})});
 try{const {lens,update}=fixture();lens.set({visible:true,groups:groupsFor(sampleComparison.runs.original)});update();lens.set({visible:true,groups:groupsFor(sampleComparison.runs.improved)});update(DECISION_TIME,0);assert.ok(lens.state(DECISION_TIME).links.every(link=>!link.transitioning));for(const link of lens.links.values())assert.ok(link.end.distanceTo(link.target)<1e-8);}
 finally{if(original)Object.defineProperty(globalThis,'matchMedia',original);else delete globalThis.matchMedia;}
});
