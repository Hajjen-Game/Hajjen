import * as THREE from "three";
import {
 TRIAL,COURSE_SEGMENTS,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,ARCHES,CHECKPOINTS,SECTORS,ROAD_CUES,poseAt,positionAt,headingAt,curvatureAt,bankAt,bankDegreesAt,surfaceHeightAt,surfaceNormalAt,
 heightAt,widthAt,roadIntervals,onRoad,sectorAt,speedAt,nextGap,
 newFlightState,stepFlight,clamp,lerp
} from "./trial-v0494.mjs";
import { BOOST_PADS,BOOST_CONFIG } from "./boost-v0494.mjs";
import { createPremiumDeckGeometry,createPremiumTrackMaterial,PREMIUM_TRACK } from "./premium-track-v0496.mjs";
import {ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave,frontPaletteBlend,waveResonanceStrength,spectralChargeStrength,horizonWaveCue} from "./zone-wave-v0493.mjs";
import {buildMantaBlade,MANTA_IDENTITY,ENGINE_SOCKETS} from "./manta-blade-v0484.mjs";
import { makeFullscreenController } from "./fullscreen-v02.mjs";
import { createTwinEngineFX,ENGINE_TRAIL_SPEC } from "./engine-trails-v0496.mjs";
import { createNeonPipeline,createNeonKit,NEON_TUNING } from "./neon-v043.mjs";
import { MESH_SPEC } from "./smooth-track-v049.mjs";
import {
  PACING,capturePose,interpolatePose,shouldSnapPose,
  createFrameClock,advanceFrame,createFrameMonitor,observeFrame,monitorSummary,
  createAdaptiveQuality,nextAdaptiveRatio
} from "./frame-pacing-v044.mjs";
import { MOTION_DEFAULTS,createFlightMotionState,stepFlightMotion } from "./flight-motion-v044.mjs";
import { CINEMATIC_DEFAULTS,createCinematicState,turnPreview,stepCinematic,chasePose,cinematicFov,engineLightFactor } from "./cinematic-v045.mjs";
import {BOOST_SPRING,createBoostSpringState,triggerBoostSpring,stepBoostSpring,boostFovTarget,boostFovResponse} from "./boost-spring-v0495.mjs";
import {VELOCITY_SPEC,createVelocityState,igniteVelocity,stepVelocityState} from "./velocity-language-v0496.mjs";
import { installAeroBarriers,AERO_BARRIER } from "./aero-barrier-v0497.mjs";
import { installSpaceBackdrop } from "./space-v0496.mjs";
import { createContactShadow } from "./ship-v034.mjs";
import { LUMINANCE,validateLuminance } from "./luminance-v0331.mjs";
if(validateLuminance().length)throw new Error("Invalid SKYSHIFT atmosphere balance");

const $=id=>document.getElementById(id);
const UI={
 canvas:$("game"),start:$("start-btn"),retry:$("retry-btn"),
 menu:$("menu"),end:$("end-screen"),pause:$("pause-screen"),
 resume:$("resume-btn"),restart:$("restart-paused-btn"),
 pauseBtn:$("pause-btn"),hud:$("hud"),controls:$("mobile-controls"),
 shieldFill:$("shield-fill"),shieldText:$("shield-text"),
 progress:$("zone-progress-fill"),sector:$("zone-number"),
 sectorName:$("sector-name"),distance:$("distance"),speed:$("speed"),
 flight:$("flight-state"),toast:$("toast"),banner:$("zone-banner"),
 bannerNum:$("zone-banner-number"),bannerName:$("zone-banner-name"),
 flash:$("zone-flash"),stick:$("stick"),knob:$("stick-knob"),
 jump:$("jump-btn"),error:$("error"),finalTitle:$("final-title"),
 finalDistance:$("final-distance"),finalSector:$("final-zone"),
 finalBest:$("personal-best"),finalTime:$("flight-time"),
 finalJumps:$("final-jumps"),finalStyle:$("final-style"),export:$("audit-btn"),
 raceLabel:$("trial-label"),
 fullscreen:$("fullscreen-btn"),menuFullscreen:$("menu-fullscreen-btn"),
 fullscreenHelp:$("fullscreen-help")
};
// A single wavefront palette for the entire *world* behind the boundary.
const COLOR=ZONE_PALETTES.map(p=>({
 color:p.light,sky:p.sky,fog:p.fog,name:p.name
}));
const themes=COLOR.map(p=>({
  ...p,skyColor:new THREE.Color(p.sky),fogColor:new THREE.Color(p.fog),
  accent:new THREE.Color(p.color)
}));
const targetSky=new THREE.Color(),targetFog=new THREE.Color(),
 targetAccent=new THREE.Color();
const SPECTRAL_WHITE=new THREE.Color(0xf5fbff);
const uiState={mode:"menu",inputX:0,jumpPressed:false,jumpHeld:false,stickPointer:null,
 keys:new Set(),bannerTimeout:null,toastTimeout:null,trackHint:-1};
const worldClock={last:performance.now(),accum:0};
let scene,camera,renderer,world,ship,shipGlow,shipShade,roadMat,edgeMat,flight;
let neonKit,neonPipeline,engineLights=[],engineCore,enginePlumes=[],identitySurface,premiumSurface,spaceBackdrop;
let cameraLook=new THREE.Vector3(),shadowMesh,premiumFX;
let perfFrames=0,perfTotal=0,perfMin=200;
let renderSamples=0,renderCallTotal=0,renderCallPeak=0,triangleTotal=0;
let frameClock=createFrameClock(),frameMonitor=createFrameMonitor();
let adaptiveQuality=createAdaptiveQuality(),currentRenderPose=null,previousRenderPose=null;
let frameBlend=0;
let motionState=createFlightMotionState(),cinematicState=createCinematicState(),boostSpring=createBoostSpringState(),velocityState=createVelocityState();
const flightTuning={...MOTION_DEFAULTS};
const cinematicTuning={...CINEMATIC_DEFAULTS};
const CAMERA_INFO={},CAMERA_VIEW={worldX:0,worldZ:0,y:0,steering:0,clearance:0};
const CAMERA_BASE_POSITION=new THREE.Vector3();
const CAMERA_TARGET_POSITION=new THREE.Vector3();
const CAMERA_TARGET_LOOK=new THREE.Vector3();
const telemetry=[];
let previousSector=0,sceneReady=false,fullscreenController=null,lastRailLog=0;
let zoneWave=newZoneWaveState();
let waveSmokeHold=false;
const SHADOW_NORMAL=new THREE.Vector3(),SHADOW_PLANE_NORMAL=new THREE.Vector3(0,0,1);

