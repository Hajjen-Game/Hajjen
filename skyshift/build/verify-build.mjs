// Validate the built artifact rather than a source-only green check.
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readArchivedWorldAsset} from './archived-world-assets.mjs';
import {entryArchive,readArchivedEntrySource} from './archived-entry-sources.mjs';
import {retiredSceneryModules,retiredTunnelModules,comparisonOnlyWorldAssets} from './production-specialization.mjs';
const here=dirname(fileURLToPath(import.meta.url)),dist=join(here,'dist');
const report=JSON.parse(await readFile(join(dist,'build-report.json'),'utf8'));
const html=await readFile(join(dist,'index.html'),'utf8');
assert.equal(report.cssOrder.length,8);
assert.equal(report.sourceVersion,'0.26.5');
assert.equal(report.three,'0.180.0');
assert.deepEqual(report.productionCatalog,[{id:'vault',version:'0.28.9.7',name:'NEON VAULT CIRCUIT',option:'NEON VAULT — FULL TUNNEL CIRCUIT'}]);
const picker=html.match(/<select id="track-picker"[^>]*>([\s\S]*?)<\/select>/)?.[1];
assert.ok(picker,'production circuit picker');
assert.deepEqual([...picker.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]),['vault']);
assert.match(html,/<span id="menu-track-name">NEON VAULT CIRCUIT<\/span>/);
assert.ok(report.graph.modules.some(p=>p.endsWith('/tracks/shared/production-catalog.mjs')),'actual bundled catalog boundary');
assert.equal(report.ef05Owners.entries.length,101);
assert.equal(report.ef05Owners.counts.productionRetired,4);
const obsoleteCohort=JSON.parse(await readFile(join(here,'../docs/architecture/ef08-obsolete-cohort.json'),'utf8'));
const obsoletePaths=new Set(obsoleteCohort.roots.map(e=>e.path));
assert.equal(report.ef05Owners.counts.repositoryDeleted,report.ef05Owners.entries.filter(e=>obsoletePaths.has(e.path)).length);
for(const f of obsoleteCohort.roots){
 const name=f.path.slice('skyshift/'.length);
 assert.ok(!report.graph.modules.some(p=>p.split('?')[0]==='source/'+name),name+' obsolete module in production');
 assert.ok(!report.files.some(x=>x.path===name),name+' obsolete module in artifact');
 await assert.rejects(stat(join(here,'..',name)),{code:'ENOENT'});
}
assert.deepEqual(report.retiredProductionModules,[...retiredSceneryModules,...retiredTunnelModules]);
for(const path of report.retiredProductionModules)assert.ok(!report.graph.modules.includes('source/'+path),path);
assert.deepEqual(report.comparisonAssets.map(f=>f.path),comparisonOnlyWorldAssets);
for(const e of report.ef05Owners.entries){
 assert.equal(e.production,report.graph.modules.some(p=>p.split('?')[0]==='source/'+e.path.slice('skyshift/'.length)));
 assert.equal(e.repositoryDeleted,obsoletePaths.has(e.path));
 if(e.retiredFromBundle)assert.equal(e.production,false,e.path);
}
assert.doesNotMatch(html,/cdn\.jsdelivr\.net\/npm\/three|type="importmap"|boot-v0210\.js\?/);
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(x=>x[1]);
const css=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(x=>x[1]);
assert.equal(scripts.length,1,'single bundled bootstrap');
assert.equal(css.length,1,'consolidated CSS');
for(const p of [...scripts,...css]){assert.match(p,/^\.\/bundles\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/);assert.ok((await stat(resolve(dist,p))).size>0);}
assert.ok(report.graph.chunks.some(x=>x.dynamicImports.length>0),'lazy module chunk');
assert.ok(report.graph.modules.every(x=>!/(?:^|\/)(?:tests|docs|previews)\//.test(x)));
for(const f of report.files){
 const b=await readFile(join(dist,f.path));assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);
}
// The checked-in V4 text glTF is mandatory; the Blender GLB is an optional
// diagnostic with an intentional procedural fallback when absent. Validate
// the complete source asset tree byte-for-byte, classified as production
// or explicitly retained comparison-only assets; never silently drop assets.
const source=resolve(here,'..');
const assets=[];
async function walkAssets(dir,rel='assets'){
 for(const e of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,e.name),name=rel+'/'+e.name;
  if(e.isDirectory())await walkAssets(path,name);
  else if(e.isFile()){
   const a=await readFile(path),comparison=comparisonOnlyWorldAssets.includes(name);
   assert.ok(a.length>0,name+' empty source asset');
   if(comparison){
    const recorded=report.comparisonAssets.find(f=>f.path===name);
    assert.equal(recorded.bytes,a.length);assert.equal(recorded.sha256,createHash('sha256').update(a).digest('hex'));
    await assert.rejects(stat(join(dist,name)),{code:'ENOENT'});
   }else{
    const b=await readFile(join(dist,name));assert.deepEqual(b,a,name+' asset bytes changed');assets.push(name);
   }
   if(name.endsWith('.gltf')){
    const g=JSON.parse(a.toString('utf8'));
    for(const item of [...(g.buffers||[]),...(g.images||[])]){
     const uri=item.uri;if(!uri||uri.startsWith('data:'))continue;
     assert.ok(!/^[a-z]+:|^\/\//i.test(uri),name+' unverified remote asset '+uri);
     const root=comparison?source:dist;
     const resource=resolve(dirname(join(root,name)),decodeURIComponent(uri));
     assert.ok(resource.startsWith(root+'/'),name+' escaped asset path');
     assert.ok((await stat(resource)).size>0,name+' missing '+uri);
    }
   }
  }
 }
}
await walkAssets(join(source,'assets'));
for(const path of comparisonOnlyWorldAssets){
 const a=readArchivedWorldAsset('skyshift/'+path);
 const recorded=report.comparisonAssets.find(f=>f.path===path);
 assert.equal(recorded.bytes,a.length);
 assert.equal(recorded.sha256,createHash('sha256').update(a).digest('hex'));
 await assert.rejects(stat(join(source,path)),{code:'ENOENT'});
 await assert.rejects(stat(join(dist,path)),{code:'ENOENT'});
}
const outputAssets=report.files.map(f=>f.path).filter(p=>p.startsWith('assets/')).sort();
assert.deepEqual(outputAssets,assets.sort(),'complete classified production asset inventory');
for(const p of ['assets/ships/stingray-evo-hero-v1.gltf','assets/ships/stingray-evo-hero-v4.gltf'])assert.ok(assets.includes(p),p+' required runtime model');
console.log('SKYSHIFT_EF03_ASSETS '+JSON.stringify({copied:assets.length,optionalBlenderGlb:assets.includes('assets/ships/stingray-evo-hero-v4.glb')}));
const top=await readdir(dist);for(const p of ['tests','docs','legacy','previews','material-grade-v0203.html','game-v0210.mjs','node_modules'])assert.ok(!top.includes(p),p+' must not ship in production artifact');
// EF08: distinguish real production-module membership from the source/QA graph.
for(const f of entryArchive.files){
 const name=f.path.slice('skyshift/'.length);
 await assert.rejects(stat(join(source,name)),{code:'ENOENT'});
 assert.ok(!report.graph.modules.some(p=>p.split('?')[0]==='source/'+name),name+' retired entry in production graph');
 assert.ok(!report.files.some(x=>x.path===name),name+' retired entry in artifact');
 assert.equal(readArchivedEntrySource(f.path).length,f.bytes);
}
const sourceRoots=(await readdir(source,{withFileTypes:true})).filter(e=>e.isFile()).map(e=>e.name).sort();
const productionRoots=sourceRoots.filter(name=>report.graph.modules.some(p=>p.split('?')[0]==='source/'+name)||report.cssOrder.includes('./'+name));
const rootMembership={productionRoots,otherSourceRoots:sourceRoots.filter(name=>!productionRoots.includes(name)),productionModules:report.graph.modules.length,artifactBytes:report.files.reduce((n,f)=>n+f.bytes,0),warning:'Not bundled is not proof of safe deletion; boot HTML, asset URLs, QA and comparison consumers are separate.'};
console.log('SKYSHIFT_EF08_PRODUCTION_ROOTS '+JSON.stringify(rootMembership));
console.log('SKYSHIFT_EF03_ARTIFACT verified hashed entry and CSS, lazy chunks, integrity and asset paths');
