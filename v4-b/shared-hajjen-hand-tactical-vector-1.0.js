/* HAJJEN HAND — Tactical vector/CSS card preview, DEV only.
   Zone 3 keeps Tactical progression locked, but DEV mounts one Guard Stance
   prototype into the first Tactical hand slot so the full equip/combat flow can
   be tested safely.

   IMPORTANT: campaign-zone.js rebuilds #manipCards on every renderAll(), including
   movement. Earlier this prototype was inserted only once at startup, so the first
   movement deleted Guard Stance and the shared Hand correctly fell back to two
   locked Tactical placeholders. This version owns the DEV prototype state and
   re-mounts it whenever the native Hand is rebuilt.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone;
  if(zone!==3||window.HAJJEN_TACTICAL_CARD_DEV)return;

  const hand=document.getElementById('manipCards');
  if(!hand)return;

  const NS='http://www.w3.org/2000/svg';
  const CARD_KEY='guard-stance';
  let equipped=false;
  let ensureRaf=0;
  let ensuring=false;

  const svgEl=(name,attrs={})=>{
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  };

  function tacticalIcon(){
    const svg=svgEl('svg',{
      class:'hajjen-tactical-card-icon',
      viewBox:'0 0 48 48',
      'aria-hidden':'true',
      focusable:'false'
    });
    const path=(d)=>svg.appendChild(svgEl('path',{d}));
    path('M24 7.5c5 3.4 9.2 4.1 13 4.5v10.4c0 8-4.9 13.6-13 18.1-8.1-4.5-13-10.1-13-18.1V12c3.8-.4 8-1.1 13-4.5z');
    path('M24 13v20');
    path('M17 18.5c2.4 1.2 4.8 1.9 7 2.2 2.2-.3 4.6-1 7-2.2');
    return svg;
  }

  function consumed(){
    const used=window.HAJJEN_TACTICAL_COMBAT_DEV?.usedKeys;
    return used?.has?.(CARD_KEY)===true||used?.has?.('guard stance')===true;
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
    card.className='shared-hand-card shared-tactical-card tactical hajjen-dev-tactical-card';
    card.dataset.handCategory='tactical';
    card.dataset.handLabel='Guard Stance';
    card.dataset.tacticalId='guard-stance';
    card.dataset.devPreview='tactical';

    const iconWrap=document.createElement('span');
    iconWrap.className='hajjen-tactical-card-icon-wrap';
    iconWrap.appendChild(tacticalIcon());

    const title=document.createElement('strong');
    title.textContent='Guard Stance';

    const copy=document.createElement('span');
    copy.className='shared-tactical-copy';
    copy.textContent='Equip this Tactical card to prepare a defensive stance for combat.';

    const equip=document.createElement('button');
    equip.type='button';
    equip.className='shared-tactical-equip';
    equip.addEventListener('click',()=>{
      if(consumed()||equipped)return;
      equipped=true;
      applyState(card);
      queueMicrotask(()=>window.HAJJEN_TACTICAL_COMBAT_DEV?.sync?.());
      window.HAJJEN_HAND_DECK_LIST_DEV?.render?.();
    });

    card.append(iconWrap,title,copy,equip);
    applyState(card);
    return card;
  }

  function ensureCard(){
    ensureRaf=0;
    if(ensuring||!hand.isConnected)return;
    ensuring=true;
    try{
      let card=hand.querySelector(':scope > .hajjen-dev-tactical-card');
      if(!card){
        card=createCard();
        const firstTacticalPlaceholder=hand.querySelector(':scope > .shared-hand-placeholder[data-hand-placeholder="tactical"]');
        if(firstTacticalPlaceholder)firstTacticalPlaceholder.before(card);
        else hand.appendChild(card);

        /* Recalculate placeholders after the prototype is restored. This is what
           keeps the Hand at 1 Guard Stance + 1 Tactical locked slot instead of
           falling back to 2 locked slots after movement. */
        window.HAJJEN_SHARED_HAND?.sync?.();
      }else{
        applyState(card);
      }
      window.HAJJEN_HAND_REFERENCE_LAYOUT_DEV?.sync?.();
      window.HAJJEN_HAND_DECK_LIST_DEV?.render?.();
      window.HAJJEN_TACTICAL_COMBAT_DEV?.sync?.();
    }finally{
      ensuring=false;
    }
  }

  function scheduleEnsure(){
    if(ensureRaf)return;
    ensureRaf=requestAnimationFrame(()=>requestAnimationFrame(ensureCard));
  }

  /* campaign-zone.js empties/rebuilds the direct children of #manipCards on every
     movement/status render. Watch exactly that boundary, not the subtree, so icon
     decorators and button text changes cannot create a render loop. */
  const observer=new MutationObserver(records=>{
    const prototypeStillThere=hand.querySelector(':scope > .hajjen-dev-tactical-card');
    if(!prototypeStillThere&&records.some(record=>record.type==='childList'))scheduleEnsure();
  });
  observer.observe(hand,{childList:true,subtree:false});

  ensureCard();
  requestAnimationFrame(ensureCard);

  window.HAJJEN_TACTICAL_CARD_DEV={
    version:'1.1-persistent',
    hand,
    observer,
    get equipped(){return equipped;},
    setEquipped(value){equipped=!!value;ensureCard();},
    sync:ensureCard
  };
})();
