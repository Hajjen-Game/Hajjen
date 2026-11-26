// EF08: reconcile exact intentional roots with the reviewed retirement manifests.
// This is an independently recorded baseline, never a count of the actual checkout.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../../docs/architecture/'+name,import.meta.url),'utf8'));
const baseline=read('ef08-root-baseline.json');
const entryArchive=read('ef08-retired-entry-sources.json');
const cohort=read('ef08-obsolete-cohort.json');
const roots=new Set(baseline.entries.map(f=>f.path));
assert.equal(roots.size,baseline.rootCount);
const removed=[...entryArchive.files,...cohort.roots];
assert.equal(new Set(removed.map(f=>f.path)).size,removed.length,'Duplicate reviewed root retirement');
for(const f of removed){
 assert.ok(roots.delete(f.path),'Unreviewed retired root '+f.path);
 assert.match(f.sha,/^[a-f0-9]{40}$/);assert.ok(f.bytes>0);
}
export const expectedRootPaths=Object.freeze([...roots].sort());
export const expectedRootFiles=expectedRootPaths.length;
