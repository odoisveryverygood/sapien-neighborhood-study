import {residents} from './neighborhood-data.js';

const sceneIds=new Set(residents.map(person=>person.id));
const unavailable=()=>({available:false,total:0,people:[],changedIds:[],correctCount:null,sourceLabel:'Comparison unavailable · results from both runs are required'});

/** Score a prediction about which supplied response categories change.
 * guesses contains the IDs predicted to change. An omitted ID means the viewer
 * predicted that person would keep the same response category.
 */
export function buildPredictionModel(comparison,guesses=[]){
 const original=comparison?.runs?.original,improved=comparison?.runs?.improved;
 if(!original||!improved||!Array.isArray(original.participants)||!Array.isArray(improved.participants))return unavailable();
 const before=original.participants,after=improved.participants;
 const beforeById=new Map(before.map(person=>[person.id,person])),afterById=new Map(after.map(person=>[person.id,person]));
 // Never score a subset or join by array position. Duplicate IDs also break the pair.
 if(!before.length||before.length!==after.length||beforeById.size!==before.length||afterById.size!==after.length||before.some(person=>!afterById.has(person.id)))return unavailable();
 if(original.sourceType!==improved.sourceType)return unavailable();
 const complete=person=>person.response&&typeof person.response.choice==='string'&&typeof person.response.text==='string'&&typeof person.response.reason==='string';
 if(!before.every(complete)||!after.every(complete))return unavailable();
 const predicted=new Set(guesses);
 const people=before.map(person=>{
  const counterpart=afterById.get(person.id);
  return {
   id:person.id,name:person.name,role:person.role,circumstance:person.circumstance,
   beforeText:person.response.text,afterText:counterpart.response.text,
   reason:counterpart.response.reason,changed:person.response.choice!==counterpart.response.choice,
  };
 });
 return {
  available:true,total:people.length,people,
  changedIds:people.filter(person=>person.changed).map(person=>person.id),
  correctCount:people.filter(person=>predicted.has(person.id)===person.changed).length,
  sourceLabel:original.sourceType==='authored-example'?'Authored example · no live AI simulation':'Imported study records · source unverified',
 };
}

/** Only the challenge flag and an allowlisted scene ID affect entry state.
 * Predictions, scores, responses and arbitrary text in a URL are ignored.
 */
export function challengeSelection(search,allowedIds){
 const params=new URLSearchParams(search),active=params.get('challenge')==='coverage';
 const person=params.get('person'),allowed=new Set(allowedIds);
 return {active,personId:active&&allowed.has(person)?person:null};
}

/** A challenge link carries no guesses, imported records or outcome spoilers.
 * Callers must disable sharing of imported records: their data is local only.
 */
export function challengeURL(locationLike,personId){
 if(!sceneIds.has(personId))throw new RangeError('Choose a person from the scene before creating a challenge link.');
 const input=typeof locationLike==='string'||locationLike instanceof URL?locationLike:locationLike.href||locationLike.origin;
 const current=new URL(input);
 if(typeof locationLike==='object'&&!(locationLike instanceof URL)&&!locationLike.href)current.pathname=locationLike.pathname||'/';
 // origin excludes any embedded username/password; the path is preserved.
 const link=new URL(current.origin+current.pathname);
 link.searchParams.set('view','study');link.searchParams.set('challenge','coverage');link.searchParams.set('person',personId);
 return link.href;
}
