import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNatureLedger,recordNatureKill,natureTier,natureSpecies,
  NATURE_WINDOW,NATURE_RADIUS,NATURE_MAX_PLANTS,NATURE_MAX_TREES}
  from '../src/nature-rebirth.js';
test('1/3/6/10 kills evolve the SAME visible plant in one place',()=>{
  const ledger=makeNatureLedger(),seq=[];
  for(let n=1;n<=12;n++){
    const e=recordNatureKill(ledger,{x:7+(n%3)*.4,z:4,type:'mossling',time:n*.08});
    seq.push(e);
    assert.equal(e.id,1);
    assert.equal(e.x,7.4); // Initial cluster stays rooted at its first kill.
  }
  assert.equal(seq[0].kind,'create');
  assert.equal(seq[0].tier,'flower');
  assert.equal(seq[2].kind,'upgrade');assert.equal(seq[2].tier,'bush');
  assert.equal(seq[5].kind,'upgrade');assert.equal(seq[5].tier,'tree');
  assert.equal(seq[9].kind,'upgrade');assert.equal(seq[9].tier,'blossom');
  assert.equal(seq[11].kind,'grow');
  assert.equal(ledger.totalKills,12);
});
test('distant or separated kills produce separate flowers',()=>{
  const led=makeNatureLedger();
  const a=recordNatureKill(led,{x:0,z:0,time:0});
  const b=recordNatureKill(led,{x:NATURE_RADIUS+.5,z:0,time:.2});
  const c=recordNatureKill(led,{x:0,z:0,time:NATURE_WINDOW+2});
  assert.notEqual(a.id,b.id);
  assert.notEqual(a.id,c.id);
  assert.equal(a.tier,'flower');assert.equal(b.kind,'create');
});
test('different enemy types color the blooms without changing the power curve',()=>{
  const led=makeNatureLedger();
  recordNatureKill(led,{x:0,z:0,time:0,type:'mossling'});
  recordNatureKill(led,{x:0,z:0,time:.1,type:'ember'});
  const e=recordNatureKill(led,{x:0,z:0,time:.2,type:'ember'});
  assert.equal(e.tier,'bush');
  assert.equal(e.species,'ember');
  assert.equal(natureSpecies({mossling:1,bramble:3,ember:0,guardian:0}),'bramble');
  assert.equal(natureTier(1),'flower');
  assert.equal(natureTier(3),'bush');
  assert.equal(natureTier(6),'tree');
  assert.equal(natureTier(10),'blossom');
});
test('clustering never accepts invalid coordinates and all caps are bounded',()=>{
  const led=makeNatureLedger();
  assert.equal(recordNatureKill(led,{x:NaN,z:0,time:0}),null);
  assert.equal(led.clusters.length,0);
  assert.ok(NATURE_MAX_PLANTS>=60&&NATURE_MAX_PLANTS<=160);
  assert.ok(NATURE_MAX_TREES>5&&NATURE_MAX_TREES<25);
});
