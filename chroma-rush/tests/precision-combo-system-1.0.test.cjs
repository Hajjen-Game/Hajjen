const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PrecisionComboSystem,assessPrecision,WINDOW_SECONDS,MAX_CHAIN}
  =require('../src/gameplay/precision-combo.js');
const {FlowSystem}=require('../src/gameplay/flow.js');
const {FLOW,GAME}=require('../src/core/config.js');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const {EffectLanguage,MAX_EFFECTS}=require('../src/render/effect-language.js');
const {RoundAudit}=require('../src/diagnostics/round-audit.js');
const {update}=require('../src/ui/hud.js');

const clear=(system,action,time,precision=false,master=false)=>
  system.onClear({action,time,precision,master});

test('precision preserves the existing 0–18px Jump and Echo windows exactly',()=>{
  for(const action of ['jump','echo']){
    assert.equal(assessPrecision({action,closestClearance:0}).precision,true);
    assert.equal(assessPrecision({action,closestClearance:8}).master,true);
    assert.equal(assessPrecision({action,closestClearance:9}).master,false);
    assert.equal(assessPrecision({action,closestClearance:18}).precision,true);
    assert.equal(assessPrecision({action,closestClearance:18.01}).precision,false);
    assert.equal(assessPrecision({action,closestClearance:-.01}).precision,false);
    assert.equal(assessPrecision({action,closestClearance:Infinity}).precision,false);
  }
});

test('Duck precision is judged from actual entry timing, not current Flow or score',()=>{
  const s=.22;
  assert.equal(assessPrecision({action:'duck',entryDuckTime:s+.01,traverseSeconds:s}).precision,false);
  assert.equal(assessPrecision({action:'duck',entryDuckTime:s+.02,traverseSeconds:s}).precision,true);
  assert.equal(assessPrecision({action:'duck',entryDuckTime:s+.08,traverseSeconds:s}).master,true);
  assert.equal(assessPrecision({action:'duck',entryDuckTime:s+.16,traverseSeconds:s}).precision,true);
  assert.equal(assessPrecision({action:'duck',entryDuckTime:s+.161,traverseSeconds:s}).precision,false);
  assert.equal(assessPrecision({action:'duck',entryDuckTime:null,traverseSeconds:s}).precision,false);
  assert.equal(assessPrecision({action:'gap',closestClearance:1}).precision,false);
  assert.equal(assessPrecision({action:'echo-gap',closestClearance:1}).master,false);
});

test('Jump → Duck → Echo is an actual three-step movement chain with graded precision',()=>{
  const c=new PrecisionComboSystem();
  assert.equal(clear(c,'jump',1,true,true),null);
  const two=clear(c,'duck',2.5,true,false);
  assert.equal(two.length,2);assert.equal(two.actions,'jump > duck');
  assert.equal(two.precisionCount,2);
  assert.equal(two.flourish,false);
  const three=clear(c,'echo',4.1,false,false);
  assert.equal(three.length,3);assert.equal(three.flourish,true);
  assert.equal(three.precisionCount,2);
  assert.equal(three.masterCount,1);
  assert.equal(c.bestChain,3);
  assert.equal(c.totalCombos,2);
  assert.equal(c.displayTier,3);
});

test('repeating the same gesture never farms bonuses, including gaps as jumps',()=>{
  const c=new PrecisionComboSystem();
  assert.equal(clear(c,'jump',1),null);
  assert.equal(clear(c,'jump',2),null);
  assert.equal(clear(c,'gap',3),null,'gap and regular jump share the gesture');
  assert.equal(clear(c,'echo-gap',4).length,2,'double jump is a distinct gesture');
  assert.equal(clear(c,'echo',5),null,'ordinary Echo and Echo Gap share one family');
  assert.equal(c.totalCombos,1);
  assert.equal(c.bestChain,2);
});

test('hard cap prevents infinite combo multiplication, without removing ordinary clears',()=>{
  const c=new PrecisionComboSystem();
  clear(c,'jump',1);clear(c,'duck',2);clear(c,'echo',3);
  const four=clear(c,'jump',4);
  assert.equal(four.length,4);
  assert.equal(clear(c,'duck',5),null,'the fifth clear starts a new chain');
  assert.equal(clear(c,'echo',6).length,2);
  assert.equal(c.bestChain,MAX_CHAIN);
  assert.equal(c.totalCombos,4);
});

test('damage, repeated inputs, expiry and Gravity Shift break chain harmlessly',()=>{
  const c=new PrecisionComboSystem();
  clear(c,'jump',1);
  c.breakChain();assert.equal(c.chain.length,0);
  assert.equal(clear(c,'duck',2),null);
  clear(c,'jump',3);
  assert.equal(c.displayTime>0,true);
  c.tick(.95);assert.equal(c.displayTime,0);
  assert.equal(clear(c,'echo',3+WINDOW_SECONDS+.001),null);
  c.breakChain();
  c.reset();
  assert.equal(c.totalCombos,0);
  assert.equal(c.bestChain,0);
  assert.equal(c.breaks,0);
});

test('pause preserves feedback and timing; no hidden tick or wall-clock timer',()=>{
  const c=new PrecisionComboSystem();
  clear(c,'duck',.2);clear(c,'jump',1.2);
  c.tick(.2);const before=c.displayTime;
  c.tick(0);assert.equal(c.displayTime,before);
  clear(c,'echo',2.3);
  assert.equal(c.displayTier,3);
  c.tick(2);assert.equal(c.displayTime,0);
});

