// EF08: test current dependency ownership, not previous relocation byte identities.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,relative,basename,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventory} from './dependency-inventory-v2.mjs';
import {expectedRootPaths,rootRelocations} from './root-count-contract.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const root=resolve(repo,'skyshift');
const json=p=>JSON.parse(readFileSync(resolve(repo,p),'utf8'));
const cohort=json('skyshift/docs/architecture/ef08-obsolete-cohort.json');
const baseline=json('skyshift/docs/architecture/ef08-root-baseline.json');
const paths=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
const tracked=new Set(paths);
const graph=new Set(inventory().literalBrowserGraph.paths.map(p=>'skyshift/'+p));
const retired=[...cohort.roots,...cohort.unitTests,...cohort.architectureTests,...(cohort.browserTests||[])];
const retiredNames=cohort.roots.map(f=>basename(f.path));
const isSource=p=>/^(?:skyshift\/|\.github\/)/.test(p)&&/\.(?:mjs|js|cjs|ts|html|css|yml|yaml|sh|py|txt)$/.test(p)&&!p.startsWith('skyshift/docs/')&&!/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p);
test('obsolete closed source and test cohort is absent; no tracked executable or workflow depends on it',()=>{
 assert.equal(cohort.schema,1);
 assert.equal(new Set(retired.map(f=>f.path)).size,retired.length);
 for(const f of retired){
  assert.ok(!tracked.has(f.path)&&!existsSync(resolve(repo,f.path)),f.path+' retired path reintroduced');
  assert.ok(!graph.has(f.path),f.path+' retired path remains reachable');
 }
 for(const p of paths.filter(isSource)){
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const name of retiredNames)assert.ok(!s.includes(name),p+' stale obsolete source reference '+name);
  if(p.startsWith('.github/'))for(const f of retired)assert.ok(!s.includes(f.path),p+' stale retired workflow target '+f.path);
 }
 for(const p of Object.values(cohort.replacement))assert.ok(tracked.has(p),'Missing current replacement '+p);
});
test('all literal node runner paths in active workflows resolve to actual tracked files',()=>{
 for(const p of paths.filter(p=>p.startsWith('.github/workflows/')&&/\.ya?ml$/.test(p))){
  const s=readFileSync(resolve(repo,p),'utf8').replace(/\\\r?\n[ \t]*/g,' ');
  for(const line of s.split('\n')){
   if(/^\s*#/.test(line)||!/\bnode\s+(?:(?:--check|--test)\s+)?skyshift\//.test(line))continue;
   for(const hit of line.matchAll(/\bskyshift\/[\w./-]+\.(?:mjs|js)\b/g)){
    assert.ok(tracked.has(hit[0])&&existsSync(resolve(repo,hit[0])),p+' missing runner '+hit[0]);
   }
  }
 }
});
const local=spec=>spec.split(/[?#]/)[0];
function verifyEntry(entry){
 const visited=new Set(),pending=[resolve(root,entry)];
 while(pending.length){
  const p=pending.pop();
  if(visited.has(p))continue;visited.add(p);
  const rel=relative(root,p);
  assert.ok(rel&&!rel.startsWith('..'+sep)&&rel!=='..',p+' escapes SKYSHIFT');
  assert.ok(tracked.has('skyshift/'+rel.replaceAll('\\','/'))&&existsSync(p)&&statSync(p).isFile(),p+' missing entry dependency');
  if(!/\.(?:html|mjs|js)$/.test(p))continue;
  const source=readFileSync(p,'utf8');
  const matches=p.endsWith('.html')?[...source.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["'](\.{1,2}\/[^"']+)["']/g)]:[...source.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)];
  for(const m of matches)pending.push(resolve(dirname(p),local(m[1])));
 }
 assert.ok(visited.size>10,entry+' unexpectedly empty module graph');
 return visited;
}
test('live and explicit material comparison entries resolve their actual modules; current shared owners remain reachable',()=>{
 verifyEntry('index.html');verifyEntry('material-grade-v0203.html');
 const current=['ui/fullscreen-v02.mjs','ui/ghost-visual-v0130.mjs','ui/reactive-hud-v04991.mjs','core/race-simulation.mjs','flight/flight-physics.mjs','tracks/shared/track-sampler.mjs','core/race-lifecycle.mjs'];
 for(const p of current)assert.ok(graph.has('skyshift/'+p),p+' missing current ownership');
 const app=readFileSync(resolve(root,'game-v0210.mjs'),'utf8');
 assert.match(app,/advanceRaceSimulation\(raceSimulation,rawDt,flight,integrate\)/);
});
test('reviewed root relocations have a single tracked owner and preserve source graph membership',()=>{
 for(const f of rootRelocations.moves){
  assert.ok(!tracked.has(f.oldPath)&&!existsSync(resolve(repo,f.oldPath)),f.oldPath+' duplicate or stale root');
  assert.ok(tracked.has(f.newPath)&&existsSync(resolve(repo,f.newPath)),f.newPath+' missing owner');
  assert.equal(graph.has(f.newPath),f.sourceReachableBefore,f.newPath+' source graph membership changed');
 }
 for(const p of paths.filter(p=>p.startsWith('.github/workflows/')&&/\.ya?ml$/.test(p))){
  const s=readFileSync(resolve(repo,p),'utf8');
  for(const f of rootRelocations.moves)assert.ok(!s.includes(f.oldPath),p+' stale relocated target '+f.oldPath);
 }
});
test('both source pages load the same eight canonical styles in the accepted cascade order',()=>{
 const expected=['style-v061.css','style-v083.css','fleet-v0102.css','style-v0121.css','style-v0130.css','style-v0131.css','style-v0140.css','style-v0160.css'].map(n=>'./styles/'+n);
 for(const page of ['index.html','material-grade-v0203.html']){
  const html=readFileSync(resolve(root,page),'utf8');
  const actual=[...html.matchAll(/<link rel="stylesheet" href="([^"?]+\.css)(?:\?[^"]*)?">/g)].map(m=>m[1]);
  assert.deepEqual(actual,expected,page+' stylesheet cascade');
 }
});
test('root ownership progresses without resurrecting old root files',()=>{
 const old=new Set(baseline.entries.map(f=>f.path));
 const roots=paths.filter(p=>/^skyshift\/[^/]+$/.test(p));
 for(const p of roots)assert.ok(old.has(p),p+' new root path requires explicit hosting or compatibility decision');
 assert.deepEqual(roots.sort(),expectedRootPaths,'Root paths must match independently reviewed retirements, not merely a count');
 console.log('SKYSHIFT_EF08_CURRENT_CONTRACTS '+JSON.stringify({rootFiles:roots.length,retiredRootFiles:cohort.roots.length,relocatedRootFiles:rootRelocations.moves.length,retiredUnitFiles:cohort.unitTests.length,retiredMigrationFiles:cohort.architectureTests.length,retiredBrowserFiles:(cohort.browserTests||[]).length,retiredBytes:retired.reduce((n,f)=>n+f.bytes,0),liveGraph:graph.size}));
});
