(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state)return;

  const zoneSystem=document.getElementById('zoneSystem');
  const eventLog=document.getElementById('eventLog');
  const toastArea=document.getElementById('toastArea');
  if(!zoneSystem||!eventLog||!toastArea)return;

  const recipe=(cfg.potionIngredients||[]).map(item=>item.name).filter(Boolean);
  if(recipe.length<2)return;

  let crafted=false;
  let rendering=false;

  function hasIngredient(name){
    return state.potionIngredients.includes(name);
  }

  function recipeReady(){
    return recipe.every(hasIngredient);
  }

  function removeOne(name){
    const index=state.potionIngredients.indexOf(name);
    if(index>=0)state.potionIngredients.splice(index,1);
  }

  function addLog(text,type='reward'){
    const row=document.createElement('div');
    row.className=`event ${type}`;
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  function addToast(text,type='reward'){
    const row=document.createElement('div');
    row.className=`toast ${type}`;
    row.textContent=text;
    toastArea.prepend(row);
    setTimeout(()=>row.remove(),1700);
  }

  function syncPotionButtons(){
    const use=document.getElementById('usePotionBtn');
    if(use){
      use.textContent=`USE POTION · ${state.potion} LEFT`;
      use.disabled=state.potion<1||state.hp>=state.maxHp||state.combat||state.gameOver;
    }
    const combat=document.getElementById('combatPotionBtn');
    if(combat){
      combat.textContent=`USE POTION · ${state.potion} LEFT`;
      combat.disabled=state.potion<1||state.hp>=state.maxHp||state.gameOver;
    }
  }

  function craftPotion(){
    if(crafted||state.combat||state.gameOver||state.zoneCleared||!recipeReady())return;
    recipe.forEach(removeOne);
    state.potion++;
    crafted=true;
    state.zone3ExtraPotionCrafted=true;
    state.zone3ExtraPotionCrafts=(state.zone3ExtraPotionCrafts||0)+1;
    addToast('HEALING POTION CREATED','reward');
    addLog('Zone 3: Moonleaf + Clearwater crafted into one additional Healing Potion.','reward');
    syncPotionButtons();
    render(true);
  }

  function render(force=false){
    if(rendering)return;
    const collected=recipe.map(name=>hasIngredient(name)?name:'—').join(' + ');
    const ready=recipeReady();
    const signature=[crafted?1:0,collected,ready?1:0,state.combat?1:0,state.gameOver?1:0,state.zoneCleared?1:0].join('|');
    const panel=zoneSystem.querySelector('[data-zone3-potion-panel="1"]');
    if(!force&&panel&&zoneSystem.dataset.zone3PotionSignature===signature)return;

    rendering=true;
    try{
      zoneSystem.dataset.zone3ExtraPotion='1';
      zoneSystem.dataset.zone3PotionSignature=signature;
      zoneSystem.innerHTML=`
        <div data-zone3-potion-panel="1">
          <p class="resources">Extra Potion Recipe: <strong>${recipe.join(' + ')}</strong></p>
          <p class="resources">Collected: <strong>${crafted?'USED':collected}</strong></p>
          <div class="buttons"><button id="zone3CraftPotionBtn" ${crafted||!ready||state.combat||state.gameOver||state.zoneCleared?'disabled':''}>${crafted?'HEALING POTION CREATED':'CREATE HEALING POTION'}</button></div>
          <p class="resources">One additional Healing Potion can be crafted in Zone 3.</p>
        </div>`;
      document.getElementById('zone3CraftPotionBtn')?.addEventListener('click',craftPotion);
    }finally{
      rendering=false;
    }
  }

  new MutationObserver(()=>{
    if(rendering)return;
    queueMicrotask(()=>render(false));
  }).observe(zoneSystem,{childList:true,subtree:true});

  render(true);
  syncPotionButtons();

  window.HAJJEN_ZONE3_EXTRA_POTION={
    version:'1.0',
    recipe:[...recipe],
    get crafted(){return crafted;},
    sync:()=>render(true)
  };
})();
