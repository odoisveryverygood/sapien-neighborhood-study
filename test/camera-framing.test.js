import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {safeFrame,fitCamera,boxCorners} from '../src/camera-framing.js';

const V=(x,y,z)=>new T.Vector3(x,y,z);
const subject=V(-12.5,0,3.55);
const person={target:subject.clone().add(V(0,1,0)),points:boxCorners(subject.clone().add(V(-.6,.025,-.3)),subject.clone().add(V(.6,2.02,.3))),direction:V(4.5,1.2,3.6)};
const moment={target:subject.clone().add(V(0,1.42,0)),points:boxCorners(subject.clone().add(V(-.63,.8,-.3)),subject.clone().add(V(.63,1.95,.3))),direction:V(.22,.05,1)};

function projectShot({width,height,layout,shot=person}){
 const camera=new T.PerspectiveCamera(width<700?48:36,width/height,.03,180);
 camera.position.copy(fitCamera(shot.points,shot.target,shot.direction,{fov:camera.fov,aspect:camera.aspect,width,height,layout,minDistance:1,maxDistance:100,padding:.92}));
 camera.lookAt(shot.target);
 const frame=safeFrame(width,height,layout);
 camera.setViewOffset(width,height,frame.offsetX,frame.offsetY,width,height);
 camera.updateMatrixWorld(true);
 return {camera,frame,projections:shot.points.map(point=>{const p=point.clone().project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2,z:p.z};})};
}

for(const fixture of [
 {name:'desktop intro leaves the text column clear',width:1280,height:720,layout:{leftInset:480,topInset:70},shot:moment},
 {name:'guided full-body shot clears the bottom caption',width:1280,height:720,layout:{leftInset:170,bottomInset:205,topInset:70}},
 {name:'person shot clears the right record drawer and replay',width:1280,height:720,layout:{rightInset:400,bottomInset:95,topInset:70}},
 {name:'mobile guided shot clears the reading card',width:390,height:844,layout:{bottomInset:270,topInset:70}},
 {name:'mobile full-body shot clears an expanded record sheet',width:390,height:844,layout:{bottomInset:844*.48,topInset:70}},
 {name:'population bounds fit beside the report and guide',width:1280,height:720,layout:{leftInset:170,rightInset:400,bottomInset:205,topInset:70},shot:{target:V(0,1.05,2.5),points:boxCorners(V(-14,-.2,0),V(14,2.3,5)),direction:V(.1,.28,1)}},
]){
 test(fixture.name,()=>{
  const {projections,frame}=projectShot(fixture);
  assert.equal(projections.length,8);
  for(const p of projections){
   assert.ok([p.x,p.y,p.z].every(Number.isFinite));
   assert.ok(p.z>-1&&p.z<1,'Every bound must remain in front of the camera and inside clipping planes');
   assert.ok(p.x>=frame.left-1&&p.x<=fixture.width-frame.right+1,'Subject must clear left and right UI');
   assert.ok(p.y>=frame.top-1&&p.y<=fixture.height-frame.bottom+1,'Subject must clear header and bottom UI');
  }
 });
}

test('asymmetric layouts move the subject into the uncovered screen area',()=>{
 for(const layout of [{leftInset:480},{rightInset:400},{bottomInset:270}]){
  const width=1280,height=720,{camera}=projectShot({width,height,layout});
  const center=person.target.clone().project(camera),x=(center.x+1)*width/2,y=(1-center.y)*height/2;
  if(layout.leftInset)assert.ok(x>width/2,'Left text moves the subject right');
  if(layout.rightInset)assert.ok(x<width/2,'Right record moves the subject left');
  if(layout.bottomInset)assert.ok(y<height/2,'Bottom caption moves the subject up');
 }
});

test('fitting follows world translations and never mutates the subject bounds',()=>{
 const width=1280,height=720,layout={leftInset:170,bottomInset:205,topInset:70};
 const before={points:person.points.map(p=>p.toArray()),target:person.target.toArray(),direction:person.direction.toArray()};
 const offset=V(19,.1,-7),translated={points:person.points.map(p=>p.clone().add(offset)),target:person.target.clone().add(offset),direction:person.direction.clone()};
 const first=projectShot({width,height,layout}),second=projectShot({width,height,layout,shot:translated});
 for(let i=0;i<first.projections.length;i++)for(const axis of ['x','y','z'])assert.ok(Math.abs(first.projections[i][axis]-second.projections[i][axis])<1e-7);
 assert.deepEqual({points:person.points.map(p=>p.toArray()),target:person.target.toArray(),direction:person.direction.toArray()},before);
});
