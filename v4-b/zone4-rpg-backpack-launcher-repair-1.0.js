/* HAJJEN Zone 4 DEV — keep the RPG Backpack launcher present after async UI promotion. */
(()=>{
  const zone=()=>Number(window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||0);
  const isZone4Dev=()=>zone()===4&&!!(
    window.HAJJEN_ZONE4_DEV_MODE||
    window.HAJJEN_ZONE4_DEV_REQUESTED||
    document.documentElement?.dataset?.hajjenDev==='zone4'||
    new URLSearchParams(location.search).get('dev')==='1'
  );

  let queued=false;
  function openBackpack(){
    window.HAJJEN_ZONE4_RPG_BACKPACK?.render?.();
    document.getElementById('backpackModal')?.classList.add('show');
  }

  function ensure(){
    if(!isZone4Dev())return;
    const utility=document.querySelector('.shared-utility-hud,.utility-hud');
    if(!utility)return;

    let button=utility.querySelector(':scope > .backpack-open,:scope > [data-utility-action="backpack"]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='backpack-open';
      const help=utility.querySelector(':scope > .help-open,:scope > [data-utility-action="help"]');
      utility.insertBefore(button,help||null);
    }

    button.classList.add('backpack-open');
    button.dataset.utilityAction='backpack';
    button.setAttribute('aria-label','BACKPACK');
    button.hidden=false;
    button.style.removeProperty('display');
    if(!button.querySelector('.hajjen-utility-vector-content'))button.textContent='BACKPACK';
    if(button.dataset.zone4RpgLauncherBound!=='1'){
      button.dataset.zone4RpgLauncherBound='1';
      button.addEventListener('click',openBackpack);
    }

    window.HAJJEN_VECTOR_UTILITY_REPAIR?.repair?.();
  }

  function queue(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;ensure();});
  }

  const observer=new MutationObserver(queue);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('hajjen-ui-redesign-promoted',()=>setTimeout(ensure,0));
  document.addEventListener('DOMContentLoaded',ensure,{once:true});
  [0,100,350,800,1600,3000].forEach(delay=>setTimeout(ensure,delay));

  window.HAJJEN_ZONE4_RPG_BACKPACK_LAUNCHER_REPAIR={version:'1.0-persistent-launcher',ensure,observer};
})();
