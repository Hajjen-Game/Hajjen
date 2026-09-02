(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const BACKUP_KEY='hajjen-v4b-zone3-dev-backup-v1';

  // Recover from an earlier dev session if the browser closed before pagehide.
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
    {id:'dev-flow-tide-lash',name:'Tide Lash',force:'Flow',damage:31,ingredientBonus:5,cooldown:1,craftedFrom:['Tide Pearl','Cinder Seed']},
    {id:'dev-stone-breaker',name:'Stone Breaker',force:'Stone',damage:33,ingredientBonus:4,cooldown:2,craftedFrom:['Ironroot','Feather Reed']},
    {id:'dev-aether-rift-pulse',name:'Rift Pulse',force:'Aether',damage:37,ingredientBonus:2,cooldown:3,craftedFrom:['Moonspore','Bloomcap']}
  ];
  const library=existingLibrary.length?existingLibrary.map(spell=>({...spell})):sampleLibrary.map(spell=>({...spell}));
  const fallback={id:'ember-bolt',name:'Ember Bolt',force:'Ember',damage:20,cooldown:0,fallback:true};
  const existingLoaded=Array.isArray(existingCampaign.spells)?existingCampaign.spells.filter(Boolean):[];
  const loadedCrafted=existingLoaded.filter(spell=>!spell.fallback).slice(0,3);
  const loaded=[fallback,...(loadedCrafted.length?loadedCrafted:library.slice(0,3))];

  loaded.filter(spell=>!spell.fallback).forEach(spell=>{
    if(!library.some(item=>item.id===spell.id))library.push({...spell});
  });

  const devSave={
    version:1,
    zone:2,
    level:7,
    xp:330,
    maxHp:210,
    hp:210,
    potion:1,
    spells:loaded,
    ingredients:Array.isArray(existingCampaign.ingredients)?existingCampaign.ingredients:[],
    potionIngredients:[]
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(devSave));
  localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));

  window.HAJJEN_ZONE3_DEV_MODE=true;
  document.documentElement.dataset.hajjenDev='zone3';

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
    document.body.classList.add('zone3-dev-mode');
    const build=document.querySelector('.titlebar .build');
    if(build)build.textContent=`${build.textContent} · DEV MODE`;
  },{once:true});
})();
