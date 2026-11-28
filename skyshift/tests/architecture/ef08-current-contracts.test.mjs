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
  let destination=readFileSync(resolve(repo,f.newPath),'utf8');
  // 0.29.3.1 intentional runtime extensions, not relocation changes.
  // Undo only the exact reviewed additions, then verify both original hashes.
  // All other edits still fail the historic identity check.
  const approved={
   // 0.29.5.2: reverse only the exact reviewed exhaust changes; retain the archived identity.
   'skyshift/ships/engine-trails-v01346.mjs':[
    [
     "  emitterCount:ENGINE_TRAIL_SPEC.emitters};\n}\nexport function createTwinEngineFX(THREE,scene,ship,edgeMaterial=null){\n // 4 graduated quads per emitter, packed into a single reused BufferGeometry.\n const position=new Float32Array(ENGINE_TRAIL_SPEC.emitters*",
     "  emitterCount:ENGINE_TRAIL_SPEC.emitters};\n}\n// A single camera-facing procedural mesh, with two independently rooted quads.\n// UV x spans the plume; UV y runs from the real nozzle to the fading tail.\nexport const ENERGY_PLUME_SPEC=Object.freeze({version:\"0.29.5.2\",emitters:2,triangles:4,drawCalls:1,extraLights:0,extraParticles:0,extraPasses:0});\nexport function energyPlumeGeometry(){\n const position=[],uv=[];\n for(const socket of ENGINE_SOCKETS)for(const [x,y] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){\n  position.push(socket.x,socket.y,socket.z+.04);uv.push(x,y);\n }\n return {position,uv};\n}\nexport function energyPlumeProfile(state){\n return {length:state.length,width:.34+.10*state.speedSignal+.12*state.flow,\n  strength:.72+.62*state.speedSignal+1.15*state.flow+.35*state.ignition};\n}\nconst plumeVertex=`\n uniform float uLength,uWidth,uBias;\n varying vec2 vPlume;\n void main(){\n  vPlume=uv;\n  float t=uv.y;\n  float signSide=sign(position.x);\n  vec3 center=position+vec3(-signSide*uBias*t*.7,0.,uLength*t*(1.-signSide*uBias));\n  vec3 p=(modelViewMatrix*vec4(center,1.)).xyz;\n  vec3 axis=normalize(mat3(modelViewMatrix)*vec3(0.,0.,1.));\n  vec3 right=cross(axis,normalize(-p));\n  float sideLength=length(right);\n  right=sideLength>.001?right/sideLength:vec3(1.,0.,0.);\n  float width=uWidth*(.72+.35*sin(t*3.14159265))*mix(1.,.32,t);\n  p+=right*(uv.x*2.-1.)*width*length(mat3(modelViewMatrix)*vec3(1.,0.,0.));\n  gl_Position=projectionMatrix*vec4(p,1.);\n }`;\nconst plumeFragment=`\n uniform vec3 uTint;\n uniform float uTime,uStrength,uOpacity,uFlow;\n varying vec2 vPlume;\n void main(){\n  float t=vPlume.y;\n  float ripple=sin(t*35.-uTime*(15.+8.*uFlow))*.045;\n  float x=abs(vPlume.x*2.-1.+ripple*t);\n  float tail=1.-smoothstep(.20,1.,t);\n  float edge=1.-smoothstep(.18,.98,x);\n  float core=(1.-smoothstep(.055,.29,x))*(1.-smoothstep(.08,.72,t));\n  float pulse=.88+.12*sin(t*39.-uTime*20.);\n  float cells=.89+.11*cos(t*25.-uTime*12.);\n  vec3 tint=mix(uTint,vec3(.17,.48,1.),.10);\n  vec3 energy=tint*(1.55*edge*pulse)+mix(tint,vec3(.90,.98,1.),.88)*core*3.3*cells;\n  float alpha=tail*edge*min(1.,uOpacity*1.65);\n  gl_FragColor=vec4(energy*uStrength,alpha);\n }`;\nexport function createTwinEngineFX(THREE,scene,ship,edgeMaterial=null,{energyPlumes=false}={}){\n // 4 graduated quads per emitter, packed into a single reused BufferGeometry.\n const position=new Float32Array(ENGINE_TRAIL_SPEC.emitters*"
    ],
    [
     "  .setUsage(THREE.DynamicDrawUsage));\n geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,6),18);\n const material=new THREE.MeshBasicMaterial({\n  color:0xffffff,vertexColors:true,transparent:true,\n  opacity:ENGINE_TRAIL_SPEC.baseOpacity,",
     "  .setUsage(THREE.DynamicDrawUsage));\n geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,6),18);\n let material=new THREE.MeshBasicMaterial({\n  color:0xffffff,vertexColors:true,transparent:true,\n  opacity:ENGINE_TRAIL_SPEC.baseOpacity,"
    ],
    [
     "  blending:THREE.AdditiveBlending\n });\n const ribbons=new THREE.Mesh(geometry,material);\n ribbons.name=\"Two graduated chromatic + white-core wing-engine streaks\";\n ribbons.frustumCulled=false;ship.add(ribbons);\n const impactPositions=[];\n for(let i=0;i<8;i++){",
     "  blending:THREE.AdditiveBlending\n });\n if(energyPlumes){\n  const plume=energyPlumeGeometry();\n  geometry.setAttribute(\"position\",new THREE.Float32BufferAttribute(plume.position,3));\n  geometry.deleteAttribute(\"color\");\n  geometry.setAttribute(\"uv\",new THREE.Float32BufferAttribute(plume.uv,2));\n  material.dispose();\n  material=new THREE.ShaderMaterial({\n   uniforms:{uLength:{value:2.55},uWidth:{value:.34},uBias:{value:0},\n    uTint:{value:new THREE.Color(0x43ddf0)},uTime:{value:0},uStrength:{value:.72},uOpacity:{value:.24},uFlow:{value:0}},\n   vertexShader:plumeVertex,fragmentShader:plumeFragment,\n   transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,\n   toneMapped:false,blending:THREE.AdditiveBlending\n  });\n }\n const ribbons=new THREE.Mesh(geometry,material);\n ribbons.name=\"Two graduated chromatic + white-core wing-engine streaks\";\n ribbons.frustumCulled=false;ribbons.visible=false;ship.add(ribbons);\n const impactPositions=[];\n for(let i=0;i<8;i++){"
    ],
    [
     "   ribbons.visible=!!playing;\n   tint.setHex(sectorColor);\n   for(let i=0;i<ENGINE_SOCKETS.length;i++){\n    const emitter=ENGINE_SOCKETS[i];",
     "   ribbons.visible=!!playing;\n   tint.setHex(sectorColor);\n   if(energyPlumes){\n    const p=energyPlumeProfile(state),u=material.uniforms;\n    u.uLength.value=p.length;u.uWidth.value=p.width;u.uBias.value=state.sideBias;\n    u.uTint.value.copy(tint);u.uTime.value=elapsed;u.uStrength.value=p.strength;\n    u.uOpacity.value=playing?state.opacity:0;u.uFlow.value=state.flow;\n   }else{\n   for(let i=0;i<ENGINE_SOCKETS.length;i++){\n    const emitter=ENGINE_SOCKETS[i];"
    ],
    [
     "   geometry.attributes.color.needsUpdate=true;\n   material.opacity=playing?state.opacity:0;\n   if(edgeMaterial)edgeMaterial.opacity=.60+state.flow*.19+\n    Math.min(.035,Math.abs(state.sideBias)*.3);",
     "   geometry.attributes.color.needsUpdate=true;\n   material.opacity=playing?state.opacity:0;\n   }\n   if(edgeMaterial)edgeMaterial.opacity=.60+state.flow*.19+\n    Math.min(.035,Math.abs(state.sideBias)*.3);"
    ],
    [
     "   layersPerEmitter:ENGINE_TRAIL_SPEC.layersPerEmitter,\n   actualEmitters:ENGINE_SOCKETS.length,\n   lastLengthMeters:+lastState.length.toFixed(2),\n   scaleBaseline:{...baseScale},rootScaleOwnershipPreserved:true};},",
     "   layersPerEmitter:ENGINE_TRAIL_SPEC.layersPerEmitter,\n   actualEmitters:ENGINE_SOCKETS.length,\n   energyPlumes,plumeDrawCalls:1,plumeTriangles:energyPlumes?4:16,visible:ribbons.visible,\n   plumeProfile:energyPlumes?energyPlumeProfile(lastState):null,\n   lastLengthMeters:+lastState.length.toFixed(2),\n   scaleBaseline:{...baseScale},rootScaleOwnershipPreserved:true};},"
    ]
   ],
   'skyshift/rendering/neon-v0111.mjs':[
    ['  bloomResolutionScale:bloomResolution.scale,','  get bloomResolutionScale(){return bloomResolution.scale;},\n  setBloomResolutionScale(scale){bloomResolution.setScale(scale);},\n  originalBloomResolutionScale:bloomScaleFor({lowMemory,forceFullBloom}),']
   ],
   'skyshift/world/space-v0496.mjs':[
    ['  const starClouds=[];','  const starClouds=[],backdropSprites=[];'],
    ['    camera.add(sprite);','    camera.add(sprite);backdropSprites.push(sprite);'],
    ['    setVelocityFlow(flow){','    setVisible(visible){for(const {cloud} of starClouds)cloud.visible=visible;for(const sprite of backdropSprites)sprite.visible=visible;},\n    visibilityStats(){return {stars:starClouds.reduce((n,s)=>n+Number(s.cloud.visible),0),nebulae:backdropSprites.reduce((n,s)=>n+Number(s.visible),0)};},\n    setVelocityFlow(flow){']
   ]
  };
  for(const [before,after] of [...(approved[f.newPath]??[])].reverse()){
   assert.equal(destination.split(after).length-1,1,f.newPath+' exact approved runtime extension inverse anchor');
   destination=destination.replace(after,before);
  }
  assert.equal(hash(destination),f.destinationSha,f.newPath+' recorded destination identity');
  let original=destination;
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
