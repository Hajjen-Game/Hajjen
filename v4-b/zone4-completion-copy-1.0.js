/* Zone 4 terminal copy patch. Legacy campaign core still says Zones 1–3. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const toastArea=document.getElementById('toastArea');
  if(!cfg||cfg.zone!==4||!state||!toastArea)return;

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      if(/^ZONES 1[–-]3 COMPLETE$/i.test((node.textContent||'').trim()))node.textContent='ZONE 4 COMPLETE';
    }
  });
  observer.observe(toastArea,{childList:true});
  window.HAJJEN_ZONE4_COMPLETION_COPY={version:'1.0',observer};
})();
