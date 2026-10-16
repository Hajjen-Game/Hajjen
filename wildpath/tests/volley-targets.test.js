import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseVolleyTargets } from '../src/volley-targets.js';
const mob=(x,z,hp=30)=>({x,z,hp,maxHp:hp,alive:true});
test('two-target boost fires at two distinct nearby enemies',()=>{
  const player={x:0,z:0},a=mob(2,0),b=mob(4,0),c=mob(6,0);
  assert.deepEqual(chooseVolleyTargets([a,b,c],player,13,2,a),[a,b]);
});
test('three-target boost targets three distinct mobs in range',()=>{
  const p={x:0,z:0},a=mob(2,0),b=mob(4,0),c=mob(6,0),d=mob(19,0);
  assert.deepEqual(chooseVolleyTargets([a,b,c,d],p,13,3,a),[a,b,c]);
});
test('ignore dead and out-of-range enemies and retain damage versus lone mob',()=>{
  const p={x:0,z:0},a=mob(2,0),dead=mob(3,0),far=mob(20,0);
  dead.alive=false;
  assert.deepEqual(chooseVolleyTargets([a,dead,far],p,13,3,a),[a,a,a]);
  assert.deepEqual(chooseVolleyTargets([dead,far],p,13,3),[]);
});
test('preferred target is preserved but additional shots adapt to position',()=>{
  const a=mob(7,0),b=mob(3,0),c=mob(9,0);
  assert.deepEqual(chooseVolleyTargets([a,b,c],{x:6,z:0},13,2,a),[a,b]);
});
