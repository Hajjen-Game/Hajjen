// EF08: test current dependency ownership, not previous relocation byte identities.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {historicalExists} from './legacy-retirement-l1a.mjs';
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
const retiredSources=[...cohort.roots,...(cohort.sourceFiles||[])];
const retired=[...retiredSources,...cohort.unitTests,...cohort.architectureTests,...(cohort.browserTests||[])];
const retiredByPath=new Map(retiredSources.map(f=>[f.path,f]));
function closedRelocation(f){
 const entry=retiredByPath.get(f.newPath);
 if(!entry)return false;
 assert.equal(entry.relocatedFrom,f.oldPath);
 assert.equal(entry.sha,f.destinationSha);
 assert.equal(f.productionBefore,false);
 assert.equal(f.sourceReachableBefore,false);
 assert.ok(!tracked.has(f.newPath)&&!existsSync(resolve(repo,f.newPath)),f.newPath+' closed owner reintroduced');
 assert.ok(historicalExists(resolve(repo,f.oldPath)));
 return true;
}
const retiredNames=retiredSources.map(f=>basename(f.path));
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
  if(closedRelocation(f)){assert.ok(!graph.has(f.newPath));continue;}
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
 console.log('SKYSHIFT_EF08_CURRENT_CONTRACTS '+JSON.stringify({rootFiles:roots.length,retiredRootFiles:cohort.roots.length,retiredNestedSourceFiles:(cohort.sourceFiles||[]).length,relocatedRootFiles:rootRelocations.moves.length,retiredUnitFiles:cohort.unitTests.length,retiredMigrationFiles:cohort.architectureTests.length,retiredBrowserFiles:(cohort.browserTests||[]).length,retiredBytes:retired.reduce((n,f)=>n+f.bytes,0),liveGraph:graph.size}));
});

