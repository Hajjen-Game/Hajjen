import test from 'node:test';
import assert from 'node:assert/strict';
import {WILD_RADIUS,WILD_CAMERA_WIDTH,freeStep,insideWild,openSpawnPoint,energyThreshold,energyProgress} from '../src/open-layout.js';
import {OpenDirector} from '../src/director-open.js';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('open meadow permits both axes and diagonal movement at world center',()=>{
  assert.deepEqual(freeStep(0,0,5,4),{x:5,z:4});
  assert.deepEqual(freeStep(8,7,-5,3),{x:3,z:10});
  assert.ok(insideWild(0,0));assert.ok(WILD_CAMERA_WIDTH<33.2);
});
test('continuous circular forest boundary never permits escaping',()=>{
  for(let i=0;i<2000;i++){
    const a=(i/2000)*Math.PI*2,r=i/7;
    const p=freeStep(0,0,Math.sin(a)*r,Math.cos(a)*r);
    assert.ok(Math.hypot(p.x,p.z)<=WILD_RADIUS+1e-7);
  }
  assert.ok(!insideWild(WILD_RADIUS+1,0));
});
test('adaptive enemy arrivals surround the wandering player',()=>{
  let seed=31;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(const hero of [{x:0,z:0},{x:35,z:20},{x:-41,z:-3},{x:21,z:-34}]){
    for(let i=0;i<60;i++){
      const p=openSpawnPoint(hero,rng);
      assert.ok(insideWild(p.x,p.z));
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
      assert.ok(Math.hypot(p.x-hero.x,p.z-hero.z)>3);
    }
  }
});
test('progressive magic thresholds permit eight choices with quick first upgrade',()=>{
  assert.equal(energyThreshold(0),6);
  assert.equal(energyThreshold(7),27);
  assert.equal(energyProgress(3,0),.5);
  assert.equal(energyProgress(12,0),1);
  assert.equal(energyProgress(-4,0),0);
});
test('Director reuses existing enemy system and pauses for upgrades',()=>{
  const director=new OpenDirector();
  const types=[],messages=[];
  const game={x:0,z:0,hp:100,maxHp:100,enemies:[],recentHit:0,energy:0,
    spawnEnemy(type){types.push(type);},showToast(message){messages.push(message);}};
  for(let i=0;i<80;i++)director.tick(.1,game);
  assert.ok(types.length>0);
  assert.ok(['build','peak','relax'].includes(director.phase));
  game.energy=energyThreshold(0);
  director.tick(.1,game);
  assert.ok(director.ready);
  assert.ok(messages[0].includes('blessing'));
  const previous=types.length;
  director.tick(12,game);
  assert.equal(types.length,previous);
  director.next();game.energy=0;
  assert.equal(director.stage,1);
  assert.ok(!director.ready);
});
test('Open World is the default but old road, director and movement survive unchanged',()=>{
  assert.match(source,/get\('world'\)!=='classic'/);
  assert.match(source,/OPEN_WORLD\?createOpenWorld\(scene\):createWorld\(scene\)/);
  assert.match(source,/OPEN_WORLD\?new OpenDirector\(\):new Director\(\)/);
  assert.match(source,/OPEN_WORLD\?freeStep\(/);
  assert.match(source,/moveOnRoad\(/);
  assert.match(source,/OPEN_WORLD\?game\.x:0/);
  assert.match(source,/camera\.setTarget\(V\(camera\.position\.x\+shakeX/);
  assert.match(html,/world=classic/);
  assert.match(html,/id="energyFill"/);
});
test('all combat and Pixi systems are still invoked for the new world',()=>{
  for(const name of ['chooseVolleyTargets(','basicAttack();','updateEnemies(dt);',
    'updateProjectiles(dt);','pixi.update(dt,game);','updateGlints(dt);',
    'director.tick(dt,game);','spellFX.tick(dt);'])assert.ok(source.includes(name),name);
  assert.match(source,/if\(OPEN_WORLD\)\s*\{\s*game\.energy=0/);
  assert.match(source,/OPEN_WORLD\?7:3/);
});
