// Real Chromium/WebGL comparison of existing source and built production artifact.
// The production website is not changed until these checks and deployment migration pass.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';
const here=dirname(fileURLToPath(import.meta.url)),repo=resolve(here,'../..'),out=join(here,'evidence');
mkdirSync(out,{recursive:true});
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(existsSync);
assert.ok(chrome,'actual Chrome required');
const server=spawn('python3',['-c',[
 'import sys,http.server,functools',
 'root,site=sys.argv[1:]',
 'class Handler(http.server.SimpleHTTPRequestHandler):',
 ' def translate_path(self,path):',
 '  if path.split("?",1)[0].startswith("/Hajjen/"):',
 '   old=self.directory; self.directory=site',
 '   try: return super().translate_path(path[len("/Hajjen"):])',
 '   finally: self.directory=old',
 '  return super().translate_path(path)',
 'http.server.ThreadingHTTPServer(("127.0.0.1",8923),functools.partial(Handler,directory=root)).serve_forever()'
].join('\n'),repo,join(here,'site')],{cwd:repo,stdio:'ignore'});
let browser;const reports=[];

// Actual original tunnel and road shader chain on a new authored route.
// Isolated CI-only document; no production QA entrypoint or fixture assets.
async function independentRoute(memory){
 const context=await browser.newContext({viewport:{width:960,height:540}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/skyshift/build/ef05-fixture.html',route=>route.fulfill({
  contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/skyshift/build/node_modules/three/build/three.module.js","three/addons/":"/skyshift/build/node_modules/three/examples/jsm/"}}</script></head><body style="margin:0;background:#080d19"></body></html>'
 }));
 await page.goto('http://127.0.0.1:8923/skyshift/build/ef05-fixture.html');
 try{
  const result=await page.evaluate(async memory=>{
   const THREE=await import('three');
   const load=p=>import('/skyshift/'+p);
   const [{installConfiguredSharedTunnel},{createSharedSourceSampler0282,installSharedRoadReflections0282,installSharedShipLight0282},
    {createUnifiedSourceRegistry02894,installUnifiedCeilingRoad02894},
    {installVaultStraightRoadParity02891,vaultStraightMask02891},
    {installArchRoadReflection02893},{installRoadSpill02895},
    {installCinematicRoad0289},{createPremiumTrackMaterial},{ZONE_PALETTES}]=await Promise.all([
     load('true-shared-tunnel-renderer-v0281.mjs'),load('tunnel/shared-road-ship-light-v0282.mjs'),
     load('tunnel/unified-tunnel-light-sources-v02894.mjs'),load('tunnel/shared-straight-edge-parity-v02891.mjs'),
     load('tunnel/premium-arch-optics-v02893.mjs'),load('tunnel/road-spill-wave-coves-v02895.mjs'),
     load('rendering/cinematic-metal-neon-v0289.mjs'),load('rendering/road/premium-track-v0160.mjs'),load('zone-wave-v060.mjs')]);
   const lowMemory=memory===4,length=1200,sections=[{start:25,end:625},{start:800,end:1120}];
   // Continuous route: true curve, vertical rise and rotating cross-section.
   const positionAt=(s,l,h)=>{
    const a=s/430,bank=.20*Math.sin(s/120);
    const lateral=l*Math.cos(bank)-h*Math.sin(bank);
    const vertical=l*Math.sin(bank)+h*Math.cos(bank);
    return {x:430*(1-Math.cos(a))+lateral*Math.cos(a),y:12*Math.sin(s/180)+vertical,z:430*Math.sin(a)-lateral*Math.sin(a)};
   };
   const scene=new THREE.Scene();scene.background=new THREE.Color(0x080d19);
   const world=new THREE.Group();scene.add(world);
   const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
   renderer.setSize(960,540);renderer.toneMapping=THREE.ACESFilmicToneMapping;
   document.body.appendChild(renderer.domElement);
   const camera=new THREE.PerspectiveCamera(72,960/540,.1,400);
   const policy={spatialWave:true,stableStrips:true,archFeet:true,precisionNeon:true,
    cinematicMetal:true,straightOnly:true,ceilingFixtures:true,premiumArch:true,
    waveCove:true,fastFrames:!lowMemory,straightRanges:[{from:39,to:240},{from:840,to:1010}]};
   const tunnel=installConfiguredSharedTunnel(THREE,world,{track:'independent-ef05-fixture',
    positionAt,trackLength:length,sections,policy,lowMemory,omitLegacyRoadResponse:true});
   if(!tunnel.active)throw Error(JSON.stringify(tunnel.stats()));
   const stats=tunnel.stats();
   if(stats.sourceModules!==3||stats.physicalModules!==3||stats.coverageMeters!==920||
    !stats.premiumArchOptics02893.active||!stats.waveCoupledWallCoves02895.active)
    throw Error('Actual shared material modules unavailable '+JSON.stringify(stats));
   const sampler=createSharedSourceSampler0282(positionAt,length,tunnel.modules);
   const mask=s=>vaultStraightMask02891(s,tunnel.policy.straightRanges,length);
   const registry=createUnifiedSourceRegistry02894(positionAt,length,{lowMemory,sourceSampler:sampler,straightMask:mask});
   const positions=[],coords=[],indices=[],lanes=[-11,-9,0,9,11];
   for(let s=0;s<=length;s+=2)for(const l of lanes){
    const p=positionAt(s,l,-.2);positions.push(p.x,p.y,p.z);coords.push(s,l);
   }
   for(let i=0;i<length/2;i++)for(let j=0;j<lanes.length-1;j++){
    const a=i*lanes.length+j,b=a+lanes.length;
    indices.push(a,b,a+1,a+1,b,b+1);
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   geo.setAttribute('aTrackCoord',new THREE.Float32BufferAttribute(coords,2));
   geo.setIndex(indices);geo.computeVertexNormals();
   const premium=createPremiumTrackMaterial(THREE);
   premium.setDetailMode(lowMemory?'low':'high');
   const road=new THREE.Mesh(geo,premium.material);
   road.name='Zone Ribbon · integrated PBR racing deck';world.add(road);
   const native=installSharedRoadReflections0282(THREE,world,{enabled:true,positionAt,trackLength:length,lowMemory,sourceSampler:sampler});
   const finish=installCinematicRoad0289(world,{enabled:true,lowMemory,road:true});
   const straight=installVaultStraightRoadParity02891(THREE,road,{enabled:true,ranges:tunnel.policy.straightRanges,trackLength:length});
   const arch=installArchRoadReflection02893(THREE,world,positionAt,{enabled:true,lowMemory,trackLength:length,unifiedSources:true,sourceSampler:sampler,sourceRegistry:registry});
   const cove=installUnifiedCeilingRoad02894(THREE,world,positionAt,{enabled:true,lowMemory,trackLength:length,sourceRegistry:registry});
   const spill=installRoadSpill02895(THREE,road,{enabled:true,lowMemory,trackLength:length,sourceModules:tunnel.modules});
   const shipLight=installSharedShipLight0282(THREE,{enabled:true,positionAt,trackLength:length,lowMemory,sourceSampler:sampler});
   const ship=new THREE.Mesh(new THREE.BoxGeometry(2.5,.7,4),new THREE.MeshStandardMaterial({color:0x768ba8,metalness:.6,roughness:.35}));
   ship.name='fixture hull';world.add(ship);shipLight.attachShip(ship);
   const controllers=[native,finish,straight,arch,cove,spill,shipLight];
   if(controllers.some(x=>!x.active))throw Error('optical controller inactive '+JSON.stringify(controllers.map(x=>x.stats())));
   if(sampler.localFor(700)!==null||registry.at(700)!==null||mask(700)!==0)
    throw Error('Gap must have no tunnel source');
   shipLight.update(700);
   if(shipLight.stats().sourceWeights.cyan!==0||shipLight.stats().sourceWeights.amber!==0)
    throw Error('Open gap receives ship tunnel lighting');
   const row=350*lanes.length+2,weights=geo.getAttribute('roadFixtureMasks0263');
   if(weights.getX(row)!==0||weights.getY(row)!==0||geo.getAttribute('edgeStraightMask02891').getX(row)!==0)
    throw Error('Open gap receives road tunnel lighting');
   tunnel.setCinematicMetalComparison({contrast:true,strips:true});
   const light=new THREE.AmbientLight(0xffffff,.8);scene.add(light);
   window.renderEF05=(station,stage)=>{
    const eye=positionAt(station,0,5),target=positionAt(station+75,0,5);
    camera.position.set(eye.x,eye.y,eye.z);camera.lookAt(target.x,target.y,target.z);
    const hull=positionAt(station+16,0,1.5);ship.position.set(hull.x,hull.y,hull.z);
    const wave={shaderBaseStage:stage,playerStage:stage,fronts:[station+40],activeCount:0};
    premium.setPalette(ZONE_PALETTES[stage]);tunnel.updateWave(wave);
    arch.updateWave(wave);cove.updateWave(wave);spill.updateWave(wave);shipLight.update(station+16);
    renderer.render(scene,camera);
    const gl=renderer.getContext(),pixels=new Uint8Array(960*540*4);
    gl.readPixels(0,0,960,540,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('WebGL fixture failed');
    const old=window.ef05Pixels;
    let changed=0,lit=0;
    for(let i=0;i<pixels.length;i+=4){
     if(pixels[i]+pixels[i+1]+pixels[i+2]>90)lit++;
     if(old&&Math.abs(old[i]-pixels[i])+Math.abs(old[i+1]-pixels[i+1])+Math.abs(old[i+2]-pixels[i+2])>12)changed++;
    }
    window.ef05Pixels=pixels;
    return {changed,lit,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
   };
   return {modules:stats.sourceModules,meters:stats.coverageMeters,physical:stats.physicalModules,lowMemory};
  },memory);
  const frames=[];
  for(const station of [100,900,700]){
   for(const stage of [0,4]){
    const frame=await page.evaluate(([station,stage])=>window.renderEF05(station,stage),[station,stage]);
    assert.ok(frame.calls>0&&frame.lit>500,'real rendered pixels '+JSON.stringify(frame));
    if(station!==700&&stage===4)assert.ok(frame.changed>100,'same-camera wave color must change pixels');
    await page.screenshot({path:join(out,'ef05-independent-'+memory+'GB-'+station+'-stage'+stage+'.png')});
    frames.push({station,stage,...frame});
   }
  }
  assert.deepEqual(errors,[],'independent WebGL '+memory+'GB errors');
  return {...result,frames};
 }finally{await context.close();}
}

try{
 await sleep(500);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const memory of [8,4]){
  const results=[];
  for(const mode of ['source','bundle']){
   const context=await browser.newContext({viewport:{width:1280,height:720}});
   await context.addInitScript(m=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m}),memory);
   const page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
   page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url()+' '+r.failure()?.errorText);});
   page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
   page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|context lost|startup failed/i.test(m.text()))errors.push(m.text());});
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
   let transferred=0,completed=0;cdp.on('Network.loadingFinished',e=>{transferred+=e.encodedDataLength;completed++;});
   page.on('request',r=>requests.push(r.url()));
   const prefix=mode==='source'?'/skyshift/':'/Hajjen/skyshift/';
   const url='http://127.0.0.1:8923'+prefix+'?track=vault&v=0.28.9.7&startupAudit=1&trackRepairSmoke=1';
   const phases=[];
   for(const phase of ['cold','warm']){
    transferred=0;completed=0;requests.length=0;const started=performance.now();
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:80000});
    await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
    const boot=await page.evaluate(()=>{
     const ids=['menu','start-btn','topbar-track-name','hud','game'];const styles={};
     for(const id of ids){const el=document.getElementById(id),s=getComputedStyle(el);styles[id]=[s.display,s.position,s.fontSize,s.color,s.backgroundColor,s.width,s.height];}
     return {state:window.__skyshiftBoot,scene:window.__skyshiftStartupAudit?.()?.scene,styles,title:document.querySelector('#topbar-track-name')?.textContent};
    });
    assert.equal(boot.state.phase,'ready',JSON.stringify({mode,memory,boot,errors}).slice(0,3000));
    assert.equal(boot.scene?.sharedTunnelModules,10,JSON.stringify({mode,memory,scene:boot.scene,errors}).slice(0,4000));
    assert.equal(boot.scene?.legacyRoadResponseMeshes,0,'current production must not allocate retired road overlay');
    assert.equal(boot.scene?.omittedLegacyRoadBatches,memory===8?10:0,'actual shared renderer omission count');
    assert.equal(boot.scene?.pmremActive,true);
    const timing={phase,bootMs:boot.state.readyAfterMs,wallMs:performance.now()-started,encodedBytes:transferred,completed,requestCount:requests.length,requests:[...requests]};
    if(mode==='bundle')assert.ok(!requests.some(x=>/cdn\.jsdelivr\.net\/npm\/three/.test(x)),'bundle must not fetch Three CDN');
    await page.locator('#start-btn').click();
    await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:40000});
    await page.evaluate(()=>window.__skyshiftTrackRepairTeleport(110));await page.waitForTimeout(300);
    const render=await page.evaluate(()=>({width:document.querySelector('canvas').width,height:document.querySelector('canvas').height,lost:document.querySelector('canvas').getContext('webgl2')?.isContextLost()??true}));
    assert.ok(render.width>100&&render.height>100&&!render.lost,JSON.stringify(render));
    assert.deepEqual(errors,[],mode+' '+memory+'GB errors');
    await page.screenshot({path:join(out,mode+'-'+memory+'GB-'+phase+'.png')});
    phases.push({timing,styles:boot.styles,title:boot.title,render});
   }
   const row={mode,memory,phases};reports.push(row);results.push(row);await context.close();
  }
  for(let i=0;i<2;i++){
   assert.deepEqual(results[1].phases[i].styles,results[0].phases[i].styles,'computed menu CSS parity');
   assert.equal(results[1].phases[i].title,results[0].phases[i].title,'version label parity');
   assert.deepEqual(results[1].phases[i].render,results[0].phases[i].render,'render surface parity');
  }
 }
 const independent=[];
 for(const memory of [8,4])independent.push(await independentRoute(memory));
 writeFileSync(join(out,'ef05-independent-report.json'),JSON.stringify(independent,null,2)+'\n');
 console.log('SKYSHIFT_EF05_INDEPENDENT '+JSON.stringify(independent));
 writeFileSync(join(out,'browser-report.json'),JSON.stringify(reports,null,2)+'\n');
 console.log('SKYSHIFT_EF03_BROWSER '+JSON.stringify(reports.map(r=>({mode:r.mode,memory:r.memory,phases:r.phases.map(p=>({...p.timing,requests:undefined}))}))));
}finally{await browser?.close();server.kill('SIGTERM');}
