/* CHROMA RUSH — Obstacle Balance 3.0.
 * One place for the speed-aware physical dimensions of standard obstacles.
 * Never changes action inputs, terrain, hitboxes, camera or movement physics.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?
    require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.GAME,config.ECHO_SPIRE);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaObstacleBalance=api;
})(typeof window!=='undefined'?window:null,function(GAME,ECHO){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
  // A normal obstacle should remain recognizable at a 60% camera zoom.
  // Growth saturates; basic geometry never approaches long Dash obstacles.
  const FIRST_GROW_SPEED=550,FINAL_GROW_SPEED=2200;
  const growthFor=speed=>smooth((Math.max(300,speed)-FIRST_GROW_SPEED)/
    (FINAL_GROW_SPEED-FIRST_GROW_SPEED));
  // Jump and Duck have ONE fixed width at any current speed, not separate
  // per-spawn random rolls. Starting width is the former widest early gate.
  // Ten shared size steps make adjacent gates visibly uniform as speed rises.
  // Height variation, obstacle order and all unique action rules stay intact.
  const STANDARD_WIDTH=Object.freeze({min:71,max:71,growthMin:150,growthMax:150});
  const STANDARD_WIDTH_STEPS=10;
  const WIDTH_LIMITS=Object.freeze({
    jump:STANDARD_WIDTH,
    duck:STANDARD_WIDTH,
    echo:Object.freeze({growthMin:175,growthMax:175})
  });
  function widthRangeFor(type,{speed=GAME.baseSpeed,intro=false}={}){
    if(type==='echo'&&intro)return {min:ECHO.introMinWidth,max:ECHO.introMaxWidth};
    if(type==='echo'){
      const g=growthFor(speed),spec=WIDTH_LIMITS.echo;
      return {min:ECHO.minWidth+spec.growthMin*g,
        max:ECHO.maxWidth+spec.growthMax*g};
    }
    const spec=WIDTH_LIMITS[type];
    if(!spec)return null;
    // A common speed tier controls ALL standard Jump/Duck obstacles. Width
    // never depends on a random value, the order spawned, or the hazard type.
    const tier=Math.min(STANDARD_WIDTH_STEPS,
      Math.floor(growthFor(speed)*STANDARD_WIDTH_STEPS+1e-9));
    const g=tier/STANDARD_WIDTH_STEPS;
    const width=spec.min+spec.growthMin*g;
    return {min:width,max:width};
  }
  function widthFor(type,{speed=GAME.baseSpeed,intro=false,random=Math.random}={}){
    const range=widthRangeFor(type,{speed,intro});
    if(!range)return 0;
    // Preserve the historical RNG consumption for seeded Director streams,
    // but never use it to change the width of ordinary Jump/Duck barriers.
    const u=clamp(Number(random())||0,0,1);
    return range.min+(range.max-range.min)*u;
  }
  function heightRangeFor(type,{intro=false}={}){
    if(type==='echo')return intro?
      {min:ECHO.introMinHeight,max:ECHO.introMaxHeight}:
      {min:ECHO.minHeight,max:ECHO.maxHeight};
    if(type==='jump')return {min:59,max:73};
    if(type==='duck')return {min:115,max:158};
    return null;
  }
  function dimensionsFor(type,{speed=GAME.baseSpeed,intro=false,random=Math.random}={}){
    const width=widthFor(type,{speed,intro,random});
    const height=heightRangeFor(type,{intro});
    if(!height)return null;
    return {width,height:height.min+(height.max-height.min)*clamp(Number(random())||0,0,1)};
  }
  function traverseSeconds(type,{speed=GAME.baseSpeed,width=0}={}){
    const body=type==='duck'||type==='dash-duck'?66:36;
    return (width+body)/Math.max(300,speed);
  }
  return {FIRST_GROW_SPEED,FINAL_GROW_SPEED,STANDARD_WIDTH_STEPS,WIDTH_LIMITS,
    growthFor,widthRangeFor,widthFor,heightRangeFor,dimensionsFor,traverseSeconds};
});
