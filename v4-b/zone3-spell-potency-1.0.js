(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
  const eventLog=document.getElementById('eventLog');
  if(!cfg||cfg.zone!==3||!state||!api||api.zone!==3||!eventLog)return;

  const ZONE3_CRAFT_BONUS=7;
  const root=api.root;

  function patchPreview(){
    const preview=root?.querySelector('[data-sbv2-preview]');
    const line=preview?.querySelector('p');
    const note=preview?.querySelector('small');
    if(!line||!note||!/\bDAMAGE\b/i.test(line.textContent||'')||/Zone 3 potency/i.test(note.textContent||''))return;

    line.textContent=(line.textContent||'').replace(/(·\s*)(\d+)(\s+DAMAGE\b)/i,(_,before,value,after)=>`${before}${Number(value)+ZONE3_CRAFT_BONUS}${after}`);
    note.textContent=`${note.textContent} Zone 3 potency adds +${ZONE3_CRAFT_BONUS} base damage.`;
  }

  function matchingFreshSpell(firstName,secondName){
    return [...(api.library||[])].reverse().find(spell=>{
      if(!spell||spell.zone3PotencyBonus)return false;
      const from=Array.isArray(spell.craftedFrom)?spell.craftedFrom:[];
      return from[0]===firstName&&from[1]===secondName;
    })||null;
  }

  function applyPotency(spell){
    if(!spell||spell.zone3PotencyBonus)return false;
    spell.damage=(Number(spell.damage)||0)+ZONE3_CRAFT_BONUS;
    spell.ingredientBonus=(Number(spell.ingredientBonus)||0)+ZONE3_CRAFT_BONUS;
    spell.zone3PotencyBonus=ZONE3_CRAFT_BONUS;

    const active=(state.spells||[]).find(item=>item?.id===spell.id);
    if(active&&active!==spell){
      active.damage=spell.damage;
      active.ingredientBonus=spell.ingredientBonus;
      active.zone3PotencyBonus=ZONE3_CRAFT_BONUS;
    }

    api.persist?.();
    api.render?.();
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    window.HAJJEN_SHARED_UI?.sync?.();
    return true;
  }

  new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      const match=/^Created .+? from (.+?) \+ (.+?)\. It was added to the Spell Library\.$/i.exec(text);
      if(!match)continue;
      queueMicrotask(()=>{
        const spell=matchingFreshSpell(match[1],match[2]);
        if(applyPotency(spell)){
          node.textContent=`${text} Zone 3 potency: +${ZONE3_CRAFT_BONUS} base damage.`;
        }
      });
    }
  }).observe(eventLog,{childList:true});

  root?.addEventListener('click',()=>queueMicrotask(patchPreview));
  patchPreview();

  window.HAJJEN_ZONE3_SPELL_POTENCY={
    version:'1.0',
    craftBonus:ZONE3_CRAFT_BONUS
  };
})();