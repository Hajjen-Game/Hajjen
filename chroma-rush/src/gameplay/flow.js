/* CHROMA RUSH — Flow Balance 1.1 — high-tier resistance.
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
    }
    get tier(){return this.rules.thresholds.reduce((count,threshold)=>count+(this.value>=threshold?1:0),0)}
    get multiplier(){return this.rules.multipliers[this.tier]}
    get stateName(){return ['LOW FLOW','FLOW ACTIVE','HIGH FLOW','CHROMA STATE'][this.tier]}
    tick(dt){
      if(!(dt>0))return;
      this.timeSinceClear+=dt;
      // Smooth high-Flow pressure. Exact exponential integration makes it
      // independent of graphical FPS or the number of simulation steps.
      const start=this.rules.highFlowPressureStart;
      const rate=this.rules.highFlowPressurePerSecond;
      if(Number.isFinite(start)&&Number.isFinite(rate)&&start<100&&this.value>start&&rate>0){
        const slope=rate/(100-start);
        this.value=start+(this.value-start)*Math.exp(-slope*dt);
      }
      if(this.timeSinceClear>this.rules.decayDelay)
        this.value-=this.rules.decayPerSecond*dt;
      this.value=clamp(this.value,0,100);
    }
    registerClear({precision=false}={}){
      const previousTier=this.tier;
      this.zoneClears++;
      this.streak++;
      this.bestStreak=Math.max(this.bestStreak,this.streak);
      this.timeSinceClear=0;
      if(precision)this.totalPrecision++;
      this.value=clamp(this.value+(precision?this.rules.precisionGain:this.rules.clearGain),0,100);
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
    }
    completeZone({hp=100,maxHP=100}={}){
      const previousZone=this.currentZone;
      const perfect=this.zoneDamage===0&&this.zoneClears>=this.rules.minPerfectClears;
      const heal=perfect?Math.min(this.rules.perfectHeal,Math.max(0,maxHP-hp)):0;
      if(perfect){
        this.perfectZones++;
        this.value=clamp(this.value+this.rules.perfectFlowGain,0,100);
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
