/* CHROMA RUSH — Chroma Trials 1.1: Mastery Course.
 * A six-phase, hand-reviewed 90-second course, deterministic from a fixed seed.
 * Course world positions never consult adaptive skill/HP, input or graphics.
 * Arcade/Practice directors and saves are not touched by this module.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?
    require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config?.GAME);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaTrials=api;
})(typeof window!=='undefined'?window:null,function(GAME){
  'use strict';
  const ID='001',SEED=0xC80A2026,DURATION=90;
  // Course revision 2 deliberately starts a NEW Trial PB. It would be unfair
  // to rank scores from the much easier 28-obstacle layout alongside these.
  // Old Trial 1.0 records remain intact under chromaRushTrialsV1.
  const COURSE_REVISION=2,KEY='chromaRushTrialsV2';
  // Authored six phrases, not periodic Jump/Duck alternation. Long attacks
  // accelerate over the run; each gap provides a short, intentional breather.
  // J=Jump, D=Duck. Intervals are INPUT/ARRIVAL cadence in course time.
  const PHRASES=Object.freeze([
    Object.freeze({start:4.4,cadence:1.65,actions:'JDJJDJD'}),
    Object.freeze({start:16.0,cadence:1.35,actions:'JJJDJDD'}),
    Object.freeze({start:28.0,cadence:1.28,actions:'DJJJDDJJJJ'}),
    Object.freeze({start:43.4,cadence:1.25,actions:'JJDDJJJJDDJJJ'}),
    Object.freeze({start:62.55,cadence:1.20,actions:'DJJJDDJDJJJDD'}),
    Object.freeze({start:80.85,cadence:1.14,actions:'JJJDJDJ'})
  ]);
  const ACTIONS=Object.freeze(PHRASES.flatMap(phrase=>
    [...phrase.actions].map((action,index)=>Object.freeze([
      Number((phrase.start+index*phrase.cadence).toFixed(3)),
      action==='J'?'jump':'duck'
    ]))));
  // Four real gaps are timed AFTER phrase endings, not spliced into a
  // live Director. 1.8–2.1s recoveries around gaps avoid hidden cheap hits.
  const GAP_TIMES=Object.freeze([26.2,41.5,60.45,78.9]);
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const integer=(n,hi=1e9)=>Number.isFinite(Number(n))?
    clamp(Math.floor(Number(n)),0,hi):0;
  const randomFor=seed=>()=>{
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    return seed/4294967296;
  };
  // Pre-integrate the existing Arcade speed curve at a FIXED precision.
  // Sampling depends only on authored time, never on browser FPS or Dash.
  function distanceTable(){
    const step=.025,table=[0];let previous=GAME.speedAt(0,1);
    for(let i=1;i<=Math.ceil(DURATION/step)+1;i++){
      const current=GAME.speedAt(i*step,1);
      table[i]=table[i-1]+(previous+current)*step/2;
      previous=current;
    }
    return t=>{
      const n=clamp(t/step,0,table.length-2),i=Math.floor(n);
      return table[i]+(table[i+1]-table[i])*(n-i);
    };
  }
  function createPlan({playerX=340,seed=SEED}={}){
    const rng=randomFor(integer(seed,0xffffffff)),at=distanceTable();
    const offset=Number.isFinite(playerX)?playerX:340;
    const obstacles=ACTIONS.map(([time,type])=>{
      const speed=GAME.speedAt(time,Math.floor(time/GAME.zoneSeconds)+1);
      // The same shared 71+ speed-width tiers as regular Arcade.
      const t=clamp((speed-550)/1650,0,1);
      const smooth=t*t*(3-2*t),tier=Math.floor(smooth*10+1e-9);
      const width=71+15*tier;
      const height=type==='jump'?61+Math.floor(rng()*11):120+Math.floor(rng()*25);
      return Object.freeze({time,type,width,height,
        worldX:Math.round(offset+at(time)),phase:'TRIAL'});
    });
    const gaps=GAP_TIMES.map((time,i)=>{
      const speed=GAME.speedAt(time,Math.floor(time/GAME.zoneSeconds)+1);
      // 0.38–0.42 seconds of travel: longer than Trial 1.0 but still
      // comfortably within the unassisted single-jump flight envelope.
      const seconds=[.38,.40,.42,.39][i];
      return Object.freeze({id:i+1,time,start:Math.round(offset+at(time)),
        width:Math.round(speed*seconds)});
    });
    const finish=Math.ceil(offset+at(DURATION)+GAME.speedAt(DURATION,8)*3);
    const signature=obstacles.map(o=>[o.time,o.type,o.worldX,o.width,o.height].join(':'))
      .concat(gaps.map(g=>[g.time,g.start,g.width].join(':'))).join('|');
    return Object.freeze({id:ID,revision:COURSE_REVISION,
      seed:integer(seed,0xffffffff),duration:DURATION,
      obstacles:Object.freeze(obstacles),gaps:Object.freeze(gaps),finish,signature});
  }
  function validatePlan(plan){
    if(!plan||plan.duration!==DURATION||plan.revision!==COURSE_REVISION||
      plan.obstacles.length!==ACTIONS.length||plan.gaps.length!==GAP_TIMES.length)return false;
    const events=plan.obstacles;
    const flight=Math.abs(2*GAME.jumpVelocity/GAME.gravity);
    const duckCommit=GAME.duckDuration+GAME.duckRecovery;
    for(let i=0;i<events.length;i++){
      const e=events[i],previous=events[i-1];
      const speed=GAME.speedAt(e.time,Math.floor(e.time/GAME.zoneSeconds)+1);
      if(!['jump','duck'].includes(e.type)||e.width<71||e.width>221||
        e.height<=0||e.time<4||e.time>88||!Number.isFinite(e.worldX))return false;
      if(previous){
        // A full previous move, its physical pass width and a real manual
        // input recovery margin. No mandatory double-jump or dash.
        const priorSpeed=GAME.speedAt(previous.time,1);
        const commit=previous.type==='jump'?flight:duckCommit;
        const minSeconds=Math.max(1.03,commit+
          (previous.width+36)/Math.max(300,priorSpeed)+.15);
        if(e.time-previous.time+1e-6<minSeconds||
          e.worldX<=previous.worldX+previous.width)return false;
      }
    }
    for(let i=0;i<plan.gaps.length;i++){
      const gap=plan.gaps[i],prev=plan.gaps[i-1];
      const speed=GAME.speedAt(gap.time,1);
      const seconds=gap.width/speed;
      if(!Number.isFinite(gap.start)||!(seconds>=.37&&seconds<=.43)||
        (prev&&gap.start<=prev.start+prev.width+speed*2.2))return false;
      // In addition to event-time recovery, check physical takeoff/landing
      // corridors against the obstacles' actual world-space widths.
      for(const o of events){
        if(Math.abs(o.time-gap.time)<1.72)return false;
        const before=gap.start-(o.worldX+o.width);
        const after=o.worldX-(gap.start+gap.width);
        if(before>=0&&before<speed*1.10)return false;
        if(after>=0&&after<speed*1.10)return false;
        if(before<0&&after<0)return false;
      }
    }
    return true;
  }
  function installTerrain(terrain,plan,baseY=515){
    if(!validatePlan(plan))throw new Error('Invalid curated Chroma Trial course');
    const y=baseY,segments=[],gaps=[];let cursor=0;
    for(const g of plan.gaps){
      if(g.start<=cursor)throw new Error('Trial gaps overlap');
      segments.push({type:'flat',start:cursor,end:g.start,y0:y,y1:y});
      const gap={type:'gap',start:g.start,end:g.start+g.width,y0:y,y1:y,
        id:g.id,resolved:false,missed:false,trial:true};
      segments.push(gap);gaps.push(gap);cursor=gap.end;
    }
    segments.push({type:'flat',start:cursor,end:plan.finish,y0:y,y1:y});
    terrain.baseY=y;terrain.segments=segments;terrain.gaps=gaps;
    terrain.generated=plan.finish;terrain.lastGapEnd=gaps[gaps.length-1]?.end??-Infinity;
    terrain.nextId=gaps.length+1;
    return terrain;
  }
  class TrialRecords{
    constructor(storage=null){
      this.storage=storage;
      this.data={bestScore:0,completions:0,attempts:0,lastScore:0};
      try{
        const parsed=JSON.parse(storage?.getItem(KEY)||'null');
        if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))
          for(const name of Object.keys(this.data))this.data[name]=integer(parsed[name]);
      }catch(_){}
    }
    get bestScore(){return this.data.bestScore}
    get completions(){return this.data.completions}
    snapshot(){return {...this.data}}
    finish({score=0,completed=false}={}){
      const points=integer(score),done=Boolean(completed);
      const previousBest=this.data.bestScore;
      this.data.attempts++;this.data.lastScore=points;
      if(done){
        this.data.completions++;
        this.data.bestScore=Math.max(previousBest,points);
      }
      try{this.storage?.setItem(KEY,JSON.stringify(this.data))}catch(_){}
      return {completed:done,newBest:done&&points>previousBest,
        bestScore:this.data.bestScore,previousBest,score:points,
        attempts:this.data.attempts,completions:this.data.completions};
    }
  }
  return {ID,SEED,DURATION,COURSE_REVISION,KEY,PHRASES,ACTIONS,GAP_TIMES,createPlan,validatePlan,
    installTerrain,TrialRecords};
});