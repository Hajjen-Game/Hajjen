(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const app=document.querySelector('.zone2-app');
  if(!app||!cfg||cfg.zone!==2||!state)return;
  const $=id=>document.getElementById(id);

  // Zone 1 is the visual master: decks belong in the left rail, not above the hand.
  const left=app.querySelector('.leftcol');
  const objectives=left?.querySelector('.objectives');
  const cardsHud=app.querySelector('.cards-hud');
  const deckRow=cardsHud?.querySelector('.deck-row');
  if(left&&objectives&&deckRow){
    deckRow.querySelector('.deck-pile.tactical')?.remove();
    const enchantment=deckRow.querySelector('.deck-pile.enhancement,.deck-pile.enchantment');
    if(enchantment){
      enchantment.classList.remove('enhancement');
      enchantment.classList.add('enchantment');
      const strong=enchantment.querySelector('strong');
      const span=enchantment.querySelector('span');
      if(strong)strong.textContent='ENCHANTMENT';
      if(span)span.textContent='LOCKED · INTRODUCED IN ZONE 3';
    }
    deckRow.classList.add('deck-sidebar','two-decks');
    let panel=left.querySelector('.deck-sidebar-panel');
    if(!panel){
      panel=document.createElement('section');
      panel.className='panel deck-sidebar-panel';
      const heading=document.createElement('h2');
      heading.textContent='CARD DECKS';
      panel.appendChild(heading);
      objectives.insertAdjacentElement('afterend',panel);
    }
    panel.appendChild(deckRow);
    deckRow.querySelectorAll('.deck-pile.locked').forEach(pile=>{
      if(pile.querySelector('.deck-lock'))return;
      const lock=document.createElement('span');
      lock.className='deck-lock';
      lock.setAttribute('aria-label','Locked');
      lock.textContent='🔒';
      pile.appendChild(lock);
    });
  }

  // Match Zone 1's seven-slot manipulation hand while keeping Zone 2's fourth card.
  const hand=$('manipCards');
  const handPanel=cardsHud?.querySelector('.manipulation-panel');
  let slotCount=handPanel?.querySelector('.hand-slot-count')||null;
  const handTitle=handPanel?.querySelector('h2');
  if(handTitle){
    handTitle.childNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.textContent='';});
    if(!handTitle.querySelector('.hand-title-text')){
      const text=document.createElement('span');
      text.className='hand-title-text';
      text.textContent='HAND — MANIPULATION';
      handTitle.prepend(text);
    }
    if(!slotCount){
      slotCount=document.createElement('span');
      slotCount.className='hand-slot-count';
      handTitle.appendChild(slotCount);
    }
  }
  if(hand){
    let observer;
    let queued=false;
    const rebuild=()=>{
      observer?.disconnect();
      hand.querySelectorAll(':scope > .hand-empty-slot').forEach(x=>x.remove());
      const real=[...hand.querySelectorAll(':scope > .mini-card')];
      real.forEach(card=>{
        if(!card.querySelector('.card-cat')){
          const cat=document.createElement('div');
          cat.className='card-cat';
          cat.textContent='MANIPULATION';
          card.prepend(cat);
        }
      });
      for(let i=real.length;i<7;i++){
        const empty=document.createElement('div');
        empty.className='hand-empty-slot';
        empty.setAttribute('aria-label',`Empty hand slot ${i+1}`);
        hand.appendChild(empty);
      }
      if(slotCount)slotCount.textContent=`${real.length} / 7 SLOTS`;
      observer?.observe(hand,{childList:true});
    };
    observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;rebuild();});
    });
    observer.observe(hand,{childList:true});
    rebuild();
  }

  // Match Zone 1 Action Bar: Ember Bolt + three crafted slots + Healing Potion.
  const actionHud=app.querySelector('.action-hud');
  const actionbar=actionHud?.querySelector('#actionbar');
  if(actionbar){
    if(!actionbar.querySelector('[data-action-spell="3"]')){
      const fourth=document.createElement('button');
      fourth.type='button';
      fourth.className='action-slot spell-slot empty';
      fourth.dataset.actionSpell='3';
      fourth.textContent='EMPTY SPELL';
      const divider=actionbar.querySelector('.action-divider');
      actionbar.insertBefore(fourth,divider||$('usePotionBtn')||null);
      fourth.addEventListener('click',()=>document.querySelector('.spellbook-open')?.click());
    }
    actionbar.querySelector('.action-empty')?.remove();
  }
  const actionTitle=actionHud?.querySelector('.action-hud-title span:last-child');
  if(actionTitle)actionTitle.textContent='4 SPELLS · POTION';

  const forceClasses=['ember','growth','flow','stone','gale','aether'];
  function syncFourSpellSlots(){
    const spellEls=[...($('spellGrid')?.querySelectorAll('.spell')||[])];
    [...document.querySelectorAll('#actionbar [data-action-spell]')].forEach((btn,i)=>{
      btn.className='action-slot spell-slot';
      const src=spellEls[i];
      if(!src){btn.classList.add('empty');btn.textContent='EMPTY SPELL';return;}
      const text=src.querySelector('span')?.textContent||'';
      const force=forceClasses.find(f=>src.classList.contains(f)||text.toLowerCase().startsWith(f));
      if(force)btn.classList.add(force);
      const strong=src.querySelector('strong')?.textContent||'SPELL';
      const spans=[...src.querySelectorAll('span')].map(x=>x.textContent);
      btn.innerHTML=`<strong>${strong}</strong><span>${spans[0]||''}</span><small>${spans[1]||''}</small>`;
    });
  }
  if($('spellGrid'))new MutationObserver(syncFourSpellSlots).observe($('spellGrid'),{childList:true,subtree:true,characterData:true});
  syncFourSpellSlots();

  // Keep the compact Danger panel structurally identical to Zone 1.
  const pressure=app.querySelector('.status .pressure-grid');
  if(pressure){
    pressure.innerHTML=`<div><span>Visible</span><strong id="visibleText"></strong></div>
      <div><span>Zone level cap</span><strong>${cfg.levelCap}</strong></div>
      <div><span>Next ambient Danger</span><strong id="clockText"></strong></div>
      <div><span>Enemy power</span><strong id="powerText"></strong></div>`;
  }

  // Shared board categories use the exact same glyph family as Zone 1.
  const world=$('world');
  function normalizeBoardMarks(){
    world?.querySelectorAll('.tile.special').forEach(tile=>{
      if(tile.classList.contains('ingredient'))tile.dataset.mark='✿';
      else if(tile.classList.contains('mob'))tile.dataset.mark='☠';
      else if(tile.classList.contains('elite'))tile.dataset.mark='⚔';
      else if(tile.classList.contains('boss'))tile.dataset.mark='♛';
      else if(tile.classList.contains('potion-ingredient'))tile.dataset.mark='⚗';
    });
  }
  if(world)new MutationObserver(normalizeBoardMarks).observe(world,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-mark']});
  normalizeBoardMarks();

  const legend=app.querySelector('.legend');
  if(legend)legend.innerHTML='<span><i class="legend-dot ingredient-color">✿</i> Ingredient</span><span><i class="legend-dot ingredient-color">⚗</i> Potion Ingredient</span><span><i class="legend-dot mob-color">☠</i> Mob</span><span><i class="legend-dot elite-color">⚔</i> Elite</span><span><i class="legend-dot boss-color">♛</i> Boss</span>';

  // The campaign engine owns the live values. Refill the two compact cells after the DOM parity pass.
  const tick=()=>{
    const clock=$('clockText');if(clock)clock.textContent=state.zoneCleared?'SAFE':`${state.nextAmbient} step${state.nextAmbient===1?'':'s'}`;
    const power=$('powerText');if(power){const scale=state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;power.textContent=`+${state.zoneCleared?0:scale}%`;}
    syncFourSpellSlots();
  };
  tick();
  setInterval(tick,220);
})();
