/* HAJJEN Zone 3 DEV — Spellbook V8 potion slot visual alignment.
   V2 can re-apply waiting-for-first to Ingredient 2 because its hidden Primal
   selection remains empty while V7 owns Potion selection. Normalize only the
   visible Potion slots and reuse the normal selected-force icon class so Potion
   crafting matches the existing Create Spell layout. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_SPELLBOOK_DEV_V8_POTION_SLOT_VISUAL_FIX)return;

  let attempts=0;
  function boot(){
    const root=window.HAJJEN_SHARED_SPELLBOOK_V2?.root;
    const createSlots=root?.querySelector('[data-sbv2-create-slots]');
    if(!root||!createSlots){
      if(attempts++<200)setTimeout(boot,25);
      return;
    }

    let queued=false;
    function normalize(){
      queued=false;
      const slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot.hajjen-potion-create-slot')];
      slots.forEach(slot=>{
        const value=slot.querySelector(':scope > em')?.textContent?.trim()||'';
        if(!value)return;

        /* A filled Potion slot is never waiting for Ingredient 1. Remove the
           legacy state instead of merely trying to out-style its opacity/filter. */
        if(slot.classList.contains('waiting-for-first'))slot.classList.remove('waiting-for-first');
        if(!slot.classList.contains('filled'))slot.classList.add('filled');
        if(!slot.classList.contains('hajjen-has-force-icon'))slot.classList.add('hajjen-has-force-icon');
        if(slot.getAttribute('tabindex')!=='0')slot.setAttribute('tabindex','0');

        const icon=slot.querySelector(':scope > .hajjen-selected-potion-ingredient-icon');
        if(icon&&!icon.classList.contains('hajjen-selected-force-icon')){
          icon.classList.add('hajjen-selected-force-icon');
        }
      });
    }

    function schedule(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(normalize);
    }

    const observer=new MutationObserver(schedule);
    observer.observe(createSlots,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['class','tabindex']
    });

    normalize();
    requestAnimationFrame(normalize);
    const keepAlive=setInterval(normalize,160);

    window.HAJJEN_SPELLBOOK_DEV_V8_POTION_SLOT_VISUAL_FIX={
      version:'8.0',
      sync:normalize,
      observer,
      keepAlive
    };
  }

  boot();
})();