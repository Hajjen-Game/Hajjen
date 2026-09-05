(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const system=window.HAJJEN_ZONE3_SYSTEM;
  const entities=system?.entities||window.HAJJEN_ZONE3_ENTITY_MAP;
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  const world=document.getElementById('world');
  if(!cfg||cfg.zone!==3||!state||!(entities instanceof Map)||!eventLog||!toastArea||!world)return;

  const ACTIVE_SPAWN_CAP=3;
  const SPAWNED_MOB_XP=34;
  let safeWindowStartStep=null;
  let safeWindowEndStep=null;
  let spawnedCombat=false;

  const activeSpawned=()=>[...entities.values()].filter(e=>e?.type==='mob'&&e.spawned&&!e.completed);
  const spawnSerial=e=>Number(String(e?.title||'').match(/ROUSED MOB\s+(\d+)/i)?.[1])||0;
  const newestSpawned=()=>activeSpawned().sort((a,b)=>spawnSerial(b)-spawnSerial(a))[0]||null;

  function syncDangerUi(){
    const text=document.getElementById('dangerText');
    if(text)text.textContent=`${state.danger} / 20`;
    const fill=document.getElementById('dangerFill');
    if(fill)fill.style.width=`${state.danger*5}%`;
    const tier=state.danger>=20?'CRITICAL':state.danger>=15?'HOSTILE':state.danger>=10?'DANGEROUS':state.danger>=5?'UNEASY':'CALM';
    const badge=document.getElementById('dangerState');
    if(badge)badge.textContent=state.zoneCleared?'CLEARED':tier;
    const power=document.getElementById('powerText');
    if(power){
      const p=state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;
      power.textContent=`+${state.zoneCleared?0:p}%`;
    }
  }

  function eraseSpawn(e){
    if(!e)return;
    entities.delete(`${e.r},${e.c}`);
    const tile=world.querySelector(`.tile[data-r="${e.r}"][data-c="${e.c}"]`);
    if(tile){
      tile.classList.remove('special','mob','reachable');
      tile.removeAttribute('data-mark');
      const adjacent=Math.abs(Number(tile.dataset.r)-state.row)+Math.abs(Number(tile.dataset.c)-state.col)===1;
      if(adjacent&&!state.combat&&!state.gameOver)tile.classList.add('reachable');
    }
  }

  function safeWindowProtectsCurrentMove(){
    if(safeWindowStartStep===null||safeWindowEndStep===null)return false;
    const step=Number(state.steps)||0;
    return step>safeWindowStartStep&&step<=safeWindowEndStep;
  }

  // Track the exact three movement steps covered by Safe Window.
  // This is intentionally step-based rather than timing-based so step 3 cannot leak a spawn.
  const eventObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      if(!text)continue;

      if(/^Safe Window active:/i.test(text)){
        safeWindowStartStep=Number(state.steps)||0;
        safeWindowEndStep=safeWindowStartStep+3;
      }

      const engaged=text.match(/^(.+?) engaged(?: from adjacent aggro)?\.$/i);
      if(engaged){
        const title=engaged[1];
        const entity=[...entities.values()].find(e=>e?.title===title&&!e.completed);
        spawnedCombat=!!entity?.spawned;
      }

      if(/^Danger \+2 \(mob defeated\)/i.test(text)&&spawnedCombat){
        state.danger=Math.max(0,(Number(state.danger)||0)-2);
        node.className='event system';
        node.textContent=`Spawned mob defeated — Danger unchanged at ${state.danger}/20.`;
        syncDangerUi();
      }

      if(/ defeated\.$/i.test(text)&&!/^Sharkan was defeated/i.test(text))spawnedCombat=false;
      if(/^Sharkan was defeated/i.test(text))spawnedCombat=false;
    }
  });
  eventObserver.observe(eventLog,{childList:true});

  // Core creates the entity synchronously, then emits NEW MOB SPAWNED.
  // Assign Zone 3's spawned-mob XP immediately so the normal core win/level-up
  // flow awards the full value, including threshold-crossing heals.
  // If Safe Window covers this movement step or the active-spawn cap is exceeded,
  // remove that just-created entity before it can affect play.
  const spawnObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      if((node.textContent||'').trim()!=='NEW MOB SPAWNED')continue;

      const spawned=newestSpawned();
      if(!spawned)continue;
      spawned.xp=SPAWNED_MOB_XP;

      if(safeWindowProtectsCurrentMove()){
        eraseSpawn(spawned);
        node.textContent='SAFE WINDOW · SPAWN PREVENTED';
        continue;
      }

      if(activeSpawned().length>ACTIVE_SPAWN_CAP){
        eraseSpawn(spawned);
        node.textContent='SPAWN PRESSURE CAPPED';
      }
    }
  });
  spawnObserver.observe(toastArea,{childList:true});

  window.HAJJEN_ZONE3_PRESSURE_BALANCE={
    version:'1.1',
    activeSpawnCap:ACTIVE_SPAWN_CAP,
    spawnedMobXp:SPAWNED_MOB_XP,
    get activeSpawned(){return activeSpawned().length;},
    get safeWindow(){return {startStep:safeWindowStartStep,endStep:safeWindowEndStep};}
  };
})();