/* HAJJEN Zone 3 DEV — Hand reference-layout binder.
   Presentation only. Mounts the final PNG category icons and adds the title rule.
   IMPORTANT: icon/title decoration is appended after the native card DOM so
   gameplay scripts that use querySelector('span') still resolve the real card copy.
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
    const src=iconFiles[kind];
    let slot=card.querySelector(':scope > .hajjen-hand-icon-slot');
    if(!slot){
      slot=document.createElement('span');
      slot.className='hajjen-hand-icon-slot';
      slot.setAttribute('aria-hidden','true');
    }
    slot.dataset.handIconKind=kind;
    slot.dataset.handIconSrc=src;

    let img=slot.querySelector(':scope > img');
    if(!img){
      slot.replaceChildren();
      img=document.createElement('img');
      img.alt='';
      img.decoding='async';
      img.draggable=false;
      slot.appendChild(img);
    }else{
      [...slot.childNodes].forEach(node=>{if(node!==img)node.remove();});
    }

    card.appendChild(slot);

    const show=()=>slot.classList.add('has-icon');
    const hide=()=>slot.classList.remove('has-icon');
    img.onload=show;
    img.onerror=hide;
    if(img.getAttribute('src')!==src){
      hide();
      img.src=src;
    }else if(img.complete&&img.naturalWidth>0){
      show();
    }
  }

  function ensureTitleRule(card){
    let rule=card.querySelector(':scope > .hajjen-hand-title-rule');
    if(!rule){
      rule=document.createElement('span');
      rule.className='hajjen-hand-title-rule';
      rule.setAttribute('aria-hidden','true');
    }
    card.appendChild(rule);
  }

  function decorate(card){
    if(!(card instanceof HTMLElement))return;
    if(!card.classList.contains('shared-hand-card')&&!card.classList.contains('shared-hand-placeholder'))return;
    ensureIconSlot(card);
    ensureTitleRule(card);
    card.classList.add('hajjen-reference-hand-card');
    card.classList.remove('hajjen-square-hand-card');
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

  window.HAJJEN_HAND_REFERENCE_LAYOUT_DEV={
    version:'2.1',
    hand,
    iconFiles,
    sync:scan,
    observer
  };
  window.HAJJEN_HAND_SQUARE_LAYOUT_DEV=window.HAJJEN_HAND_REFERENCE_LAYOUT_DEV;
})();

/* Load the alternate three-column Hand experiment only in Zone 3 DEV. */
(()=>{
  if(new URLSearchParams(location.search).get('dev')!=='1')return;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone;
  if(zone!==3)return;

  if(!document.querySelector('link[data-hajjen-hand-deck-list-dev]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='shared-hajjen-hand-deck-list-dev-1.0.css?v=1';
    link.dataset.hajjenHandDeckListDev='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-hajjen-hand-deck-list-dev]')){
    const script=document.createElement('script');
    script.src='shared-hajjen-hand-deck-list-dev-1.0.js?v=1';
    script.dataset.hajjenHandDeckListDev='1';
    document.body.appendChild(script);
  }
})();
