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
  function obstacleBox(obstacle,floorY){
    // 28 logical units clearance under a high beam; jump obstacles touch the floor.
    return obstacle.type==='jump'
      ?{x:obstacle.x,y:floorY-obstacle.height,w:obstacle.width,h:obstacle.height}
      :{x:obstacle.x,y:floorY-28-obstacle.height,w:obstacle.width,h:obstacle.height};
  }
  function sweptXOverlap(player,priorX,obstacle){
    return priorX<player.x+player.w && obstacle.x+obstacle.width>player.x;
  }
  function verticalOverlap(a,b){return a.y<b.y+b.h&&a.y+a.h>b.y;}
  return {playerBox,obstacleBox,sweptXOverlap,verticalOverlap};
});
