(()=>{
  const shouldPersistPotion=!!window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED||!!window.HAJJEN_ZONE2_ENTRY_POTION_MARK_ONLY;
  const shouldCapture=shouldPersistPotion||!!window.HAJJEN_ZONE2_ENTRY_SNAPSHOT_CAPTURE_NEEDED;
  if(!shouldCapture)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const ENTRY_KEY='hajjen-v4b-zone2-entry-snapshot';
  const ENTRY_LIBRARY_KEY='hajjen-v4b-zone2-entry-spell-library';

  let saved;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');}catch{return;}

  if(shouldPersistPotion){
    saved.zone2EntryPotionGranted=true;
    localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  }

  // Capture once. This becomes the canonical Zone 2 restart state used by
  // both F5 and the RESTART ZONE 2 button after defeat.
  if(!localStorage.getItem(ENTRY_KEY)){
    const entryRaw=localStorage.getItem(SAVE_KEY);
    if(entryRaw)localStorage.setItem(ENTRY_KEY,entryRaw);
    const libraryRaw=localStorage.getItem(LIBRARY_KEY);
    if(libraryRaw===null)localStorage.removeItem(ENTRY_LIBRARY_KEY);
    else localStorage.setItem(ENTRY_LIBRARY_KEY,libraryRaw);
  }
})();