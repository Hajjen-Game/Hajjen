// Standalone Energy Combat prototype: never imports arena3v3 combat.
// Rules intentionally limited to a first-playable balance baseline.
import { ABILITY_BY_ID, ROLES, DISCIPLINES, MAX_FLUX, BASE_FLUX_REGEN } from "../abilityCatalog.js?v=20261010-origins35";
import { buildCombatLoadout } from "../buildState.js?v=20261010-origins35";
import { EnergyAI } from "./EnergyAI.js?v=20261008-energy-ai-v3";
import { MODES, MAX_LEVEL, stagedLoadout, botAbilities, rosterRoles, enemyTuning } from "./EnergyProgression.js?v=20261010-origins35";
import { singularityAvailable, SYNERGY_WINDOW_SECONDS } from "./EnergySingularity.js?v=20261010-origins35";
import { energyIdentity } from "./EnergyCharacter.js?v=20261010-origins35";
import { RUN_HISTORY_LIMIT, formatEnergyRunReport } from "./EnergyRunReport.js?v=20261009-learning-path26";
import { BASE_HEALTH, BASE_CRIT_CHANCE, CRIT_MULTIPLIER, maxHealthForLevel,
  powerForLevel, damageMultiplier, healMultiplier, shieldMultiplier,
  rankedRule, successfulInterruptFlux, normalizedRank }
  from "./EnergySpellBalance.js?v=20261010-balanced-ranks40";
import { EnergyMarbleBagPool } from "./EnergyMarbleBag.js?v=20261010-balanced-ranks40";

const TICK = 0.05;
// First survivability pass: allow a meaningful response to coordinated burst.
// One shared health pool for player and both teams; damage amounts unchanged.
export const BASE_ACTOR_HEALTH = BASE_HEALTH;
export const ABILITY_RULES = Object.freeze({
  "pulse-mend":       { mode:"heal",amount:60,cost:18,cast:1.5,range:490 },
  "resonance-guard":  { mode:"guard",amount:0.33,duration:4,cost:22,cd:32,range:490 },
  "phase-rush":       { mode:"rush",cost:14,cd:17,range:450 },
  "pulse-sever":      { mode:"interrupt",cost:10,cd:15,range:105 },
  "flux-bolt":        { mode:"damage",amount:17,cost:11,cast:1.5,range:490 },
  "phase-slip":       { mode:"dash",distance:170,cost:16,cd:23 },
  "entropy-mark":     { mode:"dot",amount:5,ticks:6,period:2,cost:15,range:490 },
  "rift-slash":       { mode:"damage",amount:28,cost:19,cd:6,range:100,requiresDebuff:true },
  "null-prison":      { mode:"cc",cc:"incapacitate",duration:4,cost:20,cast:1.4,cd:24,range:490 },
  "sun-lance":        { mode:"damage",amount:27,cost:18,cast:1.8,range:490 },
  "zenith-crash":     { mode:"damage",amount:38,cost:30,cast:2,cd:18,range:490,area:92 },
  "photon-barrier":   { mode:"shield",amount:60,duration:5,cost:23,cd:28,range:490 },
  "crystal-bolt":     { mode:"damage",amount:15,cost:12,cast:1.3,range:490,slow:0.35,slowTime:3 },
  "crystal-snare":    { mode:"cc",cc:"root",duration:3,cost:15,cd:18,range:490 },
  "fracture-spear":   { mode:"damage",amount:32,cost:24,cast:1.7,cd:12,range:490,controlBonus:0.3 },
  "arc-strike":       { mode:"damage",amount:13,cost:10,range:100 },
  "gravity-hammer":   { mode:"damage",amount:37,cost:27,cast:0.6,cd:12,range:105 },
  "vector-rush":      { mode:"dash",distance:180,cost:14,cd:18 },
  "resonance-cut":    { mode:"interrupt",cost:15,cd:20,range:370 },
  "reactive-thread":  { mode:"hot",amount:6,ticks:5,period:2,cost:18,range:490,reactive:10 },
  "symbiosis-link":   { mode:"link",duration:10,cost:18,cd:16,range:490 },
  "cleanse-flux":     { mode:"cleanse",cost:11,cd:10,range:490 },
});

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

