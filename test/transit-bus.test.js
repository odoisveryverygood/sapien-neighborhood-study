import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildTransitBus} from '../src/transit-bus.js';
test('transit vehicle remains bounded, groundable and within the live scene draw budget',()=>{const {group,wheels}=buildTransitBus();group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(group);assert.ok(box.min.y>=-.02&&box.min.y<.1);assert.ok(box.max.x-box.min.x<10);assert.ok(box.max.z-box.min.z<3.3);assert.equal(wheels.length,4);let calls=0,triangles=0;group.traverse(o=>{if(!o.isMesh)return;calls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));});assert.ok(calls<=18);assert.ok(triangles<35000);for(const wheel of wheels){assert.equal(wheel.rotation.x,Math.PI/2);wheel.rotation.y=-22/.47;}group.updateMatrixWorld(true);assert.ok(group.children.every(o=>o.matrixWorld.elements.every(Number.isFinite)));});
