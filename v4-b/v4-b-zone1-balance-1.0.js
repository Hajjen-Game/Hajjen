(()=>{
  const MAX_ACTIVE_SPAWNED=4;
  const LEVEL4_MAX_HP=165;
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!eventLog)return;

  let gameMap=null;
  let allowedSpawnStep=-1;
  let blockedSpawnStep=-1;
  let lastMaterializedSpawnStep=-1;
  let activeSpawnedCombat=null;
  let activeSpawnedDangerBeforeCombat=null;
  let suppressedSpawnToasts=0;
  let cancelledSpawnMaterializers=0;
  const spawnDecisionQueue=[];
  const suppressedSpawnLogs=new Set();

  const state=()=>window.HAJJEN_V4B_STATE||null;
  const isGameEntity=value=>value&&Number.isInteger(value.r)&&Number.isInteger(value.c)&&['ingredient','spring','mob','elite','boss','portal'].includes(value.type);
  const isSpawnedTitle=title=>/^ROUSED (?:BOGLING|GUARDIAN)/i.test(title||'');
  const zone1AttackScale=danger=>danger>=20?1.30:danger>=15?1.20:danger>=10?1.10:danger>=5?1.05:1;
  const activeSpawnedCount=map=>{
    if(!map)return 0;
    let count=0;
    for(const value of map.values())if(value?.spawned&&!value.completed&&(value.type==='mob'||value.type==='elite'))count++;
    return count;
  };

  // Once Rootmaw is unlocked, existing nearby mobs stay dangerous: normal
  // adjacent aggro still runs. Only long-range combat attraction is suppressed
  // on the boss approach, and new spawns remain blocked below.
  const nativeSetTimeout=window.setTimeout.bind(window);
  window.setTimeout=(handler,delay,...args)=>{
    // A rejected spawn used to be allowed to reach the core's 650 ms
    // materialization callback and was then removed inside Map.set(). That kept
    // gameplay correct but could paint a one-frame mob before cleanup. The
    // spawn decision is made synchronously by the event-log guard immediately
    // before telegraphSpawn schedules this timer, so consume that rejected
    // materializer here and never let the cancelled entity enter the map.
    if(typeof handler==='function'&&delay===650&&cancelledSpawnMaterializers>0){
      cancelledSpawnMaterializers--;
      return nativeSetTimeout(()=>{},delay,...args);
    }
    if(typeof handler==='function'&&delay===420){
      return nativeSetTimeout((...cbArgs)=>{
        if(state()?.bossUnlocked)return;
        handler(...cbArgs);
      },delay,...args);
    }
    return nativeSetTimeout(handler,delay,...args);
  };

  const originalMapSet=Map.prototype.set;
  Map.prototype.set=function(key,value){
    if(isGameEntity(value))gameMap=this;

    // Zone 1 opener: two Ember Bolts should cleanly defeat the base Bogling.
    if(value?.title==='BOGLING'&&value?.type==='mob'&&value?.baseHp===42){
      value={...value,baseHp:40};
    }

    if(value?.title==='ROOTMAW'&&value?.type==='boss'&&value?.baseHp===180){
      value={...value,baseAttack:17};
    }

    if(value?.spawned&&(value.type==='mob'||value.type==='elite')){
      const s=state();
      const materializedStep=s?.steps??-1;
      const requestAllowed=spawnDecisionQueue.length?spawnDecisionQueue.shift():true;
      const suppress=!requestAllowed||!!s?.bossUnlocked||activeSpawnedCount(this)>=MAX_ACTIVE_SPAWNED||lastMaterializedSpawnStep===materializedStep;
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
      lastMaterializedSpawnStep=materializedStep;
    }

    return originalMapSet.call(this,key,value);
  };

  function newestWarningTile(){
    const tiles=[...document.querySelectorAll('.tile.spawn-warning')];
    const tile=tiles.find(t=>!t.hasAttribute('data-spawn-guard'));
    if(tile){
      tile.setAttribute('data-spawn-guard','1');
      nativeSetTimeout(()=>tile.removeAttribute('data-spawn-guard'),800);
    }
    return tile||null;
  }

  const previousPrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    for(const node of nodes){
      let text=node?.textContent?.trim?.()||'';
      const s=state();

      // Zone 1's capstone level gets a larger HP jump: L3 130 -> L4 165.
      // Level-up still fully restores HP, preserving the planning value of timing L4.
      if(/^LEVEL UP → 4\. Max HP \+15 and spell damage improved\.$/i.test(text)){
        const current=state();
        if(current){
          current.maxHp=LEVEL4_MAX_HP;
          current.hp=LEVEL4_MAX_HP;
        }
        text='LEVEL UP → 4. Max HP +35 and spell damage improved.';
        if(node&&'textContent' in node)node.textContent=text;
      }

      const engaged=text.match(/^(.+?) engaged(?: from nearby aggro)?\.$/i);
      if(engaged){
        const current=state();
        const combat=current?.combat;

        // Zone 1 keeps full Danger HP scaling and the same number of fights,
        // but normal mobs, spawned mobs and elites deal less attrition damage.
        // Calm/Uneasy/Dangerous/Hostile/Critical attack scaling:
        // 100% / 105% / 110% / 120% / 130%.
        // Rootmaw deliberately keeps the original full Danger scaling.
        if(combat?.entity&&combat.entity.type!=='boss'&&Number.isFinite(combat.entity.baseAttack)){
          combat.attack=Math.round(combat.entity.baseAttack*zone1AttackScale(current?.danger??0));
        }

        const spawned=isSpawnedTitle(engaged[1]);
        activeSpawnedCombat=spawned?engaged[1]:null;
        activeSpawnedDangerBeforeCombat=spawned?(s?.danger??null):null;
      }
      if(/^Sharkan fled from a normal mob\.$/i.test(text)){
        activeSpawnedCombat=null;
        activeSpawnedDangerBeforeCombat=null;
      }

      // Spawned enemies are already the consequence of high Danger. Their defeat
      // must leave Danger exactly where it was when combat started. Restoring the
      // pre-combat value also avoids the old cap bug where 19 -> 20 -> 18.
      if(activeSpawnedCombat&&/^Danger \+2 \(mob defeated\)/i.test(text)){
        const current=state();
        if(current&&Number.isFinite(activeSpawnedDangerBeforeCombat))current.danger=activeSpawnedDangerBeforeCombat;
        continue;
      }

      if(/^Ward Sigil blocked a mob spawn\.$/i.test(text))blockedSpawnStep=s?.steps??-1;

      if(/^Danger pressure is spawning a new (?:mob|elite)\.$/i.test(text)){
        const step=s?.steps??-1;
        const warningTile=newestWarningTile();
        const allow=!s?.bossUnlocked&&blockedSpawnStep!==step&&allowedSpawnStep!==step&&activeSpawnedCount(gameMap)<MAX_ACTIVE_SPAWNED;
        if(allow){
          // Only accepted telegraphs need a future Map.set decision. Rejected
          // telegraphs never materialize, so do not leave a false queue entry
          // behind to poison the next legitimate spawn.
          spawnDecisionQueue.push(true);
          allowedSpawnStep=step;
        }else{
          cancelledSpawnMaterializers++;
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
        activeSpawnedCombat=null;
        activeSpawnedDangerBeforeCombat=null;
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
