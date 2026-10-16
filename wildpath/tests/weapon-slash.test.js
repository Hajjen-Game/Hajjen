import test from 'node:test';
import assert from 'node:assert/strict';
import {slashFramePaths,slashFrameIndex,slashScreenAngle,slashVisualSize,WEAPON_SLASH_LICENSE} from '../src/weapon-slash.js';
test('use Cethiel original 6-frame groups without assuming sprite grid',()=>{
  assert.equal(WEAPON_SLASH_LICENSE,'CC0-1.0');
  assert.deepEqual(slashFramePaths('basic').map(x=>x.split('_').at(-1)),['01.png','02.png','03.png','04.png','05.png','06.png']);
  assert.deepEqual(slashFramePaths('wide').map(x=>x.split('_').at(-1)),['07.png','08.png','09.png','10.png','11.png','12.png']);
});
test('one-shot playback is time based and never wraps unexpectedly',()=>{
  assert.equal(slashFrameIndex(0),0);
  assert.equal(slashFrameIndex(.14),3);
  assert.equal(slashFrameIndex(.279),5);
  assert.equal(slashFrameIndex(.8),5);
  assert.equal(slashFrameIndex(-1),0);
});
test('mobile slash size stays compact and follows target direction',()=>{
  assert.ok(slashVisualSize(12)<95);
  assert.ok(slashVisualSize(12,true)>slashVisualSize(12));
  assert.ok(slashVisualSize(200,true)<=105);
  assert.ok(slashScreenAngle({x:0,y:0},{x:20,y:0})===0);
  assert.ok(Math.abs(slashScreenAngle({x:0,y:0},{x:0,y:20})-Math.PI/2)<1e-9);
});
