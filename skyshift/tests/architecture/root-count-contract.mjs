// EF08: reconcile exact intentional roots with the reviewed retirement manifests.
// This is an independently recorded baseline, never a count of the actual checkout.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readOwnerRelocations} from '../../build/ef08-owner-paths.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../../docs/architecture/'+name,import.meta.url),'utf8'));
const baseline=read('ef08-root-baseline.json');
const entryArchive=read('ef08-retired-entry-sources.json');
const cohort=read('ef08-obsolete-cohort.json');
const relocation=readOwnerRelocations(fileURLToPath(new URL('../../../',import.meta.url)));
export const rootRelocations=relocation.manifest;
export const currentOwnerPath=relocation.currentPath;
assert.equal(rootRelocations.schema,1);
const roots=new Set(baseline.entries.map(f=>f.path));
assert.equal(roots.size,baseline.rootCount);
const removed=[...entryArchive.files,...cohort.roots];
assert.equal(new Set(removed.map(f=>f.path)).size,removed.length,'Duplicate reviewed root retirement');
for(const f of removed){
 assert.ok(roots.delete(f.path),'Unreviewed retired root '+f.path);
 assert.match(f.sha,/^[a-f0-9]{40}$/);assert.ok(f.bytes>0);
}
assert.equal(new Set(rootRelocations.moves.map(f=>f.oldPath)).size,rootRelocations.moves.length,'Duplicate reviewed move');
assert.equal(new Set(rootRelocations.moves.map(f=>f.newPath)).size,rootRelocations.moves.length,'Duplicate relocation destination');
for(const f of rootRelocations.moves){
 assert.ok(roots.delete(f.oldPath),'Unreviewed or already retired root '+f.oldPath);
 assert.match(f.newPath,/^skyshift\/(?:(?:rendering|tunnel|ships|qa|world)\/[^/]+\.mjs|styles\/[^/]+\.css)$/);
 assert.equal(f.oldPath.split('/').at(-1),f.newPath.split('/').at(-1));
 assert.match(f.sourceSha,/^[a-f0-9]{40}$/);assert.match(f.destinationSha,/^[a-f0-9]{40}$/);
}
export const expectedRootPaths=Object.freeze([...roots].sort());
export const expectedRootFiles=expectedRootPaths.length;
