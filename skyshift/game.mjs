import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { CONFIG, clamp, createTrack, centerAt, roadIntervals, surfaceAt, zoneAt, speedAtZone } from "./track.mjs";

const $ = id => document.getElementById(id);
const ui = {
  canvas:$("game"), hud:$("hud"), menu:$("menu"), pause:$("pause-screen"), end:$("end-screen"),
  controls:$("mobile-controls"), pauseBtn:$("pause-btn"), zone:$("zone-number"),
  zoneFill:$("zone-progress-fill"), distance:$("distance"), speed:$("speed"),
  shield:$("shield-text"), shieldFill:$("shield-fill"), flight:$("flight-state"),
  toast:$("toast"), banner:$("zone-banner"), bannerNum:$("zone-banner-number"),
  bannerName:$("zone-banner-name"), zoneFlash:$("zone-flash"), stick:$("stick"),
  stickKnob:$("stick-knob"), jump:$("jump-btn"), error:$("error")
};
const PALETTES = [
  { name:"ION BLUE",     color:0x3fdff5, sky:0x060e22, fog:0x09182c },
  { name:"VIOLET PULSE", color:0x9b80ff, sky:0x120d2b, fog:0x181331 },
  { name:"ROSE SURGE",   color:0xff71ad, sky:0x230d25, fog:0x26142f },
  { name:"GOLD DRIVE",   color:0xffc16f, sky:0x211322, fog:0x291d31 },
  { name:"AQUA SHIFT",   color:0x6cf5cf, sky:0x081e27, fog:0x102b30 },
  { name:"ULTRAVIOLET",  color:0xc790ff, sky:0x190f31, fog:0x221838 }
];
let scene, camera, renderer, world, trackMaterial, rimMaterial, ship, shipGlow, shipShadow;
let planner, state;
const rendered = new Map();
const input = { keys:new Set(), stick:0, jumpHeld:false, jumpBuffer:0, jumpHold:0 };
let stickPointer = null, lastFrame = performance.now(), accumulator = 0;
let toastTimer=null, bannerTimer=null;

