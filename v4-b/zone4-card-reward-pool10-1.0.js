/* HAJJEN Zone 4 — isolated 10-card Manipulation reward pool.
   Does not replace the movement step setter or the board renderer. The six
   additional reward effects are handled here so Card Reward never produces a
   dead PLAY button. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const api=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
  const movement=window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  const hand=document.getElementById('manipCards');
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==4||!state||!api?.decks||!(entities instanceof Map)||!hand||!world||window.HAJJEN_ZONE4_CARD_REWARD_POOL10)return;

  const pool=[
    {id:'calm-waters',name:'Calm Waters',text:'Reduce Danger by 3.'},
    {id:'ward-sigil',name:'Ward Sigil',text:'Block the next enemy spawn.'},
    {id:'steady-nerves',name:'Steady Nerves',text:'Next 3 movement steps do not advance ambient Danger.'},
    {id:'quiet-harvest',name:'Quiet Harvest',text:'Next harvested ingredient adds no Danger.'},
    {id:'false-trail',name:'False Trail',text:'Block the next adjacent-aggro encounter.'},
    {id:'veiled-passage',name:'Veiled Passage',text:'For the next 3 movement steps, nearby enemies cannot trigger adjacent aggro.'},
    {id:'fresh-tracks',name:'Fresh Tracks',text:'Reset the ambient Danger countdown to 3 movement steps.'},
    {id:'safe-window',name:'Safe Window',text:'No ambient enemy spawn can occur during your next 3 movement steps.'},
    {id:'misdirection',name:'Misdirection',text:'Choose one nearby normal mob and move it 2 tiles away from Sharkan.'},
    {id:'pressure-break',name:'Pressure Break',text:'Reduce Danger by 2 and block the next adjacent-aggro encounter.'}
  ];
  const customIds=new Set(['false-trail','veiled-passage','fresh-tracks','safe-window','misdirection','pressure-break']);
  const key=(r,c)=>`${r},${c}`;
  const clean=value=>String(value||'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const clonePool=list=>list.map(card=>({...card}));
  const inBounds=(r,c)=>r>=0&&c>=0&&r<Number(cfg.rows)&&c<Number(cfg.cols);
  const manhattan=(r,c)=>Math.abs(Number(state.row)-r)+Math.abs(Number(state.col)-c);
  const chebyshev=(r,c)=>Math.max(Math.abs(Number(state.row)-r),Math.abs(Number(state.col)-c));

  let veiledSteps=0;
  let safeWindowSteps=0;
  let adjacentAggroBlocks=0;
  let pendingMisdirection=null;

  function log(text,type='reward'){
    if(!eventLog)return;
    const row=document.createElement('div');row.className=`event ${type}`;row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function toast(text,type='reward'){
    if(!toastArea)return;
    const row=document.createElement('div');row.className=`toast ${type}`;row.textContent=text;toastArea.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function syncDanger(){
    const danger=Math.max(0,Math.min(20,Number(state.danger)||0));
    const text=document.getElementById('dangerText');if(text)text.textContent=`${danger} / 20`;
    const fill=document.getElementById('dangerFill');if(fill)fill.style.width=`${danger*5}%`;
    const badge=document.getElementById('dangerState');
    if(badge)badge.textContent=state.zoneCleared?'CLEARED':danger>=20?'CRITICAL':danger>=15?'HOSTILE':danger>=10?'DANGEROUS':danger>=5?'UNEASY':'CALM';
    const clock=document.getElementById('clockText');if(clock&&!state.zoneCleared)clock.textContent=`${Math.max(0,Number(state.nextAmbient)||0)} steps`;
    const power=document.getElementById('powerText');if(power&&!state.zoneCleared)power.textContent=`+${danger>=20?50:danger>=15?35:danger>=10?20:danger>=5?10:0}%`;
  }
  function syncHand(){
    window.HAJJEN_ZONE4_CARD_REWARD_MANIP_COPY_FIX?.sync?.();
    window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  }

  // Card Reward keeps its proven modal/replacement flow. Only the draw pool is
  // expanded, and cards already present in the four Hand slots are excluded
  // while at least one other reward exists.
  api.decks.manipulation=clonePool(pool);
  const familyButton=document.querySelector('.zone4-card-reward-test-modal [data-family="manipulation"]');
  if(familyButton){
    familyButton.addEventListener('click',()=>{
      const current=new Set((api.manipulationSlots?.()||[]).map(slot=>clean(slot.name)));
      const fresh=pool.filter(card=>!current.has(clean(card.name)));
      api.decks.manipulation=clonePool(fresh.length?fresh:pool);
      queueMicrotask(()=>{api.decks.manipulation=clonePool(pool);});
    },true);
  }

  function markUsed(index,replacement,button){
    replacement.used=true;
    if(button){button.textContent='USED';button.disabled=true;}
    toast(`${replacement.def.name.toUpperCase()} PLAYED`);
    log(`${replacement.def.name} played.`);
    syncDanger();syncHand();
  }

  function repaintEntity(entity,oldR=null,oldC=null){
    if(oldR!==null&&oldC!==null){
      const oldTile=world.querySelector(`.tile[data-r="${oldR}"][data-c="${oldC}"]`);
      if(oldTile){
        oldTile.classList.remove('special','mob','zone4-mobile-enemy-dev');oldTile.removeAttribute('data-mark');
        if(Math.abs(oldR-Number(state.row))+Math.abs(oldC-Number(state.col))===1&&!state.combat&&!state.gameOver)oldTile.classList.add('reachable');
      }
    }
    const tile=world.querySelector(`.tile[data-r="${entity.r}"][data-c="${entity.c}"]`);
    if(tile){tile.classList.add('special',entity.type);tile.dataset.mark=entity.mark||'☠';}
    movement?.decorate?.();
  }

  function moveMobAway(entity){
    const origin={r:Number(entity.r),c:Number(entity.c)};
    const currentDistance=manhattan(origin.r,origin.c);
    const options=[[2,0],[-2,0],[0,2],[0,-2]]
      .map(([dr,dc])=>({r:origin.r+dr,c:origin.c+dc,midR:origin.r+dr/2,midC:origin.c+dc/2}))
      .filter(cell=>inBounds(cell.r,cell.c)&&!entities.has(key(cell.r,cell.c))&&!entities.has(key(cell.midR,cell.midC))&&!(cell.r===Number(state.row)&&cell.c===Number(state.col)))
      .map(cell=>({...cell,distance:manhattan(cell.r,cell.c)}))
      .filter(cell=>cell.distance>currentDistance)
      .sort((a,b)=>b.distance-a.distance);
    const target=options[0];if(!target)return false;
    if(entities.get(key(origin.r,origin.c))!==entity)return false;
    entities.delete(key(origin.r,origin.c));entity.r=target.r;entity.c=target.c;entities.set(key(entity.r,entity.c),entity);
    repaintEntity(entity,origin.r,origin.c);
    return true;
  }

  function useCustom(index,replacement,button){
    const id=replacement?.def?.id;if(!customIds.has(id)||replacement.used)return false;
    if(id==='false-trail'){
      adjacentAggroBlocks++;
      markUsed(index,replacement,button);return true;
    }
    if(id==='veiled-passage'){
      veiledSteps=3;
      markUsed(index,replacement,button);return true;
    }
    if(id==='fresh-tracks'){
      state.nextAmbient=3;
      markUsed(index,replacement,button);return true;
    }
    if(id==='safe-window'){
      safeWindowSteps=3;
      markUsed(index,replacement,button);return true;
    }
    if(id==='pressure-break'){
      const before=Number(state.danger)||0;state.danger=Math.max(0,before-2);adjacentAggroBlocks++;
      if(before!==state.danger)log(`Danger -${before-state.danger} (Pressure Break) → ${state.danger}/20.`,'reward');
      markUsed(index,replacement,button);return true;
    }
    if(id==='misdirection'){
      pendingMisdirection={index,replacement,button};
      button.textContent='SELECT MOB';button.disabled=true;
      toast('SELECT A NEARBY MOB','system');
      log('Misdirection armed: choose a nearby normal mob.','system');
      world.querySelectorAll('.zone4-pool10-target').forEach(tile=>tile.classList.remove('zone4-pool10-target'));
      entities.forEach(entity=>{
        if(entity?.type!=='mob'||entity.completed||chebyshev(Number(entity.r),Number(entity.c))>4)return;
        world.querySelector(`.tile[data-r="${entity.r}"][data-c="${entity.c}"]`)?.classList.add('zone4-pool10-target');
      });
      return true;
    }
    return false;
  }

  const style=document.createElement('style');
  style.dataset.zone4Pool10='1';
  style.textContent='.campaign-world .tile.zone4-pool10-target{outline:3px solid rgba(226,196,107,.95)!important;outline-offset:-4px;filter:brightness(1.12)}';
  document.head.appendChild(style);

  // Intercept only the six additional replacement cards. The original four
  // continue through the already-tested Card Reward handler unchanged.
  hand.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('button[data-card-reward-replacement-key]'):null;
    if(!button||!hand.contains(button))return;
    const card=button.closest('[data-card-reward-manip-slot]');
    const index=Number(card?.dataset.cardRewardManipSlot);
    const replacement=api.manipulationReplacements?.[index];
    if(!replacement||!customIds.has(replacement.def?.id))return;
    event.preventDefault();event.stopImmediatePropagation();
    useCustom(index,replacement,button);
  },true);

  world.addEventListener('click',event=>{
    if(!pendingMisdirection)return;
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;
    if(!tile)return;
    event.preventDefault();event.stopImmediatePropagation();
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c),entity=entities.get(key(r,c));
    if(!entity||entity.type!=='mob'||entity.completed||chebyshev(r,c)>4){toast('CHOOSE A NEARBY NORMAL MOB','system');return;}
    if(!moveMobAway(entity)){toast('NO CLEAR 2-TILE PATH AWAY','danger');return;}
    const pending=pendingMisdirection;pendingMisdirection=null;
    world.querySelectorAll('.zone4-pool10-target').forEach(node=>node.classList.remove('zone4-pool10-target'));
    log(`Misdirection moved ${entity.title} 2 tiles away from Sharkan.`,'reward');
    markUsed(pending.index,pending.replacement,pending.button);
  },true);

  // Veiled Passage / Safe Window protect movement through capture listeners,
  // following the already proven Zone 3 pattern. No state property is replaced.
  function armMoveProtection(targetR,targetC){
    if(state.combat||state.gameOver||Math.abs(targetR-Number(state.row))+Math.abs(targetC-Number(state.col))!==1)return;
    if(veiledSteps<=0&&safeWindowSteps<=0&&adjacentAggroBlocks<=0)return;

    const beforeSteps=Number(state.steps)||0;
    const shadows=[];
    const useVeil=veiledSteps>0;
    const useSingleBlock=!useVeil&&adjacentAggroBlocks>0;
    if(useVeil||useSingleBlock){
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;
        const r=targetR+dr,c=targetC+dc,k=key(r,c),entity=entities.get(k);
        if(!entity||entity.completed||(entity.type!=='mob'&&entity.type!=='elite'))continue;
        shadows.push({k,entity,r,c});
        entities.set(k,{type:'zone4-veiled-shadow',completed:true,r,c,__zone4Pool10Shadow:true});
      }
    }

    const originalSpawnBlock=Number(state.spawnBlock)||0;
    const useSafe=safeWindowSteps>0;
    if(useSafe)state.spawnBlock=originalSpawnBlock+1;

    queueMicrotask(()=>{
      const moved=(Number(state.steps)||0)>beforeSteps;
      shadows.forEach(({k,entity,r,c})=>{
        if(entities.get(k)?.__zone4Pool10Shadow){entities.set(k,entity);repaintEntity(entity);}
      });

      if(useSafe){
        const consumed=(Number(state.spawnBlock)||0)<=originalSpawnBlock;
        state.spawnBlock=originalSpawnBlock;
        const wardToasts=[...(toastArea?.children||[])].filter(node=>(node.textContent||'').trim()==='WARD SIGIL BLOCKED A SPAWN');
        if(consumed){const node=wardToasts[0];if(node)node.textContent='SAFE WINDOW · SPAWN PREVENTED';}
        else wardToasts.forEach(node=>node.remove());
      }

      if(moved){
        if(useVeil)veiledSteps=Math.max(0,veiledSteps-1);
        if(useSafe)safeWindowSteps=Math.max(0,safeWindowSteps-1);
        if(useSingleBlock&&shadows.length){adjacentAggroBlocks=Math.max(0,adjacentAggroBlocks-1);log('Adjacent aggro was blocked.','reward');}
      }
      movement?.decorate?.();
    });
  }

  const moves={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};
  window.addEventListener('keydown',event=>{
    const move=moves[event.key];if(!move||pendingMisdirection)return;
    armMoveProtection(Number(state.row)+move[0],Number(state.col)+move[1]);
  },true);
  world.addEventListener('click',event=>{
    if(pendingMisdirection)return;
    const tile=event.target instanceof Element?event.target.closest('.tile'):null;if(!tile)return;
    armMoveProtection(Number(tile.dataset.r),Number(tile.dataset.c));
  },true);

  window.HAJJEN_ZONE4_CARD_REWARD_POOL10={
    version:'1.1-playable-isolated',pool:clonePool(pool),
    get state(){return {veiledSteps,safeWindowSteps,adjacentAggroBlocks,pendingMisdirection:!!pendingMisdirection};}
  };
})();
