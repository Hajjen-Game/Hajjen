const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const B=require('../src/gameplay/obstacle-balance.js');
const H=require('../src/gameplay/dash-hazards.js');
const {GAME,ECHO_SPIRE,TERRAIN}=require('../src/core/config.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {AdaptiveRushDirector,violatesSimpleChain,varietyMultiplier,
  MAX_SIMPLE_CHAIN}=require('../src/director/adaptive-director.js');
const P=require('../src/director/patterns.js');
const root=path.join(__dirname,'..');
const speed=z=>GAME.speedAt((z-1)*GAME.zoneSeconds,z);

test('Jump and Duck share one fixed width at each speed tier, starting at 71',()=>{
  assert.deepEqual(B.widthRangeFor('jump',{speed:370}),{min:71,max:71});
  assert.deepEqual(B.widthRangeFor('duck',{speed:370}),{min:71,max:71});
  assert.equal(B.STANDARD_WIDTH_STEPS,10);
  for(const type of ['jump','duck','echo']){
    const a=B.widthRangeFor(type,{speed:370});
    const b=B.widthRangeFor(type,{speed:2200});
    assert.ok(b.min>=a.min&&b.max>a.max,{type,a,b});
    if(type==='jump')assert.deepEqual(a,B.widthRangeFor('duck',{speed:370}));
    for(const z of [1,2,3,5,7,10,15,20,25,30,40,50]){
      const v=speed(z),x=B.widthRangeFor(type,{speed:v});
      assert.ok(x.min>0&&x.max>=x.min,{type,z,x});
      if(type==='echo')assert.ok(x.max>x.min,'legacy Echo may retain its width range');
      else assert.equal(x.min,x.max,'standard Jump/Duck have no random width');
      assert.ok(Number.isFinite(B.widthFor(type,{speed:v,random:()=>.4})));
      if(type==='jump'){
        assert.deepEqual(x,B.widthRangeFor('duck',{speed:v}),
          'Jump and Duck must grow identically, including at late zoom');
        assert.ok(x.max<=221,'standard Jump stays within normal Duck width');
        // A standard jump clears the full obstacle within the airtime
        // when the player's feet are safely above the tallest Jump.
        const h=B.heightRangeFor('jump').max;
        const clearanceSeconds=2*Math.sqrt(GAME.jumpVelocity**2-
          2*GAME.gravity*h)/GAME.gravity;
        assert.ok(B.traverseSeconds('jump',{speed:v,width:x.max})<clearanceSeconds,
          'standard Jump remains clearable without Echo/Dash');
      }
      if(type==='duck'){
        assert.ok(x.max<=221);
        assert.ok(B.traverseSeconds('duck',{speed:v,width:x.max})<GAME.duckDuration,
          'ordinary Duck must never accidentally require Ground Dash');
      }
      if(type==='echo')assert.ok(x.max<=560);
    }
  }
  assert.ok(B.widthRangeFor('jump',{speed:2200}).min*.6>=50,
    'short jump must remain visible at the 60% camera zoom');
});


test('all ordinary gate rolls at the same speed match regardless of type, RNG or sequence',()=>{
  const rng=[()=>0,()=>.01,()=>.25,()=>.5,()=>.75,()=>.999999,()=>1];
  const speeds=[370,450,549,550,600,750,1000,1275,1550,1800,2000,2199,2200,2500,5000];
  for(const speed of speeds){
    const w=B.widthRangeFor('jump',{speed});
    assert.deepEqual(B.widthRangeFor('duck',{speed}),w);
    assert.equal(w.min,w.max,'a speed tier must have exactly one rendered width');
    for(const type of ['jump','duck']){
      for(const random of rng){
        assert.equal(B.widthFor(type,{speed,random}),w.max,
          'random selection may not bring back thin gates');
        assert.equal(B.dimensionsFor(type,{speed,random}).width,w.max,
          'actual gameplay spawn geometry must be uniform');
      }
    }
  }
  for(const speed of [370,450,549,550])assert.equal(
    B.widthFor('jump',{speed,random:()=>0}),71,
    'the previous widest starting gate becomes the only starting gate');
  assert.equal(B.widthFor('jump',{speed:2200,random:()=>0}),221);
  assert.equal(B.widthFor('duck',{speed:2200,random:()=>1}),221);
});

