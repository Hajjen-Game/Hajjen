// Race HUD and track hints. Mutable cue counters are local to the HUD controller.
export function createRaceHud({UI,uiState,domWrites,ZONE_PALETTES,TRIAL,CIRCUIT,
 challengeDistance,formatTrialTime,formatTrialDelta,updateGhostDelta,curvatureAt,
 sectorAt,isAurora,isVault,gripApexCue,GRIP_APEX,riskCueAt,AIR_TRICKS,bankDegreesAt,
 event,flashToast}){
 let gripCueVisible=false,gripCueSeconds=0,gripCueDisplays=0;
 function reset(){gripCueVisible=false;gripCueSeconds=0;gripCueDisplays=0;}
 function advance(dt){if(gripCueVisible)gripCueSeconds+=dt;}
 function refreshHud(flight,zoneWave,currentChallenge,timeTrialState,railFeedback,racingExperience){
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
 const cue=(isAurora()||isVault())?{visible:false,active:false,text:"",distanceMeters:null}:
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
 function maybeShowCue(flight){
 if(uiState.mode!=="playing")return;
 const localS=((flight.s%CIRCUIT.lapLength)+CIRCUIT.lapLength)%CIRCUIT.lapLength;
 if(isVault()){
  for(const hint of [
   {id:"vault-entry",start:178,end:199,text:"NEON VAULT · FLOW INTO THE S-LINK"},
   {id:"vault-grip",start:740,end:770,text:"TECHNICAL CURVE AHEAD · GRIP IF NEEDED"},
   {id:"vault-sweep",start:1315,end:1340,text:"GRAND SWEEP · HOLD A CLEAN LINE"},
   {id:"vault-return",start:1710,end:1730,text:"MIRROR RUN · TUNNEL CONTINUES"}
  ]){
   if(localS>=hint.start&&localS<hint.end&&uiState.trackHint!==hint.id){
    uiState.trackHint=hint.id;flashToast(hint.text,1250);
   }
  }
  return;
 }
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
 return Object.freeze({refreshHud,maybeShowCue,reset,advance,
  get gripCueDisplays(){return gripCueDisplays},get gripCueSeconds(){return gripCueSeconds}});
}
