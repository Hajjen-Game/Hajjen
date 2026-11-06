const test=require('node:test');
const assert=require('node:assert/strict');
const {ReactiveAudioSystem,PHASE_MIX}=require('../src/audio/reactive-audio.js');
const {AUDIO}=require('../src/core/config.js');

function fakeContext(){
  const stats={contexts:0,oscillators:[],gains:[],connections:0,resumes:0};
  class Param{
    constructor(){this.value=0;this.target=0}
    setValueAtTime(value){this.value=value}
    exponentialRampToValueAtTime(value){this.value=value}
    cancelScheduledValues(){}
    setTargetAtTime(value){this.target=value}
  }
  class Node{
    constructor(){this.gain=new Param();this.frequency=new Param()}
    connect(){stats.connections++}
    disconnect(){}
    start(){}
    stop(){}
  }
  class Context{
    constructor(){stats.contexts++;this.currentTime=0;this.state='running';this.destination=new Node()}
    createGain(){const n=new Node();stats.gains.push(n);return n}
    createOscillator(){const n=new Node();stats.oscillators.push(n);return n}
    resume(){stats.resumes++;this.state='running';return Promise.resolve()}
  }
  return {scope:{AudioContext:Context},stats};
}
const info=(phase='BUILD',speed=370,flow=0,zone=1)=>({phase,speed,flow,zone,hp:100});

test('never creates AudioContext or sounds before the first user gesture',()=>{
  const {scope,stats}=fakeContext();const a=new ReactiveAudioSystem({scope});
  a.tick(info());a.effect('jump');
  assert.equal(stats.contexts,0);
  a.start();assert.equal(stats.contexts,1);
  assert.equal(a.playing,true);
});

test('original layered music schedules bounded voices from gameplay frames',()=>{
  const {scope,stats}=fakeContext();const a=new ReactiveAudioSystem({scope});
  a.start();a.tick(info());const count=stats.oscillators.length;
  assert.ok(count>=3 && count<=10,`voices ${count}`);
  assert.equal(a.scheduledSteps,1);
  for(let i=0;i<100;i++){a.context.currentTime+=.016;a.tick(info('PEAK',850,95,6))}
  assert.ok(a.scheduledSteps>=4);
  assert.ok(a.bpm>110&&a.bpm<=AUDIO.maxBpm);
  assert.equal(a.phase,'PEAK');
  assert.ok(a.layerMix>PHASE_MIX.RELAX);
  assert.ok(stats.oscillators.length<500,'voice creation not bounded');
});

test('Director recovery thins music and Chroma Flow raises its intensity',()=>{
  const {scope}=fakeContext();const a=new ReactiveAudioSystem({scope});a.start();
  a.tick(info('PEAK',720,95));const peak=a.layerMix;
  a.tick(info('RELAX',720,95));const relax=a.layerMix;
  assert.ok(peak>relax);
  a.tick(info('BUILD',720,0));const plain=a.layerMix;
  a.tick(info('BUILD',720,90));assert.ok(a.layerMix>plain);
});

test('music stops on pause/death, resumes without catching up a huge step backlog',()=>{
  const {scope,stats}=fakeContext(),a=new ReactiveAudioSystem({scope});
  a.start();a.tick(info());const before=a.scheduledSteps;
  a.pause();a.context.currentTime+=25;a.tick(info('PEAK',800,100,7));
  assert.equal(a.scheduledSteps,before);
  assert.equal(a.musicBus.gain.target,0);
  a.resume();a.tick(info('PEAK',800,100,7));
  a.context.currentTime+=.06;a.tick(info('PEAK',800,100,7));
  assert.ok(a.scheduledSteps>before);
  const after=a.scheduledSteps;
  a.stop();a.context.currentTime+=1;a.tick(info());
  assert.equal(a.scheduledSteps,after);
  assert.ok(stats.oscillators.length>0);
});

test('mute silences music AND effects; re-enable resumes without accumulating scheduled notes',()=>{
  const {scope,stats}=fakeContext(),a=new ReactiveAudioSystem({scope});
  a.start();a.tick(info());a.effect('jump');const before=stats.oscillators.length;
  a.setEnabled(false);
  assert.equal(a.musicBus.gain.target,0);assert.equal(a.effectsBus.gain.target,0);
  a.context.currentTime+=8;a.tick(info('PEAK',900,100,9));a.effect('hit');
  assert.equal(stats.oscillators.length,before);
  a.setEnabled(true);a.context.currentTime+=.06;a.tick(info('PEAK',900,100,9));
  assert.ok(stats.oscillators.length>before);
});

test('Perfect Zone, zone transition, damage and high Flow have distinct cues',()=>{
  const {scope,stats}=fakeContext(),a=new ReactiveAudioSystem({scope});a.start();
  const before=stats.oscillators.length;a.effect('zone');
  const zone=stats.oscillators.length-before;a.effect('perfect');
  const perfect=stats.oscillators.length-before-zone;
  a.effect('hit');a.effect('flow');
  assert.equal(zone,2);assert.equal(perfect,3);
  assert.ok(stats.oscillators.length>before+5);
});

test('no AudioContext support is safe: mute, start, audio events, pause, resume',()=>{
  const a=new ReactiveAudioSystem({scope:{AudioContext:undefined}});
  assert.equal(a.available,false);
  assert.doesNotThrow(()=>{a.start();a.tick(info());a.effect('perfect');a.pause();a.resume();a.setEnabled(false);a.setEnabled(true);a.stop();});
  assert.equal(a.context,null);
});

test('entry point loads independent audio module before the gameplay engine',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const audio=scripts.indexOf('src/audio/reactive-audio.js?v=audio-1.1');
  const engine=scripts.indexOf('src/gameplay/game.js?v=performance-1.0');
  assert.ok(audio>0 && engine>audio);
  assert.ok(scripts.every(src=>fs.existsSync(path.join(root,src.split('?')[0]))));
});
