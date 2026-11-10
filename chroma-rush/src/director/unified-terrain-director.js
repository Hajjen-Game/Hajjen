/* CHROMA RUSH — Unified Terrain Director 3.0 + Movement Awareness 1.0.
 * Coordinates procedural landforms with Adaptive Rush Director 2.0.
 * The course remains endless and random; this is not a level list.
 * Never changes speed, jump/duck physics, scoring or input.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaUnifiedTerrainDirector=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const ORDER=['BUILD','PEAK','FADE','RELAX'];
  // Future-phase estimates match the short-breather, long-attack model.
  const ESTIMATES={BUILD:1.8,PEAK:17.0,FADE:.35,RELAX:.85};
  const EARLY_ESTIMATES={BUILD:6.6,PEAK:5.4,FADE:2.1,RELAX:2.5};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  class UnifiedTerrainDirector{
    constructor({terrain,director}={}){
      if(!terrain||!director)throw new Error('UnifiedTerrainDirector requires terrain and director');
      this.terrain=terrain;
      this.director=director;
      this.reset();
    }
    reset(){
      this.noGapsBefore=0;
      this.noHazardsBefore=0;
      this.gapsPlanned=0;
      this.echoGapsPlanned=0;
      this.slopesPlanned=0;
      this.spawnsDeferred=0;
      this.gapFails=0;
      this.gapSuccesses=0;
      this.lastPolicy=null;
    }
    // Landforms are generated ahead of the player. Forecast their ARRIVAL
    // phase so a chasm planned at the tail of PEAK does not land in RELAX.
    projectedPhase(secondsAhead,zone=1){
      const estimates=zone>=8?ESTIMATES:EARLY_ESTIMATES;
      let phase=ORDER.includes(this.director.phase)?this.director.phase:'BUILD';
      let remaining=Math.max(0,(this.director.phaseDuration||estimates[phase])-
        (this.director.phaseElapsed||0));
      let ahead=clamp(Number(secondsAhead)||0,0,40);
      for(let i=0;i<15;i++){
        if(ahead<remaining)return {phase,remaining:remaining-ahead};
        ahead-=remaining;
        phase=ORDER[(ORDER.indexOf(phase)+1)%ORDER.length];
        remaining=estimates[phase];
      }
      return {phase,remaining:0};
    }
    policyAt(start,{playerWorld=0,zone=1,speed=370,hp=100,surface=null}={}){
      const safeSpeed=Math.max(300,speed);
      const lead=Math.max(0,(start-playerWorld)/safeSpeed);
      const future=this.projectedPhase(lead,zone);
      const stress=clamp(this.director.stress||0,0,1);
      const confidence=clamp(this.director.confidence||0,0,1);
      const vulnerable=hp<=25||stress>=.64;
      // No gaps in the early tutorial. A low-shield player receives a more
      // forgiving terrain phrase without slowing the world itself.
      const gentle=hp<=50||stress>=.40;
      // Only the retained long Duck Gate needs a guided floor runway.
      // Never suppress gap play after that one first encounter.
      const dashLearningRunway=surface==='floor'&&zone>=4&&zone<=9&&
        hp>50&&!this.director.dashIntroduced.ground;
      // Real high-speed obstacle space needs long, uninterrupted flats.
      // Late challenge runways ease terrain vetoes but retain hills/gaps.
      const endurance=this.director.enduranceFor?.({zone,hp})||0;
      const density=this.director.densityFor?.({zone,hp})||endurance;
      const action=this.director.actionPressureFor?.({zone,hp})||0;
      // A controlled late basic-action runway is useful even at low HP.
      // It does NOT re-enable the Echo/Dash hazards or hazardous gaps:
      // those keep their independent HP and damage recovery vetoes.
      const challengeRunway=zone>=25&&density>=.20&&
        stress<.74&&confidence>=.65&&
        (future.phase==='BUILD'||future.phase==='PEAK')&&
        !dashLearningRunway;
      const peak=future.phase==='PEAK';
      // Reserve a long FLAT sequence before the rush arrives, not after
      // several queued obstacles have already been vetoed by hills/gaps.
      // An ordinary Jump/Duck attack is never permanently disabled by
      // HP or a confidence threshold. Only the brief damage window and
      // mechanic/terrain transition safety may postpone it.
      const recentlyHit=(this.director.time||0)-
        (this.director.lastDamageAt??-999)<1.5;
      const rushRunway=zone>=8&&peak&&future.remaining>=1.5&&
        !recentlyHit&&(this.director.cycle%3!==1)&&
        !dashLearningRunway;
      const permitGap=zone>=3 && !vulnerable && !dashLearningRunway &&
        start>=this.noGapsBefore &&
        (peak || (future.phase==='BUILD'&&zone>=5&&confidence>=.70));
      const gapTime=peak ? (gentle?.30:.35) : .29;
      const safeArrival=permitGap && future.remaining>=gapTime+.48;
      const gapChance=rushRunway?0:
        safeArrival?(peak?(gentle?.19:.42):.14):0;
      // Zone 2 remains a calm, flat section for basic jump and duck timing.
      const teachingBasics=zone===2;
      // Denser *valid* hurdle corridors: keep terrain visually varied, but
      // modestly reduce hills exactly where a sustained skill run is due.
      // Real gap/landing/slope vetoes remain fully authoritative.
      const actionFlat=1-(future.phase==='PEAK'?.31:
        future.phase==='BUILD'?.21:.04)*action;
      const slopeChance=teachingBasics||dashLearningRunway||rushRunway?0:
        (({BUILD:.45,PEAK:.26,FADE:.22,RELAX:.10})[future.phase]||.2)*
        (challengeRunway?1-.36*density:1)*actionFlat;
      const maxHeightChange=({BUILD:62,PEAK:58,FADE:38,RELAX:23})[future.phase]||40;
      // Double-jump mastery now comes from real chasms, not the retired
      // wide Echo Rail. First teach an ordinary gap, then introduce a broad
      // Echo Gap on the floor in a calm, healthy PEAK window.
      const movement=this.director.movement;
      const arrival=(this.director.time||0)+lead;
      const movementSafe=!movement||(movement.pressure<1.6&&
        arrival-movement.lastEchoTime>3.3&&arrival>=movement.recoveryUntil+.6);
      const echoSafe=zone>=4&&this.gapSuccesses>0&&safeArrival&&peak&&
        future.remaining>=1.58&&!gentle&&stress<.36&&
        confidence>=.50&&hp>50&&movementSafe&&
        (surface==='floor'||this.echoGapsPlanned>0);
      const policy={phase:future.phase,leadSeconds:lead,allowGap:safeArrival,
        gapChance,slopeChance,maxHeightChange:gentle?Math.min(40,maxHeightChange):maxHeightChange,
        gapSecondsMin:peak?.30:.27,gapSecondsMax:gapTime,
        echoGapChance:echoSafe?.44:0,
        echoGapSecondsMin:.92,echoGapSecondsMax:1.015,
        noGapBefore:this.noGapsBefore,dashLearningRunway,rushRunway,
        challengeRunway,endurance,density,actionPressure:action};
      this.lastPolicy=policy;
      return policy;
    }
    prepare({right,playerWorld,zone,speed,hp,surface}={}){
      const context={playerWorld,zone,speed,hp,surface};
      const added=this.terrain.ensure(right,zone,speed,start=>this.policyAt(start,context));
      for(const s of added){
        if(s.type==='gap'){
          this.gapsPlanned++;
          if(s.echoChallenge)this.echoGapsPlanned++;
        }
        if(s.type==='slope')this.slopesPlanned++;
      }
      return added;
    }
    // Preserve every action in the Director's pending motif until the terrain
    // makes room for it. Never manufacture a fake obstacle clear.
    tick(dt,context,spawn){
      const speed=Math.max(300,context.speed||370);
      this.director.tick(dt,context,step=>{
        // The reaction-time planner may spawn an advanced obstacle farther
        // beyond the screen. All gap/terrain checks must use that ACTUAL x.
        const spawnX=typeof context.spawnXFor==='function'?
          context.spawnXFor(step.type):context.spawnX||0;
        const spawnWorld=(context.distance||0)+spawnX;
        const dashAction=step.type==='dash-jump'||step.type==='dash-duck';
        if(spawnWorld<this.noHazardsBefore){
          this.spawnsDeferred++;
          if(dashAction)context.noteDashDefer?.('recovery_zone',step.type);
          return false;
        }
        // Wider than the basic collision veto: allow the player to finish a
        // gap landing before the next obstacle needs a reaction.
        const echo=step.type==='echo';
        const nearby=this.terrain.visibleGaps(spawnWorld-speed*1.85,
          spawnWorld+speed*1.85);
        const overloaded=nearby.some(g=>{
          // Echo Gaps and Echo Spires both consume a second aerial beat;
          // ordinary hurdles also need a clean recovery after a long gap.
          const seconds=echo||g.echoChallenge?1.65:1.10;
          return g.end>=spawnWorld-speed*seconds&&
            g.start<=spawnWorld+speed*seconds;
        });
        if(overloaded){
          this.spawnsDeferred++;
          if(dashAction)context.noteDashDefer?.('near_gap',step.type);
          return false;
        }
        const created=spawn(step);
        if(created===false)this.spawnsDeferred++;
        return created;
      });
    }
    noteGapOutcome({missed=false,echo=false,worldX=0,speed=370}={}){
      const v=Math.max(300,speed);
      this.director.noteGapOutcome?.({missed,echo});
      this.noHazardsBefore=Math.max(this.noHazardsBefore,worldX+
        v*(missed?(echo?2.05:1.45):(echo?1.15:.65)));
      if(missed){
        this.gapFails++;
        // Include lookahead: the next gap must be safely beyond recovery.
        this.noGapsBefore=Math.max(this.noGapsBefore,worldX+v*4.2);
      }else this.gapSuccesses++;
    }
    get insight(){return {
      gapsPlanned:this.gapsPlanned,echoGapsPlanned:this.echoGapsPlanned,
      slopesPlanned:this.slopesPlanned,
      spawnsDeferred:this.spawnsDeferred,gapFails:this.gapFails,
      gapSuccesses:this.gapSuccesses,phase:this.director.phase,
      lastPlannedPhase:this.lastPolicy?.phase||'BUILD'
    }}
  }
  return {UnifiedTerrainDirector,ESTIMATES};
});
