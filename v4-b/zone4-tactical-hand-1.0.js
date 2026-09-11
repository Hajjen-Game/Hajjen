/* HAJJEN Zone 4 — two Tactical cards in Hand. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==4||!state||!Array.isArray(cfg.tacticalDeck)||cfg.tacticalDeck.length<2)return;

  const hand=document.getElementById('manipCards');
  if(!hand)return;
  const definitions=cfg.tacticalDeck.slice(0,2);
  const equipped=new Set();
  let queued=false;
  let ensuring=false;

  const keyOf=def=>String(def?.id||def?.name||'').trim().toLowerCase();
  function usedKeys(){return window.HAJJEN_ZONE4_TACTICAL_COMBAT?.usedKeys||new Set();}
  function consumed(def){const used=usedKeys();return used.has(keyOf(def))||used.has(String(def?.name||'').trim().toLowerCase());}

  function applyState(card,def){
    const key=keyOf(def);
    const button=card.querySelector(':scope > .shared-tactical-equip');
    const used=consumed(def);
    const isEquipped=equipped.has(key)&&!used;
    card.classList.toggle('is-used',used);
    card.classList.toggle('is-equipt',isEquipped);
    if(!button)return;
    if(used){button.textContent='USED';button.disabled=true;button.setAttribute('aria-pressed','false');}
    else if(isEquipped){button.textContent='EQUIPT';button.disabled=false;button.setAttribute('aria-pressed','true');}
    else{button.textContent='EQUIP';button.disabled=false;button.setAttribute('aria-pressed','false');}
  }

  function createCard(def){
    const key=keyOf(def);
    const card=document.createElement('div');
    card.className='shared-hand-card shared-tactical-card tactical hajjen-zone4-tactical-card';
    card.dataset.handCategory='tactical';
    card.dataset.handLabel=def.name||'Tactical';
    card.dataset.tacticalId=key;

    const title=document.createElement('strong');title.textContent=def.name||'Tactical';
    const copy=document.createElement('span');copy.className='shared-tactical-copy';copy.textContent=def.text||'Equip this Tactical card for combat.';
    const button=document.createElement('button');button.type='button';button.className='shared-tactical-equip';
    button.addEventListener('click',()=>{
      if(consumed(def)||equipped.has(key))return;
      equipped.add(key);
      state.tacticalEquippedKeys=[...equipped];
      applyState(card,def);
      queueMicrotask(()=>window.HAJJEN_ZONE4_TACTICAL_COMBAT?.sync?.());
      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
    });
    card.append(title,copy,button);applyState(card,def);return card;
  }

  function ensureCards(){
    queued=false;if(ensuring||!hand.isConnected)return;ensuring=true;
    try{
      definitions.forEach(def=>{
        const key=keyOf(def);
        let card=hand.querySelector(`:scope > .hajjen-zone4-tactical-card[data-tactical-id="${CSS.escape(key)}"]`);
        if(!card){
          card=createCard(def);
          const placeholder=hand.querySelector(':scope > .shared-hand-placeholder[data-hand-placeholder="tactical"]');
          if(placeholder)placeholder.before(card);else hand.appendChild(card);
        }else applyState(card,def);
      });
      window.HAJJEN_SHARED_HAND?.sync?.();
      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
      window.HAJJEN_ZONE4_TACTICAL_COMBAT?.sync?.();
    }finally{ensuring=false;}
  }
  function schedule(){if(queued)return;queued=true;queueMicrotask(ensureCards);}
  const observer=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))schedule();});
  observer.observe(hand,{childList:true,subtree:false});

  ensureCards();queueMicrotask(ensureCards);
  window.HAJJEN_ZONE4_TACTICAL_HAND={version:'1.0-two-cards',definitions,equipped,hand,observer,sync:ensureCards};
})();
