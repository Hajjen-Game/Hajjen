/* HAJJEN Zone 2 — Enchantment introduction gate.
   Zone 2 keeps its Healing Potion introduction and now also requires the single
   Enchantment card to be applied before the boss becomes ready.
*/
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==2||!state)return;

  let requested=state.mobKills>=4&&state.eliteKills>=2;
  const requirementsMet=()=>
    !!state.introComplete&&
    !!state.enchantmentUsed&&
    state.mobKills>=4&&
    state.eliteKills>=2&&
    state.level>=7;

  const current=Object.getOwnPropertyDescriptor(state,'bossUnlocked');
  if(!current||current.configurable!==false){
    Object.defineProperty(state,'bossUnlocked',{
      configurable:true,
      enumerable:true,
      get(){return requested&&requirementsMet();},
      set(value){requested=!!value||requested;}
    });
  }

  function sync(){
    if(state.mobKills>=4&&state.eliteKills>=2)requested=true;
    const objective=document.getElementById('enchantmentQuest');
    if(objective)objective.textContent=state.enchantmentUsed?'COMPLETE':'NOT COMPLETE';

    const boss=document.getElementById('bossQuest');
    if(boss&&!state.bossKilled){
      if(!state.introComplete)boss.textContent='Boss: LOCKED · POTION';
      else if(!state.enchantmentUsed)boss.textContent='Boss: LOCKED · ENCHANTMENT';
      else if(state.mobKills<4||state.eliteKills<2)boss.textContent='Boss: LOCKED';
      else if(state.level<7)boss.textContent='Boss: LOCKED · REACH L7';
      else if(state.bossUnlocked)boss.textContent='Boss: READY';
    }
  }

  document.addEventListener('hajjen:enchantment-applied',sync);
  setInterval(sync,100);
  sync();

  window.HAJJEN_ZONE2_ENCHANTMENT_INTRO={version:'1.0',requirementsMet,sync};
})();