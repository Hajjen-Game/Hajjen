// Verified path-only ownership change; live import resolution remains strict.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {restoreDeckMove,deckCurrentPath,deckMoveManifest as m} from './ef02-closure-deck-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {readHistorical} from './legacy-retirement-l1a.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
test('closure deck group: exact reversible consumer changes and current dependency paths',()=>{
 assert.equal(m.moves.length,15);
 assert.equal(m.records.length,103);
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(x=>x.isFile()).length,expectedRootFiles);
 for(const r of m.records){
  const file=deckCurrentPath(resolve(repo,r.target)),source=readHistorical(file,'utf8');
  restoreDeckMove(source,file);
  if(r.path!==r.target){
   assert.ok(!existsSync(resolve(repo,r.path)),r.path);
   for(const a of source.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g))
    assert.ok(existsSync(resolve(dirname(file),a[1].split(/[?#]/)[0])),r.target+' -> '+a[1]);
  }
  if(r.path.startsWith('skyshift/tests/browser/'))for(const e of r.edits)assert.ok(existsSync(resolve(repo,'skyshift',e.after)),r.path+' -> '+e.after);
 }
 const graph=inventory().literalBrowserGraph.paths;
 for(const x of m.moves.filter(x=>x.role==='live-literal'))assert.ok(graph.includes(x.target.slice('skyshift/'.length)),x.target);
 const files=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of files){
  if(!/\.(?:mjs|js|html|css|yml|yaml)$/.test(p)||p.startsWith('skyshift/tests/architecture/'))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const x of m.moves){
   const name=basename(x.path);
   assert.ok(!s.includes(x.path),p+' stale repository path '+x.path);
   for(const q of s.matchAll(/["'](\.{1,2}\/[^"'\r\n]+)["']/g)){
    const spec=q[1].split(/[?#]/)[0];
    if(!spec.endsWith('/'+name))continue;
    const base=p.startsWith('skyshift/tests/browser/')?resolve(repo,'skyshift'):dirname(resolve(repo,p));
    assert.notEqual(resolve(base,spec),resolve(repo,x.path),p+' stale deck import '+spec);
   }
  }
 }
});
