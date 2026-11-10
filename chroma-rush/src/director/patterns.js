/* CHROMA RUSH — Endless Escalation 4.0 / procedural skill phrases.
 * Standard motifs remain short. Rush templates are sampled afresh on every
 * PEAK, and no hardcoded Jump/Duck alternation is played back as a level.
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
    // Weighted *templates*, not pre-authored 10-step sequences.
    {id:'rush-volley',rush:true,steps:['jump','duck'],tier:3,minZone:8,weight:13},
    {id:'rush-switch',rush:true,steps:['duck','jump'],tier:3,minZone:8,weight:13},
    {id:'rush-chaos',rush:true,steps:['jump','jump'],tier:3,minZone:9,weight:11}
  ].map(p=>Object.freeze({...p,steps:Object.freeze(p.steps)})));
  // Build unpredictable series of 1–6 identical actions. Both a six-Jump
  // volley and a six-Duck volley are possible, but never forced on a fixed
  // beat. Preserve the incoming physical action chain across motifs.
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  function composeRush(random=Math.random,{zone=8,attack=0,history=[],
    maxActions=18,style='rush-chaos'}={}){
    const capacity=Math.floor(maxActions);
    if(capacity<8)return [];
    const target=Math.min(capacity,clamp(
      9+Math.floor((Math.max(8,zone)-8)/7)+Math.floor(attack/10),9,27));
    const recent=history.slice(-6).map(item=>typeof item==='string'?item:item.type);
    let last=recent.at(-1)||null,streak=0;
    for(let i=recent.length-1;i>=0&&recent[i]===last;i--)streak++;
    let type=style==='rush-volley'?'jump':
      style==='rush-switch'?'duck':random()<.5?'jump':'duck';
    const steps=[];
    while(steps.length<target){
      // 12% 1, 19% 2, 22% 3, 19% 4, 14% 5, 14% 6.
      const r=random();
      const group=r<.12?1:r<.31?2:r<.53?3:r<.72?4:r<.86?5:6;
      if(type===last&&streak>=6)type=type==='jump'?'duck':'jump';
      const room=type===last?6-streak:6;
      const n=Math.min(group,room,target-steps.length);
      for(let i=0;i<n;i++)steps.push(type);
      streak=type===last?streak+n:n;
      last=type;
      // Usually switch, sometimes carry on the volley on the next draw.
      if(streak>=6||random()<.78)type=type==='jump'?'duck':'jump';
    }
    return steps;
  }
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
  return {PATTERNS,candidates,chooseWeighted,composeRush};
});
