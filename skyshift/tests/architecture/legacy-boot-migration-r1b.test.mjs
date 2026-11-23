// SKYSHIFT Root Consolidation R1B: immutable original byte hashes,
// unchanged test assertions and correct historical game import targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1BBootPaths} from './r1b-boot-test-path-overlay.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'legacy/boot/R1B-migration-manifest.json'),'utf8'));
const baseline=JSON.parse(readFileSync(resolve(root,'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
function sha(content){
 const b=Buffer.from(content,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}

test('R1B exactly 20 original boot Git blobs preserved except the identical game URL rebase',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.files.length,20);
 assert.equal(manifest.previousRootFiles,449);
 assert.equal(manifest.expectedRootFiles,429);
 const names=new Set();
 for(const item of manifest.files){
  assert.match(item.name,/^boot-v\d+\.js$/);
  assert.ok(!names.has(item.name),'Duplicate original bootstrap: '+item.name);
  names.add(item.name);
  assert.equal(item.oldPath,'skyshift/'+item.name);
  assert.equal(item.newPath,'skyshift/legacy/boot/'+item.name);
  assert.ok(!existsSync(resolve(repo,item.oldPath)),'Old root bootstrap remains '+item.name);
  const target=resolve(repo,item.newPath);
  assert.ok(existsSync(target),'Missing moved historical bootstrap '+item.name);
  const source=readFileSync(target,'utf8');
  assert.equal((source.match(/import\("\.\.\/\.\.\/game-v/g)||[]).length,1,
   'Exactly one relocated game URL required '+item.name);
  const original=source.replace('import("../../game-v','import("./game-v');
  assert.equal(sha(original),item.originalGitBlobSha,
   'Unexpected mutation to bootstrap '+item.name);
  assert.equal(baseline.entries.find(e=>e.path===item.oldPath)?.sha,
   item.originalGitBlobSha,'R0 Git blob baseline disagrees: '+item.name);
  const match=source.match(/import\("(\.\.\/\.\.\/game-v[^"?]+\.mjs)\?[^"]+"\)/);
  assert.ok(match,'Missing historical versioned import '+item.name);
  assert.ok(existsSync(resolve(dirname(target),match[1])),
   'Historical game import resolves incorrectly '+item.name);
 }
 assert.ok(!names.has('boot-v0210.js'));
 const live=readFileSync(resolve(root,'boot-v0210.js'),'utf8');
 assert.equal(sha(live),baseline.entries.find(e=>e.path==='skyshift/boot-v0210.js')?.sha);
});

test('R1B original source SHA of 22 historic unit readers is retained, with no assertion edits',()=>{
 assert.equal(manifest.tests.length,22);
 const seen=new Set();
 let rebased=0;
 for(const item of manifest.tests){
  assert.ok(!seen.has(item.path),'duplicate historical source reader '+item.path);
  seen.add(item.path);
  const p=resolve(repo,item.path),source=readFileSync(p,'utf8');
  const restored=restoreR1BBootPaths(source);
  assert.notEqual(restored,source,'Missing R1B reader rebase '+item.path);
  assert.equal(sha(restored),item.originalGitBlobSha,
   'Historical test assertion or source changed '+item.path);
  for(const m of source.matchAll(/["']\.\/legacy\/boot\/(boot-v\d+\.js)["']/g)){
   assert.ok(existsSync(resolve(root,'legacy/boot',m[1])),
    'Historical test reader has broken target '+item.path+' -> '+m[1]);
   rebased++;
  }
 }
 assert.ok(rebased>=22,'Expected rebase of all 22 historical readers');
});

test('R1B CI and root layout enforce the total 468 → 449 → 429 file moves',()=>{
 const files=readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile());
 assert.equal(files.length,429,'Incorrect cumulative root count');
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const item of manifest.files){
  assert.ok(!workflow.includes('node --check '+item.oldPath),
   'Stale historical syntax check '+item.name);
 }
 assert.ok(workflow.includes('skyshift/legacy/boot/boot-v0205.js'));
 assert.ok(workflow.includes('skyshift/legacy/boot/boot-v0164.js'));
 assert.ok(existsSync(resolve(root,'boot-v0210.js')));
 assert.ok(existsSync(resolve(root,'game-v0210.mjs')));
});
