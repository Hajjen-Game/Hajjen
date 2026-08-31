(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==2||!state)return;

  const $=id=>document.getElementById(id);
  const app=document.querySelector('.campaign-app');
  if(!app)return;

  app.classList.remove('campaign-app');
  app.classList.add('app','zone2-app');

  const header=app.querySelector('.titlebar');
  const build=header?.querySelector('.build');
  if(build)build.textContent='V4-B 1.0 · ZONES 1–3 SYSTEM PASS';

  const left=app.querySelector('.left-side');
  const right=app.querySelector('.right-side');
  left?.classList.remove('side','left-side');
  left?.classList.add('leftcol');
  right?.classList.remove('side','right-side');
  right?.classList.add('rightcol');

  const objectivePanel=left?.querySelector('.panel');
  objectivePanel?.classList.add('objectives');
  objectivePanel?.querySelectorAll('.quest').forEach((quest,i)=>{
    const icon=quest.querySelector('i');
    icon?.classList.add('quest-icon');
    if(i===0)quest.classList.add('intro-quest');
    if(i===1)icon?.classList.add('mob-color');
    if(i===2)icon?.classList.add('elite-color');
    if(i===3)icon?.classList.add('boss-color');
  });

  const leftPanels=left?[...left.querySelectorAll(':scope > .panel')]:[];
  const manipPanel=leftPanels[1];
  if(manipPanel){
    manipPanel.classList.add('manipulation-panel');
    const h=manipPanel.querySelector('h2');
    if(h)h.textContent='HAND — MANIPULATION';
    if(!manipPanel.querySelector('.panel-note')){
      const note=document.createElement('p');
      note.className='panel-note';
      note.textContent='Zone 2: four world-control cards.';
      h?.after(note);
    }
    $('manipCards')?.classList.add('mini-cards');
  }

  if(left&&objectivePanel){
    const deckPanel=document.createElement('section');
    deckPanel.className='panel deck-sidebar-panel';
    deckPanel.innerHTML=`<h2>CARD DECKS</h2><div class="deck-row deck-sidebar two-decks">
      <div class="deck-pile manipulation"><strong>MANIPULATION</strong><span id="manipDeckCount">4 / 4 READY</span></div>
      <div class="deck-pile enchantment locked"><strong>ENCHANTMENT</strong><span>LOCKED · INTRODUCED IN ZONE 3</span><span class="deck-lock" aria-label="Locked">🔒</span></div>
    </div>`;
    objectivePanel.insertAdjacentElement('afterend',deckPanel);
  }

  const hand=$('manipCards');
  const handTitle=manipPanel?.querySelector('h2');
  let slotCount=null;
  if(handTitle){
    handTitle.textContent='';
    const title=document.createElement('span');
    title.className='hand-title-text';
    title.textContent='HAND — MANIPULATION';
    slotCount=document.createElement('span');
    slotCount.className='hand-slot-count';
    handTitle.append(title,slotCount);
  }

  if(hand){
    let handObserver;
    let queued=false;
    const rebuildHand=()=>{
      handObserver?.disconnect();
      hand.querySelectorAll(':scope > .hand-empty-slot').forEach(x=>x.remove());
      const cards=[...hand.querySelectorAll(':scope > .card')];
      cards.forEach(card=>{
        card.classList.add('mini-card');
        if(!card.querySelector('.card-cat')){
          const cat=document.createElement('div');
          cat.className='card-cat';
          cat.textContent='MANIPULATION';
          card.prepend(cat);
        }
      });
      for(let i=cards.length;i<7;i++){
        const empty=document.createElement('div');
        empty.className='hand-empty-slot';
        empty.setAttribute('aria-label',`Empty hand slot ${i+1}`);
        hand.appendChild(empty);
      }
      if(slotCount)slotCount.textContent=`${cards.length} / 7 SLOTS`;
      handObserver?.observe(hand,{childList:true});
    };
    handObserver=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;rebuildHand();});
    });
    handObserver.observe(hand,{childList:true});
    rebuildHand();
  }

  const main=app.querySelector('.main');
  const viewport=$('viewport');
  const world=$('world');
  viewport?.classList.add('board-wrap','zone2-board-wrap');
  world?.classList.add('board','zone2-world');

  const boardTop=main?.querySelector('.board-topline');
  if(boardTop){
    const spans=boardTop.querySelectorAll('span');
    if(spans[0])spans[0].textContent='ZONE 2 — 25×10';
    if(spans[1])spans[1].textContent='WASD / arrows or click an adjacent tile';
  }

  const legend=main?.querySelector('.legend');
  if(legend)legend.innerHTML='<span><i class="legend-dot ingredient-color">✿</i> Ingredient</span><span><i class="legend-dot ingredient-color">⚗</i> Potion Ingredient</span><span><i class="legend-dot mob-color">☠</i> Mob</span><span><i class="legend-dot elite-color">⚔</i> Elite</span><span><i class="legend-dot boss-color">♛</i> Boss</span>';

  const normalizeBoardMarks=()=>{
    world?.querySelectorAll('.tile.special').forEach(tile=>{
      let mark=null;
      if(tile.classList.contains('ingredient'))mark='✿';
      else if(tile.classList.contains('mob'))mark='☠';
      else if(tile.classList.contains('elite'))mark='⚔';
      else if(tile.classList.contains('boss'))mark='♛';
      else if(tile.classList.contains('potion-ingredient'))mark='⚗';
      if(mark&&tile.dataset.mark!==mark)tile.dataset.mark=mark;
    });
  };
  if(world)new MutationObserver(normalizeBoardMarks).observe(world,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-mark']});
  normalizeBoardMarks();

  const rightPanels=right?[...right.querySelectorAll(':scope > .panel')]:[];
  const status=rightPanels[0];
  const tileInfo=rightPanels[1];
  const eventPanel=rightPanels[2];

  if(status){
    status.classList.add('status');
    status.innerHTML=`<h2>SHARKAN</h2>
      <div class="status-line"><span>HP</span><div class="bar hp-bar"><i id="hpFill"></i></div><b id="hpText"></b></div>
      <div class="status-line"><span>XP</span><div class="bar xp-bar"><i id="xpFill"></i></div><b id="xpText"></b></div>
      <div class="level-line"><span>LEVEL</span><strong id="levelText"></strong></div>
      <div class="status-line danger-line"><span>DANGER</span><div class="bar danger-bar"><i id="dangerFill"></i></div><b id="dangerText"></b></div>
      <div id="dangerState" class="danger-state calm">CALM</div>
      <div class="danger-expanded">
        <div class="danger-expanded-title"><span>DANGER SYSTEM</span><span>PRESSURE + SCALING</span></div>
        <div id="dangerRule" class="danger-rule"><strong>CALM</strong><span>Low spawn pressure.</span></div>
        <div class="thresholds"><div><b>0–4</b><span>Calm</span></div><div><b>5–9</b><span>Uneasy</span></div><div><b>10–14</b><span>Dangerous</span></div><div><b>15–19</b><span>Hostile</span></div><div><b>20</b><span>Critical</span></div></div>
        <div class="pressure-grid"><div><span>Visible</span><strong id="visibleText"></strong></div><div><span>Zone level cap</span><strong>${cfg.levelCap}</strong></div><div><span>Next ambient Danger</span><strong id="clockText"></strong></div><div><span>Enemy power</span><strong id="powerText"></strong></div></div>
        <p class="panel-note">Every 3 movement steps adds +1 Danger. Harvesting adds +1. Fixed mob kills add +2; spawned mobs add 0.</p>
      </div>`;
  }

  if(tileInfo&&viewport){
    tileInfo.classList.remove('tile-info');
    tileInfo.classList.add('tileinfo','tile-tooltip');
    viewport.appendChild(tileInfo);
    let tipTimer=null;
    const showTip=()=>{clearTimeout(tipTimer);tileInfo.classList.add('show');};
    const hideTip=()=>{clearTimeout(tipTimer);tileInfo.classList.remove('show');};
    world?.querySelectorAll('.tile').forEach(tile=>{
      tile.addEventListener('mouseenter',showTip);
      tile.addEventListener('mouseleave',hideTip);
      tile.addEventListener('click',()=>{
        if(matchMedia('(hover: none)').matches){
          showTip();
          tipTimer=setTimeout(hideTip,1800);
        }
      });
    });
  }
  eventPanel?.classList.add('event-panel');

  const bottom=app.querySelector('.bottom');
  const bottomPanels=bottom?[...bottom.querySelectorAll(':scope > .panel')]:[];
  const spellPanel=bottomPanels[0];
  const zonePanel=bottomPanels[1];
  const pressurePanel=bottomPanels[2];
  const craftBtn=$('craftSpellBtn');
  const potionBtn=$('usePotionBtn');
  const resetBtn=$('resetBtn');

  if(spellPanel){
    spellPanel.classList.add('spell-panel');
    const oldHeading=spellPanel.querySelector('h2');
    const heading=document.createElement('div');
    heading.className='panel-heading';
    const title=document.createElement('h2');
    title.textContent='SPELLBOOK';
    heading.appendChild(title);
    if(craftBtn){
      craftBtn.classList.add('small-btn');
      heading.appendChild(craftBtn);
    }
    oldHeading?.replaceWith(heading);
    $('spellGrid')?.classList.add('spell-list');
    const res=$('spellResources');
    if(res){
      res.classList.add('inventory-line');
      res.innerHTML='<strong>INGREDIENTS</strong><span id="spellIngredientText">None</span>';
    }
  }

  function modalShell(id,titleText){
    const modal=document.createElement('div');
    modal.id=id;
    modal.className='modal system-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    const card=document.createElement('div');
    card.className='modal-card';
    const heading=document.createElement('div');
    heading.className='modal-heading';
    const h=document.createElement('h2');
    h.textContent=titleText;
    const close=document.createElement('button');
    close.type='button';
    close.className='close-system';
    close.textContent='CLOSE';
    heading.append(h,close);
    const body=document.createElement('div');
    card.append(heading,body);
    modal.appendChild(card);
    document.body.appendChild(modal);
    const closeModal=()=>modal.classList.remove('show');
    close.addEventListener('click',closeModal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    return {modal,body,open:()=>modal.classList.add('show'),close:closeModal};
  }

  const spellbook=modalShell('spellbookModal','SPELLBOOK');
  spellbook.body.className='spellbook-modal-body';
  if(spellPanel){
    spellbook.body.appendChild(spellPanel);
    spellPanel.classList.add('spellbook-restored');
  }

  const backpack=modalShell('backpackModal','BACKPACK');
  backpack.body.innerHTML=`<div class="backpack-grid">
    <div class="backpack-item"><strong>HEALING POTION</strong><span id="backpackPotionText"></span><button id="backpackUsePotion" type="button">USE POTION</button></div>
    <div class="backpack-item"><strong>SPELL INGREDIENTS</strong><span id="backpackSpellIngredients">None</span></div>
    <div class="backpack-item"><strong>POTION INGREDIENTS</strong><span id="backpackPotionIngredients">None</span></div>
    <div class="backpack-item backpack-resources potion-crafting-slot"><strong>HEALING POTION RECIPE</strong><span>Moonleaf + Clearwater</span><div id="potionCraftMount"></div></div>
  </div>`;
  if(zonePanel){
    zonePanel.classList.add('backpack-zone-system');
    $('potionCraftMount')?.appendChild(zonePanel);
  }

  const help=modalShell('helpModal','HELP');
  help.body.innerHTML=`<div class="help-copy"><strong>ZONE 2 GOAL</strong><ul><li>Create a Healing Potion from Moonleaf + Clearwater.</li><li>Defeat 4 normal mobs, both Guardians, and reach Level 7 to unlock the Zone 2 boss.</li><li>The world is wider than Zone 1; the camera follows Sharkan horizontally.</li></ul><strong>DANGER</strong><ul><li>Movement, harvesting and combat raise Danger just like Zone 1.</li><li>Higher Danger increases spawn pressure and enemy scaling.</li></ul><strong>BACKPACK</strong><ul><li>Unused spell ingredients carry between zones.</li><li>Healing Potions and crafted spells also carry forward.</li></ul><strong>SPELLS</strong><ul><li>Your Zone 1 spells remain available.</li><li>Collect two ingredients to create another spell if you still have a free crafted-spell slot.</li></ul></div>`;

  const cardsHud=document.createElement('div');
  cardsHud.className='cards-hud';
  if(manipPanel)cardsHud.appendChild(manipPanel);

  const actionHud=document.createElement('div');
  actionHud.className='action-hud';
  actionHud.innerHTML=`<div class="action-hud-title"><span>ACTION BAR</span><span>4 SPELLS · POTION</span></div><div id="actionbar" class="actionbar">
    <button type="button" class="action-slot spell-slot empty" data-action-spell="0">EMPTY SPELL</button>
    <button type="button" class="action-slot spell-slot empty" data-action-spell="1">EMPTY SPELL</button>
    <button type="button" class="action-slot spell-slot empty" data-action-spell="2">EMPTY SPELL</button>
    <button type="button" class="action-slot spell-slot empty" data-action-spell="3">EMPTY SPELL</button>
    <div class="action-divider"></div>
  </div>`;
  const actionbar=actionHud.querySelector('#actionbar');
  if(potionBtn){
    potionBtn.classList.add('action-slot');
    actionbar.appendChild(potionBtn);
  }

  const utility=document.createElement('div');
  utility.className='utility-hud';
  const spellbookBtn=document.createElement('button');
  spellbookBtn.type='button';
  spellbookBtn.className='spellbook-open';
  spellbookBtn.textContent='SPELLBOOK';
  const backpackBtn=document.createElement('button');
  backpackBtn.type='button';
  backpackBtn.className='backpack-open';
  backpackBtn.textContent='BACKPACK';
  const helpBtn=document.createElement('button');
  helpBtn.type='button';
  helpBtn.className='help-open';
  helpBtn.textContent='HELP';
  if(resetBtn)utility.append(spellbookBtn,backpackBtn,helpBtn,resetBtn);
  else utility.append(spellbookBtn,backpackBtn,helpBtn);
  spellbookBtn.addEventListener('click',spellbook.open);
  backpackBtn.addEventListener('click',backpack.open);
  helpBtn.addEventListener('click',help.open);

  if(bottom){
    bottom.innerHTML='';
    bottom.append(cardsHud,actionHud,utility);
  }
  pressurePanel?.remove();
  app.querySelector('.footer')?.remove();

  const forceClasses=['ember','growth','flow','stone','gale','aether'];
  const spellButtons=[...actionHud.querySelectorAll('[data-action-spell]')];

  function decorateSpells(){
    $('spellGrid')?.querySelectorAll('.spell').forEach(spell=>{
      const text=spell.querySelector('span')?.textContent||'';
      const force=forceClasses.find(f=>text.toLowerCase().startsWith(f));
      forceClasses.forEach(f=>spell.classList.remove(f));
      if(force)spell.classList.add(force);
    });
  }

  function syncActionbar(){
    decorateSpells();
    const spellEls=[...($('spellGrid')?.querySelectorAll('.spell')||[])];
    spellButtons.forEach((btn,i)=>{
      btn.className='action-slot spell-slot';
      const src=spellEls[i];
      if(!src){
        btn.classList.add('empty');
        btn.textContent='EMPTY SPELL';
        return;
      }
      const text=src.querySelector('span')?.textContent||'';
      const force=forceClasses.find(c=>src.classList.contains(c)||text.toLowerCase().startsWith(c));
      if(force)btn.classList.add(force);
      const strong=src.querySelector('strong')?.textContent||'SPELL';
      const spans=[...src.querySelectorAll('span')].map(x=>x.textContent);
      btn.innerHTML=`<strong>${strong}</strong><span>${spans[0]||''}</span><small>${spans[1]||''}</small>`;
    });
  }
  spellButtons.forEach(btn=>btn.addEventListener('click',spellbook.open));

  function syncDeck(){
    const buttons=[...($('manipCards')?.querySelectorAll('button')||[])];
    const ready=buttons.filter(b=>!b.disabled&&/^PLAY/.test(b.textContent||'')).length;
    const count=$('manipDeckCount');
    if(count)count.textContent=`${ready} / 4 READY`;
  }

  function potionDisabled(){
    const count=Math.max(0,Number(state.potion)||0);
    return count<1||state.hp>=state.maxHp||!!state.combat||!!state.gameOver;
  }

  function syncPotionUi(){
    const count=Math.max(0,Number(state.potion)||0);
    const disabled=potionDisabled();
    if(potionBtn){
      const desired=`<strong>HEALING POTION</strong><small>${count} left · +30 HP</small>`;
      if(potionBtn.innerHTML!==desired)potionBtn.innerHTML=desired;
      if(potionBtn.disabled!==disabled)potionBtn.disabled=disabled;
      potionBtn.classList.toggle('has-potion',count>0);
      potionBtn.classList.toggle('no-potion',count<1);
      potionBtn.style.opacity=count>0?'1':'.35';
      potionBtn.setAttribute('aria-label',`Healing Potion, ${count} left, restores 30 HP`);
    }
    const backpackPotion=$('backpackPotionText');
    if(backpackPotion)backpackPotion.textContent=`${count} left · +30 HP`;
    const backpackUse=$('backpackUsePotion');
    if(backpackUse&&backpackUse.disabled!==disabled)backpackUse.disabled=disabled;
  }

  function syncBackpack(){
    const spellIng=$('backpackSpellIngredients');
    if(spellIng)spellIng.textContent=state.spellIngredients.length?state.spellIngredients.map(i=>`${i.name} (${i.force})`).join(' · '):'None';
    const potionIng=$('backpackPotionIngredients');
    if(potionIng)potionIng.textContent=state.potionIngredients.length?state.potionIngredients.join(' · '):'None';
    const line=$('spellIngredientText');
    if(line)line.textContent=state.spellIngredients.length?state.spellIngredients.map(i=>`${i.name} (${i.force})`).join(' · '):'None';
    syncPotionUi();
  }

  $('backpackUsePotion')?.addEventListener('click',()=>{
    potionBtn?.click();
    queueMicrotask(syncBackpack);
  });
  craftBtn?.addEventListener('click',spellbook.close);

  function syncStatus(){
    const hpText=$('hpText');
    const xpText=$('xpText');
    const levelText=$('levelText');
    const dangerText=$('dangerText');
    if(hpText)hpText.textContent=`${state.hp} / ${state.maxHp}`;
    if(levelText)levelText.textContent=state.level;
    const thresholds={4:120,5:180,6:250,7:330};
    const prev=thresholds[state.level]||120;
    const next=thresholds[state.level+1]||prev;
    if(xpText)xpText.textContent=state.level>=cfg.levelCap?`${state.xp} XP · ZONE CAP`:`${Math.max(0,state.xp-prev)} / ${Math.max(0,next-prev)}`;
    if(dangerText)dangerText.textContent=`${state.danger} / 20`;
    const hpFill=$('hpFill');
    if(hpFill)hpFill.style.width=`${state.hp/state.maxHp*100}%`;
    const xpFill=$('xpFill');
    if(xpFill){
      const pct=state.level>=cfg.levelCap?100:Math.max(0,Math.min(100,(state.xp-prev)/(next-prev)*100));
      xpFill.style.width=`${pct}%`;
    }
    const dangerFill=$('dangerFill');
    if(dangerFill)dangerFill.style.width=`${state.danger*5}%`;
    const tier=state.zoneCleared?'calm':state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';
    const dangerState=$('dangerState');
    if(dangerState){
      dangerState.className=`danger-state ${tier}`;
      dangerState.textContent=state.zoneCleared?'CLEARED':tier.toUpperCase();
    }
    const info={calm:['CALM','Low spawn pressure.'],uneasy:['UNEASY','Mobs can begin spawning as you move.'],dangerous:['DANGEROUS','More spawns and stronger enemies.'],hostile:['HOSTILE','Heavy spawn pressure and strong enemies.'],critical:['CRITICAL','Maximum pressure and enemy scaling.']}[tier];
    const rule=$('dangerRule');
    if(rule)rule.innerHTML=`<strong>${state.zoneCleared?'CLEARED':info[0]}</strong><span>${state.zoneCleared?'No more enemy pressure in this zone.':info[1]}</span>`;
    const clock=$('clockText');
    if(clock)clock.textContent=state.zoneCleared?'SAFE':`${state.nextAmbient} step${state.nextAmbient===1?'':'s'}`;
    const power=$('powerText');
    if(power){
      const scale=state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;
      power.textContent=`+${state.zoneCleared?0:scale}%`;
    }
  }

  if($('spellGrid'))new MutationObserver(()=>{syncActionbar();syncBackpack();}).observe($('spellGrid'),{childList:true,subtree:true,characterData:true});
  if($('manipCards'))new MutationObserver(()=>{syncDeck();syncBackpack();}).observe($('manipCards'),{childList:true,subtree:true,attributes:true});
  if($('zoneSystem'))new MutationObserver(syncBackpack).observe($('zoneSystem'),{childList:true,subtree:true,characterData:true});

  let potionSyncQueued=false;
  const queuePotionSync=()=>{
    if(potionSyncQueued)return;
    potionSyncQueued=true;
    queueMicrotask(()=>{
      potionSyncQueued=false;
      syncPotionUi();
    });
  };
  document.addEventListener('click',e=>{
    if(!(e.target instanceof Element))return;
    if(e.target.closest('#craftPotionBtn,#usePotionBtn,#combatPotionBtn,#backpackUsePotion'))queuePotionSync();
  },true);
  window.addEventListener('focus',queuePotionSync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queuePotionSync();});

  const tick=()=>{syncStatus();syncBackpack();syncDeck();syncActionbar();};
  tick();
  setInterval(tick,220);

  window.addEventListener('keydown',e=>{
    const anySystem=[spellbook.modal,backpack.modal,help.modal].some(m=>m.classList.contains('show'));
    if(!anySystem)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'].includes(e.key)){
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if(e.key==='Escape'){
      spellbook.close();
      backpack.close();
      help.close();
    }
  },true);
})();