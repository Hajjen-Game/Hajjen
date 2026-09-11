/* HAJJEN Zone 3 DEV — Spellbook V6 runtime fix.
   Keeps the Backpack retired visually without breaking campaign-zone's hidden
   Zone System render target, and makes potion ingredient slot reopening robust.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_SPELLBOOK_DEV_V6_RUNTIME_FIX)return;

  const modal=document.getElementById('spellbookModal');
  if(!modal)return;

  /* V6 retired the old campaign-system HUD by removing its DOM. campaign-zone
     still writes to #zoneSystem inside renderAll(); if that target is missing,
     movement stops before resolveTile(), which also prevents normal combat.
     Keep a hidden compatibility target alive instead. */
  function ensureZoneSystemTarget(){
    let zoneSystem=document.getElementById('zoneSystem');
    if(zoneSystem)return zoneSystem;
    zoneSystem=document.createElement('div');
    zoneSystem.id='zoneSystem';
    zoneSystem.hidden=true;
    zoneSystem.setAttribute('aria-hidden','true');
    zoneSystem.dataset.hajjenCompatibilityTarget='spellbook-potion-dev';
    document.body.appendChild(zoneSystem);
    return zoneSystem;
  }

  ensureZoneSystemTarget();

  function reopenPotionPicker(slotIndex){
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    const v2=window.HAJJEN_SPELLBOOK_DEV_V2;
    if(!v6||!v2||!v6.selection?.length)return;

    const overlay=v2.overlay;
    if(!overlay)return;
    if(!overlay.isConnected)modal.appendChild(overlay);

    /* Open through the established V2 picker, then let V6 repaint the Potion
       section. V6's own slot handler has already set its forced target by the
       time this queued callback runs. */
    v2.openPicker?.(0);
    const title=overlay.querySelector('#hajjenIngredientPickerTitle');
    const subtitle=overlay.querySelector('[data-picker-subtitle]');
    if(title)title.textContent=`CHOOSE INGREDIENT ${slotIndex+1}`;
    if(subtitle){
      subtitle.textContent=slotIndex===1
        ?'Choose the other potion ingredient to complete Moonleaf + Clearwater.'
        :'Choose Moonleaf or Clearwater.';
    }
    v6.sync?.();
  }

  function slotFromEvent(event){
    const target=event.target;
    if(!(target instanceof Element))return null;
    const slot=target.closest('#spellbookModal .sbv2-create-slot');
    if(!slot)return null;
    const index=Number(slot.dataset.ingredientSlot);
    return Number.isInteger(index)&&index>=0&&index<=1?index:null;
  }

  /* Capture on document so this safety path still runs even when V6 correctly
     stops the slot-2 event before the older V2 bubble handler. */
  document.addEventListener('click',event=>{
    const index=slotFromEvent(event);
    if(index===null)return;
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    if(!v6?.selection?.length)return;
    queueMicrotask(()=>reopenPotionPicker(index));
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const index=slotFromEvent(event);
    if(index===null)return;
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    if(!v6?.selection?.length)return;
    queueMicrotask(()=>reopenPotionPicker(index));
  },true);

  window.HAJJEN_SPELLBOOK_DEV_V6_RUNTIME_FIX={
    version:'1.0',
    ensureZoneSystemTarget,
    reopenPotionPicker
  };
})();