// A moved source remains one live owner. Old references are checked only as
// pinned historical evidence; the recorded path changes must be reversible.
test('pinned archived ship source relocations preserve exact source identity',()=>{
 const hash=data=>{const b=Buffer.from(data);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
 for(const f of rootRelocations.moves.filter(f=>f.historicalArchive)){
  assert.ok(historicalExists(resolve(repo,f.oldPath)));
  if(closedRelocation(f))continue;
  const bytes=readFileSync(resolve(repo,f.newPath));
  assert.equal(hash(bytes),f.destinationSha,f.newPath+' recorded destination identity');
  let original=bytes.toString('utf8');
  for(const e of [...f.pathEdits].reverse()){
   assert.equal(original.split(e.after).length-1,1,f.newPath+' exact inverse anchor');
   original=original.replace(e.after,e.before);
  }
  assert.equal(hash(original),f.sourceSha,f.newPath+' path-only inverse');
  assert.equal(Buffer.byteLength(original),f.bytes,f.newPath+' source bytes');
 }
});

test('relocated ship loaders retain exact source asset URLs and parser resource base',async()=>{
 const {createShipArtController:current}=await import('../../ships/ship-hero-loader-v01342.mjs');
 const {createShipArtController:preview}=await import('../../ships/ship-hero-loader-v0132.mjs');
 const expectedBase=new URL('../../assets/ships/',import.meta.url).href;
 const craft={ship:{}};
 for(const [factory,search,expected] of [
  [current,'',['stingray-evo-hero-v4.gltf']],
  [current,'?shipArt=blender',['stingray-evo-hero-v4.glb']],
  [preview,'?shipArt=hero',['stingray-evo-hero-v1.glb','stingray-evo-hero-v1.gltf']]
 ]){
  const seen=[];
  const ctrl=factory({},{search,currentCraft:()=>craft,currentShipId:()=>'stingray',
   fetchAsset:async url=>{seen.push(url.href);return {ok:false,status:404};}});
  await ctrl.onCraftBuilt(craft,'stingray');
  assert.deepEqual(seen,expected.map(name=>new URL(name,expectedBase).href));
  assert.equal(ctrl.state.status,'fallback');
  ctrl.dispose();
 }
 for(const [factory,search] of [[current,''],[preview,'?shipArt=hero']]){
  let parsedBase;
  const ctrl=factory({},{search,currentCraft:()=>craft,currentShipId:()=>'stingray',
   fetchAsset:async()=>({ok:true,text:async()=>'fixture',arrayBuffer:async()=>new ArrayBuffer(1)}),
   loaderFactory:async()=>({parse(_source,base,_ok,fail){parsedBase=base;fail(Error('fixture parse stop'));}})});
  await ctrl.onCraftBuilt(craft,'stingray');
  assert.equal(parsedBase,expectedBase);
  assert.equal(ctrl.state.status,'fallback');ctrl.dispose();
 }
});

// Exact historical evidence is allowed only through the pinned read-only archive.
test('closed historical subsystem retirements preserve original Git identities and current replacements',()=>{
 for(const f of retired.filter(f=>f.historicalArchive)){
  assert.ok(historicalExists(resolve(repo,f.historicalArchive.path)),f.path+' archived identity');
  assert.ok(!existsSync(resolve(repo,f.path)),f.path+' retired source remains');
  assert.match(f.sha,/^[a-f0-9]{40}$/);assert.ok(f.bytes>0);
  for(const replacement of f.replacement)assert.ok(tracked.has(replacement),replacement+' missing replacement');
 }
});

// Check every relative import in the complete race/boost ownership batch,
// including multiline imports and re-exports, against its original target.
test('race and boost ownership retains all original relative module targets',()=>{
 const batch=rootRelocations.batches.find(b=>b.rollbackCommit==='8201b80c312622af813f96b582117e001ac41d3c');
 assert.ok(batch,'missing reviewed race and boost batch');
 assert.equal(batch.moves.length,10);
 const current=new Map(rootRelocations.moves.map(f=>[f.oldPath,f.newPath]));
 const specs=s=>[...s.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bnew\s+URL\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)].map(m=>m[1]);
 const target=(p,s)=>relative(repo,resolve(dirname(resolve(repo,p)),s.split(/[?#]/)[0])).split(sep).join('/');
 let edges=0;
 for(const f of batch.moves){
  const source=readFileSync(resolve(repo,f.newPath),'utf8');
  let original=source;
  for(const e of [...f.pathEdits].reverse()){
   assert.equal(original.split(e.after).length-1,1,f.newPath+' inverse path edit');
   original=original.replace(e.after,e.before);
  }
  const bytes=Buffer.from(original);
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),f.sourceSha);
  const old=specs(original),now=specs(source);
  assert.equal(now.length,old.length,f.newPath+' relative import count');
  for(let i=0;i<old.length;i++){
   const prior=target(f.oldPath,old[i]),actual=target(f.newPath,now[i]);
   assert.equal(actual,current.get(prior)||prior,f.newPath+' changed module target');
   assert.ok(tracked.has(actual)&&existsSync(resolve(repo,actual)),f.newPath+' missing relative target '+actual);
   edges++;
  }
 }
 assert.equal(edges,17,'reviewed module edge count');
});

// Check every relative import in the complete camera/flight/rail/trial ownership batch,
// including multiline imports and re-exports, against its original target.
test('camera, flight, rail and trial ownership retains all original relative module targets',()=>{
 const batch=rootRelocations.batches.find(b=>b.rollbackCommit==='d0e1b66f68225071f86319284ca00656e22169e3');
 assert.ok(batch,'missing reviewed camera, flight, rail and trial batch');
 assert.equal(batch.moves.length,12);
 const current=new Map(rootRelocations.moves.map(f=>[f.oldPath,f.newPath]));
 const specs=s=>[...s.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bnew\s+URL\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)].map(m=>m[1]);
 const target=(p,s)=>relative(repo,resolve(dirname(resolve(repo,p)),s.split(/[?#]/)[0])).split(sep).join('/');
 let edges=0;
 for(const f of batch.moves){
  const source=readFileSync(resolve(repo,f.newPath),'utf8');
  let original=source;
  for(const e of [...f.pathEdits].reverse()){
   assert.equal(original.split(e.after).length-1,1,f.newPath+' inverse path edit');
   original=original.replace(e.after,e.before);
  }
  const bytes=Buffer.from(original);
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),f.sourceSha);
  const old=specs(original),now=specs(source);
  assert.equal(now.length,old.length,f.newPath+' relative import count');
  for(let i=0;i<old.length;i++){
   const prior=target(f.oldPath,old[i]),actual=target(f.newPath,now[i]);
   assert.equal(actual,current.get(prior)||prior,f.newPath+' changed module target');
   assert.ok(tracked.has(actual)&&existsSync(resolve(repo,actual)),f.newPath+' missing relative target '+actual);
   edges++;
  }
 }
 assert.equal(edges,55,'reviewed module edge count');
});

// Check every relative import in the complete remaining trial, flight and wave ownership batch,
// including multiline imports and re-exports, against its original target.
test('remaining trial, flight and wave ownership retains all original relative module targets',()=>{
 const batch=rootRelocations.batches.find(b=>b.rollbackCommit==='082f824b3b48290a501cc986ebaae332d9c6771a');
 assert.ok(batch,'missing reviewed final root-module batch');
 assert.equal(batch.moves.length,11);
 const current=new Map(rootRelocations.moves.map(f=>[f.oldPath,f.newPath]));
 const specs=s=>[...s.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bnew\s+URL\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)].map(m=>m[1]);
 const target=(p,s)=>relative(repo,resolve(dirname(resolve(repo,p)),s.split(/[?#]/)[0])).split(sep).join('/');
 let edges=0;
 for(const f of batch.moves){
  if(closedRelocation(f))continue;
  const source=readFileSync(resolve(repo,f.newPath),'utf8');
  let original=source;
  for(const e of [...f.pathEdits].reverse()){
   assert.equal(original.split(e.after).length-1,1,f.newPath+' inverse path edit');
   original=original.replace(e.after,e.before);
  }
  const bytes=Buffer.from(original);
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),f.sourceSha);
  const old=specs(original),now=specs(source);
  assert.equal(now.length,old.length,f.newPath+' relative import count');
  for(let i=0;i<old.length;i++){
   const prior=target(f.oldPath,old[i]),actual=target(f.newPath,now[i]);
   assert.equal(actual,current.get(prior)||prior,f.newPath+' changed module target');
   assert.ok(tracked.has(actual)&&existsSync(resolve(repo,actual)),f.newPath+' missing relative target '+actual);
   edges++;
  }
 }
 assert.equal(batch.moves.filter(closedRelocation).length,5,'reviewed closed historical owners');
 assert.equal(edges,16,'retained module edge count');
});
