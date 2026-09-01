(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const hand=document.getElementById(zone===1?'manipulationCards':'manipCards');
  const panel=hand?.closest('.manipulation-panel');
  if(!hand||!panel)return;

  const SLOT_COUNTS={manipulation:4,enchantment:2,tactical:2};
  const CATEGORY_LABELS={manipulation:'MANIPULATION',enchantment:'ENCHANTMENT',tactical:'TACTICAL'};
  let observer=null;
  let queued=false;

  function categoryOf(node){
    const explicit=(node.dataset?.handCategory||'').toLowerCase();
    if(explicit==='enchantment'||explicit==='tactical'||explicit==='manipulation')return explicit;
    if(node.classList.contains('enchantment')||node.classList.contains('enchantment-card'))return'enchantment';
    if(node.classList.contains('tactical')||node.classList.contains('tactical-card'))return'tactical';
    return'manipulation';
  }

  function realCards(){
    return [...hand.children].filter(node=>
      !node.classList.contains('hand-empty-slot')&&
      !node.classList.contains('shared-hand-placeholder')&&
      (node.classList.contains('mini-card')||node.classList.contains('card')||node.classList.contains('shared-hand-card'))
    );
  }

  function makePlaceholder(category,index){
    const slot=document.createElement('div');
    slot.className=`shared-hand-placeholder ${category}${category==='manipulation'?' empty':' locked'}`;
    slot.dataset.handPlaceholder=category;
    slot.dataset.handSlot=String(index);
    slot.setAttribute('aria-label',category==='manipulation'?'Empty Manipulation slot':`${CATEGORY_LABELS[category]} slot locked`);

    const label=document.createElement('strong');
    label.textContent=CATEGORY_LABELS[category];
    const state=document.createElement('span');
    state.textContent=category==='manipulation'?'EMPTY':'LOCKED';
    slot.append(label,state);
    return slot;
  }

  function syncHeading(cards){
    let heading=panel.querySelector('h2');
    if(!heading){heading=document.createElement('h2');panel.prepend(heading);}
    let title=heading.querySelector('.hand-title-text');
    let meta=heading.querySelector('.hand-slot-count');
    if(!title||!meta){
      heading.replaceChildren();
      title=document.createElement('span');
      title.className='hand-title-text';
      meta=document.createElement('span');
      meta.className='hand-slot-count';
      heading.append(title,meta);
    }
    title.textContent='HAND';
    const active=cards.length;
    meta.textContent=`${active} ACTIVE · 4 MANIPULATION · 2 ENCHANTMENT · 2 TACTICAL`;
  }

  function ensurePlaceholders(category,needed){
    let existing=[...hand.querySelectorAll(`:scope > .shared-hand-placeholder[data-hand-placeholder="${category}"]`)];
    while(existing.length>needed){existing.pop().remove();}
    while(existing.length<needed){
      const slot=makePlaceholder(category,existing.length);
      hand.appendChild(slot);
      existing.push(slot);
    }
    existing.forEach((slot,index)=>slot.dataset.handSlot=String(index));
  }

  function sync(){
    queued=false;
    observer?.disconnect();

    panel.classList.add('shared-hand-panel');
    panel.dataset.sharedComponent='hand-1.0';
    hand.classList.add('shared-hand-grid');

    const cards=realCards();
    const counts={manipulation:0,enchantment:0,tactical:0};
    cards.forEach(card=>{
      const category=categoryOf(card);
      counts[category]++;
      card.classList.add('shared-hand-card');
      card.dataset.handCategory=category;
      card.dataset.handLabel=CATEGORY_LABELS[category];
    });

    [...hand.querySelectorAll(':scope > .hand-empty-slot')].forEach(slot=>slot.classList.add('legacy-hand-empty'));

    ensurePlaceholders('manipulation',Math.max(0,SLOT_COUNTS.manipulation-counts.manipulation));
    ensurePlaceholders('enchantment',Math.max(0,SLOT_COUNTS.enchantment-counts.enchantment));
    ensurePlaceholders('tactical',Math.max(0,SLOT_COUNTS.tactical-counts.tactical));
    syncHeading(cards);

    observer?.observe(hand,{childList:true,subtree:false});
  }

  observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    queueMicrotask(sync);
  });

  sync();

  window.HAJJEN_SHARED_HAND={
    version:'1.0',
    zone,
    panel,
    hand,
    slots:{...SLOT_COUNTS},
    sync
  };
})();
