// EF03: build a separate production artifact from the exact accepted source.
// No source rewriting on disk, no QA input entrypoints, and no live Pages cutover yet.
import assert from 'node:assert/strict';
import {cp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readArchivedWorldAsset} from './archived-world-assets.mjs';
import {build} from 'vite';
import {PRODUCTION_TRACK,PRODUCTION_RELEASE_NAME,productionRouteUrl} from '../tracks/shared/production-catalog.mjs';
import {specializeVaultGame,specializeVaultTunnelRuntime,retiredSceneryModules,retiredTunnelModules,comparisonOnlyWorldAssets} from './production-specialization.mjs';
import {reconcileEF05Owners} from './ef05-owner-reconciliation.mjs';
const here=dirname(fileURLToPath(import.meta.url)),source=resolve(here,'..');
const stage=join(here,'.stage'),dist=join(here,'dist');
const read=p=>readFile(p,'utf8');
const replaceOnce=(text,pattern,replacement,label)=>{
 const matches=[...text.matchAll(pattern)];
 assert.equal(matches.length,1,label+' must have one verified source anchor');
 return text.replace(pattern,replacement);
};
await rm(stage,{recursive:true,force:true});
await mkdir(stage,{recursive:true});
const exclude=new Set(['build','tests','docs','previews','node_modules','.git']);
for(const e of await readdir(source,{withFileTypes:true})){
 if(exclude.has(e.name)||e.name.startsWith('.')||e.name.endsWith('.md')||e.name==='material-grade-v0203.html')continue;
 await cp(join(source,e.name),join(stage,e.name),{recursive:true});
}
let html=await read(join(stage,'index.html'));
const originalBoot=await read(join(stage,'boot-v0210.js'));
const tag=/<script src="\.\/boot-v0210\.js\?([^"]+)" data-game-module="game-v0210\.mjs"><\/script>/g;
const bootTag=[...html.matchAll(tag)];assert.equal(bootTag.length,1,'current boot tag');
const version=new URLSearchParams(bootTag[0][1]).get('v');
assert.ok(version&&originalBoot.includes('game-v0210.mjs?v='+version),'preserve Skyline build version source');
const styles=[...html.matchAll(/<link rel="stylesheet" href="(\.\/[^"]+\.css)(?:\?[^"]*)?">/g)].map(m=>m[1]);
assert.equal(styles.length,8,'preserve all existing CSS links and cascade order');
assert.equal(new Set(styles).size,styles.length);
for(const file of styles)await read(join(stage,file));
html=replaceOnce(html,/<script type="importmap">[\s\S]*?<\/script>/g,'','source import map');
let inserted=false;
html=html.replace(/<link rel="stylesheet" href="\.\/[^"]+\.css(?:\?[^"]*)?">/g,()=>{
 if(inserted)return '';inserted=true;return '<link rel="stylesheet" href="./production.css">';
});
await writeFile(join(stage,'production.css'),styles.map(x=>'@import '+JSON.stringify(x)+';').join('\n')+'\n');
html=replaceOnce(html,tag,'<script type="module" src="./boot-v0210.js"></script>','production boot entry');
// The raw source retains its historical comparison metadata; the production
// title, description and menu version come from the single current catalog.
html=replaceOnce(html,/<title>[^<]+<\/title>/g,'<title>SKYSHIFT · '+PRODUCTION_RELEASE_NAME+' · '+PRODUCTION_TRACK.version+'</title>','current production title');
html=replaceOnce(html,/(<meta name="description" content=")SKYSHIFT [^·]+ ·/g,'$1SKYSHIFT '+PRODUCTION_TRACK.version+' – '+PRODUCTION_RELEASE_NAME+' ·','current production description');
html=replaceOnce(html,/(<span id="menu-track-name">[^<]+<\/span> · )\d+(?:\.\d+)+/g,'$1'+PRODUCTION_TRACK.version,'current menu version');
// Retire ordinary Skyline/Aurora selection only in the published bundle.
// The original source HTML/boot remain intact for explicit historical QA.
html=replaceOnce(html,/<select id="track-picker" class="track-picker" aria-label="Välj bana">[\s\S]*?<\/select>/g,
 '<select id="track-picker" class="track-picker" aria-label="Välj bana"><option value="'+PRODUCTION_TRACK.id+'">'+PRODUCTION_TRACK.option+'</option></select>','production track catalog');
html=replaceOnce(html,/<span id="menu-track-name">[^<]+<\/span>/g,'<span id="menu-track-name">'+PRODUCTION_TRACK.name+'</span>','initial track name');
html=replaceOnce(html,/<p class="tagline" id="track-tagline">[^<]+<\/p>/g,'<p class="tagline" id="track-tagline">CONTINUOUS 3D TUNNEL · FAST C2 CORNERS · THREE LAPS.</p>','initial track tagline');
html=replaceOnce(html,/<div class="prototype-label" id="track-features">[^<]+<\/div>/g,'<div class="prototype-label" id="track-features">3 × 3,400 M · FULL TUNNEL · MAIN BOOST · GRIP · NO RISK LANES</div>','initial track features');
html=replaceOnce(html,/<button id="challenges-btn" class="secondary" type="button">/g,'<button id="challenges-btn" class="secondary hidden" type="button">','initial legacy challenges hidden');
await writeFile(join(stage,'index.html'),html);
// Canonicalize before the dynamic game import resolves any track/version flags.
await writeFile(join(stage,'boot-v0210.js'),
 'import {applyProductionCatalog} from "./tracks/shared/production-catalog.mjs";\napplyProductionCatalog(location,history);\n'+originalBoot);
for(const query of ['', '?track=skyline&v=0.26.5','?track=aurora&v=0.26.5','?track=vault&v=0.27.0','?track=unknown','?track=vault&sharedTunnel=classic&trueSharedRenderer=classic']){
 const old=new URL('https://example.invalid/skyshift/'+query);old.searchParams.set('startupAudit','1');old.hash='anchor';
 const canonical=new URL(productionRouteUrl(old.href));
 assert.equal(canonical.searchParams.get('track'),PRODUCTION_TRACK.id);
 assert.equal(canonical.searchParams.get('v'),PRODUCTION_TRACK.version);
 assert.equal(canonical.searchParams.get('startupAudit'),'1');
 assert.notEqual(canonical.searchParams.get('sharedTunnel'),'classic');
 assert.notEqual(canonical.searchParams.get('trueSharedRenderer'),'classic');
 assert.equal(canonical.hash,'#anchor');assert.equal(productionRouteUrl(canonical.href),canonical.href);
}
// Explicit jump links must retain their own release identity through the production boot.
for(const query of ['?track=vault&v=0.28.9.11&vaultJump=1','?track=vault&v=0.29.0']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.0');
 assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
assert.equal(new URL(productionRouteUrl('https://example.invalid/skyshift/?v=0.29.0&vaultJump=0')).searchParams.get('v'),PRODUCTION_TRACK.version);
for(const query of ['?track=vault&v=0.29.1','?track=vault&v=0.29.1&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.1');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const version of ['0.29.5','0.29.5.1','0.29.5.2','0.29.6'])for(const query of ['?track=vault&v='+version,'?track=vault&v='+version+'&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),version);assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const query of ['?track=vault&v=0.29.4.2','?track=vault&v=0.29.4.2&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.4.2');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const query of ['?track=vault&v=0.29.4.1','?track=vault&v=0.29.4.1&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.4.1');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const query of ['?track=vault&v=0.29.4','?track=vault&v=0.29.4&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.4');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const query of ['?track=vault&v=0.29.3.1','?track=vault&v=0.29.3.1&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.3.1');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const query of ['?track=vault&v=0.29.3','?track=vault&v=0.29.3&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.3');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
for(const query of ['?track=vault&v=0.29.2','?track=vault&v=0.29.2&vaultJump=1']){
 const canonical=new URL(productionRouteUrl('https://example.invalid/skyshift/'+query));
 assert.equal(canonical.searchParams.get('v'),'0.29.2');assert.equal(canonical.searchParams.get('vaultJump'),'1');
}
// The old HTML script URL carries the legacy source version; a hashed
// module entry cannot carry that query. Preserve exactly that observed value,
// NOT the route version (?v=) or a new gameplay version.
const game=join(stage,'game-v0210.mjs');
let gameText=await read(game);
gameText=replaceOnce(gameText,/const SKYSHIFT_BUILD_VERSION=new URL\(\s*document\.querySelector\("script\[data-game-module\]"\)\?\.src\|\|location\.href\s*\)\.searchParams\.get\("v"\)\|\|"0\.26\.5";/g,'const SKYSHIFT_BUILD_VERSION='+JSON.stringify(version)+';','source build version');
gameText=specializeVaultGame(gameText);
await writeFile(game,gameText);
const runtime=join(stage,'tunnel/shared-tunnel-runtime-v0280.mjs');
await writeFile(runtime,specializeVaultTunnelRuntime(await read(runtime)));
// The canonical ship loaders resolve source URLs from the SKYSHIFT root.
// Bundled chunks live in bundles/, so preserve the same root via the page URL.
for(const name of ['ships/ship-hero-loader-v0132.mjs','ships/ship-hero-loader-v01342.mjs']){
 const path=join(stage,name),before=await read(path);
 const next=replaceOnce(before,/const shipAssetBase=new URL\("\.\.\/",import\.meta\.url\);/g,
  'const shipAssetBase=document.baseURI;',name+' exact asset base');
 await writeFile(path,next);
}
let graph;
const auditPlugin={name:'skyshift-production-graph',generateBundle(_options,bundle){
 const files=Object.values(bundle).filter(x=>x.type==='chunk');
 const modules=[...new Set(files.flatMap(x=>Object.keys(x.modules)))].sort();
 assert.ok(modules.some(x=>x.includes('game-v0210.mjs')),'live game included');
 assert.ok(!modules.some(x=>/\/(?:tests|docs|previews)\/|\/game-v0203\.mjs|\/material-grade-v0203\.html/.test(x)),'no historical QA entrypoint in production bundle');
 graph={modules:modules.map(x=>x.replaceAll('\\','/').replace(stage.replaceAll('\\','/')+'/','source/').replace(here.replaceAll('\\','/')+'/','build/')),chunks:files.map(x=>({file:x.fileName,imports:x.imports,dynamicImports:x.dynamicImports,bytes:Buffer.byteLength(x.code)}))};
}};
await build({configFile:false,root:stage,base:'./',publicDir:false,plugins:[auditPlugin],
 build:{outDir:dist,emptyOutDir:true,assetsDir:'bundles',manifest:true,target:'es2020',minify:'esbuild',cssMinify:false,cssCodeSplit:false,
 rollupOptions:{input:join(stage,'index.html'),output:{entryFileNames:'bundles/[name]-[hash].js',chunkFileNames:'bundles/[name]-[hash].js',assetFileNames:'bundles/[name]-[hash][extname]',manualChunks(id){if(id.replaceAll('\\','/').match(/\/node_modules\/three\/(?:build|src)\//))return 'three-engine';}}}}});
assert.ok(graph,'bundle graph audit ran');
const retiredProductionModules=[...retiredSceneryModules,...retiredTunnelModules];
for(const name of retiredProductionModules)assert.ok(!graph.modules.includes('source/'+name),'Exclusive legacy renderer still in bundle: '+name);
const ef05Owners=reconcileEF05Owners(resolve(source,'..'),graph);
console.log('SKYSHIFT_EF05_OWNER_RECONCILIATION '+JSON.stringify(ef05Owners.counts));
// Only the explicitly reviewed legacy station assets leave the production
// artifact. Pages assembly retains the exact original bytes for source QA.
const comparisonAssets=[];
for(const path of comparisonOnlyWorldAssets){
 const b=readArchivedWorldAsset('skyshift/'+path);
 comparisonAssets.push({path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
}
await cp(join(source,'assets'),join(dist,'assets'),{recursive:true,
 filter:p=>!comparisonOnlyWorldAssets.includes(relative(source,p).replaceAll('\\','/'))});
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else{const b=await readFile(p);files.push({path:relative(dist,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}
await walk(dist);
files.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile(join(dist,'build-report.json'),JSON.stringify({schema:1,sourceVersion:version,productionCatalog:[PRODUCTION_TRACK],retiredProductionModules,comparisonAssets,ef05Owners,cssOrder:styles,three:'0.180.0',graph,files},null,2)+'\n');
console.log('SKYSHIFT_EF03_BUILD '+JSON.stringify({version,styles,modules:graph.modules.length,chunks:graph.chunks,outputBytes:files.reduce((n,x)=>n+x.bytes,0),files:files.length}));
