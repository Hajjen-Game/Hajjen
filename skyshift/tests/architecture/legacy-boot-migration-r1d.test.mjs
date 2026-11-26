import {restoreDeckMove,deckCurrentPath} from './ef02-closure-deck-overlay.mjs';
import {restoreEF02H} from './ef02h-path-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {readHistorical,retiredHistoricalReader,historicalExists,historicalSyntaxCheck} from './legacy-retirement-l1a.mjs';
import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
// SKYSHIFT R1D: prove exact original Git blobs and historical reader assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1DBootPaths} from './r1d-boot-test-path-overlay.mjs';
import {restoreR1EGamePaths} from './r1e-game-test-path-overlay.mjs';
import {restoreR1FGamePaths} from './r1f-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'legacy/boot/R1D-migration-manifest.json'),'utf8'));
const baseline=JSON.parse(readFileSync(resolve(root,'docs/architecture/root-baseline-2026-11-23.json'),'utf8'));
function sha(content){const b=Buffer.from(content,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
test('R1D: all 22 historical bootstraps remain byte-identical except valid game import path',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.files.length,22);
 assert.equal(manifest.previousRootFiles,409);
 assert.equal(manifest.expectedRootFiles,387);
 for(const f of manifest.files){
  assert.match(f.name,/^boot-v\d+\.js$/);
  assert.equal(f.oldPath,'skyshift/'+f.name);
  assert.equal(f.newPath,'skyshift/legacy/boot/'+f.name);
  assert.ok(!existsSync(resolve(repo,f.oldPath)),'Stale root bootstrap '+f.name);
  const dest=resolve(repo,f.newPath);
  assert.ok(historicalExists(dest),'Missing historic bootstrap '+f.name);
  const content=readHistorical(dest,'utf8');
  const version=f.name.slice('boot-v'.length,-'.js'.length);
  const isGameMoved=historicalExists(resolve(root,'legacy/game/game-v'+version+'.mjs'));
  const prefix=isGameMoved?'../game/game-v':'../../game-v';
  assert.equal(content.split('import("'+prefix+version+'.mjs').length,2,'Expected one correctly rebased game import '+f.name);
  assert.ok(historicalExists(resolve(dirname(dest),prefix+version+'.mjs')),'Historic game target does not exist '+f.name);
  const previous=isGameMoved?content.replace('import("../game/game-v','import("../../game-v'):content;
  assert.equal(sha(previous.replace('import("../../game-v','import("./game-v')),f.originalGitBlobSha,'Original historical bootstrap changed '+f.name);
  assert.equal(baseline.entries.find(e=>e.path===f.oldPath)?.sha,f.originalGitBlobSha,'Immutable R0 SHA mismatch '+f.name);
 }
 assert.ok(!manifest.files.some(f=>f.name==='boot-v0210.js'));
});
test('R1D: all 34 source readers invert to their exact pre-migration Git blob SHA',()=>{
 assert.equal(manifest.tests.length,34);
 const seen=new Set();
 for(const t of manifest.tests){
  assert.ok(!seen.has(t.path),'Duplicate historic test '+t.path);seen.add(t.path);
  if(retiredHistoricalReader(t.path))continue;
  const source=readFileSync(resolve(repo,t.path),'utf8');
  const restored=restoreR1DBootPaths(restoreR1EGamePaths(restoreR1FGamePaths(restoreR1GGamePaths(restoreEF02H(source,t.path)))));
  assert.notEqual(restored,source,'No versioned boot reference changed '+t.path);
  assert.equal(sha(restored),t.originalGitBlobSha,'Original historic test changed beyond audited path adjustments '+t.path);
  for(const f of manifest.files){
   assert.ok(!source.includes('"./'+f.name+'"'),'Stale root path '+t.path+' -> '+f.name);
   assert.ok(!source.includes('"'+f.name+'"'),'Stale bare root path '+t.path+' -> '+f.name);
  }
 }
});
test('R1D: measured approved direct root files, CI paths and original live entrypoints',()=>{
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const f of manifest.files){
  assert.ok(historicalSyntaxCheck(workflow,f.newPath),'Missing historic bootstrap syntax gate '+f.name);
  assert.ok(!workflow.includes('node --check '+f.oldPath),'Stale historic bootstrap syntax gate '+f.name);
 }
 assert.equal(sha(readFileSync(resolve(root,'index.html'),'utf8')),manifest.liveEntrySha);
 assert.equal(sha(readFileSync(resolve(root,'boot-v0210.js'),'utf8')),manifest.liveBootSha);
 assert.equal(sha(restoreDeckMove(readFileSync(resolve(root,'game-v0210.mjs'),'utf8'),resolve(root,'game-v0210.mjs'))),manifest.liveGameSha);
 assert.ok(historicalExists(resolve(root,'boot-v0101.js'))&&historicalExists(resolve(root,'boot-v0103.js')));
});
