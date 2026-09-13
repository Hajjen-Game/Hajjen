/* HAJJEN Zone 4 DEV — first permanent loot pass.
   Each defeated elite offers a deterministic choice between two Rank I items.
   The chosen item is added to the RPG inventory and equipped immediately.
   Uses the isolated RPG Profile only; no core combat/board rewrite. */
(()=>{
  if(window.HAJJEN_ZONE4_RPG_LOOT)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(Number(cfg?.zone)!==4||!state)return;

  const REWARD_DELAY_MS=750;
  const ITEMS={
    tideguardVest:{id:'z4-tideguard-vest',name:'Tideguard Vest',slot:'armor',rank:1,stats:{power:0,vitality:4,resolve:2},flavor:'Layered hide that steadies Sharkan when the pressure rises.'},
    aetherglassCharm:{id:'z4-aetherglass-charm',name:'Aetherglass Charm',slot:'charm',rank:1,stats:{power:6,vitality:0,resolve:0},flavor:'A fractured prism that amplifies every spell cast.'},
    riftshardRelic:{id:'z4-riftshard-relic',name:'Riftshard Relic',slot:'relic',rank:1,stats:{power:5,vitality:0,resolve:2},flavor:'A dense shard humming with restrained Aether.'},
    huntersCompass:{id:'z4-hunters-compass',name:"Hunter's Compass",slot:'tool',rank:1,stats:{power:3,vitality:0,resolve:2},flavor:'A field tool tuned to hostile movement and quick decisions.'}
  };
  const REWARDS=[
    [ITEMS.tideguardVest,ITEMS.aetherglassCharm],
    [ITEMS.riftshardRelic,ITEMS.huntersCompass]
  ];

  let seenEliteKills=Math.max(0,Number(state.eliteKills)||0);
  const pending=[];
  let activeReward=null;

  function statLine(item){
    const s=item.stats||{};const parts=[];
    if(Number(s.power))parts.push(`+${s.power} Power`);
    if(Number(s.vitality))parts.push(`+${s.vitality} Vitality`);
    if(Number(s.resolve))parts.push(`+${s.resolve} Resolve`);
    return parts.join(' · ');
  }

  function effectLine(item){
    const s=item.stats||{};const parts=[];
    if(Number(s.power))parts.push(`+${s.power} spell damage`);
    if(Number(s.vitality))parts.push(`+${s.vitality*5} Max HP`);
    if(Number(s.resolve))parts.push(`-${Math.floor(s.resolve/2)} incoming damage`);
    return parts.join(' · ');
  }

  function createModal(){
    let modal=document.getElementById('zone4RpgLootModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='zone4RpgLootModal';
    modal.className='zone4-rpg-loot-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="zone4-rpg-loot-backdrop"></div><section class="zone4-rpg-loot-card" role="dialog" aria-modal="true" aria-labelledby="zone4RpgLootTitle"><header><span>ELITE REWARD</span><h2 id="zone4RpgLootTitle">CHOOSE YOUR LOOT</h2><p>Choose one permanent item. It will be equipped immediately.</p></header><div class="zone4-rpg-loot-options"></div></section>';
    document.body.appendChild(modal);
    return modal;
  }

  function currentForSlot(slot){
    return window.HAJJEN_RPG_STATE?.getProfile?.()?.equipment?.[slot]||null;
  }

  function renderReward(killNumber){
    const choices=REWARDS[Math.min(killNumber-1,REWARDS.length-1)]||REWARDS[0];
    const modal=createModal();
    const options=modal.querySelector('.zone4-rpg-loot-options');
    if(!options)return;
    options.replaceChildren();
    choices.forEach(item=>{
      const current=currentForSlot(item.slot);
      const node=document.createElement('article');
      node.className='zone4-rpg-loot-option';
      node.innerHTML=`<div class="zone4-rpg-loot-type"><span>${item.slot.toUpperCase()}</span><b>RANK I</b></div><h3>${item.name}</h3><strong>${statLine(item)}</strong><small>${effectLine(item)}</small><p>${item.flavor}</p><div class="zone4-rpg-loot-current">${current?`Currently equipped: <b>${current.name}</b>`:'Slot currently empty'}</div><button type="button">TAKE & EQUIP</button>`;
      node.querySelector('button')?.addEventListener('click',()=>choose(item,killNumber));
      options.appendChild(node);
    });
  }

  function choose(item,killNumber){
    const rpg=window.HAJJEN_RPG_STATE;
    if(!rpg?.updateProfile)return;
    rpg.updateProfile(profile=>{
      profile.inventory=Array.isArray(profile.inventory)?profile.inventory:[];
      const existing=profile.inventory.find(entry=>entry?.id===item.id);
      const owned=existing||JSON.parse(JSON.stringify(item));
      if(!existing)profile.inventory.push(owned);
      profile.equipment=profile.equipment||{};
      profile.equipment[item.slot]=JSON.parse(JSON.stringify(owned));
      return profile;
    },`elite-loot-${killNumber}`);

    activeReward=null;
    const modal=createModal();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('zone4-rpg-loot-open');
    window.HAJJEN_ZONE4_RPG_BACKPACK_ISOLATED?.render?.();
    setTimeout(maybeOpenNext,80);
  }

  function openReward(killNumber){
    if(activeReward||state.combat)return false;
    activeReward=killNumber;
    renderReward(killNumber);
    const modal=createModal();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('zone4-rpg-loot-open');
    return true;
  }

  function maybeOpenNext(){
    if(activeReward||state.combat||state.gameOver||!pending.length)return;
    const next=pending[0];
    if(performance.now()<next.readyAt)return;
    pending.shift();
    openReward(next.killNumber);
  }

  function tick(){
    const kills=Math.max(0,Number(state.eliteKills)||0);
    if(kills>seenEliteKills){
      const now=performance.now();
      for(let n=seenEliteKills+1;n<=kills;n++)pending.push({killNumber:n,readyAt:now+REWARD_DELAY_MS});
      seenEliteKills=kills;
    }
    maybeOpenNext();
  }

  document.addEventListener('keydown',event=>{
    const modal=document.getElementById('zone4RpgLootModal');
    if(!modal?.classList.contains('is-open'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  const timer=setInterval(tick,80);
  tick();

  window.HAJJEN_ZONE4_RPG_LOOT={
    version:'1.1-elite-choice-750ms-beat',
    items:ITEMS,
    rewards:REWARDS,
    rewardDelayMs:REWARD_DELAY_MS,
    tick,
    stop:()=>clearInterval(timer)
  };
})();
