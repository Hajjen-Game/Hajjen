// EF06: actual built game, repeated ship changes, browser context loss/reload,
// and exact pre-EF06 source baseline. CI-only: no production entrypoint.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const baseline='bb607b6a8b0f00dfef177e0cacc1430a75cf4f69';
const query='?track=vault&v=0.28.9.7&startupAudit=1&resourceSmoke=1';
const waitReady=async page=>{
 await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
 assert.equal(await page.evaluate(()=>window.__skyshiftBoot.phase),'ready');
};
async function startup(page,url){
 const t=performance.now();
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:80000});
 await waitReady(page);
 const a=await page.evaluate(()=>window.__skyshiftStartupAudit());
 assert.ok(a.stamps.sceneReady>=0&&a.scene.pmremActive&&a.scene.sharedTunnelModules===10);
 return {wallMs:performance.now()-t,bootMs:a.browserBootMs,stamps:a.stamps,durations:a.durations,renderer:a.renderer,scene:a.scene,heapMB:a.jsHeapMB};
}
export async function captureEF06Lifetime({browser,repo,out,candidateSource}){
 const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','inherit']}).trim();
 const dir=mkdtempSync(join(tmpdir(),'skyshift-ef06-')),checkout=join(dir,'baseline');
 let server,added=false;
 const report={baseline,candidate:git(['rev-parse','HEAD']),renderer:'Chromium/SwiftShader; deviceMemory emulated, not physical hardware',startup:[],lifecycle:null};
 try{
  git(['fetch','--no-tags','--depth=1','origin',baseline]);
  git(['worktree','add','--detach',checkout,baseline]);added=true;
  assert.equal(git(['-C',checkout,'rev-parse','HEAD']),baseline);
  server=spawn('python3',['-m','http.server','8926','--bind','127.0.0.1','--directory',checkout],{stdio:'ignore'});
  let ready=false;
  for(let i=0;i<30;i++){try{if((await fetch('http://127.0.0.1:8926/skyshift/index.html')).ok){ready=true;break;}}catch{}await sleep(250);}
  assert.ok(ready,'exact EF05 baseline server');
  for(const memory of [8,4]){
   const context=await browser.newContext({viewport:{width:1280,height:720}});
   try{
    await context.addInitScript(m=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m}),memory);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
    const before=[];
    for(const phase of ['cold','warm'])before.push({phase,...await startup(page,'http://127.0.0.1:8926/skyshift/'+query)});
    assert.deepEqual(errors,[],'baseline startup errors');
    const after=candidateSource.find(x=>x.memory===memory&&x.mode==='source').phases.map(x=>({phase:x.timing.phase,wallMs:x.timing.wallMs,bootMs:x.timing.bootMs,...x.startup}));
    report.startup.push({memory,before,after,comparison:'Same source route, viewport, software GPU and memory profile; timings are observations, not a physical-device claim.'});
   }finally{await context.close();}
  }
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  try{
   await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8}));
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
   const url='http://127.0.0.1:8923/Hajjen/skyshift/'+query+'&fleetSmoke=1';
   await startup(page,url);
   const audit=()=>page.evaluate(()=>window.__skyshiftResourceAudit());
   await page.waitForFunction(()=>window.__skyshiftResourceAudit?.().stamps.firstFrame!==undefined);
   const initial=await audit();assert.ok(initial.atlas.textures>0);
   await page.locator('#hangar-btn').click();
   await page.waitForFunction(()=>window.__skyshiftResourceAudit().mode==='hangar');
   const swaps=[];report.lifecycle={initial,swaps};
   async function settled(){
    const start=(await audit()).frame;
    await page.waitForFunction(f=>window.__skyshiftResourceAudit().frame>=f+3,start,{timeout:60000});
    return audit();
   }
   for(let cycle=0;cycle<3;cycle++){
    await page.locator('[data-fleet-preview="stingray"]').click();
    await page.waitForFunction(()=>window.__skyshiftResourceAudit().ship.status==='active',null,{timeout:60000});
    const stingray=await settled();assert.equal(stingray.activeShip,'stingray');
    assert.equal(stingray.lastShipRelease?.undisposed,0,'all departing Manta geometry disposed');
    assert.equal(stingray.ship.sourceCache.requests,1);
    await page.locator('[data-fleet-preview="manta"]').click();
    await page.waitForFunction(()=>window.__skyshiftResourceAudit().activeShip==='manta');
    const manta=await settled();
    swaps.push({cycle,stingray,manta});
    console.log('SKYSHIFT_EF06_SWAP '+JSON.stringify({cycle,stingray:{renderer:stingray.renderer,release:stingray.lastShipRelease,bindings:stingray.bindingCounts},manta:{renderer:manta.renderer,release:manta.lastShipRelease,bindings:manta.bindingCounts}}));
    assert.equal(manta.lastShipRelease?.undisposed,0,'all departing Stingray geometry disposed');
   }
   for(const {stingray,manta} of swaps.slice(1)){
    assert.ok(stingray.renderer.geometries<=swaps[0].stingray.renderer.geometries+4,'Stingray GPU geometry grows across identical swaps: '+JSON.stringify(swaps.map(x=>x.stingray.renderer)));
    assert.ok(manta.renderer.geometries<=swaps[0].manta.renderer.geometries+4,'Manta GPU geometry grows across identical swaps: '+JSON.stringify(swaps.map(x=>x.manta.renderer)));
    assert.equal(manta.atlas.textures,initial.atlas.textures);
    assert.deepEqual(stingray.bindingCounts,swaps[0].stingray.bindingCounts,'Stingray material bindings bounded');
    assert.deepEqual(manta.bindingCounts,swaps[0].manta.bindingCounts,'Manta material bindings bounded');
   }
   await page.locator('#hangar-back').click();
   const loss=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;window.ef06LossExtension=ext;ext.loseContext();return true;});
   assert.ok(loss,'actual WebGL_lose_context available');
   await page.waitForFunction(()=>window.__skyshiftResourceAudit().lifetime.contextLost);
   const lost=await audit();assert.equal(lost.lifetime.pendingFrames,0);
   await Promise.all([page.waitForEvent('load',{timeout:220000}),page.evaluate(()=>window.ef06LossExtension.restoreContext())]);
   await waitReady(page);
   await page.waitForFunction(()=>window.__skyshiftResourceAudit?.().stamps.firstFrame!==undefined);
   const recovered=await audit();assert.equal(recovered.lifetime.contextLost,false);
   assert.equal(recovered.atlas.textures,initial.atlas.textures);
   assert.ok(recovered.renderer.geometries<=initial.renderer.geometries+4,'reload returns to bounded initial geometry');
   // Exercise actual pagehide callback and inspect the disposed document before closing it.
   const disposed=await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));return window.__skyshiftResourceAudit();});
   assert.equal(disposed.lifetime.disposed,true);assert.equal(disposed.lifetime.pendingFrames,0);assert.equal(disposed.lifetime.listeners,0);
   assert.equal(disposed.atlas.textures,0,'all shared tunnel atlas leases returned');
   assert.equal(disposed.objects,0);assert.deepEqual(disposed.teardown.errors,[]);
   assert.equal(disposed.ship.sourceCache.closed,true);
   assert.deepEqual(errors,[],'actual built lifecycle runtime errors');
   report.lifecycle={initial,swaps,lost,recovered,disposed};
  }finally{await context.close();}
 }finally{
  writeFileSync(join(out,'ef06-resource-startup-report.json'),JSON.stringify(report,null,2)+'\n');
  if(server)server.kill('SIGTERM');
  if(added)git(['worktree','remove','--force',checkout]);
  rmSync(dir,{recursive:true,force:true});
 }
 console.log('SKYSHIFT_EF06_LIFETIME '+JSON.stringify(report));
}
