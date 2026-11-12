/* CHROMA RUSH — Neon Circuit Camera 2.5 — Readable High-Speed Close Follow.
 * Independent heading filter, gentle look-ahead, small positional dead zone
 * and damped speed-zoom. Fixed north: steering never rotates the screen.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaCircuitCamera=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NOMINAL_HEIGHT=540;
// ~50% tighter view at low and high speeds; preserves gradual zoom-out.
const MIN_ZOOM_FACTOR=1.29,MAX_ZOOM_FACTOR=1.55;
const fade=(rate,dt)=>1-Math.exp(-rate*Math.max(0,dt));
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
  // Shorter than 2.0, so moving a thumb does not whip the world sideways.
  const length=clamp(40+Math.max(0,player.speed)*.20,40,95);
  return {x:Math.cos(player.angle)*length,
    y:Math.sin(player.angle)*length,length};
}
function create(bounds,viewport,player){
  const z=desiredZoom(viewport.height,player.speed);
  const a=lookAhead(player);
  const p=confine(player.x+a.x,player.y+a.y,z,viewport,bounds);
  return {x:p.x,y:p.y,zoom:z,targetZoom:z,lookAhead:a.length,
    lookX:a.x,lookY:a.y,filteredSpeed:player.speed,
    viewport:{...viewport},bounds:{...bounds},updates:0,maxDrift:0,
    respawns:player.respawns||0};
}
function step(cam,player,viewport,dt,instant=false){
  cam.viewport.width=viewport.width;cam.viewport.height=viewport.height;
  if(instant){
    cam.filteredSpeed=player.speed;
  }else cam.filteredSpeed+=(player.speed-cam.filteredSpeed)*fade(2.5,dt);
  // A restrained boost punch keeps the cube and road visually close,
  // rather than cancelling the sensation of acceleration with zoom-out.
  const z=desiredZoom(viewport.height,cam.filteredSpeed)*
    (player.boostTime>0?1.035:1);
  cam.zoom+=(z-cam.zoom)*(instant?1:fade(1.9,dt));
  cam.targetZoom=z;
  const a=lookAhead(player);
  cam.lookAhead=a.length;
  const directionAlpha=instant?1:fade(1.65,dt);
  cam.lookX+=(a.x-cam.lookX)*directionAlpha;
  cam.lookY+=(a.y-cam.lookY)*directionAlpha;
  // Let the falling cube move into the void while the camera stays with
  // the last safe track position. Teleports on respawn snap to the racer.
  const falling=player.fallTimer>0;
  const focusX=falling?player.fallAnchorX:player.x;
  const focusY=falling?player.fallAnchorY:player.y;
  const target=confine(focusX+cam.lookX,focusY+cam.lookY,
    cam.zoom,viewport,cam.bounds);
  const dx=target.x-cam.x,dy=target.y-cam.y;
  const drift=Math.hypot(dx,dy);
  cam.maxDrift=Math.max(cam.maxDrift,drift);
  // A genuine respawn/teleport must snap; ordinary steering never should.
  const respawned=(player.respawns||0)!==cam.respawns;
  const snap=instant||respawned||drift>560;
  cam.respawns=player.respawns||0;
  if(snap){
    cam.lookX=a.x;cam.lookY=a.y;
    const locked=confine(focusX+a.x,focusY+a.y,
      cam.zoom,viewport,cam.bounds);
    cam.x=locked.x;cam.y=locked.y;
  }
  else if(drift>14){
    const move=(drift-14)/drift*fade(4.3,dt);
    cam.x+=dx*move;cam.y+=dy*move;
  }
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
