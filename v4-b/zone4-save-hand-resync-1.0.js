/* HAJJEN Zone 4 — save/resume Hand UI resync.
   The production Hand is a visual proxy over the real Enchantment/Tactical
   controls. On fast reloads it can render before Active Expedition restore has
   reapplied run-local card state, leaving desktop proxy buttons stale. This
   bridge only asks the existing owners to resync after restore/UI promotion. */
(()=>{
  if(window.HAJJEN_ZONE4_SAVE_HAND_RESYNC)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(Number(cfg?.zone)!==4)return;

  let raf=0;
  function sync(){
    raf=0;
    window.HAJJEN_ZONE4_ENCHANTMENTS?.sync?.();
    window.HAJJEN_SHARED_HAND?.sync?.();
    window.HAJJEN_ZONE4_TACTICAL_HAND?.sync?.();
    window.HAJJEN_ZONE4_TACTICAL_COMBAT?.sync?.();
    requestAnimationFrame(()=>window.HAJJEN_HAND_LIST_PRODUCTION?.render?.());
  }
  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(sync);
  }

  [0,80,220,600,1400].forEach(delay=>setTimeout(schedule,delay));
  window.addEventListener('pageshow',schedule);
  document.addEventListener('hajjen-ui-redesign-promoted',schedule);
  document.addEventListener('hajjen:enchantment-applied',schedule);
  document.addEventListener('hajjen:enchantment-replaced',schedule);
  document.addEventListener('hajjen:tactical-used',schedule);
  document.addEventListener('hajjen:tactical-replaced',schedule);

  window.HAJJEN_ZONE4_SAVE_HAND_RESYNC={version:'1.0-post-restore-proxy-sync',sync:schedule};
})();
