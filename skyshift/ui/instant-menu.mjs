// Lightweight pre-race menu. Owns only the DOM before the authoritative game
// takes over, reusing existing settings/storage APIs. Never imports Three.js.
import {FLEET,readFleet,saveFleet,equipFleet,isFleetUnlocked} from "../ships/fleet-v010.mjs";
import {readPerformance,savePerformance} from "../core/smart-performance.mjs";
import {readAdvancedGpu,saveAdvancedGpu} from "../core/advanced-gpu-settings.mjs";
import {readVelocityExperience,saveVelocityExperience} from "../core/velocity-experience-settings.mjs";
import {readFidelityChoice,saveFidelityChoice} from "../core/fidelity-preference.mjs";
import {createTimeTrialAPI} from "../core/time-trial.mjs";
import {TIME_TRIAL_0160} from "../core/time-trial-v0160.mjs";
import {readHapticMode,saveHapticMode,syncHapticSettings} from "../core/race-haptics.mjs";

export function mountInstantMenu({document,window}){
 const $=id=>document.getElementById(id);
 const cleanups=[];
 const on=(el,event,handler)=>{el.addEventListener(event,handler);cleanups.push(()=>el.removeEventListener(event,handler));};
 const visible=(id,yes)=>$(id).classList.toggle("hidden",!yes);
 let storage;try{storage=window.localStorage;}catch{}
 let fleet=readFleet(storage),preview=fleet.selected;
 const q=new URLSearchParams(window.location.search),release=q.get("v");
 const hapticEnabled=release==="0.29.8.1",hapticSupported=typeof window.navigator.vibrate==="function";
 let hapticMode=readHapticMode(storage);
 const performance=readPerformance(storage,window.matchMedia("(pointer:coarse)").matches,{enabled:q.get("perf")==="1"});
 const gpu=readAdvancedGpu(storage),velocity=readVelocityExperience(storage,true);
 let fidelity=readFidelityChoice({search:window.location.search,storage}).enabled;
 const trial=createTimeTrialAPI({...TIME_TRIAL_0160,storageKey:"skyshift-time-trial-ghost-vault-hyper-0297",trackRevision:TIME_TRIAL_0160.trackRevision+"|hyper-0297"});
 const best=trial.loadPersonalGhost(storage);
 if(best){$("tt-menu-status").textContent="PERSONAL BEST · "+trial.formatTrialTime(best.duration)+" · "+best.ship.toUpperCase();visible("tt-menu-status",true);}
 $("track-picker").value="vault";
 $("menu-track-name").textContent="NEON VAULT · MEGA JUMP · "+release;
 $("topbar-track-name").textContent="NEON VAULT · MEGA JUMP · "+release;
 $("track-tagline").textContent="EXPANSION CHAMBER · 54.4 M LEAP · AIR TRICKS";
 $("track-features").textContent="3 × 3,400 M · MEGA JUMP · GRIP + STEER IN AIR";
 document.title="SKYSHIFT · "+(release==="0.29.8.1"?"Zone 1 Palette Lift & Countdown Restore":"Instant Boot & Race Loading")+" · "+release;
 visible("challenges-btn",false);$("hangar-btn").disabled=false;
 function show(id){for(const screen of ["menu","settings-screen","hangar-screen"])visible(screen,screen===id);visible("menu-settings-btn",id==="menu");}
 function syncFidelity(){ $("fidelity-btn").textContent="FIDELITY "+(fidelity?"ON":"OFF");$("fidelity-btn").setAttribute("aria-pressed",String(fidelity));}
 function syncSettings(){
  if(hapticEnabled)syncHapticSettings(document,hapticMode,hapticSupported);
  visible("smart-performance-settings",true);visible("advanced-gpu-settings",true);visible("velocity-experience-settings",true);
  $("settings-screen").classList.add("smart-settings");
  $("frame-cap").value=String(performance.fps);$("graphics-quality").value=performance.quality;
  $("extended-diagnostics").checked=performance.diagnostics;$("section-culling").checked=performance.sections;
  $("bloom-resolution").value=gpu.bloom;$("exterior-backdrop").checked=gpu.exterior;$("distant-detail-lod").checked=gpu.detailLod;$("tunnel-occlusion").checked=gpu.occlusion;
  for(const opt of $("motion-blur").options){opt.hidden=false;opt.disabled=false;}
  $("motion-blur").value=velocity.motionBlur;$("adaptive-velocity-camera").checked=velocity.adaptiveCamera;syncFidelity();
 }
 function syncFleet(){
  $("menu-selected-ship").textContent=FLEET.find(x=>x.id===fleet.selected).name;
  $("fleet-preview-title").textContent=FLEET.find(x=>x.id===preview).name;
  $("fleet-preview-mode").textContent="SHIP SELECTION";
  $("fleet-preview-description").textContent=FLEET.find(x=>x.id===preview).signature;
  for(const ship of FLEET){
   const el=key=>document.querySelector('[data-fleet-'+key+'="'+ship.id+'"]');
   const unlocked=isFleetUnlocked(fleet,ship.id),selected=fleet.selected===ship.id;
   el("card").classList.toggle("active",ship.id===preview);el("card").classList.toggle("locked",!unlocked);
   el("preview").setAttribute("aria-pressed",String(ship.id===preview));el("equip").disabled=!unlocked;
   el("equip").textContent=!unlocked?"LÅST":selected?"UTRUSTAD":"VÄLJ";el("status").textContent=!unlocked?"LÅST · KLARA 3 VARV":selected?"UTRUSTAD":"UPPLÅST";
  }
  $("fleet-progress").textContent=fleet.clears?"FULLSTÄNDIGA LOPP: "+fleet.clears+" · STINGRAY EVO UPPLÅST":"KLARA ALLA TRE VARV I ETT LOPP FÖR ATT LÅSA UPP STINGRAY EVO";
 }
 syncFleet();syncSettings();
 on($("menu-settings-btn"),"click",()=>show("settings-screen"));
 on($("settings-back-btn"),"click",()=>show("menu"));
 on($("hangar-btn"),"click",()=>{preview=fleet.selected;syncFleet();show("hangar-screen");});
 on($("hangar-back"),"click",()=>show("menu"));
 for(const el of document.querySelectorAll("[data-fleet-preview]"))on(el,"click",()=>{preview=el.dataset.fleetPreview;syncFleet();});
 for(const el of document.querySelectorAll("[data-fleet-equip]"))on(el,"click",()=>{fleet=saveFleet(storage,equipFleet(fleet,el.dataset.fleetEquip));preview=fleet.selected;syncFleet();});
 for(const id of ["frame-cap","graphics-quality","extended-diagnostics","section-culling"])on($(id),"change",()=>{
  Object.assign(performance,{fps:Number($("frame-cap").value),quality:$("graphics-quality").value,diagnostics:$("extended-diagnostics").checked,sections:$("section-culling").checked});savePerformance(storage,performance);
 });
 for(const id of ["bloom-resolution","exterior-backdrop","distant-detail-lod","tunnel-occlusion"])on($(id),"change",()=>{
  Object.assign(gpu,{bloom:$("bloom-resolution").value,exterior:$("exterior-backdrop").checked,detailLod:$("distant-detail-lod").checked,occlusion:$("tunnel-occlusion").checked});saveAdvancedGpu(storage,gpu);
 });
 for(const id of ["motion-blur","adaptive-velocity-camera"])on($(id),"change",()=>{
  Object.assign(velocity,{motionBlur:$("motion-blur").value,adaptiveCamera:$("adaptive-velocity-camera").checked});saveVelocityExperience(storage,velocity,true);
 });
 if(hapticEnabled)on($("haptic-mode"),"change",()=>{hapticMode=saveHapticMode(storage,$("haptic-mode").value);syncHapticSettings(document,hapticMode,hapticSupported);});
 on($("fidelity-btn"),"click",()=>{fidelity=!fidelity;saveFidelityChoice(fidelity,storage);const url=new URL(window.location.href);url.searchParams.set("fidelity",fidelity?"on":"off");window.history.replaceState(null,"",url);syncFidelity();});
 on($("track-picker"),"change",()=>{$("track-picker").value="vault";});
 return {snapshot:()=>({fleet:{...fleet},performance:{...performance},gpu:{...gpu},velocity:{...velocity},haptics:hapticMode}),dispose(){for(const fn of cleanups.splice(0))fn();}};
}
