/* Japanese Harmony · Hanabi Pixi Preview 1.0
 * Opt-in GPU particle layer, adapted from arena3v3's pinned PixiJS 8.21.0
 * + WebGL-first initialization and safe Canvas/WAAPI fallback.
 * Never reads/writes gameplay, seeds, boards, rewards or saved runs.
 */
(function(root){
"use strict";
const MODULE_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const STORAGE_KEY="japanese-harmony-hanabi-vfx-preview-v1";
const TIMING=Object.freeze({charge:210,ascent:610,burst:820,sideDelay:245,sideFlight:420,tail:1000,total:2030});
const COLORS=Object.freeze([0xffdb91,0xffa8d4,0xffae74,0xdcc1ff,0xd8f8ff]);
let choice="classic",modulePromise=null,graphicsPromise=null,app=null,canvas=null,pixi=null,texture=null;
let failed=false,lastReason=null,playing=false,shown=false;
let metrics={renderer:"classic",frames:0,elapsedMs:0,estimatedFps:0,maxFrameGapMs:0};
try{
 const params=new URLSearchParams(root.location?.search||"");
 const url=params.get("hanabiVfx");
 const saved=root.localStorage?.getItem(STORAGE_KEY);
 choice=(url==="pixi"||url==="classic"?url:saved)==="pixi"?"pixi":"classic";
}catch{}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*t;
function status(){return Object.freeze({mode:choice,ready:!!app&&!failed,failed,reason:lastReason,...metrics});}
function mode(){return choice;}
function setMode(value){
 choice=value==="pixi"?"pixi":"classic";
 try{root.localStorage?.setItem(STORAGE_KEY,choice);}catch{}
 if(choice==="pixi")void prepare();
 return choice;
}
function isEnabled(){return choice==="pixi"&&!failed;}
async function prepare(){
 if(!isEnabled())return false;
 if(!modulePromise)modulePromise=import(MODULE_URL).then(lib=>{
  pixi=lib;return lib;
 }).catch(error=>{
  failed=true;lastReason="PixiJS could not load";console.warn("[Hanabi Pixi Preview] Dynamic import failed; classic VFX retained.",error);
  return null;
 });
 return !!(await modulePromise);
}
function viewRect(){
 return {width:Math.max(1,root.innerWidth||390),height:Math.max(1,root.innerHeight||844)};
}
function textureFor(lib){
 const cn=document.createElement("canvas");cn.width=64;cn.height=64;
 const ctx=cn.getContext("2d");if(!ctx)throw new Error("Canvas gradient unavailable");
 const g=ctx.createRadialGradient(32,32,0,32,32,31);
 g.addColorStop(0,"rgba(255,255,255,1)");
 g.addColorStop(.16,"rgba(255,255,255,.96)");
 g.addColorStop(.38,"rgba(255,255,255,.67)");
 g.addColorStop(.70,"rgba(255,255,255,.16)");
 g.addColorStop(1,"rgba(255,255,255,0)");
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 return lib.Texture.from(cn);
}
async function ensureGraphics(){
 if(app&&!failed)return true;
 if(graphicsPromise)return graphicsPromise;
 graphicsPromise=(async()=>{
  const lib=await prepare();if(!lib)return false;
  const rect=viewRect();
  const element=document.createElement("canvas");
  element.className="jh-hanabi-pixi-preview";
  element.setAttribute("aria-hidden","true");
  Object.assign(element.style,{position:"fixed",inset:"0",width:"100vw",height:"100dvh",
   zIndex:"39",pointerEvents:"none",visibility:"hidden",background:"transparent"});
  const instance=new lib.Application();
  document.body.append(element);
  try{
   await instance.init({canvas:element,width:rect.width,height:rect.height,
    backgroundAlpha:0,antialias:false,autoStart:false,preference:"webgl",
    resolution:Math.min(2,Math.max(1,Number(root.devicePixelRatio)||1))});
   instance.ticker.stop();
   const glow=textureFor(lib);
   app=instance;canvas=element;texture=glow;
   failed=false;lastReason=null;metrics.renderer="pixi-webgl";
   return true;
  }catch(error){
   element.remove();
   try{instance.destroy(true);}catch{}
   failed=true;lastReason="WebGL renderer not available";
   console.warn("[Hanabi Pixi Preview] WebGL init failed; using classic VFX.",error);
   return false;
  }
 })().finally(()=>{graphicsPromise=null;});
 return graphicsPromise;
}
function particle(x,y,color,diameter){
 const s=new pixi.Sprite(texture);
 s.anchor.set(.5);s.x=x;s.y=y;s.tint=color;s.alpha=0;
 const base=diameter/64;
 s.scale.set(base);
 app.stage.addChild(s);
 return {s,base};
}
function update(p,x,y,diameter,alpha){
 p.s.x=x;p.s.y=y;
 p.s.scale.set(p.base*diameter);
 p.s.alpha=clamp(alpha,0,1);
}
function randomGenerator(seed){
 let v=seed>>>0||0x8574facd;
 return ()=>{
  v^=v<<13;v^=v>>>17;v^=v<<5;
  return(v>>>0)/4294967296;
 };
}
function trace(evt){
 return ((evt.at+1)*2654435761 ^
  ((evt.spreadTargets||[]).reduce((a,t)=>a*31+t.to+1,17)))>>>0;
}
async function play(evt,{rectFor,onCharge,onLaunch,onBurst,onReveal}={}){
 if(!isEnabled()||playing||!evt?.spreadTargets?.length||typeof rectFor!=="function")return false;
 if(!(await ensureGraphics()))return false;
 if(choice!=="pixi"||!app)return false;
 const liveRect=viewRect();
 if(app.renderer.width!==liveRect.width||app.renderer.height!==liveRect.height){
  app.renderer.resize(liveRect.width,liveRect.height);
 }
 const loc=i=>{
  const r=rectFor(i);
  return {x:r.left+r.width/2,y:r.top+r.height/2,size:Math.min(r.width,r.height)};
 };
 const path=(evt.path||[]).filter(Number.isInteger);
 const source=loc(evt.at),apex=loc(path[path.length-1]??evt.at-7);
 const unit=apex.size,burstStart=TIMING.charge+TIMING.ascent;
 const targets=evt.spreadTargets.map(t=>({at:t.to,point:loc(t.to)}));
 playing=true;shown=true;canvas.style.visibility="visible";
 const rnd=randomGenerator(trace(evt));
 const ascentCore=particle(source.x,source.y,0xfff4cb,unit*.48);
 const launchTrail=Array.from({length:31},(_,i)=>({
  p:particle(source.x,source.y,COLORS[i%COLORS.length],unit*.13),
  start:TIMING.charge+20+i*17,wobble:(rnd()-.5)*unit*.36
 }));
 const chargeGlows=path.map((at,i)=>({p:particle(loc(at).x,loc(at).y,0xffdb91,unit*.50),i,point:loc(at)}));
 const bloom=particle(apex.x,apex.y,0xffe1b3,unit*2.4);
 const innerBloom=particle(apex.x,apex.y,0xfff7e5,unit*.86);
 const rays=Array.from({length:32},(_,i)=>{
  const angle=Math.PI*2*i/32-.28,rad=unit*(1.45+rnd()*.67);
  return {p:particle(apex.x,apex.y,COLORS[i%COLORS.length],unit*(.19+rnd()*.16)),
   dx:Math.cos(angle)*rad,dy:Math.sin(angle)*rad,offset:rnd()*95};
 });
 const branches=targets.map((target,n)=>({
  target,trail:Array.from({length:4},(_,i)=>particle(apex.x,apex.y,COLORS[(n+i+1)%COLORS.length],unit*.18)),
  burst:Array.from({length:8},(_,i)=>{
   const angle=Math.PI*2*i/8+.25*n;
   return {p:particle(target.point.x,target.point.y,COLORS[(n+i)%COLORS.length],unit*.18),
    dx:Math.cos(angle)*unit*(.35+rnd()*.26),
    dy:Math.sin(angle)*unit*(.35+rnd()*.26)};
  })
 }));
 let chargePlayed=false,launchPlayed=false,burstPlayed=false,revealed=false,frame=0,largestGap=0,previousTime=0;
 const start=performance.now();
 const paint=time=>{
  const t=time-start;frame++;
  if(previousTime)largestGap=Math.max(largestGap,time-previousTime);
  previousTime=time;
  if(!chargePlayed){chargePlayed=true;onCharge?.();}
  if(!launchPlayed&&t>=TIMING.charge){launchPlayed=true;onLaunch?.();}
  if(!burstPlayed&&t>=burstStart){burstPlayed=true;onBurst?.();}
  if(!revealed&&t>=burstStart+TIMING.sideDelay){revealed=true;onReveal?.();}
  for(const {p,i,point} of chargeGlows){
   const q=(t-i*22)/170;
   update(p,point.x,point.y,1+Math.max(0,q)*.42,q<0||q>1?0:.25*Math.sin(Math.PI*q));
  }
  const rocket=clamp((t-TIMING.charge)/TIMING.ascent,0,1);
  update(ascentCore,source.x,lerp(source.y,apex.y,rocket),1.2,
   t<TIMING.charge||rocket>=1?0:.95);
  for(const {p,start:birth,wobble} of launchTrail){
   const u=(t-birth)/TIMING.ascent;
   const a=u>=0&&u<1?(1-u)*.9:0;
   update(p,source.x+wobble*Math.sin(u*Math.PI),
    lerp(source.y,apex.y,clamp(u,0,1)),.72+u*.25,a);
  }
  const boom=clamp((t-burstStart)/TIMING.burst,0,1);
  const blast=boom>0&&boom<1;
  update(bloom,apex.x,apex.y,1.15+boom*2.1,
   blast?Math.sin(Math.PI*boom)*.88:0);
  update(innerBloom,apex.x,apex.y,1+boom*.84,
   blast?Math.pow(1-boom,2)*.96:0);
  for(const ray of rays){
   const q=clamp((t-burstStart-ray.offset)/(TIMING.burst*.85),0,1);
   const fade=q>0&&q<1?Math.pow(1-q,1.35):0;
   update(ray.p,apex.x+ray.dx*q,apex.y+ray.dy*q+unit*.13*q*q,
    1+Math.sin(q*Math.PI)*.32,fade);
  }
  branches.forEach(({target,trail,burst},n)=>{
   const depart=burstStart+70+n*58;
   const q=clamp((t-depart)/TIMING.sideFlight,0,1);
   trail.forEach((p,i)=>{
    const f=clamp(q-i*.08,0,1),e=(t-depart-i*25)/TIMING.sideFlight;
    const a=e>=0&&e<1?.75*(1-e):0;
    update(p,lerp(apex.x,target.point.x,f),
     lerp(apex.y,target.point.y,f)-unit*.15*Math.sin(Math.PI*f),.90,a);
   });
   const impactStart=depart+TIMING.sideFlight;
   const v=clamp((t-impactStart)/580,0,1);
   for(const {p,dx,dy} of burst){
    const visible=v>0&&v<1?Math.pow(1-v,1.2):0;
    update(p,target.point.x+dx*v,target.point.y+dy*v+unit*.18*v*v,1.2,v>0?visible:0);
   }
  });
  app.render(); // Match the working PixiJS 8 render loop from arena3v3.
  return t<TIMING.total;
 };
 try{
  await new Promise((resolve,reject)=>{
   let raf=0;
   function step(time){
    try{if(paint(time)){raf=requestAnimationFrame(step);}else resolve();}
    catch(error){cancelAnimationFrame(raf);reject(error);}
   }
   raf=requestAnimationFrame(step);
  });
  const elapsedMs=performance.now()-start;
  metrics={renderer:"pixi-webgl",frames:frame,elapsedMs:Math.round(elapsedMs),
   estimatedFps:Math.round(frame*1000/Math.max(1,elapsedMs)),maxFrameGapMs:Math.round(largestGap)};
  return true;
 }catch(error){
  failed=true;lastReason="PixiJS render error";
  console.warn("[Hanabi Pixi Preview] Render failed; next launch uses classic VFX.",error);
  return false;
 }finally{
  if(canvas)canvas.style.visibility="hidden";
  if(app){for(const child of app.stage.removeChildren())child.destroy();}
  playing=false;shown=false;
 }
}
function inspect(){return status();}
const api=Object.freeze({MODULE_URL,STORAGE_KEY,TIMING,mode,setMode,isEnabled,prepare,play,inspect});
root.HarmonyHanabiPixi=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
