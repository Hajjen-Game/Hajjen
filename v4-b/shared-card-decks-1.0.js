(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const zoneConfig=config.zones?.[zone];
  if(!zoneConfig)return;

  const objectivePanel=document.querySelector('.objectives');
  const hand=document.getElementById(zone===1?'manipulationCards':'manipCards');
  if(!objectivePanel)return;

  let panel=document.querySelector('.deck-sidebar-panel');
  if(!panel){
    panel=document.createElement('section');
    panel.className='panel deck-sidebar-panel';
    objectivePanel.insertAdjacentElement('afterend',panel);
  }

  panel.classList.add('shared-card-decks-panel');
  panel.dataset.sharedComponent='card-decks-1.1';
  window.HAJJEN_PANEL_FRAME?.mount(panel);

  let observer=null;
  let queued=false;

  function readyManipulationCount(){
    if(!hand)return 0;
    return [...hand.querySelectorAll('button')].filter(button=>!button.disabled&&/^PLAY/i.test(button.textContent||'')).length;
  }

  function deckNote(deck,def){
    if(deck.type==='manipulation'){
      return `${readyManipulationCount()} / ${zoneConfig.manipulationDeckSize||0} READY`;
    }
    if(deck.type==='enchantment'&&deck.state==='active'){
      const api=window.HAJJEN_ZONE3_ENCHANTMENTS;
      const drawn=api?.hand?.length||0,total=api?.deck?.length||0;
      if(drawn&&total)return `${drawn} / ${total} DRAWN`;
    }
    if(deck.note)return deck.note;
    if(deck.state==='locked'&&def?.introducedIn){
      return `LOCKED · INTRODUCED IN ZONE ${def.introducedIn}`;
    }
    return String(deck.state||'').toUpperCase();
  }

  function buildPile(deck){
    const def=config.deckLibrary?.[deck.type]||{label:String(deck.type).toUpperCase()};
    const pile=document.createElement('div');
    pile.className=`deck-pile ${deck.type}${deck.state==='locked'?' locked':''}`;
    pile.dataset.deckType=deck.type;
    pile.dataset.deckState=deck.state||'active';

    const label=document.createElement('strong');
    label.textContent=def.label;

    const note=document.createElement('span');
    note.dataset.deckNote=deck.type;
    if(deck.type==='manipulation')note.id='manipDeckCount';
    note.textContent=deckNote(deck,def);

    pile.append(label,note);

    if(deck.state==='locked'){
      const lock=document.createElement('span');
      lock.className='deck-lock';
      lock.setAttribute('aria-label',`${def.label} locked`);
      lock.textContent='🔒';
      pile.appendChild(lock);
    }

    return pile;
  }

  function render(){
    window.HAJJEN_PANEL_FRAME?.mount(panel);

    let heading=panel.querySelector(':scope > h2');
    if(!heading){
      heading=document.createElement('h2');
      const frame=panel.querySelector(':scope > .hajjen-panel-frame');
      frame?.insertAdjacentElement('afterend',heading);
      if(!frame)panel.prepend(heading);
    }
    heading.textContent=config.text?.cardDecks||'CARD DECKS';

    let row=panel.querySelector(':scope > .deck-row');
    if(!row){
      row=document.createElement('div');
      panel.appendChild(row);
    }
    row.className='deck-row deck-sidebar three-decks';
    row.replaceChildren(...(zoneConfig.decks||[]).map(buildPile));
  }

  function sync(){
    queued=false;
    (zoneConfig.decks||[]).forEach(deck=>{
      const note=panel.querySelector(`[data-deck-note="${deck.type}"]`);
      if(!note)return;
      const def=config.deckLibrary?.[deck.type];
      note.textContent=deckNote(deck,def);
    });
  }

  render();

  if(hand){
    observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(sync);
    });
    observer.observe(hand,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  }

  window.HAJJEN_SHARED_CARD_DECKS={version:'1.1',zone,panel,render,sync};
})();
