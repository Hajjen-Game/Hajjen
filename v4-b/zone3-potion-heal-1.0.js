(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const root=document.getElementById('campaignRoot');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==3||!state||!root||!eventLog||!toastArea)return;

  const POTION_HEAL=Math.max(1,Number(cfg.potionHeal)||45);

  function addLog(text,type='reward'){
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  function addToast(text,type='reward'){
    const row=document.createElement('div');
    row.className=`toast ${type}`;
    row.textContent=text;
    toastArea.prepend(row);
    setTimeout(()=>row.remove(),1700);
  }

  function syncUi(){
    const hpText=document.getElementById('hpText');
    if(hpText)hpText.textContent=`${state.hp} / ${state.maxHp}`;
    const hpFill=document.getElementById('hpFill');
    if(hpFill)hpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;

    const usePotion=document.getElementById('usePotionBtn');
    if(usePotion){
      usePotion.textContent=`USE POTION · ${state.potion} LEFT`;
      usePotion.disabled=state.potion<1||state.hp>=state.maxHp||!!state.combat||state.gameOver;
    }

    const combatPotion=document.getElementById('combatPotionBtn');
    if(combatPotion){
      combatPotion.textContent=`USE POTION · ${state.potion} LEFT`;
      combatPotion.disabled=state.potion<1||state.hp>=state.maxHp||state.gameOver;
    }
    const combatHpText=document.getElementById('combatHpText');
    if(combatHpText)combatHpText.textContent=`${state.hp} / ${state.maxHp}`;
    const combatHpFill=document.getElementById('combatHpFill');
    if(combatHpFill)combatHpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;

    const backpackText=document.getElementById('backpackPotionText');
    if(backpackText){
      const expected=`${Math.max(0,Number(state.potion)||0)} left · +${POTION_HEAL} HP`;
      if(backpackText.textContent!==expected)backpackText.textContent=expected;
    }
    const backpackUse=document.getElementById('backpackUsePotion');
    if(backpackUse){
      backpackUse.disabled=state.potion<1||state.hp>=state.maxHp||!!state.combat||state.gameOver;
      const label=`Healing Potion, ${Math.max(0,Number(state.potion)||0)} left, restores ${POTION_HEAL} HP`;
      if(backpackUse.getAttribute('aria-label')!==label)backpackUse.setAttribute('aria-label',label);
    }
  }

  function usePotion(inCombat){
    if(state.potion<1||state.hp>=state.maxHp||state.gameOver)return;
    if(inCombat&&!state.combat)return;
    if(!inCombat&&state.combat)return;

    const heal=Math.min(POTION_HEAL,state.maxHp-state.hp);
    state.potion--;
    state.hp+=heal;
    addToast(`+${heal} HP`,'reward');
    addLog(`Healing Potion restored ${heal} HP.`,'reward');

    if(inCombat){
      const message=document.getElementById('combatMessage');
      if(message)message.textContent=`Healing Potion restores ${heal} HP. Choose a spell.`;
    }
    syncUi();
    queueMicrotask(()=>{
      window.HAJJEN_SHARED_BACKPACK?.sync?.();
      queueMicrotask(syncUi);
    });
  }

  // campaign-zone owns the original +30 HP handlers on these two buttons.
  // Capture at the campaign root so Zone 3 can replace only those two uses
  // while document-level shared UI/report listeners still receive the click.
  root.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const button=event.target.closest('#usePotionBtn,#combatPotionBtn');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    usePotion(button.id==='combatPotionBtn');
  },true);

  const backpackText=document.getElementById('backpackPotionText');
  if(backpackText){
    new MutationObserver(()=>syncUi()).observe(backpackText,{childList:true,subtree:true,characterData:true});
  }
  syncUi();

  window.HAJJEN_ZONE3_POTION_HEAL={version:'1.0',amount:POTION_HEAL};
})();
