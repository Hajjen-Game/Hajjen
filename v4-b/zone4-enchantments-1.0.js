/* HAJJEN Zone 4 — two-card Enchantment hand. */
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
  const spellName=id=>(state.spells||[]).find(spell=>spell.id===id)?.name||null;

  function persistHand(){storage.setItem(HAND_KEY,JSON.stringify({version:1,cards:hand.map(card=>({id:card.id,appliedTo:card.appliedTo||null}))}));}
  function persistSpells(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
      saved.spells=state.spells;
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
    try{
      const saved=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
      const library=Array.isArray(saved?.spells)?saved.spells:[];
      (state.spells||[]).filter(spell=>!spell.fallback).forEach(spell=>{
        const index=library.findIndex(item=>item?.id===spell.id);
        if(index>=0)library[index]={...spell};else library.push({...spell});
      });
      localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));
    }catch{}
  }

  function effectNames(spell){
    const ids=Array.isArray(spell?.enchantments)?spell.enchantments.map(enchantmentId).filter(Boolean):[];
    return ids.map(id=>byId.get(id)?.name).filter(Boolean);
  }
  function syncLabels(){
    (state.spells||[]).forEach(spell=>{
      const names=effectNames(spell);
      if(names.length)spell.enchantmentName=names.join(' + ');
    });
  }
  function sync(){
    syncLabels();
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
    if(!Array.isArray(spell.enchantments))spell.enchantments=[];
    if(!spell.enchantments.some(item=>enchantmentId(item)===card.id&&item?.sourceZone===4))spell.enchantments.push({id:card.id,sourceZone:4});
    card.appliedTo=spell.id;
    state.enchantmentUsed=true;
    persistHand();persistSpells();sync();
    addLog(`${def.name} applied to ${spell.name}.`);addToast(`${def.name.toUpperCase()} APPLIED`);
    document.dispatchEvent(new CustomEvent('hajjen:enchantment-applied',{detail:{zone:4,cardId,spellId}}));
    return true;
  }

  state.enchantmentCards=hand;
  state.enchantmentUsed=hand.some(card=>!!card.appliedTo);
  persistHand();syncLabels();

  const api={
    version:'1.0-zone4-two-card',zone:4,deck,hand,
    getHand:()=>hand.map(card=>({...card,definition:definition(card),spellName:spellName(card.appliedTo)})),
    apply,persist:persistHand,sync
  };
  window.HAJJEN_ENCHANTMENTS=api;
  /* Existing shared Hand/Card Deck code reads the historical alias. */
  window.HAJJEN_ZONE3_ENCHANTMENTS=api;
  window.HAJJEN_ZONE4_ENCHANTMENTS=api;
})();
