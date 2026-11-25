// Verify exact material source identity and current paths, not an alternative runtime resolver.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {premiumManifest as m,restorePremiumMove} from './ef02-closure-premium-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const root=resolve(repo,'skyshift');
test('Four retained road materials preserve exact source, current ownership and all consumer paths',()=>{
 assert.equal(m.moves.length,4);assert.equal(m.records.length,35);
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()).length,expectedRootFiles);
 const history=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const x of m.moves){
  assert.ok(!existsSync(resolve(repo,x.path)),x.path);
  assert.ok(history.includes('node --check '+x.target),x.target+' syntax coverage');
 }
 for(const r of m.records){
  const p=resolve(repo,r.target),s=readFileSync(p,'utf8');restorePremiumMove(s,p);
  if(r.path!==r.target){
   for(const q of s.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g))
    assert.ok(existsSync(resolve(dirname(p),q[1])),r.target+' -> '+q[1]);
  }
  if(r.path.startsWith('skyshift/tests/browser/'))for(const e of r.edits)
   assert.ok(existsSync(resolve(root,e.after.slice(1,-1))),r.path+' -> '+e.after);
  if(r.path.startsWith('skyshift/tests/unit/'))for(const e of r.edits){
   const spec=e.after.slice(1,-1);
   assert.ok(existsSync(resolve(spec.startsWith('./')?root:dirname(p),spec)),r.path+' -> '+spec);
  }
 }
 const graph=inventory().literalBrowserGraph.paths;
 for(const x of m.moves.filter(x=>x.role==='live-literal'))assert.ok(graph.includes(x.target.slice('skyshift/'.length)),x.target);
 const files=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of files){
  if(!/\.(?:mjs|js|html|css|yml|yaml)$/.test(p)||p.startsWith('skyshift/tests/architecture/'))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const x of m.moves){
   assert.ok(!s.includes(x.path),p+' stale repository path '+x.path);
   for(const q of s.matchAll(/["'](\.{1,2}\/[^"'\r\n]+)["']/g)){
    const spec=q[1].split(/[?#]/)[0];if(!spec.endsWith('/'+basename(x.path)))continue;
    const from=p.startsWith('skyshift/tests/browser/')||p.startsWith('skyshift/tests/unit/')&&spec==='./'+basename(x.path)?root:dirname(resolve(repo,p));
    assert.notEqual(resolve(from,spec),resolve(repo,x.path),p+' stale material path '+spec);
   }
  }
 }
});
