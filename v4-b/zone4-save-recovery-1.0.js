/* HAJJEN Zone 4 DEV — recovery + build-aware active expedition guard.
   Same DEV build keeps the active expedition across F5/reopen.
   A new DEV build discards only the Active Expedition; the permanent DEV
   profile (gear, talents, secured Essence and progression) is kept. */
(()=>{
  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  if(!dev)return;

  const ACTIVE_KEY='hajjen-v4b-zone4-dev-active-expedition-v1';
  // v2 intentionally starts clean so browsers that got stuck on the older
  // build marker are forced through one deterministic cutover.
  const BUILD_KEY='hajjen-v4b-zone4-dev-active-build-v2';
  const MIGRATION_KEY='hajjen-v4b-zone4-dev-recovery-1352';
  const buildId=document.querySelector('meta[name="hajjen-build"]')?.content?.trim()||'zone4-dev-unknown';

  let previousBuild='';
  let buildReset=false;
  try{
    previousBuild=localStorage.getItem(BUILD_KEY)||'';
    if(previousBuild!==buildId){
      if(localStorage.getItem(ACTIVE_KEY)!==null){
        localStorage.removeItem(ACTIVE_KEY);
        buildReset=true;
      }
      localStorage.setItem(BUILD_KEY,buildId);
    }

    // Older one-time protection for the broken pre-1.351 failed-run record.
    if(localStorage.getItem(MIGRATION_KEY)!=='1'){
      const saved=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null');
      if(saved?.run?.gameOver===true){
        localStorage.removeItem(ACTIVE_KEY);
        try{sessionStorage.setItem('hajjen-v4b-zone4-dev-restart-pending-v1','1');}catch{}
      }
      localStorage.setItem(MIGRATION_KEY,'1');
    }
  }catch{
    try{
      localStorage.setItem(MIGRATION_KEY,'1');
      localStorage.setItem(BUILD_KEY,buildId);
    }catch{}
  }

  window.HAJJEN_ZONE4_DEV_BUILD_SAVE_GUARD={
    version:'1.2-meta-build-v2',buildId,previousBuild,reset:buildReset,activeKey:ACTIVE_KEY,buildKey:BUILD_KEY
  };

  if(buildReset){
    setTimeout(()=>{
      const toastArea=document.getElementById('toastArea');
      if(toastArea){
        const row=document.createElement('div');
        row.className='toast reward';
        row.textContent='NEW BUILD · FRESH EXPEDITION';
        toastArea.prepend(row);
        setTimeout(()=>row.remove(),2200);
      }
      const eventLog=document.getElementById('eventLog');
      if(eventLog){
        const row=document.createElement('div');
        row.className='event system';
        row.textContent=`DEV build changed${previousBuild?` (${previousBuild} → ${buildId})`:''}. Old active expedition discarded; permanent profile kept.`;
        eventLog.prepend(row);
        while(eventLog.children.length>9)eventLog.lastChild.remove();
      }
    },180);
  }
})();
