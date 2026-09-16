/* HAJJEN Zone 4 DEV — recovery + build-aware active expedition guard.
   F5/reopen on the same build keeps the active expedition. A new DEV build
   stamp discards only the Active Expedition; the permanent DEV profile (gear,
   talents, secured Essence and progression) is kept.

   The build stamp is fetched synchronously and cache-busted because this guard
   must run before zone4-save-expedition restores any saved run state. */
(()=>{
  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  if(!dev)return;

  const ACTIVE_KEY='hajjen-v4b-zone4-dev-active-expedition-v1';
  const BUILD_KEY='hajjen-v4b-zone4-dev-active-build-v1';
  const MIGRATION_KEY='hajjen-v4b-zone4-dev-recovery-1352';

  function currentBuildId(){
    try{
      const xhr=new XMLHttpRequest();
      xhr.open('GET',`zone4-dev-build-stamp.txt?t=${Date.now()}`,false);
      xhr.setRequestHeader('Cache-Control','no-cache');
      xhr.send(null);
      if((xhr.status>=200&&xhr.status<300)||xhr.status===0){
        const value=String(xhr.responseText||'').trim();
        if(value)return value;
      }
    }catch{}
    return document.querySelector('meta[name="hajjen-build"]')?.content?.trim()||'';
  }

  const buildId=currentBuildId();
  let previousBuild='';
  let buildReset=false;
  try{
    previousBuild=localStorage.getItem(BUILD_KEY)||'';
    if(buildId&&previousBuild!==buildId){
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
    try{localStorage.setItem(MIGRATION_KEY,'1');if(buildId)localStorage.setItem(BUILD_KEY,buildId);}catch{}
  }

  window.HAJJEN_ZONE4_DEV_BUILD_SAVE_GUARD={
    version:'1.1-no-cache-stamp',buildId,previousBuild,reset:buildReset,activeKey:ACTIVE_KEY,buildKey:BUILD_KEY
  };

  if(buildReset){
    setTimeout(()=>{
      const toastArea=document.getElementById('toastArea');
      if(toastArea){
        const row=document.createElement('div');row.className='toast reward';row.textContent='NEW BUILD · FRESH EXPEDITION';toastArea.prepend(row);setTimeout(()=>row.remove(),2200);
      }
      const eventLog=document.getElementById('eventLog');
      if(eventLog){
        const row=document.createElement('div');row.className='event system';row.textContent=`DEV build changed${previousBuild?` (${previousBuild} → ${buildId})`:''}. Old active expedition discarded; permanent profile kept.`;eventLog.prepend(row);while(eventLog.children.length>9)eventLog.lastChild.remove();
      }
    },180);
  }
})();
