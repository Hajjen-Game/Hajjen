// Energy Arena UI, scoped to the independent Energy Build / combat prototype.
import { readBuildStorage, isReady, allEquippedIds, buildCombatLoadout } from "../buildState.js";
import { ABILITY_BY_ID, DISCIPLINES, ROLES } from "../abilityCatalog.js";
import { EnergyMatch, ABILITY_RULES } from "./EnergyMatch.js";
import { EnergyArenaRenderer } from "./EnergyArenaRenderer.js";
import { VERDANT_CRUCIBLE } from "../../content/arenas/verdant-crucible/config.js?v=20261002-2250";

const $=id=>document.getElementById(id);
const hotkeys=["1","2","3","4","5","6","7","8","9","0"];
const glyph={void:"◈",solar:"✦",cryo:"❄",kinetic:"ϟ",vital:"✧"};
const store=readBuildStorage(window.localStorage);
let match=null,renderer=null,last=0,lastUi=0,selectedBuild=null,lastNotice="",keys=new Set();
const arena=VERDANT_CRUCIBLE;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function element(tag,className="",text=""){
  const e=document.createElement(tag);
  if(className)e.className=className;
  if(text!=="")e.textContent=String(text);
  return e;
}
function setError(text){
  const node=$("scene-error");node.hidden=false;node.textContent=text;
}
function renderBuildChoices(){
  const root=$("available-builds");root.replaceChildren();
  const builds=[{label:"Current draft",build:store.draft},...store.saved.map((b,i)=>({label:"Preset "+(i+1),build:b}))];
  for(const entry of builds){
    if(!entry.build)continue;
    const ready=isReady(entry.build);
    const button=element("button","build-choice");
    button.type="button";button.disabled=!ready;
    const text=element("span");
    const heading=element("strong","",entry.build.name);
    const detail=element("small","",entry.label+" · "+ROLES[entry.build.role].name+" · "+allEquippedIds(entry.build).length+"/10 abilities");
    text.append(heading,detail);
    button.append(text,element("span","status",ready?"ENTER ARENA →":"COMPLETE BUILD FIRST"));
    button.addEventListener("click",()=>start(entry.build));
    root.append(button);
  }
  if(!root.childElementCount){
    root.append(element("p","","No saved builds yet. Create one in Energy Build Lab."));
  }
}

function showGate(){
  match=null;
  $("combat-screen").hidden=true;$("build-gate").hidden=false;
  $("scene-error").hidden=true;
  if(renderer){renderer.dispose();renderer=null;}
  keys.clear();
  renderBuildChoices();
}
function start(build){
  try{
    buildCombatLoadout(build);
    selectedBuild=build;
    match=new EnergyMatch(build,arena);
    $("build-gate").hidden=true;$("combat-screen").hidden=false;
    $("active-build").textContent=build.name.toUpperCase()+" · "+ROLES[build.role].name.toUpperCase();
    $("role-passive").textContent=ROLES[build.role].name.toUpperCase()+" · +8 FLUX/s";
    $("combat-banner").hidden=true;$("scene-error").hidden=true;
    if(renderer)renderer.dispose();
    renderer=new EnergyArenaRenderer($("energy-canvas"),arena);
    last=performance.now();lastUi=0;lastNotice="";keys.clear();
    renderUI();
    match.log("Energy Arena ready. Tab targets enemies; F1–F3 targets allies.");
  }catch(error){
    console.error("Energy Arena start failed",error);
    $("build-gate").hidden=false;$("combat-screen").hidden=true;
    const warning=element("p","",error?.message||"Unable to start arena");
    warning.style.color="#f8a0ab";$("available-builds").append(warning);
  }
}

