/* HAJJEN Zone 4 — Primal Spring pre-combat resolution.
   The legacy Zone 4 spring bridge polls position after movement, while core
   adjacent aggro resolves synchronously in the same move. Wrap the current
   steps setter so a Spring is consumed immediately after Sharkan enters its
   tile and before campaign core can open combat. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const system=window.HAJJEN_ZONE4_SYSTEM;
  if(!cfg||cfg.zone!==4||!state||!system||window.HAJJEN_ZONE4_SPRING_PRECOMBAT_FIX)return;

  const springs=Array.isArray(system.springs)?system.springs:[];
  const used=system.usedSprings;
  if(!springs.length||!(used instanceof Set))return;

  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  const original=Object.getOwnPropertyDescriptor(state,'steps');
  let plainValue=Number(state.steps)||0;

  function addLog(text){
    if(!eventLog)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;
    eventLog.prepend(row);while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text){
    if(!toastArea)return;
    const row=document.createElement('div');row.className='toast reward';row.textContent=text;
    toastArea.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function springHere(){
    return springs.find(spring=>Number(spring.r)===Number(state.row)&&Number(spring.c)===Number(state.col))||null;
  }
  function resolveSpringBeforeCombat(){
    if(state.combat||state.gameOver||state.zoneCleared)return false;
    const spring=springHere();
    if(!spring||used.has(spring.index)||state.hp>=state.maxHp)return false;

    const heal=Math.min(Math.max(1,Number(spring.heal)||90),state.maxHp-state.hp);
    if(heal<=0)return false;
    state.hp+=heal;
    used.add(spring.index);
    spring.depleted=true;
    addToast(`PRIMAL SPRING · +${heal} HP`);
    addLog(`Primal Spring restored ${heal} HP.`);
    system.persist?.();
    system.sync?.();
    return true;
  }

  Object.defineProperty(state,'steps',{
    configurable:true,
    enumerable:original?.enumerable!==false,
    get(){
      if(original?.get)return original.get.call(state);
      return plainValue;
    },
    set(value){
      if(original?.set)original.set.call(state,value);
      else plainValue=Number(value)||0;
      // campaign-zone moveTo continues with Danger/render/resolve/maybeAggro only
      // after this setter returns, so healing here is guaranteed to happen first.
      resolveSpringBeforeCombat();
    }
  });

  window.HAJJEN_ZONE4_SPRING_PRECOMBAT_FIX={
    version:'1.0-heal-before-aggro',
    resolve:resolveSpringBeforeCombat,
    restore(){
      if(original)Object.defineProperty(state,'steps',original);
      else{delete state.steps;state.steps=plainValue;}
    }
  };
})();
