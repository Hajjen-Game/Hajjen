import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAutoTarget } from '../src/targeting.js';
import { nextTravelZ,positionAfterBlessing,cameraAnchorZ } from '../src/flow.js';
import { STAGE_GATES } from '../src/config.js';
import { BOARD_START } from '../src/layout-v5.js';

const enemy=(x,z,hp=36)=>({x,z,hp,maxHp:36,alive:true});
test('auto targeting follows position and nearby danger, not manual locks',()=>{
  const left=enemy(-1,0),right=enemy(4,0),dead=enemy(0,0);
  dead.alive=false;
  const threats=[left,right,dead];
  assert.equal(chooseAutoTarget(threats,{x:0,z:0},14,null),left);
  assert.equal(chooseAutoTarget(threats,{x:3.6,z:0},14,left),right);
  assert.equal(chooseAutoTarget(threats,{x:30,z:30},14,left),null);
  assert.equal(chooseAutoTarget([enemy(2,0,8),enemy(2.4,0,36)],{x:0,z:0},14).hp,8);
});
test('boost choice does not teleport the character',()=>{
  const before={x:4.5,z:14.2};
  assert.deepEqual(positionAfterBlessing(before),before);
});
test('a player may run backwards after any stage without disappearing off-screen',()=>{
  assert.ok(nextTravelZ(29,-40,1,false,STAGE_GATES,BOARD_START)<1);
  assert.equal(nextTravelZ(20,-100,2,false,STAGE_GATES,BOARD_START),BOARD_START+1);
  assert.ok(nextTravelZ(25,40,0,false,STAGE_GATES,BOARD_START)<STAGE_GATES[0]);
  assert.ok(nextTravelZ(25,40,1,false,STAGE_GATES,BOARD_START)>STAGE_GATES[0]);
  assert.equal(cameraAnchorZ(5,7)-cameraAnchorZ(25,7),-20);
  assert.equal(cameraAnchorZ(-8,7),-15);
});
