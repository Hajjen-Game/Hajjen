/* HAJJEN Zone 3 DEV — Spellbook V6 runtime fix.
   Keeps the Backpack retired visually without breaking campaign-zone's hidden
   Zone System render target, and makes potion ingredient slot reopening robust.

   v1.3 loads the V7 deterministic two-slot potion selector. Once V7 is ready,
   the older repaint guard becomes passive so both layers cannot fight over the
   same picker grid.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_SPELLBOOK_DEV_V6_RUNTIME_FIX)return;

  const modal=document.getElementById('spellbookModal');
  if(!modal)return;

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

  function loadV7(){
    if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION||document.querySelector('script[data-hajjen-v7-potion-selection]'))return;
    const script=document.createElement('script');
    script.src='shared-hajjen-spellbook-dev-v7-potion-selection-fix-1.0.js?v=2';
    script.async=false;
    script.dataset.hajjenV7PotionSelection='1';
    document.head.appendChild(script);
  }
  loadV7();

  let repaintQueued=false;
  function repaintPotionPicker(){
    repaintQueued=false;
    if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION)return;
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    const v2=window.HAJJEN_SPELLBOOK_DEV_V2;
    const overlay=v2?.overlay;
    if(!v6?.selection?.length||!overlay?.classList.contains('show'))return;
    v6.sync?.();
  }
  function schedulePotionRepaint(){
    if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION||repaintQueued)return;
    repaintQueued=true;
    requestAnimationFrame(repaintPotionPicker);
  }

  function reopenPotionPicker(slotIndex){
    if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION)return;
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    const v2=window.HAJJEN_SPELLBOOK_DEV_V2;
    if(!v6||!v2||!v6.selection?.length)return;

    const overlay=v2.overlay;
    if(!overlay)return;
    if(!overlay.isConnected)modal.appendChild(overlay);

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
    schedulePotionRepaint();
  }

  function slotFromEvent(event){
    const target=event.target;
    if(!(target instanceof Element))return null;
    const slot=target.closest('#spellbookModal .sbv2-create-slot');
    if(!slot)return null;
    const index=Number(slot.dataset.ingredientSlot);
    return Number.isInteger(index)&&index>=0&&index<=1?index:null;
  }

  document.addEventListener('click',event=>{
    if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION)return;
    const index=slotFromEvent(event);
    if(index===null)return;
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    if(!v6?.selection?.length)return;
    queueMicrotask(()=>reopenPotionPicker(index));
  },true);

  document.addEventListener('keydown',event=>{
    if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION)return;
    if(event.key!=='Enter'&&event.key!==' ')return;
    const index=slotFromEvent(event);
    if(index===null)return;
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    if(!v6?.selection?.length)return;
    queueMicrotask(()=>reopenPotionPicker(index));
  },true);

  let gridObserver=null;
  function attachGridObserver(){
    if(gridObserver)return true;
    const grid=window.HAJJEN_SPELLBOOK_DEV_V2?.overlay?.querySelector('[data-picker-grid]');
    if(!grid)return false;
    gridObserver=new MutationObserver(()=>{
      if(window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION)return;
      const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
      const overlay=window.HAJJEN_SPELLBOOK_DEV_V2?.overlay;
      if(!v6?.selection?.length||!overlay?.classList.contains('show'))return;
      if(grid.querySelector(':scope > .hajjen-potion-force-card'))return;
      schedulePotionRepaint();
    });
    gridObserver.observe(grid,{childList:true,subtree:false});
    return true;
  }

  let observerAttempts=0;
  const observerTimer=setInterval(()=>{
    if(attachGridObserver()||observerAttempts++>120)clearInterval(observerTimer);
  },25);
  attachGridObserver();

  window.HAJJEN_SPELLBOOK_DEV_V6_RUNTIME_FIX={
    version:'1.3-v7-loader',
    ensureZoneSystemTarget,
    reopenPotionPicker,
    schedulePotionRepaint,
    loadV7,
    get gridObserver(){return gridObserver;}
  };
})();
