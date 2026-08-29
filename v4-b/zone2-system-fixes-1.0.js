(()=>{
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==2||!state)return;

  const $=id=>document.getElementById(id);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const eventLog=$('eventLog');
  const toastArea=$('toastArea');
  const world=$('world');
  const combatModal=$('combatModal');
  if(!eventLog||!world)return;

  function addLog(text,type='system'){
    const e=document.createElement('div');
    e.className=`event ${type}`;
    e.textContent=text;
    eventLog.prepend(e);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function addToast(text,type='system'){
    if(!toastArea)return;
    const t=document.createElement('div');
    t.className=`toast ${type}`;
    t.textContent=text;
    toastArea.prepend(t);
    setTimeout(()=>t.remove(),1700);
  }
  function dangerTier(){return state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';}
  function syncDangerUi(){
    const d=$('dangerText');if(d)d.textContent=`${state.danger} / 20`;
    const fill=$('dangerFill');if(fill)fill.style.width=`${state.danger*5}%`;
    const badge=$('dangerState');if(badge){const tier=state.zoneCleared?'calm':dangerTier();badge.className=`danger-state ${tier}`;badge.textContent=state.zoneCleared?'CLEARED':tier.toUpperCase();}
    const power=$('powerText');if(power){const p=state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;power.textContent=`+${state.zoneCleared?0:p}%`;}
  }
  function syncHpUi(){
    const hp=$('hpText');if(hp)hp.textContent=`${state.hp} / ${state.maxHp}`;
    const fill=$('hpFill');if(fill)fill.style.width=`${state.hp/state.maxHp*100}%`;
    const combatHp=$('combatHpText');if(combatHp&&state.combat)combatHp.textContent=`${state.hp} / ${state.maxHp}`;
    const combatFill=$('combatHpFill');if(combatFill&&state.combat)combatFill.style.width=`${state.hp/state.maxHp*100}%`;
  }

  // ------------------------------------------------------------
  // ZONE 2 SPELL CREATION — use the same manual two-ingredient
  // selection model as Zone 1. First ingredient defines the spell;
  // second ingredient defines its modifier.
  // ------------------------------------------------------------
  const forceSpell={Growth:{name:'Thorn Bloom',damage:24,cooldown:1},Ember:{name:'Cinder Burst',damage:32,cooldown:2},Flow:{name:'Tide Lash',damage:26,cooldown:1},Stone:{name:'Stone Breaker',damage:29,cooldown:2},Gale:{name:'Razor Gust',damage:23,cooldown:1},Aether:{name:'Rift Pulse',damage:35,cooldown:3}};
  const modifierBonus=force=>({Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5}[force]||2);
  let craftBtn=$('craftSpellBtn');
  let craftSelection=[];

  function craftedCount(){return (state.spells||[]).filter(s=>!s.fallback).length;}
  function refreshSpellUi(){
    const grid=$('spellGrid');
    if(grid){
      grid.innerHTML='';
      (state.spells||[]).forEach(s=>{
        const d=document.createElement('div');
        d.className=`spell ${String(s.force||'').toLowerCase()}`;
        const damage=(s.damage||0)+(state.level-1)*4+(s.enchantDamage||0);
        const cd=Math.max(0,(s.cooldown||0)-(s.cooldownReduction||0));
        d.innerHTML=`<strong>${s.name}</strong><span>${s.force} · ${damage} damage · CD ${cd}${s.fallback?' · FALLBACK':''}</span><span>${s.enchantmentName||'No extra effect.'}</span>`;
        grid.appendChild(d);
      });
    }
    const line=$('spellIngredientText');
    const text=(state.spellIngredients||[]).length?state.spellIngredients.map(i=>`${i.name} (${i.force})`).join(' · '):'None';
    if(line)line.textContent=text;
    else if($('spellResources'))$('spellResources').textContent=`Spell ingredients: ${text}`;
    const backpack=$('backpackSpellIngredients');if(backpack)backpack.textContent=text;
    if(craftBtn)craftBtn.disabled=(state.spellIngredients||[]).length<2||craftedCount()>=3||state.gameOver;
  }

  if(craftBtn){
    const clean=craftBtn.cloneNode(true);
    clean.id='craftSpellBtn';
    craftBtn.replaceWith(clean);
    craftBtn=clean;

    const craftModal=document.createElement('div');
    craftModal.id='zone2CraftModal';
    craftModal.className='modal';
    craftModal.setAttribute('role','dialog');
    craftModal.setAttribute('aria-modal','true');
    craftModal.innerHTML=`<div class="modal-card craft-card"><div class="modal-kicker">SPELL CREATION</div><h2>CREATE A SPELL</h2><p>Choose two ingredients. The first determines the Primal Force; both ingredients are consumed.</p><div id="zone2CraftChoices" class="craft-choices"></div><div id="zone2CraftPreview" class="craft-preview">Choose 2 ingredients.</div><div class="modal-actions"><button id="zone2ConfirmCraft" disabled>CREATE SPELL</button><button id="zone2CancelCraft" class="ghost-btn">CANCEL</button></div></div>`;
    document.body.appendChild(craftModal);

    const renderCraft=()=>{
      const choices=$('zone2CraftChoices');if(!choices)return;
      choices.innerHTML='';
      (state.spellIngredients||[]).forEach((ing,i)=>{
        const b=document.createElement('button');
        b.type='button';
        b.className='craft-choice'+(craftSelection.includes(i)?' selected':'');
        const order=craftSelection.indexOf(i);
        b.innerHTML=`<strong>${ing.name}</strong><span>${ing.force}${order>=0?` · SLOT ${order+1}`:''}</span>`;
        b.addEventListener('click',()=>{
          const p=craftSelection.indexOf(i);
          if(p>=0)craftSelection.splice(p,1);
          else if(craftSelection.length<2)craftSelection.push(i);
          renderCraft();
        });
        choices.appendChild(b);
      });
      const chosen=craftSelection.map(i=>state.spellIngredients[i]).filter(Boolean);
      const confirm=$('zone2ConfirmCraft');if(confirm)confirm.disabled=chosen.length!==2;
      const preview=$('zone2CraftPreview');
      if(preview){
        if(chosen.length===2){
          const base=forceSpell[chosen[0].force],bonus=modifierBonus(chosen[1].force);
          preview.textContent=`${base.name} · ${chosen[0].force} · ${base.damage+bonus} base damage · Cooldown ${base.cooldown}.`;
        }else preview.textContent=`Choose 2 ingredients (${chosen.length}/2). The first determines the Primal Force; both are consumed.`;
      }
    };

    craftBtn.addEventListener('click',()=>{
      if((state.spellIngredients||[]).length<2||craftedCount()>=3||state.gameOver)return;
      document.getElementById('spellbookModal')?.classList.remove('show');
      craftSelection=[];
      renderCraft();
      craftModal.classList.add('show');
    });
    $('zone2CancelCraft')?.addEventListener('click',()=>craftModal.classList.remove('show'));
    craftModal.addEventListener('click',e=>{if(e.target===craftModal)craftModal.classList.remove('show');});
    $('zone2ConfirmCraft')?.addEventListener('click',()=>{
      if(craftSelection.length!==2)return;
      const first=state.spellIngredients[craftSelection[0]],second=state.spellIngredients[craftSelection[1]];
      if(!first||!second)return;
      const base=forceSpell[first.force],bonus=modifierBonus(second.force);
      state.spells.push({id:`crafted-${Date.now()}`,name:base.name,force:first.force,damage:base.damage+bonus,ingredientBonus:bonus,cooldown:base.cooldown});
      [...craftSelection].sort((a,b)=>b-a).forEach(i=>state.spellIngredients.splice(i,1));
      craftSelection=[];
      craftModal.classList.remove('show');
      addLog(`${base.name} created from ${first.name} + ${second.name}. Cooldown ${base.cooldown}.`,'reward');
      addToast(`${base.name.toUpperCase()} CREATED`,'reward');
      refreshSpellUi();
    });
    refreshSpellUi();
  }

  // ------------------------------------------------------------
  // ZONE 2 PRIMAL SPRING — one use, +45 HP. The config reserves
  // this coordinate as a non-combat entity so ambient spawns can
  // never occupy the Spring tile.
  // ------------------------------------------------------------
  const SPRING={row:4,col:17,heal:45};
  let springUsed=false;
  let wasOnSpring=false;
  const springTile=()=>world.querySelector(`.tile[data-r="${SPRING.row}"][data-c="${SPRING.col}"]`);
  function decorateSpring(){
    const tile=springTile();if(!tile)return;
    if(!tile.classList.contains('spring'))tile.classList.add('spring');
    if(!tile.classList.contains('special'))tile.classList.add('special');
    if(springUsed){if(!tile.classList.contains('completed'))tile.classList.add('completed');if(tile.dataset.mark!=='×')tile.dataset.mark='×';}
    else{tile.classList.remove('completed');if(tile.dataset.mark!=='✧')tile.dataset.mark='✧';}
  }
  function springInfo(){
    const title=$('tileTitle'),sub=$('tileSub'),desc=$('tileDesc');
    if(title)title.textContent='PRIMAL SPRING';
    if(sub)sub.textContent=springUsed?'Depleted':'Restorative site · One use';
    if(desc)desc.textContent=springUsed?'The spring has already restored Sharkan this run.':'Step here while injured to restore up to 45 HP. It becomes depleted after use.';
  }
  world.addEventListener('mouseover',e=>{const t=e.target instanceof Element?e.target.closest('.tile'):null;if(t===springTile())setTimeout(springInfo,0);});
  world.addEventListener('click',e=>{const t=e.target instanceof Element?e.target.closest('.tile'):null;if(t===springTile())setTimeout(springInfo,0);});
  const legend=document.querySelector('.zone2-app .legend');
  if(legend&&!legend.querySelector('.spring-color')){
    const span=document.createElement('span');span.innerHTML='<i class="legend-dot spring-color">✧</i> Primal Spring';
    const boss=legend.querySelector('.boss-color')?.closest('span');
    if(boss)legend.insertBefore(span,boss);else legend.appendChild(span);
  }

  function checkSpring(){
    decorateSpring();
    const on=state.row===SPRING.row&&state.col===SPRING.col;
    if(on&&!wasOnSpring&&!springUsed&&!state.combat&&!state.gameOver){
      if(state.hp>=state.maxHp){
        addLog('Primal Spring remains unused because Sharkan is already at full HP.','system');
        addToast('HP FULL — SPRING REMAINS','system');
      }else{
        const heal=Math.min(SPRING.heal,state.maxHp-state.hp);
        state.hp+=heal;
        springUsed=true;
        state.zone2SpringUsed=true;
        state.zone2SpringHealing=(state.zone2SpringHealing||0)+heal;
        addLog(`Primal Spring restored ${heal} HP.`,'reward');
        addToast(`PRIMAL SPRING · +${heal} HP`,'reward');
        syncHpUi();decorateSpring();springInfo();
      }
    }
    wasOnSpring=on;
  }
  setInterval(checkSpring,70);
  decorateSpring();

  // ------------------------------------------------------------
  // ZONE 2 SPAWN PARITY WITH ZONE 1
  // - spawned mobs add no Danger when defeated
  // - at most four spawned mobs can be active
  // - boss unlock suppresses future spawns and forced adjacent aggro
  // Core already materializes at most one spawn per movement step.
  // ------------------------------------------------------------
  let activeSpawned=0;
  let spawnedCombatDanger=null;
  let syntheticCapBlock=false;

  const nativePrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    nodes.forEach(node=>{
      if(!(node instanceof Element))return;
      const text=(node.textContent||'').trim();
      if(/^ROUSED MOB \d+ engaged(?: from adjacent aggro)?\.$/i.test(text))spawnedCombatDanger=state.danger;
      if(/^Danger \+2 \(mob defeated\)/i.test(text)&&spawnedCombatDanger!==null){
        state.danger=spawnedCombatDanger;
        node.className='event system';
        node.textContent=`Spawned mob defeated — Danger unchanged at ${state.danger}/20.`;
        syncDangerUi();
      }
      if(/^ROUSED MOB \d+ defeated\.$/i.test(text)){
        activeSpawned=Math.max(0,activeSpawned-1);
        spawnedCombatDanger=null;
      }
      if(/^Sharkan was defeated\./i.test(text))spawnedCombatDanger=null;
    });
    nativePrepend(...nodes);
  };

  if(combatModal)new MutationObserver(()=>{
    if(!combatModal.classList.contains('show')&&!state.combat)spawnedCombatDanger=null;
  }).observe(combatModal,{attributes:true,attributeFilter:['class']});

  if(toastArea)new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();
      if(/^NEW MOB SPAWNED$/i.test(text))activeSpawned++;
      if(/^SPAWN BLOCKED$/i.test(text)&&syntheticCapBlock)node.textContent='SPAWN PRESSURE CAPPED';
    }
  }).observe(toastArea,{childList:true});

  function targetTileForKey(keyName){
    const dir={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]}[keyName];
    if(!dir)return null;
    const r=state.row+dir[0],c=state.col+dir[1];
    return world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  }
  function isDirectCombatTarget(tile){return !!tile&&(tile.classList.contains('mob')||tile.classList.contains('elite')||tile.classList.contains('boss'));}
  function prepareMovementSuppression(tile){
    if(state.combat||state.gameOver||isDirectCombatTarget(tile))return;

    if(state.bossUnlocked){
      const original=state.danger;
      state.danger=0;
      setTimeout(()=>{
        // Preserve any ambient/harvest Danger gained during the move while
        // still keeping spawn/aggro checks below their activation threshold.
        state.danger=clamp(original+state.danger,0,20);
        syncDangerUi();
      },0);
      return;
    }

    if(activeSpawned>=4){
      const original=state.spawnBlock;
      syntheticCapBlock=true;
      state.spawnBlock=original+1;
      setTimeout(()=>{state.spawnBlock=original;syntheticCapBlock=false;},0);
    }
  }

  world.addEventListener('click',e=>{
    const tile=e.target instanceof Element?e.target.closest('.tile'):null;
    if(!tile)return;
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c);
    if(Math.abs(r-state.row)+Math.abs(c-state.col)!==1)return;
    prepareMovementSuppression(tile);
  },true);
  window.addEventListener('keydown',e=>{
    const tile=targetTileForKey(e.key);if(tile)prepareMovementSuppression(tile);
  },true);

  // Update the Zone 2 rule copy so the UI matches the effective runtime rules.
  document.querySelectorAll('.zone2-app .panel-note').forEach(note=>{
    if(/Normal mob kills add \+2/i.test(note.textContent||''))note.textContent='Every 3 movement steps adds +1 Danger. Harvesting adds +1. Fixed mob kills add +2; spawned mobs add 0.';
  });

  window.HAJJEN_V4B_ZONE2_SYSTEM_FIXES={
    spring:{get used(){return springUsed;},get healing(){return state.zone2SpringHealing||0;}},
    spawns:{get active(){return activeSpawned;}}
  };
})();
