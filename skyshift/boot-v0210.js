// SKYSHIFT 0.9.2.1 — mobile-safe bootstrap. This small classic script
// starts before any Three.js or WebGL modules need to load. Menu and
// fullscreen must NEVER silently stop responding on shader/CDN/GPU failures.
(function(){
 "use strict";
 const app=document.getElementById("app");
 const start=document.getElementById("start-btn");
 const fullscreen=document.getElementById("menu-fullscreen-btn");
 const status=document.getElementById("boot-state");
 if(!app||!start||!fullscreen||!status)return;
 const q=new URLSearchParams(location.search);
 const deferred=q.get("track")==="vault"&&q.get("v")==="0.29.8"&&q.get("vaultJump")!=="0"&&q.get("instantBoot")!=="classic";
 const boot={deferred,phase:deferred?"menu":"loading",pendingStart:false,pendingMode:"time-trial",fullscreenRequested:false,
  moduleReady:false,error:"",startedAt:performance.now(),readyAfterMs:null};
 window.__skyshiftBoot=boot;
 const loading=document.getElementById("race-loading");
 const progress=document.getElementById("race-loading-progress");
 const message=document.getElementById("race-loading-message");
 let menuController=null,loadPromise=null;
 const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 window.__skyshiftLoadingStage=async(label,step)=>{
  if(!deferred||boot.phase!=="loading")return;
  boot.loadingStages.push({label,step,ms:Math.round(performance.now()-boot.loadStartedAt)});
  message.textContent=label;progress.value=step;await paint();
 };
 boot.loadingStages=[];
 function report(message,kind){
  status.textContent=message;
  status.classList.remove("hidden","failed");
  if(kind==="failed")status.classList.add("failed");
 }
 function fail(error){
  if(boot.phase==="ready")return;
  boot.phase="failed";
  loading?.classList.add("hidden");
  document.getElementById("menu")?.classList.remove("hidden");
  start.disabled=false;
  boot.failedAfterMs=Math.round((performance.now()-boot.startedAt)*10)/10;
  boot.error=String(error&&error.message||error||"Unknown module error");
  start.firstChild.textContent="FÖRSÖK IGEN ";
  report("STARTFEL: "+boot.error+" · Tryck FÖRSÖK IGEN för att ladda om.",
   "failed");
 }
 let fullscreenPending=false;
 boot.fullscreenHistory=[];
 const syncBootFullscreen=()=>{if(boot.phase==="ready")return;const active=!!(document.fullscreenElement||document.webkitFullscreenElement);fullscreen.textContent=active?"⛶ EXIT FULLSCREEN":"⛶ FULLSCREEN";fullscreen.setAttribute("aria-pressed",String(active));};
 document.addEventListener("fullscreenchange",syncBootFullscreen);
 document.addEventListener("webkitfullscreenchange",syncBootFullscreen);
 function fullscreenRecord(event,error){
  boot.fullscreenHistory.push({event,active:Boolean(document.fullscreenElement||document.webkitFullscreenElement),
   fullscreenEnabled:document.fullscreenEnabled??document.webkitFullscreenEnabled??null,
   userActivation:navigator.userActivation?.isActive??null,errorName:error?.name??null,errorMessage:error?.message??null});
  if(boot.fullscreenHistory.length>16)boot.fullscreenHistory.shift();
 }
 function requestFullscreen(enterOnly=false){
  const active=document.fullscreenElement||document.webkitFullscreenElement;
  if(fullscreenPending||(enterOnly&&active))return;
  fullscreenRecord(active?"exit-request":"request");
  const invoke=active?
   (document.exitFullscreen||document.webkitExitFullscreen):
   (app.requestFullscreen||app.webkitRequestFullscreen);
  if(typeof invoke!=="function"){
   fullscreenRecord("denied",new Error("Fullscreen unsupported"));
   report("Fullscreen stöds inte i den här webbläsarvyn. Öppna i Chrome.");
   return;
  }
  try{
   fullscreenPending=true;
   const result=invoke.call(active?document:app);
   Promise.resolve(result).then(()=>fullscreenRecord("settled")).catch(error=>{
    fullscreenRecord("denied",error);
    report("Fullscreen blockerades av webbläsaren. Prova Chrome direkt.");
   }).finally(()=>{fullscreenPending=false;});
  }catch(e){
   fullscreenPending=false;fullscreenRecord("denied",e);
   report("Fullscreen blockerades: "+(e.message||"webbläsarbegränsning"));
  }
 }
 start.addEventListener("click",function(e){
  if(boot.phase==="ready")return; // Let the game-own click handler run.
  e.preventDefault();e.stopImmediatePropagation();
  if(boot.phase==="failed"){
   location.reload();return;
  }
  // Preserve the user gesture for fullscreen before loading completes.
  boot.pendingStart=true;boot.pendingMode="time-trial";
  boot.fullscreenRequested=true;
  requestFullscreen(true);
  if(deferred){void loadRace();return;}
  report("Laddar SKYSHIFT:s 3D-motor. Startar automatiskt när den är klar...");
 },true);
 fullscreen.addEventListener("click",function(e){
  if(boot.phase==="ready")return;
  e.preventDefault();e.stopImmediatePropagation();
  requestFullscreen();
 },true);
 window.__skyshiftBootReady=function(startQueued){
  boot.moduleReady=true;boot.phase="ready";boot.error="";
  if(deferred){boot.raceLoadMs=Math.round(performance.now()-boot.loadStartedAt);progress.value=6;loading.classList.add("hidden");start.disabled=false;document.getElementById("fleet-preview-mode").textContent="LIVE 3D PREVIEW";}
  boot.readyAfterMs=Math.round((performance.now()-boot.startedAt)*10)/10;
  status.classList.add("hidden");
  start.firstChild.textContent="START RUN ";
  if(boot.pendingStart&&typeof startQueued==="function"){
   boot.pendingStart=false;
   // Fullscreen was already requested in the original touch gesture.
   startQueued(boot.pendingMode);
  }
 };
 window.__skyshiftBootFail=fail;
 // Late/blocked imports should be visible to players, not a dead menu.
 window.addEventListener("unhandledrejection",function(ev){
  if(boot.phase!=="ready"&&ev.reason)fail(ev.reason);
 });
 window.setTimeout(function(){
  if(boot.phase==="loading"&&!deferred)report("Spelet laddar fortfarande. Tryck START RUN för att starta så fort det är klart.");
 },3600);
 window.setTimeout(function(){
  if(boot.phase==="loading"&&!deferred)report("Långsam laddning på den här mobilen. Kontrollera anslutningen och prova ladda om vid behov.");
 },14000);
 // Use dynamic import so *module graph* failures also show actionable
 // feedback; static <script type=module> silently fails before try/catch.
 function importGame(){return import("./game-v0210.mjs?v=0.26.5&rev=startup-shared-gpu-cache-02897-20261122").catch(fail);}
 function loadRace(){
  if(loadPromise)return loadPromise;
  boot.phase="loading";boot.loadStartedAt=performance.now();
  menuController?.dispose();start.disabled=true;
  loading.classList.remove("hidden");
  loadPromise=(async()=>{await window.__skyshiftLoadingStage("LOADING 3D ENGINE",1);await importGame();})().catch(fail);
  return loadPromise;
 }
 if(deferred){
  // This independent menu module has no Three.js or race geometry dependency.
  start.disabled=true;
  import("./ui/instant-menu.mjs").then(({mountInstantMenu})=>{
   menuController=mountInstantMenu({document,window});
   boot.menuReadyMs=Math.round(performance.now()-boot.startedAt);
   start.disabled=false;
  }).catch(fail);
 }else importGame();
})();
