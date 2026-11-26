// EF07: real built WebGL matched workload diagnostics, not a graphics change.
// Existing perf presets are diagnostic isolation only. No production presets altered.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

const profiles=[8,4],stations=[110,1840],presets=['baseline','no-bloom','no-smaa','low-dpr'];
const round=x=>Math.round(x*1000)/1000;
function summarize(intervals){
 const sorted=[...intervals].sort((a,b)=>a-b);
 const quantile=q=>round(sorted[Math.max(0,Math.ceil(q*sorted.length)-1)]);
 return {samples:sorted.length,p50Ms:quantile(.5),p95Ms:quantile(.95),p99Ms:quantile(.99),
  meanMs:round(sorted.reduce((a,b)=>a+b,0)/sorted.length),maxMs:round(sorted.at(-1)),
  over16_67:sorted.filter(x=>x>16.67).length,over33_34:sorted.filter(x=>x>33.34).length,
  over250:sorted.filter(x=>x>250).length};
}
async function rawFrames(page,count){
 // This independently retains every actual RAF interval, including >250 ms
 // intervals excluded from the legacy profiler. Do not equate RAF with GPU time.
 const intervals=await page.evaluate(n=>new Promise(resolve=>{
  let last=null;const values=[];
  function frame(now){
   if(last!==null)values.push(now-last);
   last=now;
   if(values.length===n)resolve(values);else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }),count);
 assert.equal(intervals.length,count);
 assert.ok(intervals.every(v=>Number.isFinite(v)&&v>0),'valid actual frame intervals');
 return {intervals:intervals.map(round),...summarize(intervals)};
}
export async function captureEF07Profile({browser,out}){
 const report={renderer:'Chromium/SwiftShader; emulated navigator.deviceMemory, not physical hardware',
  note:'Controlled held poses isolate rendering; unheld race samples include actual physics. Diagnostic presets are not proposed visual changes. Small samples and software GPU are screening only, no mobile FPS or thermal claim.',
  rows:[],comparisons:[]};
 const save=()=>writeFileSync(join(out,'ef07-profile-report.json'),JSON.stringify(report,null,2)+'\n');
 try{
  for(const memory of profiles){
   // Reverse diagnostic order across profiles; baseline measured before and after
   // the variants within each profile, to expose runner drift.
   const order=memory===8?['baseline',...presets.slice(1),'native-frame','baseline']:['baseline','native-frame',...presets.slice(1).reverse(),'baseline'];
   for(let index=0;index<order.length;index++){
    const variant=order[index],preset=variant==='native-frame'?'baseline':variant,context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
    try{
     await context.addInitScript(m=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m}),memory);
     const page=await context.newPage(),errors=[];
     page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
     page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|context lost|startup failed/i.test(m.text()))errors.push(m.text());});
     const url='http://127.0.0.1:8923/Hajjen/skyshift/?track=vault&v=0.28.9.7&startupAudit=1&trackRepairSmoke=1&perf=1&perfPreset='+preset+(variant==='native-frame'?(memory===8?'&ef07NativeFrame=1':''):'&ef07NativeFrame=0')+'&ef07GeometryDigest=1';
     await page.goto(url,{waitUntil:'domcontentloaded',timeout:80000});
     await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
     const startup=await page.evaluate(()=>window.__skyshiftStartupAudit());
     assert.equal(startup.phase,'ready');assert.equal(startup.scene.sharedTunnelModules,10);assert.ok(startup.scene.pmremActive);
     await page.locator('#start-btn').click();
     await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:40000});
     const actual=await page.evaluate(()=>window.__skyshiftPerfProbe());
     assert.equal(actual.settings.preset,preset);assert.equal(actual.pipeline.fixedQuality,true);
     assert.equal(actual.pipeline.bloom,preset!=='no-bloom');assert.equal(actual.pipeline.smaa,preset!=='no-smaa');
     const digest=['baseline','native-frame'].includes(variant)?await page.evaluate(()=>window.__skyshiftEF07GeometryDigest()):null;
     if(digest)assert.ok(digest.arrays>0&&digest.totalBytes>0);
     if(variant==='native-frame'){
      assert.ok(startup.nativeFrameExperiment?.calls>0,'candidate actually sampled');
      assert.equal(startup.nativeFrameExperiment.resident,0);assert.equal(startup.nativeFrameExperiment.active,false);
      assert.deepEqual(digest,report.rows.find(r=>r.memory===memory&&r.variant==='baseline').digest,'actual mounted tunnel attribute/index bytes unchanged');
     }else assert.equal(startup.nativeFrameExperiment,null);
     const row={memory,index,preset,variant,digest,nativeFrame:startup.nativeFrameExperiment,startup:{bootMs:startup.browserBootMs,durations:startup.durations,stamps:startup.stamps},
      pipeline:actual.pipeline,flight:[],held:[]};
     report.rows.push(row);
     // A short real racing window, without the teleport/hold hook.
     await rawFrames(page,3);
     row.flight.push(await rawFrames(page,12));
     const race=await page.evaluate(()=>window.__skyshiftPerfProbe());
     assert.equal(race.physicsHz,120);assert.equal(race.state,'playing');
     row.raceProfiler={summary:race.summary,gpu:race.gpu};
     for(const station of stations){
      const pose=await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),station);
      assert.equal(pose.track,'vault');assert.ok(pose.withinPhysicalRoll);
      await rawFrames(page,3);
      const windows=[await rawFrames(page,8),await rawFrames(page,8)];
      const current=await page.evaluate(()=>({probe:window.__skyshiftPerfProbe(),startup:window.__skyshiftStartupAudit(),work:window.__skyshiftEF07RenderWork()}));
      const surface=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2');return {width:c.width,height:c.height,lost:gl.isContextLost()};});
      assert.ok(!surface.lost&&surface.width>100&&surface.height>100);
      row.held.push({station,windows,all:summarize(windows.flatMap(w=>w.intervals)),
       renderer:current.startup.renderer,renderWork:current.work,gpu:current.probe.gpu,profilerCumulative:current.probe.summary,surface});
     }
     assert.deepEqual(errors,[],memory+'GB '+preset+' runtime errors');
     console.log('SKYSHIFT_EF07_PROFILE '+JSON.stringify({memory,index,preset,variant,startup:row.startup,digest:row.digest,nativeFrame:row.nativeFrame,flight:row.flight[0],held:row.held.map(x=>({station:x.station,all:x.all,renderer:x.renderer,renderWork:x.renderWork,gpu:x.gpu}))}));
     save();
    }finally{await context.close();}
   }
   const rows=report.rows.filter(x=>x.memory===memory),first=rows[0],last=rows.at(-1);
   for(const station of stations){
    const metric=r=>r.held.find(x=>x.station===station).all.p95Ms;
    const a=metric(first),b=metric(last),reference=(a+b)/2;
    report.comparisons.push({memory,station,baselineP95Ms:[a,b],driftMs:round(Math.abs(a-b)),variants:rows.slice(1,-1).map(r=>({preset:r.variant,p95Ms:metric(r),deltaVsBracketMeanMs:round(metric(r)-reference)}))});
   }
   const native=rows.find(x=>x.variant==='native-frame');
   assert.deepEqual(last.digest,first.digest,'baseline tunnel repeat identity');
   const times=[first.startup.durations.sharedTunnelMs,last.startup.durations.sharedTunnelMs];
   const candidate=native.startup.durations.sharedTunnelMs;
   const startupComparison={memory,baselineTunnelMs:times,candidateTunnelMs:candidate,baselineDriftMs:round(Math.abs(times[0]-times[1])),deltaVsBracketMeanMs:round(candidate-(times[0]+times[1])/2),sameGeometry:true,nativeFrame:native.nativeFrame};
   report.comparisons.push(startupComparison);console.log('SKYSHIFT_EF07_NATIVE_STARTUP '+JSON.stringify(startupComparison));
   if(memory===4){
    const repeats=[];
    for(const variant of ['native-frame','baseline','baseline','native-frame']){
     const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
     try{
      await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>4}));
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
      // Candidate exercises ordinary player startup, without perf or diagnostic opt-in.
      const url='http://127.0.0.1:8923/Hajjen/skyshift/?track=vault&v=0.28.9.7&startupAudit=1'+(variant==='baseline'?'&perf=1&ef07NativeFrame=0':'');
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:80000});
      await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
      const audit=await page.evaluate(()=>window.__skyshiftStartupAudit());
      assert.equal(audit.phase,'ready');assert.ok(audit.scene.pmremActive);assert.equal(audit.scene.sharedTunnelModules,10);
      if(variant==='native-frame'){assert.ok(audit.nativeFrameExperiment?.calls>0);assert.equal(audit.nativeFrameExperiment.resident,0);assert.equal(audit.nativeFrameExperiment.active,false);}else assert.equal(audit.nativeFrameExperiment,null);
      assert.deepEqual(errors,[]);
      repeats.push({variant,bootMs:audit.browserBootMs,tunnelMs:audit.durations.sharedTunnelMs,nativeFrame:audit.nativeFrameExperiment});
     }finally{await context.close();}
    }
    const controls=repeats.filter(r=>r.variant==='baseline').map(r=>r.tunnelMs),candidates=repeats.filter(r=>r.variant==='native-frame').map(r=>r.tunnelMs);
    const result={memory,repeatBoots:repeats,allControlTunnelMs:[...times,...controls],allCandidateTunnelMs:[candidate,...candidates],worstCandidateMs:Math.max(candidate,...candidates),bestControlMs:Math.min(...times,...controls)};
    report.comparisons.push(result);save();console.log('SKYSHIFT_EF07_NATIVE_REPEAT '+JSON.stringify(result));
    assert.ok(result.worstCandidateMs<result.bestControlMs*.85,'4GB default must retain clear repeated tunnel construction benefit');
   }
   save();
  }
 }finally{save();}
 console.log('SKYSHIFT_EF07_COMPARISONS '+JSON.stringify(report.comparisons));
}
