/* HAJJEN Zone 4 DEV — Misdirection parity with Zone 3.
   PLAY arms the card; select one nearby normal mob (Chebyshev <= 4); the
   selected mob moves exactly 2 tiles in a clear cardinal direction that
   increases its distance from Sharkan.

   Temporary Zone 4 dev test: starting Manipulation slot 4 is presented as
   Misdirection so the mechanic can be tested every run. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const api=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  const world=document.getElementById('world');
  const hand=document.getElementById('manipCards');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!api||!(entities instanceof Map)||!world||!hand)return;

  const START_SLOT=3;
  const key=(r,c)=>`${r},${c}`;
  const inBounds=(r,c)=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols;
  const manhattan=(a,b,r,c)=>Math.abs(a-r)+Math.abs(b-c);
  const chebyshev=(a,b,r,c)=>Math.max(Math.abs(a-r),Math.abs(b-c));
  let pending=null;
  let startingUsed=false;
  let patchQueued=false;

  if(Array.isArray(cfg.manipulationCards)&&cfg.manipulationCards.length>START_SLOT){
    cfg.manipulationCards[START_SLOT]='Misdirection';
  }

  function addLog(text,type='system'){
    if(!eventLog)return;
    const row=document.createElement('div');row.className=`event ${type}`;row.textContent=text;
    eventLog.prepend(row);while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='system'){
    if(!toastArea)return;
    const row=document.createElement('div');row.className=`toast ${type}`;row.textContent=text;
    toastArea.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function clearEntityPaint(r,c){
    const tile=world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);if(!tile)return;
    tile.classList.remove('special','mob','zone4-mobile-enemy-dev');
    delete tile.dataset.mobileMode;delete tile.dataset.mobileActive;tile.removeAttribute('data-mark');
  }
  function repaintEntity(entity){
    const tile=world.querySelector(`.tile[data-r="${entity.r}"][data-c="${entity.c}"]`);if(!tile)return;
    tile.classList.add('special','mob');tile.dataset.mark=entity.mark||'☠';
  }

  function manipulationCards(){
    return [...hand.children].filter(node=>
      node instanceof HTMLElement&&
      node.classList.contains('card')&&
      !node.classList.contains('enchantment')&&
      !node.classList.contains('tactical')
    ).slice(0,4);
  }
  function rewardButton(index){return hand.querySelector(`.card[data-card-reward-manip-slot="${index}"] > button`);}
  function startingCard(){
    const card=manipulationCards()[START_SLOT];
    if(!card||card.hasAttribute('data-card-reward-manip-slot'))return null;
    return card;
  }
  function patchStartingCard(){
    patchQueued=false;
    const card=startingCard();if(!card)return;
    card.dataset.zone4StartMisdirection='1';
    card.dataset.handLabel='Misdirection';
    const title=card.querySelector(':scope > strong');
    const copy=card.querySelector(':scope > span');
    const button=card.querySelector(':scope > button');
    if(title&&title.textContent!=='Misdirection')title.textContent='Misdirection';
    if(copy&&copy.textContent!=='Move one nearby normal mob 2 tiles away from Sharkan.')copy.textContent='Move one nearby normal mob 2 tiles away from Sharkan.';
    if(button){
      const selecting=!!pending&&pending.kind==='starting';
      const wanted=startingUsed?'USED':selecting?'SELECT MOB':'PLAY';
      if(button.textContent!==wanted)button.textContent=wanted;
      button.disabled=startingUsed||selecting||state.gameOver||state.zoneCleared;
    }
  }
  function queueStartingPatch(){
    if(patchQueued)return;patchQueued=true;queueMicrotask(patchStartingCard);
  }
  function syncPendingButton(){
    if(!pending)return;
    if(pending.kind==='starting'){patchStartingCard();return;}
    const button=rewardButton(pending.index);if(!button)return;
    button.textContent='SELECT MOB';button.disabled=true;
  }

  function moveMobAway(entity){
    const origin={r:entity.r,c:entity.c};
    const currentDistance=manhattan(state.row,state.col,entity.r,entity.c);
    const options=[[2,0],[-2,0],[0,2],[0,-2]]
      .map(([dr,dc])=>({r:entity.r+dr,c:entity.c+dc,midR:entity.r+dr/2,midC:entity.c+dc/2}))
      .filter(p=>inBounds(p.r,p.c)&&!entities.has(key(p.r,p.c))&&!entities.has(key(p.midR,p.midC))&&!(p.r===state.row&&p.c===state.col))
      .map(p=>({...p,distance:manhattan(state.row,state.col,p.r,p.c)}))
      .filter(p=>p.distance>currentDistance)
      .sort((a,b)=>b.distance-a.distance);
    const target=options[0];if(!target)return false;

    entities.delete(key(origin.r,origin.c));
    entity.r=target.r;entity.c=target.c;
    entities.set(key(entity.r,entity.c),entity);
    clearEntityPaint(origin.r,origin.c);repaintEntity(entity);
    window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV?.decorate?.();
    return true;
  }

  function finish(){
    if(!pending)return;
    const completed=pending;pending=null;
    if(completed.kind==='reward'){
      completed.replacement.used=true;
      const button=rewardButton(completed.index);if(button){button.textContent='USED';button.disabled=true;}
    }else{
      startingUsed=true;
      patchStartingCard();
    }
    window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  }

  function handleTarget(r,c){
    if(!pending)return false;
    const entity=entities.get(key(r,c));
    if(!entity||entity.type!=='mob'||entity.completed||chebyshev(state.row,state.col,r,c)>4){
      addToast('CHOOSE A NEARBY NORMAL MOB','system');return true;
    }
    if(!moveMobAway(entity)){
      addToast('NO CLEAR 2-TILE PATH AWAY','danger');return true;
    }
    finish();
    addLog(`Misdirection moved ${entity.title} 2 tiles away from Sharkan.`,'reward');
    addToast('MISDIRECTION PLAYED','reward');
    return true;
  }

  hand.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('.card > button'):null;
    if(!button)return;
    const card=button.closest('.card');if(!card)return;

    if(card.dataset.zone4StartMisdirection==='1'){
      if(startingUsed||state.gameOver||state.zoneCleared)return;
      event.preventDefault();event.stopImmediatePropagation();
      pending={kind:'starting',index:START_SLOT};
      addLog('Misdirection armed: choose a nearby normal mob.','system');
      addToast('SELECT A NEARBY MOB','system');
      syncPendingButton();
      return;
    }

    if(!card.hasAttribute('data-card-reward-manip-slot'))return;
    const index=Number(card.dataset.cardRewardManipSlot);
    const replacement=api.manipulationReplacements?.[index];
    if(!replacement||replacement.used||replacement.def?.id!=='misdirection'||state.gameOver||state.zoneCleared)return;

    event.preventDefault();event.stopImmediatePropagation();
    pending={kind:'reward',index,replacement};
    addLog('Misdirection armed: choose a nearby normal mob.','system');
    addToast('SELECT A NEARBY MOB','system');
    syncPendingButton();
  },true);

  world.addEventListener('click',event=>{
    if(!pending)return;
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;if(!tile)return;
    event.preventDefault();event.stopImmediatePropagation();
    handleTarget(Number(tile.dataset.r),Number(tile.dataset.c));
  },true);

  const handObserver=new MutationObserver(()=>{queueStartingPatch();queueMicrotask(syncPendingButton);});
  handObserver.observe(hand,{childList:true,subtree:true});

  patchStartingCard();
  window.HAJJEN_SHARED_HAND?.sync?.();
  window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  window.HAJJEN_SHARED_CARD_DECKS?.sync?.();

  window.HAJJEN_ZONE4_MISDIRECTION={
    version:'1.1-zone3-parity-start-test',
    get pending(){return !!pending;},
    get startingUsed(){return startingUsed;}
  };
})();
