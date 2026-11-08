const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const HUD=require('../src/ui/hud.js');
const {FlowSystem}=require('../src/gameplay/flow.js');

function element(){
  const classes=new Set();
  return {style:{},dataset:{},textContent:'',
    setAttribute(k,v){this[k]=v},
    classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name),
      contains:name=>classes.has(name)}};
}
function elements(){
  return Object.fromEntries(['hp','hpNumber','critical','zone','phase','score','speed',
  'flowNumber','flowBar','flowOuter','flowMultiplier','flowState','flowStreak','hud']
  .map(name=>[name,element()]));
}
function show(flow,elements){
  HUD.update(elements,{hp:100,zone:1,color:'#5deeff',phase:'BUILD',
    score:200,speed:370,baseSpeed:370,status:'running',flow});
}
test('Flow multiplier presentation shows the real 1×, 1.25×, 1.5×, 2× rewards',()=>{
  const flow=new FlowSystem(),els=elements();
  const steps=[
    [0,0,'1×'],
    [30,1,'1.25×'],
    [65,2,'1.5×'],
    [90,3,'2×']
  ];
  for(const [value,tier,label] of steps){
    flow.value=value;flow.syncChroma();show(flow,els);
    assert.equal(flow.tier,tier);
    assert.equal(els.flowMultiplier.textContent,label);
    assert.equal(els.flowMultiplier.dataset.tier,String(tier));
    assert.equal(els.flowOuter.dataset.tier,String(tier));
    assert.equal(els.hud.classList.contains('chroma-transformed'),tier===3);
  }
});
test('Chroma multiplier glow respects existing 90/87 hysteresis, not raw 90%',()=>{
  const flow=new FlowSystem(),els=elements();
  flow.value=90;flow.syncChroma();show(flow,els);
  flow.value=88;flow.syncChroma();show(flow,els);
  assert.equal(els.flowMultiplier.textContent,'2×');
  assert.equal(els.flowMultiplier.dataset.tier,'3');
  assert.equal(els.hud.classList.contains('chroma-transformed'),true);
  flow.value=86.9;flow.syncChroma();show(flow,els);
  assert.equal(els.flowMultiplier.textContent,'1.5×');
  assert.equal(els.flowMultiplier.dataset.tier,'2');
  assert.equal(els.hud.classList.contains('chroma-transformed'),false);
});
test('tiered glow is isolated to HUD multiplier and has an accessible static fallback',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');
  for(const tier of [1,2,3])
    assert.ok(css.includes('#flow-multiplier[data-tier="'+tier+'"]'));
  assert.match(css,/@keyframes flowMultiplierBreath/);
  assert.match(css,/#flow-multiplier\[data-tier\]\{animation:none;transform:none;transition:none\}/);
  assert.match(css,/font-variant-numeric:tabular-nums/);
  assert.match(css,/transform-origin:right center/);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/id="flow-multiplier"/);
  assert.match(html,/style\.css\?v=premium-arcade-ui-4\.0/);
  assert.match(html,/src\/ui\/hud\.js\?v=flow-multiplier-1\.0/);
  assert.match(html,/<meta name="chroma-build" content="original-background-restored-1\.0-chroma-pulse-1\.0-gravity-1\.0-ceiling-sync-1\.0-movement-1\.0-duck-gate-1\.0-echo-spire-1\.0-aware-1\.0-fairness-1\.0-jump-visual-1\.0-combo-1\.0-speed-curve-2\.0-echo-polish-1\.1-echo-zone2-1\.2-no-scout-1\.1-tide-2\.0-spectacle-1\.0-dash-2\.5-shield-core-1\.0-dash-hazards-1\.0-dash-pacing-1\.1-spectrum-2\.0-dash-reliability-1\.2-ui-calm-1\.0-dash-polish-2\.0-director-flow-2\.0-performance-stability-2\.0-chroma-identity-visual-polish-1\.0-player-identity-2\.0-chroma-tide-energy-3\.0-premium-arcade-ui-4\.0"/);
});
