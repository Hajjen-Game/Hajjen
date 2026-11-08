/* CHROMA RUSH — Adaptive Rush Director 2.1 + Dash Recurrence & Ground-first Intro 1.1.
 * Short authored motifs, player-friction awareness and four-phase pacing.
 * Uses seconds rather than raw pixels so existing actions remain physically feasible.
 * No ML, random difficulty spikes, online dependencies, or input manipulation.
 */
(function(root,factory){
  const patterns=typeof module!=='undefined'&&module.exports?require('./patterns.js'):(root&&root.ChromaPatterns);
  const movement=typeof module!=='undefined'&&module.exports?require('./movement-awareness.js'):(root&&root.ChromaMovementAwareness);
  const api=factory(patterns,movement);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaDirector=api;
})(typeof window!=='undefined'?window:null,function(patterns,movement){
  'use strict';
  if(!patterns||!movement)throw new Error('ChromaPatterns and MovementAwareness must load before AdaptiveRushDirector');
  const PHASE=Object.freeze({BUILD:'BUILD',PEAK:'PEAK',FADE:'FADE',RELAX:'RELAX'});
  const ORDER=Object.values(PHASE);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const minimumGap=movement.minimumGap;
  // Opportunity spacing, not a forced hazard frequency. If a course is
  // unsafe or the player struggles, postpone the next challenge.
  const DASH_REPEAT_SECONDS=24;
  const DASH_INTRO_ZONE_ELAPSED=1.8;
  const DASH_PRESSURE_LIMIT=1.55;

  class AdaptiveRushDirector{
    constructor(random=Math.random){
      this.random=random;this.movement=new movement.MovementAwareness();this.reset();
    }
    reset(){
      this.phase=PHASE.BUILD;this.phaseElapsed=0;this.phaseDuration=7.4;
      this.spawnCountdown=2.2;this.previousType=null;this.previousPattern=null;
      this.pending=[];this.time=0;this.lastSpawnTime=-999;this.lastSpawnLead=0;
      this.totalSpawned=0;this.totalCleared=0;
      this.cycle=0;this.streak=0;this.confidence=.32;this.stress=0;
      this.lastDamageAt=-999;this.lastNearMissAt=-999;
      this.lastPatternId=null;this.patternHistory=[];this.echoIntroduced=false;
      this.dashIntroduced={air:false,ground:false};
      this.lastDashHazardAt=-Infinity;
      this.lastDashHazardType=null;
      this.dashHazardRepeats=0;
      this.dashRetryAfter=0;
      this.dashPlacementFailures=0;
      this.comboInsight={total:0,best:0,lastAt:-Infinity};
      this.movement.reset();
    }
    registerDamage({action=null}={}){
      this.lastDamageAt=this.time;
      this.movement.onDamage(this.time,action);
      this.stress=clamp(this.stress+.45,0,1);
      this.confidence=clamp(this.confidence-.17,0,1);
      this.streak=0;
      // Existing in-flight obstacles remain. Only future motif steps are cancelled.
      this.pending=[];
      this.spawnCountdown=Math.max(this.spawnCountdown,.65);
    }
    registerNearMiss(){
      this.lastNearMissAt=this.time;
      this.stress=clamp(this.stress+.085,0,1);
    }
    registerClear({action=null}={}){
      this.totalCleared++;this.streak++;
      if(action==='echo'||action==='dash-jump'||action==='dash-duck')
        this.movement.onClear(action,this.time);
      this.confidence=clamp(this.confidence+.024,0,1);
    }
    durationFor(phase,context){
      const zone=Math.max(1,context.zone||1);
      switch(phase){
        case PHASE.BUILD:return clamp(6.4+this.random()*1.6-zone*.04+this.stress*.8,5.4,8.7);
        case PHASE.PEAK:return clamp(4.5+this.random()*1.4-zone*.035-this.stress*1.5,2.8,6.0);
        case PHASE.FADE:return 2.1+this.stress*.45;
        default:return 2.1+this.stress*1.15+(context.hp<=25?.85:context.hp<=50?.3:0);
      }
    }
    advance(context){
      const i=ORDER.indexOf(this.phase);
      this.phase=ORDER[(i+1)%ORDER.length];this.phaseElapsed=0;
      this.phaseDuration=this.durationFor(this.phase,context);
      if(this.phase===PHASE.FADE||this.phase===PHASE.RELAX)this.pending=[];
      if(this.phase===PHASE.RELAX){
        this.spawnCountdown=Math.max(this.spawnCountdown,this.phaseDuration+.65);
      }else if(this.phase===PHASE.BUILD){
        this.cycle++;this.spawnCountdown=Math.max(this.spawnCountdown,.48);
      }
    }
    tierFor(context){
      const zone=Math.max(1,context.zone||1);
      let tier=zone>=6?3:zone>=3?2:1;
      if(this.stress>=.60||context.hp<=25)tier=Math.min(tier,1);
      else if(this.stress>=.36)tier=Math.min(tier,2);
      // Clean, confident play opens harder patterns; near misses/damage keep it accessible.
      if(zone>=3&&this.confidence<.39)tier=Math.min(tier,1);
      return tier;
    }
    selectPattern(context){
      const readiness={...context,phase:this.phase,stress:this.stress,confidence:this.confidence};
      const firstEcho=!this.echoIntroduced;
      // A tall Echo Spire needs time for two presses AND the second apex.
      // At extreme speed its entire visible approach can become too short.
      // Prefer simpler actions rather than a hidden, physically unfair cue.
      const echoX=typeof context.spawnXFor==='function'?context.spawnXFor('echo'):context.spawnX;
      const approach=echoX==null?Infinity:
        (echoX-(context.playerX??300))/Math.max(300,context.speed||370);
      const echoReady=approach>=.78 &&
        this.movement.echoReady(readiness,this.time,firstEcho);
      const options=patterns.candidates(this.phase,context.zone||1,
        this.tierFor(context),{allowEcho:echoReady});
      // Build short, playable phrases from actual movement requirements.
      // Repeated Echo checks after a miss are replaced by a calm phrase;
      // heavy combos are only offered after a successful solo Echo clear.
      const intro=firstEcho&&echoReady&&
        (this.phase===PHASE.PEAK||context.zone===2);
      const safe=options.filter(p=>{
        const type=p.steps[0];
        if(type==='dash-jump'||type==='dash-duck'){
          const floor=type==='dash-jump'?3:4;
          const used=type==='dash-jump'?this.dashIntroduced.air:this.dashIntroduced.ground;
          // First encounter is NEVER a random ceiling spawn. The guided
          // lesson decides when a safe FLOOR section is ready.
          if(!used)return false;
          if(!this.dashIntroduced.air||!this.dashIntroduced.ground||
            context.zone<floor||context.gravityPending||context.hp<=50||
            this.stress>=.42||this.confidence<.42||
            type===this.lastDashHazardType||
            this.time-this.lastDashHazardAt<DASH_REPEAT_SECONDS)return false;
        }
        return this.movement.allowPattern(p,readiness,this.time,
          {firstEcho:intro&&p.id==='single-echo'});
      });
      this.movement.deferredPatterns+=options.length-safe.length;
      const weighted=safe.map(p=>({...p,weight:this.movement.adjustedWeight(p,readiness)}));
      const chosen=(intro?weighted.find(p=>p.id==='single-echo'):null)||
        patterns.chooseWeighted(weighted,this.random,this.previousPattern);
      if(!chosen)return null;
      this.previousPattern=chosen.id;this.lastPatternId=chosen.id;
      this.patternHistory.push(chosen.id);
      if(this.patternHistory.length>25)this.patternHistory.shift();
      return chosen;
    }
    gapFor(context){
      const zone=Math.max(1,context.zone||1);
      const base=this.phase===PHASE.PEAK?1.13:this.phase===PHASE.FADE?1.56:1.48;
      const zoneReduction=clamp((zone-1)*.046,0,.27);
      const hpBonus=context.hp<=25?.23:context.hp<=50?.10:0;
      const breath=Math.min(.35,this.movement.pressure*.075);
      return clamp(base-zoneReduction+this.stress*.28+hpBonus+breath+
        (this.random()-.5)*.17,.84,2.4);
    }
    tick(dt,context,spawn){
      if(!(dt>0))return;
      this.time+=dt;this.phaseElapsed+=dt;
      this.movement.tick(dt);
      this.stress=Math.max(0,this.stress-dt*.024);
      // A single phase transition is sufficient with the gameplay fixed-step frame cap.
      if(this.phaseElapsed>=this.phaseDuration)this.advance(context);
      this.spawnCountdown-=dt;
      // Zone 2 is where the second jump UNLOCKS. Do not leave the first
      // real double-jump obstacle to random PEAK timing (often zone 3).
      // Reserve one isolated floor Spire ~1.5s after the zone transition;
      // its ~2s approach means it arrives while the on-screen hint is fresh.
      const guidedEcho=!this.echoIntroduced&&context.zone===2&&
        context.zoneElapsed>=1.5&&context.zoneElapsed<=8.4&&
        this.movement.echoReady({...context,phase:this.phase,
          stress:this.stress,confidence:this.confidence},this.time,true);
      if(guidedEcho){
        if(this.pending[0]?.type!=='echo'){
          this.pending=[{type:'echo',pattern:'single-echo',step:1}];
          this.spawnCountdown=Math.min(this.spawnCountdown,.10);
        }
      }
      // The ceiling cycle starts in zone 3. A new mechanic MUST first
      // appear on the FLOOR, even if its unlock zone happened in the sky.
      // Delay rather than introduce in a confusing mirrored orientation.
      const firstDashType=!this.dashIntroduced.air&&context.zone>=3?'dash-jump':
        !this.dashIntroduced.ground&&this.dashIntroduced.air&&
          context.zone>=4?'dash-duck':null;
      const floorLesson=(context.surface||'floor')==='floor';
      const calm=context.hp>50&&this.stress<.42&&!context.gravityPending&&
        this.time>=this.movement.recoveryUntil&&
        this.movement.pressure<DASH_PRESSURE_LIMIT;
      const teachWindow=(context.zoneElapsed??3)>=DASH_INTRO_ZONE_ELAPSED;
      const activePhase=this.phase===PHASE.BUILD||this.phase===PHASE.PEAK;
      const firstDash=Boolean(firstDashType&&!guidedEcho&&floorLesson&&
        calm&&teachWindow&&activePhase);
      // Once both families have been taught, surface type does not restrict
      // their return. Alternate actions every ~24s on *safe* BUILD/PEAK
      // sections rather than hoping a tiny random pattern weight hits.
      const repeatType=this.lastDashHazardType==='dash-jump'?'dash-duck':'dash-jump';
      const repeating=Boolean(this.dashIntroduced.air&&this.dashIntroduced.ground&&
        Number.isFinite(this.lastDashHazardAt)&&!guidedEcho&&calm&&
        activePhase&&this.time-this.lastDashHazardAt>=DASH_REPEAT_SECONDS);
      const guidedDash=(firstDash||repeating)&&this.time>=this.dashRetryAfter;
      const guidedType=firstDash?firstDashType:repeating?repeatType:null;
      // NEVER replace a pending Echo Spire or a pending ordinary pattern:
      // finish its physical commitment before offering a new Dash lesson.
      if(guidedDash&&!this.pending.length){
        this.pending=[{type:guidedType,pattern:'single-'+guidedType,step:1,guided:true}];
        this.spawnCountdown=Math.min(this.spawnCountdown,.12);
      }
      if(this.phase===PHASE.RELAX&&!guidedEcho&&!guidedDash){
        this.spawnCountdown=Math.max(this.spawnCountdown,.16);
        return;
      }
      if(this.spawnCountdown>0)return;
      if(!this.pending.length){
        const motif=this.selectPattern(context);
        if(!motif){this.spawnCountdown=.6;return;}
        this.pending=motif.steps.map((type,index)=>({type,pattern:motif.id,step:index+1}));
      }
      const next=this.pending[0];
      if(next.type==='dash-jump'||next.type==='dash-duck'){
        const used=next.type==='dash-jump'?this.dashIntroduced.air:this.dashIntroduced.ground;
        if(context.hp<=50||this.stress>=.42||context.gravityPending||
           (!used&&((context.surface||'floor')!=='floor'||
             this.time<this.movement.recoveryUntil))){
          // A first lesson is never left queued into a ceiling transition.
          // It will be reconsidered in a later safe floor section.
          this.pending=[];this.spawnCountdown=.35;
          this.movement.deferredPatterns++;return;
        }
      }
      // If an unlucky stretch of collisions/terrain has blocked the lesson,
      // do NOT introduce it seconds before the next ceiling transition.
      // It can safely retry in a later floor section.
      if(next.type==='echo'&&!this.echoIntroduced&&context.zone===2&&
        context.zoneElapsed>8.4){
        this.pending=[];this.spawnCountdown=.3;this.movement.deferredPatterns++;
        return;
      }
      // Never drag the very first Echo Spire into the ceiling section.
      // Cancel the queued lesson and allow normal motifs to continue while
      // we wait for the safe floor return, rather than blocking the queue.
      if(next.type==='echo'&&!this.echoIntroduced&&
        (context.surface==='ceiling'||context.gravityPending)){
        this.pending=[];this.spawnCountdown=.32;this.movement.deferredPatterns++;
        return;
      }
      const actionX=typeof context.spawnXFor==='function'?context.spawnXFor(next.type):context.spawnX;
      if(next.type==='echo'&&actionX!=null&&
        (actionX-(context.playerX??300))/Math.max(300,context.speed||370)<.78){
        // A pending Echo step becomes inappropriate as speed increases.
        // Do not retry it forever or starve the other hazard families.
        this.pending=[];this.spawnCountdown=.18;this.movement.deferredPatterns++;
        return;
      }
      if(next.type==='echo'&& !this.movement.echoReady({
        ...context,phase:this.phase,stress:this.stress,confidence:this.confidence},
        this.time,!this.echoIntroduced)){
        this.spawnCountdown=.18;
        return;
      }
      const previousSafety=this.previousType?minimumGap(this.previousType,next.type,context.speed):0;
      const elapsed=this.time-this.lastSpawnTime;
      if(elapsed<previousSafety){
        this.spawnCountdown=Math.max(.01,previousSafety-elapsed);
        return;
      }
      // A farther-offscreen warning changes the *arrival* order: spawn-time
      // spacing alone is insufficient. E.g. Echo → Duck would be too tight
      // because the Echo starts much farther ahead at high speed.
      const speed=Math.max(300,context.speed||370);
      const nextLead=actionX==null?0:
        Math.max(0,(actionX-(context.playerX??300)-22)/speed);
      if(this.previousType&&typeof context.spawnXFor==='function'){
        const arrivalInterval=elapsed+nextLead-this.lastSpawnLead;
        if(arrivalInterval<previousSafety){
          this.spawnCountdown=Math.max(.01,previousSafety-arrivalInterval);
          this.movement.deferredPatterns++;
          return;
        }
      }
      // Terrain may veto an obstacle if its landing/takeoff area is unsafe.
      // Keep the pending action and retry later, rather than counting a fake
      // obstacle or popping an impossible pattern step.
      if(spawn({...next,phase:this.phase})===false){
        if(next.guided&&(next.type==='dash-jump'||next.type==='dash-duck')){
          this.dashPlacementFailures++;
          if(this.dashPlacementFailures>=4){
            // A long gap/sloped section must never freeze the hazard queue
            // while waiting for one rare Dash opportunity.
            this.pending.shift();
            this.dashPlacementFailures=0;
            this.dashRetryAfter=this.time+2.2;
            this.spawnCountdown=.30;
            this.movement.deferredPatterns++;
            return;
          }
        }
        this.spawnCountdown=.22;
        return;
      }
      this.dashPlacementFailures=0;
      this.pending.shift();
      this.movement.onSpawn(next.type,this.time);
      if(next.type==='echo')this.echoIntroduced=true;
      if(next.type==='dash-jump'||next.type==='dash-duck'){
        this.dashRetryAfter=0;
        const wasIntroduced=next.type==='dash-jump'?this.dashIntroduced.air:
          this.dashIntroduced.ground;
        if(wasIntroduced)this.dashHazardRepeats++;
        this.lastDashHazardAt=this.time;
        this.lastDashHazardType=next.type;
        if(next.type==='dash-jump')this.dashIntroduced.air=true;
        else this.dashIntroduced.ground=true;
      }
      this.totalSpawned++;this.lastSpawnTime=this.time;
      this.lastSpawnLead=nextLead;
      const following=this.pending[0]?.type||null;
      const safety=following?minimumGap(next.type,following,context.speed):0;
      // Pattern gaps are physically checked; an authored motif cannot force an impossible combo.
      this.spawnCountdown=Math.max(safety,this.gapFor(context));
      this.previousType=next.type;
    }
    noteDash(mode){this.movement.onDash(mode,this.time);}
    noteGapOutcome(data={}){this.movement.onGapOutcome({...data,now:this.time});}
    noteGravityShift(){this.movement.onGravityShift(this.time);}
    noteCombo({length=0}={}){
      // Observe real player execution, never force a pattern from an active
      // combo. Existing physical and fairness gates remain authoritative.
      if(length<2||length>4)return;
      this.comboInsight.total++;
      this.comboInsight.best=Math.max(this.comboInsight.best,length);
      this.comboInsight.lastAt=this.time;
    }
    get label(){return ({BUILD:'BUILDING',PEAK:'INTENSE',FADE:'EASING',RELAX:'BREATHE'})[this.phase];}
    get insight(){return {phase:this.phase,stress:this.stress,confidence:this.confidence,streak:this.streak,
      totalSpawned:this.totalSpawned,totalCleared:this.totalCleared,pattern:this.lastPatternId,
      dashHazards:{introduced:{...this.dashIntroduced},
        lastAt:this.lastDashHazardAt,lastType:this.lastDashHazardType,
        repeats:this.dashHazardRepeats},
      movement:this.movement.insight,combo:{...this.comboInsight}};}
  }
  // Keep the legacy exported constructor name for tests/integrations.
  return {PHASE,DASH_REPEAT_SECONDS,AdaptiveRushDirector,
    AdaptiveFlowDirector:AdaptiveRushDirector,minimumGap};
});
