/* HAJJEN Zone 4 DEV — one-time recovery for the broken pre-1.351 restart save.
   A failed expedition from the old restart race could survive in localStorage
   and immediately re-lock movement on every normal-browser load. Preserve the
   permanent DEV profile, but discard only that stale failed Active Expedition. */
(()=>{
  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  if(!dev)return;

  const ACTIVE_KEY='hajjen-v4b-zone4-dev-active-expedition-v1';
  const MIGRATION_KEY='hajjen-v4b-zone4-dev-recovery-1352';
  try{
    if(localStorage.getItem(MIGRATION_KEY)==='1')return;
    const saved=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null');
    if(saved?.run?.gameOver===true){
      localStorage.removeItem(ACTIVE_KEY);
      try{sessionStorage.setItem('hajjen-v4b-zone4-dev-restart-pending-v1','1');}catch{}
    }
    localStorage.setItem(MIGRATION_KEY,'1');
  }catch{
    try{localStorage.setItem(MIGRATION_KEY,'1');}catch{}
  }
})();
