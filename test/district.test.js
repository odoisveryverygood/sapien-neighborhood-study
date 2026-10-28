import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildDistrict} from '../src/district.js';
test('district stays within a bounded draw budget and adds no simulated people or lights',()=>{const world={scene:new T.Scene()},root=buildDistrict(world);assert.equal(buildDistrict(world),root);assert.equal(world.scene.children.length,1);let calls=0,triangles=0,lights=0;root.traverse(o=>{if(o.isLight)lights++;if(o.isInstancedMesh){calls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*o.count;assert.ok([...o.instanceMatrix.array].every(Number.isFinite));}});assert.equal(lights,0);assert.ok(calls<=34);assert.ok(triangles<220000);assert.equal(root.userData.buildings.length,11);});
test('foreground buildings leave the central camera and transit-plaza corridor clear',()=>{const world={scene:new T.Scene()},root=buildDistrict(world);for(const b of root.userData.buildings){const [x,z]=b.center;if(z+b.depth/2<=23.1)continue;assert.ok(x+b.width/2<=-23||x-b.width/2>=23,b.id+' obstructs central camera corridor');}assert.ok(world.districtBounds.containsPoint(new T.Vector3(0,0,40)));});
