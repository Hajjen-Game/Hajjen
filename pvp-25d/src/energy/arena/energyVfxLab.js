// A controlled visual audition, not a match simulation.
// Reuses the real Energy Arena renderer, glass orbs, selected-target rings
// and authored EnergyHeroVFX. No AI, cooldown, HP or progression rules.
import { EnergyArenaRenderer } from "./EnergyArenaRenderer.js?v=20261015-voidlab1";
import { ABILITIES,ABILITY_BY_ID,ROLES,GENESIS_CLASS_SPELL_IDS,IMPACT_CLASS_SPELL_IDS,
  ECLIPSE_CLASS_SPELL_IDS,SOLAR_CLASS_SPELL_IDS,VOID_CLASS_SPELL_IDS }
  from "../abilityCatalog.js?v=20261015-voidlab1";
import { EnergyMatch, actorFor, ABILITY_RULES } from "./EnergyMatch.js?v=20261015-voidlab1";
import { EnergyCombatFeedback } from "./EnergyCombatFeedback.js?v=20261008-impact-refine3";
import { VERDANT_CRUCIBLE } from "../../content/arenas/verdant-crucible/config.js?v=20261002-2250";

const $=id=>document.getElementById(id);
const palette={
  void:"#b78bef",solar:"#f9b869",cryo:"#75d1fa",
  kinetic:"#ed838f",vital:"#6fdcb2",
};
const signature=[
  {id:"crystal-bolt",name:"Crystal Bolt",discipline:"cryo",icon:"❄",
    caption:"Five condensed ice facets → crystalline projectile → splintered contact",
    phase:"CRYSTAL CONDENSATION",duration:1300,type:"hit",target:"enemy"},
  {id:"sun-lance",name:"Sun Lance",discipline:"solar",icon:"✦",
    caption:"Solar corona inside glass → focused golden lance → bright starburst",
    phase:"SOLAR COMPRESSION",duration:1800,type:"hit",target:"enemy"},
  {id:"null-prison",name:"Null Prison",discipline:"void",icon:"◈",
    caption:"Fractured orbit → six-sided rising energy prison → locked target",
    phase:"VOID GEOMETRY",duration:1400,type:"control",target:"enemy"},
  {id:"rift-slash",name:"Rift Slash",discipline:"void",icon:"╱",
    caption:"The core fractures → three crossing weaponless energy arcs",
    phase:"SPATIAL FRACTURE",duration:560,type:"hit",target:"enemy"},
  {id:"gravity-hammer",name:"Gravity Hammer",discipline:"kinetic",icon:"ϟ",
    caption:"Gravitational compression → faceted impact from above → ground shock",
    phase:"GRAVITY LOCK",duration:700,type:"hit",target:"enemy"},
  {id:"pulse-mend",name:"Pulse Mend",discipline:"vital",icon:"✧",
    caption:"Living heal strands → spiralling energy transfer → restorative landing",
    phase:"VITAL RESONANCE",duration:1500,type:"heal",target:"ally"},
  {id:"photon-barrier",name:"Photon Barrier",discipline:"solar",icon:"◇",
    caption:"Layered light core → transparent shield shell → orbiting prism bands",
    phase:"PHOTON ARRAY",duration:520,type:"shield",target:"ally"},
  {id:"reactive-thread",name:"Reactive Thread",discipline:"vital",icon:"∞",
    caption:"Four animated healing threads encircle glass → reactive light pulses",
    phase:"REACTIVE WEAVE",duration:540,type:"ability",target:"ally"},
];
// Maintain original signatures and Pixi VFX; live mode also plays the
// real EnergyMatch mechanics rather than inventing signature-only events.
const polishedIds=new Set(signature.map(spell=>spell.id));
const spellType=mode=>({
  damage:"hit",heal:"heal",shield:"shield",guard:"guard",
  cc:"control",dot:"ability",hot:"ability",rush:"charge",dash:"dash",
  interrupt:"interrupt",link:"link",cleanse:"cleanse"
})[mode]||"ability";
const catalogue=[...signature,...ABILITIES.filter(spell=>!polishedIds.has(spell.id))
  .map(spell=>{
    const rule=ABILITY_RULES[spell.id]||{};
    const type=spellType(rule.mode);
    return {id:spell.id,name:spell.name,discipline:spell.discipline,
      icon:{kinetic:"ϟ",void:"◈",cryo:"❄",solar:"✦",vital:"✧"}[spell.discipline],
      caption:spell.description,phase:spell.discipline.toUpperCase()+" ENERGY",
      duration:Math.max(420,(rule.cast||0)*1000),type,
      target:["heal","guard","shield","hot","link","cleanse"].includes(rule.mode)
        ?"ally":"enemy"};
  })];
