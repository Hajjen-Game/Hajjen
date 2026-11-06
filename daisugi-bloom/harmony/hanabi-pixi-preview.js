/* Japanese Harmony · Hanabi Pixi Preview 1.3
 * Opt-in GPU particle layer, adapted from arena3v3's pinned PixiJS 8.21.0
 * + WebGL-first initialization and safe Canvas/WAAPI fallback.
 * Never reads/writes gameplay, seeds, boards, rewards or saved runs.
 */
(function(root){
"use strict";
const MODULE_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const STORAGE_KEY="japanese-harmony-hanabi-vfx-preview-v1";
const TIMING=Object.freeze({charge:270,ascent:680,burst:1050,sideDelay:650,sideFlight:440,tail:1000,total:2430});
const COLORS=Object.freeze([0xffdb91,0xffa8d4,0xffae74,0xdcc1ff,0xd8f8ff]);
let choice="classic",modulePromise=null,graphicsPromise=null,app=null,canvas=null,pixi=null,texture=null,streakTexture=null,tileTexture=null,layerHosts=null;
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
 if(!modulePromise){
  let timer=0;
  const deadline=new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(new Error("PixiJS preview CDN deadline (5 seconds)")),5000);
  });
  modulePromise=Promise.race([import(MODULE_URL),deadline]).then(lib=>{
   pixi=lib;return lib;
  }).catch(error=>{
   failed=true;lastReason="PixiJS could not load";
   console.warn("[Hanabi Pixi Preview] Dynamic import failed; classic VFX retained.",error);
   return null;
  }).finally(()=>clearTimeout(timer));
 }
 return !!(await modulePromise);
}
function viewRect(){
 return {width:Math.max(1,root.innerWidth||390),height:Math.max(1,root.innerHeight||844)};
}
function streakTextureFor(lib){
 // A narrow tapered spark instead of another blurry radial-glow sprite.
 const cn=document.createElement("canvas");cn.width=64;cn.height=64;
 const ctx=cn.getContext("2d");if(!ctx)throw new Error("Pixi streak texture unavailable");
 const fade=ctx.createLinearGradient(0,6,0,58);
 fade.addColorStop(0,"rgba(255,255,255,0)");
 fade.addColorStop(.18,"rgba(255,255,255,.7)");
 fade.addColorStop(.48,"rgba(255,255,255,1)");
 fade.addColorStop(.73,"rgba(255,255,255,.8)");
 fade.addColorStop(1,"rgba(255,255,255,0)");
 ctx.fillStyle=fade;
 ctx.beginPath();
 ctx.moveTo(32,6);ctx.bezierCurveTo(36,22,37,30,36,35);
 ctx.bezierCurveTo(35,43,33,52,32,58);
 ctx.bezierCurveTo(30,45,28,38,28,32);
 ctx.bezierCurveTo(28,23,31,15,32,6);
 ctx.fill();
 return lib.Texture.from(cn);
}
function tileTextureFor(lib){
 // An actual lit square for the Hanabi column, like Classic's telegraph.
 // Drawn as a cached texture rather than rebuilding canvas each frame.
 const cn=document.createElement("canvas");cn.width=64;cn.height=64;
 const ctx=cn.getContext("2d");if(!ctx)throw new Error("Hanabi tile texture unavailable");
 const g=ctx.createRadialGradient(32,32,3,32,32,34);
 g.addColorStop(0,"rgba(255,229,185,.55)");
 g.addColorStop(.35,"rgba(247,173,187,.38)");
 g.addColorStop(1,"rgba(255,223,157,0)");
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 ctx.strokeStyle="rgba(255,232,166,.95)";
 ctx.lineWidth=2;ctx.strokeRect(4,4,56,56);
 ctx.strokeStyle="rgba(255,248,223,.5)";
 ctx.lineWidth=1;ctx.strokeRect(7,7,50,50);
 return lib.Texture.from(cn);
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
  if(!(await prepare()))return false;
  // prepare() is deliberately a boolean public API. The module namespace
  // itself is retained in pixi, matching arena3v3's imported PIXI object.
  const lib=pixi;
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
   const glow=textureFor(lib),needle=streakTextureFor(lib),tile=tileTextureFor(lib);
   app=instance;canvas=element;texture=glow;streakTexture=needle;tileTexture=tile;
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
// Like Pixi 3v3: keep a soft field behind crisp cores, rays and final glints.
function particle(x,y,color,diameter,kind="glow",layer){
 const s=new pixi.Sprite(kind==="streak"?streakTexture:kind==="tile"?tileTexture:texture);
 s.anchor.set(.5);s.x=x;s.y=y;s.tint=color;s.alpha=0;
 const base=diameter/64;
 s.scale.set(base);
 const lane=layer||(kind==="tile"?"field":kind==="streak"?"rays":"core");
 (layerHosts?.[lane]||app.stage).addChild(s);
 return {s,base};
}
function update(p,x,y,diameter,alpha,rotation=0){
 p.s.x=x;p.s.y=y;
 p.s.scale.set(p.base*diameter);
 p.s.rotation=rotation;
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
 // Classic's blossom is centered on row 2, not clipped against the HUD at row 1.
 const source=loc(evt.at),apex=loc(7+evt.at%7);
 const unit=apex.size,burstStart=TIMING.charge+TIMING.ascent;
 const targets=evt.spreadTargets.map(t=>({at:t.to,point:loc(t.to)}));
 playing=true;shown=true;canvas.style.visibility="visible";
 // Five real Pixi containers, back to front. Each stays on a different motion
 // curve, instead of piling more identical expanding sprites onto the stage.
 layerHosts={field:new pixi.Container(),aura:new pixi.Container(),
  core:new pixi.Container(),rays:new pixi.Container(),glints:new pixi.Container()};
 for(const layer of Object.values(layerHosts))app.stage.addChild(layer);
 const rnd=randomGenerator(trace(evt));
 const lightFx=Number(root.navigator?.hardwareConcurrency||4)<=4||
  Number(root.navigator?.deviceMemory||4)<=3;
 const ascentCore=particle(source.x,source.y,0xfff4cb,unit*.48);
 const launchTrail=Array.from({length:lightFx?20:31},(_,i)=>({
  p:particle(source.x,source.y,COLORS[i%COLORS.length],unit*.13),
  start:TIMING.charge+20+i*(lightFx?25:17),wobble:(rnd()-.5)*unit*.36
 }));
 // Two independent, counter-rotating ribbons wrap around the rising rocket.
 // Gentle amplitude keeps the real tile effects readable.
 const helix=Array.from({length:lightFx?6:10},(_,i)=>({
  p:particle(source.x,source.y,COLORS[(i+1)%COLORS.length],unit*.22,"streak","rays"),
  start:TIMING.charge+35+i*32,side:i%2?1:-1,phase:i*.88
 }));
 const chargeGlows=path.map((at,i)=>{
  const point=loc(at);
  return {p:particle(point.x,point.y,0xffdb91,unit*.50),
   cell:particle(point.x,point.y,0xffffff,point.size*.96,"tile"),
   point,i};
 });
 const columnHits=path.map((at,i)=>{
  const point=loc(at);
  const rays=Array.from({length:5},(_,j)=>{
   const angle=j*Math.PI*2/5+.2*i;
   return {p:particle(point.x,point.y,COLORS[(i+j)%COLORS.length],unit*.24,"streak"),
    dx:Math.cos(angle)*unit*.35,dy:Math.sin(angle)*unit*.35,angle};
  });
  return {i,point,p:particle(point.x,point.y,COLORS[i%COLORS.length],unit*.56),rays};
 });
 const bloom=particle(apex.x,apex.y,0xffe1b3,unit*1.60,"glow","aura");
 const innerBloom=particle(apex.x,apex.y,0xfff7e5,unit*1.12,"glow","glints");
 // Soft rose and gold petals give the sharp Pixi streaks Classic's flower shape.
 const petals=Array.from({length:20},(_,i)=>{
  const angle=Math.PI*2*i/20+.13+(rnd()-.5)*.08;
  const radius=unit*(.9+rnd()*.45);
  const petalColors=[0xffbcd8,0xffe2ae,0xffa5dc,0xffebc5,0xfff2e2];
  return {p:particle(apex.x,apex.y,petalColors[i%petalColors.length],unit*(.58+rnd()*.20),"glow","aura"),
   dx:Math.cos(angle)*radius,dy:Math.sin(angle)*radius,offset:(i%4)*16};
 });
 // Clearly visible radial streaks are the main blast; the glow is only an accent.
 const rays=Array.from({length:32},(_,i)=>{
  const angle=Math.PI*2*i/32-.28+(rnd()-.5)*.06;
  const rad=unit*(1.34+rnd()*.77);
  return {p:particle(apex.x,apex.y,COLORS[i%COLORS.length],unit*(.52+rnd()*.21),"streak"),
   dx:Math.cos(angle)*rad,dy:Math.sin(angle)*rad,angle,offset:(i%3)*18+rnd()*32};
 });
 const embers=Array.from({length:lightFx?9:12},(_,i)=>{
  const angle=Math.PI*i/6+.20,rad=unit*(1.1+rnd()*.7);
  return {p:particle(apex.x,apex.y,COLORS[(i+1)%COLORS.length],unit*(.12+rnd()*.12),"glow","glints"),
   dx:Math.cos(angle)*rad,dy:Math.sin(angle)*rad,offset:80+rnd()*90};
 });
 // The 3v3-style second motion family: opposing curls, NOT more radial rays.
 const curls=Array.from({length:lightFx?10:16},(_,i)=>{
  const angle=i*Math.PI*2/(lightFx?10:16)+.27;
  return {p:particle(apex.x,apex.y,COLORS[(i+2)%COLORS.length],
    unit*(.28+rnd()*.15),"streak","rays"),
   angle,side:i%2===0?1:-1,offset:(i%4)*26};
 });
 // A delayed outer star-shower provides a second beat after the first BOOM.
 const echoes=Array.from({length:lightFx?8:13},(_,i)=>{
  const angle=i*Math.PI*2/(lightFx?8:13)+.11,
   radius=unit*(1.36+rnd()*.57);
  return {p:particle(apex.x,apex.y,i%3===0?0xffffff:COLORS[(i+1)%COLORS.length],
    unit*(.25+rnd()*.15),"streak","glints"),
   dx:Math.cos(angle)*radius,dy:Math.sin(angle)*radius,angle,
   offset:(i%3)*20};
 });
 const branches=targets.map((target,n)=>({
  target,
  halo:particle(target.point.x,target.point.y,COLORS[(n+1)%COLORS.length],unit*.72,"glow","aura"),
  core:particle(target.point.x,target.point.y,0xfff5d5,unit*.30,"glow","glints"),
  trail:Array.from({length:4},(_,i)=>particle(apex.x,apex.y,COLORS[(n+i+1)%COLORS.length],unit*(.40-i*.055),"streak")),
  burst:Array.from({length:12},(_,i)=>{
   const angle=Math.PI*2*i/12+.25*n,rad=unit*(.38+rnd()*.40);
   return {p:particle(target.point.x,target.point.y,COLORS[(n+i)%COLORS.length],unit*(.36+rnd()*.14),"streak"),
    dx:Math.cos(angle)*rad,dy:Math.sin(angle)*rad,angle};
  }),
  petals:Array.from({length:lightFx?5:7},(_,i)=>{
   const angle=Math.PI*2*i/(lightFx?5:7)+.31*n,rad=unit*(.22+rnd()*.18);
   return {p:particle(target.point.x,target.point.y,COLORS[(n+i+1)%COLORS.length],unit*.38,"glow","aura"),
    dx:Math.cos(angle)*rad,dy:Math.sin(angle)*rad,angle};
  }),
  orbit:Array.from({length:lightFx?2:3},(_,i)=>({
   p:particle(target.point.x,target.point.y,i===0?0xfff7de:COLORS[(n+i+2)%COLORS.length],
    unit*.15,"glow","glints"),angle:i*Math.PI*2/(lightFx?2:3)+n*.4,
   side:i%2?1:-1
  }))
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
  for(const {p,cell,i,point} of chargeGlows){
   const startAt=i*32,charged=clamp((t-startAt)/130,0,1);
   const decay=1-clamp((t-(burstStart+280))/440,0,1);
   const pulse=.86+.14*Math.sin(t*.011+i*.6);
   update(cell,point.x,point.y,1,charged*.78*decay*pulse);
   update(p,point.x,point.y,1+charged*.36,
    charged*.25*decay*pulse);
  }
  // Small sparks climb exactly the genuine Hanabi column, never empty targets.
  for(const {i,point,p,rays} of columnHits){
   const arrival=TIMING.charge+(i+.2)*TIMING.ascent/Math.max(1,path.length);
   const q=clamp((t-arrival)/310,0,1),active=t>=arrival&&q<1;
   const fade=active?Math.sin(Math.PI*q)*.75:0;
   update(p,point.x,point.y,.95+q*1.45,fade*.72);
   for(const r of rays){
    const a=active?Math.pow(1-q,1.28)*Math.min(1,q*14)*.82:0;
    update(r.p,point.x+r.dx*q,point.y+r.dy*q,
     1.05-q*.43,a,r.angle+Math.PI/2);
   }
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
  for(const {p,start:birth,side,phase} of helix){
   const u=(t-birth)/TIMING.ascent,active=u>=0&&u<1;
   const spin=u*Math.PI*3.6+phase;
   const w=unit*(.13+.13*Math.sin(Math.PI*clamp(u,0,1)));
   update(p,source.x+side*w*Math.sin(spin),
    lerp(source.y,apex.y,clamp(u,0,1)),.76+.18*u,
    active?.66*Math.sin(Math.PI*u):0,spin*.25);
  }
  const boom=clamp((t-burstStart)/TIMING.burst,0,1);
  const blast=boom>0&&boom<1;
  update(bloom,apex.x,apex.y,.82+boom*1.65,
   blast?Math.sin(Math.PI*boom)*.56:0);
  update(innerBloom,apex.x,apex.y,1+boom*.95,
   blast?Math.pow(1-boom,2)*.98:0);
  for(const petal of petals){
   const q=clamp((t-burstStart-petal.offset)/960,0,1);
   const visible=q>0&&q<1?.82*Math.pow(Math.sin(Math.PI*q),.62):0;
   update(petal.p,apex.x+petal.dx*(.13+q*.94),
    apex.y+petal.dy*(.13+q*.94)+unit*.11*q*q,
    1.14-q*.35,visible);
  }
  for(const ray of rays){
   const q=clamp((t-burstStart-ray.offset)/(TIMING.burst*.96),0,1);
   const fade=q>0&&q<1?Math.pow(1-q,.83)*Math.min(1,q*13):0;
   update(ray.p,apex.x+ray.dx*q,apex.y+ray.dy*q+unit*.15*q*q,
    1.12-q*.49,fade,ray.angle+Math.PI/2);
  }
  for(const ember of embers){
   const q=clamp((t-burstStart-ember.offset)/(TIMING.burst*.89),0,1);
   const fade=q>0&&q<1?.82*Math.pow(1-q,1.55)*Math.min(1,q*12):0;
   update(ember.p,apex.x+ember.dx*q,apex.y+ember.dy*q+unit*.23*q*q,
    .82-q*.4,fade);
  }
  // Opposite angular velocities make the two curling waves read as
  // living, interleaved fireworks rather than one uniformly scaled flower.
  for(const curl of curls){
   const q=clamp((t-burstStart-60-curl.offset)/860,0,1);
   const active=t>=burstStart+60+curl.offset&&q<1;
   const angle=curl.angle+curl.side*q*2.55;
   const radius=unit*(.16+1.21*q);
   const alpha=active?.67*Math.pow(Math.sin(Math.PI*q),.68):0;
   update(curl.p,apex.x+Math.cos(angle)*radius,
    apex.y+Math.sin(angle)*radius+unit*.14*q*q,
    .91-q*.39,alpha,angle+Math.PI/2);
  }
  // Secondary outer sparkle burst is delayed but overlaps the flower's tail.
  for(const echo of echoes){
   const startAt=burstStart+235+echo.offset;
   const q=clamp((t-startAt)/695,0,1);
   const active=t>=startAt&&q<1;
   const visible=active?.75*Math.pow(1-q,1.12)*Math.min(1,q*16):0;
   update(echo.p,apex.x+echo.dx*q,apex.y+echo.dy*q+unit*.20*q*q,
    .92-q*.38,visible,echo.angle+Math.PI/2);
  }
  branches.forEach(({target,trail,burst,petals:sidePetals,orbit,halo,core},n)=>{
   const depart=burstStart+70+n*58;
   const q=clamp((t-depart)/TIMING.sideFlight,0,1);
   const angle=Math.atan2(target.point.y-apex.y,target.point.x-apex.x)+Math.PI/2;
   trail.forEach((p,i)=>{
    const f=clamp(q-i*.09,0,1),e=(t-depart-i*24)/TIMING.sideFlight;
    const a=e>=0&&e<1?.92*Math.pow(1-e,.72):0;
    update(p,lerp(apex.x,target.point.x,f),
     lerp(apex.y,target.point.y,f)-unit*.13*Math.sin(Math.PI*f),
     .95-f*.24,a,angle);
   });
   const impactStart=depart+TIMING.sideFlight;
   const v=clamp((t-impactStart)/680,0,1);
   const alive=t>=impactStart&&v<1;
   // Every secondary explosion, including the rightmost one, fades away.
   const flash=alive?Math.pow(1-v,2)*Math.min(1,v*22):0;
   update(core,target.point.x,target.point.y,.85+v*.5,flash*.91);
   update(halo,target.point.x,target.point.y,.75+v*1.48,
    alive?.38*Math.sin(Math.PI*v):0);
   for(const {p,dx,dy,angle} of sidePetals){
    // A slight tangential curl, distinct from the impact's straight needles.
    const twist=v*.78*(n%2?-1:1);
    const ox=dx*Math.cos(twist)-dy*Math.sin(twist);
    const oy=dx*Math.sin(twist)+dy*Math.cos(twist);
    const visible=alive?.88*Math.pow(Math.sin(Math.PI*v),.8):0;
    update(p,target.point.x+ox*v,target.point.y+oy*v,
     1.08-v*.32,visible);
   }
   for(const o of orbit){
    const q=clamp((t-impactStart-50)/565,0,1);
    const aliveOrbit=t>=impactStart+50&&q<1;
    const a=o.angle+o.side*q*3.6;
    const radius=unit*(.13+.33*q);
    update(o.p,target.point.x+Math.cos(a)*radius,
     target.point.y+Math.sin(a)*radius,.80-q*.38,
     aliveOrbit?.72*Math.sin(Math.PI*q):0);
   }
   for(const {p,dx,dy,angle:rayAngle} of burst){
    const visible=alive?Math.pow(1-v,1.2)*Math.min(1,v*15):0;
    update(p,target.point.x+dx*v,target.point.y+dy*v+unit*.16*v*v,
     1.02-v*.42,visible,rayAngle+Math.PI/2);
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
  if(app){for(const child of app.stage.removeChildren())child.destroy({children:true});}
  layerHosts=null;
  playing=false;shown=false;
 }
}
function inspect(){return status();}
const api=Object.freeze({MODULE_URL,STORAGE_KEY,TIMING,mode,setMode,isEnabled,prepare,play,inspect});
root.HarmonyHanabiPixi=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
