(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const rules=cfg?.combatAttraction||{};
  const entities=window.HAJJEN_ZONE2_ENTITY_MAP;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  const player=document.getElementById('player');
  if(!cfg||cfg.zone!==2||!state||rules.enabled===false||!(entities instanceof Map)||!world||!eventLog||!toastArea||window.HAJJEN_ZONE2_COMBAT_ATTRACTION)return;

  const radius=Number(rules.radius)||3;
  const chanceByTier={calm:0,uneasy:0,dangerous:.30,hostile:.45,critical:.65,...(rules.chance||{})};
  const movementKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D']);
  let pulling=false;
  let syntheticEngage=false;

  const key=(r,c)=>`${r},${c}`;
  const inBounds=(r,c)=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols;
  const chebyshev=(a,b,r,c)=>Math.max(Math.abs(a-r),Math.abs(b-c));
  const tileAt=(r,c)=>world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  const dangerTier=()=>state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';
  const attractionChance=()=>Number(chanceByTier[dangerTier()])||0;

  function addLog(text,type='danger'){
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='danger'){
    const row=document.createElement('div');
    row.className=`toast ${type}`;
    row.textContent=text;
    toastArea.prepend(row);
    setTimeout(()=>row.remove(),1700);
  }
  function setPulling(value){
    pulling=!!value;
    window.HAJJEN_ZONE2_ATTRACTION_PULLING=pulling;
    if(!pulling)world.querySelectorAll('.aggro-attracted').forEach(tile=>tile.classList.remove('aggro-attracted'));
  }

  window.addEventListener('keydown',event=>{
    if(!pulling||syntheticEngage||!movementKeys.has(event.key))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  world.addEventListener('click',event=>{
    if(!pulling||syntheticEngage)return;
    if(!(event.target instanceof Element)||!event.target.closest('.tile'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  function targetCells(entity){
    return [[state.row-1,state.col],[state.row+1,state.col],[state.row,state.col-1],[state.row,state.col+1]]
      .filter(([r,c])=>inBounds(r,c))
      .filter(([r,c])=>{
        const occupied=entities.get(key(r,c));
        return !occupied||occupied===entity;
      })
      .map(([r,c])=>({r,c}));
  }

  function findPath(entity){
    const targets=targetCells(entity);
    if(!targets.length)return null;
    const targetSet=new Set(targets.map(point=>key(point.r,point.c)));
    const startKey=key(entity.r,entity.c);
    if(targetSet.has(startKey))return [];

    const queue=[{r:entity.r,c:entity.c}];
    const prev=new Map([[startKey,null]]);
    let found=null;
    for(let i=0;i<queue.length&&!found;i++){
      const cur=queue[i];
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const r=cur.r+dr,c=cur.c+dc,k=key(r,c);
        if(!inBounds(r,c)||prev.has(k)||(r===state.row&&c===state.col))continue;
        const occupied=entities.get(k);
        if(occupied&&occupied!==entity)continue;
        prev.set(k,key(cur.r,cur.c));
        queue.push({r,c});
        if(targetSet.has(k)){found={r,c};break;}
      }
    }
    if(!found)return null;

    const path=[];
    let cursor=key(found.r,found.c);
    while(cursor&&cursor!==startKey){
      const [r,c]=cursor.split(',').map(Number);
      path.unshift({r,c});
      cursor=prev.get(cursor);
    }
    return path;
  }

  function pickAttractedMob(){
    const options=[...entities.values()]
      .filter(entity=>entity?.type==='mob'&&!entity.completed&&chebyshev(state.row,state.col,entity.r,entity.c)<=radius)
      .map(entity=>({entity,path:findPath(entity)}))
      .filter(item=>Array.isArray(item.path));
    if(!options.length)return null;
    const shortest=Math.min(...options.map(item=>item.path.length));
    const best=options.filter(item=>item.path.length===shortest);
    return best[Math.floor(Math.random()*best.length)]||null;
  }

  function clearMobTile(r,c){
    const tile=tileAt(r,c);
    if(!tile)return;
    tile.classList.remove('special','mob','aggro-attracted','aggro-target','spawned-now');
    tile.removeAttribute('data-mark');
  }
  function paintMob(entity,className='aggro-attracted'){
    const tile=tileAt(entity.r,entity.c);
    if(!tile)return;
    tile.classList.add('special','mob',className);
    tile.dataset.mark=entity.mark||'☠';
  }
  function moveMob(entity,next){
    const occupied=entities.get(key(next.r,next.c));
    if(occupied&&occupied!==entity)return false;
    const old={r:entity.r,c:entity.c};
    entities.delete(key(old.r,old.c));
    entity.r=next.r;entity.c=next.c;
    entities.set(key(entity.r,entity.c),entity);
    clearMobTile(old.r,old.c);
    paintMob(entity);
    return true;
  }

  function syncPlayerAfterSynthetic(){
    world.querySelectorAll('.tile.current,.tile.reachable').forEach(tile=>tile.classList.remove('current','reachable'));
    tileAt(state.row,state.col)?.classList.add('current');
    if(player){
      player.style.left=`${((state.col+.5)/cfg.cols)*100}%`;
      player.style.top=`${((state.row+.5)/cfg.rows)*100}%`;
    }
    window.dispatchEvent(new Event('resize'));
  }

  function engage(entity){
    if(state.zoneCleared||state.gameOver||state.combat||entity.completed){setPulling(false);return;}
    const tile=tileAt(entity.r,entity.c);
    if(!tile||Math.abs(entity.r-state.row)+Math.abs(entity.c-state.col)!==1){setPulling(false);return;}

    const origin={
      row:state.row,col:state.col,steps:state.steps,danger:state.danger,
      nextAmbient:state.nextAmbient,steadySteps:state.steadySteps||0,spawnBlock:state.spawnBlock||0
    };
    const livePrepend=eventLog.prepend;
    const queued=[];
    eventLog.prepend=function(...nodes){queued.push(nodes);};

    state.steadySteps=Math.max(1,state.steadySteps||0);
    syntheticEngage=true;
    window.HAJJEN_ZONE2_SYNTHETIC_ENGAGE=true;
    try{tile.click();}
    finally{
      syntheticEngage=false;
      window.HAJJEN_ZONE2_SYNTHETIC_ENGAGE=false;
      eventLog.prepend=livePrepend;
    }

    const engaged=!!state.combat;
    state.row=origin.row;state.col=origin.col;
    state.prevRow=origin.row;state.prevCol=origin.col;
    state.steps=origin.steps;state.danger=origin.danger;
    state.nextAmbient=origin.nextAmbient;state.steadySteps=origin.steadySteps;state.spawnBlock=origin.spawnBlock;
    syncPlayerAfterSynthetic();

    queued.forEach(args=>livePrepend.apply(eventLog,args));
    setPulling(false);
    if(!engaged)paintMob(entity,'aggro-target');
  }

  function animatePick(pick){
    if(!pick||state.zoneCleared||state.gameOver||state.combat){setPulling(false);return;}
    const {entity,path}=pick;
    addToast('COMBAT ATTRACTED A NEARBY MOB');
    addLog(`${entity.title} heard the fight and is moving toward Sharkan.`);
    paintMob(entity);

    let index=0;
    const step=()=>{
      if(state.zoneCleared||state.gameOver||state.combat||entity.completed){setPulling(false);return;}
      if(index>=path.length){
        world.querySelectorAll('.aggro-attracted').forEach(tile=>tile.classList.remove('aggro-attracted'));
        paintMob(entity,'aggro-target');
        setTimeout(()=>engage(entity),260);
        return;
      }
      const next=path[index++];
      if(!moveMob(entity,next)){setPulling(false);return;}
      setTimeout(step,190);
    };
    setTimeout(step,360);
  }

  function tryAttraction(){
    if(pulling||state.zoneCleared||state.gameOver||state.combat)return;
    const chance=attractionChance();
    if(!chance||Math.random()>chance)return;
    const pick=pickAttractedMob();
    if(!pick)return;
    setPulling(true);
    setTimeout(()=>animatePick(pick),420);
  }

  new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      if(!text||/^Sharkan was defeated/i.test(text)||/^ZONE 2 BOSS defeated\.$/i.test(text))continue;
      if(/ defeated\.$/i.test(text))queueMicrotask(tryAttraction);
    }
  }).observe(eventLog,{childList:true});

  window.HAJJEN_ZONE2_COMBAT_ATTRACTION={
    version:'2.0-entity-parity',
    rules:{radius,chance:chanceByTier},
    entities,
    get pulling(){return pulling;}
  };
})();
