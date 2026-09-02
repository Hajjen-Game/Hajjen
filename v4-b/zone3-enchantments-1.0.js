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

  // A fresh dev entry rolls a new hand. F5 keeps the same two cards.
  if(dev&&navigation!=='reload')storage.removeItem(HAND_KEY);

  const deck=cfg.enchantmentDeck.map(card=>({...card}));
  const byId=new Map(deck.map(card=>[card.id,card]));
  const deckIds=new Set(deck.map(card=>card.id));
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

  function cardDefinition(cardState){return byId.get(cardState?.id)||null;}
  function spellName(id){return state.spells.find(spell=>spell.id===id)?.name||null;}
  function cardIdsForSpell(spell){
    return Array.isArray(spell?.enchantments)
      ?spell.enchantments.map(item=>typeof item==='string'?item:item?.id).filter(id=>deckIds.has(id))
      :[];
  }
  function effectNames(spell){return cardIdsForSpell(spell).map(id=>byId.get(id)?.name).filter(Boolean);}

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

  function clearZone3Enchantments(){
    state.spells.forEach(spell=>{
      if(Array.isArray(spell.enchantments))spell.enchantments=spell.enchantments.filter(item=>{
        const id=typeof item==='string'?item:item?.id;
        return !deckIds.has(id);
      });
      // Remove the obsolete single-card prototype bonus as the new deck replaces it.
      delete spell.enchantDamage;
      spell.enchantmentName='';
    });
  }

  function ensureApplicationsBound(){
    hand.forEach(card=>{
      if(!card.appliedTo)return;
      const spell=state.spells.find(item=>item.id===card.appliedTo&&!item.fallback);
      if(!spell){card.appliedTo=null;return;}
      if(!Array.isArray(spell.enchantments))spell.enchantments=[];
      if(!spell.enchantments.includes(card.id))spell.enchantments.push(card.id);
    });
  }

  function restoreApplications(){
    clearZone3Enchantments();
    ensureApplicationsBound();
  }

  // F5 is a Zone 3 restart: keep the same random two cards, but let the player
  // choose their spell targets again from scratch.
  if(navigation==='reload'){
    hand.forEach(card=>{card.appliedTo=null;});
    clearZone3Enchantments();
    persistHand();
    persistSpells();
  }else{
    restoreApplications();
  }

  state.enchantmentCards=hand;
  state.enchantmentUsed=hand.some(card=>!!card.appliedTo);
  state.introComplete=state.enchantmentUsed;

  function staticDamage(spell){
    let damage=(Number(spell?.damage)||0)+(Math.max(1,Number(state.level)||1)-1)*4;
    const ids=cardIdsForSpell(spell);
    if(ids.includes('empowered'))damage+=6;
    if(ids.includes('focused'))damage+=Math.max(0,(Number(state.level)||1)-1)*3;
    if(ids.includes('primal-surge')&&(Number(state.danger)||0)>=15)damage+=10;
    return damage;
  }

  function cooldown(spell){return Math.max(0,(Number(spell?.cooldown)||0)-(Number(spell?.cooldownReduction)||0));}

  function syncSpellLabels(){
    state.spells.forEach(spell=>{
      const names=effectNames(spell);
      spell.enchantmentName=names.length?names.join(' + '):'';
    });
  }

  function syncSpellGrid(){
    const grid=document.getElementById('spellGrid');
    if(!grid)return;
    [...grid.querySelectorAll('.spell')].forEach((node,index)=>{
      const spell=state.spells[index];
      if(!spell)return;
      const spans=node.querySelectorAll('span');
      const extra=spell.fallback?' · FALLBACK':'';
      if(spans[0])spans[0].textContent=`${spell.force} · ${staticDamage(spell)} damage · CD ${cooldown(spell)}${extra}`;
      if(spans[1])spans[1].textContent=spell.enchantmentName||'No extra effect.';
    });
  }

  function syncActionBar(){
    const bar=document.getElementById('actionbar');
    if(!bar)return;
    const slots=[...bar.querySelectorAll(':scope > [data-action-spell]')]
      .sort((a,b)=>(Number(a.dataset.actionSpell)||0)-(Number(b.dataset.actionSpell)||0));
    slots.forEach((button,index)=>{
      const spell=state.spells[index];
      if(!spell)return;
      const detail=button.querySelector(':scope > span');
      const meta=button.querySelector(':scope > small');
      const extra=spell.fallback?' · FALLBACK':'';
      if(detail)detail.textContent=`${spell.force} · ${staticDamage(spell)} damage · CD ${cooldown(spell)}${extra}`;
      if(meta)meta.textContent=spell.enchantmentName||'No extra effect.';
    });
  }

  function syncFightWindow(){
    ensureApplicationsBound();
    const wrap=document.getElementById('combatSpells');
    if(!wrap)return;
    [...wrap.querySelectorAll(':scope > button')].forEach((button,index)=>{
      const spell=state.spells[index];
      if(!spell)return;
      const small=button.querySelector('small');
      const names=effectNames(spell);
      if(!small||!names.length)return;
      const suffix=` · ${names.join(' + ')}`;
      if(!small.textContent.includes(suffix))small.textContent+=suffix;
    });
  }

  let uiQueued=false;
  function syncPresentation(){
    ensureApplicationsBound();
    syncSpellLabels();
    syncSpellGrid();
    window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
    if(uiQueued)return;
    uiQueued=true;
    queueMicrotask(()=>{
      uiQueued=false;
      ensureApplicationsBound();
      syncSpellGrid();
      syncActionBar();
      syncFightWindow();
    });
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

    syncPresentation();
    persistHand();
    persistSpells();

    const intro=document.getElementById('introQuest');
    if(intro)intro.textContent='COMPLETE';
    addEvent(`${def.name} applied to ${spell.name}.`,'reward');
    addToast(`${def.name.toUpperCase()} APPLIED`);
    document.dispatchEvent(new CustomEvent('hajjen:enchantment-applied',{detail:{cardId,spellId}}));
    return true;
  }

  persistHand();
  syncPresentation();
  persistSpells();

  // Keep conditional display values (for example Primal Surge at Danger 15+)
  // and Fight Window labels in sync with the live campaign UI.
  const fight=document.getElementById('combatSpells');
  if(fight)new MutationObserver(()=>queueMicrotask(syncFightWindow)).observe(fight,{childList:true,subtree:true,characterData:true});
  const danger=document.getElementById('dangerText');
  if(danger)new MutationObserver(()=>queueMicrotask(syncPresentation)).observe(danger,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',()=>queueMicrotask(syncPresentation),{once:true});

  if(cfg.enchantment?.worldPickup===false){
    document.querySelector('.legend .enchantment-color')?.closest('span')?.remove();
  }

  window.HAJJEN_ZONE3_ENCHANTMENTS={
    version:'1.1',
    deck,
    hand,
    getHand:()=>hand.map(card=>({...card,definition:cardDefinition(card),spellName:spellName(card.appliedTo)})),
    apply,
    persist:persistHand,
    sync:syncPresentation
  };
})();