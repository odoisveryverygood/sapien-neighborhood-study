const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export function rootTravel(clip,time){
 const {times,positions}=clip;
 const t=clamp(time,0,clip.duration);let i=1;while(i<times.length&&times[i]<t)i++;
 if(i>=times.length)return(positions.at(-1)-positions[2])*.01;
 const u=(t-times[i-1])/(times[i]-times[i-1]||1);
 return(positions[(i-1)*3+2]*(1-u)+positions[i*3+2]*u-positions[2])*.01;
}
export function trip(m,time){
 const a=m.start.duration,b=m.walk.duration*2,c=m.stop.duration;
 const first=rootTravel(m.start,a),stride=rootTravel(m.walk,m.walk.duration),end=first+2*stride+rootTravel(m.stop,c);
 if(time<0)return {distance:0,clip:'idle',local:0,duration:a+b+c,end};
 if(time<a)return {distance:rootTravel(m.start,time),clip:'start',local:time,duration:a+b+c,end};
 if(time<a+b){const t=time-a,cycles=Math.floor(t/m.walk.duration),local=t%m.walk.duration;return {distance:first+cycles*stride+rootTravel(m.walk,local),clip:'walk',local,duration:a+b+c,end};}
 if(time<a+b+c)return {distance:first+2*stride+rootTravel(m.stop,time-a-b),clip:'stop',local:time-a-b,duration:a+b+c,end};
 return {distance:end,clip:'idle',local:0,duration:a+b+c,end};
}
export function sampleMoment(time,m){
 const forward=trip(m,time-3),back=trip(m,time-15),endX=-2.7+forward.end;
 let x=-2.7,yaw=0,clip='idle',local=time%m.idle.duration,lookWeight=0,activity='A moment before heading out';
 if(time<3)yaw=Math.PI/2*ease((time-2.1)/.9);
 else if(time<3+forward.duration){x=-2.7+forward.distance;yaw=Math.PI/2;clip=forward.clip;local=forward.local;activity='Walking past Common Ground';}
 else if(time<15){x=endX;yaw=Math.PI/2*(1-ease((time-3-forward.duration)/1.1));if(time>14.1)yaw=-Math.PI/2*ease((time-14.1)/.9);lookWeight=.7*ease((time-9.5)/.8)*(1-ease((time-13.4)/.7));activity='Pausing outside the café';}
 else if(time<15+back.duration){x=endX-back.distance;yaw=-Math.PI/2;clip=back.clip;local=back.local;activity='Continuing down the street';}
 else{yaw=-Math.PI/2*(1-ease((time-15-back.duration)/1.1));lookWeight=.55*ease((time-21)/.8)*(1-ease((time-25)/.7));activity='Taking in the neighborhood';}
 return {x,z:.5,yaw,clip,local,lookWeight,activity};
}

export function soleHeight(clip,time){const values=clip.soleHeights;if(!values?.length)return 0;const u=clamp(time/clip.duration)*(values.length-1),i=Math.floor(u),t=u-i;return values[i]*(1-t)+values[Math.min(i+1,values.length-1)]*t;}
