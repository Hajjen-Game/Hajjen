// Standalone Energy Combat prototype: never imports arena3v3 combat.
// Rules intentionally limited to a first-playable balance baseline.
import { ABILITY_BY_ID, ROLES, DISCIPLINES, MAX_FLUX, BASE_FLUX_REGEN } from "../abilityCatalog.js?v=20261015-impact1";
import { buildCombatLoadout } from "../buildState.js?v=20261012-eclipse-oc1";
import { EnergyAI } from "./EnergyAI.js?v=20261015-impact1";
import {companionStyleFor} from "./EnergyCompanionStyles.js?v=20261012-dev-origin1";
import { MODES, MAX_LEVEL, stagedLoadout, botAbilities, rosterRoles, enemyTuning } from "./EnergyProgression.js?v=20261015-impact1";
import { singularityAvailable, SYNERGY_WINDOW_SECONDS } from "./EnergySingularity.js?v=20261012-eclipse-oc1";
import { energyIdentity } from "./EnergyCharacter.js?v=20261012-rift1";
import { RUN_HISTORY_LIMIT, formatEnergyRunReport } from "./EnergyRunReport.js?v=20261013-rift12";
import { BASE_HEALTH, BASE_CRIT_CHANCE, CRIT_MULTIPLIER, maxHealthForLevel,
  powerForLevel, damageMultiplier, healMultiplier, shieldMultiplier,
  rankedRule, successfulInterruptFlux }
  from "./EnergySpellBalance.js?v=20261010-balanced-ranks41";
import { EnergyMarbleBagPool } from "./EnergyMarbleBag.js?v=20261010-balanced-ranks41";

const TICK = 0.05;
// First survivability pass: allow a meaningful response to coordinated burst.
// One shared health pool for player and both teams; damage amounts unchanged.
export const BASE_ACTOR_HEALTH = BASE_HEALTH;
export const ABILITY_RULES = Object.freeze({
  "pulse-mend":       { mode:"heal",amount:60,cost:18,cast:1.5,range:490 },
  "resonance-guard":  { mode:"shield",amount:80,duration:8,cost:22,cd:32,range:490 },
  "vital-cascade":    { mode:"team-heal",amount:38,cost:32,cd:22,range:490 },
  "stasis-seal":      { mode:"cc",cc:"incapacitate",duration:5,cost:20,cd:24,range:490 },
  "vital-recall":     { mode:"recall",cost:20,cd:36,duration:4,range:490 },
  "soul-relay":       { mode:"relay",cost:22,cd:24,duration:10,range:4900 },
  "phase-rush":       { mode:"rush",cost:14,cd:17,range:450 }, 
  "seismic-uppercut": { mode:"damage",amount:25,cost:27,cd:25,range:110 },
  "kinetic-rampart":  { mode:"rampart",cost:24,cd:30,duration:4,range:0 },
  "pulse-sever":      { mode:"interrupt",cost:10,cd:15,range:105 },
  "flux-bolt":        { mode:"damage",amount:17,cost:11,cast:1.5,range:490 },
  "phase-slip":       { mode:"dash",distance:170,cost:16,cd:23 },
  "entropy-mark":     { mode:"dot",amount:5,ticks:6,period:2,cost:15,range:490 },
  "rift-slash":       { mode:"damage",amount:28,cost:19,cd:6,range:100,requiresDebuff:true },
  "null-prison":      { mode:"cc",cc:"incapacitate",duration:4,cost:20,cast:1.4,cd:24,range:490 },
  "sun-lance":        { mode:"damage",amount:27,cost:18,cast:1.8,range:490 },
  "zenith-crash":     { mode:"damage",amount:38,cost:30,cast:2,cd:18,range:490,area:124 },
  "photon-barrier":   { mode:"shield",amount:60,duration:5,cost:23,cd:28,range:490 },
  "crystal-bolt":     { mode:"damage",amount:15,cost:12,cast:1.3,range:490,slow:0.35,slowTime:3 },
  "crystal-snare":    { mode:"cc",cc:"root",duration:3,cost:15,cd:18,range:490 },
  "fracture-spear":   { mode:"damage",amount:32,cost:24,cast:1.7,cd:12,range:490,controlBonus:0.3 },
  "arc-strike":       { mode:"damage",amount:13,cost:10,range:100 },
  "gravity-hammer":   { mode:"ground",amount:37,cost:30,cast:0.6,cd:20,range:425,area:127 },
  "vector-rush":      { mode:"dash",distance:180,cost:14,cd:18 },
  "resonance-cut":    { mode:"interrupt",cost:15,cd:20,range:370 },
  "reactive-thread":  { mode:"hot",amount:6,ticks:5,period:2,cost:18,range:490,reactive:10 },
  "symbiosis-link":   { mode:"link",duration:10,cost:18,cd:16,range:490 },
  "cleanse-flux":     { mode:"cleanse",cost:11,cd:10,range:490 },
});

// Match the original 3v3 Pixi MovementSystem: actor bodies separate gently,
// without treating the entire decorative glass shell as a blocking collider.
// 21 px is comparable to the core/class-icon collider in 3v3 Pixi.
export const ORB_COLLISION_RADIUS=21;
const ORB_SEPARATION=ORB_COLLISION_RADIUS*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const roleColor={healer:"#6cd4aa",melee:"#f47d83",caster:"#75c8fb"};
const number=(value,defaultValue=0)=>Number.isFinite(Number(value))?Number(value):defaultValue;

export function segmentHitsRect(a,b,rect,pad=5) {
  const x=rect.x-pad,y=rect.y-pad,w=rect.w+pad*2,h=rect.h+pad*2;
  let tMin=0,tMax=1;
  const dx=b.x-a.x,dy=b.y-a.y;
  for(const [origin,delta,min,max] of [[a.x,dx,x,x+w],[a.y,dy,y,y+h]]){
    if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false;continue;}
    let near=(min-origin)/delta,far=(max-origin)/delta;
    if(near>far)[near,far]=[far,near];
    tMin=Math.max(tMin,near);tMax=Math.min(tMax,far);
    if(tMin>tMax)return false;
  }
  return true;
}

export function hasLineOfSight(a,b,arena) {
  return !(arena.obstacles||[]).some(o=>segmentHitsRect(a,b,o,6));
}

export function canStand(x,y,arena,radius=21) {
  const b=arena.bounds;
  if(x<b.x+radius||x>b.x+b.w-radius||y<b.y+radius||y>b.y+b.h-radius)return false;
  return !(arena.obstacles||[]).some(o=>x>o.x-radius&&x<o.x+o.w+radius&&y>o.y-radius&&y<o.y+o.h+radius);
}

export function actorFor(id,team,role,pos,control,abilities,evolutions={},talentRanks={},level=1) {
  return {
    id,team,role,control, classId:"energy-"+role,
    name:control==="player"?"YOU":(team==="friendly"?"ALLY ":"ENEMY ")+(ROLES[role]?.name||role).toUpperCase(),
    x:pos.x,y:pos.y, hp:maxHealthForLevel(level),maxHp:maxHealthForLevel(level),
    alive:true,healthPct:1,flux:100,
    energyStyle:{core:roleColor[role],energy:roleColor[role]},
    targetId:null,lastMove:{x:0,y:0},cast:null,charge:null,cooldowns:{},gcd:0,
    schoolLocks:{},statuses:[],shield:0,decision:0,abilities, evolutions, talentRanks,
    dashGate:0,arcCount:0,dr:{}, lastInterrupt:0,bonusFluxGate:0,
  };
}

