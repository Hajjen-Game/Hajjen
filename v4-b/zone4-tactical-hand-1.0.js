/* HAJJEN Zone 4 — two replaceable Tactical card slots in Hand. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==4||!state||!Array.isArray(cfg.tacticalDeck)||cfg.tacticalDeck.length<2)return;

  const hand=document.getElementById('manipCards');
  if(!hand)return;

  let serial=0;
  const slug=value=>String(value||'card').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'card';
  const makeInstance=(def,index)=>({...def,_instanceKey:`tactical-slot-${index}-${slug(def?.id||def?.name)}-${++serial}`});
  const definitions=cfg.tacticalDeck.slice(0,2).map((def,index)=>makeInstance(def,index));
  const equipped=new Set();
  let queued=false;
  let ensuring=false;

  const keyOf=def=>String(def?._instanceKey||def?.id||def?.name||'').trim().toLowerCase();
  function usedKeys(){return window.HAJJEN_ZONE4_TACTICAL_COMBAT?.usedKeys||new Set();}
  function consumed(def){return usedKeys().has(keyOf(def));}

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
      const wanted=new Set(definitions.map(keyOf));
      [...hand.querySelectorAll(':scope > .hajjen-zone4-tactical-card')].forEach(card=>{
        if(!wanted.has(String(card.dataset.tacticalId||'').toLowerCase()))card.remove();
      });
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

  function getSlots(){
    const used=usedKeys();
    return definitions.map((def,index)=>({
      index,key:keyOf(def),id:def.id||null,name:def.name||'Tactical',text:def.text||'',
      used:used.has(keyOf(def)),equipped:equipped.has(keyOf(def))&&!used.has(keyOf(def))
    }));
  }

  function replaceSlot(index,newDefinition){
    index=Number(index);
    if(!Number.isInteger(index)||index<0||index>=definitions.length||!newDefinition)return null;
    const old=definitions[index];
    const oldKey=keyOf(old);
    equipped.delete(oldKey);
    state.tacticalEquippedKeys=[...equipped];

    const combat=window.HAJJEN_ZONE4_TACTICAL_COMBAT;
    if(Array.isArray(combat?.slots))combat.slots.forEach((key,slotIndex)=>{if(key===oldKey)combat.slots[slotIndex]=null;});

    hand.querySelector(`:scope > .hajjen-zone4-tactical-card[data-tactical-id="${CSS.escape(oldKey)}"]`)?.remove();
    const next=makeInstance(newDefinition,index);
    definitions[index]=next;
    ensureCards();
    combat?.sync?.();
    document.dispatchEvent(new CustomEvent('hajjen:tactical-replaced',{detail:{zone:4,index,oldKey,newKey:keyOf(next),oldName:old?.name||'',newName:next?.name||''}}));
    return {index,old:{...old},current:{...next}};
  }

  const observer=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))schedule();});
  observer.observe(hand,{childList:true,subtree:false});

  ensureCards();queueMicrotask(ensureCards);
  window.HAJJEN_ZONE4_TACTICAL_HAND={
    version:'1.1-replaceable-instances',definitions,equipped,hand,observer,
    keyOf,getSlots,replaceSlot,sync:ensureCards
  };
})();
