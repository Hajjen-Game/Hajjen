/* HAJJEN Zone 4 DEV — Misdirection parity with Zone 3.
   PLAY arms the card; select one nearby normal mob (Chebyshev <= 4); the
   selected mob moves exactly 2 tiles in a clear cardinal direction that
   increases its distance from Sharkan. */
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

  const key=(r,c)=>`${r},${c}`;
  const inBounds=(r,c)=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols;
  const manhattan=(a,b,r,c)=>Math.abs(a-r)+Math.abs(b-c);
  const chebyshev=(a,b,r,c)=>Math.max(Math.abs(a-r),Math.abs(b-c));
  let pending=null;

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
  function buttonFor(index){return hand.querySelector(`.card[data-card-reward-manip-slot="${index}"] > button`);}
  function syncButton(){
    if(!pending)return;
    const button=buttonFor(pending.index);if(!button)return;
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
    const {index,replacement}=pending;pending=null;replacement.used=true;
    const button=buttonFor(index);if(button){button.textContent='USED';button.disabled=true;}
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
    const button=event.target instanceof Element?event.target.closest('.card[data-card-reward-manip-slot] > button'):null;
    if(!button)return;
    const card=button.closest('.card[data-card-reward-manip-slot]');
    const index=Number(card?.dataset.cardRewardManipSlot);
    const replacement=api.manipulationReplacements?.[index];
    if(!replacement||replacement.used||replacement.def?.id!=='misdirection'||state.gameOver||state.zoneCleared)return;

    event.preventDefault();event.stopImmediatePropagation();
    pending={index,replacement};
    addLog('Misdirection armed: choose a nearby normal mob.','system');
    addToast('SELECT A NEARBY MOB','system');
    syncButton();
  },true);

  world.addEventListener('click',event=>{
    if(!pending)return;
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;if(!tile)return;
    event.preventDefault();event.stopImmediatePropagation();
    handleTarget(Number(tile.dataset.r),Number(tile.dataset.c));
  },true);

  const handObserver=new MutationObserver(()=>queueMicrotask(syncButton));
  handObserver.observe(hand,{childList:true,subtree:true});

  window.HAJJEN_ZONE4_MISDIRECTION={version:'1.0-zone3-parity',get pending(){return !!pending;}};
})();
