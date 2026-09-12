/* HAJJEN Zone 4 — moving-enemy aggro presentation bridge.
   If a moving mob/elite reaches the core's 8-neighbor aggro radius, keep the
   combat modal visually hidden until that enemy's board movement animation has
   finished. Combat state may start immediately underneath; only presentation is
   delayed so the player sees the enemy arrive before the fight window opens. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const modal=document.getElementById('combatModal');
  if(!cfg||cfg.zone!==4||!state||!modal||window.HAJJEN_ZONE4_MOVING_AGGRO_VISUAL_FIX)return;

  const WAIT_CLASS='zone4-moving-aggro-wait';
  const style=document.createElement('style');
  style.dataset.zone4MovingAggroVisualFix='1.0';
  style.textContent=`#combatModal.${WAIT_CLASS}{display:none!important;}`;
  document.head.appendChild(style);

  let pending=null;
  let releaseTimer=0;
  let raf=0;

  const adjacentToPlayer=move=>Math.max(
    Math.abs(Number(move.r)-Number(state.row)),
    Math.abs(Number(move.c)-Number(state.col))
  )<=1;

  function hideUntilMovementFinishes(move,step){
    pending={title:move.title||'',step:Number(step)||Number(state.steps)||0};
    clearTimeout(releaseTimer);
    cancelAnimationFrame(raf);
    modal.classList.add(WAIT_CLASS);
    modal.setAttribute('aria-hidden','true');

    const wait=()=>{
      const movement=window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV;
      if(movement?.visualMoving){raf=requestAnimationFrame(wait);return;}
      // Give the destination tile one painted frame before the combat window.
      releaseTimer=setTimeout(release,45);
    };
    raf=requestAnimationFrame(wait);
  }

  function release(){
    clearTimeout(releaseTimer);releaseTimer=0;
    cancelAnimationFrame(raf);raf=0;
    modal.classList.remove(WAIT_CLASS);
    if(modal.classList.contains('show'))modal.setAttribute('aria-hidden','false');
    pending=null;
  }

  function onMovement(event){
    const detail=event.detail||{};
    const moved=Array.isArray(detail.moved)?detail.moved:[];
    // V7 stops the enemy phase once one mover reaches core adjacency, so the
    // matching mover is normally the final record. Search from the end anyway.
    const arriving=[...moved].reverse().find(adjacentToPlayer);
    if(!arriving)return;
    hideUntilMovementFinishes(arriving,detail.step);
  }

  document.addEventListener('hajjen:zone4-enemy-movement-dev',onMovement);

  // Safety: never leave a hidden modal behind if a run ends/reloads oddly.
  const modalObserver=new MutationObserver(()=>{
    if(!modal.classList.contains('show')&&!window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV?.visualMoving&&pending)release();
  });
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  window.HAJJEN_ZONE4_MOVING_AGGRO_VISUAL_FIX={
    version:'1.0-delay-combat-until-arrival-animation',
    get pending(){return pending?{...pending}:null;},
    release,
    restore(){
      document.removeEventListener('hajjen:zone4-enemy-movement-dev',onMovement);
      modalObserver.disconnect();
      release();style.remove();
    }
  };
})();