export class EnergyMatch {
  constructor(build,arena,options={}) {
    // Independently balance each mode while keeping a full, editable Build Lab build.
    this.modeId=MODES[options.modeId]?options.modeId:"training";
    this.mode=MODES[this.modeId];
    this.progressLevel=Math.max(1,Math.min(MAX_LEVEL,Math.floor(options.level||1)));
    this.journey=options.journey||null;
    this.singularity=this.journey?null:options.singularity||null;
    this.singularityCharge=null;
    this.evolutionEvents=[];
    this.loadout=stagedLoadout(build,this.progressLevel,this.journey);
    this.tuning=enemyTuning(this.modeId,this.progressLevel);
    // Character-level power growth is removed for Journey players. 'level'
    // survives only as an internal stand-in for difficulty/encounter recipes.
    this.power=this.journey?1:powerForLevel(this.progressLevel);
    this.critBags=new EnergyMarbleBagPool();
    this.arena=arena;
    this.time=0;
    this.ended=false;
    this.winner=null;
    this.events=[];
    // Full-match evidence is independent of the short AI report and
    // survives consumeEvents() / VFX rendering. Capped for 240s matches.
    this.runHistory=[];this.runHistoryDropped=0;this.runSequence=0;
    this.notices=[];
    this.telemetry=new Map();
    this.lastDamageAt=0;
    this.player= null;
    this.actors=[];
    // Bots use real 10-slot classless builds: two role-bound + eight shared.
    // Select a balanced set covering damage, healing, interrupt, CC and defense.
    const rosters=rosterRoles(build.role,this.modeId,this.progressLevel);
    for(const team of ["friendly","enemy"]){
      for(const role of rosters[team]){
        const isPlayer=team==="friendly"&&role===build.role;
        const abilities=isPlayer?this.loadout.abilitySlots.map(s=>s.id):botAbilities(role,this.progressLevel,this.modeId);
        const evolutions=isPlayer?Object.fromEntries(this.loadout.abilitySlots.filter(s=>s.evolutionId).map(s=>[s.id,s.evolutionId])):{};
        // AI grows through the same Rank model without spending player TP.
        // Rank 1/2/3 AI tiers arrive at levels 10/20/30 respectively.
        const talentRanks=isPlayer?Object.fromEntries(this.loadout.abilitySlots.map(s=>[s.id,s.talentRank||0])):
          Object.fromEntries(abilities.map(spellId=>[spellId,this.journey?0:Math.min(3,Math.floor(this.progressLevel/10))]));
        const id=isPlayer?"player":team+"-"+role;
        const config=arena.spawns[team+"-"+role];
        const actor=actorFor(id,team,role,config,isPlayer?"player":"ai",
          abilities,evolutions,talentRanks,this.journey?1:this.progressLevel);
        if(team==="friendly"&&!isPlayer&&this.journey){
          actor.aiStyle=companionStyleFor(this.journey,role);
        }
        if(isPlayer){
          // Same talent-weighted signature as character HUB, with subtle
          // battle-scale rendering handled by EnergyOrbPolish.
          const id=energyIdentity(build,this.progressLevel,this.journey);
          actor.energyStyle=id.style;
          actor.energyDiscipline=id.primary;
        }
        this.actors.push(actor);
        if(isPlayer)this.player=actor;
      }
    }
    this.player.targetId=this.living("enemy").find(a=>a.role!=="healer")?.id||this.living("enemy")[0]?.id||null;
    for(const a of this.actors){
      if(a.control!=="ai")continue;
      const targets=this.opponents(a);
      a.targetId=(a.team==="friendly"?this.getActor(this.player.targetId):
        targets.find(t=>t.role==="caster")||targets.find(t=>t.role==="melee")||this.player)?.id||targets[0]?.id||null;
    }
    this.ai=new EnergyAI(this,{
      rules:ABILITY_RULES,hasLOS:hasLineOfSight,segmentHitsRect,canStand,
    });
    this.ai.tick(0);
  }
  getActor(id) {return this.actors.find(a=>a.id===id)||null;}
  living(team){return this.actors.filter(a=>a.alive&&a.team===team);}
  opponents(actor){return this.living(actor.team==="friendly"?"enemy":"friendly");}
  allies(actor){return this.living(actor.team);}
  get dampening(){
    if(this.modeId==="defense"||this.modeId==="rift")return 0; // PvE never uses arena dampening.
    return this.time<45?0:clamp(0.1+Math.floor((this.time-45)/10)*0.02,0,1);
  }
  log(text){this.notices.unshift({time:this.time,text});if(this.notices.length>7)this.notices.length=7;}
  emit(event){
    const source=this.getActor(event.actorId);
    if(source){
      let stat=this.telemetry.get(source.id);
      if(!stat){
        stat={casts:0,hits:0,damage:0,healing:0,interrupts:0,cc:0,abilities:{}};
        this.telemetry.set(source.id,stat);
      }
      if(event.type==="ability"){
        stat.casts++;
        stat.abilities[event.spellId]=(stat.abilities[event.spellId]||0)+1;
      }else if(event.type==="hit"){
        stat.hits++;stat.damage+=event.amount||0;
        if(event.amount>0)this.lastDamageAt=this.time;
      }else if(event.type==="heal")stat.healing+=event.amount||0;
      else if(event.type==="interrupt")stat.interrupts++;
      else if(event.type==="control")stat.cc++;
    }
    const snapshot={...event,time:this.time,seq:this.runSequence++};
    this.events.push(snapshot);
    // Record the facts at event time; actors/statuses will mutate later.
    this.runHistory.push({
      ...snapshot,
      actorHp:source?.hp??null,
      targetHp:this.getActor(event.targetId)?.hp??null,
      targetShield:this.getActor(event.targetId)?.shield??null,
      targetStatuses:this.getActor(event.targetId)?.statuses
        ?.filter(s=>s.remaining>0)
        .map(s=>s.kind+"("+s.remaining.toFixed(1)+"s)").join(", ")||"none",
    });
    if(this.runHistory.length>RUN_HISTORY_LIMIT){
      this.runHistory.shift();this.runHistoryDropped++;
    }
  }
  runReport(){return formatEnergyRunReport(this);}
  aiReport(){
    const lines=[
      "ENERGY ARENA — AI / COMBAT TEST REPORT",
      "Schema: energy-ai-v2 · independent 3v3 prototype",
      "Arena: "+(this.arena.name||this.arena.id||"The Grand Ring"),
      "Time: "+this.time.toFixed(1)+"s | Dampening: "+Math.round(this.dampening*100)+"%",
      "Result: "+(this.ended?(this.winner==="friendly"?"VICTORY":"DEFEAT"):"IN PROGRESS"),
      "Mode: "+this.mode.label+" ("+this.mode.size+") | "+
        (this.journey?"Stage "+Math.min(20,this.journey.clears+1):"Level "+this.progressLevel)
        +" | Enemy damage ×"+this.tuning.damage.toFixed(2)+" | Enemy healing ×"+this.tuning.healing.toFixed(2),
      "Last damage: "+(this.time-this.lastDamageAt).toFixed(1)+"s ago",
      "Player role: "+this.player.role+" | Ability slots: "+this.loadout.abilitySlots.map(s=>s.id).join(", "),
    ];
    for(const team of ["friendly","enemy"]){
      const plan=this.ai?.plans[team]||{};
      lines.push("",team.toUpperCase()+" PLAN: "+(plan.state||"unknown")
        +" | focus: "+(this.getActor(plan.targetId)?.name||"none")+" ["+(plan.targetId||"")+"]");
      for(const a of this.actors.filter(a=>a.team===team)){
        const t=this.getActor(a.targetId),stats=this.telemetry.get(a.id)||{};
        const distanceToTarget=t?Math.round(distance(a,t)):"—";
        const los=t?hasLineOfSight(a,t,this.arena):false;
        lines.push(
          a.name+" ["+a.role+" / "+a.control+
          (a.aiStyle?" / STYLE "+a.aiStyle.toUpperCase():"")+"]"+
          " | "+(a.alive?"ALIVE":"DEAD")+" HP "+Math.ceil(a.hp)+"/"+a.maxHp
          +" Flux "+Math.round(a.flux)
          +" | Position ("+Math.round(a.x)+","+Math.round(a.y)+")"
          +" | Target "+(t?.name||"none")+" ["+(a.targetId||"")+"]"+
          " | range "+distanceToTarget+" | LOS "+los
          +" | Cast "+(a.cast?.spellId||"none")
          +" | Nav "+(a.aiPath?.points?.length||0)+" waypoints"
          +" | Damage "+Math.round(stats.damage||0)+" Heal "+Math.round(stats.healing||0)
          +" Abilities "+(stats.casts||0)+" Hits "+(stats.hits||0)
          +" CC "+(stats.cc||0)+" Interrupts "+(stats.interrupts||0)
        );
        if(stats.abilities)lines.push("  Ability usage: "+Object.entries(stats.abilities).map(([id,count])=>id+"×"+count).join(", "));
      }
    }
    return lines.join("\n");
  }
  consumeEvents(){return this.events.splice(0);}
  isControlled(actor,kind) {return actor.statuses.some(s=>s.kind===kind&&s.remaining>0);}
  debuffed(actor){return actor.statuses.some(s=>s.negative&&s.remaining>0);}
  currentTarget(actor,mode,preferredId) {
    const chosen=this.getActor(preferredId||actor.targetId);
    if(["heal","guard","shield","hot","link","cleanse","team-heal","recall","relay","rampart"].includes(mode)){
      return chosen?.alive&&chosen.team===actor.team?chosen:actor;
    }
    if(mode==="hybrid")return chosen?.alive?chosen:actor;
    return chosen?.alive&&chosen.team!==actor.team?chosen:null;
  }
  rule(actor,spellId){
    const rule=rankedRule(spellId,ABILITY_RULES[spellId],actor?.talentRanks?.[spellId]||0);
    if(!rule)return rule;
    // These are REAL, shared Evolutions, not Planet Defense-only replicas.
    const evo=actor?.evolutions?.[spellId];
    if(spellId==="pulse-mend"&&evo==="vital-reversal")
      return {...rule,mode:"hybrid"};
    // Guardian Network, Retaliation and Last Stand alter the shield's
    // behaviour rather than replacing the basic capped absorb.
    if(spellId==="gravity-hammer"&&evo==="singularity-impact")
      return {...rule,amount:rule.amount*1.65,area:Math.round(rule.area*.60)};
    if(spellId==="flux-bolt"&&evo==="rapid-flux")
      return {...rule,cast:Math.max(.6,(rule.cast||0)-.35),amount:rule.amount*.85};
    if(spellId==="flux-bolt"&&evo==="overcharge")
      return {...rule,cast:(rule.cast||0)+.4,amount:rule.amount*1.3};
    if(spellId==="sun-lance"&&evo==="overcharged-lance")
      return {...rule,cast:rule.cast+.42,amount:rule.amount*1.32};
    if(spellId==="zenith-crash"&&evo==="focused-impact")
      return {...rule,amount:rule.amount*1.25,area:Math.round(rule.area*.62)};
    if(spellId==="photon-barrier"&&evo==="reinforced-prism")
      return {...rule,amount:rule.amount*1.34,cd:rule.cd+5};
    if(spellId==="vector-rush"&&evo==="extended-vector")
      return {...rule,distance:rule.distance+52,cd:rule.cd+3};
    if(spellId==="resonance-cut"&&evo==="long-reach")
      return {...rule,range:rule.range+125,cd:rule.cd+2};
    // Void - a faster trap costs control time; a stronger root is never free.
    if(spellId==="null-prison"&&evo==="rapid-seal")
      return {...rule,cast:Math.max(.65,rule.cast-.45),duration:Math.max(1.6,rule.duration-1)};
    if(spellId==="phase-slip"&&evo==="extended-phase")
      return {...rule,distance:rule.distance+60,cd:(rule.cd||0)+4};
    // Cryo - all three variants modify the same real spell used in Arena.
    if(spellId==="crystal-bolt"&&evo==="rapid-crystal")
      return {...rule,cast:Math.max(.65,rule.cast-.3),amount:rule.amount*.85};
    if(spellId==="crystal-snare"&&evo==="deep-freeze")
      return {...rule,duration:rule.duration+.85,cd:rule.cd+5};
    if(spellId==="fracture-spear"&&evo==="focused-fracture")
      return {...rule,amount:rule.amount*.80,controlBonus:.7};
    // Vital - distinct steady/reactive healing profiles and tactical dispels.
    if(spellId==="reactive-thread"&&evo==="emergency-weave")
      return {...rule,amount:rule.amount*.75,reactive:rule.reactive*1.25};
    if(spellId==="reactive-thread"&&evo==="steady-flow")
      return {...rule,amount:rule.amount*1.3,reactive:rule.reactive*.65};
    if(spellId==="cleanse-flux"&&evo==="dual-purge")
      return {...rule,cd:rule.cd+6};
    return rule;
  }
  identityProc(source,spellId,kind,target=null,x=null,y=null){
    this.emit({type:"identity-proc",actorId:source.id,targetId:target?.id||null,
      spellId,kind,x:x??target?.x??source.x,y:y??target?.y??source.y});
  }
  evolutionProc(source,spellId,kind,target=null,x=null,y=null){
    this.emit({type:"evolution-proc",actorId:source.id,targetId:target?.id||null,
      spellId,kind,x:x??target?.x??source.x,y:y??target?.y??source.y});
  }
  scheduleEvolution(source,spellId,kind,x,y,delay,amount,radius,extras={}){
    this.evolutionEvents.push({sourceId:source.id,spellId,kind,x,y,
      at:this.time+delay,amount,radius,...extras});
  }
  processEvolutionEffects(){
    const ready=this.evolutionEvents.filter(e=>e.at<=this.time);
    this.evolutionEvents=this.evolutionEvents.filter(e=>e.at>this.time);
    for(const e of ready){
      const source=this.getActor(e.sourceId);
      if(!source?.alive)continue;
      if(e.spellId==="vital-cascade"&&e.kind==="double-cascade"){
        const injured=this.allies(source).filter(a=>a.hp<a.maxHp);
        for(const ally of injured)this.heal(ally,e.amount,source,"vital-cascade",true);
        this.evolutionProc(source,"vital-cascade","double-cascade",injured[0]||source);
        continue;
      }
      if(e.kind==="gravity-well"){
        this.evolutionProc(source,e.spellId,e.kind,null,e.x,e.y);
        for(const enemy of this.opponents(source).filter(t=>distance(t,e)<=e.radius&&
          hasLineOfSight(e,t,this.arena)).slice(0,9)){
          this.damage(enemy,e.amount,source,e.spellId,true);
          if(!enemy.boss){
            const dx=e.x-enemy.x,dy=e.y-enemy.y,len=Math.hypot(dx,dy)||1;
            const nx=enemy.x+dx/len*Math.min(20,len),ny=enemy.y+dy/len*Math.min(20,len);
            if(this.canOccupy(enemy,nx,ny)){enemy.x=nx;enemy.y=ny;}
          }
        }
        continue;
      }
      if(e.targetId){
        const target=this.getActor(e.targetId);
        if(!target?.alive||target.team===source.team)continue;
        this.evolutionProc(source,e.spellId,e.kind,target);
        if(e.amount>0)this.damage(target,e.amount,source,e.spellId);
        continue;
      }
      this.evolutionProc(source,e.spellId,e.kind,null,e.x,e.y);
      for(const enemy of this.opponents(source).filter(t=>distance(t,e)<e.radius&&
          distance(t,e)>=(e.minRadius||0)&&hasLineOfSight(e,t,this.arena)).slice(0,9)){
        if(e.amount>0)this.damage(enemy,e.amount,source,e.spellId);
        if(e.slowDuration)
          this.addStatus(enemy,{kind:"slow",negative:true,remaining:e.slowDuration,
            sourceId:source.id});
      }
    }
  }
  rollCrit(source,spellId,context){
    if(!source)return false;
    return this.critBags.drawWeighted(
      source.id+":"+spellId+":"+context+":crit",
      {crit:BASE_CRIT_CHANCE,normal:1-BASE_CRIT_CHANCE})==="crit";
  }
  cost(actor,rule,spellId) {
    let cost=rule.cost||0;
    if(actor.role==="healer"&&["heal","hot","link"].includes(rule.mode))cost*=0.85;
    if(actor.role==="caster"&&rule.mode==="damage"&&rule.range>200)cost*=0.85;
    return Math.ceil(cost);
  }
  reason(actor,spellId,targetId) {
    const rule=this.rule(actor,spellId),ability=ABILITY_BY_ID[spellId];
    if(!rule||!ability||!actor.abilities.includes(spellId))return "NOT IN LOADOUT";
    if(!actor.alive||this.ended)return "MATCH ENDED";
    if(this.isControlled(actor,"incapacitate"))return "CONTROLLED";
    if(actor.cast)return "CASTING";
    if(actor.charge)return "CHARGING";
    const secondRecall=spellId==="vital-recall"&&this.allies(actor).some(a=>
      a.statuses.some(q=>q.kind==="vital-recall"&&q.sourceId===actor.id&&q.remaining>0));
    // Releasing an already armed rewind should not be eaten by the GCD:
    // players must be able to react before the four-second marker expires.
    const rampartRecast=spellId==="kinetic-rampart"&&actor.rampart?.until>this.time;
    if(actor.gcd>0&&!secondRecall&&!rampartRecast)return "GLOBAL COOLDOWN";
    const secondRelay=spellId==="soul-relay"&&actor.relayPending?.until>this.time;
    if((actor.cooldowns[spellId]||0)>0&&!secondRecall&&!secondRelay&&!rampartRecast)return "COOLDOWN";
    if((actor.schoolLocks[ability.discipline]||0)>0)return "SCHOOL LOCKED";
    if(!secondRecall&&!secondRelay&&!rampartRecast&&actor.flux<this.cost(actor,rule,spellId))return "LOW FLUX";
    if(["rush","dash"].includes(rule.mode)&&this.isControlled(actor,"root"))return "ROOTED";
    if(["rush","dash"].includes(rule.mode)&&actor.dashGate>0)return "MOBILITY LOCK";
    if(["dash","rampart","ground"].includes(rule.mode))return null;
    const target=this.currentTarget(actor,rule.mode,targetId);
    if(!target)return "SELECT A TARGET";
    const d=distance(actor,target);
    if(d>(rule.range||490)&&!secondRecall&&rule.mode!=="ground")return "OUT OF RANGE";
    if(!secondRecall&&rule.mode!=="ground"&&!hasLineOfSight(actor,target,this.arena))return "LINE OF SIGHT";
    // Interrupts may be used into a fake cast. The cooldown must still be spent.
    return null;
  }
  castAbility(actor,spellId,targetId,opts={}) {
    const error=this.reason(actor,spellId,targetId);
    if(error){if(actor===this.player&&!opts.silent)this.log(ABILITY_BY_ID[spellId]?.name+": "+error);return false;}
    const rule=this.rule(actor,spellId);
    const target=rule.mode==="dash"?null:this.currentTarget(actor,rule.mode,targetId);
    const isRecallRecast=spellId==="vital-recall"&&this.allies(actor).some(a=>
      a.statuses.some(q=>q.kind==="vital-recall"&&q.sourceId===actor.id&&q.remaining>0));
    const isRelaySecond=spellId==="soul-relay"&&actor.relayPending?.until>this.time;
    const rampartRecast=spellId==="kinetic-rampart"&&actor.rampart?.until>this.time;
    const groundPoint=rule.mode==="ground"?(opts.point||
      (target?.alive?{x:target.x,y:target.y}:null)):null;
    if(rule.mode==="ground"&&(!groundPoint||distance(actor,groundPoint)>rule.range||
      !canStand(groundPoint.x,groundPoint.y,this.arena,2)||
      !hasLineOfSight(actor,groundPoint,this.arena))){
      if(actor===this.player&&!opts.silent)this.log("GRAVITY HAMMER · INVALID GROUND POSITION");
      return false;
    }
    if(!isRecallRecast&&!isRelaySecond&&!rampartRecast)actor.flux-=this.cost(actor,rule,spellId);
    actor.gcd=(isRecallRecast||isRelaySecond||rampartRecast)?0.6:1.3;
    // Casted abilities earn their long cooldown only when the cast actually
    // resolves. Being kicked must NOT consume Null Prison's 24s cooldown.
    // Instants (including a fake interrupt) retain their existing cooldown.
    if(!rule.cast&&spellId!=="soul-relay"&&!rampartRecast)actor.cooldowns[spellId]=rule.cd||0;
    const crescendo=spellId==="pulse-mend"&&actor.evolutions[spellId]==="vital-crescendo"&&
      target?.team===actor.team&&opts.holdToCharge===true;
    const castSeconds=crescendo?2.5:(rule.cast||0);
    this.emit({type:"windup",actorId:actor.id,targetId:target?.id||null,
      spellId,castSeconds});
    if(rule.cast) {
      actor.cast={spellId,remainingMs:castSeconds*1000,totalMs:castSeconds*1000,
        targetId:target?.id||null,crescendoHeld:crescendo};
      if(spellId==="gravity-hammer"&&groundPoint){
        actor.cast.impact={...groundPoint};
        this.emit({type:"ground-telegraph",actorId:actor.id,spellId,
          x:groundPoint.x,y:groundPoint.y,radius:rule.area,duration:rule.cast});
      }
      if(spellId==="zenith-crash"&&target){
        // Lock the GROUND at cast start. Moving enemies may dodge the pillar,
        // even if the originally targeted enemy dies during the warning.
        actor.cast.impact={x:target.x,y:target.y};
        this.emit({type:"ground-telegraph",actorId:actor.id,spellId,
          x:target.x,y:target.y,radius:rule.area,duration:rule.cast});
      }
    }else this.execute(actor,spellId,target?.id||null);
    return true;
  }
  releaseHeldCast(actor,spellId){
    const cast=actor?.cast;
    if(!cast?.crescendoHeld||cast.spellId!==spellId)return;
    // Releasing before the full 2.5s charge returns to a normal 1.5s
    // Pulse Mend; holding for the full duration yields the greater heal.
    const elapsed=cast.totalMs-cast.remainingMs;
    cast.crescendoHeld=false;
    cast.remainingMs=Math.max(0,1500-elapsed);
    cast.totalMs=1500;
  }
  handleSingularityCast(actor,spellId,target){
    // Only a player's completed, valid cast can arm or fire the core.
    // The two spells keep their normal effects and individual Evolutions.
    const core=this.singularity;
    if(actor!==this.player||!singularityAvailable(core,this.progressLevel,actor.abilities))return;
    if(spellId===core.partner){
      this.singularityCharge={expires:this.time+SYNERGY_WINDOW_SECONDS};
      this.emit({type:"synergy-charge",actorId:actor.id,spellId,
        reaction:core.reaction,duration:SYNERGY_WINDOW_SECONDS});
      return;
    }
    if(spellId!==core.anchor||!this.singularityCharge)return;
    const charge=this.singularityCharge;
    this.singularityCharge=null;
    if(this.time>charge.expires)return;
    const tier=Math.max(0,Math.min(4,Math.floor(core.tier||0)));
    const origin=target?.alive?target:actor;
    if(core.reaction==="annihilation"){
      // AoE is capped and respects LOS, so supportive and mobility anchors work.
      const foes=this.opponents(actor).filter(t=>t.alive&&
        distance(t,origin)<155&&hasLineOfSight(origin,t,this.arena));
      for(const enemy of foes.slice(0,3))
        this.damage(enemy,8+tier*3,actor,core.anchor);
    }else if(core.reaction==="distortion"){
      const foes=this.opponents(actor).filter(t=>t.alive&&
        distance(t,origin)<165&&hasLineOfSight(origin,t,this.arena));
      for(const enemy of foes.slice(0,3))
        this.addStatus(enemy,{kind:"slow",negative:true,remaining:1.4+tier*.3,sourceId:actor.id});
    }else if(core.reaction==="resonance"){
      const ally=target?.team===actor.team&&target.alive?target:actor;
      ally.shield=Math.min(ally.maxHp*.4,
        ally.shield+Math.round((10+tier*4)*this.power));
      this.addStatus(ally,{kind:"shield",remaining:3.5,sourceId:actor.id});
      actor.flux=clamp(actor.flux+7+tier*2,0,MAX_FLUX);
    }
    this.emit({type:"synergy",actorId:actor.id,targetId:origin?.id||actor.id,
      spellId:core.anchor,reaction:core.reaction,tier});
    this.log("SINGULARITY · "+core.reaction.toUpperCase()+"!");
  }
  heal(target,amount,source,spellId,periodic=false,relayed=false){
    if(!target?.alive)return;
    const rank=source?.talentRanks?.[spellId]||0;
    const crit=this.rollCrit(source,spellId,periodic?"hot":"heal");
    const scaled=Math.max(0,Math.round(amount*this.power*
      healMultiplier(spellId,rank)*(crit?CRIT_MULTIPLIER:1)*
      (1-this.dampening)*(source?.team==="enemy"?this.tuning.healing:1)));
    const given=Math.min(target.maxHp-target.hp,scaled);
    const hpBefore=target.hp;
    target.hp+=given;target.healthPct=target.hp/target.maxHp;
    if(given>0&&!relayed){
      const relay=target.statuses.find(q=>q.kind==="soul-relay"&&q.remaining>0);
      const partner=relay&&this.getActor(relay.partnerId);
      if(partner?.alive&&partner!==target&&partner.hp<partner.maxHp){
        const owner=this.getActor(relay.sourceId)||source;
        this.heal(partner,given*.28/Math.max(.01,this.power),owner,"soul-relay",true,true);
        if(owner)this.identityProc(owner,"soul-relay","healing-relay",partner);
      }
    }
    this.emit({type:"heal",actorId:source?.id||target.id,targetId:target.id,
      spellId,amount:given,overheal:scaled-given,hpBefore,hpAfter:target.hp,crit});
  }
  damage(target,amount,source,spellId,periodic=false){
    if(!target?.alive)return;
    // Level power scales damage for players AND AI; Rank selectively develops
    // damage spells and Marble Bag rolls crit (not CC, guards or movement).
    const rank=source?.talentRanks?.[spellId]||0;
    const crit=this.rollCrit(source,spellId,periodic?"dot":"damage");
    let value=amount*this.power*damageMultiplier(spellId,rank)*
      (crit?CRIT_MULTIPLIER:1)*(source?.team==="enemy"?this.tuning.damage:1);
    const dissonance=!periodic&&source.statuses.find(s=>s.kind==="dissonance"&&s.remaining>0);
    if(dissonance){
      value*=1-.18;
      source.statuses=source.statuses.filter(s=>s!==dissonance);
      const origin=this.getActor(dissonance.sourceId);
      if(origin)this.identityProc(origin,"resonance-cut","dissonance-absorbed",source);
    }
    if(!periodic&&source?.statuses?.some(q=>q.kind==="warpath"&&q.remaining>0)&&
      ["arc-strike","seismic-uppercut","gravity-hammer","phase-rush"].includes(spellId))
      value*=1.20;
    const hpBefore=target.hp,shieldBefore=target.shield,rawDamage=value;
    // Rampart only catches direct hostile, aimed, ranged projectiles
    // entering its front arc; never melee, ground AoE, DoT or self damage.
    const rampart=target.rampart;
    const projectile=(!periodic&&source?.team!==target.team&&
      (["flux-bolt","crystal-bolt","fracture-spear","sun-lance"].includes(spellId)||
       /^encounter-.*(bolt|projectile|shot|missile)$/i.test(spellId)));
    if(projectile&&rampart?.until>this.time&&rampart.charges>0){
      const dx=source.x-target.x,dy=source.y-target.y,mag=Math.hypot(dx,dy)||1;
      const facing=rampart.facing;
      if((dx*facing.x+dy*facing.y)/mag>=.28){
        rampart.stored=Math.min(target.maxHp*.5,rampart.stored+value);
        rampart.charges--;
        this.identityProc(target,"kinetic-rampart","rampart-catch",target);
        this.emit({type:"hit",actorId:source.id,targetId:target.id,spellId,
          amount:0,absorbed:Math.round(value),crit:false,rawDamage:value,
          hpBefore,hpAfter:target.hp,shieldBefore,shieldAfter:target.shield});
        if(rampart.charges===0)this.releaseRampart(target);
        return;
      }
    }
    const reprisal=target.statuses.find(q=>q.kind==="kinetic-reprisal"&&q.remaining>0);
    if(reprisal&&!periodic&&source?.team!==target.team){
      target.statuses=target.statuses.filter(q=>q!==reprisal);
      const blocked=Math.min(value,Math.min(reprisal.capacity,target.maxHp*.35));
      value-=blocked;
      this.evolutionProc(target,"arc-strike","kinetic-reprisal",source);
      if(source?.alive&&blocked>0)this.damage(source,Math.min(18,blocked*.32/this.power),
        target,"arc-strike");
    }
    const reflectingBarrier=target.statuses.find(s=>s.kind==="shield"&&
      s.spellId==="photon-barrier"&&s.evolution==="prismatic-return");
    const guard=target.statuses.find(s=>s.kind==="guard");
    if(guard)value*=1-guard.amount;
    const guardReduction=rawDamage-value;
    if(guardReduction>0&&guard?.evolution==="retaliation"&&
      guard.procGate<=0&&spellId!=="resonance-guard"){
      guard.procGate=.75;
      const owner=this.getActor(guard.sourceId);
      if(owner?.alive&&source?.alive&&source.team!==owner.team){
        this.damage(source,Math.min(12,guardReduction*.24/this.power),
          owner,"resonance-guard");
        this.evolutionProc(owner,"resonance-guard","retaliation",source);
      }
    }
    const absorbed=Math.min(target.shield,value);
    target.shield-=absorbed;
    value=Math.max(0,Math.round(value-absorbed));
    const genesisGuard=target.statuses.find(q=>q.kind==="shield"&&
      q.spellId==="resonance-guard"&&q.remaining>0);
    if(genesisGuard){
      const spent=Math.min(genesisGuard.absorbLeft||0,absorbed);
      genesisGuard.absorbLeft=Math.max(0,(genesisGuard.absorbLeft||0)-spent);
      genesisGuard.stored=Math.min(genesisGuard.capacity,(genesisGuard.stored||0)+spent);
    }
    // Soul Relay takes a bounded share of otherwise incoming HP damage and
    // distributes it to the linked ally without ever killing the recipient.
    const relay=target.statuses.find(q=>q.kind==="soul-relay"&&q.remaining>0);
    const partner=relay&&this.getActor(relay.partnerId);
    if(partner?.alive&&partner!==target&&value>0){
      const transferred=Math.max(0,Math.min(Math.round(value*.26),partner.hp-1));
      if(transferred>0){
        value-=transferred;
        const before=partner.hp;
        partner.hp-=transferred;partner.healthPct=partner.hp/partner.maxHp;
        this.emit({type:"hit",actorId:source.id,targetId:partner.id,
          spellId:"soul-relay",amount:transferred,absorbed:0,crit:false,
          hpBefore:before,hpAfter:partner.hp,shieldBefore:partner.shield,shieldAfter:partner.shield});
        const owner=this.getActor(relay.sourceId);
        if(owner)this.identityProc(owner,"soul-relay","damage-relay",partner);
      }
    }
    if(genesisGuard?.evolution==="last-stand"&&value>=target.hp&&target.hp>0){
      target.statuses=target.statuses.filter(q=>q!==genesisGuard);
      target.shield=Math.max(0,target.shield-(genesisGuard.absorbLeft||0));
      const owner=this.getActor(genesisGuard.sourceId);
      if(owner?.alive){
        const prior=target.hp;
        target.hp=Math.min(target.maxHp,Math.max(prior,1,Math.round(target.maxHp*.28)));
        target.healthPct=target.hp/target.maxHp;
        value=0;
        this.emit({type:"heal",actorId:owner.id,targetId:target.id,
          spellId:"resonance-guard",amount:target.hp-prior,hpBefore:prior,hpAfter:target.hp});
        this.evolutionProc(owner,"resonance-guard","last-stand",target);
      }
    }
    target.hp=Math.max(0,target.hp-value);target.healthPct=target.hp/target.maxHp;
    if(genesisGuard&&genesisGuard.absorbLeft<=0)
      this.releaseGenesisGuard(target,genesisGuard);
    this.emit({type:"hit",actorId:source.id,targetId:target.id,
      spellId,amount:Math.max(0,hpBefore-target.hp),absorbed,crit,
      rawDamage,guardReduction,guardActive:!!guard,
      hpBefore,hpAfter:target.hp,shieldBefore,shieldAfter:target.shield});
    if(absorbed>0&&shieldBefore>0&&target.shield<=0&&reflectingBarrier){
      // Consumed shield cannot reflect twice, even during nested proc damage.
      target.statuses=target.statuses.filter(s=>s!==reflectingBarrier);
      const owner=this.getActor(reflectingBarrier.sourceId);
      if(owner?.alive){
        this.evolutionProc(owner,"photon-barrier","prismatic-return",target);
        for(const foe of this.opponents(owner).filter(t=>distance(t,target)<155&&
            hasLineOfSight(target,t,this.arena)).slice(0,3))
          this.damage(foe,9,owner,"photon-barrier");
      }
    }
    if(target.hp<=0&&source?.pursuitTargetId===target.id&&
      source.pursuitUntil>=this.time&&source.pursuitChain<2){
      source.cooldowns["phase-rush"]=0;
      source.pursuitReadyUntil=this.time+4;
      this.evolutionProc(source,"phase-rush","relentless-pursuit",target);
      source.pursuitTargetId=null;
    }
    if(value>0){
      // Null Prison is break-on-damage incapacitate, never an unbreakable stun.
      const prison=target.statuses.find(s=>s.kind==="incapacitate");
      if(prison){
        this.emit({type:"break",actorId:source.id,targetId:target.id,spellId});
        target.statuses=target.statuses.filter(s=>s!==prison);
        const jailer=this.getActor(prison.sourceId);
        if(jailer?.alive){
          if(prison.spellId==="stasis-seal")this.releaseGenesisStasis(jailer,prison,target);
          if(prison.evolution==="void-anchor")
            this.addStatus(target,{kind:"slow",negative:true,remaining:2,sourceId:jailer.id});
          if(prison.evolution==="unstable-prison"&&spellId!=="null-prison"){
            this.evolutionProc(jailer,"null-prison","unstable-prison",target);
            for(const other of this.opponents(jailer).filter(a=>
              distance(a,target)<=125&&hasLineOfSight(target,a,this.arena)).slice(0,4))
              this.damage(other,6,jailer,"null-prison");
          }
        }
      }
      const thread=target.statuses.find(s=>s.kind==="reactive-thread");
      if(thread&&thread.procGate<=0){
        const healer=this.getActor(thread.sourceId);
        if(healer?.alive){
          const low=target.hp/target.maxHp<=.4&&thread.evolution==="emergency-weave";
          const pulse=thread.reactive*(low?1.5:1);
          this.heal(target,pulse,healer,"reactive-thread");
          thread.procGate=2;
          if(thread.evolution==="harmonic-thread"){
            const second=this.allies(healer).filter(a=>a!==target&&a.hp<a.maxHp&&
              distance(a,target)<=420).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
            if(second){
              this.heal(second,pulse*.45,healer,"reactive-thread");
              this.evolutionProc(healer,"reactive-thread","harmonic-thread",second);
            }
          }
        }
      }
    }
    if(!periodic&&value>0&&source?.evolutions?.["pulse-mend"]==="resonance"&&
      spellId!=="pulse-mend"&&spellId!=="resonance-guard"){
      source.mendCharge={until:this.time+8};
      this.evolutionProc(source,"pulse-mend","resonance-ready",source);
    }
    if(!periodic&&value>0&&source?.evolutions?.["entropy-mark"]==="collapse"&&
      spellId!=="entropy-mark"&&target.alive){
      const mark=target.statuses.find(q=>q.kind==="dot"&&q.spellId==="entropy-mark"&&
        q.sourceId===source.id&&q.tickCount>=2);
      if(mark){
        target.statuses=target.statuses.filter(q=>q!==mark);
        this.evolutionProc(source,"entropy-mark","collapse",target);
        this.damage(target,7+mark.tickCount*3,source,"entropy-mark");
      }
    }
    if(source.role==="melee"&&value>0&&["arc-strike","rift-slash","gravity-hammer"].includes(spellId)&&source.bonusFluxGate<=0){
      source.flux=clamp(source.flux+4,0,MAX_FLUX);source.bonusFluxGate=1;
    }
    const link=source.statuses.find(s=>s.kind==="link");
    if(link&&value>0&&link.procGate<=0){
      const enhanced=link.evolution==="amplified-link";
      const ally=this.getActor(link.linkedId);
      // A single direct hit creates ONE healing budget. Share it rather than
      // duplicating the total healing with Reciprocal Flow.
      if(ally?.alive){
        const budget=Math.min(enhanced?20:15,
          value*(enhanced?.44:.32)/this.power);
        if(link.evolution==="reciprocal-flow"&&ally!==source){
          this.heal(ally,budget*.5,source,"symbiosis-link");
          this.heal(source,budget*.5,source,"symbiosis-link");
          this.evolutionProc(source,"symbiosis-link","reciprocal-flow",ally);
        }else{
          this.heal(ally,budget,source,"symbiosis-link");
          if(link.evolution==="lingering-resonance"){
            this.addStatus(ally,{kind:"symbiosis-echo",remaining:2.1,sourceId:source.id,
              period:1,tickLeft:1,amount:Math.min(3,budget*.12)});
            this.evolutionProc(source,"symbiosis-link","lingering-resonance",ally);
          }
        }
      }
      link.procGate=enhanced?1:.45; // 20 base healing at most once per second
    }
    const secondHeart=target.statuses.find(q=>q.kind==="second-heart"&&
      (target.hp===0||target.hp/target.maxHp<=.3));
    if(secondHeart){
      target.statuses=target.statuses.filter(q=>q!==secondHeart);
      const healer=this.getActor(secondHeart.sourceId);
      if(healer?.alive){
        this.heal(target,Math.max(22,target.maxHp*.27)/Math.max(.01,this.power),
          healer,"pulse-mend",true);
        this.evolutionProc(healer,"pulse-mend","second-heart",target);
      }
    }
    if(target.hp===0){
      target.alive=false;target.cast=null;this.log(target.name+" eliminated!");
      this.emit({type:"death",actorId:target.id,targetId:target.id,
        killerId:source.id,spellId});
    }
  }
  // Keep walls solid, but allow actors to slide past one another like Pixi 3v3.
  // A gentle separation pass below discourages standing inside another orb.
  canOccupy(actor,x,y){
    return canStand(x,y,this.arena,ORB_COLLISION_RADIUS);
  }
  resolveActorSeparation(dt){
    const living=this.actors.filter(a=>a.alive);
    if(living.length<2||dt<=0)return;
    const shifts=new Map(living.map(actor=>[actor,{x:0,y:0}]));
    const maxStep=Math.min(3.2,68*dt);
    for(let i=0;i<living.length;i++){
      const a=living[i];
      for(let j=i+1;j<living.length;j++){
        const b=living[j];
        let dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
        const trigger=ORB_SEPARATION*1.04;
        if(dist>=trigger)continue;
        if(dist<.001){
          // Deterministic fallback when both actors have identical positions.
          const angle=(i*2.39996+j*.61803)%(Math.PI*2);
          dx=Math.cos(angle);dy=Math.sin(angle);dist=1;
        }
        const correction=Math.min(ORB_SEPARATION*1.08-dist,maxStep*2);
        const aLocked=Boolean(a.charge),bLocked=Boolean(b.charge);
        const aw=aLocked?0:(a===this.player?.18:1);
        const bw=bLocked?0:(b===this.player?.18:1);
        const total=aw+bw;
        if(total<=0)continue;
        const nx=dx/dist,ny=dy/dist;
        shifts.get(a).x-=nx*correction*aw/total;
        shifts.get(a).y-=ny*correction*aw/total;
        shifts.get(b).x+=nx*correction*bw/total;
        shifts.get(b).y+=ny*correction*bw/total;
      }
    }
    for(const actor of living){
      if(actor.charge)continue;
      const shift=shifts.get(actor),mag=Math.hypot(shift.x,shift.y);
      if(mag<.001)continue;
      const scale=Math.min(1,maxStep/mag);
      const dx=shift.x*scale,dy=shift.y*scale;
      if(this.canOccupy(actor,actor.x+dx,actor.y+dy)){
        actor.x+=dx;actor.y+=dy;
      }else{
        if(this.canOccupy(actor,actor.x+dx,actor.y))actor.x+=dx;
        if(this.canOccupy(actor,actor.x,actor.y+dy))actor.y+=dy;
      }
    }
  }
  move(actor,dx,dy,dt,speedOverride=null){
    if(!actor.alive||(actor.charge&&speedOverride===null)||
      this.isControlled(actor,"root")||this.isControlled(actor,"incapacitate"))return;
    const length=Math.hypot(dx,dy)||1;
    const speed=(speedOverride??174)*(this.isControlled(actor,"slow")?0.65:1)*
      (actor.statuses.some(s=>s.kind==="frost-momentum")?1.18:1);
    const xStep=dx/length*speed*dt,yStep=dy/length*speed*dt;
    let mx=0,my=0;
    if(dx||dy){
      if(this.canOccupy(actor,actor.x+xStep,actor.y)){actor.x+=xStep;mx=xStep;}
      if(this.canOccupy(actor,actor.x,actor.y+yStep)){actor.y+=yStep;my=yStep;}
    }
    actor.lastMove={x:mx/(speed*dt||1),y:my/(speed*dt||1)};
  }
  dash(actor,dir,distancePx){
    if(this.isControlled(actor,"root")||this.isControlled(actor,"incapacitate"))return;
    const length=Math.hypot(dir.x,dir.y)||1;
    const from={x:actor.x,y:actor.y};
    const step=7,steps=Math.ceil(distancePx/step);
    for(let i=0;i<steps;i++){
      const stepPx=Math.min(step,distancePx-i*step);
      const x=actor.x+dir.x/length*stepPx,y=actor.y+dir.y/length*stepPx;
      if(!this.canOccupy(actor,x,y))break;
      actor.x=x;actor.y=y;
    }
    actor.dashGate=1.3;
    this.emit({type:"dash",actorId:actor.id,spellId:actor.dashSpellId||"vector-rush",
      fromX:from.x,fromY:from.y,toX:actor.x,toY:actor.y});
  }
  finishCharge(actor){
    const charge=actor.charge;
    if(!charge)return;
    actor.charge=null;
    const target=this.getActor(charge.targetId);
    this.emit({type:"charge-impact",actorId:actor.id,
      targetId:target?.alive?target.id:null,spellId:charge.spellId,
      x:actor.x,y:actor.y});
    if(!target?.alive)return;
    const evo=actor.evolutions[charge.spellId];
    if(evo==="meteor-charge"){
      this.evolutionProc(actor,"phase-rush","meteor-charge",target);
      for(const foe of this.opponents(actor).filter(e=>
        distance(e,actor)<165&&hasLineOfSight(actor,e,this.arena)).slice(0,7))
        this.damage(foe,20,actor,"phase-rush");
    }else if(evo==="piercing-charge"){
      const dx=target.x-charge.fromX,dy=target.y-charge.fromY,len=Math.hypot(dx,dy)||1;
      const ux=dx/len,uy=dy/len;
      for(const foe of this.opponents(actor).filter(e=>e!==target).slice(0,12)){
        const fx=foe.x-target.x,fy=foe.y-target.y;
        const ahead=fx*ux+fy*uy,side=Math.abs(fx*uy-fy*ux);
        if(ahead>0&&ahead<320&&side<66&&hasLineOfSight(target,foe,this.arena)){
          this.damage(foe,18,actor,"phase-rush");
          this.evolutionProc(actor,"phase-rush","piercing-charge",foe);
        }
      }
    }else if(evo==="relentless-pursuit"){
      actor.pursuitTargetId=target.id;
      actor.pursuitUntil=this.time+3;
    }
    if(evo==="impact"){
      actor.rushEmpower={until:this.time+5};
      this.evolutionProc(actor,charge.spellId,"impact-charge",target);
    }else if(evo==="disruption"&&distance(actor,target)<=105){
      this.addStatus(target,{kind:"slow",negative:true,remaining:2.2,sourceId:actor.id});
      this.evolutionProc(actor,charge.spellId,"disruption",target);
    }
  }
  updateCharge(actor,dt){
    const charge=actor.charge;
    if(!charge)return;
    const target=this.getActor(charge.targetId);
    charge.elapsed+=dt;
    if(!target?.alive||this.isControlled(actor,"root")||
      this.isControlled(actor,"incapacitate")){this.finishCharge(actor);return;}
    const dist=distance(actor,target);
    if(dist<=ORB_SEPARATION+5||charge.elapsed>=.9){
      this.finishCharge(actor);return;
    }
    const before={x:actor.x,y:actor.y};
    // Simulated charge travel instead of an instant teleport.
    const travel=Math.min(880*dt,dist-ORB_SEPARATION-5);
    this.move(actor,target.x-actor.x,target.y-actor.y,travel/880,880);
    const advanced=distance(actor,before);
    if(advanced<.01){this.finishCharge(actor);return;}
    charge.trailClock=(charge.trailClock||0)+dt;
    if(charge.trailClock>=.07){
      charge.trailClock=0;
      this.emit({type:"charge-trail",actorId:actor.id,
        spellId:charge.spellId,x:actor.x,y:actor.y});
    }
    if(distance(actor,target)<=ORB_SEPARATION+5)this.finishCharge(actor);
  }
  releaseRampart(actor){
    const r=actor.rampart;
    if(!r)return;
    actor.rampart=null;
    this.identityProc(actor,"kinetic-rampart","rampart-volley",actor);
    const foes=this.opponents(actor).filter(e=>hasLineOfSight(actor,e,this.arena))
      .sort((a,b)=>distance(a,actor)-distance(b,actor)).slice(0,4);
    for(const foe of foes)this.damage(foe,7+(r.stored/Math.max(1,foes.length))*.30/
      Math.max(.01,this.power),actor,"kinetic-rampart");
  }
  resolveGravityHammer(actor,point,r){
    const radius=r.area;
    this.evolutionProc(actor,"gravity-hammer","gravity-impact",null,point.x,point.y);
    const foes=this.opponents(actor).filter(e=>distance(e,point)<=radius&&
      hasLineOfSight(point,e,this.arena)).slice(0,12);
    for(const foe of foes){
      this.damage(foe,r.amount,actor,"gravity-hammer");
      if(!foe.boss&&!foe.elite&&actor.evolutions["gravity-hammer"]!=="singularity-impact")
        this.applyCC(foe,"incapacitate",.6,actor,"gravity-hammer");
    }
    const evo=actor.evolutions["gravity-hammer"];
    if(evo==="seismic-wave"){
      for(const [i,ring]of [radius+55,radius+135,radius+215].entries())
        this.scheduleEvolution(actor,"gravity-hammer","seismic-wave",
          point.x,point.y,.25+i*.23,8,ring,{minRadius:ring-95});
    }else if(evo==="gravity-well"){
      for(const i of [1,2,3,4])
        this.scheduleEvolution(actor,"gravity-hammer","gravity-well",
          point.x,point.y,i*.7,6,radius+50);
    }
    this.emit({type:"ability",actorId:actor.id,spellId:"gravity-hammer",
      x:point.x,y:point.y,targetId:foes[0]?.id||null});
  }
  // Genesis uses a real finite absorb pool, not percentage mitigation.
  applyGenesisShield(owner,target,rule,scale=1){
    const before=target.shield,capacity=Math.round(rule.amount*this.power*scale);
    target.shield=Math.max(target.shield,capacity);
    this.addStatus(target,{kind:"shield",spellId:"resonance-guard",sourceId:owner.id,
      remaining:rule.duration,capacity,absorbLeft:capacity,stored:0,
      evolution:owner.evolutions["resonance-guard"]||null});
    this.emit({type:"shield",actorId:owner.id,targetId:target.id,
      spellId:"resonance-guard",amount:target.shield-before,
      shieldBefore:before,shieldAfter:target.shield});
  }
  releaseGenesisGuard(target,status){
    if(status.dischargeDone)return;
    status.dischargeDone=true;
    const owner=this.getActor(status.sourceId);
    if(owner?.alive&&status.evolution==="retaliation"&&(status.stored||0)>0){
      const foes=this.opponents(owner).filter(e=>distance(e,target)<490&&
        hasLineOfSight(target,e,this.arena)).slice(0,3);
      for(const foe of foes)this.damage(foe,
        Math.min(20,status.stored*.35/Math.max(1,foes.length))/
        Math.max(.01,this.power),owner,"resonance-guard");
      this.evolutionProc(owner,"resonance-guard","retaliation",target);
    }
    if(status.absorbLeft<=0)target.statuses=target.statuses.filter(q=>q!==status);
  }
  releaseGenesisStasis(owner,status,target){
    if(status.spellId!=="stasis-seal"||status.released)return;
    status.released=true;
    if(status.evolution==="mercy-bloom"){
      const injured=this.allies(owner).filter(a=>a.hp<a.maxHp)
        .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
      if(injured[0]){
        this.heal(injured[0],24,owner,"stasis-seal");
        this.evolutionProc(owner,"stasis-seal","mercy-bloom",injured[0]);
      }
    }
  }
  addStatus(target,entry) {
    // One shared Photon Barrier pool is intentionally non-stacking: every
    // refresh replaces the prior timer, even if a different ally cast it.
    // Otherwise an expired older shield timer can erase a newer shield.
    target.statuses=target.statuses.filter(s=>
      entry.kind==="shield"?s.kind!=="shield":
      entry.kind==="dot"&&s.kind==="dot"?
        s.sourceId!==entry.sourceId||s.spellId!==entry.spellId:
      s.kind!==entry.kind||s.sourceId!==entry.sourceId);
    target.statuses.push(entry);
  }
  applyCC(target,category,duration,source,spellId) {
    if(spellId==="stasis-seal"&&target.boss){
      this.emit({type:"immune",actorId:source.id,targetId:target.id,spellId});
      return;
    }
    if(spellId==="stasis-seal"&&target.elite)duration=Math.min(duration,3);
    const dr=target.dr[category]||{level:0,resetAt:0};
    if(this.time>dr.resetAt)dr.level=0;
    const scale=[1,.5,0][Math.min(2,dr.level)];
    if(scale<=0){this.emit({type:"immune",actorId:source.id,targetId:target.id,spellId});return;}
    const value=duration*scale;
    target.statuses=target.statuses.filter(s=>s.kind!==category);
    target.statuses.push({kind:category,negative:true,remaining:value,sourceId:source.id,
      spellId,evolution:source.evolutions[spellId]||null,
      ...(spellId==="stasis-seal"&&source.evolutions[spellId]==="essence-siphon"?
        {period:1,tickLeft:1}: {})});
    dr.level=Math.min(2,dr.level+1);
    dr.resetAt=this.time+value+20;
    target.dr[category]=dr;
    if(category==="incapacitate")target.cast=null;
    if(spellId==="stasis-seal"&&source.evolutions[spellId]==="tranquility-wave"){
      for(const foe of this.opponents(source).filter(a=>a!==target&&!a.boss&&
        distance(a,target)<165&&hasLineOfSight(target,a,this.arena)).slice(0,5))
        this.applyCC(foe,category,Math.min(2,duration*.45),source,"stasis-wave");
      this.evolutionProc(source,spellId,"tranquility-wave",target);
    }
    if(category==="root"&&spellId==="crystal-snare"&&
      source.evolutions[spellId]==="frost-momentum"){
      this.addStatus(source,{kind:"frost-momentum",remaining:3,sourceId:source.id});
      this.evolutionProc(source,spellId,"frost-momentum",source);
    }
    this.emit({type:"control",actorId:source.id,targetId:target.id,
      spellId,ccKind:category,duration:value,drScale:scale});
  }
  resolveZenith(actor,target,position,rule){
    const foes=this.opponents(actor).filter(t=>distance(t,position)<=rule.area&&
      hasLineOfSight(position,t,this.arena)).sort((a,b)=>
      (a===target?-1:b===target?1:distance(a,position)-distance(b,position))).slice(0,6);
    this.evolutionProc(actor,"zenith-crash","zenith-impact",null,position.x,position.y);
    for(const [index,foe] of foes.entries())
      this.damage(foe,rule.amount*(index===0?1:.42),actor,"zenith-crash");
    if(actor.evolutions["zenith-crash"]==="solar-aftershock"){
      this.scheduleEvolution(actor,"zenith-crash","solar-aftershock",
        position.x,position.y,.85,rule.amount*.45,rule.area);
      this.evolutionProc(actor,"zenith-crash","solar-aftershock-ready",null,position.x,position.y);
    }else if(actor.evolutions["zenith-crash"]==="burning-ground"){
      for(let tick=1;tick<=3;tick++)
        this.scheduleEvolution(actor,"zenith-crash","burning-ground",
          position.x,position.y,tick,5.5,rule.area);
      this.evolutionProc(actor,"zenith-crash","burning-ground",null,position.x,position.y);
    }
    if(!foes.length)this.log("ZENITH CRASH · EVADED");
    // A dodged Zenith still spends its cast/cooldown but must not trigger
    // a free damaging Singularity around the player when no enemy was hit.
    if(foes.length)this.handleSingularityCast(actor,"zenith-crash",foes[0]);
    this.emit({type:"ability",actorId:actor.id,targetId:foes[0]?.id||null,
      spellId:"zenith-crash"});
  }
  execute(actor,spellId,targetId,castContext=null) {
    const r=this.rule(actor,spellId);
    // A cast must stay bound to its original target after wind-up. In the
    // previous code a dead ally triggered currentTarget()'s self fallback:
    // Pulse Mend silently overhealed the player instead of reporting a miss.
    const target=targetId?this.getActor(targetId):this.currentTarget(actor,r.mode);
    const supportive=["heal","guard","shield","hot","link","cleanse","team-heal","recall","relay","rampart"].includes(r.mode);
    const wrongTeam=target&&(r.mode==="hybrid"?false:
      supportive?target.team!==actor.team:target.team===actor.team);
    const recallReactivation=spellId==="vital-recall"&&this.allies(actor).some(a=>
      a.statuses.some(s=>s.kind==="vital-recall"&&s.sourceId===actor.id&&s.remaining>0));
    const reason= r.mode==="dash"||r.mode==="rampart"||(r.mode==="ground"&&castContext?.impact)||(spellId==="zenith-crash"&&castContext?.impact)?
      null:!target?.alive?"TARGET DIED"
      :wrongTeam?"INVALID TARGET"
      :!recallReactivation&&distance(actor,target)>(r.range||490)?"OUT OF RANGE"
      :!recallReactivation&&!hasLineOfSight(actor,target,this.arena)?"LINE OF SIGHT":null;
    if(reason){
      // Cast spent its GCD/time, but a spell that never connected does
      // not consume its Flux. This is a fizzle, NOT a hidden self-heal.
      actor.flux=clamp(actor.flux+this.cost(actor,r,spellId),0,MAX_FLUX);
      this.emit({type:"fizzle",actorId:actor.id,targetId:targetId||null,
        spellId,reason});
      if(actor===this.player)this.log((ABILITY_BY_ID[spellId]?.name||spellId)
        +": "+reason+" — Flux refunded");
      return;
    }
    // Only a completed, valid cast starts cooldown. Fizzled or interrupted
    // casted spells stay available once the short school lock wears off.
    if(r.cast&&r.cd)actor.cooldowns[spellId]=r.cd;
    if(spellId==="gravity-hammer"){
      this.resolveGravityHammer(actor,castContext?.impact||{x:target.x,y:target.y},r);
      return;
    }
    if(spellId==="zenith-crash"){
      this.resolveZenith(actor,target,castContext?.impact||{x:target.x,y:target.y},r);
      return;
    }
    if(spellId==="pulse-mend"&&r.mode==="hybrid"&&target.team!==actor.team){
      this.damage(target,23,actor,spellId);
      this.identityProc(actor,spellId,"vital-reversal",target);
      for(const ally of this.allies(actor)){
        if(ally.hp<ally.maxHp)this.heal(ally,22,actor,spellId);
        const guard=ally.statuses.find(q=>q.kind==="shield"&&
          q.spellId==="resonance-guard"&&q.remaining>0);
        if(guard){
          const restore=Math.max(0,Math.min(
            Math.round(guard.capacity*.22),guard.capacity-guard.absorbLeft));
          guard.absorbLeft+=restore;
          const before=ally.shield;ally.shield+=restore;
          if(restore>0)this.emit({type:"shield",actorId:actor.id,targetId:ally.id,
            spellId:"resonance-guard",amount:restore,shieldBefore:before,
            shieldAfter:ally.shield});
        }
      }
      this.emit({type:"ability",actorId:actor.id,targetId:target.id,spellId});
      return;
    }
    if(spellId==="kinetic-rampart"){
      if(actor.rampart?.until>this.time)this.releaseRampart(actor);
      else {
        const foes=this.opponents(actor);
        const nearest=foes.sort((a,b)=>distance(a,actor)-distance(b,actor))[0];
        const dx=nearest?nearest.x-actor.x:(actor.lastMove.x||1);
        const dy=nearest?nearest.y-actor.y:(actor.lastMove.y||0);
        const len=Math.hypot(dx,dy)||1;
        actor.rampart={until:this.time+r.duration,charges:3,stored:0,
          facing:{x:dx/len,y:dy/len}};
        this.identityProc(actor,spellId,"rampart-start",actor);
      }
      this.emit({type:"ability",actorId:actor.id,targetId:actor.id,spellId});
      return;
    }
    if(spellId==="vital-cascade"){
      const recipients=this.allies(actor);
      for(const ally of recipients.filter(a=>a.hp<a.maxHp)){
        this.heal(ally,ally===target?r.amount:r.amount*.78,actor,spellId);
        if(actor.evolutions[spellId]==="rejuvenating-orbit"){
          this.addStatus(ally,{kind:"rejuvenating-orbit",sourceId:actor.id,
            spellId,remaining:6,period:1,tickLeft:1,amount:5});
          this.evolutionProc(actor,spellId,"rejuvenating-orbit",ally);
        }
      }
      if(actor.evolutions[spellId]==="double-cascade")
        this.scheduleEvolution(actor,spellId,"double-cascade",actor.x,actor.y,.65,20,0);
      if(actor.evolutions[spellId]==="life-transfer"){
        const needy=recipients.filter(a=>a.hp<a.maxHp)
          .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
        const donor=recipients.filter(a=>a!==needy&&a.hp/a.maxHp>.72)
          .sort((a,b)=>b.hp/b.maxHp-a.hp/a.maxHp)[0];
        if(needy&&donor){
          const transfer=Math.max(0,Math.min(donor.hp-donor.maxHp*.55,donor.maxHp*.14));
          donor.hp-=transfer;donor.healthPct=donor.hp/donor.maxHp;
          this.heal(needy,transfer/Math.max(.01,this.power),actor,spellId);
          this.evolutionProc(actor,spellId,"life-transfer",needy);
        }
      }
      this.identityProc(actor,spellId,"team-cascade",target);
      this.emit({type:"ability",actorId:actor.id,targetId:target.id,spellId});
      return;
    }
    if(spellId==="vital-recall"){
      const active=this.allies(actor).map(ally=>({ally,status:ally.statuses.find(q=>
        q.kind==="vital-recall"&&q.sourceId===actor.id)})).find(q=>q.status);
      if(active){
        active.ally.statuses=active.ally.statuses.filter(q=>q!==active.status);
        const lost=Math.max(0,active.status.startHp-active.ally.hp);
        if(lost>0)this.heal(active.ally,Math.min(lost*.75,active.ally.maxHp*.5)/
          Math.max(.01,this.power),actor,spellId);
        this.identityProc(actor,spellId,"recall-release",active.ally);
      }else{
        this.addStatus(target,{kind:"vital-recall",spellId,sourceId:actor.id,
          remaining:r.duration,startHp:target.hp});
        this.identityProc(actor,spellId,"recall-anchor",target);
      }
      this.emit({type:"ability",actorId:actor.id,targetId:target?.id||null,spellId});
      return;
    }
    if(spellId==="soul-relay"){
      const pending=actor.relayPending?.until>this.time?actor.relayPending:null;
      if(!pending){
        actor.relayPending={firstId:target.id,until:this.time+7};
        this.identityProc(actor,spellId,"relay-select-first",target);
        if(actor===this.player)this.log("SOUL RELAY · Choose another ally and cast again.");
      }else{
        const first=this.getActor(pending.firstId);
        if(first?.alive&&first!==target){
          const duration=r.duration;
          this.addStatus(first,{kind:"soul-relay",spellId,sourceId:actor.id,
            partnerId:target.id,remaining:duration});
          this.addStatus(target,{kind:"soul-relay",spellId,sourceId:actor.id,
            partnerId:first.id,remaining:duration});
          actor.relayPending=null;actor.cooldowns[spellId]=r.cd;
          this.emit({type:"link",actorId:actor.id,targetId:target.id,spellId});
          this.identityProc(actor,spellId,"relay-linked",target);
        }else if(actor===this.player)this.log("SOUL RELAY · Choose a different living ally.");
      }
      this.emit({type:"ability",actorId:actor.id,targetId:target?.id||null,spellId});
      return;
    }
    if(r.mode==="dash"){
      const direction=actor.control==="player"?this.dashDirection||{x:1,y:0}:{x:actor.team==="friendly"?1:-1,y:0};
      actor.dashSpellId=spellId;
      const previous={x:actor.x,y:actor.y};
      this.dash(actor,direction,r.distance);
      if(spellId==="phase-slip"){
        if(actor.evolutions[spellId]==="residual-field"){
          this.scheduleEvolution(actor,spellId,"residual-field",previous.x,previous.y,
            .12,0,115,{slowDuration:1.8});
          this.scheduleEvolution(actor,spellId,"residual-field",previous.x,previous.y,
            .8,0,115,{slowDuration:1.8});
          this.evolutionProc(actor,spellId,"residual-field",null,previous.x,previous.y);
        }
        const slows=actor.statuses.filter(status=>status.kind==="slow");
        if(slows.length){
          actor.statuses=actor.statuses.filter(status=>status.kind!=="slow");
          this.identityProc(actor,spellId,"phase-escape",null,actor.x,actor.y);
        }
      }
      if(spellId==="vector-rush"){
        const evo=actor.evolutions[spellId];
        if(evo==="kinetic-shield"){
          const before=actor.shield;
          actor.shield=Math.min(actor.maxHp*.4,actor.shield+Math.round(actor.maxHp*.11));
          this.addStatus(actor,{kind:"shield",remaining:3.5,sourceId:actor.id,spellId});
          this.emit({type:"shield",actorId:actor.id,targetId:actor.id,spellId,
            amount:actor.shield-before,shieldBefore:before,shieldAfter:actor.shield});
        }else if(evo==="shock-trail"){
          for(const t of [.25,.5,.75]){
            const x=previous.x+(actor.x-previous.x)*t;
            const y=previous.y+(actor.y-previous.y)*t;
            this.scheduleEvolution(actor,spellId,"shock-trail",x,y,.12,6,62);
            this.scheduleEvolution(actor,spellId,"shock-trail",x,y,1.0,5,62);
          }
          this.evolutionProc(actor,spellId,"shock-trail",null,actor.x,actor.y);
        }
      }
      if(actor.evolutions[spellId]==="phase-shield"){
        const prev=actor.shield;
        actor.shield=Math.min(actor.maxHp*.4,
          actor.shield+Math.round(12*this.power));
        this.addStatus(actor,{kind:"shield",remaining:3.5,sourceId:actor.id});
        this.emit({type:"shield",actorId:actor.id,targetId:actor.id,
          spellId,amount:actor.shield-prev,shieldBefore:prev,shieldAfter:actor.shield});
      }
    }else if(r.mode==="rush"){
      // Charge travels visibly over several simulation ticks, tracking the
      // target while respecting walls and every other orb's collision.
      actor.charge={targetId:target.id,spellId,elapsed:0,trailClock:0,
        fromX:actor.x,fromY:actor.y};
      if(!actor.pursuitReadyUntil||actor.pursuitReadyUntil<this.time)
        actor.pursuitChain=0;
      else actor.pursuitChain=(actor.pursuitChain||0)+1;
      actor.pursuitReadyUntil=0;
      actor.dashGate=1.3;
      this.emit({type:"charge-start",actorId:actor.id,targetId:target.id,
        spellId,x:actor.x,y:actor.y});
      if(distance(actor,target)<=ORB_SEPARATION+5)this.finishCharge(actor);
    }else if(r.mode==="interrupt"){
      if(target.cast){
        const interrupted=target.cast.spellId,
          discipline=ABILITY_BY_ID[interrupted]?.discipline||
            (interrupted.startsWith("encounter-")?"void":null);
        target.cast=null;
        const evo=actor.evolutions[spellId];
        if(discipline)target.schoolLocks[discipline]=evo==="suppression"?4.5:3;
        this.emit({type:"interrupt",actorId:actor.id,targetId:target.id,
          spellId,interruptedSpell:interrupted,interruptedSchool:discipline,
          schoolLockSeconds:discipline?target.schoolLocks[discipline]:0,
          interruptedCooldownRemaining:target.cooldowns[interrupted]||0});
        const masteryFlux=successfulInterruptFlux(spellId,actor.talentRanks[spellId]||0);
        const evolutionFlux=actor.evolutions[spellId]==="flux-siphon"||actor.evolutions[spellId]==="siphon"?12:0;
        actor.flux=clamp(actor.flux+masteryFlux+evolutionFlux,0,MAX_FLUX);
        if(spellId==="pulse-sever"){
          // Melee counter: rewards stopping a cast *in melee*, never on a fake kick.
          this.damage(target,8,actor,spellId);
          this.identityProc(actor,spellId,"counterstrike",target);
        }else if(spellId==="resonance-cut"){
          // Ranged disruption: no free melee damage, instead weakens the
          // victim's NEXT non-periodic damaging attack within five seconds.
          this.addStatus(target,{kind:"dissonance",negative:true,remaining:5,sourceId:actor.id});
          this.identityProc(actor,spellId,"dissonance",target);
        }
        if(evo==="echo-sever"){
          for(const foe of this.opponents(actor).filter(t=>t!==target&&!t.boss&&
            t.cast&&distance(t,target)<180&&hasLineOfSight(target,t,this.arena)).slice(0,5)){
            const interruptedOther=foe.cast.spellId;
            foe.cast=null;
            const school=ABILITY_BY_ID[interruptedOther]?.discipline||"void";
            foe.schoolLocks[school]=Math.max(foe.schoolLocks[school]||0,2.5);
            this.emit({type:"interrupt",actorId:actor.id,targetId:foe.id,
              spellId,interruptedSpell:interruptedOther});
            this.evolutionProc(actor,spellId,"echo-sever",foe);
          }
        }
        if(evo==="countershock"){
          this.evolutionProc(actor,spellId,"countershock",target);
          for(const foe of this.opponents(actor).filter(t=>distance(t,target)<165&&
            hasLineOfSight(target,t,this.arena)).slice(0,8))
            this.damage(foe,15,actor,spellId);
        }
        if(evo==="warpath"){
          this.addStatus(actor,{kind:"warpath",sourceId:actor.id,remaining:4});
          this.evolutionProc(actor,spellId,"warpath",actor);
        }
        if(evo==="shockwave"){
          this.evolutionProc(actor,spellId,"interrupt-shockwave",target);
          for(const foe of this.opponents(actor).filter(t=>
            distance(t,target)<135&&hasLineOfSight(target,t,this.arena)).slice(0,4))
            this.damage(foe,11,actor,spellId);
        }
        if(evo==="disruptive-wake"){
          this.addStatus(target,{kind:"slow",negative:true,remaining:3,sourceId:actor.id});
          this.evolutionProc(actor,spellId,"disruptive-wake",target);
        }
        this.log(actor.name+" interrupted "+target.name);
      }else this.emit({type:"nothing",actorId:actor.id,targetId:target.id,spellId,message:"NO CAST TO INTERRUPT"});
    }else if(r.mode==="heal"||r.mode==="hybrid"){
      let amount=r.amount;
      if(spellId==="pulse-mend"&&castContext?.crescendoHeld){
        amount*=1.78;
        this.evolutionProc(actor,spellId,"vital-crescendo",target);
      }
      if(spellId==="pulse-mend"&&actor.mendCharge?.until>this.time){
        amount*=1.23;
        actor.mendCharge=null;
        this.evolutionProc(actor,spellId,"resonance",target);
      }
      this.heal(target,amount,actor,spellId);
      if(spellId==="pulse-mend"&&actor.evolutions[spellId]==="second-heart"){
        this.addStatus(target,{kind:"second-heart",spellId,sourceId:actor.id,remaining:12});
        this.evolutionProc(actor,spellId,"second-heart-armed",target);
      }
      if(actor.evolutions[spellId]==="preservation"){
        const before=target.shield;
        target.shield=Math.min(target.maxHp*.4,
          target.shield+Math.round(r.amount*this.power*.22));
        this.addStatus(target,{kind:"shield",remaining:3.5,sourceId:actor.id});
        this.emit({type:"shield",actorId:actor.id,targetId:target.id,
          spellId,amount:target.shield-before,shieldBefore:before,shieldAfter:target.shield});
      }
    }else if(r.mode==="guard"){
      const evolution=actor.evolutions[spellId]||null;
      this.addStatus(target,{kind:"guard",remaining:r.duration,
        amount:Math.min(.6,r.amount),sourceId:actor.id,evolution,procGate:0});
      this.emit({type:"guard",actorId:actor.id,targetId:target.id,
        spellId,guardPercent:r.amount,duration:r.duration});
      if(evolution==="harmonic-field"){
        const ally=this.allies(actor).filter(a=>a!==target&&
          distance(a,target)<230).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
        if(ally){
          this.addStatus(ally,{kind:"guard",remaining:r.duration,
            amount:r.amount*.47,sourceId:actor.id,procGate:0});
          this.emit({type:"guard",actorId:actor.id,targetId:ally.id,
            spellId,guardPercent:r.amount*.47,duration:r.duration});
          this.evolutionProc(actor,spellId,"harmonic-field",ally);
        }
      }
    }
    else if(r.mode==="shield"){
      if(spellId==="resonance-guard"){
        this.applyGenesisShield(actor,target,r);
        if(actor.evolutions[spellId]==="guardian-network"){
          for(const ally of this.allies(actor).filter(a=>a!==target)){
            this.applyGenesisShield(actor,ally,r,.42);
            this.evolutionProc(actor,spellId,"guardian-network",ally);
          }
        }
        this.emit({type:"ability",actorId:actor.id,targetId:target.id,spellId});
        return;
      }
      const shieldBefore=target.shield;
      target.shield=Math.max(target.shield,Math.round(r.amount*this.power*
        shieldMultiplier(spellId,actor.talentRanks[spellId]||0)));
      this.addStatus(target,{kind:"shield",remaining:r.duration,sourceId:actor.id,
        spellId,evolution:actor.evolutions[spellId]||null});
      this.emit({type:"shield",actorId:actor.id,targetId:target.id,
        spellId,amount:target.shield-shieldBefore,shieldBefore,shieldAfter:target.shield});
      if(actor.evolutions[spellId]==="shared-light"){
        const second=this.allies(actor).filter(a=>a!==target&&distance(a,target)<225)
          .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
        if(second){
          const before=second.shield;
          second.shield=Math.max(second.shield,Math.round(r.amount*this.power*.45));
          this.addStatus(second,{kind:"shield",remaining:r.duration,sourceId:actor.id,spellId});
          this.emit({type:"shield",actorId:actor.id,targetId:second.id,spellId,
            amount:second.shield-before,shieldBefore:before,shieldAfter:second.shield});
          this.evolutionProc(actor,spellId,"shared-light",second);
        }
      }
    }
    else if(r.mode==="damage"){
      let amount=r.amount;
      const debuffed=this.debuffed(target);
      if(r.requiresDebuff&&debuffed)amount*=1.25;
      if(r.controlBonus&&(this.isControlled(target,"root")||this.isControlled(target,"slow")))amount*=1+r.controlBonus;
      if(actor.fracturedCharge?.until>this.time&&spellId!=="rift-slash"){
        amount*=1.2;actor.fracturedCharge=null;
        this.evolutionProc(actor,"rift-slash","fractured-edge",target);
      }
      if(actor.brittleCharge?.until>this.time&&spellId!=="crystal-bolt"){
        amount*=1.17;actor.brittleCharge=null;
        this.evolutionProc(actor,"crystal-bolt","brittle-core",target);
      }
      if(actor.evolutions[spellId]==="singularity-impact")amount*=1.2;
      if(spellId==="sun-lance"&&target.hp/target.maxHp<=.35){
        amount*=1.18;
        this.identityProc(actor,spellId,"precision-execute",target);
      }
      let overdriveFollowup=0;
      if(spellId==="arc-strike"){
        const rhythm=actor.arcRhythm;
        const second=rhythm&&this.time<=rhythm.until;
        actor.arcRhythm=second?null:{until:this.time+4};
        if(second){
          amount*=1.16; // A visible two-hit combo, not a new action bar spell.
          actor.flux=clamp(actor.flux+3,0,MAX_FLUX);
          this.identityProc(actor,spellId,"arc-second-strike",target);
          const evo=actor.evolutions[spellId];
          if(evo==="overdrive"){overdriveFollowup=amount*.30;amount*=.40;}
          if(evo==="kinetic-reprisal"){
            this.addStatus(actor,{kind:"kinetic-reprisal",sourceId:actor.id,
              remaining:3,capacity:Math.min(actor.maxHp*.35,48*this.power)});
            this.evolutionProc(actor,spellId,"kinetic-reprisal-ready",actor);
          }
        }
      }
      if(spellId==="gravity-hammer"&&actor.evolutions[spellId]==="seismic-wave")amount*=.78;
      if(actor.rushEmpower&&this.time<=actor.rushEmpower.until&&
        ["arc-strike","rift-slash","gravity-hammer"].includes(spellId)){
        amount*=1.28;actor.rushEmpower=null;
        this.evolutionProc(actor,"phase-rush","impact-charge",target);
      }
      if(actor.crossDisciplineCharge&&this.time<=actor.crossDisciplineCharge.until&&
        ABILITY_BY_ID[spellId]?.discipline!==actor.crossDisciplineCharge.discipline){
        amount*=1.22;actor.crossDisciplineCharge=null;
        this.evolutionProc(actor,"flux-bolt","fractured-energy",target);
      }
      if(actor.resonantStrikeCharge&&this.time<=actor.resonantStrikeCharge.until&&
        spellId!=="arc-strike"){
        amount*=1.20;actor.resonantStrikeCharge=null;
        this.evolutionProc(actor,"arc-strike","resonant-strike",target);
      }
      if(spellId==="arc-strike")
        actor.strikeSwingCounter=(actor.strikeSwingCounter||0)+1;
      if(spellId==="zenith-crash")
        this.evolutionProc(actor,spellId,"zenith-impact",target);
      const targetHpBefore=target.hp;
      this.damage(target,amount,actor,spellId);
      const effectiveDamage=Math.max(0,targetHpBefore-target.hp);
      if(overdriveFollowup>0){
        this.evolutionProc(actor,spellId,"overdrive",target);
        for(const [i,delay]of [.11,.24].entries())
          this.scheduleEvolution(actor,spellId,"overdrive-hit",target.x,target.y,
            delay,overdriveFollowup,0,{targetId:target.id});
      }
      if(spellId==="seismic-uppercut"){
        const launchable=!target.boss&&!target.elite;
        if(launchable)this.applyCC(target,"incapacitate",.65,actor,spellId);
        this.evolutionProc(actor,spellId,launchable?"uppercut-launch":"uppercut-fracture",target);
        this.scheduleEvolution(actor,spellId,"uppercut-crash",target.x,target.y,
          .42,18,148);
      }
      if(r.slow)this.addStatus(target,{kind:"slow",negative:true,remaining:r.slowTime,sourceId:actor.id});
      if(spellId==="arc-strike"){
        const evo=actor.evolutions[spellId];
        if(evo==="twin-arc"){
          actor.arcCount++;
          if(actor.arcCount%3===0){
            this.evolutionProc(actor,spellId,"twin-arc",target);
            for(const enemy of this.opponents(actor).filter(e=>e!==target&&
              distance(e,actor)<155&&hasLineOfSight(actor,e,this.arena)).slice(0,5)){
              const ax=target.x-actor.x,ay=target.y-actor.y,
                bx=enemy.x-actor.x,by=enemy.y-actor.y;
              if((ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by)||1)>.18)
                this.damage(enemy,amount*.65,actor,spellId);
            }
          }
        }else if(evo==="momentum"&&(actor.evolutionFluxGate||0)<=this.time){
          actor.flux=clamp(actor.flux+7,0,MAX_FLUX);
          actor.evolutionFluxGate=this.time+2;
          this.evolutionProc(actor,spellId,"momentum",target);
        }else if(evo==="resonant-strike"){
          actor.resonantStrikeCharge={until:this.time+6};
          this.evolutionProc(actor,spellId,"resonant-strike-ready",actor);
        }
      }
      if(spellId==="rift-slash"){
        const evo=actor.evolutions[spellId];
        if(evo==="echo-cut"&&target.alive){
          this.scheduleEvolution(actor,spellId,"echo-cut",target.x,target.y,.36,
            amount*.36,0,{targetId:target.id});
        }else if(evo==="rift-hunger"&&effectiveDamage>0){
          const healed=Math.min(12,effectiveDamage*.22/this.power);
          this.heal(actor,healed,actor,"rift-slash");
          this.evolutionProc(actor,spellId,"rift-hunger",actor);
        }else if(evo==="fractured-edge"&&debuffed){
          actor.fracturedCharge={until:this.time+6};
          this.evolutionProc(actor,spellId,"fractured-edge-ready",actor);
        }
      }
      if(spellId==="crystal-bolt"){
        const evo=actor.evolutions[spellId];
        if(evo==="glacial-echo"&&target.alive)
          this.scheduleEvolution(actor,spellId,"glacial-echo",target.x,target.y,.36,
            amount*.4,0,{targetId:target.id});
        else if(evo==="brittle-core"){
          actor.brittleCharge={until:this.time+6};
          this.evolutionProc(actor,spellId,"brittle-core-ready",actor);
        }
      }
      if(spellId==="fracture-spear"){
        const evo=actor.evolutions[spellId];
        if(evo==="crystal-rupture"){
          this.evolutionProc(actor,spellId,"crystal-rupture",target);
          for(const enemy of this.opponents(actor).filter(e=>
            e!==target&&distance(e,target)<150&&hasLineOfSight(target,e,this.arena)).slice(0,4))
            this.damage(enemy,amount*.4,actor,spellId);
        }else if(evo==="delayed-shatter"&&target.alive){
          this.scheduleEvolution(actor,spellId,"delayed-shatter",
            target.x,target.y,.7,amount*.42,0,{targetId:target.id});
          this.evolutionProc(actor,spellId,"delayed-shatter-ready",target);
        }
      }
      if(spellId==="flux-bolt"){
        const rhythm=actor.fluxRhythm;
        const hits=rhythm&&rhythm.targetId===target.id&&this.time<=rhythm.until?
          rhythm.hits+1:1;
        actor.fluxRhythm=hits>=3?null:{targetId:target.id,hits,until:this.time+6};
        if(hits>=3){
          // Single-target pulse is intentionally small; multi-target chains
          // belong to the temporary PvE Enchantment, not baseline Arena.
          this.damage(target,6,actor,spellId);
          this.identityProc(actor,spellId,"flux-third-hit",target);
        }
      }
      if(spellId==="flux-bolt"&&actor.evolutions[spellId]==="fractured-energy"){
        actor.crossDisciplineCharge={until:this.time+7,discipline:"solar"};
        this.evolutionProc(actor,spellId,"fractured-energy-ready",actor);
      }
      if(spellId==="sun-lance"){
        const evo=actor.evolutions[spellId];
        if(evo==="scorching-lance"){
          this.addStatus(target,{kind:"dot",negative:true,remaining:6,sourceId:actor.id,
            spellId,amount:4.5,period:2,tickLeft:2,tickCount:0});
          this.evolutionProc(actor,spellId,"scorching-lance",target);
        }else if(evo==="split-lance"){
          const second=this.opponents(actor).filter(t=>t!==target&&distance(t,target)<225&&
            hasLineOfSight(target,t,this.arena)).sort((a,b)=>distance(a,target)-distance(b,target))[0];
          if(second){
            this.damage(second,amount*.46,actor,spellId);
            this.evolutionProc(actor,spellId,"split-lance",second);
          }
        }
      }
      if(spellId==="zenith-crash"){
        const evo=actor.evolutions[spellId];
        if(evo==="solar-aftershock"){
          this.scheduleEvolution(actor,spellId,"solar-aftershock",target.x,target.y,.85,amount*.45,92);
          this.evolutionProc(actor,spellId,"solar-aftershock-ready",target);
        }else if(evo==="burning-ground"){
          for(let tick=1;tick<=3;tick++)
            this.scheduleEvolution(actor,spellId,"burning-ground",target.x,target.y,tick,5.5,96);
          this.evolutionProc(actor,spellId,"burning-ground",target);
        }
      }
      if(spellId==="gravity-hammer"){
        const evo=actor.evolutions[spellId];
        if(evo==="seismic-wave"){
          this.evolutionProc(actor,spellId,"seismic-wave",target);
          for(const enemy of this.opponents(actor).filter(t=>t!==target&&distance(t,target)<160&&
              hasLineOfSight(target,t,this.arena)).slice(0,5))
            this.damage(enemy,amount*.48,actor,spellId);
        }else if(evo==="aftershock"){
          this.scheduleEvolution(actor,spellId,"aftershock",target.x,target.y,.78,amount*.50,80);
          this.evolutionProc(actor,spellId,"aftershock-ready",target);
        }
      }
      if(r.area){
        for(const other of this.opponents(actor)){
          if(other!==target&&distance(other,target)<r.area&&hasLineOfSight(actor,other,this.arena))
            this.damage(other,amount*.42,actor,spellId);
        }
      }
    }else if(r.mode==="dot"){
      this.addStatus(target,{kind:"dot",negative:true,remaining:r.ticks*r.period,sourceId:actor.id,
        spellId,amount:r.amount,period:r.period,tickLeft:r.period,tickCount:0});
      if(spellId==="entropy-mark"&&actor.evolutions[spellId]==="contagion"){
        const other=this.opponents(actor).filter(e=>e!==target&&
          distance(e,target)<=225&&hasLineOfSight(target,e,this.arena)&&
          !e.statuses.some(q=>q.kind==="dot"&&q.spellId===spellId&&q.sourceId===actor.id))
          .sort((a,b)=>distance(a,target)-distance(b,target))[0];
        if(other){
          this.addStatus(other,{kind:"dot",negative:true,
            remaining:r.ticks*r.period,sourceId:actor.id,
            spellId,amount:r.amount*.5,period:r.period,tickLeft:r.period,tickCount:0});
          this.evolutionProc(actor,spellId,"contagion",other);
        }
      }
    }else if(r.mode==="cc")this.applyCC(target,r.cc,r.duration,actor,spellId);
    else if(r.mode==="hot"){
      this.addStatus(target,{kind:"reactive-thread",remaining:r.ticks*r.period,sourceId:actor.id,
        period:r.period,tickLeft:r.period,amount:r.amount,reactive:r.reactive,
        evolution:actor.evolutions[spellId]||null,procGate:0});
      this.heal(target,6,actor,spellId);
    }else if(r.mode==="link"){
      this.addStatus(actor,{kind:"link",remaining:r.duration,sourceId:actor.id,
        linkedId:target.id,evolution:actor.evolutions[spellId]||null,procGate:0});
      this.emit({type:"link",actorId:actor.id,targetId:target.id,spellId});
    }else if(r.mode==="cleanse"){
      const evo=actor.evolutions[spellId],maximum=evo==="dual-purge"?2:1;
      let removed=0;
      for(let i=0;i<maximum;i++){
        const bad=target.statuses.find(q=>q.negative&&q.remaining>0);
        if(!bad)break;
        target.statuses.splice(target.statuses.indexOf(bad),1);
        if(bad.kind==="shield")target.shield=0;
        removed++;
        this.emit({type:"cleanse",actorId:actor.id,targetId:target.id,
          spellId,removedStatus:bad.kind});
      }
      if(removed){
        if(evo==="purifying-surge")this.heal(target,10,actor,spellId);
        if(evo==="flux-reclamation")
          actor.flux=clamp(actor.flux+12,0,MAX_FLUX);
        if(evo)this.evolutionProc(actor,spellId,evo,target);
      }else this.emit({type:"nothing",actorId:actor.id,targetId:target.id,spellId,
        message:"NOTHING TO CLEANSE"});
    }
    this.handleSingularityCast(actor,spellId,target);
    this.emit({type:"ability",actorId:actor.id,targetId:target?.id||null,spellId});
  }
  updateStatus(actor,dt) {
    for(const status of actor.statuses){
      status.remaining-=dt;
      if(status.procGate>0)status.procGate=Math.max(0,status.procGate-dt);
      if(status.period&&actor.alive){
        status.tickLeft-=dt;
        while(status.tickLeft<=0&&status.remaining>=-dt){
          status.tickLeft+=status.period;
          const source=this.getActor(status.sourceId)||actor;
          if(status.kind==="dot"){
            const ramp=source.evolutions[status.spellId]==="deep-decay"?1+0.15*(status.tickCount||0):1;
            this.damage(actor,status.amount*ramp,source,status.spellId,true);
            status.tickCount++;
          }
          if(status.kind==="reactive-thread")
            this.heal(actor,status.amount,source,"reactive-thread",true);
          if(status.kind==="rejuvenating-orbit"&&source.alive)
            this.heal(actor,status.amount,source,"vital-cascade",true);
          if(status.kind==="incapacitate"&&status.spellId==="stasis-seal"&&
            status.evolution==="essence-siphon"&&source.alive){
            source.flux=clamp(source.flux+4,0,MAX_FLUX);
            const hurt=this.allies(source).filter(a=>a.hp<a.maxHp)
              .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
            if(hurt)this.heal(hurt,5,source,"stasis-seal",true);
            this.evolutionProc(source,"stasis-seal","essence-siphon",actor);
          }
          if(status.kind==="symbiosis-echo"&&source.alive)
            this.heal(actor,status.amount,source,"symbiosis-link",true);
        }
      }
    }
    const expired=actor.statuses.filter(s=>s.remaining<=0);
    for(const status of expired){
      const source=this.getActor(status.sourceId);
      if(!source?.alive)continue;
      if(status.kind==="shield"&&status.spellId==="resonance-guard")
        this.releaseGenesisGuard(actor,status);
      if(status.kind==="incapacitate"&&status.spellId==="stasis-seal")
        this.releaseGenesisStasis(source,status,actor);
      if(status.kind==="incapacitate"&&status.spellId==="null-prison"&&
        status.evolution==="void-anchor"){
        this.addStatus(actor,{kind:"slow",negative:true,remaining:2,sourceId:source.id});
        this.evolutionProc(source,"null-prison","void-anchor",actor);
      }
      if(status.kind==="root"&&status.spellId==="crystal-snare"&&
        status.evolution==="shatterfield"){
        this.scheduleEvolution(source,"crystal-snare","shatterfield",
          actor.x,actor.y,.05,0,115,{slowDuration:1.7});
        this.evolutionProc(source,"crystal-snare","shatterfield",actor);
      }
    }
    const shieldExpired=expired.some(s=>s.kind==="shield");
    actor.statuses=actor.statuses.filter(s=>s.remaining>0);
    if(shieldExpired&&!actor.statuses.some(s=>s.kind==="shield"))actor.shield=0;
  }
  update(delta) {
    if(this.ended)return;
    const dt=clamp(delta,0,0.06);this.time+=dt;
    this.ai.tick(dt);
    for(const actor of this.actors){
      if(!actor.alive)continue;
      actor.flux=Math.min(MAX_FLUX,actor.flux+BASE_FLUX_REGEN*dt);
      if(actor.relayPending?.until<=this.time)actor.relayPending=null;
      if(actor.rampart?.until<=this.time)this.releaseRampart(actor);
      actor.gcd=Math.max(0,actor.gcd-dt);
      actor.dashGate=Math.max(0,actor.dashGate-dt);
      actor.bonusFluxGate=Math.max(0,(actor.bonusFluxGate||0)-dt);
      for(const key of Object.keys(actor.cooldowns))actor.cooldowns[key]=Math.max(0,actor.cooldowns[key]-dt);
      for(const key of Object.keys(actor.schoolLocks))actor.schoolLocks[key]=Math.max(0,actor.schoolLocks[key]-dt);
      this.updateStatus(actor,dt);
      if(actor.cast){
        actor.cast.remainingMs-=dt*1000;
        if(actor.cast.remainingMs<=0){
          const finished=actor.cast;actor.cast=null;
          this.execute(actor,finished.spellId,finished.targetId,finished);
        }
      }
      if(actor.charge)this.updateCharge(actor,dt);
      if(actor.control==="ai"&&!actor.charge)this.ai.updateActor(actor,dt);
    }
    this.resolveActorSeparation(dt);
    this.processEvolutionEffects();
    if(!this.living("friendly").length||
      (!["defense","rift"].includes(this.modeId)&&!this.living("enemy").length)||
      this.time>=(["defense","rift"].includes(this.modeId)?1200:240)){
      this.ended=true;
      this.winner=["defense","rift"].includes(this.modeId)?"enemy":
        this.living("friendly").reduce((n,a)=>n+a.hp,0)>=this.living("enemy").reduce((n,a)=>n+a.hp,0)?"friendly":"enemy";
      this.log((this.winner==="friendly"?"VICTORY":"DEFEAT")+" · ENERGY ARENA");
      this.emit({type:"end",winner:this.winner});
    }
  }
}
