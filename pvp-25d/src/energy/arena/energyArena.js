// Energy Arena UI, scoped to the independent Energy Build / combat prototype.
import { readBuildStorage, writeBuildStorage, normalizeBuild } from "../buildState.js?v=20261011-identity13";
import { loadCharacter, saveCharacter } from "./EnergyCharacter.js?v=20261011-identity13";
import { readOriginRoster, persistOriginRoster, activeOrigin, snapshotActiveOrigin,
  appendOrigin, chooseOrigin } from "./EnergyOriginRoster.js?v=20261011-identity13";
import { ABILITY_BY_ID, DISCIPLINES, ROLES } from "../abilityCatalog.js?v=20261011-identity13";
import { EnergyMatch, ABILITY_RULES, hasLineOfSight } from "./EnergyMatch.js?v=20261011-orbfix16";
import { EnergyPlanetDefense, DEFENSE_WAVES } from "./EnergyPlanetDefense.js?v=20261011-orbfix16";
import { EnergyArenaRenderer } from "./EnergyArenaRenderer.js?v=20261011-arc17";
import { EnergyCombatFeedback } from "./EnergyCombatFeedback.js?v=20261010-balanced-ranks41";
import { EnergyOverheadHUD } from "./EnergyOverheadHUD.js?v=20261009-minimal-bars23";
import { EnergyCombatUX } from "./EnergyCombatUX.js?v=20261011-guided-defense8";
import { EnergyTrainingGuide } from "./EnergyTrainingGuide.js?v=20261009-learning-path25";
import { MODES, readProgression, saveProgression, ensureStarterMatter, awardMatch, progressDetails,
  completeArenaBuild, stagedLoadout } from "./EnergyProgression.js?v=20261011-identity13";
import { EnergyCharacterHub } from "./EnergyCharacterHub.js?v=20261011-identity13";
import { EnergyMainMenu } from "./EnergyMainMenu.js?v=20261011-guided-defense8";
import { VERDANT_CRUCIBLE } from "../../content/arenas/verdant-crucible/config.js?v=20261002-2250";
import { SHATTERED_EXPANSE } from "../../content/arenas/planet-defense/shattered-expanse/config.js?v=20261011-guided-defense8";

