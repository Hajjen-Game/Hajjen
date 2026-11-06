/* CHROMA RUSH — shared, dependency-free game configuration. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaConfig=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const PALETTES=Object.freeze([
    {name:'CYAN', primary:'#3feeff', secondary:'#53b5ff', shadow:'#061a30'},
    {name:'VIOLET', primary:'#a06bff',secondary:'#e265ff',shadow:'#1b0d39'},
    {name:'MAGENTA',primary:'#ff4aa2',secondary:'#ff8ada',shadow:'#310d27'},
    {name:'LIME',primary:'#b6ff4e',secondary:'#3ef5d3',shadow:'#183016'},
    {name:'AMBER',primary:'#ffc25d',secondary:'#ff5d7e',shadow:'#32200f'},
    {name:'ELECTRIC',primary:'#6078ff',secondary:'#30fdce',shadow:'#111335'},
    {name:'REDLINE',primary:'#ff466c',secondary:'#ffb151',shadow:'#330d1a'},
    {name:'WHITEOUT',primary:'#f1fbff',secondary:'#72dfff',shadow:'#0d2133'}
  ].map(p=>Object.freeze(p)));
  const GAME=Object.freeze({
    floorRatio:.715,
    baseSpeed:370,
    acceleration:11.5,
    zoneSpeedBonus:12,
    zoneSeconds:12,
    jumpVelocity:-870,
    gravity:2140,
    duckDuration:.55,
    duckRecovery:.12,
    startingHP:100,
    damagePerHit:25,
    speedAt(time,zone){return this.baseSpeed+time*this.acceleration+Math.max(0,zone-1)*this.zoneSpeedBonus}
  });
  return {PALETTES,GAME};
});
