import {trip,soleHeight} from './motion.js';
export const DECISION_TIME=14, OFFER_TIME=11, WORLD_DURATION=36;
export const residents=Object.freeze([
 {id:'daniel',name:'Daniel',role:'Delivery rider',color:'#b07b54',origin:[-7.8,1.05],heading:Math.PI/2,depart:1.2,walks:true,destination:'Delivery stop',before:'Leaving for a delivery',after:'Checking the offer between deliveries',circumstance:'His phone keeps maps and customer calls running while he works.',routine:'Leaves home → delivery route → checks his phone',response:{choice:'stay',text:'Keep the current plan',reason:'His delivery route crosses the gap. Calls and navigation matter more to him than the $20 saving.'}},
 {id:'maya',name:'Maya',role:'Student',color:'#779b93',origin:[7.4,3.8],heading:-Math.PI/2,depart:3.1,walks:true,destination:'Campus bus',before:'Walking to the campus bus',after:'Checking the offer before class',circumstance:'She spends most days on campus Wi-Fi, and her usual route avoids the illustrated gap.',routine:'Leaves home → campus bus stop → checks her phone',response:{choice:'switch',text:'Try the cheaper plan',reason:'She usually connects through campus Wi-Fi, and her route avoids the gap. She chooses the lower bill.'}},
 {id:'amira',name:'Amira',role:'Parent',color:'#a89168',origin:[12.2,-2.1],heading:0,depart:.4,walks:true,destination:'School route',before:'Starting the school run',after:'Checking the offer on the school run',circumstance:'She needs to receive school calls while travelling. Her example route crosses the gap.',routine:'Leaves home → school route → checks her phone',response:{choice:'stay',text:'Keep the current plan',reason:'Her school route crosses the gap. She wants to stay reachable for school calls, so she keeps her plan.'}},
 {id:'leo',name:'Leo',role:'Commuter',color:'#7d8fa5',origin:[-12.5,3.55],heading:Math.PI/2,depart:23,walks:true,destination:'Mercer bus stop',before:'Waiting for the next bus',after:'Checking coverage before deciding',circumstance:'He commutes across town. This neighborhood alone does not establish coverage along the full journey.',routine:'Waits for transport → checks the offer → heads to work',response:{choice:'check',text:'Check the commute first',reason:'The offer only shows local coverage. He wants to check his full commute before deciding.'}},
].map(Object.freeze));
export const choiceMeta=Object.freeze({stay:{label:'Keep current plan',short:'Stay',color:'#b99169'},switch:{label:'Try cheaper plan',short:'Switch',color:'#7fa99a'},check:{label:'Check coverage first',short:'Check first',color:'#91a8c1'}});
export const exampleRun=Object.freeze({schemaVersion:1,id:'mercer-block-example-01',sourceType:'authored-example',sourceLabel:'Scripted example records',offer:{currentPrice:45,proposedPrice:25,dataGB:20,coverage:'Reduced coverage on the illustrated everyday routes'},participants:residents.map(r=>({id:r.id,name:r.name,role:r.role,circumstance:r.circumstance,response:{...r.response,at:DECISION_TIME}}))});
export function personRecord(run,id){return run.participants.find(p=>p.id===id)||run.participants[0];}
export function nextDifferent(run,id){const current=personRecord(run,id),start=run.participants.indexOf(current);for(let n=1;n<run.participants.length;n++){const p=run.participants[(start+n)%run.participants.length];if(p.response.choice!==current.response.choice)return p;}return null;}
export function responseGroups(run){return Object.fromEntries(Object.keys(choiceMeta).map(choice=>[choice,run.participants.filter(p=>p.response.choice===choice).map(p=>p.id)]));}
const text=(v,max=1600)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function validateRun(input){
 if(!input||input.schemaVersion!==1||!text(input.id,120)||!text(input.sourceLabel,160)||!['authored-example','recorded'].includes(input.sourceType))throw Error('Use schemaVersion 1, an id, a sourceLabel and sourceType "recorded" or "authored-example".');
 if(!input.offer||input.offer.currentPrice!==45||input.offer.proposedPrice!==25||input.offer.dataGB!==20||!text(input.offer.coverage))throw Error('This scene requires the same $45 → $25 / month, 20 GB offer.');
 if(!Array.isArray(input.participants)||input.participants.length!==residents.length)throw Error('Provide exactly one record for daniel, maya, amira and leo.');
 const ids=new Set();
 for(const p of input.participants){if(!residents.some(r=>r.id===p.id)||ids.has(p.id)||!text(p.name,60)||!text(p.role,80)||!text(p.circumstance)||!p.response||!Object.hasOwn(choiceMeta,p.response.choice)||!text(p.response.text,160)||!text(p.response.reason)||p.response.at!==DECISION_TIME)throw Error('Each unique person needs name, role, circumstance and a response: choice (stay/switch/check), text, reason and at: 14.');ids.add(p.id);}
 // Keep only the explicit contract. Imported text is rendered with textContent.
 return {schemaVersion:1,id:input.id,sourceType:input.sourceType,sourceLabel:input.sourceLabel,offer:{currentPrice:45,proposedPrice:25,dataGB:20,coverage:input.offer.coverage},participants:input.participants.map(p=>({id:p.id,name:p.name,role:p.role,circumstance:p.circumstance,response:{choice:p.response.choice,text:p.response.text,reason:p.response.reason,at:DECISION_TIME}}))};
}
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
export function sampleResident(resident,time,motion){
 const t=Math.max(0,Math.min(WORLD_DURATION,time)),journey=trip(motion,t-resident.depart);
 const walking=t>=resident.depart&&t<resident.depart+journey.duration;
 let clip=walking?journey.clip:(resident.id==='leo'?'wait':'idle'),local=t%motion[clip].duration;
 const phoneOnset={daniel:10.2,maya:10.65,amira:11.1,leo:10.9}[resident.id]??10.2;
 let phoneWeight=smooth((t-phoneOnset)/1.1)*(1-smooth((t-22)/1.1));
 if(walking&&t>22)phoneWeight=0;
 const distance=t<resident.depart?0:journey.distance;
 const position={x:resident.origin[0]+Math.sin(resident.heading)*distance,z:resident.origin[1]+Math.cos(resident.heading)*distance};
 const phoneTime=Math.min(Math.max(t-phoneOnset,0),motion.phone.duration-.01);
 if(walking)local=journey.local;
 const phase=t-resident.depart,firstWalk=motion.start.duration,firstStop=firstWalk+motion.walk.duration*2;
 let blend=null;
 const transition=(previous,previousTime,elapsed,duration=.18)=>({clip:previous,local:previousTime,weight:1-smooth(elapsed/duration)});
 if(phase>=0&&phase<.18)blend=transition(resident.id==='leo'?'wait':'idle',t%motion[resident.id==='leo'?'wait':'idle'].duration,phase);
 else if(phase>=firstWalk&&phase<firstWalk+.18)blend=transition('start',motion.start.duration-.001,phase-firstWalk);
 else if(phase>=firstStop&&phase<firstStop+.18)blend=transition('walk',motion.walk.duration-.001,phase-firstStop);
 else if(phase>=journey.duration&&phase<journey.duration+.22)blend=transition('stop',motion.stop.duration-.001,phase-journey.duration,.22);
 const bodyContact=blend?soleHeight(motion[clip],local)*(1-blend.weight)+soleHeight(motion[blend.clip],blend.local)*blend.weight:soleHeight(motion[clip],local);
 const contact=bodyContact*(1-phoneWeight)+soleHeight(motion.phone,phoneTime)*phoneWeight;
 // Face the street when stationary; blend the turn only after the feet stop.
 const turn=smooth((t-resident.depart-journey.duration)/1.1);
 const restingHeading={daniel:.48,maya:-.36,amira:.22,leo:-.18}[resident.id]||0;
 let yaw=walking||t<resident.depart?resident.heading:resident.heading*(1-turn)+restingHeading*turn;
 // Turn along the boarding platform before departing; do not walk off the curb.
 if(resident.id==='leo'&&t<resident.depart)yaw=resident.heading*smooth((t-resident.depart+.7)/.7);
 return {...position,y:.037-contact,yaw,clip,local,blend,phoneTime,phoneWeight,walking,activity:phoneWeight>.5?resident.after:resident.before};
}
