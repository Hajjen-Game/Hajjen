/* HAJJEN production Backpack retirement — Zones 1–3.
   Keeps the legacy Backpack DOM available for compatibility, but removes its
   utility button from the visible/focusable production UI. Also mounts the
   individual Moonleaf/Clearwater artwork binder for Zones that use Potion ingredients. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=Number(window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:0));
  if(!zone||(zone===3&&params.get('dev')==='1'))return;
  if(window.HAJJEN_BACKPACK_RETIRED_PRODUCTION)return;

  function retire(){
    const button=document.querySelector('.backpack-open');
    if(button){
      button.style.setProperty('display','none','important');
      button.setAttribute('aria-hidden','true');
      button.setAttribute('tabindex','-1');
    }

    const modal=document.getElementById('backpackModal');
    if(modal){
      modal.style.setProperty('display','none','important');
      modal.setAttribute('aria-hidden','true');
    }
  }

  function loadPotionIngredientArtwork(){
    const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
    if(!Array.isArray(cfg?.potionIngredients)||!cfg.potionIngredients.length)return;

    if(!document.querySelector('link[data-hajjen-potion-ingredient-icons]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='shared-hajjen-potion-ingredient-icons-1.0.css?v=4';
      link.dataset.hajjenPotionIngredientIcons='1';
      document.head.appendChild(link);
    }

    if(!document.querySelector('script[data-hajjen-potion-ingredient-icons]')){
      const script=document.createElement('script');
      script.src='shared-hajjen-potion-ingredient-icons-1.0.js?v=3';
      script.dataset.hajjenPotionIngredientIcons='1';
      document.body.appendChild(script);
    }else{
      window.HAJJEN_POTION_INGREDIENT_ICONS?.sync?.();
    }
  }

  retire();
  loadPotionIngredientArtwork();
  const observer=new MutationObserver(retire);
  observer.observe(document.body,{childList:true,subtree:true});

  window.HAJJEN_BACKPACK_RETIRED_PRODUCTION={version:'1.4-potion-board-clean',sync(){retire();loadPotionIngredientArtwork();},observer};
})();