function actorFor(id,team,role,pos,control,abilities,evolutions={},talentRanks={},level=1) {
  return {
    id,team,role,control, classId:"energy-"+role,
    name:control==="player"?"YOU":(team==="friendly"?"ALLY ":"ENEMY ")+(ROLES[role]?.name||role).toUpperCase(),
    x:pos.x,y:pos.y, hp:maxHealthForLevel(level),maxHp:maxHealthForLevel(level),
    alive:true,healthPct:1,flux:100,
    energyStyle:{core:roleColor[role],energy:roleColor[role]},
    targetId:null,lastMove:{x:0,y:0},cast:null,cooldowns:{},gcd:0,
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
    this.singularity=options.singularity||null;
    this.singularityCharge=null;
    this.loadout=stagedLoadout(build,this.progressLevel);
    this.tuning=enemyTuning(this.modeId,this.progressLevel);
    this.power=powerForLevel(this.progressLevel);
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
          Object.fromEntries(abilities.map(spellId=>[spellId,Math.min(3,Math.floor(this.progressLevel/10))]));
        const id=isPlayer?"player":team+"-"+role;
        const config=arena.spawns[team+"-"+role];
        const actor=actorFor(id,team,role,config,isPlayer?"player":"ai",abilities,evolutions,talentRanks,this.progressLevel);
        if(isPlayer){
          // Same talent-weighted signature as character HUB, with subtle
          // battle-scale rendering handled by EnergyOrbPolish.
          const id=energyIdentity(build,this.progressLevel);
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
      "Mode: "+this.mode.label+" ("+this.mode.size+") | Level "+this.progressLevel
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
          a.name+" ["+a.role+" / "+a.control+"]"+
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
    if(["heal","guard","shield","hot","link","cleanse"].includes(mode)){
      return chosen?.alive&&chosen.team===actor.team?chosen:actor;
    }
    return chosen?.alive&&chosen.team!==actor.team?chosen:null;
  }
  rule(actor,spellId){
    return rankedRule(spellId,ABILITY_RULES[spellId],actor?.talentRanks?.[spellId]||0);
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
    if(actor.gcd>0)return "GLOBAL COOLDOWN";
    if((actor.cooldowns[spellId]||0)>0)return "COOLDOWN";
    if((actor.schoolLocks[ability.discipline]||0)>0)return "SCHOOL LOCKED";
    if(actor.flux<this.cost(actor,rule,spellId))return "LOW FLUX";
    if(["rush","dash"].includes(rule.mode)&&actor.dashGate>0)return "MOBILITY LOCK";
    if(rule.mode==="dash")return null;
    const target=this.currentTarget(actor,rule.mode,targetId);
    if(!target)return "SELECT A TARGET";
    const d=distance(actor,target);
    if(d>(rule.range||490))return "OUT OF RANGE";
    if(!hasLineOfSight(actor,target,this.arena))return "LINE OF SIGHT";
    // Interrupts may be used into a fake cast. The cooldown must still be spent.
    return null;
  }
  castAbility(actor,spellId,targetId,opts={}) {
    const error=this.reason(actor,spellId,targetId);
    if(error){if(actor===this.player&&!opts.silent)this.log(ABILITY_BY_ID[spellId]?.name+": "+error);return false;}
    const rule=this.rule(actor,spellId);
    const target=rule.mode==="dash"?null:this.currentTarget(actor,rule.mode,targetId);
    actor.flux-=this.cost(actor,rule,spellId);
    actor.gcd=1.3;
    // Casted abilities earn their long cooldown only when the cast actually
    // resolves. Being kicked must NOT consume Null Prison's 24s cooldown.
    // Instants (including a fake interrupt) retain their existing cooldown.
    if(!rule.cast)actor.cooldowns[spellId]=rule.cd||0;
    this.emit({type:"windup",actorId:actor.id,targetId:target?.id||null,
      spellId,castSeconds:rule.cast||0});
    if(rule.cast) {
      actor.cast={spellId,remainingMs:rule.cast*1000,totalMs:rule.cast*1000,targetId:target?.id||null};
    }else this.execute(actor,spellId,target?.id||null);
    return true;
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
      ally.shield=Math.min(ally.maxHp*.4,ally.shield+10+tier*4);
      this.addStatus(ally,{kind:"shield",remaining:3.5,sourceId:actor.id});
      actor.flux=clamp(actor.flux+7+tier*2,0,MAX_FLUX);
    }
    this.emit({type:"synergy",actorId:actor.id,targetId:origin?.id||actor.id,
      spellId:core.anchor,reaction:core.reaction,tier});
    this.log("SINGULARITY · "+core.reaction.toUpperCase()+"!");
  }
  heal(target,amount,source,spellId){
    if(!target?.alive)return;
    const rank=source?.talentRanks?.[spellId]||0;
    const crit=this.rollCrit(source,spellId,"heal");
    const scaled=Math.max(0,Math.round(amount*this.power*
      healMultiplier(spellId,rank)*(crit?CRIT_MULTIPLIER:1)*
      (1-this.dampening)*(source?.team==="enemy"?this.tuning.healing:1)));
    const given=Math.min(target.maxHp-target.hp,scaled);
    const hpBefore=target.hp;
    target.hp+=given;target.healthPct=target.hp/target.maxHp;
    this.emit({type:"heal",actorId:source?.id||target.id,targetId:target.id,
      spellId,amount:given,overheal:scaled-given,hpBefore,hpAfter:target.hp,crit});
  }
  damage(target,amount,source,spellId){
    if(!target?.alive)return;
    // Level power scales damage for players AND AI; Rank selectively develops
    // damage spells and Marble Bag rolls crit (not CC, guards or movement).
    const rank=source?.talentRanks?.[spellId]||0;
    const crit=this.rollCrit(source,spellId,"damage");
    let value=amount*this.power*damageMultiplier(spellId,rank)*
      (crit?CRIT_MULTIPLIER:1)*(source?.team==="enemy"?this.tuning.damage:1);
    const hpBefore=target.hp,shieldBefore=target.shield,rawDamage=value;
    const guard=target.statuses.find(s=>s.kind==="guard");
    if(guard)value*=1-guard.amount;
    const guardReduction=rawDamage-value;
    const absorbed=Math.min(target.shield,value);
    target.shield-=absorbed;
    value=Math.max(0,Math.round(value-absorbed));
    target.hp=Math.max(0,target.hp-value);target.healthPct=target.hp/target.maxHp;
    this.emit({type:"hit",actorId:source.id,targetId:target.id,
      spellId,amount:hpBefore-target.hp,absorbed,crit,
      rawDamage,guardReduction,guardActive:!!guard,
      hpBefore,hpAfter:target.hp,shieldBefore,shieldAfter:target.shield});
    if(value>0){
      // Null Prison is break-on-damage incapacitate, never an unbreakable stun.
      if(target.statuses.some(s=>s.kind==="incapacitate"))this.emit({type:"break",actorId:source.id,targetId:target.id,spellId});
      target.statuses=target.statuses.filter(s=>s.kind!=="incapacitate");
      const thread=target.statuses.find(s=>s.kind==="reactive-thread");
      if(thread&&thread.procGate<=0){
        this.heal(target,thread.reactive, this.getActor(thread.sourceId), "reactive-thread");
        thread.procGate=2;
      }
    }
    if(source.role==="melee"&&value>0&&["arc-strike","rift-slash","gravity-hammer"].includes(spellId)&&source.bonusFluxGate<=0){
      source.flux=clamp(source.flux+4,0,MAX_FLUX);source.bonusFluxGate=1;
    }
    const link=source.statuses.find(s=>s.kind==="link");
    if(link&&value>0&&link.procGate<=0){
      const ally=this.getActor(link.linkedId);
      if(ally?.alive)this.heal(ally,Math.min(15*this.power,value*.32),source,"symbiosis-link");
      link.procGate=0.45;
    }
    if(target.hp===0){
      target.alive=false;target.cast=null;this.log(target.name+" eliminated!");
      this.emit({type:"death",actorId:target.id,targetId:target.id,
        killerId:source.id,spellId});
    }
  }
  move(actor,dx,dy,dt){
    if(!actor.alive||this.isControlled(actor,"root")||this.isControlled(actor,"incapacitate"))return;
    const length=Math.hypot(dx,dy)||1;
    const speed=174*(this.isControlled(actor,"slow")?0.65:1);
    const xStep=dx/length*speed*dt,yStep=dy/length*speed*dt;
    let mx=0,my=0;
    if(dx||dy){
      if(canStand(actor.x+xStep,actor.y,this.arena)){actor.x+=xStep;mx=xStep;}
      if(canStand(actor.x,actor.y+yStep,this.arena)){actor.y+=yStep;my=yStep;}
    }
    actor.lastMove={x:mx/(speed*dt||1),y:my/(speed*dt||1)};
  }
  dash(actor,dir,distancePx){
    if(this.isControlled(actor,"root")||this.isControlled(actor,"incapacitate"))return;
    const length=Math.hypot(dir.x,dir.y)||1;
    const step=7,steps=Math.ceil(distancePx/step);
    for(let i=0;i<steps;i++){
      const stepPx=Math.min(step,distancePx-i*step);
      const x=actor.x+dir.x/length*stepPx,y=actor.y+dir.y/length*stepPx;
      if(!canStand(x,y,this.arena))break;
      actor.x=x;actor.y=y;
    }
    actor.dashGate=1.3;
    this.emit({type:"dash",actorId:actor.id,spellId:actor.dashSpellId||"vector-rush"});
  }
  addStatus(target,entry) {
    // One shared Photon Barrier pool is intentionally non-stacking: every
    // refresh replaces the prior timer, even if a different ally cast it.
    // Otherwise an expired older shield timer can erase a newer shield.
    target.statuses=target.statuses.filter(s=>
      entry.kind==="shield"?s.kind!=="shield":
      s.kind!==entry.kind||s.sourceId!==entry.sourceId);
    target.statuses.push(entry);
  }
  applyCC(target,category,duration,source,spellId) {
    const dr=target.dr[category]||{level:0,resetAt:0};
    if(this.time>dr.resetAt)dr.level=0;
    const scale=[1,.5,0][Math.min(2,dr.level)];
    if(scale<=0){this.emit({type:"immune",actorId:source.id,targetId:target.id,spellId});return;}
    const value=duration*scale;
    target.statuses=target.statuses.filter(s=>s.kind!==category);
    target.statuses.push({kind:category,negative:true,remaining:value,sourceId:source.id});
    dr.level=Math.min(2,dr.level+1);
    dr.resetAt=this.time+value+20;
    target.dr[category]=dr;
    if(category==="incapacitate")target.cast=null;
    this.emit({type:"control",actorId:source.id,targetId:target.id,
      spellId,ccKind:category,duration:value,drScale:scale});
  }
  execute(actor,spellId,targetId) {
    const r=this.rule(actor,spellId);
    // A cast must stay bound to its original target after wind-up. In the
    // previous code a dead ally triggered currentTarget()'s self fallback:
    // Pulse Mend silently overhealed the player instead of reporting a miss.
    const target=targetId?this.getActor(targetId):this.currentTarget(actor,r.mode);
    const supportive=["heal","guard","shield","hot","link","cleanse"].includes(r.mode);
    const wrongTeam=target&&(supportive
      ?target.team!==actor.team:target.team===actor.team);
    const reason= r.mode==="dash"?null:!target?.alive?"TARGET DIED"
      :wrongTeam?"INVALID TARGET":distance(actor,target)>(r.range||490)?"OUT OF RANGE"
      :!hasLineOfSight(actor,target,this.arena)?"LINE OF SIGHT":null;
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
    if(r.mode==="dash"){
      const direction=actor.control==="player"?this.dashDirection||{x:1,y:0}:{x:actor.team==="friendly"?1:-1,y:0};
      actor.dashSpellId=spellId;
      this.dash(actor,direction,r.distance);
    }else if(r.mode==="rush"){
      const delta={x:target.x-actor.x,y:target.y-actor.y};
      actor.dashSpellId=spellId;
      this.dash(actor,delta,Math.max(0,distance(actor,target)-65));
    }else if(r.mode==="interrupt"){
      if(target.cast){
        const interrupted=target.cast.spellId,discipline=ABILITY_BY_ID[interrupted]?.discipline;
        target.cast=null;
        if(discipline)target.schoolLocks[discipline]=3;
        this.emit({type:"interrupt",actorId:actor.id,targetId:target.id,
          spellId,interruptedSpell:interrupted,interruptedSchool:discipline,
          schoolLockSeconds:discipline?3:0,
          interruptedCooldownRemaining:target.cooldowns[interrupted]||0});
        const masteryFlux=successfulInterruptFlux(spellId,actor.talentRanks[spellId]||0);
        const evolutionFlux=actor.evolutions[spellId]==="flux-siphon"||actor.evolutions[spellId]==="siphon"?12:0;
        actor.flux=clamp(actor.flux+masteryFlux+evolutionFlux,0,MAX_FLUX);
        this.log(actor.name+" interrupted "+target.name);
      }else this.emit({type:"nothing",actorId:actor.id,targetId:target.id,spellId,message:"NO CAST TO INTERRUPT"});
    }else if(r.mode==="heal")this.heal(target,r.amount,actor,spellId);
    else if(r.mode==="guard"){
      this.addStatus(target,{kind:"guard",remaining:r.duration,amount:Math.min(.6,r.amount),sourceId:actor.id});
      this.emit({type:"guard",actorId:actor.id,targetId:target.id,
        spellId,guardPercent:r.amount,duration:r.duration});
    }
    else if(r.mode==="shield"){
      const shieldBefore=target.shield;
      target.shield=Math.max(target.shield,Math.round(r.amount*this.power*
        shieldMultiplier(spellId,actor.talentRanks[spellId]||0)));
      this.addStatus(target,{kind:"shield",remaining:r.duration,sourceId:actor.id});
      this.emit({type:"shield",actorId:actor.id,targetId:target.id,
        spellId,amount:target.shield-shieldBefore,shieldBefore,shieldAfter:target.shield});
    }
    else if(r.mode==="damage"){
      let amount=r.amount;
      if(r.requiresDebuff&&this.debuffed(target))amount*=1.25;
      if(r.controlBonus&&(this.isControlled(target,"root")||this.isControlled(target,"slow")))amount*=1+r.controlBonus;
      if(actor.evolutions[spellId]==="focused-impact"||actor.evolutions[spellId]==="singularity-impact")amount*=1.2;
      this.damage(target,amount,actor,spellId);
      if(r.slow)this.addStatus(target,{kind:"slow",negative:true,remaining:r.slowTime,sourceId:actor.id});
      if(spellId==="arc-strike"&&actor.evolutions[spellId]==="twin-arc"){
        actor.arcCount++;
        if(actor.arcCount%3===0)this.damage(target,amount*.5,actor,spellId);
      }
      if(r.area){
        for(const other of this.opponents(actor)){
          if(other!==target&&distance(other,target)<r.area&&hasLineOfSight(actor,other,this.arena))this.damage(other,amount*.42,actor,spellId);
        }
      }
    }else if(r.mode==="dot"){
      this.addStatus(target,{kind:"dot",negative:true,remaining:r.ticks*r.period,sourceId:actor.id,
        spellId,amount:r.amount,period:r.period,tickLeft:r.period,tickCount:0});
    }else if(r.mode==="cc")this.applyCC(target,r.cc,r.duration,actor,spellId);
    else if(r.mode==="hot"){
      this.addStatus(target,{kind:"reactive-thread",remaining:r.ticks*r.period,sourceId:actor.id,
        period:r.period,tickLeft:r.period,amount:r.amount,reactive:r.reactive,procGate:0});
      this.heal(target,6,actor,spellId);
    }else if(r.mode==="link"){
      this.addStatus(actor,{kind:"link",remaining:r.duration,sourceId:actor.id,linkedId:target.id,procGate:0});
      this.emit({type:"link",actorId:actor.id,targetId:target.id,spellId});
    }else if(r.mode==="cleanse"){
      const bad=target.statuses.find(s=>s.negative);
      if(bad){
        target.statuses.splice(target.statuses.indexOf(bad),1);
        this.emit({type:"cleanse",actorId:actor.id,targetId:target.id,
          spellId,removedStatus:bad.kind});
      }else this.emit({type:"nothing",actorId:actor.id,targetId:target.id,spellId,message:"NOTHING TO CLEANSE"});
      if(actor.evolutions[spellId]==="purifying-surge"&&bad)this.heal(target,10,actor,spellId);
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
            this.damage(actor,status.amount*ramp,source,status.spellId);
            status.tickCount++;
          }
          if(status.kind==="reactive-thread")this.heal(actor,status.amount,source,"reactive-thread");
        }
      }
    }
    const shieldExpired=actor.statuses.some(s=>s.kind==="shield"&&s.remaining<=0);
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
          this.execute(actor,finished.spellId,finished.targetId);
        }
      }
      if(actor.control==="ai")this.ai.updateActor(actor,dt);
    }
    if(!this.living("friendly").length||!this.living("enemy").length||this.time>=240){
      this.ended=true;
      this.winner=this.living("friendly").reduce((n,a)=>n+a.hp,0)>=this.living("enemy").reduce((n,a)=>n+a.hp,0)?"friendly":"enemy";
      this.log((this.winner==="friendly"?"VICTORY":"DEFEAT")+" · ENERGY ARENA");
      this.emit({type:"end",winner:this.winner});
    }
  }
}
