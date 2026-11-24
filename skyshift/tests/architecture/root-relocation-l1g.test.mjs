// L1G: exact byte-preserving root moves and workflow-command parity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const moved={
  "ARCHITECTURE-0280-SHARED-TUNNEL.md": "4dbf63c5a3702654ccf4932a6084a1ad2cb1a4cd",
  "CI-0281-RAIL-ROOF-GRIP-OPTIMIZATION.md": "437ff06a6ec1775587d77abae96f64430883b244",
  "ROLLBACK-REFERENCE-0285-BEFORE-0286.md": "29817c6d99ddf1f6c7ceaa9d33d308d65d894fbb",
  "UNIFIED-TUNNEL-LIGHTING-FOUNDATION-1.md": "f04304ccc5cef60932c912cd83c77b02b199a3ff",
  "browser-fairness-v0135.mjs": "bc7b71fa66a43362c5121b6da9f766480e115407",
  "browser-grip-half-v01348.mjs": "1c29049abdb68500802a2b7a4ffd93b1f4611779",
  "browser-grip-trick-v0165.mjs": "8c4300bcc454bc26822d46c8b7707d8666a69630",
  "browser-multi-track-v0160.mjs": "12f778f7e8535573697823b1c804d8bd654a4ca8"
};
const browser=Object.keys(moved).filter(n=>n.endsWith('.mjs'));
// These exact dynamic import literals belong to reviewed page.evaluate callbacks.
// They resolve relative to the loaded /skyshift/ document, not the Node runner.
const browserImports={
  "browser-fairness-v0135.mjs": [
    "./flight/steering-authority-v0901.mjs",
    "./trial-v01348.mjs"
  ],
  "browser-grip-half-v01348.mjs": [
    "./flight/steering-authority-v0901.mjs",
    "./trial-v01348.mjs"
  ],
  "browser-grip-trick-v0165.mjs": [
    "./flight/boost/boost-v0160.mjs",
    "./flight/boost/boost-v0160.mjs",
    "./premium-track-v0160.mjs",
    "./premium-track-v0160.mjs",
    "./racing-experience-v0160.mjs",
    "./shadow-tunnel-v0160.mjs",
    "./time-trial-v0160.mjs",
    "./time-trial-v0160.mjs",
    "./tracks/shared/track-selection-v0160.mjs",
    "./tracks/shared/track-selection-v0160.mjs",
    "./trial-v0164.mjs",
    "./trial-v0165.mjs",
    "./trial-v0165.mjs",
    "./trial-v0165.mjs",
    "./trial-v0165.mjs",
    "./trial-v0165.mjs",
    "./trial-v0165.mjs"
  ],
  "browser-multi-track-v0160.mjs": [
    "./flight/boost/boost-v0160.mjs",
    "./flight/boost/boost-v0160.mjs",
    "./premium-track-v0160.mjs",
    "./premium-track-v0160.mjs",
    "./racing-experience-v0160.mjs",
    "./shadow-tunnel-v0160.mjs",
    "./time-trial-v0160.mjs",
    "./time-trial-v0160.mjs",
    "./tracks/shared/track-selection-v0160.mjs",
    "./tracks/shared/track-selection-v0160.mjs",
    "./trial-v0160.mjs",
    "./trial-v0160.mjs"
  ]
};
test('L1G: eight root paths are absent and original Git blob identity is exact',()=>{
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,277);
 for(const [name,sha] of Object.entries(moved)){
  assert.ok(!existsSync(resolve(repo,'skyshift',name)),name);
  const data=readFileSync(resolve(repo,'skyshift',name.endsWith('.md')?'docs/architecture':'tests/browser',name));
  assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),sha,name);
  if(name.endsWith('.mjs')){
   const s=data.toString('utf8');
   assert.doesNotMatch(s,/\bimport\.meta\.url\b/);
   assert.doesNotMatch(s,/\b(?:from\s*|import\s*)["']\.{1,2}\//);
   const imports=[...s.matchAll(/\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)].map(m=>m[1]).sort();
   assert.deepEqual(imports,browserImports[name],name+' browser import inventory changed');
   for(const spec of imports)assert.ok(existsSync(resolve(repo,'skyshift',spec)),name+' missing document-relative module '+spec);
  }
 }
});
test('L1G: no stale workflow path and all four original browser syntax gates remain',()=>{
 const dir=resolve(repo,'.github/workflows');
 for(const f of readdirSync(dir).filter(x=>/\.ya?ml$/.test(x))){
  const s=readFileSync(resolve(dir,f),'utf8');
  for(const name of browser)assert.ok(!s.includes('skyshift/'+name),f+' '+name);
 }
 const history=readFileSync(resolve(dir,'skyshift-tests.yml'),'utf8');
 const fast=readFileSync(resolve(dir,'skyshift-ci-fast.yml'),'utf8');
 for(const name of browser)assert.ok(history.includes('node --check skyshift/tests/browser/'+name)||history.includes('node skyshift/tests/browser/'+name),name);
 assert.ok(fast.includes('skyshift/tests/browser/browser-grip-trick-v0165.mjs'));
});
