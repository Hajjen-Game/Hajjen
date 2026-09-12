/* HAJJEN Zone 4 DEV — ambient spawn + movement integration test.
   V7 intentionally suppressed legacy ambient spawns while enemy movement was
   isolated. This bridge turns them back on without changing spawn chance and
   enrolls newly spawned mobs into the same staged movement system.

   V1.1 performance pass: watch only the spawn toast instead of every class/
   data-mark mutation across the 250-tile board. Gameplay is unchanged. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  const movement=window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV;
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!(entities instanceof Map)||!movement||!Array.isArray(movement.mobile)||window.HAJJEN_ZONE4_AMBIENT_MOVEMENT_TEST)return;

  // V7 used a huge spawnBlock value only to isolate movement. Restore normal
  // campaign spawn behavior. Future Ward Sigil uses still increment this value.
  state.spawnBlock=0;

  let spawnBlockValue=Number(state.spawnBlock)||0;
  const priorSpawnDescriptor=Object.getOwnPropertyDescriptor(state,'spawnBlock');
  Object.defineProperty(state,'spawnBlock',{
    configurable:true,enumerable:true,
    get(){return spawnBlockValue;},
    set(value){
      const before=spawnBlockValue;
      spawnBlockValue=Math.max(0,Number(value)||0);
      if(before>0&&spawnBlockValue<before){
        const row=document.createElement('div');row.className='toast reward';row.textContent='WARD SIGIL BLOCKED A SPAWN';
        toastArea?.prepend(row);setTimeout(()=>row.remove(),1700);
      }
    }
  });

  const initMobile=(enemy)=>{
    if(!enemy||enemy.completed||enemy.zone4MobileDev||enemy.type!=='mob')return false;
    const index=movement.mobile.length;
    enemy.zone4MobileDev=true;
    enemy.zone4MoveHome={r:Number(enemy.r),c:Number(enemy.c)};
    enemy.zone4MobileIndex=index;
    enemy.zone4CadenceSeed=index;
    enemy.zone4PathPhase=index;
    enemy.zone4MoveMode='idle';
    enemy.zone4LastMoveStep=0;
    enemy.zone4HuntMemoryUntil=0;
    enemy.zone4AlertMemoryUntil=0;
    enemy.zone4LastKnown={r:Number(state.row),c:Number(state.col)};
    // Ambient mobs are explicitly roused by the pressure system, so unlike
    // placed enemies they are active immediately after spawning.
    enemy.zone4MoveActive=true;
    movement.mobile.push(enemy);
    return true;
  };

  function enrollAmbientMobs(){
    let added=0;
    entities.forEach(enemy=>{if(enemy?.spawned&&initMobile(enemy))added++;});
    if(added){
      movement.decorate?.();
      const row=document.createElement('div');row.className='event system';
      row.textContent=`${added} ambient mob${added===1?'':'s'} joined active movement.`;
      eventLog?.prepend(row);while(eventLog&&eventLog.children.length>9)eventLog.lastChild.remove();
    }
    return added;
  }

  // Replace the now-obsolete V7 startup copy so the Event Log describes the
  // test that is actually running.
  [...(eventLog?.children||[])].forEach(node=>{
    if(/ambient spawns disabled/i.test(node.textContent||''))
      node.textContent=(node.textContent||'').replace(/ambient spawns disabled/i,'ambient spawns enabled');
  });

  // Zone 4 spawn parity already announces every accepted ambient spawn with
  // NEW MOB SPAWNED and materializes it after a 650 ms telegraph. Listen only
  // to that tiny toast container, then enroll after materialization. This avoids
  // waking an observer for the many tile-class changes produced by every board
  // render and every moving-enemy animation.
  const pendingEnrollTimers=new Set();
  const scheduleEnroll=()=>{
    const timer=setTimeout(()=>{
      pendingEnrollTimers.delete(timer);
      enrollAmbientMobs();
    },700);
    pendingEnrollTimers.add(timer);
  };

  const observer=toastArea&&typeof MutationObserver==='function'
    ?new MutationObserver(mutations=>{
      for(const mutation of mutations)for(const node of mutation.addedNodes){
        if(!(node instanceof Element))continue;
        if((node.textContent||'').trim()==='NEW MOB SPAWNED')scheduleEnroll();
      }
    })
    :null;
  observer?.observe(toastArea,{childList:true});

  enrollAmbientMobs();

  window.HAJJEN_ZONE4_AMBIENT_MOVEMENT_TEST={
    version:'1.1-toast-only-enrollment',
    enroll:enrollAmbientMobs,
    get spawnBlock(){return spawnBlockValue;},
    restore(){
      observer?.disconnect();
      pendingEnrollTimers.forEach(clearTimeout);pendingEnrollTimers.clear();
      if(priorSpawnDescriptor)Object.defineProperty(state,'spawnBlock',priorSpawnDescriptor);
      else{delete state.spawnBlock;state.spawnBlock=spawnBlockValue;}
    }
  };
})();