const $=id=>document.getElementById(id);
const hotkeys=["1","2","3","4","5","6","7","8","9","0"];
const glyph={void:"◈",solar:"✦",cryo:"❄",kinetic:"ϟ",vital:"✧"};
const store=readBuildStorage(window.localStorage);
let profile=readProgression(window.localStorage);
// Migrates any existing single-character save into a one-entry Origin list.
let roster=readOriginRoster(window.localStorage,loadCharacter(window.localStorage),store,profile);
const original=activeOrigin(roster);
if(original){
  const oldBuilds=original.builds;
  store.draft=normalizeBuild(oldBuilds.draft);
  store.saved=oldBuilds.saved.map(saved=>saved?normalizeBuild(saved):null);
  profile=original.progression;
  const initialized=ensureStarterMatter(profile);
  if(initialized!==profile)profile=initialized;
  saveCharacter(window.localStorage,original.character);
  writeBuildStorage(window.localStorage,store);
  saveProgression(window.localStorage,profile);
  // Persist the one-time level-10 starter grant to this Origin immediately.
  // Otherwise a refresh before the next match could grant it twice.
  roster=snapshotActiveOrigin(roster,original.character,store,profile);
}
persistOriginRoster(window.localStorage,roster);
let selectedMode=MODES[profile.lastMode]?profile.lastMode:"training";
let awardedMatch=null;
let match=null,renderer=null,feedback=null,overhead=null,combatUX=null,coach=null,hub=null,menu=null,last=0,lastUi=0,selectedBuild=null,lastNotice="",keys=new Set();
let pendingCast=null; // WoW-style short ability queue, resolved against current target.
const frameCache=new Map(),actionNodes=[];
function clearUiCaches(){
  frameCache.clear();actionNodes.length=0;
  $("friendly-frames").replaceChildren();
  $("enemy-frames").replaceChildren();
  $("action-bar").replaceChildren();
}
function saveActiveOrigin(){
  if(!roster.activeId||!hub?.character)return;
  roster=snapshotActiveOrigin(roster,hub.character,store,profile);
  persistOriginRoster(window.localStorage,roster);
}
function applyActiveOrigin(){
  const selected=activeOrigin(roster);
  if(!selected)return null;
  const target=selected.character;
  store.draft=normalizeBuild(selected.builds.draft);
  store.saved=selected.builds.saved.map(saved=>saved?normalizeBuild(saved):null);
  profile=ensureStarterMatter(selected.progression);
  selectedMode=MODES[profile.lastMode]?profile.lastMode:"training";
  saveCharacter(window.localStorage,target);
  writeBuildStorage(window.localStorage,store);
  saveProgression(window.localStorage,profile);
  hub?.activateCharacter(target);
  saveActiveOrigin();
  return target;
}
function createOriginCharacter(character){
  saveActiveOrigin();
  roster=appendOrigin(roster,character);
  persistOriginRoster(window.localStorage,roster);
  return applyActiveOrigin();
}
function activateOriginById(id){
  if(roster.activeId===id)return;
  saveActiveOrigin();
  roster=chooseOrigin(roster,id);
  persistOriginRoster(window.localStorage,roster);
  applyActiveOrigin();
}
const arenaForMode=mode=>mode==="defense"?SHATTERED_EXPANSE:VERDANT_CRUCIBLE;
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
function showGate(toMenu=false){
  match=null;
  $("combat-screen").hidden=true;$("build-gate").hidden=false;
  $("scene-error").hidden=true;
  feedback?.dispose();feedback=null;
  overhead?.dispose();overhead=null;
  combatUX?.dispose();combatUX=null;
  coach?.dispose();coach=null;
  if(renderer){renderer.dispose();renderer=null;}
  keys.clear();pendingCast=null;awardedMatch=null;
  if(toMenu)menu?.open();
  else hub?.open();
}
function start(build){
  try{
    completeArenaBuild(build); // An incomplete draft can start with a temporary starter kit.
    selectedBuild=build;
    const state=progressDetails(profile);
    const MatchType=selectedMode==="defense"?EnergyPlanetDefense:EnergyMatch;
    const arena=arenaForMode(selectedMode);
    match=new MatchType(build,arena,{modeId:selectedMode,level:state.level,singularity:profile.singularity});
    awardedMatch=null;
    hub?.hide();$("main-menu").hidden=true;$("combat-screen").hidden=false;
    $("active-build").textContent=(hub?.character?.name||build.name).toUpperCase()+" · "+ROLES[build.role].name.toUpperCase();
    $("match-mode").textContent=match.mode.size+" · "+match.mode.label.toUpperCase()+
      (match.encounter?" · "+match.encounter.stage:"");
    $("match-map-name").textContent=arena.name.toUpperCase();
    $("energy-canvas").setAttribute("aria-label",arena.name+" combat arena");
    $("match-level").textContent="LEVEL "+state.level+" · "+state.slots+"/10 ABILITIES";
    $("match-learning-tip").textContent="LEARNING FOCUS · "+state.lesson;
    $("role-passive").textContent=ROLES[build.role].name.toUpperCase()+" · +8 FLUX/s";
    $("combat-banner").hidden=true;$("scene-error").hidden=true;
    $("defense-resonance-overlay").hidden=true;
    $("defense-resonance-options").dataset.wave="";
    $("defense-resonance-options").dataset.choices="";
    $("match-result-details").textContent="";
    feedback?.dispose();feedback=null;
    overhead?.dispose();overhead=null;
    combatUX?.dispose();combatUX=null;
    coach?.dispose();coach=null;
    if(renderer)renderer.dispose();
    renderer=new EnergyArenaRenderer($("energy-canvas"),arena);
    feedback=new EnergyCombatFeedback($("scene-stage"),renderer);
    overhead=new EnergyOverheadHUD($("scene-stage"),renderer,ABILITY_BY_ID,DISCIPLINES);
    combatUX=new EnergyCombatUX($("scene-stage"),ABILITY_RULES,ABILITY_BY_ID,DISCIPLINES,hasLineOfSight);
    coach=new EnergyTrainingGuide($("scene-stage"));
    coach.start(match);
    last=performance.now();lastUi=0;lastNotice="";keys.clear();pendingCast=null;
    clearUiCaches();
    renderUI();
    match.log(match.mode.size+" "+match.mode.label+" ready. "+state.slots+" abilities unlocked.");
  }catch(error){
    console.error("Energy Arena start failed",error);
    $("combat-screen").hidden=true;
    hub?.open();hub?.setMessage(error?.message||"Unable to start arena");
  }
}

