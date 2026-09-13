/* HAJJEN Zone 4 — XP safety bridge.
   Some moving/adjacent Zone 4 encounters can complete without the legacy core
   carrying the encounter XP through. This bridge only fills a missing XP delta;
   if core already awarded the expected XP it adds nothing. */
(()=>{
  if(window.HAJJEN_ZONE4_XP_SAFETY)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(Number(cfg?.zone)!==4||!state||!(entities instanceof Map))return;

  const knownCompleted=new Set();
  const idOf=e=>`${e?.spawned?'spawn':'fixed'}:${e?.type||''}:${e?.title||''}:${Number(e?.zone4MobileIndex??-1)}`;
  const expectedXp=e=>Math.max(0,Number(e?.xp)||({mob:40,elite:62,boss:140}[e?.type]||0));
  const eligible=e=>e&&['mob','elite','boss'].includes(e.type);
  entities.forEach(e=>{if(eligible(e)&&e.completed)knownCompleted.add(idOf(e));});

  let lastXp=Math.max(0,Number(state.xp)||0);
  let timer=0;
  function tick(){
    const before=Math.max(0,Number(lastXp)||0);
    const now=Math.max(0,Number(state.xp)||0);
    const newly=[];
    entities.forEach(e=>{
      if(!eligible(e)||!e.completed)return;
      const id=idOf(e);if(knownCompleted.has(id))return;
      knownCompleted.add(id);newly.push(e);
    });
    if(newly.length){
      const expected=newly.reduce((sum,e)=>sum+expectedXp(e),0);
      const already=Math.max(0,now-before);
      const missing=Math.max(0,expected-already);
      if(missing>0){
        state.xp=now+missing;
        const names=newly.map(e=>e.title).join(', ');
        const log=document.getElementById('eventLog');
        if(log){const row=document.createElement('div');row.className='event reward';row.textContent=`XP +${missing}${names?` · ${names}`:''}.`;log.prepend(row);while(log.children.length>9)log.lastChild.remove();}
        window.HAJJEN_ZONE4_SYSTEM?.sync?.();
      }
    }
    lastXp=Math.max(0,Number(state.xp)||0);
  }

  timer=setInterval(tick,40);
  window.HAJJEN_ZONE4_XP_SAFETY={version:'1.0-missing-delta-only',tick,stop:()=>clearInterval(timer)};
})();