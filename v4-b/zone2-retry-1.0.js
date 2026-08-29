(()=>{
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const resetBtn=document.getElementById('resetBtn');
  if(!cfg||cfg.zone!==2||!state||!resetBtn)return;

  let defeatMode=false;

  function syncRetryUi(){
    const defeated=!!state.gameOver;
    if(defeated===defeatMode)return;
    defeatMode=defeated;
    resetBtn.textContent=defeated?'RESTART ZONE 2':'RESET CAMPAIGN';
  }

  // campaign-zone.js keeps the Zone 2 entry state in the campaign save.
  // On defeat we reload Zone 2 without clearing that save, so the whole zone
  // restarts while Sharkan keeps everything he carried into the zone.
  resetBtn.addEventListener('click',event=>{
    if(!state.gameOver)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href='zone2.html';
  },true);

  syncRetryUi();
  setInterval(syncRetryUi,100);
})();
