// SKYSHIFT 0.4.9.6 — mobile-safe bootstrap. This small classic script
// starts before any Three.js or WebGL modules need to load. Menu and
// fullscreen must NEVER silently stop responding on shader/CDN/GPU failures.
(function(){
 "use strict";
 const app=document.getElementById("app");
 const start=document.getElementById("start-btn");
 const fullscreen=document.getElementById("menu-fullscreen-btn");
 const status=document.getElementById("boot-state");
 if(!app||!start||!fullscreen||!status)return;
 const boot={phase:"loading",pendingStart:false,fullscreenRequested:false,
  moduleReady:false,error:""};
 window.__skyshiftBoot=boot;
 function report(message,kind){
  status.textContent=message;
  status.classList.remove("hidden","failed");
  if(kind==="failed")status.classList.add("failed");
 }
 function fail(error){
  if(boot.phase==="ready")return;
  boot.phase="failed";
  boot.error=String(error&&error.message||error||"Unknown module error");
  start.firstChild.textContent="FÖRSÖK IGEN ";
  report("STARTFEL: "+boot.error+" · Tryck FÖRSÖK IGEN för att ladda om.",
   "failed");
 }
 function requestFullscreen(){
  const active=document.fullscreenElement||document.webkitFullscreenElement;
  const invoke=active?
   (document.exitFullscreen||document.webkitExitFullscreen):
   (app.requestFullscreen||app.webkitRequestFullscreen);
  if(typeof invoke!=="function"){
   report("Fullscreen stöds inte i den här webbläsarvyn. Öppna i Chrome.");
   return;
  }
  try{
   const result=invoke.call(active?document:app);
   if(result&&typeof result.catch==="function")
    result.catch(()=>report("Fullscreen blockerades av webbläsaren. Prova Chrome direkt."));
  }catch(e){
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
  boot.pendingStart=true;
  boot.fullscreenRequested=true;
  requestFullscreen();
  report("Laddar SKYSHIFT:s 3D-motor. Startar automatiskt när den är klar...");
 },true);
 fullscreen.addEventListener("click",function(e){
  if(boot.phase==="ready")return;
  e.preventDefault();e.stopImmediatePropagation();
  requestFullscreen();
 },true);
 window.__skyshiftBootReady=function(startQueued){
  boot.moduleReady=true;boot.phase="ready";boot.error="";
  status.classList.add("hidden");
  start.firstChild.textContent="START RUN ";
  if(boot.pendingStart&&typeof startQueued==="function"){
   boot.pendingStart=false;
   // Fullscreen was already requested in the original touch gesture.
   startQueued();
  }
 };
 window.__skyshiftBootFail=fail;
 // Late/blocked imports should be visible to players, not a dead menu.
 window.addEventListener("unhandledrejection",function(ev){
  if(boot.phase!=="ready"&&ev.reason)fail(ev.reason);
 });
 window.setTimeout(function(){
  if(boot.phase==="loading")report("Spelet laddar fortfarande. Tryck START RUN för att starta så fort det är klart.");
 },3600);
 window.setTimeout(function(){
  if(boot.phase==="loading")report("Långsam laddning på den här mobilen. Kontrollera anslutningen och prova ladda om vid behov.");
 },14000);
 // Use dynamic import so *module graph* failures also show actionable
 // feedback; static <script type=module> silently fails before try/catch.
 import("./game-v0496.mjs?v=0.4.9.6").catch(fail);
})();
