/* CHROMA RUSH — Dash Challenge Obstacles 1.1 (floor-first, recurring).
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
  const isDashHazard=t=>t===AIR||t===GROUND;
  const requiredMode=t=>t===AIR?'air':t===GROUND?'ground':null;
  const baseType=t=>t===AIR?'jump':t===GROUND?'duck':t;
  const unlockZone=t=>t===AIR?FIRST_AIR_ZONE:t===GROUND?FIRST_GROUND_ZONE:1;
  const widthFor=(type,speed=370)=>{
    const v=Math.max(300,speed);
    // Wide enough to need a distinct, intentional movement but not enough to
    // make the ordinary physical jump/duck clearance unreliable at high FPS.
    // Requirement is the visible momentum seal, not a hidden timing exploit.
    return type===AIR?Math.min(290,110+v*.19):
      type===GROUND?Math.min(320,125+v*.22):0;
  };
  const heightFor=t=>t===AIR?62:t===GROUND?146:0;
  const sealX=o=>o.x+o.width*.55;
  const sealWorldX=o=>o.worldX+o.width*.55;
  function mayCharge(o,{action,playerWorld=0,speed=370,airborne=false,ducking=false}={}){
    if(!isDashHazard(o.type)||o.hit||o.cleared||o.dashSatisfied||
      action!==requiredMode(o.type))return false;
    if(action==='air'&&!airborne)return false;
    if(action==='ground'&&!ducking)return false;
    // Begin a Dash just ahead of (or inside) the luminous seal. Requiring a
    // recent, local action removes a free clearance from an old distant dash.
    const ahead=sealWorldX(o)-playerWorld;
    const tolerance=Math.max(125,Math.min(280,speed*.30));
    return ahead>=-28&&ahead<=tolerance;
  }
  function reachedSeal(o,{priorX,playerFront}={}){
    const old=priorX+o.width*.55;
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
    isDashHazard,requiredMode,baseType,unlockZone,widthFor,heightFor,
    sealX,sealWorldX,mayCharge,reachedSeal,safeToSpawn};
});
