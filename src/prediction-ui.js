import './prediction.css';

const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const guessesAsSet=value=>value instanceof Set?new Set(value):Array.isArray(value)?new Set(value):new Set(Object.entries(value||{}).filter(([,selected])=>selected).map(([id])=>id));
const key=(action,id='')=>html(action+(id?':'+id:''));

/**
 * Presentation only. The parent owns guesses, phase, scoring, camera and runs.
 * model = {available,total,people:[{id,name,role,circumstance,beforeText,
 * afterText,reason,changed}],changedIds,correctCount,sourceLabel}.
 * No afterText, changed value or score is rendered during the predict phase.
 * onInspect(id) also serves the separate pre-reveal camera-only Look button;
 * it is the parent's responsibility to keep that interaction in predict.
 * animationActive, canShare and shareMessage are optional render options.
 */
export function createPredictionUI({root,onToggle,onReveal,onInspect,onOverview,onExplore,onRestart,onShare,onReplayDifference}={}){
 if(!root)throw Error('Prediction UI requires a root element.');
 const el=document.createElement('section');el.id='prediction-interface';el.hidden=true;
 el.setAttribute('aria-label','Predict a study comparison');
 el.innerHTML=`<aside class="prediction-panel"><div class="prediction-scroll"></div><div class="prediction-footer"></div><footer class="prediction-source"></footer></aside><div class="prediction-world-caption"></div><p class="prediction-announcement" role="status" aria-live="polite"></p>`;
 root.append(el);
 const find=selector=>el.querySelector(selector);
 let lastPhase=null,lastSelected=null,wasVisible=false,lastAnnouncement='';
 el.addEventListener('click',event=>{
  const button=event.target.closest('button[data-prediction-action]');
  if(!button||!el.contains(button)||button.disabled)return;
  const action=button.dataset.predictionAction,id=button.dataset.personId;
  if(action==='toggle')onToggle?.(id);
  else if(action==='inspect')onInspect?.(id);
  else if(action==='reveal')onReveal?.();
  else if(action==='overview')onOverview?.();
  else if(action==='explore')onExplore?.();
  else if(action==='restart')onRestart?.();
  else if(action==='share')onShare?.();
  else if(action==='replay')onReplayDifference?.();
 });
 const button=(action,label,{id='',className='',disabled=false,pressed=null,ariaLabel=''}={})=>`<button type="button" class="${className}" data-prediction-action="${action}" ${id?`data-person-id="${html(id)}"`:''} data-prediction-focus="${key(action,id)}" ${disabled?'disabled':''} ${pressed===null?'':`aria-pressed="${pressed}"`} ${ariaLabel?`aria-label="${html(ariaLabel)}"`:''}>${label}</button>`;
 const offerStrip=()=>'<div class="prediction-offer"><div><b>A</b><span>Route gap</span><i>→</i><b>B</b><span>Gap covered</span></div><p>Same $25/month · Same 20 GB</p></div>';
 const sectionHeading=(eyebrow,title,body='')=>`<div class="prediction-heading"><span class="prediction-eyebrow">${eyebrow}</span><h1 tabindex="-1" data-prediction-heading>${title}</h1>${body?`<p>${body}</p>`:''}</div>`;
 function predictCard(person,chosen,selectedId){
  const status=chosen?'You predict change':'Select if they change';
  return `<article class="prediction-person ${chosen?'is-guessed':''} ${person.id===selectedId?'is-in-view':''}">
   ${button('toggle',`<span class="prediction-person-head"><span><strong>${html(person.name)}</strong><small>${html(person.role)}</small></span><i class="prediction-check" aria-hidden="true">${chosen?'✓':'+'}</i></span><span class="prediction-circumstance">${html(person.circumstance)}</span><span class="prediction-baseline"><small>ANSWER IN A</small><b>${html(person.beforeText)}</b></span>`,{id:person.id,className:'prediction-person-toggle',pressed:chosen,ariaLabel:person.name+'. '+person.circumstance+' Answer in run A: '+person.beforeText+'. '+status})}
   ${button('inspect','Look in the world ↗',{id:person.id,className:'prediction-look',ariaLabel:'Look at '+person.name+' in the world without changing your prediction'})}
  </article>`;
 }
 function revealedCard(person,chosen,selectedId){
  const changed=!!person.changed,matched=chosen===changed;
  return `<article class="prediction-person prediction-result-person ${changed?'did-change':'did-not-change'} ${person.id===selectedId?'is-in-view':''}">
   ${button('inspect',`<span class="prediction-person-head"><span><strong>${html(person.name)}</strong><small>${html(person.role)}</small></span><i class="prediction-result-icon" aria-hidden="true">${changed?'↗':'='}</i></span><span class="prediction-actual">${changed?'Changed their answer':'Kept the same answer'}</span><span class="prediction-answer-after">${html(person.afterText)}</span><span class="prediction-result-guess"><i aria-hidden="true">${matched?'✓':'·'}</i>You predicted ${chosen?'change':'no change'}</span><span class="prediction-inspect-label">Inspect the record ↗</span>`,{id:person.id,className:'prediction-result-button',ariaLabel:'Inspect '+person.name+'. '+(changed?'Their answer changed.':'Their answer stayed the same.')+' You predicted '+(chosen?'change.':'no change.')})}
  </article>`;
 }
 return {
  render(model,{visible=false,phase='predict',guesses=[],selectedId=null,shareMessage='',animationActive=null,canShare=true}={}){
   const active=document.activeElement,focusKey=el.contains(active)?active.dataset.predictionFocus:null;
   const oldScroll=find('.prediction-scroll').scrollTop;
   el.hidden=!visible;if(!visible){wasVisible=false;return;}
   const people=Array.isArray(model?.people)?model.people:[],total=Number.isInteger(model?.total)?model.total:people.length;
   const available=model?.available!==false&&people.length>0;
   const currentPhase=available&&['reveal','inspect'].includes(phase)?phase:'predict';
   const predicted=guessesAsSet(guesses);for(const id of predicted)if(!people.some(p=>p.id===id))predicted.delete(id);
   const n=predicted.size,phaseChanged=lastPhase!==currentPhase;
   const animation=animationActive===null?!!model?.animationActive:!!animationActive;
   const source=String(model?.sourceLabel||'Authored example · no live AI run');
   const intro='Explore how synthetic people respond to the same offer in two study runs.';
   el.dataset.phase=currentPhase;el.dataset.available=String(available);
   let body='',footer='',caption='',announcement='';
   if(!available){
    body=sectionHeading('THE STUDY COMPARISON','Two runs are needed.', 'This challenge needs a response from the same people in both coverage runs. A second answer is never filled in for you.')+offerStrip()+'<div class="prediction-unavailable"><span>ONE RUN IS NOT A COMPARISON</span><p>You can still explore the supplied records in the study.</p></div>';
    footer=button('explore','Explore the study '+arrow,{className:'prediction-primary'});
    caption='<span>THE RECORDS ARE INCOMPLETE</span><p>Explore the available study.</p>';
    announcement='This challenge needs both study runs. Explore the available records.';
   }else if(currentPhase==='predict'){
    const focused=people.find(p=>p.id===selectedId)||people[0];
    body=sectionHeading('A SMALL STUDY. YOUR CALL.','Coverage improves.<br>Who changes their answer?',intro)+offerStrip()+`<p class="prediction-instruction">Select everyone who changes. You can choose nobody.</p><p class="prediction-scroll-hint">${total} people · Scroll to see everyone</p><div class="prediction-people">${people.map(p=>predictCard(p,predicted.has(p.id),selectedId)).join('')}</div>`;
    footer=`<div class="prediction-call-line"><p class="prediction-your-call">Your prediction: <b>${n?n+' of '+total+' change':'Nobody changes'}</b></p>${button('explore','Explore study ↗',{className:'prediction-secondary'})}</div>`+button('reveal',n?'Reveal the result '+arrow:'Reveal · nobody changes '+arrow,{className:'prediction-primary'});
    caption='<span>THE MOMENT BEFORE THE ANSWER</span><h2>Coverage improves.<br>Who changes their answer?</h2><p class="prediction-world-context" tabindex="0"><strong>'+html(focused.name)+' · '+html(focused.role)+'</strong><span>'+html(focused.circumstance)+'</span></p><small class="prediction-caption-definition">'+intro+'</small>';
    announcement=n?n+' of '+total+' selected to change.':'Nobody selected. You can predict that nobody changes.';
   }else{
    // Keep answer-derived ordering and markup entirely outside prediction mode.
    const changedIds=Array.isArray(model.changedIds)?model.changedIds:people.filter(p=>p.changed).map(p=>p.id);
    const changed=changedIds.length;
    const correct=Number.isInteger(model.correctCount)?model.correctCount:people.filter(p=>predicted.has(p.id)===!!p.changed).length;
    const discovery=[...people.filter(p=>predicted.has(p.id)!==!!p.changed),...people.filter(p=>!p.changed),...people];
    const order=[...new Map(discovery.map(p=>[p.id,p])).values()];
    const selected=people.find(p=>p.id===selectedId)||order[0]||people[0];
    const first=order[0]||people[0];
    const share=button('share','Copy link ↗',{className:'prediction-text-button',disabled:!canShare,ariaLabel:canShare?'Copy challenge link':'Sharing is unavailable for imported study records'});
    const replay=typeof onReplayDifference==='function'&&changed>0?button('replay',animation?'Stop animation':'Play comparison · 5s',{className:'prediction-text-button',ariaLabel:animation?'Stop the comparison animation':'Play the optional five-second comparison animation'}):'';
    const legend=changed===0?'No response categories changed.':animation?'Changed responses move; the rest stay frozen.':'Highlighted people changed their response.';
    let previousTool='';
    if(currentPhase==='reveal'){
     body=sectionHeading('THE RECORDED COMPARISON',changed+' of '+total+' changed<br>their answer.',`You predicted ${n?n+' would change':'nobody would change'}. Your prediction matched ${correct} of ${total} records.`)+`<div class="prediction-score"><b>${correct}<small> / ${total}</small></b><span>YOUR PREDICTION<br>MATCHED THESE RECORDS</span></div><p class="prediction-scroll-hint">${total} people · Scroll to see everyone</p><div class="prediction-people">${people.map(p=>revealedCard(p,predicted.has(p.id),selectedId)).join('')}</div><p class="prediction-outcome-note">The result comes from these ${total} paired records. It is not a forecast for a larger population.</p>`;
     footer=button('inspect','See what mattered '+arrow,{id:first.id,className:'prediction-primary'});
    }else{
     const index=order.findIndex(p=>p.id===selected.id),next=order[(index+1)%order.length],previous=order[(index-1+order.length)%order.length];
     body=sectionHeading('ONE PERSON IN THE STUDY',html(selected.name),html(selected.role))+`<div class="prediction-inspect-state ${selected.changed?'did-change':'did-not-change'}">${selected.changed?'Their answer changed':'Their answer stayed the same'}<span>You predicted ${predicted.has(selected.id)?'change':'no change'}</span></div><p class="prediction-inspect-circumstance">${html(selected.circumstance)}</p><div class="prediction-record-reason"><span class="prediction-eyebrow">SUPPLIED EXPLANATION</span><p>${html(selected.reason)}</p></div><div class="prediction-response-pair" tabindex="0" aria-label="Responses in both study runs"><div><span><b>A</b> ROUTE GAP</span><p>${html(selected.beforeText)}</p></div><div><span><b>B</b> GAP COVERED</span><p>${html(selected.afterText)}</p></div></div><p class="prediction-outcome-note">One of ${total} paired records. Same $25/month and 20 GB in both runs.</p>`;
     footer=button('inspect','Next: '+html(next.name)+' '+arrow,{id:next.id,className:'prediction-primary',disabled:order.length<2});
     previousTool=button('inspect','← Prev',{id:previous.id,className:'prediction-text-button',disabled:order.length<2,ariaLabel:'Inspect previous person'});
    }
    footer+=`<div class="prediction-footer-tools">${previousTool}${replay}${share}${button('explore','Explore ↗',{className:'prediction-text-button',ariaLabel:'Explore the full study'})}${button('restart','Restart',{className:'prediction-text-button',ariaLabel:'Make another prediction'})}</div>${shareMessage?`<p class="prediction-share-message" role="status">${html(shareMessage)}</p>`:''}${!canShare?'<span class="prediction-share-boundary">Sharing is unavailable for imported records.</span>':''}`;
    caption=`<span>${currentPhase==='inspect'?html(selected.name.toUpperCase()):'THE DIFFERENCE BETWEEN TWO RUNS'}</span><p class="prediction-motion-legend"><i aria-hidden="true"></i>${legend}</p>${currentPhase==='inspect'?'<small>The explanation belongs to the supplied record.</small>':'<small>Motion visualizes changed records; it is not a new simulated event.</small>'}`;
    announcement=currentPhase==='reveal'?changed+' of '+total+' answers changed. Your prediction matched '+correct+' of '+total+' records.':selected.name+'. '+(selected.changed?'Answer changed.':'Answer unchanged.');
   }
   find('.prediction-scroll').innerHTML=body;find('.prediction-footer').innerHTML=footer;
   if(selectedId&&available)caption+=button('overview','← All four people',{className:'prediction-overview'});
   find('.prediction-source').textContent=source;find('.prediction-world-caption').innerHTML=caption;
   const resetScroll=phaseChanged||(currentPhase==='inspect'&&lastSelected!==selectedId);
   find('.prediction-scroll').scrollTop=resetScroll?0:oldScroll;
   const retained=focusKey?[...el.querySelectorAll('[data-prediction-focus]')].find(b=>b.dataset.predictionFocus===focusKey&&!b.disabled):null;
   if(retained)retained.focus({preventScroll:true});
   else if((resetScroll||!wasVisible)&&(!active||active===document.body||focusKey))find('[data-prediction-heading]')?.focus({preventScroll:true});
   if(announcement!==lastAnnouncement){find('.prediction-announcement').textContent=announcement;lastAnnouncement=announcement;}
   lastPhase=currentPhase;lastSelected=selectedId;wasVisible=true;
  },
 };
}
