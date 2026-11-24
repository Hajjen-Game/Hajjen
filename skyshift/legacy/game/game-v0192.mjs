import * as THREE from "three";
import {TRACKS_0160,ACTIVE_TRACK_0160,TRACK_ID_0160,isAurora}
 from "../../tracks/shared/track-selection-v0160.mjs";
import {perfConfig as readPerfConfig,newPerfMonitor,resetPerfMonitor,recordPerfFrame,perfSummary,gpuTimer as createGpuTimer} from "../../core/performance-audit-v0114.mjs";
import {
 TRIAL,COURSE_SEGMENTS,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,ARCHES,CHECKPOINTS,SECTORS,ROAD_CUES,poseAt,positionAt,headingAt,curvatureAt,bankAt,bankDegreesAt,surfaceHeightAt,surfaceNormalAt,
 heightAt,widthAt,roadIntervals,onRoad,sectorAt,speedAt,nextGap,gradeAt,pitchAt,TRACK_3D,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,AIR_TRICKS,GRIP_APEX,PROJECTION_083,STEERING_AUTHORITY,steeringBalanceAt,normalYawFactorAt,elevationAudit,
 newFlightState,stepFlight,setZoneSpeedStage,CIRCUIT,circuitPlanSummary,clamp,lerp
} from "../../trial-v0165.mjs";
import { BOOST_PADS,BOOST_CONFIG } from "../../flight/boost/boost-v0160.mjs";
import {RISK_REWARD_0160,RHYTHM_GATES_0160,riskCueAt}
 from "../../risk-reward-v0160.mjs";
import { createPremiumDeckGeometry,PREMIUM_TRACK } from "../../premium-track-v0160.mjs";
import {FIDELITY_0114,createFidelityDirector,
 resetFidelityDirector,advanceFidelityDirector,fidelityAudit,
 createSmartPremiumTrackMaterial} from "../../core/visual-fidelity-v0160.mjs";
import {SHADOW_TUNNEL,inShadowTunnel,tunnelIntensityAt,installShadowTunnel,
 installTunnelRoadShading} from "../../shadow-tunnel-v0160.mjs";
import {TUNNEL_BLACKOUT,installBlackoutRoadShading,
 separateBladeTipMaterial,createTunnelBlackoutController}
 from "../../tunnel-blackout-v0160.mjs";
import {ZONE_WAVE,ZONE_PALETTES,newZoneWaveState,updateZoneWave,frontPaletteBlend,waveResonanceStrength,spectralChargeStrength,horizonWaveCue} from "../../zone-wave-v060.mjs";
import {MANTA_IDENTITY,ENGINE_SOCKETS,buildMantaWings} from "../../manta-blade-v0484.mjs";
import {buildPremiumMantaBlade,MANTA_POLISH} from "../../ships/manta-blade-v0103.mjs";
import {buildStingrayEvo,STINGRAY_EVO} from "../../ships/stingray-evo-v01342.mjs";
import {FLEET,FLEET_VERSION,readFleet,saveFleet,equipFleet,
 isFleetUnlocked,recordFleetClear,fleetStatus} from "../../ships/fleet-v010.mjs";
import { makeFullscreenController } from "../../fullscreen-v02.mjs";
import { createTwinEngineFX,ENGINE_TRAIL_SPEC } from "../../engine-trails-v01346.mjs";
import { createNeonPipeline,createNeonKit,NEON_TUNING } from "../../neon-v0111.mjs";
import { MESH_SPEC } from "../../smooth-track-v0160.mjs";
import {OPT_0111,newHudBudget,createDomWriteCache} from "../../core/render-optimizer-v0111.mjs";
import {createUnifiedFlightRig,resetUnifiedFlightRig,advanceUnifiedFlightRig,
 unifiedFlightAudit} from "../../flight/unified-flight-v0165.mjs";
import {
  PACING,capturePose,interpolatePose,shouldSnapPose,
  createFrameClock,advanceFrame,createFrameMonitor,observeFrame,monitorSummary,
  createAdaptiveQuality,nextAdaptiveRatio
} from "../../core/frame-pacing-v0112.mjs";
import { MOTION_DEFAULTS,createFlightMotionState } from "../../flight/flight-motion-v0112.mjs";
import {SIGNATURE_FLIGHT,createSignatureFlightState,
 triggerSignatureJump,triggerSignatureLanding,triggerSignatureBoost,
 signatureFlightAudit} from "../../flight/signature-flight-v091.mjs";
import { CINEMATIC_DEFAULTS,createCinematicState,chasePose,cameraBankAt,cinematicFov,engineLightFactor } from "../../flight/cinematic-v0165.mjs";
import {BOOST_SPRING,createBoostSpringState,triggerBoostSpring,stepBoostSpring,boostFovTarget,boostFovResponse} from "../../flight/boost-spring-v090.mjs";
import {BOOST_SPRING as CLASSIC_BOOST_FOV} from "../../flight/boost/boost-spring-v0495.mjs";
import {VELOCITY_SPEC,createVelocityState,igniteVelocity,stepVelocityState} from "../../velocity-language-v0496.mjs";
import {KINETIC_CAMERA,kineticFovAt,createKineticCameraState,
 triggerKineticLanding,kineticCameraAudit}
 from "../../flight/kinetic-camera-v090.mjs";
import { installAeroBarriers,AERO_BARRIER } from "../../tracks/barriers/aero-barrier-v0165.mjs";
import { installSpaceBackdrop } from "../../space-v0496.mjs";
import {SIGNATURE_ENV_0180,installSignatureEnvironment}
 from "../../signature-environment-v0180.mjs";
import {WORLD_0190,installCinematicWorld}
 from "../../world-rebuild-v0190.mjs";
import {ORBITAL_HERO_0192,installOrbitalHero}
 from "../../orbital-hero-v0192.mjs";
import {CINEMATIC_SPACE_0170,createCinematicSpaceLighting,installCinematicRoadLighting}
 from "../../cinematic-space-lighting-v0170.mjs";
import { createContactShadow } from "../../ship-v034.mjs";
import {CLARITY,clarityProfile as selectClarityProfile,dprForAdaptiveLevel,clarityAudit} from "../../image-clarity-v083.mjs";
import {HUD_SPEC,createReactiveHud} from "../../reactive-hud-v04991.mjs";
import {GRIP_SPEC} from "../../flight/precision-grip-v084.mjs";
import {RACING_FEEL,gripApexCue,createRailFeedbackState,
 startRailFeedback,stepRailFeedback} from "../../flight/racing-feel-v083.mjs";
import {SIDE_THRUSTER_SPEC,createSideThrusters} from "../../flight/side-thrusters-v061.mjs";
import {VELOCITY_PRESENCE,createVelocityPresenceState,
 stepVelocityPresence,velocityPresenceAudit} from "../../velocity-presence-v0104.mjs";
import {installReactiveWingFlaps,REACTIVE_FLAPS} from "../../ships/reactive-wing-flaps-v0108.mjs";
import {createLivingWakeFX,LIVING_WAKE} from "../../living-wake-v01071.mjs";
import {createRailScrapeSparks,RAIL_SPARKS,railContactPoint}
 from "../../rail-scrape-sparks-v0165.mjs";
import { LUMINANCE,validateLuminance } from "../../luminance-v0331.mjs";
import {RACING_0121,createRacingExperience,resetRacingExperience,
 observeRacingStep,stepRacingExperience,raceRhythmAt,racingExperienceAudit}
 from "../../racing-experience-v0160.mjs";
import {FIDELITY_0121,readFidelityChoice,saveFidelityChoice,chooseFidelity0121}
 from "../../core/fidelity-settings-v0121.mjs";
import {TIME_TRIAL_0160,createTimeTrialState,startTimeTrial,
 captureTimeTrialSample,finishTimeTrial,formatTrialTime,formatTrialDelta,
 loadPersonalGhost,readGhostEnabled,saveGhostEnabled,updateGhostDelta,
 ghostAudit} from "../../time-trial-v0160.mjs";
import {GHOST_VISUAL_0130,createPersonalGhostVisual}
 from "../../ghost-visual-v0130.mjs";
import {CHALLENGES_0140,CHALLENGE_RULES_0140,getChallenge,challengeDistance,
 readChallengeProgress,saveChallengeProgress,challengeSummary,challengeUnlocked,
 evaluateChallenge,recordChallenge,captureChallengeMetrics}
 from "../../tracks/skyline/skyline-challenges-v0140.mjs";
import {createShipArtController} from "../../ship-hero-loader-v01342.mjs";
import {HANGAR_HERO_0134,createStingrayHeroShowroom}
 from "../../hangar-hero-v0134.mjs";
import {STINGRAY_PRESENTATION_01347,visualSettingsForShip}
 from "../../ships/stingray-presentation-v01347.mjs";
if(validateLuminance().length)throw new Error("Invalid SKYSHIFT atmosphere balance");

const $=id=>document.getElementById(id);
const CINEMATIC_ENABLED=new URLSearchParams(location.search).get("lighting")!=="classic";
const envEnabled=new URLSearchParams(location.search).get("env")!=="classic";
const worldEnabled=envEnabled&&new URLSearchParams(location.search).get("world")!=="classic";
const architectureEnabled=worldEnabled&&new URLSearchParams(location.search).get("architecture")!=="classic";
function fleetStorage(){try{return localStorage}catch{return null}}
let fleetProgress=readFleet(fleetStorage());
let previewShipId=fleetProgress.selected,activeShipId="",activeCraft=null;
const shipArtController=createShipArtController(THREE,{
 search:location.search,
 currentCraft:()=>activeCraft,
 currentShipId:()=>activeShipId
});
if(!fleetProgress.clears&&bestForTrial()>0){
 fleetProgress=saveFleet(fleetStorage(),recordFleetClear(fleetProgress,true).state);
 previewShipId=fleetProgress.selected;
}
// 0.9.0 developer comparison only. Default stays balanced, the user can
// A/B exact physics and authored geometry with ?camera=classic|kinetic.
const cameraOption=new URLSearchParams(location.search).get("camera");
const CAMERA_MODE=["classic","balanced","kinetic"].includes(cameraOption)?
 cameraOption:"balanced";
