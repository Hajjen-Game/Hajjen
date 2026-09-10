/* HAJJEN Zone 2 — Enchantment introduction gate.
   Zone 2 keeps its Healing Potion introduction and now also requires the single
   Enchantment card to be applied before the boss becomes ready.
*/
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==2||!state)return;

  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
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

  function syncBossTileCopy(){
    const tile=document.getElementById('tileDesc');
    if(!tile)return;
    tile.textContent=state.bossUnlocked
      ?'Boss ready.'
      :'Create a Healing Potion, apply an Enchantment, defeat 4 mobs and both elites, and reach Level 7.';
  }
  if(world){
    const isBossTile=tile=>tile&&Number(tile.dataset.r)===Number(cfg.bossPos?.row)&&Number(tile.dataset.c)===Number(cfg.bossPos?.col);
    world.addEventListener('mouseover',event=>{
      const tile=event.target instanceof Element?event.target.closest('.tile'):null;
      if(isBossTile(tile))queueMicrotask(syncBossTileCopy);
    });
    world.addEventListener('click',event=>{
      const tile=event.target instanceof Element?event.target.closest('.tile'):null;
      if(isBossTile(tile))queueMicrotask(syncBossTileCopy);
    });
  }

  if(eventLog&&!eventLog.querySelector('[data-zone2-enchantment-intro]')){
    const row=document.createElement('div');
    row.className='event system';
    row.dataset.zone2EnchantmentIntro='1';
    row.textContent='New in Zone 2: use your single Enchantment card on a crafted spell.';
    eventLog.prepend(row);
  }

  const footer=document.querySelector('.footer');
  if(footer)footer.textContent='ZONE 2 LEVEL CAP: 7 · ENCHANTMENT INTRODUCED · 1 CARD · TACTICAL IN ZONE 3';

  document.addEventListener('hajjen:enchantment-applied',sync);
  setInterval(sync,100);
  sync();

  window.HAJJEN_ZONE2_ENCHANTMENT_INTRO={version:'1.1-copy',requirementsMet,sync};
})();