test('shared width grows together in readable plateaus, without shrinking',()=>{
  let previous=0,changes=0;
  const seen=new Set();
  for(let speed=370;speed<=2500;speed+=5){
    const jump=B.widthFor('jump',{speed,random:()=>0});
    const duck=B.widthFor('duck',{speed,random:()=>1});
    assert.equal(jump,duck);
    assert.ok(jump>=previous,'width never shrinks as speed rises');
    if(jump>previous)changes++;
    previous=jump;seen.add(jump);
  }
  assert.equal(seen.size,B.STANDARD_WIDTH_STEPS+1);
  assert.equal(changes,B.STANDARD_WIDTH_STEPS+1);
  assert.equal(Math.min(...seen),71);
  assert.equal(Math.max(...seen),221);
  const fixed=B.dimensionsFor('jump',{speed:370,random:()=>0});
  const tall=B.dimensionsFor('jump',{speed:370,random:()=>1});
  assert.equal(fixed.width,tall.width,'width is fixed even with different heights');
  assert.ok(tall.height>fixed.height,'existing height variation remains intact');
});
test('intro Echo and ALL jump/duck heights are protected by original controls',()=>{
  for(const z of [2,5,10,30,50]){
    assert.deepEqual(B.widthRangeFor('echo',{speed:speed(z),intro:true}),
      {min:265,max:280});
    assert.deepEqual(B.heightRangeFor('echo',{intro:true}),
      {min:70,max:76});
    assert.deepEqual(B.heightRangeFor('echo'),{min:78,max:86});
    assert.deepEqual(B.heightRangeFor('jump'),{min:59,max:73});
    assert.deepEqual(B.heightRangeFor('duck'),{min:115,max:158});
  }
  const intro=B.dimensionsFor('echo',{speed:2200,intro:true,random:()=>.5});
  assert.ok(intro.width>=265&&intro.width<=280);
  assert.ok(intro.height>=70&&intro.height<=76);
  assert.equal(ECHO_SPIRE.firstZone,2);
});

test('long dash families remain visually/physically separate from standard families',()=>{
  for(const v of [570,745,900,1200,1650,2200]){
    assert.ok(H.widthFor(H.AIR,v)>=B.widthRangeFor('echo',{speed:v}).max);
    assert.ok(H.widthFor(H.GROUND,v)>B.widthRangeFor('duck',{speed:v}).max);
    assert.equal(H.heightFor(H.AIR),62);
    assert.equal(H.heightFor(H.GROUND),146);
    assert.equal(B.traverseSeconds('dash-duck',{
      speed:v,width:H.widthFor(H.GROUND,v)}),
      (H.widthFor(H.GROUND,v)+66)/v);
  }
  assert.equal(H.widthFor(H.AIR,745),720);
  assert.equal(H.widthFor(H.AIR,1450),1200);
  assert.equal(H.widthFor(H.GROUND,1200),530);
  assert.equal(GAME.speedRise,1350);
  assert.equal(GAME.speedEaseSeconds,170);
  assert.equal(GAME.cruiseAcceleration,.9);
});

test('ordinary gaps retain their original time budget beyond the old 500px cap',()=>{
  assert.equal(TERRAIN.maxGapWidth,850);
  const terrain=new TerrainSystem({random:()=>.5});
  terrain.reset(515);
  terrain._append('flat',1200);
  const g=terrain._choose(25,2000,{allowGap:true,gapChance:1,
    slopeChance:0,gapSecondsMin:.30,gapSecondsMax:.35});
  assert.equal(g.type,'gap');
  assert.ok(g.end-g.start>500&&g.end-g.start<=850);
  const duration=(g.end-g.start)/2000;
  assert.ok(duration>=.30&&duration<=.35,duration);
  assert.equal(Boolean(g.echoChallenge),false,
    'ordinary-gap scaling must not fabricate Echo challenge');
});

