/* HAJJEN Spellbook production Potion integration — Zones 1–3.
   Backpack is retired visually by the promoted Potion CSS. Zones 2–3 can choose
   Moonleaf + Clearwater from the normal Spellbook ingredient picker and create
   a Healing Potion directly into the Action Bar. Existing hidden zone craft
   buttons remain the gameplay source of truth for objectives and one-use rules.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG||{};
  const zone=Number(cfg.zone||(window.HAJJEN_V4B_STATE?1:0));
  if(!zone||(zone===3&&params.get('dev')==='1')||window.HAJJEN_SPELLBOOK_PRODUCTION_POTION)return;

  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  if(!state)return;

  const marker={version:'1.1-loading',getSelection:()=>[]};
  window.HAJJEN_SPELLBOOK_PRODUCTION_POTION=marker;

  const recipe=(Array.isArray(cfg.potionIngredients)?cfg.potionIngredients:[])
    .map(item=>typeof item==='string'?item:item?.name).filter(Boolean);

  if(recipe.length<2){marker.version='1.1-no-recipe';marker.sync=()=>{};return;}

  const PICKER_ICON='assets/potion_ingredients_moonleaf_clearwater.webp';
  const POTION_ICON='assets/action-bar-icons/healing-potion.png';
  let attempts=0;

  function boot(){
    const picker=window.HAJJEN_SPELLBOOK_PRODUCTION_PICKER;
    const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
    const root=api?.root;
    const createSection=root?.querySelector('.sbv2-create-section');
    const createSlots=root?.querySelector('[data-sbv2-create-slots]');
    const sourcePicker=root?.querySelector('[data-sbv2-create-picker]');
    const preview=root?.querySelector('[data-sbv2-preview]');
    const createBtn=root?.querySelector('[data-sbv2-create]');
    const overlay=picker?.overlay;
    const grid=picker?.grid||overlay?.querySelector('[data-picker-grid]');
    if(!picker||!api||!root||!createSection||!createSlots||!sourcePicker||!preview||!createBtn||!overlay||!grid){
      if(attempts++<200)setTimeout(boot,25);
      return;
    }

    let selection=[];
    let activeSlot=0;
    let rendering=false;
    let queued=false;

    const clean=value=>String(value||'').trim();
    const itemName=item=>clean(typeof item==='string'?item:item?.name);
    const canonical=name=>recipe.find(item=>item.toLowerCase()===clean(name).toLowerCase())||clean(name);
    const isPotion=name=>recipe.some(item=>item.toLowerCase()===clean(name).toLowerCase());
    const locked=()=>!!state.combat||!!state.gameOver||!!state.zoneCleared;
    const pairReady=()=>selection.length===2&&recipe.every(name=>selection.some(item=>item.toLowerCase()===name.toLowerCase()));

    function sourceButtons(){return [...sourcePicker.querySelectorAll(':scope > .sbv2-pick')];}
    function normalSelected(){
      return sourceButtons().map((button,index)=>({button,index,order:Number.parseInt(button.querySelector(':scope > span')?.textContent||'',10)||0}))
        .filter(item=>item.order>0).sort((a,b)=>b.order-a.order);
    }
    function clearNormalSelection(){normalSelected().forEach(item=>{if(!item.button.disabled)item.button.click();});}

    function counts(){
      const list=Array.isArray(state.potionIngredients)?state.potionIngredients:[];
      const result={};
      recipe.forEach(name=>result[name]=list.filter(item=>itemName(item).toLowerCase()===name.toLowerCase()).length);
      return result;
    }
    function potionAvailable(){const c=counts();return recipe.reduce((sum,name)=>sum+(c[name]||0),0);}

    function setSectionCopy(){
      const heading=createSection.querySelector('.sbv2-section-heading strong');
      const count=createSection.querySelector('.sbv2-section-heading small');
      const copy=createSection.querySelector('.sbv2-section-copy');
      if(heading)heading.textContent='CREATE SPELL / CREATE POTION';
      if(count)count.textContent=`${sourceButtons().length+potionAvailable()} AVAILABLE`;
      if(copy)copy.textContent='Choose two collected ingredients. Primal Force pairs create spells; Moonleaf + Clearwater creates a Healing Potion.';
    }

    function setPickerCopy(slotIndex){
      const kicker=overlay.querySelector('.hajjen-ingredient-picker-header small');
      const title=overlay.querySelector('#hajjenIngredientPickerTitle');
      const subtitle=overlay.querySelector('[data-picker-subtitle]');
      if(kicker)kicker.textContent='CREATE SPELL / POTION';
      if(title)title.textContent=`CHOOSE INGREDIENT ${slotIndex+1}`;
      if(subtitle)subtitle.textContent=selection.length
        ?(slotIndex===1?'Choose the other potion ingredient to complete Moonleaf + Clearwater.':'Choose a Potion ingredient, or select a Primal ingredient to return to spell crafting.')
        :(slotIndex===0?'Choose a collected Primal or Potion ingredient.':'Choose the second ingredient.');
    }

    function cardSignature(){
      const c=counts();
      return [activeSlot,selection.join('|'),...recipe.map(name=>c[name]||0),locked()?1:0].join('::');
    }

    function buildPotionCard(signature){
      const c=counts(),target=activeSlot===1?1:0;
      const card=document.createElement('section');
      card.className='hajjen-ingredient-force-card hajjen-potion-force-card';
      card.dataset.productionPotionSignature=signature;

      const head=document.createElement('div');head.className='hajjen-ingredient-force-head';
      const icon=document.createElement('img');icon.src=PICKER_ICON;icon.alt='';icon.draggable=false;
      const labels=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent='POTION';
      const count=document.createElement('span');count.textContent=`${potionAvailable()} AVAILABLE`;
      labels.append(strong,count);head.append(icon,labels);

      const choices=document.createElement('div');choices.className='hajjen-ingredient-force-choices';
      recipe.forEach(name=>{
        const button=document.createElement('button');
        button.type='button';button.className='hajjen-ingredient-choice hajjen-potion-ingredient-choice';
        button.dataset.potionIngredient=name;button.textContent=name;
        const chosen=selection[target]?.toLowerCase()===name.toLowerCase();
        const usedOther=target===1&&selection[0]?.toLowerCase()===name.toLowerCase();
        if(chosen)button.classList.add('selected');
        button.disabled=locked()||(c[name]||0)<1||usedOther;
        if(usedOther)button.title='A Healing Potion needs one Moonleaf and one Clearwater.';
        button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();choosePotion(name);});
        choices.appendChild(button);
      });
      card.append(head,choices);
      return card;
    }

    function ensurePotionCard(){
      if(rendering||!overlay.classList.contains('show'))return;
      rendering=true;
      try{
        setPickerCopy(activeSlot);
        const signature=cardSignature();
        const existing=grid.querySelector(':scope > .hajjen-potion-force-card');
        if(!existing)grid.appendChild(buildPotionCard(signature));
        else if(existing.dataset.productionPotionSignature!==signature)existing.replaceWith(buildPotionCard(signature));
        if(selection.length&&activeSlot===1){
          grid.querySelectorAll(':scope > .hajjen-ingredient-force-card:not(.hajjen-potion-force-card) .hajjen-ingredient-choice').forEach(button=>{
            button.disabled=true;button.title='Finish the Healing Potion with the other Potion ingredient.';
          });
        }
      }finally{rendering=false;}
    }

    function fillSlot(slot,index,name){
      slot.classList.remove('waiting-for-first','hajjen-potion-slot-ready','hajjen-has-force-icon');
      slot.classList.add('hajjen-potion-create-slot','hajjen-ingredient-slot-trigger','filled');
      slot.dataset.ingredientSlot=String(index);slot.setAttribute('role','button');slot.setAttribute('tabindex','0');slot.setAttribute('aria-label',`Change Ingredient ${index+1}`);
      slot.replaceChildren();
      const icon=document.createElement('img');icon.className='hajjen-selected-potion-ingredient-icon';icon.src=PICKER_ICON;icon.alt='';icon.draggable=false;
      const label=document.createElement('strong');label.textContent=`INGREDIENT ${index+1}`;
      const type=document.createElement('span');type.textContent='POTION INGREDIENT';
      const value=document.createElement('em');value.textContent=name;
      const action=document.createElement('span');action.className='hajjen-ingredient-slot-action';action.textContent='CLICK TO CHANGE';
      slot.append(icon,label,type,value,action);
    }

    function readySecondSlot(slot){
      slot.classList.remove('waiting-for-first','filled','hajjen-has-force-icon');
      slot.classList.add('hajjen-potion-create-slot','hajjen-ingredient-slot-trigger','hajjen-potion-slot-ready');
      slot.dataset.ingredientSlot='1';slot.setAttribute('role','button');slot.setAttribute('tabindex','0');slot.setAttribute('aria-label','Choose Ingredient 2');
      slot.replaceChildren();
      const label=document.createElement('strong');label.textContent='INGREDIENT 2';
      const type=document.createElement('span');type.textContent='POTION INGREDIENT';
      const value=document.createElement('em');value.textContent='';
      const action=document.createElement('span');action.className='hajjen-ingredient-slot-action';action.textContent='CLICK TO CHOOSE';
      slot.append(label,type,value,action);
    }

    function decorateSlots(){
      if(!selection.length)return;
      const slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot')];
      if(slots.length<2)return;

      slots.forEach((slot,index)=>{
        const name=selection[index]||'';
        const current=slot.querySelector(':scope > em')?.textContent?.trim()||'';
        const icon=slot.querySelector(':scope > .hajjen-selected-potion-ingredient-icon');
        if(name){
          if(current!==name||!icon||!slot.classList.contains('hajjen-potion-create-slot'))fillSlot(slot,index,name);
          else{
            slot.classList.remove('waiting-for-first','hajjen-potion-slot-ready');
            if(!slot.classList.contains('filled'))slot.classList.add('filled');
            if(slot.getAttribute('tabindex')!=='0')slot.setAttribute('tabindex','0');
            if(icon.getAttribute('src')!==PICKER_ICON)icon.src=PICKER_ICON;
          }
          return;
        }

        if(index===1&&selection[0]){
          const action=slot.querySelector(':scope > .hajjen-ingredient-slot-action')?.textContent||'';
          const stable=slot.classList.contains('hajjen-potion-create-slot')&&slot.classList.contains('hajjen-potion-slot-ready')&&!slot.classList.contains('waiting-for-first')&&current===''&&action==='CLICK TO CHOOSE';
          if(!stable)readySecondSlot(slot);
          else if(slot.getAttribute('tabindex')!=='0')slot.setAttribute('tabindex','0');
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
        preview.innerHTML=`<img class="hajjen-potion-result-icon" src="${POTION_ICON}" alt="" draggable="false"><div><span>RESULT</span><strong>HEALING POTION</strong></div><p>${expected}</p><small>${ready?'Creates one Healing Potion and adds it directly to the Action Bar.':'Choose one Moonleaf and one Clearwater to complete the recipe.'}</small>`;
      }
      if(createBtn.textContent!=='CREATE POTION')createBtn.textContent='CREATE POTION';
      createBtn.disabled=!ready||locked();
      createBtn.removeAttribute('data-sbv2-upgrade-blocked');
    }

    function sync(){
      setSectionCopy();
      if(selection.length){decorateSlots();decoratePreview();}
      if(overlay.classList.contains('show'))ensurePotionCard();
    }
    function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}

    function openPotionPicker(slotIndex){
      if(!selection.length||(slotIndex===1&&!selection[0]))return;
      activeSlot=slotIndex;
      picker.openPicker?.(0);
      setPickerCopy(slotIndex);ensurePotionCard();
      requestAnimationFrame(()=>{setPickerCopy(slotIndex);ensurePotionCard();});
    }

    function choosePotion(name){
      const value=canonical(name),c=counts();
      if(!isPotion(value)||locked()||(c[value]||0)<1)return;
      const slot=activeSlot===1?1:0;
      if(slot===0){clearNormalSelection();selection=[value];}
      else{
        if(!selection[0]||selection[0].toLowerCase()===value.toLowerCase())return;
        selection[1]=value;
      }
      activeSlot=0;picker.closePicker?.();queueMicrotask(sync);requestAnimationFrame(sync);
    }

    function oldCraftButton(){
      if(zone===2)return document.getElementById('craftPotionBtn');
      if(zone===3){window.HAJJEN_ZONE3_EXTRA_POTION?.sync?.();return document.getElementById('zone3CraftPotionBtn');}
      return null;
    }

    function restoreNormal(){
      selection=[];activeSlot=0;picker.closePicker?.();api.render?.();
      queueMicrotask(()=>{picker.sync?.();window.HAJJEN_SPELLBOOK_PRODUCTION_CREATE_UX?.sync?.();window.HAJJEN_SPELLBOOK_PRODUCTION_UPGRADES?.syncCraftGuard?.();setSectionCopy();});
    }

    function craftPotion(){
      if(!pairReady()||locked())return false;
      const c=counts();if(!recipe.every(name=>(c[name]||0)>0))return false;
      const before=Number(state.potion)||0;
      const button=oldCraftButton();if(button&&!button.disabled)button.click();
      if((Number(state.potion)||0)<=before)return false;
      restoreNormal();
      window.HAJJEN_SHARED_UI?.sync?.();window.HAJJEN_SHARED_ACTION_BAR?.sync?.();window.HAJJEN_ACTION_BAR_PRODUCTION?.syncIcons?.();
      return true;
    }

    document.addEventListener('click',event=>{
      const target=event.target;if(!(target instanceof Element))return;
      const create=target.closest('[data-sbv2-create]');
      if(create===createBtn&&selection.length){event.preventDefault();event.stopImmediatePropagation();craftPotion();return;}

      const slot=target.closest('#spellbookModal .sbv2-create-slot');
      if(slot&&createSlots.contains(slot)){
        const index=Number(slot.dataset.ingredientSlot);
        if(index===0||index===1){
          activeSlot=index;
          if(selection.length){event.preventDefault();event.stopImmediatePropagation();openPotionPicker(index);return;}
          requestAnimationFrame(()=>{setPickerCopy(index);ensurePotionCard();});
        }
      }

      const normalChoice=target.closest('.hajjen-ingredient-choice:not(.hajjen-potion-ingredient-choice)');
      if(normalChoice&&overlay.contains(normalChoice)&&selection.length&&activeSlot===0){
        selection=[];
        queueMicrotask(()=>{api.render?.();picker.sync?.();window.HAJJEN_SPELLBOOK_PRODUCTION_CREATE_UX?.sync?.();setSectionCopy();});
      }
    },true);

    document.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      const target=event.target;if(!(target instanceof Element))return;
      const slot=target.closest('#spellbookModal .sbv2-create-slot');
      if(!slot||!createSlots.contains(slot))return;
      const index=Number(slot.dataset.ingredientSlot);if(index!==0&&index!==1)return;
      activeSlot=index;
      if(!selection.length){requestAnimationFrame(()=>{setPickerCopy(index);ensurePotionCard();});return;}
      event.preventDefault();event.stopImmediatePropagation();openPotionPicker(index);
    },true);

    const gridObserver=new MutationObserver(()=>{
      if(rendering||!overlay.classList.contains('show'))return;
      requestAnimationFrame(()=>{if(overlay.classList.contains('show'))ensurePotionCard();});
    });
    gridObserver.observe(grid,{childList:true,subtree:false});

    const createObserver=new MutationObserver(()=>{if(selection.length)schedule();});
    createObserver.observe(createSlots,{childList:true,subtree:true,attributes:true,attributeFilter:['class','tabindex']});

    setSectionCopy();requestAnimationFrame(setSectionCopy);
    const keepAlive=setInterval(()=>{setSectionCopy();if(selection.length)sync();else if(overlay.classList.contains('show'))ensurePotionCard();},220);

    marker.version='1.1-stable';
    marker.recipe=[...recipe];marker.getSelection=()=>[...selection];marker.openPicker=openPotionPicker;marker.craftPotion=craftPotion;marker.sync=sync;
    marker.gridObserver=gridObserver;marker.createObserver=createObserver;marker.keepAlive=keepAlive;
  }

  boot();
})();