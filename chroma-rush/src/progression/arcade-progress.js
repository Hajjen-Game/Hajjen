/* CHROMA RUSH — Arcade Progression 1.0.
 * Owns durable ranked achievements. Practice sessions must never call the record methods.
 * No DOM, timers or gameplay dependencies. Migration reads the Flow 1.0 score key only.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaProgress=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='chromaRushArcadeV1';
  const PREVIOUS_SCORE_KEY='chromaRushBestFlow1';
  const MAX_ZONE=120;
  const MILESTONES=Object.freeze([
    Object.freeze({id:'ignite',name:'IGNITION',description:'Reach Zone 03',stat:'bestZone',target:3}),
    Object.freeze({id:'neon',name:'NEON PILOT',description:'Reach Zone 05',stat:'bestZone',target:5}),
    Object.freeze({id:'streak',name:'TEN STRONG',description:'Clear 10 obstacles without a hit',stat:'bestStreak',target:10}),
    Object.freeze({id:'perfect',name:'FLAWLESS',description:'Complete your first Perfect Zone',stat:'perfectZones',target:1}),
    Object.freeze({id:'chroma',name:'CHROMA RUNNER',description:'Reach Zone 08',stat:'bestZone',target:8}),
    Object.freeze({id:'redline',name:'REDLINE',description:'Reach Zone 12',stat:'bestZone',target:12})
  ]);
  const integer=(value,maximum=1e9)=>Number.isFinite(Number(value))
    ?Math.min(maximum,Math.max(0,Math.floor(Number(value)))):0;
  const defaults=()=>({bestScore:0,bestZone:1,bestStreak:0,perfectZones:0,completedRuns:0});

  class ArcadeProgression {
    constructor(storage=null){
      this.storage=storage;
      this.stats=defaults();
      try{
        const parsed=JSON.parse(storage?.getItem(KEY)||'null');
        if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){
          this.stats.bestScore=integer(parsed.bestScore);
          this.stats.bestZone=Math.max(1,integer(parsed.bestZone,MAX_ZONE));
          this.stats.bestStreak=integer(parsed.bestStreak);
          this.stats.perfectZones=integer(parsed.perfectZones);
          this.stats.completedRuns=integer(parsed.completedRuns);
        }
        // Old score remains valid under Flow 1.0 scoring; do not guess prior zone/streak.
        this.stats.bestScore=Math.max(this.stats.bestScore,integer(storage?.getItem(PREVIOUS_SCORE_KEY)));
      }catch(_){
        try{this.stats.bestScore=integer(storage?.getItem(PREVIOUS_SCORE_KEY))}catch(_){}
      }
    }
    get bestScore(){return this.stats.bestScore}
    get bestZone(){return this.stats.bestZone}
    get bestStreak(){return this.stats.bestStreak}
    get perfectZones(){return this.stats.perfectZones}
    get milestones(){return MILESTONES.map(m=>({...m,earned:this.stats[m.stat]>=m.target}))}
    get milestoneCount(){return this.milestones.filter(m=>m.earned).length}
    get nextMilestone(){return this.milestones.find(m=>!m.earned)||null}
    get unlockedZones(){return Array.from({length:Math.max(0,this.bestZone-1)},(_,i)=>i+2)}
    canPracticeZone(zone){return Number.isInteger(zone)&&zone>=2&&zone<=this.bestZone}
    snapshot(){return {...this.stats}}
    persist(){try{this.storage?.setItem(KEY,JSON.stringify(this.stats));return true}catch(_){return false}}
    change(mutator){
      const was=new Set(this.milestones.filter(m=>m.earned).map(m=>m.id));
      const before=JSON.stringify(this.stats);
      mutator();
      const changed=before!==JSON.stringify(this.stats);
      if(changed)this.persist();
      return {changed,earned:this.milestones.filter(m=>m.earned&&!was.has(m.id))};
    }
    reachedZone(zone){return this.change(()=>{
      const n=integer(zone,MAX_ZONE);
      if(n>this.stats.bestZone)this.stats.bestZone=n;
    })}
    reachedStreak(streak){return this.change(()=>{
      const n=integer(streak);
      if(n>this.stats.bestStreak)this.stats.bestStreak=n;
    })}
    perfectZone(){return this.change(()=>{
      this.stats.perfectZones=integer(this.stats.perfectZones+1);
    })}
    finishRankedRun({score=0,zone=1,bestStreak=0}={}){
      return this.change(()=>{
        this.stats.bestScore=Math.max(this.stats.bestScore,integer(score));
        this.stats.bestZone=Math.max(this.stats.bestZone,Math.max(1,integer(zone,MAX_ZONE)));
        this.stats.bestStreak=Math.max(this.stats.bestStreak,integer(bestStreak));
        this.stats.completedRuns=integer(this.stats.completedRuns+1);
      });
    }
  }
  return {ArcadeProgression,MILESTONES,KEY,PREVIOUS_SCORE_KEY};
});