test('variety guard looks at the WHOLE new motif and real action history',()=>{
  assert.equal(MAX_SIMPLE_CHAIN,6);
  const past=Array(6).fill('jump').map(type=>({type}));
  assert.equal(violatesSimpleChain(['jump'],past),true);
  assert.equal(violatesSimpleChain(['jump','duck'],past),true);
  assert.equal(violatesSimpleChain(['duck','jump'],past),false);
  assert.equal(violatesSimpleChain(['echo'],past),false);
  assert.equal(violatesSimpleChain(['jump','jump'],past.slice(-2)),false);
  assert.equal(violatesSimpleChain(Array(7).fill('jump'),[]),true);
  assert.equal(violatesSimpleChain(['duck','duck'],past.slice(-2)),false);
  assert.equal(violatesSimpleChain(['duck'],[]),false);
  assert.equal(violatesSimpleChain(['jump'],[{type:'dash-jump'}]),false);
});

test('active motifs lose weight after repetition, while safe combinations stay varied',()=>{
  const ordinary=P.PATTERNS.find(p=>p.id==='single-jump');
  const rare=varietyMultiplier(ordinary,{patterns:[],spawns:[]});
  const repeated=varietyMultiplier(ordinary,{
    patterns:Array(6).fill('single-jump'),
    spawns:Array(8).fill({type:'jump'})});
  assert.ok(repeated<rare*.25,'same basic motif should rapidly lose weight');
  assert.ok(varietyMultiplier(P.PATTERNS.find(p=>p.id==='up-down'),{
    phase:'PEAK',zone:12,pressure:.2})>1);
  assert.ok(P.PATTERNS.every(p=>!p.steps.includes('echo')&&!p.steps.includes('dash-jump')));
});

function seeded(seed){
  let x=seed>>>0;
  return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
}
function simulate(seed){
  const director=new AdaptiveRushDirector(seeded(seed));
  // Mature, healthy arcade player; deliberately bypass the first tutorials
  // to measure normal variety, not the forced teaching sequence.
  director.echoIntroduced=true;
  director.dashIntroduced.air=true;director.dashIntroduced.ground=true;
  director.lastDashHazardAt=0;director.lastDashHazardType='dash-duck';
  director.confidence=.78;director.movement.echoClears=2;
  const seen=[];const dt=1/30;
  for(let i=0;i<Math.round(360/dt);i++){
    const t=i*dt,z=Math.floor((t+84)/12)+1,v=GAME.speedAt(t+84,z);
    const ctx={zone:z,zoneElapsed:(t+84)%12,hp:100,speed:v,
      surface:'floor',gravityPending:false,playerX:339,
      spawnXFor:()=>339+v*2.2};
    let emitted=null;
    director.tick(dt,ctx,step=>{
      emitted=step.type;seen.push({type:step.type,time:t,pattern:step.pattern});
      return true;
    });
    if(emitted)director.registerClear({action:emitted});
  }
  return {seen,director};
}

test('multiple 6-minute seeded Director simulations avoid 4+ identical simple hazards',()=>{
  for(const seed of [1,7,23,184,950]){
    const {seen,director}=simulate(seed);
    assert.ok(seen.length>65,JSON.stringify({seed,count:seen.length}));
    let streak=0,last=null,max=0;
    for(const e of seen){
      if(e.type===last&&(last==='jump'||last==='duck'))streak++;
      else streak=1;
      last=e.type;max=Math.max(max,streak);
    }
    assert.ok(max<=MAX_SIMPLE_CHAIN,JSON.stringify({seed,max}));
    assert.ok(new Set(seen.map(e=>e.type)).size>=3,
      'healthy runs must include Jump, Duck and the retained long Duck Gate');
    assert.ok(seen.every(e=>e.type!=='echo'&&e.type!=='dash-jump'));
    assert.ok(seen.some(e=>e.type==='dash-duck'),
      'the retained long Duck Gate still gets safe opportunities');
    assert.ok(director.insight.variety.recentActions.length<=12);
    assert.ok(director.insight.variety.recentPatterns.length<=8);
    assert.ok(director.insight.variety.rejected>=0);
  }
});

