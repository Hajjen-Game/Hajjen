// Planet Defense · Five-wave, three-Origin survival. No escort objective,
// turrets or permanent changes to the player's equipped spells.
// Wave Resonances are transient and are offered ONLY after each completed wave.
import { EnergyMatch, ABILITY_RULES, actorFor, canStand, hasLineOfSight }
  from "./EnergyMatch.js?v=20261011-impact-map6";
import { botAbilities } from "./EnergyProgression.js?v=20261011-impact-map6";
import { MAX_FLUX, ROLES } from "../abilityCatalog.js?v=20261011-impact-map6";
import { defenseTrialChoices, trialLesson } from "./EnergyDefenseTrials.js?v=20261011-defense-trials7";

const WAVE_PLANS=Object.freeze([
  {name:"FIRST CONTACT",enemies:["melee","caster"],maxAlive:2,spawnGap:3.4},
  {name:"THE SWARM",enemies:["melee","caster","melee"],maxAlive:3,spawnGap:3.1},
  {name:"DISRUPTION",enemies:["caster","melee","caster","melee"],maxAlive:3,spawnGap:3.0},
  {name:"OVERLOAD",enemies:["melee","caster","healer","caster","melee"],maxAlive:3,spawnGap:2.8},
  {name:"FINAL STAND",enemies:["caster","melee","caster","melee","caster","melee"],maxAlive:3,spawnGap:2.7}
]);
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
    this.beginWave();
  }
  get currentWave(){return WAVE_PLANS[this.wave-1]||null;}
  get totalWaveEnemies(){return this.currentWave?.enemies.length||0;}
  get waveRemaining(){return this.spawnQueue.length+this.living("enemy").length;}
  resonanceChoices(){
    return defenseTrialChoices(this,WAVE_RESONANCES[this.player.role]);
  }
  trialLesson(){return trialLesson(this.progressLevel,this.waveIntermission);}
  resonanceTier(id){return this.resonances[id]||0;}
  beginWave(){
    if(this.wave>=DEFENSE_WAVES||this.ended)return;
    this.wave++;
    this.waveState="active";
    this.waveSpawned=0;this.waveDefeated=0;
    this.spawnQueue=[...this.currentWave.enemies];
    this.spawnClock=0;
    this.ai.planTick=0;
    this.spawnNext();
    this.log("WAVE "+this.wave+" / "+DEFENSE_WAVES+" · "+this.currentWave.name);
    this.emit({type:"wave-start",wave:this.wave,waveName:this.currentWave.name});
  }
  spawnNext(){
    const role=this.spawnQueue.shift();
    if(!role)return false;
    const order=this.waveSpawned++;
    const center=this.player;
    const allies=this.living("friendly");
    // Enemies appear off-centre in the wide world, not at old PvP spawns.
    // During a long expedition the team can roam; spawns travel with it.
    const angle=SPAWN_ANGLES[(order+this.wave*2)%SPAWN_ANGLES.length];
    let pos=null;
    for(const radius of [495,425,570,350,640]){
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
    const isBoss=this.wave===DEFENSE_WAVES&&order===0;
    const id="wave-"+this.wave+"-enemy-"+order;
    const kit=botAbilities(role,Math.max(this.progressLevel,Math.min(12,this.progressLevel+this.wave-1)),"trio");
    const ranks=Object.fromEntries(kit.map(spell=>[spell,Math.min(3,Math.floor(this.progressLevel/10))]));
    const actor=actorFor(id,"enemy",role,pos,"ai",kit,{},ranks,this.progressLevel);
    // Smaller opening encounters mean three level-1 heroes can win through
    // their own spells. Later waves become more demanding without HP inflation.
    const healthScale=isBoss?1.7:clamp(.48+(this.wave-1)*.105,.48,.9);
    actor.maxHp=Math.round(actor.maxHp*healthScale);
    actor.hp=actor.maxHp;
    actor.healthPct=1;
    actor.name=isBoss?"RIFT WARDEN":
      (role==="caster"?"RIFT SPARK":role==="melee"?"PHASE RAIDER":"VOID MENDER");
    actor.boss=isBoss;
    actor.energyStyle=isBoss?{core:"#d3a4ff",energy:"#9a6be7"}:
      role==="caster"?{core:"#9b7ef0",energy:"#87ceff"}:
      role==="melee"?{core:"#ec7c93",energy:"#f7a0a9"}:
      {core:"#7bc4a6",energy:"#a2efc5"};
    actor.targetId=this.living("friendly")[order%this.living("friendly").length]?.id||"player";
    this.actors.push(actor);
    // Re-target the first living enemy of every new wave; the previous
    // wave's target may still exist in the run history as a dead actor.
    if(order===0||!this.getActor(this.player.targetId)?.alive)
      this.player.targetId=id;
    this.ai.planTick=0;
    this.emit({type:"wave-spawn",actorId:actor.id,targetId:actor.id,wave:this.wave,boss:isBoss});
    return true;
  }
  reason(actor,spellId,targetId){
    if(this.waveState==="intermission")return "CHOOSE WAVE RESONANCE";
    return super.reason(actor,spellId,targetId);
  }
  // In-match guided trials. The same player actor that casts in Arena receives
  // temporary REAL Ranks/Evolutions. Singularity uses the original Forge
  // reaction engine. No save data is modified. Enchantments remain PvE-only.
  chooseResonance(id){
    if(this.waveState!=="intermission"||this.ended)return false;
    const choice=this.resonanceChoices().find(option=>option.id===id);
    if(!choice||!this.player.abilities.includes(choice.spellId))return false;
    if(choice.kind==="mastery"){
      if((this.player.talentRanks[choice.spellId]||0)>=choice.rank)return false;
      this.player.talentRanks[choice.spellId]=choice.rank;
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
    this.emit({type:"resonance-chosen",actorId:"player",spellId:choice.spellId,
      resonanceId:choice.id,tier:choice.rank||choice.tier||1,
      kind:choice.kind,wave:this.wave});
    this.log("DISCOVERY · "+choice.name+" · "+choice.label);
    // Recover partly between rounds; fallen allies return, but a team wipe
    // during an active wave remains a loss as before.
    for(const ally of this.actors.filter(a=>a.team==="friendly")){
      ally.alive=true;
      ally.hp=Math.min(ally.maxHp,Math.max(ally.hp,Math.round(ally.maxHp*.55)));
      ally.healthPct=ally.hp/ally.maxHp;
      ally.flux=Math.max(70,ally.flux);
      ally.cast=null;ally.gcd=0;ally.schoolLocks={};ally.statuses=[];ally.shield=0;
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
    super.damage(target,tier?amount*(1+.18*tier):amount,source,spellId,periodic);
  }
  execute(actor,spellId,targetId){
    const before=this.events.length;
    const primary=this.getActor(targetId);
    super.execute(actor,spellId,targetId);
    if(actor!==this.player||this.ended||this.waveState!=="active")return;
    // Don't proc Resonances on missed/invalid/unfinished spells.
    const newlyEmitted=this.events.slice(before);
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
    if(spellId==="phase-rush"&&primary){
      const shock=this.resonanceTier("rush-shockwave");
      if(shock){
        this.resonanceVisual(actor,"wave","phase-rush");
        for(const enemy of this.foesNear(actor,135+shock*12))
          this.damageExtra(enemy,7+5*shock,"phase-rush");
      }
      const hit=this.resonanceTier("rush-impact");
      if(hit&&primary.alive&&distance(actor,primary)<145){
        this.damageExtra(primary,8+7*hit,"phase-rush");
        this.resonanceVisual(primary,"impact","phase-rush");
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
        this.waveState="intermission";this.waveIntermission=this.wave;
        this.log("CHOOSE A WAVE RESONANCE TO CONTINUE");
      }
    }
  }
}
