(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==2||!state||!world||!eventLog||!toastArea||window.HAJJEN_ZONE2_COMBAT_ATTRACTION)return;

  const rules=cfg.combatAttraction||{};
  const radius=Number(rules.radius)||3;
  const chanceByTier={hostile:.45,critical:.65,...(rules.chance||{})};
  let pulling=false;

  const dangerTier=()=>state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';
  const tileKey=tile=>`${Number(tile?.dataset?.r)},${Number(tile?.dataset?.c)}`;
  const playerPos=()=>({r:Number(state.row),c:Number(state.col)});
  const chebyshev=(a,b)=>Math.max(Math.abs(a.r-b.r),Math.abs(a.c-b.c));
  const tileAt=(r,c)=>world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);

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
    return [...world.querySelectorAll('.tile.mob.special')].filter(tile=>!tile.classList.contains('completed'));
  }

  function openForMob(r,c,mobTile){
    if(r<0||c<0||r>=cfg.rows||c>=cfg.cols)return false;
    if(r===state.row&&c===state.col)return false;
    const tile=tileAt(r,c);
    if(!tile)return false;
    if(tile===mobTile)return true;
    return !tile.classList.contains('special');
  }

  function pathToAdjacent(mobTile){
    const start={r:Number(mobTile.dataset.r),c:Number(mobTile.dataset.c)};
    const player=playerPos();
    const targets=[[player.r-1,player.c],[player.r+1,player.c],[player.r,player.c-1],[player.r,player.c+1]]
      .filter(([r,c])=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols)
      .filter(([r,c])=>openForMob(r,c,mobTile));
    const targetSet=new Set(targets.map(([r,c])=>`${r},${c}`));
    if(targetSet.has(`${start.r},${start.c}`))return [];

    const queue=[start];
    const prev=new Map([[`${start.r},${start.c}`,null]]);
    let found=null;
    for(let i=0;i<queue.length&&!found;i++){
      const cur=queue[i];
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const r=cur.r+dr,c=cur.c+dc,k=`${r},${c}`;
        if(prev.has(k)||!openForMob(r,c,mobTile))continue;
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
    const player=playerPos();
    const options=activeMobTiles()
      .filter(tile=>chebyshev(player,{r:Number(tile.dataset.r),c:Number(tile.dataset.c)})<=radius)
      .map(tile=>({tile,path:pathToAdjacent(tile)}))
      .filter(item=>Array.isArray(item.path));
    if(!options.length)return null;
    const shortest=Math.min(...options.map(item=>item.path.length));
    const best=options.filter(item=>item.path.length===shortest);
    return best[Math.floor(Math.random()*best.length)]||null;
  }

  function moveVisual(tile,next){
    tile.classList.remove('mob','special','aggro-attracted','aggro-target');
    const mark=tile.dataset.mark;
    tile.removeAttribute('data-mark');
    const target=tileAt(next.r,next.c);
    if(!target)return null;
    target.classList.add('mob','special','aggro-attracted');
    target.dataset.mark=mark||'☠';
    return target;
  }

  function engage(tile){
    if(!tile||state.combat||state.gameOver||state.zoneCleared){pulling=false;return;}
    tile.classList.add('aggro-target');
    setTimeout(()=>{
      if(state.combat||state.gameOver||state.zoneCleared){pulling=false;return;}
      tile.click();
      pulling=false;
    },260);
  }

  function animate(pick){
    if(!pick)return;
    pulling=true;
    let tile=pick.tile;
    addToast('COMBAT ATTRACTED A NEARBY MOB');
    addLog('A nearby mob heard the fight and is moving toward Sharkan.');
    let i=0;
    const step=()=>{
      if(state.combat||state.gameOver||state.zoneCleared){pulling=false;return;}
      if(i>=pick.path.length){engage(tile);return;}
      const next=pick.path[i++];
      const moved=moveVisual(tile,next);
      if(!moved){pulling=false;return;}
      tile=moved;
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
      if(!text||/^Sharkan was defeated/i.test(text))continue;
      if(/ defeated\.$/i.test(text)&&!/ZONE 2 BOSS defeated\.$/i.test(text))queueMicrotask(tryAttraction);
    }
  }).observe(eventLog,{childList:true});

  window.HAJJEN_ZONE2_COMBAT_ATTRACTION={version:'1.0',rules:{radius,chance:chanceByTier},get pulling(){return pulling;}};
})();
