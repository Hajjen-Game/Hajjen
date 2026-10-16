import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_GATES } from '../src/config.js';
import { widthLockedFrustum, visibleTrailAhead } from '../src/framing.js';

// Babylon.js only needs to be present when building render meshes, not when
// checking the path math in a headless Node test.
globalThis.window={BABYLON:{}};
const {pathX,BOARD_HALF_WIDTH,CAMERA_WORLD_WIDTH,TRAIL_END}=await import('../src/world-v3.js');

test('diorama always fits completely across a portrait phone',()=>{
  for(const [width,height] of [[360,780],[390,844],[412,915],[768,1024],[650,1080]]){
    const f=widthLockedFrustum(width,height,CAMERA_WORLD_WIDTH);
    assert.ok(f.left<=-BOARD_HALF_WIDTH);
    assert.ok(f.right>=BOARD_HALF_WIDTH);
    assert.equal(f.top-f.bottom,CAMERA_WORLD_WIDTH*height/width);
  }
});

test('first mobile view reveals only a PART of first level, and rest scrolls upward',()=>{
  const ahead=visibleTrailAhead(390,844,CAMERA_WORLD_WIDTH);
  assert.ok(ahead>30&&ahead<STAGE_GATES[0]*.58);
  assert.ok(STAGE_GATES[0]>ahead*1.6);
});

test('winding path remains on the finite island throughout the game',()=>{
  const points=Array.from({length:90},(_,i)=>pathX(i*5));
  assert.ok(points.every(Number.isFinite));
  assert.ok(points.every(x=>Math.abs(x)<BOARD_HALF_WIDTH-6));
  assert.ok(Math.max(...points)-Math.min(...points)>6);
  assert.ok(TRAIL_END>STAGE_GATES.at(-1));
});

test('frustum keeps identical horizontal width on mobile and desktop',()=>{
  const portrait=widthLockedFrustum(390,844,CAMERA_WORLD_WIDTH);
  const desktop=widthLockedFrustum(650,1080,CAMERA_WORLD_WIDTH);
  assert.equal(portrait.right-portrait.left,desktop.right-desktop.left);
});

test('a portrait frustum rejects zero-size viewports',()=>{
  assert.throws(()=>widthLockedFrustum(0,900),RangeError);
});
