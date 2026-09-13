/* HAJJEN Zone 4 DEV — keep Siphoning telemetry aligned with the buffed heal.
   Gameplay healing is owned by zone4-enchantment-buffs-1.0.js; this file only
   corrects the already-recorded run-report text after the Zone 4 delta lands. */
(()=>{
  if(window.HAJJEN_ZONE4_SIPHONING_REPORT_SYNC)return;

  function onBuff(event){
    const detail=event.detail||{};
    if(Number(detail.zone)!==4)return;
    const total=Math.max(0,Number(detail.total)||0);
    if(!total)return;

    const api=window.HAJJEN_V4B_ZONE4_RUN_REPORT;
    const events=api?.run?.events;
    if(!Array.isArray(events))return;

    for(let i=events.length-1;i>=0;i--){
      const item=events[i];
      if(item?.kind!=='LOG')continue;
      if(/^Siphoning restored \d+ HP\.$/i.test(item.text||'')){
        item.text=`Siphoning restored ${total} HP.`;
        break;
      }
    }
  }

  document.addEventListener('hajjen:zone4-siphoning-buffed',onBuff);
  window.HAJJEN_ZONE4_SIPHONING_REPORT_SYNC={version:'1.0',onBuff};
})();
