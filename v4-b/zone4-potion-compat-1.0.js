/* HAJJEN Zone 4 — hidden compatibility craft target for the proven Spellbook Potion UI. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==4||!state||window.HAJJEN_ZONE4_POTION_COMPAT)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const recipe=(cfg.potionIngredients||[]).map(item=>typeof item==='string'?item:item?.name).filter(Boolean).slice(0,2);
  if(recipe.length<2)return;

  const button=document.createElement('button');
  button.id='zone3CraftPotionBtn';
  button.type='button';
  button.hidden=true;
  button.setAttribute('aria-hidden','true');
  button.tabIndex=-1;
  document.body.appendChild(button);

  const itemName=item=>String(typeof item==='string'?item:item?.name||'').trim();
  function counts(){
    const list=Array.isArray(state.potionIngredients)?state.potionIngredients:[];
    return Object.fromEntries(recipe.map(name=>[name,list.filter(item=>itemName(item).toLowerCase()===name.toLowerCase()).length]));
  }
  function canCraft(){const c=counts();return !state.gameOver&&!state.zoneCleared&&recipe.every(name=>(c[name]||0)>0);}
  function persist(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
      Object.assign(saved,{version:1,zone:4,level:state.level,xp:state.xp,maxHp:state.maxHp,hp:state.hp,potion:state.potion,spells:state.spells,ingredients:state.spellIngredients,potionIngredients:state.potionIngredients});
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
  }
  function log(text){
    const root=document.getElementById('eventLog');if(!root)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;root.prepend(row);while(root.children.length>9)root.lastChild.remove();
  }
  function toast(text){
    const root=document.getElementById('toastArea');if(!root)return;
    const row=document.createElement('div');row.className='toast reward';row.textContent=text;root.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function sync(){button.disabled=!canCraft();}
  function craft(){
    if(!canCraft())return false;
    recipe.forEach(name=>{
      const index=state.potionIngredients.findIndex(item=>itemName(item).toLowerCase()===name.toLowerCase());
      if(index>=0)state.potionIngredients.splice(index,1);
    });
    state.potion=(Number(state.potion)||0)+1;
    state.zone4PotionCrafted=true;
    state.zone4PotionCrafts=(Number(state.zone4PotionCrafts)||0)+1;
    persist();sync();
    log(`Healing Potion created from ${recipe.join(' + ')}.`);toast('HEALING POTION CREATED');
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();window.HAJJEN_ACTION_BAR_PRODUCTION?.syncIcons?.();window.HAJJEN_POTION_INGREDIENT_ICONS?.sync?.();
    return true;
  }

  button.addEventListener('click',craft);
  setInterval(sync,120);sync();

  /* The promoted Potion UI historically calls this Zone 3 bridge before its
     hidden craft button. In Zone 4 the alias points at this isolated adapter. */
  window.HAJJEN_ZONE3_EXTRA_POTION={version:'zone4-compat',sync};
  window.HAJJEN_ZONE4_POTION_COMPAT={version:'1.0',button,recipe,sync,craft};
})();
