/* Zone 4 Card Reward location for moving-enemy layout.
   Visible Row 6, Column 14 = zero-based 5,13, shortly after the first elite band. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==4)return;
  cfg.cardRewardTest={row:5,col:13,title:'CARD REWARD'};
})();
