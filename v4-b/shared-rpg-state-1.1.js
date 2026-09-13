/* HAJJEN V4-B — Sharkan Profile / expedition Run foundation.
   Profile = permanent progression in localStorage.
   Run = the current zone state in memory only.
   Existing campaign/library keys remain the gameplay source during migration. */
(()=>{
  if(window.HAJJEN_RPG_STATE)return;

  const PROFILE_KEY='hajjen-v4b-profile-v1';
  const CAMPAIGN_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const clone=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const parse=(text,fallback=null)=>{try{return JSON.parse(text);}catch{return fallback;}};
  const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const arr=value=>Array.isArray(value)?value:[];
  const stamp=()=>new Date().toISOString();
  const dev=()=>!!(window.HAJJEN_ZONE3_DEV_MODE||window.HAJJEN_ZONE4_DEV_MODE||document.documentElement?.dataset?.hajjenDev||window.HAJJEN_ZONE4_DEV_REQUESTED);

  function fresh(){
    const time=stamp();
    return {
      version:1,character:'Sharkan',
      progression:{campaignZone:0,highestZone:1,level:1,xp:0,maxHp:100,potion:1},
      stats:{power:0,vitality:0,resolve:0},
      equipment:{armor:null,charm:null,relic:null,tool:null},
      inventory:[],
      talents:{unspent:0,nodes:[]},
      traits:{capacity:0,mastered:[],active:[]},
      currencies:{securedEssence:0},
      spells:{loaded:[],library:[]},
      unlocks:{},
      meta:{createdAt:time,updatedAt:time,migratedFromLegacy:false}
    };
  }

  function normalize(raw){
    const base=fresh(),p=raw&&typeof raw==='object'?raw:{};
    return {
      ...base,...p,version:1,character:'Sharkan',
      progression:{...base.progression,...(p.progression||{})},
      stats:{...base.stats,...(p.stats||{})},
      equipment:{...base.equipment,...(p.equipment||{})},
      inventory:arr(p.inventory),
      talents:{...base.talents,...(p.talents||{}),nodes:arr(p.talents?.nodes)},
      traits:{...base.traits,...(p.traits||{}),mastered:arr(p.traits?.mastered),active:arr(p.traits?.active)},
      currencies:{...base.currencies,...(p.currencies||{})},
      spells:{...base.spells,...(p.spells||{}),loaded:arr(p.spells?.loaded),library:arr(p.spells?.library)},
      unlocks:p.unlocks&&typeof p.unlocks==='object'?p.unlocks:{},
      meta:{...base.meta,...(p.meta||{})}
    };
  }

  let profile=normalize(parse(localStorage.getItem(PROFILE_KEY),null));
  let run=null;

  function notifyProfileChanged(reason='update'){
    document.dispatchEvent(new CustomEvent('hajjen:rpg-profile-changed',{detail:{reason,profile:clone(profile),dev:dev()}}));
  }

  function saveProfile(){
    profile=normalize(profile);profile.meta.updatedAt=stamp();
    if(dev())return false;
    localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
    return true;
  }

  function syncFromLegacy(){
    if(dev())return false;
    const campaign=parse(localStorage.getItem(CAMPAIGN_KEY),null);
    const library=parse(localStorage.getItem(LIBRARY_KEY),null);
    let changed=false;
    if(campaign&&typeof campaign==='object'){
      const zone=Math.max(0,num(campaign.zone,profile.progression.campaignZone));
      Object.assign(profile.progression,{
        campaignZone:zone,
        highestZone:Math.max(num(profile.progression.highestZone,1),zone||1),
        level:Math.max(1,num(campaign.level,profile.progression.level)),
        xp:Math.max(0,num(campaign.xp,profile.progression.xp)),
        maxHp:Math.max(1,num(campaign.maxHp,profile.progression.maxHp)),
        potion:Math.max(0,num(campaign.potion,profile.progression.potion))
      });
      if(Array.isArray(campaign.spells))profile.spells.loaded=clone(campaign.spells);
      profile.meta.migratedFromLegacy=true;changed=true;
    }
    if(Array.isArray(library?.spells)){profile.spells.library=clone(library.spells);changed=true;}
    if(changed){saveProfile();notifyProfileChanged('legacy-sync');}
    return changed;
  }

  function bindRun(state,options={}){
    if(!state||typeof state!=='object')return null;
    const zone=Math.max(1,num(options.zone,window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:1)));
    run={version:1,zone,startedAt:Date.now(),state};
    window.HAJJEN_RUN_STATE=state;
    return run;
  }

  function snapshotRun(){
    const s=run?.state;if(!s)return null;
    return clone({
      version:1,zone:run.zone,startedAt:run.startedAt,
      row:s.row,col:s.col,hp:s.hp,maxHp:s.maxHp,danger:s.danger,steps:s.steps,
      mobKills:s.mobKills,eliteKills:s.eliteKills,bossKilled:!!s.bossKilled,bossUnlocked:!!s.bossUnlocked,
      potion:s.potion,ingredients:s.ingredients||s.spellIngredients||[],potionIngredients:s.potionIngredients||[],
      introComplete:!!s.introComplete,gameOver:!!s.gameOver,zoneCleared:!!s.zoneCleared
    });
  }

  function commitFromRun(state=run?.state,options={}){
    if(dev()||!state)return false;
    const zone=Math.max(1,num(options.zone,run?.zone||window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||1));
    Object.assign(profile.progression,{
      campaignZone:zone,
      highestZone:Math.max(num(profile.progression.highestZone,1),zone),
      level:Math.max(1,num(state.level,profile.progression.level)),
      xp:Math.max(0,num(state.xp,profile.progression.xp)),
      maxHp:Math.max(1,num(state.maxHp,profile.progression.maxHp)),
      potion:Math.max(0,num(state.potion,profile.progression.potion))
    });
    if(Array.isArray(state.spells))profile.spells.loaded=clone(state.spells);
    const library=parse(localStorage.getItem(LIBRARY_KEY),null);
    if(Array.isArray(library?.spells))profile.spells.library=clone(library.spells);
    const saved=saveProfile();
    notifyProfileChanged('run-commit');
    return saved;
  }

  function updateProfile(mutator,reason='update'){
    if(typeof mutator!=='function')return false;
    const draft=clone(profile);const result=mutator(draft);
    profile=normalize(result&&typeof result==='object'?result:draft);
    profile.meta.updatedAt=stamp();
    if(!dev())localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
    notifyProfileChanged(reason);
    return true;
  }

  if(!dev())syncFromLegacy();

  window.HAJJEN_RPG_STATE={
    version:'1.2-dev-session-profile-mutations',
    keys:{profile:PROFILE_KEY,legacyCampaign:CAMPAIGN_KEY,legacyLibrary:LIBRARY_KEY},
    getProfile:()=>clone(profile),getRun:()=>run,snapshotRun,bindRun,
    commitProfileFromState:commitFromRun,updateProfile,syncFromCompatibility:syncFromLegacy,isDevSession:dev
  };

  const state=window.HAJJEN_CAMPAIGN_STATE||window.HAJJEN_V4B_STATE;
  if(state)bindRun(state,{zone:window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:1)});
})();
