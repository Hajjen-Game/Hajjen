(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==2||!state||!world||!eventLog||!toastArea||window.HAJJEN_ZONE2_COMBAT_ATTRACTION)return;

  const rules=cfg.combatAttraction||{};
  const radius=Number(rules.radius)||3;
  const chanceByTier={calm:0,uneasy:0,dangerous:.30,hostile:.45,critical:.65,...(rules.chance||{})};
  const movementKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D']);
  let pulling=false;
  let synthetic=false;

  const dangerTier=()=>state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';
  const tileAt=(r,c)=>world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  const chebyshev=(r,c)=>Math.max(Math.abs(r-state.row),Math.abs(c-state.col));

  window.addEventListener('keydown',event=>{
    if(!pulling||synthetic||!movementKeys.has(event.key))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  world.addEventListener('click',event=>{
    if(!pulling||synthetic)return;
    if(!(event.target instanceof Element)||!event.target.closest('.tile'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

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

  function activeMobTiles(){
    return [...world.querySelectorAll('.tile.special.mob')].filter(tile=>!tile.classList.contains('completed'));
  }

  function openCell(r,c,source){
    if(r<0||c<0||r>=cfg.rows||c>=cfg.cols)return false;
    if(r===state.row&&c===state.col)return false;
    const tile=tileAt(r,c);
    if(!tile)return false;
    if(tile===source)return true;
    return !tile.classList.contains('special');
  }

  function pathToPlayer(source){
    const start={r:Number(source.dataset.r),c:Number(source.dataset.c)};
    const targets=[[state.row-1,state.col],[state.row+1,state.col],[state.row,state.col-1],[state.row,state.col+1]]
      .filter(([r,c])=>openCell(r,c,source));
    const targetSet=new Set(targets.map(([r,c])=>`${r},${c}`));
    if(targetSet.has(`${start.r},${start.c}`))return [];

    const queue=[start];
    const prev=new Map([[`${start.r},${start.c}`,null]]);
    let found=null;
    for(let i=0;i<queue.length&&!found;i++){
      const cur=queue[i];
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const r=cur.r+dr,c=cur.c+dc,k=`${r},${c}`;
        if(prev.has(k)||!openCell(r,c,source))continue;
        prev.set(k,`${cur.r},${cur.c}`);
        queue.push({r,c});
        if(targetSet.has(k)){found={r,c};break;}
      }
    }
    if(!found)return null;
    const path=[];
    let cursor=`${found.r},${found.c}`;
    while(cursor&&cursor!==`${start.r},${start.c}`){
      const [r,c]=cursor.split(',').map(Number);
      path.unshift({r,c});
      cursor=prev.get(cursor);
    }
    return path;
  }

  function pickMob(){
    const options=activeMobTiles()
      .filter(tile=>chebyshev(Number(tile.dataset.r),Number(tile.dataset.c))<=radius)
      .map(tile=>({tile,path:pathToPlayer(tile)}))
      .filter(item=>Array.isArray(item.path));
    if(!options.length)return null;
    const shortest=Math.min(...options.map(item=>item.path.length));
    const best=options.filter(item=>item.path.length===shortest);
    return best[Math.floor(Math.random()*best.length)]||null;
  }

  function clearGhost(tile,source){
    if(!tile||tile===source)return;
    tile.classList.remove('special','mob','aggro-attracted','aggro-target');
    tile.removeAttribute('data-mark');
  }

  function showGhost(tile){
    tile.classList.add('special','mob','aggro-attracted');
    tile.dataset.mark='☠';
  }

  function syntheticEngage(source){
    if(state.combat||state.gameOver||state.zoneCleared){pulling=false;source.style.visibility='';return;}
    const mobR=Number(source.dataset.r),mobC=Number(source.dataset.c);
    const origin={
      row:state.row,col:state.col,prevRow:state.prevRow,prevCol:state.prevCol,
      steps:state.steps,danger:state.danger,nextAmbient:state.nextAmbient,
      steadySteps:state.steadySteps||0,spawnBlock:state.spawnBlock||0
    };
    const adjacent=[[mobR-1,mobC],[mobR+1,mobC],[mobR,mobC-1],[mobR,mobC+1]]
      .find(([r,c])=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols);
    if(!adjacent){pulling=false;source.style.visibility='';return;}

    state.row=adjacent[0];state.col=adjacent[1];
    state.prevRow=origin.row;state.prevCol=origin.col;
    source.style.visibility='';
    synthetic=true;
    try{source.click();}
    finally{synthetic=false;}

    const engaged=!!state.combat;
    state.row=origin.row;state.col=origin.col;
    state.prevRow=origin.row;state.prevCol=origin.col;
    state.steps=origin.steps;state.danger=origin.danger;
    state.nextAmbient=origin.nextAmbient;state.steadySteps=origin.steadySteps;state.spawnBlock=origin.spawnBlock;
    window.dispatchEvent(new Event('resize'));
    pulling=false;
    if(!engaged)addLog('Combat attraction ended before the mob could engage.','system');
  }

  function animate(pick){
    if(!pick||state.combat||state.gameOver||state.zoneCleared)return;
    pulling=true;
    const source=pick.tile;
    source.style.visibility='hidden';
    addToast('COMBAT ATTRACTED A NEARBY MOB');
    addLog('A nearby mob heard the fight and is moving toward Sharkan.');
    let ghost=null,index=0;
    const step=()=>{
      if(state.combat||state.gameOver||state.zoneCleared){
        clearGhost(ghost,source);source.style.visibility='';pulling=false;return;
      }
      if(index>=pick.path.length){
        if(ghost)ghost.classList.add('aggro-target');
        setTimeout(()=>{clearGhost(ghost,source);syntheticEngage(source);},260);
        return;
      }
      clearGhost(ghost,source);
      ghost=tileAt(pick.path[index].r,pick.path[index].c);
      index++;
      if(!ghost){source.style.visibility='';pulling=false;return;}
      showGhost(ghost);
      setTimeout(step,190);
    };
    setTimeout(step,360);
  }

  function tryAttraction(){
    if(pulling||state.combat||state.gameOver||state.zoneCleared)return;
    const chance=Number(chanceByTier[dangerTier()])||0;
    if(!chance||Math.random()>chance)return;
    const pick=pickMob();
    if(pick)setTimeout(()=>animate(pick),420);
  }

  new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      if(!text||/^Sharkan was defeated/i.test(text)||/^ZONE 2 BOSS defeated\.$/i.test(text))continue;
      if(/ defeated\.$/i.test(text))queueMicrotask(tryAttraction);
    }
  }).observe(eventLog,{childList:true});

  window.HAJJEN_ZONE2_COMBAT_ATTRACTION={version:'1.2',rules:{radius,chance:chanceByTier},get pulling(){return pulling;}};
})();
