// SKYSHIFT Architecture Cleanup 2.0 — Stage L immutable Chromium/WebGL QA relocation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const folder=resolve(root,'tests/browser');
const manifest=JSON.parse(readFileSync(resolve(folder,'stageL-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.entries);

test('Stage L: all 45 migrated WebGL QA modules have original, byte-exact Git blob SHA',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.stage,'L');
 assert.equal(names.length,45);
 for(const name of names){
  assert.match(name,/^browser-[\w-]+\.mjs$/);
  assert.equal(existsSync(resolve(root,name)),false,'Stale root browser QA module: '+name);
  const path=resolve(folder,name);
  assert.ok(existsSync(path),'Missing migrated QA: '+name);
  const data=readFileSync(path);
  const sha=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
  assert.equal(sha,manifest.entries[name],'Original Git blob changed: '+name);
  const source=data.toString('utf8');
  assert.doesNotMatch(source,/\bimport\.meta\.url\b/,
   'Source-relative path requires dedicated move: '+name);
  assert.doesNotMatch(source,/^\s*(?:import|export)\s+[^\n]*?\bfrom\s*['"]\.{1,2}\//m,
   'Local Node ESM import requires dedicated move: '+name);
  assert.doesNotMatch(source,/\b(?:readFileSync|existsSync|writeFileSync|readdirSync)\s*\(\s*['"]\.\//,
   'CWD-relative filesystem path requires dedicated review: '+name);
 }
});

test('Stage L: executable GitHub Actions entries all point to relocated QA',()=>{
 const workflows=resolve(repo,'.github/workflows');
 for(const file of readdirSync(workflows).filter(x=>/\.ya?ml$/.test(x))){
  const text=readFileSync(resolve(workflows,file),'utf8');
  for(const name of names)assert.ok(!text.includes('skyshift/'+name),
    'Stale workflow reference: '+file+' '+name);
 }
 for(const [file,items] of Object.entries(manifest.workflowReferences)){
  const text=readFileSync(resolve(workflows,file),'utf8');
  for(const name of items)assert.ok(text.includes('skyshift/tests/browser/'+name),
    'Lost historical or fast QA: '+file+' '+name);
 }
});

test('Stage L: protected browser readers remain at approved paths',()=>{
 assert.deepEqual(manifest.excludedRoot.slice().sort(),
 ['browser-cinematic-hero-v0210.mjs','browser-fairness-v0135.mjs',
  'browser-grip-half-v01348.mjs','browser-grip-trick-v0165.mjs',
  'browser-multi-track-v0160.mjs'].sort());
 for(const name of manifest.excludedRoot){
  if (["browser-fairness-v0135.mjs","browser-grip-half-v01348.mjs","browser-grip-trick-v0165.mjs","browser-multi-track-v0160.mjs"].includes(name)) {
   assert.equal(existsSync(resolve(root,name)),false,'Stale L1G root QA: '+name);
   assert.ok(existsSync(resolve(folder,name)),'Missing L1G QA: '+name);
   continue; // Independent L1G gate verifies original blob and CI commands.
  }
  assert.ok(existsSync(resolve(root,name)),'Protected browser source moved: '+name);
  assert.equal(existsSync(resolve(folder,name)),false,'Protected browser source copied: '+name);
 }
 for(const name of ['browser-smoke-v0498.mjs','browser-smoke-v04991.mjs',
  'browser-smoke-v071.mjs','browser-smoke-v080.mjs','browser-smoke-v081.mjs'])
  assert.ok(existsSync(resolve(root,name)),'Protected historical smoke reader moved: '+name);
});
