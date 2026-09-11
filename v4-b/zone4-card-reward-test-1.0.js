/* HAJJEN Zone 4 — isolated Card Reward stability test.
   Does not modify Hand/shared renderers. It only decorates one board tile,
   opens a chooser when Sharkan enters it, and reveals a random card. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const reward=cfg?.cardRewardTest;
  if(!cfg||cfg.zone!==4||!state||!reward||window.HAJJEN_ZONE4_CARD_REWARD_TEST)return;

  const world=document.getElementById('world');
  const player=document.getElementById('player');
  const eventLog=document.getElementById('eventLog');
  if(!world||!player)return;

  const manipulationDeck=[
    {id:'calm-waters',name:'Calm Waters',text:'Reduce Danger by 3.'},
    {id:'ward-sigil',name:'Ward Sigil',text:'Block the next mob spawn.'},
    {id:'steady-nerves',name:'Steady Nerves',text:'Next 3 moves do not advance ambient Danger.'},
    {id:'quiet-harvest',name:'Quiet Harvest',text:'Next collected ingredient adds no Danger.'}
  ];
  const decks={
    manipulation:manipulationDeck,
    enchantment:Array.isArray(cfg.enchantmentDeck)?cfg.enchantmentDeck:[],
    tactical:Array.isArray(cfg.tacticalDeck)?cfg.tacticalDeck:[]
  };
  const labels={manipulation:'MANIPULATION',enchantment:'ENCHANTMENT',tactical:'TACTICAL'};

  let claimed=false;
  let modalOpen=false;
  let lastPosition=`${state.row},${state.col}`;
  let drawn=null;

  const rewardTile=()=>world.querySelector(`.tile[data-r="${reward.row}"][data-c="${reward.col}"]`);
  const random=array=>array.length?array[Math.floor(Math.random()*array.length)]:null;

  function log(text){
    if(!eventLog)return;
    const row=document.createElement('div');
    row.className='event reward';
    row.textContent=text;
    eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }

  function decorate(){
    const tile=rewardTile();
    if(!tile)return false;
    tile.classList.toggle('zone4-card-reward-test-tile',!claimed);
    tile.classList.toggle('zone4-card-reward-test-claimed',claimed);
    let icon=tile.querySelector(':scope > .zone4-card-reward-test-icon');
    if(claimed){icon?.remove();return true;}
    if(!icon){
      icon=document.createElement('span');
      icon.className='zone4-card-reward-test-icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<i class="manipulation"></i><i class="enchantment"></i><i class="tactical"></i>';
      tile.appendChild(icon);
    }
    return true;
  }

  const modal=document.createElement('div');
  modal.className='zone4-card-reward-test-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`
    <div class="zone4-card-reward-test-dialog" role="dialog" aria-modal="true" aria-labelledby="zone4CardRewardTestTitle">
      <div class="zone4-card-reward-test-kicker">CARD REWARD</div>
      <div class="zone4-card-reward-test-choose">
        <h2 id="zone4CardRewardTestTitle">CHOOSE A CARD TYPE</h2>
        <p>Choose one deck. You will draw one random card from it.</p>
        <div class="zone4-card-reward-test-choices">
          <button type="button" data-family="manipulation"><span class="swatch"></span><strong>MANIPULATION</strong><small>Draw 1 random card</small></button>
          <button type="button" data-family="enchantment"><span class="swatch"></span><strong>ENCHANTMENT</strong><small>Draw 1 random card</small></button>
          <button type="button" data-family="tactical"><span class="swatch"></span><strong>TACTICAL</strong><small>Draw 1 random card</small></button>
        </div>
      </div>
      <div class="zone4-card-reward-test-result" hidden>
        <small class="family"></small>
        <h2 class="name"></h2>
        <p class="description"></p>
        <button type="button" class="continue">CONTINUE</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const chooseView=modal.querySelector('.zone4-card-reward-test-choose');
  const resultView=modal.querySelector('.zone4-card-reward-test-result');

  function openModal(){
    if(claimed||modalOpen||state.combat||state.gameOver)return;
    modalOpen=true;
    chooseView.hidden=false;
    resultView.hidden=true;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>modal.querySelector('[data-family]')?.focus({preventScroll:true}));
  }

  function closeModal(){
    modalOpen=false;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  }

  function draw(family){
    const card=random(decks[family]||[]);
    if(!card)return;
    drawn={family,card:{...card}};
    claimed=true;
    decorate();
    chooseView.hidden=true;
    resultView.hidden=false;
    resultView.dataset.family=family;
    resultView.querySelector('.family').textContent=labels[family]||family.toUpperCase();
    resultView.querySelector('.name').textContent=card.name||'CARD';
    resultView.querySelector('.description').textContent=card.text||'';
    log(`Card Reward: drew ${card.name} (${labels[family]||family}).`);
    document.dispatchEvent(new CustomEvent('hajjen:zone4-card-reward-test',{detail:{zone:4,family,card:{...card}}}));
    resultView.querySelector('.continue')?.focus({preventScroll:true});
  }

  modal.querySelectorAll('[data-family]').forEach(button=>button.addEventListener('click',()=>draw(button.dataset.family)));
  modal.querySelector('.continue')?.addEventListener('click',closeModal);

  /* Stop the normal movement key handler only while the reward dialog is open. */
  window.addEventListener('keydown',event=>{
    if(!modalOpen)return;
    const movement=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'];
    if(movement.includes(event.key)){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);

  function syncPosition(){
    decorate();
    const current=`${state.row},${state.col}`;
    if(current===lastPosition)return;
    lastPosition=current;
    if(!claimed&&state.row===reward.row&&state.col===reward.col)openModal();
  }

  /* Player style changes after every successful move, so this stays isolated from campaign-zone.js. */
  const playerObserver=new MutationObserver(syncPosition);
  playerObserver.observe(player,{attributes:true,attributeFilter:['style']});

  /* Keep the marker alive if the board renderer refreshes the tile classes. */
  const worldObserver=new MutationObserver(()=>queueMicrotask(decorate));
  worldObserver.observe(world,{subtree:false,childList:true});

  /* Tile-info override, capture phase so it runs after the tile's own hover callback via microtask. */
  world.addEventListener('pointerover',event=>{
    const tile=event.target.closest?.('.tile');
    if(!tile||claimed)return;
    if(Number(tile.dataset.r)!==reward.row||Number(tile.dataset.c)!==reward.col)return;
    queueMicrotask(()=>{
      const title=document.getElementById('tileTitle');
      const sub=document.getElementById('tileSub');
      const desc=document.getElementById('tileDesc');
      if(title)title.textContent='CARD REWARD';
      if(sub)sub.textContent=`Row ${reward.row+1}, Column ${reward.col+1}`;
      if(desc)desc.textContent='Step here to choose Manipulation, Enchantment or Tactical and draw one random card.';
    });
  },true);

  decorate();
  syncPosition();
  window.HAJJEN_ZONE4_CARD_REWARD_TEST={version:'1.0-isolated',reward,decks,drawn:()=>drawn,claimed:()=>claimed,open:openModal,close:closeModal};
})();
