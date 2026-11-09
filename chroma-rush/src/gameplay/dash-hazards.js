/* CHROMA RUSH — Twin Vault Intro Rebalance 2.3 + Zigzag Geometry 2.1.
 * The visible zigzag remains a real colliding floor-energy bed.
 * The early vault is now a forgiving Echo-sized crossing (Dash still fun);
 * at high speed the same energy bridge returns to its 1200-unit maximum.
 * Ground Dash Gate geometry and world-edge recovery rules are unchanged.
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
  // Zone 5–7 playtests: roughly 2/8 clears of the old 1.36-second
  // bridge. Make the EARLY full-body traversal about 1.02 seconds,
  // while restoring the existing 1200-unit length smoothly by speed 1200.
  // This retains the genuine collidable zigzag, optional Dash, the 2.2
  // recovery gap and a dramatic late-game silhouette.
  const AIR_INTRO_CROSSING_SECONDS=1.02;
  const AIR_EXPAND_START_SPEED=950,AIR_FULL_LENGTH_SPEED=1200;
  const AIR_MAX_WIDTH=1200;
  const GROUND_CHALLENGE_SECONDS=.68,GROUND_MAX_WIDTH=530;
  const smooth=t=>{
    const v=Math.max(0,Math.min(1,t));
    return v*v*(3-2*v);
  };
  const airWidthFor=v=>{
    const early=Math.max(330,Math.round(
      (v*AIR_INTRO_CROSSING_SECONDS-36)/10)*10);
    const expand=smooth((v-AIR_EXPAND_START_SPEED)/
      (AIR_FULL_LENGTH_SPEED-AIR_EXPAND_START_SPEED));
    return Math.min(AIR_MAX_WIDTH,Math.round(
      (early+(AIR_MAX_WIDTH-early)*expand)/10)*10);
  };
  const widthFor=(type,speed=370)=>{
    const v=Math.max(300,speed);
    if(type===AIR)return airWidthFor(v);
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
    AIR_BOX_WIDTH,AIR_BRIDGE_HEIGHT,AIR_MAX_WIDTH,
    AIR_INTRO_CROSSING_SECONDS,AIR_EXPAND_START_SPEED,AIR_FULL_LENGTH_SPEED,
    GROUND_CHALLENGE_SECONDS,GROUND_MAX_WIDTH,boxGapFor,needsDashFor,
    isDashHazard,recoveryAfter,placementAfter,requiredMode,
    baseType,unlockZone,widthFor,heightFor,mayAssist,safeToSpawn};
});