(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||Number(cfg.zone)<2||!state)return;

  const zone=Number(cfg.zone);
  const $=id=>document.getElementById(id);
  const app=document.querySelector('.campaign-app');
  if(!app)return;

  app.classList.remove('campaign-app');
  app.classList.add('app','campaign-zone-app',`zone${zone}-app`);
  // Zone 2 still has isolated system-fix modules that query this legacy class.
  if(zone===2)app.classList.add('zone2-app');
  app.dataset.campaignZone=String(zone);

  const header=app.querySelector('.titlebar');
  const build=header?.querySelector('.build');
  if(build)build.textContent=`V4-B 1.0 · CAMPAIGN ZONE ${zone}`;

  const left=app.querySelector('.left-side');
  const right=app.querySelector('.right-side');
  left?.classList.remove('side','left-side');
  left?.classList.add('leftcol');
  right?.classList.remove('side','right-side');
  right?.classList.add('rightcol');

  const objectivePanel=left?.querySelector(':scope > .panel:first-child');
  objectivePanel?.classList.add('objectives');
  objectivePanel?.querySelectorAll('.quest').forEach((quest,index)=>{
    const icon=quest.querySelector('i');
    icon?.classList.add('quest-icon');
    if(index===0)quest.classList.add('intro-quest');
    if(index===1)icon?.classList.add('mob-color');
    if(index===2)icon?.classList.add('elite-color');
    if(index===3)icon?.classList.add('boss-color');
  });

  const leftPanels=left?[...left.querySelectorAll(':scope > .panel')]:[];
  const manipPanel=leftPanels[1]||null;
  const hand=$('manipCards');
  if(manipPanel){
    manipPanel.classList.add('manipulation-panel');
    const heading=manipPanel.querySelector('h2');
    if(heading)heading.textContent='HAND';
    hand?.classList.add('mini-cards');
    hand?.querySelectorAll(':scope > .card').forEach(card=>{
      card.classList.add('mini-card');
      if(!card.querySelector('.card-cat')){
        const category=document.createElement('div');
        category.className='card-cat';
        category.textContent='MANIPULATION';
        card.prepend(category);
      }
    });
  }

  if(left&&objectivePanel&&!left.querySelector('.deck-sidebar-panel')){
    const deckPanel=document.createElement('section');
    deckPanel.className='panel deck-sidebar-panel';
    deckPanel.innerHTML='<h2>CARD DECKS</h2><div class="deck-row deck-sidebar"></div>';
    objectivePanel.insertAdjacentElement('afterend',deckPanel);
  }

  const main=app.querySelector('.main');
  const viewport=$('viewport');
  const world=$('world');
  viewport?.classList.add('board-wrap','campaign-board-wrap');
  world?.classList.add('board','campaign-world');
  if(zone===2){
    viewport?.classList.add('zone2-board-wrap');
    world?.classList.add('zone2-world');
  }

  const boardTop=main?.querySelector('.board-topline');
  if(boardTop){
    const spans=boardTop.querySelectorAll('span');
    if(spans[0])spans[0].textContent=`${cfg.name||`ZONE ${zone}`} — ${cfg.cols}×${cfg.rows}`;
    if(spans[1])spans[1].textContent='WASD / arrows or click an adjacent tile';
  }

  const legend=main?.querySelector('.legend');
  if(legend){
    const entries=['<span><i class="legend-dot ingredient-color">✿</i> Ingredient</span>'];
    if((cfg.potionIngredients||[]).length)entries.push('<span><i class="legend-dot ingredient-color">⚗</i> Potion Ingredient</span>');
    if(cfg.enchantment)entries.push(`<span><i class="legend-dot enchantment-color">${cfg.enchantment.mark||'✦'}</i> Enchantment</span>`);
    entries.push('<span><i class="legend-dot mob-color">☠</i> Mob</span>','<span><i class="legend-dot elite-color">⚔</i> Elite</span>','<span><i class="legend-dot boss-color">♛</i> Boss</span>');
    legend.innerHTML=entries.join('');
  }

  const rightPanels=right?[...right.querySelectorAll(':scope > .panel')]:[];
  const status=rightPanels[0]||null;
  const tileInfo=rightPanels[1]||null;
  const eventPanel=rightPanels[2]||null;
  status?.classList.add('status');
  eventPanel?.classList.add('event-panel');

  const bottom=app.querySelector('.bottom');
  const bottomPanels=bottom?[...bottom.querySelectorAll(':scope > .panel')]:[];
  const spellPanel=bottomPanels[0]||null;
  const zonePanel=bottomPanels[1]||null;
  const pressurePanel=bottomPanels[2]||null;
  const craftBtn=$('craftSpellBtn');
  const potionBtn=$('usePotionBtn');
  const resetBtn=$('resetBtn');

  // Preserve the campaign pressure nodes so Shared Status can adopt them.
  if(status&&!status.querySelector('.danger-expanded')){
    const expanded=document.createElement('div');
    expanded.className='danger-expanded';
    const rule=document.createElement('div');
    rule.id='dangerRule';
    rule.className='danger-rule';
    rule.innerHTML='<strong>CALM</strong><span>Low spawn pressure.</span>';
    const thresholds=document.createElement('div');
    thresholds.className='thresholds';
    thresholds.innerHTML='<div><b>0–4</b><span>Calm</span></div><div><b>5–9</b><span>Uneasy</span></div><div><b>10–14</b><span>Dangerous</span></div><div><b>15–19</b><span>Hostile</span></div><div><b>20</b><span>Critical</span></div>';
    expanded.append(rule,thresholds);
    status.appendChild(expanded);
  }

  if(pressurePanel){
    pressurePanel.classList.add('pressure-panel');
    let grid=pressurePanel.querySelector('.pressure-grid');
    if(!grid){
      grid=document.createElement('div');
      grid.className='pressure-grid';
      [...pressurePanel.querySelectorAll(':scope > .metric')].forEach(metric=>grid.appendChild(metric));
      const heading=pressurePanel.querySelector('h2');
      if(heading)heading.after(grid);else pressurePanel.prepend(grid);
    }
    let note=pressurePanel.querySelector('.panel-note');
    if(!note){
      note=document.createElement('p');
      note.className='panel-note';
      note.textContent='Every 3 movement steps adds +1 Danger. Harvesting adds +1. Fixed mob kills add +2; spawned mobs add 0.';
      grid.after(note);
    }
    const expanded=status?.querySelector('.danger-expanded');
    if(expanded){
      expanded.appendChild(grid);
      expanded.appendChild(note);
    }
  }

  if(tileInfo&&viewport){
    tileInfo.classList.remove('tile-info');
    tileInfo.classList.add('tileinfo','tile-tooltip');
    viewport.appendChild(tileInfo);
  }

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
    const resources=$('spellResources');
    if(resources){
      resources.classList.add('inventory-line');
      resources.innerHTML='<strong>INGREDIENTS</strong><span id="spellIngredientText">None</span>';
    }
  }

  function modalShell(id,titleText){
    const existing=$(id);
    if(existing){
      const body=existing.querySelector('.modal-heading')?.nextElementSibling||existing.querySelector('.modal-card')?.lastElementChild;
      return {modal:existing,body,open:()=>existing.classList.add('show'),close:()=>existing.classList.remove('show')};
    }
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
    modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
    return {modal,body,open:()=>modal.classList.add('show'),close:closeModal};
  }

  const spellbook=modalShell('spellbookModal','SPELLBOOK');
  if(spellbook.body)spellbook.body.className='spellbook-modal-body';
  if(spellPanel&&spellbook.body){
    spellbook.body.appendChild(spellPanel);
    spellPanel.classList.add('spellbook-restored');
  }

  const backpack=modalShell('backpackModal','BACKPACK');
  if(backpack.body)backpack.body.innerHTML='<div class="backpack-grid"><div class="backpack-item"><strong>HEALING POTION</strong><span id="backpackPotionText"></span><button id="backpackUsePotion" type="button">USE POTION</button></div><div class="backpack-item"><strong>SPELL INGREDIENTS</strong><span id="backpackSpellIngredients">None</span></div></div>';

  if(zone===2&&zonePanel&&backpack.body){
    const recipe=document.createElement('div');
    recipe.className='backpack-item backpack-resources potion-crafting-slot';
    recipe.innerHTML='<strong>HEALING POTION RECIPE</strong><span>Moonleaf + Clearwater</span><div id="potionCraftMount"></div>';
    backpack.body.querySelector('.backpack-grid')?.appendChild(recipe);
    zonePanel.classList.add('backpack-zone-system');
    recipe.querySelector('#potionCraftMount')?.appendChild(zonePanel);
  }

  const help=modalShell('helpModal','HELP');
  if(help.body)help.body.innerHTML='<div class="help-copy"></div>';

  const cardsHud=document.createElement('div');
  cardsHud.className='cards-hud';
  if(manipPanel)cardsHud.appendChild(manipPanel);

  const actionHud=document.createElement('div');
  actionHud.className='action-hud';
  actionHud.innerHTML='<div class="action-hud-title"><span>ACTION BAR</span><span>4 SPELLS · POTION</span></div><div id="actionbar" class="actionbar"><button type="button" class="action-slot spell-slot empty" data-action-spell="0">EMPTY SPELL</button><button type="button" class="action-slot spell-slot empty" data-action-spell="1">EMPTY SPELL</button><button type="button" class="action-slot spell-slot empty" data-action-spell="2">EMPTY SPELL</button><button type="button" class="action-slot spell-slot empty" data-action-spell="3">EMPTY SPELL</button><div class="action-divider"></div></div>';
  const actionbar=actionHud.querySelector('#actionbar');
  if(potionBtn){
    potionBtn.classList.add('action-slot');
    actionbar?.appendChild(potionBtn);
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
  utility.append(spellbookBtn,backpackBtn,helpBtn);
  if(resetBtn)utility.appendChild(resetBtn);
  spellbookBtn.addEventListener('click',spellbook.open);
  backpackBtn.addEventListener('click',backpack.open);
  helpBtn.addEventListener('click',help.open);

  const systemHud=document.createElement('div');
  systemHud.className='campaign-system-hud';
  if(zone>=3&&zonePanel)systemHud.appendChild(zonePanel);

  if(bottom){
    bottom.replaceChildren(cardsHud,actionHud,utility);
    if(systemHud.childElementCount)bottom.appendChild(systemHud);
  }
  pressurePanel?.remove();
  app.querySelector('.footer')?.remove();

  function dangerTier(){
    return state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';
  }

  function syncShellState(){
    const potionCount=Math.max(0,Number(state.potion)||0);
    if(potionBtn){
      const disabled=potionCount<1||Number(state.hp)>=Number(state.maxHp)||!!state.combat||!!state.gameOver;
      potionBtn.disabled=disabled;
      potionBtn.innerHTML=`<strong>HEALING POTION</strong><small>${potionCount} left · +30 HP</small>`;
      potionBtn.classList.toggle('has-potion',potionCount>0);
      potionBtn.classList.toggle('no-potion',potionCount<1);
      potionBtn.setAttribute('aria-label',`Healing Potion, ${potionCount} left, restores 30 HP`);
    }

    const tier=state.zoneCleared?'calm':dangerTier();
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

  const systemModals=[spellbook.modal,backpack.modal,help.modal];
  window.addEventListener('keydown',event=>{
    if(!systemModals.some(modal=>modal?.classList.contains('show')))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'].includes(event.key)){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if(event.key==='Escape')systemModals.forEach(modal=>modal?.classList.remove('show'));
  },true);

  syncShellState();
  const syncTimer=setInterval(syncShellState,220);

  window.HAJJEN_SHARED_CAMPAIGN_UI={
    version:'1.0',
    zone,
    config:cfg,
    state,
    app,
    left,
    right,
    main,
    viewport,
    world,
    modals:{spellbook,backpack,help},
    sync:syncShellState,
    destroy(){clearInterval(syncTimer);}
  };
})();
