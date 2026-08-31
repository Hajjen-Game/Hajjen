(()=>{
  const SAVE_KEY='hajjen-v4b-campaign';
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return;

  let saved;
  try{saved=JSON.parse(raw);}catch{return;}

  const previousZone=Number(saved?.zone??1);
  if(previousZone>=2||saved?.zone2EntryPotionGranted)return;

  const carried=Number.isFinite(Number(saved?.potion))?Math.max(0,Number(saved.potion)):0;
  saved.potion=carried+1;
  saved.zone2EntryPotionGranted=true;
  localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
  window.HAJJEN_ZONE2_ENTRY_POTION_GRANTED=true;
})();
