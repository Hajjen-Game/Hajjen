import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNatureLedger,recordNatureKill} from '../../wildpath/src/nature-rebirth.js';
import {planNatureFusions} from '../../wildpath/src/nature-fusion.js';
import {chooseNatureLook} from '../../wildpath/src/nature-variety.js';

test('Wildpath 3 keeps rapid kill upgrades and real nature lineage',()=>{
  const ledger=makeNatureLedger();
  const first=recordNatureKill(ledger,{x:0,z:0,type:'mossling',time:1});
  const second=recordNatureKill(ledger,{x:.3,z:.3,type:'mossling',time:1.3});
  const third=recordNatureKill(ledger,{x:.2,z:.4,type:'ember',time:1.5});
  assert.equal(first.kind,'create');
  assert.equal(second.kind,'grow');
  assert.equal(third.kind,'upgrade');
  assert.equal(third.tier,'bush');
  assert.equal(third.count,3);
  const look=chooseNatureLook(third);
  assert.equal(chooseNatureLook({...third,tier:'tree'},look).palette,look.palette);
});
test('three separate settled plants close together can merge, but not instantly',()=>{
  const ledger=makeNatureLedger(),plants=[];
  for(const [i,x] of [[0,0],[1,2.1],[2,4.0]]){
    const event=recordNatureKill(ledger,{x,z:0,type:'mossling',time:i*2.1});
    plants.push({...event,lastBloom:i*2.1,look:chooseNatureLook(event)});
  }
  assert.equal(planNatureFusions(plants,[],4.4).length,0);
  const merge=planNatureFusions(plants,[],10);
  assert.equal(merge.length,1);
  assert.deepEqual(merge[0].sourceIds,plants.map(p=>p.id));
  assert.equal(merge[0].count,3);
  assert.equal(new Set(merge[0].colors).size,3);
});
