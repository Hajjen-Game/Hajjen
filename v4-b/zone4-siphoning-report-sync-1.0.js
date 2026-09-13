/* HAJJEN Zone 4 DEV — present buffed Siphoning correctly in Event Log/report.
   Gameplay healing remains owned by zone4-enchantment-buffs-1.0.js.
   This module changes text only; no HP/combat state is mutated. */
(()=>{
  if(window.HAJJEN_ZONE4_SIPHONING_REPORT_SYNC)return;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const eventLog=document.getElementById('eventLog');
  if(!state||!eventLog)return;

  function ids(spell){
    return Array.isArray(spell?.enchantments)
      ?spell.enchantments.map(item=>typeof item==='string'?item:item?.id).filter(Boolean)
      :[];
  }
  function zone4Ids(spell){
    return Array.isArray(spell?.enchantments)
      ?spell.enchantments.filter(item=>typeof item==='object'&&item?.sourceZone===4).map(item=>item.id).filter(Boolean)
      :[];
  }
  function displayedSiphoning(){
    const spell=(state.spells||[]).find(item=>zone4Ids(item).includes('siphoning'));
    if(!spell)return null;
    const all=ids(spell),z4=zone4Ids(spell);
    if(z4.includes('stabilized'))return 40;
    if(all.includes('stabilized'))return 30;
    return 20;
  }

  /* Run-report wraps eventLog.prepend before this script loads. By correcting
     the node before forwarding it, both the visible Event Log and the exported
     report record the same buffed value. */
  const downstreamPrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    const wanted=displayedSiphoning();
    if(wanted){
      for(const node of nodes){
        if(!(node instanceof Element))continue;
        if(/^Siphoning restored \d+ HP\.$/i.test((node.textContent||'').trim())){
          node.textContent=`Siphoning restored ${wanted} HP.`;
        }
      }
    }
    return downstreamPrepend(...nodes);
  };

  function onBuff(event){
    const detail=event.detail||{};
    if(Number(detail.zone)!==4)return;
    const total=Math.max(0,Number(detail.total)||0);
    if(!total)return;

    const row=[...(eventLog.children||[])].find(node=>/^Siphoning restored \d+ HP\.$/i.test((node.textContent||'').trim()));
    if(row)row.textContent=`Siphoning restored ${total} HP.`;

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
  window.HAJJEN_ZONE4_SIPHONING_REPORT_SYNC={version:'1.1-visible-log-sync',onBuff,displayedSiphoning};
})();
