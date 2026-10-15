// Planet Defense · Five-wave, three-Origin survival. No escort objective,
// turrets or permanent changes to the player's equipped spells.
// Wave Resonances are transient and are offered ONLY after each completed wave.
import { EnergyMatch, ABILITY_RULES, actorFor, canStand, hasLineOfSight }
  from "./EnergyMatch.js?v=20261015-voidlab1";
import { botAbilities } from "./EnergyProgression.js?v=20261015-voidlab1";
import { MAX_FLUX, ROLES, ABILITY_BY_ID } from "../abilityCatalog.js?v=20261015-voidlab1";
import { defenseTrialChoices, trialLesson } from "./EnergyDefenseTrials.js?v=20261012-eclipse-oc1";
import {overchargeChoices,resolveOverchargeProcs} from "./EnergyOvercharges.js?v=20261015-voidlab1";
import { buildPlanetEncounters, PVE_ENEMY_ARCHETYPES, ENCOUNTER_SPELLS }
  from "./EnergyPvEEncounters.js?v=20261012-journey-threat1";

export const DEFENSE_WAVES=5;
export const WAVE_RESONANCES=Object.freeze({
  healer:Object.freeze([
    {id:"mend-reverberation",name:"LIFE REVERBERATION",spellId:"pulse-mend",
      description:"Effective Pulse Mend healing releases a Vital bolt at a nearby enemy. Higher tiers strengthen the bolt."},
    {id:"guard-wave",name:"GUARD WAVE",spellId:"resonance-guard",
      description:"Resonance Guard emits an offensive energy pulse around its protected ally. Higher tiers hit harder."},
    {id:"mend-chain",name:"LIVING CONDUIT",spellId:"pulse-mend",
      description:"Pulse Mend also heals a second injured ally. Higher tiers increase the shared healing."}
  ]),
  melee:Object.freeze([
    {id:"rush-shockwave",name:"SHOCKWAVE RUSH",spellId:"phase-rush",
      description:"Phase Rush releases a circular shockwave on arrival. Higher tiers make the impact stronger."},
    {id:"rush-impact",name:"KINETIC IMPACT",spellId:"phase-rush",
      description:"Phase Rush damages its primary target on impact. Higher tiers increase the direct hit."},
    {id:"arc-cleave",name:"ARC CLEAVE",spellId:"arc-strike",
      description:"Every Arc Strike also strikes up to two nearby enemies with smaller kinetic arcs. Higher tiers hit harder."}
  ]),
  caster:Object.freeze([
    {id:"chain-flux",name:"CHAIN FLUX",spellId:"flux-bolt",
      description:"Flux Bolt branches into extra projectiles toward nearby foes. Tier 1 hits two more; later tiers become stronger."},
    {id:"flux-overcharge",name:"OVERCHARGED FLUX",spellId:"flux-bolt",
      description:"Each Flux Bolt hits harder. Higher tiers increase the direct damage further."},
    {id:"phase-discharge",name:"PHASE DISCHARGE",spellId:"phase-slip",
      description:"Phase Slip sends an offensive Void pulse through enemies near your landing point."}
  ])
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Sequentially spread wave entrances around the current team's position.
const SPAWN_ANGLES=[0,2.55,4.45,1.25,3.65,5.6,2.12,4.96];

export class EnergyPlanetDefense extends EnergyMatch{
  constructor(build,arena,options={}){
    super(build,arena,{...options,modeId:"defense"});
    this.wave=0;this.waveState="starting";this.spawnQueue=[];
    this.waveSpawned=0;this.waveDefeated=0;this.totalKills=0;
    this.spawnClock=0;this.waveIntermission=0;
    this.resonances={};this.resonancesChosen=0;this.trialHistory=[];
    this.overcharges=[]; // run-only actor-targeted selections, never persisted
    // Seed is saved on this match for reproducible reports/tests; production
    // runs vary the encounter order while keeping level-gated mechanics.
    this.encounterSeed=options.encounterSeed??Math.floor(Math.random()*0x7fffffff);
    this.encounter=buildPlanetEncounters(this.progressLevel,this.encounterSeed,Boolean(this.journey));
    this.encounterHistory=[];
    this.summonedThisWave=0;
    this.beginWave();
  }
  get currentWave(){return this.encounter.waves[this.wave-1]||null;}
  get totalWaveEnemies(){return (this.currentWave?.enemies.length||0)+this.summonedThisWave;}
  get waveRemaining(){return this.spawnQueue.length+this.living("enemy").length;}
  resonanceChoices(){
    if(this.journey)return overchargeChoices(this);
    return defenseTrialChoices(this,WAVE_RESONANCES[this.player.role]);
  }
  trialLesson(){
    return this.journey?{
      title:"CHOOSE ONE OVERCHARGE",
      intro:"Four offers: two for YOU, one for each AI companion. Choose exactly ONE.",
      why:"Only the chosen teammate receives this run-only boost. Unselected cards disappear. Permanent discoveries are earned after a new Stage clear."
    }:trialLesson(this.progressLevel,this.waveIntermission);
  }
  resonanceTier(id){return this.resonances[id]||0;}
  beginWave(){
    if(this.wave>=DEFENSE_WAVES||this.ended)return;
    this.wave++;
    this.waveState="active";
    this.waveSpawned=0;this.waveDefeated=0;this.summonedThisWave=0;
    this.spawnQueue=[...this.currentWave.enemies];
    this.spawnClock=0;
    this.ai.planTick=0;
    this.spawnNext();
    this.log("WAVE "+this.wave+" / "+DEFENSE_WAVES+" · "+
      this.currentWave.name+" · "+this.encounter.stage+
      (this.journey?" (STAGE "+Math.min(20,this.journey.clears+1)+")":
        " (LEVEL "+this.progressLevel+")"));
    this.emit({type:"wave-start",wave:this.wave,waveName:this.currentWave.name,
      encounterTier:this.encounter.tier,encounterStage:this.encounter.stage,
      waveFocus:this.currentWave.focus});
  }
  spawnNext(){
    const archetype=this.spawnQueue.shift();
    if(!archetype)return false;
    const identity=PVE_ENEMY_ARCHETYPES[archetype];
    if(!identity)return false;
    const role=identity.role;
    const order=this.waveSpawned++;
    // Expedition guardians occupy a particular sector; they do not wander
    // the entire route by spawning around whichever way the player kites.
    const center=this.arena.mode==="rift"?
      this.arena.route?.[this.wave-1]?.center||this.player:this.player;
    const allies=this.living("friendly");
    // Enemies appear off-centre in the wide world, not at old PvP spawns.
    // During a long expedition the team can roam; spawns travel with it.
    const angle=SPAWN_ANGLES[(order+this.wave*2)%SPAWN_ANGLES.length];
    let pos=null;
    for(const radius of (this.arena.mode==="rift"?
      [210,280,335,165,395]:[495,425,570,350,640])){
      for(const offset of [0,.35,-.35,.75,-.75]){
        const t=angle+offset;
        const candidate={x:center.x+Math.cos(t)*radius,
          y:center.y+Math.sin(t)*radius};
        if(canStand(candidate.x,candidate.y,this.arena,31)&&
          allies.every(ally=>distance(ally,candidate)>250)){
          pos=candidate;break;
        }
      }
      if(pos)break;
    }
    pos=pos||this.arena.spawns["enemy-"+role];
    const isBoss=archetype==="boss"&&this.wave===DEFENSE_WAVES&&order===0;
    const id="wave-"+this.wave+"-enemy-"+order;
    const kit=botAbilities(role,Math.max(this.progressLevel,Math.min(12,this.progressLevel+this.wave-1)),"trio");
    // Enemy difficulty advances through encounter recipes, not hidden Rank
    // multipliers or a character-level HP stat for Journey saves.
    const ranks=Object.fromEntries(kit.map(spell=>[spell,
      this.journey?0:Math.min(3,Math.floor(this.progressLevel/10))]));
    const actor=actorFor(id,"enemy",role,pos,"ai",kit,{},ranks,
      this.journey?1:this.progressLevel);
    // Smaller opening encounters mean three level-1 heroes can win through
    // their own spells. Later waves become more demanding without HP inflation.
    const healthScale=isBoss?1.7+this.encounter.tier*.055:
      clamp(.48+(this.wave-1)*.105+this.encounter.eliteHealthBonus*
        (identity.weight===2?1:.35),.48,1.05);
    actor.maxHp=Math.round(actor.maxHp*healthScale);
    actor.hp=actor.maxHp;
    actor.healthPct=1;
    actor.name=isBoss&&this.arena.mode==="rift"?"THE RIFT HEARTKEEPER":
      isBoss?this.encounter.boss.name:identity.name;
    actor.encounterKey=archetype;
    // Renderer-only identity hint: level-specific bosses use a distinct
    // Rift creature silhouette. No change to AI, abilities or hitboxes.
    actor.encounterLevel=this.progressLevel;
    actor.boss=isBoss;
    actor.encounterNextAt=this.time+(isBoss?5.6:
      archetype==="channeler"||archetype==="harbinger"?4.5+order*.65:9999);
    actor.encounterCycle=0;actor.encounterPhases=new Set();
    actor.energyStyle=isBoss?{core:"#d3a4ff",energy:"#9a6be7"}:
      role==="caster"?{core:archetype==="channeler"||archetype==="harbinger"?
        "#ce92ff":"#9b7ef0",energy:"#87ceff"}:
      role==="melee"?{core:archetype==="bulwark"?"#ffad78":"#ec7c93",energy:"#f7a0a9"}:
      {core:"#7bc4a6",energy:"#a2efc5"};
    actor.targetId=this.living("friendly")[order%this.living("friendly").length]?.id||"player";
    this.actors.push(actor);
    // Bulwarks announce short guard windows. Do not make them unkillable.
    if(archetype==="bulwark"){
      this.addStatus(actor,{kind:"guard",amount:.17,remaining:4.5,
        sourceId:actor.id,procGate:0});
      this.emit({type:"encounter-guard",actorId:actor.id,targetId:actor.id,
        spellId:"resonance-guard",wave:this.wave});
    }
    // Re-target the first living enemy of every new wave; the previous
    // wave's target may still exist in the run history as a dead actor.
    if(order===0||!this.getActor(this.player.targetId)?.alive)
      this.player.targetId=id;
    this.ai.planTick=0;
    this.emit({type:"wave-spawn",actorId:actor.id,targetId:actor.id,
      wave:this.wave,boss:isBoss,archetype,level:this.progressLevel});
    return true;
  }
  // Every signature is a REAL interruptible cast. Its impact position is
  // locked at the start: stepping outside the warning ring avoids damage.
  startEncounterCast(actor,kind){
    if(!actor?.alive||actor.cast||actor.charge||actor.gcd>.01||
      (actor.schoolLocks.void||0)>0||
      this.isControlled(actor,"incapacitate"))return false;
    const focus=kind==="nova"?actor:
      this.living("friendly").sort((a,b)=>{
        // The channeler sometimes targets the exposed healer, creating a
        // priority-threat decision without always targeting the human.
        return (a.hp/a.maxHp)-(b.hp/b.maxHp);
      })[0];
    if(!focus)return false;
    const spellId=kind==="nova"?ENCOUNTER_SPELLS.nova:ENCOUNTER_SPELLS.mark;
    const radius=kind==="nova"?this.encounter.novaRadius:
      actor.boss?114+this.encounter.tier*4:94+this.encounter.tier*4;
    const seconds=this.encounter.telegraphSeconds+
      (actor.boss?0:.15);
    actor.cast={spellId,remainingMs:seconds*1000,totalMs:seconds*1000,
      targetId:focus.id,impact:{x:focus.x,y:focus.y},
      radius,encounterKind:kind};
    actor.encounterCycle++;
    actor.encounterNextAt=this.time+(actor.boss?
      this.encounter.signatureInterval:Math.max(10.5,15-this.encounter.tier*.5));
    this.emit({type:"encounter-telegraph",spellId,
      actorId:actor.id,targetId:focus.id,
      x:focus.x,y:focus.y,radius,duration:seconds,
      encounterKind:kind,boss:Boolean(actor.boss)});
    this.log((actor.boss?"BOSS":"PRIORITY THREAT")+" · "+actor.name+
      (kind==="nova"?" CHANNELS RIFT NOVA":" TARGETS RIFT MARK")+
      " · MOVE OUT OR INTERRUPT");
    return true;
  }
  resolveEncounterCast(actor,spellId,context){
    if(!actor?.alive||!context?.impact)return;
    const point=context.impact;
    const kind=context.encounterKind||"mark";
    const radius=context.radius||110;
    this.emit({type:"encounter-impact",actorId:actor.id,spellId,
      targetId:context.targetId||null,x:point.x,y:point.y,radius,
      encounterKind:kind,boss:Boolean(actor.boss)});
    const victims=this.living("friendly").filter(ally=>
      distance(ally,point)<=radius&&hasLineOfSight(point,ally,this.arena));
    const base=(kind==="nova"?9:8)+(actor.boss?2.4:0)+this.encounter.tier*1.15;
    for(const victim of victims)this.damage(victim,base,actor,spellId);
    this.emit({type:"encounter-resolve",actorId:actor.id,spellId,
      x:point.x,y:point.y,hitCount:victims.length,avoided:!victims.length,
      encounterKind:kind});
    if(!victims.length)this.log(actor.name+" · ATTACK AVOIDED!");
  }
  enterBossPhase(actor,threshold){
    if(actor.encounterPhases.has(threshold))return;
    actor.encounterPhases.add(threshold);
    const label=threshold===.65?"FRACTURED SHELL":"LAST RESONANCE";
    if(this.encounter.bossPhaseShields){
      // A short defensive puzzle, not a huge HP refill.
      const before=actor.shield;
      actor.shield=Math.min(actor.maxHp*.12,
        actor.shield+actor.maxHp*(threshold===.65?.08:.05));
      this.addStatus(actor,{kind:"shield",remaining:3.2,sourceId:actor.id,
        spellId:"photon-barrier"});
      this.emit({type:"shield",actorId:actor.id,targetId:actor.id,
        spellId:"photon-barrier",amount:actor.shield-before,
        shieldBefore:before,shieldAfter:actor.shield});
    }
    if(threshold===.65&&this.encounter.bossReinforcements){
      this.spawnQueue.push("skirmisher","channeler");
      this.summonedThisWave+=2;
    }
    actor.encounterNextAt=Math.min(actor.encounterNextAt,this.time+2.4);
    this.emit({type:"boss-phase",actorId:actor.id,targetId:actor.id,
      spellId:"photon-barrier",threshold,phase:label,
      wave:this.wave,reinforcements:threshold===.65&&this.encounter.bossReinforcements});
    this.log("BOSS PHASE · "+label+
      (threshold===.65&&this.encounter.bossReinforcements?" · REINFORCEMENTS":""));
  }
  updateEncounters(){
    for(const actor of this.living("enemy")){
      if(!actor.boss&&!["channeler","harbinger"].includes(actor.encounterKey))continue;
      if(actor.encounterNextAt>this.time||actor.cast||actor.charge)continue;
      const kind=actor.boss?
        (this.encounter.bossGroundMarks&&actor.encounterCycle%2===1?"mark":"nova"):
        "mark";
      this.startEncounterCast(actor,kind);
    }
  }
  reason(actor,spellId,targetId){
    if(this.waveState==="intermission")return this.journey?"CHOOSE AN OVERCHARGE":"CHOOSE WAVE RESONANCE";
    return super.reason(actor,spellId,targetId);
  }
  // In-match guided trials. The same player actor that casts in Arena receives
  // temporary REAL Ranks/Evolutions. Singularity uses the original Forge
  // reaction engine. No save data is modified. Enchantments remain PvE-only.
  chooseResonance(id){
    if(this.waveState!=="intermission"||this.ended)return false;
    let choice=this.resonanceChoices().find(option=>option.id===id);
    // A Rank-3 Mastery offer unlocks an explicit Evolution selection.
    if(!choice&&id.startsWith("mastery-evolution:")){
      const [,spellId,evolutionId]=id.split(":");
      const available=this.resonanceChoices().find(option=>
        option.kind==="mastery"&&option.spellId===spellId&&option.rank===3);
      const evolution=ABILITY_BY_ID[spellId]?.evolutions?.find(e=>e.id===evolutionId);
      if(available&&evolution)choice={...available,id,kind:"mastery-evolution",
        evolutionId,name:evolution.name.toUpperCase(),label:"RANK 3 + EVOLUTION",
        how:"Use "+ABILITY_BY_ID[spellId].name+" with "+evolution.name+
          " in Wave "+(this.wave+1)+".",
        unlock:"Reach Rank 3 permanently in your Character HUB to pick this Evolution."};
    }
    if(!choice||(choice.kind!=="overcharge"&&!this.player.abilities.includes(choice.spellId)))return false;
    if(choice.kind==="overcharge"){
      if(!this.journey||this.overcharges.length!==this.resonancesChosen||
        this.resonancesChosen>=DEFENSE_WAVES-1)return false;
      const recipient=this.getActor(choice.targetId);
      // A companion that fell during the wave will be revived below.
      // It must still be eligible for a healing/damage Overcharge.
      if(!recipient||recipient.team!=="friendly")return false;
      this.overcharges.push({targetId:recipient.id,effect:choice.effect,
        wave:this.wave,grantedAt:this.time});
    }else if(choice.kind==="mastery"){
      if(choice.rank===3&&ABILITY_BY_ID[choice.spellId]?.evolutions?.length)return false;
      if((this.player.talentRanks[choice.spellId]||0)>=choice.rank)return false;
      this.player.talentRanks[choice.spellId]=choice.rank;
    }else if(choice.kind==="mastery-evolution"){
      this.player.talentRanks[choice.spellId]=3;
      this.player.evolutions[choice.spellId]=choice.evolutionId;
    }else if(choice.kind==="evolution"){
      this.player.talentRanks[choice.spellId]=3;
      this.player.evolutions[choice.spellId]=choice.evolutionId;
    }else if(choice.kind==="singularity"){
      if(this.progressLevel<10||!this.player.abilities.includes(choice.partner))return false;
      this.singularity={anchor:choice.anchor,partner:choice.partner,
        reaction:choice.reaction,tier:0};
      this.singularityCharge=null;
    }else if(choice.kind==="enchantment"){
      if(this.resonanceTier(choice.enchantmentId)>=3)return false;
      this.resonances[choice.enchantmentId]=choice.tier;
    }else return false;
    this.resonancesChosen++;
    this.trialHistory.push({wave:this.wave,kind:choice.kind,name:choice.name,
      spellId:choice.spellId,how:choice.how,unlock:choice.unlock});
    this.emit({type:"resonance-chosen",actorId:choice.kind==="overcharge"?
      choice.targetId:"player",spellId:choice.spellId,
      resonanceId:choice.id,tier:choice.rank||choice.tier||1,
      kind:choice.kind,wave:this.wave});
    this.log((choice.kind==="overcharge"?"OVERCHARGE · ":"DISCOVERY · ")+
      choice.name+" · "+(choice.recipient||choice.label));
    // Recover partly between rounds; fallen allies return, but a team wipe
    // during an active wave remains a loss as before.
    for(const ally of this.actors.filter(a=>a.team==="friendly")){
      ally.alive=true;
      ally.hp=Math.min(ally.maxHp,Math.max(ally.hp,Math.round(ally.maxHp*.55)));
      ally.healthPct=ally.hp/ally.maxHp;
      ally.flux=Math.max(70,ally.flux);
      ally.cast=null;ally.charge=null;ally.cooldowns={};ally.gcd=0;ally.dashGate=0;
      ally.schoolLocks={};ally.statuses=[];ally.shield=0;
    }
    this.beginWave();
    return true;
  }
  foesNear(pos,range){
    return this.living("enemy").filter(a=>distance(a,pos)<=range&&
      hasLineOfSight(pos,a,this.arena));
  }
  // Each additional hit uses the SAME real combat/crit/rank/HP-scaling
  // function as a regular spell, so floating text, report and VFX stay honest.
  damageExtra(target,amount,spellId){
    this.damage(target,amount,this.player,spellId);
  }
  resonanceVisual(target,kind,spellId){
    this.emit({type:"resonance-proc",actorId:"player",targetId:target?.id||"player",
      spellId,kind,role:this.player.role});
  }
  damage(target,amount,source,spellId,periodic=false){
    const tier=source===this.player&&spellId==="flux-bolt"&&!periodic?
      this.resonanceTier("flux-overcharge"):0;
    const hpBefore=target?.hp||0;
    super.damage(target,tier?amount*(1+.18*tier):amount,source,spellId,periodic);
    if(target?.boss&&target.alive&&this.waveState==="active"){
      const percent=target.hp/target.maxHp;
      if(percent<=.65)this.enterBossPhase(target,.65);
      if(percent<=.32&&this.encounter.bossDoubleThreat)
        this.enterBossPhase(target,.32);
    }
    // Higher-level PvE casters can apply a light, dispellable debuff.
    // It creates a REAL purpose for Cleanse Flux in wave encounters without
    // overwhelming the level-1 learning experience. Only direct hits apply it,
    // with a long deterministic cooldown (no random untelegraphed spam).
    if(this.encounter.corruption&&this.wave>=3&&target?.alive&&
      target.team==="friendly"&&source?.team==="enemy"&&source.role==="caster"&&
      !periodic&&target.hp<hpBefore&&
      ["flux-bolt","crystal-bolt","sun-lance"].includes(spellId)&&
      (source.corruptionGate||0)<=this.time){
      source.corruptionGate=this.time+12;
      this.addStatus(target,{kind:"dot",negative:true,remaining:6,
        period:2,tickLeft:2,tickCount:0,amount:2.5,
        spellId:"rift-corruption",sourceId:source.id});
      this.emit({type:"wave-debuff",actorId:source.id,targetId:target.id,
        spellId:"rift-corruption",wave:this.wave});
    }
  }
  // Charge resonances trigger at ARRIVAL, not when Phase Rush is pressed.
  // This matters in PvE waves where enemies may enter/leave the landing area.
  finishCharge(actor){
    const charge=actor.charge;
    const primary=charge?.targetId?this.getActor(charge.targetId):null;
    super.finishCharge(actor);
    if(actor!==this.player||charge?.spellId!=="phase-rush"||
      this.waveState!=="active")return;
    const shock=this.resonanceTier("rush-shockwave");
    if(shock){
      this.resonanceVisual(actor,"wave","phase-rush");
      for(const enemy of this.foesNear(actor,135+shock*12))
        this.damageExtra(enemy,7+5*shock,"phase-rush");
    }
    const impact=this.resonanceTier("rush-impact");
    if(impact&&primary?.alive&&distance(actor,primary)<145){
      this.damageExtra(primary,8+7*impact,"phase-rush");
      this.resonanceVisual(primary,"impact","phase-rush");
    }
  }
  execute(actor,spellId,targetId,castContext=null){
    if(Object.values(ENCOUNTER_SPELLS).includes(spellId)){
      this.resolveEncounterCast(actor,spellId,castContext);
      return;
    }
    const before=this.events.length;
    const primary=this.getActor(targetId);
    super.execute(actor,spellId,targetId,castContext);
    if(this.ended||this.waveState!=="active")return;
    // Procs belong to the ACTUAL casting character, including AI companions.
    // Run-only impacts are capped and do not recursively call execute().
    const newlyEmitted=this.events.slice(before);
    if(this.journey&&actor.team==="friendly"&&
      newlyEmitted.some(e=>e.type==="ability"&&e.actorId===actor.id))
      resolveOverchargeProcs(this,actor,newlyEmitted);
    if(actor!==this.player)return;
    // Legacy resonances still work as before on the player only.
    if(!newlyEmitted.some(e=>e.type==="ability"&&e.actorId===actor.id&&e.spellId===spellId))return;
    const validHit=newlyEmitted.some(e=>e.type==="hit"&&e.targetId===targetId&&e.spellId===spellId);
    const effectiveHeal=newlyEmitted.find(e=>e.type==="heal"&&e.spellId===spellId&&e.amount>0);
    if(spellId==="flux-bolt"&&validHit&&primary){
      const tier=this.resonanceTier("chain-flux");
      if(tier){
        const extras=this.foesNear(primary,265).filter(enemy=>enemy!==primary)
          .sort((a,b)=>distance(a,primary)-distance(b,primary));
        for(const other of extras.slice(0,tier>=2?3:2)){
          this.damageExtra(other,ABILITY_RULES["flux-bolt"].amount*(.39+tier*.05),"flux-bolt");
          this.resonanceVisual(other,"chain","flux-bolt");
        }
      }
    }
    if(spellId==="phase-slip"){
      const tier=this.resonanceTier("phase-discharge");
      if(tier){
        this.resonanceVisual(actor,"wave","phase-slip");
        for(const enemy of this.foesNear(actor,150+tier*12))
          this.damageExtra(enemy,8+5*tier,"phase-slip");
      }
    }
    if(spellId==="arc-strike"&&validHit&&primary){
      const tier=this.resonanceTier("arc-cleave");
      if(tier){
        const extras=this.foesNear(primary,145).filter(enemy=>enemy!==primary)
          .sort((a,b)=>distance(a,primary)-distance(b,primary));
        for(const other of extras.slice(0,2)){
          this.damageExtra(other,ABILITY_RULES["arc-strike"].amount*(.34+.12*tier),"arc-strike");
          this.resonanceVisual(other,"impact","arc-strike");
        }
      }
    }
    if(spellId==="pulse-mend"&&effectiveHeal){
      const tier=this.resonanceTier("mend-reverberation");
      if(tier){
        const healed=this.getActor(effectiveHeal.targetId)||actor;
        const foe=this.foesNear(healed,420).sort((a,b)=>distance(a,healed)-distance(b,healed))[0];
        if(foe){
          this.damageExtra(foe,7+5*tier,"pulse-mend");
          this.resonanceVisual(foe,"chain","pulse-mend");
        }
      }
      const echo=this.resonanceTier("mend-chain");
      if(echo){
        const second=this.living("friendly").filter(a=>a.id!==effectiveHeal.targetId&&a.hp<a.maxHp)
          .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
        if(second)this.heal(second,ABILITY_RULES["pulse-mend"].amount*(.22+.13*echo),actor,"pulse-mend");
      }
    }
    if(spellId==="resonance-guard"){
      const tier=this.resonanceTier("guard-wave");
      if(tier&&primary){
        this.resonanceVisual(primary,"wave","resonance-guard");
        for(const enemy of this.foesNear(primary,145+tier*8))
          this.damageExtra(enemy,7+5*tier,"resonance-guard");
      }
    }
  }
  update(dt){
    if(this.ended||this.waveState==="intermission")return;
    // Spawn staggered enemies to protect both pacing and performance.
    this.spawnClock+=Math.max(0,dt);
    if(this.spawnQueue.length&&this.living("enemy").length<this.currentWave.maxAlive&&
      this.spawnClock>=this.currentWave.spawnGap){
      this.spawnClock=0;this.spawnNext();
    }
    super.update(dt);
    if(this.ended)return;
    if(this.waveState==="active")this.updateEncounters();
    const casualties=this.actors.filter(a=>a.team==="enemy"&&a.id.startsWith("wave-"+this.wave+"-")&&!a.alive).length;
    if(casualties>this.waveDefeated){
      this.totalKills+=casualties-this.waveDefeated;
      this.waveDefeated=casualties;
    }
    if(!this.spawnQueue.length&&!this.living("enemy").length){
      this.log("WAVE "+this.wave+" CLEARED!");
      this.emit({type:"wave-clear",actorId:"player",wave:this.wave});
      if(this.wave===DEFENSE_WAVES){
        this.waveState="complete";this.ended=true;this.winner="friendly";
        this.emit({type:"end",winner:this.winner});
        this.log("PLANET DEFENSE · ALL FIVE WAVES CLEARED!");
      }else{
        // Clear every friendly cooldown at wave completion, not only on retry.
        for(const ally of this.actors.filter(a=>a.team==="friendly")){
          ally.cooldowns={};ally.gcd=0;ally.dashGate=0;ally.schoolLocks={};
          ally.cast=null;ally.charge=null;
        }
        this.waveState="intermission";this.waveIntermission=this.wave;
        this.log(this.journey?"CHOOSE ONE OF FOUR OVERCHARGES":"CHOOSE A WAVE RESONANCE TO CONTINUE");
      }
    }
  }
}
