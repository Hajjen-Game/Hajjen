(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone<2)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
  if(!saved)return;

  const previousZone=Number(saved.zone??(cfg.zone-1));
  if(previousZone>=cfg.zone)return;

  saved.ingredients=[];
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  window.HAJJEN_ZONE_ENTRY_INGREDIENT_RESET={version:'1.1',from:previousZone,to:cfg.zone};
})();
