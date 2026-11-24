import {readHistorical,historicalExists,historicalSyntaxCheck} from './legacy-retirement-l1a.mjs';
import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
// SKYSHIFT R1F — independent immutability, resolved module graph, boot integrity and root count.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1FGamePaths,restoreR1FBootImport} from './r1f-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'legacy/game/R1F-migration-manifest.json'),'utf8'));
const r0=JSON.parse(readFileSync(resolve(root,'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
function sha(content){const b=Buffer.from(content,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
const staticImportRE=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\.\/\.\.\//g;
const unrebasedRE=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\//g;
test('R1F: 29 historic game versions exactly recover their immutable original Git blobs',()=>{
 assert.equal(manifest.previousRootFiles,357);
 assert.equal(manifest.expectedRootFiles,328);
 assert.equal(manifest.files.length,29);
 const names=new Set();
 for(const item of manifest.files){
  assert.ok(!names.has(item.name),'Duplicate historical snapshot '+item.name); names.add(item.name);
  assert.equal(item.oldPath,'skyshift/'+item.name);
  assert.equal(item.newPath,'skyshift/legacy/game/'+item.name);
  assert.ok(!existsSync(resolve(repo,item.oldPath)),'Unexpected historical game root file '+item.name);
  const file=resolve(repo,item.newPath),source=readHistorical(file,'utf8');
  assert.ok(!source.includes('new URL(')&&!source.includes('import.meta.url'),'Unexpected module base-dependent path '+item.name);
  assert.ok(!unrebasedRE.test(source),'Unrebased relative static import '+item.name);unrebasedRE.lastIndex=0;
  assert.equal(sha(source.replace(staticImportRE,'$1./')),item.originalGitBlobSha,'Original historical game code mutated '+item.name);
  assert.equal(r0.entries.find(e=>e.path===item.oldPath)?.sha,item.originalGitBlobSha,'R0 baseline Git SHA mismatch '+item.name);
  let imports=0;
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.\.\/\.\.\/[^"'?#]+)\1/g)){
   assert.ok(existsSync(resolve(dirname(file),match[2])),'Missing historical game module dependency '+item.name+' -> '+match[2]);imports++;
  }
  assert.ok(imports>=10,'No meaningful dependency graph checked '+item.name);
 }
});
test('R1F: 25 historical original unit reader blobs invert exactly',()=>{
 assert.equal(manifest.tests.length,25);
 for(const item of manifest.tests){
  const source=readFileSync(resolve(repo,item.path),'utf8');
  const restored=restoreR1FGamePaths(restoreR1GGamePaths(source));
  assert.notEqual(restored,source,'Historical game source read did not rebase '+item.path);
  assert.equal(sha(restored),item.originalGitBlobShaBeforeR1F,'Historic unit assertions mutated '+item.path);
 }
});
test('R1F: 29 archived bootstraps target the moved source, with original Git body SHA intact',()=>{
 assert.equal(manifest.bootstraps.length,29);
 for(const b of manifest.bootstraps){
  const file=resolve(repo,b.path),source=readHistorical(file,'utf8');
  const prefix='import("../game/game-v'+b.version+'.mjs';
  assert.equal(source.split(prefix).length,2,'Wrong historical bootstrap import URL '+b.path);
  assert.ok(historicalExists(resolve(dirname(file),'../game/game-v'+b.version+'.mjs')),'Missing imported historic game '+b.version);
  assert.equal(sha(restoreR1FBootImport(source)),b.originalGitBlobShaBeforeR1F,'Unapproved historical bootstrap edit '+b.path);
 }
});
test('R1F: 357 → 328 direct-root files, untouched active and held archive entrypoints, CI paths',()=>{
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).length,277);
 assert.equal(sha(readFileSync(resolve(root,'index.html'),'utf8')),manifest.active.index);
 assert.equal(sha(readFileSync(resolve(root,'boot-v0210.js'),'utf8')),manifest.active.boot);
 assert.equal(sha(readFileSync(resolve(root,'game-v0210.mjs'),'utf8')),manifest.active.game);
 assert.equal(sha(readFileSync(resolve(root,'boot-v0101.js'),'utf8')),manifest.active.heldBoot0101);
 assert.equal(sha(readFileSync(resolve(root,'boot-v0103.js'),'utf8')),manifest.active.heldBoot0103);
 assert.equal(sha(readFileSync(resolve(root,'game-v0101.mjs'),'utf8')),manifest.active.heldGame0101);
 assert.equal(sha(readFileSync(resolve(root,'game-v0103.mjs'),'utf8')),manifest.active.heldGame0103);
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const item of manifest.files){
  assert.ok(historicalSyntaxCheck(workflow,item.newPath),'Missing relocated game syntax check '+item.name);
  assert.ok(!workflow.includes('node --check '+item.oldPath),'Stale game syntax check '+item.name);
 }
});
