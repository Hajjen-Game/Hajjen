/* HAJJEN Zone 4 DEV — moving-enemy prototype V4.
   Purpose: test coherent enemy movement, not difficulty tuning.
   Exactly 3 mobs + 1 elite participate. Ambient spawns stay suppressed so this
   test only measures patrol / alert / hunting behavior. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!(entities instanceof Map)||window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV)return;

  const key=(r,c)=>`${r},${c}`;
  const distance=(a,b)=>Math.abs(Number(a.r)-Number(b.r))+Math.abs(Number(a.c)-Number(b.c));
  const coreAdjacent=(a,b)=>Math.max(Math.abs(Number(a.r)-Number(b.r)),Math.abs(Number(a.c)-Number(b.c)))<=1;
  const mobileTitles=new Set(['RIFT HUNTER','AETHER PROWLER','VOID HUNTER','DUSK SENTINEL']);
  const mobile=[];
  const eventLog=document.getElementById('eventLog');
  const world=document.getElementById('world');
  const spawnBlockBeforeTest=Number(state.spawnBlock)||0;
  state.spawnBlock=1000000;

  function addLog(text){
    if(!eventLog)return;
    const row=document.createElement('div');row.className='event system';row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  entities.forEach(entity=>{
    if(!entity||entity.completed||!mobileTitles.has(entity.title))return;
    const index=mobile.length;
    entity.zone4MobileDev=true;
    entity.zone4MoveHome={r:Number(entity.r),c:Number(entity.c)};
    entity.zone4CadenceSeed=index;
    entity.zone4PathPhase=index;
    entity.zone4MoveMode='idle';
    entity.zone4LastMoveStep=0;
    mobile.push(entity);
  });

  const toastArea=document.getElementById('toastArea');
  const spawnToastObserver=toastArea&&typeof MutationObserver==='function'
    ?new MutationObserver(()=>{[...toastArea.children].forEach(node=>{if((node.textContent||'').trim()==='SPAWN BLOCKED')node.remove();});})
    :null;
  spawnToastObserver?.observe(toastArea,{childList:true});

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

  function modeFor(enemy){
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

  function chooseToward(enemy,cells,mode){
    const player={r:state.row,c:state.col};
    const current=distance(enemy,player);
    let allowed=cells.filter(cell=>withinLeash(enemy,cell,mode));
    if(!allowed.length)return null;
    const best=Math.min(...allowed.map(cell=>distance(cell,player)));
    if(best>=current)return null;
    allowed=allowed.filter(cell=>distance(cell,player)===best);
    const phase=Number(enemy.zone4PathPhase)||0;
    allowed.sort((a,b)=>((a.dir-phase+8)%4)-((b.dir-phase+8)%4));
    return allowed[0]||null;
  }

  function setMode(enemy,nextMode){
    const previous=enemy.zone4MoveMode||'idle';
    if(previous===nextMode)return;
    enemy.zone4MoveMode=nextMode;
    if(nextMode==='idle')addLog(`${enemy.title} settles back to IDLE.`);
    else if(nextMode==='alert')addLog(`${enemy.title} becomes ALERT.`);
    else if(nextMode==='hunting')addLog(`${enemy.title} is now HUNTING Sharkan.`);
  }

  function moveEnemy(enemy,destination,step){
    if(!destination)return false;
    const oldKey=key(enemy.r,enemy.c),newKey=key(destination.r,destination.c);
    if(oldKey===newKey||entities.get(oldKey)!==enemy)return false;
    const from={r:Number(enemy.r),c:Number(enemy.c)};
    entities.delete(oldKey);
    enemy.r=destination.r;enemy.c=destination.c;
    enemy.zone4PathPhase=(Number(enemy.zone4PathPhase)||0)+1;
    enemy.zone4LastMoveStep=step;
    entities.set(newKey,enemy);
    addLog(`${enemy.title} ${enemy.zone4MoveMode==='idle'?'patrols':'advances'} R${from.r+1}C${from.c+1} → R${destination.r+1}C${destination.c+1}.`);
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
    world.querySelectorAll('.tile.zone4-mobile-enemy-dev').forEach(tile=>{tile.classList.remove('zone4-mobile-enemy-dev');delete tile.dataset.mobileMode;});
    mobile.forEach(enemy=>{
      if(!enemy||enemy.completed)return;
      const tile=world.querySelector(`.tile[data-r="${enemy.r}"][data-c="${enemy.c}"]`);
      if(tile){tile.classList.add('zone4-mobile-enemy-dev');tile.dataset.mobileMode=enemy.zone4MoveMode||'idle';}
    });
  }

  function enemyTurn(step){
    if(state.combat||state.gameOver||state.zoneCleared)return;

    const occupied=entities.get(key(state.row,state.col));
    if(occupied&&!occupied.completed&&(occupied.type==='mob'||occupied.type==='elite'||occupied.type==='boss'))return;

    // Core aggro checks all 8 neighboring cells. If Sharkan already ended beside
    // a threat, do not move unrelated enemies before that combat is resolved.
    if(hasCoreAdjacentThreat())return;

    const moved=[];
    for(const enemy of mobile){
      if(!enemy||enemy.completed)continue;
      const mode=modeFor(enemy);setMode(enemy,mode);
      if(coreAdjacent(enemy,{r:state.row,c:state.col}))continue;
      if(!cadenceAllows(enemy,mode,step))continue;

      const cells=neighbors(enemy);
      if(!cells.length)continue;
      const destination=mode==='idle'?choosePatrol(enemy,cells):chooseToward(enemy,cells,mode);
      if(!moveEnemy(enemy,destination,step))continue;
      moved.push(enemy);

      // Once a mover reaches the same adjacency radius used by the core aggro
      // system, stop the rest of this enemy phase. The core will start combat.
      if(coreAdjacent(enemy,{r:state.row,c:state.col}))break;
    }

    if(moved.length){
      document.dispatchEvent(new CustomEvent('hajjen:zone4-enemy-movement-dev',{
        detail:{step,moved:moved.map(enemy=>({title:enemy.title,type:enemy.type,r:enemy.r,c:enemy.c,mode:enemy.zone4MoveMode}))}
      }));
      queueMicrotask(decorateMobileEnemies);
    }
  }

  let stepsValue=Number(state.steps)||0;
  const previousDescriptor=Object.getOwnPropertyDescriptor(state,'steps');
  Object.defineProperty(state,'steps',{
    configurable:true,enumerable:true,
    get(){return stepsValue;},
    set(value){const next=Number(value)||0,previous=stepsValue;stepsValue=next;if(next>previous)enemyTurn(next);}
  });

  decorateMobileEnemies();
  addLog('DEV V4: fixed movement cadence; ambient spawns disabled. 3 mobs + 1 elite patrol/react.');

  window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV={
    version:'4.0-fixed-cadence-aggro-aligned',mobile,enemyTurn,decorate:decorateMobileEnemies,
    restore(){
      spawnToastObserver?.disconnect();state.spawnBlock=spawnBlockBeforeTest;
      if(previousDescriptor)Object.defineProperty(state,'steps',previousDescriptor);
      else Object.defineProperty(state,'steps',{configurable:true,enumerable:true,writable:true,value:stepsValue});
    }
  };
})();
