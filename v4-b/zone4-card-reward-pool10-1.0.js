(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const api=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
  if(!cfg||cfg.zone!==4||!api?.decks)return;

  const pool=[
    {id:'calm-waters',name:'Calm Waters',text:'Reduce Danger by 3.'},
    {id:'ward-sigil',name:'Ward Sigil',text:'Block the next enemy spawn.'},
    {id:'steady-nerves',name:'Steady Nerves',text:'Next 3 movement steps do not advance ambient Danger.'},
    {id:'quiet-harvest',name:'Quiet Harvest',text:'Next harvested ingredient adds no Danger.'},
    {id:'false-trail',name:'False Trail',text:'The next combat cannot attract a nearby enemy.'},
    {id:'veiled-passage',name:'Veiled Passage',text:'Next 3 movement steps, nearby enemies cannot trigger adjacent aggro.'},
    {id:'fresh-tracks',name:'Fresh Tracks',text:'Reset the ambient Danger countdown to 3 steps.'},
    {id:'safe-window',name:'Safe Window',text:'No ambient enemy spawn during the next 3 movement steps.'},
    {id:'misdirection',name:'Misdirection',text:'Move one nearby normal mob 2 tiles away from Sharkan.'},
    {id:'pressure-break',name:'Pressure Break',text:'Reduce Danger by 2 and prevent the next combat-attraction check.'}
  ];

  const clean=value=>String(value||'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const clonePool=list=>list.map(card=>({...card}));
  api.decks.manipulation=clonePool(pool);

  const button=document.querySelector('.zone4-card-reward-test-modal [data-family="manipulation"]');
  if(button){
    button.addEventListener('click',()=>{
      const current=new Set((api.manipulationSlots?.()||[]).map(slot=>clean(slot.name)));
      const fresh=pool.filter(card=>!current.has(clean(card.name)));
      api.decks.manipulation=clonePool(fresh.length?fresh:pool);
      queueMicrotask(()=>{api.decks.manipulation=clonePool(pool);});
    },true);
  }

  window.HAJJEN_ZONE4_CARD_REWARD_POOL10={version:'1.0',pool:clonePool(pool)};
})();