const CLASS_SPELLS={
  healer:GENESIS_CLASS_SPELL_IDS,melee:IMPACT_CLASS_SPELL_IDS,
  caster:ECLIPSE_CLASS_SPELL_IDS,solar:SOLAR_CLASS_SPELL_IDS,
  void:VOID_CLASS_SPELL_IDS
};
let selectedRole="healer",selectedEvolution="",labUseCombat=true;
let visibleSpells=[],sequenceList=[],liveElapsed=0,liveActions=[];
const classCatalogue=role=>(CLASS_SPELLS[role]||[]).map(id=>
  catalogue.find(s=>s.id===id)).filter(Boolean);
const labels={
  charging:"CHARGING",release:"RELEASING",contact:"CONTACT",ready:"READY",
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function el(tag,cls,text){
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text)e.textContent=text;
  return e;
}
function actor(id,name,team,role,x,y,core,energy){
  return {
    id,name,team,role,classId:"visual-"+id,control:id==="vfx-source"?"player":"ai",
    x,y,hp:100,maxHp:100,alive:true,healthPct:1,flux:100,shield:0,
    statuses:[],cast:null,targetId:null,lastMove:{x:0,y:0},
    energyStyle:{core,energy},
  };
}
let source=actor("vfx-source","YOU","friendly","caster",450,360,"#88dcf6","#d4f8ff");
let enemy=actor("vfx-target","ENEMY ORB","enemy","caster",755,360,"#c6639f","#f5bbd9");
let ally=actor("vfx-ally","ALLY ORB","friendly","healer",675,525,"#73cfa9","#cef7dc");
source.targetId=enemy.id;
let match={
  actors:[source,enemy,ally],player:source,
  getActor(id){return this.actors.find(a=>a.id===id)||null;},
};
let renderer,feedback,active=null,sequence=false,sequenceIndex=0;
let last=performance.now(),previous=null;
const timeline={spell:null,started:0,released:false,pulses:0};
function selectCard(id){
  for(const button of $("spell-grid").querySelectorAll("[data-spell]")){
    button.classList.toggle("selected",button.dataset.spell===id);
    button.setAttribute("aria-pressed",String(button.dataset.spell===id));
  }
}
function setPhase(name,desc){
  $("phase-name").textContent=name;
  $("phase-description").textContent=desc;
}
function prepareActors(spell){
  // Fresh actor shells pick up the spell's exact discipline palette.
  const tint=palette[spell.discipline];
  // Use the real melee range for short hits; mobility needs a longer path.
  const rule=ABILITY_RULES[spell.id]||{};
  const close=rule.range>0&&rule.range<=125&&spell.type!=="charge";
  source.x=close?555:450;
  enemy.x=close?650:755;
  source.y=360;enemy.y=360;
  source.classId="energy-caster-"+spell.id;
  source.energyStyle={core:tint,energy:spell.discipline==="solar"?"#fff1bd":
    spell.discipline==="cryo"?"#e4faff":spell.discipline==="vital"?"#ddfff1":"#efcbff"};
  source.role=spell.discipline==="kinetic"?"melee":"caster";
  source.targetId=spell.target==="enemy"?enemy.id:ally.id;
  for(const participant of match.actors){
    participant.cast=null;
    participant.statuses=[];
    participant.healthPct=1;
    participant.hp=100;
    participant.shield=0;
    participant.lastMove={x:0,y:0};
  }
}
// Live mode intentionally creates a disposable *real* EnergyMatch for each
// trial. All damage, cast timings, recasts, target checks, DoTs and procs are
// taken from the production engine; no Journey/localStorage writes occur.
const LIVE_PREVIEW_SECONDS=7.6;
function spellTarget(spell){
  const mode=ABILITY_RULES[spell.id]?.mode;
  return ["heal","guard","shield","mirror","recall","relay","team-heal",
    "cleanse","hot","link"].includes(mode) ? ally : enemy;
}
function previewCast(id,targetId=null,opts={}){
  const actor=match.player;
  const success=match.castAbility(actor,id,targetId??enemy.id,{silent:true,...opts});
  if(!success)console.info("Lab cast could not fire",id,match.reason(actor,id,targetId??enemy.id));
  return success;
}
function scheduleLive(after,action){liveActions.push({at:after,action,done:false});}
function safePreviewPoint(player,radius=145){
  for(const distance of [radius,radius*.75,radius*.45]){
    for(const angle of [0,.5,-.5,1,-1,Math.PI]){
      const point={x:player.x+Math.cos(angle)*distance,
        y:player.y+Math.sin(angle)*distance};
      if(match.canOccupy(player,point.x,point.y)&&
        !match.arena.obstacles?.some(o=>
          // The engine itself performs final line-of-sight validation.
          point.x>o.x&&point.x<o.x+o.w&&point.y>o.y&&point.y<o.y+o.h))
        return point;
    }
  }
  return null;
}
function runCombat(spell,fromSequence=false){
  active=spell;sequence=fromSequence;
  sequenceIndex=(fromSequence?sequenceList:visibleSpells).indexOf(spell);
  const key=selectedRole;
  const kit=CLASS_SPELLS[key]||[];
  const spawns={...VERDANT_CRUCIBLE.spawns};
  for(const role of Object.keys(ROLES)){
    spawns["friendly-"+role]={x:480,y:360};
    spawns["enemy-"+role]={x:735,y:360};
  }
  const testArena={...VERDANT_CRUCIBLE,spawns};
  const journey={version:2,originRole:key,clears:20,owned:kit.slice(2),
    evolutions:{},companionStyles:{},devTest:true};
  match=new EnergyMatch({role:key,name:"VFX TEST"},testArena,{
    modeId:"training",journey
  });
  match.ai.tick=()=>{};
  match.ai.updateActor=()=>{};
  source=match.player;source.name="YOU · "+ROLES[key].name.toUpperCase();
  enemy=match.living("enemy")[0];
  ally=actorFor("lab-healing-ally","friendly","healer",{x:595,y:510},
    "ai",["pulse-mend"],{}, {},1);
  match.actors.push(ally);
  source.abilities=[...kit];source.evolutions={};
  source.energyStyle={core:ROLES[key].color,energy:palette[spell.discipline]};
  source.classId="energy-"+key;
  const melee=["rift-slash","arc-strike","pulse-sever","seismic-uppercut"].includes(spell.id);
  source.x=melee?576:465;source.y=360;
  enemy.x=melee?662:735;enemy.y=360;
  enemy.name="STATIC TEST ENEMY";enemy.maxHp=2600;enemy.hp=2600;
  enemy.healthPct=1;enemy.boss=false;
  enemy.aiStyle="passive";
  enemy.cast=null;enemy.targetId=source.id;
  ally.maxHp=600;ally.hp=390;ally.healthPct=ally.hp/ally.maxHp;
  source.flux=100;
  source.targetId=spellTarget(spell).id;
  if(selectedEvolution)source.evolutions[spell.id]=selectedEvolution;
  for(const offset of [64,-75]){
    const foe=actorFor("lab-extra-"+offset,"enemy","caster",
      {x:enemy.x+48,y:enemy.y+offset},"ai",["crystal-bolt"],{}, {},1);
    foe.name="SECONDARY ENEMY";foe.maxHp=1300;foe.hp=700;
    match.actors.push(foe);
  }
  // Set up qualifying states so selecting an Evolution previews its
  // special behaviour on the first press instead of demanding repetitions.
  if(spell.id==="flux-bolt"){
    source.fluxRhythm={targetId:enemy.id,hits:2,until:match.time+12};
    if(selectedEvolution==="helios-beam")source.heliosReady=true;
  }
  if(spell.id==="rift-slash"){
    source.voidSlashCount=2;
    if(selectedEvolution==="executioners-veil"){
      enemy.hp=620;enemy.healthPct=enemy.hp/enemy.maxHp;
    }
  }
  if(["executioners-veil","devouring-pact","psychic-collapse",
    "focused-fracture"].includes(selectedEvolution)){
    match.addStatus(enemy,{kind:"dot",spellId:"entropy-mark",sourceId:source.id,
      amount:5,period:2,tickLeft:2,tickCount:2,negative:true,remaining:10});
  }
  if(spell.id==="sun-lance"&&selectedEvolution==="judgment-of-dawn"){
    enemy.hp=640;enemy.healthPct=enemy.hp/enemy.maxHp;
  }
  if(spell.id==="pulse-sever")enemy.cast={
    spellId:"crystal-bolt",remainingMs:2500,totalMs:2500};
  if(spell.id==="crystal-snare"&&selectedEvolution==="deep-freeze")enemy.elite=true;
  liveElapsed=0;liveActions=[];timeline.spell=spell;
  timeline.started=performance.now();timeline.released=true;
  timeline.pulses=0;
  renderer.spellFX.hero.clear();
  if(renderer.pixiFX)renderer.pixiFX.effects.length=0;
  selectCard(spell.id);
  $("now-playing").textContent=ROLES[key].name.toUpperCase()+" · "+spell.name+
    (selectedEvolution?" · "+ABILITY_BY_ID[spell.id].evolutions.find(e=>e.id===selectedEvolution)?.name:"");
  $("lab-spell-picker").value=spell.id;
  setPhase("LIVE COMBAT", "Production spell logic · "+(selectedEvolution||"base spell")+
    " · isolated targets and automatic setup");
  const mode=ABILITY_RULES[spell.id]?.mode;
  const target=spellTarget(spell);
  const id=spell.id;
  const point=["gravity-hammer","zenith-crash","froststorm","abyssal-rift"].includes(id)?
    {x:enemy.x,y:enemy.y}:id==="phase-slip"?safePreviewPoint(source):
    id==="avalanche"?{x:enemy.x,y:enemy.y}:null;
  const castOptions=point?{point}:id==="flux-bolt"&&selectedEvolution==="helios-beam"?
    {holdToCharge:true}:{};
  const fired=previewCast(id,target.id,castOptions);
  if(!fired)setPhase("INVALID CAST","The real engine rejected the attempted cast. Review spell rules or arena position.");
  if(id==="vital-recall"){
    scheduleLive(1.45,()=>{ally.hp=Math.max(1,ally.hp-90);ally.healthPct=ally.hp/ally.maxHp;
      source.targetId=ally.id;previewCast(id,ally.id);});
  }else if(id==="soul-relay")
    scheduleLive(1.55,()=>previewCast(id,source.id));
  else if(id==="cinder-familiar"&&selectedEvolution==="dying-star")
    scheduleLive(2.5,()=>previewCast(id,enemy.id));
  else if(id==="solar-ascension"){
    for(const at of [1.5,3.1,4.8])
      scheduleLive(at,()=>{source.flux=100;previewCast("flux-bolt",enemy.id);});
  }else if(id==="void-metamorphosis"){
    scheduleLive(1.5,()=>{source.x=enemy.x-88;previewCast("rift-slash",enemy.id);});
    scheduleLive(4.6,()=>{source.flux=100;previewCast("entropy-mark",enemy.id);});
  }else if(id==="phase-slip"&&selectedEvolution==="shadow-ambush"){
    scheduleLive(1.6,()=>{source.x=enemy.x-88;previewCast("rift-slash",enemy.id);});
  }else if(id==="crystal-mirror"||id==="kinetic-rampart"){
    scheduleLive(1.5,()=>{enemy.x=source.x+120;
      match.damage(id==="crystal-mirror"?ally:source,28,enemy,"crystal-bolt");});
  }else if(id==="abyssal-rift")
    scheduleLive(1.6,()=>match.damage(source,25,enemy,"crystal-bolt"));
  else if(id==="flux-bolt"&&selectedEvolution==="helios-beam")
    scheduleLive(2.0,()=>match.releaseHeldCast(source,"flux-bolt"));
  for(const event of match.consumeEvents()){
    renderer.spawnEffect(event,match);
    feedback?.onEvent(event,match);
  }
}
function animateCombat(now){
  const dt=clamp((now-last)/1000,0,.15);last=now;
  if(timeline.spell&&match){
    // One 50ms engine step at a time, identical to arena combat rules.
    let remaining=dt;
    while(remaining>.00001){
      const step=Math.min(.05,remaining);remaining-=step;
      liveElapsed+=step;
      if(!match.ended)match.update(step);
      for(const task of liveActions)
        if(!task.done&&liveElapsed>=task.at){task.done=true;task.action();}
      for(const event of match.consumeEvents()){
        renderer.spawnEffect(event,match);
        feedback?.onEvent(event,match);
      }
    }
    if(liveElapsed>LIVE_PREVIEW_SECONDS){
      if(sequence&&sequenceIndex<sequenceList.length-1)
        runCombat(sequenceList[sequenceIndex+1],true);
      else{
        timeline.spell=null;sequence=false;
        setPhase("READY","Live trial complete. Replay or choose a different Evolution.");
      }
    }
  }
  try{
    renderer.render(match);
    feedback?.update(match,now);
  }catch(error){
    $("vfx-error").hidden=false;
    $("vfx-error").textContent="Combat Lab preview failed: "+(error?.message||String(error));
    console.error(error);
    renderer.dispose();renderer=null;
  }
}
function run(spell,fromSequence=false){
  if(!renderer||!spell)return;
  if(labUseCombat){runCombat(spell,fromSequence);return;}
  sequence=fromSequence;
  active=spell;
  sequenceIndex=(fromSequence?sequenceList:catalogue).indexOf(spell);
  const previewDuration=spell.duration;
  prepareActors(spell);
  renderer.spellFX.hero.clear();
  // Clear only old visual accents, not scene or combat progression.
  if(renderer.pixiFX)renderer.pixiFX.effects.length=0;
  $("now-playing").textContent=spell.name+" · "+spell.discipline.toUpperCase();
  setPhase(labels.charging,spell.phase+" — energy assembling inside the orb");
  selectCard(spell.id);
  $("lab-spell-picker").value=spell.id;
  const target=match.getActor(source.targetId);
  source.cast={spellId:spell.id,totalMs:previewDuration,remainingMs:previewDuration,targetId:target.id};
  timeline.spell=spell;
  timeline.started=performance.now();
  timeline.released=false;
  timeline.pulses=0;
  timeline.trailCount=0;
  timeline.chargeFinished=false;
  renderer.spawnEffect({
    type:"windup",actorId:source.id,targetId:target.id,spellId:spell.id,
  },match);
}
function release(spell){
  if(!renderer)return;
  source.cast=null;
  const target=match.getActor(source.targetId);
  const id=spell.id;
  if(spell.type==="charge"){
    renderer.spawnEffect({type:"charge-start",spellId:id,
      actorId:source.id,targetId:target.id,x:source.x,y:source.y},match);
    setPhase(labels.release,"Your orb visibly charges toward the selected enemy.");
    return;
  }
  if(spell.type==="dash"){
    const fromX=source.x,fromY=source.y;
    source.x+=165;
    renderer.spawnEffect({type:"dash",spellId:id,actorId:source.id,
      fromX,fromY,toX:source.x,toY:source.y},match);
    setPhase(labels.release,"Movement spell preview: departure and arrival.");
    return;
  }
  if(id==="zenith-crash"){
    renderer.spawnEffect({type:"evolution-proc",spellId:id,
      actorId:source.id,targetId:target.id,kind:"zenith-impact",
      x:target.x,y:target.y},match);
  }
  if(spell.type==="control")
    target.statuses=[{kind:"incapacitate",negative:true,remaining:4}];
  if(spell.type==="shield"){
    target.shield=42;
    target.statuses=[{kind:"shield",remaining:5}];
  }
  if(id==="reactive-thread")
    target.statuses=[{kind:"reactive-thread",remaining:10,sourceId:source.id}];
  if(id==="arc-strike")
    source.strikeSwingCounter=(source.strikeSwingCounter||0)+1;
  const event={
    type:spell.type,spellId:id,actorId:source.id,targetId:target.id,
    amount:spell.type==="hit"?id==="gravity-hammer"?42:id==="sun-lance"?31:26:spell.type==="heal"?40:42,
  };
  renderer.spawnEffect(event,match);
  feedback?.onEvent(event,match);
  if(id==="reactive-thread"){
    const pulse={type:"heal",spellId:id,actorId:source.id,targetId:target.id,amount:12};
    renderer.spawnEffect(pulse,match);
    feedback?.onEvent(pulse,match);
  }
  setPhase(labels.release,id==="pulse-mend"?"Energy is flowing to the allied orb"
    :id==="photon-barrier"?"Shield geometry surrounding ally"
    :id==="null-prison"?"Geometric prison closes around the enemy"
    :id==="reactive-thread"?"Living healing threads attach to ally"
    :"Energy released — tracking the impact on the enemy");
}
function drawCards(){
  const root=$("spell-grid");root.replaceChildren();
  for(const spell of visibleSpells){
    const card=el("button","spell-card");
    card.type="button";card.dataset.spell=spell.id;
    card.setAttribute("aria-pressed","false");
    card.style.setProperty("--tint",palette[spell.discipline]);
    const top=el("div","spell-top");
    const emblem=el("span","spell-emblem",spell.icon);
    const heading=el("span");
    heading.append(el("strong","",spell.name),el("div","discipline",spell.discipline));
    top.append(emblem,heading);
    card.append(top,el("span","tagline",spell.caption),
      el("span","play",polishedIds.has(spell.id)?"▶ AUTHORED VFX":"▶ GAMEPLAY VFX"));
    card.addEventListener("click",()=>run(spell,false));
    root.append(card);
  }
}
function animate(now){
  requestAnimationFrame(animate);
  if(!renderer)return;
  if(labUseCombat){animateCombat(now);return;}
  const dt=clamp((now-last)/1000,0,.15);last=now;
  if(timeline.spell){
    const spell=timeline.spell;
    const elapsed=now-timeline.started;
    if(!timeline.released){
      source.cast.remainingMs=Math.max(0,spell.duration-elapsed);
      if(elapsed>=spell.duration){
        release(spell);
        timeline.released=true;
      }
    }else{
      const since=elapsed-spell.duration;
      if(spell.type==="charge"&&!timeline.chargeFinished){
        // Model real Phase Rush travel during the preview rather than blinking.
        const progress=clamp(since/430,0,1);
        const nextX=450+(enemy.x-450-51)*progress;
        source.lastMove={x:1,y:0};
        source.x=nextX;
        while(timeline.trailCount<Math.floor(since/70)&&progress<1){
          renderer.spawnEffect({type:"charge-trail",spellId:spell.id,
            actorId:source.id,x:source.x,y:source.y},match);
          timeline.trailCount++;
        }
        if(progress>=1){
          timeline.chargeFinished=true;source.lastMove={x:0,y:0};
          renderer.spawnEffect({type:"charge-impact",spellId:spell.id,
            actorId:source.id,targetId:enemy.id,x:source.x,y:source.y},match);
        }
      }
      if(spell.id==="reactive-thread"&&timeline.pulses<3&&since>(timeline.pulses+1)*690){
        timeline.pulses++;
        const event={type:"heal",actorId:source.id,targetId:ally.id,
          spellId:spell.id,amount:8+timeline.pulses*3};
        renderer.spawnEffect(event,match);
        feedback?.onEvent(event,match);
      }
      if(since>300&&since<370)setPhase(labels.contact,spell.id==="photon-barrier"?
        "Persistent protective energy field":spell.id==="null-prison"?
        "Control structure holds the target":"Distinct impact and residual energy");
      if(since>3700){
        if(sequence&&sequenceIndex<sequenceList.length-1)run(sequenceList[sequenceIndex+1],true);
        else{
          timeline.spell=null;sequence=false;
          setPhase(labels.ready,"Replay this signature or choose another spell.");
        }
      }
    }
  }
  for(const entity of match.actors){
    for(const status of entity.statuses)status.remaining=Math.max(0,status.remaining-dt);
    entity.statuses=entity.statuses.filter(status=>status.remaining>0);
  }
  try{
    renderer.render(match);
    feedback?.update(match,now);
  }catch(error){
    $("vfx-error").hidden=false;
    $("vfx-error").textContent="VFX preview failed: "+(error?.message||String(error));
    console.error(error);
    renderer.dispose();renderer=null;
  }
}
function init(){
  const picker=$("lab-spell-picker"),filter=$("lab-discipline-filter");
  for(const spell of catalogue){
    const option=el("option","",spell.name+" · "+spell.discipline.toUpperCase());
    option.value=spell.id;
    picker.append(option);
  }
  picker.addEventListener("change",()=>{
    const spell=catalogue.find(s=>s.id===picker.value);
    if(spell){sequence=false;run(spell,false);}
  });
  const updateFilter=()=>{
    visibleSpells=filter.value==="all"?[...catalogue]:
      catalogue.filter(spell=>spell.discipline===filter.value);
    drawCards();
    if(active)selectCard(active.id);
    $("spell-count").textContent=visibleSpells.length+" SPELLS · CHOOSE ANY";
  };
  filter.addEventListener("change",updateFilter);
  updateFilter();
  let volumeOn=false; // The old faceted experiment remains OFF by default.
  let threadOn=true; // Preferred Pixi + thread depth; 3D debris stays OFF.
  const syncDepthModes=()=>{
    renderer?.spellFX?.hero?.volume?.setEnabled(volumeOn);
    renderer?.spellFX?.hero?.setThreadDepthEnabled(threadOn);
    $("toggle-volume").textContent=volumeOn?"3D DEBRIS: ON":"3D DEBRIS: OFF";
    $("toggle-threads").textContent=threadOn?"THREAD DEPTH: ON":"THREAD DEPTH: OFF";
    $("render-label").textContent=!pixiOn?"BABYLON SPELL FALLBACK · PIXI OFF":
      volumeOn?"PIXI SPELL VFX · LEGACY 3D DEBRIS":
      threadOn?"PIXI SPELL VFX · THREAD DEPTH + GLASS":
      "ORIGINAL LAYERED VFX · 3D CORE + PIXI";
  };
  $("toggle-volume").addEventListener("click",()=>{
    volumeOn=!volumeOn;
    if(volumeOn)threadOn=false; // never stack rejected chunky fragments
    syncDepthModes();
    run(active||signature[0],false);
  });
  $("toggle-threads").addEventListener("click",()=>{
    threadOn=!threadOn;
    if(threadOn)volumeOn=false; // clean A/B against Pixi-only or old debris
    syncDepthModes();
    run(active||signature[0],false);
  });
  let pixiOn=true;
  $("toggle-pixi").addEventListener("click",()=>{
    pixiOn=!pixiOn;
    renderer?.pixiFX?.setEnabled(pixiOn);
    $("toggle-pixi").textContent=pixiOn?"PIXI SPELLS: ON":"PIXI SPELLS: OFF";
    syncDepthModes();
    // Rebuild the spell with the correct renderer, not a half-Pixi/half-
    // Babylon projectile left behind from the previous toggle state.
    run(active||signature[0],false);
  });
    $("replay-spell").addEventListener("click",()=>run(active||signature[0],false));
  $("play-sequence").addEventListener("click",()=>{
    sequenceList=[...visibleSpells];
    if(sequenceList.length)run(sequenceList[0],true);
  });
  try{
    renderer=new EnergyArenaRenderer($("vfx-canvas"),VERDANT_CRUCIBLE);
    syncDepthModes();
    $("toggle-pixi").textContent="PIXI SPELLS: ON";
    $("render-label").textContent="ORIGINAL LAYERED VFX · 3D CORE + PIXI";
    // Visual close-up: the orbs, spell volumes and trails are the subject,
    // not the distant boundaries of the arena.
    const base=renderer.fitCamera.bind(renderer);
    renderer.fitCamera=()=>{
      base();
      renderer.camera.radius=Math.max(12.6,12.6*1.25/(renderer.canvas.clientWidth/renderer.canvas.clientHeight));
      renderer.camera.target.set(11.9,0,7.4);
    };
    renderer.fitCamera();
    feedback=new EnergyCombatFeedback($("vfx-stage"),renderer);
    previous=performance.now();
    last=previous;
    run(signature[0],false);
  }catch(error){
    console.error(error);
    $("vfx-error").hidden=false;
    $("vfx-error").textContent="Unable to initialise Visual Combat Slice: "+(error?.message||String(error));
  }
  requestAnimationFrame(animate);
}
init();
