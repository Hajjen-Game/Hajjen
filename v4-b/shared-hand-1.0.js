(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const zoneConfig=config.zones?.[zone]||{};
  const campaignConfig=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG||{};
  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  const hand=document.getElementById(zone===1?'manipulationCards':'manipCards');
  const panel=hand?.closest('.manipulation-panel');
  if(!hand||!panel)return;

  const SLOT_COUNTS={manipulation:4,enchantment:2,tactical:2};
  const CATEGORY_LABELS={manipulation:'MANIPULATION',enchantment:'ENCHANTMENT',tactical:'TACTICAL'};
  let observer=null;
  let zoneSystemObserver=null;
  let queued=false;

  function categoryOf(node){
    const explicit=(node.dataset?.handCategory||'').toLowerCase();
    if(explicit==='enchantment'||explicit==='tactical'||explicit==='manipulation')return explicit;
    if(node.classList.contains('enchantment')||node.classList.contains('enchantment-card'))return'enchantment';
    if(node.classList.contains('tactical')||node.classList.contains('tactical-card'))return'tactical';
    return'manipulation';
  }

  function deckState(category){
    if(category==='manipulation')return'active';
    return (zoneConfig.decks||[]).find(deck=>deck.type===category)?.state||'locked';
  }

  function enchantmentCard(){return hand.querySelector(':scope > .shared-enchantment-card');}

  function ensureEnchantmentCard(){
    const supported=zone>=3&&deckState('enchantment')==='active'&&campaignConfig.enchantment&&state;
    const owned=supported&&(!!state.hasEnchantment||!!state.enchantmentUsed);
    let card=enchantmentCard();

    if(!owned){
      card?.remove();
      return null;
    }

    if(!card){
      card=document.createElement('div');
      card.className='shared-hand-card shared-enchantment-card enchantment';
      card.dataset.handCategory='enchantment';
      card.dataset.handLabel='ENCHANTMENT';
      card.innerHTML='<strong></strong><span class="shared-enchantment-copy"></span><select class="shared-enchantment-select" aria-label="Choose spell to enchant"></select><button type="button" class="shared-enchantment-apply">APPLY ENCHANTMENT</button>';
      hand.appendChild(card);

      const select=card.querySelector('.shared-enchantment-select');
      const apply=card.querySelector('.shared-enchantment-apply');
      select?.addEventListener('change',()=>{
        const source=document.getElementById('enchantTarget');
        if(source)source.value=select.value;
      });
      apply?.addEventListener('click',()=>{
        const source=document.getElementById('enchantTarget');
        const sourceButton=document.getElementById('applyEnchantBtn');
        if(!source||!sourceButton||sourceButton.disabled)return;
        source.value=select?.value||source.value;
        sourceButton.click();
        queueMicrotask(sync);
      });
    }

    const name=campaignConfig.enchantment?.name||'ENCHANTMENT';
    const damage=Number(campaignConfig.enchantment?.damage)||0;
    const title=card.querySelector('strong');
    const copy=card.querySelector('.shared-enchantment-copy');
    const select=card.querySelector('.shared-enchantment-select');
    const apply=card.querySelector('.shared-enchantment-apply');
    const source=document.getElementById('enchantTarget');
    const sourceButton=document.getElementById('applyEnchantBtn');

    if(title)title.textContent=name;
    if(copy)copy.textContent=state.enchantmentUsed?`Applied · +${damage} damage`:`+${damage} damage · Choose spell`;

    if(select){
      const wanted=select.value||source?.value||'';
      const options=source?[...source.options].map(option=>({value:option.value,label:option.textContent||option.value})):[];
      select.replaceChildren(...options.map(option=>{
        const node=document.createElement('option');
        node.value=option.value;
        node.textContent=option.label;
        return node;
      }));
      if(options.some(option=>option.value===wanted))select.value=wanted;
      else if(source?.value)select.value=source.value;
      select.disabled=!!state.enchantmentUsed||!options.length||!state.hasEnchantment;
    }

    if(apply){
      const disabled=!!state.enchantmentUsed||!state.hasEnchantment||!sourceButton||sourceButton.disabled||!select?.value;
      apply.disabled=disabled;
      apply.textContent=state.enchantmentUsed?'APPLIED':'APPLY ENCHANTMENT';
    }

    return card;
  }

  function realCards(){
    return [...hand.children].filter(node=>
      !node.classList.contains('hand-empty-slot')&&
      !node.classList.contains('shared-hand-placeholder')&&
      (node.classList.contains('mini-card')||node.classList.contains('card')||node.classList.contains('shared-hand-card'))
    );
  }

  function makePlaceholder(category,index){
    const active=deckState(category)==='active';
    const slot=document.createElement('div');
    slot.className=`shared-hand-placeholder ${category}${active?' empty':' locked'}`;
    slot.dataset.handPlaceholder=category;
    slot.dataset.handSlot=String(index);
    slot.setAttribute('aria-label',active?`Empty ${CATEGORY_LABELS[category]} slot`:`${CATEGORY_LABELS[category]} slot locked`);

    const label=document.createElement('strong');
    label.textContent=CATEGORY_LABELS[category];
    const stateLabel=document.createElement('span');
    stateLabel.textContent=active?'EMPTY':'LOCKED';
    slot.append(label,stateLabel);
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
    existing.forEach((slot,index)=>{
      const active=deckState(category)==='active';
      slot.dataset.handSlot=String(index);
      slot.classList.toggle('empty',active);
      slot.classList.toggle('locked',!active);
      slot.setAttribute('aria-label',active?`Empty ${CATEGORY_LABELS[category]} slot`:`${CATEGORY_LABELS[category]} slot locked`);
      const stateLabel=slot.querySelector('span');
      if(stateLabel)stateLabel.textContent=active?'EMPTY':'LOCKED';
    });
  }

  function sync(){
    queued=false;
    observer?.disconnect();

    panel.classList.add('shared-hand-panel');
    panel.dataset.sharedComponent='hand-1.0';
    hand.classList.add('shared-hand-grid');

    ensureEnchantmentCard();
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

  function queueSync(){
    if(queued)return;
    queued=true;
    queueMicrotask(sync);
  }

  observer=new MutationObserver(queueSync);
  const zoneSystem=document.getElementById('zoneSystem');
  if(zoneSystem){
    zoneSystemObserver=new MutationObserver(queueSync);
    zoneSystemObserver.observe(zoneSystem,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','value']});
  }

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
