/* Zone 4 Card Reward — fix Manipulation replacement description after vector decoration. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone!==4)return;

  const hand=document.getElementById('manipCards');
  if(!hand)return;

  let queued=false;
  let syncing=false;
  const clean=text=>String(text||'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim();

  function descriptionNode(card){
    return [...card.children].find(node=>{
      if(!(node instanceof HTMLElement)||!node.matches('span,small'))return false;
      return !node.classList.contains('hajjen-manip-card-icon-wrap')&&
        !node.classList.contains('hajjen-hand-icon-slot')&&
        !node.classList.contains('hajjen-hand-title-rule')&&
        !node.classList.contains('hajjen-manip-card-icon');
    })||null;
  }

  function sync(){
    queued=false;
    if(syncing)return;
    syncing=true;
    try{
      const api=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
      const replacements=api?.manipulationReplacements;
      if(!Array.isArray(replacements))return;

      replacements.forEach((replacement,index)=>{
        if(!replacement?.def)return;
        const card=hand.querySelector(`:scope > [data-card-reward-manip-slot="${index}"]`);
        if(!card)return;
        const copy=descriptionNode(card);
        if(copy&&clean(copy.textContent)!==clean(replacement.def.text))copy.textContent=replacement.def.text||'';
      });

      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
    }finally{
      syncing=false;
    }
  }

  function schedule(){if(queued)return;queued=true;queueMicrotask(sync);}

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'||record.type==='characterData'))schedule();
  });
  observer.observe(hand,{childList:true,subtree:true,characterData:true});

  document.addEventListener('hajjen:zone4-card-reward-test',schedule);
  requestAnimationFrame(()=>requestAnimationFrame(sync));

  window.HAJJEN_ZONE4_CARD_REWARD_MANIP_COPY_FIX={version:'1.0',sync,observer};
})();
