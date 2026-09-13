/* HAJJEN Zone 4 — XP ownership / safety bridge.
   XP is permanent RPG progression and must never move backwards during a run.
   Core normally awards encounter XP; this bridge only fills a missing live-kill
   delta when that core award is absent. It initializes after Save Game restore
   so restored kills are baseline and never grant XP again. */
(()=>{
  if(window.HAJJEN_ZONE4_XP_SAFETY)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(Number(cfg?.zone)!==4||!state||!(entities instanceof Map))return;

  const ZONE_XP_CAP=1020;
  const FALLBACK={mob:40,elite:62,boss:140};
  let started=false,timer=0;
  let lastMobKills=0,lastEliteKills=0,lastBossKilled=false,xpFloor=0;
  const seenCompleted=new WeakSet();

  const eligible=e=>e&&['mob','elite','boss'].includes(e.type);
  const expectedXp=e=>Math.max(0,Number(e?.xp)||FALLBACK[e?.type]||0);

  function installMonotonicXp(){
    const desc=Object.getOwnPropertyDescriptor(state,'xp');
    if(desc&&!desc.configurable)return false;
    let value=Math.max(0,Math.min(ZONE_XP_CAP,Number(state.xp)||0));
    Object.defineProperty(state,'xp',{
      configurable:true,enumerable:true,
      get(){return value;},
      set(next){
        let incoming=Number(next);if(!Number.isFinite(incoming))return;
        incoming=Math.max(0,Math.min(ZONE_XP_CAP,incoming));
        // Permanent XP never decreases on death, restart, autosave or UI sync.
        if(incoming>=value)value=incoming;
      }
    });
    return true;
  }

  function markCurrentCompleted(){
    entities.forEach(e=>{if(eligible(e)&&e.completed)seenCompleted.add(e);});
  }

  function consumeCompleted(type,count){
    const found=[];
    entities.forEach(e=>{
      if(found.length>=count||!eligible(e)||e.type!==type||!e.completed||seenCompleted.has(e))return;
      seenCompleted.add(e);found.push(e);
    });
    return found;
  }

  function logAward(amount){
    const log=document.getElementById('eventLog');if(!log||!(amount>0))return;
    const row=document.createElement('div');row.className='event reward';row.textContent=`XP +${amount}.`;
    log.prepend(row);while(log.children.length>9)log.lastChild.remove();
  }

  function awardMissing(type,count){
    if(!(count>0))return;
    const defeated=consumeCompleted(type,count);
    let expected=defeated.reduce((sum,e)=>sum+expectedXp(e),0);
    if(defeated.length<count)expected+=(count-defeated.length)*(FALLBACK[type]||0);

    const current=Math.max(0,Number(state.xp)||0);
    const coreGain=Math.max(0,current-xpFloor);
    const missing=Math.max(0,expected-coreGain);
    if(missing>0){
      state.xp=Math.min(ZONE_XP_CAP,current+missing);
      logAward(Math.max(0,Number(state.xp)-current));
    }
    xpFloor=Math.max(xpFloor,Number(state.xp)||0);
    window.HAJJEN_ZONE4_SYSTEM?.sync?.();
    window.HAJJEN_ZONE4_SAVE_PROFILE?.sync?.('zone4-xp-live-kill');
  }

  function tick(){
    const currentXp=Math.max(0,Number(state.xp)||0);
    if(currentXp<xpFloor)state.xp=xpFloor;
    else if(currentXp>xpFloor)xpFloor=currentXp;

    const mobs=Math.max(0,Number(state.mobKills)||0);
    const elites=Math.max(0,Number(state.eliteKills)||0);
    const boss=!!state.bossKilled;

    if(mobs>lastMobKills)awardMissing('mob',mobs-lastMobKills);
    if(elites>lastEliteKills)awardMissing('elite',elites-lastEliteKills);
    if(boss&&!lastBossKilled)awardMissing('boss',1);

    lastMobKills=mobs;lastEliteKills=elites;lastBossKilled=boss;
  }

  function start(){
    if(started)return true;
    started=true;
    installMonotonicXp();
    xpFloor=Math.max(0,Number(state.xp)||0);
    lastMobKills=Math.max(0,Number(state.mobKills)||0);
    lastEliteKills=Math.max(0,Number(state.eliteKills)||0);
    lastBossKilled=!!state.bossKilled;
    markCurrentCompleted();
    timer=setInterval(tick,25);
    tick();
    window.HAJJEN_ZONE4_XP_SAFETY={
      version:'3.0-monotonic-live-kill-ledger',
      tick,get xpFloor(){return xpFloor;},
      stop:()=>clearInterval(timer)
    };
    return true;
  }

  // Save Game can finish its restore on a short delayed init. Do not install
  // counter baselines until that restore has had time to settle.
  function boot(){
    if(!window.HAJJEN_ZONE4_SAVE_GAME){setTimeout(boot,50);return;}
    setTimeout(start,180);
  }
  boot();
})();