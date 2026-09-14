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
  const clone=v=>{try{return structuredClone(v);}catch{try{return JSON.parse(JSON.stringify(v));}catch{return null;}}};
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const parse=t=>{try{return JSON.parse(t);}catch{return null;}};
  const baseMax=l=>100+(Math.max(1,num(l,1))-1)*15;
  let syncing=false,lastSig='',lastMirror='';

  function rpg(){return window.HAJJEN_RPG_STATE;}
  function get(){return rpg()?.getProfile?.()||null;}
  function restore(profile){
    if(!profile||!rpg()?.updateProfile)return false;
    syncing=true;rpg().updateProfile(()=>clone(profile),'savegame-profile-restore');syncing=false;lastSig='';return true;
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

  const saved=loadDev();
  window.HAJJEN_ZONE4_SAVE_PROFILE={version:'1.2-legacy-loadout',dev,key:dev?DEV_KEY:null,get,restore,sync,applyFresh,saved,baseMax};
  document.addEventListener('hajjen:rpg-profile-changed',()=>{if(!syncing)setTimeout(()=>sync('profile-change'),0);});

  if(dev&&!window.HAJJEN_ZONE4_LEGACY_LOADOUT){
    const script=document.createElement('script');
    script.src='zone4-legacy-loadout-1.0.js?v=1';
    script.dataset.hajjenZone4LegacyLoadout='1';
    document.head.appendChild(script);
  }
})();
