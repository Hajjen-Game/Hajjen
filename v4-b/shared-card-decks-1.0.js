(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const zoneConfig=config.zones?.[zone];
  if(!zoneConfig)return;

  const isDev=new URLSearchParams(location.search).get('dev')==='1';
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
  if(isDev)panel.classList.add('hajjen-vector-card-decks');
  panel.dataset.sharedComponent=isDev?'card-decks-1.3-vector-dev':'card-decks-1.2';
  window.HAJJEN_PANEL_FRAME?.mount(panel);

  let observer=null;
  let queued=false;
  const NS='http://www.w3.org/2000/svg';

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

  function svgEl(name,attrs={}){
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  }

  function deckIcon(type){
    const svg=svgEl('svg',{
      class:'deck-vector-icon',
      viewBox:'0 0 48 48',
      'aria-hidden':'true',
      focusable:'false'
    });
    const path=(d,extra={})=>svg.appendChild(svgEl('path',{d,...extra}));
    const circle=(cx,cy,r,extra={})=>svg.appendChild(svgEl('circle',{cx,cy,r,...extra}));

    if(type==='manipulation'){
      path('M15 25V10.5c0-1.8 2.8-1.8 2.8 0V21');
      path('M17.8 21V7.5c0-1.9 2.9-1.9 2.9 0V21');
      path('M20.7 21V6.5c0-1.9 2.9-1.9 2.9 0V21');
      path('M23.6 21V9c0-1.9 2.9-1.9 2.9 0v14');
      path('M26.5 23l4.4-5c1.4-1.5 3.5.3 2.5 2L28 31c-1.6 3.2-4.2 5-8.1 5h-2.1c-5.5 0-8.5-3.6-8.5-8.6v-6.2c0-2 2.8-2.4 3.5-.5l2.2 5.1');
      path('M20.2 29l3.4 3.4 3.4-3.4-3.4-3.4z',{class:'deck-icon-fill'});
    }else if(type==='enchantment'){
      path('M24 7.5l3.2 10.2L37.5 21l-10.3 3.2L24 34.5l-3.2-10.3L10.5 21l10.3-3.3z');
      path('M24 12.2v23.6M12.2 21h23.6');
      circle('24','21','3.1',{class:'deck-icon-fill'});
    }else{
      path('M24 7.5c5 3.4 9.2 4.1 13 4.5v10.4c0 8-4.9 13.6-13 18.1-8.1-4.5-13-10.1-13-18.1V12c3.8-.4 8-1.1 13-4.5z');
      path('M24 13v20');
      path('M17 18.5c2.4 1.2 4.8 1.9 7 2.2 2.2-.3 4.6-1 7-2.2');
    }
    return svg;
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

    if(isDev){
      const iconSlot=document.createElement('span');
      iconSlot.className='deck-icon-slot';
      iconSlot.appendChild(deckIcon(deck.type));

      const copy=document.createElement('span');
      copy.className='deck-copy';
      copy.append(label,note);

      pile.append(iconSlot,copy);
      return pile;
    }

    pile.append(label,note);

    if(deck.state==='locked'){
      const lock=document.createElement('span');
      lock.className='deck-lock';
      lock.setAttribute('role','img');
      lock.setAttribute('aria-label',`${def.label} locked`);
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

  window.HAJJEN_SHARED_CARD_DECKS={version:isDev?'1.3-vector-dev':'1.2',zone,panel,render,sync};
})();
