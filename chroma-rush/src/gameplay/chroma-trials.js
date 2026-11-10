/* CHROMA RUSH — Chroma Trials 1.0.
 * One hand-reviewed 90-second course, deterministic from a fixed seed.
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
  const KEY='chromaRushTrialsV1';
  const ACTIONS=Object.freeze([
    [5.4,'jump'],[8.4,'duck'],[11.2,'jump'],[14.0,'duck'],
    [16.8,'jump'],[19.6,'jump'],[22.4,'duck'],[25.2,'jump'],
    [28.0,'duck'],[30.8,'jump'],[35.5,'duck'],[38.3,'jump'],
    [41.1,'duck'],[43.9,'jump'],[46.7,'jump'],[49.5,'duck'],
    [54.1,'jump'],[56.9,'duck'],[59.7,'jump'],[62.5,'duck'],
    [65.3,'jump'],[68.1,'duck'],[70.9,'jump'],[73.7,'jump'],
    [78.2,'duck'],[81.0,'jump'],[83.8,'duck'],[86.5,'jump']
  ].map(x=>Object.freeze(x)));
  const GAP_TIMES=Object.freeze([33.3,51.8,76.0]);
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
      return Object.freeze({id:i+1,time,start:Math.round(offset+at(time)),
        width:Math.round(speed*(.29+i*.01))});
    });
    const finish=Math.ceil(offset+at(DURATION)+GAME.speedAt(DURATION,8)*3);
    const signature=obstacles.map(o=>[o.time,o.type,o.worldX,o.width,o.height].join(':'))
      .concat(gaps.map(g=>[g.time,g.start,g.width].join(':'))).join('|');
    return Object.freeze({id:ID,seed:integer(seed,0xffffffff),duration:DURATION,
      obstacles:Object.freeze(obstacles),gaps:Object.freeze(gaps),finish,signature});
  }
  function validatePlan(plan){
    if(!plan||plan.duration!==DURATION||plan.obstacles.length!==ACTIONS.length||
      plan.gaps.length!==GAP_TIMES.length)return false;
    const events=plan.obstacles;
    for(let i=0;i<events.length;i++){
      const e=events[i],previous=events[i-1];
      if(!['jump','duck'].includes(e.type)||e.width<71||e.width>221||
        e.height<=0||e.time<4||e.time>88||!Number.isFinite(e.worldX)||
        (previous&&(e.time-previous.time<2.5||
        e.worldX<=previous.worldX+previous.width)))return false;
    }
    for(let i=0;i<plan.gaps.length;i++){
      const gap=plan.gaps[i],prev=plan.gaps[i-1];
      const speed=GAME.speedAt(gap.time,1);
      if(!(gap.width/speed>=.28&&gap.width/speed<=.34)||
        (prev&&gap.start<=prev.start+prev.width+speed*2.2))return false;
      // No obstacle can threaten the takeoff, landing or early recovery.
      if(events.some(o=>Math.abs(o.time-gap.time)<1.6))return false;
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
  return {ID,SEED,DURATION,KEY,ACTIONS,GAP_TIMES,createPlan,validatePlan,
    installTerrain,TrialRecords};
});