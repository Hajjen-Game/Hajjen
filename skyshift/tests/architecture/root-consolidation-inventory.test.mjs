import test from 'node:test';
import assert from 'node:assert/strict';
import {assertInventorySafety,report} from './root-consolidation-inventory.mjs';
test('R0: live graph resolves and root migration is measurable without calling old versions unused',()=>{
 const result=assertInventorySafety();
 assert.equal(result.baselineRootCount,468);
 assert.ok(result.liveGraphFiles>20);
 assert.equal(result.liveGraphBrokenLocalPaths.length,0);
 assert.ok(result.counts.otherReferenced>0);
 console.log('SKYSHIFT_ROOT_R0_COUNTS '+JSON.stringify({
  original:result.baselineRootCount,now:result.currentRootCount,
  counts:result.counts,activeGraph:result.liveGraphFiles,
  noObservedReferenceNote:'NOT proof of safety to remove or move'
 }));
});
