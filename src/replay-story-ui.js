import './replay-story.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={stay:'Keep current plan',switch:'Try cheaper plan',check:'Check coverage'};
const stages=['intro','routine','offer','response','compare','results'];
const stepNames=['The question','Their circumstances','The offer','The response','Another scenario','The finding'];
const btn=(action,label,extra='')=>`<button type="button" data-story-action="${action}" ${extra}>${label}</button>`;
export function createReplayStory({root,onStart,onPause,onAdvance,onSelect,onContrast,onRun,onExplore,onChallenge,onRestart,onOverview,onResearch}){
 const el=document.createElement('section');el.id='replay-story';el.hidden=true;el.setAttribute('aria-label','Watch a study unfold');
 el.innerHTML='<div class="story-location"></div><div class="story-subject"></div><section class="story-sheet"><div class="story-track"></div><div class="story-content"></div><footer class="story-footer"></footer></section><div class="story-source"></div>';
 root.append(el);let lastStage=null,lastPerson=null;
 el.addEventListener('click',e=>{const b=e.target.closest('button[data-story-action]');if(!b||b.disabled)return;const action=b.dataset.storyAction;({start:onStart,pause:onPause,advance:onAdvance,contrast:onContrast,explore:onExplore,challenge:onChallenge,restart:onRestart,overview:onOverview,research:onResearch}[action])?.();if(action==='person')onSelect(b.dataset.id);if(action==='run')onRun(b.dataset.run);});
 return {
 updatePlayback(time,playing){const clock=el.querySelector('.story-clock');if(clock)clock.textContent=`09:12:${String(Math.floor(time)).padStart(2,'0')} · ${playing?'PLAYING':'PAUSED'}`;const b=el.querySelector('[data-story-action="pause"]');if(b){b.textContent=playing?'Ⅱ Pause':'▶ Resume';b.setAttribute('aria-label',playing?'Pause the morning':'Resume the morning');}const fill=el.querySelector('.story-time-fill');if(fill)fill.style.width=Math.min(100,time/14*100)+'%';},
 render(model,{visible=false,stage='intro',scenarioId='original',time=3,playing=false}={}){
  el.hidden=!visible;if(!visible)return;const p=model.selected;if(!p)return;
  const active=document.activeElement,oldAction=el.contains(active)?active.dataset.storyAction:null,oldId=active?.dataset?.id;
  const index=stages.indexOf(stage),pair=model.rows.find(r=>r.id===p.id),isB=scenarioId==='improved',isExample=model.sourceNote.toLowerCase().includes('authored');
  el.dataset.stage=stage;el.dataset.person=p.id;el.dataset.scenario=scenarioId;el.dataset.playing=String(playing);
  el.querySelector('.story-location').innerHTML=`<span class="story-place">MERCER NEIGHBORHOOD</span><span class="story-clock"></span>`;
  el.querySelector('.story-subject').innerHTML=stage==='intro'||stage==='results'?'':`<span class="story-subject-name">${esc(p.name)} <small>${esc(p.role)}</small></span>${stage==='routine'?'<span class="story-subject-note">The setting illustrates the profile’s circumstances.</span>':btn('overview','View the neighborhood ↗')}`;
  el.querySelector('.story-track').innerHTML=`<span>${String(index+1).padStart(2,'0')} / 06 <i>—</i> ${stepNames[index]}</span><div aria-hidden="true">${stages.map((_,i)=>`<b class="${i<=index?'complete':''}"></b>`).join('')}</div><span class="story-run">${stage==='intro'?(model.paired?'A STUDY IN TWO SCENARIOS':'ONE SUPPLIED RUN'):'RUN '+(isB?'B · GAP COVERED':'A · ROUTE GAP')}</span>`;
  const offer=`<div class="story-offer"><span><s>$${model.offer.currentPrice}</s><strong>$${model.offer.proposedPrice}<small>/mo</small></strong></span><p>${model.offer.dataGB} GB<span>Coverage ${isB?'gap closed':'gap on everyday routes'}</span></p></div>`;
  let title='',body='',extra='',primary='',secondary='';
  if(stage==='intro'){
   title='Would you lose signal<br>to save $20?';body=model.paired?'Four synthetic people receive the same cheaper phone plan. Follow their morning, inspect their responses, then compare an offer with better coverage.':'Four supplied profiles receive a cheaper phone plan. Follow their morning and inspect the recorded responses. A second run is needed for comparison.';
   extra='<p class="story-product">Sapien explores how different people respond to a scenario. This interactive example follows the path from a profile to a study finding.</p>';
   primary=btn('start','Watch the run <span>↗</span>','class="story-primary"');secondary=btn('explore','Explore the records','class="story-secondary"');
  }else if(stage==='routine'){
   title=`${p.name} has a reason to stay connected.`;body=p.circumstance;extra='<p class="story-explanation">Circumstances are part of the profile used in a study. Watch the morning; it will pause when the offer arrives.</p><div class="story-time-track"><i class="story-time-fill"></i></div>';
   primary=btn('pause',playing?'Ⅱ Pause':'▶ Resume','class="story-primary"');secondary=btn('advance','Skip to the offer →','class="story-secondary"');
  }else if(stage==='offer'){
   title='$20 less a month. Less coverage, too.';body=model.offer.coverage;extra=offer+`<p class="story-explanation">For ${esc(p.name)}: ${esc(p.circumstance)}</p>`;
   primary=btn('advance',playing?'Watching the phone check…':`See ${esc(p.name)}’s response <span>→</span>`,`class="story-primary" ${playing?'disabled':''}`);secondary=btn('restart','Start again','class="story-secondary"');
  }else if(stage==='response'){
   title=p.response.text;body=p.response.reason;extra=`<div class="story-evidence"><span>${isExample?'EXAMPLE':'SUPPLIED'} RESPONSE · RUN ${isB?'B':'A'}</span><p>${esc(p.circumstance)}</p></div>`;
   primary=btn('advance',model.paired?'What if coverage improves? <span>→</span>':'See the study results <span>→</span>','class="story-primary"');
   const other=model.participants.find(x=>x.id===model.contrastId);secondary=other?btn('contrast',`A different response: ${esc(other.name)} ↗`,'class="story-secondary"'):btn('explore','Explore the records','class="story-secondary"');
  }else if(stage==='compare'){
   title=pair?.changed?(isB?`${p.name} changes their answer.`:'The original answer.'): `${p.name} keeps the same answer.`;body=p.response.reason;
   extra=`<div class="story-comparison"><div class="story-scenario-switch" role="group" aria-label="Compare the same person in both runs">${btn('run','A · Route gap',`data-run="original" aria-pressed="${!isB}"`)}${btn('run','B · Gap covered',`data-run="improved" aria-pressed="${isB}" ${!model.paired?'disabled':''}`)}</div><p>$${model.offer.proposedPrice}/month · ${model.offer.dataGB} GB in both runs<br><span>Same person. Same moment. Only coverage changes.</span></p></div><div class="story-paired"><span>A <b>${esc(pair?.beforeText||'No record')}</b></span><i>→</i><span>B <b>${esc(pair?.afterText||'Second run needed')}</b></span></div>`;
   primary=btn('advance','See the whole study <span>→</span>','class="story-primary"');secondary=btn('explore','Explore this record ↗','class="story-secondary"');
  }else{
   const a=model.counts.original.switch,b=model.counts.improved?.switch;
   title=model.paired?`${a} → ${b} choose the cheaper plan.`:`${a} of ${model.total} choose the cheaper plan.`;
   body=model.paired?`Covering the gap changes ${model.changedIds.length} of ${model.total} recorded choices. Select a person below to inspect the response behind the finding.`:'These are the supplied choices in run A. A second run is needed to compare outcomes.';
   extra=`<div class="story-results" aria-label="Responses behind the finding">${model.rows.map(r=>btn('person',`<strong>${esc(r.name)}</strong><span>${esc(names[r.beforeChoice])}${model.paired?` <i>→</i> ${esc(names[r.afterChoice])}`:''}</span><small>${r.changed===null?'ONE RUN':r.changed?'CHANGED':'UNCHANGED'} ↗</small>`,`data-id="${esc(r.id)}" class="story-result"`)).join('')}</div><p class="story-boundary">${model.total} ${isExample?'authored example':'supplied'} records. These counts do not establish a population forecast.</p>`;
   primary=btn('explore','Explore the study <span>↗</span>','class="story-primary"');secondary=btn('research','See a published Sapien study ↗','class="story-secondary"');
  }
  el.querySelector('.story-content').innerHTML=`<div class="story-copy"><h1 tabindex="-1">${esc(title).replace(/&lt;br&gt;/g,'<br>')}</h1><p class="story-body">${esc(body)}</p>${extra}</div><div class="story-actions">${primary}${secondary}</div>`;
  el.querySelector('.story-footer').innerHTML=stage==='intro'?'<span>01 / Follow a person</span><span>02 / Inspect the response</span><span>03 / Compare the finding</span>':stage==='results'?btn('restart','↺ Replay from the beginning','class="story-restart"'):`<span>FOLLOW A PERSON</span><nav aria-label="Follow a study participant">${model.participants.map(person=>btn('person',esc(person.name),`data-id="${esc(person.id)}" aria-pressed="${person.id===p.id}"`)).join('')}</nav><span class="story-freeze-note">${playing?'Watching the morning':time>=14?'Time paused · drag to look around':'Drag to change your viewpoint'}</span>`;
  el.querySelector('.story-source').textContent=isExample?'Example profiles and responses · no live Sapien run':'Imported records · source unverified · illustrative replay';
  const changed=lastStage!==stage||(lastPerson!==p.id&&['response','compare'].includes(stage));
  if(changed)el.querySelector('.story-sheet').scrollTop=0;
  const retained=oldAction?[...el.querySelectorAll('button')].find(b=>b.dataset.storyAction===oldAction&&(!oldId||b.dataset.id===oldId)&&!b.disabled):null;
  if(retained)retained.focus({preventScroll:true});else if(changed&&oldAction)el.querySelector('h1')?.focus({preventScroll:true});
  lastStage=stage;lastPerson=p.id;this.updatePlayback(time,playing);
 }
 };
}
