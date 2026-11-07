/* CHROMA RUSH — Unified Terrain Director 3.0.
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
  const ESTIMATES={BUILD:7.1,PEAK:5.1,FADE:2.3,RELAX:2.7};
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
      this.slopesPlanned=0;
      this.spawnsDeferred=0;
      this.gapFails=0;
      this.gapSuccesses=0;
      this.lastPolicy=null;
    }
    // Landforms are generated ahead of the player. Forecast their ARRIVAL
    // phase so a chasm planned at the tail of PEAK does not land in RELAX.
    projectedPhase(secondsAhead){
      let phase=ORDER.includes(this.director.phase)?this.director.phase:'BUILD';
      let remaining=Math.max(0,(this.director.phaseDuration||ESTIMATES[phase])-
        (this.director.phaseElapsed||0));
      let ahead=clamp(Number(secondsAhead)||0,0,40);
      for(let i=0;i<15;i++){
        if(ahead<remaining)return {phase,remaining:remaining-ahead};
        ahead-=remaining;
        phase=ORDER[(ORDER.indexOf(phase)+1)%ORDER.length];
        remaining=ESTIMATES[phase];
      }
      return {phase,remaining:0};
    }
    policyAt(start,{playerWorld=0,zone=1,speed=370,hp=100}={}){
      const safeSpeed=Math.max(300,speed);
      const lead=Math.max(0,(start-playerWorld)/safeSpeed);
      const future=this.projectedPhase(lead);
      const stress=clamp(this.director.stress||0,0,1);
      const confidence=clamp(this.director.confidence||0,0,1);
      const vulnerable=hp<=25||stress>=.64;
      // No gaps in the early tutorial. A low-shield player receives a more
      // forgiving terrain phrase without slowing the world itself.
      const gentle=hp<=50||stress>=.40;
      const peak=future.phase==='PEAK';
      const permitGap=zone>=3 && !vulnerable &&
        start>=this.noGapsBefore &&
        (peak || (future.phase==='BUILD'&&zone>=5&&confidence>=.70));
      const gapTime=peak ? (gentle?.30:.35) : .29;
      const safeArrival=permitGap && future.remaining>=gapTime+.48;
      const gapChance=safeArrival?(peak?(gentle?.13:.29):.065):0;
      const slopeChance=({BUILD:.52,PEAK:.36,FADE:.24,RELAX:.10})[future.phase]||.2;
      const maxHeightChange=({BUILD:62,PEAK:58,FADE:38,RELAX:23})[future.phase]||40;
      // Echo Gaps occur only in healthy, confident PEAK sections with
      // enough time remaining for takeoff, two jumps and a safe landing.
      const echoSafe=zone>=5&&safeArrival&&peak&&future.remaining>=1.58&&
        !gentle&&stress<.33&&confidence>=.53&&hp>50;
      const policy={phase:future.phase,leadSeconds:lead,allowGap:safeArrival,
        gapChance,slopeChance,maxHeightChange:gentle?Math.min(40,maxHeightChange):maxHeightChange,
        gapSecondsMin:peak?.30:.27,gapSecondsMax:gapTime,
        echoGapChance:echoSafe?.30:0,
        echoGapSecondsMin:.92,echoGapSecondsMax:1.015,
        noGapBefore:this.noGapsBefore};
      this.lastPolicy=policy;
      return policy;
    }
    prepare({right,playerWorld,zone,speed,hp}={}){
      const context={playerWorld,zone,speed,hp};
      const added=this.terrain.ensure(right,zone,speed,start=>this.policyAt(start,context));
      for(const s of added){
        if(s.type==='gap')this.gapsPlanned++;
        if(s.type==='slope')this.slopesPlanned++;
      }
      return added;
    }
    // Preserve every action in the Director's pending motif until the terrain
    // makes room for it. Never manufacture a fake obstacle clear.
    tick(dt,context,spawn){
      const speed=Math.max(300,context.speed||370);
      const spawnWorld=(context.distance||0)+(context.spawnX||0);
      this.director.tick(dt,context,step=>{
        if(spawnWorld<this.noHazardsBefore){this.spawnsDeferred++;return false;}
        // Wider than the basic collision veto: allow the player to finish a
        // gap landing before the next obstacle needs a reaction.
        const nearby=this.terrain.visibleGaps(spawnWorld-speed*.90,
          spawnWorld+speed*1.10);
        if(nearby.length){this.spawnsDeferred++;return false;}
        const created=spawn(step);
        if(created===false)this.spawnsDeferred++;
        return created;
      });
    }
    noteGapOutcome({missed=false,worldX=0,speed=370}={}){
      const v=Math.max(300,speed);
      this.noHazardsBefore=Math.max(this.noHazardsBefore,worldX+v*(missed?1.45:.65));
      if(missed){
        this.gapFails++;
        // Include lookahead: the next gap must be safely beyond recovery.
        this.noGapsBefore=Math.max(this.noGapsBefore,worldX+v*4.2);
      }else this.gapSuccesses++;
    }
    get insight(){return {
      gapsPlanned:this.gapsPlanned,slopesPlanned:this.slopesPlanned,
      spawnsDeferred:this.spawnsDeferred,gapFails:this.gapFails,
      gapSuccesses:this.gapSuccesses,phase:this.director.phase,
      lastPlannedPhase:this.lastPolicy?.phase||'BUILD'
    }}
  }
  return {UnifiedTerrainDirector,ESTIMATES};
});
