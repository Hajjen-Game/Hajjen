/* HAJJEN Spellbook production ingredient-picker UX — Zones 1–3.
   v1.1: the normal Primal picker becomes passive while the production Potion
   selector owns the Create area. This mirrors the stable DEV race-condition fix. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone||(zone===3&&params.get('dev')==='1'))return;
  if(window.HAJJEN_SPELLBOOK_PRODUCTION_PICKER)return;

  const modal=document.getElementById('spellbookModal');
  const card=modal?.querySelector(':scope > .modal-card');
  const root=modal?.querySelector('.shared-spellbook-v2');
  const createSection=root?.querySelector('.sbv2-create-section');
  const createSlots=root?.querySelector('[data-sbv2-create-slots]');
  const sourcePicker=root?.querySelector('[data-sbv2-create-picker]');
  const ingredientSection=root?.querySelector('.sbv2-ingredients-section');
  if(!modal||!card||!root||!createSection||!createSlots||!sourcePicker)return;

  modal.classList.add('hajjen-spellbook-dev-v2');
  card.classList.add('hajjen-spellbook-dev-v2-card');

  let topOrnament=card.querySelector(':scope > .hajjen-spellbook-top-ornament');
  if(!topOrnament){topOrnament=document.createElement('div');topOrnament.className='hajjen-spellbook-top-ornament';topOrnament.setAttribute('aria-hidden','true');card.prepend(topOrnament);}

  const forceOrder=['Growth','Ember','Flow','Stone','Gale','Aether'];
  const forceIcons={Growth:'assets/ingredient_growth.webp',Ember:'assets/ingredient_ember.webp',Flow:'assets/ingredient_flow.webp',Stone:'assets/ingredient_stone.webp',Gale:'assets/ingredient_gale.webp',Aether:'assets/ingredient_aether.webp'};

  const oldOverlay=modal.querySelector(':scope > .hajjen-ingredient-picker-overlay');
  oldOverlay?.remove();
  const overlay=document.createElement('div');
  overlay.className='hajjen-ingredient-picker-overlay';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`<div class="hajjen-ingredient-picker-panel" role="dialog" aria-modal="true" aria-labelledby="hajjenIngredientPickerTitle"><div class="hajjen-ingredient-picker-toprail" aria-hidden="true"></div><header class="hajjen-ingredient-picker-header"><div><small>CREATE SPELL</small><h3 id="hajjenIngredientPickerTitle">CHOOSE INGREDIENT</h3><p data-picker-subtitle>Select one collected ingredient.</p></div><button type="button" class="hajjen-ingredient-picker-close">× CLOSE</button></header><div class="hajjen-ingredient-picker-grid" data-picker-grid></div></div>`;
  modal.appendChild(overlay);

  const panel=overlay.querySelector('.hajjen-ingredient-picker-panel');
  const title=overlay.querySelector('#hajjenIngredientPickerTitle');
  const subtitle=overlay.querySelector('[data-picker-subtitle]');
  const grid=overlay.querySelector('[data-picker-grid]');
  const closeButton=overlay.querySelector('.hajjen-ingredient-picker-close');
  let targetSlot=0;

  function potionModeActive(){
    return !!window.HAJJEN_SPELLBOOK_PRODUCTION_POTION?.getSelection?.().length;
  }
  function sourceButtons(){return [...sourcePicker.querySelectorAll(':scope > .sbv2-pick')];}
  function sourceData(){return sourceButtons().map((button,index)=>({index,button,name:button.querySelector('strong')?.textContent?.trim()||`Ingredient ${index+1}`,force:button.querySelector('small')?.textContent?.trim()||'',selectedOrder:Number.parseInt(button.querySelector(':scope > span')?.textContent||'',10)||0,disabled:button.disabled}));}
  function selectedMap(){const data=sourceData();return {slot1:data.find(item=>item.selectedOrder===1)?.index ?? null,slot2:data.find(item=>item.selectedOrder===2)?.index ?? null};}
  function clickSource(index){const button=sourceButtons()[index];if(button&&!button.disabled)button.click();}

  function chooseForTarget(index){
    if(potionModeActive())return;
    const current=selectedMap();
    if(targetSlot===0){
      if(index===current.slot1){closePicker();return;}
      const old1=current.slot1,old2=current.slot2;
      if(old2!==null)clickSource(old2);if(old1!==null)clickSource(old1);clickSource(index);if(old2!==null&&old2!==index)clickSource(old2);
    }else{
      if(current.slot1===null||index===current.slot1)return;
      if(index===current.slot2){closePicker();return;}
      if(current.slot2!==null)clickSource(current.slot2);clickSource(index);
    }
    closePicker();queueMicrotask(decorateCreateArea);
  }

  function renderPicker(){
    const data=sourceData(),selected=selectedMap();grid.replaceChildren();
    forceOrder.forEach(force=>{
      const items=data.filter(item=>item.force.toLowerCase()===force.toLowerCase());
      const forceCard=document.createElement('section');forceCard.className=`hajjen-ingredient-force-card ${force.toLowerCase()}`;
      const head=document.createElement('div');head.className='hajjen-ingredient-force-head';
      const icon=document.createElement('img');icon.src=forceIcons[force];icon.alt='';icon.draggable=false;
      const labels=document.createElement('div');const strong=document.createElement('strong');strong.textContent=force.toUpperCase();const count=document.createElement('span');count.textContent=`${items.length} AVAILABLE`;labels.append(strong,count);head.append(icon,labels);
      const choices=document.createElement('div');choices.className='hajjen-ingredient-force-choices';
      if(!items.length){const empty=document.createElement('div');empty.className='hajjen-ingredient-force-empty';empty.textContent='None collected';choices.appendChild(empty);}
      else items.forEach(item=>{
        const button=document.createElement('button');button.type='button';button.className='hajjen-ingredient-choice';button.textContent=item.name;
        const isThis=(targetSlot===0&&item.index===selected.slot1)||(targetSlot===1&&item.index===selected.slot2);
        const usedOther=(targetSlot===0&&item.index===selected.slot2)||(targetSlot===1&&item.index===selected.slot1);
        if(isThis){button.classList.add('selected');button.title=`${item.name} is already selected for Ingredient ${targetSlot+1}.`;}
        if(usedOther){button.classList.add('used-other-slot');button.disabled=true;button.title=`Already used for Ingredient ${targetSlot===0?2:1}.`;}
        else if(item.disabled)button.disabled=true;
        button.addEventListener('click',()=>chooseForTarget(item.index));choices.appendChild(button);
      });
      forceCard.append(head,choices);grid.appendChild(forceCard);
    });
  }

  /* Potion mode calls openPicker(0) deliberately as a stable shell. Do not block
     this function itself; block only normal user-driven handlers/decorators. */
  function openPicker(slot){
    if(slot===1&&selectedMap().slot1===null)return;
    targetSlot=slot;title.textContent=`CHOOSE INGREDIENT ${slot+1}`;
    subtitle.textContent=slot===0?'Choose the ingredient that determines the spell’s Primal Force.':'Choose the second ingredient that modifies the spell.';
    const style=getComputedStyle(card);panel.style.setProperty('--hajjen-picker-bg-image',style.backgroundImage||'none');
    renderPicker();overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');requestAnimationFrame(()=>overlay.querySelector('button:not(:disabled)')?.focus?.({preventScroll:true}));
  }
  function closePicker(){overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');}

  function decorateCreateArea(){
    if(potionModeActive())return;
    const selection=selectedMap();const slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot')];
    slots.forEach((slot,index)=>{
      const waiting=index===1&&selection.slot1===null;slot.classList.add('hajjen-ingredient-slot-trigger');slot.dataset.ingredientSlot=String(index);slot.setAttribute('role','button');slot.setAttribute('tabindex',waiting?'-1':'0');slot.setAttribute('aria-label',`Choose Ingredient ${index+1}`);slot.classList.toggle('waiting-for-first',waiting);
      const actionText=waiting?'CHOOSE INGREDIENT 1 FIRST':'CLICK TO CHOOSE';let action=slot.querySelector(':scope > .hajjen-ingredient-slot-action');
      if(!action){action=document.createElement('span');action.className='hajjen-ingredient-slot-action';action.textContent=actionText;slot.appendChild(action);}else if(action.textContent!==actionText)action.textContent=actionText;
    });
    const headingSmall=createSection.querySelector('.sbv2-section-heading small');const headingText=`${sourceButtons().length} AVAILABLE`;if(headingSmall&&headingSmall.textContent!==headingText)headingSmall.textContent=headingText;
    const copy=createSection.querySelector('.sbv2-section-copy');const copyText='Choose Ingredient 1, then Ingredient 2. Click a slot to browse your collected ingredients by Primal Force.';if(copy&&copy.textContent!==copyText)copy.textContent=copyText;
  }

  createSlots.addEventListener('click',event=>{if(potionModeActive())return;const slot=event.target.closest('.sbv2-create-slot');if(!slot||!createSlots.contains(slot))return;const index=Number(slot.dataset.ingredientSlot);if(index===1&&selectedMap().slot1===null)return;openPicker(index);});
  createSlots.addEventListener('keydown',event=>{if(potionModeActive())return;if(!['Enter',' '].includes(event.key))return;const slot=event.target.closest('.sbv2-create-slot');if(!slot)return;event.preventDefault();const index=Number(slot.dataset.ingredientSlot);if(index===1&&selectedMap().slot1===null)return;openPicker(index);});
  closeButton.addEventListener('click',closePicker);overlay.addEventListener('click',event=>{if(event.target===overlay)closePicker();});

  let queued=false;function scheduleDecorate(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(potionModeActive())return;decorateCreateArea();if(overlay.classList.contains('show'))renderPicker();});}
  new MutationObserver(scheduleDecorate).observe(createSlots,{childList:true,subtree:true});
  new MutationObserver(scheduleDecorate).observe(sourcePicker,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class']});
  new MutationObserver(()=>{if(!modal.classList.contains('show'))closePicker();}).observe(modal,{attributes:true,attributeFilter:['class']});

  ingredientSection?.setAttribute('aria-hidden','true');decorateCreateArea();requestAnimationFrame(decorateCreateArea);
  window.HAJJEN_SPELLBOOK_PRODUCTION_PICKER={version:'1.1-potion-passive',modal,card,root,overlay,grid,openPicker,closePicker,sync:decorateCreateArea,renderPicker};
})();