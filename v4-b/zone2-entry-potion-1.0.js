(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const raw=localStorage.getItem(SAVE_KEY);

  // Direct Zone 2 test with no campaign save already starts with the core's
  // default single potion. Mark that entry after core init so reloads do not
  // grant or reset another one.
  if(!raw){
    window.HAJJEN_ZONE2_ENTRY_POTION_MARK_ONLY=true;
    return;
  }

  let saved;
  try{saved=JSON.parse(raw);}catch{return;}
  if(saved?.zone2EntryPotionGranted)return;

  const previousZone=Number(saved?.zone??1);
  if(previousZone>2)return;

  // Zone 2 starts with exactly one Healing Potion total. This is an entry
  // loadout rule, not a bonus on top of potions carried from Zone 1.
  // Once marked, reloads during the same Zone 2 run preserve the live count.
  saved.potion=1;
  saved.zone2EntryPotionGranted=true;
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED=true;
})();
