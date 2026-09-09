(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const ENTRY_KEY='hajjen-v4b-zone2-entry-snapshot';
  const ENTRY_LIBRARY_KEY='hajjen-v4b-zone2-entry-spell-library';
  const REPLAY_BACKUP_KEY='hajjen-v4b-zone2-replay-campaign-backup';
  const REPLAY_LIBRARY_BACKUP_KEY='hajjen-v4b-zone2-replay-library-backup';
  const MISSING='__HAJJEN_MISSING__';
  const raw=localStorage.getItem(SAVE_KEY);

  function normalizedEntryRaw(entryRaw){
    if(!entryRaw)return null;
    try{
      const entry=JSON.parse(entryRaw);
      if(Number(entry?.level)>cfg.levelFloor){
        const maxHp=100+(cfg.levelFloor-1)*15;
        entry.level=cfg.levelFloor;
        entry.xp=120;
        entry.maxHp=maxHp;
        entry.hp=maxHp;
        entry.zone=2;
      }
      return JSON.stringify(entry);
    }catch{return entryRaw;}
  }

  function armReplayRestore(){
    let restored=false;
    const restore=()=>{
      if(restored)return;
      restored=true;
      const campaignBackup=sessionStorage.getItem(REPLAY_BACKUP_KEY);
      const libraryBackup=sessionStorage.getItem(REPLAY_LIBRARY_BACKUP_KEY);
      if(campaignBackup!==null)localStorage.setItem(SAVE_KEY,campaignBackup);
      if(libraryBackup===MISSING)localStorage.removeItem(LIBRARY_KEY);
      else if(libraryBackup!==null)localStorage.setItem(LIBRARY_KEY,libraryBackup);
      sessionStorage.removeItem(REPLAY_BACKUP_KEY);
      sessionStorage.removeItem(REPLAY_LIBRARY_BACKUP_KEY);
    };
    window.addEventListener('pagehide',restore,{once:true});
    window.addEventListener('beforeunload',restore,{once:true});
    window.HAJJEN_ZONE2_REPLAY_RESTORE=restore;
  }

  /* If a previous replay was interrupted before pagehide completed, keep the
     higher-zone campaign backup protected and re-arm its restore hook. */
  if(sessionStorage.getItem(REPLAY_BACKUP_KEY)!==null){
    window.HAJJEN_ZONE2_REPLAY_MODE=true;
    armReplayRestore();
  }

  // F5 / RESTART ZONE 2 means a true zone restart: restore exactly what
  // Sharkan carried into Zone 2, while keeping the campaign before Zone 2.
  if(raw){
    try{
      const current=JSON.parse(raw);
      const currentZone=Number(current?.zone);

      if(currentZone>2){
        /* Manual revisit/test after the campaign has already reached Zone 3.
           Run Zone 2 from its entry snapshot, but keep the real later campaign
           save in sessionStorage and restore it when this page is left. */
        sessionStorage.setItem(REPLAY_BACKUP_KEY,raw);
        const currentLibrary=localStorage.getItem(LIBRARY_KEY);
        sessionStorage.setItem(REPLAY_LIBRARY_BACKUP_KEY,currentLibrary===null?MISSING:currentLibrary);

        let replayRaw=normalizedEntryRaw(localStorage.getItem(ENTRY_KEY));
        if(!replayRaw){
          const maxHp=100+(cfg.levelFloor-1)*15;
          const replay={...current,zone:2,level:cfg.levelFloor,xp:120,maxHp,hp:maxHp,potion:1,zone2EntryPotionGranted:true};
          replayRaw=JSON.stringify(replay);
        }
        localStorage.setItem(SAVE_KEY,replayRaw);

        const entryLibrary=localStorage.getItem(ENTRY_LIBRARY_KEY);
        if(entryLibrary===null)localStorage.removeItem(LIBRARY_KEY);
        else localStorage.setItem(LIBRARY_KEY,entryLibrary);

        window.HAJJEN_ZONE2_REPLAY_MODE=true;
        armReplayRestore();
        return;
      }

      if(currentZone===2){
        const entryRaw=normalizedEntryRaw(localStorage.getItem(ENTRY_KEY));
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
    saved.xp=120;
    saved.maxHp=100+(cfg.levelFloor-1)*15;
    saved.hp=saved.maxHp;
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