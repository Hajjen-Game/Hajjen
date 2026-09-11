/* HAJJEN Zone 4 — visible proxy for bonus cards drawn from Card Reward.
   The approved production Hand caps its normal lists at 4/2/2, so test bonus
   cards are surfaced in a small BONUS DRAW section while their real source
   cards remain in #manipCards and own the gameplay actions. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const api=window.HAJJEN_ZONE4_CARD_REWARD;
  const hand=document.getElementById('manipCards');
  if(!cfg||cfg.zone!==4||!state||!api||!hand||window.HAJJEN_ZONE4_CARD_REWARD_HAND)return;

  const panel=hand.closest('.shared-hand-panel')||hand.closest('.manipulation-panel')||hand.closest('.panel');
  if(!panel)return;

  const label={manipulation:'MANIPULATION',enchantment:'ENCHANTMENT',tactical:'TACTICAL'};
  const icon={
    manipulation:'assets/hand-icons/hand-manipulation.png',
    enchantment:'assets/hand-icons/hand-enchantment.png',
    tactical:'assets/hand-icons/hand-tactical.png'
  };
  let renderQueued=false;

  function sourceFor(bonus){return hand.querySelector(`:scope > [data-card-reward-id="${CSS.escape(bonus.key)}"]`);}
  function sourceButton(bonus){
    const source=sourceFor(bonus);if(!source)return null;
    if(bonus.category==='enchantment')return source.querySelector(':scope > .shared-enchantment-apply');
    if(bonus.category==='tactical')return source.querySelector(':scope > .shared-tactical-equip, :scope > button');
    return source.querySelector(':scope > button');
  }
  function actionText(bonus){
    const live=sourceButton(bonus);
    const text=String(live?.textContent||'').trim();
    if(text)return text;
    if(bonus.used)return bonus.category==='enchantment'?'APPLIED':'USED';
    return bonus.category==='tactical'?(bonus.equipped?'EQUIPT':'EQUIP'):bonus.category==='enchantment'?'APPLY':'PLAY';
  }

  function applyEnchantFromProxy(bonus,spellId){
    const source=sourceFor(bonus);
    const select=source?.querySelector(':scope > .shared-enchantment-select');
    const apply=source?.querySelector(':scope > .shared-enchantment-apply');
    if(!select||!apply||apply.disabled||!spellId)return;
    select.value=spellId;select.dispatchEvent(new Event('change',{bubbles:true}));apply.click();
    setTimeout(render,0);
  }

  function makeBonusRow(bonus){
    const row=document.createElement('div');
    row.className=`hajjen-card-reward-hand-row ${bonus.category}${bonus.used?' is-used':''}`;
    row.dataset.cardRewardProxy=bonus.key;

    const image=document.createElement('img');image.className='hajjen-card-reward-hand-icon';image.src=icon[bonus.category];image.alt='';image.setAttribute('aria-hidden','true');
    const copy=document.createElement('div');copy.className='hajjen-card-reward-hand-copy';
    const meta=document.createElement('small');meta.textContent=`BONUS · ${label[bonus.category]}`;
    const title=document.createElement('strong');title.textContent=bonus.def?.name||label[bonus.category];
    const desc=document.createElement('span');desc.textContent=bonus.used&&bonus.category==='enchantment'
      ?`Applied to ${(state.spells||[]).find(spell=>spell.id===bonus.appliedTo)?.name||'spell'}`
      :(bonus.def?.text||'Bonus card.');
    copy.append(meta,title,desc);

    const actions=document.createElement('div');actions.className='hajjen-card-reward-hand-actions';
    if(bonus.category==='enchantment'&&!bonus.used){
      const select=document.createElement('select');select.setAttribute('aria-label',`Choose spell for ${title.textContent}`);
      (state.spells||[]).filter(spell=>!spell.fallback).forEach(spell=>{const option=document.createElement('option');option.value=spell.id;option.textContent=spell.name;select.appendChild(option);});
      const button=document.createElement('button');button.type='button';button.textContent='APPLY';button.disabled=!select.value||!!state.gameOver;
      button.addEventListener('click',()=>applyEnchantFromProxy(bonus,select.value));actions.append(select,button);
    }else{
      const live=sourceButton(bonus);
      const button=document.createElement('button');button.type='button';button.textContent=actionText(bonus);
      button.disabled=!!bonus.used||!!live?.disabled||!!state.gameOver;
      button.addEventListener('click',()=>{const current=sourceButton(bonus);if(current&&!current.disabled)current.click();setTimeout(render,0);});
      actions.appendChild(button);
    }
    row.append(image,copy,actions);return row;
  }

  function render(){
    renderQueued=false;
    let tray=panel.querySelector(':scope > .hajjen-card-reward-hand-tray');
    const bonuses=api.bonuses||[];
    if(!bonuses.length){tray?.remove();return;}
    if(!tray){tray=document.createElement('section');tray.className='hajjen-card-reward-hand-tray';panel.appendChild(tray);}
    const head=document.createElement('div');head.className='hajjen-card-reward-hand-head';
    const title=document.createElement('strong');title.textContent='BONUS DRAW';
    const count=document.createElement('span');count.textContent=`${bonuses.length} CARD${bonuses.length===1?'':'S'}`;
    head.append(title,count);
    const rows=document.createElement('div');rows.className='hajjen-card-reward-hand-rows';bonuses.forEach(bonus=>rows.appendChild(makeBonusRow(bonus)));
    tray.replaceChildren(head,rows);
  }
  function schedule(){if(renderQueued)return;renderQueued=true;queueMicrotask(render);}

  new MutationObserver(schedule).observe(hand,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});
  document.addEventListener('hajjen:card-reward-drawn',schedule);
  document.addEventListener('hajjen:enchantment-applied',schedule);
  document.addEventListener('hajjen:tactical-used',schedule);
  render();

  window.HAJJEN_ZONE4_CARD_REWARD_HAND={version:'1.0-test-proxy',panel,render,schedule};
})();
