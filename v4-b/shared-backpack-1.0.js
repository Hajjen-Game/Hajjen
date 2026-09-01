(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG||{};
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  if(!zone||!state)return;

  const $=id=>document.getElementById(id);
  const modal=$('backpackModal');
  const openButton=document.querySelector('.backpack-open');
  const potionButton=zone===1?$('restBtn'):$('usePotionBtn');
  if(!modal||!openButton||!potionButton)return;

  const card=modal.querySelector('.modal-card');
  const heading=card?.querySelector('.modal-heading');
  const body=heading?.nextElementSibling;
  if(!card||!heading||!body)return;

  const oldZoneSystem=zone===2?(document.querySelector('.backpack-zone-system')||$('zoneSystem')):null;
  const title=heading.querySelector('h2');
  if(title)title.textContent=config.text?.backpack||'BACKPACK';

  modal.classList.add('shared-backpack-modal');
  body.className='shared-backpack-body';
  body.replaceChildren();

  const grid=document.createElement('div');
  grid.className='backpack-grid shared-backpack-grid';

  const potionItem=document.createElement('div');
  potionItem.className='backpack-item shared-backpack-item shared-backpack-potion';
  potionItem.innerHTML='<strong>HEALING POTION</strong><span id="backpackPotionText"></span><button id="backpackUsePotion" type="button">USE POTION</button>';
  grid.appendChild(potionItem);

  const spellIngredients=document.createElement('div');
  spellIngredients.className=`backpack-item shared-backpack-item${zone===1?' backpack-resources shared-backpack-wide':''}`;
  spellIngredients.innerHTML=zone===1
    ?'<strong>INGREDIENTS</strong><span id="backpackIngredients">None</span>'
    :'<strong>SPELL INGREDIENTS</strong><span id="backpackSpellIngredients">None</span>';
  grid.appendChild(spellIngredients);

  if(zone===2){
    const potionIngredients=document.createElement('div');
    potionIngredients.className='backpack-item shared-backpack-item';
    potionIngredients.innerHTML='<strong>POTION INGREDIENTS</strong><span id="backpackPotionIngredients">None</span>';
    grid.appendChild(potionIngredients);

    const recipe=document.createElement('div');
    recipe.className='backpack-item backpack-resources potion-crafting-slot shared-backpack-item shared-backpack-wide shared-backpack-recipe';
    recipe.innerHTML='<strong>HEALING POTION RECIPE</strong><span>Moonleaf + Clearwater</span><div id="potionCraftMount" class="shared-backpack-craft-mount"></div>';
    grid.appendChild(recipe);
    if(oldZoneSystem){
      oldZoneSystem.classList.add('backpack-zone-system','shared-backpack-zone-system');
      recipe.querySelector('#potionCraftMount')?.appendChild(oldZoneSystem);
    }
  }

  body.appendChild(grid);

  const spellIngredientList=()=>zone===1?(state.ingredients||[]):(state.spellIngredients||[]);
  const potionIngredientList=()=>zone===2?(state.potionIngredients||[]):[];
  const ingredientName=item=>typeof item==='string'?item:item?.name||String(item||'');
  const spellIngredientText=()=>{
    const list=spellIngredientList();
    return list.length?list.map(item=>{
      if(typeof item==='string')return item;
      return item?.force?`${item.name} (${item.force})`:ingredientName(item);
    }).join(' · '):'None';
  };
  const potionIngredientText=()=>{
    const list=potionIngredientList();
    return list.length?list.map(ingredientName).join(' · '):'None';
  };

  function sync(){
    const potionCount=Math.max(0,Number(state.potion)||0);
    const potionText=$('backpackPotionText');
    if(potionText)potionText.textContent=`${potionCount} left · +30 HP`;

    const usePotion=$('backpackUsePotion');
    if(usePotion){
      const stateDisabled=potionCount<1||Number(state.hp)>=Number(state.maxHp)||!!state.combat||!!state.gameOver;
      usePotion.disabled=!!potionButton.disabled||stateDisabled;
      usePotion.setAttribute('aria-label',`Healing Potion, ${potionCount} left, restores 30 HP`);
    }

    if(zone===1){
      const ingredients=$('backpackIngredients');
      if(ingredients)ingredients.textContent=spellIngredientText();
    }else{
      const spellIngredients=$('backpackSpellIngredients');
      if(spellIngredients)spellIngredients.textContent=spellIngredientText();
      const potionIngredients=$('backpackPotionIngredients');
      if(potionIngredients)potionIngredients.textContent=potionIngredientText();
    }
  }

  $('backpackUsePotion')?.addEventListener('click',()=>{
    potionButton.click();
    queueMicrotask(sync);
  });

  openButton.addEventListener('click',()=>queueMicrotask(sync));

  new MutationObserver(()=>queueMicrotask(sync)).observe(potionButton,{attributes:true,childList:true,subtree:true,characterData:true,attributeFilter:['disabled']});

  const spellSource=zone===1?$('ingredients'):$('spellIngredientText')||$('spellResources');
  if(spellSource)new MutationObserver(()=>queueMicrotask(sync)).observe(spellSource,{childList:true,subtree:true,characterData:true});
  if(oldZoneSystem)new MutationObserver(()=>queueMicrotask(sync)).observe(oldZoneSystem,{childList:true,subtree:true,characterData:true});

  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    if(event.target.closest('#craftPotionBtn,#usePotionBtn,#restBtn,#combatPotionBtn'))queueMicrotask(sync);
  },true);

  sync();

  window.HAJJEN_SHARED_BACKPACK={
    zone,
    root:modal,
    body,
    sync
  };
})();
