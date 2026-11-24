import {readHistorical,historicalExists} from './legacy-retirement-l1a.mjs';
// SKYSHIFT Architecture Cleanup 2.0 Stage M — original source and resolved glTF audit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {restoreStageMPaths} from './stageM-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const m=JSON.parse(readFileSync(resolve(root,'world/stageM-migration-manifest.json'),'utf8'));
const files=Object.entries(m.files);
function gitBlobHash(s){const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')}

test('Stage M: immutable Git source hashes preserved across all 16 world modules',()=>{
 assert.equal(m.schemaVersion,1);assert.equal(m.stage,'M');assert.equal(files.length,16);
 assert.equal(files.filter(([n])=>n.startsWith('build-station-world-')).length,8);
 assert.equal(files.filter(([n])=>n.startsWith('environment-art-pipeline-')).length,8);
 for(const [name,{destination,originalGitBlobSha,assetRebase}] of files){
  assert.equal(existsSync(resolve(root,name)),false,'Original root source still exists: '+name);
  const file=resolve(repo,destination);
  assert.ok(existsSync(file),'Missing relocated module: '+name);
  const contents=readFileSync(file,'utf8');
  if(assetRebase){
   const matches=[...contents.matchAll(/assetPath:"(\.\.\/assets\/worlds\/[^"]+)"/g)];
   assert.equal(matches.length,1,'Exactly one assetPath rebase expected: '+name);
   const asset=fileURLToPath(new URL(matches[0][1],pathToFileURL(file)));
   assert.ok(existsSync(asset),'Rebased glTF URL must still resolve: '+name+' -> '+asset);
   assert.equal((contents.match(/import\.meta\.url/g)||[]).length,1);
   assert.equal(gitBlobHash(contents.replace('assetPath:"../assets/worlds/','assetPath:"./assets/worlds/')),
    originalGitBlobSha,'Unexpected world/material/geometry source changes: '+name);
  }else{
   assert.equal(gitBlobHash(contents),originalGitBlobSha,'Asset generator source changed: '+name);
  }
 }
});

test('Stage M: nine active/historical game consumers and eight unit suites point to existing world files',()=>{
 assert.equal(m.gameConsumers.length,9);assert.equal(m.unitTests.length,8);
 for(const name of m.gameConsumers){
  const archived=resolve(root,'legacy/game',name);
  const path=historicalExists(archived)?archived:resolve(root,name);
  const game=readHistorical(path,'utf8');
  assert.ok(game.includes((path===archived?'../../':'./')+'world/environment-art-pipeline-v020'),'Missing moved world import: '+name);
  assert.doesNotMatch(game,/\bfrom\s*["']\.\/environment-art-pipeline-v020/,'Stale game ESM import: '+name);
 }
 for(const name of m.unitTests){
  const source=readFileSync(resolve(root,'tests/unit',name),'utf8');
  assert.ok(source.includes('../../world/authoring/build-station-world-v020'),'Missing relocated generator import: '+name);
  assert.ok(!restoreStageMPaths(source).includes('../../world/authoring/'),'Original unit SHA path overlay incomplete: '+name);
  for(const match of source.matchAll(/from\s*["'](\.\.\/\.\.\/world\/[^"']+)["']/g))
   assert.ok(existsSync(resolve(root,'tests/unit',match[1])),'Unit import unresolved: '+name+' '+match[1]);
 }
});

test('Stage M: executable workflows retain the relocated source and authoring commands',()=>{
 for(const [workflow,refs] of Object.entries(m.workflowReferences)){
  const yaml=readFileSync(resolve(repo,'.github/workflows',workflow),'utf8');
  assert.ok(refs.length,'No audited workflow paths for '+workflow);
  for(const name of refs){
   assert.ok(yaml.includes(m.files[name].destination),'Original CI command missing after move: '+workflow+' '+name);
   assert.ok(!yaml.includes('skyshift/'+name),'Obsolete CI command path: '+workflow+' '+name);
  }
 }
});
