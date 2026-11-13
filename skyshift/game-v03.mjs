import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {
 TRIAL,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,ARCHES,CHECKPOINTS,SECTORS,ROAD_CUES,poseAt,positionAt,
 heightAt,widthAt,roadIntervals,sectorAt,speedAt,nextGap,
 newFlightState,stepFlight,clamp,lerp
} from "./trial-v03.mjs";
import { makeFullscreenController } from "./fullscreen-v02.mjs";
import { createPremiumFlightFX } from "./premium-v03.mjs";

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
const COLOR=[
 {color:0x43ddf0,sky:0x081629,fog:0x10263a,name:"THE LAUNCH"},
 {color:0x9d83ff,sky:0x13152f,fog:0x1a2140,name:"SKYBREAK"},
 {color:0xff77ad,sky:0x1b132d,fog:0x251b36,name:"FINAL VELOCITY"}
];
const themes=COLOR.map(p=>({
  ...p,skyColor:new THREE.Color(p.sky),fogColor:new THREE.Color(p.fog),
  accent:new THREE.Color(p.color)
}));
const uiState={mode:"menu",inputX:0,jumpPressed:false,jumpHeld:false,stickPointer:null,
 keys:new Set(),bannerTimeout:null,toastTimeout:null,trackHint:-1};
const worldClock={last:performance.now(),accum:0};
let scene,camera,renderer,world,ship,shipGlow,shipShade,roadMat,edgeMat,flight;
let cameraLook=new THREE.Vector3(),shadowMesh,rockMesh,pylonMesh,premiumFX;
let perfFrames=0,perfTotal=0,perfMin=200;
const telemetry=[];
let previousSector=0,sceneReady=false,fullscreenController=null;
const reusable=new THREE.Object3D();

