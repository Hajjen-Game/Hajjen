const test=require('node:test');
const assert=require('node:assert/strict');
const {RoundAudit,MAX_EVENTS}=require('../src/diagnostics/round-audit.js');
const state={time:3,zone:2,hp:75,score:200,flow:95,speed:420,distance:900,phase:'PEAK',streak:7};
test('round audit captures events, summary, two-second samples and director timing without personal data',()=>{
  const a=new RoundAudit();a.reset({mode:'arcade',startingZone:1});
  a.record('start',state);a.record('spawn',state,{obstacle:'jump'});
  a.record('obstacle_clear',state,{precision:true});
  a.record('gap_miss',state,{width:180});
  a.record('terrain',state,{feature:'slope'});
  a.record('perfect_zone',state);
  for(let i=0;i<120;i++)a.tick(1/60,state,{stress:.42,confidence:.56});
  a.finish(state);
  const doc=a.snapshot();
  assert.equal(doc.mode,'arcade');assert.equal(doc.summary.obstaclesSpawned,1);
  assert.equal(doc.summary.obstaclesCleared,1);assert.equal(doc.summary.gapsMissed,1);
  assert.equal(doc.summary.perfectZones,1);assert.equal(doc.summary.terrainSlopes,1);
  assert.equal(doc.summary.chromaSeconds,2);
  assert.equal(doc.summary.phaseSeconds.PEAK,2);
  assert.equal(doc.summary.peakStress,.42);
  assert.equal(doc.samples.length,1);
  assert.ok(doc.events.some(e=>e.type==='run_end'));
  assert.ok(!/deviceId|userId|sessionToken/.test(a.toJSON()));
});
test('practice runs are labeled and reset does not leak prior rounds',()=>{
  const a=new RoundAudit();a.reset({mode:'practice',startingZone:4});
  a.record('gap_clear',state);a.finish(state);
  assert.equal(a.snapshot().summary.gapsCleared,1);
  assert.equal(a.snapshot().mode,'practice');
  a.reset({mode:'arcade',startingZone:1});
  assert.equal(a.snapshot().summary.gapsCleared,0);
  assert.equal(a.snapshot().events.length,0);
  assert.equal(a.snapshot().finished,undefined);
});
test('audit event storage is bounded and unknown event names ignored',()=>{
  const a=new RoundAudit();
  for(let i=0;i<MAX_EVENTS+19;i++)a.record('spawn',state,{index:i});
  a.record('unknown',state,{secret:'do not collect'});
  assert.equal(a.snapshot().events.length,MAX_EVENTS);
  assert.equal(a.snapshot().truncatedEvents,19);
  assert.equal(a.snapshot().summary.obstaclesSpawned,MAX_EVENTS+19);
});
test('movement audit keeps real inputs, successful actions and reason-coded denials',()=>{
  const a=new RoundAudit();
  a.record('dash_unlocked',state,{zone:1});
  a.record('jump_input',state,{action:'jump',grounded:true});
  a.record('jump_input',state,{action:'echo',grounded:false});
  a.record('echo_jump',state,{verticalImpulse:-650});
  a.record('duck_input',state,{desired:'air',grounded:false});
  a.record('air_dash',state,{extraSpeedFactor:.72});
  a.record('duck_input',state,{desired:'ground',grounded:true});
  a.record('ground_dash',state,{extraSpeedFactor:.72});
  a.record('dash_blocked',state,{reason:'air_spent',desired:'air'});
  const d=a.snapshot();
  assert.equal(d.version,2);
  assert.equal(d.build,'dash-reliability-1.2');
  assert.deepEqual(d.summary.movement,{
    jumpPresses:2,duckPresses:2,echoJumps:1,airDashes:1,groundDashes:1,dashBlocked:1
  });
  assert.equal(d.events.find(x=>x.type==='dash_blocked').reason,'air_spent');
  assert.ok(d.events.some(x=>x.type==='echo_jump'));
  assert.ok(!/pointerId|touchX|touchY|userId/.test(JSON.stringify(d)));
});
test('event payload keeps only bounded primitive fields',()=>{
  const a=new RoundAudit();a.record('terrain',state,{feature:'gap',object:{sensitive:true},notes:'x'.repeat(101),width:190});
  const doc=a.snapshot();assert.equal(doc.events[0].object,undefined);
  assert.equal(doc.events[0].notes,undefined);assert.equal(doc.events[0].width,190);
  assert.equal(doc.summary.terrainGaps,1);
});
