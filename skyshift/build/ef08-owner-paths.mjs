// EF08: a shared, reviewed path mapping for build and architecture evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
export function readOwnerRelocations(repo){
 const manifest=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef08-root-relocations.json'),'utf8'));
 assert.equal(manifest.schema,1);
 const byOld=new Map(),destinations=new Set();
 for(const f of manifest.moves){
  assert.match(f.oldPath,/^skyshift\/[^/]+\.mjs$/);
  assert.match(f.newPath,/^skyshift\/(?:[\w-]+\/)+[\w.-]+\.mjs$/);
  assert.equal(basename(f.oldPath),basename(f.newPath));
  assert.match(f.sourceSha,/^[a-f0-9]{40}$/);assert.match(f.destinationSha,/^[a-f0-9]{40}$/);
  assert.ok(!byOld.has(f.oldPath)&&!destinations.has(f.newPath),'Duplicate reviewed owner '+f.oldPath);
  byOld.set(f.oldPath,f.newPath);destinations.add(f.newPath);
 }
 return {manifest,currentPath:path=>byOld.get(path)||path};
}
