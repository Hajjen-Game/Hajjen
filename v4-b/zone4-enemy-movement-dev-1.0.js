/* HAJJEN Zone 4 DEV — cautious moving-enemy prototype.
   Exactly 3 mobs + 1 elite move. Movement is turn-linked to Sharkan's steps,
   deterministic, and isolated to ?dev=1 Zone 4. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!(entities instanceof Map)||window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV)return;

  const key=(r,c)=>`${r},${c}`;
  const distance=(a,b)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c);
  const mobileTitles=new Set(['RIFT HUNTER','AETHER PROWLER','VOID HUNTER','DUSK SENTINEL']);
  const mobile=[];
  const movedThisTurn=[];
  const eventLog=document.getElementById('eventLog');
  const world=document.getElementById('world');

  function addLog(text){
    if(!eventLog)return;
    const row=document.createElement('div');
    row.className='event system';
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  entities.forEach(entity=>{
    if(!entity||entity.completed||!mobileTitles.has(entity.title))return;
    entity.zone4MobileDev=true;
    entity.zone4MoveHome={r:Number(entity.r),c:Number(entity.c)};
    entity.zone4MovePhase=mobile.length;
    entity.zone4MoveMode='idle';
    mobile.push(entity);
  });

  function blocked(r,c,enemy){
    if(r<0||c<0||r>=cfg.rows||c>=cfg.cols)return true;
    if(r===state.row&&c===state.col)return true;
    const reward=cfg.cardRewardTest;
    if(reward&&r===Number(reward.row)&&c===Number(reward.col))return true;
    const occupying=entities.get(key(r,c));
    if(occupying&&occupying!==enemy&&!occupying.completed)return true;
    return false;
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
      if(danger>=10&&d<=4)return 'alert';
      return 'idle';
    }
    if(danger>=20)return 'hunting';
    if(danger>=15&&d<=9)return 'hunting';
    if(danger>=10&&d<=6)return 'hunting';
    if(danger>=5&&d<=5)return 'alert';
    return 'idle';
  }

  function cadenceAllows(enemy,mode,nextStep){
    const danger=Number(state.danger)||0;
    if(mode==='hunting')return danger>=15||nextStep%2===0;
    if(mode==='alert')return nextStep%2===0;
    return nextStep%3===0;
  }

  function withinLeash(enemy,cell){
    if(enemy.type!=='elite')return true;
    return distance(cell,enemy.zone4MoveHome)<=3;
  }

  function choosePatrol(enemy,cells){
    const home=enemy.zone4MoveHome;
    const radius=2;
    const allowed=cells.filter(cell=>distance(cell,home)<=radius);
    if(!allowed.length)return null;
    const phase=Number(enemy.zone4MovePhase)||0;
    const ordered=[...allowed].sort((a,b)=>{
      const da=distance(a,home),db=distance(b,home);
      if(da!==db)return da-db;
      return ((a.dir-phase+8)%4)-((b.dir-phase+8)%4);
    });
    return ordered[phase%ordered.length]||ordered[0];
  }

  function chooseToward(enemy,cells){
    const player={r:state.row,c:state.col};
    const current=distance(enemy,player);
    let allowed=cells.filter(cell=>withinLeash(enemy,cell));
    if(!allowed.length)return null;
    const bestDistance=Math.min(...allowed.map(cell=>distance(cell,player)));
    if(bestDistance>=current)return null;
    allowed=allowed.filter(cell=>distance(cell,player)===bestDistance);
    const phase=Number(enemy.zone4MovePhase)||0;
    allowed.sort((a,b)=>((a.dir-phase+8)%4)-((b.dir-phase+8)%4));
    return allowed[phase%allowed.length]||allowed[0];
  }

  function setMode(enemy,nextMode){
    const previous=enemy.zone4MoveMode||'idle';
    enemy.zone4MoveMode=nextMode;
    if(previous===nextMode)return;
    if(nextMode==='hunting')addLog(`${enemy.title} is hunting Sharkan.`);
    else if(nextMode==='alert')addLog(`${enemy.title} is alert and moving toward Sharkan.`);
  }

  function moveEnemy(enemy,destination){
    if(!destination)return false;
    const oldKey=key(enemy.r,enemy.c);
    const newKey=key(destination.r,destination.c);
    if(oldKey===newKey||entities.get(oldKey)!==enemy)return false;
    entities.delete(oldKey);
    enemy.r=destination.r;
    enemy.c=destination.c;
    enemy.zone4MovePhase=(Number(enemy.zone4MovePhase)||0)+1;
    entities.set(newKey,enemy);
    movedThisTurn.push({enemy,from:oldKey,to:newKey});
    return true;
  }

  function enemyTurn(nextStep){
    if(state.combat||state.gameOver||state.zoneCleared)return;

    // If Sharkan stepped directly onto an enemy, let the core resolve that fight
    // before the enemy movement phase can move it away.
    const occupied=entities.get(key(state.row,state.col));
    if(occupied&&!occupied.completed&&(occupied.type==='mob'||occupied.type==='elite'||occupied.type==='boss'))return;

    movedThisTurn.length=0;
    for(const enemy of mobile){
      if(!enemy||enemy.completed)continue;
      const playerDistance=distance(enemy,{r:state.row,c:state.col});
      const mode=modeFor(enemy);
      setMode(enemy,mode);

      // Already adjacent: hold position. The existing Zone 4 aggro check runs
      // later in the same Sharkan turn and starts combat.
      if(playerDistance<=1)continue;
      if(!cadenceAllows(enemy,mode,nextStep))continue;

      const cells=neighbors(enemy);
      if(!cells.length)continue;
      const destination=(mode==='hunting'||mode==='alert')
        ?chooseToward(enemy,cells)
        :choosePatrol(enemy,cells);
      moveEnemy(enemy,destination);
    }

    if(movedThisTurn.length){
      document.dispatchEvent(new CustomEvent('hajjen:zone4-enemy-movement-dev',{
        detail:{step:nextStep,moved:movedThisTurn.map(item=>({title:item.enemy.title,type:item.enemy.type,from:item.from,to:item.to,mode:item.enemy.zone4MoveMode}))}
      }));
      queueMicrotask(decorateMobileEnemies);
    }
  }

  function decorateMobileEnemies(){
    if(!world)return;
    world.querySelectorAll('.tile.zone4-mobile-enemy-dev').forEach(tile=>tile.classList.remove('zone4-mobile-enemy-dev'));
    mobile.forEach(enemy=>{
      if(!enemy||enemy.completed)return;
      const tile=world.querySelector(`.tile[data-r="${enemy.r}"][data-c="${enemy.c}"]`);
      tile?.classList.add('zone4-mobile-enemy-dev');
      if(tile)tile.dataset.mobileMode=enemy.zone4MoveMode||'idle';
    });
  }

  let stepsValue=Number(state.steps)||0;
  const previousDescriptor=Object.getOwnPropertyDescriptor(state,'steps');
  Object.defineProperty(state,'steps',{
    configurable:true,
    enumerable:true,
    get(){return stepsValue;},
    set(value){
      const next=Number(value)||0;
      const previous=stepsValue;
      stepsValue=next;
      if(next>previous)enemyTurn(next);
    }
  });

  decorateMobileEnemies();
  addLog('DEV: 3 mobs + 1 elite now use turn-linked movement.');

  window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV={
    version:'1.0-cautious-prototype',
    mobile,
    enemyTurn,
    decorate:decorateMobileEnemies,
    restore(){
      if(previousDescriptor)Object.defineProperty(state,'steps',previousDescriptor);
      else Object.defineProperty(state,'steps',{configurable:true,enumerable:true,writable:true,value:stepsValue});
    }
  };
})();
