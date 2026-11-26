// Preserve the exact flight implementation and validate current module paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {trialManifest as m,restoreTrialMove} from './ef02-closure-trial-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const root=resolve(repo,'skyshift');
const retired=JSON.parse(readFileSync(resolve(repo,'skyshift/docs/architecture/ef05-retired-rail-adapters.json'),'utf8'));
function archivedRail(f){
 const b=execFileSync('git',['show',retired.archiveCommit+':'+f.path],{cwd:repo,maxBuffer:2*1024*1024});
 assert.equal(b.length,f.bytes,f.path+' archived byte count');
 assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),f.sha,f.path+' archive identity');
 return b.toString('utf8');
}
test('Both live trial modules preserve exact source and resolved consumer paths',()=>{
 assert.equal(m.moves.length,2);assert.equal(m.records.length,49);
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()).length,expectedRootFiles);
 const history=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const x of m.moves){
  assert.ok(!existsSync(resolve(repo,x.path)),x.path);
  assert.ok(history.includes('node --check '+x.target),x.target+' syntax gate');
 }
 for(const r of m.records){
  const p=resolve(repo,r.target),archived=retired.files.find(f=>f.path===r.target);
  const s=archived?archivedRail(archived):readFileSync(p,'utf8');restoreTrialMove(s,p);
  if(r.path!==r.target)for(const q of s.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g))
   assert.ok(existsSync(resolve(dirname(p),q[1])),r.target+' -> '+q[1]);
  if(r.path.startsWith('skyshift/tests/browser/'))for(const e of r.edits)
   assert.ok(existsSync(resolve(root,e.after.slice(1,-1))),r.path+' -> '+e.after);
 }
 const graph=inventory().literalBrowserGraph.paths;
 for(const x of m.moves)assert.ok(graph.includes(x.target.slice('skyshift/'.length)),x.target);
 const files=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const p of files){
  if(!/\.(?:mjs|js|html|css|yml|yaml)$/.test(p)||p.startsWith('skyshift/tests/architecture/'))continue;
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const x of m.moves){
   assert.ok(!s.includes(x.path),p+' stale repository path '+x.path);
   for(const q of s.matchAll(/["'](\.{1,2}\/[^"'\r\n]+)["']/g)){
    const spec=q[1].split(/[?#]/)[0];if(!spec.endsWith('/'+basename(x.path)))continue;
    const from=p.startsWith('skyshift/tests/browser/')||p.startsWith('skyshift/tests/unit/')&&spec==='./'+basename(x.path)?root:dirname(resolve(repo,p));
    assert.notEqual(resolve(from,spec),resolve(repo,x.path),p+' stale physics path '+spec);
   }
  }
 }
});

test('EF05 obsolete rail adapter shells are retired and contact tests use the actual shared factory',()=>{
 const graph=inventory().literalBrowserGraph.paths;
 const wf=readFileSync(resolve(repo,retired.workflow.path),'utf8');
 const files=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
 for(const f of retired.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.ok(!graph.includes(f.path.slice('skyshift/'.length)),f.path);
  assert.ok(!wf.includes('node --check '+f.path),f.path+' stale syntax command');
  const src=archivedRail(f);
  assert.ok(src.includes('from "'+f.route+'"'),f.path+' route identity');
  assert.match(src,/export const railContactPoint=createRailContactSampler\(\{positionAt,poseAt,widthAt,surfaceNormalAt\}\)/);
  assert.match(src,/from "\.\/rendering\/rail-scrape-sparks\.mjs"/);
  const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:src,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  for(const p of files){
   if(!/\.(?:mjs|js|html|css|yaml|yml)$/.test(p)||p.startsWith('skyshift/tests/architecture/'))continue;
   const live=readFileSync(resolve(repo,p),'utf8');
   for(const spec of live.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+)["']/g))
    assert.notEqual(spec[1].split(/[?#]/)[0].split('/').at(-1),basename(f.path),p+' retired executable dependency');
  }
 }
 for(const p of retired.readers){
  const reader=readFileSync(resolve(repo,p),'utf8');
  assert.match(reader,/createRailContactSampler\(oldTrial\)/);
  assert.match(reader,/reproduce the old displaced metallic spark position/);
  assert.match(reader,/q\.x-physical\.x/);
  if(!p.endsWith('v0165.test.mjs'))assert.match(reader,/createRailContactSampler\(trial\)/);
 }
});
