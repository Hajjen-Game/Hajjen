// Existing browser integration contracts. Mutating smoke probes retain query gates.
export function installFlightTuningPanel({document,location,flightTuning,cinematicTuning}){
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

export function installRaceQa({window,document,location,performance,ctx,UI,uiState,ZONE_WAVE,ZONE_PALETTES,updateZoneWave,setZoneSpeedStage,announceSector,refreshHud,waveResonanceStrength,clamp,SHADOW_TUNNEL,positionAt,surfaceHeightAt,TRIAL,headingAt,createFlightMotionState,createCinematicState,createKineticCameraState,snapRacePose,raceSimulation,chaseCameraController,inShadowTunnel,tunnelIntensityAt,bankAt,CAMERA_MODE,speedAt,widthAt,cameraBankAt,railContactPoint,ACTIVE_TRACK_0160,CIRCUIT,isVault,placeShip,saveFleet,fleetStorage,recordFleetClear,refreshHangar,fleetStatus,STINGRAY_PRESENTATION_01347,VAULT_BOOST_0283_ACTIVE,TRACK_ID_0160,BOOST_PADS,RHYTHM_GATES_0160,timeTrialState,challengeSummary,endRun,RISK_REWARD_0160,newFlightState,stepFlight,THREE,buildMantaWings,motionRig,perfSettings,perfSummary,frameProfiler,unifiedFlightAudit,fidelityAudit,racingExperienceAudit,ghostAudit,hudBudget,domWrites}){
// Opt-in browser-only integration probe. It advances the actual fixed-flight
// clock past the first scheduled wave on a software-rendered CI machine that
// cannot reliably simulate ten seconds within ten wall-clock seconds.
// Production players never have this hook without ?waveSmoke=1.
function installWaveSmokeHook(){
 if(new URLSearchParams(location.search).get("waveSmoke")!=="1")return;
 window.__skyshiftHudInfo=()=>ctx.reactiveHud.stats();
 window.__skyshiftGripInfo=()=>({
  intensity:+ctx.flight.gripIntensity.toFixed(3),
  direction:ctx.flight.gripDirection,
  activations:ctx.flight.gripActivations,
  active:ctx.flight.gripActive,
  speed:+ctx.flight.currentSpeed.toFixed(2),
  visual:ctx.sideThrusters?.stats()
 });
 window.__skyshiftWaveSmoke=(targetStage=1)=>{
  if(uiState.mode!=="playing")throw new Error("Wave smoke requires active run");
  if(!Number.isInteger(targetStage)||targetStage<1||targetStage>3)
   throw new Error("Invalid spectral smoke stage");
  // Deterministically place each successive physical crest just ahead of
  // the stationary craft under software WebGL. Actual play uses 120Hz ticks.
  for(let k=ctx.zoneWave.waves.length;k<targetStage;k++){
   const at=ZONE_WAVE.triggers[k],atS=ctx.flight.s;
   ctx.flight.elapsed=at;
   updateZoneWave(ctx.zoneWave,at,atS);
   // Cross front deliberately during bright white-core phase for screenshots.
   ctx.flight.elapsed=at+.792;
   const pass=updateZoneWave(ctx.zoneWave,at+.792,atS);
   if(!pass.changed||pass.stage!==k+1)
    throw new Error("Zone "+(k+2)+" did not pass craft");
   ctx.previousSector=pass.stage;setZoneSpeedStage(ctx.flight,pass.stage);
   announceSector(pass.stage);
  }
  ctx.waveSmokeHold=true; // CI-only freeze for honest white-core screenshots.
  ctx.premiumSurface?.setWaveState(ctx.zoneWave);
  ctx.identitySurface?.setWaveState(ctx.zoneWave);
  ctx.stationWorld?.updateWave?.(ctx.zoneWave);
 ctx.sharedTunnelRuntime?.updateWave?.(ctx.zoneWave);
 ctx.archRoadReflections?.updateWave?.(ctx.zoneWave);
 ctx.unifiedCeilingRoad?.updateWave?.(ctx.zoneWave);
 ctx.roadSpill02895?.updateWave?.(ctx.zoneWave);
  refreshHud();
  return {zone:ctx.zoneWave.playerStage+1,flightSeconds:ctx.flight.elapsed,
   playerS:ctx.flight.s,frontS:ctx.zoneWave.fronts[0],
   launches:[...ZONE_WAVE.triggers],palette:ZONE_PALETTES[ctx.zoneWave.playerStage].id,
   featherMeters:ZONE_WAVE.featherMeters,
   railSynchronized:Boolean(ctx.identitySurface?.setWaveState),
   engineResonance:waveResonanceStrength(ctx.zoneWave,ctx.flight.elapsed),
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
  lightIntensity:{ambient:ctx.worldLights?.ambient.intensity,
   key:ctx.worldLights?.key.intensity,fill:ctx.worldLights?.fill.intensity},
  engineIntensity:ctx.engineLights.map(light=>light.intensity),
  bladeTipOpacity:ctx.bladeTips?.material.opacity,
  baselineShipGlowOpacity:ctx.shipGlow?.opacity,
  state:ctx.tunnelBlackout?.audit()
 });
 window.__skyshiftTunnelSmoke=(at=2435)=>{
  if(uiState.mode!=="playing")throw new Error("Tunnel smoke requires active race");
  // Freeze 120Hz physics while CI captures a stable, legal tunnel pose.
  // This hook is only installed with ?tunnelSmoke=1.
  ctx.waveSmokeHold=true;
  const s=clamp(at,SHADOW_TUNNEL.start+48,SHADOW_TUNNEL.end-48);
  const p=positionAt(s,0,0);
  Object.assign(ctx.flight,{s,lap:1,worldX:p.x,worldZ:p.z,
   lateral:0,y:surfaceHeightAt(s)+TRIAL.hoverHeight,
   heading:headingAt(s),grounded:true,vy:0,
   currentSpeed:TRIAL.startSpeed,zoneCruiseSpeed:TRIAL.startSpeed});
  ctx.motionState=createFlightMotionState(ctx.flight.heading);
  ctx.cinematicState=createCinematicState();
  ctx.kineticCamera=createKineticCameraState();
  snapRacePose(raceSimulation,ctx.flight,false);
  chaseCameraController.snap(ctx.flight,ctx.motionState,ctx.cinematicState);
  ctx.tunnelInside=inShadowTunnel(ctx.flight.s);
  return {at:ctx.flight.s,inside:ctx.tunnelInside,
   darkness:tunnelIntensityAt(ctx.flight.s),
   geometry:ctx.shadowTunnel?.getStats(),normalBank:bankAt(s),
   pilotPhysics:TRIAL.id,cameraMode:CAMERA_MODE};
 };
}
// Test-only real renderer probe. Ordinary sessions never expose or execute it.
function installLivingWakeSmokeHook(){
 if(new URLSearchParams(location.search).get("wakeSmoke")!=="1")return;
 window.__skyshiftWakeInfo=()=>ctx.livingWake?.stats()??null;
 window.__skyshiftWakeSmoke=(stage=8,load="straight")=>{
  if(uiState.mode!=="playing")throw Error("Living wake probe requires a live race");
  if(!Number.isInteger(stage)||stage<0||stage>8)
   throw Error("Living wake stage out of range");
  // CI-only: freeze the simulation and render the production ship & WebGL FX.
  ctx.waveSmokeHold=true;
  ctx.flight.zoneSpeedStage=stage;
  ctx.flight.zoneCruiseSpeed=speedAt(ctx.flight.s,stage);
  const boost=load==="boost";
  const airborne=load==="air";
  ctx.wakeSmokePath={frames:0,load};
  ctx.flight.currentSpeed=ctx.flight.zoneCruiseSpeed*(boost?1.4:1);
  ctx.flight.boostMultiplier=boost?1.4:1;
  ctx.flight.grounded=!airborne;
  ctx.flight.y=surfaceHeightAt(ctx.flight.s)+TRIAL.hoverHeight+(airborne?4:0);
  ctx.flight.vy=airborne?11:0;
  ctx.flight.gripIntensity=load==="grip"?.95:0;
  ctx.flight.steering=load==="grip"?.72:0;
  ctx.flight.yawRate=load==="grip"?.86:0;
  ctx.livingWake?.reset();
  snapRacePose(raceSimulation,ctx.flight);
  return {stage,speed:ctx.flight.currentSpeed,load};
 };
}
function installFlapSmokeHook(){
 if(new URLSearchParams(location.search).get("flapSmoke")!=="1")return;
 window.__skyshiftFlapProbe=()=>ctx.reactiveWingFlaps?.stats()??null;
 window.__skyshiftFlapSet=(steering=0,grip=0)=>{
  if(uiState.mode!=="playing")throw Error("Flap smoke requires a live race");
  if(!Number.isFinite(steering)||!Number.isFinite(grip)||
   Math.abs(steering)>1||grip<0||grip>1)throw Error("Invalid flap smoke pose");
  ctx.waveSmokeHold=true;
  ctx.flight.steering=steering;
  ctx.flight.yawRate=steering*.84;
  ctx.flight.gripIntensity=grip;
  snapRacePose(raceSimulation,ctx.flight);
  return {steering,grip};
 };
}
// This probe only exists under ?sparkSmoke=1. It makes a real rail contact
// observable in headless Chrome without changing any normal player physics.
function installSparkSmokeHook(){
 if(new URLSearchParams(location.search).get("sparkSmoke")!=="1")return;
 window.__skyshiftSparkInfo=()=>ctx.railSparks?.stats()??null;
 window.__skyshiftSparkReset=()=>ctx.railSparks?.reset();
 window.__skyshiftSparkSmoke=(side=1,stage=7,contact=true)=>{
  if(uiState.mode!=="playing")throw Error("Spark QA requires playing mode");
  if(![-1,0,1].includes(side)||!Number.isInteger(stage)||
     stage<0||stage>8)throw Error("Invalid spark smoke params");
  ctx.waveSmokeHold=true;ctx.wakeSmokePath=null;
  const s=520;
  if(side){
   ctx.flight.s=s;ctx.flight.lateral=side*(widthAt(s)*.5-3.83);
   const p=positionAt(s,ctx.flight.lateral);
   ctx.flight.worldX=p.x;ctx.flight.worldZ=p.z;
   ctx.flight.heading=headingAt(s);
   ctx.flight.y=surfaceHeightAt(s,ctx.flight.lateral)+TRIAL.hoverHeight;
  }
  ctx.flight.zoneSpeedStage=stage;
  ctx.flight.zoneCruiseSpeed=speedAt(ctx.flight.s,stage);
  ctx.flight.currentSpeed=ctx.flight.zoneCruiseSpeed;
  ctx.flight.grounded=true;ctx.flight.vy=0;
  ctx.flight.railContacting=contact&&side!==0;
  ctx.flight.lastRailSide=ctx.flight.railContacting?side:0;
  ctx.flight.railScrubIntensity=ctx.flight.railContacting?1:0;
  if(ctx.flight.railContacting)ctx.flight.railContactStarts++;
  snapRacePose(raceSimulation,ctx.flight);
  return {side,stage,contact,serial:ctx.flight.railContactStarts};
 };
}

 installWaveSmokeHook();installTunnelSmokeHook();installLivingWakeSmokeHook();installFlapSmokeHook();installSparkSmokeHook();
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
   ctx.waveSmokeHold=true;
   const p=positionAt(s,0,0);
   Object.assign(ctx.flight,{s,lateral:0,worldX:p.x,worldZ:p.z,
    heading:headingAt(s),y:surfaceHeightAt(s)+TRIAL.hoverHeight,
    grounded:true,vy:0,currentSpeed:TRIAL.startSpeed,
    zoneCruiseSpeed:TRIAL.startSpeed,steering:0,yawRate:0});
   ctx.motionState=createFlightMotionState(ctx.flight.heading);
   ctx.cinematicState=createCinematicState();
   ctx.kineticCamera=createKineticCameraState();
   snapRacePose(raceSimulation,ctx.flight);
    // The established Shadow Tunnel QA snaps directly to chasePose.
    // Do likewise for 1–3 km Vault WebGL jumps only: normal flight camera
    // damping, steering and GRIP never enter this opt-in code path.
    if(isVault()){
     chaseCameraController.snap(ctx.flight,ctx.motionState,ctx.cinematicState,true);
     // SwiftShader may not schedule another RAF before screenshot capture.
     // Update actual ship + chase camera with the production render path
     // immediately, without stepping the user's 120Hz physics.
     placeShip(performance.now()/1000,1/60,ctx.flight,ctx.motionState,ctx.cinematicState);
     // Match the real global-light controller before the manual QA frame.
     ctx.tunnelBlackout?.apply(s);
    }
   // Browser QA freezes 120Hz simulation, so update visual-only ship light
   // immediately at the teleported position before the slow WebGL frame.
   ctx.whiteCoreContainment?.update(s,true);
   ctx.shipWhiteSpill?.update(s,ctx.targetAccent,true);
   refreshHud();
   return window.__skyshiftTrackRepairProbe(s);
  };
 }
 if(new URLSearchParams(location.search).get("fleetSmoke")==="1")
  window.__skyshiftFleetSmokeUnlock=()=>{
   if(uiState.mode!=="hangar")throw new Error("Fleet QA requires Hangar");
   ctx.fleetProgress=saveFleet(fleetStorage(),recordFleetClear(ctx.fleetProgress,true).state);
   refreshHangar();
   return fleetStatus(ctx.fleetProgress);
  };
  window.__skyshiftFleetProbe=()=>({
   showroomWorldHidden:ctx.world?.visible===false,
   previewTrackVisible:ctx.world?.visible===true,
   // Screen-space center validates that the craft stays clear of Hangar cards.
   projectedShipX:ctx.ship?(ctx.ship.position.clone().project(ctx.camera).x+1)*.5:null,
   showroomCamera:{x:ctx.camera?.position.x,y:ctx.camera?.position.y,
    z:ctx.camera?.position.z,fov:ctx.camera?.fov},
   ...fleetStatus(ctx.fleetProgress),activeShipId:ctx.activeShipId,previewShipId:ctx.previewShipId,
   tail:ctx.activeCraft?.tailStats?.()??null,
   surfacePolish:ctx.activeCraft?.polishStats?.()??null,
   wingFlaps:ctx.reactiveWingFlaps?.stats?.()??null,
   shipArt:ctx.shipArtController.audit(),
   stingrayPresentation:STINGRAY_PRESENTATION_01347,
   heroShowroom:ctx.hangarHeroRig?.stats(),
   hangarVisible:!UI.hangar.classList.contains("hidden")
  });
 // 0.28.3: production boost pad and PBR glow release audit, opt-in.
 if(new URLSearchParams(location.search).get("vaultBoostSmoke")==="1")
  window.__skyshiftVaultBoostAudit=()=>({
   active:VAULT_BOOST_0283_ACTIVE,track:TRACK_ID_0160,
   release:VAULT_BOOST_0283_ACTIVE?"0.28.3":"legacy",
   padCount:BOOST_PADS.length,
   physicalPads:BOOST_PADS.map(p=>({id:p.id,group:p.group,kind:p.kind,
    start:p.start,end:p.end,range:[p.lateralMin,p.lateralMax],
    multiplier:p.multiplier})),
   riskGateCount:RHYTHM_GATES_0160.length,
   riskVisible:!UI.riskCue.classList.contains("hidden"),
   roadMaterial:ctx.premiumSurface?.material?.type??null,
   inputHandlingUnchanged:true,physicsTicksPerSecond:120
  });
 // Browser CI only. Never accessible to real players without opt-in URL.
 if(new URLSearchParams(location.search).get("challengeSmoke")==="1"){
  window.__skyshiftChallengeProbe=()=>({
   mode:uiState.mode,selected:ctx.currentChallenge?.id??null,
   flightS:ctx.flight?.s,elapsed:ctx.flight?.elapsed,
   timeTrialMode:timeTrialState.mode,summary:challengeSummary(ctx.challengeProgress),
   medal:ctx.lastChallengeGrading?.medal??null,
   visible:!UI.challengeScreen.classList.contains("hidden")
  });
  window.__skyshiftChallengeSmokeFinish=()=>{
   if(uiState.mode!=="playing"||!ctx.currentChallenge)
    throw Error("Challenge QA requires active challenge");
   ctx.flight.s=ctx.currentChallenge.endS;
   ctx.flight.elapsed=ctx.currentChallenge.goldSeconds+8;
   ctx.flight.railContacts=3;
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
   activeState:{safeBoosts:ctx.flight?.safeBoosts??0,
    riskBoosts:ctx.flight?.riskBoosts??0}
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
  if(!ctx.ship||!ctx.camera||!ctx.renderer)return null;
  ctx.ship.updateWorldMatrix(true,true);
  ctx.camera.updateWorldMatrix(true,false);
  const canvasWidth=ctx.renderer.domElement.getBoundingClientRect().width;
  const v=new THREE.Vector3(),unity=new THREE.Matrix4();
  const projectedWidth=(samples,transform)=>{
   let left=Infinity,right=-Infinity;
   for(let i=0;i<samples.length;i+=3){
    v.set(samples[i],samples[i+1],samples[i+2])
     .applyMatrix4(transform).project(ctx.camera);
    left=Math.min(left,v.x);right=Math.max(right,v.x);
   }
   return Number.isFinite(left)&&Number.isFinite(right)?
    (right-left)*canvasWidth*.5:null;
  };
  const wingNames=ctx.activeShipId==="stingray"&&ctx.shipArtController.audit().heroApplied?
   ["Hero_Wing_L","Hero_Wing_R"]:
   [ctx.activeShipId==="stingray"?"Stingray EVO · wide manta wings":
    "Two broad scalloped manta wings"];
  let left=Infinity,right=-Infinity,points=0;
  for(const name of wingNames){
   const mesh=ctx.ship.getObjectByName(name),attr=mesh?.geometry?.attributes?.position;
   if(!attr)continue;
   mesh.updateWorldMatrix(true,false);
   for(let i=0;i<attr.count;i++){
    v.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld).project(ctx.camera);
    left=Math.min(left,v.x);right=Math.max(right,v.x);points++;
   }
  }
  const actual=points?(right-left)*canvasWidth*.5:null;
  const referenceMatrix=new THREE.Matrix4().compose(
   ctx.ship.position,ctx.ship.quaternion,new THREE.Vector3(1,1,1));
  const manta=projectedWidth(buildMantaWings().positions,referenceMatrix);
  return {shipId:ctx.activeShipId,heroApplied:ctx.shipArtController.audit().heroApplied,
   actualWingPixels:actual,mantaReferencePixels:manta,
   screenRatio:actual&&manta?actual/manta:null,
   shipScaleX:ctx.ship.scale.x,shipScaleY:ctx.ship.scale.y,shipScaleZ:ctx.ship.scale.z,
   cameraFov:ctx.camera.fov,trackMeters:ctx.flight.s};
 };
 // QA only: compare both ships using the EXACT same live flight roll.
 // This is read-only; it never changes steering, physics, camera or ship.
 window.__skyshiftHandlingParityProbe=()=>{
  if(!ctx.ship||uiState.mode!=="playing")return null;
  const expectedRoll=ctx.motionState.roll-bankAt(ctx.flight.s)-
   (ctx.flight.trickVisualAngle??0)-
   Math.sign(ctx.flight.gripDirection)*ctx.flight.gripIntensity*.058+
   ctx.signatureFlight.roll+ctx.velocityPresence.hullRoll+
   ctx.racingExperience.hullCarve*
    (ctx.flight.grounded&&!motionRig.wall&&!motionRig.corkscrew?1:0);
  return {shipId:ctx.activeShipId,steering:ctx.flight.steering,
   gripIntensity:ctx.flight.gripIntensity,yawRate:ctx.flight.yawRate,
   renderedRoll:ctx.ship.rotation.z,sharedRoll:expectedRoll,
   difference:ctx.ship.rotation.z-expectedRoll,
   roadNormalLift:STINGRAY_PRESENTATION_01347.visualRoadNormalLiftMeters,
   physicalHover:TRIAL.hoverHeight,
   noShipSpecificTurnPose:true};
 };
 window.__skyshiftPerfProbe=()=>({
  settings:perfSettings,summary:perfSummary(frameProfiler),
  gpu:ctx.gpuClock?.summary(),state:uiState.mode,physicsHz:120,
  motionRig:unifiedFlightAudit(motionRig),
  visualFidelity:ctx.fidelityDirector?{...fidelityAudit(ctx.fidelityDirector),
   shaderVariant:ctx.premiumSurface?.fidelityShaderVariant,
   modeSelection:ctx.fidelityProfile.modeSelection,
   shaderChangesOnLowMemory:ctx.fidelityProfile.lowMemory&&ctx.fidelityProfile.premium,
   premiumDefaultOnLowMemory:ctx.fidelityProfile.defaultPremiumOnLowMemory,
   userRequestedOff:ctx.fidelityProfile.userRequestedOff,
   adaptiveResolutionEnabled:!perfSettings.fixedQuality}:null,
  racingExperience:racingExperienceAudit(ctx.racingExperience),
  timeTrial:ghostAudit(timeTrialState),ghostVisual:ctx.ghostVisual?.stats()??null,
  shipArt:ctx.shipArtController.audit(),
  stingrayPresentation:STINGRAY_PRESENTATION_01347,
  heroShowroom:ctx.hangarHeroRig?.stats(),
  navigation:{mode:uiState.mode,settingsVisible:!UI.settings.classList.contains("hidden"),
   pauseVisible:!UI.pause.classList.contains("hidden"),
   ghostToggleInPause:!!UI.pauseGhostToggle,
   gearInMain:!UI.settingsOpen.classList.contains("hidden")},
  landmarks:ctx.sectorLandmarks?.stats()??null,
  optimizer:{bloom:ctx.neonPipeline?.bloomResolution(),hud:hudBudget.stats(),
   dom:domWrites.stats(),sparkFinal:ctx.completedSparkStats},
  pipeline:{bloom:ctx.neonPipeline?.bloom?.enabled,smaa:ctx.neonPipeline?.smaa?.enabled,
   bloomScale:ctx.neonPipeline?.bloomResolutionScale,
   dpr:ctx.neonPipeline?.internalPixelRatio,fixedQuality:perfSettings.fixedQuality}
 });

}
