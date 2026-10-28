import test from 'node:test';
import assert from 'node:assert/strict';
import {study,perspectives,savings,fixedTermsMatch,coverageView,getPerspective} from '../src/study-data.js';
test('the headline saving is exactly the difference between the two monthly prices',()=>{
 assert.equal(savings(),20);assert.equal(study.plans.current.price,45);assert.equal(study.plans.proposed.price,25);
});
test('the comparison holds data allowance, calls, texts and billing terms constant',()=>{
 assert.equal(fixedTermsMatch(),true);assert.equal(study.plans.current.dataGB,20);assert.equal(study.plans.proposed.dataGB,20);
 const changed={...study.plans,proposed:{...study.plans.proposed,dataGB:10}};assert.equal(fixedTermsMatch(changed),false);
});
test('person and plan selections remain independent',()=>{
 for(const person of perspectives)for(const plan of ['current','proposed']){const view=coverageView(person.id,plan);assert.equal(view.person.id,person.id);assert.equal(view.plan.id,plan);assert.equal(view.plan.price,plan==='current'?45:25);}
});
test('the gap only interrupts the authored rider and parent routes under the proposed plan',()=>{
 for(const person of perspectives)assert.equal(coverageView(person.id,'current').showRouteGap,false);
 assert.equal(coverageView('daniel','proposed').showRouteGap,true);assert.equal(coverageView('amira','proposed').showRouteGap,true);assert.equal(coverageView('maya','proposed').showRouteGap,false);
 assert.equal(coverageView('maya','proposed').showGap,true);
});
test('fixtures are explicit examples and carry no invented switching outcomes',()=>{
 assert.equal(study.provenance,'illustrative');assert.equal(new Set(perspectives.map(p=>p.id)).size,3);
 for(const person of perspectives){assert.equal(person.provenance,'authored-example');for(const key of ['response','outcome','switches','probability','prediction'])assert.equal(Object.hasOwn(person,key),false);}
});
test('unknown selection values safely resolve to an existing person and plan',()=>{
 assert.equal(getPerspective('missing').id,'daniel');assert.equal(coverageView('missing','missing').plan.id,'current');
});
