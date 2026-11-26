// EF05: immutable before/after real-game evidence, not a rendered mockup.
// Runs inside the existing required build job. No production module imports this file.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

export async function captureEF05Baseline({browser,repo,out}){
 const baseline='cf88461767ecb51749a8404c89c2db509f5efac3';
 const git=(args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','inherit']}).trim();
 const scratch=mkdtempSync(join(tmpdir(),'skyshift-ef05-'));
 const checkout=join(scratch,'baseline');
 let server,added=false;
 const report={baseline,candidate:git(['rev-parse','HEAD']),renderer:'Chromium/SwiftShader; emulated deviceMemory, not physical hardware',pairs:[]};
 try{
  git(['fetch','--no-tags','--depth=1','origin',baseline]);
  git(['worktree','add','--detach',checkout,baseline]);added=true;
  assert.equal(git(['-C',checkout,'rev-parse','HEAD']),baseline);
  server=spawn('python3',['-m','http.server','8925','--bind','127.0.0.1','--directory',checkout],{stdio:'ignore'});
  let ready=false;
  for(let i=0;i<30;i++){
   try{if((await fetch('http://127.0.0.1:8925/skyshift/index.html')).ok){ready=true;break;}}catch{}
   await sleep(250);
  }
  assert.ok(ready,'immutable baseline HTTP server ready');
  async function capture(track,memory,mode){
   const context=await browser.newContext({viewport:{width:1280,height:720}});
   try{
    await context.addInitScript(m=>Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>m}),memory);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('crash',()=>errors.push('renderer crash'));
    page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|context lost|startup failed/i.test(m.text()))errors.push(m.text());});
    const version=track==='vault'?'0.28.9.7':'0.26.5';
    const port=mode==='before'?8925:8923;
    const query='?track='+track+'&v='+version+'&startupAudit=1&trackRepairSmoke=1';
    await page.goto('http://127.0.0.1:'+port+'/skyshift/'+query,{waitUntil:'domcontentloaded',timeout:80000});
    await page.waitForFunction(()=>['ready','failed'].includes(window.__skyshiftBoot?.phase),null,{timeout:220000});
    const boot=await page.evaluate(()=>({phase:window.__skyshiftBoot.phase,scene:window.__skyshiftStartupAudit?.()?.scene}));
    assert.equal(boot.phase,'ready',JSON.stringify({track,memory,mode,boot,errors}).slice(0,4000));
    if(track==='vault'){
     assert.equal(boot.scene?.sharedTunnelModules,10,'actual shared renderer mounted');
     assert.equal(boot.scene?.pmremActive,true,'actual PMREM active');
     if(mode==='after')assert.equal(boot.scene?.legacyRoadResponseMeshes,0);
    }
    await page.locator('#start-btn').click();
    await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==='playing',null,{timeout:40000});
    const frames=[];
    for(const station of track==='vault'?[110,1840]:[76,165]){
     const pose=await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),station);
     assert.equal(pose.track,track);
     assert.equal(pose.finishS,3400);
     assert.ok(pose.withinPhysicalRoll);
     // The protected QA teleport freezes simulation; allow the live render loop to present.
     await page.waitForTimeout(900);
     const surface=await page.evaluate(()=>{
      const c=document.querySelector('canvas');
      return {width:c.width,height:c.height,lost:c.getContext('webgl2')?.isContextLost()??true};
     });
     assert.ok(!surface.lost&&surface.width>100&&surface.height>100);
     const label='ef05-'+track+'-'+memory+'GB-'+station+'-'+mode;
     const pixels=await page.screenshot({path:join(out,label+'.png'),timeout:60000});
     // Capture temporal control too: pixel differences are evidence, not a
     // requirement for bit-identical animation or a substitute for visual review.
     await page.waitForTimeout(300);
     const control=await page.screenshot({path:join(out,label+'-control.png'),timeout:60000});
     frames.push({station,pose,surface,pixels,control,label});
    }
    assert.deepEqual(errors,[],track+' '+memory+' '+mode+' runtime errors');
    return frames;
   }finally{await context.close();}
  }
  const metricsContext=await browser.newContext();
  try{
   const metricsPage=await metricsContext.newPage();
   const compare=async(a,b)=>metricsPage.evaluate(async ([a,b])=>{
    async function read(s){
     const image=new Image();image.src='data:image/png;base64,'+s;await image.decode();
     const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
     const c=canvas.getContext('2d');c.drawImage(image,0,0);
     return {width:canvas.width,height:canvas.height,data:c.getImageData(0,0,canvas.width,canvas.height).data};
    }
    const A=await read(a),B=await read(b);
    if(A.width!==B.width||A.height!==B.height)throw Error('Screenshot dimensions changed');
    const roi={roof:[.38,.12,.62,.27],leftWall:[.08,.25,.30,.65],rightWall:[.70,.25,.92,.65],road:[.27,.60,.73,.88]};
    const luma=(d,i)=>.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
    const sample=([x0,y0,x1,y1])=>{
     let n=0,delta=0,changed=0,la=0,lb=0,litA=0,litB=0,whiteA=0,whiteB=0;
     for(let y=Math.floor(y0*A.height);y<y1*A.height;y+=3)for(let x=Math.floor(x0*A.width);x<x1*A.width;x+=3){
      const i=(y*A.width+x)*4,l0=luma(A.data,i),l1=luma(B.data,i);
      const d=Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2]);
      n++;delta+=d/3;la+=l0;lb+=l1;changed+=d>24?1:0;litA+=l0>20?1:0;litB+=l1>20?1:0;
      whiteA+=Math.min(A.data[i],A.data[i+1],A.data[i+2])>239?1:0;
      whiteB+=Math.min(B.data[i],B.data[i+1],B.data[i+2])>239?1:0;
     }
     return {samples:n,meanRgbError:delta/n,strongChangeFraction:changed/n,meanBefore:la/n,meanAfter:lb/n,litBefore:litA/n,litAfter:litB/n,whiteBefore:whiteA/n,whiteAfter:whiteB/n};
    };
    return Object.fromEntries(Object.entries(roi).map(([name,rect])=>[name,sample(rect)]));
   },[a.toString('base64'),b.toString('base64')]);
   for(const track of ['vault','skyline'])for(const memory of [8,4]){
    const before=await capture(track,memory,'before'),after=await capture(track,memory,'after');
    for(let i=0;i<before.length;i++){
     const a=before[i],b=after[i];
     assert.deepEqual(b.pose,a.pose,'same legal route and physical camera probe');
     assert.deepEqual(b.surface,a.surface,'same render resolution');
     const areas=await compare(a.pixels,b.pixels);
     const temporalBefore=await compare(a.pixels,a.control),temporalAfter=await compare(b.pixels,b.control);
     const pair={track,memory,station:a.station,pose:a.pose,surface:a.surface,before:a.label+'.png',after:b.label+'.png',areas,temporalBefore,temporalAfter};
     report.pairs.push(pair);
     writeFileSync(join(out,'ef05-baseline-comparison.json'),JSON.stringify(report,null,2)+'\n');
     // Reject a black/white scene catastrophe; subtler changes remain for
     // actual screenshot/ROI review, not silently approved by a loose gate.
     const lit=Object.values(areas).reduce((n,x)=>n+x.litBefore,0);
     const now=Object.values(areas).reduce((n,x)=>n+x.litAfter,0);
     assert.ok(lit>0.05&&now>0.05,'nonblank real game '+JSON.stringify(pair));
     assert.ok(now>=lit*.35,'catastrophic loss of lit surfaces '+JSON.stringify(pair));
     for(const area of Object.values(areas))assert.ok(area.whiteAfter<Math.max(.65,area.whiteBefore+.25),'whiteout '+JSON.stringify(pair));
    }
   }
  }finally{await metricsContext.close();}
  assert.equal(report.pairs.length,8);
  console.log('SKYSHIFT_EF05_BASELINE '+JSON.stringify(report));
 }finally{
  server?.kill('SIGTERM');
  if(added)git(['worktree','remove','--force',checkout]);
  rmSync(scratch,{recursive:true,force:true});
 }
}
