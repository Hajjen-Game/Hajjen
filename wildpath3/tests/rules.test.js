import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_RADIUS,CAMERA_WIDTH,WAVE_BUDGETS,ENEMY_TYPES,BOOSTS,normalizedInput,moveInsideArena,selectAutoTarget,waveEnemyType,spawnAtAngle} from '../src/rules.js';

test('arena is significantly smaller and camera closer than Wildpath 2.x',()=>{
  assert.ok(ARENA_RADIUS<20);
  assert.ok(CAMERA_WIDTH<20);
  assert.deepEqual(WAVE_BUDGETS,[11,15,19]);
});
test('joystick diagonals never increase movement speed',()=>{
  const m=normalizedInput(1,1);
  assert.ok(Math.abs(Math.hypot(m.x,m.z)-1)<1e-8);
  assert.deepEqual(normalizedInput(.3,-.4),{x:.3,z:-.4});
});
test('arena clamp prevents running outside the decorative ring',()=>{
  const p=moveInsideArena(12,0,40,2);
  assert.ok(Math.hypot(p.x,p.z)<=ARENA_RADIUS-.59);
});
test('auto-target locks only on a living enemy within range',()=>{
  const hero={x:0,z:0};
  const enemies=[{x:4,z:0,alive:true},{x:2,z:0,alive:false},{x:1,z:1,alive:true}];
  assert.equal(selectAutoTarget(hero,enemies,5),enemies[2]);
  assert.equal(selectAutoTarget(hero,enemies,1),null);
});
test('finite waves end in a guardian and every enemy has a valid definition',()=>{
  assert.equal(waveEnemyType(2,18),'guardian');
  for(let wave=0;wave<WAVE_BUDGETS.length;wave++){
    for(let i=0;i<WAVE_BUDGETS[wave];i++)
      assert.ok(ENEMY_TYPES[waveEnemyType(wave,i)]);
  }
  assert.ok(Math.abs(Math.hypot(...Object.values(spawnAtAngle(1)))-(ARENA_RADIUS-1.8))<1e-9);
});
test('power-up catalog has unique ids and meaningful choices',()=>{
  assert.equal(new Set(BOOSTS.map(b=>b.id)).size,BOOSTS.length);
  assert.ok(BOOSTS.length>=3);
});
