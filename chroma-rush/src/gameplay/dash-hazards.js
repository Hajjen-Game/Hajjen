/* CHROMA RUSH — Dash Hazard Redesign 2.1: Zigzag Energy Geometry.
 * The bridge is genuinely dangerous to land on: its glowing zigzag is a
 * *visible physical* floor-energy strip, NOT an invisible action/seal gate.
 * Long early spans favor Echo Jump + Air Dash; an extended overhead gate
 * favors Duck + Ground Dash. At high speed, Dash becomes optional again.
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
  const AIR_BRIDGE_HEIGHT=36;
  // Echo's physical clearance over 62-unit endboxes is ~1.26s. Tune the
  // opening bridge for ~1.36s of world travel, so Echo *alone* cannot span
  // it; Echo + a well-timed Air Dash can. A strict world-width cap makes
  // the same geometry naturally easier when the world accelerates.
  const AIR_CHALLENGE_SECONDS=1.36,AIR_MAX_WIDTH=1200;
  const GROUND_CHALLENGE_SECONDS=.68,GROUND_MAX_WIDTH=530;
  const widthFor=(type,speed=370)=>{
    const v=Math.max(300,speed);
    if(type===AIR)return Math.min(AIR_MAX_WIDTH,
      Math.max(280,Math.round((v*AIR_CHALLENGE_SECONDS-36)/10)*10));
    if(type===GROUND)return Math.min(GROUND_MAX_WIDTH,
      Math.max(160,Math.round((v*GROUND_CHALLENGE_SECONDS-66)/10)*10));
    return 0;
  };
  const boxGapFor=speed=>widthFor(AIR,speed)-AIR_BOX_WIDTH*2;
  // Estimates describe the expected INPUT requirement; the actual game
  // applies normal, swept collision against the visible physical bodies.
  const needsDashFor=(type,speed=370)=>{
    const v=Math.max(300,speed);
    if(type===AIR)return (widthFor(AIR,v)+36)/v>1.259;
    if(type===GROUND)return (widthFor(GROUND,v)+66)/v>.55;
    return false;
  };
  const isDashHazard=t=>t===AIR||t===GROUND;
  // Edge-to-edge recovery, *after* the preceding obstacle's full width.
  // The previous spawn-to-spawn timer can start a Long Gate before the
  // player has even cleared a 1.36-second Twin Vault.
  // Preserve normal rhythms when neither obstacle is an advanced family.
  function recoveryAfter(prevType,nextType,{prevIntro=false,nextIntro=false}={}){
    if(!prevType)return 0;
    const previous=isDashHazard(prevType),next=isDashHazard(nextType);
    if(previous&&next)return prevIntro||nextIntro?3.2:2.6;
    if(previous)return prevIntro?2.1:1.7;
    if(next)return nextIntro?1.6:1.25;
    return 0;
  }
  // Runs in world coordinates so Chroma Camera zoom, different warning
  // horizons, hazard lengths and Director phase changes cannot compress it.
  // The extra ~0.15 speed-seconds guards against optional Dash thrust and
  // the one-frame margin on older mobile devices.
  function placementAfter(last,next,{speed=370,worldX=0,intro=false}={}){
    const requiredSeconds=recoveryAfter(last?.type,next,{
      prevIntro:Boolean(last?.intro),nextIntro:Boolean(intro)});
    const actualWorldGap=worldX-(Number.isFinite(last?.endWorld)?last.endWorld:worldX);
    const requiredWorldGap=requiredSeconds>0?
      Math.max(300,speed)*(requiredSeconds+.15):0;
    return {allowed:!last||requiredSeconds===0||actualWorldGap>=requiredWorldGap,
      actualWorldGap,requiredWorldGap,requiredSeconds};
  }
  const requiredMode=t=>t===AIR?'air':t===GROUND?'ground':null;
  const baseType=t=>t===AIR?'jump':t===GROUND?'duck':t;
  const unlockZone=t=>t===AIR?FIRST_AIR_ZONE:t===GROUND?FIRST_GROUND_ZONE:1;
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
    AIR_BOX_WIDTH,AIR_BRIDGE_HEIGHT,AIR_CHALLENGE_SECONDS,AIR_MAX_WIDTH,
    GROUND_CHALLENGE_SECONDS,GROUND_MAX_WIDTH,boxGapFor,needsDashFor,
    isDashHazard,recoveryAfter,placementAfter,requiredMode,
    baseType,unlockZone,widthFor,heightFor,mayAssist,safeToSpawn};
});