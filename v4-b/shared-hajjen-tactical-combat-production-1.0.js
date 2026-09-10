/* HAJJEN — production Tactical Fight Window bridge for Zones 1–3.
   Does not unlock or inject Tactical cards. It only exposes the two combat slots
   and mirrors Tactical cards that gameplay has actually equipped. A used Tactical
   card is consumed for the current run/page session.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1'||window.HAJJEN_TACTICAL_COMBAT_PRODUCTION)return;

  const sharedHand=window.HAJJEN_SHARED_HAND;
  const zone=Number(sharedHand?.zone||window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:0));
  if(zone<1||zone>3)return;

  const hand=sharedHand?.hand||document.getElementById(zone===1?'manipulationCards':'manipCards');
  const modal=document.getElementById('combatModal');
  const footer=window.HAJJEN_SHARED_FIGHT_WINDOW?.footer||modal?.querySelector('.combat-footer');
  const potion=document.getElementById('combatPotionBtn');
  const message=document.getElementById('combatMessage');
  const state=zone===1?window.HAJJEN_V4B_STATE:window.HAJJEN_CAMPAIGN_STATE;
  if(!hand||!modal||!footer||!potion||!message||!state)return;

  const ICON='assets/hand-icons/hand-tactical.png';
  const slots=[null,null];
  const usedKeys=new Set();
  let guardArmed=false;
  let guardSetterInstalled=false;
  let pendingBlockedDamage=0;
  let syncRaf=0;

  const clean=text=>String(text||'').replace(/\s+/g,' ').trim();
  const direct=(node,selector)=>node?.querySelector(`:scope > ${selector}`)||null;
  function titleOf(card){return clean(direct(card,'strong')?.textContent)||clean(card?.dataset?.handLabel)||'TACTICAL';}
  function keyOf(card){return clean(card?.dataset?.tacticalId||card?.dataset?.handLabel||titleOf(card)).toLowerCase();}
  function tacticalCards(){return [...hand.querySelectorAll(':scope > .shared-hand-card[data-hand-category="tactical"]')];}
  function equipButton(card){return direct(card,'.shared-tactical-equip')||direct(card,'button');}
  function isUsed(card){return !!card&&(card.classList.contains('is-used')||usedKeys.has(keyOf(card)));}
  function isEquipped(card){return !!card&&!isUsed(card)&&card.classList.contains('is-equipt');}

  let group=footer.querySelector(':scope > .hajjen-combat-tactical-slots');
  if(!group){
    group=document.createElement('div');
    group.className='hajjen-combat-tactical-slots';
    group.setAttribute('role','group');
    group.setAttribute('aria-label','Tactical cards');
    footer.insertBefore(group,potion);
  }

  const buttons=[0,1].map(index=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='hajjen-combat-tactical-slot is-empty';
    button.dataset.tacticalSlot=String(index);
    const icon=document.createElement('img');
    icon.className='hajjen-combat-tactical-slot-icon';
    icon.src=ICON;icon.alt='';icon.setAttribute('aria-hidden','true');
    const copy=document.createElement('span');
    copy.className='hajjen-combat-tactical-slot-copy';
    const title=document.createElement('strong');title.className='hajjen-combat-tactical-slot-title';
    const status=document.createElement('small');status.className='hajjen-combat-tactical-slot-state';
    copy.append(title,status);button.append(icon,copy);group.appendChild(button);return button;
  });

  function cardForKey(key){return tacticalCards().find(card=>keyOf(card)===key)||null;}
  function combatActive(){return !!state.combat&&modal.classList.contains('show');}
  function renderSlots(){
    buttons.forEach((button,index)=>{
      const key=slots[index];
      const card=key?cardForKey(key):null;
      const title=button.querySelector('.hajjen-combat-tactical-slot-title');
      const status=button.querySelector('.hajjen-combat-tactical-slot-state');
      const empty=!key||usedKeys.has(key);
      button.classList.toggle('is-empty',empty);
      if(empty){
        title.textContent=`TACTICAL ${index+1}`;
        status.textContent='EMPTY SLOT';
        button.disabled=true;
        button.removeAttribute('title');
        return;
      }
      const name=card?titleOf(card):key.replace(/(^|[-_ ])\w/g,m=>m.toUpperCase());
      title.textContent=name;
      status.textContent=name.toLowerCase()==='guard stance'&&guardArmed?'ACTIVE · NEXT HIT':'USE ONCE';
      button.disabled=!combatActive()||(name.toLowerCase()==='guard stance'&&guardArmed);
      button.title=`${name} — one use for this run.`;
    });
  }

  function syncEquipped(){
    syncRaf=0;
    slots.forEach((key,index)=>{if(key&&usedKeys.has(key))slots[index]=null;});
    tacticalCards().filter(isEquipped).forEach(card=>{
      const key=keyOf(card);
      if(!key||usedKeys.has(key)||slots.includes(key))return;
      const free=slots.findIndex(item=>!item);
      if(free>=0)slots[free]=key;
    });
    renderSlots();
  }
  function scheduleSync(){if(syncRaf)return;syncRaf=requestAnimationFrame(syncEquipped);}

  function markConsumed(card,key){
    if(key)usedKeys.add(key);
    if(card){
      card.classList.remove('is-equipt');
      card.classList.add('is-used');
      const button=equipButton(card);
      if(button){button.disabled=true;button.textContent='USED';button.setAttribute('aria-pressed','false');}
    }
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  }

  function installGuardSetter(){
    if(guardSetterInstalled)return true;
    const descriptor=Object.getOwnPropertyDescriptor(state,'hp');
    if(descriptor&&descriptor.configurable===false)return false;
    let hpValue=Number(state.hp)||0;
    Object.defineProperty(state,'hp',{
      configurable:true,
      enumerable:true,
      get(){return hpValue;},
      set(value){
        let next=Number(value);
        if(!Number.isFinite(next))next=hpValue;
        if(guardArmed&&state.combat&&next<hpValue){
          pendingBlockedDamage=Math.max(0,hpValue-next);
          guardArmed=false;
          next=hpValue;
          queueMicrotask(rewriteBlockedMessage);
        }
        hpValue=next;
      }
    });
    guardSetterInstalled=true;
    return true;
  }
  function rewriteBlockedMessage(){
    const blocked=pendingBlockedDamage;
    if(!(blocked>0))return;
    pendingBlockedDamage=0;
    const text=clean(message.textContent);
    if(/hits back for \d+/i.test(text))message.textContent=text.replace(/hits back for \d+\.?/i,`hits back for 0. Guard Stance blocks ${blocked}.`);
    else message.textContent=`${text} Guard Stance blocks ${blocked} damage.`.trim();
    renderSlots();
  }

  function useTactical(index){
    const key=slots[index];
    if(!key||usedKeys.has(key)||!state.combat)return;
    const card=cardForKey(key);
    const name=card?titleOf(card):key;
    markConsumed(card,key);
    slots[index]=null;
    if(name.toLowerCase()==='guard stance'&&installGuardSetter()){
      guardArmed=true;
      message.textContent='Guard Stance activated. The next enemy hit is blocked. Choose a spell.';
    }else{
      message.textContent=`${name} used. Choose a spell.`;
    }
    renderSlots();
    window.HAJJEN_SHARED_FIGHT_WINDOW?.sync?.();
  }

  buttons.forEach((button,index)=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();useTactical(index);}));
  document.addEventListener('click',event=>{
    const equip=event.target.closest?.('.shared-tactical-equip');
    if(equip&&hand.contains(equip))queueMicrotask(scheduleSync);
  });
  const handObserver=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))scheduleSync();});
  handObserver.observe(hand,{childList:true,subtree:false});
  const modalObserver=new MutationObserver(renderSlots);
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  syncEquipped();
  requestAnimationFrame(syncEquipped);
  window.HAJJEN_TACTICAL_COMBAT_PRODUCTION={version:'1.0',zone,slots,usedKeys,sync:syncEquipped,use:useTactical,handObserver,modalObserver};
})();
