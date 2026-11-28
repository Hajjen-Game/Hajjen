// Race mode transitions. Resource initialization/disposal remains EF06.
export function createRaceLifecycle({UI,uiState,raceSession,timeTrialState,resetFlight,refreshHud,hudBudget,clearInput,refreshTrialMenu,worldClock,event,now,clearTimeout,ctx}){
function enterPlaying(challenge=null,{countdown=false}={}){
 if(!ctx.sceneReady)return;
 ctx.setChallenge(challenge);
 raceSession.selectMode(ctx.currentChallenge);
 ctx.app().classList.remove("hangar-active");
 ctx.world.visible=true;
 resetFlight();uiState.mode=countdown?"countdown":"playing";
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.challengeScreen.classList.add("hidden");
 ctx.app().classList.toggle("challenge-active",!!ctx.currentChallenge);
 UI.challengeHud.classList.toggle("hidden",!ctx.currentChallenge);
 UI.challengeResult.classList.add("hidden");
 UI.challengeEndBack.classList.add("hidden");
 if(ctx.currentChallenge)UI.challengeHudName.textContent=ctx.currentChallenge.name;
 UI.settings.classList.add("hidden");
 UI.settingsOpen.classList.add("hidden");
 UI.pause.classList.add("hidden");
 UI.hud.classList.remove("hidden");UI.controls.classList.toggle("hidden",countdown);
 UI.trialHud.classList.toggle("hidden",timeTrialState.mode!=="time-trial");
 UI.trialResult.classList.add("hidden");
 if(countdown){
  UI.pauseBtn.classList.add("hidden");UI.fullscreen.classList.remove("hidden");
  refreshHud();hudBudget.shouldUpdate(now(),true);return;
 }
 launch();
}
function launch(){
 if(timeTrialState.mode==="time-trial")
  event("time_trial_start",{ghostLoaded:!!timeTrialState.previousBest,
   ghostEnabled:raceSession.ghostEnabled,previousBestSeconds:timeTrialState.previousBest?.duration??null});
 UI.controls.classList.remove("hidden");UI.pauseBtn.classList.remove("hidden");
 UI.fullscreen.classList.remove("hidden");
 refreshHud();hudBudget.shouldUpdate(now(),true);
}
function finishCountdown(){
 if(!ctx.sceneReady||uiState.mode!=="countdown")return false;
 clearInput();uiState.mode="playing";worldClock.last=now();worldClock.accum=0;
 launch();return true;
}
function returnToMainMenu(){
 if(uiState.mode!=="paused")return;
 // Abandon only the unfinished trace; never overwrite or erase an existing PB.
 uiState.mode="menu";
 ctx.setChallenge(null);
 ctx.app().classList.remove("challenge-active");
 clearTimeout(uiState.toastTimeout);
 clearTimeout(uiState.bannerTimeout);
 ctx.hideGhost();
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
 ctx.app().classList.remove("hangar-active");
 ctx.world.visible=true;
 resetFlight();
 refreshTrialMenu();
}
function pause(){
 if(uiState.mode!=="playing")return;
 uiState.mode="paused";clearInput();UI.riskCue.classList.add("hidden");
 ctx.hideGhost();
 refreshTrialMenu();
 UI.pause.classList.remove("hidden");UI.pauseBtn.classList.add("hidden");
}
function resume(){
 if(uiState.mode!=="paused")return;
 uiState.mode="playing";UI.pause.classList.add("hidden");
 UI.pauseBtn.classList.remove("hidden");
 worldClock.last=now();worldClock.accum=0;
}

 return Object.freeze({enterPlaying,finishCountdown,returnToMainMenu,pause,resume});
}
