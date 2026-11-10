/* CHROMA RUSH — authored arcade phrases + Rush Chains 3.0.
 * Ordinary motifs stay brief; dedicated Rush phrases deliver extended
 * alternating inputs on physically safe, preplanned terrain corridors.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaPatterns=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  // Arcade Simplification 1.0: one Jump, one Duck, their combinations,
  // and the wider Duck Gate. Echo Rail and Twin Vault are retired from play.
  // Double-jump challenges now come from the terrain's Echo Gaps.
  const PATTERNS=Object.freeze([
    {id:'single-jump',steps:['jump'],tier:0,minZone:1,weight:3.0},
    {id:'single-duck',steps:['duck'],tier:0,minZone:1,weight:3.0},
    {id:'twin-jump',steps:['jump','jump'],tier:1,minZone:1,weight:1.4},
    {id:'twin-duck',steps:['duck','duck'],tier:1,minZone:1,weight:1.1},
    {id:'single-dash-duck',steps:['dash-duck'],tier:1,minZone:4,weight:.85},
    {id:'up-down',steps:['jump','duck'],tier:1,minZone:2,weight:2.0},
    {id:'down-up',steps:['duck','jump'],tier:1,minZone:2,weight:2.0},
    {id:'up-down-up',steps:['jump','duck','jump'],tier:2,minZone:3,weight:1.2},
    {id:'down-up-down',steps:['duck','jump','duck'],tier:2,minZone:3,weight:1.2},
    {id:'double-up-down',steps:['jump','jump','duck'],tier:2,minZone:4,weight:1.0},
    {id:'double-down-up',steps:['duck','duck','jump'],tier:2,minZone:4,weight:1.0},
    {id:'switchback',steps:['jump','duck','jump','duck'],tier:3,minZone:6,weight:.8},
    {id:'reverse-switchback',steps:['duck','jump','duck','jump'],tier:3,minZone:6,weight:.8},
    // Sustained 9–12-input sequences are CHALLENGE PHRASES, not a fourth
    // obstacle family. They use the exact same physical Jump and Duck gates.
    // The movement gate authorizes them only for mastered PEAK windows.
    {id:'rush-crossfire',rush:true,steps:['jump','duck','jump','duck','jump','duck','jump','duck','jump','duck','jump'],tier:3,minZone:8,weight:13},
    {id:'rush-switchback',rush:true,steps:['duck','jump','duck','jump','duck','jump','duck','jump','duck','jump','duck'],tier:3,minZone:8,weight:13},
    {id:'rush-syncopation',rush:true,steps:['jump','duck','duck','jump','duck','jump','jump','duck','jump','duck'],tier:3,minZone:10,weight:11}
  ].map(p=>Object.freeze({...p,steps:Object.freeze(p.steps)})));
  function candidates(phase,zone,maxTier,{allowEcho=true,buildTier=1}={}){
    const allowed=phase==='FADE'?0:phase==='BUILD'?Math.min(buildTier,maxTier):maxTier;
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
