// Browser input ownership: the same UI state, pointer capture, keyboard and pause rules.
export function clearRaceInput(UI,uiState){
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
export function installRaceInput({UI,uiState,clamp,addEventListener,document,pause,resume,closeSettings,enterPlaying}){
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
