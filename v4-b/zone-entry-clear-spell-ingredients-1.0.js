(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||!state||cfg.zone<2)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
  if(!saved)return;

  const previousZone=Number(saved.zone??cfg.zone);
  const enteringZone=previousZone<cfg.zone;
  if(!enteringZone)return;

  state.spellIngredients=[];
  saved.ingredients=[];
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));

  window.HAJJEN_ZONE_ENTRY_INGREDIENT_RESET={version:'1.0',zone:cfg.zone};
})();
