import {sampleResident,DECISION_TIME,WORLD_DURATION} from './neighborhood-data.js';

export const DIFFERENCE_REPLAY_DURATION=5;
const finite=(number,fallback)=>Number.isFinite(number)?number:fallback;
const clamp=(number,min,max)=>Math.max(min,Math.min(max,number));
const smooth=number=>{const t=clamp(number,0,1);return t*t*(3-2*t);};

/** Only caller-supplied, known changed IDs can receive the visual encoding. */
export function normalizeDifferenceReplay(input={},participantIds=[]){
 const known=new Set(participantIds);
 return {active:input.active===true,changedIds:[...new Set(Array.isArray(input.changedIds)?input.changedIds.filter(id=>known.has(id)):[])].sort(),elapsed:clamp(finite(input.elapsed,0),0,DIFFERENCE_REPLAY_DURATION),baseTime:clamp(finite(input.baseTime,DECISION_TIME),0,WORLD_DURATION)};
}

/** Repeated inactive/empty or identical updates do not need another GPU frame. */
export function differenceReplaySignature(effect){
 if(!effect?.active||!effect.changedIds?.length)return 'canonical';
 return JSON.stringify([effect.baseTime,effect.elapsed,effect.changedIds]);
}

/** A deterministic display plan. Environment time always remains the real replay time. */
export function differenceReplayFrame(effect,globalTime,participantIds){
 const normalized=normalizeDifferenceReplay(effect,participantIds),time=finite(globalTime,normalized.baseTime);
 const armed=normalized.active&&normalized.changedIds.length>0&&time>=DECISION_TIME&&Math.abs(time-normalized.baseTime)<1e-6;
 const amount=armed?smooth(normalized.elapsed/.45)*smooth((DIFFERENCE_REPLAY_DURATION-normalized.elapsed)/.65):0;
 const delta=Math.min(6.2,normalized.elapsed*1.25)*amount;
 const pulse=amount*(.5+.5*Math.sin(normalized.elapsed*Math.PI*2*1.1));
 return {active:!!armed,elapsed:normalized.elapsed,baseTime:normalized.baseTime,environmentTime:time,amount,changedIds:normalized.changedIds,meaning:'Visual encoding of different recorded responses; not subsequent behavior.',people:Object.fromEntries(participantIds.map(id=>{const affected=!!armed&&normalized.changedIds.includes(id),animationTime=affected?time+delta:time,motionActive=affected&&amount>0;return [id,{affected,motionActive,animationTime,ringPulse:affected?pulse:0,amount:affected?amount:0,poseKey:motionActive?'sample:'+animationTime:'canonical'}];}))};
}

/**
 * Reuses an existing stationary idle/wait/phone performance, keeping the authored
 * world position, heading, phone visibility and activity unchanged. No path or
 * outcome is generated. Returning to amount=0 restores the exact canonical pose.
 */
export function sampleDifferenceResident(resident,time,motion,frame){
 const canonical=sampleResident(resident,time,motion),plan=frame.people[resident.id];
 if(!plan?.motionActive)return {state:canonical,animationTime:time};
 const clip=canonical.clip==='wait'&&motion.wait?'wait':'idle',delta=plan.animationTime-time;
 return {animationTime:plan.animationTime,state:{...canonical,clip,local:plan.animationTime%motion[clip].duration,blend:null,phoneTime:clamp(canonical.phoneTime+delta,0,motion.phone.duration-.01),walking:false}};
}
