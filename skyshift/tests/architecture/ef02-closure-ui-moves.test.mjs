// Verify the exact UI module migration, not an alternative runtime resolver.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {uiManifest as m,restoreUiMove,readHistoricalGameMigrationSource} from './ef02-closure-ui-overlay.mjs';
import {expectedRootFiles} from './root-count-contract.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root=resolve(repo,'skyshift');
test('UI ownership: exact source identities, live module reach and current consumer paths',()=>{
 assert.equal(m.moves.length,4);assert.equal(m.records.length,15);
 assert.equal(readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()).length,expectedRootFiles);
 const workflow=readFileSync(resolve(repo,'.github/workflows/skyshift-tests.yml'),'utf8');
 for(const x of m.moves){
  assert.ok(!existsSync(resolve(repo,x.path)),x.path);
  assert.ok(workflow.includes('node --check '+x.target),x.target+' syntax gate');
 }
 for(const r of m.records){
  const p=resolve(repo,r.target),s=readFileSync(p,'utf8');restoreUiMove(s,p);
  if(r.path!==r.target)for(const q of s.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g))
   assert.ok(existsSync(resolve(dirname(p),q[1])),r.target+' -> '+q[1]);
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
    assert.notEqual(resolve(from,spec),resolve(repo,x.path),p+' stale UI import '+spec);
   }
  }
 }
});

// The old inverse chain proves historical bytes. Independently verify the actual
// current game still resolves every migrated UI import, not the archived source.
test('EF04 live game retains EF02 UI ownership and uses the extracted simulation',()=>{
 const path=resolve(root,'game-v0210.mjs'),live=readFileSync(path,'utf8');
 const record=m.records.find(r=>r.path==='skyshift/game-v0210.mjs');
 assert.ok(record);
 for(const edit of record.edits){
  assert.equal(live.split(edit.after).length-1,edit.count,'Current UI consumer '+edit.after);
  assert.ok(!live.includes(edit.before),'Stale root UI import '+edit.before);
  const spec=JSON.parse(edit.after);
  assert.ok(existsSync(resolve(dirname(path),spec)),spec);
 }
 assert.match(live,/from ["']\.\/core\/race-simulation\.mjs["']/);
 assert.match(live,/advanceRaceSimulation\(raceSimulation,rawDt,flight,integrate\)/);
 assert.ok(inventory().literalBrowserGraph.paths.includes('core/race-simulation.mjs'));
 // Historical assertions are still evaluated through the original UI inverse.
 assert.equal(restoreUiMove(live,path),restoreUiMove(readHistoricalGameMigrationSource(),path));
});
