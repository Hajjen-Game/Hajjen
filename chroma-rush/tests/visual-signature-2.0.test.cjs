/* CHROMA RUSH — Phase 2 visual-first signature; meaningful with audio muted. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ChromaSurge,WINDOW_SECONDS,MAX_CHAIN}=require('../src/gameplay/chroma-surge.js');
const {GAME}=require('../src/core/config.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const canvas=()=>{
  const lines=[],events=[];let from=null;
  const ctx={save(){events.push('save')},restore(){events.push('restore')},
    beginPath(){from=null},moveTo(x,y){from=[x,y]},
    lineTo(x,y){lines.push([from,[x,y]])},stroke(){events.push('stroke')},
    arc(){throw Error('No ring-shaped FX')},
    fillRect(){throw Error('No opaque obstacle-like rectangles')},
    ellipse(){throw Error('No oval FX')},
    createRadialGradient(){throw Error('No full-screen radial flash')}
  };
  return {ctx,lines,events};
};
test('palette crossing earns a full 7-second skill window, independent of soundtrack',()=>{
  const s=new ChromaSurge();assert.equal(WINDOW_SECONDS,7);
  s.arm({zone:3});s.tick(1);
  assert.equal(s.progress,0);
  assert.equal(s.activate(),true);
  assert.equal(s.progress,1);
  s.tick(2.75);
  assert.ok(s.progress>.60&&s.progress<.61);
  assert.equal(s.onClear({kind:'jump'}).points,95);
  assert.equal(s.onClear({kind:'duck',precision:true}).points,165);
  assert.equal(s.chain,2);
  assert.equal(s.points,260);
  assert.equal(s.tick(4.25),'complete');
  assert.equal(s.progress,0);
  assert.equal(s.onClear({kind:'jump'}),null);
  assert.equal(MAX_CHAIN,4);
});

test('premium cube wake has more layers on HIGH, follows ducked cube and stays strictly behind incoming hazards',()=>{
  const s=new ChromaSurge();s.arm({zone:5});s.activate();s.tick(.55);
  s.onClear({kind:'jump'});s.onClear({kind:'duck'});
  const high=canvas(),low=canvas();
  s.drawRunner(high.ctx,{x:350,feet:515,bodyWidth:66,bodyHeight:21,
    primary:'#23ddfa',secondary:'#c56df7',quality:{density:1,glow:1}});
  s.drawRunner(low.ctx,{x:350,feet:515,bodyWidth:66,bodyHeight:21,
    primary:'#23ddfa',secondary:'#c56df7',quality:{density:.36,glow:.24}});
  assert.ok(high.lines.length>=11,high.lines.length);
  assert.ok(low.lines.length>=5,low.lines.length);
  assert.ok(high.lines.length>low.lines.length);
  for(const [a,b] of high.lines){
    assert.ok(a.every(Number.isFinite)&&b.every(Number.isFinite));
    assert.ok(a[0]<350&&b[0]<350,'glow must be behind the character, never ahead of the next hazard');
    assert.ok(a[1]>=494&&a[1]<=515,'trailing wake must follow Duck compression');
  }
  assert.equal(high.events.at(0),'save');
  assert.equal(high.events.at(-1),'restore');
});

test('Surge wake grows after successful clears; no visual reward can alter input, HP, speed or obstacle geometry',()=>{
  const s=new ChromaSurge();s.arm({zone:3});s.activate();s.tick(.6);
  const before=canvas();s.drawRunner(before.ctx,{x:320,feet:500,quality:{density:1,glow:1}});
  s.onClear({kind:'jump'});
  s.onClear({kind:'duck'});
  const after=canvas();s.drawRunner(after.ctx,{x:320,feet:500,quality:{density:1,glow:1}});
  assert.ok(after.lines.length>before.lines.length,'a real clear triggers extra white lines');
  const reduced=canvas();s.drawRunner(reduced.ctx,{reducedMotion:true});
  assert.deepEqual(reduced.events,[]);
  assert.deepEqual(reduced.lines,[]);
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.duckDuration,.55);
  assert.equal(GAME.damagePerHit,25);
  assert.ok(!('spawn' in s)&&!('velocity' in s));
});

test('a compact, always-audible-independent HUD shows the chain, extra score and countdown bar',()=>{
  const html=read('index.html'),game=read('src/gameplay/game.js'),css=read('style.css');
  for(const id of ['surge-indicator','surge-label','surge-bonus','surge-meter','surge-meter-fill'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/surge-meter" class="surge-meter" role="progressbar"/);
  assert.match(game,/surge\.progress\*100/);
  assert.match(game,/\$\.surgeBonus\.textContent=surge\.points>0/);
  assert.match(game,/\$\.surgeFill\.style\.background=/);
  assert.match(game,/surge\.drawRunner\(ctx/);
  const drawBefore=game.indexOf('surge.drawRunner(ctx');
  const hazardDraw=game.indexOf('for(const o of hurdles)drawObstacle(o)');
  assert.ok(drawBefore>0&&hazardDraw>drawBefore,
    'the player-specific wake must be drawn before the hazards');
  assert.match(css,/#hud \.surge-meter/);
  assert.doesNotMatch(css,/#surge-indicator\s*\{[^}]*position:\s*fixed/);
  assert.match(html,/LATEST UPDATE · VISUAL SIGNATURE 2\.0/);
});

test('Surge is a visual score layer and never changes Endless Escalation 4.0',()=>{
  const game=read('src/gameplay/game.js'),src=read('src/gameplay/chroma-surge.js');
  assert.match(game,/surge\.arm\(\{zone\}\)/);
  assert.match(game,/if\(!animated\)startSurge\(\)/);
  assert.match(game,/if\(!startSurge\(\)&&zoneSoundAtCrossing\)sound\('zone'\)/);
  assert.match(game,/score\+=outcome\.points/);
  assert.doesNotMatch(src,/director\.registerDamage|terrainDirector\.prepare|GAME\.speedAt/);
  const director=read('src/director/adaptive-director.js');
  assert.match(director,/function escalationFloor\(/);
  assert.match(director,/this\.escalation\.attacks\+\+/);
  assert.equal(GAME.lateAcceleration,2.3);
  assert.equal(GAME.zoneSeconds,12);
});
