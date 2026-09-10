(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2)return;
  cfg.combatAttraction={enabled:true,radius:3,chance:{calm:0,uneasy:0,dangerous:.30,hostile:.45,critical:.65}};
})();
