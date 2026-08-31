(()=>{
  const state=window.HAJJEN_V4B_STATE;
  if(!state)return;

  const REQUIRED_BOSS_LEVEL=4;
  const levelQuest=document.getElementById('levelQuest');
  const bossQuest=document.getElementById('bossQuest');

  // Mirror Zone 2 boss preparation: reaching the zone cap is an explicit
  // objective and a real boss-unlock requirement, not just UI guidance.
  let bossUnlockedValue=!!state.bossUnlocked;
  const requirementsMet=()=>state.mobKills>=4&&state.eliteKills>=2&&state.level>=REQUIRED_BOSS_LEVEL;
  Object.defineProperty(state,'bossUnlocked',{
    configurable:true,
    enumerable:true,
    get(){return bossUnlockedValue;},
    set(value){bossUnlockedValue=!!value&&requirementsMet();}
  });
  state.bossUnlocked=bossUnlockedValue;

  function syncObjectiveUi(){
    if(levelQuest){
      const desired=state.level>=REQUIRED_BOSS_LEVEL?'COMPLETE':`Level ${state.level} / ${REQUIRED_BOSS_LEVEL}`;
      if(levelQuest.textContent!==desired)levelQuest.textContent=desired;
    }
    if(bossQuest&&!state.bossKilled&&!state.bossUnlocked&&state.mobKills>=4&&state.eliteKills>=2&&state.level<REQUIRED_BOSS_LEVEL){
      const desired=`Boss: LOCKED · REACH L${REQUIRED_BOSS_LEVEL}`;
      if(bossQuest.textContent!==desired)bossQuest.textContent=desired;
    }
  }

  const observer=new MutationObserver(()=>queueMicrotask(syncObjectiveUi));
  if(document.getElementById('levelText'))observer.observe(document.getElementById('levelText'),{childList:true,subtree:true,characterData:true});
  if(bossQuest)observer.observe(bossQuest,{childList:true,subtree:true,characterData:true});

  // Keep the locked-boss feedback accurate if the kill objectives are already
  // complete but Sharkan still needs the final level.
  const eventLog=document.getElementById('eventLog');
  if(eventLog){
    const previousPrepend=eventLog.prepend.bind(eventLog);
    eventLog.prepend=(...nodes)=>{
      nodes.forEach(node=>{
        if(!(node instanceof Element))return;
        if((node.textContent||'').trim()==='Rootmaw is locked. Defeat 4 mobs and 2 elites first.'&&state.mobKills>=4&&state.eliteKills>=2&&state.level<REQUIRED_BOSS_LEVEL){
          node.textContent=`Rootmaw is locked. Reach Level ${REQUIRED_BOSS_LEVEL} first.`;
        }
      });
      previousPrepend(...nodes);
      queueMicrotask(syncObjectiveUi);
    };
  }

  syncObjectiveUi();
})();
