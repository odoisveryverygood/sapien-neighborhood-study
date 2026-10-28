import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rootTravel,trip,sampleMoment,soleHeight} from '../src/motion.js';
const m=JSON.parse(fs.readFileSync(new URL('./fixtures/motion.json',import.meta.url),'utf8'));
test('recorded root motion drives a continuous start, two strides and stop',()=>{
 const whole=trip(m,100);assert.ok(whole.end>4.9&&whole.end<5.1);assert.ok(whole.duration>5&&whole.duration<5.2);
 const borders=[0,m.start.duration,m.start.duration+m.walk.duration,m.start.duration+2*m.walk.duration,whole.duration];
 for(const t of borders){const a=trip(m,t-1e-7),b=trip(m,t+1e-7);assert.ok(Math.abs(a.distance-b.distance)<1e-5);}
});
test('root interpolation clamps and reproduces the last recorded displacement',()=>{
 assert.equal(rootTravel(m.walk,-2),0);assert.equal(rootTravel(m.walk,100),(m.walk.positions.at(-1)-m.walk.positions[2])*.01);
});
test('timeline sampling is finite, bounded, and stays on the walking strip',()=>{
 for(let t=0;t<28;t+=.01){const s=sampleMoment(t,m);assert.ok([s.x,s.z,s.yaw,s.local,s.lookWeight].every(Number.isFinite));assert.ok(s.x>=-2.70001&&s.x<=2.4);assert.equal(s.z,.5);assert.ok(m[s.clip]);assert.ok(s.lookWeight>=0&&s.lookWeight<=1);}
});
test('seeking produces the same pose state regardless of prior sampling',()=>{
 for(const t of [0,2.9,3,4,6,8.1,10,15.7,20,27.9]){const expected=sampleMoment(t,m);sampleMoment(25,m);sampleMoment(1,m);assert.deepEqual(sampleMoment(t,m),expected);}
});
test('the resident returns to the initial location and stops before turning',()=>{
 assert.equal(sampleMoment(1,m).x,sampleMoment(27,m).x);assert.equal(sampleMoment(1,m).clip,'idle');assert.equal(sampleMoment(27,m).clip,'idle');
});
test('position and heading remain continuous at activity boundaries',()=>{
 const d=trip(m,0).duration;for(const t of [3,3+d,15,15+d]){const a=sampleMoment(t-1e-6,m),b=sampleMoment(t+1e-6,m);assert.ok(Math.abs(a.x-b.x)<1e-4);assert.ok(Math.abs(a.yaw-b.yaw)<1e-4);}
});

test('sole-height traces are measured, bounded and interpolate reproducibly',()=>{for(const clip of Object.values(m)){assert.ok(clip.soleHeights.length>=2);for(const y of clip.soleHeights)assert.ok(Number.isFinite(y)&&Math.abs(y)<.02);assert.equal(soleHeight(clip,-1),clip.soleHeights[0]);assert.equal(soleHeight(clip,100),clip.soleHeights.at(-1));}});
