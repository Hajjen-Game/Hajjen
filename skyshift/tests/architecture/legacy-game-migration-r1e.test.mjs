import {readHistorical,historicalExists,historicalSyntaxCheck} from './legacy-retirement-l1a.mjs';
import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
// SKYSHIFT R1E — original 30 game Git blobs, unchanged historical tests and 8 boot URL targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1EGamePaths} from './r1e-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'legacy/game/R1E-migration-manifest.json'),'utf8'));
const baseline=JSON.parse(readFileSync(resolve(root,'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
function sha(content){const b=Buffer.from(content,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
const importRE=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\//g;
const migratedImportRE=/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\.\/\.\.\//g;
test('R1E: 30 exact historical game source Git blobs survive only imported module path rebase',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.previousRootFiles,387);
 assert.equal(manifest.expectedRootFiles,357);
 assert.equal(manifest.files.length,30);
 const seen=new Set();
 for(const f of manifest.files){
  assert.match(f.name,/^game-v\d+\.mjs$/);
  assert.ok(!seen.has(f.name)); seen.add(f.name);
  assert.equal(f.oldPath,'skyshift/'+f.name);
  assert.equal(f.newPath,'skyshift/legacy/game/'+f.name);
  assert.ok(!existsSync(resolve(repo,f.oldPath)),'Old game source still in root '+f.name);
  const file=resolve(repo,f.newPath),source=readHistorical(file,'utf8');
  assert.ok(!source.includes('import.meta.url')&&!source.includes('new URL('),'Unexpected module-base URL '+f.name);
  assert.ok(!importRE.test(source),'Unrebased relative import '+f.name);importRE.lastIndex=0;
  const original=source.replace(migratedImportRE,'$1./');
  assert.equal(sha(original),f.originalGitBlobSha,'Unexpected game body mutation '+f.name);
  assert.equal(baseline.entries.find(e=>e.path===f.oldPath)?.sha,f.originalGitBlobSha,'R0 immutable source baseline mismatch '+f.name);
  let checked=0;
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.\.\/\.\.\/[^"'?#]+)\1/g)){
   assert.ok(existsSync(resolve(dirname(file),match[2])),'Missing historical game dependency '+f.name+' -> '+match[2]);
   checked++;
  }
  assert.ok(checked>=2,'Historical snapshot lacks tested module dependencies '+f.name);
 }
});
test('R1E: all 28 original historical unit test Git blobs restore exactly after path inverse',()=>{
 assert.equal(manifest.tests.length,28);
 for(const f of manifest.tests){
  const source=readFileSync(resolve(repo,f.path),'utf8');
  const restored=restoreR1EGamePaths(restoreR1GGamePaths(source));
  assert.notEqual(restored,source,'No game source path changed '+f.path);
  assert.equal(sha(restored),f.originalGitBlobSha,'Historical assertion changed beyond path updates '+f.path);
 }
});
test('R1E: eight archive bootstraps still resolve to exact historic game with original Git SHA',()=>{
 assert.equal(manifest.bootstraps.length,8);
 for(const b of manifest.bootstraps){
  const file=resolve(repo,b.path),source=readHistorical(file,'utf8');
  const prefix='import("../game/game-v'+b.version+'.mjs';
  assert.equal(source.split(prefix).length,2,'Invalid new equivalent game URL '+b.path);
  assert.ok(historicalExists(resolve(dirname(file),'../game/game-v'+b.version+'.mjs')),'Missing historical game target '+b.version);
  assert.equal(sha(source.replace('import("../game/game-v','import("../../game-v')),b.originalGitBlobShaBeforeR1E,'Historical bootstrap body changed '+b.path);
 }
});
test('R1E: original 387 → 357 stage remains intact; current root 286; live entrypoint unchanged; CI rewired',()=>{
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()).length,286);
 assert.equal(sha(readFileSync(resolve(root,'index.html'),'utf8')),manifest.active.index);
 assert.equal(sha(readFileSync(resolve(root,'boot-v0210.js'),'utf8')),manifest.active.boot);
 assert.equal(sha(readFileSync(resolve(root,'game-v0210.mjs'),'utf8')),manifest.active.game);
 const wf=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const f of manifest.files){
  assert.ok(historicalSyntaxCheck(wf,f.newPath),'Missing relocated game syntax gate '+f.name);
  assert.ok(!wf.includes('node --check '+f.oldPath),'Stale legacy source syntax gate '+f.name);
 }
});
