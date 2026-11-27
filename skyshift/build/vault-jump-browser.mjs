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
   url.search=memory===8?'track=vault&v=0.29.4&vaultJump=1':'track=vault&v=0.29.4';
   url.searchParams.set('vaultJumpSmoke','1');url.searchParams.set('release','0290-public-proof-'+Date.now());
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
   assert.equal(await page.evaluate(()=>window.__skyshiftBoot.phase),'ready',JSON.stringify(await page.evaluate(()=>window.__skyshiftBoot)));
   const probe=await page.evaluate(()=>window.__skyshiftVaultJumpProbe());
   assert.equal(probe.active,true,JSON.stringify(probe));assert.equal(probe.version,'0.29.4');assert.equal(new URLSearchParams(probe.query).get('v'),'0.29.4');
   assert.equal(probe.polish,true);assert.equal(probe.rampRise,7.5);
   assert.equal(probe.mounted,true);assert.equal(probe.pmrem,true);assert.equal(probe.gaps.length,1);assert.equal(probe.gaps[0].id,'vault-mega-jump');
   assert.equal(probe.inside,0);assert.ok(probe.before>0&&probe.after>0);assert.equal(probe.roadBefore,true);assert.equal(probe.roadGap,false);assert.equal(probe.roadAfter,true);
   assert.match(await page.locator('#menu-track-name').textContent(),/MEGA JUMP.*0\.29\.4/);
   await page.locator('#menu-settings-btn').click();
   await page.locator('#frame-cap').selectOption('90');
   await page.locator('#graphics-quality').selectOption('fixed');
   await page.locator('#extended-diagnostics').check();
   await page.locator('#bloom-resolution').selectOption('0.78');
   await page.locator('#exterior-backdrop').uncheck();
   assert.equal(await page.locator('#motion-blur').inputValue(),'high');
   assert.equal(await page.locator('#adaptive-velocity-camera').isChecked(),true);
   await page.locator('#motion-blur').selectOption('off');
   await page.locator('#adaptive-velocity-camera').uncheck();
   await page.locator('#adaptive-velocity-camera').check();
   await page.locator('#settings-back-btn').click();
   await page.locator('#start-btn').click();
   await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:40000});
   const frames={},comparisons=[];let advanced=null,velocity=null;
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
     velocity=await page.evaluate(()=>window.__skyshiftVelocityExperienceProbe());
     for(const name of ['off','high','boost','bloom65']){
      const row=velocity[name];assert.ok(row.work.triangles>0);
      writeFileSync(join(out,'velocity-'+memory+'GB-'+name+'.png'),Buffer.from(row.png.split(',')[1],'base64'));delete row.png;
     }
     assert.equal(velocity.settings.motionBlur,'off');assert.equal(velocity.settings.adaptiveCamera,true);
     assert.equal(velocity.off.blur.renderPasses,0);assert.equal(velocity.high.blur.renderPasses,1);
     assert.equal(velocity.boost.blur.renderPasses,1);
     assert.ok(velocity.boost.blur.radiusFractionOfHeight>velocity.high.blur.radiusFractionOfHeight);
     assert.ok(velocity.high.difference.fractionOver2>.0001,'blur must visibly change peripheral pixels');
     assert.ok(velocity.high.difference.centerFractionOver2<=.001,'protected central pixels changed');
     assert.equal(velocity.bloom65.bloom.scale,.65);
     assert.equal(velocity.bloom65.blur.radiusFractionOfHeight,velocity.boost.blur.radiusFractionOfHeight);
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
   reports.push({memory,probe,frames,layout,endurance,comparisons,advanced,velocity});
  }finally{await context.close();}
 }
 writeFileSync(join(out,'vault-jump-report.json'),JSON.stringify(reports,null,2));
 console.log('SKYSHIFT_VAULT_JUMP_PUBLIC_PROOF '+JSON.stringify(reports));
}finally{await browser?.close();server?.kill('SIGTERM');}
