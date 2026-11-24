// EF01C: external diagnostic WebGL shader-call wall time and repeated run resource counters.
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';
const [source,out]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const binary=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(existsSync);
if(!binary)throw Error('Chrome not found');
const origin='http://127.0.0.1:8919';
const server=spawn('python3',['-m','http.server','8919','--bind','127.0.0.1'],{cwd:resolve(source),stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(origin+'/skyshift/')).ok)break;}catch{}if(i===49)throw Error('server not ready');await sleep(100);}
 browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],requests=new Map();
 page.on('crash',()=>errors.push('renderer crash'));
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader error|INVALID_OPERATION|startup failed|context lost/i.test(m.text()))errors.push(m.text().slice(0,500));});
 page.on('response',r=>requests.set(r.url().replace(origin,'<local>'),{status:r.status(),type:r.request().resourceType()}));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});
  const counters={compileShader:{count:0,ms:0},linkProgram:{count:0,ms:0},getShaderParameter:{count:0,ms:0},getProgramParameter:{count:0,ms:0}};
  window.__ef01ShaderCalls=counters;
  window.__ef01ContextLoss=0;
  document.addEventListener('webglcontextlost',()=>window.__ef01ContextLoss++,true);
  for(const proto of [window.WebGLRenderingContext?.prototype,window.WebGL2RenderingContext?.prototype]){
   if(!proto)continue;
   for(const name of Object.keys(counters)){
    if(!Object.hasOwn(proto,name))continue;
    const original=proto[name];
    if(typeof original!=='function')continue;
    proto[name]=function(...args){
     const t=performance.now();
     try{return original.apply(this,args);}
     finally{counters[name].count++;counters[name].ms+=performance.now()-t;}
    };
   }
  }
 });
 await page.goto(origin+'/skyshift/?track=vault&v=0.28.9.7&startupAudit=1&trackRepairSmoke=1',{waitUntil:'domcontentloaded',timeout:80000});
 await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
 const snapshots=[];
 async function snap(label){
  const data=await page.evaluate(()=>({boot:window.__skyshiftBoot,resources:window.__skyshiftStartupAudit?.(),shaderCalls:window.__ef01ShaderCalls,contextLoss:window.__ef01ContextLoss,mode:window.__skyshiftPerfProbe?.().state}));
  if(data.boot?.phase!=='ready'||data.contextLoss||errors.length)throw Error('invalid runtime '+JSON.stringify({label,errors,data}));
  snapshots.push({label,...data});
  console.log('SKYSHIFT_EF01_LIFECYCLE '+JSON.stringify({label,mode:data.mode,renderer:data.resources?.renderer,heapMB:data.resources?.jsHeapMB,shaderCalls:data.shaderCalls,contextLoss:data.contextLoss}));
 }
 await snap('menu');
 for(let i=1;i<=3;i++){
  await page.locator('#start-btn').click({timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:60000});
  await page.evaluate(()=>window.__skyshiftTrackRepairTeleport(110));
  await page.waitForTimeout(2000);
  await snap('run-'+i);
  await page.locator('#pause-btn').click({timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='paused',null,{timeout:60000});
  await page.locator('#pause-menu-btn').click({timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='menu',null,{timeout:60000});
  await snap('returned-'+i);
 }
 writeFileSync(resolve(out,'lifecycle.json'),JSON.stringify({snapshots,requests:[...requests],errors},null,2));
 console.log('SKYSHIFT_EF01_REQUESTS '+JSON.stringify([...requests].map(([url,details])=>({url,...details}))));
}finally{await browser?.close();server.kill('SIGTERM');}
