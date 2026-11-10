/* CHROMA RUSH — Phase 2 Ambient Lighting 2.1 / unobtrusive Chroma Surge.
 * A real skill-reward window tied to the palette wave crossing the runner.
 * No extra obstacles, automatic inputs, speed changes, collision changes or RNG.
 * Pure scoring/timing state: no extra on-cube or trailing-line effects.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaSurge=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Longer than the former 4.8s window: real obstacles can arrive several
  // times without the Director ever being instructed to spawn an extra one.
  const WINDOW_SECONDS=7,MAX_CHAIN=4;
  class ChromaSurge{
    constructor(){this.reset()}
    reset(){
      this.phase='idle';this.zone=0;this.remaining=0;this.elapsed=0;
      this.chain=0;this.clears=0;this.breaks=0;this.points=0;
      this.bestChain=0;this.count=0;this.lastBonus=0;
    }
    // Arm only when a REAL chapter/palette changes. A new palette already
    // receives a single Tide; the Surge waits for the *actual* crossing.
    arm({zone=1}={}){
      if(this.phase==='active')this.phase='idle';
      this.phase='armed';this.zone=Math.max(1,Math.floor(zone));
      this.remaining=0;this.elapsed=0;this.chain=0;this.clears=0;
      this.breaks=0;this.points=0;this.lastBonus=0;
      return true;
    }
    activate(){
      if(this.phase!=='armed')return false;
      this.phase='active';this.remaining=WINDOW_SECONDS;this.elapsed=0;
      this.count++;return true;
    }
    get active(){return this.phase==='active'}
    get progress(){return this.active?clamp(this.remaining/WINDOW_SECONDS,0,1):0}
    get intensity(){
      if(!this.active)return 0;
      const onset=clamp(this.elapsed/.38,0,1);
      const tail=clamp(this.remaining/.66,0,1);
      return Math.min(onset,tail);
    }
    tick(dt){
      if(!(dt>0)||!this.active)return null;
      this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);
      if(this.remaining<=1e-7){this.phase='idle';return 'complete'}
      return null;
    }
    // Skill points use only observed, legitimate clears; visual flourish
    // and background decorations can never produce a reward.
    onClear({kind='jump',precision=false,master=false,protectedClear=false}={}){
      if(!this.active||protectedClear)return null;
      if(!['jump','duck','dash-duck','gap','echo-gap'].includes(kind))return null;
      this.chain=Math.min(MAX_CHAIN,this.chain+1);
      this.bestChain=Math.max(this.bestChain,this.chain);
      this.clears++;
      const bonus=60+this.chain*35+(precision?35:0)+(master?25:0);
      this.points+=bonus;this.lastBonus=bonus;
      return {points:bonus,chain:this.chain,kind,precision:Boolean(precision)};
    }
    onHit(){
      if(!this.active)return false;
      this.breaks++;this.chain=0;
      return true;
    }

  }
  return {ChromaSurge,WINDOW_SECONDS,MAX_CHAIN};
});
