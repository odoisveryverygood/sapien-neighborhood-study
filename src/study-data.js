// Authored fixtures for explaining the research question. No respondent output,
// coverage measurement, or real carrier pricing is represented by these values.
export const study = Object.freeze({
  id: 'price-and-coverage',
  question: 'Who switches for $20 less a month?',
  tradeoff: 'A cheaper phone plan. But less coverage on everyday routes.',
  provenance: 'illustrative',
  plans: Object.freeze({
    current: Object.freeze({id:'current',name:'Current plan',price:45,dataGB:20,calls:'Unlimited',texts:'Unlimited',billing:'Monthly',taxesIncluded:true,coverage:'Broader illustrated coverage'}),
    proposed: Object.freeze({id:'proposed',name:'Proposed plan',price:25,dataGB:20,calls:'Unlimited',texts:'Unlimited',billing:'Monthly',taxesIncluded:true,coverage:'An illustrated coverage gap'}),
  }),
});
export const perspectives = Object.freeze([
  Object.freeze({
    id:'daniel',name:'Daniel',role:'Delivery rider',shortRole:'The rider',initial:'D',color:'#41665b',
    circumstance:'His phone is part of the job.',
    detail:'He uses maps and receives customer calls while making deliveries. Part of this example route crosses the coverage gap.',
    tension:'Would the saving be worth an interrupted delivery?',
    tag:'Connection while moving',destination:'DELIVERY STOP',destinationX:470,destinationY:338,
    route:'M138 388 V228 H470 V338',gapRoute:'M470 280 V338',
    routeLabel:'Home to a delivery stop',
    gapCopy:'The cheaper plan leaves part of his delivery route outside the illustrated service area.',
    currentCopy:'His example route stays inside the current plan’s illustrated service area.',
    provenance:'authored-example',
  }),
  Object.freeze({
    id:'maya',name:'Maya',role:'Student',shortRole:'The student',initial:'M',color:'#8f7754',
    circumstance:'Her usual day is mostly on campus.',
    detail:'She has campus Wi-Fi, and her usual route avoids this example gap. Coverage on trips away would still matter.',
    tension:'Would $20 saved each month outweigh the limits elsewhere?',
    tag:'Campus Wi-Fi available',destination:'CAMPUS',destinationX:310,destinationY:150,
    route:'M138 388 V228 H310 V150',gapRoute:'',
    routeLabel:'Home to campus',
    gapCopy:'Her usual route avoids the illustrated gap. That alone does not tell us whether she would switch.',
    currentCopy:'Her example route stays inside the current plan’s illustrated service area.',
    provenance:'authored-example',
  }),
  Object.freeze({
    id:'amira',name:'Amira',role:'Parent',shortRole:'The parent',initial:'A',color:'#8d6557',
    circumstance:'Being reachable matters on the school run.',
    detail:'She wants to receive calls from school while travelling. Part of this example school route crosses the coverage gap.',
    tension:'How much would being reachable weigh against the lower bill?',
    tag:'School-day calls',destination:'SCHOOL',destinationX:450,destinationY:342,
    route:'M138 388 H450 V342',gapRoute:'M410 388 H450 V342',
    routeLabel:'Home to school',
    gapCopy:'The cheaper plan leaves part of her school route outside the illustrated service area.',
    currentCopy:'Her example route stays inside the current plan’s illustrated service area.',
    provenance:'authored-example',
  }),
]);
export function getPerspective(id){return perspectives.find(p=>p.id===id)||perspectives[0];}
export function savings(plans=study.plans){return plans.current.price-plans.proposed.price;}
export function fixedTermsMatch(plans=study.plans){return ['dataGB','calls','texts','billing','taxesIncluded'].every(key=>plans.current[key]===plans.proposed[key]);}
export function coverageView(personId,planId){
  const person=getPerspective(personId),proposed=planId==='proposed';
  return {person,plan:study.plans[proposed?'proposed':'current'],showGap:proposed,showRouteGap:proposed&&!!person.gapRoute,
    caption:proposed?person.gapCopy:person.currentCopy,
    description:`Illustrative neighborhood. ${person.name}, ${person.role.toLowerCase()}. ${person.routeLabel}. ${proposed?person.gapCopy:person.currentCopy}`};
}