function target(id){
  if(!match||match.ended)return;
  const actor=match.getActor(id);
  if(actor?.alive){match.player.targetId=id;coach?.onTarget(actor);}
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
  if(!match||match.ended||match.waveState==="intermission"||!match.player.alive)return;
  combatUX?.pulse(actionNodes[index],"input-pressed");
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
    combatUX?.pulse(actionNodes[index],"cast-failed");
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
  if(!pendingCast||!match||!match.player.alive||match.ended||match.waveState==="intermission")return;
  const p=match.player,request=pendingCast;
  const reason=match.reason(p,request.ability,request.targetId);
  if(reason==="CASTING"||reason==="GLOBAL COOLDOWN")return;
  pendingCast=null;
  if(reason){combatUX?.pulseSpell(actionNodes,request.ability,"cast-failed",performance.now());flash(ABILITY_BY_ID[request.ability].name+" · "+reason);return;}
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
  const name=element("span","",actor.name),role=element("span","",(ROLES[actor.role]?.name||actor.role).toUpperCase());
  heading.append(name,role);
  const sub=element("div","unit-frame-sub");
  const hp=element("div","hp-track"),fill=element("div","hp-fill");hp.append(fill);
  const value=element("div","hp-values");
  button.append(heading,sub,hp,value);
  if(actor.boss)button.classList.add("boss");
  button.addEventListener("click",()=>{target(actor.id);renderUI();});
  frameCache.set(actor.id,{button,sub,fill,value});
  return button;
}
function renderFrames(){
  // Old wave enemies remain in run reports, but must not fill the right HUD.
  if(match.modeId==="defense"){
    for(const [id,view] of frameCache){
      if(id.startsWith("wave-")&&!match.getActor(id)?.alive){
        view.button.remove();frameCache.delete(id);
      }
    }
  }
  for(const actor of match.actors){
    if(match.modeId==="defense"&&actor.team==="enemy"&&!actor.alive)continue;
    let view=frameCache.get(actor.id);
    if(!view){
      const button=createFrame(actor);
      (actor.team==="friendly"?$("friendly-frames"):$("enemy-frames")).append(button);
      view=frameCache.get(actor.id);
    }
    const {button,sub,fill,value}=view;
    button.classList.toggle("boss",Boolean(actor.boss));
    button.classList.toggle("targeted",match.player.targetId===actor.id);
    button.classList.toggle("dead",!actor.alive);
    button.disabled=!actor.alive;
    const casting=actor.cast;
    sub.textContent=casting?((ABILITY_BY_ID[casting.spellId]?.name||"ENERGY")+" · "+Math.max(0,casting.remainingMs/1000).toFixed(1)+"s")
      :actor.statuses.some(s=>s.kind==="incapacitate")?"CONTROLLED"
      :actor.statuses.some(s=>s.kind==="root")?"ROOTED":
        actor.boss?"FINAL WAVE · RIFT BOSS":"ENERGY ORB";
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
  combatUX?.updateActionBar(match,actionNodes,pendingCast,performance.now());
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
function renderResonances(){
  const overlay=$("defense-resonance-overlay");
  if(!match||match.modeId!=="defense"||match.waveState!=="intermission"){
    overlay.hidden=true;return;
  }
  overlay.hidden=false;
  const host=$("defense-resonance-options");
  const screenWave=match.waveIntermission;
  if(host.dataset.wave===String(screenWave)&&host.dataset.choices===String(match.resonancesChosen))return;
  host.dataset.wave=String(screenWave);
  host.dataset.choices=String(match.resonancesChosen);
  const lesson=match.trialLesson();
  const choices=match.resonanceChoices();
  $("defense-resonance-title").textContent=lesson.title;
  $("defense-resonance-subtitle").textContent="WAVE "+screenWave+
    " CLEARED · "+lesson.intro;
  $("defense-trial-lesson").textContent=lesson.why+
    " · All trials reset when Planet Defense ends.";
  host.replaceChildren();
  const confirm=$("defense-trial-confirm");
  confirm.disabled=!choices.length;
  if(!choices.length){
    $("defense-trial-how").textContent="All available trials are mastered.";
    $("defense-trial-unlock").textContent="Return to Character HUB to develop your permanent build.";
    return;
  }
  let selected=choices[0];
  const buttons=[];
  const display=()=>{
    for(const [index,button] of buttons.entries()){
      const active=choices[index].id===selected.id;
      button.classList.toggle("selected",active);
      button.setAttribute("aria-pressed",String(active));
    }
    $("defense-trial-how").textContent=selected.how;
    $("defense-trial-unlock-heading").textContent=selected.kind==="enchantment"
      ?"PVE-ONLY · NO PERMANENT UNLOCK":"HOW TO UNLOCK IT PERMANENTLY";
    $("defense-trial-unlock").textContent=selected.unlock;
    confirm.textContent="TRY "+selected.name+" IN WAVE "+(screenWave+1)+" →";
  };
  for(const choice of choices){
    const button=element("button","defense-resonance-option");button.type="button";
    const tone=DISCIPLINES[ABILITY_BY_ID[choice.spellId]?.discipline]?.color||"#8bd6dc";
    button.style.setProperty("--resonance-tone",tone);
    const tag=element("span","resonance-tier",choice.label);
    const title=element("strong","",choice.name);
    const spell=element("span","resonance-spell",
      choice.pair||ABILITY_BY_ID[choice.spellId]?.name||choice.spellId);
    const info=element("span","resonance-description",choice.description);
    const action=element("span","resonance-pick","VIEW EXPLANATION →");
    button.append(tag,title,spell,info,action);
    button.addEventListener("click",()=>{selected=choice;display();});
    host.append(button);buttons.push(button);
  }
  // Confirmation is deliberate: especially at level 1 the player should
  // understand what a Rank/Evolution means BEFORE the next wave begins.
  const accept=choice=>{
    if(!match||match.waveState!=="intermission"||!match.chooseResonance(choice.id))return;
    pendingCast=null;keys.clear();
    host.dataset.wave="";
    overlay.hidden=true;
    flash(choice.label+" · "+choice.name);
    renderUI();
  };
  confirm.onclick=()=>{
    const evolutions=selected.kind==="mastery"&&selected.rank===3
      ?(ABILITY_BY_ID[selected.spellId]?.evolutions||[]):[];
    if(evolutions.length){
      // A Rank-3 pick is NOT auto-confirmed. Let the player choose which
      // REAL Evolution this trial applies before starting the next wave.
      const base=selected;
      const nextWave=screenWave+1;
      $("defense-resonance-title").textContent="CHOOSE YOUR EVOLUTION";
      $("defense-resonance-subtitle").textContent=
        ABILITY_BY_ID[base.spellId].name+" reached Rank 3 for this run. Choose how it evolves.";
      host.replaceChildren();
      const back=element("button","defense-resonance-option","← BACK TO SPELL TRIALS");
      back.type="button";
      back.addEventListener("click",()=>{host.dataset.wave="";renderResonances();});
      host.append(back);
      const evoButtons=[];
      const choose=evo=>{
        selected={...base,kind:"mastery-evolution",evolutionId:evo.id,
          id:"mastery-evolution:"+base.spellId+":"+evo.id,
          name:evo.name.toUpperCase(),label:"RANK 3 + EVOLUTION TRIAL",
          description:evo.description,
          how:"Use "+ABILITY_BY_ID[base.spellId].name+" with "+evo.name+
            " in Wave "+nextWave+".",
          unlock:"Reach Rank 3 permanently in Character HUB to choose this Evolution."};
        for(const [i,button] of evoButtons.entries()){
          button.classList.toggle("selected",evolutions[i].id===evo.id);
          button.setAttribute("aria-pressed",String(evolutions[i].id===evo.id));
        }
        $("defense-trial-how").textContent=selected.how;
        $("defense-trial-unlock-heading").textContent="HOW TO UNLOCK IT PERMANENTLY";
        $("defense-trial-unlock").textContent=selected.unlock;
        confirm.textContent="TRY "+evo.name.toUpperCase()+" IN WAVE "+nextWave+" →";
        confirm.onclick=()=>accept(selected);
      };
      for(const evo of evolutions){
        const button=element("button","defense-resonance-option");
        button.type="button";
        button.style.setProperty("--resonance-tone",
          DISCIPLINES[ABILITY_BY_ID[base.spellId]?.discipline]?.color||"#8bd6dc");
        button.append(element("span","resonance-tier","EVOLUTION · RANK 3"),
          element("strong","",evo.name.toUpperCase()),
          element("span","resonance-description",evo.description),
          element("span","resonance-pick","CHOOSE EVOLUTION →"));
        button.addEventListener("click",()=>choose(evo));
        host.append(button);evoButtons.push(button);
      }
      choose(evolutions[0]);
      return;
    }
    accept(selected);
  };
  display();
}
function renderUI(){
  if(!match)return;
  const p=match.player;
  $("match-clock").textContent=String(Math.floor(match.time/60)).padStart(2,"0")+":"+String(Math.floor(match.time%60)).padStart(2,"0");
  $("dampening-label").textContent=match.modeId==="defense"
    ?"WAVE "+match.wave+" / "+DEFENSE_WAVES+
      " · "+(match.waveState==="intermission"?"SPELL DISCOVERY":match.waveDefeated+"/"+match.totalWaveEnemies+" DEFEATED")
    :"DAMPENING "+Math.round(match.dampening*100)+"%";
  if(match.modeId==="defense"){
    const tips=[
      "Try your normal spells first. Your first guided Spell Mastery trial unlocks AFTER Wave 1.",
      "New enemies approach. Try your enhanced Origin spell and focus dangerous targets.",
      "Disrupt enemy casters and protect your two AI companions.",
      "Coordinate interrupts, damage and healing as the wave grows.",
      "FINAL STAND · Read the boss warning circles, reposition and interrupt channels when possible."
    ];
    const latest=match.trialHistory?.at(-1);
    const corruptionHint=match.encounter?.corruption&&match.wave>=3?
      " · RIFT CORRUPTION: CLEANSE FLUX CAN DISPEL":"";
    const stageHint=match.encounter?.stage?
      " · "+match.encounter.stage+" · "+match.currentWave?.focus:"";
    const encounterHint=match.wave===DEFENSE_WAVES?
      " · "+match.encounter.boss.name+" · DODGE THE TELEGRAPHS":
      match.encounter?.casterChannels&&match.wave>=2?
      " · RIFT CHANNELERS: MOVE OUT OR INTERRUPT":"";
    $("match-learning-tip").textContent=(match.waveState==="intermission"?
      "WAVE "+match.wave+" CLEARED · LEARN ABOUT YOUR NEXT TRIAL":
      latest&&match.wave>1?"FIELD GUIDE · "+latest.how:
      "PLANET DEFENSE · "+tips[Math.max(0,match.wave-1)])+
      (match.waveState==="active"?stageHint+encounterHint+corruptionHint:"");
  }
  $("flux-text").textContent=Math.floor(p.flux)+" / 100";
  $("flux-fill").style.width=clamp(p.flux,0,100)+"%";
  $("player-health").textContent="HP "+Math.ceil(p.hp)+" / "+p.maxHp;
  const victim=match.getActor(p.targetId);
  $("selected-target").textContent=victim?.name||"NONE";
  $("target-status").textContent=victim?.alive?(Math.round(victim.healthPct*100)+"% HP"):"";
  updateCastHUD();
  renderFrames();renderActionBar();
  renderResonances();
  const feed=$("combat-feed");feed.replaceChildren();
  for(const note of match.notices.slice(0,5))feed.append(element("p","",note.text));
  const banner=$("combat-banner");
  if(match.ended){
    banner.hidden=false;
    $("match-result-title").textContent=match.winner==="friendly"?"VICTORY":"DEFEAT";
  }
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
      if(match.waveState!=="intermission")match.move(match.player,x,y,step);
      if(x||y)coach?.onMove();
      match.update(step);
      if(match.waveState!=="intermission")updateCastQueue();
      remaining-=step;
    }
  }
  if(match.ended&&!awardedMatch){
    const previous=profile;
    const enemyKills=match.modeId==="defense"?match.totalKills:
      match.actors.filter(a=>a.team==="enemy"&&!a.alive).length;
    awardedMatch=awardMatch(profile,match.modeId,match.winner==="friendly",enemyKills);
    profile=awardedMatch.next;
    saveProgression(window.localStorage,profile);
    saveActiveOrigin();
    const {earned,after,levelUp,before,fragments,matter}=awardedMatch;
    const beforeIds=new Set(stagedLoadout(selectedBuild,before.level).abilitySlots.map(s=>s.id));
    const unlocked=stagedLoadout(selectedBuild,after.level).abilitySlots
      .filter(s=>!beforeIds.has(s.id)).map(s=>ABILITY_BY_ID[s.id]?.name||s.id);
    $("match-result-details").textContent=
      (match.modeId==="defense"?"WAVE "+match.wave+" / "+DEFENSE_WAVES+" · ":"")+
      "+"+earned+" XP · LEVEL "+after.level
      +(levelUp?" · LEVEL UP!":"")
      +(unlocked.length?" · NEW: "+unlocked.join(", "):"")
      +" · +"+fragments+" ENERGY FRAGMENTS"
      +(matter?" · +"+matter+" BLACK HOLE MATTER":"")
      +(levelUp&&after.level>=10&&before.level<10?" · SINGULARITY FORGE UNLOCKED!":"")
      +(match.modeId==="defense"&&match.trialHistory?.length
        ?" · TRIED: "+match.trialHistory.map(t=>t.name).join(", "):"")
      +" · Return to HUB to upgrade your planet";
    $("match-level").textContent="LEVEL "+after.level+" · "+after.slots+"/10 ABILITIES";
  }
  updateCastHUD(); // Cast bar updates every animation frame, not only HUD ticks.
  for(const event of match.consumeEvents()){
    renderer.spawnEffect(event,match);
    feedback?.onEvent(event,match);
    combatUX?.onEvent(event,actionNodes,now);
    coach?.onEvent(event);
    if(event.type==="wave-start"&&match.modeId==="defense"){
      flash("WAVE "+event.wave+" · "+event.waveName+
        (event.encounterStage?" · "+event.encounterStage:""));
    }else if(event.type==="wave-clear"&&match.modeId==="defense"){
      flash("WAVE "+event.wave+" CLEARED!");
    }else if(event.type==="boss-phase"&&match.modeId==="defense"){
      flash("BOSS PHASE · "+event.phase+
        (event.reinforcements?" · REINFORCEMENTS!":""));
    }else if(event.type==="encounter-resolve"&&event.avoided&&
      match.modeId==="defense"){
      if(event.actorId==="player")flash("ATTACK EVADED");
    }
    if(event.type==="synergy"&&event.actorId==="player"){
      flash("SINGULARITY · "+event.reaction.toUpperCase()+"!");
    }
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
  overhead?.update(match,now);
  feedback?.update(match,now);
  combatUX?.updateActionBar(match,actionNodes,pendingCast,now);
  combatUX?.updateCC(match);
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
// Both reports are available during play, after a death and at match end.
// Preserve the separate AI behaviour snapshot for movement/targeting bugs.
async function copyReport(report,label){
  try{
    if(!navigator.clipboard?.writeText)throw new Error("Clipboard unsupported");
    await navigator.clipboard.writeText(report);
    flash(label+" COPIED — paste into our chat");
  }catch{
    window.prompt("Copy this "+label.toLowerCase()+" and paste into our chat:",report);
  }
}
$("copy-run-report").addEventListener("click",()=>{
  if(match)copyReport(match.runReport(),"RUN REPORT");
});
$("copy-ai-report").addEventListener("click",()=>{
  if(match)copyReport(match.aiReport(),"AI REPORT");
});
const changeMode=id=>{
  if(!MODES[id])return;
  selectedMode=id;
  profile={...profile,lastMode:id};
  saveProgression(window.localStorage,profile);
  saveActiveOrigin();
};
hub=new EnergyCharacterHub({
  storage:window.localStorage,buildStore:store,
  getProgression:()=>profile,
  changeProgression:next=>{profile=next;saveProgression(window.localStorage,profile);saveActiveOrigin();},
  createOrigin:createOriginCharacter,
  onCharacterSaved:saveActiveOrigin,
  onBuildSaved:saveActiveOrigin,
  openMainMenu:()=>menu.open(),
  openPlayMenu:()=>menu.openPlay(),
});
menu=new EnergyMainMenu({
  openHub:()=>hub.open(),
  startMatch:()=>start(store.draft),
  changeMode,
  getCharacter:()=>hub.character,
  createOrigin:()=>hub.openCreation(),
  getOrigins:()=>({activeId:roster.activeId,
    characters:roster.characters.map(entry=>({
      ...entry,character:{...entry.character,
        origin:ROLES[entry.character.role].name,color:ROLES[entry.character.role].color}
    }))}),
  selectOrigin:activateOriginById,
  getOriginLevel:entry=>progressDetails(entry.progression).level,
  hideHub:()=>hub.hide(),
  onMenuFromCombat:()=>{
    if(match&&!match.ended&&!window.confirm("Leave the current match and return to the main menu?"))return;
    showGate(true);
  },
});
$("change-build").textContent="RETURN TO HUB";
$("change-build").addEventListener("click",()=>showGate(false));
$("restart-match").addEventListener("click",()=>{if(selectedBuild)start(selectedBuild);});
// A direct link back from old Build Lab still opens the HUB. All normal visits
// start at the new main menu rather than opening a 3D WebGL scene behind it.
if(new URLSearchParams(window.location.search).get("load")==="draft")hub.open();
else menu.open();
requestAnimationFrame(frameLoop);
