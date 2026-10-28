import {exampleRun,validateRun} from './neighborhood-data.js';

export const scenarios=Object.freeze({
 original:Object.freeze({id:'original',letter:'A',label:'Original offer',short:'Original',coverageState:'gap',coverageLabel:'Gap on everyday routes'}),
 improved:Object.freeze({id:'improved',letter:'B',label:'Better coverage',short:'Better coverage',coverageState:'improved',coverageLabel:'Illustrated route gap closed'}),
});
const text=(v,max=160)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
function scenarioRun(input,id,{legacy=false}={}){
 const run=validateRun(input),scenario=scenarios[id];
 if(!legacy&&input.offer.coverageState!==scenario.coverageState)throw Error('Each run must declare its offer coverageState: "gap" for original, "improved" for better coverage.');
 return {...run,scenarioId:id,offer:{...run.offer,coverageState:scenario.coverageState}};
}
export function validateComparison(input){
 if(input?.schemaVersion!==1||!text(input.comparisonId)||!input.runs?.original||!input.runs?.improved)throw Error('A comparison needs schemaVersion 1, comparisonId, and both runs.original and runs.improved.');
 const original=scenarioRun(input.runs.original,'original'),improved=scenarioRun(input.runs.improved,'improved');
 if(original.id===improved.id)throw Error('The two runs need different run IDs.');
 if(original.sourceType!==improved.sourceType)throw Error('Do not mix recorded results with authored sample results in one comparison.');
 if(original.offer.coverage===improved.offer.coverage)throw Error('The second run must describe its different coverage offer.');
 for(const before of original.participants){const after=improved.participants.find(p=>p.id===before.id);if(['name','role','circumstance'].some(key=>before[key]!==after[key]))throw Error('Both runs must contain the same people and circumstances. Only the coverage offer changes.');}
 return {schemaVersion:1,comparisonId:input.comparisonId,runs:{original,improved}};
}
export function parseStudyFile(input){
 if(input?.runs)return validateComparison(input);
 if(input?.scenarioId==='improved'||input?.offer?.coverageState==='improved')throw Error('Supply both runs in a comparison file. A single improved run cannot be used as the original offer.');
 return {schemaVersion:1,comparisonId:null,runs:{original:scenarioRun(input,'original',{legacy:true}),improved:null}};
}
export function comparePerson(comparison,id){
 const original=comparison.runs.original,improved=comparison.runs.improved;
 if(!original||!improved)return null;
 const before=original.participants.find(p=>p.id===id),after=improved.participants.find(p=>p.id===id);
 if(!before||!after)return null;
 return {id,name:before.name,before,after,changed:before.response.choice!==after.response.choice};
}
export function comparisonSummary(comparison){
 if(!comparison.runs.original||!comparison.runs.improved)return {available:false,total:0,rows:[],changedIds:[],unchangedIds:[]};
 const rows=comparison.runs.original.participants.map(p=>comparePerson(comparison,p.id));
 return {available:true,total:rows.length,rows,changedIds:rows.filter(r=>r.changed).map(r=>r.id),unchangedIds:rows.filter(r=>!r.changed).map(r=>r.id)};
}
export function nextChangedPerson(comparison,id){
 const ids=comparisonSummary(comparison).changedIds;if(!ids.length)return null;
 const index=ids.indexOf(id);if(index===-1)return ids[0];if(ids.length===1)return null;return ids[(index+1)%ids.length];
}

// Two separately authored result sets. No responses are inferred from coverage.
const original=structuredClone(exampleRun);
original.sourceLabel='Original offer · authored sample run';original.offer.coverageState='gap';
const improved=structuredClone(exampleRun);
improved.id='mercer-better-coverage-sample-02';improved.sourceLabel='Better coverage · authored sample run';
improved.offer.coverage='The illustrated gap on the delivery and school routes is closed. Coverage beyond this neighborhood is not established.';
improved.offer.coverageState='improved';
const improvedResponses={
 daniel:{choice:'switch',text:'Try the cheaper plan',reason:'The gap on his delivery route is covered in this run. He chooses the $20 saving.'},
 maya:{choice:'switch',text:'Try the cheaper plan',reason:'Her route and campus Wi-Fi already met her needs in run A. Better local coverage leaves her choice unchanged.'},
 amira:{choice:'switch',text:'Try the cheaper plan',reason:'Her school route is covered in this run. She chooses the cheaper plan.'},
 leo:{choice:'check',text:'Check the commute first',reason:'Better coverage on this block still does not tell him about his full commute. He keeps checking before deciding.'},
};
improved.participants=improved.participants.map(p=>({...p,response:{...improvedResponses[p.id],at:p.response.at}}));
export const sampleComparison=validateComparison({schemaVersion:1,comparisonId:'mercer-coverage-authored-pair-01',runs:{original,improved}});