function bestForTrial(){
 try{return Number(localStorage.getItem("skyshift-zone-wave-best-v049"))||0;}
 catch{return 0;}
}
function saveBest(time){
 try{localStorage.setItem("skyshift-zone-wave-best-v049",String(time));}catch{}
}
function flashToast(message,time=1350){
 UI.toast.textContent=message;UI.toast.classList.remove("hidden");
 clearTimeout(uiState.toastTimeout);
 uiState.toastTimeout=setTimeout(()=>UI.toast.classList.add("hidden"),time);
}
function event(kind,properties={}){
 telemetry.push({type:kind,s:Math.round(flight.s),t:+flight.elapsed.toFixed(3),...properties});
}
function addQuad(points,colors,a,b,c,d,tint){
 for(const p of [a,b,c,a,c,d]){
   points.push(p.x,p.y,p.z);
   if(colors)colors.push(tint.r,tint.g,tint.b);
 }
}
function toVec(s,lateral,offset=0){
 const p=positionAt(s,lateral,offset);
 return new THREE.Vector3(p.x,p.y,p.z);
}
function buildGeometry(points,colors=null){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
 if(colors)geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 return geo;
}
function buildRoad(){
 // The roadway TOP is one contiguous indexed mesh with shared vertex normals.
 // Vertical wall facades remain separate so road edge lighting stays crisp.
 const walls=[],wallColors=[],jumpMarks=[],padFaces=[];
 const boundaries=GEOMETRY_BREAKS;
 const tintSide=new THREE.Color(0x091222);
 for(let k=0;k<boundaries.length-1;k++){
   let from=boundaries[k],to=boundaries[k+1];
   for(let d=from;d<to-.001;d+=.8) {
     const e=Math.min(to,d+.8),mid=(d+e)*.5;
     const intervals=roadIntervals(mid);
     for(const [a,b] of intervals) {
       const p1=toVec(d,a),p2=toVec(d,b),p3=toVec(e,b),p4=toVec(e,a);
       const drop=new THREE.Vector3(0,-1.05,0);
       addQuad(walls,wallColors,p1.clone().add(drop),p1,p4,p4.clone().add(drop),tintSide);
       addQuad(walls,wallColors,p2,p2.clone().add(drop),p3.clone().add(drop),p3,tintSide);
       // The v0.4.7 faceted armor is a separate continuous swept mesh.
       // No redundant neon skirt/border stripe along the deck sides.
     }
     // Long racing guides are now part of the unified road material.
     // Runway paint in the last metres before each mandatory jump.
     for(const gap of GAPS)if(mid>=gap.start-17&&mid<gap.start-.8){
       const band=(Math.floor((gap.start-mid)/2.8)%2)===0;
       if(band){
         for(const [a,b] of intervals){
           for(const lateral of [a+(b-a)*.32,a+(b-a)*.68]){
             addQuad(jumpMarks,null,toVec(d,lateral-.38,.073),toVec(d,lateral+.38,.073),
               toVec(e,lateral+.38,.073),toVec(e,lateral-.38,.073));
           }
         }
       }
     }
   }
 }
 // The optional right-hand route gets its own readable advance markings.
 for(const cut of RISK_CUTS){
   for(let d=cut.start-12;d<cut.start-1;d+=1.4){
     const e=Math.min(cut.start-1,d+1.4);
     if(Math.floor((cut.start-d)/2.8)%2!==0)continue;
     for(const [a,b] of roadIntervals((d+e)*.5)){
       if(a<0)continue;
       const m=(a+b)*.5;
       addQuad(jumpMarks,null,toVec(d,m-.64,.084),toVec(d,m+.64,.084),
         toVec(e,m+.64,.084),toVec(e,m-.64,.084));
     }
   }
 }
 // Highlight each separate landing island at its front and rear edge.
 for(const gap of GAPS){
   for(const spot of [gap.start-1.0,gap.end+.2]){
     for(const [a,b] of roadIntervals(spot)){
       addQuad(padFaces,null,toVec(spot,a+.17,.085),toVec(spot,b-.17,.085),
         toVec(spot+.32,b-.17,.085),toVec(spot+.32,a+.17,.085));
     }
   }
 }
 roadMat=new THREE.MeshStandardMaterial({
   color:LUMINANCE.roadColor,vertexColors:true,
   metalness:LUMINANCE.roadMetalness,roughness:LUMINANCE.roadRoughness,
   emissive:LUMINANCE.roadEmissive,
   emissiveIntensity:LUMINANCE.roadEmissiveIntensity,
   side:THREE.DoubleSide
 });
 edgeMat=neonKit.edgeBody;
 premiumSurface=createPremiumTrackMaterial(THREE);
 const road=new THREE.Mesh(createPremiumDeckGeometry(THREE),premiumSurface.material);
 road.name="Zone Ribbon · integrated PBR racing deck";
 road.frustumCulled=false;world.add(road);
 const sidewalls=new THREE.Mesh(buildGeometry(walls,wallColors),roadMat);
 sidewalls.name="Deliberately hard-edged vertical road sides";
 sidewalls.frustumCulled=false;world.add(sidewalls);
 const gold=neonKit.warning;
 const jumps=new THREE.Mesh(buildGeometry(jumpMarks),gold);
 jumps.frustumCulled=false;world.add(jumps);
 const caps=new THREE.Mesh(buildGeometry(padFaces),neonKit.landing);
 caps.frustumCulled=false;world.add(caps);
}
function makeBillboard(text,s,height=6.7,scale=8,lateral=0){
 const canvas=document.createElement("canvas");
 canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext("2d");
 ctx.clearRect(0,0,512,128);
 ctx.font="900 58px Arial, sans-serif";ctx.textAlign="center";
 ctx.shadowColor="#55dffb";ctx.shadowBlur=20;ctx.fillStyle="#e6f8ff";
 ctx.fillText(text,256,78);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({
   map:texture,color:new THREE.Color(0xf1faff).multiplyScalar(1.10),
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
 });
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(scale,scale*.25),mat);
 const p=poseAt(s);
 const place=positionAt(s,lateral,height);
 sign.position.set(place.x,place.y,place.z);
 sign.rotation.y=-p.heading;
 world.add(sign);
 return sign;
}
function makeArch(s,label,color,wide=16){
 const group=new THREE.Group(),p=poseAt(s);
 group.position.set(p.x,p.y,p.z);group.rotation.y=-p.heading;
 const metal=new THREE.MeshStandardMaterial({color:0x15253c,metalness:.7,
   roughness:.35});
 const lightBody=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(NEON_TUNING.archBodyLuminance),
   toneMapped:false,side:THREE.DoubleSide});
 const lightCore=new THREE.MeshBasicMaterial({color:new THREE.Color(0xe9faff).multiplyScalar(NEON_TUNING.archCoreLuminance),
   toneMapped:false,side:THREE.DoubleSide});
 const halo=new THREE.MeshBasicMaterial({color,
   transparent:true,opacity:NEON_TUNING.archHaloOpacity,blending:THREE.AdditiveBlending,
   depthWrite:false,toneMapped:false});
 function buildBar(width,height,depth,x,y,z,material){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
   mesh.position.set(x,y,z);group.add(mesh);return mesh;
 }
 for(const side of [-1,1]){
   const x=side*(wide/2+.36);
   buildBar(.56,7.5,.83,x,3.75,0,metal);
   buildBar(.24,7.37,.88,x,3.75,-.25,halo);
   buildBar(.12,7.16,.89,x,3.75,-.30,lightBody);
   buildBar(.028,7.0,.92,x,3.75,-.33,lightCore);
 }
 buildBar(wide+1.25,.46,.85,0,7.5,0,metal);
 buildBar(wide+1.2,.25,.95,0,7.66,-.25,halo);
 buildBar(wide+1.15,.10,.91,0,7.67,-.32,lightBody);
 buildBar(wide+1.08,.026,.95,0,7.7,-.34,lightCore);
 world.add(group);
 if(label==="FINISH")makeBillboard(label,s,8.7,6.6);
}

