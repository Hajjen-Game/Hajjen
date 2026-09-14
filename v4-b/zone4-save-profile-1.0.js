/* HAJJEN Zone 4 — permanent Profile persistence bridge.
   DEV writes only to an isolated prototype key; production continues using
   HAJJEN_RPG_STATE's normal profile storage. */
(()=>{
  if(window.HAJJEN_ZONE4_SAVE_PROFILE)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(Number(cfg?.zone)!==4||!state)return;

  const dev=!!(window.HAJJEN_ZONE4_DEV_MODE||window.HAJJEN_ZONE4_DEV_REQUESTED||document.documentElement.dataset.hajjenDev==='zone4');
  const DEV_KEY='hajjen-v4b-zone4-dev-profile-save-v1';
  const DEV_ACTIVE_KEY='hajjen-v4b-zone4-dev-active-expedition-v1';
  const clone=v=>{try{return structuredClone(v);}catch{try{return JSON.parse(JSON.stringify(v));}catch{return null;}}};
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const parse=t=>{try{return JSON.parse(t);}catch{return null;}};
  const baseMax=l=>100+(Math.max(1,num(l,1))-1)*15;
  let syncing=false,lastSig='',lastMirror='';

  const DEV_BASELINE_ITEMS=[
    {id:'legacy-z23-armor',name:'Weathered Tide Vest',slot:'armor',rank:1,origin:'Zones 1–3',stats:{power:0,vitality:3,resolve:1},flavor:'Reliable expedition armor improved across the first three zones.'},
    {id:'legacy-z2-charm',name:'Primal Focus Charm',slot:'charm',rank:1,origin:'Zone 2',stats:{power:3,vitality:0,resolve:0},flavor:'A simple focus charm carried since Enchantments were first learned.'},
    {id:'legacy-z3-relic',name:'Resonant Shard',slot:'relic',rank:1,origin:'Zone 3',stats:{power:2,vitality:0,resolve:2},flavor:'A stable primal fragment recovered during the third expedition.'},
    {id:'legacy-z23-tool',name:"Explorer's Field Kit",slot:'tool',rank:1,origin:'Zones 1–3',stats:{power:1,vitality:0,resolve:1},flavor:'A practical field kit refined through three zones of exploration.'}
  ];

  function rpg(){return window.HAJJEN_RPG_STATE;}
  function get(){return rpg()?.getProfile?.()||null;}
  function restore(profile){
    if(!profile||!rpg()?.updateProfile)return false;
    syncing=true;rpg().updateProfile(()=>clone(profile),'savegame-profile-restore');syncing=false;lastSig='';return true;
  }
  function makeDevBaseline(profile){
    const p=clone(profile)||{};
    p.progression=p.progression||{};
    Object.assign(p.progression,{level:10,xp:630,maxHp:235,potion:1,campaignZone:4,highestZone:4});
    p.stats={power:0,vitality:0,resolve:0};
    p.inventory=DEV_BASELINE_ITEMS.map(clone);
    p.equipment={};
    DEV_BASELINE_ITEMS.forEach(item=>{p.equipment[item.slot]=clone(item);});
    p.currencies=p.currencies||{};
    p.currencies.securedEssence=60;
    p.talents={unspent:1,nodes:[]};
    p.traits={capacity:0,active:[]};
    p.unlocks=p.unlocks||{};
    p.unlocks.talents=true;
    p.unlocks.talentsIntroduced=false;
    p.meta=p.meta||{};
    p.meta.lootClaims={};
    p.meta.zone3LegacyLoadoutSeeded=true;
    p.meta.zone3LegacyLoadoutVersion=1;
    return p;
  }
  function resetDevBaseline(){
    if(!dev||!rpg()?.updateProfile)return null;
    const baseline=makeDevBaseline(get());
    syncing=true;
    rpg().updateProfile(()=>clone(baseline),'zone4-dev-reset-level10');
    syncing=false;
    state.level=10;state.xp=630;state.maxHp=235;state.hp=235;state.potion=1;state.unsecuredEssence=0;
    try{localStorage.removeItem(DEV_ACTIVE_KEY);}catch{}
    const profile=get()||baseline;
    lastMirror=JSON.stringify(profile);
    try{localStorage.setItem(DEV_KEY,JSON.stringify({version:1,savedAt:new Date().toISOString(),profile}));}catch{}
    lastSig='10|630|1';
    return profile;
  }
  function sync(reason='savegame-profile-sync'){
    const api=rpg();if(!api?.getProfile||!api?.updateProfile)return null;
    const level=Math.max(1,num(state.level,1)),xp=Math.max(0,num(state.xp,0)),potion=Math.max(0,num(state.potion,0));
    const sig=`${level}|${xp}|${potion}`,current=api.getProfile(),p=current?.progression||{};
    if(sig!==lastSig&&(num(p.level,1)!==level||num(p.xp,0)!==xp||num(p.potion,0)!==potion||num(p.highestZone,1)<4)){
      syncing=true;
      api.updateProfile(profile=>{profile.progression=profile.progression||{};Object.assign(profile.progression,{level,xp,maxHp:baseMax(level),potion,campaignZone:Math.max(4,num(profile.progression.campaignZone,0)),highestZone:Math.max(4,num(profile.progression.highestZone,1))});return profile;},reason);
      syncing=false;
    }
    lastSig=sig;
    const profile=api.getProfile();
    if(dev&&profile){
      const mirror=JSON.stringify(profile);
      if(mirror!==lastMirror){lastMirror=mirror;try{localStorage.setItem(DEV_KEY,JSON.stringify({version:1,savedAt:new Date().toISOString(),profile}));}catch{}}
    }
    return profile;
  }
  function loadDev(){
    if(!dev)return null;let record=null;try{record=parse(localStorage.getItem(DEV_KEY));}catch{}
    if(record?.profile){lastMirror=JSON.stringify(record.profile);restore(record.profile);}return record?.profile||null;
  }
  function applyFresh(profile=get()){
    const p=profile?.progression;if(!p)return false;
    state.level=Math.min(Number(cfg.levelCap)||99,Math.max(Number(cfg.levelFloor)||1,num(p.level,Number(cfg.levelFloor)||1)));
    state.xp=Math.max(0,num(p.xp,state.xp));state.potion=Math.max(0,num(p.potion,state.potion));state.maxHp=baseMax(state.level);state.hp=state.maxHp;state.unsecuredEssence=0;
    window.HAJJEN_ZONE4_RPG_STATS_RUNTIME?.sync?.();return true;
  }

  const params=new URLSearchParams(location.search);
  const freshDev=dev&&params.get('fresh')==='1';
  if(freshDev){
    try{localStorage.removeItem(DEV_KEY);localStorage.removeItem(DEV_ACTIVE_KEY);}catch{}
    resetDevBaseline();
    const url=new URL(location.href);url.searchParams.delete('fresh');history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
  }

  const saved=loadDev();
  window.HAJJEN_ZONE4_SAVE_PROFILE={version:'1.3-dev-level10-reset',dev,key:dev?DEV_KEY:null,get,restore,sync,applyFresh,resetDevBaseline,saved,baseMax};
  document.addEventListener('hajjen:rpg-profile-changed',()=>{if(!syncing)setTimeout(()=>sync('profile-change'),0);});

  if(dev&&!window.HAJJEN_ZONE4_LEGACY_LOADOUT){
    const script=document.createElement('script');
    script.src='zone4-legacy-loadout-1.0.js?v=1';
    script.dataset.hajjenZone4LegacyLoadout='1';
    document.head.appendChild(script);
  }
})();
