import test from 'node:test';
import assert from 'node:assert/strict';
import { Director } from '../src/director.js';
import { STAGE_BUDGETS, CLASS_DATA, BOOSTS } from '../src/config.js';

test('director cannot exceed stage threat budget', () => {
  const director=new Director();
  const game={enemies:[],hp:100,maxHp:100,x:0,z:0,recentHit:0,spawned:[],spawnEnemy(type){this.spawned.push(type)},showToast(){}};
  for(let i=0;i<3000;i++)director.tick(.05,game);
  assert.ok(director.spent<=STAGE_BUDGETS[0]);
  assert.equal(director.spent,STAGE_BUDGETS[0]);
  assert.equal(game.spawned.length,STAGE_BUDGETS[0]);
});

test('stages reset intensity and cannot exceed budgets',()=>{
  const d=new Director();d.stress=.9;d.spent=14;d.next();assert.equal(d.stage,1);assert.equal(d.spent,0);assert.equal(d.phase,'build');assert.equal(d.stress,0);
});

test('both classes have three skills plus their always-on basic',()=>{
  for(const klass of Object.values(CLASS_DATA)){assert.equal(klass.spells.length,3);assert.equal(klass.cooldowns.length,3);assert.ok(klass.basic);assert.ok(klass.range>0);}
});

test('blessings are available for each class',()=>{
  for(const classId of Object.keys(CLASS_DATA))assert.ok(BOOSTS.filter(b=>b.classes.includes(classId)).length>=3);
});