function buildDecor(){
 // The invisible/visually noisy roadside beacons (four instanced pillar
 // layers every 18m) are removed completely, not merely hidden.
 // Keep only the authored FINISH arch; the raised rails and chevrons now
 // communicate every turn and carry the continuous spectral zone wave.
 for(const arch of ARCHES)if(arch.label==="FINISH")
  makeArch(arch.s,arch.label,arch.color,widthAt(arch.s)+.5);
}
function makeShip(){
  // Manta Blade silhouette: broad delta wings, open trailing scallop, twin inset thrust slots.
  // Never modify flight physics or existing engine feedback controllers here.
  shipGlow=neonKit.ship;
  const craft=buildMantaBlade(THREE,shipGlow);
  ship=craft.ship;
  engineCore=craft.engineCore;
  enginePlumes=craft.enginePlumes;
  // Replace dominant middle spotlight with two restrained exhaust pools.
  engineLights=ENGINE_SOCKETS.map((socket,i)=>{
    const light=new THREE.PointLight(
      0x43ddf0,NEON_TUNING.enginePointIntensity*.42,3.15,1.8);
    light.position.set(socket.x,socket.y-.33,socket.z+.03);
    light.name=i===0?"Port engine fill":"Starboard engine fill";
    ship.add(light);return light;
  });
  scene.add(ship);
  premiumFX=createTwinEngineFX(THREE,scene,ship,craft.materials.cyan);
  shadowMesh=createContactShadow(THREE,scene);
  UI.jump.classList.add("hidden");
}
function initScene(){
 scene=new THREE.Scene();
 scene.background=new THREE.Color(COLOR[0].sky);
 scene.fog=new THREE.FogExp2(COLOR[0].fog,LUMINANCE.fogDensity*.57);
 camera=new THREE.PerspectiveCamera(67,innerWidth/Math.max(1,innerHeight),.1,650);
 scene.add(camera);
 // Prefer a lower-memory context on older Android GPUs while retaining
 // full visual fidelity for the existing modern iPhone target.
 const limitedMemory=Number(navigator.deviceMemory)>0&&
   Number(navigator.deviceMemory)<=4;
 const options={canvas:UI.canvas,antialias:!limitedMemory,
  powerPreference:limitedMemory?"default":"high-performance"};
 try{
  renderer=new THREE.WebGLRenderer(options);
 }catch(primaryError){
  renderer=new THREE.WebGLRenderer({...options,
   antialias:false,powerPreference:"default"});
 }
 const safeDpr=limitedMemory?1.35:NEON_TUNING.maxPixelRatio;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,
  NEON_TUNING.maxPixelRatio,safeDpr));
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 // Sum renderer workload across all composer passes (last pass alone=1 call).
 renderer.info.autoReset=false;
 // Native canvas remains high fidelity; adaptive detail adjusts only the
 // internal HDR composer targets on sustained slow devices.
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=LUMINANCE.exposure;
 neonKit=createNeonKit(THREE);
 scene.add(new THREE.HemisphereLight(
   LUMINANCE.ambientSky,LUMINANCE.ambientGround,LUMINANCE.ambientIntensity
 ));
 const key=new THREE.DirectionalLight(0xb5d6ff,LUMINANCE.keyIntensity);
 key.position.set(12,28,18);scene.add(key);
 const edgeFill=new THREE.DirectionalLight(0xf87ac6,LUMINANCE.fillIntensity);
 edgeFill.position.set(-18,11,-22);scene.add(edgeFill);
 world=new THREE.Group();scene.add(world);
 buildRoad();
 identitySurface=installAeroBarriers(THREE,world);
 // Always retain white core and bloom. Disable only optional filaments
 // when navigator reports a low-memory device.
 const waveDetail=limitedMemory?"low":"high";
 premiumSurface?.setDetailMode(waveDetail);
 identitySurface?.setDetailMode(waveDetail);
  buildDecor();
 // Open space, no geological scenery, distant monuments or 3D floor.
 makeShip();
 spaceBackdrop=installSpaceBackdrop(THREE,camera);
 // HDR multilayer bloom renders *after* the beauty pass and before tone mapping.
 neonPipeline=createNeonPipeline(THREE,renderer,scene,camera);
 neonPipeline.resize(innerWidth,innerHeight);
 addEventListener("resize",resize);
 sceneReady=true;
}
function resize(){
 if(!renderer)return;
 const rect=UI.canvas.getBoundingClientRect();
 const width=Math.max(1,Math.round(rect.width||innerWidth));
 const height=Math.max(1,Math.round(rect.height||innerHeight));
 camera.aspect=width/height;camera.updateProjectionMatrix();
 renderer.setSize(width,height,false);
 neonPipeline?.resize(width,height);
}
function syncFullscreenUi(active){
 UI.fullscreen.setAttribute("aria-label",active?"Exit fullscreen":"Enter fullscreen");
 UI.fullscreen.setAttribute("aria-pressed",String(active));
 UI.fullscreen.title=active?"Exit fullscreen":"Fullscreen";
 UI.fullscreen.classList.toggle("active",active);
 UI.menuFullscreen.textContent=active?"⛶ EXIT FULLSCREEN":"⛶ FULLSCREEN";
 UI.menuFullscreen.setAttribute("aria-pressed",String(active));
 if(active)UI.fullscreenHelp.classList.add("hidden");
}
function fullscreenBlocked(){
 UI.fullscreenHelp.classList.remove("hidden");
 if(uiState.mode!=="menu")flashToast("FULLSCREEN BLOCKED · OPEN IN CHROME",2600);
}
function installFullscreen(){
 fullscreenController=makeFullscreenController({
   doc:document,root:$("app"),deviceScreen:screen,
   onChange:syncFullscreenUi,
   onBlocked:fullscreenBlocked,
   onResize:()=>{resize();requestAnimationFrame(resize);}
 });
 fullscreenController.sync();
}
function startImmersiveTrial(){
 // Must request fullscreen inside the originating user-gesture click.
 if(!fullscreenController.active())fullscreenController.request(true);
 enterPlaying();
}
function clearInput(){
 uiState.inputX=0;uiState.jumpPressed=false;uiState.jumpHeld=false;
 uiState.keys.clear();uiState.stickPointer=null;
 UI.knob.style.transform="translateX(0px)";
 UI.jump.classList.remove("held");
}
function resetFlight(){
 flight=newFlightState();previousSector=0;lastRailLog=0;
 zoneWave=newZoneWaveState();premiumSurface?.setWaveState(zoneWave);
 identitySurface?.setWaveState(zoneWave);
 scene?.background?.copy(themes[0].skyColor);
 scene?.fog?.color.copy(themes[0].fogColor);
 neonKit?.updateAccent(COLOR[0].color,1);
 motionState=createFlightMotionState(flight.heading);
 cinematicState=createCinematicState();
 boostSpring=createBoostSpringState();
 velocityState=createVelocityState();
 premiumSurface?.setVelocityFlow(0,0);
 identitySurface?.setVelocityFlow(0,0);
 spaceBackdrop?.setVelocityFlow(0);
 premiumFX?.reset();
 perfFrames=0;perfTotal=0;perfMin=200;
 renderSamples=0;renderCallTotal=0;renderCallPeak=0;triangleTotal=0;
 frameClock=createFrameClock();frameMonitor=createFrameMonitor();
 currentRenderPose=capturePose(flight);previousRenderPose=currentRenderPose;
 frameBlend=0;
 document.documentElement.style.setProperty("--neon","#43dff3");
 telemetry.length=0;uiState.trackHint=-1;clearInput();
 event("trial_start",{trial:TRIAL.id});
 UI.banner.classList.add("hidden");
 UI.flash.classList.remove("active");
 UI.toast.classList.add("hidden");
 UI.finalTitle.textContent="FLIGHT ENDED";
 // Place the camera at its new orbit at spawn to prevent startup swooping.
 const home=chasePose(flight,motionState,cinematicState,cinematicTuning,CAMERA_INFO);
 camera.position.set(home.x,home.y,home.z);
 CAMERA_BASE_POSITION.copy(camera.position);
 camera.fov=cinematicFov(TRIAL.startSpeed,TRIAL.startSpeed,cinematicTuning);
 camera.updateProjectionMatrix();
 cameraLook.set(home.lookX,home.lookY,home.lookZ);
 camera.lookAt(cameraLook);
 worldClock.last=performance.now();worldClock.accum=0;
}
function enterPlaying(){
 if(!sceneReady)return;
 resetFlight();uiState.mode="playing";
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.pause.classList.add("hidden");
 UI.hud.classList.remove("hidden");UI.controls.classList.remove("hidden");
 UI.pauseBtn.classList.remove("hidden");
 UI.fullscreen.classList.remove("hidden");
 refreshHud();
}
function pause(){
 if(uiState.mode!=="playing")return;
 uiState.mode="paused";clearInput();
 UI.pause.classList.remove("hidden");UI.pauseBtn.classList.add("hidden");
}
function resume(){
 if(uiState.mode!=="paused")return;
 uiState.mode="playing";UI.pause.classList.add("hidden");
 UI.pauseBtn.classList.remove("hidden");
 worldClock.last=performance.now();worldClock.accum=0;
}
function endRun(won){
 uiState.mode="ended";clearInput();
 UI.finalTitle.textContent=won?"EXTENDED CIRCUIT COMPLETE":"FLIGHT ENDED";
 UI.finalTitle.classList.toggle("success",won);
 UI.finalDistance.textContent=Math.floor(flight.s)+" M";
 UI.finalSector.textContent=String(zoneWave.playerStage+1).padStart(2,"0");
 UI.finalTime.textContent=Math.floor(flight.elapsed/60)+":"+
   String(Math.floor(flight.elapsed%60)).padStart(2,"0");
 UI.finalJumps.textContent=flight.peakYawRateDeg.toFixed(1)+"°/S";
 UI.finalStyle.textContent=flight.offRoadSeconds.toFixed(1)+" S";
 let best=bestForTrial();
 if(won && (!best||flight.elapsed<best)){saveBest(flight.elapsed);best=flight.elapsed;}
 UI.finalBest.textContent=best?best.toFixed(1)+" S":"—";
 event(won?"trial_clear":"trial_failed",{shield:flight.shield});
 UI.hud.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.end.classList.remove("hidden");
}
function announceSector(index){
 const palette=ZONE_PALETTES[index],color=palette.light;
 document.documentElement.style.setProperty("--neon","#"+color.toString(16).padStart(6,"0"));
 premiumFX?.onZone();
 if(index===0)return;
 UI.bannerNum.textContent=String(index+1).padStart(2,"0");
 UI.bannerName.textContent=palette.name;
 UI.banner.classList.remove("hidden");
 UI.banner.style.animation="none";void UI.banner.offsetWidth;UI.banner.style.animation="";
 // No screen flash: the physical wave already provides visual spectacle.
 UI.flash.classList.remove("active");
 clearTimeout(uiState.bannerTimeout);
 uiState.bannerTimeout=setTimeout(()=>UI.banner.classList.add("hidden"),1300);
 event("zone_passed",{stage:index,palette:palette.id,
  atMeters:+flight.s.toFixed(1)});
}
function refreshHud(){
 const sector=zoneWave.playerStage;
 UI.sector.textContent=String(sector+1).padStart(2,"0");
 UI.sectorName.textContent=ZONE_PALETTES[sector].name;
 UI.shieldFill.style.width=flight.shield+"%";
 UI.shieldText.textContent=flight.shield+"%";
 UI.distance.innerHTML=String(Math.floor(flight.s)).padStart(4,"0")+
   ' <small>/ '+TRIAL.length+' M</small>';
 // Compare with baseline handling-lab speed (22 m/s), not new speed.
 UI.speed.textContent="SPEED "+(flight.currentSpeed/22).toFixed(2)+"×";
 UI.progress.style.width=(flight.s/TRIAL.length*100).toFixed(1)+"%";
 const bank=bankDegreesAt(flight.s);
 UI.flight.textContent=!flight.grounded?"OFF TRACK":
   flight.boostMultiplier>1.08?"BOOST · +"+Math.round((flight.boostMultiplier-1)*100)+"%":
   Math.abs(bank)>1.5?
     (bank<0?"LEFT BANK ":"RIGHT BANK ")+Math.round(Math.abs(bank))+"°":
     "STRAIGHT · DIRECT CONTROL";
}
function maybeShowCue(){
 if(uiState.mode!=="playing")return;
 for(const hint of [
   {id:"left",start:68,end:72,text:"LEFT SWEEPER · HOLD YOUR LINE"},
   {id:"right",start:262,end:266,text:"RIGHT SWEEPER · SMOOTH INPUT"}
 ]){
   if(flight.s>=hint.start&&flight.s<hint.end&&
      uiState.trackHint!==hint.id){
     uiState.trackHint=hint.id;
     flashToast(hint.text,1700);
   }
 }
}
function integrate(dt){
 const keyRight=uiState.keys.has("ArrowRight")||uiState.keys.has("KeyD");
 const keyLeft=uiState.keys.has("ArrowLeft")||uiState.keys.has("KeyA");
 // Digital keys are scaled for predictable corner holding; analog touch
 // retains the complete range and fine control around zero.
 const keyboard=(keyRight?1:0)-(keyLeft?1:0);
 const steer=clamp(keyboard*.74+uiState.inputX,-1,1);
 const result=stepFlight(flight,dt,{steer});
 if(result.boostActivated){
  event("boost_activated",{pad:result.boostActivated,multiplier:BOOST_CONFIG.multiplier});
  triggerBoostSpring(boostSpring,speedAt(flight.s),BOOST_CONFIG.multiplier);
  igniteVelocity(velocityState);
  flashToast("BOOST ENGAGED · +40% SPEED",850);
 }
 if(flight.railContacts>lastRailLog){
   lastRailLog=flight.railContacts;
   event("guardrail_contact",{side:flight.lastRailSide,at:+flight.lateral.toFixed(2)});
 }
 uiState.jumpPressed=false;
 if(result.jumped){
   premiumFX?.onJump();
   event("jump",{lateral:+flight.lateral.toFixed(2)});
 }
 if(result.landed){
   const p=positionAt(flight.s,flight.lateral,0);
   premiumFX?.onLand({...p,heading:flight.heading});
   event("landing",{impact:+result.landImpact.toFixed(2)});
 }
 if(result.cleared)event("gap_cleared",{count:flight.clearedGaps.length});
 if(result.routeChoice)event("route_choice",{route:result.routeChoice});
 if(result.routeReward){
   event("risk_route_clear",{styleBonus:500});
   flashToast("RISK ROUTE CLEAR · +500 STYLE",1700);
 }
 if(result.crashed){
   event("fall",{at:Math.round(flight.lastCrashS),shield:flight.shield});
   flashToast("OFF TRACK · RETRY FROM CHECKPOINT",1350);
 }
 const wave=updateZoneWave(zoneWave,flight.elapsed,flight.s);
 for(const stage of wave.started)
  event("zone_wave_emitted",{stage,originMeters:+zoneWave.waves[stage-1].startS.toFixed(1)});
 if(wave.changed){previousSector=wave.stage;announceSector(wave.stage);}
 maybeShowCue();
 if(result.finished)endRun(true);
 else if(flight.failed)endRun(false);
}
function updatePalette(dt){
 premiumSurface?.setWaveState(zoneWave);
 identitySurface?.setWaveState(zoneWave);
 // The atmosphere follows the physical front spatially, not the HUD switch.
 const blend=frontPaletteBlend(zoneWave,flight.s);
 const before=themes[blend.from],after=themes[blend.to];
 targetSky.copy(before.skyColor).lerp(after.skyColor,blend.mix);
 targetFog.copy(before.fogColor).lerp(after.fogColor,blend.mix);
 targetAccent.copy(before.accent).lerp(after.accent,blend.mix);
 // World-light echo: restrained fog tint only, never a HUD-wide flash.
 const nearHorizon=horizonWaveCue(zoneWave,flight.s);
 const resonance=waveResonanceStrength(zoneWave,flight.elapsed);
 targetFog.lerp(SPECTRAL_WHITE,nearHorizon*.038+resonance*.018);
 const k=1-Math.exp(-dt*4.2);
 scene.background.lerp(targetSky,k);
 scene.fog.color.lerp(targetFog,k);
 neonKit.updateAccent(targetAccent,k);
 // Rail lighting samples its own track coordinate inside its shader.
 for(const light of engineLights)light.color.copy(neonKit.worldAccent);
}
function placeShip(time,dt,view=flight,motion=motionState,cinematic=cinematicState){
 // True world-space heading remains pilot-owned. Body pose is visual-only.
 const ground=surfaceHeightAt(view.s,view.lateral);
 const clearance=view.y+motion.hover-TRIAL.hoverHeight-ground;
 const solid=onRoad(view.s,view.lateral);
 ship.position.set(view.worldX,view.y+motion.hover,view.worldZ);
 // Tiny reaction of the rendered hull only; physical pilot position,
 // bank, collision and camera target remain completely unchanged.
 ship.position.x-=Math.sin(view.heading)*velocityState.recoilMeters;
 ship.position.z+=Math.cos(view.heading)*velocityState.recoilMeters;
 // Cosmetic nose alignment <2 degrees; authoritative world yaw unchanged.
 ship.rotation.y=-view.heading+cinematic.noseYaw;
 ship.rotation.z=motion.roll;
 ship.rotation.x=motion.pitch+velocityState.pitchRadians;
 const crossingPulse=waveResonanceStrength(zoneWave,flight.elapsed);
 const charge=spectralChargeStrength(flight.elapsed);
 // Reuse two wing engine lights for a subtle neutral-white crest crossing.
 for(const light of engineLights)
  light.color.lerp(SPECTRAL_WHITE,crossingPulse*.30);
 for(const light of engineLights)light.intensity=
   NEON_TUNING.enginePointIntensity*.42*engineLightFactor(cinematic)*
   (1+velocityState.engineFlow*.60+velocityState.ignition*.20)*
   (1+.22*crossingPulse+.07*charge);
 if(engineCore)engineCore.scale.z=1+cinematic.engineEnergy*.16+
  velocityState.engineFlow*.34+velocityState.ignition*.10;
 for(let i=0;i<enginePlumes.length;i++){
   const sign=i===0?-1:1;
   const pulse=.028*Math.sin(time*21+i*1.4);
   const boost=clamp((flight.boostMultiplier-1)/(BOOST_CONFIG.multiplier-1),0,1);
   const shape=1+.065*cinematic.engineEnergy+boost*.10+
    velocityState.engineFlow*.16+velocityState.ignition*.09+pulse+
    crossingPulse*.10+charge*.035;
   const bankVariation=sign*clamp(view.steering,-1,1)*.035;
   // Exhaust cylinder axis is local Y. Animate the radius (X/Z).
   enginePlumes[i].scale.set(shape+bankVariation,
    1+boost*.10+velocityState.engineFlow*.12,shape);
 }
 if(shadowMesh){
   shadowMesh.visible=solid&&clearance<4.2;
   if(shadowMesh.visible){
     const contact=positionAt(view.s,view.lateral,.032);
     shadowMesh.position.set(contact.x,contact.y,contact.z);
     const normal=surfaceNormalAt(view.s);
     SHADOW_NORMAL.set(normal.x,normal.y,normal.z);
     shadowMesh.quaternion.setFromUnitVectors(SHADOW_PLANE_NORMAL,SHADOW_NORMAL);
     shadowMesh.material.opacity=clamp(.62-Math.max(0,clearance)*.16,0,.62);
   }
 }
 // Low/close chase camera with bounded future curvature preview.
 // Camera POSITION follows pilot heading; only LOOK target anticipates a corner.
 CAMERA_VIEW.worldX=view.worldX;CAMERA_VIEW.worldZ=view.worldZ;
 CAMERA_VIEW.y=view.y;CAMERA_VIEW.steering=view.steering;
 CAMERA_VIEW.clearance=clearance;
 const framing=chasePose(CAMERA_VIEW,motion,cinematic,cinematicTuning,CAMERA_INFO);
 CAMERA_TARGET_POSITION.set(framing.x,framing.y,framing.z);
 CAMERA_TARGET_LOOK.set(framing.lookX,framing.lookY,framing.lookZ);
 // The underlying chase camera stays responsive in curves. The boost
 // contributes only a separate critically-damped forward-axis offset.
 // This avoids the old slow/fast response switch and the 10m position snap.
 const follow=1-Math.exp(-dt*cinematicTuning.cameraFollowResponse);
 CAMERA_BASE_POSITION.lerp(CAMERA_TARGET_POSITION,follow);
 cameraLook.lerp(CAMERA_TARGET_LOOK,follow);
 const physicalExtraSpeed=speedAt(flight.s)*Math.max(0,flight.boostMultiplier-1);
 const lag=stepBoostSpring(boostSpring,
  uiState.mode==="playing"?dt:0,physicalExtraSpeed);
 camera.position.copy(CAMERA_BASE_POSITION);
 camera.position.x-=Math.sin(motion.cameraHeading)*lag;
 camera.position.z+=Math.cos(motion.cameraHeading)*lag;
 camera.lookAt(cameraLook);
 camera.rotateZ(motion.cameraRoll);
 const baseFov=cinematicFov(flight.currentSpeed,TRIAL.startSpeed,cinematicTuning);
 const targetFov=boostFovTarget(baseFov,flight.boostMultiplier,BOOST_CONFIG.multiplier);
 const fovResponse=boostFovResponse(camera.fov,targetFov);
 camera.fov=lerp(camera.fov,targetFov,1-Math.exp(-dt*fovResponse));
 boostSpring.peakFovBonusDegrees=Math.max(boostSpring.peakFovBonusDegrees,
  camera.fov-baseFov);
 cinematic.maxCameraLateralMeters=Math.max(cinematic.maxCameraLateralMeters,Math.abs(framing.sideOffsetMeters));
 camera.updateProjectionMatrix();
}
function loop(now){
 requestAnimationFrame(loop);
 const rawDt=Math.max(0,(now-worldClock.last)/1000);
 const dt=Math.min(.095,rawDt);
 worldClock.last=now;
 if(uiState.mode==="playing"&&!waveSmokeHold){
   const tick=advanceFrame(frameClock,rawDt,step=>{
     previousRenderPose=currentRenderPose||capturePose(flight);
     integrate(step);
     const next=capturePose(flight);
     if(shouldSnapPose(previousRenderPose,next))
       previousRenderPose=next;
     currentRenderPose=next;
   });
   frameBlend=tick.alpha;
   refreshHud();
 }
 if(flight){
   const presentationDt=uiState.mode==="playing"?dt:0;
   stepVelocityState(velocityState,presentationDt,flight.currentSpeed,
    speedAt(flight.s),flight.boostMultiplier);
   premiumSurface?.setVelocityFlow(velocityState.worldFlow,velocityState.flowPhaseMeters);
   identitySurface?.setVelocityFlow(velocityState.worldFlow,velocityState.flowPhaseMeters);
   spaceBackdrop?.setVelocityFlow(velocityState.worldFlow);
   updatePalette(dt);
   const view=uiState.mode==="playing"&&currentRenderPose?
     interpolatePose(previousRenderPose,currentRenderPose,frameBlend):flight;
   // Flight motion sees the same interpolated 120Hz simulation pose as FX.
   stepFlightMotion(motionState,
     {...view,trackBank:bankAt(view.s)},
     uiState.mode==="playing"?dt:0,now/1000,flightTuning);
   // Track preview affects framing only, never yaw/position of the craft.
   const upcoming=Math.min(TRIAL.length,view.s+cinematicTuning.previewMeters);
   const lookBias=turnPreview(headingAt(view.s),headingAt(upcoming),cinematicTuning);
   stepCinematic(cinematicState,view,lookBias,uiState.mode==="playing"?dt:0,cinematicTuning);
   placeShip(now/1000,dt,view,motionState,cinematicState);
   premiumFX?.frame({
     dt,playing:uiState.mode==="playing",
     flight:{...flight,...view,forwardSpeed:flight.currentSpeed},poseAt,positionAt,
     ship,shipGlow,sectorColor:COLOR[zoneWave.playerStage].color,
     motionWeight:cinematicState,velocity:velocityState
   });
 }
 // One renderer.info reset PER frame, preserving the sum of composer passes.
 renderer.info?.reset();
 const renderBegin=performance.now();
 if(neonPipeline)neonPipeline.render(dt);
 else renderer.render(scene,camera);
 const renderCpuMs=performance.now()-renderBegin;
 if(uiState.mode==="playing"&&renderer.info){
   const work=renderer.info.render;
   renderSamples++;
   renderCallTotal+=work.calls;renderCallPeak=Math.max(renderCallPeak,work.calls);
   triangleTotal+=work.triangles;
   observeFrame(frameMonitor,rawDt,renderCpuMs);
   // Start at full premium quality. Only sustained low frame pacing changes
   // internal bloom/scene buffer resolution; UI/canvas keep native DPR.
   const availableDpr=Math.min(devicePixelRatio||1,NEON_TUNING.maxPixelRatio);
   const nextRatio=nextAdaptiveRatio(
     adaptiveQuality,rawDt*1000,now,availableDpr
   );
   if(nextRatio!==null&&neonPipeline){
     neonPipeline.setInternalPixelRatio(nextRatio,innerWidth,innerHeight);
     event("adaptive_render_resolution",{ratio:+nextRatio.toFixed(2)});
   }
 }
}
function exportAudit(){
 const timing=monitorSummary(frameMonitor);
 const worstMs=frameMonitor.allFrameTimes.length?
    Math.max(...frameMonitor.allFrameTimes):null;
 const data={
   game:"SKYSHIFT",version:"0.4.9.7",trial:TRIAL.id,exportedAt:new Date().toISOString(),
   visual:{pipeline:"HDR UnrealBloom",tier:"Elevated Rails & Corner Readability 0.4.9.7",
     renderDpr:renderer.getPixelRatio(),
     internalHdrPixelRatio:neonPipeline?.internalPixelRatio,
     adaptiveQualityChanges:adaptiveQuality.changes,
     roadMeshType:"Single indexed top deck with shared vertex normals",
     roadLongitudinalStepMeters:MESH_SPEC.sampleStep,
     guardrails:{heightMeters:AERO_BARRIER.height,
       design:"Elevated continuous armor and bright directional chevrons",
       elevatedStraightHeightMeters:AERO_BARRIER.height,
       elevatedBendHeightMeters:AERO_BARRIER.bendHeightMeters,
       physicalColliderUnchanged:AERO_BARRIER.colliderUnchanged,
       physicsColliderHeightMeters:AERO_BARRIER.physicalColliderHeightMeters,
       arrowSpacingMeters:AERO_BARRIER.curveArrowPitchMeters,
       arrowCurvatureThreshold:AERO_BARRIER.arrowCurvatureThreshold,
       removedRoadsidePillars:true,
       roadsidePillarInstances:0,
       innerSweepMeters:AERO_BARRIER.innerSweepMeters,
       lightWidthMeters:identitySurface.accentWidthMeters,
       panelSeams:identitySurface.panelSeams,
       paletteReactive:true,
       railTriangles:identitySurface.railTriangles,
       surfaceTriangles:identitySurface.paintTriangles,
       batchCount:identitySurface.drawBatches,
       chevrons:identitySurface.chevrons,
       chevronAccentOnWave:true,
       shoulderMarks:identitySurface.shoulderMarks,
       accentAnchors:identitySurface.accentAnchors},
     sharedDeckNormals:true,
     shipIdentity:{name:MANTA_IDENTITY.name,
        hardEdgeProfile:MANTA_IDENTITY.hardEdgeProfile,
        twinThrustSockets:ENGINE_SOCKETS.map(s=>[s.x,s.y,s.z]),
        signatureSilhouette:MANTA_IDENTITY.type,
        wingLobes:MANTA_IDENTITY.wingLobes,
        aftThrusters:MANTA_IDENTITY.thrusters,
        openTrailingCenter:MANTA_IDENTITY.openTrailingCenter,
        visualBeamMeters:MANTA_IDENTITY.visualBeamMeters,
        extraDynamicLights:engineLights.length-1,
        geometryBudgetTriangles:MANTA_IDENTITY.maxGeometryTriangles,
        unchangedHandling:!MANTA_IDENTITY.changesFlightPhysics},
      engineTrails:{emitters:ENGINE_TRAIL_SPEC.emitters,
        geometryAttachedToShip:ENGINE_TRAIL_SPEC.attachedToShip,
        baseLengthMeters:ENGINE_TRAIL_SPEC.baseLengthMeters,
        maxBoostLengthMeters:ENGINE_TRAIL_SPEC.maxBoostLengthMeters,
        ...premiumFX?.stats()},
      trackSpine:{segmented:PREMIUM_TRACK.centerSpineEnabled,
        periodMeters:PREMIUM_TRACK.spinePeriodMeters,
        segmentMeters:PREMIUM_TRACK.spineDashMeters,
        widthMeters:PREMIUM_TRACK.spineWidthMeters,
        contrast:PREMIUM_TRACK.spineContrast,
        emissive:PREMIUM_TRACK.spineEmissive},
      zoneSurface:{version:PREMIUM_TRACK.version,material:PREMIUM_TRACK.material,
        waveDirection:ZONE_WAVE.direction,
        waveLaunchSeconds:[...ZONE_WAVE.triggers],
        waveFrontsMeters:zoneWave.fronts.map(f=>+f.toFixed(2)),
        activatedStages:[...zoneWave.activatedStages],
        passedStages:[...zoneWave.passedStages],
        stageTransitionSeconds:[...zoneWave.stageTransitionSeconds],
        paletteNames:ZONE_PALETTES.map(p=>p.name),
        waveFeatherMeters:ZONE_WAVE.featherMeters,
        waveCrestMeters:ZONE_WAVE.crestMeters,
        whiteCoreMeters:ZONE_WAVE.whiteCoreMeters,
        whiteBloomMeters:ZONE_WAVE.whiteBloomMeters,
        whiteCoreEnergy:ZONE_WAVE.whiteCoreEnergy,
         whiteBloomEnergy:ZONE_WAVE.whiteBloomEnergy,
        filamentRangeMeters:ZONE_WAVE.filamentRangeMeters,
        lowTierFilamentsDisabled:PREMIUM_TRACK.lowGraphicsFilamentsDisabled,
        afterglowMeters:ZONE_WAVE.afterglowMeters,
        resonanceSeconds:ZONE_WAVE.resonanceSeconds,
        paletteSync:"Road and rail inlays use the same arc-length wave",
        spectralRenderPassesAdded:0,
        railDrawBatchesAdded:0,
       palette:PREMIUM_TRACK.palette,curveFollowingLines:PREMIUM_TRACK.curveFollowingLines,
       integratedBoostPads:PREMIUM_TRACK.boostPads,
       drawBatches:PREMIUM_TRACK.drawBatches,
       floatingDecalBatches:PREMIUM_TRACK.floatingDecalBatches,
       paletteReady:PREMIUM_TRACK.materialOnlyPalette,
       colorAnimation:PREMIUM_TRACK.colorAnimation,
       colors:{base:PREMIUM_TRACK.baseHex,band:PREMIUM_TRACK.sideBandHex,
        guides:PREMIUM_TRACK.guideHex,boost:PREMIUM_TRACK.boostHex}},
     surfaceAccents:identitySurface.plan.length,decorativePlates:0,
     worldFormations:0,worldLandmarks:0,
     spaceStars:spaceBackdrop.stars,spaceNebulae:spaceBackdrop.nebulae,
     rendererDrawCallsAverage:renderSamples?Math.round(renderCallTotal/renderSamples):null,
     rendererDrawCallsPeak:renderSamples?renderCallPeak:null,
     rendererTrianglesAverage:renderSamples?Math.round(triangleTotal/renderSamples):null,
     banking:"Physically banked roadway plus independently damped craft pose",
     flightMotion:"Pilot-owned yaw, critically damped visual bank pitch hover",
     flightTuning:{...flightTuning},cameraTuning:{...cinematicTuning},
     maxCameraPreviewDegrees:+cinematicState.maxPreviewDegrees.toFixed(2),
     maxCosmeticNoseYawDegrees:+cinematicState.maxNoseDegrees.toFixed(2),
     maxEngineResponse:+cinematicState.maxEngineEnergy.toFixed(3),
     maxCameraSideOffsetMeters:+cinematicState.maxCameraLateralMeters.toFixed(2),
      velocityLanguage:{boostActivations:velocityState.activations,
       peakRoadRailFlow:+velocityState.peakWorldFlow.toFixed(3),
       peakEngineFlow:+velocityState.peakEngineFlow.toFixed(3),
       peakHullRecoilMeters:+velocityState.peakRecoilMeters.toFixed(3),
       peakHullPitchDegrees:+velocityState.peakPitchDegrees.toFixed(3),
       flowPhaseMeters:+velocityState.flowPhaseMeters.toFixed(1),
       extraDrawCalls:VELOCITY_SPEC.extraDrawCalls,
       extraDynamicLights:VELOCITY_SPEC.extraDynamicLights,
       velocityReactiveRailAndRoad:true},
      cameraBoostSpring:{activations:boostSpring.activations,
       maxMeasuredLagMeters:+boostSpring.maxLagMeters.toFixed(2),
       springFrequencyPerSecond:BOOST_SPRING.frequencyPerSecond,
       lagEnvelopeMeters:BOOST_SPRING.maxVisualLagMeters,
       anticipatoryFraction:BOOST_SPRING.anticipatoryFraction,
       maxMeasuredFovBonusDegrees:+boostSpring.peakFovBonusDegrees.toFixed(2),
       targetFovBonusDegrees:BOOST_SPRING.extraFovDegrees,
       maxFovDegrees:BOOST_SPRING.maxFovDegrees},
     extraDrawCallsFromCameraAndEngine:0,
     maxVisualBankDegrees:+motionState.maxVisualBankDegrees.toFixed(1),
     maxVisualPitchDegrees:+motionState.maxVisualPitchDegrees.toFixed(1),
     maxHoverMeters:+motionState.maxHoverMeters.toFixed(3),
     maxBankDegrees:22,
     exposure:LUMINANCE.exposure,fogDensity:LUMINANCE.fogDensity,
     bloomStrength:NEON_TUNING.bloomStrength,
     bloomThreshold:NEON_TUNING.bloomThreshold},

   run:{
     status:flight.finished?"clear":"failed",distanceMeters:+flight.s.toFixed(1),
     durationSeconds:+flight.elapsed.toFixed(2),shield:flight.shield,
     jumps:flight.jumps,landings:flight.landings,falls:flight.falls,
     steerSeconds:+flight.steerSeconds.toFixed(2),
     steerReversals:flight.steerReversals,
     maxBankDegrees:+flight.peakBankDeg.toFixed(2),
      peakYawRateDegreesPerSecond:+flight.peakYawRateDeg.toFixed(2),
      maxLateralMeters:+flight.maxLateral.toFixed(2),
      steeringModel:"Damped speed-scaled yaw with neutral stabilization",
      speedMetersPerSecondStart:TRIAL.startSpeed,
      boostPadIds:BOOST_PADS.map(p=>p.id),
      boostActivations:flight.boostActivations,
      boostTriggeredPadIds:[...flight.boostActivatedIds],
      boostMaxMultiplier:+flight.peakBoostMultiplier.toFixed(3),
      boostActiveSeconds:+flight.boostActiveSeconds.toFixed(2),
      boostTravelMeters:+flight.boostDistanceMeters.toFixed(1),
      maxActualSpeedMetersPerSecond:+flight.peakSpeed.toFixed(2),
      speedMetersPerSecondEnd:TRIAL.endSpeed,
      speedMultiplierVs042:2,
      maxYawDegreesPerSecond:+(TRIAL.maxYawRate*180/Math.PI).toFixed(1),
      courseSegments:COURSE_SEGMENTS.length,
      curveCount:COURSE_SEGMENTS.filter(c=>c.type==="turn").length,
     maxHeadingErrorDegrees:+flight.maxHeadingErrorDeg.toFixed(1),
     averageHeadingErrorDegrees:flight.headingSamples?
       +(flight.totalHeadingError/flight.headingSamples).toFixed(1):null,
     offRoadSeconds:+flight.offRoadSeconds.toFixed(2),
     railContacts:flight.railContacts,
     railSeconds:+flight.railSeconds.toFixed(2),
     railMaxPenetrationMeters:+flight.railMaxPenetration.toFixed(3),
     manualSteering:true,
     routeChoice:flight.routeChoice,
     riskRouteStyleBonus:0,
     fpsAverage:timing.fpsAverage?Math.round(timing.fpsAverage):null,
     fpsMinimum:worstMs?Math.round(1000/worstMs):null,
     frameMsP95:timing.frameMsP95?+timing.frameMsP95.toFixed(1):null,
     frameMsP99:timing.frameMsP99?+timing.frameMsP99.toFixed(1):null,
     renderCpuAverageMs:timing.renderCpuAverageMs?
       +timing.renderCpuAverageMs.toFixed(2):null,
     renderCpuPeakMs:+timing.renderCpuPeakMs.toFixed(2),
     interpolationEnabled:true,
     physicsSteps:frameClock.totalSteps,
     maxPhysicsStepsPerFrame:frameClock.stepsPeak,
     droppedSimulationSeconds:+frameClock.droppedSeconds.toFixed(3),
     gapClears:[...flight.clearedGaps],failedJumpEdges:flight.failedJumps
   },events:telemetry
 };
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="skyshift-rails-v0497-audit.json";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
}
function installFlightTuningPanel(){
 // The regular mobile interface stays clean. Developers opt in with ?flightlab=1.
 if(new URLSearchParams(location.search).get("flightlab")!=="1")return;
 const panel=document.createElement("section");
 panel.setAttribute("aria-label","Flight Dynamics Lab");
 panel.style.cssText="position:fixed;top:42px;right:8px;z-index:2500;box-sizing:border-box;width:215px;max-height:75vh;overflow:auto;background:rgba(4,13,27,.93);color:#d9f6ff;padding:12px;border:1px solid #397084;border-radius:10px;font:12px system-ui;box-shadow:0 8px 20px #0009";
 const title=document.createElement("strong");
 title.textContent="FLIGHT LAB · 0.4.9.7";panel.appendChild(title);
 const fields=[
  ["pilotBankDegrees","Pilot bank","°",8,28,1],
  ["bankResponse","Turn-in","",8,23,1],
  ["bankRecovery","Bank recovery","",6,18,1],
  ["hoverTravelMeters","Hover travel"," m",0,.18,.01],
  ["cameraYawResponse","Camera yaw","",5,17,1],
  ["cameraFollowResponse","Camera follow","",6,18,1],
  ["cameraDistance","Camera distance"," m",11.5,16,.1],
  ["cameraHeight","Camera height"," m",6.2,10,.1],
  ["previewGain","Corner preview","",0,.4,.02],
  ["engineTurnGain","Engine weight","",0,.9,.05]
 ];
 for(const [key,label,unit,min,max,step] of fields){
   const row=document.createElement("label");row.style.cssText="display:block;margin-top:9px";
   const name=document.createElement("div");
   const value=document.createElement("span");value.style.cssText="float:right";
   const slider=document.createElement("input");
   slider.type="range";slider.min=min;slider.max=max;slider.step=step;
   const params=Object.hasOwn(cinematicTuning,key)?cinematicTuning:flightTuning;
  slider.value=String(params[key]);
   slider.style.cssText="display:block;width:100%;accent-color:#43ddf0";
   const display=()=>Number(params[key]).toFixed(step<1?2:0)+unit;
   name.textContent=label;value.textContent=display();name.appendChild(value);
   row.append(name,slider);panel.appendChild(row);
   slider.addEventListener("input",()=>{
     params[key]=Number(slider.value);value.textContent=display();
   });
 }
 document.body.appendChild(panel);
}
// Opt-in browser-only integration probe. It advances the actual fixed-flight
// clock past the first scheduled wave on a software-rendered CI machine that
// cannot reliably simulate ten seconds within ten wall-clock seconds.
// Production players never have this hook without ?waveSmoke=1.
function installWaveSmokeHook(){
 if(new URLSearchParams(location.search).get("waveSmoke")!=="1")return;
 window.__skyshiftWaveSmoke=(targetStage=1)=>{
  if(uiState.mode!=="playing")throw new Error("Wave smoke requires active run");
  if(!Number.isInteger(targetStage)||targetStage<1||targetStage>3)
   throw new Error("Invalid spectral smoke stage");
  // Deterministically place each successive physical crest just ahead of
  // the stationary craft under software WebGL. Actual play uses 120Hz ticks.
  for(let k=zoneWave.activeCount;k<targetStage;k++){
   const at=ZONE_WAVE.triggers[k],atS=flight.s;
   flight.elapsed=at;
   updateZoneWave(zoneWave,at,atS);
   // Cross front deliberately during bright white-core phase for screenshots.
   flight.elapsed=at+.792;
   const pass=updateZoneWave(zoneWave,at+.792,atS);
   if(!pass.changed||pass.stage!==k+1)
    throw new Error("Zone "+(k+2)+" did not pass craft");
   previousSector=pass.stage;announceSector(pass.stage);
  }
  waveSmokeHold=true; // CI-only freeze for honest white-core screenshots.
  premiumSurface?.setWaveState(zoneWave);
  identitySurface?.setWaveState(zoneWave);
  refreshHud();
  return {zone:zoneWave.playerStage+1,flightSeconds:flight.elapsed,
   playerS:flight.s,frontS:zoneWave.fronts[targetStage-1],
   launches:[...ZONE_WAVE.triggers],palette:ZONE_PALETTES[zoneWave.playerStage].id,
   featherMeters:ZONE_WAVE.featherMeters,
   railSynchronized:Boolean(identitySurface?.setWaveState),
   engineResonance:waveResonanceStrength(zoneWave,flight.elapsed),
    whiteCoreMeters:ZONE_WAVE.whiteCoreMeters,
    whiteCoreEnergy:ZONE_WAVE.whiteCoreEnergy,
     whiteBloomMeters:ZONE_WAVE.whiteBloomMeters,
     whiteBloomEnergy:ZONE_WAVE.whiteBloomEnergy};
 };
}
function installControls(){
 UI.start.addEventListener("click",startImmersiveTrial);
 UI.retry.addEventListener("click",startImmersiveTrial);
 UI.restart.addEventListener("click",enterPlaying);
 UI.resume.addEventListener("click",resume);
 UI.pauseBtn.addEventListener("click",pause);
 UI.fullscreen.addEventListener("click",()=>fullscreenController.toggle());
 UI.menuFullscreen.addEventListener("click",()=>fullscreenController.toggle());
 UI.export.addEventListener("click",exportAudit);
 addEventListener("keydown",e=>{
   if(["Space","ArrowUp","ArrowRight","ArrowLeft","KeyA","KeyD"].includes(e.code))
     e.preventDefault();
   if(e.code==="Space"&&!e.repeat && uiState.mode==="playing"){
     uiState.jumpPressed=true;uiState.jumpHeld=true;
   }
   if(e.code==="KeyP"||e.code==="Escape") {
     if(uiState.mode==="playing")pause();
     else if(uiState.mode==="paused")resume();
   }
   if(e.code==="Enter"&&uiState.mode==="menu")enterPlaying();
   uiState.keys.add(e.code);
 });
 addEventListener("keyup",e=>{
   uiState.keys.delete(e.code);
   if(e.code==="Space")uiState.jumpHeld=false;
 });
 function jumpRelease(){
   uiState.jumpHeld=false;UI.jump.classList.remove("held");
 }
 UI.jump.addEventListener("pointerdown",e=>{
   e.preventDefault();UI.jump.setPointerCapture(e.pointerId);
   uiState.jumpPressed=true;uiState.jumpHeld=true;
   UI.jump.classList.add("held");
 });
 UI.jump.addEventListener("pointerup",jumpRelease);
 UI.jump.addEventListener("pointercancel",jumpRelease);
 UI.jump.addEventListener("lostpointercapture",jumpRelease);
 function steer(e){
   const rect=UI.stick.getBoundingClientRect();
   uiState.inputX=clamp((e.clientX-(rect.left+rect.width*.5))/59,-1,1);
   UI.knob.style.transform="translateX("+(uiState.inputX*49).toFixed(1)+"px)";
 }
 function steerRelease(e){
   if(uiState.stickPointer!==e.pointerId)return;
   uiState.stickPointer=null;uiState.inputX=0;
   UI.knob.style.transform="translateX(0px)";
 }
 UI.stick.addEventListener("pointerdown",e=>{
   e.preventDefault();uiState.stickPointer=e.pointerId;
   UI.stick.setPointerCapture(e.pointerId);steer(e);
 });
 UI.stick.addEventListener("pointermove",e=>{
   if(e.pointerId===uiState.stickPointer)steer(e);
 });
 UI.stick.addEventListener("pointerup",steerRelease);
 UI.stick.addEventListener("pointercancel",steerRelease);
 UI.stick.addEventListener("lostpointercapture",steerRelease);
 addEventListener("blur",()=>{if(uiState.mode==="playing")pause();});
 document.addEventListener("visibilitychange",()=>{
   if(document.hidden&&uiState.mode==="playing")pause();
 });
}
try{
 // Wire the buttons before costly WebGL scene construction.
 installFullscreen();
 installControls();
 initScene();
 installFlightTuningPanel();
 resetFlight();
 installWaveSmokeHook();
 window.__skyshiftBootReady?.(enterPlaying);
 requestAnimationFrame(loop);
}catch(error){
 console.error("SKYSHIFT startup failed",error);
 window.__skyshiftBootFail?.(error);
 UI.error.classList.remove("hidden");
 UI.error.textContent="SKYSHIFT could not start: "+(error?.message||"Unknown startup error");
}
