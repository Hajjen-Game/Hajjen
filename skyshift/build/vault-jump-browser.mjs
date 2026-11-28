// The exact player-facing production build, not a second renderer.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
const here=dirname(fileURLToPath(import.meta.url)),out=join(here,'evidence');
mkdirSync(out,{recursive:true});
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(existsSync);
assert.ok(chrome,'actual Chrome required');
const live=process.argv[2];
const server=live?null:spawn('python3',['-m','http.server','8926','--bind','127.0.0.1','--directory',join(here,'site')],{stdio:'ignore'});
let browser;
try{
 if(server)await sleep(600);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports=[];
 for(const memory of live?[8]:[8,4]){
  const context=await browser.newContext(memory===4?{viewport:{width:780,height:360},hasTouch:true,isMobile:true,deviceScaleFactor:2}:{viewport:{width:1280,height:720}});
  try{
   await context.addInitScript(m=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m}),memory);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
   page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|context lost|startup failed/i.test(m.text()))errors.push(m.text());});
   const url=new URL(live||'http://127.0.0.1:8926/skyshift/');
   url.search=memory===8?'track=vault&v=0.29.8&vaultJump=1':'track=vault&v=0.29.8';
   url.searchParams.set('vaultJumpSmoke','1');url.searchParams.set('release','0290-public-proof-'+Date.now());
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>window.__skyshiftBoot?.menuReadyMs!==undefined,null,{timeout:30000});
   assert.equal(await page.evaluate(()=>window.__skyshiftBoot.phase),'menu');
   assert.equal(await page.evaluate(()=>typeof window.__skyshiftStartupAudit),'undefined');
   assert.equal(await page.evaluate(()=>window.__skyshiftBoot.moduleReady),false);
   assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(x=>/\/(?:game-v0210|three-engine)-[^/]+\.js(?:\?|$)/.test(x.name))),false,'cold menu cannot fetch game or Three.js bundle');
   await page.locator('#menu-settings-btn').click();
   await page.locator('#frame-cap').selectOption('90');
   await page.locator('#settings-back-btn').click();
   await page.locator('#hangar-btn').click();
   assert.equal(await page.locator('#fleet-preview-mode').textContent(),'SHIP SELECTION');
   await page.locator('#hangar-back').click();
   assert.equal(await page.evaluate(()=>window.__skyshiftBoot.phase),'menu');
   await page.screenshot({path:join(out,'instant-menu-'+memory+'GB.png')});
   await page.locator('#start-btn').click();
   await page.locator('#race-loading').waitFor({state:'visible',timeout:15000});
   await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
   assert.equal(await page.evaluate(()=>window.__skyshiftBoot.phase),'ready',JSON.stringify(await page.evaluate(()=>window.__skyshiftBoot)));
   const boot=await page.evaluate(()=>window.__skyshiftBoot);
   assert.deepEqual(boot.loadingStages.map(x=>x.step),[1,2,3,4,5,6]);
   assert.ok(boot.raceLoadMs>0);
   assert.ok(await page.evaluate(()=>window.__skyshiftStartupAudit().stamps.raceWarmFrame!==undefined));
   await page.locator('#pause-btn').click();
   await page.locator('#pause-menu-btn').click();
   if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());
   const probe=await page.evaluate(()=>window.__skyshiftVaultJumpProbe());
   assert.equal(probe.active,true,JSON.stringify(probe));assert.equal(probe.version,'0.29.8');assert.equal(new URLSearchParams(probe.query).get('v'),'0.29.8');
   assert.equal(probe.polish,true);assert.equal(probe.rampRise,7.5);
   assert.equal(probe.speedProfile.id,'hyper-0297');assert.equal(probe.speedProfile.startSpeed,60);assert.equal(probe.speedProfile.endSpeed,105);
   assert.deepEqual(probe.speedProfile.cruiseTargets,Array.from({length:9},(_,i)=>Math.min(105,60*1.11**i)));
   assert.equal(probe.speedProfile.launchPresentationRatio,1);
   assert.equal(probe.mounted,true);assert.equal(probe.pmrem,true);assert.equal(probe.gaps.length,1);assert.equal(probe.gaps[0].id,'vault-mega-jump');
   assert.equal(probe.inside,0);assert.ok(probe.before>0&&probe.after>0);assert.equal(probe.roadBefore,true);assert.equal(probe.roadGap,false);assert.equal(probe.roadAfter,true);
   assert.match(await page.locator('#menu-track-name').textContent(),/MEGA JUMP.*0\.29\.8/);
   const verifyManta=async(label)=>{
    const p=await page.evaluate(()=>window.__skyshiftMantaVisualProbe());
    for(const k of ['before','after']){
     writeFileSync(join(out,'manta-'+memory+'GB-'+label+'-'+k+'.png'),Buffer.from(p[k].png.split(',')[1],'base64'));delete p[k].png;
    }
    assert.equal(p.before.spec.version,'0.29.5');assert.equal(p.after.spec.version,'0.29.5.1');assert.equal(p.after.spec.visualBeamMeters,5.8);
    assert.deepEqual(p.after.sockets,p.before.sockets);
    assert.equal(p.after.flaps.wingCount,2);assert.equal(p.after.spec.physicsChanged,false);
    assert.equal(p.after.spec.addedLights,0);assert.equal(p.after.spec.addedTextures,0);
    assert.ok(p.after.polish.geometryTriangles<=p.after.spec.maxGeometryTriangles,JSON.stringify(p.after.polish));
    assert.ok(p.after.hullCalls<=p.before.hullCalls,JSON.stringify(p));
    assert.ok(p.after.pmrem>0,'rebirth hull must use actual PMREM');
    assert.ok(p.fractionOver2>.0001,'real rendered hull must change');
    assert.equal(p.after.exhaust.energyPlumes,true);
    assert.equal(p.after.exhaust.plumeDrawCalls,1);assert.equal(p.after.exhaust.plumeTriangles,4);
    if(label==='race'){
     assert.equal(p.exhaustBefore.spec.version,p.after.spec.version);
     assert.equal(p.exhaustBefore.exhaust.energyPlumes,false);
     assert.equal(p.after.exhaust.visible,true);
     assert.ok(p.exhaustChangedPixels>0,'actual rendered exhaust must change');
     writeFileSync(join(out,'manta-'+memory+'GB-exhaust-before.png'),Buffer.from(p.exhaustBefore.png.split(',')[1],'base64'));delete p.exhaustBefore.png;
    }else assert.equal(p.after.exhaust.visible,false);
    return p;
   };
   await page.locator('#hangar-btn').click();
   await page.waitForTimeout(600);
   const mantaHangar=await verifyManta('hangar');
   assert.equal(mantaHangar.mode,'hangar');
   await page.locator('#hangar-back').click();
   await page.locator('#menu-settings-btn').click();
   await page.locator('#frame-cap').selectOption('90');
   await page.locator('#graphics-quality').selectOption('fixed');
   await page.locator('#extended-diagnostics').check();
   await page.locator('#bloom-resolution').selectOption('0.78');
   await page.locator('#exterior-backdrop').uncheck();
   assert.equal(await page.locator('#motion-blur').inputValue(),'high');
   assert.equal(await page.locator('#adaptive-velocity-camera').isChecked(),true);
   await page.locator('#motion-blur').selectOption('ultra');
   assert.equal(await page.locator('#motion-blur').inputValue(),'ultra');
   await page.locator('#motion-blur').selectOption('extreme');
   assert.equal(await page.locator('#motion-blur').inputValue(),'extreme');
   await page.locator('#motion-blur').selectOption('off');
   await page.locator('#adaptive-velocity-camera').uncheck();
   await page.locator('#adaptive-velocity-camera').check();
   // A real user click into fullscreen, exit and then re-enter via START.
   // Native Chrome proof on desktop; the mobile emulation may not expose
   // the same browser chrome as a physical Android device.
   if(memory===8){
    await page.locator('#menu-fullscreen-btn').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='app',null,{timeout:15000});
    assert.equal(await page.locator('#menu-fullscreen-btn').getAttribute('aria-pressed'),'true');
    await page.locator('#menu-fullscreen-btn').click();
    await page.waitForFunction(()=>!document.fullscreenElement,null,{timeout:15000});
    assert.equal(await page.locator('#menu-fullscreen-btn').getAttribute('aria-pressed'),'false');
   }
   await page.locator('#settings-back-btn').click();
   await page.locator('#start-btn').click();
   await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:40000});
   const frames={},comparisons=[];let advanced=null,velocity=null,mantaRace=null;
   for(const phase of ['approach','air','landing']){
    const result=await page.evaluate(p=>window.__skyshiftVaultJumpCapture(p),phase);frames[phase]=result;
    await page.waitForTimeout(1000);
    await page.screenshot({path:join(out,'vault-jump-'+memory+'GB-'+phase+'.png'),timeout:60000});
    const comparison=await page.evaluate(()=>window.__skyshiftSmartPerformanceProbe());comparisons.push({phase,...comparison});
    assert.equal(comparison.settings.fps,90);assert.equal(comparison.settings.quality,'fixed');assert.equal(comparison.physicsHz,120);
    assert.ok(comparison.visibility.sourceMeshes>=2,JSON.stringify(comparison));
    assert.ok(comparison.culled.triangles<comparison.full.triangles,JSON.stringify(comparison));
    assert.equal(comparison.pixelsEqual,true,'rendered pixels changed by section visibility: '+JSON.stringify(comparison));
    // One multi-effect A/B on the existing approach capture per profile.
    // Keep the expensive full-browser proof in the existing job.
    if(phase==='approach'){
     mantaRace=await verifyManta('race');assert.equal(mantaRace.mode,'playing');
     const proof=await page.evaluate(()=>window.__skyshiftColorWaveProof());
     const wave=proof.zones;
     assert.equal(wave.length,9);assert.equal(new Set(wave.map(x=>x.png)).size,9,'real palette frames must differ');
     for(const row of wave){
      assert.ok(row.emitters.some(x=>x.role==='secondary'&&x.vertices>0));
      assert.ok(row.emitters.some(x=>x.role==='highlight'&&x.vertices>0));
      for(const e of row.emitters)assert.equal(e.from,row.palette[e.role]);
      assert.equal(row.road.waveColors[0],row.palette.secondary);
      assert.equal(row.road.accentWaveColors[0],row.palette.highlight);
      writeFileSync(join(out,'color-wave-'+memory+'GB-zone-'+(row.stage+1)+'.png'),Buffer.from(row.png.split(',')[1],'base64'));
     }
     for(const e of proof.transition.emitters){
      assert.equal(e.active,1);assert.equal(e.front,proof.transition.front);
      assert.equal(e.from,wave[0].palette[e.role]);assert.equal(e.to,wave[1].palette[e.role]);
     }
     assert.equal(proof.transition.road.waveColors[1],wave[1].palette.secondary);
     assert.equal(proof.transition.road.accentWaveColors[1],wave[1].palette.highlight);
     writeFileSync(join(out,'color-wave-'+memory+'GB-transition.png'),Buffer.from(proof.transition.png.split(',')[1],'base64'));
     advanced=await page.evaluate(()=>window.__skyshiftAdvancedGpuProbe({capture:true}));
     for(const name of ['baseline','occlusion','exterior','lod','bloom78','bloom65','bloom50']){
      const row=advanced[name];assert.ok(row.work.triangles>0);
      if(row.png){writeFileSync(join(out,'advanced-gpu-'+memory+'GB-'+name+'.png'),Buffer.from(row.png.split(',')[1],'base64'));delete row.png;}
      if(name!=='baseline')assert.ok(Number.isFinite(row.difference.meanMaxChannel));
     }
     assert.equal(advanced.baseline.exterior.stars,3);assert.equal(advanced.exterior.exterior.stars,0);assert.equal(advanced.exterior.exterior.nebulae,0);
     assert.equal(advanced.bloom50.bloom.scale,.5);assert.equal(advanced.bloom65.bloom.fullResolutionBeauty,true);
     assert.ok(advanced.bloom65.bloom.bloomInputWidth<=advanced.baseline.bloom.bloomInputWidth);
     assert.ok(advanced.occlusion.work.triangles<=advanced.baseline.work.triangles);
     assert.ok(advanced.occlusion.difference.fractionOver2<=.0001,'conservative occlusion visible pixel differences: '+JSON.stringify(advanced.occlusion));
     // Capture a later-zone actual flight speed at the same approach.
     // Isolated boost signal is visual-only; no simulation tick between images.
     await page.evaluate(()=>window.__skyshiftVaultJumpCapture('approach',7));
     velocity=await page.evaluate(()=>window.__skyshiftTrueVelocityProbe());
     for(const name of ['off','high','ultra','extreme','boost','stationary','launch','bloom65','rawExtreme','actual','next']){
      const row=velocity[name];assert.ok(row.work.triangles>0);
      writeFileSync(join(out,'true-velocity-'+memory+'GB-'+name+'.png'),Buffer.from(row.png.split(',')[1],'base64'));delete row.png;
     }
     assert.equal(velocity.settings.motionBlur,'off');assert.equal(velocity.settings.adaptiveCamera,true);
     assert.equal(velocity.off.blur.renderPasses,0);
     assert.equal(velocity.launch.blur.renderPasses,0);
     assert.equal(velocity.launch.difference.fractionOver2,0,'launch-speed blur must be absent');
     assert.ok(velocity.stationary.difference.fractionOver2<=.0001,'stationary camera must not produce blur');
     assert.ok(velocity.cameraTravel>0);
     assert.ok(velocity.actual.blur.actualHistory&&velocity.next.blur.actualHistory,'actual consecutive camera history');
     assert.ok(velocity.actual.blur.depthBound&&velocity.next.blur.depthBound);
     assert.ok(velocity.high.blur.exposureGain>0);
     assert.ok(velocity.ultra.blur.exposureGain>velocity.high.blur.exposureGain);
     assert.ok(velocity.extreme.blur.exposureGain>velocity.ultra.blur.exposureGain);
     assert.ok(velocity.boost.blur.exposureGain>velocity.extreme.blur.exposureGain);
     for(const name of ['high','ultra','extreme','boost']){
      const row=velocity[name];assert.equal(row.blur.renderPasses,1);assert.equal(row.blur.samples,7);
      assert.equal(row.blur.depthBound,true);assert.ok(row.blur.passIndex<row.blur.bloomIndex);
      assert.equal(row.blur.newSceneRenders,0);
      assert.equal(row.work.calls,velocity.off.work.calls+1);
      assert.equal(row.work.triangles,velocity.off.work.triangles+1);
      assert.ok(row.difference.fractionOver2>.0001,'actual motion must alter pixels '+name);
     }
     assert.ok(velocity.rawExtreme.difference.craftCoreFractionOver2<=.001,'pre-bloom protected craft core changed');
     assert.ok(velocity.rawExtreme.difference.darkPixels>0);
     assert.ok(velocity.rawExtreme.difference.darkFractionOver2>.0001,'nonbright geometry must be affected, not just neon');
     assert.equal(velocity.bloom65.bloom.scale,.65);
     assert.equal(velocity.bloom65.blur.exposureGain,velocity.boost.blur.exposureGain);
     assert.ok(velocity.referenceFov.desktop>velocity.referenceFov.mobile);
    }
   }
   assert.equal(frames.air.grounded,false);assert.equal(frames.air.launches,1);assert.ok(frames.air.s>1136&&frames.air.s<1190.4);
   assert.equal(frames.landing.grounded,true);assert.equal(frames.landing.landings,1);assert.equal(frames.landing.rolls,1);assert.equal(frames.landing.boosts,1);assert.equal(frames.landing.falls,0);
   assert.match(await page.locator('#speed').textContent(),/^\d+ km\/h$/);
   assert.equal(await page.locator('#flight-state').isVisible(),false);
   assert.equal(await page.locator('#toast').isVisible(),false);
   assert.equal(await page.locator('#zone-banner').isVisible(),false);
   const layout=await page.evaluate(()=>{
    const hud=document.querySelector('#hud'),rect=hud.getBoundingClientRect();
    const modules=[...hud.querySelectorAll('.hud-module')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
    return {compact:hud.classList.contains('hud-compact-0292'),width:innerWidth,height:innerHeight,bottom:Math.max(...modules.map(m=>m.bottom)),modules,rectHeight:rect.height};
   });
   assert.equal(layout.compact,true);
   assert.ok(layout.bottom<=Math.max(100,layout.height*.27),JSON.stringify(layout));
   assert.ok(layout.modules.every((m,i)=>m.left>=0&&m.right<=layout.width&&(!i||m.left>=layout.modules[i-1].right-1)),JSON.stringify(layout));
   const endurance=await page.evaluate(()=>window.__skyshiftEnduranceProbe());
   assert.equal(endurance.temperatureC,null);assert.ok(endurance.samples.length>0);
   assert.ok(endurance.samples.at(-1).viewportCss.width>0);
   assert.deepEqual(errors,[],'real game errors');
   reports.push({memory,boot,probe,frames,layout,endurance,comparisons,advanced,velocity,mantaHangar,mantaRace});
  }finally{await context.close();}
 }
 writeFileSync(join(out,'vault-jump-report.json'),JSON.stringify(reports,null,2));
 console.log('SKYSHIFT_VAULT_JUMP_PUBLIC_PROOF '+JSON.stringify(reports));
}finally{await browser?.close();server?.kill('SIGTERM');}
