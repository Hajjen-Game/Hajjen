const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {FlowSystem}=require('../src/gameplay/flow.js');
const {FLOW}=require('../src/core/config.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {ReactiveAudioSystem}=require('../src/audio/reactive-audio.js');
const fill=(flow,n=20)=>{for(let i=0;i<n;i++)flow.registerClear()};
const near=(value,expected,tolerance=1e-8)=>assert.ok(Math.abs(value-expected)<tolerance,
  'expected '+expected+', got '+value);

test('Flow 1.2 reduces maximum-pressure decay without changing its smooth formula',()=>{
 const f=new FlowSystem();fill(f);
 assert.equal(f.value,100);
 f.tick(2,{phase:'BUILD'});
 const expected=65+35*Math.exp(-(FLOW.highFlowPressurePerSecond/35)*2);
 near(f.value,expected);
 assert.ok(f.value>95,'a perfect player should retain meaningful high-tier reward');
 assert.equal(FLOW.highFlowPressurePerSecond,2.5);
});

test('pressure is frame-rate independent and no physics progress happens while paused',()=>{
 const coarse=new FlowSystem(),fine=new FlowSystem();fill(coarse);fill(fine);
 coarse.tick(2,{phase:'FADE'});
 for(let i=0;i<120;i++)fine.tick(1/60,{phase:'FADE'});
 near(coarse.value,fine.value,1e-8);
 const before=coarse.value;
 coarse.tick(0,{phase:'RELAX'});
 assert.equal(coarse.value,before);
});

test('Director recovery eases pressure but never makes Flow rise for free',()=>{
 const peak=new FlowSystem(),fade=new FlowSystem(),relax=new FlowSystem();
 for(const f of [peak,fade,relax])fill(f);
 peak.tick(2,{phase:'PEAK'});
 fade.tick(2,{phase:'FADE'});
 relax.tick(2,{phase:'RELAX'});
 assert.ok(peak.value<fade.value && fade.value<relax.value);
 assert.ok(relax.value<100,'recovery is not a free refill');
 assert.ok(FLOW.relaxPressureScale>0);
});

test('idle drain has an exact grace boundary and RELAX reduces long-gap penalty',()=>{
 const f=new FlowSystem();f.registerClear();
 f.tick(3.49);assert.equal(f.value,5);
 f.tick(.02);
 near(f.value,5-FLOW.decayPerSecond*.01,1e-8);
 const active=new FlowSystem(),recovery=new FlowSystem();fill(active);fill(recovery);
 active.tick(5,{phase:'BUILD'});recovery.tick(5,{phase:'RELAX'});
 assert.ok(recovery.value>active.value);
 assert.ok(recovery.value<100);
});

test('Chroma enters at 90 and exits below 87, not on every small fluctuation',()=>{
 const f=new FlowSystem();fill(f,18);assert.equal(f.value,90);
 assert.equal(f.tier,3);assert.equal(f.multiplier,2);
 f.tick(1,{phase:'BUILD'});
 assert.ok(f.value<90 && f.value>87);
 assert.equal(f.tier,3);assert.equal(f.stateName,'CHROMA STATE');
 assert.equal(f.registerClear().earnedPoints,270,'grace preserves the earned score tier');
 f.tick(6,{phase:'PEAK'});
 assert.ok(f.value<87);
 assert.equal(f.tier,2);assert.equal(f.multiplier,1.5);
});

test('damage still knocks a Chroma player out immediately; reset clears grace',()=>{
 const f=new FlowSystem();fill(f);
 assert.equal(f.tier,3);
 f.registerDamage();
 assert.equal(f.value,65);assert.equal(f.tier,2);
 assert.equal(f.streak,0);
 f.registerClear({precision:true});
 f.reset();
 assert.equal(f.value,0);assert.equal(f.tier,0);assert.equal(f.chromaActive,false);
});

test('a long recovery without clears eventually ends Chroma; perfect zones still need real clears',()=>{
 const f=new FlowSystem();fill(f);
 f.tick(25,{phase:'RELAX'});
 assert.equal(f.chromaActive,false);
 assert.ok(f.value<87);
 const empty=new FlowSystem();
 assert.equal(empty.completeZone({hp:60}).perfect,false);
 fill(empty,3);
 const result=empty.completeZone({hp:60});
 assert.equal(result.perfect,true);assert.equal(result.heal,10);
});

test('round audit counts actual Chroma tier while Flow is inside its grace window',()=>{
 const a=new RoundAudit();
 const state={time:0,zone:3,hp:100,score:100,flow:88.5,speed:750,distance:5000,
  phase:'RELAX',streak:8,chromaActive:true};
 a.tick(1,state);
 a.tick(1,state);
 assert.equal(a.snapshot().summary.chromaSeconds,2);
 assert.equal(a.snapshot().samples[0].chromaActive,true);
 a.tick(1,{...state,flow:90.2,chromaActive:false});
 assert.equal(a.snapshot().summary.chromaSeconds,2);
});

test('reactive audio observes Chroma latch rather than raw threshold, retaining legacy fallback',()=>{
 const audio=new ReactiveAudioSystem({scope:{},enabled:false});
 audio.tick({flow:88,chromaActive:true});
 assert.equal(audio.chromaActive,true);
 audio.tick({flow:92,chromaActive:false});
 assert.equal(audio.chromaActive,false);
 audio.tick({flow:92});assert.equal(audio.chromaActive,true);
});

test('the live game passes Director phase to Flow and exports actual Chroma status',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','src/gameplay/game.js'),'utf8');
 assert.ok(source.includes('flow.tick(dt,{phase:director.phase})'));
 assert.ok(source.includes('chromaActive:flow.tier===3'));
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.includes('src/gameplay/flow.js?v=flow-1.2'));
 assert.ok(html.includes('src/core/config.js?v=flow-1.2'));
});
