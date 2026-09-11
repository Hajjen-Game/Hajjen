/* HAJJEN Zone 3 DEV — Spellbook V8 potion slot visual alignment.
   V2 can re-apply waiting-for-first to Ingredient 2 because its hidden Primal
   selection remains empty while V7 owns Potion selection. Normalize the visible
   Potion slots so Potion crafting follows the same interaction states as normal
   Create Spell slots.

   V8.1 also makes the empty Ingredient 2 slot fully active as soon as Ingredient
   1 contains Moonleaf/Clearwater: no dimming, pointer cursor, tabindex 0 and the
   same CLICK TO CHOOSE affordance as normal spell crafting.
*/
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
      const slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot')];
      const potionSlots=slots.filter(slot=>slot.classList.contains('hajjen-potion-create-slot'));
      if(!potionSlots.length)return;

      const firstValue=potionSlots[0]?.querySelector(':scope > em')?.textContent?.trim()||'';
      const potionModeReadyForSecond=!!firstValue;

      potionSlots.forEach((slot,index)=>{
        const value=slot.querySelector(':scope > em')?.textContent?.trim()||'';
        const isFilled=!!value;
        const isSecondReady=index===1&&potionModeReadyForSecond;

        /* Filled Potion slots and the now-selectable second slot must never keep
           V2's legacy waiting-for-first state. */
        if(isFilled||isSecondReady){
          slot.classList.remove('waiting-for-first');
          slot.classList.toggle('hajjen-potion-slot-ready',isSecondReady&&!isFilled);
          if(slot.getAttribute('tabindex')!=='0')slot.setAttribute('tabindex','0');
        }else{
          slot.classList.remove('hajjen-potion-slot-ready');
        }

        if(!isFilled)return;
        if(!slot.classList.contains('filled'))slot.classList.add('filled');
        if(!slot.classList.contains('hajjen-has-force-icon'))slot.classList.add('hajjen-has-force-icon');

        const icon=slot.querySelector(':scope > .hajjen-selected-potion-ingredient-icon');
        if(icon&&!icon.classList.contains('hajjen-selected-force-icon')){
          icon.classList.add('hajjen-selected-force-icon');
        }
      });

      /* V2 may also rewrite the action copy while its hidden Primal slot is
         empty. Match normal spell crafting once Potion Ingredient 1 exists. */
      const second=potionSlots[1];
      if(second&&potionModeReadyForSecond&&!second.querySelector(':scope > em')?.textContent?.trim()){
        const action=second.querySelector(':scope > .hajjen-ingredient-slot-action');
        if(action&&action.textContent!=='CLICK TO CHOOSE')action.textContent='CLICK TO CHOOSE';
      }
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
    const keepAlive=setInterval(normalize,120);

    window.HAJJEN_SPELLBOOK_DEV_V8_POTION_SLOT_VISUAL_FIX={
      version:'8.1-second-slot-active',
      sync:normalize,
      observer,
      keepAlive
    };
  }

  boot();
})();