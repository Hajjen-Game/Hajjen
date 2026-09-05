(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==3||!state||!eventLog)return;

  const TARGET_HEAL=Math.max(30,Number(cfg.potionHeal)||45);

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

  syncBackpack();
  window.HAJJEN_ZONE3_POTION_HEAL={version:'1.3-report-sync',amount:TARGET_HEAL};
})();
