/* CHROMA RUSH — Reactive Audio System 1.1 — mobile audibility.
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
      this.musicEnabled=true;this.effectsEnabled=true;this.effectsVolume=1;
      this.context=null;this.musicBus=null;this.effectsBus=null;this.master=null;
      this.phase='BUILD';this.speed=370;this.zone=1;this.flow=0;this.hp=100;
      this.chromaActive=false;
      this.stepIndex=0;this.nextStepAt=0;this.scheduledSteps=0;
    }
    get available(){return Boolean(this.scope.AudioContext||this.scope.webkitAudioContext)}
    // A stored "sound on" preference alone does not mean audio is actually running.
    get playbackState(){
      if(!this.enabled)return 'muted';
      if(!this.available)return 'unsupported';
      if(!this.context)return 'ready';
      if(this.context.state==='running')return this.playing?'playing':'ready';
      return this.context.state==='closed'?'unsupported':'blocked';
    }
    get bpm(){return clamp(AUDIO.startBpm+(this.speed-370)*AUDIO.bpmPerSpeed,AUDIO.startBpm,AUDIO.maxBpm)}
    get layerMix(){
      const flow=clamp(this.flow,0,100)/100;
      return clamp((PHASE_MIX[this.phase]??.7)*(.78+flow*.22)*(this.chromaActive?1.055:1),.15,1);
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
      try{
        // Safari can report "interrupted" as well as "suspended".
        if(this.context.state!=='running'&&this.context.state!=='closed'){
          const promise=this.context.resume();
          if(promise&&typeof promise.catch==='function')promise.catch(()=>{});
        }
      }catch(_){}
      return true;
    }
    _gain(node,target,time=.055){
      if(!node||!this.context)return;
      const now=this.context.currentTime;
      try{
        node.gain.cancelScheduledValues(now);
        node.gain.setTargetAtTime(Math.max(0,target),now,time);
      }catch(_){try{node.gain.value=Math.max(0,target)}catch(__){}}
    }
    _updateMix(){
      if(!this.context)return;
      this._gain(this.musicBus,this.enabled&&this.musicEnabled&&this.playing?AUDIO.musicGain*this.layerMix:0,.08);
      this._gain(this.effectsBus,this.enabled&&this.effectsEnabled?AUDIO.effectsGain*this.effectsVolume:0,.025);
    }
    start(){
      this.playing=true;this.phase='BUILD';this.speed=370;this.zone=1;this.flow=0;this.hp=100;
      this.chromaActive=false;
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
    setMusicEnabled(value){
      this.musicEnabled=Boolean(value);
      if(this.musicEnabled&&this.playing){
        this.unlock();if(this.context)this.nextStepAt=this.context.currentTime+.04;
      }
      this._updateMix();return this.musicEnabled;
    }
    setEffectsEnabled(value){
      this.effectsEnabled=Boolean(value);
      this._updateMix();return this.effectsEnabled;
    }
    setEffectsVolume(value){
      this.effectsVolume=clamp(Number.isFinite(value)?value:1,0,1);
      this._updateMix();return this.effectsVolume;
    }
    tick({phase='BUILD',speed=370,flow=0,chromaActive=null,zone=1,hp=100}={}){
      this.phase=phase;this.speed=Number.isFinite(speed)?speed:370;
      this.flow=clamp(Number.isFinite(flow)?flow:0,0,100);
      this.chromaActive=typeof chromaActive==='boolean'?chromaActive:this.flow>=90;
      this.zone=Math.max(1,Math.floor(Number.isFinite(zone)?zone:1));
      this.hp=hp;
      if(!this.enabled||!this.musicEnabled||!this.playing||!this.context||this.context.state!=='running')return;
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
      // Kick with an upper-octave bass voice: the original sub-bass was
      // too quiet on small phone speakers.
      if(beat%2===0&&(!relax||beat===0)){
        this._voice({hz:118},at,.18,peak?.22:.17,'sine',this.musicBus,{hz:53});
        this._voice(root+12,at,eighth*1.18,peak?.19:.16,'triangle');
        if(!relax)this._voice(root+24,at,eighth*.76,.067,'sine');
      }
      // Crisp highs and backbeat are audible from the FIRST zone.
      if(!relax&&beat%2===1)this._voice({hz:1850},at,.034,peak?.074:.052,'triangle');
      if(!relax&&(beat===2||beat===6))
        this._voice({hz:470},at,.085,peak?.09:.068,'triangle',this.musicBus,{hz:215});
      // Midrange harmony stays audible even during a calm section.
      if(beat===0){
        this._voice(root+24,at,eighth*5.9,relax?.055:.072,'sine');
        this._voice(root+31,at,eighth*5.9,relax?.024:.038,'triangle');
      }
      // Original motif in a phone-friendly 500–1200 Hz register.
      // BUILD plays every second eighth, PEAK every eighth.
      if(!relax&&(peak||beat%2===0)){
        const lead=.085+(peak?.026:0)+(flow/100)*.028;
        this._voice(root+36+MELODY[index],at+.009,eighth*(peak?.55:.78),lead,'triangle');
      }
      // Chroma's extra shimmer is lightly syncopated, and stays present
      // in BUILD/FADE instead of disappearing between Director peaks.
      if(this.chromaActive&&!relax&&(beat===3||beat===7)){
        this._voice(root+48+MELODY[index],at+.02,eighth*.55,peak?.045:.031,'sine');
      }
    }
    effect(kind){
      if(!this.enabled||!this.effectsEnabled||this.effectsVolume<=0||!this.context||this.context.state!=='running')return;
      const at=this.context.currentTime+.005;
      const fx=(note,duration,level,type='sine',end=null,delay=0)=>
        this._voice({hz:note},at+delay,duration,level,type,this.effectsBus,end===null?null:{hz:end});
      switch(kind){
        case 'jump': fx(380,.13,.16,'triangle',670);break;
        case 'echo':
          // A bright two-stage upward snap distinct from the ordinary jump.
          fx(390,.12,.11,'triangle',740);
          fx(730,.19,.082,'sine',1050,.065);break;
        case 'duck': fx(280,.105,.13,'sine',146);break;
        case 'land': fx(155,.09,.08,'sine',100);break;
        case 'hit': fx(210,.21,.28,'sawtooth',62);fx(85,.22,.12,'sine',45,.055);break;
        case 'gravity-warning':
          // Two quiet upward impulses announce a ceiling/floor reversal.
          fx(215,.16,.067,'triangle',440);
          fx(370,.16,.052,'sine',630,.095);break;
        case 'gravity-shift':
          // Original mirrored-frequency sweep, never a prolonged alarm.
          fx(760,.28,.11,'sine',170);
          fx(250,.32,.075,'triangle',630,.12);break;
        case 'zone-charge':
          // Soft original rising sub-pulse, kept quieter than damage/perfect.
          fx(190,.18,.053,'sine',310);fx(390,.17,.038,'triangle',570,.075);break;
        case 'zone': fx(350,.18,.12,'triangle',620);fx(520,.20,.09,'sine',860,.10);break;
        case 'score': fx(720,.055,.041,'sine',920);break;
        case 'flow': fx(600,.14,.10,'triangle',830);fx(860,.14,.06,'sine',1060,.065);break;
        case 'combo': fx(660,.11,.07,'triangle',940);
          fx(880,.14,.055,'sine',1100,.045);break;
        case 'chroma':
          // A short three-voice ascending activation cue (original synthesis).
          // Separate from zone/perfect cues, bounded and non-looping.
          fx(480,.18,.12,'triangle',710);
          fx(690,.21,.095,'sine',950,.085);
          fx(900,.27,.072,'triangle',1220,.18);break;
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
