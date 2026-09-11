/* HAJJEN Zone 4 — isolated Card Reward test with slot replacement.
   Board trigger and modal stay namespaced. Replacement is applied through the
   existing Zone 4 card systems instead of adding extra Hand rows. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const reward=cfg?.cardRewardTest;
  if(!cfg||cfg.zone!==4||!state||!reward||window.HAJJEN_ZONE4_CARD_REWARD_TEST)return;

  const world=document.getElementById('world');
  const player=document.getElementById('player');
  const hand=document.getElementById('manipCards');
  const eventLog=document.getElementById('eventLog');
  if(!world||!player||!hand)return;

  const SAVE_KEY='hajjen-v4b-campaign';
  const LIBRARY_KEY='hajjen-v4b-spell-library-v2';
  const ZERO='\u200b';
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
  const manipulationReplacements=[null,null,null,null];

  let claimed=false;
  let modalOpen=false;
  let lastPosition=`${state.row},${state.col}`;
  let drawn=null;
  let pendingFamily=null;
  let pendingCard=null;
  let patchQueued=false;
  let patching=false;
  let replacementSerial=0;

  const clean=text=>String(text||'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim();
  const rewardTile=()=>world.querySelector(`.tile[data-r="${reward.row}"][data-c="${reward.col}"]`);
  const random=array=>array.length?array[Math.floor(Math.random()*array.length)]:null;
  const slug=value=>String(value||'card').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'card';

  function log(text){
    if(!eventLog)return;
    const row=document.createElement('div');row.className='event reward';row.textContent=text;eventLog.prepend(row);
    while(eventLog.children.length>9)eventLog.lastChild.remove();
  }
  function toast(text){
    const area=document.getElementById('toastArea');if(!area)return;
    const row=document.createElement('div');row.className='toast reward';row.textContent=text;area.prepend(row);setTimeout(()=>row.remove(),1700);
  }

  function dangerTier(){return state.danger>=20?'CRITICAL':state.danger>=15?'HOSTILE':state.danger>=10?'DANGEROUS':state.danger>=5?'UNEASY':'CALM';}
  function enemyPower(){return state.danger>=20?50:state.danger>=15?35:state.danger>=10?20:state.danger>=5?10:0;}
  function syncStatus(){
    const dangerText=document.getElementById('dangerText');
    const dangerFill=document.getElementById('dangerFill');
    const dangerState=document.getElementById('dangerState');
    const clock=document.getElementById('clockText');
    const power=document.getElementById('powerText');
    if(dangerText)dangerText.textContent=`${state.danger} / 20`;
    if(dangerFill)dangerFill.style.width=`${Math.max(0,Math.min(20,Number(state.danger)||0))*5}%`;
    if(dangerState)dangerState.textContent=state.zoneCleared?'CLEARED':dangerTier();
    if(clock)clock.textContent=state.zoneCleared?'SAFE':state.steadySteps?`${state.steadySteps} protected`:`${state.nextAmbient} steps`;
    if(power)power.textContent=state.zoneCleared?'+0%':`+${enemyPower()}%`;
  }

  function manipulationSourceCards(){
    return [...hand.children].filter(node=>node instanceof HTMLElement&&node.classList.contains('card')&&!node.classList.contains('enchantment')&&!node.classList.contains('tactical')).slice(0,4);
  }
  function manipulationSlotState(index){
    const replacement=manipulationReplacements[index];
    if(replacement)return {index,name:replacement.def.name,text:replacement.def.text,used:!!replacement.used,replacement:true};
    const card=manipulationSourceCards()[index];
    const button=card?.querySelector(':scope > button');
    return {
      index,
      name:clean(card?.querySelector(':scope > strong')?.textContent)||cfg.manipulationCards?.[index]||`Manipulation ${index+1}`,
      text:clean(card?.querySelector(':scope > span')?.textContent),
      used:/^USED$/i.test(clean(button?.textContent))||!!button?.disabled,
      replacement:false
    };
  }
  function manipulationSlots(){return [0,1,2,3].map(manipulationSlotState);}

  function useManipulationReplacement(index){
    const replacement=manipulationReplacements[index];
    if(!replacement||replacement.used||state.gameOver||state.zoneCleared)return;
    const id=replacement.def.id;
    if(id==='calm-waters'){
      const before=Number(state.danger)||0;state.danger=Math.max(0,before-3);
      if(before!==state.danger)log(`Danger -${before-state.danger} (Calm Waters) → ${state.danger}/20.`);
    }else if(id==='ward-sigil')state.spawnBlock=(Number(state.spawnBlock)||0)+1;
    else if(id==='steady-nerves')state.steadySteps=3;
    else if(id==='quiet-harvest')state.quietHarvest=true;
    replacement.used=true;
    syncStatus();patchManipulationCards();
    toast(`${replacement.def.name.toUpperCase()} PLAYED`);
    log(`${replacement.def.name} played.`);
    window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
  }

  function patchManipulationCards(){
    patchQueued=false;if(patching)return;patching=true;
    try{
      const cards=manipulationSourceCards();
      manipulationReplacements.forEach((replacement,index)=>{
        if(!replacement)return;
        const card=cards[index];if(!card)return;
        card.dataset.handCategory='manipulation';
        card.dataset.handLabel=replacement.def.name;
        card.dataset.cardRewardManipSlot=String(index);
        const title=card.querySelector(':scope > strong');
        const copy=card.querySelector(':scope > span');
        if(title)title.textContent=`${replacement.def.name}${ZERO.repeat(index+1)}`;
        if(copy)copy.textContent=replacement.def.text||'';
        const oldButton=card.querySelector(':scope > button');
        if(!oldButton)return;
        const key=replacement.key;
        let button=oldButton;
        if(button.dataset.cardRewardReplacementKey!==key){
          button=oldButton.cloneNode(true);
          button.dataset.cardRewardReplacementKey=key;
          oldButton.replaceWith(button);
          button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();useManipulationReplacement(index);});
        }
        button.textContent=replacement.used?'USED':'PLAY';
        button.disabled=!!replacement.used||!!state.gameOver||!!state.zoneCleared;
      });
      window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
      window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
    }finally{patching=false;}
  }
  function scheduleManipulationPatch(){if(patchQueued)return;patchQueued=true;queueMicrotask(patchManipulationCards);}
  const manipulationObserver=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))scheduleManipulationPatch();});
  manipulationObserver.observe(hand,{childList:true,subtree:false});

  function replaceManipulation(index,newDef){
    const before=manipulationSlotState(index);
    manipulationReplacements[index]={key:`manip-reward-${index}-${slug(newDef.id||newDef.name)}-${++replacementSerial}`,def:{...newDef},used:false};
    patchManipulationCards();
    return {oldName:before.name,newName:newDef.name,note:''};
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
    const spellbook=window.HAJJEN_SHARED_SPELLBOOK_V2;
    if(Array.isArray(spellbook?.library)){
      (state.spells||[]).filter(spell=>!spell.fallback).forEach(spell=>{
        const item=spellbook.library.find(entry=>entry?.id===spell.id);if(item)Object.assign(item,spell);
      });
      spellbook.persist?.();spellbook.render?.();
    }
  }

  function enchantmentSlots(){
    const api=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
    return api?.getHand?.().map((card,index)=>({
      index,name:card.definition?.name||card.id,text:card.definition?.text||'',used:!!card.appliedTo,
      status:card.appliedTo?`APPLIED TO ${card.spellName||'SPELL'}`:'READY',id:card.id
    }))||[];
  }
  function replaceEnchantment(index,newDef){
    const api=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
    const old=api?.hand?.[index];if(!api||!old||!newDef?.id)return null;
    const oldDef=api.deck?.find(card=>card.id===old.id)||{name:old.id};
    let removedFrom='';
    if(old.appliedTo){
      const spell=(state.spells||[]).find(item=>item.id===old.appliedTo);
      if(spell&&Array.isArray(spell.enchantments)){
        let removed=false;
        spell.enchantments=spell.enchantments.filter(item=>{
          if(removed)return true;
          const id=typeof item==='string'?item:item?.id;
          if(id===old.id&&typeof item==='object'&&item?.sourceZone===4){removed=true;return false;}
          return true;
        });
        if(removed){removedFrom=spell.name||'spell';delete spell.enchantmentName;}
      }
    }
    api.hand[index]={id:newDef.id,appliedTo:null};
    state.enchantmentCards=api.hand;
    state.enchantmentUsed=api.hand.some(card=>!!card.appliedTo);
    api.persist?.();persistSpells();api.sync?.();
    window.HAJJEN_SHARED_HAND?.sync?.();window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
    document.dispatchEvent(new CustomEvent('hajjen:enchantment-replaced',{detail:{zone:4,index,oldId:old.id,newId:newDef.id,removedFrom}}));
    return {oldName:oldDef.name||old.id,newName:newDef.name,note:removedFrom?`${oldDef.name||old.id} was removed from ${removedFrom}.`:''};
  }

  function tacticalSlots(){
    const api=window.HAJJEN_ZONE4_TACTICAL_HAND;
    return api?.getSlots?.()||[];
  }
  function replaceTactical(index,newDef){
    const api=window.HAJJEN_ZONE4_TACTICAL_HAND;
    const result=api?.replaceSlot?.(index,newDef);if(!result)return null;
    return {oldName:result.old?.name||'Tactical',newName:result.current?.name||newDef.name,note:''};
  }

  function slotsFor(family){
    if(family==='manipulation')return manipulationSlots();
    if(family==='enchantment')return enchantmentSlots();
    return tacticalSlots();
  }
  function candidatesFor(family){
    const slots=slotsFor(family);
    if(family==='enchantment')return slots;
    const used=slots.filter(slot=>slot.used);
    return used.length?used:slots;
  }
  function drawPool(family){
    const pool=[...(decks[family]||[])];
    if(family!=='enchantment')return pool;
    const current=new Set(enchantmentSlots().map(slot=>slot.id));
    const fresh=pool.filter(card=>!current.has(card.id));
    return fresh.length?fresh:pool;
  }

  function decorate(){
    const tile=rewardTile();if(!tile)return false;
    tile.classList.toggle('zone4-card-reward-test-tile',!claimed);
    tile.classList.toggle('zone4-card-reward-test-claimed',claimed);
    let icon=tile.querySelector(':scope > .zone4-card-reward-test-icon');
    if(claimed){icon?.remove();return true;}
    if(!icon){
      icon=document.createElement('span');icon.className='zone4-card-reward-test-icon';icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<i class="manipulation"></i><i class="enchantment"></i><i class="tactical"></i>';
      tile.appendChild(icon);
    }
    return true;
  }

  const modal=document.createElement('div');
  modal.className='zone4-card-reward-test-modal';modal.setAttribute('aria-hidden','true');
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
      <div class="zone4-card-reward-test-replace" hidden>
        <small class="family"></small><h2 class="name"></h2><p class="description"></p>
        <div class="replace-heading">CHOOSE CARD TO REPLACE</div>
        <div class="replace-note"></div><div class="replace-options"></div>
      </div>
      <div class="zone4-card-reward-test-result" hidden>
        <small class="family"></small><h2 class="name"></h2><p class="description"></p>
        <div class="replacement-summary"></div>
        <button type="button" class="continue">CONTINUE</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const chooseView=modal.querySelector('.zone4-card-reward-test-choose');
  const replaceView=modal.querySelector('.zone4-card-reward-test-replace');
  const resultView=modal.querySelector('.zone4-card-reward-test-result');

  function showOnly(view){[chooseView,replaceView,resultView].forEach(node=>node.hidden=node!==view);}
  function openModal(){
    if(claimed||modalOpen||state.combat||state.gameOver)return;
    modalOpen=true;pendingFamily=null;pendingCard=null;showOnly(chooseView);
    modal.classList.add('show');modal.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>modal.querySelector('[data-family]')?.focus({preventScroll:true}));
  }
  function closeModal(){modalOpen=false;modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}

  function renderReplacementChoices(family,card,candidates){
    showOnly(replaceView);
    replaceView.dataset.family=family;
    replaceView.querySelector('.family').textContent=labels[family]||family.toUpperCase();
    replaceView.querySelector('.name').textContent=card.name||'CARD';
    replaceView.querySelector('.description').textContent=card.text||'';
    const note=replaceView.querySelector('.replace-note');
    note.textContent=family==='enchantment'
      ?'Choose which Enchantment to lose. If it is already applied, its effect is removed from that spell.'
      :(candidates.some(slot=>slot.used)?'Used cards are replaced first.':'All cards are unused, so choose which slot to replace.');
    const options=replaceView.querySelector('.replace-options');options.replaceChildren();
    candidates.forEach(slot=>{
      const button=document.createElement('button');button.type='button';button.dataset.replaceIndex=String(slot.index);
      const title=document.createElement('strong');title.textContent=clean(slot.name);
      const status=document.createElement('small');status.textContent=slot.status||(slot.used?'USED':slot.equipped?'EQUIPPED':'READY');
      button.append(title,status);button.addEventListener('click',()=>commitReplacement(slot.index));options.appendChild(button);
    });
    requestAnimationFrame(()=>options.querySelector('button')?.focus({preventScroll:true}));
  }

  function draw(family){
    const card=random(drawPool(family));if(!card)return;
    pendingFamily=family;pendingCard={...card};drawn={family,card:{...card}};
    const candidates=candidatesFor(family);
    log(`Card Reward: drew ${card.name} (${labels[family]||family}).`);
    if(family!=='enchantment'&&candidates.length===1){commitReplacement(candidates[0].index);return;}
    renderReplacementChoices(family,pendingCard,candidates);
  }

  function commitReplacement(index){
    if(!pendingFamily||!pendingCard||claimed)return;
    let result=null;
    if(pendingFamily==='manipulation')result=replaceManipulation(index,pendingCard);
    else if(pendingFamily==='enchantment')result=replaceEnchantment(index,pendingCard);
    else result=replaceTactical(index,pendingCard);
    if(!result)return;

    claimed=true;decorate();showOnly(resultView);resultView.dataset.family=pendingFamily;
    resultView.querySelector('.family').textContent=labels[pendingFamily]||pendingFamily.toUpperCase();
    resultView.querySelector('.name').textContent=pendingCard.name||'CARD';
    resultView.querySelector('.description').textContent=pendingCard.text||'';
    const summary=resultView.querySelector('.replacement-summary');
    summary.textContent=`Replaced ${clean(result.oldName)}.${result.note?` ${result.note}`:''}`;
    log(`Card Reward: ${pendingCard.name} replaced ${clean(result.oldName)}.`);
    toast(`${pendingCard.name.toUpperCase()} ADDED`);
    document.dispatchEvent(new CustomEvent('hajjen:zone4-card-reward-test',{detail:{zone:4,family:pendingFamily,card:{...pendingCard},replaced:clean(result.oldName),slot:index}}));
    window.HAJJEN_SHARED_HAND?.sync?.();window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();window.HAJJEN_SHARED_CARD_DECKS?.sync?.();
    requestAnimationFrame(()=>resultView.querySelector('.continue')?.focus({preventScroll:true}));
  }

  modal.querySelectorAll('[data-family]').forEach(button=>button.addEventListener('click',()=>draw(button.dataset.family)));
  modal.querySelector('.continue')?.addEventListener('click',closeModal);

  window.addEventListener('keydown',event=>{
    if(!modalOpen)return;
    const movement=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'];
    if(movement.includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}
  },true);

  function syncPosition(){
    decorate();scheduleManipulationPatch();
    const current=`${state.row},${state.col}`;if(current===lastPosition)return;lastPosition=current;
    if(!claimed&&state.row===reward.row&&state.col===reward.col)openModal();
  }
  const playerObserver=new MutationObserver(syncPosition);playerObserver.observe(player,{attributes:true,attributeFilter:['style']});
  const worldObserver=new MutationObserver(()=>queueMicrotask(decorate));worldObserver.observe(world,{subtree:false,childList:true});

  world.addEventListener('pointerover',event=>{
    const tile=event.target.closest?.('.tile');if(!tile||claimed)return;
    if(Number(tile.dataset.r)!==reward.row||Number(tile.dataset.c)!==reward.col)return;
    queueMicrotask(()=>{
      const title=document.getElementById('tileTitle'),sub=document.getElementById('tileSub'),desc=document.getElementById('tileDesc');
      if(title)title.textContent='CARD REWARD';
      if(sub)sub.textContent=`Row ${reward.row+1}, Column ${reward.col+1}`;
      if(desc)desc.textContent='Step here to draw a random card, then replace a card of the same type.';
    });
  },true);

  decorate();patchManipulationCards();syncPosition();
  window.HAJJEN_ZONE4_CARD_REWARD_TEST={
    version:'2.0-slot-replacement',reward,decks,drawn:()=>drawn,claimed:()=>claimed,
    manipulationReplacements,manipulationSlots,enchantmentSlots,tacticalSlots,
    open:openModal,close:closeModal
  };
})();
