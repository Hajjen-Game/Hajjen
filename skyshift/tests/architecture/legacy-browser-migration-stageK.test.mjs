import {restoreEF02H,ef02hCurrentPath} from './ef02h-path-overlay.mjs';
// SKYSHIFT Architecture Cleanup 2.0 Stage K — immutable historical browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const legacy=resolve(root,'tests/browser/legacy');
const manifest=JSON.parse(readFileSync(resolve(legacy,'stageK-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.entries);

test('Stage K: all 57 archived WebGL smoke runners have their original Git blob SHA',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.stage,'K');
 assert.equal(names.length,57);
 for(const name of names){
  assert.match(name,/^browser-smoke-v[0-9]+\.mjs$/);
  assert.equal(existsSync(resolve(root,name)),false,'Old root QA runner remains: '+name);
  const dest=resolve(legacy,name);
  assert.ok(existsSync(dest),'Migrated runner missing: '+name);
  const source=Buffer.from(restoreEF02H(readFileSync(dest,'utf8'),dest),'utf8');
  const sha=createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex');
  assert.equal(sha,manifest.entries[name],'Original Git blob changed: '+name);
  const text=source.toString('utf8');
  assert.doesNotMatch(text,/\bimport\.meta\.url\b/,'Source-relative filesystem URL needs review: '+name);
  assert.doesNotMatch(text,/^\s*(?:import|export)\s+[^\n]*?\bfrom\s*['"]\.{1,2}\//m,
   'Static relative Node import needs rebase: '+name);
 }
});

test('Stage K: historical jobs execute the relocated QA runner paths',()=>{
 const workflows=resolve(repo,'.github/workflows');
 for(const file of readdirSync(workflows).filter(x=>/\.ya?ml$/.test(x))){
  const content=readFileSync(resolve(workflows,file),'utf8');
  for(const name of names){
   assert.ok(!content.includes('skyshift/'+name),'Stale workflow command: '+file+' / '+name);
  }
 }
 const historical=readFileSync(resolve(workflows,'skyshift-tests.yml'),'utf8');
 for(const name of manifest.workflowEntries)
  assert.ok(historical.includes('skyshift/tests/browser/legacy/'+name),
   'Historical Chrome/WebGL workflow lost its QA job: '+name);
});

test('Stage K: five unit-test source readers resolve the relocated protected original smoke runners',()=>{
 assert.deepEqual(manifest.protectedRoot.slice().sort(),
  ['browser-smoke-v0498.mjs','browser-smoke-v04991.mjs','browser-smoke-v071.mjs',
   'browser-smoke-v080.mjs','browser-smoke-v081.mjs'].sort());
 for(const name of manifest.protectedRoot){
  assert.ok(!existsSync(resolve(root,name)),'Stale L1H root fixture: '+name);
  assert.ok(existsSync(resolve(legacy,name)),'Missing L1H fixture: '+name);
 }
});
