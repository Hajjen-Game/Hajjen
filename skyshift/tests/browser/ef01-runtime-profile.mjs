// EF01B: read-only browser benchmark on the pinned pre-refactor runtime.
// Fixed-quality diagnostic settings, real Chromium WebGL via software SwiftShader.
// No hardware FPS claim; no production JS injection beyond measurement/QA hooks.
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';
const [source,out,track,memoryArg]=process.argv.slice(2);
const memory=Number(memoryArg);
if(!source||!out||!['vault','skyline','aurora'].includes(track)||![4,8].includes(memory))throw Error('Usage: ef01-runtime-profile.mjs <pinned checkout> <out> <track> <4|8>');
mkdirSync(out,{recursive:true});
const binary=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(existsSync);
if(!binary)throw Error('Chromium not installed');
const port=8918,server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:resolve(source),stdio:'ignore'});
const origin='http://127.0.0.1:'+port;
let browser;
const results=[],errors=[];
const quantiles=values=>{
 const a=values.filter(Number.isFinite).sort((a,b)=>a-b);
 const at=p=>a.length?Math.round(a[Math.ceil(p*a.length)-1]*100)/100:null;
 return {samples:a.length,p50:at(.5),p95:at(.95),p99:at(.99),max:a.at(-1)??null};
};
try{
 for(let n=0;n<50;n++){try{if((await fetch(origin+'/skyshift/')).ok)break;}catch{}if(n===49)throw Error('server not ready');await sleep(100);}
 browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info']});
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 const page=await context.newPage();
 page.on('crash',()=>errors.push('renderer crash'));
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader error|INVALID_OPERATION|startup failed|context lost/i.test(m.text()))errors.push(m.text().slice(0,500));});
 await page.addInitScript(m=>{
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m});
  window.__ef01ContextLoss=0;
  document.addEventListener('webglcontextlost',()=>window.__ef01ContextLoss++,true);
  performance.setResourceTimingBufferSize(5000);
 },memory);
 const cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');
 await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
 let network=new Map();
 cdp.on('Network.responseReceived',e=>{
  const response=e.response;
  network.set(e.requestId,{url:response.url,type:e.type,status:response.status,cache:!!(response.fromDiskCache||response.fromServiceWorker||response.fromPrefetchCache),bytes:null});
 });
 cdp.on('Network.requestServedFromCache',e=>{const row=network.get(e.requestId);if(row)row.cache=true;});
 cdp.on('Network.loadingFinished',e=>{const row=network.get(e.requestId);if(row)row.bytes=e.encodedDataLength;});
 const version=track==='vault'?'0.28.9.7':'0.26.5'; // actual menu version paths, not historical comparison override
 const url=origin+'/skyshift/?track='+track+'&v='+version+'&perf=1&perfPreset=baseline&startupAudit=1&trackRepairSmoke=1';
 for(const phase of ['cold','warm']){
  network=new Map();
  const nav=Date.now();
  if(phase==='cold')await page.goto(url,{waitUntil:'domcontentloaded',timeout:80000});
  else await page.reload({waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
  const boot=await page.evaluate(()=>({boot:window.__skyshiftBoot,scene:window.__skyshiftStartupAudit?.(),navigation:performance.getEntriesByType('navigation')[0]?.toJSON()}));
  if(boot.boot?.phase!=='ready'||!boot.scene||boot.scene.track!==track)throw Error('wrong or failed boot '+JSON.stringify(boot));
  const bootWallMs=Date.now()-nav;
  const startupNetwork=[...network.values()].map(r=>({...r,url:r.url.replace(origin,'<local>')}));
  const clickStart=Date.now();
  await page.locator('#start-btn').click({timeout:30000});
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:35000});
  const playingWallMs=Date.now()-clickStart;
  // Two RAF callbacks after playing is only a first-frame proxy; not presentation/GPU completion.
  const firstRafProxyMs=await page.evaluate(()=>new Promise(ok=>{
   const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>ok(performance.now()-start)));
  }));
  const pose=track==='vault'?110:120;
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),pose);
  // Fixed sampling window at a known pose/start state; raw RAF includes >250ms stalls
  // which the existing in-engine profiler intentionally excludes.
  const sampled=await page.evaluate(async()=>{
   const before=window.__skyshiftStartupAudit?.(),frames=[];
   await new Promise(done=>{
    let last=performance.now(),start=last;
    function frame(now){frames.push(now-last);last=now;if(now-start>=12000)done();else requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
   });
   return {frames,before,after:window.__skyshiftStartupAudit?.(),perf:window.__skyshiftPerfProbe?.(),contextLoss:window.__ef01ContextLoss,canvas:{width:document.querySelector('canvas')?.width,height:document.querySelector('canvas')?.height},resourceTiming:performance.getEntriesByType('resource').map(r=>({name:r.name,initiatorType:r.initiatorType,duration:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize}))};
  });
  if(errors.length||sampled.contextLoss||sampled.perf?.state!=='playing'||!sampled.canvas.width||!sampled.frames.length)throw Error('runtime failed '+JSON.stringify({errors,contextLoss:sampled.contextLoss,state:sampled.perf?.state,canvas:sampled.canvas}));
  // Separate screenshot from timed sample. Capture the same QA pose in each run.
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),pose);
  await page.waitForTimeout(300);
  await page.screenshot({path:resolve(out,track+'-'+memory+'gb-'+phase+'.png'),timeout:60000});
  const networkBytes=startupNetwork.filter(r=>r.bytes!==null).reduce((s,r)=>s+r.bytes,0);
  const report={track,memory,phase,version,renderer:'Chromium SwiftShader (software)',browserVersion:browser.version(),viewport:[1280,720],perfPreset:sampled.perf.settings,bootWallMs,bootMs:boot.boot.readyAfterMs,playingWallMs,firstRafProxyMs,pose,boot,network:{count:startupNetwork.length,completed:startupNetwork.filter(r=>r.bytes!==null).length,cacheFlagged:startupNetwork.filter(r=>r.cache).length,encodedDataLengthBytes:networkBytes,requests:startupNetwork},rawRaf:quantiles(sampled.frames),rawFramesOver250:sampled.frames.filter(x=>x>250).length,engine:sampled.perf.summary,gpu:sampled.perf.gpu,quality:sampled.perf.pipeline,resources:{before:sampled.before,after:sampled.after},resourceTiming:sampled.resourceTiming,contextLoss:sampled.contextLoss,canvas:sampled.canvas};
  results.push(report);
  writeFileSync(resolve(out,'runtime.json'),JSON.stringify(results,null,2)+'\n');
  console.log('SKYSHIFT_EF01_RUNTIME '+JSON.stringify({track,memory,phase,version,bootMs:report.bootMs,bootWallMs,playingWallMs,firstRafProxyMs,network:{count:report.network.count,completed:report.network.completed,cacheFlagged:report.network.cacheFlagged,bytes:networkBytes},rawRaf:report.rawRaf,rawFramesOver250:report.rawFramesOver250,engineFrames:report.engine?.frames,breakdown:report.engine?.breakdown,gpu:report.gpu,quality:report.quality,resources:{before:report.resources.before?.renderer,after:report.resources.after?.renderer,heapBeforeMB:report.resources.before?.jsHeapMB,heapAfterMB:report.resources.after?.jsHeapMB},canvas:report.canvas}));
 }
}finally{await browser?.close();server.kill('SIGTERM');}
