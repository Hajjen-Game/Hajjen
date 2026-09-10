/* HAJJEN Spellbook production Create Spell UX — Zones 1–3. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone||(zone===3&&params.get('dev')==='1'))return;
  if(window.HAJJEN_SPELLBOOK_PRODUCTION_CREATE_UX)return;

  const forceIcons={Growth:'assets/ingredient_growth.webp',Ember:'assets/ingredient_ember.webp',Flow:'assets/ingredient_flow.webp',Stone:'assets/ingredient_stone.webp',Gale:'assets/ingredient_gale.webp',Aether:'assets/ingredient_aether.webp'};
  const spellIcons={
    'ember bolt':'assets/action-bar-icons/ember-bolt.png','cinder burst':'assets/action-bar-icons/cinder-burst.png','thorn bloom':'assets/action-bar-icons/thorn-bloom.png',
    'tide lash':'assets/action-bar-icons/tide-lash.png','stone breaker':'assets/action-bar-icons/stone-breaker.png','razor gust':'assets/action-bar-icons/razor-gust.png','rift pulse':'assets/action-bar-icons/rift-pulse.png'
  };

  let attempts=0;
  function boot(){
    const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
    const root=api?.root;
    const createSlots=root?.querySelector('[data-sbv2-create-slots]');
    const sourcePicker=root?.querySelector('[data-sbv2-create-picker]');
    const preview=root?.querySelector('[data-sbv2-preview]');
    if(!root||!createSlots||!sourcePicker||!preview){if(attempts++<120)setTimeout(boot,25);return;}

    function sourceButtons(){return [...sourcePicker.querySelectorAll(':scope > .sbv2-pick')];}
    function sourceData(){return sourceButtons().map((button,index)=>({index,button,name:button.querySelector('strong')?.textContent?.trim()||`Ingredient ${index+1}`,force:button.querySelector('small')?.textContent?.trim()||'',selectedOrder:Number.parseInt(button.querySelector(':scope > span')?.textContent||'',10)||0,disabled:button.disabled}));}
    function selectedMap(){const data=sourceData();return {slot1:data.find(item=>item.selectedOrder===1)?.index ?? null,slot2:data.find(item=>item.selectedOrder===2)?.index ?? null};}
    function clickSource(index){if(index==null)return;const button=sourceButtons()[index];if(button&&!button.disabled)button.click();}

    function swapIngredients(){
      const current=selectedMap();if(current.slot1==null||current.slot2==null)return;
      const first=current.slot1,second=current.slot2;
      clickSource(second);clickSource(first);clickSource(second);clickSource(first);queueMicrotask(syncAll);
    }

    function ensureSwapControl(){
      const plus=createSlots.querySelector(':scope > .sbv2-plus');if(!plus)return;
      let button=plus.querySelector(':scope > .hajjen-spell-swap');
      if(!button){
        plus.textContent='';const symbol=document.createElement('span');symbol.className='hajjen-spell-plus-symbol';symbol.textContent='+';
        button=document.createElement('button');button.type='button';button.className='hajjen-spell-swap';button.textContent='SWAP';
        button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();swapIngredients();});plus.append(symbol,button);
      }
      const selected=selectedMap(),shouldDisable=selected.slot1==null||selected.slot2==null;
      if(button.disabled!==shouldDisable)button.disabled=shouldDisable;
      const nextTitle=shouldDisable?'Choose both ingredients first.':'Swap Ingredient 1 and Ingredient 2.';if(button.title!==nextTitle)button.title=nextTitle;
    }

    function decorateSelectedSlots(){
      const data=sourceData(),selected=selectedMap(),indexes=[selected.slot1,selected.slot2],slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot')];
      slots.forEach((slot,slotIndex)=>{
        const item=indexes[slotIndex]==null?null:data.find(entry=>entry.index===indexes[slotIndex]);
        let icon=slot.querySelector(':scope > .hajjen-selected-force-icon');let forceName=slot.querySelector(':scope > .hajjen-selected-force-name');
        if(!item||!forceIcons[item.force]){icon?.remove();forceName?.remove();slot.classList.remove('hajjen-has-force-icon');return;}
        slot.classList.add('hajjen-has-force-icon');
        if(!icon){icon=document.createElement('img');icon.className='hajjen-selected-force-icon';icon.alt='';icon.draggable=false;slot.prepend(icon);}
        const expected=forceIcons[item.force];if(icon.getAttribute('src')!==expected)icon.src=expected;
        if(!forceName){forceName=document.createElement('span');forceName.className='hajjen-selected-force-name';const em=slot.querySelector(':scope > em');if(em)slot.insertBefore(forceName,em);else slot.appendChild(forceName);}
        const next=item.force.toUpperCase();if(forceName.textContent!==next)forceName.textContent=next;
      });
    }

    function decoratePreview(){
      const title=preview.querySelector(':scope > div strong')?.textContent?.trim()||'',file=spellIcons[title.toLowerCase()];
      let icon=preview.querySelector(':scope > .hajjen-spell-result-icon');
      if(!file){icon?.remove();preview.classList.remove('hajjen-has-result-icon');return;}
      preview.classList.add('hajjen-has-result-icon');
      if(!icon){icon=document.createElement('img');icon.className='hajjen-spell-result-icon';icon.alt='';icon.draggable=false;preview.prepend(icon);}
      if(icon.getAttribute('src')!==file)icon.src=file;
    }

    let queued=false;function syncAll(){queued=false;ensureSwapControl();decorateSelectedSlots();decoratePreview();}
    function schedule(){if(queued)return;queued=true;queueMicrotask(syncAll);}
    new MutationObserver(schedule).observe(createSlots,{childList:true,subtree:false});
    new MutationObserver(schedule).observe(sourcePicker,{childList:true,subtree:false});
    new MutationObserver(schedule).observe(preview,{childList:true,subtree:false});
    syncAll();requestAnimationFrame(syncAll);
    window.HAJJEN_SPELLBOOK_PRODUCTION_CREATE_UX={version:'1.0',swapIngredients,sync:syncAll};
  }
  boot();
})();