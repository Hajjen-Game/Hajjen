/* HAJJEN Zone 4 — progression/boss/spring bridge.
   Keeps Zones 1–3 untouched while extending the campaign ladder to Level 13. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const hook=window.HAJJEN_ZONE4_CORE_HOOK;
  hook?.restore?.();
  if(!cfg||cfg.zone!==4||!state)return;

  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!(entities instanceof Map)||!world)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LEVEL_THRESHOLDS={10:630,11:750,12:880,13:1020};
  const MOB_TARGET=Number(cfg.mobTarget)||7;
  const ELITE_TARGET=Number(cfg.eliteTarget)||2;
  const LEVEL_TARGET=Number(cfg.bossLevelTarget)||13;
  const $=id=>document.getElementById(id);
  const key=(r,c)=>`${r},${c}`;
  const maxHpForLevel=level=>100+(Math.max(1,Number(level)||1)-1)*15;

  function addLog(text,type='system'){
    if(!eventLog)return;
    const row=document.createElement('div');row.className=`event ${type}`;row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='system'){
    if(!toastArea)return;
    const row=document.createElement('div');row.className=`toast ${type}`;row.textContent=text;toastArea.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function persist(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
      Object.assign(saved,{version:1,zone:4,level:state.level,xp:state.xp,maxHp:state.maxHp,hp:state.hp,potion:state.potion,spells:state.spells,ingredients:state.spellIngredients,potionIngredients:state.potionIngredients});
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
  }

  // ------------------------------------------------------------
  // LEVEL 10 -> 13 LADDER
  // Core V4-B originally ended at Level 10, so Zone 4 owns only the new rungs.
  // Threshold increments continue the established +10 XP step pattern:
  // 630 -> 750 (+120) -> 880 (+130) -> 1020 (+140).
  // ------------------------------------------------------------
  function syncLevelProgression(){
    let changed=false;
    while(state.level<LEVEL_TARGET&&state.xp>=(LEVEL_THRESHOLDS[state.level+1]??Infinity)){
      state.level++;
      state.maxHp=maxHpForLevel(state.level);
      state.hp=state.maxHp;
      changed=true;
      addToast(`LEVEL ${state.level}!`,'reward');
      addLog(`Level up → ${state.level}.`,'reward');
    }
    if(state.level>=LEVEL_TARGET&&state.xp>LEVEL_THRESHOLDS[LEVEL_TARGET]){state.xp=LEVEL_THRESHOLDS[LEVEL_TARGET];changed=true;}
    state.maxHp=Math.max(state.maxHp,maxHpForLevel(state.level));
    state.hp=Math.min(state.hp,state.maxHp);

    const levelText=$('levelText');if(levelText){const wanted=`${state.level} / ${cfg.levelCap}`;if(levelText.textContent!==wanted)levelText.textContent=wanted;}
    const hpText=$('hpText');if(hpText){const wanted=`${state.hp} / ${state.maxHp}`;if(hpText.textContent!==wanted)hpText.textContent=wanted;}
    const hpFill=$('hpFill');if(hpFill)hpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
    const prev=LEVEL_THRESHOLDS[state.level]??0;
    const next=LEVEL_THRESHOLDS[state.level+1]??prev;
    const xpText=$('xpText');
    const xpFill=$('xpFill');
    if(state.level>=LEVEL_TARGET){
      if(xpText&&xpText.textContent!==`${state.xp} XP · ZONE CAP`)xpText.textContent=`${state.xp} XP · ZONE CAP`;
      if(xpFill)xpFill.style.width='100%';
    }else{
      const span=Math.max(1,next-prev),current=Math.max(0,state.xp-prev);
      const wanted=`${current} / ${span}`;if(xpText&&xpText.textContent!==wanted)xpText.textContent=wanted;
      if(xpFill)xpFill.style.width=`${Math.max(0,Math.min(100,current/span*100))}%`;
    }
    if(changed){persist();window.HAJJEN_SHARED_ACTION_BAR?.sync?.();window.HAJJEN_ENCHANTMENTS?.sync?.();}
  }

  // ------------------------------------------------------------
  // BOSS READINESS — same structure as Zone 3, one level band higher.
  // ------------------------------------------------------------
  let bossUnlockedValue=!!state.bossUnlocked;
  let bossUnlockAnnounced=bossUnlockedValue;
  const bossRequirementsMet=()=>
    (!cfg.requireIntroForBoss||!!state.introComplete)&&
    state.mobKills>=MOB_TARGET&&state.eliteKills>=ELITE_TARGET&&state.level>=LEVEL_TARGET;

  Object.defineProperty(state,'bossUnlocked',{
    configurable:true,enumerable:true,get(){return bossUnlockedValue;},
    set(value){bossUnlockedValue=!!value&&bossRequirementsMet();}
  });

  function syncObjectives(){
    state.bossUnlocked=bossRequirementsMet();
    const intro=$('introQuest');
    const used=Array.isArray(state.zone4TacticalUsedKeys)?state.zone4TacticalUsedKeys.length:0;
    if(intro)intro.textContent=state.introComplete?'COMPLETE':`${Math.min(used,2)} / 2 USED`;
    const mob=$('mobQuest');if(mob)mob.textContent=`Mobs: ${Math.min(state.mobKills,MOB_TARGET)} / ${MOB_TARGET}`;
    const elite=$('eliteQuest');if(elite)elite.textContent=`Elites: ${Math.min(state.eliteKills,ELITE_TARGET)} / ${ELITE_TARGET}`;
    const level=$('levelQuest');if(level)level.textContent=state.level>=LEVEL_TARGET?'COMPLETE':`Level ${state.level} / ${LEVEL_TARGET}`;
    const boss=$('bossQuest');
    if(boss){
      if(state.bossKilled)boss.textContent='Boss: DEFEATED';
      else if(state.bossUnlocked)boss.textContent='Boss: READY';
      else if(!state.introComplete)boss.textContent='Boss: LOCKED · USE BOTH TACTICALS';
      else if(state.mobKills<MOB_TARGET||state.eliteKills<ELITE_TARGET)boss.textContent='Boss: LOCKED';
      else if(state.level<LEVEL_TARGET)boss.textContent=`Boss: LOCKED · REACH L${LEVEL_TARGET}`;
      else boss.textContent='Boss: LOCKED';
    }
    if(state.bossUnlocked&&!bossUnlockAnnounced){
      bossUnlockAnnounced=true;addToast('ZONE 4 BOSS UNLOCKED','reward');
      addLog(`Zone 4 boss unlocked: both Tacticals used, ${MOB_TARGET} mobs, ${ELITE_TARGET} elites, Level ${LEVEL_TARGET}.`,'reward');
    }
  }

  const bossTile=()=>world.querySelector(`.tile[data-r="${cfg.bossPos.row}"][data-c="${cfg.bossPos.col}"]`);
  function bossInfo(){
    const title=$('tileTitle'),sub=$('tileSub'),desc=$('tileDesc');
    if(title)title.textContent=cfg.bossTitle;if(sub)sub.textContent='BOSS';
    if(desc)desc.textContent=state.bossUnlocked?'Boss ready.':`Use both Tactical cards, defeat ${MOB_TARGET} mobs and both elites, and reach Level ${LEVEL_TARGET}.`;
  }
  world.addEventListener('mouseover',event=>{const tile=event.target instanceof Element?event.target.closest('.tile'):null;if(tile===bossTile())queueMicrotask(bossInfo);});
  world.addEventListener('click',event=>{const tile=event.target instanceof Element?event.target.closest('.tile'):null;if(tile===bossTile())queueMicrotask(bossInfo);});

  // ------------------------------------------------------------
  // TWO PRIMAL SPRINGS — reserve their tiles in the entity map so spawned mobs
  // cannot occupy them. Each spring is one-use for the run.
  // ------------------------------------------------------------
  const springs=(Array.isArray(cfg.springs)&&cfg.springs.length?cfg.springs:[cfg.spring,cfg.spring2]).filter(Boolean).map((spring,index)=>({
    type:'spring',mark:'✧',title:spring.title||'PRIMAL SPRING',r:Number(spring.row),c:Number(spring.col),heal:Number(spring.heal)||90,index,depleted:false
  }));
  springs.forEach(spring=>{if(!entities.has(key(spring.r,spring.c)))entities.set(key(spring.r,spring.c),spring);});
  const usedSprings=new Set();
  let lastPosition='';

  function decorateSprings(){
    springs.forEach(spring=>{
      const tile=world.querySelector(`.tile[data-r="${spring.r}"][data-c="${spring.c}"]`);if(!tile)return;
      tile.classList.add('special','spring');tile.dataset.mark=usedSprings.has(spring.index)?'×':'✧';tile.classList.toggle('completed',usedSprings.has(spring.index));
    });
  }
  function springAt(r,c){return springs.find(spring=>spring.r===r&&spring.c===c)||null;}
  function activateSpring(spring){
    if(!spring||usedSprings.has(spring.index)||state.combat||state.gameOver)return;
    if(state.hp>=state.maxHp){addToast('HP FULL — SPRING REMAINS','system');addLog('Primal Spring remains unused because Sharkan is already at full HP.','system');return;}
    const heal=Math.min(spring.heal,state.maxHp-state.hp);state.hp+=heal;usedSprings.add(spring.index);spring.depleted=true;
    addToast(`PRIMAL SPRING · +${heal} HP`,'reward');addLog(`Primal Spring restored ${heal} HP.`,'reward');decorateSprings();persist();
  }
  function checkSpring(){
    decorateSprings();
    const position=`${state.row},${state.col}`;if(position===lastPosition)return;lastPosition=position;
    activateSpring(springAt(state.row,state.col));
  }

  // Zone 4 ambient mobs use the next enemy rung instead of the Zone 3 fallback
  // embedded in the legacy campaign core.
  function scaleSpawnedMobs(){
    entities.forEach(entity=>{
      if(!entity?.spawned||entity.zone4Scaled)return;
      entity.baseHp=220;entity.baseAttack=26;entity.xp=38;entity.zone4Scaled=true;
    });
  }

  function syncFooter(){const footer=document.querySelector('.footer');if(footer)footer.textContent='ZONE 4 LEVEL CAP: 13 · FULL HAND · 4 MANIPULATION · 2 ENCHANTMENT · 2 TACTICAL';}
  function tick(){syncLevelProgression();syncObjectives();checkSpring();scaleSpawnedMobs();syncFooter();}
  setInterval(tick,80);tick();requestAnimationFrame(tick);

  window.HAJJEN_ZONE4_SYSTEM={version:'1.0-level13-full-hand',thresholds:{...LEVEL_THRESHOLDS},springs,usedSprings,sync:tick,persist};
})();
