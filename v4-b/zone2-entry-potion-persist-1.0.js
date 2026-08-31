(()=>{
  if(!window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED&&!window.HAJJEN_ZONE2_ENTRY_POTION_MARK_ONLY)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  let saved;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');}catch{return;}
  saved.zone2EntryPotionGranted=true;
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
})();
