/* HAJJEN Zone 3 DEV — Spellbook V8 potion slot visual alignment.
   V2 can re-apply waiting-for-first to Ingredient 2 because its hidden Primal
   selection remains empty while V7 owns Potion selection. Normalize the visible
   Potion slots so Potion crafting follows the same interaction states as normal
   Create Spell slots.

   V8.3:
   - keeps Ingredient 2 active as soon as Potion Ingredient 1 is chosen;
   - keeps Potion icons independent from V5's Primal Force icon decorator;
   - uses the individual Moonleaf / Clearwater PNG artwork;
   - mounts the shared Potion artwork binder in DEV as well as production.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone!==3||window.HAJJEN_SPELLBOOK_DEV_V8_POTION_SLOT_VISUAL_FIX)return;

  const POTION_INGREDIENT_ICONS={
    Moonleaf:'assets/potion_ingredient_moonleaf.png?v=1',
    Clearwater:'assets/potion_ingredient_clearwater.png?v=1'
  };
  const FALLBACK_ICON='assets/potion_ingredients_moonleaf_clearwater.webp';
  let attempts=0;

  function loadArtworkBinder(){
    if(!document.querySelector('link[data-hajjen-potion-ingredient-icons]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='shared-hajjen-potion-ingredient-icons-1.0.css?v=1';
      link.dataset.hajjenPotionIngredientIcons='1';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-hajjen-potion-ingredient-icons]')){
      const script=document.createElement('script');
      script.src='shared-hajjen-potion-ingredient-icons-1.0.js?v=1';
      script.dataset.hajjenPotionIngredientIcons='1';
      document.body.appendChild(script);
    }
  }

  function iconForSlot(slot){
    const name=slot?.querySelector(':scope > em')?.textContent?.trim()||'';
    return POTION_INGREDIENT_ICONS[name]||FALLBACK_ICON;
  }

  function boot(){
    const root=window.HAJJEN_SHARED_SPELLBOOK_V2?.root;
    const createSlots=root?.querySelector('[data-sbv2-create-slots]');
    if(!root||!createSlots){
      if(attempts++<200)setTimeout(boot,25);
      return;
    }

    let queued=false;

    function ensurePotionIcon(slot){
      const expected=iconForSlot(slot);
      let icon=slot.querySelector(':scope > .hajjen-selected-potion-ingredient-icon');
      if(!icon){
        icon=document.createElement('img');
        icon.className='hajjen-selected-potion-ingredient-icon';
        icon.src=expected;
        icon.alt='';
        icon.draggable=false;
        slot.prepend(icon);
      }

      /* V5 owns .hajjen-selected-force-icon and removes it whenever the hidden
         Primal selection is empty. Potion icons must therefore never use that
         class even though their CSS intentionally matches the same visual size. */
      icon.classList.remove('hajjen-selected-force-icon');
      if(icon.getAttribute('src')!==expected)icon.src=expected;
      return icon;
    }

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
        ensurePotionIcon(slot);
      });

      /* V2 may also rewrite the action copy while its hidden Primal slot is
         empty. Match normal spell crafting once Potion Ingredient 1 exists. */
      const second=potionSlots[1];
      if(second&&potionModeReadyForSecond&&!second.querySelector(':scope > em')?.textContent?.trim()){
        const action=second.querySelector(':scope > .hajjen-ingredient-slot-action');
        if(action&&action.textContent!=='CLICK TO CHOOSE')action.textContent='CLICK TO CHOOSE';
      }
      window.HAJJEN_POTION_INGREDIENT_ICONS?.sync?.();
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
      version:'8.3-individual-potion-icons',
      sync:normalize,
      observer,
      keepAlive
    };
  }

  loadArtworkBinder();
  boot();
})();