/* CHROMA RUSH — Flow Balance 2.0 — Director recovery protects earned Flow, without free refills.
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
      this.balance={pressureLoss:0,idleLoss:0,fadeSeconds:0,relaxSeconds:0};
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
      const delay=this.rules.decayDelay;
      // FADE is intentionally a quiet section. Count only half its seconds
      // toward the idle penalty; RELAX is a Director-authored no-spawn pause,
      // so it must not exhaust a player's earned idle grace.
      if(phase==='RELAX'){
        const grace=this.rules.relaxReturnGraceSeconds??1;
        this.timeSinceClear=Math.min(this.timeSinceClear,Math.max(0,delay-grace));
        this.balance.relaxSeconds+=dt;
      }else if(phase==='FADE'){
        this.timeSinceClear+=dt*(this.rules.fadeIdleClockScale??.5);
        this.balance.fadeSeconds+=dt;
      }else this.timeSinceClear+=dt;
      // Director FADE/RELAX are deliberate breathing room, so high-Flow
      // pressure eases here without slowing the runner or altering hazards.
      const pressureScale=phase==='RELAX'?this.rules.relaxPressureScale:
        phase==='FADE'?this.rules.fadePressureScale:1;
      const start=this.rules.highFlowPressureStart;
      const rate=this.rules.highFlowPressurePerSecond;
      if(Number.isFinite(start)&&Number.isFinite(rate)&&start<100&&this.value>start&&rate>0){
        const slope=rate/(100-start);
        const safeScale=Number.isFinite(pressureScale)?clamp(pressureScale,0,1):1;
        const beforePressure=this.value;
        this.value=start+(this.value-start)*Math.exp(-slope*safeScale*dt);
        this.balance.pressureLoss+=beforePressure-this.value;
      }
      // Only charge idle decay for time actually spent past the grace period.
      // During RELAX, even an unusually long microbreak is less punitive.
      const exposed=Math.max(0,this.timeSinceClear-delay)-Math.max(0,previousIdle-delay);
      if(exposed>0){
        const idleLoss=Math.min(this.value,this.rules.decayPerSecond*exposed);
        this.value-=idleLoss;
        this.balance.idleLoss+=idleLoss;
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
    registerCombo({length=0}={}){
      // Flow owns all rewards. Combo adds neither a second streak nor a
      // second clear: Perfect Zone still requires real obstacle passages.
      const previousTier=this.tier;
      const base=this.rules.comboBonusPoints?.[length]??0;
      if(!base)return {earnedPoints:0,flowGain:0,tierUp:false,tier:this.tier};
      const flowGain=this.rules.comboFlowGain?.[length]??0;
      this.value=clamp(this.value+flowGain,0,100);
      this.syncChroma();
      return {earnedPoints:Math.round(base*this.multiplier),flowGain,
        tierUp:this.tier>previousTier,tier:this.tier};
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
    get insight(){
      return {pressureLoss:Number(this.balance.pressureLoss.toFixed(2)),
        idleLoss:Number(this.balance.idleLoss.toFixed(2)),
        fadeSeconds:Number(this.balance.fadeSeconds.toFixed(2)),
        relaxSeconds:Number(this.balance.relaxSeconds.toFixed(2)),
        precisionClears:this.totalPrecision,
        flow:Number(this.value.toFixed(2)),tier:this.tier};
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
