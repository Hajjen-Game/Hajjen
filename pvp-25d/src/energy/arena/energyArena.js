// Energy Arena UI, scoped to the independent Energy Build / combat prototype.
import { readBuildStorage, isReady, allEquippedIds, buildCombatLoadout } from "../buildState.js";
import { ABILITY_BY_ID, DISCIPLINES, ROLES } from "../abilityCatalog.js";
import { EnergyMatch, ABILITY_RULES } from "./EnergyMatch.js?v=20261008-combat-feedback4";
import { EnergyArenaRenderer } from "./EnergyArenaRenderer.js?v=20261008-combat-feedback2";
import { EnergyCombatFeedback } from "./EnergyCombatFeedback.js?v=20261008-feedback4";
import { VERDANT_CRUCIBLE } from "../../content/arenas/verdant-crucible/config.js?v=20261002-2250";

const $=id=>document.getElementById(id);
const hotkeys=["1","2","3","4","5","6","7","8","9","0"];
const glyph={void:"◈",solar:"✦",cryo:"❄",kinetic:"ϟ",vital:"✧"};
const store=readBuildStorage(window.localStorage);
let match=null,renderer=null,feedback=null,last=0,lastUi=0,selectedBuild=null,lastNotice="",keys=new Set();
let pendingCast=null; // WoW-style short ability queue, resolved against current target.
const frameCache=new Map(),actionNodes=[];
function clearUiCaches(){
  frameCache.clear();actionNodes.length=0;
  $("friendly-frames").replaceChildren();
  $("enemy-frames").replaceChildren();
  $("action-bar").replaceChildren();
}
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
  feedback?.dispose();feedback=null;
  if(renderer){renderer.dispose();renderer=null;}
  keys.clear();pendingCast=null;
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
    feedback?.dispose();feedback=null;
    if(renderer)renderer.dispose();
    renderer=new EnergyArenaRenderer($("energy-canvas"),arena);
    feedback=new EnergyCombatFeedback($("scene-stage"),renderer);
    last=performance.now();lastUi=0;lastNotice="";keys.clear();pendingCast=null;
    clearUiCaches();
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
  const p=match.player;
  const reason=match.reason(p,ability,p.targetId);
  const waiting=reason==="CASTING"||reason==="GLOBAL COOLDOWN";
  const queueTime=Math.max(p.gcd||0,(p.cast?.remainingMs||0)/1000);
  if(waiting&&queueTime<=0.45){
    pendingCast={index,ability,targetId:p.targetId};
    flash(ABILITY_BY_ID[ability].name+" · QUEUED");
    return;
  }
  if(reason){
    pendingCast=null;
    flash(ABILITY_BY_ID[ability].name+" · "+reason+(waiting?" "+queueTime.toFixed(1)+"s":""));
    return;
  }
  pendingCast=null;
  const success=match.castAbility(p,ability,p.targetId);
  if(success){
    flash(ABILITY_BY_ID[ability].name+(ABILITY_RULES[ability]?.cast?" · CASTING":" · ACTIVATED"));
    renderUI();
  } else flash(ABILITY_BY_ID[ability].name+" · COULD NOT CAST");
}
function updateCastQueue(){
  if(!pendingCast||!match||!match.player.alive||match.ended)return;
  const p=match.player,request=pendingCast;
  const reason=match.reason(p,request.ability,request.targetId);
  if(reason==="CASTING"||reason==="GLOBAL COOLDOWN")return;
  pendingCast=null;
  if(reason){flash(ABILITY_BY_ID[request.ability].name+" · "+reason);return;}
  match.dashDirection=directionalVector();
  if(match.castAbility(p,request.ability,request.targetId)){
    flash(ABILITY_BY_ID[request.ability].name+" · CASTING");
  }
}
function flash(message){
  if(message===lastNotice)return;
  lastNotice=message;
  if(flash.resetNotice)clearTimeout(flash.resetNotice);
  flash.resetNotice=setTimeout(()=>{lastNotice="";},500);
  const node=$("combat-flash");node.textContent=message;node.style.opacity="1";
  clearTimeout(flash.timer);
  flash.timer=setTimeout(()=>node.style.opacity="0",1400);
}
function createFrame(actor){
  const button=element("button","unit-frame");button.type="button";
  button.dataset.actorId=actor.id;
  const heading=element("div","unit-frame-header");
  const name=element("span","",actor.name),role=element("span","",actor.role.toUpperCase());
  heading.append(name,role);
  const sub=element("div","unit-frame-sub");
  const hp=element("div","hp-track"),fill=element("div","hp-fill");hp.append(fill);
  const value=element("div","hp-values");
  button.append(heading,sub,hp,value);
  button.addEventListener("click",()=>{target(actor.id);renderUI();});
  frameCache.set(actor.id,{button,sub,fill,value});
  return button;
}
function renderFrames(){
  for(const actor of match.actors){
    let view=frameCache.get(actor.id);
    if(!view){
      const button=createFrame(actor);
      (actor.team==="friendly"?$("friendly-frames"):$("enemy-frames")).append(button);
      view=frameCache.get(actor.id);
    }
    const {button,sub,fill,value}=view;
    button.classList.toggle("targeted",match.player.targetId===actor.id);
    button.classList.toggle("dead",!actor.alive);
    button.disabled=!actor.alive;
    const casting=actor.cast;
    sub.textContent=casting?((ABILITY_BY_ID[casting.spellId]?.name||"ENERGY")+" · "+Math.max(0,casting.remainingMs/1000).toFixed(1)+"s")
      :actor.statuses.some(s=>s.kind==="incapacitate")?"CONTROLLED"
      :actor.statuses.some(s=>s.kind==="root")?"ROOTED":"ENERGY ORB";
    fill.style.width=clamp(actor.healthPct*100,0,100)+"%";
    value.textContent=Math.ceil(actor.hp)+" / "+actor.maxHp+" HP"+(actor.shield>0?" · SHIELD "+Math.ceil(actor.shield):"");
  }
}
function createActionButton(slot,index){
  const ability=ABILITY_BY_ID[slot.id];
  const node=element("button","spell-button");node.type="button";
  node.style.setProperty("--tone",DISCIPLINES[ability.discipline].color);
  const icon=element("span","spell-icon",glyph[ability.discipline]);
  const cd=element("span","cd-value");
  node.append(element("span","key-label",hotkeys[index]),icon,
    element("span","spell-label",ability.name),cd);
  node.addEventListener("click",()=>castSlot(index));
  actionNodes[index]={node,cd,ability,slot};
  return node;
}
function renderActionBar(){
  const root=$("action-bar");
  if(actionNodes.length!==match.loadout.abilitySlots.length){
    root.replaceChildren();actionNodes.length=0;
    match.loadout.abilitySlots.forEach((slot,index)=>root.append(createActionButton(slot,index)));
  }
  const player=match.player;
  for(const entry of actionNodes){
    const {node,cd,ability,slot}=entry;
    const remaining=player.cooldowns[slot.id]||0;
    const reason=match.reason(player,slot.id,player.targetId);
    node.classList.toggle("cooling",remaining>0);
    const hardStop=reason&&!["CASTING","GLOBAL COOLDOWN"].includes(reason);
    node.classList.toggle("disabled",!!hardStop);
    node.classList.toggle("gcd",reason==="CASTING"||reason==="GLOBAL COOLDOWN");
    node.style.setProperty("--gcd-progress",Math.round(clamp((player.gcd||0)/1.3,0,1)*100)+"%");
    node.classList.toggle("queued",pendingCast?.ability===slot.id);
    const newTitle=ability.name+" — "+ability.description+"\n"+(reason||"READY")
      +(slot.evolutionId?"\nEvolution: "+slot.evolutionId:"");
    if(node.title!==newTitle)node.title=newTitle;
    const newLabel=ability.name+(reason?" · "+reason:"");
    if(node.getAttribute("aria-label")!==newLabel)node.setAttribute("aria-label",newLabel);
    cd.textContent=remaining>.02?Math.ceil(remaining)+"s":"";
  }
}
function updateCastHUD(){
  if(!match)return;
  const cast=match.player.cast,bar=$("cast-indicator");
  bar.hidden=!cast;
  if(!cast)return;
  const ability=ABILITY_BY_ID[cast.spellId];
  $("cast-name").textContent=ability?.name||"ENERGY CAST";
  const progress=clamp(100*(1-cast.remainingMs/cast.totalMs),0,100);
  $("cast-progress-fill").style.width=progress.toFixed(2)+"%";
  $("cast-indicator").style.setProperty("--school",DISCIPLINES[ability?.discipline]?.color||"#8bdfff");
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
  updateCastHUD();
  renderFrames();renderActionBar();
  const feed=$("combat-feed");feed.replaceChildren();
  for(const note of match.notices.slice(0,5))feed.append(element("p","",note.text));
  const banner=$("combat-banner");
  if(match.ended){banner.hidden=false;banner.textContent=match.winner==="friendly"?"VICTORY":"DEFEAT";}
}
function frameLoop(now){
  requestAnimationFrame(frameLoop);
  if(!match||!renderer)return;
  const elapsed=clamp((now-last)/1000,0,.25);last=now;
  if(!match.ended){
    const x=Number(keys.has("d"))-Number(keys.has("a"));
    const y=Number(keys.has("w"))-Number(keys.has("s"));
    // The legacy alpha dropped time above 60ms/frame. This made casts and GCD
    // look frozen on a slow GPU. Advance the simulation in small safe steps.
    let remaining=elapsed;
    while(remaining>.00001&&!match.ended){
      const step=Math.min(.05,remaining);
      match.move(match.player,x,y,step);
      match.update(step);
      updateCastQueue();
      remaining-=step;
    }
  }
  updateCastHUD(); // Cast bar updates every animation frame, not only HUD ticks.
  for(const event of match.consumeEvents()){
    renderer.spawnEffect(event,match);
    feedback?.onEvent(event,match);
    if(event.type==="hit"&&event.amount>0){
      const attacker=match.getActor(event.actorId),victim=match.getActor(event.targetId);
      if(attacker?.id==="player")match.log((ABILITY_BY_ID[event.spellId]?.name||"Attack")+" → "+(victim?.name||"target")+" −"+event.amount);
      else if(victim?.id==="player")match.log((attacker?.name||"Enemy")+" hits YOU −"+event.amount);
    }else if(event.type==="heal"&&event.amount>0){
      const healed=match.getActor(event.targetId);
      if(event.actorId==="player")match.log((ABILITY_BY_ID[event.spellId]?.name||"Heal")+" → "+(healed?.name||"ally")+" +"+event.amount);
      else if(healed?.id==="player")match.log("YOU healed +"+event.amount+" HP");
    }else if(event.type==="control"&&event.actorId==="player"){
      match.log((ABILITY_BY_ID[event.spellId]?.name||"CC")+" landed.");
    }else if(event.type==="interrupt"&&event.actorId==="player"){
      match.log("INTERRUPT landed!");
    }
  }
  try{renderer.render(match)}
  catch(error){
    setError("Rendering failed: "+(error?.message||String(error)));
    console.error("Energy Arena rendering failed",error);
    match=null;
    return;
  }
  feedback?.update(match,now);
  if(now-lastUi>85){renderUI();lastUi=now;}
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
