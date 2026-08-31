(()=>{
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==2||!state)return;

  const $=id=>document.getElementById(id);
  const potionBtn=$('usePotionBtn');
  const eventLog=$('eventLog');

  // Keep the Action Bar and Backpack tied to the live potion state without
  // observing and rewriting the same DOM attributes in a feedback loop.
  // Zone 2 used to watch the potion button's disabled attribute and then set
  // disabled again inside the observer callback, which could starve the page.
  let potionSyncQueued=false;
  function syncPotionUi(){
    potionSyncQueued=false;
    const count=Math.max(0,Number(state.potion)||0);
    const disabled=count<1||state.hp>=state.maxHp||!!state.combat||!!state.gameOver;

    if(potionBtn){
      const desired=`<strong>HEALING POTION</strong><small>${count} left · +30 HP</small>`;
      if(potionBtn.innerHTML!==desired)potionBtn.innerHTML=desired;
      if(potionBtn.disabled!==disabled)potionBtn.disabled=disabled;
      potionBtn.classList.toggle('has-potion',count>0);
      potionBtn.classList.toggle('no-potion',count<1);
      potionBtn.style.opacity=count>0?'1':'.35';
      potionBtn.setAttribute('aria-label',`Healing Potion, ${count} left, restores 30 HP`);
    }

    const backpack=$('backpackPotionText');
    if(backpack)backpack.textContent=`${count} left · +30 HP`;
    const backpackUse=$('backpackUsePotion');
    if(backpackUse&&backpackUse.disabled!==disabled)backpackUse.disabled=disabled;
  }
  function queuePotionSync(){
    if(potionSyncQueued)return;
    potionSyncQueued=true;
    queueMicrotask(syncPotionUi);
  }

  document.addEventListener('click',e=>{
    if(!(e.target instanceof Element))return;
    if(e.target.closest('#craftPotionBtn,#usePotionBtn,#combatPotionBtn,#backpackUsePotion'))queuePotionSync();
  },true);
  window.addEventListener('focus',queuePotionSync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queuePotionSync();});
  syncPotionUi();

  // Zone 2's post-boss-unlock spawn guard temporarily lowers Danger inside
  // the movement call so spawn/aggro checks stay suppressed. Keep that
  // implementation detail out of both the visible event log and Run Report.
  if(eventLog){
    let stableDanger=Math.max(0,Math.min(20,Number(state.danger)||0));
    const previousPrepend=eventLog.prepend.bind(eventLog);
    eventLog.prepend=(...nodes)=>{
      let transientDanger=null;
      for(const node of nodes){
        if(!(node instanceof Element))continue;
        const text=(node.textContent||'').trim();
        const movement=text.match(/^Danger \+1 \(movement\) → (\d+)\/20\.$/i);
        if(state.bossUnlocked&&movement&&Number(movement[1])<=1){
          const trueDanger=Math.max(0,Math.min(20,stableDanger+1));
          node.textContent=`Danger +1 (movement) → ${trueDanger}/20.`;
          if(transientDanger===null)transientDanger=state.danger;
          state.danger=trueDanger;
          stableDanger=trueDanger;
          continue;
        }
        const normal=text.match(/^Danger [+-]\d+ \(.+?\) → (\d+)\/20\.$/i);
        if(normal)stableDanger=Math.max(0,Math.min(20,Number(normal[1])));
        const unchanged=text.match(/^Spawned mob defeated — Danger unchanged at (\d+)\/20\.$/i);
        if(unchanged)stableDanger=Math.max(0,Math.min(20,Number(unchanged[1])));
      }
      previousPrepend(...nodes);
      if(transientDanger!==null)state.danger=transientDanger;
      queuePotionSync();
    };
  }
})();
