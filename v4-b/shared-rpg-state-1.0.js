/* HAJJEN V4-B — persistent Sharkan Profile / expedition Run separation.
   This is the compatibility foundation for the RPG progression roadmap.

   Permanent Profile lives in localStorage. The current expedition Run remains
   an in-memory reference to the existing zone state, so introducing this file
   does not change current retry/death balance yet.

   During the migration period the historical campaign + spell-library keys
   remain supported. Existing zones keep using them while this module mirrors
   their persistent fields into the new Profile. */
(()=>{
  if(window.HAJJEN_RPG_STATE)return;

  const PROFILE_KEY='hajjen-v4b-profile-v1';
  const LEGACY_CAMPAIGN_KEY='hajjen-v4b-campaign';
  const LEGACY_LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const PROFILE_VERSION=1;

  const clone=value=>{
    try{return structuredClone(value);}catch{}
    try{return JSON.parse(JSON.stringify(value));}catch{return value;}
  };
  const parse=(text,fallback=null)=>{try{return JSON.parse(text);}catch{return fallback;}};
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const array=value=>Array.isArray(value)?value:[];
  const now=()=>new Date().toISOString();

  function defaultProfile(){
    const stamp=now();
    return {
      version:PROFILE_VERSION,
      character:'Sharkan',
      progression:{
        campaignZone:0,
        highestZone:1,
        level:1,
        xp:0,
        maxHp:100,
        potion:1
      },
      stats:{power:0,vitality:0,resolve:0},
      equipment:{armor:null,charm:null,relic:null,tool:null},
      inventory:[],
      talents:{unspent:0,nodes:[]},
      traits:{capacity:0,mastered:[],active:[]},
      currencies:{securedEssence:0},
      spells:{loaded:[],library:[]},
      unlocks:{},
      meta:{createdAt:stamp,updatedAt:stamp,migratedFromLegacy:false}
    };
  }

  function normalizeProfile(raw){
    const base=defaultProfile();
    const source=raw&&typeof raw==='object'?raw:{};
    const progression=source.progression&&typeof source.progression==='object'?source.progression:{};
    const stats=source.stats&&typeof source.stats==='object'?source.stats:{};
    const equipment=source.equipment&&typeof source.equipment==='object'?source.equipment:{};
    const talents=source.talents&&typeof source.talents==='object'?source.talents:{};
    const traits=source.traits&&typeof source.traits==='object'?source.traits:{};
    const currencies=source.currencies&&typeof source.currencies==='object'?source.currencies:{};
    const spells=source.spells&&typeof source.spells==='object'?source.spells:{};
    const meta=source.meta&&typeof source.meta==='object'?source.meta:{};

    return {
      ...base,
      ...source,
      version:PROFILE_VERSION,
      character:'Sharkan',
      progression:{
        ...base.progression,
        ...progression,
        campaignZone:Math.max(0,number(progression.campaignZone,0)),
        highestZone:Math.max(1,number(progression.highestZone,1)),
        level:Math.max(1,number(progression.level,1)),
        xp:Math.max(0,number(progression.xp,0)),
        maxHp:Math.max(1,number(progression.maxHp,100)),
        potion:Math.max(0,number(progression.potion,1))
      },
      stats:{
        ...base.stats,
        ...stats,
        power:Math.max(0,number(stats.power,0)),
        vitality:Math.max(0,number(stats.vitality,0)),
        resolve:Math.max(0,number(stats.resolve,0))
      },
      equipment:{...base.equipment,...equipment},
      inventory:array(source.inventory),
      talents:{...base.talents,...talents,nodes:array(talents.nodes),unspent:Math.max(0,number(talents.unspent,0))},
      traits:{
        ...base.traits,
        ...traits,
        capacity:Math.max(0,number(traits.capacity,0)),
        mastered:array(traits.mastered),
        active:array(traits.active)
      },
      currencies:{...base.currencies,...currencies,securedEssence:Math.max(0,number(currencies.securedEssence,0))},
      spells:{...base.spells,...spells,loaded:array(spells.loaded),library:array(spells.library)},
      unlocks:source.unlocks&&typeof source.unlocks==='object'?source.unlocks:{},
      meta:{...base.meta,...meta,createdAt:meta.createdAt||base.meta.createdAt,updatedAt:meta.updatedAt||base.meta.updatedAt,migratedFromLegacy:!!meta.migratedFromLegacy}
    };
  }

  function readStoredProfile(){
    return normalizeProfile(parse(localStorage.getItem(PROFILE_KEY),null));
  }

  let profile=readStoredProfile();
  let run=null;

  function writeProfile(next=profile){
    profile=normalizeProfile(next);
    profile.meta.updatedAt=now();
    localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
    return profile;
  }

  function libraryFromCompatibility(){
    const parsed=parse(localStorage.getItem(LEGACY_LIBRARY_KEY),null);
    return Array.isArray(parsed?.spells)?parsed.spells:[];
  }

  function mergeLegacyIntoProfile(){
    const legacy=parse(localStorage.getItem(LEGACY_CAMPAIGN_KEY),null);
    const library=libraryFromCompatibility();
    let changed=false;

    if(legacy&&typeof legacy==='object'){
      const zone=Math.max(0,number(legacy.zone,profile.progression.campaignZone));
      profile.progression.campaignZone=zone;
      profile.progression.highestZone=Math.max(profile.progression.highestZone,zone||1);
      profile.progression.level=Math.max(1,number(legacy.level,profile.progression.level));
      profile.progression.xp=Math.max(0,number(legacy.xp,profile.progression.xp));
      profile.progression.maxHp=Math.max(1,number(legacy.maxHp,profile.progression.maxHp));
      profile.progression.potion=Math.max(0,number(legacy.potion,profile.progression.potion));
      if(Array.isArray(legacy.spells))profile.spells.loaded=clone(legacy.spells);
      profile.meta.migratedFromLegacy=true;
      changed=true;
    }

    if(library.length){profile.spells.library=clone(library);changed=true;}
    if(changed)writeProfile(profile);
    return changed;
  }

  function legacyProjection(){
    const p=profile.progression;
    return {
      version:1,
      zone:p.campaignZone,
      level:p.level,
      xp:p.xp,
      maxHp:p.maxHp,
      hp:p.maxHp,
      potion:p.potion,
      spells:clone(profile.spells.loaded),
      ingredients:[],
      potionIngredients:[]
    };
  }

  function ensureCompatibilityKeys(){
    if(!localStorage.getItem(LEGACY_CAMPAIGN_KEY)&&profile.progression.campaignZone>0){
      localStorage.setItem(LEGACY_CAMPAIGN_KEY,JSON.stringify(legacyProjection()));
    }
    if(!localStorage.getItem(LEGACY_LIBRARY_KEY)&&profile.spells.library.length){
      localStorage.setItem(LEGACY_LIBRARY_KEY,JSON.stringify({version:1,spells:clone(profile.spells.library)}));
    }
  }

  function isDevSession(){
    return !!(window.HAJJEN_ZONE3_DEV_MODE||window.HAJJEN_ZONE4_DEV_MODE||document.documentElement?.dataset?.hajjenDev);
  }

  function bindRun(state,options={}){
    if(!state||typeof state!=='object')return null;
    run={
      version:1,
      zone:Math.max(1,number(options.zone,window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||1)),
      startedAt:Date.now(),
      state
    };
    window.HAJJEN_RUN_STATE=state;
    return run;
  }

  function snapshotRun(){
    const state=run?.state;if(!state)return null;
    return clone({
      version:1,
      zone:run.zone,
      startedAt:run.startedAt,
      row:state.row,col:state.col,
      hp:state.hp,maxHp:state.maxHp,
      danger:state.danger,steps:state.steps,
      mobKills:state.mobKills,eliteKills:state.eliteKills,
      bossKilled:!!state.bossKilled,bossUnlocked:!!state.bossUnlocked,
      potion:state.potion,
      ingredients:state.ingredients||state.spellIngredients||[],
      potionIngredients:state.potionIngredients||[],
      introComplete:!!state.introComplete,
      gameOver:!!state.gameOver,zoneCleared:!!state.zoneCleared
    });
  }

  function commitProfileFromState(state=run?.state,options={}){
    if(!state||typeof state!=='object'||isDevSession())return false;
    const zone=Math.max(1,number(options.zone,run?.zone||window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||1));
    const p=profile.progression;
    p.campaignZone=zone;
    p.highestZone=Math.max(p.highestZone,zone);
    p.level=Math.max(1,number(state.level,p.level));
    p.xp=Math.max(0,number(state.xp,p.xp));
    p.maxHp=Math.max(1,number(state.maxHp,p.maxHp));
    p.potion=Math.max(0,number(state.potion,p.potion));
    if(Array.isArray(state.spells))profile.spells.loaded=clone(state.spells);
    const library=libraryFromCompatibility();
    if(library.length)profile.spells.library=clone(library);
    else if(Array.isArray(state.spells)){
      const crafted=state.spells.filter(spell=>spell&&!spell.fallback);
      if(crafted.length)profile.spells.library=clone(crafted);
    }
    writeProfile(profile);
    return true;
  }

  function updateProfile(mutator){
    if(typeof mutator!=='function'||isDevSession())return false;
    const draft=clone(profile);
    const result=mutator(draft);
    writeProfile(result&&typeof result==='object'?result:draft);
    return true;
  }

  function resetProfile(){
    localStorage.removeItem(PROFILE_KEY);
    profile=defaultProfile();
    run=null;
    delete window.HAJJEN_RUN_STATE;
    return clone(profile);
  }

  /* During the compatibility phase the old campaign save remains the source
     of truth for existing gameplay. Import it first; if it is absent, a known
     Profile can reconstruct enough legacy state for the old zone code to load. */
  mergeLegacyIntoProfile();
  ensureCompatibilityKeys();

  const api={
    version:'1.0-profile-run-foundation',
    keys:{profile:PROFILE_KEY,legacyCampaign:LEGACY_CAMPAIGN_KEY,legacyLibrary:LEGACY_LIBRARY_KEY},
    getProfile:()=>clone(profile),
    getRun:()=>run,
    snapshotRun,
    bindRun,
    commitProfileFromState,
    updateProfile,
    syncFromCompatibility:mergeLegacyIntoProfile,
    ensureCompatibilityKeys,
    resetProfile,
    isDevSession
  };
  window.HAJJEN_RPG_STATE=api;
})();
