/* HAJJEN Zone 4 — gameplay-only Enchantment scaling.
   The shared campaign core keeps the Zone 1–3 numbers. This bridge adds only
   the difference required by sourceZone:4 Enchantments, so earlier zones stay
   unchanged and older carried effects keep their original base values. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const wrap=document.getElementById('combatSpells');
  const message=document.getElementById('combatMessage');
  if(!cfg||cfg.zone!==4||!state||!wrap||!message||window.HAJJEN_ZONE4_ENCHANTMENT_BALANCE)return;

  const allIds=spell=>Array.isArray(spell?.enchantments)?spell.enchantments.map(item=>typeof item==='string'?item:item?.id).filter(Boolean):[];
  const zone4Ids=spell=>Array.isArray(spell?.enchantments)?spell.enchantments.filter(item=>typeof item==='object'&&Number(item?.sourceZone)===4).map(item=>item.id).filter(Boolean):[];
  const has=(spell,id)=>allIds(spell).includes(id);
  const hasZ4=(spell,id)=>zone4Ids(spell).includes(id);

  function damageFor(spell,combat=state.combat){
    if(!spell)return 0;
    const ids=allIds(spell),casts=Number(combat?.spellCastCounts?.[spell.id])||0;
    let damage=Number(spell.damage||0)+(Number(state.level||1)-1)*4+Number(spell.enchantDamage||0);
    if(ids.includes('empowered'))damage+=hasZ4(spell,'empowered')?12:6;
    if(ids.includes('focused'))damage+=Math.max(0,Number(state.level||1)-1)*3;
    if(ids.includes('primal-surge')&&Number(state.danger)>=15)damage+=hasZ4(spell,'primal-surge')?18:10;
    if(combat){
      if(ids.includes('quickening')&&casts===0)damage+=hasZ4(spell,'quickening')?18:8;
      if(ids.includes('echoing')&&(casts+1)%2===0)damage+=hasZ4(spell,'echoing')?14:8;
      if(ids.includes('finisher')&&Number(combat.maxHp)>0&&Number(combat.hp)/Number(combat.maxHp)<.35)damage+=hasZ4(spell,'finisher')?18:10;
    }
    return Math.round(damage);
  }

  function genericSecondary(spell,id,base){
    if(!has(spell,id))return 0;
    return Math.round(base*(has(spell,'stabilized')?1.5:1));
  }
  function desiredSecondary(spell,id,base){
    if(!has(spell,id))return 0;
    const zone4Base={lifebound:10,fortified:12,siphoning:20}[id];
    const actualBase=hasZ4(spell,id)&&zone4Base?zone4Base:base;
    const factor=hasZ4(spell,'stabilized')?2:(has(spell,'stabilized')?1.5:1);
    return Math.round(actualBase*factor);
  }

  function extraDamageFor(spell,combat){
    if(!spell||!combat)return 0;
    const casts=Number(combat.spellCastCounts?.[spell.id])||0;
    let extra=0;
    if(hasZ4(spell,'empowered'))extra+=6;
    if(hasZ4(spell,'primal-surge')&&Number(state.danger)>=15)extra+=8;
    if(hasZ4(spell,'quickening')&&casts===0)extra+=10;
    if(hasZ4(spell,'echoing')&&(casts+1)%2===0)extra+=6;
    if(hasZ4(spell,'finisher')&&Number(combat.maxHp)>0&&Number(combat.hp)/Number(combat.maxHp)<.35)extra+=8;
    return extra;
  }

  function syncCombatLabels(){
    const combat=state.combat;if(!combat)return;
    [...wrap.querySelectorAll(':scope > button')].forEach((button,index)=>{
      const spell=state.spells?.[index];if(!spell)return;
      const small=button.querySelector('small');if(!small)return;
      const damage=damageFor(spell,combat);
      small.textContent=(small.textContent||'').replace(/^\d+\s+damage/i,`${damage} damage`);
    });
  }

  function log(text){
    const eventLog=document.getElementById('eventLog');if(!eventLog)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function toast(text){
    const area=document.getElementById('toastArea');if(!area)return;
    const row=document.createElement('div');row.className='toast reward';row.textContent=text;area.prepend(row);setTimeout(()=>row.remove(),1500);
  }

  wrap.addEventListener('click',event=>{
    const button=event.target.closest?.('button');
    if(!button||button.disabled||!wrap.contains(button)||!state.combat)return;
    const buttons=[...wrap.querySelectorAll(':scope > button')];
    const index=buttons.indexOf(button),spell=state.spells?.[index],combat=state.combat;
    if(index<0||!spell||!combat)return;

    const extraDamage=extraDamageFor(spell,combat);
    const previousEnchantDamage=spell.enchantDamage;
    if(extraDamage>0)spell.enchantDamage=Number(previousEnchantDamage||0)+extraDamage;

    const missingBefore=Math.max(0,Number(state.maxHp)-Number(state.hp));
    const genericLife=genericSecondary(spell,'lifebound',5);
    const desiredLife=desiredSecondary(spell,'lifebound',5);
    const extraLife=Math.max(0,desiredLife-genericLife);
    if(extraLife>0&&missingBefore>0)state.hp=Math.min(Number(state.maxHp),Number(state.hp)+Math.min(extraLife,missingBefore));
    const intendedLifeHeal=Math.min(desiredLife,missingBefore);

    const genericFort=genericSecondary(spell,'fortified',4);
    const desiredFort=desiredSecondary(spell,'fortified',4);
    const extraFort=Math.max(0,desiredFort-genericFort);
    const originalAttack=Number(combat.attack)||0;
    if(extraFort>0)combat.attack=Math.max(0,originalAttack-extraFort);

    const entity=combat.entity;
    queueMicrotask(()=>{
      if(previousEnchantDamage==null)delete spell.enchantDamage;else spell.enchantDamage=previousEnchantDamage;
      combat.attack=originalAttack;

      if(entity?.completed&&!state.gameOver&&has(spell,'siphoning')){
        const genericSiphon=genericSecondary(spell,'siphoning',10);
        const desiredSiphon=desiredSecondary(spell,'siphoning',10);
        const extraSiphon=Math.max(0,desiredSiphon-genericSiphon);
        if(extraSiphon>0){
          const healed=Math.min(extraSiphon,Math.max(0,Number(state.maxHp)-Number(state.hp)));
          if(healed>0){state.hp+=healed;toast(`+${healed} HP`);log(`Zone 4 Siphoning restored an additional ${healed} HP.`);}
        }
      }

      window.HAJJEN_SHARED_STATUS?.sync?.();
      window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
      syncCombatLabels();

      setTimeout(()=>{
        if(state.combat!==combat)return;
        let text=String(message.textContent||'');
        if(intendedLifeHeal>0){
          if(/Lifebound restores \d+ HP\.?/i.test(text))text=text.replace(/Lifebound restores \d+ HP\.?/i,`Lifebound restores ${intendedLifeHeal} HP.`);
          else text=`${text} Lifebound restores ${intendedLifeHeal} HP.`.trim();
        }
        if(desiredFort>0&&!/Guard Stance/i.test(text)&&/Fortified blocks \d+/i.test(text)){
          text=text.replace(/Fortified blocks \d+/i,`Fortified blocks ${Math.min(desiredFort,originalAttack)}`);
        }
        message.textContent=text;
        syncCombatLabels();
      },0);
    });
  },true);

  const observer=new MutationObserver(()=>queueMicrotask(syncCombatLabels));
  observer.observe(wrap,{childList:true,subtree:true});
  document.addEventListener('hajjen:enchantment-applied',()=>queueMicrotask(syncCombatLabels));
  document.addEventListener('hajjen:enchantment-replaced',()=>queueMicrotask(syncCombatLabels));

  window.HAJJEN_ZONE4_ENCHANTMENT_BALANCE={version:'1.0-zone4-buffed-values',damageFor,desiredSecondary,sync:syncCombatLabels};
})();
