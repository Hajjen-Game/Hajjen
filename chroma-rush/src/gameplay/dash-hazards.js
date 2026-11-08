/* CHROMA RUSH — Dash Energy Bridge 1.0 (Echo-safe, speed-adaptive).
 * Two isolated action-gated variants of the existing jump/duck families.
 * The extra seal is visible and only unlocked by the matching Dash near
 * the actual obstacle. Dash never grants invulnerability or a teleport.
 * Pure geometry, independent of Director RNG, physics and frame rate.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaDashHazards=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const AIR='dash-jump',GROUND='dash-duck';
  const FIRST_AIR_ZONE=3,FIRST_GROUND_ZONE=4;
  const TYPES=Object.freeze([AIR,GROUND]);
  const AIR_BOX_WIDTH=50;
  // About 0.42s between the two compact hop boxes at ANY normal speed.
  // A high-speed Echo Jump can clear both blocks, so the mandatory central
  // visible Dash seal is a distinct condition; never rely on span alone.
  const bridgeGapFor=speed=>Math.round(Math.max(300,speed)*.42/10)*10;
  const isDashHazard=t=>t===AIR||t===GROUND;
  const requiredMode=t=>t===AIR?'air':t===GROUND?'ground':null;
  const baseType=t=>t===AIR?'jump':t===GROUND?'duck':t;
  const unlockZone=t=>t===AIR?FIRST_AIR_ZONE:t===GROUND?FIRST_GROUND_ZONE:1;
  const widthFor=(type,speed=370)=>{
    const v=Math.max(300,speed);
    // Dash Jump is now two real 50-unit boxes and a speed-scaled
    // energy bridge. Dash Duck retains its original overhead gate.
    return type===AIR?AIR_BOX_WIDTH*2+bridgeGapFor(v):
      type===GROUND?Math.min(320,125+v*.22):0;
  };
  const heightFor=t=>t===AIR?62:t===GROUND?146:0;
  const sealFraction=o=>o.type===AIR?.5:.55;
  const sealX=o=>o.x+o.width*sealFraction(o);
  const sealWorldX=o=>o.worldX+o.width*sealFraction(o);
  function mayCharge(o,{action,playerWorld=0,speed=370,airborne=false,ducking=false}={}){
    if(!isDashHazard(o.type)||o.hit||o.cleared||o.dashSatisfied||
      action!==requiredMode(o.type))return false;
    if(action==='air'&&!airborne)return false;
    if(action==='ground'&&!ducking)return false;
    // Begin a Dash just ahead of (or inside) the luminous seal. Requiring a
    // recent, local action removes a free clearance from an old distant dash.
    const ahead=sealWorldX(o)-playerWorld;
    // Give the air bridge a constant ~0.35s proximity window at speed.
    // The prior hard 280-unit cap shrank below 140ms in late zones.
    // Ground Dash retains its existing local double-duck timing.
    const tolerance=o.type===AIR?
      Math.max(160,Math.max(300,speed)*.35):
      Math.max(125,Math.min(280,speed*.30));
    return ahead>=-28&&ahead<=tolerance;
  }
  function reachedSeal(o,{priorX,playerFront}={}){
    const old=priorX+o.width*sealFraction(o);
    const now=sealX(o);
    return old>=playerFront&&now<=playerFront;
  }
  function safeToSpawn(type,{zone=1,hp=100,stress=0,
    gravityBusy=false,confidence=0,first=false,guided=false,
    surface='floor'}={}){
    if(!isDashHazard(type)||zone<unlockZone(type)||hp<=50||
       stress>=.42||gravityBusy)return false;
    // First appearance of ANY new mechanic must be upright. The unlock zone
    // can coincide with a ceiling run, so WAIT for a safe floor segment.
    if(first&&surface!=='floor')return false;
    // Director-guided repeat opportunities are bounded by time / stress /
    // phase already; they must not disappear due to a strict confidence gate.
    return first||guided||confidence>=.42;
  }
  return {AIR,GROUND,TYPES,FIRST_AIR_ZONE,FIRST_GROUND_ZONE,
    AIR_BOX_WIDTH,bridgeGapFor,isDashHazard,requiredMode,baseType,
    unlockZone,widthFor,heightFor,sealX,sealWorldX,
    mayCharge,reachedSeal,safeToSpawn};
});
