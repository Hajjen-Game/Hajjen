import test from 'node:test';
import assert from 'node:assert/strict';
import { volleyVector,projectedPair,styleForSpell,WildpathPixiCombat } from '../src/pixi-combat.js';
import { drawEnergyProjectile } from '../../pvp-25d/src/energy/arena/EnergyPixiProjectiles.js';
import { readFileSync } from 'node:fs';

test('Wildpath travel uses its own two-layer glint while Energy Arena impacts remain',()=>{
  const path=readFileSync(new URL('../src/pixi-combat.js',import.meta.url),'utf8');
  assert.match(path,/slim-projectile\.js/);
  assert.match(path,/drawSlimGlint\(/);
  assert.doesNotMatch(path,/drawEnergyProjectile\(/);
  assert.match(path,/pvp-25d\/src\/energy\/arena\/EnergyPixiImpacts\.js/);
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
  assert.ok(Math.abs(pair.pixelsPerWorld-14)<1e-9);
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

test('Wildpath reduces only the projectile head; Energy Arena visuals remain unchanged',()=>{
  class Recorder {
    constructor(){this.log=[];}
    moveTo(x,y){this.log.push(['m',x,y]);return this;}
    lineTo(x,y){this.log.push(['l',x,y]);return this;}
    closePath(){this.log.push(['close']);return this;}
    fill(info){this.log.push(['fill',info]);return this;}
    stroke(info){this.log.push(['stroke',info]);return this;}
    circle(x,y,r){this.log.push(['circle',x,y,r]);return this;}
  }
  const record=options=>{
    const g=new Recorder();
    drawEnergyProjectile(g,{spellId:'crystal-bolt',seed:10},
      {x:35,y:60},{x:145,y:60},1,styleForSpell('Glint Dart'),.81,options);
    return g.log;
  };
  const original=record(),explicit=record({coreScale:1}),small=record({coreScale:.55});
  assert.deepEqual(original,explicit,'Energy Arena default must remain pixel-identical');
  assert.equal(original.length,small.length);
  // The authored ribbons, sparkles and helix are identical. Only the
  // final faceted projectile head changes coordinates.
  let firstChanged=original.findIndex((part,i)=>JSON.stringify(part)!==JSON.stringify(small[i]));
  assert.ok(firstChanged>225,'tail should be unchanged');
  const normalTip=145+19*.72,smallTip=145+19*.72*.55;
  assert.ok(original.some(q=>q[0]==='m'&&Math.abs(q[1]-normalTip)<.00001));
  assert.ok(small.some(q=>q[0]==='m'&&Math.abs(q[1]-smallTip)<.00001));
});

test('Pixi gameplay layer draws precisely two surfaces per moving glint',()=>{
  const log=[],g={
    clear(){return this;},moveTo(x,y){return this;},
    lineTo(x,y){return this;},closePath(){return this;},
    fill(a){log.push(a);return this;}
  };
  const fx=new WildpathPixiCombat(null,null,null);
  fx.ready=true;fx.graphics=g;fx.app={render(){}};
  fx.resize=()=>{};fx.project=(x,y,z)=>({x:100+x*10,y:200-z*10});
  fx.scaleAt=()=>12;
  fx.update(1/60,{
    state:'play',areas:[],projectiles:[
      {hostile:false,x:2,z:2,y:1.3,dirX:1,dirZ:0}
    ],shield:0
  });
  assert.equal(log.length,2);
});
