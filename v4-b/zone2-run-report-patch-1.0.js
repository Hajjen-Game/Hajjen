(()=>{
  const api=window.HAJJEN_V4B_ZONE2_RUN_REPORT;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  if(!api||!api.data||!state||cfg?.zone!==2)return;

  const data=api.data;
  const eventLog=document.getElementById('eventLog');
  const oldGetText=api.getText;
  let springUses=0,springHealing=0;

  // Correct effective damage after the campaign handler has actually applied
  // the counterattack. The original Zone 2 report sampled one microtask too early.
  document.addEventListener('click',e=>{
    if(!(e.target instanceof Element))return;
    const btn=e.target.closest('#combatSpells button');
    if(!btn||btn.disabled||!state.combat||!data.currentCombat)return;
    const live=data.currentCombat;
    const beforeHp=state.hp;
    const beforeEnemyHp=state.combat.hp;
    const damageMatch=(btn.querySelector('small')?.textContent||'').match(/(\d+) damage/i);
    const damage=damageMatch?Number(damageMatch[1]):0;
    setTimeout(()=>{
      if(beforeEnemyHp-damage<=0)return;
      const effective=Math.max(0,beforeHp-state.hp);
      if(!effective)return;
      live.damageTaken+=effective;
      data.metrics.effectiveDamageTaken+=effective;
    },0);
  },true);

  if(eventLog)new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(!(node instanceof Element))continue;
      const m=(node.textContent||'').trim().match(/^Primal Spring restored (\d+) HP\.$/i);
      if(m){springUses++;springHealing+=Number(m[1]);}
    }
  }).observe(eventLog,{childList:true});

  function patchedText(){
    let text=oldGetText();
    const springLine=`Primal Spring: ${springUses?'USED':'NOT USED'} | +${springHealing} HP`;
    if(/Potion introduction: .*\n/.test(text))text=text.replace(/(Potion introduction: .*\n)/,`$1${springLine}\n`);
    const total=text.match(/Total recorded healing: \+(\d+) HP/);
    if(total){const corrected=Number(total[1])+springHealing;text=text.replace(/Total recorded healing: \+\d+ HP/,`Total recorded healing: +${corrected} HP`);}
    return text;
  }
  api.getText=patchedText;

  // Replace the old copy listener so copied reports also use the corrected text.
  const oldBtn=document.getElementById('copyZone2RunReportBtn');
  if(oldBtn){
    const btn=oldBtn.cloneNode(true);oldBtn.replaceWith(btn);
    btn.addEventListener('click',async()=>{
      const text=patchedText();let copied=false;
      try{await navigator.clipboard.writeText(text);copied=true;}catch{}
      if(!copied){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{copied=document.execCommand('copy');}catch{}ta.remove();}
      btn.textContent=copied?'RUN REPORT COPIED':'COPY FAILED — TAP AGAIN';
      setTimeout(()=>{btn.textContent='COPY RUN REPORT';},1800);
    });
  }
})();
