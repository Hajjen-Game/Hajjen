/* HAJJEN Zone 4 — recovery fixes.
   Keeps the legacy campaign core untouched while Zone 4 uses its configured
   45 HP Healing Potion and exposes Primal Spring healing in Tile Info. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const system=window.HAJJEN_ZONE4_SYSTEM;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==4||!state||!world||window.HAJJEN_ZONE4_RECOVERY_FIXES)return;

  const $=id=>document.getElementById(id);
  const POTION_HEAL=Math.max(1,Number(cfg.potionHeal)||45);
  const springs=(Array.isArray(system?.springs)&&system.springs.length
    ?system.springs
    :(Array.isArray(cfg.springs)&&cfg.springs.length?cfg.springs:[cfg.spring,cfg.spring2]).filter(Boolean)
  );

  function addLog(text,type='reward'){
    if(!eventLog)return;
    const row=document.createElement('div');row.className=`event ${type}`;row.textContent=text;
    eventLog.prepend(row);while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='reward'){
    if(!toastArea)return;
    const row=document.createElement('div');row.className=`toast ${type}`;row.textContent=text;
    toastArea.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function syncHp(){
    const hpText=$('hpText');if(hpText)hpText.textContent=`${state.hp} / ${state.maxHp}`;
    const hpFill=$('hpFill');if(hpFill)hpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
    const combatText=$('combatHpText');if(combatText&&state.combat)combatText.textContent=`${state.hp} / ${state.maxHp}`;
    const combatFill=$('combatHpFill');if(combatFill&&state.combat)combatFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
  }
  function syncPotionUi(){
    const combatBtn=$('combatPotionBtn');
    if(combatBtn){
      combatBtn.textContent=`USE POTION · ${Math.max(0,Number(state.potion)||0)} LEFT`;
      combatBtn.disabled=(Number(state.potion)||0)<1||state.hp>=state.maxHp||!state.combat||state.gameOver;
    }
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    window.HAJJEN_ACTION_BAR_PRODUCTION?.syncIcons?.();
  }
  function useZone4Potion(inCombat){
    if((Number(state.potion)||0)<1||state.hp>=state.maxHp||state.gameOver)return false;
    if(inCombat&&!state.combat)return false;
    if(!inCombat&&state.combat)return false;

    const heal=Math.min(POTION_HEAL,state.maxHp-state.hp);
    state.potion--;
    state.hp+=heal;
    addToast(`+${heal} HP`,'reward');
    addLog(`Healing Potion restored ${heal} HP.`,'reward');
    if(inCombat){
      const message=$('combatMessage');if(message)message.textContent=`Healing Potion restores ${heal} HP. Choose a spell.`;
    }
    syncHp();syncPotionUi();system?.persist?.();
    return true;
  }

  function interceptPotion(event){
    const target=event.target instanceof Element?event.target.closest('#usePotionBtn,#combatPotionBtn'):null;
    if(!target)return;
    const inCombat=target.id==='combatPotionBtn';
    if(!useZone4Potion(inCombat))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  document.addEventListener('click',interceptPotion,true);

  function springForTile(tile){
    if(!tile)return null;
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c);
    return springs.find(spring=>Number(spring.r??spring.row)===r&&Number(spring.c??spring.col)===c)||null;
  }
  function springUsed(spring){
    if(!spring)return false;
    if(system?.usedSprings instanceof Set&&spring.index!=null)return system.usedSprings.has(spring.index);
    return !!spring.depleted;
  }
  function showSpringInfo(spring){
    if(!spring)return;
    const used=springUsed(spring);
    const heal=Math.max(1,Number(spring.heal)||90);
    const title=$('tileTitle'),sub=$('tileSub'),desc=$('tileDesc');
    if(title)title.textContent=spring.title||'PRIMAL SPRING';
    if(sub)sub.textContent=used?'Depleted':'Restorative site · One use';
    if(desc)desc.textContent=used
      ?'The spring has already restored Sharkan this run.'
      :`Step here while injured to restore up to ${heal} HP. It becomes depleted after use.`;
  }
  function queueSpringInfo(event){
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;
    const spring=springForTile(tile);if(!spring)return;
    queueMicrotask(()=>showSpringInfo(spring));
  }
  world.addEventListener('mouseover',queueSpringInfo);
  world.addEventListener('click',queueSpringInfo);

  window.HAJJEN_ZONE4_RECOVERY_FIXES={
    version:'1.0-potion45-spring-info',potionHeal:POTION_HEAL,springs,
    usePotion:useZone4Potion,showSpringInfo,
    restore(){document.removeEventListener('click',interceptPotion,true);world.removeEventListener('mouseover',queueSpringInfo);world.removeEventListener('click',queueSpringInfo);}
  };
})();