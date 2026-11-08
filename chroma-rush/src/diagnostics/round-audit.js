/* CHROMA RUSH — Game Experience, High-Speed Readability & Fairness Audit 1.0.
 * Ephemeral per-run analytics, deliberately local-only and privacy-safe.
 * Does not change gameplay, storage, Director decisions, or RNG.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaRoundAudit=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const MAX_EVENTS=600;
  const PHASES=['BUILD','PEAK','FADE','RELAX'];
  // Movement events are intentionally local and minimal: no touch positions,
  // pointer identifiers, key codes or device identifiers are stored.
  const TYPES=new Set(['start','phase','zone','terrain','spawn','obstacle_clear','obstacle_hit',
    'invulnerable_contact','gap_clear','gap_miss','perfect_zone','flow_tier','combo','run_end',
    'jump_input','duck_input','echo_jump','air_dash','ground_dash','dash_blocked',
    'echo_unlocked','dash_unlocked','gravity_warning','gravity_shift_begin','gravity_shift_complete']);
  const number=(n)=>Number.isFinite(Number(n))?Math.round(Number(n)*100)/100:0;
  const snap=(input={})=>({
    time:number(input.time),zone:Math.max(1,number(input.zone)||1),
    hp:number(input.hp),score:number(input.score),flow:number(input.flow),
    speed:number(input.speed),distance:number(input.distance),
    phase:PHASES.includes(input.phase)?input.phase:'UNKNOWN'
  });
  const stats=()=>({obstaclesSpawned:0,obstaclesCleared:0,obstacleHits:0,invulnerableContacts:0,
    gapsCleared:0,gapsMissed:0,perfectZones:0,terrainSlopes:0,terrainGaps:0,
    maxFlow:0,chromaSeconds:0,flowAbove65Seconds:0,highestStreak:0,
    precisionClears:0,masterClears:0,
    movement:{jumpPresses:0,duckPresses:0,echoJumps:0,
      airDashes:0,groundDashes:0,dashBlocked:0},
    combos:{count:0,bestChain:0,bonusPoints:0,bonusFlow:0,byLength:{2:0,3:0,4:0}},
    peakStress:0,peakConfidence:0,phaseSeconds:{BUILD:0,PEAK:0,FADE:0,RELAX:0},
    reaction:{measured:0,earlyCues:0,underBudget:0,
      minLeadSeconds:null,minVisibleSeconds:null,byAction:{}}});
  class RoundAudit {
    constructor(){this.reset()}
    reset({mode='arcade',startingZone=1}={}){
      this.mode=mode==='practice'?'practice':'arcade';
      this.startingZone=Math.max(1,Math.floor(Number(startingZone)||1));
      this.events=[];this.overflow=0;this.elapsed=0;this.sampleAccumulator=0;
      this.samples=[];this.summary=stats();this.finished=false;
      this.finalState=null;
      this.frameFairness={samples:0,slowFrames:0,stalls:0,
        longestFrameMs:0,droppedSimulationSeconds:0};
    }
    record(type,context={},data={}){
      if(this.finished||!TYPES.has(type))return;
      const state=snap(context);
      const payload={};
      for(const [key,value] of Object.entries(data||{})){
        if(typeof value==='number'&&Number.isFinite(value))payload[key]=number(value);
        else if(typeof value==='string'&&value.length<100)payload[key]=value;
        else if(typeof value==='boolean')payload[key]=value;
      }
      if(this.events.length<MAX_EVENTS)this.events.push({type,...state,...payload});
      else this.overflow++;
      switch(type){
        case 'jump_input':this.summary.movement.jumpPresses++;break;
        case 'duck_input':this.summary.movement.duckPresses++;break;
        case 'echo_jump':this.summary.movement.echoJumps++;break;
        case 'air_dash':this.summary.movement.airDashes++;break;
        case 'ground_dash':this.summary.movement.groundDashes++;break;
        case 'dash_blocked':this.summary.movement.dashBlocked++;break;
        case 'spawn':{
          this.summary.obstaclesSpawned++;
          // Source: true obstacle spawn position in the actual game loop.
          // No player identifiers, touch coordinates or external logging.
          const reaction=this.summary.reaction;
          if(Number.isFinite(data.leadSeconds)&&Number.isFinite(data.requiredSeconds)){
            reaction.measured++;
            const lead=number(data.leadSeconds),visible=number(data.visibleSeconds);
            reaction.minLeadSeconds=reaction.minLeadSeconds===null?lead:
              Math.min(reaction.minLeadSeconds,lead);
            reaction.minVisibleSeconds=reaction.minVisibleSeconds===null?visible:
              Math.min(reaction.minVisibleSeconds,visible);
            // Count only cues which add necessary time; the normal 90px
            // offscreen margin alone must not inflate this number.
            const needsCue=data.needsCue===true||
              (data.needsCue!==false && data.earlyCueSeconds>.015&&
                data.visibleSeconds<data.requiredSeconds);
            if(needsCue)reaction.earlyCues++;
            if(data.fair===false)reaction.underBudget++;
            const key=['jump','duck','echo'].includes(data.obstacle)?data.obstacle:'other';
            const entry=reaction.byAction[key]||(reaction.byAction[key]={
              count:0,underBudget:0,minLeadSeconds:null,earlyCues:0});
            entry.count++;
            entry.minLeadSeconds=entry.minLeadSeconds===null?lead:
              Math.min(entry.minLeadSeconds,lead);
            if(data.fair===false)entry.underBudget++;
            if(needsCue)entry.earlyCues++;
          }
          break;
        }
        case 'obstacle_clear':
          this.summary.obstaclesCleared++;
          if(data.precision===true)this.summary.precisionClears++;
          if(data.master===true)this.summary.masterClears++;
          break;
        case 'combo':{
          const length=Math.floor(Number(data.length));
          if(length>=2&&length<=4){
            const stats=this.summary.combos;
            stats.count++;
            stats.bestChain=Math.max(stats.bestChain,length);
            stats.bonusPoints+=Math.max(0,number(data.bonusPoints));
            stats.bonusFlow+=Math.max(0,number(data.bonusFlow));
            stats.byLength[length]++;
          }
          break;
        }
        case 'obstacle_hit':this.summary.obstacleHits++;break;
        case 'invulnerable_contact':this.summary.invulnerableContacts++;break;
        case 'gap_clear':this.summary.gapsCleared++;break;
        case 'gap_miss':this.summary.gapsMissed++;break;
        case 'perfect_zone':this.summary.perfectZones++;break;
        case 'terrain':
          if(payload.feature==='slope')this.summary.terrainSlopes++;
          if(payload.feature==='gap')this.summary.terrainGaps++;
          break;
      }
    }
    tick(dt,context={},directorInsight={}){
      if(this.finished||!(dt>0))return;
      this.elapsed+=dt;
      const state=snap(context),s=this.summary;
      s.maxFlow=Math.max(s.maxFlow,state.flow);
      s.highestStreak=Math.max(s.highestStreak,number(context.streak));
      s.peakStress=Math.max(s.peakStress,number(directorInsight.stress));
      s.peakConfidence=Math.max(s.peakConfidence,number(directorInsight.confidence));
      // Hysteresis can keep CHROMA active briefly below 90%; measure the actual tier.
      const chromaActive=typeof context.chromaActive==='boolean'?context.chromaActive:state.flow>=90;
      if(chromaActive)s.chromaSeconds+=dt;
      if(state.flow>=65)s.flowAbove65Seconds+=dt;
      if(PHASES.includes(state.phase))s.phaseSeconds[state.phase]+=dt;
      this.sampleAccumulator+=dt;
      if(this.sampleAccumulator>=2-1e-7){
        this.sampleAccumulator=Math.max(0,this.sampleAccumulator-2);
        // 2s samples; a 3-minute session generates only about 90 items.
        if(this.samples.length<300)this.samples.push({...state,chromaActive,streak:number(context.streak),
          stress:number(directorInsight.stress),confidence:number(directorInsight.confidence)});
      }
    }
    noteFrame(elapsedMs=0,droppedSeconds=0){
      if(this.finished||!(elapsedMs>0))return;
      const f=this.frameFairness;
      f.samples++;
      f.longestFrameMs=Math.max(f.longestFrameMs,number(elapsedMs));
      if(elapsedMs>33.4)f.slowFrames++;
      if(elapsedMs>66.7)f.stalls++;
      if(droppedSeconds>0)f.droppedSimulationSeconds+=droppedSeconds;
    }
    finish(context={}){
      if(this.finished)return;
      this.record('run_end',context);
      this.finalState=snap(context);
      this.finished=true;
    }
    snapshot(context={}){
      const duration=Math.round(this.elapsed*100)/100;
      const sum={...this.summary,phaseSeconds:Object.fromEntries(
        Object.entries(this.summary.phaseSeconds).map(([phase,seconds])=>[phase,number(seconds)])),
        chromaSeconds:number(this.summary.chromaSeconds),
        flowAbove65Seconds:number(this.summary.flowAbove65Seconds),
        combos:{...this.summary.combos,byLength:{...this.summary.combos.byLength}},
        reaction:{...this.summary.reaction,byAction:Object.fromEntries(
          Object.entries(this.summary.reaction.byAction).map(([k,v])=>[k,{...v}]))}};
      return {format:'chroma-rush-round-audit',version:2,mode:this.mode,
        build:'dash-animation-2.5',
        startingZone:this.startingZone,durationSeconds:duration,summary:sum,
        finalState:this.finalState||snap(context),events:this.events.map(e=>({...e})),
        samples:this.samples.map(s=>({...s})),truncatedEvents:this.overflow,
        highSpeedPerformance:{...this.frameFairness,
          droppedSimulationSeconds:number(this.frameFairness.droppedSimulationSeconds)}};
    }
    toJSON(context={}){return JSON.stringify(this.snapshot(context),null,2)}
  }
  return {RoundAudit,MAX_EVENTS};
});
