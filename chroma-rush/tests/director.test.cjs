const test = require('node:test');
const assert = require('node:assert/strict');
const { AdaptiveFlowDirector, minimumGap, PHASE } = require('../src/director/adaptive-director.js');

test('director starts in BUILD with introductory spacing', () => {
  const d = new AdaptiveFlowDirector(() => .5);
  assert.equal(d.phase, PHASE.BUILD);
  assert.ok(d.spawnCountdown >= 2);
  assert.equal(d.totalSpawned, 0);
});

test('all phases including RELAX occur and RELAX spawns nothing', () => {
  const d = new AdaptiveFlowDirector(() => .5);
  const phaseCounts = Object.fromEntries(Object.values(PHASE).map(p => [p, 0]));
  let relaxSpawns = 0;
  for(let i=0;i<700;i++) {
    const phaseBefore = d.phase;
    d.tick(.05,{hp:100,zone:3,speed:510},()=>{ if(phaseBefore===PHASE.RELAX) relaxSpawns++ });
    phaseCounts[d.phase]++;
  }
  assert.ok(phaseCounts.BUILD > 0 && phaseCounts.PEAK > 0 && phaseCounts.FADE > 0 && phaseCounts.RELAX > 0);
  assert.equal(relaxSpawns, 0);
});

test('jump -> duck requires adequate recovery interval', () => {
  assert.ok(minimumGap('jump', 'duck', 800) >= .92);
  assert.ok(minimumGap('jump', 'jump', 800) >= .91);
  assert.ok(minimumGap('duck', 'jump', 800) >= .64);
});

test('low HP buys recovery and longer relax without pausing speed', () => {
  const d = new AdaptiveFlowDirector(() => .5);
  d.registerDamage();
  assert.ok(d.gapFor({hp:25,zone:5,speed:750}) > d.gapFor({hp:100,zone:5,speed:750}));
  assert.ok(d.durationFor(PHASE.RELAX,{hp:25,zone:5}) > d.durationFor(PHASE.RELAX,{hp:100,zone:5}));
});

test('spawn output only produces supported control actions', () => {
  const d = new AdaptiveFlowDirector(() => .4), types=[];
  for(let i=0;i<450;i++)d.tick(.05,{hp:75,zone:2,speed:480},o=>types.push(o.type));
  assert.ok(types.length>5);
  assert.ok(types.every(t=>['jump','duck'].includes(t)));
  assert.ok(types.includes('jump')&&types.includes('duck'),'zone 2 uses clear basic obstacles; the double jump is taught by terrain later');
});
