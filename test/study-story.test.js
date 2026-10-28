import test from 'node:test';
import assert from 'node:assert/strict';
import {studyChapters,personMoments,explainComparison} from '../src/study-story.js';
import {sampleComparison,parseStudyFile,validateComparison} from '../src/comparison-data.js';
import {DECISION_TIME,OFFER_TIME,WORLD_DURATION,residents} from '../src/neighborhood-data.js';

test('guided study moves from a question through a person to paired records and the population',()=>{
 assert.deepEqual(studyChapters.map(c=>c.id),['question','context','responses','comparison','population']);
 assert.ok(studyChapters[0].at<studyChapters[1].at);
 assert.ok(studyChapters[1].at<DECISION_TIME);
 assert.ok(studyChapters.slice(2).every(c=>c.at===DECISION_TIME));
 assert.ok(studyChapters.every(c=>c.at>=0&&c.at<=WORLD_DURATION));
 assert.equal(studyChapters[3].focusId,studyChapters[2].focusId);
 assert.ok(studyChapters.every(c=>c.focusId===null||residents.some(r=>r.id===c.focusId)));
});

test('each visible moment is backed by the selected run rather than an invented later event',()=>{
 const run=sampleComparison.runs.original;
 for(const record of run.participants){
  const moments=personMoments(record.id,run);
  assert.deepEqual(moments.map(m=>m.kind),['context','offer','response']);
  assert.equal(moments[0].body,record.circumstance);
  assert.equal(moments[1].at,OFFER_TIME);
  assert.ok(moments[1].body.includes(run.offer.coverage));
  assert.equal(moments[2].at,record.response.at);
  assert.equal(moments[2].title,record.response.text);
  assert.equal(moments[2].body,record.response.reason);
 }
 assert.deepEqual(personMoments('not-a-person',run),[]);
});

test('imported circumstances and responses stay authoritative in moments and comparison copy',()=>{
 const input=structuredClone(sampleComparison);
 for(const run of Object.values(input.runs)){
  run.sourceType='recorded';run.sourceLabel='External record set';
  run.participants.forEach((p,index)=>{p.name='Participant '+(index+1);p.circumstance='Imported circumstance '+p.id;p.response.text='Imported response '+p.id;p.response.reason='Imported reason '+p.id;});
 }
 // Deliberately change which people changed. Copy must derive from the input.
 input.runs.improved.participants.find(p=>p.id==='daniel').response.choice='stay';
 input.runs.improved.participants.find(p=>p.id==='leo').response.choice='switch';
 const pair=validateComparison(input),explanation=explainComparison(pair),moments=personMoments('leo',pair.runs.improved);
 assert.equal(moments[0].body,'Imported circumstance leo');
 assert.equal(moments[2].body,'Imported reason leo');
 assert.equal(moments[2].sourceType,'recorded');
 assert.equal(explanation.provenance.kind,'imported');
 assert.ok(explanation.body.includes('Participant 4'));
 assert.ok(!explanation.body.includes('Daniel'));
 assert.deepEqual(explanation.changedIds,['amira','leo']);
});

test('summary, named examples and population rows agree with both stored run result sets',()=>{
 const result=explainComparison(sampleComparison);
 assert.equal(result.heading,'2 of 4 responses changed.');
 assert.equal(result.changedCount,2);assert.equal(result.unchangedCount,2);
 assert.equal(result.rows.length,result.total);
 assert.deepEqual(result.changedIds,result.rows.filter(r=>r.changed).map(r=>r.id));
 assert.deepEqual(result.counts.original,{stay:2,switch:1,check:1});
 assert.deepEqual(result.counts.improved,{stay:0,switch:3,check:1});
 assert.equal(result.provenance.kind,'authored');
 assert.ok(result.provenance.note.includes('not Sapien study results'));
});

test('one imported run has no fabricated counterpart or apparent zero-change finding',()=>{
 const run=structuredClone(sampleComparison.runs.original);run.sourceType='recorded';
 const result=explainComparison(parseStudyFile(run));
 assert.equal(result.available,false);
 assert.equal(result.changedCount,null);assert.equal(result.unchangedCount,null);
 assert.equal(result.counts,null);assert.deepEqual(result.rows,[]);
 assert.equal(result.total,4);
 assert.equal(result.sourceLabels.improved,null);
});
