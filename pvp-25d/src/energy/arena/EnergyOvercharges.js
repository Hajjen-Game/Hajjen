// Project Energy Journey — FOUR run-only Overcharge offers per intermission.
// Exactly TWO cards for the player, ONE card for each of the two friendly AI.
// Exactly ONE is claimed. No saved Origin or permanent spell changes.
const PLAYER_OFFERS=Object.freeze({
  healer:Object.freeze([
    {effect:"bloom",name:"LIVING BLOOM",description:"Your effective heals echo into another wounded ally as a luminous Vital pulse."},
    {effect:"ward",name:"GUARDIAN HALO",description:"Your healing periodically wraps its recipient in a short-lived protective shield."},
  ]),
  melee:Object.freeze([
    {effect:"arc",name:"ARC TEMPEST",description:"Your successful strikes discharge Kinetic arcs into nearby enemies."},
    {effect:"siphon",name:"SIPHON DRIVE",description:"Your successful attacks periodically restore your own health."},
  ]),
  caster:Object.freeze([
    {effect:"comet",name:"COMET RAIN",description:"Successful direct spells summon another energy impact on a nearby foe."},
    {effect:"rime",name:"RIME CASCADE",description:"Direct Cryo or other damaging spells burst into two smaller nearby hits."},
  ]),
  solar:Object.freeze([
    {effect:"comet",name:"FALLING STARS",description:"Your successful Solar attacks call one additional glowing sunfire impact onto a threatened enemy."},
    {effect:"arc",name:"SUNBURST CHAINS",description:"Your successful Solar attacks scatter secondary sunfire arcs into nearby enemies."},
  ]),
});
const ALLY_OFFER={healer:PLAYER_OFFERS.healer[0],
  melee:PLAYER_OFFERS.melee[0],caster:PLAYER_OFFERS.caster[0],solar:PLAYER_OFFERS.solar[0]};
const COOLDOWN={bloom:2.4,ward:4.5,arc:1.65,siphon:3.3,comet:2.0,rime:2.6};

export function overchargeChoices(match){
  if(!match.journey||match.waveState!=="intermission")return [];
  const player=match.player;
  const allies=match.actors.filter(a=>a.team==="friendly"&&a.id!==player.id);
  // Exactly two existing allies: Solar players team up with Genesis and Impact.
  if(allies.length!==2)return [];
  const offers=[
    ...(PLAYER_OFFERS[player.role]||PLAYER_OFFERS.caster).map((item,i)=>({...item,actor:player,slot:i})),
    ...allies.map((actor,i)=>({...ALLY_OFFER[actor.role],actor,slot:i+2}))
  ];
  return offers.map(({effect,name,description,actor,slot})=>{
    const same=match.overcharges.filter(c=>c.targetId===actor.id&&c.effect===effect).length;
    const tier=Math.min(3,same+1);
    return {
      id:"overcharge:"+match.waveIntermission+":"+slot+":"+actor.id+":"+effect,
      kind:"overcharge",effect,targetId:actor.id,
      recipient:actor===player?"YOU":actor.role==="healer"?"GENESIS · AI":
        actor.role==="melee"?"IMPACT · AI":actor.role==="solar"?"SOLAR · AI":"ECLIPSE · AI",
      spellId:actor.abilities[0]||"crystal-bolt",
      name,label:(actor===player?"YOUR OVERCHARGE":"ALLY OVERCHARGE")+" · TIER "+tier,
      description,how:"Empowers "+(actor===player?"your Origin":actor.role==="healer"?
        "Genesis":actor.role==="melee"?"Impact":actor.role==="solar"?"Solar":"Eclipse")+" for the remaining waves.",
      unlock:"Temporary in this Planet Defense only. Choosing it forfeits the other three cards.",
      tier,isTemporary:true
    };
  });
}

export function resolveOverchargeProcs(match,actor,events){
  if(!match.journey||!actor?.alive||actor.team!=="friendly"||match.ended||
    match.waveState!=="active"||!events?.length)return;
  const owned=match.overcharges.filter(c=>c.targetId===actor.id);
  if(!owned.length)return;
  const hit=events.find(e=>e.type==="hit"&&e.actorId===actor.id&&e.amount>0&&
    match.getActor(e.targetId)?.team==="enemy");
  const heal=events.find(e=>e.type==="heal"&&e.actorId===actor.id&&e.amount>0);
  const grouped=new Map();
  for(const item of owned)grouped.set(item.effect,(grouped.get(item.effect)||0)+1);
  for(const [effect,count] of grouped){
    const timer=actor.overchargeGates||(actor.overchargeGates={});
    if(match.time<(timer[effect]??-Infinity))continue;
    const primary=hit&&match.getActor(hit.targetId);
    const healed=heal&&match.getActor(heal.targetId);
    if(["bloom","ward"].includes(effect)&&(!healed||!heal))continue;
    if(!["bloom","ward"].includes(effect)&&(!hit||!primary))continue;
    const strength=Math.min(3,count);
    const nearby=(radius,origin=primary)=>match.living("enemy").filter(enemy=>
      enemy.id!==origin.id&&Math.hypot(enemy.x-origin.x,enemy.y-origin.y)<=radius)
      .slice(0,2);
    const impact=(target,amount,kind)=>{if(!target?.alive)return;
      match.damage(target,amount,actor,hit.spellId);
      match.emit({type:"resonance-proc",actorId:actor.id,targetId:target.id,
        spellId:hit.spellId,kind,role:actor.role,overcharge:effect});
    };
    if(effect==="bloom"){
      const other=match.living("friendly").filter(a=>a.id!==healed.id&&a.hp<a.maxHp)
        .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if(!other)continue;
      match.heal(other,Math.min(22,heal.amount*(.30+.13*strength)),actor,heal.spellId);
      match.emit({type:"resonance-proc",actorId:actor.id,targetId:other.id,
        spellId:heal.spellId,kind:"wave",role:actor.role,overcharge:effect});
    }else if(effect==="ward"){
      const value=12+5*strength;
      healed.shield=Math.max(healed.shield,value);
      match.addStatus(healed,{kind:"shield",remaining:5,sourceId:actor.id,
        spellId:heal.spellId});
      match.emit({type:"shield",actorId:actor.id,targetId:healed.id,
        spellId:heal.spellId,amount:value});
      match.emit({type:"resonance-proc",actorId:actor.id,targetId:healed.id,
        spellId:heal.spellId,kind:"wave",role:actor.role,overcharge:effect});
    }else if(effect==="siphon"){
      if(actor.hp>=actor.maxHp)continue;
      match.heal(actor,Math.min(18,hit.amount*(.16+.07*strength)),actor,hit.spellId);
      match.emit({type:"resonance-proc",actorId:actor.id,targetId:actor.id,
        spellId:hit.spellId,kind:"wave",role:actor.role,overcharge:effect});
    }else{
      const targets=nearby(effect==="arc"?165:effect==="rime"?180:320);
      if(!targets.length&&effect!=="comet")continue;
      const chosen=targets.length?targets:effect==="comet"?[primary]:[];
      const max=effect==="comet"?1:2;
      for(const target of chosen.slice(0,max)){
        const mult=effect==="comet"?.33:effect==="rime"?.27:.30;
        impact(target,Math.min(19,Math.max(5,hit.amount*(mult+.05*strength))),
          effect==="arc"?"impact":effect==="rime"?"wave":"chain");
      }
    }
    timer[effect]=match.time+COOLDOWN[effect];
  }
}
