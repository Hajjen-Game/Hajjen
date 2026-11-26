// EF08: a shared, reviewed path mapping for build and architecture evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
export function readOwnerRelocations(repo){
 const manifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef08-root-relocations.json'),'utf8'));
 assert.equal(manifest.schema,1);
 const byOld=new Map(),destinations=new Set(),reviewed=new Map();
 for(const batch of manifest.batches){
  const proof=batch.productionEvidence;
  assert.equal(proof.commit,batch.rollbackCommit);assert.equal(proof.run,batch.productionRun);
  assert.ok(Number.isInteger(proof.job)&&proof.job>0);
  const production=new Set(proof.productionRoots),other=new Set(proof.otherSourceRoots);
  for(const f of batch.moves){
   const name=basename(f.oldPath);
   assert.ok(production.has(name)!==other.has(name),f.oldPath+' missing or ambiguous baseline membership');
   assert.equal(f.productionBefore,production.has(name),f.oldPath+' incorrect baseline membership');
   assert.equal(typeof f.sourceReachableBefore,'boolean');
   if(batch.sourceEvidence){
    assert.equal(batch.sourceEvidence.commit,batch.rollbackCommit);assert.equal(batch.sourceEvidence.run,batch.architectureRun);
    assert.equal(f.sourceReachableBefore,batch.sourceEvidence.sourceReachableRoots.includes(f.oldPath),f.oldPath+' incorrect source graph membership');
   }else assert.equal(f.sourceReachableBefore,true,f.oldPath+' original graphics batch must remain source-reachable');
   assert.ok(!reviewed.has(f.oldPath),f.oldPath+' duplicate batch move');
   reviewed.set(f.oldPath,f);
  }
 }
 assert.equal(reviewed.size,manifest.moves.length);
 for(const f of manifest.moves){
  assert.deepEqual(f,reviewed.get(f.oldPath),f.oldPath+' inconsistent reviewed move');
  assert.equal(typeof f.productionBefore,'boolean');
  assert.match(f.oldPath,/^skyshift\/[^/]+\.mjs$/);
  assert.match(f.newPath,/^skyshift\/(?:[\w-]+\/)+[\w.-]+\.mjs$/);
  assert.equal(basename(f.oldPath),basename(f.newPath));
  assert.match(f.sourceSha,/^[a-f0-9]{40}$/);assert.match(f.destinationSha,/^[a-f0-9]{40}$/);
  assert.ok(!byOld.has(f.oldPath)&&!destinations.has(f.newPath),'Duplicate reviewed owner '+f.oldPath);
  byOld.set(f.oldPath,f.newPath);destinations.add(f.newPath);
 }
 return {manifest,currentPath:path=>byOld.get(path)||path};
}
