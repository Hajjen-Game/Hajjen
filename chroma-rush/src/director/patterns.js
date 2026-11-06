/* CHROMA RUSH — authored micro-patterns, not hardcoded levels.
 * All gaps are resolved against physical recovery by Adaptive Rush Director 2.0.
 * Each pattern is deliberately short so the Director can fade and relax gracefully.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaPatterns=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const PATTERNS=Object.freeze([
    {id:'single-jump',steps:['jump'],tier:0,minZone:1,weight:3.0},
    {id:'single-duck',steps:['duck'],tier:0,minZone:1,weight:3.0},
    {id:'twin-jump',steps:['jump','jump'],tier:1,minZone:1,weight:1.4},
    {id:'twin-duck',steps:['duck','duck'],tier:1,minZone:1,weight:1.1},
    {id:'up-down',steps:['jump','duck'],tier:1,minZone:2,weight:2.0},
    {id:'down-up',steps:['duck','jump'],tier:1,minZone:2,weight:2.0},
    {id:'up-down-up',steps:['jump','duck','jump'],tier:2,minZone:3,weight:1.2},
    {id:'down-up-down',steps:['duck','jump','duck'],tier:2,minZone:3,weight:1.2},
    {id:'double-up-down',steps:['jump','jump','duck'],tier:2,minZone:4,weight:1.0},
    {id:'double-down-up',steps:['duck','duck','jump'],tier:2,minZone:4,weight:1.0},
    {id:'switchback',steps:['jump','duck','jump','duck'],tier:3,minZone:6,weight:.8},
    {id:'reverse-switchback',steps:['duck','jump','duck','jump'],tier:3,minZone:6,weight:.8}
  ].map(p=>Object.freeze({...p,steps:Object.freeze(p.steps)})));
  function candidates(phase,zone,maxTier){
    const allowed=phase==='FADE'?0:phase==='BUILD'?Math.min(1,maxTier):maxTier;
    return PATTERNS.filter(p=>p.minZone<=zone&&p.tier<=allowed);
  }
  function chooseWeighted(list,random=Math.random,excludeId=null){
    if(!list.length)return null;
    const others=list.filter(p=>p.id!==excludeId);
    const pool=others.length?others:list;
    const total=pool.reduce((sum,p)=>sum+p.weight,0);
    let roll=random()*total;
    for(const p of pool){roll-=p.weight;if(roll<0)return p;}
    return pool[pool.length-1];
  }
  return {PATTERNS,candidates,chooseWeighted};
});
