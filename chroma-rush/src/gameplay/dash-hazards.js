/* CHROMA RUSH — Dash Hazard Redesign 2.0: Pure Geometry.
 * Advanced jump/duck silhouettes with ONLY visible physical collisions.
 * Dash is an optional movement/Flow aid, never a key to pass a checkpoint.
 * No floating energy ribbon, dash seal, immunity or invisible bridge hitbox.
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
  const AIR_SPACING_SECONDS=.42;
  // Two entirely independent low boxes. The open gap is real empty world,
  // and *both* ordinary jump and Echo can clear them with correct timing.
  // Dash may gain distance, but is never required for a successful clear.
  const boxGapFor=speed=>Math.round(Math.max(300,speed)*AIR_SPACING_SECONDS/10)*10;
  const isDashHazard=t=>t===AIR||t===GROUND;
  const requiredMode=t=>t===AIR?'air':t===GROUND?'ground':null;
  const baseType=t=>t===AIR?'jump':t===GROUND?'duck':t;
  const unlockZone=t=>t===AIR?FIRST_AIR_ZONE:t===GROUND?FIRST_GROUND_ZONE:1;
  const widthFor=(type,speed=370)=>{
    const v=Math.max(300,speed);
    if(type===AIR)return AIR_BOX_WIDTH*2+boxGapFor(v);
    // Long overhead geometry. A clean ordinary duck must be sufficient at
    // ALL speeds, not merely if a special Dash extends the duck window.
    // Includes the 66px ducking-player body and leaves ~90ms of slack.
    if(type===GROUND)return Math.max(74,Math.min(300,110+v*.18,v*.46-66));
    return 0;
  };
  const heightFor=t=>t===AIR?62:t===GROUND?146:0;
  // Only analytics/feedback. A locally used Dash may be acknowledged as
  // helpful, but a player using no Dash still clears via the same geometry.
  function mayAssist(o,{action,playerWorld=0,speed=370,
    airborne=false,ducking=false}={}){
    if(!o||!isDashHazard(o.type)||o.hit||o.cleared||o.dashAssisted||
      action!==requiredMode(o.type))return false;
    if(action==='air'&&!airborne)return false;
    if(action==='ground'&&!ducking)return false;
    const v=Math.max(300,speed),ahead=o.worldX-playerWorld;
    // Allow a dash just BEFORE the first shape, within the structure, or
    // approaching the last shape. A distant dash is not an "assist".
    return ahead<=Math.max(220,v*.48)&&ahead>=-o.width-Math.max(80,v*.08);
  }
  function safeToSpawn(type,{zone=1,hp=100,stress=0,
    gravityBusy=false,confidence=0,first=false,guided=false,
    surface='floor'}={}){
    if(!isDashHazard(type)||zone<unlockZone(type)||hp<=50||
      stress>=.42||gravityBusy)return false;
    // No new mechanic is taught in ceiling orientation.
    if(first&&surface!=='floor')return false;
    return first||guided||confidence>=.42;
  }
  return {AIR,GROUND,TYPES,FIRST_AIR_ZONE,FIRST_GROUND_ZONE,
    AIR_BOX_WIDTH,AIR_SPACING_SECONDS,boxGapFor,isDashHazard,requiredMode,
    baseType,unlockZone,widthFor,heightFor,mayAssist,safeToSpawn};
});