function target(id){
  if(!match||match.ended)return;
  const actor=match.getActor(id);
  if(actor?.alive)match.player.targetId=id;
}
function cycleEnemies(){
  if(!match)return;
  const living=match.living("enemy");
  if(!living.length)return;
  const index=living.findIndex(a=>a.id===match.player.targetId);
  target(living[(index+1)%living.length].id);
}
function selectFriend(index){
  if(!match)return;
  const team=[match.player,...match.actors.filter(a=>a.team==="friendly"&&a!==match.player)];
  target(team[index]?.id);
}
function directionalVector(){
  const x=Number(keys.has("d"))-Number(keys.has("a"));
  const y=Number(keys.has("w"))-Number(keys.has("s"));
  if(x||y)return{x,y};
  const lastMove=match?.player?.lastMove;
  if(lastMove&&(lastMove.x||lastMove.y))return{x:lastMove.x,y:lastMove.y};
  const targetActor=match.getActor(match.player.targetId);
  if(targetActor)return{x:targetActor.x-match.player.x,y:targetActor.y-match.player.y};
  return{x:1,y:0};
}
function castSlot(index){
  if(!match||match.ended||!match.player.alive)return;
  const ability=match.loadout.abilitySlots[index]?.id;
  if(!ability)return;
  match.dashDirection=directionalVector();
  const success=match.castAbility(match.player,ability,match.player.targetId);
  if(!success){const next=match.notices[0];if(next)flash(next.text);}
}
function flash(message){
  if(message===lastNotice)return;
  lastNotice=message;
  const node=$("combat-flash");node.textContent=message;node.style.opacity="1";
  clearTimeout(flash.timer);
  flash.timer=setTimeout(()=>node.style.opacity="0",1400);
}
function frame(actor){
  const button=element("button","unit-frame"+(match.player.targetId===actor.id?" targeted":"")+(actor.alive?"":" dead"));
  button.type="button";button.disabled=!actor.alive;
  const heading=element("div","unit-frame-header");
  heading.append(element("span","",actor.name),element("span","",actor.role.toUpperCase()));
  const hp=element("div","hp-track");
  const fill=element("div","hp-fill");fill.style.width=clamp(actor.healthPct*100,0,100)+"%";
  hp.append(fill);
  button.append(heading,element("div","unit-frame-sub",
    actor.cast?ABILITY_BY_ID[actor.cast.spellId]?.name+" · CASTING":actor.statuses.some(s=>s.kind==="incapacitate")?"CONTROLLED":actor.statuses.some(s=>s.kind==="root")?"ROOTED":"ENERGY ORB"),
    hp,element("div","hp-values",Math.ceil(actor.hp)+" / "+actor.maxHp+" HP"+(actor.shield>0?" · SHIELD "+Math.ceil(actor.shield):"")));
  button.addEventListener("click",()=>{target(actor.id);renderUI();});
  return button;
}
function renderFrames(){
  const friendly=$("friendly-frames"),enemy=$("enemy-frames");
  friendly.replaceChildren();enemy.replaceChildren();
  for(const actor of match.actors){
    (actor.team==="friendly"?friendly:enemy).append(frame(actor));
  }
}
function actionButton(slot,index){
  const ability=ABILITY_BY_ID[slot.id];
  const rule=ABILITY_RULES[slot.id];
  const player=match.player;
  const cd=player.cooldowns[slot.id]||0;
  const available=match.reason(player,slot.id,player.targetId);
  const node=element("button","spell-button"+(cd>0?" cooling":"")+(available?" disabled":""));
  node.type="button";
  node.style.setProperty("--tone",DISCIPLINES[ability.discipline].color);
  node.title=ability.name+" — "+ability.description+"\n"+(available||"READY")+(slot.evolutionId?"\nEvolution: "+slot.evolutionId:"");
  node.setAttribute("aria-label",hotkeys[index]+": "+ability.name+(available?" · "+available:""));
  const icon=element("span","spell-icon",glyph[ability.discipline]);
  node.append(element("span","key-label",hotkeys[index]),icon,element("span","spell-label",ability.name));
  if(cd>0)node.append(element("span","cd-value",Math.ceil(cd)+"s"));
  node.addEventListener("click",()=>castSlot(index));
  return node;
}
function renderActionBar(){
  const root=$("action-bar");root.replaceChildren();
  match.loadout.abilitySlots.forEach((s,i)=>root.append(actionButton(s,i)));
}
function renderUI(){
  if(!match)return;
  const p=match.player;
  $("match-clock").textContent=String(Math.floor(match.time/60)).padStart(2,"0")+":"+String(Math.floor(match.time%60)).padStart(2,"0");
  $("dampening-label").textContent="DAMPENING "+Math.round(match.dampening*100)+"%";
  $("flux-text").textContent=Math.floor(p.flux)+" / 100";
  $("flux-fill").style.width=clamp(p.flux,0,100)+"%";
  $("player-health").textContent="HP "+Math.ceil(p.hp)+" / "+p.maxHp;
  const victim=match.getActor(p.targetId);
  $("selected-target").textContent=victim?.name||"NONE";
  $("target-status").textContent=victim?.alive?(Math.round(victim.healthPct*100)+"% HP"):"";
  const cast=p.cast;
  $("cast-indicator").hidden=!cast;
  if(cast){
    $("cast-name").textContent=ABILITY_BY_ID[cast.spellId]?.name||"CAST";
    $("cast-progress-fill").style.width=clamp(100*(1-cast.remainingMs/cast.totalMs),0,100)+"%";
  }
  renderFrames();renderActionBar();
  const feed=$("combat-feed");feed.replaceChildren();
  for(const note of match.notices.slice(0,5))feed.append(element("p","",note.text));
  const banner=$("combat-banner");
  if(match.ended){banner.hidden=false;banner.textContent=match.winner==="friendly"?"VICTORY":"DEFEAT";}
}
function frameLoop(now){
  requestAnimationFrame(frameLoop);
  if(!match||!renderer)return;
  const dt=clamp((now-last)/1000,0,.06);last=now;
  if(!match.ended){
    const x=Number(keys.has("d"))-Number(keys.has("a"));
    const y=Number(keys.has("w"))-Number(keys.has("s"));
    match.move(match.player,x,y,dt);
    match.update(dt);
  }
  for(const event of match.consumeEvents())renderer.spawnEffect(event,match);
  try{renderer.render(match)}
  catch(error){
    setError("Rendering failed: "+(error?.message||String(error)));
    console.error("Energy Arena rendering failed",error);
    match=null;
    return;
  }
  if(now-lastUi>110){renderUI();lastUi=now;}
}
$("energy-canvas").addEventListener("click",event=>{
  if(!match||!renderer)return;
  const id=renderer.pickActor(event.clientX,event.clientY);
  if(id){target(id);renderUI();}
});
document.addEventListener("keydown",event=>{
  if(!match||event.altKey||event.ctrlKey||event.metaKey)return;
  if(["input","textarea","select"].includes(document.activeElement?.tagName?.toLowerCase()))return;
  const k=event.key.toLowerCase();
  if(["w","a","s","d"].includes(k)){keys.add(k);event.preventDefault();}
  else if(event.code==="Tab"||k==="tab"){event.preventDefault();cycleEnemies();}
  else if(["f1","f2","f3"].includes(k)){event.preventDefault();selectFriend(Number(k.slice(1))-1);}
  else if(hotkeys.includes(k)&&!event.repeat){event.preventDefault();castSlot(hotkeys.indexOf(k));}
});
document.addEventListener("keyup",event=>keys.delete(event.key.toLowerCase()));
window.addEventListener("blur",()=>keys.clear());
$("change-build").addEventListener("click",showGate);
$("restart-match").addEventListener("click",()=>{if(selectedBuild)start(selectedBuild);});
renderBuildChoices();
if (new URLSearchParams(window.location.search).get("load") === "draft" && isReady(store.draft)) {
  start(store.draft);
}
requestAnimationFrame(frameLoop);
