/* CHROMA RUSH — Reactive Audio System 1.0.
 * Entirely original procedurally synthesized soundtrack. No samples, network or timers.
 * Gameplay calls tick() from requestAnimationFrame; notes use AudioContext time and a
 * bounded 90 ms scheduling window. Never drives/changes the game's speed or rules.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports ? require('../core/config.js') : root.ChromaConfig;
  const api=factory(config.AUDIO);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaAudio=api;
})(typeof window!=='undefined'?window:null,function(AUDIO){
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const midi=n=>440*Math.pow(2,(n-69)/12);
  const PHASE_MIX=Object.freeze({BUILD:.74,PEAK:1,FADE:.58,RELAX:.30});
  // Original four-bar harmony / phrases; not samples from another game or song.
  const ROOTS=Object.freeze([38,34,29,36]); // D, B-flat, F, C (bass register)
  const MELODY=Object.freeze([0,7,10,12,7,5,3,7, 0,3,7,10,12,10,7,5]);

  class ReactiveAudioSystem {
    constructor({scope=typeof window!=='undefined'?window:{},enabled=true}={}){
      this.scope=scope;this.enabled=Boolean(enabled);this.playing=false;
      this.context=null;this.musicBus=null;this.effectsBus=null;this.master=null;
      this.phase='BUILD';this.speed=370;this.zone=1;this.flow=0;this.hp=100;
      this.stepIndex=0;this.nextStepAt=0;this.scheduledSteps=0;
    }
    get available(){return Boolean(this.scope.AudioContext||this.scope.webkitAudioContext)}
    get bpm(){return clamp(AUDIO.startBpm+(this.speed-370)*AUDIO.bpmPerSpeed,AUDIO.startBpm,AUDIO.maxBpm)}
    get layerMix(){
      const flow=clamp(this.flow,0,100)/100;
      return clamp((PHASE_MIX[this.phase]??.7)*(.78+flow*.22),.15,1);
    }
    init(){
      if(this.context)return true;
      const Ctor=this.scope.AudioContext||this.scope.webkitAudioContext;
      if(!Ctor||!this.enabled)return false;
      try{
        const context=new Ctor();
        const master=context.createGain(),music=context.createGain(),effects=context.createGain();
        master.gain.value=AUDIO.masterGain;
        music.gain.value=0;effects.gain.value=0;
        music.connect(master);effects.connect(master);master.connect(context.destination);
        this.context=context;this.master=master;this.musicBus=music;this.effectsBus=effects;
        return true;
      }catch(_){return false}
    }
    unlock(){
      if(!this.enabled||!this.init())return false;
      try{if(this.context.state==='suspended'){
        const promise=this.context.resume();if(promise&&typeof promise.catch==='function')promise.catch(()=>{});
      }}catch(_){}
      return true;
    }
    _gain(node,target,time=.055){
      if(!node||!this.context)return;
      const now=this.context.currentTime;
      try{node.gain.cancelScheduledValues(now);node.gain.setTargetAtTime(Math.max(0,target),now,time)}catch(_){}
    }
    _updateMix(){
      if(!this.context)return;
      this._gain(this.musicBus,this.enabled&&this.playing?AUDIO.musicGain*this.layerMix:0,.08);
      this._gain(this.effectsBus,this.enabled?AUDIO.effectsGain:0,.025);
    }
    start(){
      this.playing=true;this.phase='BUILD';this.speed=370;this.zone=1;this.flow=0;this.hp=100;
      this.stepIndex=0;this.scheduledSteps=0;
      this.unlock();this.nextStepAt=this.context?this.context.currentTime+.04:0;
      this._updateMix();
    }
    pause(){
      this.playing=false;this._updateMix();
      if(this.context)this.nextStepAt=this.context.currentTime+.045;
    }
    resume(){
      this.playing=true;this.unlock();
      if(this.context)this.nextStepAt=this.context.currentTime+.04;
      this._updateMix();
    }
    stop(){this.playing=false;this._updateMix()}
    setEnabled(value){
      this.enabled=Boolean(value);
      if(this.enabled){this.unlock();if(this.context)this.nextStepAt=this.context.currentTime+.04;}
      this._updateMix();return this.enabled;
    }
    tick({phase='BUILD',speed=370,flow=0,zone=1,hp=100}={}){
      this.phase=phase;this.speed=Number.isFinite(speed)?speed:370;
      this.flow=clamp(Number.isFinite(flow)?flow:0,0,100);
      this.zone=Math.max(1,Math.floor(Number.isFinite(zone)?zone:1));
      this.hp=hp;
      if(!this.enabled||!this.playing||!this.context||this.context.state!=='running')return;
      this._updateMix();
      const now=this.context.currentTime;
      if(this.nextStepAt<now-.16)this.nextStepAt=now+.025; // background/throttled frame guard
      const eighth=30/this.bpm;
      let scheduled=0;
      while(this.nextStepAt<=now+AUDIO.lookaheadSeconds&&scheduled<AUDIO.maxStepsPerFrame){
        this._scheduleStep(this.stepIndex,this.nextStepAt,eighth);
        this.nextStepAt+=eighth;this.stepIndex++;this.scheduledSteps++;scheduled++;
      }
    }
    // One oscillator and short-lived gain envelope per voice; nodes disconnect on end.
    _voice(note,at,duration,amount,type='sine',bus=this.musicBus,endNote=null){
      if(!this.context||!bus||amount<=0)return;
      const t=Math.max(at,this.context.currentTime),dur=Math.max(.025,duration);
      const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
      const frequency=value=>typeof value==='object'?value.hz:midi(value);
      const startFreq=frequency(note);
      const endFreq=endNote===null?null:frequency(endNote);
      osc.type=type;osc.frequency.setValueAtTime(Math.max(25,startFreq),t);
      if(endFreq!==null)osc.frequency.exponentialRampToValueAtTime(Math.max(25,endFreq),t+dur*.75);
      gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amount),t+Math.min(.024,dur*.19));
      gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
      osc.connect(gain);gain.connect(bus);
      osc.start(t);osc.stop(t+dur+.015);
      osc.onended=()=>{try{osc.disconnect();gain.disconnect()}catch(_){}};
    }
    _scheduleStep(step,at,eighth){
      const phase=this.phase,flow=this.flow,zone=this.zone;
      const root=ROOTS[(Math.floor(step/8)+zone-1)%ROOTS.length];
      const beat=step%8,index=step%16;
      const peak=phase==='PEAK',relax=phase==='RELAX';
      // Four independent layers whose density responds to Director + Flow.
      if(beat%2===0 && (!relax||beat===0)){
        this._voice({hz:118},at,.19,peak?.24:.20,'sine',this.musicBus,{hz:49}); // electronic kick
        this._voice(root,at,eighth*(relax?1.7:1.18),peak?.15:.12,'triangle'); // bass
      }
      if(beat%2===1&&(peak||phase==='BUILD'||flow>=35)&&!relax){
        this._voice({hz:1700},at,.026,peak?.045:.027,'triangle'); // hi-hat tick
      }
      if(beat===0){
        this._voice(root+12,at,eighth*6.5,.023,'sine');
        this._voice(root+19,at,eighth*6.5,.014,'triangle'); // ambient two-voice pad
      }
      const arpEnabled=peak||flow>=65;
      if(arpEnabled&&!relax&&(peak||beat%2===0)){
        this._voice(root+24+MELODY[index],at+.008,eighth*.58,flow>=90?.061:.039,'triangle');
      }
      if(peak&&flow>=90&&beat===7){
        this._voice(root+36+MELODY[index],at,eighth*.8,.031,'sine');
      }
    }
    effect(kind){
      if(!this.enabled||!this.context||this.context.state!=='running')return;
      const at=this.context.currentTime+.005;
      const fx=(note,duration,level,type='sine',end=null,delay=0)=>
        this._voice({hz:note},at+delay,duration,level,type,this.effectsBus,end===null?null:{hz:end});
      switch(kind){
        case 'jump': fx(380,.13,.16,'triangle',670);break;
        case 'duck': fx(280,.105,.13,'sine',146);break;
        case 'land': fx(155,.09,.08,'sine',100);break;
        case 'hit': fx(210,.21,.28,'sawtooth',62);fx(85,.22,.12,'sine',45,.055);break;
        case 'zone': fx(350,.18,.12,'triangle',620);fx(520,.20,.09,'sine',860,.10);break;
        case 'score': fx(720,.055,.041,'sine',920);break;
        case 'flow': fx(600,.14,.10,'triangle',830);fx(860,.14,.06,'sine',1060,.065);break;
        case 'perfect':fx(540,.24,.16,'triangle',850);fx(720,.23,.10,'sine',1100,.11);fx(1040,.30,.07,'sine',1320,.23);break;
        case 'warning':fx(495,.095,.075,'triangle',390);break;
        case 'start':fx(420,.13,.10,'triangle',620);fx(620,.18,.09,'sine',930,.115);break;
        case 'gameover':fx(190,.32,.12,'sine',80);break;
        default:break;
      }
    }
  }
  return {ReactiveAudioSystem,PHASE_MIX,ROOTS};
});
