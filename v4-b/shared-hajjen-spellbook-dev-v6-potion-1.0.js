/* HAJJEN Zone 3 DEV — Spellbook V6 potion integration.
   Retires Backpack in DEV and folds Healing Potion crafting into the existing
   two-ingredient Spellbook flow without replacing normal spell crafting.

   Rules:
   - Primal + Primal continues through the existing Spellbook craft pipeline.
   - Moonleaf + Clearwater creates one Healing Potion (either order).
   - Mixed Primal/Potion pairs are not allowed.
   - Crafted potions go straight to the existing Action Bar potion count.

   V6.1 fixes two DEV integration issues:
   - Removes any stale/duplicate ingredient-picker overlay so only one picker opens.
   - Reconciles collected Moonleaf/Clearwater from live state, completed board
     entities and the event log, so already-collected potion ingredients remain selectable.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state||window.HAJJEN_SPELLBOOK_DEV_V6_POTION)return;

  const RECIPE=['Moonleaf','Clearwater'];
  const PICKER_ICON='assets/potion_ingredients_moonleaf_clearwater.webp';
  const POTION_ICON='assets/action-bar-icons/healing-potion.png';
  const SAVE_KEY='hajjen-v4b-campaign';
  let attempts=0;

  function boot(){
    const api=window.HAJJEN_SHARED_SPELLBOOK_V2;
    const pickerApi=window.HAJJEN_SPELLBOOK_DEV_V2;
    const root=api?.root;
    const modal=document.getElementById('spellbookModal');
    const createSection=root?.querySelector('.sbv2-create-section');
    const createSlots=root?.querySelector('[data-sbv2-create-slots]');
    const sourcePicker=root?.querySelector('[data-sbv2-create-picker]');
    const preview=root?.querySelector('[data-sbv2-preview]');
    const createBtn=root?.querySelector('[data-sbv2-create]');
    const overlay=pickerApi?.overlay||modal?.querySelector('.hajjen-ingredient-picker-overlay');
    const grid=overlay?.querySelector('[data-picker-grid]');
    const pickerTitle=overlay?.querySelector('#hajjenIngredientPickerTitle');
    const pickerSubtitle=overlay?.querySelector('[data-picker-subtitle]');
    if(!api||!root||!modal||!createSection||!createSlots||!sourcePicker||!preview||!createBtn||!overlay||!grid){
      if(attempts++<180)setTimeout(boot,25);
      return;
    }

    let potionSelection=[];
    let forcedPickerTarget=null;
    let syncing=false;
    let syncQueued=false;

    const clean=value=>String(value||'').trim();
    const potionList=()=>Array.isArray(state.potionIngredients)?state.potionIngredients:[];
    const ingredientName=item=>typeof item==='string'?item:clean(item?.name);
    const canonicalName=name=>RECIPE.find(item=>item.toLowerCase()===clean(name).toLowerCase())||clean(name);
    const isPotionName=name=>RECIPE.some(item=>item.toLowerCase()===clean(name).toLowerCase());
    const pairReady=()=>potionSelection.length===2&&RECIPE.every(required=>potionSelection.some(name=>name.toLowerCase()===required.toLowerCase()));
    const locked=()=>!!state.combat||!!state.gameOver||!!state.zoneCleared;

    function dedupePickers(){
      [...modal.querySelectorAll('.hajjen-ingredient-picker-overlay')].forEach(candidate=>{
        if(candidate!==overlay)candidate.remove();
      });
    }

    function countDirectPotionIngredients(){
      const counts=new Map(RECIPE.map(name=>[name,0]));
      potionList().forEach(item=>{
        const name=canonicalName(ingredientName(item));
        if(counts.has(name))counts.set(name,(counts.get(name)||0)+1);
      });
      return counts;
    }

    function countCompletedBoardIngredients(){
      const counts=new Map(RECIPE.map(name=>[name,0]));
      const entities=window.HAJJEN_ZONE3_ENTITY_MAP;
      if(!(entities instanceof Map))return counts;
      entities.forEach(entity=>{
        if(!entity?.completed||entity.type!=='potion-ingredient')return;
        const name=canonicalName(entity.name);
        if(counts.has(name))counts.set(name,(counts.get(name)||0)+1);
      });
      return counts;
    }

    function countCollectedLogIngredients(){
      const counts=new Map(RECIPE.map(name=>[name,0]));
      const log=document.getElementById('eventLog');
      if(!log)return counts;
      [...log.children].forEach(row=>{
        const text=clean(row.textContent).toLowerCase();
        RECIPE.forEach(name=>{
          if(text.includes('collected potion ingredient')&&text.includes(name.toLowerCase())){
            counts.set(name,(counts.get(name)||0)+1);
          }
        });
      });
      return counts;
    }

    function potionCounts(){
      const direct=countDirectPotionIngredients();
      const board=countCompletedBoardIngredients();
      const logged=countCollectedLogIngredients();
      const crafts=Math.max(0,Number(state.zone3ExtraPotionCrafts)||0);
      const counts=new Map();

      RECIPE.forEach(name=>{
        const directCount=direct.get(name)||0;
        const observed=Math.max(board.get(name)||0,logged.get(name)||0);
        const observedRemaining=Math.max(0,observed-crafts);
        counts.set(name,Math.max(directCount,observedRemaining));
      });
      return counts;
    }

    function potionTotal(){return [...potionCounts().values()].reduce((sum,count)=>sum+count,0);}

    function sourceButtons(){return [...sourcePicker.querySelectorAll(':scope > .sbv2-pick')];}
    function sourceData(){
      return sourceButtons().map((button,index)=>({
        index,
        button,
        selectedOrder:Number.parseInt(button.querySelector(':scope > span')?.textContent||'',10)||0
      }));
    }
    function clearSpellSelection(){
      for(let guard=0;guard<4;guard++){
        const selected=sourceData().filter(item=>item.selectedOrder>0).sort((a,b)=>b.selectedOrder-a.selectedOrder)[0];
        if(!selected)break;
        if(selected.button.disabled)break;
        selected.button.click();
      }
    }
    function hasSpellSelection(){return sourceData().some(item=>item.selectedOrder>0);}

    function retireBackpack(){
      document.body.classList.add('hajjen-backpack-retired-dev');
      document.querySelector('.shared-utility-hud .backpack-open,.utility-hud .backpack-open')?.remove();
      document.getElementById('backpackModal')?.remove();
      /* Zone 3's old potion crafting panel was moved through Backpack. Once the
         Backpack is retired it has no remaining purpose in the DEV layout. */
      document.querySelector('.campaign-system-hud')?.remove();
      if(window.HAJJEN_SHARED_UTILITY?.buttons)window.HAJJEN_SHARED_UTILITY.buttons.backpack=null;
    }

    function setPermanentCopy(){
      const heading=createSection.querySelector('.sbv2-section-heading h4');
      if(heading)heading.textContent='CREATE SPELL / CREATE POTION';
      const small=createSection.querySelector('.sbv2-section-heading small');
      if(small)small.textContent=`${sourceButtons().length+potionTotal()} AVAILABLE`;
      const copy=createSection.querySelector('.sbv2-section-copy');
      if(copy)copy.textContent='Choose two collected ingredients. Primal Force pairs create spells; Moonleaf + Clearwater creates a Healing Potion.';
      const kicker=overlay.querySelector('.hajjen-ingredient-picker-header small');
      if(kicker)kicker.textContent='CREATE SPELL / POTION';
    }

    function pickerTarget(){
      if(forcedPickerTarget===0||forcedPickerTarget===1)return forcedPickerTarget;
      const match=/INGREDIENT\s+([12])/i.exec(pickerTitle?.textContent||'');
      return match?Number(match[1])-1:0;
    }

    function closePicker(){
      pickerApi?.closePicker?.();
      forcedPickerTarget=null;
    }

    function renderPotionPicker(){
      dedupePickers();
      if(!overlay.classList.contains('show'))return;
      grid.querySelector(':scope > .hajjen-potion-force-card')?.remove();

      const target=pickerTarget();
      const counts=potionCounts();
      const total=[...counts.values()].reduce((sum,count)=>sum+count,0);
      const card=document.createElement('section');
      card.className='hajjen-ingredient-force-card hajjen-potion-force-card';

      const head=document.createElement('div');
      head.className='hajjen-ingredient-force-head';
      const icon=document.createElement('img');
      icon.src=PICKER_ICON;icon.alt='';icon.draggable=false;
      const labels=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent='POTION';
      const count=document.createElement('span');count.textContent=`${total} AVAILABLE`;
      labels.append(strong,count);head.append(icon,labels);

      const choices=document.createElement('div');
      choices.className='hajjen-ingredient-force-choices';
      RECIPE.forEach(name=>{
        const available=counts.get(name)||0;
        const button=document.createElement('button');
        button.type='button';
        button.className='hajjen-ingredient-choice hajjen-potion-ingredient-choice';
        button.dataset.potionIngredient=name;
        button.textContent=available>1?`${name} ×${available}`:name;

        const selectedHere=potionSelection[target]?.toLowerCase()===name.toLowerCase();
        const other=target===0?1:0;
        const selectedOther=potionSelection[other]?.toLowerCase()===name.toLowerCase();
        const recipeMismatch=target===1&&potionSelection[0]&&potionSelection[0].toLowerCase()===name.toLowerCase();
        if(selectedHere)button.classList.add('selected');
        button.disabled=locked()||available<1||recipeMismatch||(selectedOther&&available<2);
        if(recipeMismatch)button.title='A Healing Potion needs one Moonleaf and one Clearwater.';
        button.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          choosePotion(name,target);
        });
        choices.appendChild(button);
      });

      if(total===0){
        const empty=document.createElement('div');
        empty.className='hajjen-ingredient-force-empty';
        empty.textContent='Collect Moonleaf and Clearwater on the board.';
        choices.appendChild(empty);
      }

      card.append(head,choices);
      grid.appendChild(card);

      /* If Ingredient 1 is a potion ingredient, Ingredient 2 must finish the
         potion recipe. Disable Primal choices rather than allowing mixed pairs. */
      if(target===1&&potionSelection[0]){
        [...grid.querySelectorAll(':scope > .hajjen-ingredient-force-card:not(.hajjen-potion-force-card) .hajjen-ingredient-choice')].forEach(button=>{
          button.disabled=true;
          button.title='Finish the Healing Potion recipe with the other potion ingredient.';
        });
        if(pickerTitle)pickerTitle.textContent='CHOOSE INGREDIENT 2';
        if(pickerSubtitle)pickerSubtitle.textContent='Choose the other potion ingredient to complete Moonleaf + Clearwater.';
      }
    }

    function choosePotion(name,target){
      if(locked())return;
      const canonical=canonicalName(name);
      if(!isPotionName(canonical))return;
      const counts=potionCounts();
      if((counts.get(canonical)||0)<1)return;

      clearSpellSelection();
      if(target===0){
        potionSelection=[canonical];
      }else{
        if(!potionSelection[0])return;
        if(potionSelection[0].toLowerCase()===canonical.toLowerCase())return;
        potionSelection[1]=canonical;
      }
      closePicker();
      scheduleSync();
    }

    function clearPotionSelection(){
      if(!potionSelection.length)return;
      potionSelection=[];
      forcedPickerTarget=null;
      scheduleSync();
    }

    function decoratePotionSlots(){
      if(!potionSelection.length)return;
      const slots=[...createSlots.querySelectorAll(':scope > .sbv2-create-slot')];
      slots.forEach((slot,index)=>{
        slot.classList.toggle('filled',!!potionSelection[index]);
        slot.classList.add('hajjen-potion-create-slot');
        slot.classList.toggle('waiting-for-first',index===1&&!potionSelection[0]);
        slot.dataset.ingredientSlot=String(index);
        slot.setAttribute('role','button');
        slot.setAttribute('tabindex',index===1&&!potionSelection[0]?'-1':'0');
        slot.setAttribute('aria-label',`Choose Ingredient ${index+1}`);

        const name=potionSelection[index];
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
          const value=document.createElement('em');value.textContent='NOT SELECTED';
          const action=document.createElement('span');action.className='hajjen-ingredient-slot-action';action.textContent='CLICK TO CHOOSE';
          slot.append(label,type,value,action);
        }
      });

      const swap=createSlots.querySelector('.hajjen-spell-swap');
      if(swap){
        swap.disabled=potionSelection.length!==2;
        swap.title=potionSelection.length===2?'Swap the two potion ingredients.':'Choose both ingredients first.';
      }
    }

    function renderPotionPreview(){
      if(!potionSelection.length)return;
      const ready=pairReady();
      preview.classList.add('hajjen-potion-preview');
      preview.innerHTML=`
        <img class="hajjen-potion-result-icon" src="${POTION_ICON}" alt="" draggable="false">
        <div><span>RESULT</span><strong>HEALING POTION</strong></div>
        <p>${ready?'MOONLEAF + CLEARWATER':`${potionSelection.length} / 2 INGREDIENTS`}</p>
        <small>${ready?'Creates one Healing Potion and adds it directly to the Action Bar.':'Choose one Moonleaf and one Clearwater to complete the recipe.'}</small>`;
      createBtn.textContent='CREATE POTION';
      createBtn.disabled=!ready||locked();
      createBtn.removeAttribute('data-sbv2-upgrade-blocked');
    }

    function restoreSpellMode(){
      preview.classList.remove('hajjen-potion-preview');
      createSlots.querySelectorAll('.hajjen-potion-create-slot').forEach(slot=>slot.classList.remove('hajjen-potion-create-slot'));
      createBtn.textContent='CREATE SPELL';
    }

    function removeOnePotionIngredient(name){
      const index=potionList().findIndex(item=>ingredientName(item).toLowerCase()===name.toLowerCase());
      if(index>=0)potionList().splice(index,1);
      return index>=0;
    }

    function persistPotionState(){
      try{
        const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
        saved.potion=state.potion;
        saved.potionIngredients=potionList();
        saved.zone3ExtraPotionCrafted=!!state.zone3ExtraPotionCrafted;
        saved.zone3ExtraPotionCrafts=Math.max(0,Number(state.zone3ExtraPotionCrafts)||0);
        localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
      }catch{}
    }

    function syncPotionActionBar(){
      window.HAJJEN_SHARED_UI?.sync?.();
      window.HAJJEN_SHARED_ACTION_BAR?.sync?.();
      const count=Math.max(0,Number(state.potion)||0);
      const heal=Math.max(30,Number(window.HAJJEN_ZONE3_POTION_HEAL?.amount||cfg.potionHeal)||45);
      const use=document.getElementById('usePotionBtn');
      if(use){
        use.disabled=count<1||Number(state.hp)>=Number(state.maxHp)||!!state.combat||!!state.gameOver;
        const strong=use.querySelector('strong');
        const small=use.querySelector('small');
        if(strong&&small){strong.textContent='HEALING POTION';small.textContent=`${count} left · +${heal} HP`;}
        else use.textContent=`USE POTION · ${count} LEFT`;
        use.setAttribute('aria-label',`Healing Potion, ${count} left, restores ${heal} HP`);
      }
      const combat=document.getElementById('combatPotionBtn');
      if(combat&&!state.combat)combat.textContent=`USE POTION · ${count} LEFT`;
    }

    function addFeedback(){
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

    function craftPotion(){
      if(!pairReady()||locked())return false;
      if(!RECIPE.every(name=>(potionCounts().get(name)||0)>0))return false;
      RECIPE.forEach(removeOnePotionIngredient);
      state.potion=Math.max(0,Number(state.potion)||0)+1;
      state.zone3ExtraPotionCrafted=true;
      state.zone3ExtraPotionCrafts=(Number(state.zone3ExtraPotionCrafts)||0)+1;
      potionSelection=[];
      persistPotionState();
      addFeedback();
      api.render?.();
      syncPotionActionBar();
      scheduleSync();
      return true;
    }

    /* Potion crafting must win before the base CREATE SPELL click handler when
       potion mode is active. Capture phase leaves normal spell clicks untouched. */
    createBtn.addEventListener('click',event=>{
      if(!potionSelection.length)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      craftPotion();
    },true);

    /* Selecting a normal Primal choice while editing Ingredient 1 switches back
       to the original Spell workflow. */
    grid.addEventListener('click',event=>{
      const choice=event.target instanceof Element?event.target.closest('.hajjen-ingredient-choice'):null;
      if(!choice||choice.classList.contains('hajjen-potion-ingredient-choice'))return;
      if(potionSelection.length)clearPotionSelection();
    },true);

    /* V2's picker intentionally blocks Ingredient 2 until its own hidden Primal
       slot 1 is selected. Potion mode has its own selection state, so intercept
       only that one case and reuse the same overlay in a forced slot-2 mode. */
    createSlots.addEventListener('click',event=>{
      const slot=event.target instanceof Element?event.target.closest('.sbv2-create-slot'):null;
      if(!slot||!createSlots.contains(slot))return;
      const index=Number(slot.dataset.ingredientSlot);
      if(index===0){forcedPickerTarget=0;return;}
      if(index===1&&potionSelection[0]&&!hasSpellSelection()){
        event.preventDefault();
        event.stopImmediatePropagation();
        forcedPickerTarget=1;
        pickerApi?.openPicker?.(0);
        queueMicrotask(()=>{
          dedupePickers();
          if(pickerTitle)pickerTitle.textContent='CHOOSE INGREDIENT 2';
          if(pickerSubtitle)pickerSubtitle.textContent='Choose the other potion ingredient to complete Moonleaf + Clearwater.';
          renderPotionPicker();
        });
      }
    },true);

    createSlots.addEventListener('keydown',event=>{
      if(!['Enter',' '].includes(event.key))return;
      const slot=event.target instanceof Element?event.target.closest('.sbv2-create-slot'):null;
      if(!slot)return;
      const index=Number(slot.dataset.ingredientSlot);
      if(index===1&&potionSelection[0]&&!hasSpellSelection()){
        event.preventDefault();event.stopImmediatePropagation();
        forcedPickerTarget=1;
        pickerApi?.openPicker?.(0);
        queueMicrotask(()=>{dedupePickers();renderPotionPicker();});
      }
    },true);

    createSlots.addEventListener('click',event=>{
      const swap=event.target instanceof Element?event.target.closest('.hajjen-spell-swap'):null;
      if(!swap||potionSelection.length!==2)return;
      event.preventDefault();event.stopImmediatePropagation();
      potionSelection=[potionSelection[1],potionSelection[0]];
      scheduleSync();
    },true);

    function syncAll(){
      syncQueued=false;
      if(syncing)return;
      syncing=true;
      try{
        dedupePickers();
        retireBackpack();
        setPermanentCopy();
        if(potionSelection.length){
          decoratePotionSlots();
          renderPotionPreview();
        }else{
          restoreSpellMode();
        }
        renderPotionPicker();
      }finally{syncing=false;}
    }
    function scheduleSync(){if(syncQueued)return;syncQueued=true;queueMicrotask(syncAll);}

    new MutationObserver(scheduleSync).observe(createSlots,{childList:true,subtree:false});
    new MutationObserver(scheduleSync).observe(sourcePicker,{childList:true,subtree:false});
    new MutationObserver(scheduleSync).observe(overlay,{attributes:true,attributeFilter:['class']});
    new MutationObserver(scheduleSync).observe(modal,{attributes:true,attributeFilter:['class']});
    const eventLog=document.getElementById('eventLog');
    if(eventLog)new MutationObserver(scheduleSync).observe(eventLog,{childList:true,subtree:false});

    dedupePickers();
    retireBackpack();
    syncAll();
    requestAnimationFrame(syncAll);

    window.HAJJEN_SPELLBOOK_DEV_V6_POTION={
      version:'6.1',
      get selection(){return [...potionSelection];},
      get hasFirst(){return !!potionSelection[0];},
      get available(){return Object.fromEntries(potionCounts());},
      clearSelection:clearPotionSelection,
      craftPotion,
      sync:syncAll
    };
  }

  boot();
})();