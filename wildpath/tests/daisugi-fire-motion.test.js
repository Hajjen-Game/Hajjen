import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {daisugiFirePose,DAISUGI_FIRE_WINDUP,DAISUGI_FIRE_RELEASE}
  from '../src/daisugi-fire-motion.js';
import {applyDaisugiHitPush} from '../src/daisugi-hit-feedback.js';
import {CLASS_DATA} from '../src/config.js';
import {WILD_RADIUS,WILD_CAMERA_WIDTH} from '../src/open-layout.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('before shot: hero rocks BACK into a short wind-up',()=>{
  assert.equal(DAISUGI_FIRE_WINDUP,.11);
  const early=daisugiFirePose(.11,.3,true);
  const mid=daisugiFirePose(.055,.3,true);
  const near=daisugiFirePose(.003,.3,true);
  assert.equal(early.phase,'windup');
  assert.ok(Math.abs(early.pitch)<.001);
  assert.ok(mid.pitch<-.07);
  assert.ok(near.pitch<mid.pitch&&near.arm<mid.arm);
  assert.ok(near.pitch>-.20);
});
test('at release: hero pitches FORWARD and then settles within .28 seconds',()=>{
  assert.equal(DAISUGI_FIRE_RELEASE,.28);
  const shot=daisugiFirePose(.78,0,true);
  const later=daisugiFirePose(.78,.09,true);
  const end=daisugiFirePose(.78,.28,true);
  assert.equal(shot.phase,'release');
  assert.ok(shot.pitch>.20&&shot.arm>.50&&shot.lift>.05);
  assert.ok(later.pitch>0&&later.pitch<shot.pitch);
  assert.equal(end.phase,'idle');
  assert.equal(end.pitch,0);
  assert.equal(end.arm,0);
  assert.equal(end.lift,0);
});
test('no targeting, no wind-up; all pose outputs stay finite',()=>{
  const idle=daisugiFirePose(.025,.3,false);
  assert.equal(idle.phase,'idle');
  assert.equal(idle.pitch,0);
  for(let i=0;i<90;i++){
    const p=daisugiFirePose(.11-i*.005,i*.005,true);
    for(const name of ['pitch','arm','lift','squash'])
      assert.ok(Number.isFinite(p[name]));
    assert.ok(Math.abs(p.pitch)<=.241);
    assert.ok(Math.abs(p.arm)<=.561);
  }
});
test('an automatic shot triggers pose, not an extra cast or changed cadence',()=>{
  const m=read('../src/main.js');
  assert.ok(m.includes("import {daisugiFirePose} from './daisugi-fire-motion.js?v=1.0.0'"));
  assert.ok(m.includes('if(DAISUGI_MODE){daisugiBasicAttack(target);return true;}'));
  assert.ok(m.includes('if(DAISUGI_MODE&&fired)game.fireAge=0;'));
  assert.ok(m.includes('const pose=daisugiFirePose(game.attackClock,game.fireAge,inRange)'));
  assert.ok(m.includes('game.actor.root.rotation.x=pose.pitch'));
  assert.ok(m.includes('game.actor.leftArm.rotation.x+=pose.arm'));
  assert.ok(m.includes('game.actor.rightArm.rotation.x+=pose.arm'));
  assert.ok(m.includes('game.actor.body.scaling.y=game.fireBaseScaleY*(1-pose.squash)'));
  assert.ok(m.includes('daisugiAttackInterval(game.spec.attackSpeed,game.upgrades)'));
  assert.ok(m.includes("const dz=OPEN_WORLD?z*game.spec.speed*dt:"));
});
test('knockback remains approved strength but direction always follows player-to-enemy',()=>{
  const hero={x:0,z:0};
  const enemy={x:0,z:4,alive:true,knockX:0,knockZ:0,recoil:0,hitTilt:0};
  applyDaisugiHitPush(enemy,{x:7,z:4},hero,1.53);
  assert.ok(Math.abs(enemy.knockX)<1e-9);
  assert.ok(enemy.knockZ>1.5);
  assert.ok(enemy.hitTilt<0);
  const src=read('../src/daisugi-hit-feedback.js');
  assert.ok(src.includes('let dx=enemy.x-player.x,dz=enemy.z-player.z'));
  assert.ok(src.includes('if(magnitude>2.65)'));
});
test('normal Wildpath, map, camera and speed are not reworked',()=>{
  const m=read('../src/main.js');
  assert.ok(m.includes("if(DAISUGI_MODE){\n    // Animation overlays"));
  assert.ok(m.includes('if(DAISUGI_MODE)e.hitTilt=(e.hitTilt||0)*Math.exp(-8.5*dt)'));
  assert.ok(m.includes('e.actor.root.rotation.x=e.hitTilt||0'));
  assert.ok(m.includes('e.actor.root.rotation.z=0'));
  assert.equal(CLASS_DATA.caster.speed,5.25);
  assert.equal(WILD_RADIUS,43);
  assert.equal(WILD_CAMERA_WIDTH,29.5);
  assert.ok(m.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5'));
});
