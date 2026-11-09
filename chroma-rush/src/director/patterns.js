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
    // The first tall pillar is taught as one isolated action, not a combo.
    {id:'single-echo',steps:['echo'],tier:1,minZone:2,weight:1.5},
    // The two pure-geometry advanced shapes debut alone on a safe floor;
    // both can be cleared with ordinary jump/duck, Dash is optional.
    {id:'single-dash-jump',steps:['dash-jump'],tier:1,minZone:3,weight:.95},
    {id:'single-dash-duck',steps:['dash-duck'],tier:1,minZone:4,weight:.95},
    // Advanced phrases appear only after the player has had time to practice.
    {id:'echo-then-jump',steps:['echo','jump'],tier:2,minZone:6,weight:.8},
    {id:'jump-then-echo',steps:['jump','echo'],tier:3,minZone:8,weight:.7},
    {id:'up-down',steps:['jump','duck'],tier:1,minZone:2,weight:2.0},
    {id:'down-up',steps:['duck','jump'],tier:1,minZone:2,weight:2.0},
    {id:'up-down-up',steps:['jump','duck','jump'],tier:2,minZone:3,weight:1.2},
    {id:'down-up-down',steps:['duck','jump','duck'],tier:2,minZone:3,weight:1.2},
    {id:'double-up-down',steps:['jump','jump','duck'],tier:2,minZone:4,weight:1.0},
    {id:'double-down-up',steps:['duck','duck','jump'],tier:2,minZone:4,weight:1.0},
    {id:'switchback',steps:['jump','duck','jump','duck'],tier:3,minZone:6,weight:.8},
    {id:'reverse-switchback',steps:['duck','jump','duck','jump'],tier:3,minZone:6,weight:.8}
  ].map(p=>Object.freeze({...p,steps:Object.freeze(p.steps)})));
  function candidates(phase,zone,maxTier,{allowEcho=true}={}){
    const allowed=phase==='FADE'?0:phase==='BUILD'?Math.min(1,maxTier):maxTier;
    return PATTERNS.filter(p=>p.minZone<=zone&&p.tier<=allowed&&
      (allowEcho||!p.steps.includes('echo')));
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