test('weak HP/stress still override variety; no artificial forced advanced obstacle',()=>{
  const director=new AdaptiveRushDirector(seeded(9));
  director.echoIntroduced=true;
  director.recentSpawns=Array(3).fill({type:'jump',time:2});
  director.phase='BUILD';director.confidence=.65;director.stress=.6;
  const p=director.selectPattern({zone:12,hp:25,speed:1400,
    surface:'floor',playerX:339,spawnXFor:()=>3400});
  assert.ok(p);
  assert.equal(p.steps[0],'duck',
    'variety may request a different BASIC action but never escalate HP risk');
});

test('full-run 30s obstacle-mix summary survives the 600-event export cap',()=>{
  const {RoundAudit,MAX_EVENTS}=require('../src/diagnostics/round-audit.js');
  const d=new RoundAudit();
  assert.equal(MAX_EVENTS,600);
  for(let i=0;i<950;i++){
    const action=i%17===0?'dash-jump':i%11===0?'echo':
      i%7===0?'dash-duck':i%4<2?'jump':'duck';
    d.record('spawn',{time:i*.47,zone:Math.floor(i*.47/12)+1},
      {obstacle:action,width:70,height:60});
    d.tick(.47,{time:i*.47,zone:Math.floor(i*.47/12)+1});
  }
  const summary=d.snapshot().summary;
  assert.equal(d.events.length,MAX_EVENTS);
  assert.ok(d.overflow>0);
  assert.equal(Object.values(summary.variety.spawnedByType)
    .reduce((a,b)=>a+b,0),950,'complete distribution is NOT truncated');
  assert.ok(summary.variety.windows.length>=14);
  assert.equal(summary.variety.windows[0].startSeconds,0);
  assert.ok(summary.variety.windows.at(-1).startSeconds>=420);
  assert.ok(summary.variety.maxBasicStreak>=1);
  assert.ok(summary.variety.maxBasicStreak<10);
});

test('actual gameplay loads shared size contract and audit exposes real dimensions',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const configTag=html.indexOf('src/core/config.js?v=');
  const balanceTag=html.indexOf('src/gameplay/obstacle-balance.js?v=');
  const gameTag=html.indexOf('src/gameplay/game.js?v=');
  assert.ok(configTag>0&&configTag<balanceTag&&balanceTag<gameTag);
  assert.match(game,/OBSTACLE_BALANCE\.dimensionsFor\(data\.type/);
  assert.match(game,/OBSTACLE_BALANCE\.traverseSeconds\(data\.type/);
  assert.match(game,/window\.ChromaObstacleBalance/);
  assert.match(html,/obstacle-director-balance-3\.0/);
  const audit=require('../src/diagnostics/round-audit.js');
  assert.equal(new audit.RoundAudit().snapshot().build,'premium-world-lighting-3.0');
});

test('Jump cleanup removes only the in-air twin-angles availability marker',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const player=game.slice(game.indexOf('  function drawPlayer(){'),
    game.indexOf('  function drawFx(',game.indexOf('  function drawPlayer(){')));
  assert.ok(player.length>2500);
  assert.equal(player.includes('jumpControl.echoAvailable'),false);
  assert.equal(player.includes('const cx=rx+rw+7'),false);
  assert.ok(player.includes('motion.sample('),'jump stretch/squash stays');
  assert.ok(player.includes('chromaVfx.drawAfterPlayer('),'existing Chroma effects stay');
  assert.ok(game.includes("else if(action==='echo')launchEcho();"),
    'actual double jump controls must remain functional');
});
