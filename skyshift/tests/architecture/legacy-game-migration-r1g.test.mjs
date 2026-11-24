import {readHistorical,historicalExists,historicalSyntaxCheck} from './legacy-retirement-l1a.mjs';
// Mandatory R1G original Git identity / dependency / live entrypoint gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreR1GGamePaths,restoreR1GBootImport} from './r1g-game-test-path-overlay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),repo=resolve(root,'..');
const read=p=>readFileSync(resolve(repo,p),'utf8');
const m=JSON.parse(read('skyshift/legacy/game/R1G-migration-manifest.json'));
const baseline=JSON.parse(read('skyshift/docs/architecture/root-baseline-2026-11-23.json'));
function sha(s){const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')}
test('R1G: 42 immutable game sources, equivalent imports and held entrypoints',()=>{
 assert.equal(m.files.length,42);assert.equal(m.previousRootFiles,328);assert.equal(m.expectedRootFiles,286);
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).length,285);
 for(const h of m.held)assert.equal(sha(readHistorical(resolve(repo,h.path))),h.sha,h.path);
 for(const f of m.files){
  assert.equal(f.oldPath,'skyshift/'+f.name);assert.equal(f.newPath,'skyshift/legacy/game/'+f.name);
  assert.ok(!existsSync(resolve(repo,f.oldPath)),f.oldPath);
  const s=readHistorical(resolve(repo,f.newPath));assert.ok(!s.includes('import.meta.url'),f.name);
  assert.equal(sha(s.replace(/(\bfrom\s*["']|\bimport\s*["']|\bimport\s*\(\s*["'])\.\.\/\.\.\//g,'$1./')),f.originalGitBlobSha,f.name);
  assert.equal(baseline.entries.find(e=>e.path===f.oldPath)?.sha,f.originalGitBlobSha,f.name);
  const re=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.\.\/\.\.\/[^"'?#]+)\1/g;
  let n=0;for(const match of s.matchAll(re)){assert.ok(existsSync(resolve(dirname(resolve(repo,f.newPath)),match[2])),f.name+' '+match[2]);n++}assert.ok(n>=10,f.name);
  for(const line of s.split('\n').filter(l=>/\bnew\s+URL\s*\(/.test(l)))assert.match(line,/\bnew\s+URL\s*\(\s*(?:window\.)?location\.href\s*\)/);
 }
});
test('R1G: historical source readers and boot imports invert exactly',()=>{
 assert.equal(m.bootstraps.length,42);assert.ok(m.tests.length>=50);
 for(const t of m.tests){const s=read(t.path),restored=restoreR1GGamePaths(s);assert.notEqual(restored,s,t.path);assert.equal(sha(restored),t.originalGitBlobShaBeforeR1G,t.path)}
 for(const b of m.bootstraps){const s=readHistorical(resolve(repo,b.path));assert.equal(sha(restoreR1GBootImport(s)),b.originalGitBlobShaBeforeR1G,b.path);const target='../game/game-v'+b.version+'.mjs';assert.equal(s.split('import("'+target).length,2,b.path);assert.ok(historicalExists(resolve(dirname(resolve(repo,b.path)),target)))}
 const wf=read('.github/workflows/skyshift-tests.yml');for(const f of m.files){assert.ok(historicalSyntaxCheck(wf,f.newPath),f.name);assert.ok(!wf.includes('node --check '+f.oldPath),f.name)}
});
