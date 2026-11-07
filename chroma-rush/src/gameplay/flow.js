/* CHROMA RUSH — Flow Balance 1.2 — stable Chroma and Director-aware pressure.
 * Gameplay-only model: deterministic, no DOM, rendering or audio dependencies.
 * A perfect zone requires real successful obstacle clears, not an empty timer.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports
    ? require('../core/config.js') : root.ChromaConfig;
  const api=factory(config.FLOW);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaFlow=api;
})(typeof window!=='undefined'?window:null,function(FLOW){
  'use strict';
  const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
  class FlowSystem {
    constructor(rules=FLOW){this.rules=rules;this.reset()}
    reset(){
      this.value=0;this.streak=0;this.bestStreak=0;this.perfectZones=0;
      this.zoneClears=0;this.zoneDamage=0;this.currentZone=1;
      this.timeSinceClear=0;this.totalPrecision=0;
      this.chromaActive=false;
    }
    // Chroma enters at 90%, but a small exit buffer prevents tier/2x score
    // flicker during normal pressure. Real damage still cancels immediately.
    syncChroma(){
      const enter=this.rules.thresholds[2];
      const exit=Math.min(enter,this.rules.chromaExitThreshold??enter);
      if(this.value>=enter)this.chromaActive=true;
      else if(this.value<exit)this.chromaActive=false;
    }
    get tier(){
      const base=this.rules.thresholds.reduce((count,threshold)=>count+(this.value>=threshold?1:0),0);
      return this.chromaActive?Math.max(base,3):base;
    }
    get multiplier(){return this.rules.multipliers[this.tier]}
    get stateName(){return ['LOW FLOW','FLOW ACTIVE','HIGH FLOW','CHROMA STATE'][this.tier]}
    tick(dt,{phase='BUILD'}={}){
      if(!(dt>0))return;
      const previousIdle=this.timeSinceClear;
      this.timeSinceClear+=dt;
      // Director FADE/RELAX are deliberate breathing room, so high-Flow
      // pressure eases here without slowing the runner or altering hazards.
      const pressureScale=phase==='RELAX'?this.rules.relaxPressureScale:
        phase==='FADE'?this.rules.fadePressureScale:1;
      const start=this.rules.highFlowPressureStart;
      const rate=this.rules.highFlowPressurePerSecond;
      if(Number.isFinite(start)&&Number.isFinite(rate)&&start<100&&this.value>start&&rate>0){
        const slope=rate/(100-start);
        const safeScale=Number.isFinite(pressureScale)?clamp(pressureScale,0,1):1;
        this.value=start+(this.value-start)*Math.exp(-slope*safeScale*dt);
      }
      // Only charge idle decay for time actually spent past the grace period.
      // During RELAX, even an unusually long microbreak is less punitive.
      const delay=this.rules.decayDelay;
      const exposed=Math.max(0,this.timeSinceClear-delay)-Math.max(0,previousIdle-delay);
      if(exposed>0){
        const idleScale=phase==='RELAX'?this.rules.relaxIdleDecayScale:1;
        this.value-=this.rules.decayPerSecond*exposed*
          (Number.isFinite(idleScale)?clamp(idleScale,0,1):1);
      }
      this.value=clamp(this.value,0,100);
      this.syncChroma();
    }
    registerClear({precision=false}={}){
      const previousTier=this.tier;
      this.zoneClears++;
      this.streak++;
      this.bestStreak=Math.max(this.bestStreak,this.streak);
      this.timeSinceClear=0;
      if(precision)this.totalPrecision++;
      this.value=clamp(this.value+(precision?this.rules.precisionGain:this.rules.clearGain),0,100);
      this.syncChroma();
      return {precision,tier:this.tier,tierUp:this.tier>previousTier,multiplier:this.multiplier,
        earnedPoints:Math.round(this.rules.clearPoints*this.multiplier)};
    }
    registerCollision(){
      // An absorbed hit is still a mistake, even if invulnerability blocks HP damage.
      this.zoneDamage++;
      this.streak=0;
      this.timeSinceClear=0;
    }
    registerDamage(){
      this.registerCollision();
      this.value=clamp(this.value-this.rules.damagePenalty,0,100);
      this.syncChroma();
    }
    completeZone({hp=100,maxHP=100}={}){
      const previousZone=this.currentZone;
      const perfect=this.zoneDamage===0&&this.zoneClears>=this.rules.minPerfectClears;
      const heal=perfect?Math.min(this.rules.perfectHeal,Math.max(0,maxHP-hp)):0;
      if(perfect){
        this.perfectZones++;
        this.value=clamp(this.value+this.rules.perfectFlowGain,0,100);
        this.syncChroma();
      }
      const result={zone:previousZone,perfect,heal,clears:this.zoneClears,
        zoneDamage:this.zoneDamage,bonusPoints:perfect?Math.round(this.rules.perfectPoints*this.multiplier):0};
      this.currentZone++;
      this.zoneClears=0;
      this.zoneDamage=0;
      return result;
    }
  }
  return {FlowSystem};
});
