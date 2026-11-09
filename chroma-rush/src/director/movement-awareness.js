/* CHROMA RUSH — Movement-Aware Director 1.0.
 * Pure, deterministic assessment of the physical MOVEMENT needed by each
 * obstacle phrase. No input manipulation, random numbers or visual effects.
 * The existing adaptive Director owns pacing; this module informs its choices.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.GAME,config.JUMP_FEEL,config.ECHO_SPIRE);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaMovementAwareness=api;
})(typeof window!=='undefined'?window:null,function(GAME,JUMP_FEEL,ECHO_SPIRE){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Timing envelopes describe actual control commitments, not obstacle height.
  const PROFILES=Object.freeze({
    jump:Object.freeze({commit:Math.abs(2*GAME.jumpVelocity/GAME.gravity),effort:1.0}),
    duck:Object.freeze({commit:GAME.duckDuration+GAME.duckRecovery,effort:1.05}),
    echo:Object.freeze({commit:1.25,effort:2.45}),
    'dash-jump':Object.freeze({commit:1.18,effort:2.50}),
    'dash-duck':Object.freeze({commit:1.10,effort:2.35}),
    gap:Object.freeze({commit:1.05,effort:1.4}),
    'echo-gap':Object.freeze({commit:1.35,effort:2.55})
  });
  // The standard spawn/arrival cadence also accounts for the physical
  // LENGTH of advanced obstacles, not just the first end-plinth. The actual
  // game-layer world-edge rule enforces the FINAL spacing independently of
  // dynamic camera lookahead or speed changes (including first lessons).
  function minimumGap(previous,next,speed,obstacleWidth=70){
    const v=Math.max(300,speed);
    const travel=(obstacleWidth+44)/v;
    const previousAdvanced=previous==='dash-jump'||previous==='dash-duck';
    const nextAdvanced=next==='dash-jump'||next==='dash-duck';
    const priorSpan=previous==='dash-jump'?Math.min(1200/v,1.36):
      previous==='dash-duck'?Math.min(530/v,.68):0;
    if(previousAdvanced&&nextAdvanced)return priorSpan+2.6+travel;
    if(previousAdvanced)return priorSpan+1.7+travel;
    if(nextAdvanced)return 1.25+travel;
    if(previous==='echo')return 1.47+travel;
    if(next==='echo')return (previous==='duck'?1.14:1.09)+travel;
    if(previous==='jump')return .88+travel;
    if(previous==='duck'&&next==='jump')return .68+travel;
    if(previous==='duck'&&next==='duck')return .70+travel;
    return 0;
  }
  function patternDemand(steps=[]){
    let cost=0;
    for(let i=0;i<steps.length;i++){
      const action=steps[i],prev=steps[i-1];
      cost+=(PROFILES[action]||PROFILES.jump).effort;
      if(prev&&prev!==action)cost+=(action==='echo'||prev==='echo'?.35:.17);
    }
    return cost;
  }
  class MovementAwareness {
    constructor(){this.reset();}
    reset(){
      this.pressure=0;
      this.lastAction=null;
      this.lastEchoTime=-Infinity;
      this.lastGapTime=-Infinity;
      this.recoveryUntil=0;
      this.echoClears=0;
      this.echoMisses=0;
      this.consecutiveHard=0;
      this.deferredPatterns=0;
      this.executed={jump:0,duck:0,echo:0};
      this.dashUses={air:0,ground:0};this.lastDashTime=-Infinity;
    }
    tick(dt){
      if(dt>0)this.pressure=Math.max(0,this.pressure-dt*.42);
    }
    onSpawn(action,now){
      this.executed[action]=(this.executed[action]||0)+1;
      this.lastAction=action;
      if(action==='echo'){
        this.pressure=Math.min(4.8,this.pressure+1.55);
        this.lastEchoTime=now;
        this.consecutiveHard++;
      }else if(action==='dash-jump'||action==='dash-duck'){
        // Dash barriers have their OWN cooldown; don't masquerade as Echo
        // and accidentally suppress the Double Jump mechanics for 7 seconds.
        this.pressure=Math.min(4.8,this.pressure+.85);
        this.consecutiveHard++;
      }else{
        this.pressure=Math.min(4.8,this.pressure+.10);
        this.consecutiveHard=0;
      }
    }
    onClear(action,now){
      if(action==='dash-jump'||action==='dash-duck'){
        this.recoveryUntil=Math.max(this.recoveryUntil,now+.85);
      }else if(action==='echo'){
        this.echoClears++;
        this.recoveryUntil=Math.max(this.recoveryUntil,now+.8);
      }else if(action==='echo-gap'){
        this.lastGapTime=now;
        this.pressure=Math.min(4.8,this.pressure+1.20);
        this.recoveryUntil=Math.max(this.recoveryUntil,now+1.05);
      }else if(action==='gap'){
        this.lastGapTime=now;
        this.pressure=Math.min(4.8,this.pressure+.48);
        this.recoveryUntil=Math.max(this.recoveryUntil,now+.65);
      }
    }
    onDamage(now,action){
      if(action==='echo')this.echoMisses++;
      this.pressure=Math.min(4.8,this.pressure+2.15);
      this.recoveryUntil=Math.max(this.recoveryUntil,now+2.25);
    }
    onGapOutcome({missed=false,echo=false,now=0}={}){
      this.lastGapTime=now;
      this.pressure=Math.min(4.8,this.pressure+(missed?1.4:echo?1.1:.35));
      this.recoveryUntil=Math.max(this.recoveryUntil,now+(missed?2.6:echo?1.55:.85));
    }
    onDash(mode,now){
      if(mode!=='air'&&mode!=='ground')return;
      this.dashUses[mode]++;
      this.lastDashTime=now;
      // A short breathing buffer for future complex patterns. No existing
      // obstacle is deleted and no hazard is auto-cleared by a dash.
      this.recoveryUntil=Math.max(this.recoveryUntil,now+(mode==='air'?.55:.38));
    }
    onGravityShift(now){
      this.recoveryUntil=Math.max(this.recoveryUntil,now+1.35);
    }
    echoReady({zone=1,hp=100,stress=0,confidence=0,phase='BUILD',
      surface='floor',gravityPending=false}={},now=0,first=false){
      const earlyLesson=first&&zone===ECHO_SPIRE.firstZone;
      // A short, isolated teaching obstacle is okay even when the current
      // pacing phase is FADE/RELAX. It is NOT an advanced difficulty spike.
      if(zone<ECHO_SPIRE.firstZone||hp<=50||stress>=.42||
        (!earlyLesson&&confidence<.38))return false;
      if(first&&(surface!=='floor'||gravityPending))return false;
      if(!earlyLesson&&(phase==='FADE'||phase==='RELAX'))return false;
      if(now<this.recoveryUntil)return false;
      if(first)return earlyLesson||phase==='PEAK';
      if(now-this.lastEchoTime<7.2 || now-this.lastGapTime<2.2)return false;
      return true;
    }
    maxEffort({zone=1,hp=100,stress=0,confidence=0,phase='BUILD'}={}){
      let allowed=phase==='PEAK'?zone>=8?5.6:zone>=6?4.5:3.8:3.25;
      if(hp<=50||stress>=.38)allowed=Math.min(allowed,2.35);
      else if(confidence<.43)allowed=Math.min(allowed,3.25);
      // After a hard challenge, choose a simpler phrase to create a real
      // recovery opportunity, without ever changing the auto-run speed.
      return Math.max(1.5,allowed-this.pressure*.34);
    }
    allowPattern(pattern,context,now,{firstEcho=false}={}){
      if(!pattern)return false;
      const steps=pattern.steps||[];
      const hasEcho=steps.includes('echo');
      if(hasEcho&&!this.echoReady({...context},now,firstEcho))return false;
      if(steps.some(s=>s==='dash-jump'||s==='dash-duck')){
        if(steps.length>1||context.hp<=50||context.stress>=.42||
           context.gravityPending||now<this.recoveryUntil)return false;
      }
      if(hasEcho&&steps.length>1&&this.echoClears<1)return false;
      if(steps.length>2&&this.pressure>=2.5)return false;
      if(firstEcho&&pattern.id==='single-echo')return true;
      return patternDemand(steps)<=this.maxEffort(context)+1e-6;
    }
    adjustedWeight(pattern,context){
      let w=pattern.weight;
      const actions=pattern.steps;
      if(this.lastAction&&actions[0]===this.lastAction)w*=.78;
      if(actions.includes('echo'))w*=.70; // Echo remains a distinct event.
      if(actions.some(a=>a==='dash-jump'||a==='dash-duck'))w*=.60;
      if(this.pressure>1.2&&actions.length===1)w*=1.35;
      if(context.phase==='PEAK'&&this.pressure<.6&&actions.length>1)w*=1.14;
      return w;
    }
    get insight(){return {pressure:Number(this.pressure.toFixed(2)),
      lastAction:this.lastAction,echoClears:this.echoClears,
      echoMisses:this.echoMisses,recoveryUntil:this.recoveryUntil,
      deferredPatterns:this.deferredPatterns,executed:{...this.executed},
      dashUses:{...this.dashUses},lastDashTime:this.lastDashTime};}
  }
  return {MovementAwareness,PROFILES,minimumGap,patternDemand};
});
