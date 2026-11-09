const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PALETTES,paletteForZone,GAME}=require('../src/core/config.js');
const {PATTERNS}=require('../src/director/patterns.js');
const {GravityShift,START_ZONE,INTERVAL_ZONES,WARNING_SECONDS,SHIFT_SECONDS}=require('../src/gameplay/gravity-shift.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const GEO=require('../src/core/geometry.js');

test('each of the 24 curated palettes now spans exactly two gameplay zones',()=>{
  for(let i=0;i<PALETTES.length;i++){
    assert.equal(paletteForZone(i*2+1),PALETTES[i]);
    assert.equal(paletteForZone(i*2+2),PALETTES[i]);
  }
  assert.equal(paletteForZone(49),PALETTES[0]);
  assert.equal(paletteForZone(0),PALETTES[0]);
  assert.equal(GAME.zoneSeconds,12,'zones and speed remain unchanged');
});

test('Director cannot select either retired long jump obstacle',()=>{
  assert.ok(PATTERNS.length>=10);
  assert.ok(PATTERNS.every(p=>p.steps.every(s=>s!=='echo'&&s!=='dash-jump')));
  assert.ok(PATTERNS.some(p=>p.steps.includes('dash-duck')),'long Duck Gate stays');
  assert.ok(PATTERNS.some(p=>p.steps.length>=3),'late precision patterns stay');
});

test('Gravity Shift is a rare seven-zone event, not every other zone',()=>{
  assert.equal(START_ZONE,7);assert.equal(INTERVAL_ZONES,7);
  const g=new GravityShift();
  for(let z=1;z<7;z++)assert.equal(g.requestForZone(z),false);
  assert.equal(g.requestForZone(7),true);
  assert.equal(g.tick(WARNING_SECONDS,{safe:true}),'begin');
  assert.equal(g.tick(SHIFT_SECONDS+.01),'complete');
  assert.equal(g.ceiling,true);
  for(let z=8;z<14;z++)assert.equal(g.requestForZone(z),false);
  assert.equal(g.requestForZone(14),true);
});

test('more gaps and floor-first double-jump gaps preserve recovery gating',()=>{
  const d={phase:'PEAK',phaseElapsed:0,phaseDuration:5.1,
    stress:0,confidence:.9,time:10,movement:{pressure:0,lastEchoTime:-Infinity,recoveryUntil:0},
    dashIntroduced:{ground:true},enduranceFor:()=>0,densityFor:()=>0};
  const terrain=new TerrainSystem({random:()=>.05});
  const planner=new UnifiedTerrainDirector({terrain,director:d});
  planner.gapSuccesses=1;
  const c={playerWorld:1000,zone:4,speed:500,hp:100,surface:'floor'};
  const healthy=planner.policyAt(1900,c);
  assert.ok(healthy.gapChance>=.40);
  assert.ok(healthy.echoGapChance>=.40);
  assert.equal(planner.policyAt(1900,{...c,surface:'ceiling'}).echoGapChance,0,
    'first advanced gap must never be taught on the ceiling');
  planner.echoGapsPlanned=1;
  assert.ok(planner.policyAt(1900,{...c,surface:'ceiling'}).echoGapChance>0);
  assert.equal(planner.policyAt(1900,{...c,hp:25}).gapChance,0,
    'low HP keeps terrain safety');
});

test('Jump and Duck keep their original physical boxes, only visuals change',()=>{
  const jump=GEO.obstacleBox({type:'jump',x:200,width:55,height:60},515);
  assert.deepEqual(jump,{x:200,y:455,w:55,h:60});
  const duck=GEO.obstacleBox({type:'duck',x:200,width:55,height:130},515);
  assert.equal(duck.y+duck.h,515-GEO.DUCK_CLEARANCE);
});

test('actual arcade applies retired-hazard veto, mirrored gate and two-zone tide',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/if\(data\.type==='echo'\|\|data\.type==='dash-jump'\)return false/);
  assert.match(game,/if\(o\.type==='jump'\)\{/);
  assert.match(game,/const animated=incoming!==outgoing&&spectralWave\.start/);
  assert.match(game,/window\.ChromaConfig\.paletteForZone\(zone\)/);
  assert.match(game,/window\.ChromaConfig\.paletteForZone\(zone-1\)/);
});
