(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const hook=window.HAJJEN_ZONE3_CORE_HOOK;
  hook?.restore?.();
  if(!cfg||cfg.zone!==3||!state)return;

  const entities=window.HAJJEN_ZONE3_ENTITY_MAP;
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  const hand=document.getElementById('manipCards');
  const player=document.getElementById('player');
  if(!(entities instanceof Map)||!world||!eventLog||!hand)return;

  const $=id=>document.getElementById(id);
  const key=(r,c)=>`${r},${c}`;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const inBounds=(r,c)=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols;
  const manhattan=(a,b,r,c)=>Math.abs(a-r)+Math.abs(b-c);
  const chebyshev=(a,b,r,c)=>Math.max(Math.abs(a-r),Math.abs(b-c));
  const markFor=e=>e?.type==='mob'?'☠':e?.type==='elite'?'⚔':e?.type==='boss'?'♛':e?.type==='spring'?'✧':'?';

  function addLog(text,type='system'){
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='system'){
    if(!toastArea)return;
    const row=document.createElement('div');
    row.className=`toast ${type}`;
    row.textContent=text;
    toastArea.prepend(row);
    setTimeout(()=>row.remove(),1700);
  }
  function syncDangerUi(){
    const text=$('dangerText');if(text)text.textContent=`${state.danger} / 20`;
    const fill=$('dangerFill');if(fill)fill.style.width=`${state.danger*5}%`;
    const tier=state.danger>=20?'CRITICAL':state.danger>=15?'HOSTILE':state.danger>=10?'DANGEROUS':state.danger>=5?'UNEASY':'CALM';
    const badge=$('dangerState');if(badge)badge.textContent=state.zoneCleared?'CLEARED':tier;
    const power=$('powerText');if(power){const p=state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;power.textContent=`+${state.zoneCleared?0:p}%`;}
  }
  function syncHpUi(){
    const text=$('hpText');if(text)text.textContent=`${state.hp} / ${state.maxHp}`;
    const fill=$('hpFill');if(fill)fill.style.width=`${state.hp/state.maxHp*100}%`;
    const combatText=$('combatHpText');if(combatText&&state.combat)combatText.textContent=`${state.hp} / ${state.maxHp}`;
    const combatFill=$('combatHpFill');if(combatFill&&state.combat)combatFill.style.width=`${state.hp/state.maxHp*100}%`;
  }
  function repaintEntity(e){
    const tile=world.querySelector(`.tile[data-r="${e.r}"][data-c="${e.c}"]`);
    if(!tile)return;
    tile.classList.add('special',e.type);
    tile.dataset.mark=e.mark||markFor(e);
  }
  function clearEntityPaint(r,c,type){
    const tile=world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    if(!tile)return;
    tile.classList.remove('special',type,'mob','elite','boss','spring');
    tile.removeAttribute('data-mark');
  }

  // ------------------------------------------------------------------
  // ZONE 3 BOSS READINESS
  // Apply Enchantment + 7 mobs + 2 elites + Level 10.
  // ------------------------------------------------------------------
  const MOB_TARGET=Number(cfg.mobTarget)||7;
  const ELITE_TARGET=Number(cfg.eliteTarget)||2;
  const LEVEL_TARGET=Number(cfg.bossLevelTarget)||10;
  let bossUnlockedValue=!!state.bossUnlocked;
  let bossUnlockAnnounced=bossUnlockedValue;
  const bossRequirementsMet=()=>
    (!cfg.requireIntroForBoss||!!state.introComplete)&&
    state.mobKills>=MOB_TARGET&&state.eliteKills>=ELITE_TARGET&&state.level>=LEVEL_TARGET;

  Object.defineProperty(state,'bossUnlocked',{
    configurable:true,
    enumerable:true,
    get(){return bossUnlockedValue;},
    set(value){bossUnlockedValue=!!value&&bossRequirementsMet();}
  });

  function syncObjectives(){
    state.bossUnlocked=bossRequirementsMet();
    const mob=$('mobQuest');if(mob)mob.textContent=`Mobs: ${Math.min(state.mobKills,MOB_TARGET)} / ${MOB_TARGET}`;
    const elite=$('eliteQuest');if(elite)elite.textContent=`Elites: ${Math.min(state.eliteKills,ELITE_TARGET)} / ${ELITE_TARGET}`;
    const level=$('levelQuest');if(level)level.textContent=state.level>=LEVEL_TARGET?'COMPLETE':`Level ${state.level} / ${LEVEL_TARGET}`;
    const boss=$('bossQuest');
    if(boss){
      if(state.bossKilled)boss.textContent='Boss: DEFEATED';
      else if(state.bossUnlocked)boss.textContent='Boss: READY';
      else if(!state.introComplete)boss.textContent='Boss: LOCKED · ENCHANTMENT';
      else if(state.mobKills<MOB_TARGET||state.eliteKills<ELITE_TARGET)boss.textContent='Boss: LOCKED';
      else if(state.level<LEVEL_TARGET)boss.textContent=`Boss: LOCKED · REACH L${LEVEL_TARGET}`;
      else boss.textContent='Boss: LOCKED';
    }
    if(state.bossUnlocked&&!bossUnlockAnnounced){
      bossUnlockAnnounced=true;
      addToast('ZONE 3 BOSS UNLOCKED','reward');
      addLog('Zone 3 boss unlocked: Enchantment applied, 7 mobs, 2 elites, Level 10.','reward');
    }
  }
  setInterval(syncObjectives,90);
  syncObjectives();

  const bossTile=()=>world.querySelector(`.tile[data-r="${cfg.bossPos.row}"][data-c="${cfg.bossPos.col}"]`);
  function bossInfo(){
    const title=$('tileTitle'),sub=$('tileSub'),desc=$('tileDesc');
    if(title)title.textContent=cfg.bossTitle;
    if(sub)sub.textContent='BOSS';
    if(desc)desc.textContent=state.bossUnlocked
      ?'Boss ready.'
      :`Apply an Enchantment, defeat ${MOB_TARGET} mobs and both elites, and reach Level ${LEVEL_TARGET}.`;
  }
  world.addEventListener('mouseover',e=>{const tile=e.target instanceof Element?e.target.closest('.tile'):null;if(tile===bossTile())queueMicrotask(bossInfo);});
  world.addEventListener('click',e=>{const tile=e.target instanceof Element?e.target.closest('.tile'):null;if(tile===bossTile())queueMicrotask(bossInfo);});

  // ------------------------------------------------------------------
  // PRIMAL SPRING — mid-zone recovery checkpoint.
  // ------------------------------------------------------------------
  const springCfg=cfg.spring||{row:7,col:18,heal:45,title:'PRIMAL SPRING'};
  const springEntity={type:'spring',mark:'✧',title:springCfg.title||'PRIMAL SPRING',r:springCfg.row,c:springCfg.col,depleted:false};
  if(!entities.has(key(springEntity.r,springEntity.c)))entities.set(key(springEntity.r,springEntity.c),springEntity);
  let springUsed=false;
  let wasOnSpring=false;
  const springTile=()=>world.querySelector(`.tile[data-r="${springEntity.r}"][data-c="${springEntity.c}"]`);
  function decorateSpring(){
    const tile=springTile();if(!tile)return;
    tile.classList.add('special','spring');
    tile.dataset.mark=springUsed?'×':'✧';
    tile.classList.toggle('completed',springUsed);
  }
  function springInfo(){
    const title=$('tileTitle'),sub=$('tileSub'),desc=$('tileDesc');
    if(title)title.textContent='PRIMAL SPRING';
    if(sub)sub.textContent=springUsed?'Depleted':'Restorative site · One use';
    if(desc)desc.textContent=springUsed
      ?'The spring has already restored Sharkan this run.'
      :`Step here while injured to restore up to ${springCfg.heal||45} HP. It becomes depleted after use.`;
  }
  function checkSpring(){
    decorateSpring();
    const on=state.row===springEntity.r&&state.col===springEntity.c;
    if(on&&!wasOnSpring&&!springUsed&&!state.combat&&!state.gameOver){
      if(state.hp>=state.maxHp){
        addLog('Primal Spring remains unused because Sharkan is already at full HP.','system');
        addToast('HP FULL — SPRING REMAINS','system');
      }else{
        const heal=Math.min(Number(springCfg.heal)||45,state.maxHp-state.hp);
        state.hp+=heal;
        springUsed=true;
        springEntity.depleted=true;
        state.zone3SpringUsed=true;
        state.zone3SpringHealing=(state.zone3SpringHealing||0)+heal;
        addLog(`Primal Spring restored ${heal} HP.`,'reward');
        addToast(`PRIMAL SPRING · +${heal} HP`,'reward');
        syncHpUi();decorateSpring();springInfo();
      }
    }
    wasOnSpring=on;
  }
  world.addEventListener('mouseover',e=>{const tile=e.target instanceof Element?e.target.closest('.tile'):null;if(tile===springTile())queueMicrotask(springInfo);});
  world.addEventListener('click',e=>{const tile=e.target instanceof Element?e.target.closest('.tile'):null;if(tile===springTile())queueMicrotask(springInfo);});
  setInterval(checkSpring,80);
  decorateSpring();

  // ------------------------------------------------------------------
  // ZONE 3 MANIPULATION LOADOUT
  // ------------------------------------------------------------------
  const cards=(cfg.manipulationCards||['Veiled Passage','Misdirection','Safe Window','Pressure Break']).map(name=>({name,used:false}));
  let veiledSteps=0;
  let safeWindowSteps=0;
  let attractionBlocks=0;
  let pendingMisdirection=null;
  let renderingCards=false;

  const cardText={
    'Veiled Passage':'For the next 3 movement steps, nearby enemies cannot trigger adjacent aggro.',
    'Misdirection':'Choose one nearby normal mob and move it 2 tiles away from Sharkan.',
    'Safe Window':'No ambient enemy spawn can occur during your next 3 movement steps.',
    'Pressure Break':'Reduce Danger by 2 and prevent the next combat-attraction check.'
  };

  function useCard(card){
    if(card.used||state.zoneCleared||state.gameOver)return;
    if(card.name==='Veiled Passage'){
      veiledSteps=3;card.used=true;
      addLog('Veiled Passage active: adjacent aggro suppressed for the next 3 movement steps.','reward');
      addToast('VEILED PASSAGE · 3 STEPS','reward');
    }else if(card.name==='Safe Window'){
      safeWindowSteps=3;card.used=true;
      addLog('Safe Window active: ambient spawns blocked for the next 3 movement steps.','reward');
      addToast('SAFE WINDOW · 3 STEPS','reward');
    }else if(card.name==='Pressure Break'){
      const before=state.danger;
      state.danger=clamp(state.danger-2,0,20);
      attractionBlocks++;
      card.used=true;
      addLog(`Pressure Break reduced Danger ${before} → ${state.danger} and will block the next combat-attraction check.`,'reward');
      addToast('PRESSURE BREAK','reward');
      syncDangerUi();
    }else if(card.name==='Misdirection'){
      pendingMisdirection=card;
      addLog('Misdirection armed: choose a nearby normal mob.','system');
      addToast('SELECT A NEARBY MOB','system');
    }
    renderManipCards();
  }

  function makeCard(card){
    const node=document.createElement('div');
    node.className='card zone3-manip-card';
    node.dataset.handCategory='manipulation';
    node.dataset.zone3Manip=card.name;
    const title=document.createElement('strong');title.textContent=card.name;
    const text=document.createElement('span');text.textContent=cardText[card.name]||'';
    const button=document.createElement('button');button.type='button';
    button.addEventListener('click',()=>useCard(card));
    node.append(title,text,button);
    return node;
  }

  function renderManipCards(){
    if(renderingCards)return;
    renderingCards=true;
    try{
      [...hand.querySelectorAll(':scope > .card:not(.zone3-manip-card)')].forEach(node=>node.remove());
      const ours=[...hand.querySelectorAll(':scope > .zone3-manip-card')];
      const valid=ours.length===cards.length&&ours.every((node,i)=>node.dataset.zone3Manip===cards[i].name);
      if(!valid){
        ours.forEach(node=>node.remove());
        const frag=document.createDocumentFragment();
        cards.forEach(card=>frag.appendChild(makeCard(card)));
        hand.prepend(frag);
      }
      [...hand.querySelectorAll(':scope > .zone3-manip-card')].forEach((node,i)=>{
        const card=cards[i];if(!card)return;
        const button=node.querySelector('button');if(!button)return;
        const selecting=card===pendingMisdirection;
        button.disabled=card.used||state.zoneCleared||state.gameOver||selecting;
        button.textContent=card.used?'USED':selecting?'SELECT MOB':'PLAY';
      });
    }finally{renderingCards=false;}
  }

  const handObserver=new MutationObserver(()=>queueMicrotask(renderManipCards));
  handObserver.observe(hand,{childList:true});
  renderManipCards();

  function moveMobAway(e){
    const origin={r:e.r,c:e.c};
    const currentDistance=manhattan(state.row,state.col,e.r,e.c);
    const options=[[2,0],[-2,0],[0,2],[0,-2]]
      .map(([dr,dc])=>({r:e.r+dr,c:e.c+dc,midR:e.r+dr/2,midC:e.c+dc/2}))
      .filter(p=>inBounds(p.r,p.c)&&!entities.has(key(p.r,p.c))&&!entities.has(key(p.midR,p.midC))&&!(p.r===state.row&&p.c===state.col))
      .map(p=>({...p,distance:manhattan(state.row,state.col,p.r,p.c)}))
      .filter(p=>p.distance>currentDistance)
      .sort((a,b)=>b.distance-a.distance);
    const target=options[0];
    if(!target)return false;
    entities.delete(key(origin.r,origin.c));
    e.r=target.r;e.c=target.c;
    entities.set(key(e.r,e.c),e);
    clearEntityPaint(origin.r,origin.c,e.type);
    repaintEntity(e);
    return true;
  }

  function handleMisdirectionTarget(r,c){
    if(!pendingMisdirection)return false;
    const e=entities.get(key(r,c));
    if(!e||e.type!=='mob'||e.completed||chebyshev(state.row,state.col,r,c)>4){
      addToast('CHOOSE A NEARBY NORMAL MOB','system');
      return true;
    }
    if(!moveMobAway(e)){
      addToast('NO CLEAR 2-TILE PATH AWAY','danger');
      return true;
    }
    const card=pendingMisdirection;
    pendingMisdirection=null;
    card.used=true;
    addLog(`Misdirection moved ${e.title} 2 tiles away from Sharkan.`,'reward');
    addToast('MISDIRECTION PLAYED','reward');
    renderManipCards();
    return true;
  }

  // ------------------------------------------------------------------
  // MOVE PROTECTION
  // ------------------------------------------------------------------
  let syntheticAttraction=false;
  function armMoveProtection(targetR,targetC){
    if(syntheticAttraction||state.combat||state.gameOver||Math.abs(targetR-state.row)+Math.abs(targetC-state.col)!==1)return;
    if(!veiledSteps&&!safeWindowSteps)return;

    const beforeSteps=state.steps;
    const shadows=[];
    if(veiledSteps>0){
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;
        const r=targetR+dr,c=targetC+dc;
        const k=key(r,c),e=entities.get(k);
        if(!e||e.completed||(e.type!=='mob'&&e.type!=='elite'))continue;
        shadows.push({k,e});
        entities.set(k,{type:'veiled-shadow',completed:true,r,c,__zone3VeiledShadow:true});
      }
    }

    const originalSpawnBlock=state.spawnBlock||0;
    if(safeWindowSteps>0)state.spawnBlock=Math.max(originalSpawnBlock,1);

    queueMicrotask(()=>{
      shadows.forEach(({k,e})=>{
        const current=entities.get(k);
        if(current?.__zone3VeiledShadow){entities.set(k,e);repaintEntity(e);}
      });
      state.spawnBlock=originalSpawnBlock;
      if(state.steps>beforeSteps){
        if(veiledSteps>0)veiledSteps--;
        if(safeWindowSteps>0)safeWindowSteps--;
        renderManipCards();
      }
    });
  }

  const keyMoves={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};
  window.addEventListener('keydown',e=>{
    const move=keyMoves[e.key];if(!move)return;
    armMoveProtection(state.row+move[0],state.col+move[1]);
  },true);

  world.addEventListener('click',e=>{
    const tile=e.target instanceof Element?e.target.closest('.tile'):null;if(!tile)return;
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c);
    if(pendingMisdirection){
      e.preventDefault();e.stopPropagation();
      handleMisdirectionTarget(r,c);
      return;
    }
    armMoveProtection(r,c);
  },true);

  if(toastArea)new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      if((node.textContent||'').trim()==='SPAWN BLOCKED'&&safeWindowSteps>0)node.textContent='SAFE WINDOW · SPAWN PREVENTED';
    }
  }).observe(toastArea,{childList:true});

  // ------------------------------------------------------------------
  // COMBAT ATTRACTION
  // ------------------------------------------------------------------
  const attraction=cfg.combatAttraction||{};
  function attractionChance(){
    if(!attraction.enabled)return 0;
    const tier=state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';
    return Number(attraction.chance?.[tier])||0;
  }
  function nearbyAttractionMob(){
    const radius=Number(attraction.radius)||2;
    return [...entities.values()]
      .filter(e=>e&&e.type==='mob'&&!e.completed&&chebyshev(state.row,state.col,e.r,e.c)<=radius)
      .sort((a,b)=>chebyshev(state.row,state.col,a.r,a.c)-chebyshev(state.row,state.col,b.r,b.c))[0]||null;
  }
  function adjacentOpenTile(candidate){
    const cells=[[state.row-1,state.col],[state.row+1,state.col],[state.row,state.col-1],[state.row,state.col+1]]
      .filter(([r,c])=>inBounds(r,c))
      .sort((a,b)=>manhattan(candidate.r,candidate.c,a[0],a[1])-manhattan(candidate.r,candidate.c,b[0],b[1]));
    for(const [r,c] of cells){
      const existing=entities.get(key(r,c));
      if(existing===candidate)return {r,c};
      if(!existing)return {r,c};
    }
    return null;
  }
  function syncPlayerPosition(){
    if(player){player.style.left=`${((state.col+.5)/cfg.cols)*100}%`;player.style.top=`${((state.row+.5)/cfg.rows)*100}%`;}
    window.dispatchEvent(new Event('resize'));
    syncDangerUi();
  }
  function engageAttractedMob(candidate,target){
    const old={r:candidate.r,c:candidate.c};
    if(old.r!==target.r||old.c!==target.c){
      entities.delete(key(old.r,old.c));
      candidate.r=target.r;candidate.c=target.c;
      entities.set(key(candidate.r,candidate.c),candidate);
      clearEntityPaint(old.r,old.c,candidate.type);
      repaintEntity(candidate);
    }

    const origin={row:state.row,col:state.col,steps:state.steps,danger:state.danger,nextAmbient:state.nextAmbient,steadySteps:state.steadySteps||0};
    const tile=world.querySelector(`.tile[data-r="${target.r}"][data-c="${target.c}"]`);
    if(!tile)return false;

    addLog(`Combat attracted ${candidate.title}.`,'danger');
    addToast('COMBAT ATTRACTED A NEARBY MOB','danger');
    state.steadySteps=Math.max(1,state.steadySteps||0);
    syntheticAttraction=true;
    try{tile.click();}finally{syntheticAttraction=false;}

    if(!state.combat)return false;
    state.row=origin.row;state.col=origin.col;
    state.prevRow=origin.row;state.prevCol=origin.col;
    state.steps=origin.steps;state.danger=origin.danger;state.nextAmbient=origin.nextAmbient;state.steadySteps=origin.steadySteps;
    syncPlayerPosition();
    return true;
  }
  function tryCombatAttraction(){
    if(!attraction.enabled||state.zoneCleared||state.gameOver||state.combat)return;
    if(attractionBlocks>0){
      attractionBlocks--;
      addLog('Pressure Break prevented combat attraction.','reward');
      addToast('COMBAT ATTRACTION BLOCKED','reward');
      return;
    }
    const chance=attractionChance();
    if(!chance||Math.random()>chance)return;
    const candidate=nearbyAttractionMob();if(!candidate)return;
    const target=adjacentOpenTile(candidate);if(!target)return;
    engageAttractedMob(candidate,target);
  }

  new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      if(!text||/^Sharkan was defeated/i.test(text))continue;
      if(/ defeated\.$/i.test(text))queueMicrotask(tryCombatAttraction);
    }
  }).observe(eventLog,{childList:true});

  window.HAJJEN_ZONE3_SYSTEM={
    version:'1.0',
    entities,
    cards,
    spring:{entity:springEntity,get used(){return springUsed;}},
    get pressure(){return {veiledSteps,safeWindowSteps,attractionBlocks,pendingMisdirection:!!pendingMisdirection};},
    sync:()=>{syncObjectives();decorateSpring();renderManipCards();}
  };
})();
