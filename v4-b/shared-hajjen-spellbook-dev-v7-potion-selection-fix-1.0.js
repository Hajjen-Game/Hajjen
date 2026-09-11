/* HAJJEN Zone 3 DEV — Spellbook V7 potion selection fix.
   Takes ownership only after a Potion ingredient has been chosen. This avoids
   the older V2 picker/V6 repaint race while keeping normal spell crafting intact.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state||window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION)return;

  const marker={version:'7.0-loading'};
  window.HAJJEN_SPELLBOOK_DEV_V7_POTION_SELECTION=marker;

  const RECIPE=['Moonleaf','Clearwater'];
  const PICKER_ICON='assets/potion_ingredients_moonleaf_clearwater.webp';
  const POTION_ICON='assets/action-bar-icons/healing-potion.png';
  const SAVE_KEY='hajjen-v4b-campaign';
  let attempts=0;

  function boot(){
    const v6=window.HAJJEN_SPELLBOOK_DEV_V6_POTION;
    const v2=window.HAJJEN_SPELLBOOK_DEV_V2;
    const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
    const modal=document.getElementById('spellbookModal');
    const root=api?.root;
    const createSlots=root?.querySelector('[data-sbv2-create-slots]');
    const preview=root?.querySelector('[data-sbv2-preview]');
    const createBtn=root?.querySelector('[data-sbv2-create]');
    const overlay=v2?.overlay;
    const grid=overlay?.querySelector('[data-picker-grid]');
    if(!v6||!v2||!api||!modal||!root||!createSlots||!preview||!createBtn||!overlay||!grid){
      if(attempts++<200)setTimeout(boot,25);
      return;
    }

    /* The old runtime guard is no longer needed for picker repainting once V7
       owns potion mode. Keep its #zoneSystem compatibility fix, but disconnect
       only its grid observer so the two layers cannot repaint each other. */
    window.HAJJEN_SPELLBOOK_DEV_V6_RUNTIME_FIX?.gridObserver?.disconnect?.();

    let selection=[];
    let activeSlot=null;
    let rendering=false;

    const clean=value=>String(value||'').trim();
    const canonical=name=>RECIPE.find(item=>item.toLowerCase()===clean(name).toLowerCase())||clean(name);
    const isPotion=name=>RECIPE.some(item=>item.toLowerCase()===clean(name).toLowerCase());
    const pairReady=()=>selection.length===2&&RECIPE.every(name=>selection.some(item=>item.toLowerCase()===name.toLowerCase()));
    const locked=()=>!!state.combat||!!state.gameOver||!!state.zoneCleared;

    function syncFromV6(){
      if(selection.length)return;
      const live=Array.isArray(v6.selection)?v6.selection:[];
      if(live.length)selection=live.map(canonical).filter(isPotion).slice(0,2);
    }

    function availableCounts(){
      const fromV6=v6.available||{};
      const counts={};
      RECIPE.forEach(name=>{
        const direct=Array.isArray(state.potionIngredients)
          ?state.potionIngredients.filter(item=>clean(typeof item==='string'?item:item?.name).toLowerCase()===name.toLowerCase()).length
          :0;
        counts[name]=Math.max(direct,Number(fromV6[name])||0);
      });
      return counts;
    }

    function setPickerCopy(slotIndex){
      const title=overlay.querySelector('#hajjenIngredientPickerTitle');
      const subtitle=overlay.querySelector('[data-picker-subtitle]');
      const kicker=overlay.querySelector('.hajjen-ingredient-picker-header small');
      if(kicker)kicker.textContent='CREATE SPELL / POTION';
      if(title)title.textContent=`CHOOSE INGREDIENT ${slotIndex+1}`;
      if(subtitle)subtitle.textContent=slotIndex===1
        ?'Choose the other potion ingredient to complete Moonleaf + Clearwater.'
        :'Choose Moonleaf or Clearwater, or switch back to a Primal ingredient.';
    }

    function buildPotionCard(){
      const counts=availableCounts();
      const target=activeSlot===1?1:0;
      const card=document.createElement('section');
      card.className='hajjen-ingredient-force-card hajjen-potion-force-card';
      card.dataset.v7PotionCard='1';

      const head=document.createElement('div');
      head.className='hajjen-ingredient-force-head';
      const icon=document.createElement('img');
      icon.src=PICKER_ICON;icon.alt='';icon.draggable=false;
      const labels=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent='POTION';
      const count=document.createElement('span');
      count.textContent=`${RECIPE.reduce((sum,name)=>sum+(counts[name]||0),0)} AVAILABLE`;
      labels.append(strong,count);head.append(icon,labels);

      const choices=document.createElement('div');
      choices.className='hajjen-ingredient-force-choices';
      RECIPE.forEach(name=>{
        const button=document.createElement('button');
        button.type='button';
        button.className='hajjen-ingredient-choice hajjen-potion-ingredient-choice';
        button.dataset.potionIngredient=name;
        button.textContent=name;
        const sameAsOther=target===1&&selection[0]?.toLowerCase()===name.toLowerCase();
        const selected=selection[target]?.toLowerCase()===name.toLowerCase();
        if(selected)button.classList.add('selected');
        button.disabled=locked()||(counts[name]||0)<1||sameAsOther;
        if(sameAsOther)button.title='A Healing Potion needs one Moonleaf and one Clearwater.';
        choices.appendChild(button);
      });
      card.append(head,choices);
      return card;
    }

    function ensurePotionCard(){
      if(rendering||!overlay.classList.contains('show')||!selection.length)return;
      rendering=true;
      try{
        setPickerCopy(activeSlot===1?1:0);
        const existing=grid.querySelector(':scope > .hajjen-potion-force-card');
        if(existing)existing.replaceWith(buildPotionCard());
        else grid.appendChild(buildPotionCard());

        if(activeSlot===1){
          grid.querySelectorAll(':scope > .hajjen-ingredient-force-card:not(.hajjen-potion-force-card) .hajjen-ingredient-choice').forEach(button=>{
            button.disabled=true;
            button.title='Finish the Healing Potion recipe with the other potion ingredient.';
          });
        }
      }finally{rendering=false;}
    }

    function decorateSlots(){
      if(!selection.length)return;
      const slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot')];
      slots.forEach((slot,index)=>{
        const name=selection[index]||'';
        const current=slot.querySelector(':scope > em')?.textContent?.trim()||'';
        const alreadyPotion=slot.classList.contains('hajjen-potion-create-slot');
        if(alreadyPotion&&current===name)return;

        slot.classList.add('hajjen-potion-create-slot','hajjen-ingredient-slot-trigger');
        slot.classList.toggle('filled',!!name);
        slot.classList.toggle('waiting-for-first',index===1&&!selection[0]);
        slot.dataset.ingredientSlot=String(index);
        slot.setAttribute('role','button');
        slot.setAttribute('tabindex',index===1&&!selection[0]?'-1':'0');
        slot.setAttribute('aria-label',`Choose Ingredient ${index+1}`);
        slot.replaceChildren();

        if(name){
          const icon=document.createElement('img');
          icon.className='hajjen-selected-potion-ingredient-icon';
          icon.src=PICKER_ICON;icon.alt='';icon.draggable=false;
          const label=document.createElement('strong');label.textContent=`INGREDIENT ${index+1}`;
          const type=document.createElement('span');type.textContent='POTION INGREDIENT';
          const value=document.createElement('em');value.textContent=name;
          const action=document.createElement('span');action.className='hajjen-ingredient-slot-action';action.textContent='CLICK TO CHANGE';
          slot.append(icon,label,type,value,action);
        }else{
          const label=document.createElement('strong');label.textContent=`INGREDIENT ${index+1}`;
          const type=document.createElement('span');type.textContent='POTION RECIPE';
          const value=document.createElement('em');value.textContent='';
          const action=document.createElement('span');action.className='hajjen-ingredient-slot-action';action.textContent='CLICK TO CHOOSE';
          slot.append(label,type,value,action);
        }
      });
    }

    function decoratePreview(){
      if(!selection.length)return;
      const ready=pairReady();
      const expected=ready?'MOONLEAF + CLEARWATER':`${selection.length} / 2 INGREDIENTS`;
      const current=preview.querySelector(':scope > p')?.textContent?.trim()||'';
      if(!preview.classList.contains('hajjen-potion-preview')||current!==expected){
        preview.classList.add('hajjen-potion-preview');
        preview.innerHTML=`
          <img class="hajjen-potion-result-icon" src="${POTION_ICON}" alt="" draggable="false">
          <div><span>RESULT</span><strong>HEALING POTION</strong></div>
          <p>${expected}</p>
          <small>${ready?'Creates one Healing Potion and adds it directly to the Action Bar.':'Choose one Moonleaf and one Clearwater to complete the recipe.'}</small>`;
      }
      createBtn.textContent='CREATE POTION';
      createBtn.disabled=!ready||locked();
      createBtn.removeAttribute('data-sbv2-upgrade-blocked');
    }

    function syncPotionUi(){
      syncFromV6();
      if(!selection.length)return;
      decorateSlots();
      decoratePreview();
      if(overlay.classList.contains('show'))ensurePotionCard();
    }

    function scheduleBurst(){
      queueMicrotask(syncPotionUi);
      requestAnimationFrame(syncPotionUi);
      setTimeout(syncPotionUi,30);
      setTimeout(syncPotionUi,100);
    }

    function openPotionPicker(slotIndex){
      syncFromV6();
      if(!selection.length||(slotIndex===1&&!selection[0]))return;
      activeSlot=slotIndex;
      v2.openPicker?.(0);
      setPickerCopy(slotIndex);
      ensurePotionCard();
      requestAnimationFrame(()=>{setPickerCopy(slotIndex);ensurePotionCard();});
      setTimeout(()=>{setPickerCopy(slotIndex);ensurePotionCard();},35);
    }

    function choosePotion(name){
      const value=canonical(name);
      if(!isPotion(value)||locked())return;
      const counts=availableCounts();
      if((counts[value]||0)<1)return;
      const slot=activeSlot===1?1:0;
      if(slot===0){selection=[value];}
      else{
        if(!selection[0]||selection[0].toLowerCase()===value.toLowerCase())return;
        selection[1]=value;
      }
      activeSlot=null;
      v2.closePicker?.();
      scheduleBurst();
    }

    function removeOne(name){
      if(!Array.isArray(state.potionIngredients))return false;
      const index=state.potionIngredients.findIndex(item=>clean(typeof item==='string'?item:item?.name).toLowerCase()===name.toLowerCase());
      if(index<0)return false;
      state.potionIngredients.splice(index,1);
      return true;
    }

    function persist(){
      try{
        const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
        saved.potion=Math.max(0,Number(state.potion)||0);
        saved.potionIngredients=Array.isArray(state.potionIngredients)?[...state.potionIngredients]:[];
        saved.zone3ExtraPotionCrafted=!!state.zone3ExtraPotionCrafted;
        saved.zone3ExtraPotionCrafts=Math.max(0,Number(state.zone3ExtraPotionCrafts)||0);
        localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
      }catch{}
    }

    function feedback(){
      const log=document.getElementById('eventLog');
      if(log){
        const row=document.createElement('div');row.className='event reward';
        row.textContent='Moonleaf + Clearwater crafted into one Healing Potion. Added directly to the Action Bar.';
        log.prepend(row);while(log.children.length>9)log.lastChild.remove();
      }
      const area=document.getElementById('toastArea');
      if(area){
        const toast=document.createElement('div');toast.className='toast reward';toast.textContent='HEALING POTION CREATED';
        area.prepend(toast);setTimeout(()=>toast.remove(),1800);
      }
    }

    function syncActionBar(){
      window.HAJJEN_SHARED_UI?.sync?.();
      window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
      const count=Math.max(0,Number(state.potion)||0);
      const heal=Math.max(30,Number(window.HAJJEN_ZONE3_POTION_HEAL?.amount||cfg.potionHeal)||45);
      const use=document.getElementById('usePotionBtn');
      if(use){
        use.disabled=count<1||Number(state.hp)>=Number(state.maxHp)||!!state.combat||!!state.gameOver;
        const strong=use.querySelector('strong'),small=use.querySelector('small');
        if(strong&&small){strong.textContent='HEALING POTION';small.textContent=`${count} left · +${heal} HP`;}
        else use.textContent=`USE POTION · ${count} LEFT`;
      }
      const combat=document.getElementById('combatPotionBtn');
      if(combat&&!state.combat)combat.textContent=`USE POTION · ${count} LEFT`;
    }

    function craftPotion(){
      if(!pairReady()||locked())return false;
      const counts=availableCounts();
      if(!RECIPE.every(name=>(counts[name]||0)>0))return false;
      RECIPE.forEach(removeOne);
      state.potion=Math.max(0,Number(state.potion)||0)+1;
      state.zone3ExtraPotionCrafted=true;
      state.zone3ExtraPotionCrafts=Math.max(0,Number(state.zone3ExtraPotionCrafts)||0)+1;
      selection=[];
      activeSlot=null;
      persist();
      feedback();
      v6.clearSelection?.();
      api.render?.();
      syncActionBar();
      queueMicrotask(()=>v6.sync?.());
      return true;
    }

    /* Slot clicks in potion mode are intercepted before V2/V6. This removes the
       race entirely: only one layer decides which slot the picker is editing. */
    document.addEventListener('click',event=>{
      const target=event.target;
      if(!(target instanceof Element))return;

      syncFromV6();

      const create=target.closest('[data-sbv2-create]');
      if(create===createBtn&&selection.length){
        if(pairReady()){
          event.preventDefault();
          event.stopImmediatePropagation();
          craftPotion();
        }
        return;
      }

      const potionChoice=target.closest('.hajjen-potion-ingredient-choice');
      if(potionChoice&&overlay.contains(potionChoice)&&selection.length){
        event.preventDefault();
        event.stopImmediatePropagation();
        choosePotion(potionChoice.dataset.potionIngredient||potionChoice.textContent);
        return;
      }

      const slot=target.closest('#spellbookModal .sbv2-create-slot');
      if(slot&&createSlots.contains(slot)&&selection.length){
        const index=Number(slot.dataset.ingredientSlot);
        if(index===0||index===1){
          event.preventDefault();
          event.stopImmediatePropagation();
          openPotionPicker(index);
        }
        return;
      }

      /* Clicking a normal Primal choice while editing Ingredient 1 exits potion
         mode and returns ownership to the established spell picker. */
      const normalChoice=target.closest('.hajjen-ingredient-choice:not(.hajjen-potion-ingredient-choice)');
      if(normalChoice&&overlay.contains(normalChoice)&&activeSlot===0&&selection.length){
        selection=[];
        activeSlot=null;
        v6.clearSelection?.();
      }
    },true);

    document.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      const target=event.target;
      if(!(target instanceof Element))return;
      syncFromV6();
      const slot=target.closest('#spellbookModal .sbv2-create-slot');
      if(!slot||!createSlots.contains(slot)||!selection.length)return;
      const index=Number(slot.dataset.ingredientSlot);
      if(index!==0&&index!==1)return;
      event.preventDefault();event.stopImmediatePropagation();
      openPotionPicker(index);
    },true);

    const gridObserver=new MutationObserver(()=>{
      if(rendering||!selection.length||!overlay.classList.contains('show'))return;
      requestAnimationFrame(()=>{
        if(!selection.length||!overlay.classList.contains('show'))return;
        setPickerCopy(activeSlot===1?1:0);
        ensurePotionCard();
      });
    });
    gridObserver.observe(grid,{childList:true,subtree:false});

    /* V6 owns the first potion selection. Once that happens, keep the visible
       two-slot UI stable even if one of the older decoration observers repaints. */
    const keepAlive=setInterval(()=>{
      syncFromV6();
      if(selection.length)syncPotionUi();
    },120);

    marker.version='7.0-deterministic-two-slot';
    marker.getSelection=()=>[...selection];
    marker.openPicker=openPotionPicker;
    marker.craftPotion=craftPotion;
    marker.sync=syncPotionUi;
    marker.gridObserver=gridObserver;
    marker.keepAlive=keepAlive;
  }

  boot();
})();
