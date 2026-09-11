/* HAJJEN Zone 4 — two-card Enchantment hand.
   V1.1 keeps applied-card state and spell data reconciled across reloads,
   and refreshes eligible spell choices whenever the loaded spell set changes. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==4||!state||!Array.isArray(cfg.enchantmentDeck))return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const HAND_KEY='hajjen-v4b-zone4-enchantment-hand-v1';
  const storage=window.HAJJEN_ZONE4_DEV_MODE?sessionStorage:localStorage;
  const deck=cfg.enchantmentDeck.map(card=>({...card}));
  const byId=new Map(deck.map(card=>[card.id,card]));
  const drawCount=Math.max(1,Math.min(2,Number(cfg.enchantment?.draw)||2,deck.length));
  let loadoutSyncQueued=false;

  function loadHand(){
    try{
      const parsed=JSON.parse(storage.getItem(HAND_KEY)||'null');
      if(Array.isArray(parsed?.cards)&&parsed.cards.length===drawCount&&parsed.cards.every(card=>byId.has(card.id))){
        return parsed.cards.map(card=>({id:card.id,appliedTo:card.appliedTo||null}));
      }
    }catch{}
    const pool=[...deck];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const cards=pool.slice(0,drawCount).map(card=>({id:card.id,appliedTo:null}));
    storage.setItem(HAND_KEY,JSON.stringify({version:1,cards}));
    return cards;
  }

  const hand=loadHand();
  const enchantmentId=item=>typeof item==='string'?item:item?.id;
  const definition=card=>byId.get(card?.id)||null;

  function storedLibrary(){
    const live=window.HAJJEN_SHARED_SPELLBOOK_V2?.library;
    if(Array.isArray(live))return live;
    try{
      const parsed=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
      return Array.isArray(parsed?.spells)?parsed.spells:[];
    }catch{return[];}
  }

  function spellForId(id){
    return (state.spells||[]).find(spell=>spell?.id===id)
      ||storedLibrary().find(spell=>spell?.id===id)
      ||null;
  }
  const spellName=id=>spellForId(id)?.name||null;

  function persistHand(){
    storage.setItem(HAND_KEY,JSON.stringify({version:1,cards:hand.map(card=>({id:card.id,appliedTo:card.appliedTo||null}))}));
  }

  function persistSpells(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
      saved.spells=state.spells;
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
    try{
      const liveLibrary=window.HAJJEN_SHARED_SPELLBOOK_V2?.library;
      const saved=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
      const library=Array.isArray(liveLibrary)?liveLibrary:(Array.isArray(saved?.spells)?saved.spells:[]);
      (state.spells||[]).filter(spell=>!spell.fallback).forEach(spell=>{
        const index=library.findIndex(item=>item?.id===spell.id);
        if(index>=0)library[index]={...library[index],...spell};else library.push({...spell});
      });
      localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));
    }catch{}
  }

  function effectNames(spell){
    const ids=Array.isArray(spell?.enchantments)?spell.enchantments.map(enchantmentId).filter(Boolean):[];
    return ids.map(id=>byId.get(id)?.name).filter(Boolean);
  }

  function syncSpellLabel(spell){
    if(!spell)return;
    const names=effectNames(spell);
    if(names.length)spell.enchantmentName=names.join(' + ');
    else delete spell.enchantmentName;
  }

  function syncLabels(){
    (state.spells||[]).forEach(syncSpellLabel);
    storedLibrary().forEach(syncSpellLabel);
  }

  function hasZone4Effect(spell,cardId){
    return Array.isArray(spell?.enchantments)&&spell.enchantments.some(item=>{
      const id=enchantmentId(item);
      return id===cardId&&(typeof item==='string'||item?.sourceZone===4);
    });
  }

  function ensureZone4Effect(spell,cardId){
    if(!spell||!cardId)return false;
    if(!Array.isArray(spell.enchantments))spell.enchantments=[];
    if(hasZone4Effect(spell,cardId))return false;
    spell.enchantments.push({id:cardId,sourceZone:4});
    return true;
  }

  function reconcileApplied({persist=true}={}){
    const library=storedLibrary();
    let changed=false;
    hand.forEach(card=>{
      if(!card.appliedTo)return;
      const active=(state.spells||[]).find(spell=>spell?.id===card.appliedTo)||null;
      const known=library.find(spell=>spell?.id===card.appliedTo)||null;
      if(!active&&!known){
        card.appliedTo=null;
        changed=true;
        return;
      }
      if(active&&ensureZone4Effect(active,card.id))changed=true;
      if(known&&ensureZone4Effect(known,card.id))changed=true;
    });
    syncLabels();
    state.enchantmentCards=hand;
    state.enchantmentUsed=hand.some(card=>!!card.appliedTo);
    if(changed&&persist){persistHand();persistSpells();}
    return changed;
  }

  function sync(){
    reconcileApplied({persist:true});
    window.HAJJEN_SHARED_HAND?.sync?.();
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    window.HAJJEN_SHARED_UI?.sync?.();
  }

  function addLog(text){
    const log=document.getElementById('eventLog');if(!log)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;log.prepend(row);
    while(log.children.length>9)log.lastChild.remove();
  }
  function addToast(text){
    const area=document.getElementById('toastArea');if(!area)return;
    const row=document.createElement('div');row.className='toast reward';row.textContent=text;area.prepend(row);setTimeout(()=>row.remove(),1700);
  }

  function apply(cardId,spellId){
    const card=hand.find(item=>item.id===cardId);
    const spell=(state.spells||[]).find(item=>item.id===spellId&&!item.fallback);
    const def=definition(card);
    if(!card||card.appliedTo||!spell||!def||state.gameOver)return false;
    ensureZone4Effect(spell,card.id);
    const known=storedLibrary().find(item=>item?.id===spell.id);
    if(known&&known!==spell)ensureZone4Effect(known,card.id);
    card.appliedTo=spell.id;
    state.enchantmentUsed=true;
    persistHand();persistSpells();sync();
    addLog(`${def.name} applied to ${spell.name}.`);addToast(`${def.name.toUpperCase()} APPLIED`);
    document.dispatchEvent(new CustomEvent('hajjen:enchantment-applied',{detail:{zone:4,cardId,spellId}}));
    return true;
  }

  function syncAfterLoadoutChange(){
    loadoutSyncQueued=false;
    reconcileApplied({persist:true});
    window.HAJJEN_SHARED_HAND?.sync?.();
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
  }
  function queueLoadoutSync(){
    if(loadoutSyncQueued)return;
    loadoutSyncQueued=true;
    queueMicrotask(syncAfterLoadoutChange);
  }

  state.enchantmentCards=hand;
  state.enchantmentUsed=hand.some(card=>!!card.appliedTo);
  reconcileApplied({persist:true});
  persistHand();

  const api={
    version:'1.1-zone4-two-card-sync',zone:4,deck,hand,
    getHand:()=>hand.map(card=>({...card,definition:definition(card),spellName:spellName(card.appliedTo)})),
    apply,persist:persistHand,persistSpells,reconcileApplied,sync
  };
  window.HAJJEN_ENCHANTMENTS=api;
  /* Existing shared Hand/Card Deck code reads the historical alias. */
  window.HAJJEN_ZONE3_ENCHANTMENTS=api;
  window.HAJJEN_ZONE4_ENCHANTMENTS=api;

  /* Spellbook replaces the contents of #spellGrid whenever the prepared
     loadout changes. Observe that Zone-4-only compatibility source so the
     Enchantment picker always reflects the currently loaded spells. */
  const spellGrid=document.getElementById('spellGrid');
  let loadoutObserver=null;
  if(spellGrid){
    loadoutObserver=new MutationObserver(queueLoadoutSync);
    loadoutObserver.observe(spellGrid,{childList:true,subtree:true,characterData:true});
  }
  api.loadoutObserver=loadoutObserver;

  document.addEventListener('hajjen:enchantment-replaced',queueLoadoutSync);
  document.addEventListener('hajjen-ui-redesign-promoted',queueLoadoutSync);
  setTimeout(queueLoadoutSync,0);
})();
