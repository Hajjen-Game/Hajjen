/* HAJJEN Zone 4 DEV — moving-enemy prototype V8.
   All placed mobs + elites can move, but activation is staged by how far Sharkan
   has ever progressed toward the boss. Position decides who is awake; Danger
   decides how aggressively awake enemies behave. Ambient spawns stay suppressed.

   V8 keeps V7 cadence, animation, awareness memory and four-move budget, with
   two pursuit fixes:
   - A moving mob/elite that reaches core adjacency now forces combat even below
     Danger 10; Danger still decides whether/how strongly enemies pursue.
   - Within the same Hunting/Alert priority, enemies closer to Sharkan move first.
     The rotating cursor remains the tie-breaker and still controls Idle fairness. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!(entities instanceof Map)||window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV)return;

  const key=(r,c)=>`${r},${c}`;
  const distance=(a,b)=>Math.abs(Number(a.r)-Number(b.r))+Math.abs(Number(a.c)-Number(b.c));
  const coreAdjacent=(a,b)=>Math.max(Math.abs(Number(a.r)-Number(b.r)),Math.abs(Number(a.c)-Number(b.c)))<=1;
  const mobile=[];
  const eventLog=document.getElementById('eventLog');
  const world=document.getElementById('world');
  const spawnBlockBeforeTest=Number(state.spawnBlock)||0;
  const movementKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D']);
  const START_DELAY_MS=110;
  const MOVE_MS=190;
  const STAGGER_MS=40;
  const HUNT_MEMORY_STEPS=3;
  const ALERT_MEMORY_STEPS=2;
  const MOB_ACTIVATION_LEAD=6;
  const ELITE_ACTIVATION_LEAD=4;
  const PROXIMITY_WAKE_DISTANCE=3;
  const MAX_MOVES_PER_STEP=4;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  let visualMoving=false;
  let visualTimer=0;
  let furthestCol=Number(state.col)||0;
  let moveCursor=0;
  state.spawnBlock=1000000;

  function addLog(text){
    if(!eventLog)return;
    const row=document.createElement('div');row.className='event system';row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  entities.forEach(entity=>{
    if(!entity||entity.completed||(entity.type!=='mob'&&entity.type!=='elite'))return;
    const index=mobile.length;
    entity.zone4MobileDev=true;
    entity.zone4MoveHome={r:Number(entity.r),c:Number(entity.c)};
    entity.zone4MobileIndex=index;
    entity.zone4CadenceSeed=index;
    entity.zone4PathPhase=index;
    entity.zone4MoveMode='idle';
    entity.zone4LastMoveStep=0;
    entity.zone4HuntMemoryUntil=0;
    entity.zone4AlertMemoryUntil=0;
    entity.zone4LastKnown={r:Number(entity.r),c:Number(entity.c)};
    entity.zone4MoveActive=false;
    mobile.push(entity);
  });

  const motionStyle=document.createElement('style');
  motionStyle.dataset.zone4EnemyMotion='v8';
  motionStyle.textContent=`
    .zone4-enemy-motion-ghost,.zone4-enemy-motion-cover{
      position:absolute!important;pointer-events:none!important;margin:0!important;border:0!important;
      border-radius:0!important;box-shadow:none!important;background-position:center!important;
      background-size:100% 100%!important;background-repeat:no-repeat!important;
    }
    .zone4-enemy-motion-cover{z-index:7}
    .zone4-enemy-motion-ghost{z-index:8;will-change:transform,filter;transform-origin:center center}
    .zone4-enemy-motion-ghost.mob{background:#542522 url('assets/encounter_mob.webp?v=4') center/100% 100% no-repeat!important}
    .zone4-enemy-motion-ghost.elite{background:#542522 url('assets/encounter_elite.webp?v=4') center/100% 100% no-repeat!important}
    .zone4-enemy-motion-ghost[data-mode="alert"]{filter:brightness(1.035)}
    .zone4-enemy-motion-ghost[data-mode="hunting"]{filter:brightness(1.065)}
    .zone4-enemy-motion-ghost::before,.zone4-enemy-motion-ghost::after,
    .zone4-enemy-motion-cover::before,.zone4-enemy-motion-cover::after{display:none!important;content:none!important}
  `;
  document.head.appendChild(motionStyle);

  const toastArea=document.getElementById('toastArea');
  const spawnToastObserver=toastArea&&typeof MutationObserver==='function'
    ?new MutationObserver(()=>{[...toastArea.children].forEach(node=>{if((node.textContent||'').trim()==='SPAWN BLOCKED')node.remove();});})
    :null;
  spawnToastObserver?.observe(toastArea,{childList:true});

  function activationLead(enemy){return enemy.type==='elite'?ELITE_ACTIVATION_LEAD:MOB_ACTIVATION_LEAD;}
  function shouldActivate(enemy){
    if(enemy.zone4MoveActive)return true;
    const home=enemy.zone4MoveHome||enemy;
    if(Number(home.c)<=furthestCol+activationLead(enemy))return true;
    return distance(enemy,{r:state.row,c:state.col})<=PROXIMITY_WAKE_DISTANCE;
  }
  function activateEnemy(enemy,announce=true){
    if(!enemy||enemy.completed||enemy.zone4MoveActive)return false;
    enemy.zone4MoveActive=true;
    enemy.zone4LastKnown={r:Number(state.row),c:Number(state.col)};
    if(announce)addLog(`${enemy.title} becomes ACTIVE.`);
    return true;
  }
  function syncActivation(announce=true){
    furthestCol=Math.max(furthestCol,Number(state.col)||0);
    mobile.forEach(enemy=>{if(!enemy.completed&&shouldActivate(enemy))activateEnemy(enemy,announce);});
  }

  // Seed the opening area silently so the run begins with only the nearby/front
  // section alive instead of printing several activation messages at Step 0.
  syncActivation(false);

  function blocked(r,c,enemy){
    if(r<0||c<0||r>=cfg.rows||c>=cfg.cols)return true;
    if(r===state.row&&c===state.col)return true;
    const reward=cfg.cardRewardTest;
    if(reward&&r===Number(reward.row)&&c===Number(reward.col))return true;
    const occupying=entities.get(key(r,c));
    return !!(occupying&&occupying!==enemy&&!occupying.completed);
  }

  function neighbors(enemy){
    return [
      {r:enemy.r-1,c:enemy.c,dir:0},
      {r:enemy.r,c:enemy.c+1,dir:1},
      {r:enemy.r+1,c:enemy.c,dir:2},
      {r:enemy.r,c:enemy.c-1,dir:3}
    ].filter(cell=>!blocked(cell.r,cell.c,enemy));
  }

  function sensedMode(enemy){
    const d=distance(enemy,{r:state.row,c:state.col});
    const danger=Number(state.danger)||0;
    if(enemy.type==='elite'){
      if(danger>=15&&d<=5)return 'hunting';
      if(danger>=10&&d<=5)return 'alert';
      return 'idle';
    }
    if(danger>=20)return 'hunting';
    if(danger>=10&&d<=7)return 'hunting';
    if(danger>=5&&d<=6)return 'alert';
    return 'idle';
  }

  function awarenessFor(enemy,step){
    const sensed=sensedMode(enemy);
    const player={r:Number(state.row),c:Number(state.col)};

    if(sensed==='hunting'){
      enemy.zone4LastKnown={...player};
      enemy.zone4HuntMemoryUntil=step+HUNT_MEMORY_STEPS;
      enemy.zone4AlertMemoryUntil=step+HUNT_MEMORY_STEPS+ALERT_MEMORY_STEPS;
      return {mode:'hunting',target:player,sensed:true};
    }

    if(sensed==='alert'){
      enemy.zone4LastKnown={...player};
      enemy.zone4AlertMemoryUntil=Math.max(Number(enemy.zone4AlertMemoryUntil)||0,step+ALERT_MEMORY_STEPS);
      if(enemy.zone4MoveMode==='hunting'&&step<=Number(enemy.zone4HuntMemoryUntil||0)){
        return {mode:'hunting',target:player,sensed:true};
      }
      return {mode:'alert',target:player,sensed:true};
    }

    if(enemy.zone4MoveMode==='hunting'&&step<=Number(enemy.zone4HuntMemoryUntil||0)){
      return {mode:'hunting',target:enemy.zone4LastKnown||player,sensed:false};
    }

    if((enemy.zone4MoveMode==='alert'||enemy.zone4MoveMode==='hunting')&&step<=Number(enemy.zone4AlertMemoryUntil||0)){
      return {mode:'alert',target:enemy.zone4LastKnown||player,sensed:false};
    }

    return {mode:'idle',target:null,sensed:false};
  }

  function cadenceAllows(enemy,mode,step){
    const seed=Number(enemy.zone4CadenceSeed)||0;
    const danger=Number(state.danger)||0;
    if(mode==='idle')return step%3===seed%3;
    if(mode==='alert')return step%2===seed%2;
    if(mode==='hunting')return danger>=15||step%2===seed%2;
    return false;
  }

  function withinLeash(enemy,cell,mode){
    const home=enemy.zone4MoveHome;
    if(enemy.type==='elite')return distance(cell,home)<= (mode==='idle'?2:3);
    if(mode==='idle')return distance(cell,home)<=2;
    return true;
  }

  function choosePatrol(enemy,cells){
    const home=enemy.zone4MoveHome;
    const homeDistance=distance(enemy,home);
    if(homeDistance>2){
      const best=Math.min(...cells.map(cell=>distance(cell,home)));
      const towardHome=cells.filter(cell=>distance(cell,home)===best&&best<homeDistance);
      if(towardHome.length){
        const phase=Number(enemy.zone4PathPhase)||0;
        towardHome.sort((a,b)=>((a.dir-phase+8)%4)-((b.dir-phase+8)%4));
        return towardHome[0]||null;
      }
    }

    const allowed=cells.filter(cell=>withinLeash(enemy,cell,'idle'));
    if(!allowed.length)return null;
    const phase=Number(enemy.zone4PathPhase)||0;
    const preferredDir=(phase+1)%4;
    return [...allowed].sort((a,b)=>{
      const ar=(a.dir-preferredDir+4)%4,br=(b.dir-preferredDir+4)%4;
      if(ar!==br)return ar-br;
      return distance(b,home)-distance(a,home);
    })[0]||null;
  }

  function chooseToward(enemy,cells,mode,target){
    const destinationTarget=target||{r:state.row,c:state.col};
    const current=distance(enemy,destinationTarget);
    let allowed=cells.filter(cell=>withinLeash(enemy,cell,mode));
    if(!allowed.length)return null;
    const best=Math.min(...allowed.map(cell=>distance(cell,destinationTarget)));
    if(best>=current)return null;
    allowed=allowed.filter(cell=>distance(cell,destinationTarget)===best);
    const phase=Number(enemy.zone4PathPhase)||0;
    allowed.sort((a,b)=>((a.dir-phase+8)%4)-((b.dir-phase+8)%4));
    return allowed[0]||null;
  }

  function setMode(enemy,nextMode){
    const previous=enemy.zone4MoveMode||'idle';
    if(previous===nextMode)return;
    enemy.zone4MoveMode=nextMode;
    if(nextMode==='idle')addLog(`${enemy.title} settles back to IDLE.`);
    else if(nextMode==='alert'&&previous==='hunting')addLog(`${enemy.title} loses the trail but remains ALERT.`);
    else if(nextMode==='alert')addLog(`${enemy.title} becomes ALERT.`);
    else if(nextMode==='hunting')addLog(`${enemy.title} is now HUNTING Sharkan.`);
  }

  function moveEnemy(enemy,destination,step){
    if(!destination)return null;
    const oldKey=key(enemy.r,enemy.c),newKey=key(destination.r,destination.c);
    if(oldKey===newKey||entities.get(oldKey)!==enemy)return null;
    const from={r:Number(enemy.r),c:Number(enemy.c)};
    const mode=enemy.zone4MoveMode||'idle';
    entities.delete(oldKey);
    enemy.r=destination.r;enemy.c=destination.c;
    enemy.zone4PathPhase=(Number(enemy.zone4PathPhase)||0)+1;
    enemy.zone4LastMoveStep=step;
    entities.set(newKey,enemy);
    addLog(`${enemy.title} ${mode==='idle'?'patrols':'advances'} R${from.r+1}C${from.c+1} → R${destination.r+1}C${destination.c+1}.`);
    return {enemy,from,to:{r:destination.r,c:destination.c},mode,type:enemy.type};
  }

  function armLowDangerContact(enemy,player){
    if(!enemy||Number(state.danger)>=10||state.combat||!coreAdjacent(enemy,player))return false;
    const playerKey=key(state.row,state.col);
    const previous=entities.get(playerKey);

    // campaign-zone's resolveTile() runs synchronously after the steps setter.
    // Temporarily expose the adjacent mover at Sharkan's coordinate so the
    // existing core startCombat path is used with the real current Danger scale.
    // Restore any underlying tile entity immediately after that synchronous pass.
    entities.set(playerKey,enemy);
    queueMicrotask(()=>{
      if(entities.get(playerKey)!==enemy)return;
      if(previous)entities.set(playerKey,previous);
      else entities.delete(playerKey);
    });
    return true;
  }

  function hasCoreAdjacentThreat(){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      const entity=entities.get(key(state.row+dr,state.col+dc));
      if(entity&&!entity.completed&&(entity.type==='mob'||entity.type==='elite'))return true;
    }
    return false;
  }

  function decorateMobileEnemies(){
    if(!world)return;
    world.querySelectorAll('.tile.zone4-mobile-enemy-dev').forEach(tile=>{tile.classList.remove('zone4-mobile-enemy-dev');delete tile.dataset.mobileMode;delete tile.dataset.mobileActive;});
    mobile.forEach(enemy=>{
      if(!enemy||enemy.completed)return;
      const tile=world.querySelector(`.tile[data-r="${enemy.r}"][data-c="${enemy.c}"]`);
      if(tile&&enemy.zone4MoveActive){
        tile.classList.add('zone4-mobile-enemy-dev');
        tile.dataset.mobileMode=enemy.zone4MoveMode||'idle';
        tile.dataset.mobileActive='1';
      }
    });
  }

  function overlayBox(node,r,c){
    node.style.left=`${(c/cfg.cols)*100}%`;
    node.style.top=`${(r/cfg.rows)*100}%`;
    node.style.width=`${(1/cfg.cols)*100}%`;
    node.style.height=`${(1/cfg.rows)*100}%`;
  }

  function coverBackground(cover,r,c){
    const tile=world?.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    const dark=tile?.matches(':nth-child(even)');
    cover.style.backgroundColor=dark?'var(--board-sage-dark,#819171)':'var(--board-sage-light,#9CAF88)';
    cover.style.backgroundImage=`url('assets/board_tile_${dark?'dark':'light'}.webp?v=3')`;
  }

  function clearMotionVisuals(){
    if(!world)return;
    world.querySelectorAll('.zone4-enemy-motion-ghost,.zone4-enemy-motion-cover').forEach(node=>node.remove());
  }

  function playMoveAnimations(records){
    if(!world||!records.length){visualMoving=false;return;}
    clearTimeout(visualTimer);
    clearMotionVisuals();

    if(reducedMotion){visualMoving=false;return;}

    records.forEach((record,index)=>{
      const cover=document.createElement('div');
      cover.className='zone4-enemy-motion-cover';
      cover.setAttribute('aria-hidden','true');
      overlayBox(cover,record.to.r,record.to.c);
      coverBackground(cover,record.to.r,record.to.c);
      world.appendChild(cover);

      const ghost=document.createElement('div');
      ghost.className=`zone4-enemy-motion-ghost ${record.type==='elite'?'elite':'mob'}`;
      ghost.dataset.mode=record.mode;
      ghost.setAttribute('aria-hidden','true');
      overlayBox(ghost,record.from.r,record.from.c);
      world.appendChild(ghost);

      const dx=(record.to.c-record.from.c)*100;
      const dy=(record.to.r-record.from.r)*100;
      const delay=START_DELAY_MS+(index*STAGGER_MS);
      const animation=ghost.animate([
        {transform:'translate(0%,0%) scale(.97)',filter:record.mode==='hunting'?'brightness(1.065)':'brightness(1)'},
        {transform:`translate(${dx}%,${dy}%) scale(1.02)`,offset:.72},
        {transform:`translate(${dx}%,${dy}%) scale(1)`}
      ],{duration:MOVE_MS,delay,easing:'cubic-bezier(.22,.78,.24,1)',fill:'forwards'});

      const cleanup=()=>{ghost.remove();cover.remove();};
      animation.finished.then(cleanup).catch(cleanup);
      setTimeout(cleanup,delay+MOVE_MS+80);
    });

    const total=START_DELAY_MS+MOVE_MS+Math.max(0,records.length-1)*STAGGER_MS+30;
    visualTimer=setTimeout(()=>{visualMoving=false;clearMotionVisuals();},total);
  }

  function modePriority(mode){return mode==='hunting'?2:mode==='alert'?1:0;}

  function enemyTurn(step){
    if(state.combat||state.gameOver||state.zoneCleared)return;

    syncActivation(true);

    const occupied=entities.get(key(state.row,state.col));
    if(occupied&&!occupied.completed&&(occupied.type==='mob'||occupied.type==='elite'||occupied.type==='boss'))return;

    // Core aggro checks all 8 neighboring cells. If Sharkan already ended beside
    // a threat, do not move unrelated enemies before that combat is resolved.
    if(hasCoreAdjacentThreat())return;

    const player={r:state.row,c:state.col};
    const candidates=[];
    for(const enemy of mobile){
      if(!enemy||enemy.completed||!enemy.zone4MoveActive)continue;
      const awareness=awarenessFor(enemy,step);
      const mode=awareness.mode;
      setMode(enemy,mode);
      if(coreAdjacent(enemy,player))continue;
      if(!cadenceAllows(enemy,mode,step))continue;
      const rotationRank=(Number(enemy.zone4MobileIndex)-moveCursor+mobile.length)%mobile.length;
      candidates.push({enemy,awareness,mode,rotationRank,playerDistance:distance(enemy,player)});
    }

    candidates.sort((a,b)=>{
      const priority=modePriority(b.mode)-modePriority(a.mode);
      if(priority)return priority;
      if(a.mode!=='idle'){
        const proximity=a.playerDistance-b.playerDistance;
        if(proximity)return proximity;
      }
      return a.rotationRank-b.rotationRank;
    });

    const moved=[];
    for(const candidate of candidates){
      if(moved.length>=MAX_MOVES_PER_STEP)break;
      const {enemy,awareness,mode}=candidate;
      if(enemy.completed||!enemy.zone4MoveActive||coreAdjacent(enemy,player))continue;
      const cells=neighbors(enemy);
      if(!cells.length)continue;
      const destination=mode==='idle'
        ?choosePatrol(enemy,cells)
        :chooseToward(enemy,cells,mode,awareness.target);
      const record=moveEnemy(enemy,destination,step);
      if(!record)continue;
      moved.push(record);

      // Contact is physical, not gated by the Danger threshold. At Danger 10+
      // the existing core adjacent-aggro path starts combat. Below 10, expose
      // this mover to the same core startCombat path via a one-stack alias.
      if(coreAdjacent(enemy,player)){
        armLowDangerContact(enemy,player);
        break;
      }
    }

    moveCursor=(moveCursor+1)%Math.max(1,mobile.length);

    if(moved.length){
      visualMoving=true;
      document.dispatchEvent(new CustomEvent('hajjen:zone4-enemy-movement-dev',{
        detail:{
          step,furthestCol,active:mobile.filter(enemy=>enemy.zone4MoveActive&&!enemy.completed).length,
          moved:moved.map(record=>({title:record.enemy.title,type:record.enemy.type,r:record.enemy.r,c:record.enemy.c,mode:record.enemy.zone4MoveMode}))
        }
      }));
      queueMicrotask(()=>{decorateMobileEnemies();playMoveAnimations(moved);});
    }else queueMicrotask(decorateMobileEnemies);
  }

  function blockMovementDuringAnimation(event){
    if(!visualMoving||!movementKeys.has(event.key))return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function blockBoardClickDuringAnimation(event){
    if(!visualMoving||!(event.target instanceof Element)||!event.target.closest('.tile'))return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  window.addEventListener('keydown',blockMovementDuringAnimation,true);
  world?.addEventListener('click',blockBoardClickDuringAnimation,true);

  let stepsValue=Number(state.steps)||0;
  const previousDescriptor=Object.getOwnPropertyDescriptor(state,'steps');
  Object.defineProperty(state,'steps',{
    configurable:true,enumerable:true,
    get(){return stepsValue;},
    set(value){
      const next=Number(value)||0,previous=stepsValue;
      stepsValue=next;
      if(next>previous)enemyTurn(next);
    }
  });

  decorateMobileEnemies();
  const openingActive=mobile.filter(enemy=>enemy.zone4MoveActive&&!enemy.completed).length;
  addLog(`DEV V8: staged movement active — ${openingActive}/${mobile.length} enemies awake; contact aggro + proximity priority enabled; ambient spawns disabled.`);

  window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV={
    version:'8.0-contact-aggro-proximity-priority',mobile,enemyTurn,decorate:decorateMobileEnemies,syncActivation,
    rules:{mobActivationLead:MOB_ACTIVATION_LEAD,eliteActivationLead:ELITE_ACTIVATION_LEAD,proximityWake:PROXIMITY_WAKE_DISTANCE,maxMovesPerStep:MAX_MOVES_PER_STEP,huntMemory:HUNT_MEMORY_STEPS,alertMemory:ALERT_MEMORY_STEPS,contactAggro:true,proximityPriority:true},
    get furthestCol(){return furthestCol;},
    get activeCount(){return mobile.filter(enemy=>enemy.zone4MoveActive&&!enemy.completed).length;},
    get visualMoving(){return visualMoving;},
    restore(){
      spawnToastObserver?.disconnect();
      window.removeEventListener('keydown',blockMovementDuringAnimation,true);
      world?.removeEventListener('click',blockBoardClickDuringAnimation,true);
      clearTimeout(visualTimer);clearMotionVisuals();motionStyle.remove();
      state.spawnBlock=spawnBlockBeforeTest;
      if(previousDescriptor)Object.defineProperty(state,'steps',previousDescriptor);
      else Object.defineProperty(state,'steps',{configurable:true,enumerable:true,writable:true,value:stepsValue});
    }
  };
})();