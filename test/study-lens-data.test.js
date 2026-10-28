import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStudyLens} from '../src/study-lens-data.js';
import {sampleComparison,parseStudyFile,validateComparison} from '../src/comparison-data.js';

test('person-to-study trace uses the same stored person, offer, response and population records',()=>{
 const lens=buildStudyLens(sampleComparison,'original','daniel');
 const run=sampleComparison.runs.original,person=run.participants.find(p=>p.id==='daniel');
 assert.equal(lens.selected.name,person.name);assert.equal(lens.selected.role,person.role);
 assert.equal(lens.selected.circumstance,person.circumstance);
 assert.equal(lens.response.text,person.response.text);assert.equal(lens.response.reason,person.response.reason);
 assert.equal(lens.response.at,14);assert.equal(lens.offer.coverage,run.offer.coverage);
 assert.equal(lens.offer.proposedPrice,25);assert.equal(lens.offer.dataGB,20);
 assert.equal(lens.members.length,4);
 assert.deepEqual(lens.members.filter(p=>p.changed).map(p=>p.id),['daniel','amira']);
 assert.deepEqual(lens.groups.map(g=>[g.choice,g.count]),[['stay',2],['switch',1],['check',1]]);
 assert.deepEqual(lens.groups.flatMap(g=>g.memberIds).sort(),lens.members.map(p=>p.id).sort());
 assert.equal(lens.linkSemantics,'Record links, not social influence.');
});

test('changing the selected run reads its actual stored responses and recomputes group membership',()=>{
 const a=buildStudyLens(sampleComparison,'original','daniel'),b=buildStudyLens(sampleComparison,'improved','daniel');
 assert.equal(a.response.choice,'stay');assert.equal(b.response.choice,'switch');
 assert.notEqual(a.response.reason,b.response.reason);
 assert.deepEqual(b.groups.map(g=>[g.choice,g.count]),[['stay',0],['switch',3],['check',1]]);
 assert.notEqual(a.runId,b.runId);assert.equal(a.offer.proposedPrice,b.offer.proposedPrice);
});

test('shuffled imported records are matched by ID and retain imported facts and provenance',()=>{
 const input=structuredClone(sampleComparison);
 for(const [scenario,run]of Object.entries(input.runs)){
  run.sourceType='recorded';run.sourceLabel='Imported '+scenario;
  run.participants.forEach(p=>{p.name='External '+p.id;p.role='Imported role '+p.id;p.circumstance='Imported context '+p.id;p.response.text='Imported text '+scenario+' '+p.id;p.response.reason='Imported reason '+scenario+' '+p.id;});
 }
 input.runs.improved.participants.reverse();
 const imported=validateComparison(input),lens=buildStudyLens(imported,'improved','maya');
 assert.equal(lens.selected.name,'External maya');assert.equal(lens.selected.role,'Imported role maya');
 assert.equal(lens.selected.circumstance,'Imported context maya');
 assert.equal(lens.response.text,'Imported text improved maya');
 assert.equal(lens.response.reason,'Imported reason improved maya');
 assert.equal(lens.provenance.kind,'imported');assert.equal(lens.provenance.sourceLabel,'Imported improved');
 assert.equal(lens.members.find(p=>p.id==='maya').changed,false);
 assert.equal(lens.members.find(p=>p.id==='daniel').changed,true);
 for(const trace of [lens.selected,lens.offer,lens.response,...lens.members]){
  assert.equal(trace.runId,imported.runs.improved.id);assert.equal(trace.sourceLabel,'Imported improved');
 }
});

test('a single run never gains sample comparison results or fabricates a missing improved run',()=>{
 const run=structuredClone(sampleComparison.runs.original);run.sourceType='recorded';
 const single=parseStudyFile(run),lens=buildStudyLens(single,'original','leo');
 assert.equal(lens.availableComparison,false);assert.ok(lens.members.every(p=>p.changed===null));
 assert.equal(lens.members.length,4);assert.equal(lens.provenance.kind,'imported');
 const missing=buildStudyLens(single,'improved','leo');
 assert.equal(missing.selected,null);assert.equal(missing.response,null);assert.equal(missing.offer,null);
 assert.deepEqual(missing.members,[]);assert.deepEqual(missing.groups,[]);
 assert.equal(missing.runId,null);assert.equal(missing.availableComparison,false);
});

test('unknown selections have no invented person and building the lens does not mutate input records',()=>{
 const input=structuredClone(sampleComparison),before=structuredClone(input);
 const lens=buildStudyLens(input,'original','unknown');
 assert.equal(lens.selected,null);assert.equal(lens.response,null);assert.equal(lens.members.length,4);
 const valid=buildStudyLens(input,'original','daniel');
 valid.selected.name='Changed outside the source';valid.offer.coverage='Changed outside the source';valid.groups[0].memberIds.push('unknown');
 assert.deepEqual(input,before);
});
