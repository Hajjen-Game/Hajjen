import test from 'node:test';
import assert from 'node:assert/strict';
import {FUSION_SETTLE,FUSION_MAX_REGIONS,FUSION_MAX_RADIUS,planNatureFusions,
  fusionKind,fusionRadius,regionSummary} from '../src/nature-fusion.js';
const plant=(id,x,z,tier='flower',age=5,palette='rose')=>({
  id,x,z,tier,lastBloom:age,look:{palette}
});
test('lone kills remain visible; three nearby mature flowers merge',()=>{
  assert.equal(planNatureFusions([plant(1,0,0)],[],12).length,0);
  const plan=planNatureFusions([
    plant(1,0,0),plant(2,1,1),plant(3,-1,2),plant(4,30,30)],[],12);
  assert.equal(plan.length,1);
  assert.deepEqual(plan[0].sourceIds,[1,2,3]);
  assert.equal(plan[0].kind,'meadow');
});
test('plants can evolve before fusion: 1.6s kill combo is protected',()=>{
  const plants=[plant(1,0,0,'flower',10),plant(2,1,0,'bush',11),
    plant(3,2,0,'flower',10)];
  assert.equal(planNatureFusions(plants,[],12).length,0);
  assert.equal(planNatureFusions(plants,[],14).length,1);
});
test('new foliage joins an existing patch rather than creating overlapping discs',()=>{
  const old={id:7,x:3,z:4,kind:'meadow',radius:4,count:4};
  const plan=planNatureFusions([plant(9,4,5),plant(10,4,6)], [old],12);
  assert.equal(plan.length,1);
  assert.equal(plan[0].regionId,7);
  assert.equal(plan[0].count,2);
});
test('rare and ordinary trees are never fused away',()=>{
  const plants=[plant(1,0,0,'blossom'),plant(2,.2,.1,'tree'),
    plant(3,1,1),plant(4,2,1),plant(5,3,1)];
  const plan=planNatureFusions(plants,[],12);
  assert.equal(plan.length,1);
  assert.equal(plan[0].kind,'enchanted');
  assert.deepEqual(plan[0].sourceIds,[3,4,5]);
  assert.equal(fusionKind([plant(6,0,0,'bush'),plant(7,0,0,'bush')]),'thicket');
});
test('fusion captures mixed pink, orange and lilac palettes',()=>{
  const p=[plant(1,1,1,'flower',1,'rose'),plant(2,2,1,'flower',1,'amber'),
    plant(3,2,2,'bush',1,'lilac')];
  assert.deepEqual(planNatureFusions(p,[],12)[0].colors,['rose','amber','lilac']);
});
test('region footprints stay bounded and summaries retain lifetime plant counts',()=>{
  assert.ok(FUSION_SETTLE>1.6);
  assert.ok(FUSION_MAX_REGIONS<=24);
  assert.equal(fusionRadius(100,'grove'),FUSION_MAX_RADIUS);
  const summary=regionSummary([
    {kind:'meadow',count:5},{kind:'grove',count:12}]);
  assert.deepEqual(summary,{regions:2,absorbed:17,
    kinds:{meadow:1,thicket:0,grove:1,enchanted:0}});
});
