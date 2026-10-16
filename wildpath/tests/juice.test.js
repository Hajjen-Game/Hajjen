import test from 'node:test';
import assert from 'node:assert/strict';
import { displayedScoreStep,cooldownFill,justRecharged,shakeStrength } from '../src/juice.js';

test('score visually counts upward without changing total or overshooting',()=>{
  let display=0;
  for(let i=0;i<100;i++){
    const next=displayedScoreStep(display,1250,1/60);
    assert.ok(next>=display&&next<=1250);
    display=next;
  }
  assert.equal(display,1250);
  assert.equal(displayedScoreStep(400,300,.016),300);
});
test('score animation remains bounded after unusually long frames',()=>{
  assert.ok(displayedScoreStep(0,5000,4)<=5000);
  assert.equal(displayedScoreStep(5000,5000,.02),5000);
  assert.equal(displayedScoreStep(10,100,0),11);
});
test('cooldown wipe reports 100% when cast and 0% on recharge',()=>{
  assert.equal(cooldownFill(8,8),100);
  assert.equal(cooldownFill(4,8),50);
  assert.equal(cooldownFill(0,8),0);
  assert.equal(cooldownFill(-2,8),0);
  assert.equal(cooldownFill(3,0),0);
  assert.equal(justRecharged(.03,0),true);
  assert.equal(justRecharged(0,0),false);
});
test('camera shake is subtle and respects reduced motion',()=>{
  assert.ok(shakeStrength('crit')>shakeStrength('hit'));
  assert.ok(shakeStrength('heavy')>shakeStrength('crit'));
  assert.equal(shakeStrength('heavy',true),0);
});
