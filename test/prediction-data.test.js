import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPredictionModel,challengeSelection,challengeURL} from '../src/prediction-data.js';
import {sampleComparison,parseStudyFile,validateComparison} from '../src/comparison-data.js';

test('prediction checks every person, including correct unchanged predictions and none/all guesses',()=>{
 const exact=buildPredictionModel(sampleComparison,['daniel','amira']);
 assert.equal(exact.available,true);assert.equal(exact.total,4);assert.equal(exact.correctCount,4);
 assert.deepEqual(exact.changedIds,['daniel','amira']);
 assert.equal(buildPredictionModel(sampleComparison,[]).correctCount,2);
 assert.equal(buildPredictionModel(sampleComparison,['daniel','maya','amira','leo']).correctCount,2);
 assert.equal(buildPredictionModel(sampleComparison,['maya','leo']).correctCount,0);
 assert.equal(buildPredictionModel(sampleComparison,['daniel','daniel','amira','unknown']).correctCount,4);
 assert.match(exact.sourceLabel,/Authored example/);assert.match(exact.sourceLabel,/no live AI/);
});

test('pairing uses exact IDs when improved records have a different order',()=>{
 const pair=structuredClone(sampleComparison);pair.runs.improved.participants.reverse();
 const result=buildPredictionModel(pair,['daniel','amira']);
 assert.equal(result.correctCount,4);assert.deepEqual(result.changedIds,['daniel','amira']);
 assert.equal(result.people.find(p=>p.id==='daniel').afterText,sampleComparison.runs.improved.participants.find(p=>p.id==='daniel').response.text);
});

test('missing comparison records, missing people and duplicate IDs are unavailable rather than sample-backed',()=>{
 const single=parseStudyFile(structuredClone(sampleComparison.runs.original));
 for(const pair of [null,single,(()=>{const p=structuredClone(sampleComparison);p.runs.original.participants=[];p.runs.improved.participants=[];return p;})(),(()=>{const p=structuredClone(sampleComparison);p.runs.improved.participants.pop();return p;})(),(()=>{const p=structuredClone(sampleComparison);p.runs.improved.participants[0].id='unmatched';return p;})(),(()=>{const p=structuredClone(sampleComparison);p.runs.improved.participants[0].id='maya';return p;})()]){
  const result=buildPredictionModel(pair,[]);assert.equal(result.available,false);assert.equal(result.correctCount,null);assert.deepEqual(result.people,[]);assert.deepEqual(result.changedIds,[]);
 }
});

test('imported profile facts, response wording and improved reasons are preserved',()=>{
 const input=structuredClone(sampleComparison);
 for(const [scenario,run]of Object.entries(input.runs)){
  run.sourceType='recorded';run.sourceLabel='Imported '+scenario;
  run.participants.forEach(person=>{person.name='Imported '+person.id;person.role='Role '+person.id;person.circumstance='Context '+person.id;person.response.text='Text '+scenario+' '+person.id;person.response.reason='Reason '+scenario+' '+person.id;});
 }
 const pair=validateComparison(input),model=buildPredictionModel(pair,['daniel','amira']),person=model.people.find(p=>p.id==='daniel');
 assert.equal(person.name,'Imported daniel');assert.equal(person.role,'Role daniel');assert.equal(person.circumstance,'Context daniel');
 assert.equal(person.beforeText,'Text original daniel');assert.equal(person.afterText,'Text improved daniel');assert.equal(person.reason,'Reason improved daniel');
 assert.match(model.sourceLabel,/Imported/);assert.match(model.sourceLabel,/unverified/);assert.doesNotMatch(model.sourceLabel,/Authored/);
});

test('challenge entry ignores outcome spoilers and filters unsupported people',()=>{
 assert.deepEqual(challengeSelection('?view=study&challenge=coverage&person=maya&score=4&guesses=daniel,amira&response=switch',['daniel','maya']),{active:true,personId:'maya'});
 assert.deepEqual(challengeSelection('?challenge=coverage&person=unknown',['daniel','maya']),{active:true,personId:null});
 assert.deepEqual(challengeSelection('?challenge=other&person=daniel',['daniel']),{active:false,personId:null});
 assert.deepEqual(challengeSelection('?person=daniel',['daniel']),{active:false,personId:null});
});

test('challenge URLs preserve the current origin/path and contain no data or predictions',()=>{
 const url=new URL(challengeURL({href:'http://127.0.0.1:5184/demo/index.html?local-character=eric&guesses=daniel&score=4&privateProfile=secret#response'},'leo'));
 assert.equal(url.origin,'http://127.0.0.1:5184');assert.equal(url.pathname,'/demo/index.html');assert.equal(url.hash,'');
 assert.deepEqual([...url.searchParams.entries()],[['view','study'],['challenge','coverage'],['person','leo']]);
 assert.equal(challengeURL('http://127.0.0.1:5184/?other=value','maya'),'http://127.0.0.1:5184/?view=study&challenge=coverage&person=maya');
 assert.throws(()=>challengeURL('http://127.0.0.1:5184/','Imported personal name'),RangeError);
});
