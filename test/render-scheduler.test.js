import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderScheduler} from '../src/render-scheduler.js';
test('a paused replay submits no redundant frames, but a changed time renders',()=>{const s=new RenderScheduler();assert.equal(s.shouldRender({time:14}),true);s.didRender(14);for(let i=0;i<300;i++)assert.equal(s.shouldRender({time:14}),false);assert.equal(s.rendered,1);assert.equal(s.skipped,300);assert.equal(s.shouldRender({time:14.01}),true);});
test('camera movement, result transitions and explicit invalidation work while time is frozen',()=>{const s=new RenderScheduler();s.didRender(14);for(const flags of [{cameraMoving:true},{transitioning:true}])assert.equal(s.shouldRender({time:14,...flags}),true);s.invalidate();assert.equal(s.shouldRender({time:14}),true);s.didRender(14);assert.equal(s.shouldRender({time:14}),false);});
