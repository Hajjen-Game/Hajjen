/* HAJJEN Zone 3 — Tactical introduction.
   Production-only. Adds the single Zone 3 Tactical card to the real shared Hand,
   keeps it present across campaign-zone Hand rerenders, and mirrors EQUIP/USED
   state into the production Tactical Fight Window bridge.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1'||window.HAJJEN_TACTICAL_CARD_PRODUCTION)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state||!Array.isArray(cfg.tacticalDeck)||!cfg.tacticalDeck.length)return;

  const hand=document.getElementById('manipCards');
  if(!hand)return;

  const definition=cfg.tacticalDeck[0];
  const CARD_KEY=definition.id||'guard-stance';
  let equipped=false;
  let ensureQueued=false;
  let ensuring=false;

  function consumed(){
    const used=window.HAJJEN_TACTICAL_COMBAT_PRODUCTION?.usedKeys;
    return used?.has?.(CARD_KEY)===true||used?.has?.(String(definition.name||'').toLowerCase())===true;
  }

  function applyState(card){
    if(!card)return;
    const equip=card.querySelector(':scope > .shared-tactical-equip');
    const used=consumed();
    card.classList.toggle('is-used',used);
    card.classList.toggle('is-equipt',!used&&equipped);
    if(!equip)return;
    if(used){
      equip.textContent='USED';
      equip.disabled=true;
      equip.setAttribute('aria-pressed','false');
    }else if(equipped){
      equip.textContent='EQUIPT';
      equip.disabled=false;
      equip.setAttribute('aria-pressed','true');
    }else{
      equip.textContent='EQUIP';
      equip.disabled=false;
      equip.setAttribute('aria-pressed','false');
    }
  }

  function createCard(){
    const card=document.createElement('div');
    card.className='shared-hand-card shared-tactical-card tactical hajjen-zone3-tactical-card';
    card.dataset.handCategory='tactical';
    card.dataset.handLabel=definition.name||'Guard Stance';
    card.dataset.tacticalId=CARD_KEY;

    const title=document.createElement('strong');
    title.textContent=definition.name||'Guard Stance';

    const copy=document.createElement('span');
    copy.className='shared-tactical-copy';
    copy.textContent=definition.text||'Equip this Tactical card for combat.';

    const equip=document.createElement('button');
    equip.type='button';
    equip.className='shared-tactical-equip';
    equip.addEventListener('click',()=>{
      if(consumed()||equipped)return;
      equipped=true;
      state.tacticalEquipped=true;
      applyState(card);
      queueMicrotask(()=>window.HAJJEN_TACTICAL_COMBAT_PRODUCTION?.sync?.());
      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
    });

    card.append(title,copy,equip);
    applyState(card);
    return card;
  }

  function ensureCard(){
    ensureQueued=false;
    if(ensuring||!hand.isConnected)return;
    ensuring=true;
    try{
      let card=hand.querySelector(':scope > .hajjen-zone3-tactical-card');
      if(!card){
        card=createCard();
        const firstTacticalPlaceholder=hand.querySelector(':scope > .shared-hand-placeholder[data-hand-placeholder="tactical"]');
        if(firstTacticalPlaceholder)firstTacticalPlaceholder.before(card);
        else hand.appendChild(card);
        window.HAJJEN_SHARED_HAND?.sync?.();
      }else applyState(card);
      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
      window.HAJJEN_TACTICAL_COMBAT_PRODUCTION?.sync?.();
    }finally{
      ensuring=false;
    }
  }

  function scheduleEnsure(){
    if(ensureQueued)return;
    ensureQueued=true;
    queueMicrotask(ensureCard);
  }

  const observer=new MutationObserver(records=>{
    const card=hand.querySelector(':scope > .hajjen-zone3-tactical-card');
    if(!card&&records.some(record=>record.type==='childList'))scheduleEnsure();
  });
  observer.observe(hand,{childList:true,subtree:false});

  /* Zone 3's established boss system gates on state.introComplete. Tactical now
     owns that introduction flag, so normalize the remaining legacy Enchantment
     copy emitted by the older zone-system layer. */
  function normalizeObjectiveCopy(){
    const boss=document.getElementById('bossQuest');
    if(boss&&boss.textContent.includes('ENCHANTMENT'))boss.textContent=boss.textContent.replace('ENCHANTMENT','TACTICAL');

    const tile=document.getElementById('tileDesc');
    if(tile&&/Apply an Enchantment/i.test(tile.textContent))tile.textContent=tile.textContent.replace(/Apply an Enchantment/i,'Use a Tactical card');

    const log=document.getElementById('eventLog');
    log?.querySelectorAll('.event').forEach(row=>{
      const text=row.textContent||'';
      if(/Introduction: choose one of your two Enchantment cards/i.test(text)){
        row.textContent='Introduction: equip Guard Stance and use it once during combat.';
      }else if(/Zone 3 boss unlocked: Enchantment applied,/i.test(text)){
        row.textContent=text.replace(/Enchantment applied,/i,'Tactical used,');
      }
    });

    const footer=document.querySelector('.footer');
    if(footer)footer.textContent='ZONE 3 LEVEL CAP: 10 · 2 ENCHANTMENTS · TACTICAL INTRODUCED · 1 CARD';
  }
  const objectiveObserver=new MutationObserver(normalizeObjectiveCopy);
  const bossNode=document.getElementById('bossQuest');
  const tileNode=document.getElementById('tileDesc');
  const logNode=document.getElementById('eventLog');
  if(bossNode)objectiveObserver.observe(bossNode,{childList:true,characterData:true,subtree:true});
  if(tileNode)objectiveObserver.observe(tileNode,{childList:true,characterData:true,subtree:true});
  if(logNode)objectiveObserver.observe(logNode,{childList:true,subtree:true});
  setInterval(normalizeObjectiveCopy,120);

  ensureCard();
  queueMicrotask(ensureCard);
  normalizeObjectiveCopy();

  window.HAJJEN_TACTICAL_CARD_PRODUCTION={
    version:'1.1-zone3-intro-copy',
    hand,
    definition,
    observer,
    get equipped(){return equipped;},
    sync:ensureCard
  };
})();