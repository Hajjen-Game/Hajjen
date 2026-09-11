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

  let existingCampaign={};
  let existingLibrary=[];
  try{existingCampaign=JSON.parse(original.campaign||'{}')||{};}catch{}
  try{
    const parsed=JSON.parse(original.library||'null');
    if(Array.isArray(parsed?.spells))existingLibrary=parsed.spells.filter(spell=>spell&&!spell.fallback);
  }catch{}

  const sampleLibrary=[
    {id:'z4-dev-flow-tide-lash',name:'Tide Lash',force:'Flow',damage:36,ingredientBonus:10,cooldown:1,craftedFrom:['Deepglass','Pyre Shard']},
    {id:'z4-dev-stone-breaker',name:'Stone Breaker',force:'Stone',damage:43,ingredientBonus:14,cooldown:2,craftedFrom:['Ironroot','Starroot']},
    {id:'z4-dev-aether-rift-pulse',name:'Rift Pulse',force:'Aether',damage:50,ingredientBonus:15,cooldown:3,craftedFrom:['Starroot','Verdant Heart']},
    {id:'z4-dev-ember-cinder-burst',name:'Cinder Burst',force:'Ember',damage:47,ingredientBonus:15,cooldown:2,craftedFrom:['Pyre Shard','Deepglass']},
    {id:'z4-dev-growth-thorn-bloom',name:'Thorn Bloom',force:'Growth',damage:36,ingredientBonus:12,cooldown:1,craftedFrom:['Verdant Heart','Starroot']},
    {id:'z4-dev-gale-razor-gust',name:'Razor Gust',force:'Gale',damage:37,ingredientBonus:14,cooldown:1,craftedFrom:['Feather Reed','Deepglass']}
  ];
  const library=existingLibrary.length?existingLibrary.map(spell=>({...spell})):sampleLibrary.map(spell=>({...spell}));
  const fallback={id:'ember-bolt',name:'Ember Bolt',force:'Ember',damage:20,cooldown:0,fallback:true};

  const preferred=['Cinder Burst','Thorn Bloom','Razor Gust'];
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
