/* HAJJEN Zone 4 — Manipulation balance layer.
   Replaces Quiet Harvest with Smoke Trail, expands Card Reward to 10 cards,
   avoids duplicate rewards when another card is available, and adapts the
   older movement/pressure cards to the Zone 4 moving-enemy system. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const rewardApi=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
  const movement=window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  const hand=document.getElementById('manipCards');
  const world=document.getElementById('world');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!rewardApi||!hand||!world||!(entities instanceof Map)||window.HAJJEN_ZONE4_MANIPULATION_BALANCE)return;

  const key=(r,c)=>`${r},${c}`;
  const clean=text=>String(text||'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim();
  const distance=(a,b)=>Math.abs(Number(a.r)-Number(b.r))+Math.abs(Number(a.c)-Number(b.c));
  const FULL_DECK=(cfg.manipulationRewardDeck||[]).map(card=>({...card}));
  const NEW_IDS=new Set(['smoke-trail','false-trail','veiled-passage','fresh-tracks','safe-window','misdirection','pressure-break']);
  const SMOKE_TEXT='Next 3 movement steps, Hunting enemies can move only every second step.';
  const NEARBY_RADIUS=5;
  let smokeStarterUsed=false;
  let patchQueued=false;
  let misdirectionPending=null;
  let misdirectionAnimating=false;

  function log(text){
    if(!eventLog)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function toast(text,type='reward'){
    if(!toastArea)return;
    const row=document.createElement('div');row.className=`toast ${type}`;row.textContent=text;toastArea.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function syncUi(){
    window.HAJJEN_SHARED_STATUS?.sync?.();
    window.HAJJEN_SHARED_UI?.sync?.();
    window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  }

  /* Card Reward owns a mutable decks object. Swap its four-card test pool for
     the full Zone 4 pool without replacing the proven reward modal itself. */
  rewardApi.decks.manipulation=FULL_DECK;

  const rewardModal=document.querySelector('.zone4-card-reward-test-modal');
  const manipChoice=rewardModal?.querySelector('[data-family="manipulation"]');
  manipChoice?.addEventListener('click',()=>{
    const current=new Set((rewardApi.manipulationSlots?.()||[]).map(slot=>clean(slot.name).toLowerCase()));
    const fresh=FULL_DECK.filter(card=>!current.has(clean(card.name).toLowerCase()));
    rewardApi.decks.manipulation=fresh.length?fresh:FULL_DECK;
    queueMicrotask(()=>{rewardApi.decks.manipulation=FULL_DECK;});
  },true);

  function manipulationCards(){
    return [...hand.children].filter(node=>node instanceof HTMLElement&&node.classList.contains('card')&&!node.classList.contains('enchantment')&&!node.classList.contains('tactical')).slice(0,4);
  }

  function armSmokeTrail(){
    state.zone4SmokeTrailUntilStep=Math.max(Number(state.zone4SmokeTrailUntilStep)||0,(Number(state.steps)||0)+3);
    log('Smoke Trail played. Hunting movement is slowed for the next 3 movement steps.');
    toast('SMOKE TRAIL PLAYED');
  }

  function patchSmokeStarter(){
    patchQueued=false;
    const cards=manipulationCards();
    const card=cards.find(node=>{
      if(node.dataset.cardRewardManipSlot!=null)return false;
      const name=clean(node.querySelector(':scope > strong')?.textContent);
      return name==='Quiet Harvest'||node.dataset.zone4SmokeStarter==='1';
    });
    if(!card)return;
    card.dataset.zone4SmokeStarter='1';
    card.dataset.handLabel='Smoke Trail';
    const title=card.querySelector(':scope > strong');
    const copy=card.querySelector(':scope > span');
    if(title)title.textContent='Smoke Trail';
    if(copy)copy.textContent=SMOKE_TEXT;
    const oldButton=card.querySelector(':scope > button');
    if(!oldButton)return;
    let button=oldButton;
    if(button.dataset.zone4SmokeStarter!=='1'){
      button=oldButton.cloneNode(true);
      button.dataset.zone4SmokeStarter='1';
      oldButton.replaceWith(button);
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        if(smokeStarterUsed||state.gameOver||state.zoneCleared)return;
        smokeStarterUsed=true;armSmokeTrail();patchSmokeStarter();syncUi();
      });
    }
    button.textContent=smokeStarterUsed?'USED':'PLAY';
    button.disabled=smokeStarterUsed||!!state.gameOver||!!state.zoneCleared;
  }
  function scheduleStarterPatch(){if(patchQueued)return;patchQueued=true;queueMicrotask(patchSmokeStarter);}
  const handObserver=new MutationObserver(scheduleStarterPatch);
  handObserver.observe(hand,{childList:true,subtree:true});

  function markReplacementUsed(index,replacement,button){
    replacement.used=true;
    if(button){button.textContent='USED';button.disabled=true;}
    toast(`${replacement.def.name.toUpperCase()} PLAYED`);
    log(`${replacement.def.name} played.`);
    window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  }

  function activeHuntingEnemy(){
    const list=Array.isArray(movement?.mobile)?movement.mobile:[];
    return list.filter(enemy=>enemy&&!enemy.completed&&enemy.zone4MoveActive&&enemy.zone4MoveMode==='hunting')
      .sort((a,b)=>distance(a,{r:state.row,c:state.col})-distance(b,{r:state.row,c:state.col}))[0]||null;
  }

  function effectFor(id){
    if(id==='smoke-trail'){
      armSmokeTrail();return true;
    }
    if(id==='false-trail'){
      state.zone4FalseTrailCharges=(Number(state.zone4FalseTrailCharges)||0)+1;
      return true;
    }
    if(id==='veiled-passage'){
      state.zone4VeiledPassageUntilStep=Math.max(Number(state.zone4VeiledPassageUntilStep)||0,(Number(state.steps)||0)+3);
      return true;
    }
    if(id==='fresh-tracks'){
      state.nextAmbient=3;
      log('Fresh Tracks reset the ambient Danger countdown to 3 movement steps.');
      return true;
    }
    if(id==='safe-window'){
      state.zone4SafeWindowUntilStep=Math.max(Number(state.zone4SafeWindowUntilStep)||0,(Number(state.steps)||0)+3);
      return true;
    }
    if(id==='pressure-break'){
      const before=Number(state.danger)||0;
      state.danger=Math.max(0,before-2);
      state.zone4PressureBreakCharges=(Number(state.zone4PressureBreakCharges)||0)+1;
      if(before!==state.danger)log(`Danger -${before-state.danger} (Pressure Break) → ${state.danger}/20.`);
      return true;
    }
    return false;
  }

  const targetStyle=document.createElement('style');
  targetStyle.dataset.zone4Misdirection='1';
  targetStyle.textContent=`
    .campaign-world .tile.zone4-misdirection-target{z-index:9;outline:3px solid rgba(226,196,107,.95)!important;outline-offset:-4px;animation:zone4MisdirectionPulse .42s ease-in-out infinite alternate}
    @keyframes zone4MisdirectionPulse{from{filter:brightness(1)}to{filter:brightness(1.28)}}
    .zone4-misdirection-ghost,.zone4-misdirection-cover{position:absolute!important;pointer-events:none!important;z-index:12!important;background-position:center!important;background-size:100% 100%!important;background-repeat:no-repeat!important}
    .zone4-misdirection-cover{z-index:11!important}
    .zone4-misdirection-ghost{background:#542522 url('assets/encounter_mob.webp?v=4') center/100% 100% no-repeat!important}
  `;
  document.head.appendChild(targetStyle);

  function validMisdirectionTargets(){
    const player={r:Number(state.row),c:Number(state.col)};
    return [...entities.values()].filter(enemy=>enemy&&!enemy.completed&&enemy.type==='mob'&&distance(enemy,player)<=NEARBY_RADIUS&&entities.get(key(enemy.r,enemy.c))===enemy);
  }
  function clearMisdirectionTargets(){world.querySelectorAll('.zone4-misdirection-target').forEach(tile=>tile.classList.remove('zone4-misdirection-target'));}
  function showMisdirectionTargets(){
    clearMisdirectionTargets();
    validMisdirectionTargets().forEach(enemy=>world.querySelector(`.tile[data-r="${enemy.r}"][data-c="${enemy.c}"]`)?.classList.add('zone4-misdirection-target'));
  }

  function freeCell(r,c,enemy){
    if(r<0||c<0||r>=cfg.rows||c>=cfg.cols)return false;
    if(r===state.row&&c===state.col)return false;
    const reward=cfg.cardRewardTest;
    if(reward&&r===Number(reward.row)&&c===Number(reward.col))return false;
    const e=entities.get(key(r,c));
    return !e||e===enemy||e.completed;
  }
  function misdirectionDestination(enemy){
    const dirs=[[-1,0],[0,1],[1,0],[0,-1]];
    const player={r:Number(state.row),c:Number(state.col)};
    const startDistance=distance(enemy,player);
    const candidates=[];
    for(const [dr,dc] of dirs){
      let last=null;
      for(let step=1;step<=2;step++){
        const r=Number(enemy.r)+dr*step,c=Number(enemy.c)+dc*step;
        if(!freeCell(r,c,enemy))break;
        last={r,c,steps:step};
      }
      if(last&&distance(last,player)>startDistance)candidates.push(last);
    }
    candidates.sort((a,b)=>b.steps-a.steps||distance(b,player)-distance(a,player));
    return candidates[0]||null;
  }
  function tileBox(node,r,c){node.style.left=`${(c/cfg.cols)*100}%`;node.style.top=`${(r/cfg.rows)*100}%`;node.style.width=`${(1/cfg.cols)*100}%`;node.style.height=`${(1/cfg.rows)*100}%`;}
  function animateMisdirection(from,to){
    const destTile=world.querySelector(`.tile[data-r="${to.r}"][data-c="${to.c}"]`);
    const dark=destTile?.matches(':nth-child(even)');
    const cover=document.createElement('div');cover.className='zone4-misdirection-cover';tileBox(cover,to.r,to.c);
    cover.style.backgroundImage=`url('assets/board_tile_${dark?'dark':'light'}.webp?v=3')`;world.appendChild(cover);
    const ghost=document.createElement('div');ghost.className='zone4-misdirection-ghost';tileBox(ghost,from.r,from.c);world.appendChild(ghost);
    const dx=(to.c-from.c)*100,dy=(to.r-from.r)*100;
    misdirectionAnimating=true;
    const animation=ghost.animate([{transform:'translate(0,0) scale(.97)'},{transform:`translate(${dx}%,${dy}%) scale(1.03)`,offset:.75},{transform:`translate(${dx}%,${dy}%) scale(1)`}],{duration:280,easing:'cubic-bezier(.22,.78,.24,1)',fill:'forwards'});
    const done=()=>{ghost.remove();cover.remove();misdirectionAnimating=false;};animation.finished.then(done).catch(done);setTimeout(done,420);
  }
  function moveMisdirectedEnemy(enemy){
    const dest=misdirectionDestination(enemy);if(!dest)return false;
    const from={r:Number(enemy.r),c:Number(enemy.c)},oldKey=key(enemy.r,enemy.c);
    entities.delete(oldKey);enemy.r=dest.r;enemy.c=dest.c;entities.set(key(dest.r,dest.c),enemy);
    const oldTile=world.querySelector(`.tile[data-r="${from.r}"][data-c="${from.c}"]`);
    const newTile=world.querySelector(`.tile[data-r="${dest.r}"][data-c="${dest.c}"]`);
    oldTile?.classList.remove('special','mob','zone4-mobile-enemy-dev');oldTile?.removeAttribute('data-mark');
    if(newTile){newTile.classList.add('special','mob');newTile.dataset.mark=enemy.mark||'☠';}
    movement?.decorate?.();animateMisdirection(from,dest);
    log(`Misdirection moves ${enemy.title} R${from.r+1}C${from.c+1} → R${dest.r+1}C${dest.c+1}.`);
    return true;
  }

  function beginMisdirection(index,replacement,button){
    const targets=validMisdirectionTargets();
    if(!targets.length){toast('NO NEARBY MOB','danger');return;}
    misdirectionPending={index,replacement,button};showMisdirectionTargets();toast('CHOOSE A MOB TO MISDIRECT');
  }

  hand.addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-card-reward-replacement-key]');
    if(!button||!hand.contains(button))return;
    const card=button.closest('.card');
    const index=Number(card?.dataset.cardRewardManipSlot);
    const replacement=rewardApi.manipulationReplacements?.[index];
    const id=replacement?.def?.id;
    if(!replacement||replacement.used||!NEW_IDS.has(id))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(id==='misdirection'){beginMisdirection(index,replacement,button);return;}
    if(effectFor(id)){markReplacementUsed(index,replacement,button);syncUi();}
  },true);

  world.addEventListener('click',event=>{
    if(!misdirectionPending)return;
    const tile=event.target.closest?.('.tile');
    if(!tile)return;
    event.preventDefault();event.stopImmediatePropagation();
    const enemy=entities.get(key(Number(tile.dataset.r),Number(tile.dataset.c)));
    if(!enemy||enemy.type!=='mob'||enemy.completed||!tile.classList.contains('zone4-misdirection-target'))return;
    if(!moveMisdirectedEnemy(enemy)){toast('NO CLEAR PATH AWAY','danger');return;}
    const {index,replacement,button}=misdirectionPending;misdirectionPending=null;clearMisdirectionTargets();
    markReplacementUsed(index,replacement,button);syncUi();
  },true);

  window.addEventListener('keydown',event=>{
    if(misdirectionPending&&event.key==='Escape'){misdirectionPending=null;clearMisdirectionTargets();toast('MISDIRECTION CANCELLED');return;}
    if(!misdirectionAnimating)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}
  },true);

  /* Adapt the old pressure cards to the synchronous Zone 4 movement turn without
     touching Zones 1–3. This wrapper delegates to the existing V7 step setter. */
  const previousSteps=Object.getOwnPropertyDescriptor(state,'steps');
  if(previousSteps?.get&&previousSteps?.set&&previousSteps.configurable!==false){
    Object.defineProperty(state,'steps',{
      configurable:true,enumerable:true,
      get(){return previousSteps.get.call(state);},
      set(value){
        const current=Number(previousSteps.get.call(state))||0;
        const next=Number(value)||0;
        if(next<=current){previousSteps.set.call(state,value);return;}

        const smokeActive=next<=Number(state.zone4SmokeTrailUntilStep||0);
        const veilActive=next<=Number(state.zone4VeiledPassageUntilStep||0);
        const safeActive=next<=Number(state.zone4SafeWindowUntilStep||0);
        const originalDanger=Number(state.danger)||0;
        let falseTrailEnemy=null;
        let safeBlockBefore=null;

        if(Number(state.zone4FalseTrailCharges)>0){
          falseTrailEnemy=activeHuntingEnemy();
          if(falseTrailEnemy){
            state.zone4FalseTrailCharges--;
            falseTrailEnemy.completed=true;
          }
        }

        if(smokeActive&&originalDanger>=15)state.danger=14;
        if(safeActive){
          safeBlockBefore=Number(state.spawnBlock)||0;
          state.__zone4SafeWindowVisualUntil=Date.now()+250;
          state.spawnBlock=safeBlockBefore+1;
        }

        previousSteps.set.call(state,value);

        if(smokeActive)state.danger=originalDanger;
        if(falseTrailEnemy){
          falseTrailEnemy.completed=false;
          falseTrailEnemy.zone4MoveMode='alert';
          falseTrailEnemy.zone4HuntMemoryUntil=0;
          falseTrailEnemy.zone4AlertMemoryUntil=next+2;
          log(`${falseTrailEnemy.title} follows the False Trail and loses Sharkan.`);
        }

        const hidden=[];
        const player={r:Number(state.row),c:Number(state.col)};
        for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
          if(!dr&&!dc)continue;
          const r=player.r+dr,c=player.c+dc;
          const enemy=entities.get(key(r,c));
          if(!enemy||enemy.completed||(enemy.type!=='mob'&&enemy.type!=='elite'))continue;
          if(!veilActive&&!(Number(state.zone4PressureBreakCharges)>0))continue;
          entities.delete(key(r,c));hidden.push({enemy,r,c});
        }
        if(hidden.length&&!veilActive&&Number(state.zone4PressureBreakCharges)>0){
          state.zone4PressureBreakCharges--;
          log('Pressure Break prevented adjacent aggro.');
        }
        if(hidden.length&&veilActive)log('Veiled Passage prevented adjacent aggro.');

        queueMicrotask(()=>{
          if(safeBlockBefore!=null)state.spawnBlock=safeBlockBefore;
          hidden.forEach(({enemy,r,c})=>{
            if(!enemy.completed&&!entities.has(key(r,c)))entities.set(key(r,c),enemy);
            const tile=world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
            if(tile&&!enemy.completed){tile.classList.add('special',enemy.type);tile.dataset.mark=enemy.mark||'☠';}
          });
          movement?.decorate?.();
        });
      }
    });
  }

  const toastObserver=new MutationObserver(records=>{
    if(Date.now()>Number(state.__zone4SafeWindowVisualUntil||0))return;
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node instanceof Element&&/WARD SIGIL BLOCKED A SPAWN/i.test(node.textContent||''))node.textContent='SAFE WINDOW BLOCKED A SPAWN';
    }));
  });
  toastObserver.observe(toastArea,{childList:true});

  patchSmokeStarter();
  window.HAJJEN_ZONE4_MANIPULATION_BALANCE={
    version:'1.0-ten-card-pool',deck:FULL_DECK,patch:patchSmokeStarter,
    get smokeStarterUsed(){return smokeStarterUsed;},
    get misdirectionPending(){return !!misdirectionPending;}
  };
})();
