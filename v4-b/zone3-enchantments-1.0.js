(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state||!Array.isArray(cfg.enchantmentDeck))return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const HAND_KEY='hajjen-v4b-zone3-enchantment-hand-v1';
  const dev=!!window.HAJJEN_ZONE3_DEV_MODE;
  const storage=dev?sessionStorage:localStorage;
  const navigation=performance.getEntriesByType?.('navigation')?.[0]?.type||'';

  // A fresh dev entry rolls a new hand, but F5 keeps the same two cards.
  if(dev&&navigation!=='reload')storage.removeItem(HAND_KEY);

  const deck=cfg.enchantmentDeck.map(card=>({...card}));
  const byId=new Map(deck.map(card=>[card.id,card]));
  const drawCount=Math.max(1,Math.min(Number(cfg.enchantment?.draw)||2,deck.length));

  function randomDraw(){
    const pool=[...deck];
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    return pool.slice(0,drawCount).map(card=>({id:card.id,appliedTo:null}));
  }

  function loadHand(){
    try{
      const parsed=JSON.parse(storage.getItem(HAND_KEY)||'null');
      if(Array.isArray(parsed?.cards)&&parsed.cards.length===drawCount&&parsed.cards.every(card=>byId.has(card?.id))){
        return parsed.cards.map(card=>({id:card.id,appliedTo:card.appliedTo||null}));
      }
    }catch{}
    const cards=randomDraw();
    storage.setItem(HAND_KEY,JSON.stringify({version:1,cards}));
    return cards;
  }

  const hand=loadHand();
  state.enchantmentCards=hand;
  state.enchantmentUsed=hand.some(card=>!!card.appliedTo);
  state.introComplete=state.enchantmentUsed;

  function cardDefinition(cardState){return byId.get(cardState?.id)||null;}
  function spellName(id){return state.spells.find(spell=>spell.id===id)?.name||null;}

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
      const saved=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
      const library=Array.isArray(saved?.spells)?saved.spells:[];
      state.spells.filter(spell=>!spell.fallback).forEach(spell=>{
        const index=library.findIndex(item=>item?.id===spell.id);
        if(index>=0)library[index]={...spell};
        else library.push({...spell});
      });
      localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));
    }catch{}
  }

  function syncSpellLabels(){
    state.spells.forEach(spell=>{
      const ids=Array.isArray(spell.enchantments)?spell.enchantments:[];
      const names=ids.map(id=>byId.get(id)?.name).filter(Boolean);
      spell.enchantmentName=names.length?names.join(' + '):'';
    });

    const grid=document.getElementById('spellGrid');
    if(grid){
      [...grid.querySelectorAll('.spell')].forEach((node,index)=>{
        const spell=state.spells[index];
        const spans=node.querySelectorAll('span');
        if(spell&&spans[1])spans[1].textContent=spell.enchantmentName||'No extra effect.';
      });
    }
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
  }

  function addEvent(text,type='reward'){
    const log=document.getElementById('eventLog');
    if(!log)return;
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    log.prepend(row);
    while(log.children.length>9)log.lastChild.remove();
  }

  function addToast(text){
    const area=document.getElementById('toastArea');
    if(!area)return;
    const toast=document.createElement('div');
    toast.className='toast reward';
    toast.textContent=text;
    area.prepend(toast);
    setTimeout(()=>toast.remove(),1700);
  }

  function apply(cardId,spellId){
    const card=hand.find(item=>item.id===cardId);
    const spell=state.spells.find(item=>item.id===spellId&&!item.fallback);
    const def=cardDefinition(card);
    if(!card||card.appliedTo||!spell||!def||state.gameOver)return false;

    if(!Array.isArray(spell.enchantments))spell.enchantments=[];
    if(!spell.enchantments.includes(card.id))spell.enchantments.push(card.id);
    card.appliedTo=spell.id;
    state.enchantmentUsed=true;
    state.introComplete=true;

    syncSpellLabels();
    persistHand();
    persistSpells();

    const intro=document.getElementById('introQuest');
    if(intro)intro.textContent='COMPLETE';
    addEvent(`${def.name} applied to ${spell.name}.`,'reward');
    addToast(`${def.name.toUpperCase()} APPLIED`);
    document.dispatchEvent(new CustomEvent('hajjen:enchantment-applied',{detail:{cardId,spellId}}));
    return true;
  }

  syncSpellLabels();
  persistSpells();

  window.addEventListener('DOMContentLoaded',()=>{
    if(cfg.enchantment?.worldPickup===false){
      document.querySelector('.legend .enchantment-color')?.closest('span')?.remove();
    }
  },{once:true});

  window.HAJJEN_ZONE3_ENCHANTMENTS={
    version:'1.0',
    deck,
    hand,
    getHand:()=>hand.map(card=>({...card,definition:cardDefinition(card),spellName:spellName(card.appliedTo)})),
    apply,
    persist:persistHand
  };
})();
