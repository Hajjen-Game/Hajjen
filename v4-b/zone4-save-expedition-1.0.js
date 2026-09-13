/* HAJJEN Zone 4 — active expedition Save Game.
   Reload/reopen resumes the latest safe point. Restart Expedition clears the
   run only; the permanent RPG Profile survives. Mid-combat closes resume from
   the most recent safe point instead of serializing a half-resolved combat. */
(()=>{
  if(window.HAJJEN_ZONE4_SAVE_GAME)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE,entities=window.HAJJEN_ZONE4_ENTITY_MAP;
  if(Number(cfg?.zone)!==4||!state||!(entities instanceof Map))return;

  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  const ACTIVE_KEY=dev?'hajjen-v4b-zone4-dev-active-expedition-v1':'hajjen-v4b-active-expedition-v1';
  const DEV_PROFILE_KEY='hajjen-v4b-zone4-dev-profile-save-v1';
  const RESTART_KEY=dev?'hajjen-v4b-zone4-dev-restart-pending-v1':'hajjen-v4b-zone4-restart-pending-v1';
  const CAMPAIGN_KEY='hajjen-v4b-campaign';
  const clone=v=>{try{return structuredClone(v);}catch{try{return JSON.parse(JSON.stringify(v));}catch{return null;}}};
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const pos=(r,c)=>`${Number(r)},${Number(c)}`;
  let restoring=true,lastSerialized='',claimedOverride=false,restoredManip=[],restarting=false;

  function profileApi(){return window.HAJJEN_ZONE4_SAVE_PROFILE;}
  function idOf(e){
    if(!e)return'';if(e.spawned)return`spawn:${e.title}`;
    if(['mob','elite','boss'].includes(e.type))return`${e.type}:${e.title}`;
    if(e.type==='ingredient')return`ingredient:${e.name||e.title}:${e.force||''}`;
    if(e.type==='potion-ingredient')return`potion:${e.name||e.title}`;
    return`${e.type}:${e.title||e.name||''}:${num(e.r)}:${num(e.c)}`;
  }
  function stateSnap(){
    const out={};Object.keys(state).forEach(name=>{
      if(name==='combat'||name==='spawnTimers'||typeof state[name]==='function')return;
      const value=clone(state[name]);if(value!==null&&value!==undefined)out[name]=value;
    });out.combat=null;return out;
  }
  function entitySnap(){
    const out=[];entities.forEach(e=>{if(e&&e.type!=='spring'){const copy=clone(e);if(copy)out.push({id:idOf(e),entity:copy});}});return out;
  }
  function cardSnap(){
    const reward=window.HAJJEN_ZONE4_CARD_REWARD_TEST,enchant=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
    const hand=window.HAJJEN_ZONE4_TACTICAL_HAND,combat=window.HAJJEN_ZONE4_TACTICAL_COMBAT;
    return{
      claimed:claimedOverride||!!reward?.claimed?.(),replacements:clone(reward?.manipulationReplacements||[]),manip:clone(reward?.manipulationSlots?.()||[]),
      enchant:clone(enchant?.hand||[]),defs:clone(hand?.definitions||[]),equipped:hand?.equipped instanceof Set?[...hand.equipped]:[],
      used:combat?.usedKeys instanceof Set?[...combat.usedKeys]:[],slots:Array.isArray(combat?.slots)?[...combat.slots]:[]
    };
  }
  function build(){
    const profile=profileApi()?.sync?.('expedition-autosave')||profileApi()?.get?.()||null;
    const system=window.HAJJEN_ZONE4_SYSTEM;
    return{version:1,zone:4,savedAt:new Date().toISOString(),profile:clone(profile),run:stateSnap(),entities:entitySnap(),
      springs:{used:system?.usedSprings instanceof Set?[...system.usedSprings]:[]},cards:cardSnap(),
      loot:clone(window.HAJJEN_ZONE4_RPG_LOOT?.getProgress?.()||null),essence:clone(window.HAJJEN_ZONE4_RPG_ESSENCE?.getProgress?.()||null)};
  }
  function indicator(){
    let n=document.querySelector('.zone4-savegame-indicator');if(n)return n;
    n=document.createElement('div');n.className='zone4-savegame-indicator';n.innerHTML='<span>●</span><b>AUTOSAVE</b>';document.body.appendChild(n);return n;
  }
  function pulse(){const n=indicator();n.classList.add('is-saved');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('is-saved'),700);}
  function save(force=false){
    if(restarting)return false;
    profileApi()?.sync?.('expedition-autosave');
    if(restoring||state.combat)return false;
    const snap=build(),text=JSON.stringify(snap);if(!force&&text===lastSerialized)return false;
    if(!write(ACTIVE_KEY,snap))return false;lastSerialized=text;pulse();if(state.gameOver)showFailure();return true;
  }

  function restoreState(run){
    if(!run)return;['level','xp','maxHp','hp'].forEach(k=>{if(k in run)state[k]=clone(run[k]);});
    Object.keys(run).forEach(k=>{if(['level','xp','maxHp','hp','combat','spawnTimers'].includes(k))return;state[k]=clone(run[k]);});state.combat=null;
  }
  function restoreEntities(list){
    if(!Array.isArray(list))return;
    const fixed=new Map();entities.forEach(e=>{if(e&&e.type!=='spring'&&!e.spawned)fixed.set(idOf(e),e);});
    [...entities.entries()].forEach(([k,e])=>{if(e?.spawned)entities.delete(k);});
    const spawned=[];
    list.forEach(rec=>{
      const saved=rec?.entity;if(!saved||saved.type==='spring')return;let target=!saved.spawned?fixed.get(rec.id||idOf(saved)):null;
      if(target){[...entities.entries()].forEach(([k,v])=>{if(v===target)entities.delete(k);});Object.assign(target,clone(saved));entities.set(pos(target.r,target.c),target);}
      else{target=clone(saved);if(saved.spawned){target.zone4MobileDev=false;spawned.push([target,clone(saved)]);}entities.set(pos(target.r,target.c),target);}
    });
    if(spawned.length){window.HAJJEN_ZONE4_AMBIENT_MOVEMENT_TEST?.enroll?.();spawned.forEach(([target,saved])=>Object.assign(target,saved));}
  }
  function restoreSprings(data){
    const sys=window.HAJJEN_ZONE4_SYSTEM;if(!(sys?.usedSprings instanceof Set))return;
    sys.usedSprings.clear();(data?.used||[]).forEach(i=>sys.usedSprings.add(Number(i)));(sys.springs||[]).forEach(s=>s.depleted=sys.usedSprings.has(Number(s.index)));
  }
  function pokeManip(){const h=document.getElementById('manipCards');if(!h)return;const i=document.createElement('i');i.hidden=true;h.appendChild(i);i.remove();}
  function restoreCards(data={}){
    const reward=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
    if(Array.isArray(data.replacements)&&Array.isArray(reward?.manipulationReplacements)){reward.manipulationReplacements.length=0;data.replacements.forEach(x=>reward.manipulationReplacements.push(clone(x)));}
    restoredManip=Array.isArray(data.manip)?clone(data.manip):[];claimedOverride=!!data.claimed;
    const ench=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
    if(Array.isArray(data.enchant)&&Array.isArray(ench?.hand)){ench.hand.splice(0,ench.hand.length,...data.enchant.map(clone));state.enchantmentCards=ench.hand;state.enchantmentUsed=ench.hand.some(c=>!!c?.appliedTo);ench.sync?.();}
    const hand=window.HAJJEN_ZONE4_TACTICAL_HAND,combat=window.HAJJEN_ZONE4_TACTICAL_COMBAT;
    if(Array.isArray(data.defs)&&Array.isArray(hand?.definitions))hand.definitions.splice(0,hand.definitions.length,...data.defs.map(clone));
    if(hand?.equipped instanceof Set){hand.equipped.clear();(data.equipped||[]).forEach(x=>hand.equipped.add(x));}
    if(combat?.usedKeys instanceof Set){combat.usedKeys.clear();(data.used||[]).forEach(x=>combat.usedKeys.add(x));}
    if(Array.isArray(combat?.slots)){combat.slots.splice(0,combat.slots.length,...(data.slots||[null,null]));while(combat.slots.length<2)combat.slots.push(null);}
    state.zone4TacticalUsedKeys=combat?.usedKeys instanceof Set?[...combat.usedKeys]:(state.zone4TacticalUsedKeys||[]);hand?.sync?.();combat?.sync?.();pokeManip();
  }
  function patchManip(){
    if(!restoredManip.length)return;const h=document.getElementById('manipCards');if(!h)return;
    const cards=[...h.children].filter(n=>n instanceof HTMLElement&&n.classList.contains('card')&&!n.classList.contains('enchantment')&&!n.classList.contains('tactical')).slice(0,4);
    restoredManip.forEach(s=>{if(!s||s.replacement||!s.used)return;const b=cards[Number(s.index)||0]?.querySelector(':scope > button');if(b){b.textContent='USED';b.disabled=true;}});
  }
  function patchClaimed(){
    if(!claimedOverride)return;const r=cfg.cardRewardTest,t=r?document.querySelector(`.tile[data-r="${r.row}"][data-c="${r.col}"]`):null;
    if(t){t.classList.remove('zone4-card-reward-test-tile');t.classList.add('zone4-card-reward-test-claimed');t.querySelector(':scope > .zone4-card-reward-test-icon')?.remove();}
    if(document.querySelector('.zone4-card-reward-test-modal.show'))window.HAJJEN_ZONE4_CARD_REWARD_TEST?.close?.();
  }
  function render(){
    const tiles=[...document.querySelectorAll('#world>.tile')];tiles.forEach(t=>{['mob','elite','boss','ingredient','potion-ingredient','portal','special','reachable','current','zone4-mobile-enemy-dev'].forEach(c=>t.classList.remove(c));t.removeAttribute('data-mark');});
    entities.forEach(e=>{if(!e||e.completed||e.type==='spring')return;const t=document.querySelector(`#world>.tile[data-r="${Number(e.r)}"][data-c="${Number(e.c)}"]`);if(t){t.classList.add('special',e.type);t.dataset.mark=e.mark||'?';}});
    document.querySelector(`#world>.tile[data-r="${Number(state.row)}"][data-c="${Number(state.col)}"]`)?.classList.add('current');
    if(!state.gameOver)[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>document.querySelector(`#world>.tile[data-r="${Number(state.row)+dr}"][data-c="${Number(state.col)+dc}"]`)?.classList.add('reachable'));
    window.dispatchEvent(new Event('resize'));window.HAJJEN_ZONE4_SYSTEM?.sync?.();window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV?.syncActivation?.(false);window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV?.decorate?.();
    window.HAJJEN_ZONE4_ENCHANTMENT_BUFFS?.patch?.();window.HAJJEN_ZONE4_RPG_STATS_RUNTIME?.sync?.();window.HAJJEN_ZONE4_RPG_ESSENCE?.sync?.();window.HAJJEN_SHARED_ACTION_BAR?.sync?.();patchManip();patchClaimed();
  }

  function restore(saved){
    if(!saved?.run)return false;if(saved.profile)profileApi()?.restore?.(saved.profile);
    restoreState(saved.run);restoreEntities(saved.entities);restoreSprings(saved.springs);restoreCards(saved.cards);
    window.HAJJEN_ZONE4_RPG_LOOT?.restoreProgress?.(saved.loot);window.HAJJEN_ZONE4_RPG_ESSENCE?.restoreProgress?.(saved.essence);
    queueMicrotask(render);setTimeout(render,100);return true;
  }
  function toastRestore(){
    if(state.gameOver)return;const a=document.getElementById('toastArea');if(a){const n=document.createElement('div');n.className='toast reward';n.textContent='EXPEDITION RESTORED';a.prepend(n);setTimeout(()=>n.remove(),1800);}
  }
  function failureModal(){
    let m=document.getElementById('zone4SavegameFailureModal');if(m)return m;m=document.createElement('div');m.id='zone4SavegameFailureModal';m.className='zone4-savegame-failure';m.setAttribute('aria-hidden','true');
    m.innerHTML='<div class="zone4-savegame-failure-backdrop"></div><section role="dialog" aria-modal="true"><span>EXPEDITION FAILED</span><h2>SHARKAN RETURNS</h2><p>Gear, level and Secured Essence are safe. Restarting rebuilds the zone and respawns its enemies.</p><div class="zone4-savegame-failure-meta"><small>SECURED ESSENCE</small><strong data-secured>0</strong></div><button type="button">RESTART EXPEDITION</button></section>';
    document.body.appendChild(m);m.querySelector('button')?.addEventListener('click',restart);return m;
  }
  function showFailure(){
    if(!state.gameOver)return;const m=failureModal(),v=m.querySelector('[data-secured]');if(v)v.textContent=String(Math.max(0,num(profileApi()?.get?.()?.currencies?.securedEssence,0)));m.classList.add('is-open');m.setAttribute('aria-hidden','false');
  }
  function productionHandoff(profile){
    if(dev)return;const p=profile?.progression||{},level=Math.max(Number(cfg.levelFloor)||1,num(p.level,state.level)),maxHp=profileApi()?.baseMax?.(level)||100+(level-1)*15;
    const spells=clone(state.spells||[])||[];spells.forEach(s=>{if(Array.isArray(s.enchantments))s.enchantments=s.enchantments.filter(x=>!(typeof x==='object'&&x?.sourceZone===4));delete s.enchantmentName;});
    write(CAMPAIGN_KEY,{version:1,zone:3,level,xp:Math.max(0,num(p.xp,state.xp)),maxHp,hp:maxHp,potion:Math.max(0,num(p.potion,state.potion)),spells,ingredients:[],potionIngredients:[]});
  }
  function markRestartPending(){
    try{sessionStorage.setItem(RESTART_KEY,'1');}catch{}
  }
  function consumeRestartPending(){
    let pending=false;try{pending=sessionStorage.getItem(RESTART_KEY)==='1';if(pending)sessionStorage.removeItem(RESTART_KEY);}catch{}
    if(pending){try{localStorage.removeItem(ACTIVE_KEY);}catch{}lastSerialized='';}
    return pending;
  }
  function restart(){
    if(restarting)return;
    restarting=true;
    const profile=profileApi()?.sync?.('restart-expedition')||profileApi()?.get?.();
    markRestartPending();
    try{localStorage.removeItem(ACTIVE_KEY);}catch{}
    productionHandoff(profile);
    const url=new URL(location.href);
    if(dev)url.searchParams.set('dev','1');else url.searchParams.delete('dev');
    location.replace(`${url.pathname}${url.search}${url.hash}`);
  }

  function init(){
    const pApi=profileApi();if(!pApi||!window.HAJJEN_RPG_STATE)return false;
    const restartBoot=consumeRestartPending();
    const active=restartBoot?null:read(ACTIVE_KEY),devRecord=dev?read(DEV_PROFILE_KEY):null;
    if(active?.profile)pApi.restore(active.profile);else if(devRecord?.profile)pApi.restore(devRecord.profile);
    if(active?.version===1&&Number(active.zone)===4){restore(active);lastSerialized=JSON.stringify(active);setTimeout(toastRestore,140);}
    else{pApi.applyFresh(pApi.get());state.gameOver=false;state.zoneCleared=false;state.combat=null;setTimeout(render,50);}
    restoring=false;indicator();
    const hand=document.getElementById('manipCards');if(hand)new MutationObserver(()=>queueMicrotask(patchManip)).observe(hand,{childList:true,subtree:true});
    setInterval(()=>{if(restarting)return;patchManip();patchClaimed();save(false);},450);
    setTimeout(()=>{if(!restarting)save(true);},300);
    if(state.gameOver)setTimeout(showFailure,120);
    return true;
  }

  window.addEventListener('pagehide',()=>{if(!restarting)save(true);});
  window.addEventListener('beforeunload',()=>{if(!restarting)save(true);});
  window.HAJJEN_ZONE4_SAVE_GAME={version:'1.1-restart-unload-safe',key:ACTIVE_KEY,save:()=>save(true),restartExpedition:restart,clearActive:()=>{try{localStorage.removeItem(ACTIVE_KEY);}catch{}},getSnapshot:()=>read(ACTIVE_KEY)};
  if(!init())setTimeout(init,80);
})();
