import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyDaisugiHitPush} from '../src/daisugi-hit-feedback.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const enemy=(x=3,z=0)=>({x,z,alive:true,knockX:0,knockZ:0,recoil:0,hitTilt:0});
const hero={x:0,z:0};

test('water hit pushes victim directly BACK from player with recoil',()=>{
  const e=enemy();
  assert.equal(applyDaisugiHitPush(e,{x:2,z:0},hero,1.53),true);
  assert.ok(e.knockX>1.3);
  assert.ok(Math.abs(e.knockZ)<.001);
  assert.ok(e.recoil>.28);
  assert.ok(Math.abs(e.hitTilt)>.12);
  const second=enemy(0,-4);
  applyDaisugiHitPush(second,{x:0,z:-2},hero,1.3);
  assert.ok(second.knockZ<0);
  const sideSource=enemy(3,4);
  applyDaisugiHitPush(sideSource,{x:8,z:4},hero,1.53);
  // Last projectile position must not cause a sideways push.
  const vx=sideSource.knockX,vz=sideSource.knockZ;
  assert.ok(Math.abs(vx*4-vz*3)<1e-8);
  assert.ok(vx>0&&vz>0);
  assert.ok(sideSource.hitTilt<0);
});
test('many chain/splash hits cannot produce runaway knockback',()=>{
  const e=enemy();
  for(let i=0;i<90;i++)
    applyDaisugiHitPush(e,{x:2,z:i%2?.5:-.5},hero,5);
  assert.ok(Math.hypot(e.knockX,e.knockZ)<=2.651);
  assert.ok(Math.abs(e.hitTilt)<=.241);
  assert.ok(e.recoil<=.501);
});
test('projectile source does not change rearward direction, even on overlap',()=>{
  const e=enemy();
  applyDaisugiHitPush(e,{x:3,z:0},hero);
  assert.ok(e.knockX>0);
  const center=enemy(0,0);
  applyDaisugiHitPush(center,{x:0,z:0},hero);
  assert.ok(Number.isFinite(center.knockX));
  assert.ok(Number.isFinite(center.knockZ));
  assert.ok(Math.hypot(center.knockX,center.knockZ)>.3);
  const dead=enemy();dead.alive=false;
  assert.equal(applyDaisugiHitPush(dead,{x:2,z:0},hero),false);
});
test('Daisugi suppresses only generic water-hit burst and white damage pips',()=>{
  const main=read('../src/main.js');
  assert.ok(main.includes("if(DAISUGI_MODE&&name==='Glint Dart'&&"));
  assert.ok(main.includes("['burst','reaction','damage','aftermath'].includes(stage)"));
  assert.ok(main.includes("if(options.fxSpell&&!DAISUGI_MODE)"));
  assert.ok(main.includes("e.flash=DAISUGI_MODE?0:crit?.26:.17"));
  assert.ok(main.includes("if(DAISUGI_MODE&&options.hitFrom)"));
  assert.ok(main.includes("applyDaisugiHitPush(e,options.hitFrom,game,options.hitStrength)"));
  assert.ok(main.includes("if(!DAISUGI_MODE&&game.effects.length<110)"));
  assert.ok(main.includes("e.actor.root.rotation.x=e.hitTilt||0"));
  assert.ok(main.includes("e.actor.root.rotation.z=0;"));
  // Older classic/2.x hit render paths remain available with the opt-in off.
  assert.ok(main.includes("spellStage(options.fxSpell,'reaction',e"));
  assert.ok(main.includes("e.actor.body.material.emissiveColor.copyFrom(e.flash>0?hitFlashColor:e.normalEmissive)"));
});
test('wave, chain, primary projectiles and splash carry real hit origins',()=>{
  const main=read('../src/main.js');
  assert.ok(main.includes("hitFrom:game,hitStrength:enhanced?1.45:1.18"));
  assert.ok(main.includes("hitFrom:from,hitStrength:1.04"));
  assert.ok(main.includes("hitFrom:DAISUGI_MODE?from:null"));
  assert.ok(main.includes("hitFrom:DAISUGI_MODE?{x,z}:null,hitStrength:.59"));
  assert.ok(main.includes("spellStage(spell,'sound',p.target,1,'impact')"));
  assert.ok(main.includes("pixi.waterLink?.(from,next,'chain')"));
  assert.ok(main.includes("pixi.waterLink?.(struck,next,'bounce')"));
});
test('defeated enemies finish a brief knockback before disappearing in Daisugi',()=>{
  const main=read('../src/main.js');
  assert.ok(main.includes("if(DAISUGI_MODE)e.deathClock=.16;"));
  assert.ok(main.includes("e.actor.root.rotation.x=e.hitTilt;"));
  assert.ok(main.includes("if(DAISUGI_MODE&&(e.deathClock||0)>0)"));
  assert.ok(main.includes("e.knockX*3*dt,e.knockZ*3*dt"));
  assert.ok(main.includes("(!DAISUGI_MODE||!(game.enemies[i].deathClock>0))"));
});
