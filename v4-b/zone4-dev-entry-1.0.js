(()=>{
  if(!window.HAJJEN_ZONE4_DEV_REQUESTED)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const BACKUP_KEY='hajjen-v4b-zone4-dev-backup-v1';

  try{
    const stale=JSON.parse(sessionStorage.getItem(BACKUP_KEY)||'null');
    if(stale){
      if(stale.campaign===null)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,stale.campaign);
      if(stale.library===null)localStorage.removeItem(LIBRARY_KEY);else localStorage.setItem(LIBRARY_KEY,stale.library);
      sessionStorage.removeItem(BACKUP_KEY);
    }
  }catch{sessionStorage.removeItem(BACKUP_KEY);}

  const original={campaign:localStorage.getItem(SAVE_KEY),library:localStorage.getItem(LIBRARY_KEY)};
  sessionStorage.setItem(BACKUP_KEY,JSON.stringify(original));

  const sampleLibrary=[
    {id:'z4-dev-flow-tide-lash',name:'Tide Lash',force:'Flow',damage:38,ingredientBonus:12,cooldown:1,craftedFrom:['Deepglass','Pyre Shard'],zone3PotencyBonus:7},
    {id:'z4-dev-stone-breaker',name:'Stone Breaker',force:'Stone',damage:41,ingredientBonus:12,cooldown:2,craftedFrom:['Ironroot','Starroot'],zone3PotencyBonus:7},
    {id:'z4-dev-aether-rift-pulse',name:'Rift Pulse',force:'Aether',damage:44,ingredientBonus:9,cooldown:3,craftedFrom:['Starroot','Verdant Heart'],zone3PotencyBonus:7},
    {id:'z4-dev-ember-cinder-burst',name:'Cinder Burst',force:'Ember',damage:42,ingredientBonus:10,cooldown:2,craftedFrom:['Pyre Shard','Deepglass'],zone3PotencyBonus:7},
    {id:'z4-dev-growth-thorn-bloom',name:'Thorn Bloom',force:'Growth',damage:36,ingredientBonus:12,cooldown:1,craftedFrom:['Verdant Heart','Starroot'],zone3PotencyBonus:7},
    {id:'z4-dev-gale-razor-gust',name:'Razor Gust',force:'Gale',damage:33,ingredientBonus:10,cooldown:1,craftedFrom:['Feather Reed','Deepglass'],zone3PotencyBonus:7}
  ];
  const library=sampleLibrary.map(spell=>({...spell}));
  const fallback={id:'ember-bolt',name:'Ember Bolt',force:'Ember',damage:20,cooldown:0,fallback:true};

  // Keep every Zone 4 dev run on the same combat baseline used during balancing.
  // The library still contains the full sample set, but the Action Bar always
  // starts Ember Bolt -> Tide Lash -> Cinder Burst -> Rift Pulse.
  const preferred=['Tide Lash','Cinder Burst','Rift Pulse'];
  const reviewCrafted=preferred.map(name=>library.find(spell=>spell?.name===name)).filter(Boolean).slice(0,3);
  while(reviewCrafted.length<3){
    const next=sampleLibrary.find(spell=>!reviewCrafted.some(item=>item.id===spell.id));
    if(!next)break;
    reviewCrafted.push({...next});
  }

  const loaded=[fallback,...reviewCrafted.map(spell=>({...spell}))];
  const devSave={
    version:1,
    zone:3,
    level:10,
    xp:630,
    maxHp:235,
    hp:235,
    potion:1,
    spells:loaded,
    ingredients:[],
    potionIngredients:[]
  };

  localStorage.setItem(SAVE_KEY,JSON.stringify(devSave));
  localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));

  window.HAJJEN_ZONE4_DEV_MODE=true;
  document.documentElement.dataset.hajjenDev='zone4';

  let restored=false;
  function restore(){
    if(restored)return;
    restored=true;
    if(original.campaign===null)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,original.campaign);
    if(original.library===null)localStorage.removeItem(LIBRARY_KEY);else localStorage.setItem(LIBRARY_KEY,original.library);
    sessionStorage.removeItem(BACKUP_KEY);
  }
  window.addEventListener('pagehide',restore,{once:true});
  window.addEventListener('beforeunload',restore,{once:true});

  window.addEventListener('DOMContentLoaded',()=>{
    document.body.classList.add('zone4-dev-mode');
    const build=document.querySelector('.titlebar .build');
    if(build&&!/DEV MODE/.test(build.textContent||''))build.textContent=`${build.textContent} · DEV MODE`;
  },{once:true});
})();
