/* CHROMA RUSH — Circuit World Follow Camera 2.0
 * Fixed-north camera; soft follow, lookahead, and speed-related field of view.
 * All measurements are CSS pixels or world units. Never changes physics.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaCircuitCamera=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NOMINAL_HEIGHT=540;
const MIN_ZOOM_FACTOR=.78,MAX_ZOOM_FACTOR=1.035;
function desiredZoom(height,speed){
  const h=Math.max(1,height);
  const nominal=clamp(h/NOMINAL_HEIGHT,.52,1.7);
  const speedMix=clamp((speed-172)/100,0,1);
  return nominal*(MAX_ZOOM_FACTOR-
    (MAX_ZOOM_FACTOR-MIN_ZOOM_FACTOR)*speedMix);
}
function confine(x,y,z,viewport,bounds){
  const hw=viewport.width/(2*z),hh=viewport.height/(2*z);
  const minX=bounds.minX+hw,maxX=bounds.maxX-hw;
  const minY=bounds.minY+hh,maxY=bounds.maxY-hh;
  return {
    x:minX<=maxX?clamp(x,minX,maxX):(bounds.minX+bounds.maxX)/2,
    y:minY<=maxY?clamp(y,minY,maxY):(bounds.minY+bounds.maxY)/2
  };
}
function lookAhead(player){
  // World direction, not screen position, so speed/heading feel natural.
  const length=clamp(55+player.speed*.38,65,160);
  return {x:Math.cos(player.angle)*length,
    y:Math.sin(player.angle)*length,length};
}
function create(bounds,viewport,player){
  const z=desiredZoom(viewport.height,player.speed);
  const a=lookAhead(player);
  const p=confine(player.x+a.x,player.y+a.y,z,viewport,bounds);
  return {x:p.x,y:p.y,zoom:z,targetZoom:z,lookAhead:a.length,
    viewport:{...viewport},bounds:{...bounds},updates:0,
    maxDrift:0};
}
function step(cam,player,viewport,dt,instant=false){
  cam.viewport.width=viewport.width;cam.viewport.height=viewport.height;
  const z=desiredZoom(viewport.height,player.speed);
  const alpha=instant?1:1-Math.exp(-Math.max(0,dt)*3.9);
  cam.zoom+=(z-cam.zoom)*alpha;
  cam.targetZoom=z;
  const a=lookAhead(player);
  cam.lookAhead=a.length;
  const target=confine(player.x+a.x,player.y+a.y,
    cam.zoom,viewport,cam.bounds);
  const drift=Math.hypot(target.x-cam.x,target.y-cam.y);
  cam.maxDrift=Math.max(cam.maxDrift,drift);
  // Spawn and fall/respawn corrections must not move the road across
  // the viewport for several seconds while the player is off screen.
  const snap=instant||drift>560;
  const follow=snap?1:1-Math.exp(-Math.max(0,dt)*5.7);
  cam.x+=(target.x-cam.x)*follow;
  cam.y+=(target.y-cam.y)*follow;
  const safe=confine(cam.x,cam.y,cam.zoom,viewport,cam.bounds);
  cam.x=safe.x;cam.y=safe.y;cam.updates++;
  return cam;
}
function worldToScreen(cam,x,y){
  return {x:(x-cam.x)*cam.zoom+cam.viewport.width*.5,
    y:(y-cam.y)*cam.zoom+cam.viewport.height*.5};
}
function screenToWorld(cam,x,y){
  return {x:(x-cam.viewport.width*.5)/cam.zoom+cam.x,
    y:(y-cam.viewport.height*.5)/cam.zoom+cam.y};
}
function viewBounds(cam,pad=0){
  const hw=cam.viewport.width/(cam.zoom*2)+pad,
    hh=cam.viewport.height/(cam.zoom*2)+pad;
  return {minX:cam.x-hw,maxX:cam.x+hw,
    minY:cam.y-hh,maxY:cam.y+hh};
}
return {create,step,desiredZoom,lookAhead,confine,
  worldToScreen,screenToWorld,viewBounds};
});