function bestForTrial(){
 try{return Number(localStorage.getItem("skyshift-first-flight-best-v03"))||0;}
 catch{return 0;}
}
function saveBest(time){
 try{localStorage.setItem("skyshift-first-flight-best-v03",String(time));}catch{}
}
function flashToast(message,time=1350){
 UI.toast.textContent=message;UI.toast.classList.remove("hidden");
 clearTimeout(uiState.toastTimeout);
 uiState.toastTimeout=setTimeout(()=>UI.toast.classList.add("hidden"),time);
}
function event(kind,properties={}){
 telemetry.push({type:kind,s:Math.round(flight.s),t:+flight.elapsed.toFixed(3),...properties});
}
function colorFor(s){
 const index=sectorAt(s),base=themes[index].accent;
 const color=new THREE.Color(base);
 if(index>0){
   const fade=clamp((s-SECTORS[index].s)/38,0,1);
   color.copy(themes[index-1].accent).lerp(base,fade);
 }
 return color;
}
function surfaceColor(s){
 const c=colorFor(s);
 const dark=new THREE.Color(0x364a68);
 return dark.lerp(c,.23).multiplyScalar((Math.floor(s/4)%2)? .91:1.09);
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
 const deck=[],colors=[],rim=[],jumpMarks=[],laneGuides=[],padFaces=[];
 const boundaries=GEOMETRY_BREAKS;
 const tintSide=new THREE.Color(0x0f1a2f);
 for(let k=0;k<boundaries.length-1;k++){
   let from=boundaries[k],to=boundaries[k+1];
   for(let d=from;d<to-.001;d+=.8) {
     const e=Math.min(to,d+.8),mid=(d+e)*.5;
     const intervals=roadIntervals(mid);
     for(const [a,b] of intervals) {
       const p1=toVec(d,a),p2=toVec(d,b),p3=toVec(e,b),p4=toVec(e,a);
       addQuad(deck,colors,p1,p2,p3,p4,surfaceColor(mid));
       const drop=new THREE.Vector3(0,-1.05,0);
       addQuad(deck,colors,p1.clone().add(drop),p1,p4,p4.clone().add(drop),tintSide);
       addQuad(deck,colors,p2,p2.clone().add(drop),p3.clone().add(drop),p3,tintSide);
       for(const off of [a+.10,b-.23]) {
         addQuad(rim,null,toVec(d,off,.048),toVec(d,off+.13,.048),
           toVec(e,off+.13,.048),toVec(e,off,.048));
       }
     }
     // A subtle dashed road centreline supports speed perception.
     if(intervals.length===1&&Math.floor(mid/5)%2===0&&intervals[0][0]<0&&intervals[0][1]>0) {
       addQuad(laneGuides,null,toVec(d,-.042,.051),toVec(d,.042,.051),
         toVec(e,.042,.051),toVec(e,-.042,.051));
     }
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
 roadMat=new THREE.MeshStandardMaterial({color:0xc4d9ed,vertexColors:true,
   metalness:.24,roughness:.49,emissive:0x0a1930,emissiveIntensity:.32,
   side:THREE.DoubleSide});
 edgeMat=new THREE.MeshBasicMaterial({color:COLOR[0].color,side:THREE.DoubleSide});
 const road=new THREE.Mesh(buildGeometry(deck,colors),roadMat);
 road.frustumCulled=false;world.add(road);
 const edge=new THREE.Mesh(buildGeometry(rim),edgeMat);
 edge.frustumCulled=false;world.add(edge);
 const gold=new THREE.MeshBasicMaterial({color:0xffcd78,side:THREE.DoubleSide});
 const jumps=new THREE.Mesh(buildGeometry(jumpMarks),gold);
 jumps.frustumCulled=false;world.add(jumps);
 const guides=new THREE.Mesh(buildGeometry(laneGuides),new THREE.MeshBasicMaterial({
   color:0xc3e6ff,transparent:true,opacity:.40,depthWrite:false,side:THREE.DoubleSide
 }));
 guides.frustumCulled=false;world.add(guides);
 const caps=new THREE.Mesh(buildGeometry(padFaces),
   new THREE.MeshBasicMaterial({color:0xb9eeff,transparent:true,opacity:.82,
     depthWrite:false,side:THREE.DoubleSide}));
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
 const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,
   depthWrite:false,side:THREE.DoubleSide});
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
 const mat=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
 const dark=new THREE.MeshStandardMaterial({color:0x1a3050,roughness:.65});
 for(const side of [-1,1]){
   const pillar=new THREE.Mesh(new THREE.BoxGeometry(.45,7.2,.75),dark);
   pillar.position.set(side*(wide/2+.4),3.5,0);group.add(pillar);
   const rail=new THREE.Mesh(new THREE.BoxGeometry(.16,7.1,.81),mat);
   rail.position.set(side*(wide/2+.42),3.5,-.2);group.add(rail);
 }
 const cross=new THREE.Mesh(new THREE.BoxGeometry(wide+1.2,.17,.8),mat);
 cross.position.y=7.02;group.add(cross);
 world.add(group);
 makeBillboard(label,s,8.2,13);
}
function buildDecor(){
 const cloudMat=new THREE.MeshStandardMaterial({
   color:0x152845,roughness:1,metalness:.04,flatShading:true
 });
 const cloudGeo=new THREE.CylinderGeometry(4.7,10.4,15.5,5);
 const rock=new THREE.InstancedMesh(cloudGeo,cloudMat,155);
 let seed=10923;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let i=0;
 for(let s=24;s<TRIAL.length-12;s+=20){
   for(const dir of [-1,1]){
     if(i>=155)break;
     const p=positionAt(s,dir*(29+rand()*28),-11-rand()*13);
     const h=.55+rand()*1.9;
     reusable.position.set(p.x,p.y,p.z);
     reusable.rotation.set(0,rand()*3,0);
     reusable.scale.set(.7+rand()*.9,h,1.0+rand()*.65);
     reusable.updateMatrix();rock.setMatrixAt(i++,reusable.matrix);
   }
 }
 rock.count=i;rock.instanceMatrix.needsUpdate=true;world.add(rock);rockMesh=rock;
 const beaconGeo=new THREE.BoxGeometry(.24,2.4,.26);
 const beaconMat=new THREE.MeshBasicMaterial({color:0x59cfe6});
 const beacon=new THREE.InstancedMesh(beaconGeo,beaconMat,210);
 i=0;
 for(let s=12;s<TRIAL.length-8;s+=18){
   if(!roadIntervals(s).length)continue;
   for(const dir of [-1,1]){
     const lanes=roadIntervals(s);
     const offset=dir<0?lanes[0][0]-1.0:lanes[lanes.length-1][1]+1.0;
     const p=positionAt(s,offset,.4);
     reusable.position.set(p.x,p.y,p.z);
     reusable.rotation.set(0,-poseAt(s).heading,0);
     reusable.scale.set(1,1,1);reusable.updateMatrix();
     beacon.setMatrixAt(i++,reusable.matrix);
   }
 }
 beacon.count=i;beacon.instanceMatrix.needsUpdate=true;world.add(beacon);pylonMesh=beacon;
 for(const arch of ARCHES)makeArch(arch.s,arch.label,arch.color,arch.s>1280?19:17);
 makeBillboard("SAFE",547,4.15,7,-4.3);
 makeBillboard("RISK",547,4.15,7,4.3);
}
function makeShip(){
 const hullMat=new THREE.MeshStandardMaterial({
   color:0xd5e9fa,metalness:.62,roughness:.29,flatShading:true,
   emissive:0x12334d,emissiveIntensity:.32,side:THREE.DoubleSide
 });
 const dark=new THREE.MeshStandardMaterial({color:0x142841,
   metalness:.74,roughness:.37,flatShading:true});
 const canopy=new THREE.MeshStandardMaterial({
   color:0x0b213d,metalness:.62,roughness:.25,
   emissive:0x17638a,emissiveIntensity:.7
 });
 shipGlow=new THREE.MeshBasicMaterial({color:COLOR[0].color});
 ship=new THREE.Group();
 const hull=new THREE.Mesh(new THREE.BoxGeometry(1.55,.52,3.85),hullMat);
 hull.position.y=.05;ship.add(hull);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.84,1.8,4),hullMat);
 tip.rotation.x=-Math.PI/2;tip.position.set(0,.05,-2.65);ship.add(tip);
 const glass=new THREE.Mesh(new THREE.BoxGeometry(.91,.3,1.36),canopy);
 glass.position.set(0,.48,-.47);ship.add(glass);
 for(const sign of [-1,1]){
   const verts=[
     sign*.64,.14,-1.2,sign*3.0,.02,.82,sign*2.47,.02,1.9,
     sign*.64,.14,-1.2,sign*2.47,.02,1.9,sign*.66,.16,1.14
   ];
   const geo=new THREE.BufferGeometry();
   geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
   geo.computeVertexNormals();
   ship.add(new THREE.Mesh(geo,hullMat));
   const intake=new THREE.Mesh(new THREE.BoxGeometry(.44,.26,1.4),dark);
   intake.position.set(sign*1.36,.14,.7);ship.add(intake);
   const engine=new THREE.Mesh(new THREE.BoxGeometry(.38,.18,.46),shipGlow);
   engine.position.set(sign*.76,-.11,2.1);ship.add(engine);
 }
 const engineCore=new THREE.Mesh(new THREE.BoxGeometry(.82,.13,.46),shipGlow);
 engineCore.position.set(0,-.08,2.06);ship.add(engineCore);
 const spine=new THREE.Mesh(new THREE.BoxGeometry(.28,.22,2.2),dark);
 spine.position.set(0,.42,.68);ship.add(spine);
 scene.add(ship);
 premiumFX=createPremiumFlightFX(THREE,scene);
 const shadowMat=new THREE.MeshBasicMaterial({
   color:0x49d7ef,transparent:true,opacity:.18,depthWrite:false
 });
 shadowMesh=new THREE.Mesh(new THREE.CircleGeometry(2.8,24),shadowMat);
 shadowMesh.rotation.x=-Math.PI/2;scene.add(shadowMesh);
}
function makeStars(){
 const vertices=[];let n=0x13442;
 const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 for(let k=0;k<530;k++)vertices.push((rand()-.5)*360,(rand()-.34)*150,-25-rand()*290);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
 camera.add(new THREE.Points(geo,new THREE.PointsMaterial({
   size:.45,color:0x99b9cf,transparent:true,opacity:.65,depthWrite:false
 })));
}
function initScene(){
 scene=new THREE.Scene();
 scene.background=new THREE.Color(COLOR[0].sky);
 scene.fog=new THREE.FogExp2(COLOR[0].fog,.008);
 camera=new THREE.PerspectiveCamera(67,innerWidth/Math.max(1,innerHeight),.1,650);
 scene.add(camera);
 renderer=new THREE.WebGLRenderer({canvas:UI.canvas,antialias:true,
   powerPreference:"high-performance"});
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,
   matchMedia("(pointer:coarse)").matches?1.35:1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.5;
 scene.add(new THREE.HemisphereLight(0xc5eaff,0x122134,2.7));
 const key=new THREE.DirectionalLight(0xa2ddff,2.7);
 key.position.set(12,28,18);scene.add(key);
 world=new THREE.Group();scene.add(world);
 buildRoad();buildDecor();makeShip();makeStars();
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
 flight=newFlightState();previousSector=0;
 premiumFX?.reset();
 perfFrames=0;perfTotal=0;perfMin=200;
 document.documentElement.style.setProperty("--neon","#43dff3");
 telemetry.length=0;uiState.trackHint=-1;clearInput();
 event("trial_start",{trial:TRIAL.id});
 UI.banner.classList.add("hidden");
 UI.flash.classList.remove("active");
 UI.toast.classList.add("hidden");
 UI.finalTitle.textContent="FLIGHT ENDED";
 // Initialize camera on authored track axis rather than on craft's X position.
 const behind=positionAt(0,0,10);
 const p=poseAt(0);
 camera.position.set(behind.x-p.forwardX*10,behind.y,behind.z-p.forwardZ*10);
 cameraLook.copy(toVec(36,0,1.4));
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
 UI.finalTitle.textContent=won?"TRIAL CLEAR":"FLIGHT ENDED";
 UI.finalTitle.classList.toggle("success",won);
 UI.finalDistance.textContent=Math.floor(flight.s)+" M";
 UI.finalSector.textContent=String(sectorAt(flight.s)+1).padStart(2,"0");
 UI.finalTime.textContent=Math.floor(flight.elapsed/60)+":"+
   String(Math.floor(flight.elapsed%60)).padStart(2,"0");
 UI.finalJumps.textContent=String(flight.jumps)+" / "+String(flight.clearedGaps.length);
 UI.finalStyle.textContent=flight.routeRewarded?"+500":"0";
 let best=bestForTrial();
 if(won && (!best||flight.elapsed<best)){saveBest(flight.elapsed);best=flight.elapsed;}
 UI.finalBest.textContent=best?best.toFixed(1)+" S":"—";
 event(won?"trial_clear":"trial_failed",{shield:flight.shield});
 UI.hud.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.end.classList.remove("hidden");
}
function announceSector(index){
 const sector=SECTORS[index];const color=COLOR[index].color;
 document.documentElement.style.setProperty("--neon","#"+color.toString(16).padStart(6,"0"));
 premiumFX?.onZone();
 if(index===0)return;
 UI.bannerNum.textContent=String(index+1).padStart(2,"0");
 UI.bannerName.textContent=sector.name;
 UI.banner.classList.remove("hidden");
 UI.banner.style.animation="none";void UI.banner.offsetWidth;UI.banner.style.animation="";
 UI.flash.classList.add("active");
 clearTimeout(uiState.bannerTimeout);
 uiState.bannerTimeout=setTimeout(()=>{
   UI.banner.classList.add("hidden");UI.flash.classList.remove("active");
 },1750);
 event("sector",{sector:sector.name});
}
function refreshHud(){
 const sector=sectorAt(flight.s);
 UI.sector.textContent=String(sector+1).padStart(2,"0");
 UI.sectorName.textContent=SECTORS[sector].name;
 UI.shieldFill.style.width=flight.shield+"%";
 UI.shieldText.textContent=flight.shield+"%";
 UI.distance.innerHTML=String(Math.floor(flight.s)).padStart(4,"0")+
   ' <small>/ '+TRIAL.length+' M</small>';
 UI.speed.textContent="SPEED "+(speedAt(flight.s)/TRIAL.startSpeed).toFixed(2)+"×";
 UI.progress.style.width=(flight.s/TRIAL.length*100).toFixed(1)+"%";
 UI.flight.textContent=flight.s>=545&&flight.s<=680?
   (flight.lateral>2.6?"RISK ROUTE":"SAFE ROUTE"):
   flight.grounded?"GLIDING":
   flight.vy>0?"AIRBORNE · RISING":"AIRBORNE · DESCENDING";
}
function maybeShowCue(){
 if(uiState.mode!=="playing")return;
 const gap=nextGap(flight.s);
 if(gap&&flight.s>=gap.start-28&&flight.s<gap.start-23 &&
   uiState.trackHint!==gap.id){
   uiState.trackHint=gap.id;
   flashToast(gap.kind==="island"?"SKY ISLAND · STEER AND JUMP":
     "GAP AHEAD · TIME YOUR JUMP",1350);
 }
 const risky=RISK_CUTS.find(c=>flight.s<c.start &&
   flight.s>=c.start-20&&flight.lateral>2.6&&
   uiState.trackHint!=="risk-"+c.start);
 if(risky){
   uiState.trackHint="risk-"+risky.start;
   flashToast("RISK LANE · JUMP AHEAD",1100);
 }
 const split=SPLITS[0];
 if(flight.s>=split.start-48&&flight.s<split.start-43 && uiState.trackHint!=="split"){
   uiState.trackHint="split";
   flashToast("LEFT SAFE  /  RIGHT RISK +500",1850);
 }
}
function integrate(dt){
 const keyRight=uiState.keys.has("ArrowRight")||uiState.keys.has("KeyD");
 const keyLeft=uiState.keys.has("ArrowLeft")||uiState.keys.has("KeyA");
 const steer=clamp((keyRight?1:0)-(keyLeft?1:0)+uiState.inputX,-1,1);
 const result=stepFlight(flight,dt,{
   steer,jumpPressed:uiState.jumpPressed,
   jumpHeld:uiState.jumpHeld
 });
 uiState.jumpPressed=false;
 if(result.jumped){
   premiumFX?.onJump();
   event("jump",{lateral:+flight.lateral.toFixed(2)});
 }
 if(result.landed){
   const p=positionAt(flight.s,flight.lateral,0);
   premiumFX?.onLand({...p,heading:poseAt(flight.s).heading});
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
   flashToast("SKYSHIELD -35 · CHECKPOINT",1350);
 }
 const sector=sectorAt(flight.s);
 if(sector!==previousSector){previousSector=sector;announceSector(sector);}
 maybeShowCue();
 if(result.finished)endRun(true);
 else if(flight.failed)endRun(false);
}
function updatePalette(dt){
 const index=sectorAt(flight.s),palette=themes[index],k=1-Math.exp(-dt*1.1);
 scene.background.lerp(palette.skyColor,k);
 scene.fog.color.lerp(palette.fogColor,k);
 edgeMat.color.lerp(palette.accent,k);
 shipGlow.color.lerp(palette.accent,k);
 if(pylonMesh)pylonMesh.material.color.lerp(palette.accent,k);
}
function placeShip(time,dt){
 const p=positionAt(flight.s,flight.lateral,0);
 const heading=poseAt(flight.s).heading;
 ship.position.set(p.x,flight.y+Math.sin(time*4.2)*.028,p.z);
 ship.rotation.y=-heading;
 // Bank with sideways velocity, not world-space lateral drift.
 ship.rotation.z=lerp(ship.rotation.z,-flight.sideVelocity*.018,1-Math.exp(-dt*8));
 ship.rotation.x=lerp(ship.rotation.x,clamp(flight.vy/28,-.19,.21),1-Math.exp(-dt*7));
 
 if(shadowMesh){
   shadowMesh.visible=flight.y-heightAt(flight.s)<8;
   shadowMesh.position.set(p.x,heightAt(flight.s)+.055,p.z);
   shadowMesh.material.opacity=clamp(.18-(flight.y-heightAt(flight.s)-1)*.023,0,.18);
 }
 // Camera is track-relative with look ahead; lateral follow is deliberately weak.
 // Player can visibly move left/right within the screen instead of being locked at centre.
 const behindS=Math.max(0,flight.s-15);
 const back=poseAt(behindS);
 const lateralCamera=flight.lateral*.10;
 const airHeight=Math.max(0,flight.y-heightAt(flight.s)-TRIAL.hoverHeight);
 const cameraPos=positionAt(behindS,lateralCamera,9.2+airHeight*.13);
 if(flight.s<15){
   const delta=15-flight.s;
   cameraPos.x-=back.forwardX*delta;
   cameraPos.z-=back.forwardZ*delta;
 }
 const ahead=positionAt(Math.min(TRIAL.length,flight.s+33),flight.lateral*.12,1.25);
 const smoothPosition=1-Math.exp(-dt*4.0);
 const smoothLook=1-Math.exp(-dt*4.5);
 camera.position.lerp(new THREE.Vector3(cameraPos.x,cameraPos.y,cameraPos.z),smoothPosition);
 cameraLook.lerp(new THREE.Vector3(ahead.x,ahead.y,ahead.z),smoothLook);
 camera.lookAt(cameraLook);
 const targetFov=66+Math.min(5,(speedAt(flight.s)-TRIAL.startSpeed)*.9);
 camera.fov=lerp(camera.fov,targetFov,1-Math.exp(-dt*2));
 camera.updateProjectionMatrix();
}
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,Math.max(0,(now-worldClock.last)/1000));
 worldClock.last=now;
 if(uiState.mode==="playing"){
   if(dt>0&&dt<.17){perfFrames++;perfTotal+=1/dt;perfMin=Math.min(perfMin,1/dt);}
   worldClock.accum+=dt;
   let count=0;
   while(worldClock.accum>=1/120 && count<7 && uiState.mode==="playing"){
     integrate(1/120);worldClock.accum-=1/120;count++;
   }
   if(count>=7)worldClock.accum=0;
   refreshHud();
 }
 if(flight){
   updatePalette(dt);placeShip(now/1000,dt);
   premiumFX?.frame({
     dt,playing:uiState.mode==="playing",flight,poseAt,positionAt,
     ship,shipGlow,sectorColor:COLOR[sectorAt(flight.s)].color
   });
 }
 renderer.render(scene,camera);
}
function exportAudit(){
 const data={
   game:"SKYSHIFT",version:"0.3.0",trial:TRIAL.id,exportedAt:new Date().toISOString(),
   run:{
     status:flight.finished?"clear":"failed",distanceMeters:+flight.s.toFixed(1),
     durationSeconds:+flight.elapsed.toFixed(2),shield:flight.shield,
     jumps:flight.jumps,landings:flight.landings,falls:flight.falls,
     routeChoice:flight.routeChoice,
     riskRouteStyleBonus:flight.routeRewarded?500:0,
     fpsAverage:perfFrames?Math.round(perfTotal/perfFrames):null,
     fpsMinimum:perfFrames?Math.round(perfMin):null,
     gapClears:[...flight.clearedGaps],failedJumpEdges:flight.failedJumps
   },events:telemetry
 };
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="skyshift-first-flight-v03-audit.json";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
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
 initScene();installFullscreen();installControls();resetFlight();
 requestAnimationFrame(loop);
}catch(error){
 console.error("SKYSHIFT 0.2 startup failed",error);
 UI.error.classList.remove("hidden");
 UI.error.textContent="SKYSHIFT could not start. WebGL required. "+(error?.message||"");
}
