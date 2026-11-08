/* CHROMA RUSH — Precision & Combo System 1.0
 * Pure recognition of successful MOVEMENT sequences. No new input, physics,
 * RNG, timers, sound or difficulty overrides. All rewards route through Flow.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaPrecisionCombo=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const WINDOW_SECONDS=5.8;
  const MAX_CHAIN=4;
  const FAMILY=Object.freeze({
    jump:'jump',gap:'jump',
    duck:'duck','dash-jump':'jump','dash-duck':'duck',
    echo:'echo','echo-gap':'echo'
  });
  // Preserve the existing precision windows exactly; their observable
  // margin/grade is now explicit for tests, feedback and telemetry.
  function assessPrecision({action,closestClearance=Infinity,
    entryDuckTime=null,traverseSeconds=0}={}){
    if(action==='jump'||action==='echo'){
      const margin=Number(closestClearance);
      const precision=Number.isFinite(margin)&&margin>=0&&margin<=18;
      return {precision,master:precision&&margin<=8,
        margin:Number.isFinite(margin)?margin:null};
    }
    if(action==='duck'){
      if(!Number.isFinite(entryDuckTime)||entryDuckTime===null)
        return {precision:false,master:false,margin:null};
      const margin=entryDuckTime-traverseSeconds;
      const precision=margin>=.02-1e-8&&margin<=.16+1e-8;
      return {precision,master:precision&&margin>=.06&&margin<=.12,
        margin};
    }
    // Gap-clear is not yet scored as precision: no exact takeoff measure.
    return {precision:false,master:false,margin:null};
  }
  class PrecisionComboSystem{
    constructor(){this.reset();}
    reset(){
      this.chain=[];this.lastAt=-Infinity;
      this.totalCombos=0;this.bestChain=0;
      this.precisionInRun=0;this.masterInRun=0;
      this.comboBonusPoints=0;
      this.breaks=0;
      this.displayTier=0;this.displayTime=0;
    }
    tick(dt){
      if(dt>0)this.displayTime=Math.max(0,this.displayTime-dt);
    }
    breakChain(){
      if(this.chain.length>0)this.breaks++;
      this.chain=[];this.lastAt=-Infinity;
      this.displayTime=0;this.displayTier=0;
    }
    onClear({action,time=0,precision=false,master=false}={}){
      const family=FAMILY[action];
      if(!family||!Number.isFinite(time))return null;
      if(precision)this.precisionInRun++;
      if(master&&precision)this.masterInRun++;
      const delta=time-this.lastAt;
      const previous=this.chain[this.chain.length-1];
      // Repeated single-action farming does not qualify as a movement combo.
      // An intentional Director break may expire the chain harmlessly.
      if(!(delta>0&&delta<=WINDOW_SECONDS)||
        previous?.family===family||this.chain.length>=MAX_CHAIN){
        this.chain=[];
      }
      this.chain.push({action,family,precision:Boolean(precision),
        master:Boolean(master&&precision)});
      this.lastAt=time;
      const length=this.chain.length;
      this.bestChain=Math.max(this.bestChain,length);
      if(length<2)return null;
      this.totalCombos++;
      this.displayTier=length;
      this.displayTime=length>=4?1.25:length===3?1.05:.80;
      return {length,actions:this.chain.map(x=>x.action).join(' > '),
        precisionCount:this.chain.filter(x=>x.precision).length,
        masterCount:this.chain.filter(x=>x.master).length,
        flourish:length>=3};
    }
    noteBonus(points){
      if(Number.isFinite(points)&&points>0)this.comboBonusPoints+=points;
    }
    get insight(){
      return {chain:this.chain.length,bestChain:this.bestChain,
        combos:this.totalCombos,precision:this.precisionInRun,
        masters:this.masterInRun,bonusPoints:this.comboBonusPoints};
    }
  }
  return {PrecisionComboSystem,assessPrecision,WINDOW_SECONDS,MAX_CHAIN,FAMILY};
});
