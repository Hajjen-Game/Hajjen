(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state)return;

  const TARGET_HEAL=Math.max(30,Number(cfg.potionHeal)||45);
  const BASE_HEAL=30;
  let before=null;

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

  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const button=event.target.closest('#usePotionBtn,#combatPotionBtn');
    if(!button)return;
    before={hp:Number(state.hp)||0,potion:Number(state.potion)||0,inCombat:button.id==='combatPotionBtn'};
  },true);

  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const button=event.target.closest('#usePotionBtn,#combatPotionBtn');
    if(!button||!before)return;

    const start=before;
    before=null;
    if((Number(state.potion)||0)!==start.potion-1)return;

    const baseRestored=Math.max(0,(Number(state.hp)||0)-start.hp);
    const desired=Math.min(TARGET_HEAL,Math.max(0,(Number(state.maxHp)||0)-start.hp));
    const bonus=Math.max(0,desired-baseRestored);
    if(bonus>0)state.hp=Math.min(state.maxHp,state.hp+bonus);
    const total=Math.max(0,state.hp-start.hp);

    const latestLog=[...document.querySelectorAll('#eventLog .event')].find(row=>/^Healing Potion restored \d+ HP\.$/.test((row.textContent||'').trim()));
    if(latestLog)latestLog.textContent=`Healing Potion restored ${total} HP.`;
    const latestToast=[...document.querySelectorAll('#toastArea .toast')].find(row=>/^\+\d+ HP$/.test((row.textContent||'').trim()));
    if(latestToast)latestToast.textContent=`+${total} HP`;

    if(start.inCombat){
      const message=document.getElementById('combatMessage');
      if(message)message.textContent=`Healing Potion restores ${total} HP. Choose a spell.`;
    }

    syncHpUi();
    queueMicrotask(()=>{
      window.HAJJEN_SHARED_BACKPACK?.sync?.();
      syncBackpack();
      syncHpUi();
    });
  },false);

  document.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest('.backpack-open'))queueMicrotask(syncBackpack);
  },true);

  queueMicrotask(syncBackpack);
  window.HAJJEN_ZONE3_POTION_HEAL={version:'1.1-safe-bonus',amount:TARGET_HEAL};
})();
