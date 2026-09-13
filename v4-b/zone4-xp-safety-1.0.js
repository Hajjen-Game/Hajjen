/* HAJJEN Zone 4 — XP safety bridge.
   Zone 4 moving/adjacent encounters can bypass the legacy XP path. Hook the
   kill counters at the exact synchronous win point, then fill only any XP that
   core did not award by the following microtask. Restored kills are baseline
   only and never grant XP again. */
(()=>{
  if(window.HAJJEN_ZONE4_XP_SAFETY)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(Number(cfg?.zone)!==4||!state||!(entities instanceof Map))return;

  const seen=new WeakSet();
  const eligible=e=>e&&['mob','elite','boss'].includes(e.type);
  entities.forEach(e=>{if(eligible(e)&&e.completed)seen.add(e);});

  const fallbackXp={mob:40,elite:62,boss:140};
  const expectedXp=e=>Math.max(0,Number(e?.xp)||fallbackXp[e?.type]||0);

  function newlyCompleted(type,count){
    const found=[];
    entities.forEach(e=>{
      if(found.length>=count||!eligible(e)||e.type!==type||!e.completed||seen.has(e))return;
      seen.add(e);found.push(e);
    });
    return found;
  }

  function awardMissing(type,count,xpBefore){
    const defeated=newlyCompleted(type,count);
    const expected=defeated.length
      ?defeated.reduce((sum,e)=>sum+expectedXp(e),0)
      :Math.max(0,count)*(fallbackXp[type]||0);
    queueMicrotask(()=>{
      const now=Math.max(0,Number(state.xp)||0);
      const already=Math.max(0,now-xpBefore);
      const missing=Math.max(0,expected-already);
      if(!(missing>0))return;
      state.xp=now+missing;
      const log=document.getElementById('eventLog');
      if(log){
        const row=document.createElement('div');row.className='event reward';
        row.textContent=`XP +${missing}.`;
        log.prepend(row);while(log.children.length>9)log.lastChild.remove();
      }
      window.HAJJEN_ZONE4_SYSTEM?.sync?.();
      window.HAJJEN_ZONE4_SAVE_PROFILE?.sync?.('zone4-xp-award');
    });
  }

  function hookCounter(name,type){
    const desc=Object.getOwnPropertyDescriptor(state,name);
    if(desc&&!desc.configurable)return false;
    let value=Math.max(0,Number(state[name])||0);
    Object.defineProperty(state,name,{
      configurable:true,enumerable:true,
      get(){return value;},
      set(next){
        const incoming=Math.max(0,Number(next)||0);
        const delta=Math.max(0,incoming-value);
        const xpBefore=Math.max(0,Number(state.xp)||0);
        value=incoming;
        if(delta>0)awardMissing(type,delta,xpBefore);
      }
    });
    return true;
  }

  function hookBoss(){
    const desc=Object.getOwnPropertyDescriptor(state,'bossKilled');
    if(desc&&!desc.configurable)return false;
    let value=!!state.bossKilled;
    Object.defineProperty(state,'bossKilled',{
      configurable:true,enumerable:true,
      get(){return value;},
      set(next){
        const incoming=!!next;
        const first=incoming&&!value;
        const xpBefore=Math.max(0,Number(state.xp)||0);
        value=incoming;
        if(first)awardMissing('boss',1,xpBefore);
      }
    });
    return true;
  }

  const mobHook=hookCounter('mobKills','mob');
  const eliteHook=hookCounter('eliteKills','elite');
  const bossHook=hookBoss();

  window.HAJJEN_ZONE4_XP_SAFETY={
    version:'2.0-kill-counter-microtask',mobHook,eliteHook,bossHook
  };
})();