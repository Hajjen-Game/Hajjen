/* HAJJEN Zone 4 DEV — RPG equipment stats runtime.
   Isolated bridge for the first gear pass:
   Power = +1 spell damage per point during combat.
   Vitality = +5 Max HP per point.
   Resolve = -1 incoming combat damage per 2 points.
   No random combat stats. */
(()=>{
  if(window.HAJJEN_ZONE4_RPG_STATS_RUNTIME)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(Number(cfg?.zone)!==4||!state)return;

  const SLOT_IDS=['armor','charm','relic','tool'];
  const spellBase=new WeakMap();
  let combatPowerApplied=false;
  let appliedPower=0;
  let vitalityBonus=0;
  let lastAppliedMax=Number(state.maxHp)||1;
  let maxHpValue=Number(state.maxHp)||1;
  let resolveValue=0;
  let hpValue=Number(state.hp)||0;

  function totals(){
    const profile=window.HAJJEN_RPG_STATE?.getProfile?.()||{};
    const out={power:Number(profile.stats?.power)||0,vitality:Number(profile.stats?.vitality)||0,resolve:Number(profile.stats?.resolve)||0};
    SLOT_IDS.forEach(slot=>{
      const stats=profile.equipment?.[slot]?.stats||{};
      out.power+=Number(stats.power)||0;
      out.vitality+=Number(stats.vitality)||0;
      out.resolve+=Number(stats.resolve)||0;
    });
    out.power=Math.max(0,out.power);out.vitality=Math.max(0,out.vitality);out.resolve=Math.max(0,out.resolve);
    return out;
  }

  function installMaxHpGuard(){
    const desc=Object.getOwnPropertyDescriptor(state,'maxHp');
    if(desc&&!desc.configurable)return false;
    maxHpValue=Math.max(1,Number(state.maxHp)||1);
    Object.defineProperty(state,'maxHp',{
      configurable:true,
      enumerable:true,
      get(){return maxHpValue;},
      set(next){
        let value=Number(next);
        if(!Number.isFinite(value))value=maxHpValue;
        value=Math.max(1,value);

        /* Zone 4's legacy level ladder writes the level's base Max HP directly
           (100 + 15 per level). If Vitality gear is equipped, preserve that
           permanent bonus immediately so the level-up heal/log already sees
           the correct total instead of waiting for the runtime sync timer. */
        const levelBase=100+(Math.max(1,Number(state.level)||1)-1)*15;
        const liveVitalityBonus=Math.max(0,Number(totals().vitality)||0)*5;
        if(liveVitalityBonus>0&&Math.abs(value-levelBase)<=1)value=levelBase+liveVitalityBonus;

        maxHpValue=value;
      }
    });
    return true;
  }

  function installHpGuard(){
    const desc=Object.getOwnPropertyDescriptor(state,'hp');
    if(desc&&!desc.configurable)return false;
    hpValue=Number(state.hp)||0;
    Object.defineProperty(state,'hp',{
      configurable:true,
      enumerable:true,
      get(){return hpValue;},
      set(next){
        let value=Number(next);if(!Number.isFinite(value))value=hpValue;
        if(value<hpValue&&state.combat&&resolveValue>0){
          const reduction=Math.floor(resolveValue/2);
          /* campaign-zone clamps lethal combat damage to 0 before assigning HP.
             Adding Resolve after that clamp used to turn 0 back into 1 HP,
             making Resolve gear immortal at 1 HP. A core lethal result must
             remain lethal; Resolve still reduces every non-lethal hit. */
          if(reduction>0&&value>0)value=Math.min(hpValue,value+reduction);
        }
        hpValue=value;
      }
    });
    return true;
  }

  function syncVitality(nextVitality){
    const nextBonus=Math.max(0,Number(nextVitality)||0)*5;
    const currentMax=Math.max(1,Number(state.maxHp)||1);
    let baseMax=currentMax-vitalityBonus;
    const levelBase=100+(Math.max(1,Number(state.level)||1)-1)*15;
    if(currentMax!==lastAppliedMax&&Math.abs(currentMax-levelBase)<=1)baseMax=currentMax;
    baseMax=Math.max(1,baseMax);
    const nextMax=baseMax+nextBonus;
    const delta=nextMax-currentMax;
    state.maxHp=nextMax;
    if(delta>0)state.hp=Math.min(nextMax,Number(state.hp)+delta);
    else state.hp=Math.min(Number(state.hp),nextMax);
    vitalityBonus=nextBonus;
    lastAppliedMax=nextMax;
  }

  function ensureSpellBase(spell){
    if(!spell||typeof spell!=='object')return null;
    let rec=spellBase.get(spell);
    if(!rec){rec={base:Number(spell.damage)||0,last:Number(spell.damage)||0};spellBase.set(spell,rec);}
    return rec;
  }

  function applyCombatPower(power){
    const spells=Array.isArray(state.spells)?state.spells:[];
    spells.forEach(spell=>{
      const rec=ensureSpellBase(spell);if(!rec)return;
      if(combatPowerApplied&&Number(spell.damage)!==rec.last){
        rec.base=Math.max(0,Number(spell.damage)-appliedPower);
      }else if(!combatPowerApplied&&Number(spell.damage)!==rec.base){
        rec.base=Math.max(0,Number(spell.damage));
      }
      spell.damage=rec.base+power;
      rec.last=spell.damage;
    });
    combatPowerApplied=true;
    appliedPower=power;
  }

  function restoreCombatPower(){
    const spells=Array.isArray(state.spells)?state.spells:[];
    spells.forEach(spell=>{
      const rec=ensureSpellBase(spell);if(!rec)return;
      if(Number(spell.damage)!==rec.last)rec.base=Math.max(0,Number(spell.damage)-appliedPower);
      spell.damage=rec.base;rec.last=rec.base;
    });
    combatPowerApplied=false;
    appliedPower=0;
  }

  function syncProfile(){
    const t=totals();
    resolveValue=t.resolve;
    syncVitality(t.vitality);
    if(state.combat)applyCombatPower(t.power);
    else if(combatPowerApplied)restoreCombatPower();
    window.HAJJEN_ZONE4_RPG_STATS={...t,maxHpBonus:t.vitality*5,damageReduction:Math.floor(t.resolve/2)};
  }

  installMaxHpGuard();
  installHpGuard();
  syncProfile();
  document.addEventListener('hajjen:rpg-profile-changed',syncProfile);

  let wasCombat=!!state.combat;
  const timer=setInterval(()=>{
    const nowCombat=!!state.combat;
    if(nowCombat!==wasCombat){
      wasCombat=nowCombat;
      syncProfile();
    }else if(nowCombat){
      const power=totals().power;
      if(!combatPowerApplied||power!==appliedPower)applyCombatPower(power);
    }else{
      const currentMax=Number(state.maxHp)||1;
      if(currentMax!==lastAppliedMax)syncProfile();
    }
  },30);

  window.HAJJEN_ZONE4_RPG_STATS_RUNTIME={
    version:'1.2-resolve-lethal-safe',
    totals,
    sync:syncProfile,
    stop:()=>clearInterval(timer)
  };
})();
