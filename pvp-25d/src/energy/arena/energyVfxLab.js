// A controlled visual audition, not a match simulation.
// Reuses the real Energy Arena renderer, glass orbs, selected-target rings
// and authored EnergyHeroVFX. No AI, cooldown, HP or progression rules.
import { EnergyArenaRenderer } from "./EnergyArenaRenderer.js?v=20261015-voidlab1";
import { ABILITIES,ABILITY_BY_ID,ROLES,GENESIS_CLASS_SPELL_IDS,IMPACT_CLASS_SPELL_IDS,
  ECLIPSE_CLASS_SPELL_IDS,SOLAR_CLASS_SPELL_IDS,VOID_CLASS_SPELL_IDS }
  from "../abilityCatalog.js?v=20261015-voidlab1";
import { EnergyMatch, actorFor, hasLineOfSight, ABILITY_RULES } from "./EnergyMatch.js?v=20261015-voidlab2";
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
let selectedRole="healer",selectedEvolution="",selectedTargetKey="auto",labUseCombat=true;
const LAB_TARGETS=[
  {key:"auto",label:"AUTO",description:"Recommended target for the current spell"},
  {key:"self",label:"SELF",description:"Your own Origin"},
  {key:"ally",label:"ALLY",description:"Your friendly test teammate"},
  {key:"enemy1",label:"ENEMY 1",description:"Main test enemy"},
  {key:"enemy2",label:"ENEMY 2",description:"Additional target on the upper side"},
  {key:"enemy3",label:"ENEMY 3",description:"Additional target on the lower side"},
];
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
function chosenActor(key){
  return ({self:source,ally,enemy1:enemy,
    enemy2:match.getActor("lab-extra-64"),
    enemy3:match.getActor("lab-extra--75")})[key]||null;
}
function spellTarget(spell){
  if(selectedTargetKey!=="auto")return chosenActor(selectedTargetKey);
  const mode=ABILITY_RULES[spell.id]?.mode;
  if(spell.id==="pulse-mend"&&selectedEvolution==="vital-reversal")return enemy;
  if(["rampart","ascension","transform","summon"].includes(mode))return source;
  return ["heal","guard","shield","mirror","recall","relay","team-heal",
    "cleanse","hot","link"].includes(mode)?ally:enemy;
}
function targetIssue(spell,target){
  if(!target)return "That target is not present in the test arena.";
  const mode=ABILITY_RULES[spell.id]?.mode;
  const supportive=["heal","guard","shield","mirror","recall","relay",
    "team-heal","cleanse","hot","link"].includes(mode);
  const ignored=["rampart","ascension","transform","summon","ground",
    "teleport","direction","dash"].includes(mode);
  if(ignored||mode==="hybrid"||
    (spell.id==="pulse-mend"&&selectedEvolution==="vital-reversal"))
    return null;
  if(supportive&&target.team!=="friendly")
    return spell.name+" requires Self or Ally; choose a friendly orb.";
  if(!supportive&&target.team==="friendly")
    return spell.name+" requires an enemy; select Enemy 1, 2 or 3.";
  return null;
}
function renderTargetChoices(spell){
  const root=$("lab-target-choices");
  root.replaceChildren();
  const selected=LAB_TARGETS.find(t=>t.key===selectedTargetKey)||LAB_TARGETS[0];
  for(const option of LAB_TARGETS){
    const button=el("button","lab-target-choice");
    button.type="button";button.dataset.target=option.key;
    button.setAttribute("aria-pressed",String(option.key===selectedTargetKey));
    button.setAttribute("title",option.description);
    if(option.key===selectedTargetKey)button.classList.add("selected");
    const dot=el("span","lab-target-dot");dot.setAttribute("aria-hidden","true");
    button.append(dot,el("span","",option.label));
    button.addEventListener("click",()=>chooseTarget(option.key));
    root.append(button);
  }
  $("lab-target-current").textContent=selected.label;
  const target=spell?spellTarget(spell):null;
  const mode=spell?ABILITY_RULES[spell.id]?.mode:null;
  const untargeted=["rampart","ascension","transform","summon"].includes(mode);
  const ground=["ground","teleport","direction"].includes(mode);
  const reason=selectedTargetKey==="auto"?
    "AUTO chooses "+(target?.name||"a suitable target")+" for this spell.":
    selected.description+".";
  $("lab-target-explainer").textContent=reason+
    (untargeted?" This is a self-activated ability; target selection does not override its self effect.":
    ground?" For this spell, the selected orb determines the ground or teleport direction.":"")+
    " Click an orb in the arena to switch target.";
}
function chooseTarget(key){
  if(!LAB_TARGETS.some(t=>t.key===key))return;
  selectedTargetKey=key;
  run(active||visibleSpells[0],false);
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
  source.classId="energy-"+selectedRole;
  source.energyStyle={core:tint,energy:spell.discipline==="solar"?"#fff1bd":
    spell.discipline==="cryo"?"#e4faff":spell.discipline==="vital"?"#ddfff1":"#efcbff"};
  source.role=selectedRole;
  for(const offset of [64,-75]){
    const id="lab-extra-"+offset;
    let foe=match.getActor(id);
    if(!foe){
      foe=actor(id,offset>0?"ENEMY 2":"ENEMY 3","enemy","caster",
        enemy.x+48,enemy.y+offset,"#bf6da0","#ffc2ea");
      match.actors.push(foe);
    }
    foe.x=enemy.x+48;foe.y=enemy.y+offset;
  }
  source.targetId=(spellTarget(spell)||enemy).id;
  for(const participant of match.actors){
    participant.cast=null;
    participant.statuses=[];
    participant.healthPct=1;
    participant.hp=100;
    participant.shield=0;
    participant.lastMove={x:0,y:0};
  }
  renderTargetChoices(spell);
}
// Live mode intentionally creates a disposable *real* EnergyMatch for each
// trial. All damage, cast timings, recasts, target checks, DoTs and procs are
// taken from the production engine; no Journey/localStorage writes occur.
const LIVE_PREVIEW_SECONDS=10.5;
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
        hasLineOfSight(player,point,match.arena)&&
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
  enemy.name="ENEMY 1";enemy.maxHp=2600;enemy.hp=2600;
  enemy.healthPct=1;enemy.boss=false;
  enemy.aiStyle="passive";
  enemy.cast=null;enemy.targetId=source.id;
  ally.maxHp=600;ally.hp=390;ally.healthPct=ally.hp/ally.maxHp;
  source.flux=100;
  if(selectedEvolution)source.evolutions[spell.id]=selectedEvolution;
  for(const offset of [64,-75]){
    const foe=actorFor("lab-extra-"+offset,"enemy","caster",
      {x:enemy.x+48,y:enemy.y+offset},"ai",["crystal-bolt"],{}, {},1);
    foe.name=offset>0?"ENEMY 2":"ENEMY 3";foe.maxHp=1300;foe.hp=700;
    match.actors.push(foe);
  }
  const focus=spellTarget(spell);
  if(!focus){
    setPhase("TARGET MISSING","Select another test target.");
    return;
  }
  source.targetId=focus.id;
  const foe=focus.team==="enemy"?focus:enemy;
  if(focus.team==="enemy"&&foe!==enemy){
    foe.maxHp=2600;foe.hp=2600;foe.healthPct=1;
  }
  if(melee&&focus.team==="enemy"&&Math.hypot(source.x-foe.x,source.y-foe.y)>108){
    // Make every enemy selectable for melee VFX comparisons without moving
    // the selected target away from its visible place in the test arena.
    const standing={x:foe.x-86,y:foe.y};
    if(match.canOccupy(source,standing.x,standing.y)&&
      hasLineOfSight(standing,foe,match.arena)){
      source.x=standing.x;source.y=standing.y;
    }
  }
  renderTargetChoices(spell);
  // Set up qualifying states so selecting an Evolution previews its
  // special behaviour on the first press instead of demanding repetitions.
  if(spell.id==="flux-bolt"){
    source.fluxRhythm={targetId:foe.id,hits:2,until:match.time+12};
    if(selectedEvolution==="helios-beam")source.heliosReady=true;
  }
  if(spell.id==="rift-slash"){
    source.voidSlashCount=2;
    if(selectedEvolution==="executioners-veil"){
      foe.hp=620;foe.healthPct=foe.hp/foe.maxHp;
    }
  }
  if(["executioners-veil","devouring-pact","psychic-collapse"].includes(selectedEvolution)){
    match.addStatus(foe,{kind:"dot",spellId:"entropy-mark",sourceId:source.id,
      amount:5,period:2,tickLeft:2,tickCount:2,negative:true,remaining:10});
  }
  if(selectedEvolution==="focused-fracture")
    match.addStatus(foe,{kind:"chilled-mark",sourceId:source.id,remaining:5});
  if(spell.id==="crystal-bolt"){
    source.crystalChainHits=2;source.crystalBoltCount=2;
  }
  if(spell.id==="sun-lance"&&selectedEvolution==="scorching-lance")
    foe.hp=95;
  if(spell.id==="entropy-mark"&&selectedEvolution==="contagion")
    foe.hp=75;
  if(spell.id==="rift-slash"&&selectedEvolution==="devouring-pact")
    source.hp=140;
  if(spell.id==="sun-lance"&&selectedEvolution==="judgment-of-dawn"){
    foe.hp=640;foe.healthPct=foe.hp/foe.maxHp;
  }
  if(spell.id==="pulse-sever")foe.cast={
    spellId:"crystal-bolt",remainingMs:2500,totalMs:2500};
  if(spell.id==="crystal-snare"&&selectedEvolution==="deep-freeze")foe.elite=true;
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
  const id=spell.id;
  const target=focus;
  const issue=targetIssue(spell,target);
  if(issue){
    setPhase("INVALID TARGET",issue);
    return;
  }
  // An orb controls where the ground AoE lands. Teleport uses a point near
  // its chosen orb, never the occupied body or an illegal shortcut.
  const slipPoint=()=>{
    if(id!=="phase-slip")return null;
    const dx=target.x-source.x,dy=target.y-source.y;
    const length=Math.hypot(dx,dy);
    if(length>20){
      for(const d of [Math.min(170,length-55),Math.min(135,length-55),80]){
        if(d<=12)continue;
        const candidate={x:source.x+dx/length*d,y:source.y+dy/length*d};
        if(match.canOccupy(source,candidate.x,candidate.y)&&
          hasLineOfSight(source,candidate,match.arena))return candidate;
      }
    }
    return safePreviewPoint(source);
  };
  const point=["gravity-hammer","zenith-crash","froststorm","abyssal-rift",
    "avalanche"].includes(id)?{x:target.x,y:target.y}:slipPoint();
  const castOptions=point?{point}:
    (id==="flux-bolt"&&selectedEvolution==="helios-beam")||
    (id==="pulse-mend"&&selectedEvolution==="vital-crescendo")?
      {holdToCharge:true}:{};
  const fired=previewCast(id,target.id,castOptions);
  if(!fired)setPhase("INVALID CAST",
    "Production combat rejected "+spell.name+" on "+target.name+
    ". Check team, range, line of sight or spell cooldown.");
  if(id==="pulse-mend"&&selectedEvolution==="second-heart"){
    scheduleLive(1.8,()=>{ally.hp=Math.min(ally.hp,ally.maxHp*.25);
      match.damage(ally,36,enemy,"crystal-bolt");});
  }else if(id==="resonance-guard"&&
    ["retaliation","last-stand"].includes(selectedEvolution)){
    scheduleLive(1.5,()=>{enemy.x=source.x+125;
      match.damage(ally,selectedEvolution==="last-stand"?900:46,enemy,"crystal-bolt");});
  }else if(id==="arc-strike"){
    scheduleLive(1.52,()=>previewCast(id,enemy.id));
  }else if(id==="froststorm"&&selectedEvolution==="shattering-storm"){
    scheduleLive(1.8,()=>previewCast("crystal-bolt",enemy.id));
  }else if(id==="sun-lance"&&selectedEvolution==="scorching-lance"){
    scheduleLive(2.35,()=>match.damage(enemy,400,source,"flux-bolt"));
  }else if(id==="entropy-mark"&&selectedEvolution==="contagion"){
    scheduleLive(2.4,()=>match.damage(enemy,400,source,"rift-slash"));
  }else if(id==="phase-slip"&&selectedEvolution==="veilwalk"){
    scheduleLive(1.6,()=>match.damage(source,32,enemy,"crystal-bolt"));
  }else if(id==="void-metamorphosis"&&selectedEvolution==="dreadblade-form"){
    for(const t of [1.45,4.58,7.72])
      scheduleLive(t,()=>{source.x=enemy.x-88;previewCast("rift-slash",enemy.id);});
  }else if(id==="void-metamorphosis"&&selectedEvolution==="soul-devourer"){
    scheduleLive(1.5,()=>previewCast("entropy-mark",enemy.id));
    scheduleLive(4.1,()=>match.damage(enemy,5000,source,"rift-slash"));
  }else if(id==="vital-recall"){
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
        run(sequenceList[sequenceIndex+1],true);
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
  if(active?.id!==spell.id)selectedEvolution="";
  renderEvolutionChoices(spell);
  if(labUseCombat){runCombat(spell,fromSequence);return;}
  sequence=fromSequence;
  active=spell;
  sequenceIndex=(fromSequence?sequenceList:catalogue).indexOf(spell);
  const previewDuration=spell.duration;
  prepareActors(spell);
  const chosen=spellTarget(spell);
  const issue=targetIssue(spell,chosen);
  if(issue){
    timeline.spell=null;sequence=false;
    setPhase("INVALID TARGET",issue);
    return;
  }
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
function renderEvolutionChoices(spell){
  if(!spell)return;
  const ability=ABILITY_BY_ID[spell.id];
  const evolutions=ability?.evolutions||[];
  if(!evolutions.some(e=>e.id===selectedEvolution))selectedEvolution="";
  const root=$("lab-evolution-choices");root.replaceChildren();
  $("lab-evolution-title").textContent=spell.name+" · choose its behaviour";
  $("lab-evolution-counter").textContent=evolutions.length?
    "BASE + "+evolutions.length+" EVOLUTIONS":"STANDALONE SIGNATURE SPELL";
  const variants=[{
    id:"",name:evolutions.length?"Original spell":"Signature spell",
    description:ability?.description||spell.caption,base:true,
  },...evolutions];
  for(const [i,variant] of variants.entries()){
    const button=el("button","lab-evolution-card");
    button.type="button";
    button.dataset.evolution=variant.id;
    button.setAttribute("aria-pressed",String(variant.id===selectedEvolution));
    button.style.setProperty("--tint",palette[ability?.discipline]||"#8dd6ee");
    if(variant.id===selectedEvolution)button.classList.add("selected");
    const tag=el("span","lab-evolution-tag",
      variant.base?"ORIGINAL": "EVOLUTION "+i);
    const name=el("strong","lab-evolution-name",variant.name);
    const explanation=el("span","lab-evolution-description",variant.description);
    const mark=el("span","lab-evolution-selected",
      variant.id===selectedEvolution?"● SELECTED":"○ TRY THIS");
    button.append(tag,name,explanation,mark);
    button.addEventListener("click",()=>{
      if(selectedEvolution===variant.id)return;
      selectedEvolution=variant.id;
      run(active||spell,false);
    });
    root.append(button);
  }
  const picked=evolutions.find(e=>e.id===selectedEvolution);
  $("lab-evolution-explainer").textContent=!evolutions.length?
    "Spells 5 and 6 have no Evolution choices. Test the complete signature ability as designed.":
    (picked?picked.name+" — "+picked.description:
      "Original — "+(ability?.description||spell.caption))+
    (labUseCombat?" Live Combat will trigger the real mechanic in a controlled test.":
      " Visual-only shows the original animation; switch to Live Combat to test Evolution mechanics.");
}
function init(){
  const picker=$("lab-spell-picker"),filter=$("lab-discipline-filter");
  const origin=$("lab-origin-picker");
  for(const [role,detail] of Object.entries(ROLES)){
    const option=el("option","",detail.name.toUpperCase()+" · "+detail.subtitle);
    option.value=role;origin.append(option);
  }
  origin.value=selectedRole;
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
    const cls=classCatalogue(selectedRole);
    visibleSpells=filter.value==="all"||!palette[filter.value]?cls:
      cls.filter(spell=>spell.discipline===filter.value);
    const old=picker.value;
    picker.replaceChildren();
    for(const spell of visibleSpells){
      const option=el("option","",spell.name);
      option.value=spell.id;picker.append(option);
    }
    if(visibleSpells.some(spell=>spell.id===old))picker.value=old;
    drawCards();
    if(active)selectCard(active.id);
    $("spell-count").textContent=visibleSpells.length+" / 6 "+ROLES[selectedRole].name.toUpperCase()+" SPELLS";
  };
  origin.addEventListener("change",()=>{
    selectedRole=origin.value;selectedEvolution="";selectedTargetKey="auto";
    filter.value="all";active=null;updateFilter();
    run(visibleSpells[0],false);
  });
  filter.addEventListener("change",()=>{
    selectedEvolution="";updateFilter();
    run(visibleSpells[0],false);
  });
  updateFilter();
  // The buttons are the accessible fallback. Clicking an orb in the
  // renderer selects the same *actor*, not an independent visual dummy.
  $("vfx-canvas").addEventListener("click",event=>{
    if(!renderer||!active||typeof renderer.pickGround!=="function")return;
    const point=renderer.pickGround(event.clientX,event.clientY);
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    const candidates=LAB_TARGETS.filter(t=>t.key!=="auto")
      .map(t=>({key:t.key,actor:chosenActor(t.key)}))
      .filter(q=>q.actor?.alive);
    candidates.sort((a,b)=>
      Math.hypot(a.actor.x-point.x,a.actor.y-point.y)-
      Math.hypot(b.actor.x-point.x,b.actor.y-point.y));
    const nearest=candidates[0];
    if(nearest&&Math.hypot(nearest.actor.x-point.x,
      nearest.actor.y-point.y)<=85)
      chooseTarget(nearest.key);
  });
  $("toggle-combat").addEventListener("click",()=>{
    labUseCombat=!labUseCombat;
    $("toggle-combat").textContent=labUseCombat?"LIVE COMBAT: ON":"VISUAL-ONLY: ON";
    if(!labUseCombat){
      source=actor("vfx-source","YOU","friendly",selectedRole,450,360,
        ROLES[selectedRole].color,palette[active?.discipline||"vital"]);
      enemy=actor("vfx-target","ENEMY 1","enemy","caster",755,360,"#c6639f","#f5bbd9");
      ally=actor("vfx-ally","ALLY","friendly","healer",675,525,"#73cfa9","#cef7dc");
      match={actors:[source,enemy,ally],player:source,
        getActor(id){return this.actors.find(a=>a.id===id)||null;}};
      source.targetId=enemy.id;
    }
    run(active||visibleSpells[0],false);
  });
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
    sequenceList=[...visibleSpells];selectedEvolution="";
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
    run(visibleSpells[0],false);
  }catch(error){
    console.error(error);
    $("vfx-error").hidden=false;
    $("vfx-error").textContent="Unable to initialise Visual Combat Slice: "+(error?.message||String(error));
  }
  requestAnimationFrame(animate);
}
init();
