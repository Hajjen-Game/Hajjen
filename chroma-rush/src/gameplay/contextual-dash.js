/* CHROMA RUSH — Movement Evolution 2.2 / Dash Impact.
 * Pure fixed-step world-space dash; no camera teleport, immunity or RNG.
 * A new down press while airborne = Air Dash.
 * A second distinct down press during an active duck = Ground Dash.
 * HOLDING NEVER repeats either action; the input adapter gates new presses.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.DASH);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaDash=api;
})(typeof window!=='undefined'?window:null,function(RULES){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  class ContextualDash{
    constructor(rules=RULES){
      // Old config.js may be cached independently on GitHub Pages. Fail
      // predictably rather than making ALL duck presses throw TypeError.
      this.rules=rules&&Number.isFinite(rules.unlockZone)?rules:{
        unlockZone:1,duration:.30,bonusFactor:1.05,minBonusSpeed:400,maxBonusSpeed:760};
      this.reset();
    }
    reset(){
      this.remaining=0;this.mode=null;this.usedAir=false;
      this.usedDuck=false;this.duckWindow=false;
      this.airCount=0;this.groundCount=0;this.travel=0;
    }
    get active(){return this.remaining>0;}
    get bonusSpeed(){return this.lastBonusSpeed||0;}
    onDuckStart(){this.duckWindow=true;this.usedDuck=false;}
    onDuckEnd(){this.duckWindow=false;if(this.mode==='ground')this.cancel();}
    onLeaveGround(){this.duckWindow=false;if(this.mode==='ground')this.cancel();}
    onLand(){this.remaining=0;this.mode=null;this.usedAir=false;
      this.usedDuck=false;this.duckWindow=false;this.lastBonusSpeed=0;}
    cancel(){this.remaining=0;this.mode=null;this.lastBonusSpeed=0;}
    request({zone=1,grounded=false,ducking=false,recovering=false,shifting=false}={}){
      if(zone<this.rules.unlockZone||recovering||shifting||this.active)return null;
      if(!grounded){
        if(this.usedAir)return null;
        this.usedAir=true;this.mode='air';this.remaining=this.rules.duration;
        this.airCount++;return 'air';
      }
      if(ducking&&this.duckWindow&&!this.usedDuck){
        this.usedDuck=true;this.mode='ground';this.remaining=this.rules.duration;
        this.groundCount++;return 'ground';
      }
      return null;
    }
    tick(dt,speed=370){
      if(!(dt>0)||!this.active){this.lastBonusSpeed=0;return 0;}
      const actual=Math.min(dt,this.remaining);
      const bonus=clamp(Math.max(0,speed)*this.rules.bonusFactor,
        this.rules.minBonusSpeed,this.rules.maxBonusSpeed);
      // Front-loaded thrust that relaxes smoothly; one shared world step.
      const t=clamp(1-this.remaining/this.rules.duration,0,1);
      const drive=.84+.40*(1-t)*(1-t);
      const boosted=bonus*drive;
      const extra=actual*boosted;
      this.travel+=extra;this.remaining=Math.max(0,this.remaining-actual);
      this.lastBonusSpeed=this.active?boosted:0;
      if(!this.active)this.mode=null;
      return extra;
    }
    get insight(){return {active:this.active,mode:this.mode,
      airCount:this.airCount,groundCount:this.groundCount,
      bonusDistance:Math.round(this.travel)};}
  }
  return {ContextualDash};
});
