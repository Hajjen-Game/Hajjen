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
 writeFileSync(join(out,'browser-report.json'),JSON.stringify(reports,null,2)+'\n');
 console.log('SKYSHIFT_EF03_BROWSER '+JSON.stringify(reports.map(r=>({mode:r.mode,memory:r.memory,phases:r.phases.map(p=>({...p.timing,requests:undefined}))}))));
}finally{await browser?.close();server.kill('SIGTERM');}
