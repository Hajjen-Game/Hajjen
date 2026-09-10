/* HAJJEN Zone 3 DEV — Hand square-card layout binder.
   Presentation only. Reserves future PNG icon slots and adds the small title rule.
   No card actions, enchantment logic, Tactical logic or Hand state is changed. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(zone!==3)return;

  const hand=document.getElementById('manipCards');
  if(!hand)return;

  const iconFiles={
    manipulation:'assets/hand-icons/hand-manipulation.png',
    enchantment:'assets/hand-icons/hand-enchantment.png',
    tactical:'assets/hand-icons/hand-tactical.png',
    locked:'assets/hand-icons/hand-locked.png'
  };

  function iconKind(card){
    if(card.classList.contains('hajjen-vector-locked-slot')||card.classList.contains('locked'))return'locked';
    const category=(card.dataset.handCategory||card.dataset.handPlaceholder||'').toLowerCase();
    return ['manipulation','enchantment','tactical'].includes(category)?category:'locked';
  }

  function ensureIconSlot(card){
    const kind=iconKind(card);
    let slot=card.querySelector(':scope > .hajjen-hand-icon-slot');
    if(!slot){
      slot=document.createElement('span');
      slot.className='hajjen-hand-icon-slot';
      slot.setAttribute('aria-hidden','true');
      card.prepend(slot);
    }
    slot.dataset.handIconKind=kind;
    slot.dataset.handIconSrc=iconFiles[kind];

    /* Do not request the future PNG until it actually exists. Once the asset is
       added later, the icon binder can insert an <img> and add .has-icon without
       changing any card geometry. */
    slot.querySelectorAll(':scope > img').forEach(img=>{
      if(!img.getAttribute('src'))img.remove();
    });
  }

  function ensureTitleRule(card){
    let rule=card.querySelector(':scope > .hajjen-hand-title-rule');
    if(!rule){
      rule=document.createElement('span');
      rule.className='hajjen-hand-title-rule';
      rule.setAttribute('aria-hidden','true');
      card.appendChild(rule);
    }
  }

  function decorate(card){
    if(!(card instanceof HTMLElement))return;
    if(!card.classList.contains('shared-hand-card')&&!card.classList.contains('shared-hand-placeholder'))return;
    ensureIconSlot(card);
    ensureTitleRule(card);
    card.classList.add('hajjen-square-hand-card');
  }

  let raf=0;
  function scan(){
    raf=0;
    [...hand.children].forEach(decorate);
    window.HAJJEN_HAND_CARD_SHARED_FRAMES_DEV?.sync?.();
  }
  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(()=>requestAnimationFrame(scan));
  }

  scan();
  requestAnimationFrame(scan);
  const observer=new MutationObserver(schedule);
  observer.observe(hand,{childList:true,subtree:false});
  document.addEventListener('hajjen:enchantment-applied',schedule);

  window.HAJJEN_HAND_SQUARE_LAYOUT_DEV={
    version:'1.0',
    hand,
    iconFiles,
    sync:scan,
    observer
  };
})();
