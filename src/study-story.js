import {residents, OFFER_TIME, DECISION_TIME, choiceMeta} from './neighborhood-data.js';
import {sampleComparison, comparisonSummary} from './comparison-data.js';

// These chapters direct the viewer. They do not add observations or generate
// decisions. Person-specific text always comes from the active run below.
export const studyChapters=Object.freeze([
 {
  id:'question', title:'The question', at:0, eyebrow:'01 / THE STUDY',
  heading:'Who switches for $20 less?',
  body:'A phone plan falls from $45 to $25 a month. The data allowance stays the same. The trade-off is a gap in coverage. Follow four synthetic people through an example study.',
  actionLabel:'Follow one person', focusId:null,
 },
 {
  id:'context', title:'A person’s day', at:7, eyebrow:'02 / THE CIRCUMSTANCES',
  heading:'Start with one person’s day.',
  body:'Follow their routine. Then inspect the circumstances attached to their record. The same offer can matter differently depending on where and how someone needs a connection.',
  actionLabel:'See the offer arrive', focusId:'daniel',
 },
 {
  id:'responses', title:'Different responses', at:DECISION_TIME, eyebrow:'03 / THE ORIGINAL OFFER',
  heading:'One offer. Different responses.',
  body:'Time is paused at the offer. Move between two people and compare their circumstances, the shared offer, and each recorded response in run A.',
  actionLabel:'Compare the coverage', focusId:'daniel',
 },
 {
  id:'comparison', title:'A second run', at:DECISION_TIME, eyebrow:'04 / THE COMPARISON',
  heading:'Change coverage. Keep the person.',
  body:'Keep the same person, camera and moment. Switch between the original offer and better coverage. The monthly price and data stay fixed; inspect the response supplied for each run.',
  actionLabel:'See the whole study', focusId:'daniel',
 },
 {
  id:'population', title:'The whole study', at:DECISION_TIME, eyebrow:'05 / BACK TO THE POPULATION',
  heading:'See the people behind the pattern.',
  body:'This summary comes from the same four records you inspected. Select a person’s row to return to their circumstances and check both responses.',
  actionLabel:'Explore freely', focusId:null,
 },
].map(Object.freeze));

/** Three inspectable moments, backed only by the active run's supplied record.
 * Passing a run is important for imports: no sample reason or sample response
 * is ever borrowed to complete a missing imported record.
 */
export function personMoments(id,run=sampleComparison.runs.original){
 const person=run?.participants?.find(p=>p.id===id);
 if(!person)return [];
 const sourceType=run.sourceType;
 const sourceLabel=run.sourceLabel;
 const source={sourceType,sourceLabel,runId:run.id};
 const offer=run.offer;
 return [
  {id:'context',at:6,title:'Their circumstances',body:person.circumstance,kind:'context',...source},
  {id:'offer',at:OFFER_TIME,title:'The offer they encountered',body:`$${offer.currentPrice} → $${offer.proposedPrice} per month. Same ${offer.dataGB} GB. ${offer.coverage}`,kind:'offer',...source},
  {id:'response',at:person.response.at,title:person.response.text,body:person.response.reason,kind:'response',...source},
 ];
}

const names=people=>new Intl.ListFormat('en',{style:'long',type:'conjunction'}).format(people.map(p=>p.name));
const categoryCounts=run=>Object.fromEntries(Object.keys(choiceMeta).map(choice=>[choice,run.participants.filter(p=>p.response.choice===choice).length]));

/** Plain-language comparison based on the two stored result sets, never an
 * inferred consequence of a coverage toggle. A single run remains incomplete.
 */
export function explainComparison(comparison){
 const original=comparison?.runs?.original;
 const improved=comparison?.runs?.improved;
 const summary=original&&improved?comparisonSummary(comparison):{available:false};
 const authored=original?.sourceType==='authored-example';
 const provenance={
  kind:authored?'authored':'imported',
  label:authored?'Authored example study':'Imported records · provenance unverified',
  note:authored?'These people, circumstances and responses are authored examples. They are not Sapien study results or evidence of consumer behavior.':'These are user-supplied records. Their provenance and method have not been independently verified.',
  populationNote:'Four records are shown. No representative population estimate is established here.',
 };
 if(!summary.available)return {
  available:false, total:original?.participants?.length||0, changedCount:null, unchangedCount:null,
  changedIds:[],unchangedIds:[],rows:[],counts:null,
  heading:'A second run is needed.',
  body:'One run is loaded. Supply results from both coverage scenarios to compare the same people. This viewer does not create missing responses.',
  changedExplanation:'',unchangedExplanation:'',provenance,
  sourceLabels:{original:original?.sourceLabel||null,improved:null},
 };
 const changed=summary.rows.filter(row=>row.changed),unchanged=summary.rows.filter(row=>!row.changed);
 const changedExplanation=changed.length?`${names(changed)} ${changed.length===1?'has':'have'} different response categories across the two runs.`:'The supplied response categories match for every person across both runs.';
 const unchangedExplanation=unchanged.length?`${names(unchanged)} ${unchanged.length===1?'keeps':'keep'} the same response category.`:'Every person has a different response category in the second run.';
 return {
  available:true,total:summary.total,changedCount:changed.length,unchangedCount:unchanged.length,
  changedIds:[...summary.changedIds],unchangedIds:[...summary.unchangedIds],
  heading:`${changed.length} of ${summary.total} responses changed.`,
  body:`${changedExplanation} ${unchangedExplanation}`,
  changedExplanation,unchangedExplanation,
  counts:{original:categoryCounts(original),improved:categoryCounts(improved)},
  rows:summary.rows.map(row=>({
   id:row.id,name:row.name,changed:row.changed,
   beforeChoice:row.before.response.choice,afterChoice:row.after.response.choice,
   beforeText:row.before.response.text,afterText:row.after.response.text,
   beforeReason:row.before.response.reason,afterReason:row.after.response.reason,
  })),
  provenance,sourceLabels:{original:original.sourceLabel,improved:improved.sourceLabel},
 };
}

// Keep scene IDs explicit. Appearance and role alone never determine a response.
export const studyPersonIds=Object.freeze(residents.map(person=>person.id));
