(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const zone=Number(cfg?.zone)||0;
  if((zone!==2&&zone!==3)||!state)return;

  const entities=zone===2?window.HAJJEN_ZONE2_ENTITY_MAP:(window.HAJJEN_ZONE3_SYSTEM?.entities||window.HAJJEN_ZONE3_ENTITY_MAP);
  const world=document.getElementById('world');
  const toastArea=document.getElementById('toastArea');
  if(!(entities instanceof Map)||!world||!toastArea)return;

  const TELEGRAPH_MS=650;
  const ZONE3_ACTIVE_CAP=3;
  const ZONE3_TOTAL_CAP=4;
  let zone3SpawnedTotal=0;
  const pending=new Set();
  const moveKeys={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};

  const style=document.createElement('style');
  style.textContent=`
    .campaign-world .tile[data-spawn-pending="1"]::after{display:none!important;content:none!important}
    .campaign-world .tile[data-spawn-pending="1"]::before{
      content:'!'!important;position:absolute!important;inset:14%!important;display:flex!important;
      align-items:center!important;justify-content:center!important;border:3px solid var(--red,#b34842)!important;
      border-radius:50%!important;background:rgba(248,249,242,.92)!important;color:var(--red,#b34842)!important;
      font-weight:900!important;font-size:18px!important;z-index:8!important;
      animation:campaignSpawnTelegraph .25s ease-in-out infinite alternate!important
    }
    .campaign-world .tile.spawned-now.mob{z-index:7;animation:campaignSpawnArrival .55s cubic-bezier(.2,.9,.3,1.25)}
    @keyframes campaignSpawnTelegraph{from{transform:scale(.76);opacity:.48;box-shadow:0 0 0 0 rgba(179,72,66,.24)}to{transform:scale(1.04);opacity:1;box-shadow:0 0 0 8px rgba(179,72,66,0)}}
    @keyframes campaignSpawnArrival{0%{transform:scale(.62);opacity:.12}58%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
    @media(prefers-reduced-motion:reduce){.campaign-world .tile[data-spawn-pending="1"]::before,.campaign-world .tile.spawned-now.mob{animation:none!important}}
  `;
  document.head.appendChild(style);

  const tileAt=(r,c)=>world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  const spawnSerial=e=>Number(String(e?.title||'').match(/ROUSED MOB\s+(\d+)/i)?.[1])||0;
  const spawnedEntities=()=>[...entities.values()].filter(e=>e?.type==='mob'&&e.spawned);
  const newestUnseen=()=>spawnedEntities().filter(e=>!e.__spawnVisualSeen).sort((a,b)=>spawnSerial(b)-spawnSerial(a))[0]||null;
  const activeOrPending=()=>spawnedEntities().filter(e=>(!e.completed&&!e.__spawnVisualPending)||e.__spawnVisualPending).length;

  function clearPendingTile(e){
    const tile=tileAt(e.r,e.c);
    if(!tile)return;
    tile.removeAttribute('data-spawn-pending');
    tile.classList.remove('spawned-now','aggro-attracted','aggro-target');
  }

  function cancelPending(e){
    if(!e)return;
    pending.delete(e);
    e.__spawnVisualPending=false;
    clearPendingTile(e);
    if(entities.get(`${e.r},${e.c}`)===e)entities.delete(`${e.r},${e.c}`);
    const tile=tileAt(e.r,e.c);
    if(tile){tile.classList.remove('special','mob');tile.removeAttribute('data-mark');}
  }

  function materialize(e){
    if(!e||!pending.has(e))return;
    if(state.zoneCleared||state.gameOver||(zone===2&&state.bossUnlocked)){
      cancelPending(e);
      return;
    }
    const tile=tileAt(e.r,e.c);
    if(!tile){cancelPending(e);return;}

    pending.delete(e);
    e.__spawnVisualPending=false;
    e.completed=false;
    tile.removeAttribute('data-spawn-pending');
    tile.classList.add('special','mob','spawned-now');
    tile.dataset.mark=e.mark||'☠';
    setTimeout(()=>tile.classList.remove('spawned-now'),650);
  }

  function beginTelegraph(e,toastNode){
    if(!e||e.__spawnVisualSeen)return;
    e.__spawnVisualSeen=true;

    // Zone 3 can have several rapid spawn requests while earlier warnings are
    // still pending. Count those reservations too so the three-mob active cap
    // cannot briefly overflow between request and materialization.
    if(zone===3&&activeOrPending()>ZONE3_ACTIVE_CAP){
      cancelPending(e);
      if(toastNode)toastNode.textContent='SPAWN PRESSURE CAPPED';
      return;
    }

    // Zone 3 is allowed at most four accepted Roused Mobs over the whole run.
    // Safe Window and active-cap rejections happen before this function sees a
    // NEW MOB SPAWNED toast (or are rejected above), so blocked attempts do not
    // consume one of the four run slots.
    if(zone===3&&zone3SpawnedTotal>=ZONE3_TOTAL_CAP){
      cancelPending(e);
      if(toastNode)toastNode.textContent='SPAWN RUN CAP REACHED';
      return;
    }

    const tile=tileAt(e.r,e.c);
    if(!tile)return;
    e.__spawnVisualPending=true;
    e.completed=true;
    pending.add(e);
    if(zone===3)zone3SpawnedTotal++;

    tile.setAttribute('data-spawn-pending','1');
    tile.classList.remove('special','mob','reachable','spawned-now');
    tile.removeAttribute('data-mark');
    setTimeout(()=>materialize(e),TELEGRAPH_MS);
  }

  new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      if((node.textContent||'').trim()!=='NEW MOB SPAWNED')continue;
      const e=newestUnseen();
      if(e)beginTelegraph(e,node);
    }
  }).observe(toastArea,{childList:true});

  function pendingAt(r,c){
    const e=entities.get(`${r},${c}`);
    return !!e?.__spawnVisualPending;
  }

  window.addEventListener('keydown',event=>{
    const dir=moveKeys[event.key];
    if(!dir||state.combat||state.gameOver)return;
    if(pendingAt(state.row+dir[0],state.col+dir[1])){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);

  world.addEventListener('click',event=>{
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;
    if(!tile)return;
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c);
    if(Math.abs(r-state.row)+Math.abs(c-state.col)!==1||!pendingAt(r,c))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  window.HAJJEN_CAMPAIGN_SPAWN_PARITY={
    version:'1.1',zone,
    zone3TotalCap:zone===3?ZONE3_TOTAL_CAP:null,
    get pending(){return pending.size;},
    get zone3SpawnedTotal(){return zone===3?zone3SpawnedTotal:null;}
  };
})();
