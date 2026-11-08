/* CHROMA RUSH — shared collision shapes and geometric helpers (logical world units). */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaGeometry=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function playerBox(player){
    const ducked=player.duck&&player.landed;
    const w=ducked?66:player.landed?44:36;
    const h=ducked?21:player.landed?44:52;
    return {x:player.x-w/2,y:player.feet-h,w,h};
  }
  const DUCK_CLEARANCE=28;
  // The old suspended duck beam had a finite height, so Echo Jump could
  // leap OVER it. A true high gate reaches past the edge of the playable sky.
  // Keeping this in world coordinates makes ceiling inversion identical.
  const DUCK_GATE_TOP=-160;
  function duckGateCoreBox(obstacle,floorY){
    return {x:obstacle.x,y:floorY-DUCK_CLEARANCE-obstacle.height,
      w:obstacle.width,h:obstacle.height};
  }
  function obstacleBox(obstacle,floorY){
    // Echo Spires, like ordinary jump barriers, are firmly attached to the
    // track. Unlike the suspended duck gates they cannot be crawled under.
    if(obstacle.type==='jump'||obstacle.type==='echo'||obstacle.type==='dash-jump')
      return {x:obstacle.x,y:floorY-obstacle.height,w:obstacle.width,h:obstacle.height};
    const lower=floorY-DUCK_CLEARANCE;
    // Same 28px duck passage; collision now covers ALL visible energy from
    // the overhead gate rather than leaving a bypass above its short core.
    return {x:obstacle.x,y:DUCK_GATE_TOP,w:obstacle.width,h:lower-DUCK_GATE_TOP};
  }
  function obstacleBoxes(obstacle,floorY){
    if(obstacle.type!=='dash-jump')return [obstacleBox(obstacle,floorY)];
    // An Energy Bridge is NOT a long invisible box. Only two separate
    // visible plinths are solid; the luminous vertical midpoint has its
    // own mandatory Dash condition in the gameplay loop.
    const w=Math.min(50,obstacle.width*.5),y=floorY-obstacle.height;
    return [{x:obstacle.x,y,w,h:obstacle.height},
      {x:obstacle.x+obstacle.width-w,y,w,h:obstacle.height}];
  }
  function sweptXOverlap(player,priorX,obstacle){
    return priorX<player.x+player.w && obstacle.x+obstacle.width>player.x;
  }
  function verticalOverlap(a,b){return a.y<b.y+b.h&&a.y+a.h>b.y;}
  return {playerBox,obstacleBox,obstacleBoxes,duckGateCoreBox,
    DUCK_GATE_TOP,DUCK_CLEARANCE,sweptXOverlap,verticalOverlap};
});
