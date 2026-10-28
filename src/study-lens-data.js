import {choiceMeta} from './neighborhood-data.js';

const linkSemantics='Record links, not social influence.';
const provenanceFor=run=>({
 kind:!run?'unavailable':run.sourceType==='authored-example'?'authored':'imported',
 label:!run?'Run unavailable':run.sourceType==='authored-example'?'Authored example records':'Imported records · provenance unverified',
 note:!run?'No records are supplied for this run.':run.sourceType==='authored-example'?'Profiles, offers and responses are authored examples, not Sapien study results.':'These records were supplied by the user. Their source and method have not been independently verified.',
 runId:run?.id??null,sourceLabel:run?.sourceLabel??null,
});

/** Build a visual trace from the supplied study records only.
 *
 * This is a record-association view. It does not simulate new responses, infer
 * personal preferences, or describe social influence. Rendering code must gate
 * response text and outcome groups until the appropriate replay moment.
 */
export function buildStudyLens(comparison,scenarioId,selectedId){
 const run=comparison?.runs?.[scenarioId];
 const original=comparison?.runs?.original;
 const improved=comparison?.runs?.improved;
 const beforeById=new Map((original?.participants||[]).map(person=>[person.id,person]));
 const afterById=new Map((improved?.participants||[]).map(person=>[person.id,person]));
 const paired=!!original&&!!improved&&beforeById.size>0&&beforeById.size===afterById.size&&[...beforeById.keys()].every(id=>afterById.has(id));
 if(!run)return {
  scenarioId,runId:null,sourceLabel:null,sourceType:null,total:0,
  selected:null,offer:null,response:null,members:[],groups:[],
  availableComparison:false,provenance:provenanceFor(null),linkSemantics,
 };
 const source={runId:run.id,sourceLabel:run.sourceLabel,sourceType:run.sourceType};
 const selectedRecord=run.participants.find(person=>person.id===selectedId);
 const selected=selectedRecord?{
  id:selectedRecord.id,name:selectedRecord.name,role:selectedRecord.role,
  circumstance:selectedRecord.circumstance,...source,
 }:null;
 const response=selectedRecord?{
  choice:selectedRecord.response.choice,text:selectedRecord.response.text,
  reason:selectedRecord.response.reason,at:selectedRecord.response.at,...source,
 }:null;
 const offer={
  currentPrice:run.offer.currentPrice,proposedPrice:run.offer.proposedPrice,
  dataGB:run.offer.dataGB,coverage:run.offer.coverage,
  coverageState:run.offer.coverageState??null,...source,
 };
 const members=run.participants.map(person=>({
  id:person.id,name:person.name,choice:person.response.choice,
  response:person.response.text,reason:person.response.reason,
  changed:paired?beforeById.get(person.id).response.choice!==afterById.get(person.id).response.choice:null,
  ...source,
 }));
 const groups=Object.entries(choiceMeta).map(([choice,meta])=>{
  const memberIds=members.filter(person=>person.choice===choice).map(person=>person.id);
  return {choice,label:meta.label,color:meta.color,count:memberIds.length,memberIds};
 });
 return {
  scenarioId,...source,total:members.length,selected,offer,response,members,groups,
  availableComparison:paired,provenance:provenanceFor(run),linkSemantics,
 };
}
