/* HAJJEN Zone 4 — test Card Reward tile.
   Step on the configured tile, choose a card family, and receive one random bonus card. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const reward=cfg?.cardReward;
  if(!cfg||cfg.zone!==4||!state||!reward||window.HAJJEN_ZONE4_CARD_REWARD)return;

  const world=document.getElementById('world');
  const player=document.getElementById('player');
  const hand=document.getElementById('manipCards');
  if(!world||!player||!hand)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const bonuses=[];
  let serial=0;
  let claimed=false;
  let modalOpen=false;
  let ensuring=false;
  let ensureQueued=false;

  const manipulationDeck=[
    {id:'calm-waters',name:'Calm Waters',text:'Reduce Danger by 3.'},
    {id:'ward-sigil',name:'Ward Sigil',text:'Block the next mob spawn.'},
    {id:'steady-nerves',name:'Steady Nerves',text:'Next 3 moves do not advance ambient Danger.'},
    {id:'quiet-harvest',name:'Quiet Harvest',text:'Next collected ingredient adds no Danger.'}
  ];

  const random=array=>array[Math.floor(Math.random()*array.length)];
  const rewardTile=()=>world.querySelector(`.tile[data-r="${reward.row}"][data-c="${reward.col}"]`);
  const tier=()=>state.danger>=20?'CRITICAL':state.danger>=15?'HOSTILE':state.danger>=10?'DANGEROUS':state.danger>=5?'UNEASY':'CALM';
  const power=()=>state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;

  function addLog(text){
    const log=document.getElementById('eventLog');if(!log)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;log.prepend(row);
    while(log.children.length>9)log.lastChild.remove();
  }
  function addToast(text){
    const area=document.getElementById('toastArea');if(!area)return;
    const row=document.createElement('div');row.className='toast reward';row.textContent=text;area.prepend(row);setTimeout(()=>row.remove(),1700);
  }
  function syncStatus(){
    const dangerText=document.getElementById('dangerText');
    const dangerFill=document.getElementById('dangerFill');
    const dangerState=document.getElementById('dangerState');
    const clock=document.getElementById('clockText');
    const powerText=document.getElementById('powerText');
    if(dangerText)dangerText.textContent=`${state.danger} / 20`;
    if(dangerFill)dangerFill.style.width=`${Math.max(0,Math.min(20,state.danger))*5}%`;
    if(dangerState)dangerState.textContent=state.zoneCleared?'CLEARED':tier();
    if(clock)clock.textContent=state.zoneCleared?'SAFE':state.steadySteps?`${state.steadySteps} protected`:`${state.nextAmbient} steps`;
    if(powerText)powerText.textContent=state.zoneCleared?'+0%':`+${power()}%`;
  }
  function persistSpells(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{};
      saved.spells=state.spells;
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
    }catch{}
    try{
      const saved=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
      const library=Array.isArray(saved?.spells)?saved.spells:[];
      (state.spells||[]).filter(spell=>!spell.fallback).forEach(spell=>{
        const index=library.findIndex(item=>item?.id===spell.id);
        if(index>=0)library[index]={...spell};else library.push({...spell});
      });
      localStorage.setItem(LIBRARY_KEY,JSON.stringify({version:1,spells:library}));
    }catch{}
  }

  function playManipulation(bonus){
    if(bonus.used||state.gameOver||state.zoneCleared)return;
    if(bonus.def.id==='calm-waters'){
      const before=state.danger;state.danger=Math.max(0,state.danger-3);
      if(before!==state.danger)addLog(`Danger -${before-state.danger} (Calm Waters) → ${state.danger}/20.`);
    }else if(bonus.def.id==='ward-sigil')state.spawnBlock=(Number(state.spawnBlock)||0)+1;
    else if(bonus.def.id==='steady-nerves')state.steadySteps=3;
    else if(bonus.def.id==='quiet-harvest')state.quietHarvest=true;
    bonus.used=true;syncStatus();addToast(`${bonus.def.name.toUpperCase()} PLAYED`);addLog(`${bonus.def.name} played from Card Reward.`);ensureBonusCards();
  }

  function createManipulationCard(bonus){
    const card=document.createElement('div');
    card.className='card shared-hand-card hajjen-card-reward-bonus hajjen-card-reward-manipulation';
    card.dataset.handCategory='manipulation';card.dataset.handLabel=bonus.def.name;card.dataset.cardRewardId=bonus.key;
    const title=document.createElement('strong');title.textContent=bonus.def.name;
    const copy=document.createElement('span');copy.textContent=bonus.def.text;
    const button=document.createElement('button');button.type='button';button.addEventListener('click',()=>playManipulation(bonus));
    card.append(title,copy,button);return card;
  }

  function syncManipulationCard(card,bonus){
    const button=card.querySelector(':scope > button');
    card.classList.toggle('is-used',bonus.used);
    if(button){button.textContent=bonus.used?'USED':'PLAY';button.disabled=bonus.used||state.gameOver||state.zoneCleared;}
  }

  function enchantmentIds(spell){return Array.isArray(spell?.enchantments)?spell.enchantments.map(item=>typeof item==='string'?item:item?.id).filter(Boolean):[];}
  function applyBonusEnchantment(bonus,spellId){
    if(bonus.used||state.gameOver)return;
    const spell=(state.spells||[]).find(item=>item.id===spellId&&!item.fallback);if(!spell)return;
    if(!Array.isArray(spell.enchantments))spell.enchantments=[];
    if(!enchantmentIds(spell).includes(bonus.def.id))spell.enchantments.push({id:bonus.def.id,sourceZone:4,source:'card-reward'});
    bonus.used=true;bonus.appliedTo=spell.id;persistSpells();window.HAJJEN_ZONE4_ENCHANTMENTS?.sync?.();
    addToast(`${bonus.def.name.toUpperCase()} APPLIED`);addLog(`${bonus.def.name} from Card Reward applied to ${spell.name}.`);
    document.dispatchEvent(new CustomEvent('hajjen:enchantment-applied',{detail:{zone:4,cardId:bonus.key,spellId,reward:true}}));
    ensureBonusCards();
  }

  function createEnchantmentCard(bonus){
    const card=document.createElement('div');
    card.className='shared-hand-card enchantment hajjen-card-reward-bonus hajjen-card-reward-enchantment';
    card.dataset.handCategory='enchantment';card.dataset.handLabel=bonus.def.name;card.dataset.cardRewardId=bonus.key;
    const title=document.createElement('strong');title.textContent=bonus.def.name;
    const copy=document.createElement('span');copy.className='shared-enchantment-copy';copy.textContent=bonus.def.text;
    const select=document.createElement('select');select.className='shared-enchantment-select';select.setAttribute('aria-label','Choose spell to enchant');
    const apply=document.createElement('button');apply.type='button';apply.className='shared-enchantment-apply';apply.addEventListener('click',()=>applyBonusEnchantment(bonus,select.value));
    card.append(title,copy,select,apply);return card;
  }

  function syncEnchantmentCard(card,bonus){
    const copy=card.querySelector('.shared-enchantment-copy');
    const select=card.querySelector('.shared-enchantment-select');
    const apply=card.querySelector('.shared-enchantment-apply');
    const eligible=(state.spells||[]).filter(spell=>!spell.fallback);
    const wanted=select?.value||bonus.appliedTo||eligible[0]?.id||'';
    if(select){
      select.replaceChildren(...eligible.map(spell=>{const option=document.createElement('option');option.value=spell.id;option.textContent=spell.name;return option;}));
      if(eligible.some(spell=>spell.id===wanted))select.value=wanted;
      select.disabled=bonus.used||!eligible.length||state.gameOver;
    }
    if(copy)copy.textContent=bonus.used?`Applied to ${(state.spells||[]).find(spell=>spell.id===bonus.appliedTo)?.name||'spell'}`:bonus.def.text;
    if(apply){apply.textContent=bonus.used?'APPLIED':'APPLY ENCHANTMENT';apply.disabled=bonus.used||!select?.value||state.gameOver;}
    card.classList.toggle('is-used',bonus.used);
  }

  function equipBonusTactical(bonus){
    if(bonus.used||bonus.equipped||state.gameOver)return;
    bonus.equipped=true;ensureBonusCards();queueMicrotask(()=>window.HAJJEN_ZONE4_TACTICAL_COMBAT?.sync?.());
  }
  function createTacticalCard(bonus){
    const card=document.createElement('div');
    card.className='shared-hand-card tactical hajjen-card-reward-bonus hajjen-card-reward-tactical';
    card.dataset.handCategory='tactical';card.dataset.handLabel=bonus.def.name;card.dataset.tacticalId=bonus.key;card.dataset.cardRewardId=bonus.key;
    const title=document.createElement('strong');title.textContent=bonus.def.name;
    const copy=document.createElement('span');copy.className='shared-tactical-copy';copy.textContent=bonus.def.text;
    const button=document.createElement('button');button.type='button';button.className='shared-tactical-equip';button.addEventListener('click',()=>equipBonusTactical(bonus));
    card.append(title,copy,button);return card;
  }
  function syncTacticalCard(card,bonus){
    const combatUsed=window.HAJJEN_ZONE4_TACTICAL_COMBAT?.usedKeys?.has(bonus.key);
    if(combatUsed){bonus.used=true;bonus.equipped=false;}
    card.classList.toggle('is-used',bonus.used);card.classList.toggle('is-equipt',bonus.equipped&&!bonus.used);
    const button=card.querySelector('.shared-tactical-equip');
    if(button){button.textContent=bonus.used?'USED':bonus.equipped?'EQUIPT':'EQUIP';button.disabled=bonus.used||bonus.equipped||state.gameOver;button.setAttribute('aria-pressed',bonus.equipped&&!bonus.used?'true':'false');}
  }

  function createBonusCard(bonus){
    if(bonus.category==='manipulation')return createManipulationCard(bonus);
    if(bonus.category==='enchantment')return createEnchantmentCard(bonus);
    return createTacticalCard(bonus);
  }
  function syncBonusCard(card,bonus){
    if(bonus.category==='manipulation')syncManipulationCard(card,bonus);
    else if(bonus.category==='enchantment')syncEnchantmentCard(card,bonus);
    else syncTacticalCard(card,bonus);
  }
  function ensureBonusCards(){
    ensureQueued=false;if(ensuring||!hand.isConnected)return;ensuring=true;
    try{
      bonuses.forEach(bonus=>{
        let card=hand.querySelector(`:scope > [data-card-reward-id="${CSS.escape(bonus.key)}"]`);
        if(!card){
          card=createBonusCard(bonus);
          const placeholder=hand.querySelector(':scope > .shared-hand-placeholder');
          if(placeholder)placeholder.before(card);else hand.appendChild(card);
        }
        syncBonusCard(card,bonus);
      });
      window.HAJJEN_SHARED_HAND?.sync?.();
      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
    }finally{ensuring=false;}
  }
  function queueEnsure(){if(ensureQueued)return;ensureQueued=true;queueMicrotask(ensureBonusCards);}

  const handObserver=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))queueEnsure();});
  handObserver.observe(hand,{childList:true,subtree:false});

  function draw(category){
    let def=null;
    if(category==='manipulation')def=random(manipulationDeck);
    else if(category==='enchantment')def=random(cfg.enchantmentDeck||[]);
    else if(category==='tactical')def=random(cfg.tacticalDeck||[]);
    if(!def)return;
    const key=`card-reward-${category}-${def.id||String(def.name||'card').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${++serial}`;
    bonuses.push({key,category,def:{...def},used:false,equipped:false,appliedTo:null});
    claimed=true;closeModal();decorateTile();ensureBonusCards();
    const label=category==='manipulation'?'Manipulation':category==='enchantment'?'Enchantment':'Tactical';
    addToast(`${String(def.name||label).toUpperCase()} DRAWN`);addLog(`Card Reward: drew ${def.name} (${label}).`);
    document.dispatchEvent(new CustomEvent('hajjen:card-reward-drawn',{detail:{zone:4,category,name:def.name,id:def.id||null}}));
  }

  const modal=document.createElement('div');
  modal.id='zone4CardRewardModal';modal.className='hajjen-card-reward-modal';modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="hajjen-card-reward-dialog" role="dialog" aria-modal="true" aria-labelledby="zone4CardRewardTitle">
    <div class="hajjen-card-reward-kicker">CARD REWARD</div>
    <h2 id="zone4CardRewardTitle">CHOOSE A CARD TYPE</h2>
    <p>Choose one family. You receive one random card from that deck.</p>
    <div class="hajjen-card-reward-choices">
      <button type="button" data-card-family="manipulation"><span class="hajjen-card-reward-choice-icon manipulation"></span><strong>MANIPULATION</strong><small>Draw 1 random card</small></button>
      <button type="button" data-card-family="enchantment"><span class="hajjen-card-reward-choice-icon enchantment"></span><strong>ENCHANTMENT</strong><small>Draw 1 random card</small></button>
      <button type="button" data-card-family="tactical"><span class="hajjen-card-reward-choice-icon tactical"></span><strong>TACTICAL</strong><small>Draw 1 random card</small></button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-card-family]').forEach(button=>button.addEventListener('click',()=>draw(button.dataset.cardFamily)));

  function openModal(){
    if(claimed||modalOpen||state.combat||state.gameOver)return;
    modalOpen=true;modal.classList.add('show');modal.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>modal.querySelector('[data-card-family]')?.focus());
  }
  function closeModal(){modalOpen=false;modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
  function onKeydown(event){
    if(!modalOpen)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}
  }
  window.addEventListener('keydown',onKeydown,true);

  function updateTileInfo(){
    if(claimed)return;
    const title=document.getElementById('tileTitle');
    const sub=document.getElementById('tileSub');
    const desc=document.getElementById('tileDesc');
    if(title)title.textContent=String(reward.title||'CARD REWARD').toUpperCase();
    if(sub)sub.textContent='CARD REWARD';
    if(desc)desc.textContent='Step here to choose Manipulation, Enchantment or Tactical and draw one random card.';
  }

  function decorateTile(){
    const tile=rewardTile();if(!tile)return;
    let icon=tile.querySelector(':scope > .hajjen-card-reward-tile-icon');
    if(claimed){tile.classList.remove('hajjen-card-reward-tile');icon?.remove();return;}
    tile.classList.add('hajjen-card-reward-tile');
    if(!icon){
      icon=document.createElement('span');icon.className='hajjen-card-reward-tile-icon';icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<i class="manipulation"></i><i class="enchantment"></i><i class="tactical"></i>';
      tile.appendChild(icon);
    }
    if(!tile.dataset.cardRewardBound){
      tile.dataset.cardRewardBound='1';
      tile.addEventListener('mouseenter',()=>queueMicrotask(updateTileInfo));
      tile.addEventListener('focusin',()=>queueMicrotask(updateTileInfo));
    }
  }

  function checkLanding(){
    decorateTile();
    if(!claimed&&!modalOpen&&Number(state.row)===Number(reward.row)&&Number(state.col)===Number(reward.col))openModal();
  }

  const tile=rewardTile();
  const tileObserver=tile?new MutationObserver(()=>queueMicrotask(decorateTile)):null;
  tileObserver?.observe(tile,{attributes:true,attributeFilter:['class']});
  const playerObserver=new MutationObserver(checkLanding);playerObserver.observe(player,{attributes:true,attributeFilter:['style']});
  document.addEventListener('hajjen:tactical-used',event=>{
    const key=event.detail?.key;const bonus=bonuses.find(item=>item.category==='tactical'&&item.key===key);if(!bonus)return;
    bonus.used=true;bonus.equipped=false;queueEnsure();
  });

  decorateTile();checkLanding();
  window.HAJJEN_ZONE4_CARD_REWARD={version:'1.0-test',reward,bonuses,get claimed(){return claimed;},open:openModal,draw,ensure:ensureBonusCards,tileObserver,playerObserver,handObserver};
})();
