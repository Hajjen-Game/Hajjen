(()=>{
  const MAX_ACTIVE_SPAWNED=4;
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!eventLog)return;

  let gameMap=null;
  let allowedSpawnStep=-1;
  let blockedSpawnStep=-1;
  let suppressedSpawnToasts=0;
  const spawnDecisionQueue=[];
  const suppressedSpawnLogs=new Set();

  const state=()=>window.HAJJEN_V4B_STATE||null;
  const isGameEntity=value=>value&&Number.isInteger(value.r)&&Number.isInteger(value.c)&&['ingredient','spring','mob','elite','boss','portal'].includes(value.type);
  const activeSpawnedCount=map=>{
    if(!map)return 0;
    let count=0;
    for(const value of map.values())if(value?.spawned&&!value.completed&&(value.type==='mob'||value.type==='elite'))count++;
    return count;
  };

  const originalMapSet=Map.prototype.set;
  Map.prototype.set=function(key,value){
    if(isGameEntity(value))gameMap=this;

    if(value?.title==='ROOTMAW'&&value?.type==='boss'&&value?.baseHp===180){
      value={...value,baseAttack:17};
    }

    if(value?.spawned&&(value.type==='mob'||value.type==='elite')){
      const s=state();
      const requestAllowed=spawnDecisionQueue.length?spawnDecisionQueue.shift():true;
      const suppress=!requestAllowed||!!s?.bossUnlocked||activeSpawnedCount(this)>=MAX_ACTIVE_SPAWNED;
      if(suppress){
        const row=value.r,col=value.c;
        const logKey=`${value.title}|${row+1}|${col+1}`;
        suppressedSpawnLogs.add(logKey);
        const result=originalMapSet.call(this,key,{...value,completed:true,suppressedSpawn:true});
        queueMicrotask(()=>{
          this.delete(key);
          const tile=document.querySelector(`.tile[data-r="${row}"][data-c="${col}"]`);
          if(tile){
            tile.classList.remove('special','mob','elite','completed','spawn-warning','spawned-now','aggro-target','aggro-attracted');
            tile.removeAttribute('data-mark');
          }
        });
        return result;
      }
    }

    return originalMapSet.call(this,key,value);
  };

  function newestWarningTile(){
    const tiles=[...document.querySelectorAll('.tile.spawn-warning')];
    const tile=tiles.find(t=>!t.hasAttribute('data-spawn-guard'));
    if(tile){
      tile.setAttribute('data-spawn-guard','1');
      setTimeout(()=>tile.removeAttribute('data-spawn-guard'),800);
    }
    return tile||null;
  }

  const previousPrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    for(const node of nodes){
      const text=node?.textContent?.trim?.()||'';
      const s=state();

      if(/^Ward Sigil blocked a mob spawn\.$/i.test(text))blockedSpawnStep=s?.steps??-1;

      if(/^Danger pressure is spawning a new (?:mob|elite)\.$/i.test(text)){
        const step=s?.steps??-1;
        const warningTile=newestWarningTile();
        const allow=!s?.bossUnlocked&&blockedSpawnStep!==step&&allowedSpawnStep!==step&&activeSpawnedCount(gameMap)<MAX_ACTIVE_SPAWNED;
        spawnDecisionQueue.push(allow);
        if(allow){
          allowedSpawnStep=step;
        }else{
          warningTile?.classList.remove('spawn-warning');
          warningTile?.removeAttribute('data-spawn-guard');
          toastArea?.querySelector('.toast.spawn')?.remove();
          continue;
        }
      }

      const spawned=text.match(/^(.+?) spawned at row (\d+), column (\d+)\.$/i);
      if(spawned){
        const logKey=`${spawned[1]}|${spawned[2]}|${spawned[3]}`;
        if(suppressedSpawnLogs.delete(logKey)){
          suppressedSpawnToasts++;
          continue;
        }
      }

      previousPrepend(node);

      if(/^ROUSED (?:BOGLING|GUARDIAN).* defeated\.$/i.test(text)){
        const current=state();
        if(current?.spawnTimers?.length)current.spawnTimers.pop();
      }

      if(/^Quest complete: Rootmaw is now unlocked\.$/i.test(text)){
        const current=state();
        if(current){
          current.spawnTimers=[];
          allowedSpawnStep=current.steps;
        }
        document.querySelectorAll('.tile.spawn-warning').forEach(tile=>tile.classList.remove('spawn-warning'));
        toastArea?.querySelectorAll('.toast.spawn').forEach(t=>t.remove());
      }
    }
  };

  if(toastArea){
    new MutationObserver(mutations=>{
      if(!suppressedSpawnToasts)return;
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(!suppressedSpawnToasts)break;
          if(node instanceof Element&&node.classList.contains('toast')&&node.classList.contains('spawn')&&/NEW MOB SPAWNED/i.test(node.textContent||'')){
            node.remove();
            suppressedSpawnToasts--;
          }
        }
      }
    }).observe(toastArea,{childList:true});
  }
})();
