/* HAJJEN Zone 3 DEV — Fight Window V3 live info-frame persistence.
   Combat rewrites combatMessage.textContent after actions, which removes any
   child SVG. Re-attach the already-mounted V2 vector frame whenever that occurs. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  if((window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone)!==3)return;

  const message=document.getElementById('combatMessage');
  const v2=window.HAJJEN_FIGHT_WINDOW_DEV_V2;
  if(!message||!v2?.mounted?.length)return;

  const item=v2.mounted.find(entry=>entry?.target===message);
  if(!item?.svg)return;

  let queued=false;
  function ensureFrame(){
    queued=false;
    if(!message.contains(item.svg))message.prepend(item.svg);
    item.render?.();
  }
  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(ensureFrame);
  }

  const observer=new MutationObserver(schedule);
  observer.observe(message,{childList:true,subtree:false});

  ensureFrame();
  requestAnimationFrame(ensureFrame);

  window.HAJJEN_FIGHT_WINDOW_DEV_V3={version:'1.0',message,item,observer,sync:ensureFrame};
})();
