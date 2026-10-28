import {choiceMeta} from './neighborhood-data.js';

const zeroCounts=()=>Object.fromEntries(Object.keys(choiceMeta).map(choice=>[choice,0]));
const countResponses=people=>{
 const counts=zeroCounts();
 for(const person of people)if(Object.hasOwn(counts,person.response?.choice))counts[person.response.choice]++;
 return counts;
};
const profile=person=>({id:person.id,name:person.name,role:person.role,circumstance:person.circumstance});

/** Adapt supplied study records for a profile -> offer -> response -> report
 * replay. Scene stages and action timing belong to the controller, not this
 * adapter. No new event, thought, preference or response is generated here.
 */
export function buildReplayStory(comparison,scenarioId,selectedId){
 const original=comparison?.runs?.original,improved=comparison?.runs?.improved;
 const before=original?.participants||[],after=improved?.participants||[];
 const beforeById=new Map(before.map(person=>[person.id,person]));
 const afterById=new Map(after.map(person=>[person.id,person]));
 const paired=!!original&&!!improved&&before.length>0&&before.length===after.length&&beforeById.size===before.length&&afterById.size===after.length&&before.every(person=>afterById.has(person.id))&&original.sourceType===improved.sourceType;
 const run=comparison?.runs?.[scenarioId];
 const people=run?.participants||[];
 const record=people.find(person=>person.id===selectedId)||people[0]||null;
 const selected=record?{...profile(record),response:{choice:record.response.choice,text:record.response.text,reason:record.response.reason}}:null;
 const offer=run?{currentPrice:run.offer.currentPrice,proposedPrice:run.offer.proposedPrice,dataGB:run.offer.dataGB,coverage:run.offer.coverage}:null;
 const rows=before.map(person=>{
  const counterpart=paired?afterById.get(person.id):null;
  return {
   id:person.id,name:person.name,
   beforeText:person.response.text,afterText:counterpart?.response.text??null,
   beforeChoice:person.response.choice,afterChoice:counterpart?.response.choice??null,
   changed:counterpart?person.response.choice!==counterpart.response.choice:null,
   beforeReason:person.response.reason,afterReason:counterpart?.response.reason??null,
  };
 });
 const selectedBefore=record?beforeById.get(record.id):null;
 const contrastId=selectedBefore?before.find(person=>person.id!==record.id&&person.response.choice!==selectedBefore.response.choice)?.id??null:null;
 const sourceLabel=!run?'Run unavailable':(run.sourceType==='authored-example'?'Authored example · ':'Imported records · ')+run.sourceLabel;
 const sourceNote=!run?'No records were supplied for the selected run.':run.sourceType==='authored-example'?'Profiles and responses are authored examples, not Sapien study results. No live AI simulation is running.':'Profiles and responses come from the imported records. Their source and method are unverified. No live AI simulation is running.';
 return {
  selected,offer,sourceLabel,sourceNote,paired,rows,
  counts:{original:countResponses(before),improved:paired?countResponses(after):null},
  changedIds:rows.filter(row=>row.changed===true).map(row=>row.id),
  total:before.length,
  contrastId,
  participants:people.map(profile),
 };
}
