import test from 'node:test';
import assert from 'node:assert/strict';
import { volleyVector,projectedPair,styleForSpell,WildpathPixiCombat } from '../src/pixi-combat.js';
import { readFileSync } from 'node:fs';

test('energy arena artist-authored crystal projectile and impacts are imported',()=>{
  const path=readFileSync(new URL('../src/pixi-combat.js',import.meta.url),'utf8');
  assert.match(path,/pvp-25d\/src\/energy\/arena\/EnergyPixiProjectiles\.js/);
  assert.match(path,/pvp-25d\/src\/energy\/arena\/EnergyPixiImpacts\.js/);
  assert.match(path,/drawEnergyProjectile\(/);
  assert.match(path,/drawProjectileImpact\(/);
});
test('Pixi projectile trail never becomes a long band even when camera zooms out',()=>{
  const p=volleyVector(100,100,700,0,300);
  assert.equal(Math.hypot(100-p.x,100-p.y),72);
  const q=volleyVector(55,20,5,0,50);
  assert.equal(q.x,5);
  assert.equal(q.y,20);
});
test('all eight spells have distinct accessible palette profiles',()=>{
  for(const name of ['Glint Dart','Winter Pool','Crystal Bloom','Pale Guard',
    'Steel Arc','Wide Arc','Rushstrike','Earthwake']){
    const c=styleForSpell(name);
    assert.equal(typeof c.c,'number');
    assert.equal(typeof c.core,'number');
    assert.equal(typeof c.dim,'number');
  }
  assert.notEqual(styleForSpell('Glint Dart').c,styleForSpell('Steel Arc').c);
});
test('orthographic screen scale comes from actual projected viewport',()=>{
  const f=(x,y,z)=>({x:x*14,y:z*11});
  const pair=projectedPair(f,2,4);
  assert.equal(pair.pixelsPerWorld,14);
});
test('temporary effects stay bounded and have no gameplay side effects',()=>{
  const fx=new WildpathPixiCombat(null,null,null);
  fx.ready=true;
  fx.graphics={clear(){}};
  fx.app={render(){}};
  for(let i=0;i<200;i++)fx.stage('Glint Dart','burst',{x:i,z:2});
  assert.ok(fx.effects.length<=90);
  fx.clear();
  assert.equal(fx.effects.length,0);
});
test('application targets separate enemies and renders Pixi after Babylon',()=>{
  const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(js,/chooseVolleyTargets\(game\.enemies,game,game\.spec\.range,count,target\)/);
  assert.match(js,/target:shotTarget/);
  assert.match(js,/scene\.render\(\);\s*pixi\.update/);
  assert.match(js,/if\(pixi\.ready&&!p\.hostile\)/);
});
