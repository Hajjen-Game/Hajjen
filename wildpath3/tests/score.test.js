import test from 'node:test';
import assert from 'node:assert/strict';
import {SCORE_TABLE,createScoreLedger,awardScore,currentCombo,formatScore}
  from '../src/score.js';

test('combat score rises with a capped rapid kill combo',()=>{
  const ledger=createScoreLedger();
  const first=awardScore(ledger,'mossling',1);
  const second=awardScore(ledger,'mossling',2);
  const third=awardScore(ledger,'ember',2.7);
  assert.equal(first.points,100);
  assert.ok(second.points>100);
  assert.ok(third.points>SCORE_TABLE.ember);
  assert.equal(ledger.bestCombo,3);
  assert.equal(currentCombo(ledger,8),0);
  assert.ok(ledger.total>300);
});
test('seeds reward points without extending kill combos',()=>{
  const ledger=createScoreLedger();
  awardScore(ledger,'bramble',1);
  const seed=awardScore(ledger,'seed',2);
  assert.equal(seed.points,25);
  assert.equal(ledger.combo,1);
  assert.equal(ledger.breakdown.pickups,25);
});
test('advanced fusion beats an equivalent handful of flowers',()=>{
  const ledger=createScoreLedger();
  for(let i=0;i<10;i++)awardScore(ledger,'flower');
  const tenFlowers=ledger.total;
  const grove=awardScore(ledger,'grove');
  assert.ok(grove.points>tenFlowers);
  const enchanted=awardScore(ledger,'enchanted');
  assert.ok(enchanted.points>grove.points);
  assert.ok(ledger.breakdown.nature>ledger.breakdown.combat);
});
test('no fake results, unknown events are rejected, and values format cleanly',()=>{
  const ledger=createScoreLedger();
  assert.throws(()=>awardScore(ledger,'imaginary'),/Unknown score event/);
  assert.equal(ledger.total,0);
  assert.equal(formatScore(50475),'50,475');
  assert.equal(awardScore(ledger,'wave').points,SCORE_TABLE.wave);
});