test('Flow combo rewards are bounded, reuse multiplier and never count as an extra clear',()=>{
  const f=new FlowSystem();
  f.registerClear({precision:true});
  const zoneBefore=f.zoneClears,streakBefore=f.streak,precisionBefore=f.totalPrecision;
  const length2=f.registerCombo({length:2});
  assert.equal(length2.earnedPoints,FLOW.comboBonusPoints[2]);
  assert.equal(length2.flowGain,0);
  assert.equal(f.zoneClears,zoneBefore);
  assert.equal(f.streak,streakBefore);
  assert.equal(f.totalPrecision,precisionBefore);
  const length3=f.registerCombo({length:3});
  assert.equal(length3.flowGain,1);
  assert.equal(f.value,FLOW.precisionGain+1);
  const length4=f.registerCombo({length:4});
  assert.equal(length4.flowGain,1);
  assert.equal(f.value,FLOW.precisionGain+2);
  const invalid=f.registerCombo({length:7});
  assert.equal(invalid.earnedPoints,0);
  assert.equal(f.zoneClears,zoneBefore);
  assert.equal(f.completeZone().perfect,false,'combos alone cannot claim a perfect zone');
});

test('Flow tier multiplier still owns all score rewards (no second combo multiplier)',()=>{
  const f=new FlowSystem();
  for(let i=0;i<7;i++)f.registerClear();
  const start=f.multiplier;
  const reward=f.registerCombo({length:3});
  assert.equal(reward.earnedPoints,Math.round(FLOW.comboBonusPoints[3]*f.multiplier));
  assert.ok(start>=1.25);
  assert.ok(f.value<=100);
  assert.equal(f.multiplier,FLOW.multipliers[f.tier]);
});

test('Director observes real completed combos without forcing obstacle patterns',()=>{
  const d=new AdaptiveRushDirector(()=>.5);
  const phase=d.phase,prior=d.spawnCountdown;
  d.noteCombo({length:3});
  d.noteCombo({length:4});
  d.noteCombo({length:1});
  assert.equal(d.insight.combo.total,2);
  assert.equal(d.insight.combo.best,4);
  assert.equal(d.phase,phase);
  assert.equal(d.spawnCountdown,prior);
  assert.equal(d.movement.echoClears,0);
  d.registerDamage();
  assert.equal(d.insight.combo.best,4,'a mistake does not erase earned mastery insight');
  d.reset();
  assert.equal(d.insight.combo.total,0);
});

test('run log counts precision, master and combo rewards without personal data',()=>{
  const a=new RoundAudit();
  a.record('obstacle_clear',{score:500},{obstacle:'jump',precision:true,master:true});
  a.record('obstacle_clear',{score:600},{obstacle:'duck',precision:false});
  a.record('combo',{score:620},{length:2,sequence:'jump > duck',
    precisionClears:1,masterClears:1,bonusPoints:20,bonusFlow:0});
  a.record('combo',{score:660},{length:3,sequence:'jump > duck > echo',
    precisionClears:2,masterClears:1,bonusPoints:35,bonusFlow:1});
  const snap=a.snapshot();
  assert.equal(snap.summary.precisionClears,1);
  assert.equal(snap.summary.masterClears,1);
  assert.equal(snap.summary.combos.count,2);
  assert.equal(snap.summary.combos.bestChain,3);
  assert.equal(snap.summary.combos.bonusPoints,55);
  assert.equal(snap.summary.combos.bonusFlow,1);
  assert.equal(snap.summary.combos.byLength[3],1);
  assert.equal(snap.events.filter(e=>e.type==='combo').length,2);
  assert.doesNotMatch(a.toJSON(),/userId|deviceId|sessionToken/);
  a.reset();
  assert.equal(a.snapshot().summary.combos.count,0);
});

test('combo FX are angled bounded strokes, quality-scaled, with zero rings or texts',()=>{
  const fx=new EffectLanguage();
  assert.equal(fx.cue('combo',300,440,'#33eeff','#a966ff',{speed:1400}),true);
  assert.equal(fx.active[0].kind,'cue-combo');
  const draw=density=>{
    let strokes=0;
    const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++}};
    fx.draw(ctx,{density,glow:1});
    return strokes;
  };
  assert.ok(draw(1)>draw(.3));
  assert.equal(fx.cue('combo',300,440,'#33eeff','#a966ff',{reducedMotion:true}),false);
  assert.ok(fx.active.length<=MAX_EFFECTS);
});

test('the existing Flow HUD slot briefly displays a chain without more panels',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../src/ui/hud.js'),'utf8');
  assert.match(src,/combo\?\.displayTime>0/);
  assert.match(src,/CHAIN ×/);
  assert.doesNotMatch(src,/document\.createElement/);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(html.includes('src/gameplay/precision-combo.js?v=precision-combo-1.0'));
  assert.ok(html.indexOf('src/gameplay/flow.js?v=')<html.indexOf('src/gameplay/precision-combo.js?v='));
  assert.ok(html.indexOf('src/gameplay/precision-combo.js?v=')<html.indexOf('src/gameplay/game.js?v='));
  assert.ok(!html.includes('id="dash-btn"'));
});

test('gameplay logic calls combo only on actual obstacle/gap success and breaks on errors',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/const graded=gradePrecision\(\{action:o\.type/);
  assert.match(game,/awardCombo\(o\.type,\{precision,master:graded\.master\}\)/);
  assert.match(game,/awardCombo\(gap\.echoChallenge\?'echo-gap':'gap'\)/);
  assert.match(game,/combo\.breakChain\(\)/);
  assert.match(game,/director\.noteCombo\(chain\)/);
  assert.match(game,/runAudit\.record\('combo',auditState\(\)/);
  assert.equal(GAME.jumpVelocity,-870);
  assert.equal(GAME.gravity,2140);
});
