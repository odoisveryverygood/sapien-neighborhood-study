import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReplayStory} from '../src/replay-story-data.js';
import {sampleComparison,parseStudyFile,validateComparison} from '../src/comparison-data.js';

test('the replay connects the selected supplied profile, current offer, response and counted rows',()=>{
 const story=buildReplayStory(sampleComparison,'original','daniel');
 const run=sampleComparison.runs.original,person=run.participants.find(p=>p.id==='daniel');
 assert.deepEqual(story.selected,{id:person.id,name:person.name,role:person.role,circumstance:person.circumstance,response:{choice:person.response.choice,text:person.response.text,reason:person.response.reason}});
 assert.deepEqual(story.offer,{currentPrice:run.offer.currentPrice,proposedPrice:run.offer.proposedPrice,dataGB:run.offer.dataGB,coverage:run.offer.coverage});
 assert.equal(story.paired,true);assert.equal(story.total,4);
 assert.deepEqual(story.changedIds,['daniel','amira']);
 assert.deepEqual(story.counts,{original:{stay:2,switch:1,check:1},improved:{stay:0,switch:3,check:1}});
 assert.equal(story.rows.length,story.total);
 assert.equal(story.rows.filter(row=>row.changed).length,story.changedIds.length);
 assert.match(story.sourceLabel,/Authored example/);assert.match(story.sourceNote,/No live AI/);
 assert.ok(story.participants.every(p=>!Object.hasOwn(p,'response')));
});

test('active responses come from that run while the contrast remains anchored in original responses',()=>{
 const original=buildReplayStory(sampleComparison,'original','daniel'),improved=buildReplayStory(sampleComparison,'improved','daniel');
 assert.equal(original.selected.response.choice,'stay');assert.equal(improved.selected.response.choice,'switch');
 assert.equal(original.contrastId,'maya');assert.equal(improved.contrastId,'maya');
 assert.notEqual(original.offer.coverage,improved.offer.coverage);
 const selected=sampleComparison.runs.original.participants.find(p=>p.id==='daniel');
 const contrast=sampleComparison.runs.original.participants.find(p=>p.id===improved.contrastId);
 assert.notEqual(selected.response.choice,contrast.response.choice);
});

test('rows match shuffled second-run records by exact ID and no contrast is fabricated for identical responses',()=>{
 const pair=structuredClone(sampleComparison);pair.runs.improved.participants.reverse();
 assert.deepEqual(buildReplayStory(pair,'improved','amira').changedIds,['daniel','amira']);
 for(const run of Object.values(pair.runs))for(const person of run.participants)person.response.choice='stay';
 const story=buildReplayStory(pair,'original','daniel');
 assert.equal(story.contrastId,null);assert.deepEqual(story.changedIds,[]);
 assert.deepEqual(story.counts.original,{stay:4,switch:0,check:0});
});

test('one supplied run preserves its records without adding a sample second run or a zero-change conclusion',()=>{
 const run=structuredClone(sampleComparison.runs.original);run.sourceType='recorded';run.sourceLabel='Single imported result';
 const single=parseStudyFile(run),story=buildReplayStory(single,'original','leo');
 assert.equal(story.paired,false);assert.equal(story.selected.name,'Leo');
 assert.equal(story.counts.improved,null);assert.ok(story.rows.every(row=>row.afterText===null&&row.afterReason===null&&row.changed===null));
 assert.deepEqual(story.changedIds,[]);assert.match(story.sourceLabel,/Single imported result/);assert.match(story.sourceNote,/unverified/);
 const missing=buildReplayStory(single,'improved','leo');
 assert.equal(missing.selected,null);assert.equal(missing.offer,null);assert.deepEqual(missing.participants,[]);assert.equal(missing.paired,false);
 assert.equal(missing.sourceLabel,'Run unavailable');
});

test('imported sentinels are authoritative across profile, offer, reasons, counts and contrast',()=>{
 const input=structuredClone(sampleComparison);
 for(const [scenario,run]of Object.entries(input.runs)){
  run.sourceType='recorded';run.sourceLabel='Sentinel source '+scenario;
  run.offer.coverage='Sentinel coverage '+scenario;
  run.participants.forEach(p=>{p.name='Sentinel name '+p.id;p.role='Sentinel role '+p.id;p.circumstance='Sentinel context '+p.id;p.response.text='Sentinel text '+scenario+' '+p.id;p.response.reason='Sentinel reason '+scenario+' '+p.id;});
 }
 input.runs.improved.participants.find(p=>p.id==='daniel').response.choice='stay';
 input.runs.improved.participants.find(p=>p.id==='leo').response.choice='switch';
 const pair=validateComparison(input),story=buildReplayStory(pair,'improved','leo');
 assert.equal(story.selected.name,'Sentinel name leo');assert.equal(story.selected.role,'Sentinel role leo');assert.equal(story.selected.circumstance,'Sentinel context leo');
 assert.equal(story.selected.response.text,'Sentinel text improved leo');assert.equal(story.selected.response.reason,'Sentinel reason improved leo');
 assert.equal(story.offer.coverage,'Sentinel coverage improved');
 assert.deepEqual(story.changedIds,['amira','leo']);assert.equal(story.contrastId,'daniel');
 assert.match(story.sourceLabel,/Sentinel source improved/);assert.match(story.sourceNote,/unverified/);assert.doesNotMatch(story.sourceNote,/authored examples/);
});

test('null or unknown selection falls back only to the active supplied run and the adapter does not mutate records',()=>{
 const pair=structuredClone(sampleComparison);pair.runs.improved.participants.reverse();const before=structuredClone(pair);
 assert.equal(buildReplayStory(pair,'improved',null).selected.id,pair.runs.improved.participants[0].id);
 assert.equal(buildReplayStory(pair,'improved','unknown').selected.id,pair.runs.improved.participants[0].id);
 buildReplayStory(pair,'original','daniel');assert.deepEqual(pair,before);
 const empty=buildReplayStory(null,'original',null);assert.equal(empty.selected,null);assert.equal(empty.paired,false);assert.equal(empty.total,0);assert.deepEqual(empty.rows,[]);
});
