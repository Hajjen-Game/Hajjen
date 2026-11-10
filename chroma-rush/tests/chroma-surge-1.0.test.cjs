const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ChromaSurge,WINDOW_SECONDS,MAX_CHAIN}=require('../src/gameplay/chroma-surge.js');
const {ReactiveAudioSystem}=require('../src/audio/reactive-audio.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {GAME}=require('../src/core/config.js');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Surge waits for the real palette crossing, not the early zone charge',()=>{
  const s=new ChromaSurge();
  assert.equal(WINDOW_SECONDS,4.8);
  assert.equal(s.onClear({kind:'jump'}),null);
  s.arm({zone:3});
  s.tick(.8);assert.equal(s.active,false);
  assert.equal(s.activate(),true);
  assert.equal(s.activate(),false);
  assert.equal(s.zone,3);
  assert.equal(s.remaining,WINDOW_SECONDS);
});

test('real successful movement earns bounded Surge chains; decorative clears do not',()=>{
  const s=new ChromaSurge();s.arm({zone:3});s.activate();
  assert.equal(s.onClear({kind:'jump'}).points,95);
  assert.equal(s.onClear({kind:'duck',precision:true}).points,165);
  assert.equal(s.onClear({kind:'gap'}).points,165);
  assert.equal(s.onClear({kind:'dash-duck',master:true}).points,225);
  assert.equal(s.points,650);
  assert.equal(s.onClear({kind:'gap'}).chain,MAX_CHAIN);
  assert.equal(s.onClear({kind:'unknown'}),null);
  assert.equal(s.onClear({kind:'jump',protectedClear:true}),null);
});

test('hit resets only Surge streak and the 4.8s timer never advances when paused',()=>{
  const s=new ChromaSurge();s.arm({zone:5});s.activate();
  s.onClear({kind:'jump'});s.onClear({kind:'duck'});
  assert.equal(s.onHit(),true);assert.equal(s.chain,0);
  assert.equal(s.onClear({kind:'gap'}).chain,1);
  assert.equal(s.bestChain,2);
  s.tick(0);s.tick(-5);assert.equal(s.remaining,WINDOW_SECONDS);
  assert.equal(s.tick(WINDOW_SECONDS),'complete');
  assert.equal(s.active,false);assert.equal(s.onClear({kind:'duck'}),null);
  s.reset();assert.equal(s.count,0);
});

test('HIGH draws more layered lines and reduced motion draws none, with no opaque flash',()=>{
  const s=new ChromaSurge();s.arm({zone:3});s.activate();s.tick(.4);
  const draw=()=>{
    const calls=[];const ctx={save(){calls.push('save')},restore(){calls.push('restore')},
      beginPath(){},moveTo(){},lineTo(){},stroke(){calls.push('stroke')},
      fillRect(){throw Error('no fill')},arc(){throw Error('no rings')}};
    return {calls,ctx};
  };
  const hi=draw(),lo=draw(),reduce=draw();
  s.draw(hi.ctx,{quality:{density:1,glow:1}});
  s.draw(lo.ctx,{quality:{density:.3,glow:.15}});
  s.draw(reduce.ctx,{quality:{density:1,glow:1},reducedMotion:true});
  assert.ok(hi.calls.filter(x=>x==='stroke').length>lo.calls.filter(x=>x==='stroke').length);
  assert.equal(hi.calls[0],'save');assert.equal(hi.calls.at(-1),'restore');
  assert.deepEqual(reduce.calls,[]);
});

test('new original beat accents lift Surge music but cannot change speed or BPM',()=>{
  const a=new ReactiveAudioSystem({scope:{}});
  const calls=[];a._voice=(...args)=>calls.push(args);
  a.phase='RELAX';a.speed=1000;a.zone=3;
  const oldMix=a.layerMix,oldBpm=a.bpm;
  a._scheduleStep(2,0,.23);const baseline=calls.length;
  calls.length=0;a.surgeActive=true;a._scheduleStep(2,0,.23);
  assert.ok(calls.length>=baseline+2);
  assert.ok(a.layerMix>oldMix);
  assert.equal(a.bpm,oldBpm);
  a.context={state:'running',currentTime:0};a.effectsBus={};
  calls.length=0;a.effect('surge-start');assert.equal(calls.length,3);
  calls.length=0;a.effect('surge-clear');assert.equal(calls.length,2);
  assert.equal(GAME.midgameSpeedGain,460);
});

test('audit reports local surge statistics and stays in v3 format',()=>{
  const a=new RoundAudit(),st={time:24,zone:3,hp:100,speed:569,score:5000,flow:70,phase:'PEAK'};
  a.record('surge_start',st,{zone:3,duration:WINDOW_SECONDS});
  a.record('surge_clear',st,{kind:'jump',bonusPoints:95,chain:1});
  a.record('surge_clear',st,{kind:'duck',bonusPoints:165,chain:2});
  a.record('surge_break',st,{cause:'gap'});
  a.record('surge_end',st,{zone:3,clears:2,totalPoints:260});
  const out=a.snapshot();
  assert.equal(out.version,3);
  assert.equal(out.summary.surge.started,1);
  assert.equal(out.summary.surge.completed,1);
  assert.equal(out.summary.surge.clears,2);
  assert.equal(out.summary.surge.bonusPoints,260);
  assert.equal(out.summary.surge.breaks,1);
  assert.equal(out.summary.surge.bestChain,2);
  assert.equal(out.build,'endless-escalation-director-4.0');
});

test('actual game wires Surge to player-crossing and real clears only',()=>{
  const game=src('src/gameplay/game.js'),html=src('index.html');
  assert.match(html,/chroma-surge\.js\?v=phase-2-chroma-surge-1\.0/);
  assert.match(html,/id="surge-indicator"/);
  assert.match(game,/if\(incoming!==outgoing\)\{\s*surge\.arm\(\{zone\}\)/);
  assert.match(game,/if\(!animated\)startSurge\(\)/);
  assert.match(game,/spectralWave\.tick\(dt,[\s\S]+?if\(!startSurge\(\)/);
  assert.match(game,/awardSurge\(o\.type,\{precision,master:graded\.master\}\)/);
  assert.match(game,/awardSurge\(gap\.echoChallenge\?'echo-gap':'gap'\)/);
  assert.match(game,/surge\.draw\(ctx/);
  assert.doesNotMatch(game,/surge\.spawn\(/);
});
