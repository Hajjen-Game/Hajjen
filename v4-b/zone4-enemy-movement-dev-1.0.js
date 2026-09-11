/* HAJJEN Zone 4 DEV — moving-enemy prototype V2.
   Exactly 3 mobs + 1 elite participate. V2 deliberately favors readability:
   idle enemies do not move, alert is warning-only, at most one enemy advances
   per Sharkan step, and one movement turn of grace follows combat. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!(entities instanceof Map)||window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV)return;

  const key=(r,c)=>`${r},${c}`;
  const distance=(a,b)=>Math.abs(Number(a.r)-Number(b.r))+Math.abs(Number(a.c)-Number(b.c));
  const mobileTitles=new Set(['RIFT HUNTER','AETHER PROWLER','VOID HUNTER','DUSK SENTINEL']);
  const mobile=[];
  const movedThisTurn=[];
  const eventLog=document.getElementById('eventLog');
  const world=document.getElementById('world');
  const combatModal=document.getElementById('combatModal');
  let graceMoves=0;

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
    entity.zone4MoveAnnounced={alert:false,hunting:false};
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

    // Elite is territorial: warning from Danger 10, pursuit only from Danger 15,
    // and it never leaves its local leash.
    if(enemy.type==='elite'){
      if(danger>=20&&d<=5)return 'hunting';
      if(danger>=15&&d<=4)return 'hunting';
      if(danger>=10&&d<=4)return 'alert';
      return 'idle';
    }

    // Mobs become noticeable first, then actively hunt as Danger rises.
    if(danger>=20)return 'hunting';
    if(danger>=15&&d<=7)return 'hunting';
    if(danger>=10&&d<=5)return 'hunting';
    if(danger>=5&&d<=4)return 'alert';
    return 'idle';
  }

  function setMode(enemy,nextMode){
    enemy.zone4MoveMode=nextMode;
    const announced=enemy.zone4MoveAnnounced||(enemy.zone4MoveAnnounced={alert:false,hunting:false});
    if(nextMode==='alert'&&!announced.alert){
      announced.alert=true;
      addLog(`${enemy.title} becomes ALERT.`);
    }
    if(nextMode==='hunting'&&!announced.hunting){
      announced.hunting=true;
      addLog(`${enemy.title} is now HUNTING Sharkan.`);
    }
  }

  function cadenceAllows(enemy,nextStep){
    const danger=Number(state.danger)||0;
    if(enemy.zone4MoveMode!=='hunting')return false;
    // Danger 10–19: one advance opportunity every second Sharkan step.
    // Danger 20: one advance opportunity every step.
    return danger>=20||nextStep%2===0;
  }

  function withinLeash(enemy,cell){
    if(enemy.type!=='elite')return true;
    return distance(cell,enemy.zone4MoveHome)<=3;
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
    return allowed[0]||null;
  }

  function hasAdjacentThreat(){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      const entity=entities.get(key(state.row+dr,state.col+dc));
      if(entity&&!entity.completed&&(entity.type==='mob'||entity.type==='elite'))return true;
    }
    return false;
  }

  function moveEnemy(enemy,destination){
    if(!destination)return false;
    const oldKey=key(enemy.r,enemy.c);
    const newKey=key(destination.r,destination.c);
    if(oldKey===newKey||entities.get(oldKey)!==enemy)return false;
    entities.delete(oldKey);
    const from={r:Number(enemy.r),c:Number(enemy.c)};
    enemy.r=destination.r;
    enemy.c=destination.c;
    enemy.zone4MovePhase=(Number(enemy.zone4MovePhase)||0)+1;
    entities.set(newKey,enemy);
    movedThisTurn.push({enemy,from,to:{r:destination.r,c:destination.c}});
    return true;
  }

  function decorateMobileEnemies(){
    if(!world)return;
    world.querySelectorAll('.tile.zone4-mobile-enemy-dev').forEach(tile=>{
      tile.classList.remove('zone4-mobile-enemy-dev');
      delete tile.dataset.mobileMode;
    });
    mobile.forEach(enemy=>{
      if(!enemy||enemy.completed)return;
      const tile=world.querySelector(`.tile[data-r="${enemy.r}"][data-c="${enemy.c}"]`);
      if(!tile)return;
      tile.classList.add('zone4-mobile-enemy-dev');
      tile.dataset.mobileMode=enemy.zone4MoveMode||'idle';
    });
  }

  function enemyTurn(nextStep){
    if(state.combat||state.gameOver||state.zoneCleared)return;

    // First update awareness for readable ALERT/HUNTING state changes.
    mobile.forEach(enemy=>{
      if(enemy&&!enemy.completed)setMode(enemy,modeFor(enemy));
    });

    // If Sharkan stepped onto an enemy, or already ended beside any threat,
    // do not let another mobile enemy advance before the core resolves combat.
    const occupied=entities.get(key(state.row,state.col));
    if(occupied&&!occupied.completed&&(occupied.type==='mob'||occupied.type==='elite'||occupied.type==='boss'))return;
    if(hasAdjacentThreat())return;

    // Winning/fleeing a combat grants one player move where hunters hold position.
    if(graceMoves>0){
      graceMoves--;
      addLog('Enemy movement pauses for one step after combat.');
      return;
    }

    const player={r:state.row,c:state.col};
    const candidates=mobile
      .filter(enemy=>enemy&&!enemy.completed&&cadenceAllows(enemy,nextStep)&&distance(enemy,player)>1)
      .map(enemy=>({enemy,d:distance(enemy,player)}))
      .sort((a,b)=>a.d-b.d||(Number(a.enemy.zone4MovePhase)||0)-(Number(b.enemy.zone4MovePhase)||0));

    // Critical V2 rule: never move more than ONE enemy during a Sharkan step.
    const chosen=candidates[0]?.enemy;
    if(!chosen)return;

    const destination=chooseToward(chosen,neighbors(chosen));
    movedThisTurn.length=0;
    if(!moveEnemy(chosen,destination))return;

    const move=movedThisTurn[0];
    addLog(`${chosen.title} advances R${move.from.r+1}C${move.from.c+1} → R${move.to.r+1}C${move.to.c+1}.`);
    document.dispatchEvent(new CustomEvent('hajjen:zone4-enemy-movement-dev',{
      detail:{
        step:nextStep,
        moved:[{title:chosen.title,type:chosen.type,from:key(move.from.r,move.from.c),to:key(move.to.r,move.to.c),mode:chosen.zone4MoveMode}]
      }
    }));
    queueMicrotask(decorateMobileEnemies);
  }

  // Track combat closing. The next Sharkan movement becomes a breathing-room turn.
  let combatWasOpen=!!combatModal?.classList.contains('show');
  const combatObserver=combatModal&&typeof MutationObserver==='function'
    ?new MutationObserver(()=>{
      const open=combatModal.classList.contains('show');
      if(combatWasOpen&&!open&&!state.gameOver)graceMoves=Math.max(graceMoves,1);
      combatWasOpen=open;
    })
    :null;
  combatObserver?.observe(combatModal,{attributes:true,attributeFilter:['class']});

  // Turn-link movement without touching Zones 1–3. Core increments state.steps once
  // for each successful Sharkan move, so this stays synchronous with board movement.
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
  addLog('DEV V2: moving enemies active — Alert warns; only one hunter can advance per step.');

  window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV={
    version:'2.0-readable-single-mover',
    mobile,
    enemyTurn,
    decorate:decorateMobileEnemies,
    get graceMoves(){return graceMoves;},
    restore(){
      combatObserver?.disconnect();
      if(previousDescriptor)Object.defineProperty(state,'steps',previousDescriptor);
      else Object.defineProperty(state,'steps',{configurable:true,enumerable:true,writable:true,value:stepsValue});
    }
  };
})();
