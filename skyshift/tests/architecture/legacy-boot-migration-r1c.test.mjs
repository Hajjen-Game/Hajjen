import {restoreEF02H} from './ef02h-path-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {readHistorical,historicalExists,historicalSyntaxCheck} from './legacy-retirement-l1a.mjs';
import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
// R1C: prove original Git blobs, historical test assertion identity,
// valid game import targets and cumulative root-file reduction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1CBootPaths} from './r1c-boot-test-path-overlay.mjs';
import {restoreR1FGamePaths,restoreR1FBootImport} from './r1f-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'legacy/boot/R1C-migration-manifest.json'),'utf8'));
const baseline=JSON.parse(readFileSync(resolve(root,'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
function gitBlobSha(content){
 const b=Buffer.from(content,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
test('R1C keeps exactly 20 original historical bootstrap bodies and game targets',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.files.length,20);
 assert.equal(manifest.previousRootFiles,429);
 assert.equal(manifest.expectedRootFiles,409);
 const names=new Set();
 for(const file of manifest.files){
  assert.ok(!names.has(file.name),'Duplicate archived bootstrap '+file.name);
  names.add(file.name);
  assert.match(file.name,/^boot-v\d+\.js$/);
  assert.equal(file.oldPath,'skyshift/'+file.name);
  assert.equal(file.newPath,'skyshift/legacy/boot/'+file.name);
  assert.ok(!existsSync(resolve(repo,file.oldPath)),'Old root bootstrap still present: '+file.name);
  const destination=resolve(repo,file.newPath);
  const body=readHistorical(destination,'utf8');
  const normalized=restoreR1FBootImport(restoreR1GBootImport(body));
  assert.equal((normalized.match(/import\("\.\.\/\.\.\/game-v/g)||[]).length,1,
   'Unexpected game import count '+file.name);
  const restored=normalized.replace('import("../../game-v','import("./game-v');
  assert.equal(gitBlobSha(restored),file.originalGitBlobSha,
   'Historical bootstrap content changed beyond approved game path: '+file.name);
  assert.equal(baseline.entries.find(x=>x.path===file.oldPath)?.sha,
   file.originalGitBlobSha,'Immutable R0 source SHA mismatch '+file.name);
  const match=body.match(/import\("([^"?]+\.mjs)\?[^"]+"\)/);
  assert.ok(match,'Missing historical game import '+file.name);
  assert.ok(historicalExists(resolve(dirname(destination),match[1])),
   'Game import resolves to missing source '+file.name);
 }
 assert.ok(!names.has('boot-v0210.js'));
 assert.ok(existsSync(resolve(root,'boot-v0210.js')));
 assert.ok(existsSync(resolve(root,'game-v0210.mjs')));
});

test('R1C all 24 original historical test Git blobs restore exactly (including UI flow assertions)',()=>{
 assert.equal(manifest.tests.length,24);
 const paths=new Set();
 let changed=0;
 for(const unit of manifest.tests){
  assert.ok(!paths.has(unit.path),'Duplicate original test '+unit.path);
  paths.add(unit.path);
  const source=readFileSync(resolve(repo,unit.path),'utf8');
  const restored=restoreR1CBootPaths(restoreR1FGamePaths(restoreR1GGamePaths(restoreEF02H(source,unit.path))));
  assert.notEqual(restored,source,'No audited reader change '+unit.path);
  assert.equal(gitBlobSha(restored),unit.originalGitBlobSha,
   'Historical test assertion changed unexpectedly '+unit.path);
  for(const match of source.matchAll(/["']\.\/legacy\/boot\/(boot-v\d+\.js)["']/g)){
   assert.ok(historicalExists(resolve(root,'legacy/boot',match[1])),'Missing relocated reader '+unit.path);
   changed++;
  }
 }
 assert.ok(changed>=24,'Every original historical reader must be updated');
 for(const n of manifest.uiFlowVersions){
  const source=readFileSync(resolve(root,'tests/unit/ui-flow-v'+n+'.test.mjs'),'utf8');
  const regexStart=String.raw`assert.match(boot,/import\("\.\.\/\.\.\/game-v`+n;
  assert.ok(restoreR1GGamePaths(source).includes(regexStart),'UI import assertion must verify new resolved path '+n);
 }
});

test('R1C CI rewire and cumulative 468 → 449 → 429 → 409 → 387 direct root-file count',()=>{
 const direct=readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile());
 assert.equal(direct.length,expectedRootFiles);
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const file of manifest.files){
  assert.ok(!workflow.includes('node --check '+file.oldPath),
   'Stale root bootstrap syntax-check path: '+file.name);
  assert.ok(historicalSyntaxCheck(workflow,file.newPath),
   'Missing moved bootstrap CI syntax-check path: '+file.name);
 }
 assert.equal(gitBlobSha(readFileSync(resolve(root,'boot-v0210.js'),'utf8')),
  baseline.entries.find(x=>x.path==='skyshift/boot-v0210.js')?.sha,
  'Live active bootstrap was modified');
});
