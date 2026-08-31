(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const zoneConfig=config.zones?.[zone];
  if(!zone||!zoneConfig)return;

  const root=zone===2?document.querySelector('.zone2-app,.campaign-app'):document.querySelector('.app');
  if(!root)return;
  root.classList.add('hajjen-shared-ui',`hajjen-zone-${zone}`);

  const text=config.text;
  const layout=config.layout;
  const $=id=>document.getElementById(id);
  const first=(...selectors)=>selectors.map(s=>s&&document.querySelector(s)).find(Boolean)||null;

  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  const objectivePanel=first('.hajjen-shared-ui .objectives','.objectives');
  const manipPanel=first('.cards-hud .manipulation-panel','.manipulation-panel');
  const hand=zone===1?$('manipulationCards'):$('manipCards');
  const spellSource=zone===1?$('spells'):$('spellGrid');
  const potionBtn=zone===1?$('restBtn'):$('usePotionBtn');

  function setText(selector,value){
    const node=document.querySelector(selector);
    if(node&&node.textContent!==value)node.textContent=value;
  }

  function readyManipulationCount(){
    if(!hand)return 0;
    return [...hand.querySelectorAll('button')].filter(button=>!button.disabled&&/^PLAY/i.test(button.textContent||'')).length;
  }

  function buildDeckSidebar(){
    if(!objectivePanel)return;
    let panel=document.querySelector('.deck-sidebar-panel');
    if(!panel){
      panel=document.createElement('section');
      panel.className='panel deck-sidebar-panel';
      objectivePanel.insertAdjacentElement('afterend',panel);
    }

    let heading=panel.querySelector('h2');
    if(!heading){heading=document.createElement('h2');panel.prepend(heading);}
    heading.textContent=text.cardDecks;

    let row=panel.querySelector('.deck-row');
    if(!row){row=document.createElement('div');panel.appendChild(row);}
    row.className='deck-row deck-sidebar two-decks';
    row.replaceChildren();

    zoneConfig.decks.forEach(deck=>{
      const def=config.deckLibrary[deck.type]||{label:String(deck.type).toUpperCase()};
      const pile=document.createElement('div');
      pile.className=`deck-pile ${deck.type}${deck.state==='locked'?' locked':''}`;
      const label=document.createElement('strong');
      label.textContent=def.label;
      const note=document.createElement('span');
      if(deck.type==='manipulation'){
        note.id='manipDeckCount';
        note.textContent=`${readyManipulationCount()} / ${zoneConfig.manipulationDeckSize} READY`;
      }else{
        note.textContent=deck.note||String(deck.state||'').toUpperCase();
      }
      pile.append(label,note);
      if(deck.state==='locked'){
        const lock=document.createElement('span');
        lock.className='deck-lock';
        lock.setAttribute('aria-label','Locked');
        lock.textContent='🔒';
        pile.appendChild(lock);
      }
      row.appendChild(pile);
    });
  }

  function normalizeHandTitle(){
    const heading=manipPanel?.querySelector('h2');
    if(!heading)return;
    let title=heading.querySelector('.hand-title-text');
    let count=heading.querySelector('.hand-slot-count');
    if(!title||!count){
      heading.replaceChildren();
      title=document.createElement('span');
      title.className='hand-title-text';
      count=document.createElement('span');
      count.className='hand-slot-count';
      heading.append(title,count);
    }
    title.textContent=text.hand;
    const cards=hand?[...hand.children].filter(node=>node.classList?.contains('mini-card')||node.classList?.contains('card')).length:0;
    count.textContent=`${cards} / ${layout.handSlots} SLOTS`;
  }

  const forceClasses=['ember','growth','flow','stone','gale','aether'];
  function ensureActionSlots(){
    const actionHud=document.querySelector('.action-hud');
    const actionbar=$('actionbar');
    if(!actionHud||!actionbar)return;

    const titleSpans=actionHud.querySelectorAll('.action-hud-title span');
    if(titleSpans[0])titleSpans[0].textContent=text.actionBar;
    if(titleSpans[1])titleSpans[1].textContent=`${layout.spellSlots} SPELLS · ${text.potionShort}`;

    let slots=[...actionbar.querySelectorAll('[data-action-spell]')];
    while(slots.length<layout.spellSlots){
      const button=document.createElement('button');
      button.type='button';
      button.className='action-slot spell-slot empty';
      button.dataset.actionSpell=String(slots.length);
      button.textContent=text.emptySpell;
      const divider=actionbar.querySelector('.action-divider');
      actionbar.insertBefore(button,divider||potionBtn||null);
      button.addEventListener('click',()=>document.querySelector('.spellbook-open')?.click());
      slots.push(button);
    }
    slots.slice(layout.spellSlots).forEach(button=>button.remove());
    syncActionSlots();
  }

  function syncActionSlots(){
    const actionbar=$('actionbar');
    if(!actionbar)return;
    const source=[...(spellSource?.querySelectorAll('.spell')||[])];
    [...actionbar.querySelectorAll('[data-action-spell]')].forEach((button,index)=>{
      const spell=source[index];
      button.className='action-slot spell-slot';
      if(!spell){
        button.classList.add('empty');
        button.textContent=text.emptySpell;
        return;
      }
      const sourceText=spell.querySelector('span')?.textContent||'';
      const force=forceClasses.find(name=>spell.classList.contains(name)||sourceText.toLowerCase().startsWith(name));
      if(force)button.classList.add(force);
      const strong=spell.querySelector('strong')?.textContent||'SPELL';
      const spans=[...spell.querySelectorAll('span')].map(node=>node.textContent);
      button.innerHTML=`<strong>${strong}</strong><span>${spans[0]||''}</span><small>${spans[1]||''}</small>`;
    });
  }

  function normalizePotion(){
    if(!potionBtn)return;
    potionBtn.classList.add('action-slot','shared-potion-slot');
    const count=Math.max(0,Number(state?.potion)||0);
    if(zone===1){
      let small=$('potionText');
      if(!small){small=document.createElement('small');small.id='potionText';}
      const current=small.textContent||`${count} left · +30 HP`;
      potionBtn.replaceChildren();
      const strong=document.createElement('strong');
      strong.textContent=text.potion;
      small.textContent=current;
      potionBtn.append(strong,small);
    }
    potionBtn.setAttribute('aria-label',`${text.potion}, ${count} left, restores 30 HP`);
  }

  function normalizeUtility(){
    setText('.spellbook-open',text.spellbook);
    setText('.backpack-open',text.backpack);
    setText('.help-open',text.help);
    const copy=$('copyRunReportBtn');if(copy)copy.textContent=text.copyRunReport;
    const reset=$('resetBtn');if(reset)reset.textContent=text.resetCampaign;
  }

  function normalizeHeadings(){
    const status=document.querySelector('.status h2');if(status)status.textContent=text.sharkan;
    const event=document.querySelector('.event-panel h2');if(event)event.textContent=text.eventLog;
  }

  function sync(){
    normalizeHandTitle();
    const count=$('manipDeckCount');
    if(count)count.textContent=`${readyManipulationCount()} / ${zoneConfig.manipulationDeckSize} READY`;
    syncActionSlots();
    normalizeUtility();
    normalizeHeadings();
  }

  buildDeckSidebar();
  normalizeHandTitle();
  ensureActionSlots();
  normalizePotion();
  normalizeUtility();
  normalizeHeadings();

  if(hand)new MutationObserver(()=>queueMicrotask(sync)).observe(hand,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  if(spellSource)new MutationObserver(()=>queueMicrotask(syncActionSlots)).observe(spellSource,{childList:true,subtree:true,characterData:true});

  window.HAJJEN_SHARED_UI={
    zone,
    config,
    sync,
    labels:text
  };
})();