function getBest() {
  try { return Math.max(0,Number(localStorage.getItem("skyshift-best-v01"))||0); } catch { return 0; }
}
function saveBest(distance) {
  try { localStorage.setItem("skyshift-best-v01",String(Math.floor(distance))); } catch {}
}
function announce(message, seconds=1.3) {
  ui.toast.textContent=message; ui.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>ui.toast.classList.add("hidden"),seconds*1000);
}
function makeGeometry(vertices,colors=null) {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  if(colors)geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
function pushQuad(vertices,colors,a,b,c,d,tint) {
  for(const v of [a,b,c,a,c,d]) {
    vertices.push(v.x,v.y,v.z);
    if(colors) colors.push(tint.r,tint.g,tint.b);
  }
}
function trackPoint(segment,distance,offset,lift=0) {
  const p=centerAt(segment,distance);
  const s2=Math.min(segment.end,distance+.25);
  const p2=centerAt(segment,s2);
  const slope=(p2.x-p.x)/Math.max(.001,s2-distance);
  const k=1/Math.sqrt(1+slope*slope);
  return new THREE.Vector3(p.x+offset*k,p.y+lift,-distance+offset*slope*k);
}
function addTrackSection(segment) {
  const deck=[],colors=[],edges=[];
  const base=new THREE.Color(segment.type==="flow"?0x415775:
    segment.type==="precision"?0x39466f:segment.type==="split"?0x3d557a:0x4c5276);
  const side=new THREE.Color(0x111c35);
  for(let s=segment.start;s<segment.end-.01;s+=1.5) {
    const e=Math.min(segment.end,s+1.5);
    for(const [lo,hi] of roadIntervals(segment,(s+e)*.5)) {
      const a=trackPoint(segment,s,lo),b=trackPoint(segment,s,hi);
      const c=trackPoint(segment,e,hi),d=trackPoint(segment,e,lo);
      const shade=base.clone().multiplyScalar(Math.floor(s/4)%2===0?1.03:.91);
      pushQuad(deck,colors,a,b,c,d,shade);
      pushQuad(deck,colors,a.clone().add(new THREE.Vector3(0,-.38,0)),a,d,
        d.clone().add(new THREE.Vector3(0,-.38,0)),side);
      pushQuad(deck,colors,b,c,c.clone().add(new THREE.Vector3(0,-.38,0)),
        b.clone().add(new THREE.Vector3(0,-.38,0)),side);
      for(const offset of [lo+.13,hi-.25]) {
        pushQuad(edges,null,trackPoint(segment,s,offset,.045),
          trackPoint(segment,s,offset+.12,.045),
          trackPoint(segment,e,offset+.12,.045),
          trackPoint(segment,e,offset,.045));
      }
      if(roadIntervals(segment,(s+e)*.5).length===1 &&
         Math.floor(s/6)%2===0 && segment.type!=="precision") {
        pushQuad(edges,null,trackPoint(segment,s,-.055,.05),
          trackPoint(segment,s,.055,.05),
          trackPoint(segment,e,.055,.05),
          trackPoint(segment,e,-.055,.05));
      }
    }
  }
  const group=new THREE.Group();
  for(const [vertices,vertexColors,mat] of [[deck,colors,trackMaterial],[edges,null,rimMaterial]]) {
    const mesh=new THREE.Mesh(makeGeometry(vertices,vertexColors),mat);
    mesh.frustumCulled=false;
    group.add(mesh);
  }
  world.add(group);rendered.set(segment.id,group);
}
function updateTrackMeshes() {
  planner.ensureTo(state.distance+340);
  for(const segment of planner.segments) {
    if(segment.end>state.distance-55 && segment.start<state.distance+340 &&
       !rendered.has(segment.id))addTrackSection(segment);
  }
  for(const [id,group] of rendered) {
    const segment=planner.segments.find(s=>s.id===id);
    if(!segment || segment.end<state.distance-80) {
      for(const child of group.children)child.geometry.dispose();
      world.remove(group);rendered.delete(id);
    }
  }
  planner.trimBefore(state.distance-210);
}
function clearTrackMeshes() {
  for(const group of rendered.values()) {
    for(const child of group.children)child.geometry.dispose();
    world.remove(group);
  }
  rendered.clear();
}
function material(color,emissive=0x000000,intensity=0) {
  return new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.33,
    emissive,emissiveIntensity:intensity,flatShading:true,side:THREE.DoubleSide});
}
function makeShip() {
  const group=new THREE.Group();
  const hull=material(0xb7daed,0x173758,.23);
  const dark=material(0x14243d,0x15213a,.35);
  const cockpit=material(0x061a32,0x1a80ad,.65);
  const glow=new THREE.MeshBasicMaterial({color:0x72eaff});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.55,.5,3.7),hull);
  body.position.y=.1;group.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.82,1.85,4),hull);
  nose.rotation.x=-Math.PI/2;nose.position.set(0,.1,-2.6);group.add(nose);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(.81,.23,1.3),cockpit);
  canopy.position.set(0,.48,-.38);group.add(canopy);
  function wing(sign) {
    const pos=[
      sign*.61,.1,-1.15,sign*3.25,.04,.75,sign*2.62,.07,2,
      sign*.61,.1,-1.15,sign*2.62,.07,2,sign*.67,.12,1.25
    ];
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
    g.computeVertexNormals();group.add(new THREE.Mesh(g,hull));
    const intake=new THREE.Mesh(new THREE.BoxGeometry(.44,.25,1.5),dark);
    intake.position.set(sign*1.4,.16,.72);group.add(intake);
    const engine=new THREE.Mesh(new THREE.BoxGeometry(.48,.15,.38),glow);
    engine.position.set(sign*.72,-.06,2);group.add(engine);
  }
  wing(-1);wing(1);
  const spine=new THREE.Mesh(new THREE.BoxGeometry(.3,.19,2.5),dark);
  spine.position.set(0,.39,.75);group.add(spine);
  const engineCore=new THREE.Mesh(new THREE.BoxGeometry(.7,.11,.42),glow);
  engineCore.position.set(0,-.06,1.92);group.add(engineCore);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(3,24),
    new THREE.MeshBasicMaterial({color:0x3dd0ef,transparent:true,opacity:.12,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  shipGlow=glow;shipShadow=shadow;
  scene.add(group);ship=group;
}
function makeStars() {
  const vertices=[];let seed=12043;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<550;i++)vertices.push((rand()-.5)*320,(rand()-.42)*135,-35-rand()*255);
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  camera.add(new THREE.Points(g,new THREE.PointsMaterial({
    color:0x9ab6db,size:.48,sizeAttenuation:true,transparent:true,opacity:.6,depthWrite:false
  })));
}
function initGraphics() {
  scene=new THREE.Scene();
  scene.background=new THREE.Color(PALETTES[0].sky);
  scene.fog=new THREE.FogExp2(PALETTES[0].fog,.0075);
  camera=new THREE.PerspectiveCamera(69,innerWidth/innerHeight,.1,850);
  scene.add(camera);
  renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia("(pointer:coarse)").matches?1.45:1.8));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.5;
  scene.add(new THREE.AmbientLight(0x99bae1,2.1));
  const light=new THREE.DirectionalLight(0xa2dfff,3.1);
  light.position.set(4,17,8);scene.add(light);
  world=new THREE.Group();scene.add(world);
  trackMaterial=new THREE.MeshStandardMaterial({
    color:0x9dd3ef,vertexColors:true,metalness:.22,roughness:.52,
    emissive:0x0b2339,emissiveIntensity:.25,side:THREE.DoubleSide
  });
  rimMaterial=new THREE.MeshBasicMaterial({color:PALETTES[0].color,side:THREE.DoubleSide});
  makeShip();makeStars();addEventListener("resize",onResize);
}
function onResize() {
  if(!renderer)return;
  camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight,false);
}
function zoneShift(zone,showBanner) {
  const palette=PALETTES[(zone-1)%PALETTES.length];
  document.documentElement.style.setProperty("--neon","#"+palette.color.toString(16).padStart(6,"0"));
  if(showBanner) {
    ui.bannerNum.textContent=String(zone).padStart(2,"0");
    ui.bannerName.textContent=palette.name;
    ui.banner.classList.remove("hidden");
    ui.banner.style.animation="none";void ui.banner.offsetWidth;ui.banner.style.animation="";
    ui.zoneFlash.classList.add("active");
    clearTimeout(bannerTimer);
    bannerTimer=setTimeout(()=>{
      ui.banner.classList.add("hidden");ui.zoneFlash.classList.remove("active");
    },2350);
    state.events.push({kind:"zone",zone,distance:Math.round(state.distance),
      time:+state.elapsed.toFixed(2)});
  }
}
function updatePalette(dt) {
  const p=PALETTES[(state.zone-1)%PALETTES.length];
  const blend=1-Math.exp(-dt*1.5);
  scene.background.lerp(new THREE.Color(p.sky),blend);
  scene.fog.color.lerp(new THREE.Color(p.fog),blend);
  rimMaterial.color.lerp(new THREE.Color(p.color),blend);
  shipGlow.color.lerp(new THREE.Color(p.color),blend);
}
function reset(mode="playing") {
  clearTrackMeshes();
  planner=createTrack((Date.now() ^ Math.floor(Math.random()*100000))>>>0);
  state={
    mode,distance:7,speed:CONFIG.startSpeed,shield:100,zone:1,
    x:0,y:CONFIG.hoverHeight,vy:0,grounded:true,coyote:0,
    invulnerable:0,elapsed:0,previousBest:getBest(),jumps:0,
    landings:0,falls:0,events:[],fpsMin:999,fpsSum:0,fpsSamples:0
  };
  input.keys.clear();input.stick=0;input.jumpBuffer=0;input.jumpHeld=false;input.jumpHold=0;
  ui.stickKnob.style.transform="translateX(0px)";
  ui.jump.classList.remove("held");
  const ground=surfaceAt(planner,7,0,0);
  state.x=ground.centerX;state.y=ground.height+CONFIG.hoverHeight;
  camera.position.set(state.x,state.y+5,-state.distance+16);
  camera.lookAt(state.x,state.y,-state.distance-25);
  ship.position.set(state.x,state.y,-state.distance);
  updateTrackMeshes();zoneShift(1,false);
  accumulator=0;lastFrame=performance.now();refreshHud();
}
function startFlight() {
  reset("playing");
  ui.menu.classList.add("hidden");ui.end.classList.add("hidden");
  ui.pause.classList.add("hidden");ui.hud.classList.remove("hidden");
  ui.controls.classList.remove("hidden");ui.pauseBtn.classList.remove("hidden");
  ui.toast.classList.add("hidden");
}
function pauseFlight() {
  if(state.mode!=="playing")return;
  state.mode="paused";input.jumpHeld=false;input.stick=0;input.keys.clear();
  ui.pause.classList.remove("hidden");ui.pauseBtn.classList.add("hidden");
}
function resumeFlight() {
  if(state.mode!=="paused")return;
  state.mode="playing";ui.pause.classList.add("hidden");
  ui.pauseBtn.classList.remove("hidden");lastFrame=performance.now();accumulator=0;
}
function logEvent(kind,extra={}) {
  state.events.push({kind,time:+state.elapsed.toFixed(2),
    distance:Math.round(state.distance),...extra});
}
function fall() {
  state.falls++;state.shield=Math.max(0,state.shield-35);
  logEvent("fall",{shield:state.shield});
  if(state.shield<=0){finishFlight();return;}
  const segment=planner.at(state.distance);
  const checkpoint=Math.max(segment.start+9,Math.min(segment.start+19,state.distance-20));
  const safe=surfaceAt(planner,checkpoint,centerAt(segment,checkpoint).x,0);
  state.distance=checkpoint;state.x=safe.centerX;
  state.y=safe.height+CONFIG.hoverHeight;state.vy=0;
  state.grounded=true;state.coyote=0;state.invulnerable=1.4;
  announce("SHIELD -35 · REPOSITIONED");
}
function finishFlight() {
  state.mode="ended";input.jumpHeld=false;input.stick=0;
  if(state.distance>state.previousBest)saveBest(state.distance);
  $("final-distance").textContent=Math.floor(state.distance)+" M";
  $("final-zone").textContent=String(state.zone).padStart(2,"0");
  $("personal-best").textContent=Math.floor(Math.max(state.distance,state.previousBest))+" M";
  $("flight-time").textContent=Math.floor(state.elapsed/60)+":"+
    String(Math.floor(state.elapsed%60)).padStart(2,"0");
  ui.hud.classList.add("hidden");ui.controls.classList.add("hidden");
  ui.pauseBtn.classList.add("hidden");ui.end.classList.remove("hidden");
  logEvent("run_end",{maxZone:state.zone});
}
function jump() {
  if(state && state.mode==="playing")input.jumpBuffer=.14;
}
function step(dt) {
  state.elapsed+=dt;
  const nextZone=zoneAt(state.distance);
  if(nextZone!==state.zone){state.zone=nextZone;zoneShift(nextZone,true);}
  state.speed+=(speedAtZone(state.zone)-state.speed)*Math.min(1,dt*1.4);
  state.distance+=state.speed*dt;
  const steer=clamp((input.keys.has("ArrowRight")||input.keys.has("KeyD")?1:0)-
    (input.keys.has("ArrowLeft")||input.keys.has("KeyA")?1:0)+input.stick,-1,1);
  state.x+=steer*CONFIG.sideSpeed*dt;
  input.jumpBuffer=Math.max(0,input.jumpBuffer-dt);
  state.coyote=Math.max(0,state.coyote-dt);
  state.invulnerable=Math.max(0,state.invulnerable-dt);
  const surface=surfaceAt(planner,state.distance,state.x);
  if(state.grounded && !surface.solid){state.grounded=false;state.coyote=.11;}
  if(input.jumpBuffer>0 && (state.grounded||state.coyote>0)) {
    state.vy=CONFIG.jumpVelocity;state.grounded=false;state.coyote=0;
    input.jumpBuffer=0;input.jumpHold=0;
    state.jumps++;logEvent("jump",{kindOfTrack:surface.type});
  }
  if(state.grounded && surface.solid) {
    state.y=surface.height+CONFIG.hoverHeight;state.vy=0;
  } else {
    const lowGravity=input.jumpHeld && state.vy>0 && input.jumpHold<.18;
    state.vy-=CONFIG.gravity*(lowGravity?0.75:1)*dt;
    state.y+=state.vy*dt;input.jumpHold+=dt;
    if(surface.solid && state.vy<=0 && state.y<=surface.height+CONFIG.hoverHeight &&
       state.y>surface.height-.9) {
      state.y=surface.height+CONFIG.hoverHeight;
      state.vy=0;state.grounded=true;state.landings++;logEvent("land");
    }
  }
  if(state.y<-17)fall();
  if(state.mode==="playing" && state.distance>state.previousBest &&
     state.previousBest>100 && !state.bestToastShown) {
    state.bestToastShown=true;announce("NEW PERSONAL BEST");
  }
}
function refreshHud() {
  ui.zone.textContent=String(state.zone).padStart(2,"0");
  ui.zoneFill.style.width=((state.distance%CONFIG.zoneLength)/CONFIG.zoneLength*100).toFixed(1)+"%";
  ui.distance.innerHTML=String(Math.floor(state.distance)).padStart(4,"0")+" <small>M</small>";
  ui.speed.textContent="SPEED "+(state.speed/CONFIG.startSpeed).toFixed(2)+"×";
  ui.shield.textContent=Math.floor(state.shield)+"%";
  ui.shieldFill.style.width=state.shield+"%";
  ui.flight.textContent=state.grounded?"GLIDING":state.vy>0?"AIRBORNE · RISING":"AIRBORNE · DESCENDING";
}
function updateVisuals(dt,time) {
  updateTrackMeshes();updatePalette(dt);
  const surface=surfaceAt(planner,state.distance,state.x,0);
  ship.visible=!(state.invulnerable>0 && Math.sin(time*14)<0);
  ship.position.set(state.x,state.y+Math.sin(time*4.3)*.035,-state.distance);
  const steer=clamp((input.keys.has("ArrowRight")||input.keys.has("KeyD")?1:0)-
    (input.keys.has("ArrowLeft")||input.keys.has("KeyA")?1:0)+input.stick,-1,1);
  ship.rotation.z+=(-steer*.26-ship.rotation.z)*Math.min(1,dt*9);
  ship.rotation.x+=(clamp(state.vy/24,-.20,.20)-ship.rotation.x)*Math.min(1,dt*6);
  shipShadow.visible=surface.solid && state.y-surface.height<8;
  shipShadow.position.set(state.x,surface.height+.07,-state.distance);
  shipShadow.material.opacity=clamp(.15-(state.y-surface.height-1)*.023,0,.15);
  const desired=new THREE.Vector3(state.x+steer*.4,state.y+5.1,
    -state.distance+14+state.speed*.07);
  camera.position.lerp(desired,1-Math.exp(-dt*5.2));
  camera.lookAt(state.x,state.y+.05,-state.distance-23-state.speed*.16);
  const targetFov=66+Math.min(9,(state.speed-CONFIG.startSpeed)*.22);
  if(Math.abs(camera.fov-targetFov)>.03) {
    camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*3);camera.updateProjectionMatrix();
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));
  lastFrame=now;
  if(state) {
    if(state.mode==="playing") {
      accumulator+=dt;let steps=0;
      while(accumulator>=1/120 && steps<7 && state.mode==="playing") {
        step(1/120);accumulator-=1/120;steps++;
      }
      if(steps===7)accumulator=0;
      const fps=dt>0?1/dt:60;
      if(state.elapsed>1 && fps<180) {
        state.fpsMin=Math.min(state.fpsMin,fps);
        state.fpsSum+=fps;state.fpsSamples++;
      }
      refreshHud();
    }
    updateVisuals(dt,now/1000);
  }
  renderer.render(scene,camera);
}
function exportAudit() {
  const data={
    game:"SKYSHIFT",version:"0.1.0",exportedAt:new Date().toISOString(),
    run:{distanceMeters:Math.floor(state.distance),maxZone:state.zone,
      durationSeconds:+state.elapsed.toFixed(2),jumps:state.jumps,
      landings:state.landings,falls:state.falls,shieldRemaining:state.shield,
      fpsMin:state.fpsMin===999?null:Math.round(state.fpsMin),
      fpsAverage:state.fpsSamples?Math.round(state.fpsSum/state.fpsSamples):null},
    events:state.events
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="skyshift-zone-"+String(state.zone).padStart(2,"0")+"-flight-audit.json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function bindControls() {
  $("start-btn").addEventListener("click",startFlight);
  $("retry-btn").addEventListener("click",startFlight);
  $("restart-paused-btn").addEventListener("click",startFlight);
  $("resume-btn").addEventListener("click",resumeFlight);
  ui.pauseBtn.addEventListener("click",pauseFlight);
  $("audit-btn").addEventListener("click",exportAudit);
  addEventListener("keydown",e=>{
    if(["Space","ArrowUp","ArrowLeft","ArrowRight","KeyA","KeyD"].includes(e.code))e.preventDefault();
    if(e.code==="Space"&&!e.repeat){input.jumpHeld=true;jump();}
    if(e.code==="Escape"||e.code==="KeyP") {
      if(state.mode==="playing")pauseFlight();
      else if(state.mode==="paused")resumeFlight();
    }
    if(e.code==="Enter"&&state.mode==="menu")startFlight();
    input.keys.add(e.code);
  });
  addEventListener("keyup",e=>{
    input.keys.delete(e.code);if(e.code==="Space")input.jumpHeld=false;
  });
  const releaseJump=()=>{input.jumpHeld=false;ui.jump.classList.remove("held");};
  ui.jump.addEventListener("pointerdown",e=>{
    e.preventDefault();ui.jump.setPointerCapture(e.pointerId);
    input.jumpHeld=true;ui.jump.classList.add("held");jump();
  });
  ui.jump.addEventListener("pointerup",releaseJump);
  ui.jump.addEventListener("pointercancel",releaseJump);
  ui.jump.addEventListener("lostpointercapture",releaseJump);
  function moveStick(e) {
    const rect=ui.stick.getBoundingClientRect();
    input.stick=clamp((e.clientX-(rect.left+rect.width/2))/59,-1,1);
    ui.stickKnob.style.transform="translateX("+(input.stick*49).toFixed(1)+"px)";
  }
  function releaseStick(e) {
    if(stickPointer!==e.pointerId)return;
    stickPointer=null;input.stick=0;ui.stickKnob.style.transform="translateX(0px)";
  }
  ui.stick.addEventListener("pointerdown",e=>{
    e.preventDefault();stickPointer=e.pointerId;
    ui.stick.setPointerCapture(e.pointerId);moveStick(e);
  });
  ui.stick.addEventListener("pointermove",e=>{if(e.pointerId===stickPointer)moveStick(e);});
  ui.stick.addEventListener("pointerup",releaseStick);
  ui.stick.addEventListener("pointercancel",releaseStick);
  ui.stick.addEventListener("lostpointercapture",releaseStick);
  addEventListener("blur",()=>{if(state.mode==="playing")pauseFlight();});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&state.mode==="playing")pauseFlight();
  });
}
try {
  initGraphics();bindControls();reset("menu");requestAnimationFrame(frame);
} catch(error) {
  console.error("SKYSHIFT startup failed",error);
  ui.error.classList.remove("hidden");
  ui.error.textContent="Couldn't start SKYSHIFT 3D. Please use a browser with WebGL enabled. "+(error?.message||"");
}
