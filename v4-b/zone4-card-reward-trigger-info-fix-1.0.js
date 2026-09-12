/* HAJJEN Zone 4 — Card Reward trigger + Tile Info fix.
   Keeps the reward implementation isolated while covering two edge cases:
   1) combat starts on the reward tile before its modal can open;
   2) legacy/shared Tile Info can overwrite the reward hover copy with OPEN GROUND. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const api=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
  const world=document.getElementById('world');
  const combatModal=document.getElementById('combatModal');
  if(!cfg||cfg.zone!==4||!state||!api||!world||window.HAJJEN_ZONE4_CARD_REWARD_TRIGGER_INFO_FIX)return;

  const reward=api.reward||cfg.cardRewardTest;
  if(!reward)return;

  const onRewardTile=()=>Number(state.row)===Number(reward.row)&&Number(state.col)===Number(reward.col);
  const rewardTile=()=>world.querySelector(`.tile[data-r="${reward.row}"][data-c="${reward.col}"]`);

  function showRewardInfo(){
    const tile=rewardTile();
    if(!tile)return;
    const claimed=!!api.claimed?.();
    const title=document.getElementById('tileTitle');
    const sub=document.getElementById('tileSub');
    const desc=document.getElementById('tileDesc');
    if(title)title.textContent=claimed?'CARD REWARD · CLAIMED':'CARD REWARD';
    if(sub)sub.textContent=claimed?'Reward already taken':'Choose one card type · One use';
    if(desc)desc.textContent=claimed
      ?'This Card Reward has already been claimed this run.'
      :'Step here to draw a random Manipulation, Enchantment or Tactical card, then replace one card of the same type.';
  }

  function maybeOpenAfterCombat(){
    queueMicrotask(()=>{
      if(!onRewardTile()||api.claimed?.()||state.combat||state.gameOver||state.zoneCleared)return;
      api.open?.();
      showRewardInfo();
    });
  }

  const combatObserver=combatModal&&typeof MutationObserver==='function'
    ?new MutationObserver(()=>{
      if(!combatModal.classList.contains('show'))maybeOpenAfterCombat();
    })
    :null;
  combatObserver?.observe(combatModal,{attributes:true,attributeFilter:['class']});

  function handleRewardTileInfo(event){
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;
    if(tile!==rewardTile())return;
    // Run after legacy/shared hover handlers so CARD REWARD remains the final copy.
    setTimeout(showRewardInfo,0);
  }
  world.addEventListener('pointerover',handleRewardTileInfo,true);
  world.addEventListener('mouseover',handleRewardTileInfo,true);
  world.addEventListener('click',handleRewardTileInfo,true);

  // Also covers the unlikely case where this bridge loads while combat is already closing.
  if(onRewardTile()&&!state.combat)maybeOpenAfterCombat();

  window.HAJJEN_ZONE4_CARD_REWARD_TRIGGER_INFO_FIX={
    version:'1.0-post-combat-trigger-tile-info',
    showRewardInfo,
    maybeOpenAfterCombat,
    restore(){
      combatObserver?.disconnect();
      world.removeEventListener('pointerover',handleRewardTileInfo,true);
      world.removeEventListener('mouseover',handleRewardTileInfo,true);
      world.removeEventListener('click',handleRewardTileInfo,true);
    }
  };
})();
