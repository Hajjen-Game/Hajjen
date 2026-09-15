/* HAJJEN Zone 4 — keep the Spellbook craft button label aligned with the
   currently previewed result. Potion preview => CREATE POTION, spell preview => CREATE SPELL. */
(()=>{
  if(window.HAJJEN_ZONE4_SPELLBOOK_CREATE_LABEL_FIX)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(Number(cfg?.zone)!==4)return;

  let observer=null;
  let attempts=0;
  function boot(){
    const root=document.getElementById('spellbookModal');
    const preview=root?.querySelector('[data-sbv2-preview]');
    const button=root?.querySelector('[data-sbv2-create]');
    if(!root||!preview||!button){if(attempts++<240)setTimeout(boot,25);return;}

    function sync(){
      const result=(preview.querySelector('strong')?.textContent||'').trim().toUpperCase();
      const potion=result==='HEALING POTION';
      const wanted=potion?'CREATE POTION':'CREATE SPELL';
      if(button.textContent.trim()!==wanted)button.textContent=wanted;
    }

    observer=new MutationObserver(()=>queueMicrotask(sync));
    observer.observe(preview,{childList:true,subtree:true,characterData:true,attributes:true});
    observer.observe(button,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',()=>setTimeout(sync,0),true);
    sync();
    window.HAJJEN_ZONE4_SPELLBOOK_CREATE_LABEL_FIX={version:'1.0',sync,stop:()=>observer?.disconnect()};
  }
  boot();
})();
