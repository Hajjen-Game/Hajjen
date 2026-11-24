// SKYSHIFT root consolidation R1: preserve original git byte hashes except one
// exactly specified relative-import adjustment in relocated legacy boot files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1FBootImport} from './r1f-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'legacy/boot/R1-migration-manifest.json'),'utf8'));
const baseline=JSON.parse(readFileSync(resolve(root,'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
function gitHash(s){
 const b=Buffer.from(s,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
test('R1 exactly 19 selected historical bootstraps preserve original Git SHA and game URL',()=>{
 assert.equal(manifest.files.length,19);
 assert.equal(manifest.expectedRootAfter,449);
 const names=new Set();
 for(const file of manifest.files){
  assert.match(file.name,/^boot-v[0-9]+\.js$/);
  assert.ok(!names.has(file.name),'duplicate boot name: '+file.name);
  names.add(file.name);
  assert.equal(file.oldPath,'skyshift/'+file.name);
  assert.equal(file.newPath,'skyshift/legacy/boot/'+file.name);
  assert.ok(!existsSync(resolve(repo,file.oldPath)),'Old root file still present: '+file.name);
  const newFile=resolve(repo,file.newPath);
  assert.ok(existsSync(newFile),'Relocated bootstrap missing: '+file.name);
  const relocated=readFileSync(newFile,'utf8');
  const normalized=restoreR1FBootImport(relocated);
  const rewritten=normalized.match(/import\(["']\.\.\/\.\.\/(game-v[^"']+\.mjs\?[^"']+)["']\)/g)||[];
  assert.equal(rewritten.length,1,'Expected exactly one original game import: '+file.name);
  const reverted=normalized.replace('import("../../game-v','import("./game-v');
  assert.notEqual(reverted,relocated,'No scoped boot import rebase: '+file.name);
  assert.equal(gitHash(reverted),file.originalGitBlobSha,'Unexpected bootstrap source edit: '+file.name);
  const original=baseline.entries.find(e=>e.path===file.oldPath);
  assert.equal(original?.sha,file.originalGitBlobSha,'Baseline Git blob SHA mismatch: '+file.name);
  const match=relocated.match(/import\(["']([^"']+\.mjs)\?[^"']+["']\)/);
  assert.ok(match,'Original game target not found: '+file.name);
  assert.ok(existsSync(resolve(dirname(newFile),match[1])),'Broken legacy game target: '+file.name);
 }
 assert.ok(!names.has('boot-v0210.js'),'Never relocate active bootstrap');
 assert.ok(existsSync(resolve(root,'boot-v0210.js')));
 assert.ok(existsSync(resolve(root,'game-v0210.mjs')));
});
test('R1 CI points to all relocated bootstraps and cumulative root inventory reflects 468 to 409',()=>{
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 const rootPaths=manifest.files.map(x=>x.name);
 for(const name of rootPaths){
  assert.ok(workflow.includes('skyshift/legacy/boot/'+name),'Missing syntax check for '+name);
  assert.ok(!workflow.includes('node --check skyshift/'+name),'Stale root syntax check for '+name);
 }
 const files=readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile());
 assert.equal(files.length,328,'R1 plus R1B plus R1C must leave 328 root files (468 - 19 - 20 - 20 - 22 - 30 - 29)');
});
