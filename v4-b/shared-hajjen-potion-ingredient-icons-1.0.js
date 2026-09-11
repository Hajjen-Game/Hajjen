/* HAJJEN Moonleaf / Clearwater individual artwork binder — Zones 2–3 + Zone 3 DEV. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||!Array.isArray(cfg.potionIngredients)||!cfg.potionIngredients.length)return;
  if(window.HAJJEN_POTION_INGREDIENT_ICONS)return;

  const ICONS={
    Moonleaf:'assets/potion_ingredient_moonleaf.png?v=1',
    Clearwater:'assets/potion_ingredient_clearwater.png?v=1'
  };
  const byCoord=new Map(
    cfg.potionIngredients
      .filter(item=>item&&ICONS[item.name])
      .map(item=>[`${Number(item.row)},${Number(item.col)}`,item.name])
  );

  let queued=false;

  function syncBoard(){
    document.querySelectorAll('#campaignRoot .tile').forEach(tile=>{
      const name=byCoord.get(`${Number(tile.dataset.r)},${Number(tile.dataset.c)}`);
      if(!name||!ICONS[name])return;
      tile.dataset.potionIngredientName=name;
      tile.style.setProperty('--hajjen-potion-ingredient-icon',`url("${ICONS[name]}")`);
    });
  }

  function choiceName(button){
    const raw=button?.dataset?.potionIngredient||button?.textContent||'';
    const normalized=String(raw).trim().toLowerCase();
    return Object.keys(ICONS).find(name=>name.toLowerCase()===normalized)||null;
  }

  function syncPickerChoices(){
    document.querySelectorAll('#spellbookModal .hajjen-potion-ingredient-choice').forEach(button=>{
      const name=choiceName(button);
      if(!name)return;
      button.dataset.potionIngredientIcon=name;
      button.style.setProperty('--hajjen-potion-choice-icon',`url("${ICONS[name]}")`);
    });
  }

  function syncPickerHeader(){
    document.querySelectorAll('#spellbookModal .hajjen-potion-force-card .hajjen-ingredient-force-head').forEach(head=>{
      const labels=head.querySelector(':scope > div');
      if(!labels)return;
      const directImages=[...head.querySelectorAll(':scope > img')];
      let moon=directImages.find(img=>img.dataset.potionHeaderIngredient==='Moonleaf')||directImages[0]||null;
      if(!moon){moon=document.createElement('img');head.insertBefore(moon,labels);}
      moon.dataset.potionHeaderIngredient='Moonleaf';
      moon.classList.add('hajjen-potion-header-icon');
      moon.src=ICONS.Moonleaf;moon.alt='';moon.draggable=false;

      let water=directImages.find(img=>img.dataset.potionHeaderIngredient==='Clearwater')||head.querySelector(':scope > img[data-potion-header-ingredient="Clearwater"]');
      if(!water){water=document.createElement('img');head.insertBefore(water,labels);}
      water.dataset.potionHeaderIngredient='Clearwater';
      water.classList.add('hajjen-potion-header-icon');
      water.src=ICONS.Clearwater;water.alt='';water.draggable=false;

      [...head.querySelectorAll(':scope > img')].forEach(img=>{
        if(img!==moon&&img!==water)img.remove();
      });
    });
  }

  function syncSelectedSlots(){
    document.querySelectorAll('#spellbookModal .sbv2-create-slot.hajjen-potion-create-slot').forEach(slot=>{
      const name=String(slot.querySelector(':scope > em')?.textContent||'').trim();
      const icon=slot.querySelector(':scope > .hajjen-selected-potion-ingredient-icon');
      if(!icon||!ICONS[name])return;
      if(icon.getAttribute('src')!==ICONS[name])icon.src=ICONS[name];
      icon.dataset.potionIngredientIcon=name;
    });
  }

  function sync(){
    queued=false;
    syncBoard();
    syncPickerChoices();
    syncPickerHeader();
    syncSelectedSlots();
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  }

  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('hajjen-ui-redesign-promoted',schedule);

  sync();
  requestAnimationFrame(sync);
  setTimeout(sync,100);
  setTimeout(sync,500);

  window.HAJJEN_POTION_INGREDIENT_ICONS={version:'1.0',icons:{...ICONS},sync,observer};
})();
