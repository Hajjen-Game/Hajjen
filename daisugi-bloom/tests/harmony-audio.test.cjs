"use strict";
// Harmony 4.2 Web Audio contracts: silent start, musical reward distinctness,
// preference toggle, cooldown, polyphony cap and cleanup. No browser needed.
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"../harmony/audio.js"),"utf8");
let clock=0,constructed=0;
const oscillators=[],rushes=[];
class FakeAudioContext{
 constructor(){constructed++;this.currentTime=0;this.destination={};this.state="running";this.sampleRate=44100;}
 createGain(){
  return {gain:{value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},disconnect(){}};
 }
 createBuffer(_channels,frames,rate){return {sampleRate:rate,getChannelData:()=>new Float32Array(frames)};}
 createBufferSource(){const source={started:false,stopped:false,connect(){},disconnect(){},start(){source.started=true},stop(){source.stopped=true;if(source.onended)source.onended()}};rushes.push(source);return source;}
 createBiquadFilter(){return {Q:{value:1},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 createOscillator(){
  const item={type:"sine",hz:0,started:false,stopped:false,frequency:{setValueAtTime(v){item.hz=v},exponentialRampToValueAtTime(v){item.endHz=v}},
   connect(){},disconnect(){},start(){item.started=true},stop(){
    item.stopped=true;if(item.onended)item.onended();
   }};
  oscillators.push(item);
  return item;
 }
 resume(){this.state="running";return Promise.resolve();}
}
const host={AudioContext:FakeAudioContext,performance:{now:()=>clock}};
vm.runInNewContext(source,{window:host,globalThis:host});
const audio=host.HarmonyAudio;
assert(audio&&typeof audio.play==="function","Audio facade must exist");
assert.equal(constructed,0,"No AudioContext should be created before user interaction");
assert.equal(audio.play("tap"),true);
assert.equal(constructed,1);
assert.equal(oscillators.length,1,"Tap should use one quiet transient voice");
const start=oscillators.length;
assert.equal(audio.play("tap"),false,"Duplicate taps should be rate-limited");
assert.equal(oscillators.length,start);
clock+=500;
assert.equal(audio.play("invalid"),true);
assert(oscillators.some(o=>o.hz===290),"Rejected move needs a muted descending cue");
clock+=500;
const beforeFusion=oscillators.length;
audio.play("fusion",{family:"sakura",stage:2,combo:4});
const familyNotes=oscillators.slice(beforeFusion).map(o=>o.hz);
assert(familyNotes.length>=2&&familyNotes.every(n=>n>=150),"Fusion should sound like layered bell/wood pitches");
clock+=500;
const beforePulse=oscillators.length;
audio.play("pulse",{wave:3});
assert(oscillators.slice(beforePulse).some(o=>Math.abs(o.hz-880)<.1),"Pulse should play a rising pentatonic note");
assert(oscillators.length<=8,"Mobile voice cap should be enforced");
// Hanabi must have its OWN audible cues, not silently reusing Pulse.
clock+=500;
const beforeLoad=oscillators.length;
assert.equal(audio.play("hanabi-load"),true);
assert(oscillators.slice(beforeLoad).some(o=>o.hz===305),
 "Crate intake needs an audible wooden contact");
assert.equal(audio.play("hanabi-load"),false,"A duplicated crate cue should be cooldown-limited");
clock+=500;
const beforeCharge=oscillators.length;
assert.equal(audio.play("hanabi-charge",{count:5}),true);
assert(oscillators.slice(beforeCharge).some(o=>o.endHz>=780),
 "Upward tile telegraph must contain a rising musical sweep");
clock+=500;
const beforeLaunch=oscillators.length,oldRushes=rushes.length;
assert.equal(audio.play("hanabi-launch"),true);
assert.equal(rushes.length,oldRushes+1,"Firework launch needs a real airy rush");
assert(oscillators.slice(beforeLaunch).some(o=>o.endHz>1300),
 "Firework should also have a clear ascending musical core");
assert(oscillators.slice(beforeLaunch).length>=3,
 "Glitter needs a small multi-tone sparkle tail");
assert.equal(audio.play("hanabi-launch"),false,
 "A chain of launches must not create duplicate layers inside the cooldown");
clock+=500;
const beforeDaruma=oscillators.length;
assert.equal(audio.play("daruma-awaken"),true,"Daruma must have a real audible completion cue");
assert(oscillators.slice(beforeDaruma).some(o=>o.hz===350),
 "Daruma awakening should begin with a soft wooden knock");
assert.equal(audio.play("daruma-awaken"),false,
 "Duplicate awakenings should obey the cooldown");
const count=oscillators.length;
audio.setEnabled(false);
assert.equal(audio.play("goal"),false,"Muted audio must stay silent");
assert.equal(oscillators.length,count);
assert(oscillators.every(o=>o.stopped)&&rushes.every(o=>o.stopped),
 "Disabling sound must immediately stop every tone AND noise source");
clock+=1000;
audio.setEnabled(true);
const beforeGoal=oscillators.length;
assert.equal(audio.play("goal"),true);
assert(oscillators.length>beforeGoal,"Audio should be re-enabled from settings");
assert(oscillators.slice(beforeGoal).length<=4,"Short celebration should respect voice budget");
audio.stop();
assert(oscillators.every(o=>o.stopped)&&rushes.every(o=>o.stopped),
 "Stopping must release all tones and Hanabi noise");
console.log("PASS Harmony 4.2 – gesture-safe audio, distinct cues, cooldowns, mute & bounded voices");
