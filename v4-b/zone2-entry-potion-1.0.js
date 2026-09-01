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

  const previousZone=Number(saved?.zone??1);

  // Zone 1 currently caps at Level 4 and its capstone HP is 165. A Zone 2
  // entry save above Level 4 can therefore only be stale in-zone progress,
  // not valid campaign progress carried from Zone 1. Recover the proper Zone 2
  // entry state instead of allowing a reload/retry to begin at the Zone 2 cap.
  if(previousZone===2&&Number(saved?.level)>cfg.levelFloor){
    saved.level=cfg.levelFloor;
    saved.xp=Math.min(Number.isFinite(Number(saved.xp))?Number(saved.xp):120,120);
    saved.maxHp=165;
    saved.hp=165;
    saved.potion=1;
    localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  }

  if(saved?.zone2EntryPotionGranted)return;
  if(previousZone>2)return;

  // Zone 2 starts with exactly one Healing Potion total. This is an entry
  // loadout rule, not a bonus on top of potions carried from Zone 1.
  // Once marked, reloads during the same Zone 2 run preserve the live count.
  saved.potion=1;
  saved.zone2EntryPotionGranted=true;
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED=true;
})();