const CAMERA_GAIN=CAMERA_MODE==="classic"?0:CAMERA_MODE==="kinetic"?1.15:.85;
const UI={
 canvas:$("game"),start:$("start-btn"),retry:$("retry-btn"),
 menu:$("menu"),end:$("end-screen"),pause:$("pause-screen"),
 challengeScreen:$("challenges-screen"),challengeButton:$("challenges-btn"),
 challengeList:$("challenge-grid"),challengeSummary:$("challenge-summary"),
 challengeBack:$("challenges-back-btn"),challengeHud:$("challenge-hud"),
 challengeClock:$("challenge-clock"),challengeHudName:$("challenge-hud-name"),
 challengeResult:$("challenge-result"),challengeEndBack:$("challenge-end-back"),
 settings:$("settings-screen"),settingsOpen:$("menu-settings-btn"),
 settingsBack:$("settings-back-btn"),pauseMenu:$("pause-menu-btn"),
 pauseGhostToggle:$("pause-ghost-toggle"),
 resume:$("resume-btn"),restart:$("restart-paused-btn"),
 pauseBtn:$("pause-btn"),hud:$("hud"),controls:$("mobile-controls"),
 shieldFill:$("shield-fill"),shieldText:$("shield-text"),shieldStatus:$("shield-status"),
 progress:$("zone-progress-fill"),sector:$("zone-number"),
 sectorName:$("sector-name"),distance:$("distance"),speed:$("speed"),
 flight:$("flight-state"),toast:$("toast"),banner:$("zone-banner"),
 bannerNum:$("zone-banner-number"),bannerName:$("zone-banner-name"),
 flash:$("zone-flash"),stick:$("stick"),knob:$("stick-knob"),
 jump:$("jump-btn"),grip:$("grip-btn"),gripCue:$("grip-cue"),
 riskCue:$("risk-line-cue"),error:$("error"),finalTitle:$("final-title"),
 finalDistance:$("final-distance"),finalSector:$("final-zone"),
  lapNumber:$("lap-number"),lapInfo:$("lap-info"),finalLaps:$("final-laps"),
 finalBest:$("personal-best"),finalTime:$("flight-time"),
 finalJumps:$("final-jumps"),finalStyle:$("final-style"),export:$("audit-btn"),
 trialStatus:$("tt-menu-status"),trialHud:$("tt-hud"),
 trialClock:$("tt-clock"),trialDelta:$("tt-delta"),trialResult:$("tt-result"),
 raceLabel:$("trial-label"),
 fullscreen:$("fullscreen-btn"),menuFullscreen:$("menu-fullscreen-btn"),fidelityToggle:$("fidelity-btn"),
 fullscreenHelp:$("fullscreen-help"),
 hangar:$("hangar-screen"),hangarBtn:$("hangar-btn"),
 hangarBack:$("hangar-back"),endHangar:$("end-hangar-btn"),
 menuSelectedShip:$("menu-selected-ship"),
 trackPicker:$("track-picker"),trackName:$("menu-track-name"),
 trackTagline:$("track-tagline"),trackFeatures:$("track-features"),
 topbarTrack:$("topbar-track-name"),
 fleetProgress:$("fleet-progress"),
 fleetPreviewTitle:$("fleet-preview-title"),
 fleetPreviewDescription:$("fleet-preview-description"),
 unlockToast:$("fleet-unlock-toast")
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
const SHADOW_VOID=new THREE.Color(SHADOW_TUNNEL.voidHex);
const uiState={mode:"menu",inputX:0,jumpPressed:false,jumpHeld:false,gripHeld:false,gripPointer:null,stickPointer:null,
 keys:new Set(),bannerTimeout:null,toastTimeout:null,trackHint:-1};
const worldClock={last:performance.now(),accum:0};
let scene,camera,renderer,world,ship,shipGlow,shipShade,roadMat,edgeMat,flight;
let claritySettings=null,fidelityProfile=null,fidelityDirector=null;
let neonKit,neonPipeline,engineLights=[],engineCore,enginePlumes=[],identitySurface,premiumSurface,spaceBackdrop,shadowTunnel,tunnelBlackout,worldLights,bladeTips;
let cinematicLighting=null,signatureEnvironment=null,cinematicWorld=null,orbitalHero=null;
let cameraLook=new THREE.Vector3(),shadowMesh,premiumFX,sideThrusters,reactiveWingFlaps,livingWake,railSparks;
let sectorLandmarks=null,ghostVisual=null,hangarHeroRig=null;
const racingExperience=createRacingExperience();
const timeTrialState=createTimeTrialState();
let selectedRaceMode="time-trial",ghostEnabled=readGhostEnabled(fleetStorage());
let challengeProgress=readChallengeProgress(fleetStorage());
let currentChallenge=null,lastChallengeGrading=null;
const GHOST_RECORD_POSE={elapsed:0,s:0,worldX:0,y:0,worldZ:0,
 heading:0,roll:0,pitch:0};
let perfFrames=0,perfTotal=0,perfMin=200;
let renderSamples=0,renderCallTotal=0,renderCallPeak=0,triangleTotal=0;
let frameClock=createFrameClock(),frameMonitor=createFrameMonitor();
const perfSettings=readPerfConfig(location.search);
const fidelityChoice=readFidelityChoice({search:location.search,storage:fleetStorage()});
const frameProfiler=newPerfMonitor();
let gpuClock=null,perfPanel=null,lastPerfPanelUpdate=0;
const hudBudget=newHudBudget(),domWrites=createDomWriteCache();
const engineFxFrame={dt:0,playing:false,flight:{forwardSpeed:44,boostMultiplier:1},
 poseAt,positionAt,ship:null,shipGlow:null,sectorColor:0,
 motionWeight:null,velocity:null,presence:null};
let completedSparkStats=null;
const fidelitySignals={s:0,speed:44,boostMultiplier:1,wave:0,
 playing:false,circuitLength:CIRCUIT.lapLength};
let adaptiveQuality=createAdaptiveQuality(),currentRenderPose=null,previousRenderPose=null;
let frameBlend=0,wakeSmokePath=null;
let motionState=createFlightMotionState(),cinematicState=createCinematicState(),
 boostSpring=createBoostSpringState(),velocityState=createVelocityState(),
 velocityPresence=createVelocityPresenceState();
let kineticCamera=createKineticCameraState(),maxKineticFov=65.4;
let signatureFlight=createSignatureFlightState();
const reactiveHud=createReactiveHud(UI.hud);
let previousHudShield=100;
const flightTuning={...MOTION_DEFAULTS};
const cinematicTuning={...CINEMATIC_DEFAULTS};
if(CAMERA_GAIN===0){
 cinematicTuning.previewGain=.23;
 cinematicTuning.previewMaximum=.12;
}
// One shared source of cosmetic input signals for hull, camera and engines.
const motionRig=createUnifiedFlightRig({
 flightTuning,cinematicTuning,headingAt,surfaceHeightAt,
 hoverHeight:TRIAL.hoverHeight,cameraGain:CAMERA_GAIN,
 lapLength:CIRCUIT.lapLength,magneticWall:MAGNETIC_WALL,corkscrew:CORKSCREW
});
const interpolatedRenderPose={};
const CAMERA_INFO={},CAMERA_VIEW={worldX:0,worldZ:0,y:0,s:0,
 steering:0,clearance:0,kineticSideMeters:0,kineticDistanceMeters:0,
 kineticEyeLiftMeters:0,kineticLandingMeters:0,kineticLookLiftMeters:0};
const CAMERA_BASE_POSITION=new THREE.Vector3();
const CAMERA_TARGET_POSITION=new THREE.Vector3();
const CAMERA_TARGET_LOOK=new THREE.Vector3();
const telemetry=[];
let previousSector=0,sceneReady=false,fullscreenController=null,lastRailLog=0;
let railFeedback=createRailFeedbackState();
let gripCueVisible=false,gripCueSeconds=0,gripCueDisplays=0;
let zoneWave=newZoneWaveState();
let tunnelInside=false,tunnelEntries=0,tunnelExits=0,tunnelSeconds=0,tunnelMaxIntensity=0;
let waveSmokeHold=false;
const SHADOW_NORMAL=new THREE.Vector3(),SHADOW_PLANE_NORMAL=new THREE.Vector3(0,0,1);

function bestForTrial(){
 try{return Number(localStorage.getItem("skyshift-zone-wave-best-v049"))||0;}
 catch{return 0;}
}
function saveBest(time){
 try{localStorage.setItem("skyshift-zone-wave-best-v049",String(time));}catch{}
}
// A best Time Trial is separate from the historic normal-circuit record.
function refreshTrialMenu(){
 const best=loadPersonalGhost(fleetStorage());
 UI.trialStatus.textContent=best?
  "PERSONAL BEST · "+formatTrialTime(best.duration)+" · "+best.ship.toUpperCase():"";
 UI.trialStatus.classList.toggle("hidden",!best);
 UI.pauseGhostToggle.textContent="GHOST "+(ghostEnabled?"ON":"OFF");
 UI.pauseGhostToggle.setAttribute("aria-pressed",String(ghostEnabled));
 UI.pauseGhostToggle.setAttribute("aria-label",
  "Ghost "+(ghostEnabled?"på":"av")+". Tryck för att ändra");
}
function recordRealGhostPose(force=false){
 if(timeTrialState.mode!=="time-trial"||!flight)return;
 // Avoid allocating on the 120 Hz physics hot path: update only every ~10 Hz.
 if(!force&&flight.elapsed-timeTrialState.lastSampleAt<
  TIME_TRIAL_0160.sampleIntervalSeconds-.0001)return;
 const p=GHOST_RECORD_POSE;
 p.elapsed=flight.elapsed;p.s=flight.s;p.worldX=flight.worldX;
 p.y=flight.y;p.worldZ=flight.worldZ;p.heading=flight.heading;
 p.roll=-bankAt(flight.s)-(flight.trickVisualAngle??0)-
  Math.sign(flight.steering??0)*Math.min(.09,Math.abs(flight.steering??0)*.06);
 p.pitch=pitchAt(flight.s);
 captureTimeTrialSample(timeTrialState,p,{force});
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
       const wallNormal=surfaceNormalAt(mid);
        const drop=new THREE.Vector3(-wallNormal.x*1.05,-wallNormal.y*1.05,
          -wallNormal.z*1.05);
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
 premiumSurface=createSmartPremiumTrackMaterial(THREE,fidelityProfile);
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
 // Distinct elevated sectors. The leap is clearly warned with an actual
 // suspended sign before the opening, never an obstacle across the road.
 for(const sector of CIRCUIT.sectors.slice(1))
  makeBillboard(sector.name,sector.start+45,10.2,21,0);
 if(!isAurora())makeBillboard("SKYLINE LEAP",SKYLINE_LEAP.start-50,9.4,15,0);
 // Portal warning is safely above the racing lane, after the wall ride.
 makeBillboard(isAurora()?"LUMEN PASS":"SHADOW TUNNEL",SHADOW_TUNNEL.start-83,11,15,0);
}
function makeShip(id=fleetProgress.selected){
 // Ship and engine visuals can change; the real physical state is untouched.
 tunnelBlackout?.reset();
 premiumFX?.dispose();sideThrusters?.dispose();livingWake?.dispose();
 reactiveWingFlaps?.dispose();railSparks?.dispose();
 if(ship){
  ship.removeFromParent();
  const geometries=new Set(),materials=new Set();
  ship.traverse(obj=>{
   if(obj.geometry)geometries.add(obj.geometry);
   const candidates=Array.isArray(obj.material)?obj.material:[obj.material];
   for(const mat of candidates)
    if(mat&&mat!==neonKit.ship)materials.add(mat);
  });
  for(const g of geometries)g.dispose();
  for(const m of materials)m.dispose();
 }
 shipGlow=neonKit.ship;
 const craft=id==="stingray"?
   buildStingrayEvo(THREE,shipGlow):buildPremiumMantaBlade(THREE,shipGlow);
 activeCraft=craft;activeShipId=id;ship=craft.ship;
 // A stable SINGLE transform for the full craft (including animated tail
 // and attached engine FX), never evaluated from wing-road intersections.
 // Manta's default scale remains 1.00.
 if(id==="stingray"){
  const visual=visualSettingsForShip(id);
  ship.scale.set(visual.scaleX,visual.scaleY,visual.scaleZ);
 }
 bladeTips=separateBladeTipMaterial(ship,craft.materials.cyan);
 engineCore=craft.engineCore;enginePlumes=craft.enginePlumes;
 engineLights=ENGINE_SOCKETS.map((socket,i)=>{
  const light=new THREE.PointLight(
   0x43ddf0,NEON_TUNING.enginePointIntensity*.42,3.15,1.8);
  light.position.set(socket.x,socket.y-.33,socket.z+.03);
  light.name=i===0?"Port engine fill":"Starboard engine fill";
  ship.add(light);return light;
 });
 scene.add(ship);
 premiumFX=createTwinEngineFX(THREE,scene,ship,craft.materials.cyan);
 reactiveWingFlaps=installReactiveWingFlaps(THREE,ship,{variant:id});
 livingWake=createLivingWakeFX(THREE,scene,ship,{variant:id,
  lowMemory:claritySettings?.lowMemory??false});
 railSparks=createRailScrapeSparks(THREE,scene,{
  lowMemory:claritySettings?.lowMemory??false});
 sideThrusters=createSideThrusters(THREE,ship);
 if(spaceBackdrop)
  tunnelBlackout=createTunnelBlackoutController({worldLights,camera,bladeTips});
 if(!shadowMesh)shadowMesh=createContactShadow(THREE,scene);
 UI.jump.classList.add("hidden");
 // A scene-art preview only; 120Hz flight/camera/GRIP remain unchanged.
 void shipArtController.onCraftBuilt(craft,id).then(()=>{
  if(activeCraft===craft&&id==="stingray"&&uiState.mode==="hangar")
   refreshHangar();
 });
}
function refreshHangar(){
 UI.menuSelectedShip.textContent=FLEET.find(x=>x.id===fleetProgress.selected)?.name||
   FLEET[0].name;
 UI.fleetPreviewTitle.textContent=FLEET.find(x=>x.id===previewShipId)?.name||
   FLEET[0].name;
 const art=shipArtController.audit();
 UI.fleetPreviewDescription.textContent=previewShipId==="stingray"?
  art.heroApplied?"HERO 4.0 · PANSARSVANS · STABIL SVÄNG":
  art.status==="loading"?"HERO-MODELL · LADDAR 3D-GEOMETRI":
  "Segmenterad mekanisk svans · reagerar på styrning, GRIP och boost":
  "Hårdskuren interceptor · dubbla motorer";
 for(const item of FLEET){
  const card=document.querySelector('[data-fleet-card="'+item.id+'"]');
  const status=document.querySelector('[data-fleet-status="'+item.id+'"]');
  const preview=document.querySelector('[data-fleet-preview="'+item.id+'"]');
  const equip=document.querySelector('[data-fleet-equip="'+item.id+'"]');
  const unlocked=isFleetUnlocked(fleetProgress,item.id);
  card?.classList.toggle("active",previewShipId===item.id);
  card?.classList.toggle("locked",!unlocked);
  preview?.setAttribute("aria-pressed",String(previewShipId===item.id));
  if(status)status.textContent=unlocked?
    (fleetProgress.selected===item.id?"UTRUSTAD":"UPPLÅST"):
    "LÅST · KLARA 3 VARV";
  if(equip){
   equip.disabled=!unlocked;
   equip.textContent=!unlocked?"LÅST":
    fleetProgress.selected===item.id?"UTRUSTAD":"VÄLJ";
  }
 }
 UI.fleetProgress.textContent=fleetProgress.clears>0?
  "FULLSTÄNDIGA LOPP: "+fleetProgress.clears+" · STINGRAY EVO UPPLÅST":
  "KLARA ALLA TRE VARV I ETT LOPP FÖR ATT LÅSA UPP STINGRAY EVO";
}
// Gameplay-only Skyline Challenges: always drive the ORIGINAL stepFlight.
function refreshChallenges(){
 const summary=challengeSummary(challengeProgress);
 UI.challengeSummary.textContent=summary.bronzeOrBetter+" / "+summary.total+
  " COMPLETED · "+summary.gold+" GOLD";
 UI.challengeList.replaceChildren();
 for(const c of CHALLENGES_0140){
  const unlocked=challengeUnlocked(challengeProgress,c.id);
  const record=challengeProgress.records[c.id];
  const button=document.createElement("button");
  button.type="button";button.className="challenge-card";
  button.dataset.challengeId=c.id;button.dataset.medal=record?.medal??"none";
  button.disabled=!unlocked;
  const top=document.createElement("span");top.className="challenge-top";
  const name=document.createElement("span");name.className="challenge-title";
  name.textContent=c.number+" · "+c.name;
  const status=document.createElement("span");status.className="challenge-state";
  status.textContent=!unlocked?"LOCKED · "+c.unlocksAt+" BRONZE":
   record?.medal?record.medal.toUpperCase():"PLAY";
  top.append(name,status);
  const sub=document.createElement("span");sub.className="challenge-sub";
  sub.textContent=c.subtitle+" · "+Math.round(challengeDistance(c))+" M"+
   (record?.bestSeconds?" · PB "+formatTrialTime(record.bestSeconds):"");
  button.append(top,sub);
  button.setAttribute("aria-label",c.name+" "+
    (!unlocked?"låst, samla "+c.unlocksAt+" bronsmedaljer":
      (record?.medal??"ej klarad")+", starta utmaning"));
  UI.challengeList.append(button);
 }
}
function openChallenges(){
 if(!ACTIVE_TRACK_0160.hasSkylineChallenges)return;
 if(!sceneReady||!["menu","ended"].includes(uiState.mode))return;
 refreshChallenges();
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.hangar.classList.add("hidden");UI.challengeScreen.classList.remove("hidden");
 UI.settingsOpen.classList.add("hidden");UI.fullscreen.classList.add("hidden");
 UI.controls.classList.add("hidden");UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");
 uiState.mode="challenges";
}
function closeChallenges(){
 if(uiState.mode!=="challenges")return;
 currentChallenge=null;lastChallengeGrading=null;
 UI.challengeScreen.classList.add("hidden");UI.menu.classList.remove("hidden");
 UI.settingsOpen.classList.remove("hidden");uiState.mode="menu";
 document.getElementById("app").classList.remove("challenge-active");
 resetFlight();refreshTrialMenu();
}
function seedChallengeFlight(c){
 const s=c.startS,p=positionAt(s,0,0);
 const completedGates=Math.floor(s/(CIRCUIT.lapLength/10));
 Object.assign(flight,{s,lateral:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(s),y:surfaceHeightAt(s)+TRIAL.hoverHeight*surfaceNormalAt(s).y,
  currentSpeed:TRIAL.startSpeed,zoneCruiseSpeed:TRIAL.startSpeed,
  zoneSpeedStage:0,checkpoint:completedGates*(CIRCUIT.lapLength/10),
  checkpointsPassed:completedGates,lap:1,lapsCompleted:0,
  elapsed:0,lastLapAt:0,grounded:true,vy:0});
}
function endChallengeRun(won){
 completedSparkStats=railSparks?.stats()??null;
 const c=currentChallenge,metrics=captureChallengeMetrics(c,flight,racingExperience);
 metrics.reachedExit=won&&metrics.reachedExit;
 const grading=evaluateChallenge(c,metrics);
 lastChallengeGrading=grading;
 const update=recordChallenge(challengeProgress,c.id,grading);
 challengeProgress=saveChallengeProgress(fleetStorage(),update.progress);
 uiState.mode="ended";clearInput();
 UI.finalTitle.textContent=grading.medal==="none"?
  "CHALLENGE INCOMPLETE":c.name+" · "+grading.medal.toUpperCase();
 UI.finalTitle.classList.toggle("success",grading.medal!=="none");
 UI.finalDistance.textContent=Math.floor(Math.max(0,flight.s-c.startS))+
  " / "+Math.round(challengeDistance(c))+" M";
 UI.finalSector.textContent=String(zoneWave.playerStage+1).padStart(2,"0");
 UI.finalBest.textContent=challengeProgress.records[c.id]?.bestSeconds?
  formatTrialTime(challengeProgress.records[c.id].bestSeconds):"—";
 UI.finalTime.textContent=formatTrialTime(flight.elapsed);
 UI.finalLaps.textContent="CHALLENGE";
 UI.finalJumps.textContent=flight.peakYawRateDeg.toFixed(1)+"°/S";
 UI.finalStyle.textContent=flight.offRoadSeconds.toFixed(1)+" S";
 UI.trialResult.classList.add("hidden");UI.unlockToast.classList.add("hidden");
 UI.challengeResult.dataset.medal=grading.medal;
 UI.challengeResult.textContent=(grading.medal==="none"?
   "FINISH THE SECTION TO EARN BRONZE":
   "MEDAL "+grading.medal.toUpperCase()+" · "+formatTrialTime(flight.elapsed)+
   " · "+(grading.skillMet?"SKILL COMPLETE":"SKILL NOT YET COMPLETE"))+
   (update.newlyUnlocked.length?
    " · NEW CHALLENGE UNLOCKED: "+update.newlyUnlocked.map(id=>getChallenge(id).name).join(", "):"");
 UI.challengeResult.classList.remove("hidden");
 UI.challengeEndBack.classList.remove("hidden");
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.fullscreen.classList.add("hidden");
 UI.end.classList.remove("hidden");
 event("challenge_finished",{id:c.id,medal:grading.medal,time:grading.elapsed,
  cleanCarves:metrics.cleanCarves,contacts:metrics.railContacts,
  unlocked:update.newlyUnlocked});
}
function openHangar(){
 if(!sceneReady||!["menu","ended"].includes(uiState.mode))return;
 previewShipId=fleetProgress.selected;
 if(activeShipId!==previewShipId)makeShip(previewShipId);
 refreshHangar();
 uiState.mode="hangar";
 $("app").classList.add("hangar-active");
 // Keep the real racing track visible behind both ships, as in 0.10.0.
 world.visible=true;
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.hangar.classList.remove("hidden");
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");
 UI.fullscreen.classList.add("hidden");
 UI.settingsOpen.classList.add("hidden");
}
function closeHangar(){
 if(uiState.mode!=="hangar")return;
 UI.hangar.classList.add("hidden");UI.menu.classList.remove("hidden");
 $("app").classList.remove("hangar-active");
 world.visible=true;
 uiState.mode="menu";
 if(activeShipId!==fleetProgress.selected)makeShip(fleetProgress.selected);
 UI.settingsOpen.classList.remove("hidden");
 UI.fullscreen.classList.add("hidden");
 resetFlight();
}
function previewFleetShip(id){
 if(uiState.mode!=="hangar"||!FLEET.some(item=>item.id===id))return;
 previewShipId=id;
 if(activeShipId!==id)makeShip(id);
 refreshHangar();
}
function equipFleetShip(id){
 if(uiState.mode!=="hangar"||!isFleetUnlocked(fleetProgress,id))return;
 fleetProgress=saveFleet(fleetStorage(),equipFleet(fleetProgress,id));
 previewShipId=fleetProgress.selected;
 if(activeShipId!==previewShipId)makeShip(previewShipId);
 refreshHangar();
}
function initScene(){
 scene=new THREE.Scene();
 hangarHeroRig=createStingrayHeroShowroom(THREE,scene);
 scene.background=new THREE.Color(COLOR[0].sky);
 scene.fog=new THREE.FogExp2(COLOR[0].fog,LUMINANCE.fogDensity*.57);
 if(CINEMATIC_ENABLED){
  scene.background.multiplyScalar(CINEMATIC_SPACE_0170.skyScale);
  scene.fog.color.multiplyScalar(CINEMATIC_SPACE_0170.fogScale);
  scene.fog.density*=CINEMATIC_SPACE_0170.fogDensityScale;
 }
 camera=new THREE.PerspectiveCamera(67,innerWidth/Math.max(1,innerHeight),.1,650);
 scene.add(camera);
 // Explicitly select quality based on real device capabilities. The
 // HDR composer owns anti-aliasing (SMAA); canvas MSAA would only waste
 // memory and cannot smooth our offscreen RenderPass.
 claritySettings=selectClarityProfile(navigator.deviceMemory,devicePixelRatio||1);
 const limitedMemory=claritySettings.lowMemory;
 fidelityProfile=chooseFidelity0121({
  lowMemory:limitedMemory,preset:perfSettings.preset,choice:fidelityChoice
 });
 fidelityDirector=createFidelityDirector(fidelityProfile);
 // Only switch the vertex shader at startup; a menu toggle reloads cleanly
 // while retaining the normal game's adaptive DPR and lightweight bloom.
 UI.fidelityToggle.textContent="FIDELITY "+(fidelityProfile.premium?"ON":"OFF")+" · TOGGLE";
 UI.fidelityToggle.setAttribute("aria-pressed",String(fidelityProfile.premium));
 UI.fidelityToggle.setAttribute("aria-label",
  "Optimerad Fidelity "+(fidelityProfile.premium?"på":"av")+
  ". Tryck för att ändra, spelet laddas om.");
 UI.fidelityToggle.disabled=FIDELITY_0121.overridePresets.includes(perfSettings.preset);
 const options={canvas:UI.canvas,antialias:false,
  powerPreference:limitedMemory?"default":"high-performance"};
 try{
  renderer=new THREE.WebGLRenderer(options);
 }catch(primaryError){
  renderer=new THREE.WebGLRenderer({...options,
   antialias:false,powerPreference:"default"});
 }
 renderer.setPixelRatio(claritySettings.renderDpr);
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 // Sum renderer workload across all composer passes (last pass alone=1 call).
 renderer.info.autoReset=false;
 // Native canvas remains high fidelity; adaptive detail adjusts only the
 // internal HDR composer targets on sustained slow devices.
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=LUMINANCE.exposure;
 neonKit=createNeonKit(THREE);
 const ambient=new THREE.HemisphereLight(
   LUMINANCE.ambientSky,LUMINANCE.ambientGround,LUMINANCE.ambientIntensity
 );
 scene.add(ambient);
 const key=new THREE.DirectionalLight(0xb5d6ff,LUMINANCE.keyIntensity);
 key.position.set(12,28,18);scene.add(key);
 const edgeFill=new THREE.DirectionalLight(0xf87ac6,LUMINANCE.fillIntensity);
 edgeFill.position.set(-18,11,-22);scene.add(edgeFill);
 worldLights={ambient,key,fill:edgeFill};
 // The visible distant star and the real PBR key agree in world space.
 // No additional dynamic lights or changes to handling/camera logic.
 if(CINEMATIC_ENABLED)cinematicLighting=createCinematicSpaceLighting(THREE,{
  scene,camera,worldLights,lowMemory:limitedMemory
 });
 world=new THREE.Group();scene.add(world);
 buildRoad();
 identitySurface=installAeroBarriers(THREE,world);
 // Static indirect-light pockets reuse the existing deck draw call.
 // The tunnel and blackout decorators retain the final say over darkness.
 if(CINEMATIC_ENABLED&&!limitedMemory)
  installCinematicRoadLighting(premiumSurface.material);
 // Static 760m architecture and preserved high-energy road markings.
 installTunnelRoadShading(premiumSurface.material);
 installBlackoutRoadShading(premiumSurface.material);
 shadowTunnel=installShadowTunnel(THREE,world);
 shadowTunnel.setAccent(neonKit.worldAccent);
 // Always retain white core and bloom. Disable only optional filaments
 // when navigator reports a low-memory device.
 const waveDetail=limitedMemory?"low":"high";
 premiumSurface?.setDetailMode(waveDetail);
 identitySurface?.setDetailMode(waveDetail);
  buildDecor();
 // 0.19.2: six architectural vaults, far-field fins and coherent edge light
 // around the S-link on Skyline. Instanced visuals only, no new colliders.
 if(envEnabled)signatureEnvironment=installSignatureEnvironment(THREE,world,{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt
 });
 // 0.19.2: full 3-chapter environment, without any new physical colliders.
 // world=classic retains the old 0.18 world for a fair A/B comparison.
 if(worldEnabled)cinematicWorld=installCinematicWorld(THREE,world,{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt
 });
 // Pass 2: replace just the old simple 278m station with one sculpted,
 // selectively lit observatory; no scene-wide material/light adjustment.
 if(architectureEnabled)orbitalHero=installOrbitalHero(THREE,world,{
  track:TRACK_ID_0160,lowMemory:limitedMemory,positionAt
 });
 // 0.12.0's roadside sculptures resembled extra poles. Remove entirely;
 // the ship and camera now carry the visual identity with zero added draws.
 // Open space, no geological scenery, distant monuments or 3D floor.
 makeShip();
 // Two-batch, translucent personal ghost with no physical collider or AI.
 ghostVisual=createPersonalGhostVisual(THREE,scene);
 spaceBackdrop=installSpaceBackdrop(THREE,camera);
 // Global light fades do not affect engine point lights or emitted neon.
 tunnelBlackout=createTunnelBlackoutController({worldLights,camera,bladeTips});
 // HDR multilayer bloom renders *after* the beauty pass and before tone mapping.
 neonPipeline=createNeonPipeline(THREE,renderer,scene,camera,{
  lowMemory:limitedMemory,forceFullBloom:perfSettings.preset==="bloom-full"
 });
 neonPipeline.resize(innerWidth,innerHeight);
 if(perfSettings.enabled){
  if(perfSettings.preset==="no-bloom")neonPipeline.bloom.enabled=false;
  if(perfSettings.preset==="no-smaa")neonPipeline.smaa.enabled=false;
  if(perfSettings.preset==="low-dpr")
   neonPipeline.setInternalPixelRatio(Math.min(1,claritySettings.renderDpr),innerWidth,innerHeight);
  perfPanel=document.createElement("div");
  perfPanel.id="skyshift-perf-panel";
  perfPanel.style.cssText="position:fixed;top:55px;left:10px;z-index:25;pointer-events:none;white-space:pre-line;padding:7px;max-width:245px;border:1px solid #6db9dd99;border-radius:6px;background:#061420e8;color:#effaff;font:11px/1.4 monospace";
  perfPanel.textContent="SKYSHIFT PERF / "+perfSettings.preset;
  document.body.appendChild(perfPanel);
 }
 gpuClock=createGpuTimer(renderer.getContext(),perfSettings.enabled);
 // Non-interactive rendering diagnostic for browser CI and exported audits.
 window.__skyshiftClarityInfo=()=>clarityAudit(claritySettings,neonPipeline);
 addEventListener("resize",resize);
 sceneReady=true;
 // Pass 2 hero-only art diagnostics. No simulation changes or test shortcuts.
 if(new URLSearchParams(location.search).get("heroSmoke")==="1")
  window.__skyshiftHeroProbe=()=>({
   enabled:architectureEnabled,track:TRACK_ID_0160,
   ...(orbitalHero?.stats?.()??{active:false,maskedPrimitiveBeams:0,
    addedDrawMeshes:0,additionalLights:0}),
   worldActive:cinematicWorld?.stats?.().active??false,
   legacyVaultsActive:signatureEnvironment?.stats?.().active??false,
   heroGroup:world.getObjectByName("Orbital Hero 0.19.2 · Asterion")?.children
    .map(x=>({name:x.name,mesh:x.isMesh??false,light:x.isPointLight??false}))??[]
  });
 // Dedicated 0.19 visual QA, available only to browser regression tests.
 if(new URLSearchParams(location.search).get("worldSmoke")==="1")
  window.__skyshiftWorldProbe=()=>({
   enabled:worldEnabled,track:TRACK_ID_0160,
   ...(cinematicWorld?.stats?.()??{active:false,beams:0,drawBatches:0}),
   worldMesh:world.getObjectByName("Cinematic World Rebuild 0.19.0")?.children
    .map(x=>({name:x.name,count:x.count,isInstanced:x.isInstancedMesh}))??[],
   legacyConduit:signatureEnvironment?.stats?.()??{active:false}
  });
 // Real WebGL inspection hook, only exposed with explicit QA URL flag.
 if(new URLSearchParams(location.search).get("envSmoke")==="1")
  window.__skyshiftEnvironmentProbe=()=>({
   enabled:envEnabled,track:TRACK_ID_0160,
   ...(signatureEnvironment?.stats?.()??{active:false,beams:0,extraDrawCalls:0}),
   worldMesh:world.getObjectByName("Signature Environment · Celestial Conduit 0.18.0")?.children
    .map(x=>({name:x.name,count:x.count,isInstanced:x.isInstancedMesh}))??[]
  });
 UI.hangarBtn.disabled=false;
 UI.trackPicker.value=TRACK_ID_0160;
 UI.trackName.textContent=ACTIVE_TRACK_0160.name;
 UI.topbarTrack.textContent=ACTIVE_TRACK_0160.name+" · 0.19.2";
 UI.trackTagline.textContent=isAurora()?
  "WIDE SWITCHBACKS · ROLLING HILLS · THREE FAST LAPS.":
  "WIDE ARCS · SMART LINES · THREE FASTER LAPS.";
 UI.trackFeatures.textContent=isAurora()?
  "3 × 3,400 M · GRIP · OPEN SWEEPS · LUMEN PASS · NO RISK LINES":
  "3 × 3,400 M · GRIP · WALL · CORKSCREW · SHADOW TUNNEL";
 UI.challengeButton.classList.toggle("hidden",!ACTIVE_TRACK_0160.hasSkylineChallenges);
 UI.riskCue.classList.add("hidden");
 refreshHangar();refreshChallenges();
 refreshTrialMenu();
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
function openSettings(){
 if(uiState.mode!=="menu")return;
 uiState.mode="settings";
 UI.menu.classList.add("hidden");
 UI.settings.classList.remove("hidden");
 UI.settingsOpen.classList.add("hidden");
}
function closeSettings(){
 if(uiState.mode!=="settings")return;
 uiState.mode="menu";
 UI.settings.classList.add("hidden");
 UI.menu.classList.remove("hidden");
 UI.settingsOpen.classList.remove("hidden");
 refreshTrialMenu();
}
function startImmersiveTrial(challenge=null){
 if(!fullscreenController.active())fullscreenController.request(true);
 enterPlaying(challenge);
}
function clearInput(){
 UI.gripCue?.classList.add("hidden");
 UI.grip.classList.remove("apex-approach","apex-engaged");
 UI.hud.classList.remove("hud-rail-contact");
 UI.hud.style.setProperty("--rail-contact","0");
 uiState.inputX=0;uiState.jumpPressed=false;uiState.jumpHeld=false;
 uiState.gripHeld=false;uiState.gripPointer=null;
 uiState.keys.clear();uiState.stickPointer=null;
 UI.knob.style.transform="translateX(0px)";
 UI.jump.classList.remove("held","trick-ready");
 UI.jump.classList.add("hidden");
 UI.controls.classList.remove("trick-offered");
 UI.grip.classList.remove("armed","active");
 UI.grip.setAttribute("aria-pressed","false");
 UI.controls.classList.remove("grip-pressed");
}
function resetFlight(){
 wakeSmokePath=null;completedSparkStats=null;
 hudBudget.reset();domWrites.reset();
 flight=newFlightState();previousSector=0;lastRailLog=0;
 if(currentChallenge)seedChallengeFlight(currentChallenge);
 startTimeTrial(timeTrialState,{mode:selectedRaceMode,storage:fleetStorage(),
  ship:activeShipId||fleetProgress.selected,ghostEnabled});
 recordRealGhostPose(true);
 ghostVisual?.hide();
 railFeedback=createRailFeedbackState();
 gripCueVisible=false;gripCueSeconds=0;gripCueDisplays=0;
 previousHudShield=flight.shield;
 reactiveHud.reset({shield:flight.shield});
 tunnelInside=false;tunnelEntries=0;tunnelExits=0;
 tunnelSeconds=0;tunnelMaxIntensity=0;
 zoneWave=newZoneWaveState();premiumSurface?.setWaveState(zoneWave);
 identitySurface?.setWaveState(zoneWave);
 scene?.background?.copy(themes[0].skyColor);
 scene?.fog?.color.copy(themes[0].fogColor);
 neonKit?.updateAccent(COLOR[0].color,1);
 if(neonKit)shadowTunnel?.setAccent(neonKit.worldAccent);
 motionState=createFlightMotionState(flight.heading);
 cinematicState=createCinematicState();
 kineticCamera=createKineticCameraState();
 signatureFlight=createSignatureFlightState();
 resetUnifiedFlightRig(motionRig);
 resetFidelityDirector(fidelityDirector);
 resetRacingExperience(racingExperience);
 maxKineticFov=KINETIC_CAMERA.fovStartDegrees;
 boostSpring=createBoostSpringState();
 velocityState=createVelocityState();
 velocityPresence=createVelocityPresenceState();
 reactiveWingFlaps?.reset();livingWake?.reset();railSparks?.reset();
 premiumSurface?.setVelocityFlow(0,0);
 identitySurface?.setVelocityFlow(0,0);
 spaceBackdrop?.setVelocityFlow(0);
 tunnelBlackout?.reset();
 premiumFX?.reset();
 activeCraft?.resetTail?.();
 activeCraft?.resetPolish?.();
 sideThrusters?.reset();
 perfFrames=0;perfTotal=0;perfMin=200;
 renderSamples=0;renderCallTotal=0;renderCallPeak=0;triangleTotal=0;
 frameClock=createFrameClock();frameMonitor=createFrameMonitor();
 resetPerfMonitor(frameProfiler);gpuClock?.reset();lastPerfPanelUpdate=0;
 currentRenderPose=capturePose(flight);previousRenderPose=currentRenderPose;
 frameBlend=0;
 document.documentElement.style.setProperty("--neon","#43dff3");
 telemetry.length=0;uiState.trackHint=-1;clearInput();
 event("trial_start",{trial:TRIAL.id});
 UI.banner.classList.add("hidden");
 UI.flash.classList.remove("active");
 UI.toast.classList.add("hidden");
 UI.riskCue.classList.add("hidden");
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
function enterPlaying(challenge=null){
 if(!sceneReady)return;
 currentChallenge=challenge;lastChallengeGrading=null;
 selectedRaceMode=currentChallenge?"standard":"time-trial";
 $("app").classList.remove("hangar-active");
 world.visible=true;
 resetFlight();uiState.mode="playing";
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.challengeScreen.classList.add("hidden");
 document.getElementById("app").classList.toggle("challenge-active",!!currentChallenge);
 UI.challengeHud.classList.toggle("hidden",!currentChallenge);
 UI.challengeResult.classList.add("hidden");
 UI.challengeEndBack.classList.add("hidden");
 if(currentChallenge)UI.challengeHudName.textContent=currentChallenge.name;
 UI.settings.classList.add("hidden");
 UI.settingsOpen.classList.add("hidden");
 UI.pause.classList.add("hidden");
 UI.hud.classList.remove("hidden");UI.controls.classList.remove("hidden");
 UI.trialHud.classList.toggle("hidden",timeTrialState.mode!=="time-trial");
 UI.trialResult.classList.add("hidden");
 if(timeTrialState.mode==="time-trial")
  event("time_trial_start",{ghostLoaded:!!timeTrialState.previousBest,
   ghostEnabled,previousBestSeconds:timeTrialState.previousBest?.duration??null});
 UI.pauseBtn.classList.remove("hidden");
 UI.fullscreen.classList.remove("hidden");
 refreshHud();hudBudget.shouldUpdate(performance.now(),true);
}
function returnToMainMenu(){
 if(uiState.mode!=="paused")return;
 // Abandon only the unfinished trace; never overwrite or erase an existing PB.
 uiState.mode="menu";
 currentChallenge=null;lastChallengeGrading=null;
 document.getElementById("app").classList.remove("challenge-active");
 clearTimeout(uiState.toastTimeout);
 clearTimeout(uiState.bannerTimeout);
 ghostVisual?.hide();
 UI.pause.classList.add("hidden");
 UI.end.classList.add("hidden");
 UI.settings.classList.add("hidden");
 UI.menu.classList.remove("hidden");
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");
 UI.trialHud.classList.add("hidden");
 UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");
 UI.fullscreen.classList.add("hidden");
 UI.settingsOpen.classList.remove("hidden");
 $("app").classList.remove("hangar-active");
 world.visible=true;
 resetFlight();
 refreshTrialMenu();
}
function pause(){
 if(uiState.mode!=="playing")return;
 uiState.mode="paused";clearInput();UI.riskCue.classList.add("hidden");
 ghostVisual?.hide();
 refreshTrialMenu();
 UI.pause.classList.remove("hidden");UI.pauseBtn.classList.add("hidden");
}
function resume(){
 if(uiState.mode!=="paused")return;
 uiState.mode="playing";UI.pause.classList.add("hidden");
 UI.pauseBtn.classList.remove("hidden");
 worldClock.last=performance.now();worldClock.accum=0;
}
function endRun(won){
 if(currentChallenge){endChallengeRun(won);return;}
 completedSparkStats=railSparks?.stats()??null;
 recordRealGhostPose(true);
 const ttResult=finishTimeTrial(timeTrialState,{won,elapsed:flight.elapsed,
  laps:flight.lapTimes,falls:flight.falls,storage:fleetStorage()});
 if(timeTrialState.mode==="time-trial")
  event("time_trial_finish",{saved:ttResult?.saved??false,
   newPersonalBest:ttResult?.improved??false,
   previousBestSeconds:timeTrialState.previousBest?.duration??null,
   timeSeconds:+flight.elapsed.toFixed(3)});
 ghostVisual?.hide();
 uiState.mode="ended";clearInput();
 UI.finalTitle.textContent=won?ACTIVE_TRACK_0160.name+" COMPLETE":"FLIGHT ENDED";
 UI.finalTitle.classList.toggle("success",won);
 UI.finalDistance.textContent=Math.floor(flight.s)+" M";
 if(UI.finalLaps)UI.finalLaps.textContent=flight.lapsCompleted+" / "+CIRCUIT.laps;
 UI.finalSector.textContent=String(zoneWave.playerStage+1).padStart(2,"0");
 UI.finalTime.textContent=timeTrialState.mode==="time-trial"?
  formatTrialTime(flight.elapsed):
  Math.floor(flight.elapsed/60)+":"+
   String(Math.floor(flight.elapsed%60)).padStart(2,"0");
 UI.finalJumps.textContent=flight.peakYawRateDeg.toFixed(1)+"°/S";
 UI.finalStyle.textContent=flight.offRoadSeconds.toFixed(1)+" S";
 let best=bestForTrial();
 if(won && (!best||flight.elapsed<best)){saveBest(flight.elapsed);best=flight.elapsed;}
 const reward=recordFleetClear(fleetProgress,won);
 fleetProgress=saveFleet(fleetStorage(),reward.state);
 UI.unlockToast.classList.toggle("hidden",
  !reward.newlyUnlocked.includes("stingray"));
 refreshHangar();
 if(reward.newlyUnlocked.includes("stingray"))
  event("fleet_unlock",{ship:"stingray",condition:"first_three_lap_clear"});
 UI.finalBest.textContent=timeTrialState.mode==="time-trial"?
  (ttResult?.bestSeconds?formatTrialTime(ttResult.bestSeconds):"—"):
  (best?best.toFixed(1)+" S":"—");
 UI.trialResult.classList.toggle("hidden",timeTrialState.mode!=="time-trial");
 UI.challengeResult.classList.add("hidden");
 UI.challengeEndBack.classList.add("hidden");
 UI.trialResult.classList.toggle("new-best",!!ttResult?.improved);
 if(timeTrialState.mode==="time-trial"){
  UI.trialResult.textContent=ttResult?.improved?
   "NEW PERSONAL BEST · "+formatTrialTime(flight.elapsed)+" · GHOST SAVED":
   ttResult?.reason==="slower"?
    "KEEP PUSHING · "+formatTrialDelta(
      flight.elapsed-(ttResult.bestSeconds??flight.elapsed))+" VS PERSONAL BEST":
   ttResult?.reason==="storage-unavailable"?
    "TIME COMPLETE · LOCAL STORAGE UNAVAILABLE":
    "NO GHOST SAVED · FINISH THREE CLEAN LAPS";
 }
 refreshTrialMenu();
 event(won?"trial_clear":"trial_failed",{shield:flight.shield});
 UI.hud.classList.add("hidden");UI.riskCue.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.fullscreen.classList.add("hidden");
 UI.end.classList.remove("hidden");
}
function announceSector(index){
 const palette=ZONE_PALETTES[index],color=palette.light;
 document.documentElement.style.setProperty("--neon","#"+color.toString(16).padStart(6,"0"));
 premiumFX?.onZone();
 if(index===0)return;
 reactiveHud.onZone();
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
 domWrites.text(UI.sector,String(sector+1).padStart(2,"0"));
 domWrites.text(UI.sectorName,ZONE_PALETTES[sector].name);
 domWrites.width(UI.shieldFill,flight.shield+"%");
 domWrites.text(UI.shieldText,flight.shield+"%");
 domWrites.text(UI.shieldStatus,
 flight.shield<=30?"CRITICAL":flight.shield<=60?"DAMAGED":"STABLE");
 const displayedDistance=currentChallenge?Math.max(0,flight.s-currentChallenge.startS):flight.s;
 const displayedTotal=currentChallenge?challengeDistance(currentChallenge):TRIAL.raceLength;
 domWrites.html(UI.distance,String(Math.floor(displayedDistance)).padStart(4,"0")+
 ' <small>/ '+Math.round(displayedTotal)+' M</small>');
 if(currentChallenge)domWrites.text(UI.challengeClock,formatTrialTime(flight.elapsed));
 domWrites.text(UI.lapNumber,String(flight.lap));
 domWrites.attr(UI.lapInfo,"aria-label",
 "Lap "+flight.lap+" of "+CIRCUIT.laps);
 if(timeTrialState.mode==="time-trial"){
  domWrites.text(UI.trialClock,formatTrialTime(flight.elapsed));
  const delta=updateGhostDelta(timeTrialState,
   {distance:flight.s,elapsed:flight.elapsed});
  domWrites.text(UI.trialDelta,"Δ "+formatTrialDelta(delta));
  UI.trialDelta.classList.toggle("ahead",delta!==null&&delta<-.04);
  UI.trialDelta.classList.toggle("behind",delta!==null&&delta>.04);
 }
 // Compare with baseline handling-lab speed (22 m/s), not new speed.
 domWrites.text(UI.speed,(flight.currentSpeed/22).toFixed(2)+"×");
 // The old JUMP button is a contextual TRICK key only on approach/airborne.
 // JUMP stays in the DOM for later design decisions, but GRIP is now
 // the only visible right-thumb input, both on the road and in the air.
 UI.jump.classList.add("hidden");
 domWrites.width(UI.progress,(Math.max(0,Math.min(1,displayedDistance/displayedTotal))*100).toFixed(1)+"%");
 const curve=curvatureAt(flight.s),section=sectorAt(flight.s);
 // One small persistent prompt by the existing GRIP thumb control: never
 // a full-screen warning or a new button. It starts early enough at
 // 100+ m/s for the driver to react and disappears naturally on exit.
 // Aurora has no authored narrow RIGHT apex. Reusing Skyline's 650m
 // warning displayed a fictitious apex 3348m away, three times per run.
 const cue=isAurora()?{visible:false,active:false,text:"",distanceMeters:null}:
  gripApexCue(flight.s,flight.grounded,
   uiState.gripHeld||uiState.keys.has("ShiftLeft")||
   uiState.keys.has("ShiftRight"),flight.gripActive,GRIP_APEX);
 if(cue.visible){
  if(!gripCueVisible){gripCueDisplays++;event("grip_guidance_start",{
   lap:flight.lap,distanceMeters:cue.distanceMeters});}
  UI.gripCue.classList.remove("hidden");
  if(UI.gripCue.textContent!==cue.text)UI.gripCue.textContent=cue.text;
 }else UI.gripCue.classList.add("hidden");
 gripCueVisible=cue.visible;
 // Advance announcement for an OPTIONAL higher-reward line after a corner.
 // Never compete with the GRIP APEX warning or an aerial manoeuvre.
 const riskCue=riskCueAt(flight.s,flight.lateral,flight.boostActivatedGroups);
 const showRisk=!!riskCue&&flight.grounded&&!cue.visible;
 UI.riskCue.classList.toggle("hidden",!showRisk);
 UI.riskCue.dataset.line=showRisk?riskCue.selectedLane:"";
 UI.riskCue.dataset.difficulty=showRisk?riskCue.difficulty:"";
 if(showRisk){
  domWrites.text(UI.riskCue,riskCue.text+
   (riskCue.remainingMeters>0?" · "+Math.ceil(riskCue.remainingMeters)+" M":" · NOW"));
 }
 UI.grip.classList.toggle("apex-approach",cue.visible&&!cue.active);
 UI.grip.classList.toggle("apex-engaged",cue.active);
 UI.hud.classList.toggle("hud-rail-contact",railFeedback.pulse>.025);
 domWrites.property(UI.hud,"--rail-contact",
 String(Math.min(.92,railFeedback.pulse*.92).toFixed(3)));
 domWrites.text(UI.flight,!flight.grounded?
   (flight.lastJumpLap===flight.lap?
   flight.trickReady?"AIR TRICK · 360° COMPLETE":
   flight.trickActive?"AIR TRICK · "+Math.round(flight.trickAngle/
    AIR_TRICKS.fullRollRadians*100)+"%":
   "SKYLINE LEAP · HOLD GRIP + STEER":"OFF TRACK"):
  flight.landingBoostMultiplier>1.01?
   "LANDING BOOST · +"+Math.round((flight.landingBoostMultiplier-1)*100)+"%":
   flight.corkscrewActive?(
      Math.abs(bankDegreesAt(flight.s))>145&&Math.abs(bankDegreesAt(flight.s))<215?
        "CEILING RUN · MAGNETIC LOCK":
        "CORKSCREW · "+Math.round(Math.abs(bankDegreesAt(flight.s)))+"°"):
    railFeedback.pulse>.17?"RAIL CONTACT · RECENTER": 
    cue.visible&&!flight.gripActive?"GRIP + STEER RIGHT · PRECISION APEX":
    flight.gripApexActive?"GRIP APEX · "+
      (flight.gripActive?"PRECISION HOLD":"HOLD GRIP + STEER"):
    flight.magneticActive?"MAGNETIC WALL · "+
      Math.round(Math.abs(bankDegreesAt(flight.s)))+"°":
    flight.gripActive?"GRIP · POWER CARVE":
    racingExperience.flow>.28?"PRECISION FLOW · CLEAN CARVE":
   flight.boostMultiplier>1.08?"BOOST · +"+Math.round((flight.boostMultiplier-1)*100)+"%":
   Math.abs(curve)>.0016?
     (curve<0?"LEFT":"RIGHT")+" SWEEP · "+section.name:
     section.name+" · DIRECT CONTROL");
}
function maybeShowCue(){
 if(uiState.mode!=="playing")return;
 const localS=((flight.s%CIRCUIT.lapLength)+CIRCUIT.lapLength)%CIRCUIT.lapLength;
 if(isAurora()){
  for(const hint of [
   {id:"aurora-glass",start:192,end:215,text:"AURORA GLASS SWEEP · HOLD THE ARC"},
   {id:"aurora-tunnel",start:858,end:880,text:"LUMEN PASS AHEAD · KEEP YOUR LINE"},
   {id:"aurora-north",start:1150,end:1180,text:"NORTH SWITCHBACK · PREPARE GRIP"},
   {id:"aurora-south",start:2860,end:2890,text:"SOUTH SWITCHBACK · EXIT CLEAN"}
  ]){
   if(localS>=hint.start&&localS<hint.end&&uiState.trackHint!==hint.id){
    uiState.trackHint=hint.id;flashToast(hint.text,1350);
   }
  }
  return;
 }
 for(const hint of [
   {id:"opening",start:107,end:125,text:"FIRST SWEEP AHEAD · STEER INTO THE CORNER"},
   // The persistent cue next to GRIP replaces a fleeting apex toast.
   {id:"precision-apex",start:972,end:982,text:"GRIP APEX CLEAR · STRAIGHTEN UP"},
   {id:"s-link",start:1114,end:1127,text:"S-COMPLEX · THREE RHYTHMIC BENDS"},
   {id:"shadow",start:1960,end:1982,text:"SHADOW TUNNEL AHEAD · FOLLOW THE GLOW"},
    {id:"magnetic",start:1596,end:1615,text:"MAGNETIC WALL AHEAD · HOLD YOUR LINE"},
    {id:"corkscrew",start:2925,end:2950,text:"CORKSCREW AHEAD · FULL ROLL · STAY ON THE TRACK"}
 ]){
   if(localS>=hint.start&&localS<hint.end&&
      uiState.trackHint!==hint.id){
     uiState.trackHint=hint.id;
     flashToast(hint.text,1700);
   }
 }
}
function integrate(dt){
 // A finish can occur midway through a multi-step 120Hz render frame.
 // Never award the same medal multiple times in that remaining frame.
 if(uiState.mode!=="playing")return;
 const keyRight=uiState.keys.has("ArrowRight")||uiState.keys.has("KeyD");
 const keyLeft=uiState.keys.has("ArrowLeft")||uiState.keys.has("KeyA");
 // Digital keys are scaled for predictable corner holding; analog touch
 // retains the complete range and fine control around zero.
 const keyboard=(keyRight?1:0)-(keyLeft?1:0);
 const steer=clamp(keyboard*.74+uiState.inputX,-1,1);
 const gripHeld=uiState.gripHeld||uiState.keys.has("ShiftLeft")||
   uiState.keys.has("ShiftRight");
 const result=stepFlight(flight,dt,{steer,grip:gripHeld});
 recordRealGhostPose();
 // One real 120Hz step. Read steering/GRIP/contact, never rewrite physics.
 const cleanFlow=observeRacingStep(racingExperience,flight,dt,result);
 if(cleanFlow){
  event("precision_flow",{...cleanFlow,physicalBoost:false});
  flashToast("PRECISION FLOW · "+cleanFlow.name+
   (cleanFlow.chain>1?" · CHAIN ×"+cleanFlow.chain:""),1050);
 }
 UI.grip.classList.toggle("armed",gripHeld);
 const airGrip=gripHeld&&!flight.grounded&&flight.lastJumpLap===flight.lap;
 UI.grip.classList.toggle("active",flight.gripActive||airGrip);
 UI.grip.classList.toggle("air-trick",airGrip);
 UI.grip.setAttribute("aria-pressed",flight.gripActive||airGrip?"true":"false");
 UI.controls.classList.toggle("grip-pressed",gripHeld);
 if(result.gripActivated)
  event("grip_activated",{steer:+steer.toFixed(2),
   previousFullGripReferenceFactor:GRIP_SPEC.yawMultiplier,
    actualFullGripFactorAtSpeed:+steeringBalanceAt(flight.currentSpeed).grip.toFixed(3),
   normalFactor:+normalYawFactorAt(flight.currentSpeed).toFixed(3),
   actualRelativeGain:+steeringBalanceAt(flight.currentSpeed).relativeGripGain.toFixed(2),
   maxSpeedPenaltyPercent:GRIP_SPEC.maxSpeedPenalty*100});
 if(result.boostActivated){
  // The real 120Hz pad contact selects either SAFE or RISK once per lap.
  // Trigger the existing camera/engine reaction from the ACTUAL reward.
  const choice=result.boostChoice;
  const multiplier=choice?.multiplier??BOOST_CONFIG.multiplier;
  event("boost_activated",{pad:result.boostActivated,multiplier,
   kind:choice?.kind??"launch",group:choice?.group??null});
  triggerBoostSpring(boostSpring,flight.zoneCruiseSpeed,multiplier);
  igniteVelocity(velocityState);triggerSignatureBoost(signatureFlight);
  reactiveHud.onBoost();
  const percent=Math.round((multiplier-1)*100);
  flashToast(choice?.kind==="risk"?
   "RISK LINE CLEAR · +"+percent+"% SPEED":
   choice?.kind==="safe"?
   "SAFE LINE · +"+percent+"% SPEED":
   "BOOST ENGAGED · +"+percent+"% SPEED",900);
 }
 if(flight.shield<previousHudShield)reactiveHud.onImpact();
 previousHudShield=flight.shield;
 if(result.railContactStarted){
  startRailFeedback(railFeedback,flight.lastRailSide);
  event("rail_scrub_started",{side:flight.lastRailSide,
   at:+flight.lateral.toFixed(2),
   scrubIntensity:+flight.railScrubIntensity.toFixed(3)});
 }
 if(flight.railContacts>lastRailLog){
   lastRailLog=flight.railContacts;
   event("guardrail_contact",{side:flight.lastRailSide,at:+flight.lateral.toFixed(2)});
 }
 uiState.jumpPressed=false;
 if(result.jumped){
   premiumFX?.onJump();triggerSignatureJump(signatureFlight);
   event("skyline_leap_launch",{lap:flight.lap,
    velocity:+flight.vy.toFixed(2),speed:+flight.currentSpeed.toFixed(2)});
   flashToast("SKYLINE LEAP · GRIP + STEER TO ROLL",1150);
 }
 if(result.trickStarted)
  event("air_trick_started",{lap:flight.lap,
   direction:flight.trickDirection<0?"LEFT":"RIGHT"});
 if(result.trickCompleted){
  event("air_trick_full_rotation",{lap:flight.lap,
   direction:flight.trickDirection<0?"LEFT":"RIGHT",
   degrees:+flight.trickPeakDegrees.toFixed(1)});
  flashToast("360° AIR ROLL · NAIL THE LANDING",740);
 }
 if(result.landed){
   // Camera-only short landing compress/recover impulse. Authoritative
   // flight physics and the actual landing impact remain untouched.
   if(CAMERA_GAIN>0)triggerKineticLanding(kineticCamera,result.landImpact);
   triggerSignatureLanding(signatureFlight,result.landImpact);
   const p=positionAt(flight.s,flight.lateral,0);
   premiumFX?.onLand({...p,heading:flight.heading});
   event("landing",{impact:+result.landImpact.toFixed(2),
    cleanLeaps:flight.cleanLeapLandings});
   if(result.landingBoostAwarded){
    event("landing_boost_awarded",{lap:flight.lap,
     bonusPercent:AIR_TRICKS.landingBoostPercent,
     durationSeconds:AIR_TRICKS.landingBoostDurationSeconds});
    triggerBoostSpring(boostSpring,flight.zoneCruiseSpeed,
      1+AIR_TRICKS.landingBoostPercent/100);
    igniteVelocity(velocityState);triggerSignatureBoost(signatureFlight);
    reactiveHud.onBoost();
    flashToast("PERFECT LANDING · +22% BOOST",1150);
   }else if(result.landingBoostRejected){
    event("air_trick_missed",{lap:flight.lap,
      reason:result.landingBoostReason,
      achievedDegrees:+flight.trickPeakDegrees.toFixed(1)});
    flashToast("TRICK NOT LANDED · NO BOOST",890);
   }else if(flight.cleanLeapLandings>0)
    flashToast("CLEAN LANDING",770);
 }
 if(result.cleared)event("gap_cleared",{count:flight.clearedGaps.length});
 if(result.routeChoice)event("route_choice",{route:result.routeChoice});
 if(result.routeReward){
   event("risk_route_clear",{styleBonus:500});
   flashToast("RISK ROUTE CLEAR · +500 STYLE",1700);
 }
 if(result.gripApexEntered){
  event("grip_apex_enter",{lap:flight.lap,
   widthMeters:GRIP_APEX.minWidthMeters,
   peakCurvature:GRIP_APEX.peakCurvature});
 }
 if(result.gripApexExited){
  event("grip_apex_exit",{lap:flight.lap,clean:result.cleanGripApexExit,
    gripSeconds:+flight.gripApexGripSeconds.toFixed(2)});
  if(result.cleanGripApexExit)flashToast("GRIP APEX · CLEAN LINE",820);
 }
 if(result.corkscrewEntered){
   event("corkscrew_enter",{lap:flight.lap,
     start:CORKSCREW.start,lengthMeters:CORKSCREW.lengthMeters});
   flashToast("CORKSCREW ENGAGED · 360° ROLL",1350);
 }
 if(result.corkscrewExited){
   event("corkscrew_exit",{lap:flight.lap,clean:result.cleanCorkscrewExit,
     peakDegrees:+flight.corkscrewPeakDegrees.toFixed(1),
     ceilingSeconds:+flight.corkscrewCeilingSeconds.toFixed(2)});
   flashToast(result.cleanCorkscrewExit?
     "CORKSCREW CLEAR · PERFECT LINE":"CORKSCREW COMPLETE",950);
 }
 if(result.wallEntered){
   event("magnetic_wall_enter",{lap:flight.lap,
     bankDegrees:+bankDegreesAt(flight.s).toFixed(1)});
   flashToast("MAGNETIC GRIP ENGAGED · WALL RIDE",1150);
 }
 if(result.wallExited){
   event("magnetic_wall_exit",{lap:flight.lap,
     clean:result.cleanWallExit,
     peakDegrees:+flight.magneticPeakDegrees.toFixed(1)});
   if(result.cleanWallExit)flashToast("MAGNETIC WALL CLEAR",850);
 }
 if(result.crashed){
   event("fall",{at:Math.round(flight.lastCrashS),shield:flight.shield});
   flashToast("OFF TRACK · RETRY FROM CHECKPOINT",1350);
 }
 if(result.lapCompleted){
  const completed=result.lapCompleted,lapTime=flight.lapTimes.at(-1);
  event("lap_completed",{completed,lapSeconds:lapTime,upcomingLap:flight.lap});
  if(completed<CIRCUIT.laps)
   flashToast("LAP "+(completed+1)+" / "+CIRCUIT.laps+
    " · "+lapTime.toFixed(1)+"S · KEEP PUSHING",1550);
 }
 const wave=updateZoneWave(zoneWave,flight.elapsed,flight.s);
 for(const stage of wave.started)
  event("zone_wave_emitted",{stage,originMeters:+zoneWave.waves[stage-1].startS.toFixed(1)});
 if(wave.changed){
  previousSector=wave.stage;
  setZoneSpeedStage(flight,wave.stage);
  event("zone_speed_increase",{
   stage:wave.stage,cruiseTargetMetersPerSecond:+speedAt(flight.s,wave.stage).toFixed(2),
   speedStepPercent:+((TRIAL.zoneSpeedStep-1)*100).toFixed(1)});
  announceSector(wave.stage);
 }
 const insideNow=inShadowTunnel(flight.s);
 if(insideNow&&!tunnelInside){
  tunnelEntries++;event("shadow_tunnel_enter",{lap:flight.lap});
 }else if(!insideNow&&tunnelInside){
  tunnelExits++;event("shadow_tunnel_exit",{lap:flight.lap});
 }
 tunnelInside=insideNow;
 if(insideNow)tunnelSeconds+=dt;
 maybeShowCue();
 if(currentChallenge){
  const reached=flight.s>=currentChallenge.endS&&!flight.failed;
  if(reached||flight.failed)endRun(reached);
 }else if(result.finished)endRun(true);
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
 // Spatial darkness reduces atmosphere wash while leaving track HDR intact.
 const shadow=tunnelIntensityAt(flight.s);
 targetSky.lerp(SHADOW_VOID,shadow*.95);
 targetFog.lerp(SHADOW_VOID,shadow*.94);
 if(CINEMATIC_ENABLED){
  targetSky.multiplyScalar(CINEMATIC_SPACE_0170.skyScale);
  targetFog.multiplyScalar(CINEMATIC_SPACE_0170.fogScale);
 }
 tunnelMaxIntensity=Math.max(tunnelMaxIntensity,shadow);
 const k=1-Math.exp(-dt*4.2);
 scene.background.lerp(targetSky,k);
 scene.fog.color.lerp(targetFog,k);
 cinematicLighting?.update({accent:targetAccent,sky:scene.background,
  fog:scene.fog.color,resonance,darkness:shadow});
 neonKit.updateAccent(targetAccent,k);
 shadowTunnel?.setAccent(neonKit.worldAccent);
 // Rail lighting samples its own track coordinate inside its shader.
 for(const light of engineLights)light.color.copy(neonKit.worldAccent);
}
function placeShip(time,dt,view=flight,motion=motionState,cinematic=cinematicState){
 // True world-space heading remains pilot-owned. Body pose is visual-only.
 const clearance=motionRig.clearance;
 const solid=onRoad(view.s,view.lateral);
 const surfaceNormal=surfaceNormalAt(view.s);
 const rideOffset=view.grounded?TRIAL.hoverHeight:0;
 // Identical road-normal hover pose for both ships. No Stingray-only
 // +26cm clearance lift, dynamic wing check or special compensation.
 ship.position.set(
  view.worldX+surfaceNormal.x*(rideOffset+motion.hover),
  view.y+surfaceNormal.y*motion.hover,
  view.worldZ+surfaceNormal.z*(rideOffset+motion.hover));
  // Added animation is relative to the road normal: no changed physics.
  ship.position.x+=surfaceNormal.x*signatureFlight.lift;
  ship.position.y+=surfaceNormal.y*signatureFlight.lift;
  ship.position.z+=surfaceNormal.z*signatureFlight.lift;
 // Tiny reaction of the rendered hull only; physical pilot position,
 // bank, collision and camera target remain completely unchanged.
 ship.position.x-=Math.sin(view.heading)*velocityState.recoilMeters;
 ship.position.z+=Math.cos(view.heading)*velocityState.recoilMeters;
 // Cosmetic nose alignment <2 degrees; authoritative world yaw unchanged.
 ship.rotation.y=-view.heading+cinematic.noseYaw;
 // Extra craft attitude is visual-only; heading and yaw rate are already
 // resolved by stepFlight, independent of the camera.
 // The hull matches the actual physical banked road normal.
  // The flight-motion bank convention is NEGATIVE steering:
 // left input (<0) banks toward +Z (port wing down), right toward -Z.
 // The trick physics stores direction in INPUT sign, so the rendered
 // barrel roll must negate trickVisualAngle to match both normal banking
 // and the opposite-wing GRIP jet. Without this, LEFT rolled RIGHT.
 // Visual-only: the 120Hz air-time, landing judgement and velocity remain.
 const roadBank=bankAt(view.s);
 const naturalRoll=motion.roll-roadBank-
  (view.trickVisualAngle??0)-
   Math.sign(flight.gripDirection)*flight.gripIntensity*.058+
   signatureFlight.roll+velocityPresence.hullRoll+
   racingExperience.hullCarve*
    (view.grounded&&!motionRig.wall&&!motionRig.corkscrew?1:0);
 // NO ship-specific banking/GRIP restrictions. Both hulls receive
 // exactly the same physical input-derived, cinematic presentation roll.
 ship.rotation.z=naturalRoll;
 // Same side-engine geometry that powers GRIP turns now powers air-rolls.
 // The bright white-core jet visibly fires on the correct wing in flight.
 const airThruster=flight.trickActive&&!view.grounded;
 sideThrusters?.frame(airThruster?1:flight.gripIntensity,
  airThruster?flight.trickDirection:flight.gripDirection,time);
 // Authoritative terrain slope alters hull attitude; no fake banking
 // or automatic horizontal steering is introduced.
 ship.rotation.x=motion.pitch+velocityState.pitchRadians+pitchAt(view.s)+
   signatureFlight.pitch+velocityPresence.hullPitch;
 const crossingPulse=waveResonanceStrength(zoneWave,flight.elapsed);
 const charge=spectralChargeStrength(flight.elapsed);
 // Reuse two wing engine lights for a subtle neutral-white crest crossing.
 for(const light of engineLights)
  light.color.lerp(SPECTRAL_WHITE,crossingPulse*.30);
 engineLights.forEach((light,i)=>{light.intensity=
   NEON_TUNING.enginePointIntensity*.42*engineLightFactor(cinematic)*
   (1+velocityState.engineFlow*.60+velocityState.ignition*.20)*
   (1+.22*crossingPulse+.07*charge+
   .22*Math.min(1,Math.abs(view.trickVisualAngle??0)/(2*Math.PI))+
   .16*Math.min(1,(flight.landingBoostMultiplier-1)/.22))*
    (1+.24*signatureFlight.engineEnergy+.13*signatureFlight.boostSurge)*
    (1+velocityPresence.engineLoad*.36+racingExperience.engineLift*.37)*
    (1+(i===0?-1:1)*signatureFlight.engineSplit*.16);
  });
 if(engineCore)engineCore.scale.z=1+cinematic.engineEnergy*.16+
  velocityState.engineFlow*.34+velocityState.ignition*.10+
  signatureFlight.engineEnergy*.16+velocityPresence.engineLoad*.23+
  racingExperience.engineLift*.17;
 for(let i=0;i<enginePlumes.length;i++){
   const sign=i===0?-1:1;
   const pulse=.028*Math.sin(time*21+i*1.4);
   const boost=clamp((flight.boostMultiplier-1)/(BOOST_CONFIG.multiplier-1),0,1);
   const shape=1+.065*cinematic.engineEnergy+boost*.10+
    velocityState.engineFlow*.16+velocityState.ignition*.09+pulse+
    crossingPulse*.10+charge*.035+
    signatureFlight.engineEnergy*.075+signatureFlight.boostSurge*.10+
    velocityPresence.engineLoad*.17+racingExperience.engineLift*.23;
   const bankVariation=sign*clamp(view.steering,-1,1)*.035+
    sign*signatureFlight.engineSplit*.050;
   // Exhaust cylinder axis is local Y. Animate the radius (X/Z).
   enginePlumes[i].scale.set(shape+bankVariation,
    1+boost*.10+velocityState.engineFlow*.12+
    signatureFlight.engineEnergy*.12,shape);
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
 CAMERA_VIEW.y=view.y;CAMERA_VIEW.s=view.s;CAMERA_VIEW.steering=view.steering;
 CAMERA_VIEW.clearance=clearance;
 // Kinetic springs have already advanced on this exact flight pose in
 // advanceUnifiedFlightRig: this method only applies the shared outputs.
 const speedRigSafety=motionRig.corkscrew?0:motionRig.wall?.20:1;
 CAMERA_VIEW.kineticSideMeters=kineticCamera.sideMeters*CAMERA_GAIN+
  racingExperience.cameraShiftMeters*speedRigSafety;
 CAMERA_VIEW.kineticDistanceMeters=kineticCamera.distanceMeters*CAMERA_GAIN+
  (velocityPresence.cameraDistance+
   racingExperience.cameraPullbackMeters)*speedRigSafety;
 CAMERA_VIEW.kineticEyeLiftMeters=kineticCamera.eyeLiftMeters*CAMERA_GAIN+
  velocityPresence.cameraAirLift*speedRigSafety;
 CAMERA_VIEW.kineticLandingMeters=kineticCamera.landingMeters*CAMERA_GAIN;
 CAMERA_VIEW.kineticLookLiftMeters=kineticCamera.lookLiftMeters*CAMERA_GAIN+
  velocityPresence.cameraLookLift*speedRigSafety;
 const framing=chasePose(CAMERA_VIEW,motion,cinematic,cinematicTuning,CAMERA_INFO);
 CAMERA_TARGET_POSITION.set(framing.x,framing.y,framing.z);
 CAMERA_TARGET_LOOK.set(framing.lookX,framing.lookY,framing.lookZ);
 // The underlying chase camera stays responsive in curves. The boost
 // contributes only a separate critically-damped forward-axis offset.
 // This avoids the old slow/fast response switch and the 10m position snap.
 const follow=1-Math.exp(-dt*cinematicTuning.cameraFollowResponse);
 CAMERA_BASE_POSITION.lerp(CAMERA_TARGET_POSITION,follow);
 cameraLook.lerp(CAMERA_TARGET_LOOK,follow);
 const physicalExtraSpeed=Math.max(0,flight.currentSpeed-flight.zoneCruiseSpeed);
 const lag=stepBoostSpring(boostSpring,
  uiState.mode==="playing"?dt:0,physicalExtraSpeed);
 camera.position.copy(CAMERA_BASE_POSITION);
 camera.position.x-=Math.sin(motion.cameraHeading)*lag;
 camera.position.z+=Math.cos(motion.cameraHeading)*lag;
 camera.lookAt(cameraLook);
 // Partial camera roll holds a legible horizon while the track goes vertical.
  // Roll is 100% through the full revolution: 46% would hard-snap the
 // horizon at -360° -> 0°. The 70° wall retains its gentler partial roll.
 // Full track roll is retained for the inverted 360° corkscrew; kinetic
 // lean is mechanically suppressed inside banks rather than subtracting
 // from the real corkscrew or snapping the horizon on the 360° seam.
 const protectedRoll=motionRig.corkscrew||motionRig.wall?0:1;
 camera.rotateZ(motion.cameraRoll-cameraBankAt(view.s)+
  kineticCamera.rollRadians*CAMERA_GAIN+
  racingExperience.cameraLean*protectedRoll);
 const oldFov=cinematicFov(flight.currentSpeed,TRIAL.startSpeed,cinematicTuning);
 const kineticFov=kineticFovAt(flight.currentSpeed);
 const baseFov=clamp(oldFov+(kineticFov-oldFov)*CAMERA_GAIN,65.4,78);
 const fovConfig=CAMERA_GAIN===0?CLASSIC_BOOST_FOV:BOOST_SPRING;
 const targetFov=boostFovTarget(baseFov,Math.max(flight.boostMultiplier,
  flight.landingBoostMultiplier),BOOST_CONFIG.multiplier,fovConfig);
 const fovResponse=boostFovResponse(camera.fov,targetFov,fovConfig);
 const presenceFov=CAMERA_GAIN===0?0:velocityPresence.fovBonus*speedRigSafety;
 camera.fov=lerp(camera.fov,Math.min(80.5,targetFov+presenceFov+
  racingExperience.fovAddition*protectedRoll),
  1-Math.exp(-dt*fovResponse));
 boostSpring.peakFovBonusDegrees=Math.max(boostSpring.peakFovBonusDegrees,
  camera.fov-baseFov);
 maxKineticFov=Math.max(maxKineticFov,camera.fov);
 cinematic.maxCameraLateralMeters=Math.max(cinematic.maxCameraLateralMeters,Math.abs(framing.sideOffsetMeters));
 camera.updateProjectionMatrix();
}
function loop(now){
 requestAnimationFrame(loop);
 let physicsMs=0,hudMs=0,physicsSteps=0;
 const presentationBegin=performance.now();
 const rawDt=Math.max(0,(now-worldClock.last)/1000);
 const dt=Math.min(.095,rawDt);
 worldClock.last=now;
 if(uiState.mode==="playing"&&!waveSmokeHold){
   const physicsBegin=performance.now();
   const tick=advanceFrame(frameClock,rawDt,step=>{
     if(!currentRenderPose)currentRenderPose=capturePose(flight);
     if(!previousRenderPose||previousRenderPose===currentRenderPose)
      previousRenderPose=capturePose(currentRenderPose);
     capturePose(currentRenderPose,previousRenderPose);
     integrate(step);
     capturePose(flight,currentRenderPose);
     if(shouldSnapPose(previousRenderPose,currentRenderPose))
      capturePose(currentRenderPose,previousRenderPose);
   });
   frameBlend=tick.alpha;physicsSteps=tick.steps;
   physicsMs=performance.now()-physicsBegin;
   const hudBegin=performance.now();
   if(hudBudget.shouldUpdate(now))refreshHud();
   hudMs=performance.now()-hudBegin;
 }
 if(flight){
   const presentationDt=uiState.mode==="playing"?dt:0;
   if(uiState.mode==="playing"){
    stepRailFeedback(railFeedback,dt,flight.railContacting);
    if(gripCueVisible)gripCueSeconds+=dt;
   }
   stepVelocityState(velocityState,presentationDt,flight.currentSpeed,
    flight.zoneCruiseSpeed,flight.boostMultiplier);
   stepVelocityPresence(velocityPresence,presentationDt,{
    speed:flight.currentSpeed,boostMultiplier:Math.max(flight.boostMultiplier,
      flight.landingBoostMultiplier),
    grounded:flight.grounded,verticalSpeed:flight.vy,steering:flight.steering,
    yawRate:flight.yawRate,trickActive:flight.trickActive
   });
   // Every zone increases environmental flow even without hitting a boost pad.
   const worldFlow=Math.max(velocityState.worldFlow,velocityPresence.trackFlow);
   premiumSurface?.setVelocityFlow(worldFlow,velocityState.flowPhaseMeters);
   identitySurface?.setVelocityFlow(worldFlow,velocityState.flowPhaseMeters);
   spaceBackdrop?.setVelocityFlow(Math.max(velocityState.worldFlow*.66,
    velocityPresence.starFlow));
   tunnelBlackout?.apply(uiState.mode==="hangar"?0:flight.s);
   updatePalette(dt);
   // CI-only moving flight-path probe; normal players never take this path.
   if(wakeSmokePath&&uiState.mode==="playing"){
    const k=wakeSmokePath.frames++;
    flight.s+=.86;
    const testPose=positionAt(flight.s,flight.lateral);
    flight.worldX=testPose.x;
    flight.worldZ=testPose.z;
    flight.heading=headingAt(flight.s)+
     (wakeSmokePath.load==="grip"?.15*Math.sin(k*.075):0);
    flight.y=surfaceHeightAt(flight.s)+TRIAL.hoverHeight+
      (wakeSmokePath.load==="air"?4:0);
    currentRenderPose=capturePose(flight);
    previousRenderPose=currentRenderPose;frameBlend=0;
   }
   const view=uiState.mode==="playing"&&currentRenderPose?
     interpolatePose(previousRenderPose,currentRenderPose,frameBlend,interpolatedRenderPose):flight;
   // Flight motion sees the same interpolated 120Hz simulation pose as FX.
   // Ship bank, signature effects, preview and kinetic camera share
   // stable read-only signals. All original springs and handling are kept.
   advanceUnifiedFlightRig(motionRig,view,flight,presentationDt,now/1000,
    uiState.mode==="playing",motionState,signatureFlight,cinematicState,
    kineticCamera);
   stepRacingExperience(racingExperience,presentationDt,{
    s:view.s,steering:view.steering,yawRate:view.yawRate,
    gripIntensity:flight.gripIntensity,
    speed:flight.currentSpeed,grounded:view.grounded,
    wall:motionRig.wall,corkscrew:motionRig.corkscrew,
    playing:uiState.mode==="playing"
   });
   // 0.11.4 optimized near-field PBR remains vertex-calculated even on
   // 4GB devices by default. The classic low-memory shader is opt-out only.
   // A51 still gets its ordinary adaptive DPR and optimized bloom pass.
   fidelitySignals.s=view.s;
   fidelitySignals.speed=flight.currentSpeed;
   fidelitySignals.boostMultiplier=Math.max(flight.boostMultiplier,
    flight.landingBoostMultiplier);
   fidelitySignals.wave=waveResonanceStrength(zoneWave,flight.elapsed);
   fidelitySignals.playing=uiState.mode==="playing";
   advanceFidelityDirector(fidelityDirector,presentationDt,fidelitySignals);
   premiumSurface?.setFidelitySignal(fidelityDirector);
   // Original on-track Hangar preview. The game physics remains frozen
   // while the procedural ship and scenery are rendered normally.
   placeShip(now/1000,dt,view,motionState,cinematicState);
   // Playback uses elapsed race time and *recorded real coordinates*,
   // never an AI driver or automatic road centerline. Hidden in normal runs.
   if(uiState.mode==="playing"&&timeTrialState.mode==="time-trial"){
    const visible=ghostVisual?.frame({active:true,enabled:ghostEnabled,
     best:timeTrialState.previousBest,
     elapsed:view.elapsed??flight.elapsed});
    timeTrialState.ghostFrames++;
    if(visible)timeTrialState.ghostVisibleFrames++;
    if(timeTrialState.previousBest&&
       flight.elapsed>timeTrialState.previousBest.duration)
     timeTrialState.playbackEnded=true;
   }else ghostVisual?.hide();
   // Tail articulation is presentation only: camera and 120Hz physics
   // continue to follow the pilot rather than any segment positions.
   if(activeCraft?.frameTail){
    const demo=uiState.mode==="hangar";
    activeCraft.frameTail(demo?dt:uiState.mode==="playing"?dt:0,
     demo?{steering:Math.sin(now*.0012)*.93,
      yawRate:Math.sin(now*.0012-.29)*.86,
      gripIntensity:.48+.46*(.5+.5*Math.sin(now*.00063)),
      boostMultiplier:1.10+.13*(.5+.5*Math.cos(now*.00082)),
      speed:104,grounded:true}:
      {steering:view.steering,yawRate:view.yawRate,
       gripIntensity:flight.gripIntensity,
       boostMultiplier:flight.boostMultiplier,
       speed:flight.currentSpeed,grounded:view.grounded,
       verticalSpeed:view.vy??flight.vy});
   }
   // Four pre-batched premium surfaces only change material glow; neither
   // model influences the pilot physics, real camera or collisions.
   if(activeCraft?.framePolish){
    const demo=uiState.mode==="hangar";
    activeCraft.framePolish(demo?dt:uiState.mode==="playing"?dt:0,
      demo?{speed:104,
       gripIntensity:.30+.22*Math.sin(now*.00075),
       boostMultiplier:1.14}:
      {speed:flight.currentSpeed,gripIntensity:flight.gripIntensity,
       boostMultiplier:flight.boostMultiplier});
   }
   // Real steering -> sprung deployable metal plates, independent of flight.
   // Hangar previews show an authentic slow actuation on the original track.
   const showroom=uiState.mode==="hangar";
   reactiveWingFlaps?.frame(showroom?dt:presentationDt,
    showroom?{
     steering:Math.sin(now*.00135)*.85,
     yawRate:Math.cos(now*.00135)*.53,
     gripIntensity:.46+.30*Math.sin(now*.00067)
    }:{
     steering:view.steering,yawRate:view.yawRate,
     gripIntensity:flight.gripIntensity
    });
   // True ship-local three-quarter framing for the Stingray Hero.
   // The full original racing track remains visible behind the Hangar.
   // Switch off both temporary art lights before any real gameplay frame.
   if(uiState.mode==="hangar"&&activeShipId==="stingray"){
    hangarHeroRig?.frame({hangar:true,ship,camera,
     shipId:activeShipId,time:now*.001});
   }else{
    hangarHeroRig?.disable();
    // Manta Blade retains its established showroom presentation.
    if(uiState.mode==="hangar"){
     const t=now*.00023;
     camera.position.set(ship.position.x+5.9+Math.sin(t)*.65,
      ship.position.y+3.45,
      ship.position.z+11.8+Math.cos(t)*.55);
     camera.lookAt(ship.position.x-6.5,
      ship.position.y+.28,ship.position.z+1.7);
    }
   }
   if(premiumFX){
    // Stable context; active engine FX needs only forwardSpeed and boostMultiplier.
    engineFxFrame.dt=dt;
    engineFxFrame.playing=uiState.mode==="playing";
    engineFxFrame.flight.forwardSpeed=flight.currentSpeed;
    engineFxFrame.flight.boostMultiplier=flight.boostMultiplier;
    engineFxFrame.ship=ship;engineFxFrame.shipGlow=shipGlow;
    engineFxFrame.sectorColor=COLOR[zoneWave.playerStage].color;
    engineFxFrame.motionWeight=cinematicState;
    engineFxFrame.velocity=velocityState;
    engineFxFrame.presence=velocityPresence;
    premiumFX.frame(engineFxFrame);
   }
   // Physical WORLD history is sampled after the final ship scale and pose.
   // This wake lives in the scene, not parented to the moving/turning hull.
   if(perfSettings.preset!=="no-wake-sparks")livingWake?.frame(presentationDt,{
    playing:uiState.mode==="playing",
    camera,speed:flight.currentSpeed,
    steering:view.steering,yawRate:view.yawRate,
    gripIntensity:flight.gripIntensity,
    boostMultiplier:Math.max(flight.boostMultiplier,flight.landingBoostMultiplier),
    grounded:view.grounded
   });
   // Genuine physical rail contact ONLY. Ballistic sparks are independent
   // of the ship matrix and remain in world space after a scrape ends.
   const sparkSide=flight.railContacting?flight.lastRailSide:0;
   if(perfSettings.preset!=="no-wake-sparks")railSparks?.frame(presentationDt,{
    playing:uiState.mode==="playing",camera,
    railContact:sparkSide&&view.grounded?
      railContactPoint(view.s,sparkSide):null,
    contacting:flight.railContacting,side:sparkSide,
    grounded:view.grounded,speed:flight.currentSpeed,
    scrubIntensity:flight.railScrubIntensity,
    contactSerial:flight.railContactStarts
   });
   // Actual interpolated craft roll and simulated flight speed, not generic
   // looping animation: feedback stays in phase with physics and camera.
   reactiveHud.update(uiState.mode==="playing"?dt:0,{
    shield:flight.shield,
    boostMultiplier:flight.boostMultiplier,
    speedRatio:flight.currentSpeed/22,
    zoneStage:zoneWave.playerStage
   });
 }
 // World-anchored stellar glow follows camera position, never camera heading.
 cinematicLighting?.frame();
 signatureEnvironment?.frame?.(camera);
 // One renderer.info reset PER frame, preserving the sum of composer passes.
 const presentationMs=Math.max(0,performance.now()-presentationBegin-physicsMs-hudMs);
 renderer.info?.reset();
 gpuClock?.begin();
 const renderBegin=performance.now();
 try{
  if(neonPipeline)neonPipeline.render(dt);
  else renderer.render(scene,camera);
 }finally{gpuClock?.end()}
 const renderCpuMs=performance.now()-renderBegin;
 if(uiState.mode==="playing"&&renderer.info){
   const work=renderer.info.render;
   renderSamples++;
   renderCallTotal+=work.calls;renderCallPeak=Math.max(renderCallPeak,work.calls);
   triangleTotal+=work.triangles;
   observeFrame(frameMonitor,rawDt,renderCpuMs);
   recordPerfFrame(frameProfiler,{frameMs:rawDt*1000,physicsMs,hudMs,presentationMs,
    renderCpuMs,steps:physicsSteps,drawCalls:work.calls,triangles:work.triangles,
    droppedSimulationMs:frameClock.droppedSeconds*1000});
   if(perfPanel&&now-lastPerfPanelUpdate>=1000){
    lastPerfPanelUpdate=now;
    const s=perfSummary(frameProfiler),m=s.breakdown,g=gpuClock.summary();
    perfPanel.textContent="SKYSHIFT PERF / "+perfSettings.preset+
     "\nFPS "+(s.observedFps??0).toFixed(1)+" · frame p95 "+(m.frameMs.p95??0).toFixed(1)+"ms"+
     "\nPhysics "+(m.physicsMs.p95??0).toFixed(2)+" · UI "+(m.hudMs.p95??0).toFixed(2)+
     "\nVisual "+(m.presentationMs.p95??0).toFixed(2)+" · Render CPU "+(m.renderCpuMs.p95??0).toFixed(2)+
     "\nGPU p95 "+(g.available?(g.p95Ms===null?"sampling":g.p95Ms+"ms"):"unavailable")+
     " · spikes "+s.spikesOver33ms;
   }
   // The existing hysteretic frame-pacing director chooses the level.
   // Our new device-specific cap makes LOW-MEMORY tiers actually work;
   // previously 2.0/1.75/1.5 never reduced a 1.35x Samsung buffer.
   const tierChanged=perfSettings.fixedQuality?null:nextAdaptiveRatio(
     adaptiveQuality,rawDt*1000,now,NEON_TUNING.maxPixelRatio
   );
   if(tierChanged!==null&&neonPipeline){
     const targetDpr=dprForAdaptiveLevel(claritySettings,adaptiveQuality.level);
     neonPipeline.setInternalPixelRatio(targetDpr,innerWidth,innerHeight);
     event("adaptive_render_resolution",{ratio:+targetDpr.toFixed(2),
       antiAliasing:CLARITY.antiAliasing,level:adaptiveQuality.level});
   }
 }
}
function exportAudit(){
 const timing=monitorSummary(frameMonitor);
 const worstMs=frameMonitor.allFrameTimes.length?
    Math.max(...frameMonitor.allFrameTimes):null;
 const data={
   game:"SKYSHIFT",version:"0.19.2",trial:TRIAL.id,exportedAt:new Date().toISOString(),
   timeTrial:{...ghostAudit(timeTrialState),visual:ghostVisual?.stats()??null},
    performanceAudit:{...perfSummary(frameProfiler),preset:perfSettings,
     gpu:gpuClock?.summary()??{available:false,reason:"uninitialized"},
     rendererDpr:renderer.getPixelRatio(),internalDpr:neonPipeline?.internalPixelRatio,
     bloomEnabled:neonPipeline?.bloom?.enabled,
     smaaEnabled:neonPipeline?.smaa?.enabled,
     bloomResolutionScale:neonPipeline?.bloomResolutionScale,
     deviceMemoryGB:navigator.deviceMemory??null,
     devicePixelRatio:devicePixelRatio||1},
   visual:{pipeline:"HDR UnrealBloom",tier:"Stingray Size Parity 0.19.2 · Power Carve",
     renderDpr:renderer.getPixelRatio(),
     internalHdrPixelRatio:neonPipeline?.internalPixelRatio,
     imageClarity:clarityAudit(claritySettings,neonPipeline),
     reactiveHud:reactiveHud.stats(),
     adaptiveQualityChanges:adaptiveQuality.changes,
     unifiedFlightMotion:unifiedFlightAudit(motionRig),
     smartVisualFidelity:{...fidelityAudit(fidelityDirector),
      shaderVariant:premiumSurface?.fidelityShaderVariant,
      modeSelection:fidelityProfile.modeSelection,
      shaderChangesOnLowMemory:fidelityProfile.lowMemory&&fidelityProfile.premium,
      premiumDefaultOnLowMemory:fidelityProfile.defaultPremiumOnLowMemory,
      userRequestedOff:fidelityProfile.userRequestedOff,
      adaptiveResolutionEnabled:!perfSettings.fixedQuality},
     racingExperience:{...RACING_0121,...racingExperienceAudit(racingExperience),
      currentRhythm:raceRhythmAt(flight.s)},
     sectorLandmarks:sectorLandmarks?.stats()??null,
     renderOptimization:{...OPT_0111,bloom:neonPipeline?.bloomResolution(),
      hud:hudBudget.stats(),domWrites:domWrites.stats(),
      profilerUsesTypedArray:true,engineFxReusesContext:true,
      railSparkStatsPreservedAtFinish:Boolean(completedSparkStats)},
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
     architecturalHero:{enabled:architectureEnabled,
      ...(orbitalHero?.stats?.()??{active:false}),
      comparison:"?architecture=classic",
      pass1MaterialsReverted:true,physicsUnchanged:true,
      globalLightingUnchanged:true},
     cinematicWorldRebuild:{enabled:worldEnabled,
      ...(cinematicWorld?.stats?.()??{active:false,beams:0}),
      physicsUnchanged:true,cameraUnchanged:true,
      classicComparison:"?world=classic"},
     signatureArchitecture:{enabled:envEnabled,
      ...(signatureEnvironment?.stats?.()??{active:false,beams:0}),
      originalBannersPreserved:true,unchangedSteering:true,
      inactiveOnAurora:isAurora(),classicComparison:"?env=classic"},
     cinematicAtmosphere:{enabled:CINEMATIC_ENABLED,
      ...(cinematicLighting?.stats()??{mode:"classic"}),
      unchangedFlightPhysics:true,classicComparison:"?lighting=classic"},
     shadowTunnel:{...shadowTunnel?.getStats(),
      blackout:{...TUNNEL_BLACKOUT,...tunnelBlackout?.audit()},
      entryCount:tunnelEntries,exitCount:tunnelExits,
      secondsInside:+tunnelSeconds.toFixed(2),
      peakAtmosphereDarkness:+tunnelMaxIntensity.toFixed(3),
      roadGlowPreserved:true,railGlowPreserved:true,
      whiteCoreWaveVisible:true,threeLapCircuitUnchanged:true},
     sharedDeckNormals:true,
     fleet:{...fleetStatus(fleetProgress),activeModel:activeShipId,
        previewModel:previewShipId,tail:activeCraft?.tailStats?.()??null,
        surfacePolish:activeCraft?.polishStats?.()??null,
        reactiveWingFlaps:reactiveWingFlaps?.stats?.()??null,
        flightPhysicsUnchanged:true},
      shipIdentity:{name:activeCraft?.spec?.name??MANTA_IDENTITY.name,
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
      livingWake:{...LIVING_WAKE,...livingWake?.stats()},
      reactiveWingFlaps:{...REACTIVE_FLAPS,...reactiveWingFlaps?.stats()},
      shipArt:shipArtController.audit(),
      stingrayPresentation:STINGRAY_PRESENTATION_01347,
      heroShowroom:hangarHeroRig?.stats(),
      railScrapeSparks:{...RAIL_SPARKS,...(completedSparkStats??railSparks?.stats())},
      velocityPresence:{...velocityPresenceAudit(velocityPresence),
        sharedVisualOnly:true,zoneDrivenFlow:true,airborneFeedback:true},
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
     banking:"3D elevation, physical magnetic 70° wall and full 360° inverted corkscrew",
     flightMotion:"Real 3D hover, ballistic leap, wall grip and track-local 360° corkscrew steering",
     flightTuning:{...flightTuning},cameraTuning:{...cinematicTuning},
     kineticCamera:{...KINETIC_CAMERA,mode:CAMERA_MODE,
      gain:CAMERA_GAIN,...kineticCameraAudit(kineticCamera),
      maxObservedFovDegrees:+maxKineticFov.toFixed(2),
      comparesSamePhysics:true,unchangedThreeDimensionalTrack:true,
      realFlightSteeringOnly:true},
      signatureFlight:{...SIGNATURE_FLIGHT,...signatureFlightAudit(signatureFlight),
       underlyingHandlingVersion:STEERING_AUTHORITY.version,
       cameraMode:CAMERA_MODE,shipModel:activeCraft?.spec?.name??MANTA_IDENTITY.name},
     maxCameraPreviewDegrees:+cinematicState.maxPreviewDegrees.toFixed(2),
     maxCosmeticNoseYawDegrees:+cinematicState.maxNoseDegrees.toFixed(2),
     maxEngineResponse:+cinematicState.maxEngineEnergy.toFixed(3),
     maxCameraSideOffsetMeters:+cinematicState.maxCameraLateralMeters.toFixed(2),
      steeringAuthority:{...STEERING_AUTHORITY,
       handlingProfile:"GRIP-FIRST · WIDE ARC / POWER CARVE",
       fullGripFactor:STEERING_AUTHORITY.fullGripFactor,
       normalYawAtStart:STEERING_AUTHORITY.normalSlowFactor,
       normalYawAtLastZone:STEERING_AUTHORITY.normalFastFactor,
       gripUsagePercentOfRun:+(flight.elapsed>0?
        100*flight.gripActiveSeconds/flight.elapsed:0).toFixed(1),
       atStartSpeed:steeringBalanceAt(TRIAL.startSpeed),
       atLastZone:steeringBalanceAt(TRIAL.endSpeed),
       minNormalFactorObserved:+flight.minNormalYawFactor.toFixed(3),
       peakActualYawFactorObserved:+flight.maxActualYawFactor.toFixed(3),
       peakGripRelativeGainObserved:+flight.peakGripRelativeGain.toFixed(3),
       normalSteeringSeconds:+flight.normalSteeringSeconds.toFixed(2),
       referenceMaxYawDegreesPerSecond:+(TRIAL.maxYawRate*180/Math.PI).toFixed(1),
       gripMaxYawDegreesPerSecond:+(TRIAL.maxYawRate*
         steeringBalanceAt(TRIAL.startSpeed).grip*180/Math.PI).toFixed(1)},
      precisionGrip:{version:GRIP_SPEC.version,
        previousYawReferenceFactor:GRIP_SPEC.yawMultiplier,
        actualFullGripFactorAtSpeed:steeringBalanceAt(flight.currentSpeed).grip,
        bonusFraction:STEERING_AUTHORITY.gripBonusFraction,
       maxSpeedPenaltyPercent:GRIP_SPEC.maxSpeedPenalty*100,
       sideThrusters:sideThrusters?.stats(),
       extraDynamicLights:SIDE_THRUSTER_SPEC.newLights,
       newParticles:SIDE_THRUSTER_SPEC.newParticles},
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
     maxVisualBankDegrees:+Math.max(motionState.maxVisualBankDegrees,flight.magneticPeakDegrees,flight.corkscrewPeakDegrees).toFixed(1),
     maxVisualPitchDegrees:+motionState.maxVisualPitchDegrees.toFixed(1),
     maxHoverMeters:+motionState.maxHoverMeters.toFixed(3),
     maxBankDegrees:Math.abs(CORKSCREW.peakUnwrappedDegrees),
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
      steeringModel:"GRIP-first wide arcs / power carve with pilot-owned yaw and original input response",
      gripActivations:flight.gripActivations,
      gripActiveSeconds:+flight.gripActiveSeconds.toFixed(2),
      gripDistanceMeters:+flight.gripDistanceMeters.toFixed(1),
      gripSpeedLossMeters:+flight.gripSpeedLossMeters.toFixed(1),
      gripPeakIntensity:+flight.gripPeakIntensity.toFixed(3),
      gripPeakYawDeg:+flight.gripPeakYawDeg.toFixed(1),
      racingFeel:{...RACING_FEEL,railFeedbackCount:railFeedback.contacts,
       cueDisplays:gripCueDisplays,cueVisibleSeconds:+gripCueSeconds.toFixed(2),
       peakRailFlash:railFeedback.maxPulse,
       projection:PROJECTION_083,
       railScrubIntensityPeak:+flight.railScrubPeak.toFixed(3)},
      precisionFlow:racingExperienceAudit(racingExperience),
      timeTrial:ghostAudit(timeTrialState),
      skylineChallenges:{...CHALLENGE_RULES_0140,
       progress:challengeSummary(challengeProgress),
       active:currentChallenge?.id??null,lastResult:lastChallengeGrading},
      gripApex:{...GRIP_APEX,
       entries:flight.gripApexEntries,exits:flight.gripApexExits,
       cleanExits:flight.gripApexCleanExits,
       gripSeconds:+flight.gripApexGripSeconds.toFixed(2),
       warningDisplays:gripCueDisplays,
       warningVisibleSeconds:+gripCueSeconds.toFixed(2),
       firstCornerMeters:160.13576152,
       originalFirstCornerMeters:395.13576152,
       wallToCorkscrewSpacingMeters:CORKSCREW.start-MAGNETIC_WALL.end},
      speedMetersPerSecondStart:TRIAL.startSpeed,
      boostPadIds:BOOST_PADS.map(p=>p.id),
      boostActivations:flight.boostActivations,
      boostTriggeredPadIds:[...flight.boostActivatedIds],
      trackRiskReward:{...RISK_REWARD_0160,
       gates:RHYTHM_GATES_0160.map(g=>({id:g.id,start:g.start,end:g.end,
        safe:[g.safeMin,g.safeMax],risk:[g.riskMin,g.riskMax]})),
       safeBoosts:flight.safeBoosts,riskBoosts:flight.riskBoosts,
       gateSelections:[...flight.boostChoiceLog]},
      boostMaxMultiplier:+flight.peakBoostMultiplier.toFixed(3),
      boostActiveSeconds:+flight.boostActiveSeconds.toFixed(2),
      boostTravelMeters:+flight.boostDistanceMeters.toFixed(1),
      maxActualSpeedMetersPerSecond:+flight.peakSpeed.toFixed(2),
      zoneSpeedStepPercent:+((TRIAL.zoneSpeedStep-1)*100).toFixed(1),
      zoneCruiseTarget:+speedAt(flight.s,flight.zoneSpeedStage).toFixed(2),
      zoneCruiseActual:+flight.zoneCruiseSpeed.toFixed(2),
      zoneSpeedStage:flight.zoneSpeedStage,
      zoneSpeedEvents:[...flight.zoneSpeedEvents],
      track3D:elevationAudit(),
      airTricks:{...AIR_TRICKS,simulatedAtHz:120,
       visualRollIsPilotDriven:true,freeJumpPhysicsUnchanged:false,
       triggerControl:"Hold GRIP + steer while airborne",
       sideThrustersSharedWithGroundGrip:true,
       contextualTrickButtonHidden:true,
       expandedLeapMeters:SKYLINE_LEAP.landingClearance,
       boostRequiresFullRotationAndCleanLanding:true},
       corkscrew:{...CORKSCREW,
        physicalRoad:true,surfaceNormalAdhesion:true,
        independentManualSteering:true,additionalDrawCalls:0,
        peakDegrees:+flight.corkscrewPeakDegrees.toFixed(1),
        ceilingSeconds:+flight.corkscrewCeilingSeconds.toFixed(2)},
       magneticWall:{...MAGNETIC_WALL,physicalSurface:true,
        shaderExtraBatches:0,peakBankDegrees:flight.magneticPeakDegrees},
      gapCount:GAPS.length,
      actualLeapLaunches:flight.autoLaunches,
      cleanLeapLandings:flight.cleanLeapLandings,
      airTrickAttempts:flight.trickAttempts,
      airTrickFullRotations:flight.trickFullRotations,
      airTrickQualifiedLandings:flight.trickQualifiedLandings,
      airTrickRejectedLandings:flight.trickRejectedLandings,
      airTrickSeconds:+flight.trickAirSeconds.toFixed(3),
      airTrickPeakDegrees:+flight.trickPeakDegrees.toFixed(1),
      landingBoostActivations:flight.landingBoostActivations,
      landingBoostSeconds:+flight.landingBoostSeconds.toFixed(3),
      landingBoostDistanceMeters:+flight.landingBoostDistanceMeters.toFixed(1),
      landingBoostPeakMultiplier:+flight.landingBoostPeakMultiplier.toFixed(3),
      airborneSeconds:+flight.airborneSeconds.toFixed(2),
      peakAirHeightMeters:+flight.peakAirHeightMeters.toFixed(2),
      expectedCircuitDurationSeconds:TRIAL.targetDurationSeconds,
      circuit:circuitPlanSummary(),
      lapLengthMeters:CIRCUIT.lapLength,raceDistanceMeters:TRIAL.raceLength,
      lapsRequired:CIRCUIT.laps,lapsCompleted:flight.lapsCompleted,
      lapTimesSeconds:[...flight.lapTimes],
      checkpointsPassed:flight.checkpointsPassed,noTrackBanking:false,
       magneticEntries:flight.magneticEntries,
       magneticExits:flight.magneticExits,
       magneticCleanExits:flight.magneticCleanExits,
       magneticSeconds:+flight.magneticSeconds.toFixed(2),
       magneticDistanceMeters:+flight.magneticDistanceMeters.toFixed(1),
       magneticPeakDegrees:+flight.magneticPeakDegrees.toFixed(1),
       corkscrewEntries:flight.corkscrewEntries,
       corkscrewExits:flight.corkscrewExits,
       corkscrewCleanExits:flight.corkscrewCleanExits,
       corkscrewSeconds:+flight.corkscrewSeconds.toFixed(2),
       corkscrewDistanceMeters:+flight.corkscrewDistanceMeters.toFixed(1),
       corkscrewCeilingSeconds:+flight.corkscrewCeilingSeconds.toFixed(2),
       corkscrewPeakDegrees:+flight.corkscrewPeakDegrees.toFixed(1),
      speedMetersPerSecondEnd:TRIAL.endSpeed,
      speedMultiplierVs042:+(TRIAL.endSpeed/22).toFixed(2),
      maxYawDegreesPerSecond:+(TRIAL.maxYawRate*STEERING_AUTHORITY.fullGripFactor*180/Math.PI).toFixed(1),
      courseSegments:COURSE_SEGMENTS.length,
      curveCount:COURSE_SEGMENTS.filter(c=>c.type==="turn").length,
     maxHeadingErrorDegrees:+flight.maxHeadingErrorDeg.toFixed(1),
     averageHeadingErrorDegrees:flight.headingSamples?
       +(flight.totalHeadingError/flight.headingSamples).toFixed(1):null,
     offRoadSeconds:+flight.offRoadSeconds.toFixed(2),
     railContacts:flight.railContacts,
     railContactStarts:flight.railContactStarts,
     railScrubSeconds:+flight.railScrubSeconds.toFixed(2),
     railScrubLossMeters:+flight.railScrubLossMeters.toFixed(2),
     railSeconds:+flight.railSeconds.toFixed(2),
     railMaxPenetrationMeters:+flight.railMaxPenetration.toFixed(3),
     railHeadingCorrections:flight.railHeadingCorrections,
     railMaxBlockedYawDegrees:+(flight.railPeakBlockedAngle*180/Math.PI).toFixed(1),
     reverseProjectionTicks:flight.reverseProjectionTicks,
     railMaxInstantCorrectionDegrees:+(flight.railMaxInstantCorrection*180/Math.PI).toFixed(2),
     railMaxSingleStepYawDegrees:+(flight.railMaxSingleStepYaw*180/Math.PI).toFixed(2),
     railGripBlockedTicks:flight.railGripBlockedTicks,
     gripPreArmTicks:flight.gripPreArmTicks,
     gripYawSuppressedTicks:flight.gripYawSuppressedTicks,
     railContactDiagnostics:flight.railContactDiagnostics.slice(),
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
 a.href=url;a.download="skyshift-v01348-performance-"+perfSettings.preset+"-audit.json";
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
 title.textContent="FLIGHT LAB · 0.7.0";panel.appendChild(title);
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
 window.__skyshiftHudInfo=()=>reactiveHud.stats();
 window.__skyshiftGripInfo=()=>({
  intensity:+flight.gripIntensity.toFixed(3),
  direction:flight.gripDirection,
  activations:flight.gripActivations,
  active:flight.gripActive,
  speed:+flight.currentSpeed.toFixed(2),
  visual:sideThrusters?.stats()
 });
 window.__skyshiftWaveSmoke=(targetStage=1)=>{
  if(uiState.mode!=="playing")throw new Error("Wave smoke requires active run");
  if(!Number.isInteger(targetStage)||targetStage<1||targetStage>3)
   throw new Error("Invalid spectral smoke stage");
  // Deterministically place each successive physical crest just ahead of
  // the stationary craft under software WebGL. Actual play uses 120Hz ticks.
  for(let k=zoneWave.waves.length;k<targetStage;k++){
   const at=ZONE_WAVE.triggers[k],atS=flight.s;
   flight.elapsed=at;
   updateZoneWave(zoneWave,at,atS);
   // Cross front deliberately during bright white-core phase for screenshots.
   flight.elapsed=at+.792;
   const pass=updateZoneWave(zoneWave,at+.792,atS);
   if(!pass.changed||pass.stage!==k+1)
    throw new Error("Zone "+(k+2)+" did not pass craft");
   previousSector=pass.stage;setZoneSpeedStage(flight,pass.stage);
   announceSector(pass.stage);
  }
  waveSmokeHold=true; // CI-only freeze for honest white-core screenshots.
  premiumSurface?.setWaveState(zoneWave);
  identitySurface?.setWaveState(zoneWave);
  refreshHud();
  return {zone:zoneWave.playerStage+1,flightSeconds:flight.elapsed,
   playerS:flight.s,frontS:zoneWave.fronts[0],
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
// Visual regression only: opt in with ?tunnelSmoke=1.
// Teleports the test pilot to an existing legal road pose for screenshots.
// Actual play never invokes or exposes this function.
function installTunnelSmokeHook(){
 if(new URLSearchParams(location.search).get("tunnelSmoke")!=="1")return;
 window.__skyshiftTunnelLightInfo=()=>({
  levels:{...tunnelBlackout?.levels},
  lightIntensity:{ambient:worldLights?.ambient.intensity,
   key:worldLights?.key.intensity,fill:worldLights?.fill.intensity},
  engineIntensity:engineLights.map(light=>light.intensity),
  bladeTipOpacity:bladeTips?.material.opacity,
  baselineShipGlowOpacity:shipGlow?.opacity,
  state:tunnelBlackout?.audit()
 });
 window.__skyshiftTunnelSmoke=(at=2435)=>{
  if(uiState.mode!=="playing")throw new Error("Tunnel smoke requires active race");
  // Freeze 120Hz physics while CI captures a stable, legal tunnel pose.
  // This hook is only installed with ?tunnelSmoke=1.
  waveSmokeHold=true;
  const s=clamp(at,SHADOW_TUNNEL.start+48,SHADOW_TUNNEL.end-48);
  const p=positionAt(s,0,0);
  Object.assign(flight,{s,lap:1,worldX:p.x,worldZ:p.z,
   lateral:0,y:surfaceHeightAt(s)+TRIAL.hoverHeight,
   heading:headingAt(s),grounded:true,vy:0,
   currentSpeed:TRIAL.startSpeed,zoneCruiseSpeed:TRIAL.startSpeed});
  motionState=createFlightMotionState(flight.heading);
  cinematicState=createCinematicState();
  kineticCamera=createKineticCameraState();
  previousRenderPose=capturePose(flight);currentRenderPose=previousRenderPose;
  const frame=chasePose(flight,motionState,cinematicState,cinematicTuning,CAMERA_INFO);
  CAMERA_BASE_POSITION.set(frame.x,frame.y,frame.z);
  CAMERA_TARGET_POSITION.copy(CAMERA_BASE_POSITION);
  cameraLook.set(frame.lookX,frame.lookY,frame.lookZ);
  tunnelInside=inShadowTunnel(flight.s);
  return {at:flight.s,inside:tunnelInside,
   darkness:tunnelIntensityAt(flight.s),
   geometry:shadowTunnel?.getStats(),normalBank:bankAt(s),
   pilotPhysics:TRIAL.id,cameraMode:CAMERA_MODE};
 };
}
// Test-only real renderer probe. Ordinary sessions never expose or execute it.
function installLivingWakeSmokeHook(){
 if(new URLSearchParams(location.search).get("wakeSmoke")!=="1")return;
 window.__skyshiftWakeInfo=()=>livingWake?.stats()??null;
 window.__skyshiftWakeSmoke=(stage=8,load="straight")=>{
  if(uiState.mode!=="playing")throw Error("Living wake probe requires a live race");
  if(!Number.isInteger(stage)||stage<0||stage>8)
   throw Error("Living wake stage out of range");
  // CI-only: freeze the simulation and render the production ship & WebGL FX.
  waveSmokeHold=true;
  flight.zoneSpeedStage=stage;
  flight.zoneCruiseSpeed=speedAt(flight.s,stage);
  const boost=load==="boost";
  const airborne=load==="air";
  wakeSmokePath={frames:0,load};
  flight.currentSpeed=flight.zoneCruiseSpeed*(boost?1.4:1);
  flight.boostMultiplier=boost?1.4:1;
  flight.grounded=!airborne;
  flight.y=surfaceHeightAt(flight.s)+TRIAL.hoverHeight+(airborne?4:0);
  flight.vy=airborne?11:0;
  flight.gripIntensity=load==="grip"?.95:0;
  flight.steering=load==="grip"?.72:0;
  flight.yawRate=load==="grip"?.86:0;
  livingWake?.reset();
  currentRenderPose=capturePose(flight);previousRenderPose=currentRenderPose;
  frameBlend=0;
  return {stage,speed:flight.currentSpeed,load};
 };
}
function installFlapSmokeHook(){
 if(new URLSearchParams(location.search).get("flapSmoke")!=="1")return;
 window.__skyshiftFlapProbe=()=>reactiveWingFlaps?.stats()??null;
 window.__skyshiftFlapSet=(steering=0,grip=0)=>{
  if(uiState.mode!=="playing")throw Error("Flap smoke requires a live race");
  if(!Number.isFinite(steering)||!Number.isFinite(grip)||
   Math.abs(steering)>1||grip<0||grip>1)throw Error("Invalid flap smoke pose");
  waveSmokeHold=true;
  flight.steering=steering;
  flight.yawRate=steering*.84;
  flight.gripIntensity=grip;
  currentRenderPose=capturePose(flight);previousRenderPose=currentRenderPose;
  frameBlend=0;
  return {steering,grip};
 };
}
// This probe only exists under ?sparkSmoke=1. It makes a real rail contact
// observable in headless Chrome without changing any normal player physics.
function installSparkSmokeHook(){
 if(new URLSearchParams(location.search).get("sparkSmoke")!=="1")return;
 window.__skyshiftSparkInfo=()=>railSparks?.stats()??null;
 window.__skyshiftSparkReset=()=>railSparks?.reset();
 window.__skyshiftSparkSmoke=(side=1,stage=7,contact=true)=>{
  if(uiState.mode!=="playing")throw Error("Spark QA requires playing mode");
  if(![-1,0,1].includes(side)||!Number.isInteger(stage)||
     stage<0||stage>8)throw Error("Invalid spark smoke params");
  waveSmokeHold=true;wakeSmokePath=null;
  const s=520;
  if(side){
   flight.s=s;flight.lateral=side*(widthAt(s)*.5-3.83);
   const p=positionAt(s,flight.lateral);
   flight.worldX=p.x;flight.worldZ=p.z;
   flight.heading=headingAt(s);
   flight.y=surfaceHeightAt(s,flight.lateral)+TRIAL.hoverHeight;
  }
  flight.zoneSpeedStage=stage;
  flight.zoneCruiseSpeed=speedAt(flight.s,stage);
  flight.currentSpeed=flight.zoneCruiseSpeed;
  flight.grounded=true;flight.vy=0;
  flight.railContacting=contact&&side!==0;
  flight.lastRailSide=flight.railContacting?side:0;
  flight.railScrubIntensity=flight.railContacting?1:0;
  if(flight.railContacting)flight.railContactStarts++;
  currentRenderPose=capturePose(flight);
  previousRenderPose=currentRenderPose;frameBlend=0;
  return {side,stage,contact,serial:flight.railContactStarts};
 };
}
function installControls(){
 UI.trackPicker.addEventListener("change",()=>{
  if(!["menu","ended"].includes(uiState.mode))return;
  const selected=UI.trackPicker.value;
  if(!TRACKS_0160.some(t=>t.id===selected))return;
  const uri=new URL(location.href);
  if(selected==="skyline")uri.searchParams.delete("track");
  else uri.searchParams.set("track",selected);
  uri.searchParams.set("v","0.19.2");
  location.assign(uri.toString());
 });
 UI.challengeButton.addEventListener("click",openChallenges);
 UI.challengeBack.addEventListener("click",closeChallenges);
 UI.challengeEndBack.addEventListener("click",openChallenges);
 UI.challengeList.addEventListener("click",e=>{
  const button=e.target.closest("[data-challenge-id]");
  if(!button||button.disabled||uiState.mode!=="challenges")return;
  const c=getChallenge(button.dataset.challengeId);
  if(c&&challengeUnlocked(challengeProgress,c.id))
   startImmersiveTrial(c);
 });
 UI.hangarBtn.addEventListener("click",openHangar);
 UI.endHangar.addEventListener("click",openHangar);
 UI.hangarBack.addEventListener("click",closeHangar);
 document.querySelectorAll("[data-fleet-preview]").forEach(button=>
  button.addEventListener("click",()=>previewFleetShip(button.dataset.fleetPreview)));
 document.querySelectorAll("[data-fleet-equip]").forEach(button=>
  button.addEventListener("click",()=>equipFleetShip(button.dataset.fleetEquip)));
 UI.start.addEventListener("click",()=>startImmersiveTrial(null));
 UI.pauseGhostToggle.addEventListener("click",()=>{
  if(uiState.mode!=="paused")return;
  ghostEnabled=!ghostEnabled;
  timeTrialState.ghostEnabled=ghostEnabled;
  saveGhostEnabled(fleetStorage(),ghostEnabled);
  ghostVisual?.hide();
  refreshTrialMenu();
 });
 UI.pauseMenu.addEventListener("click",returnToMainMenu);
 UI.settingsOpen.addEventListener("click",openSettings);
 UI.settingsBack.addEventListener("click",closeSettings);
 UI.retry.addEventListener("click",()=>startImmersiveTrial(currentChallenge));
 UI.restart.addEventListener("click",()=>enterPlaying(currentChallenge));
 UI.resume.addEventListener("click",resume);
 UI.pauseBtn.addEventListener("click",pause);
 UI.fullscreen.addEventListener("click",()=>fullscreenController.toggle());
 UI.menuFullscreen.addEventListener("click",()=>fullscreenController.toggle());
 UI.fidelityToggle.addEventListener("click",()=>{
  if(FIDELITY_0121.overridePresets.includes(perfSettings.preset))return;
  const next=!fidelityProfile.premium;
  const saved=saveFidelityChoice(next,fleetStorage());
  const address=new URL(location.href);
  address.searchParams.delete("fidelity");
  // Private-mode storage can be unavailable: keep the OFF choice in URL.
  if(!saved)address.searchParams.set("fidelity",next?"on":"off");
  address.searchParams.set("v","0.19.2");
  location.assign(address.toString());
 });
 UI.export.addEventListener("click",exportAudit);
 addEventListener("keydown",e=>{
   if(["Space","ArrowUp","ArrowRight","ArrowLeft","KeyA","KeyD","ShiftLeft","ShiftRight"].includes(e.code))
     e.preventDefault();
   if(e.code==="Space"&&!e.repeat && uiState.mode==="playing"){
     uiState.jumpPressed=true;uiState.jumpHeld=true;
   }
   if(e.code==="KeyP"||e.code==="Escape") {
     if(uiState.mode==="playing")pause();
     else if(uiState.mode==="paused")resume();
     else if(e.code==="Escape"&&uiState.mode==="settings")closeSettings();
   }
   if(e.code==="Enter"&&uiState.mode==="menu")enterPlaying(null);
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
 // Separate pointer captures permit simultaneous left-stick steering and
 // right-thumb GRIP. Cancellation, pause, focus loss always release safely.
 function releaseGrip(e){
   if(e&&uiState.gripPointer!==e.pointerId)return;
   uiState.gripHeld=false;uiState.gripPointer=null;
   UI.grip.classList.remove("armed","active");
   UI.grip.setAttribute("aria-pressed","false");
   UI.controls.classList.remove("grip-pressed");
 }
 UI.grip.addEventListener("pointerdown",e=>{
   if(uiState.mode!=="playing")return;
   e.preventDefault();
   uiState.gripPointer=e.pointerId;uiState.gripHeld=true;
   UI.grip.setPointerCapture(e.pointerId);
   UI.grip.classList.add("armed");
   UI.controls.classList.add("grip-pressed");
 });
 UI.grip.addEventListener("pointerup",releaseGrip);
 UI.grip.addEventListener("pointercancel",releaseGrip);
 UI.grip.addEventListener("lostpointercapture",releaseGrip);
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
 installTunnelSmokeHook();
 installLivingWakeSmokeHook();
 installFlapSmokeHook();
 installSparkSmokeHook();
 // Opt-in regression probe for the exact final-corner Aurora camera bug.
 // No extra runtime cost or player teleportation without ?trackRepairSmoke=1.
 if(new URLSearchParams(location.search).get("trackRepairSmoke")==="1"){
  window.__skyshiftTrackRepairProbe=(s=3180)=>{
   const physicalBank=bankAt(s),visualBank=cameraBankAt(s);
   const contact=railContactPoint(s,-1),expected=positionAt(s,
    -(widthAt(s)*.5-.69),.68);
   return {
    track:ACTIVE_TRACK_0160.id,physicalBank,visualBank,
    withinPhysicalRoll:Math.abs(visualBank)<=Math.abs(physicalBank)+1e-6,
    sparkContactOffsetMeters:Math.hypot(contact.x-expected.x,
     contact.y-expected.y,contact.z-expected.z),
    activeHudCue:!UI.gripCue.classList.contains("hidden"),
    roadWidth:widthAt(s),finishS:CIRCUIT.lapLength
   };
  };
  window.__skyshiftTrackRepairTeleport=(s=3180)=>{
   if(uiState.mode!=="playing")throw Error("QA teleport needs playing");
   if(s<5||s>=CIRCUIT.lapLength)throw Error("QA point outside lap");
   waveSmokeHold=true;
   const p=positionAt(s,0,0);
   Object.assign(flight,{s,lateral:0,worldX:p.x,worldZ:p.z,
    heading:headingAt(s),y:surfaceHeightAt(s)+TRIAL.hoverHeight,
    grounded:true,vy:0,currentSpeed:TRIAL.startSpeed,
    zoneCruiseSpeed:TRIAL.startSpeed,steering:0,yawRate:0});
   motionState=createFlightMotionState(flight.heading);
   cinematicState=createCinematicState();
   kineticCamera=createKineticCameraState();
   previousRenderPose=capturePose(flight);
   currentRenderPose=previousRenderPose;frameBlend=0;
   refreshHud();
   return window.__skyshiftTrackRepairProbe(s);
  };
 }
 if(new URLSearchParams(location.search).get("fleetSmoke")==="1")
  window.__skyshiftFleetSmokeUnlock=()=>{
   if(uiState.mode!=="hangar")throw new Error("Fleet QA requires Hangar");
   fleetProgress=saveFleet(fleetStorage(),recordFleetClear(fleetProgress,true).state);
   refreshHangar();
   return fleetStatus(fleetProgress);
  };
  window.__skyshiftFleetProbe=()=>({
   showroomWorldHidden:world?.visible===false,
   previewTrackVisible:world?.visible===true,
   // Screen-space center validates that the craft stays clear of Hangar cards.
   projectedShipX:ship?(ship.position.clone().project(camera).x+1)*.5:null,
   showroomCamera:{x:camera?.position.x,y:camera?.position.y,
    z:camera?.position.z,fov:camera?.fov},
   ...fleetStatus(fleetProgress),activeShipId,previewShipId,
   tail:activeCraft?.tailStats?.()??null,
   surfacePolish:activeCraft?.polishStats?.()??null,
   wingFlaps:reactiveWingFlaps?.stats?.()??null,
   shipArt:shipArtController.audit(),
   stingrayPresentation:STINGRAY_PRESENTATION_01347,
   heroShowroom:hangarHeroRig?.stats(),
   hangarVisible:!UI.hangar.classList.contains("hidden")
  });
 // Browser CI only. Never accessible to real players without opt-in URL.
 if(new URLSearchParams(location.search).get("challengeSmoke")==="1"){
  window.__skyshiftChallengeProbe=()=>({
   mode:uiState.mode,selected:currentChallenge?.id??null,
   flightS:flight?.s,elapsed:flight?.elapsed,
   timeTrialMode:timeTrialState.mode,summary:challengeSummary(challengeProgress),
   medal:lastChallengeGrading?.medal??null,
   visible:!UI.challengeScreen.classList.contains("hidden")
  });
  window.__skyshiftChallengeSmokeFinish=()=>{
   if(uiState.mode!=="playing"||!currentChallenge)
    throw Error("Challenge QA requires active challenge");
   flight.s=currentChallenge.endS;
   flight.elapsed=currentChallenge.goldSeconds+8;
   flight.railContacts=3;
   endRun(true);
   return window.__skyshiftChallengeProbe();
  };
 }
 // Real-game WebGL QA only; does not mutate the actual player's run.
 if(new URLSearchParams(location.search).get("riskSmoke")==="1"){
  window.__skyshiftRiskProbe=()=>({
   mode:uiState.mode,physics:"trial-v0160",
   boostModel:"boost-v0160",risk:RISK_REWARD_0160,
   configuredPads:BOOST_PADS.map(p=>({
    id:p.id,group:p.group,kind:p.kind,multiplier:p.multiplier,
    lane:[p.lateralMin,p.lateralMax],s:[p.start,p.end]})),
   activeState:{safeBoosts:flight?.safeBoosts??0,
    riskBoosts:flight?.riskBoosts??0}
  });
  window.__skyshiftRiskPhysicsSmoke=(choice="risk")=>{
   if(uiState.mode!=="playing")throw Error("Risk QA requires active gameplay");
   const f=newFlightState(),s=2210,lateral=choice==="risk"?5.4:0;
   const p=positionAt(s,lateral,0);
   Object.assign(f,{s,lateral,worldX:p.x,worldZ:p.z,
    heading:headingAt(s),y:surfaceHeightAt(s,lateral)+TRIAL.hoverHeight,
    grounded:true,vy:0});
   const first=stepFlight(f,1/120,{steer:0,grip:false});
   const picked=first.boostChoice;
   f.lateral=choice==="risk"?0:5.4;
   const second=stepFlight(f,1/120,{steer:0,grip:false});
   return {choice,picked,secondChoice:second.boostChoice,
    activationCount:f.boostActivations,groups:[...f.boostActivatedGroups],
    targetMultiplier:f.boostTargetMultiplier,
    timedSeconds:f.boostTimer};
  };
 }
 // Test-only real camera projection. Regular players never call this.
 window.__skyshiftScreenBeamProbe=()=>{
  if(!ship||!camera||!renderer)return null;
  ship.updateWorldMatrix(true,true);
  camera.updateWorldMatrix(true,false);
  const canvasWidth=renderer.domElement.getBoundingClientRect().width;
  const v=new THREE.Vector3(),unity=new THREE.Matrix4();
  const projectedWidth=(samples,transform)=>{
   let left=Infinity,right=-Infinity;
   for(let i=0;i<samples.length;i+=3){
    v.set(samples[i],samples[i+1],samples[i+2])
     .applyMatrix4(transform).project(camera);
    left=Math.min(left,v.x);right=Math.max(right,v.x);
   }
   return Number.isFinite(left)&&Number.isFinite(right)?
    (right-left)*canvasWidth*.5:null;
  };
  const wingNames=activeShipId==="stingray"&&shipArtController.audit().heroApplied?
   ["Hero_Wing_L","Hero_Wing_R"]:
   [activeShipId==="stingray"?"Stingray EVO · wide manta wings":
    "Two broad scalloped manta wings"];
  let left=Infinity,right=-Infinity,points=0;
  for(const name of wingNames){
   const mesh=ship.getObjectByName(name),attr=mesh?.geometry?.attributes?.position;
   if(!attr)continue;
   mesh.updateWorldMatrix(true,false);
   for(let i=0;i<attr.count;i++){
    v.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld).project(camera);
    left=Math.min(left,v.x);right=Math.max(right,v.x);points++;
   }
  }
  const actual=points?(right-left)*canvasWidth*.5:null;
  const referenceMatrix=new THREE.Matrix4().compose(
   ship.position,ship.quaternion,new THREE.Vector3(1,1,1));
  const manta=projectedWidth(buildMantaWings().positions,referenceMatrix);
  return {shipId:activeShipId,heroApplied:shipArtController.audit().heroApplied,
   actualWingPixels:actual,mantaReferencePixels:manta,
   screenRatio:actual&&manta?actual/manta:null,
   shipScaleX:ship.scale.x,shipScaleY:ship.scale.y,shipScaleZ:ship.scale.z,
   cameraFov:camera.fov,trackMeters:flight.s};
 };
 // QA only: compare both ships using the EXACT same live flight roll.
 // This is read-only; it never changes steering, physics, camera or ship.
 window.__skyshiftHandlingParityProbe=()=>{
  if(!ship||uiState.mode!=="playing")return null;
  const expectedRoll=motionState.roll-bankAt(flight.s)-
   (flight.trickVisualAngle??0)-
   Math.sign(flight.gripDirection)*flight.gripIntensity*.058+
   signatureFlight.roll+velocityPresence.hullRoll+
   racingExperience.hullCarve*
    (flight.grounded&&!motionRig.wall&&!motionRig.corkscrew?1:0);
  return {shipId:activeShipId,steering:flight.steering,
   gripIntensity:flight.gripIntensity,yawRate:flight.yawRate,
   renderedRoll:ship.rotation.z,sharedRoll:expectedRoll,
   difference:ship.rotation.z-expectedRoll,
   roadNormalLift:STINGRAY_PRESENTATION_01347.visualRoadNormalLiftMeters,
   physicalHover:TRIAL.hoverHeight,
   noShipSpecificTurnPose:true};
 };
 window.__skyshiftPerfProbe=()=>({
  settings:perfSettings,summary:perfSummary(frameProfiler),
  gpu:gpuClock?.summary(),state:uiState.mode,physicsHz:120,
  motionRig:unifiedFlightAudit(motionRig),
  visualFidelity:fidelityDirector?{...fidelityAudit(fidelityDirector),
   shaderVariant:premiumSurface?.fidelityShaderVariant,
   modeSelection:fidelityProfile.modeSelection,
   shaderChangesOnLowMemory:fidelityProfile.lowMemory&&fidelityProfile.premium,
   premiumDefaultOnLowMemory:fidelityProfile.defaultPremiumOnLowMemory,
   userRequestedOff:fidelityProfile.userRequestedOff,
   adaptiveResolutionEnabled:!perfSettings.fixedQuality}:null,
  racingExperience:racingExperienceAudit(racingExperience),
  timeTrial:ghostAudit(timeTrialState),ghostVisual:ghostVisual?.stats()??null,
  shipArt:shipArtController.audit(),
  stingrayPresentation:STINGRAY_PRESENTATION_01347,
  heroShowroom:hangarHeroRig?.stats(),
  navigation:{mode:uiState.mode,settingsVisible:!UI.settings.classList.contains("hidden"),
   pauseVisible:!UI.pause.classList.contains("hidden"),
   ghostToggleInPause:!!UI.pauseGhostToggle,
   gearInMain:!UI.settingsOpen.classList.contains("hidden")},
  landmarks:sectorLandmarks?.stats()??null,
  optimizer:{bloom:neonPipeline?.bloomResolution(),hud:hudBudget.stats(),
   dom:domWrites.stats(),sparkFinal:completedSparkStats},
  pipeline:{bloom:neonPipeline?.bloom?.enabled,smaa:neonPipeline?.smaa?.enabled,
   bloomScale:neonPipeline?.bloomResolutionScale,
   dpr:neonPipeline?.internalPixelRatio,fixedQuality:perfSettings.fixedQuality}
 });
 // Pre-boot START queues a legacy "time-trial" mode string.
 // Only actual selected catalog objects may enter Challenge mode.
 window.__skyshiftBootReady?.(()=>enterPlaying(null));
 requestAnimationFrame(loop);
}catch(error){
 console.error("SKYSHIFT startup failed",error);
 window.__skyshiftBootFail?.(error);
 UI.error.classList.remove("hidden");
 UI.error.textContent="SKYSHIFT could not start: "+(error?.message||"Unknown startup error");
}
