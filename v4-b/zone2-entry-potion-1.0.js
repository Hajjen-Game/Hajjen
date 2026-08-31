(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const raw=localStorage.getItem(SAVE_KEY);

  // Direct Zone 2 test with no campaign save already starts with the core's
  // default potion. Mark that entry after core init so reloads do not grant
  // another one.
  if(!raw){
    window.HAJJEN_ZONE2_ENTRY_POTION_MARK_ONLY=true;
    return;
  }

  let saved;
  try{saved=JSON.parse(raw);}catch{return;}
  if(saved?.zone2EntryPotionGranted)return;

  const previousZone=Number(saved?.zone??1);
  if(previousZone>2)return;

  // Zone 2 always supplies one fresh Healing Potion in addition to whatever
  // Sharkan carried out of Zone 1. This also migrates existing Zone 2 entry
  // checkpoints created before this rule was added.
  const carried=Number.isFinite(Number(saved?.potion))?Math.max(0,Number(saved.potion)):0;
  saved.potion=carried+1;
  saved.zone2EntryPotionGranted=true;
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED=true;
})();
