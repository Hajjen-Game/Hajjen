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
