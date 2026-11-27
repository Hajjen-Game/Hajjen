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
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  try{
   await context.addInitScript(m=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m}),memory);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
   page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|context lost|startup failed/i.test(m.text()))errors.push(m.text());});
   const url=new URL(live||'http://127.0.0.1:8926/skyshift/');
   url.search=memory===8?'track=vault&v=0.28.9.11&vaultJump=1':'track=vault&v=0.29.0';
   url.searchParams.set('vaultJumpSmoke','1');url.searchParams.set('release','0290-public-proof-'+Date.now());
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
   assert.equal(await page.evaluate(()=>window.__skyshiftBoot.phase),'ready',JSON.stringify(await page.evaluate(()=>window.__skyshiftBoot)));
   const probe=await page.evaluate(()=>window.__skyshiftVaultJumpProbe());
   assert.equal(probe.active,true,JSON.stringify(probe));assert.equal(probe.version,'0.29.0');assert.equal(new URLSearchParams(probe.query).get('v'),'0.29.0');
   assert.equal(probe.mounted,true);assert.equal(probe.pmrem,true);assert.equal(probe.gaps.length,1);assert.equal(probe.gaps[0].id,'vault-mega-jump');
   assert.equal(probe.inside,0);assert.ok(probe.before>0&&probe.after>0);assert.equal(probe.roadBefore,true);assert.equal(probe.roadGap,false);assert.equal(probe.roadAfter,true);
   assert.match(await page.locator('#menu-track-name').textContent(),/MEGA JUMP.*0\.29\.0/);
   await page.locator('#start-btn').click();
   await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:40000});
   const frames={};
   for(const phase of ['approach','air','landing']){
    const result=await page.evaluate(p=>window.__skyshiftVaultJumpCapture(p),phase);frames[phase]=result;
    await page.waitForTimeout(1000);
    await page.screenshot({path:join(out,'vault-jump-'+memory+'GB-'+phase+'.png'),timeout:60000});
   }
   assert.equal(frames.air.grounded,false);assert.equal(frames.air.launches,1);assert.ok(frames.air.s>1136&&frames.air.s<1190.4);
   assert.equal(frames.landing.grounded,true);assert.equal(frames.landing.landings,1);assert.equal(frames.landing.rolls,1);assert.equal(frames.landing.boosts,1);assert.equal(frames.landing.falls,0);
   assert.deepEqual(errors,[],'real game errors');
   reports.push({memory,probe,frames});
  }finally{await context.close();}
 }
 writeFileSync(join(out,'vault-jump-report.json'),JSON.stringify(reports,null,2));
 console.log('SKYSHIFT_VAULT_JUMP_PUBLIC_PROOF '+JSON.stringify(reports));
}finally{await browser?.close();server?.kill('SIGTERM');}
