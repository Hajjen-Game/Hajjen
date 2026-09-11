(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==3||!state||!eventLog)return;

  const TARGET_HEAL=Math.max(30,Number(cfg.potionHeal)||45);
  const DEV_MODE=new URLSearchParams(location.search).get('dev')==='1';
  const SAVE_KEY='hajjen-v4b-campaign';

  function syncHpUi(){
    const hpText=document.getElementById('hpText');
    if(hpText)hpText.textContent=`${state.hp} / ${state.maxHp}`;
    const hpFill=document.getElementById('hpFill');
    if(hpFill)hpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
    const combatHpText=document.getElementById('combatHpText');
    if(combatHpText)combatHpText.textContent=`${state.hp} / ${state.maxHp}`;
    const combatHpFill=document.getElementById('combatHpFill');
    if(combatHpFill)combatHpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
  }

  function syncBackpack(){
    const count=Math.max(0,Number(state.potion)||0);
    const text=document.getElementById('backpackPotionText');
    if(text)text.textContent=`${count} left · +${TARGET_HEAL} HP`;
    const button=document.getElementById('backpackUsePotion');
    if(button)button.setAttribute('aria-label',`Healing Potion, ${count} left, restores ${TARGET_HEAL} HP`);
  }

  function adjustPotionLog(row){
    if(!(row instanceof Element)||row.dataset.zone3PotionAdjusted==='1')return;
    const match=/^Healing Potion restored (\d+) HP\.$/.exec((row.textContent||'').trim());
    if(!match)return;

    row.dataset.zone3PotionAdjusted='1';
    const baseRestored=Number(match[1])||0;
    const room=Math.max(0,(Number(state.maxHp)||0)-(Number(state.hp)||0));
    const bonus=Math.max(0,Math.min(TARGET_HEAL-baseRestored,room));
    if(bonus>0)state.hp=Math.min(state.maxHp,state.hp+bonus);
    const total=baseRestored+bonus;

    row.textContent=`Healing Potion restored ${total} HP.`;

    if(toastArea){
      const toast=[...toastArea.querySelectorAll('.toast')].find(item=>(item.textContent||'').trim()===`+${baseRestored} HP`);
      if(toast)toast.textContent=`+${total} HP`;
    }

    const message=document.getElementById('combatMessage');
    if(message&&/^Healing Potion restores \d+ HP\./.test((message.textContent||'').trim())){
      message.textContent=`Healing Potion restores ${total} HP. Choose a spell.`;
    }

    window.dispatchEvent(new CustomEvent('hajjen:zone3-potion-healed',{
      detail:{total,baseRestored,target:TARGET_HEAL}
    }));

    syncHpUi();
    queueMicrotask(()=>{
      window.HAJJEN_SHARED_BACKPACK?.sync?.();
      syncBackpack();
      syncHpUi();
    });
  }

  new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes)adjustPotionLog(node);
    }
  }).observe(eventLog,{childList:true});

  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    if(event.target.closest('.backpack-open,#backpackUsePotion,#usePotionBtn,#combatPotionBtn')){
      setTimeout(()=>{
        syncBackpack();
        syncHpUi();
      },0);
    }
  },false);

  function syncDangerUi(){
    const danger=Math.max(0,Math.min(20,Number(state.danger)||0));
    const text=document.getElementById('dangerText');
    if(text)text.textContent=`${danger} / 20`;
    const fill=document.getElementById('dangerFill');
    if(fill)fill.style.width=`${danger*5}%`;
    const tier=danger>=20?'CRITICAL':danger>=15?'HOSTILE':danger>=10?'DANGEROUS':danger>=5?'UNEASY':'CALM';
    const badge=document.getElementById('dangerState');
    if(badge)badge.textContent=state.zoneCleared?'CLEARED':tier;
  }

  function persistPotionIngredients(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
      saved.potionIngredients=Array.isArray(state.potionIngredients)?[...state.potionIngredients]:[];
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
  }

  function addPickupFeedback(name){
    const row=document.createElement('div');
    row.className='event reward';
    row.textContent=`Collected potion ingredient ${name}.`;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();

    if(toastArea){
      const toast=document.createElement('div');
      toast.className='toast reward';
      toast.textContent=`${String(name).toUpperCase()} COLLECTED`;
      toastArea.prepend(toast);
      setTimeout(()=>toast.remove(),1700);
    }
  }

  function devCollectPotionIngredientOnPlayerTile(){
    if(!DEV_MODE||state.combat||state.gameOver)return;
    const entities=window.HAJJEN_ZONE3_ENTITY_MAP;
    if(!(entities instanceof Map))return;

    const entity=entities.get(`${state.row},${state.col}`);
    if(!entity||entity.completed||entity.type!=='potion-ingredient')return;

    entity.completed=true;
    entity.hajjenDevPotionCollected=true;
    if(!Array.isArray(state.potionIngredients))state.potionIngredients=[];
    state.potionIngredients.push(entity.name);

    if(!state.zoneCleared){
      if(state.quietHarvest){
        state.quietHarvest=false;
      }else{
        state.danger=Math.min(20,(Number(state.danger)||0)+1);
      }
    }

    const tile=document.querySelector(`.tile[data-r="${entity.r}"][data-c="${entity.c}"]`);
    if(tile){
      tile.classList.remove('special','potion-ingredient');
      tile.classList.add('completed');
      tile.removeAttribute('data-mark');
    }

    addPickupFeedback(entity.name);
    persistPotionIngredients();
    syncDangerUi();
    window.HAJJEN_SPELLBOOK_DEV_V6_POTION?.sync?.();
  }

  /* DEV-only safety net: after Backpack was retired, Zone 3's custom movement
     stack could leave potion ingredient entities unresolved. Check the player's
     live tile after movement and complete the normal collection exactly once. */
  if(DEV_MODE){
    setInterval(devCollectPotionIngredientOnPlayerTile,45);
    requestAnimationFrame(devCollectPotionIngredientOnPlayerTile);
  }

  syncBackpack();
  window.HAJJEN_ZONE3_POTION_HEAL={
    version:'1.4-dev-potion-pickup-fix',
    amount:TARGET_HEAL,
    devCollectPotionIngredientOnPlayerTile
  };
})();
