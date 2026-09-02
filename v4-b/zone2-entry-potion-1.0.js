(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const ENTRY_KEY='hajjen-v4b-zone2-entry-snapshot';
  const ENTRY_LIBRARY_KEY='hajjen-v4b-zone2-entry-spell-library';
  const raw=localStorage.getItem(SAVE_KEY);

  // F5 / RESTART ZONE 2 means a true zone restart: restore exactly what
  // Sharkan carried into Zone 2, while keeping the campaign before Zone 2.
  if(raw){
    try{
      const current=JSON.parse(raw);
      if(Number(current?.zone)===2){
        const entryRaw=localStorage.getItem(ENTRY_KEY);
        if(entryRaw){
          localStorage.setItem(SAVE_KEY,entryRaw);
          const entryLibrary=localStorage.getItem(ENTRY_LIBRARY_KEY);
          if(entryLibrary===null)localStorage.removeItem(LIBRARY_KEY);
          else localStorage.setItem(LIBRARY_KEY,entryLibrary);
          window.HAJJEN_ZONE2_ENTRY_SNAPSHOT_RESTORED=true;
          return;
        }
        // Migration for a Zone 2 session that existed before entry snapshots.
        window.HAJJEN_ZONE2_ENTRY_SNAPSHOT_CAPTURE_NEEDED=true;
      }
    }catch{}
  }

  // A genuinely new Zone 2 entry must never reuse a snapshot from an older
  // campaign/run. Clear only the restart snapshots; the live campaign and
  // spell library are captured again after campaign-core initializes.
  if(!raw){
    localStorage.removeItem(ENTRY_KEY);
    localStorage.removeItem(ENTRY_LIBRARY_KEY);
    // Direct Zone 2 test with no campaign save starts with the core's default
    // single potion. Mark that fresh entry so a new restart snapshot is made.
    window.HAJJEN_ZONE2_ENTRY_POTION_MARK_ONLY=true;
    return;
  }

  let saved;
  try{saved=JSON.parse(raw);}catch{return;}

  const previousZone=Number(saved?.zone??1);

  if(previousZone<2){
    localStorage.removeItem(ENTRY_KEY);
    localStorage.removeItem(ENTRY_LIBRARY_KEY);
  }

  // Legacy recovery for an in-zone save created before the entry snapshot
  // existed. New reloads are handled by the snapshot restore above.
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
  saved.potion=1;
  saved.zone2EntryPotionGranted=true;
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED=true;
})();