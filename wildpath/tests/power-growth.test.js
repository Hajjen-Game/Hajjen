import test from 'node:test';
import assert from 'node:assert/strict';
import {casterVolley,casterGlintDamage,casterBloom,casterPool,glintSplash,cascadePower,choosePowerBoosts} from '../src/power-growth.js';
import {BOOSTS} from '../src/config.js';
test('first surge always offers 3 strong damage options',()=>{
 const xs=choosePowerBoosts(BOOSTS.filter(x=>x.classes.includes('caster')),new Set(),0,()=>0);
 assert.deepEqual(xs.map(x=>x.id),['double','bloom','snowfield']);
});
test('prerequisites gate deeper evolutions',()=>{
 const pool=BOOSTS.filter(x=>x.classes.includes('caster'));
 assert.ok(!choosePowerBoosts(pool,new Set(),0,()=>0).some(x=>x.id==='nova'));
 assert.ok(choosePowerBoosts(pool,new Set(['bloom']),2,()=>0).some(x=>x.id==='nova'));
});
test('five glints have strong distinct group damage, legacy version unchanged',()=>{
 const u=new Set(['double','triple','glintstorm']);
 assert.equal(casterVolley(u),5);assert.equal(casterVolley(u,false),3);
 assert.ok(casterGlintDamage(u)>casterGlintDamage(new Set())*1.4);
 assert.equal(glintSplash(u).targets,5);
});
test('Bloom and Winter Pool become substantially stronger',()=>{
 const mid=casterBloom(new Set(['bloom'])),late=casterBloom(new Set(['bloom','nova']));
 assert.ok(late.radius>mid.radius);assert.ok(late.damage>mid.damage);
 assert.equal(late.splinters,4);
 const pool=casterPool(new Set(['snowfield','hailstorm']));
 assert.ok(pool.radius>6);assert.ok(pool.entryDamage>=40);assert.ok(pool.tick<.4);
});
test('Cascade bounds chain depth and fanout',()=>{
 assert.equal(cascadePower(new Set(['cascade'])).maxDepth,1);
 assert.equal(cascadePower(new Set(['cascade','cascadebloom'])).maxDepth,2);
 assert.ok(cascadePower(new Set(['cascade'])).targets<=6);
});
