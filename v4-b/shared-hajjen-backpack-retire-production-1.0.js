/* HAJJEN production Backpack retirement — Zones 1–3.
   Keeps the legacy Backpack DOM available for compatibility, but removes its
   utility button from the visible/focusable production UI. */
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

  retire();
  const observer=new MutationObserver(retire);
  observer.observe(document.body,{childList:true,subtree:true});

  window.HAJJEN_BACKPACK_RETIRED_PRODUCTION={version:'1.0',sync:retire,observer};
})();
