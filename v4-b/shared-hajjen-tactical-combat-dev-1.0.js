/* HAJJEN Zone 3 DEV — Tactical combat preview v1.1.
   Adds two Tactical slots to the approved Fight Window footer and connects the
   existing DEV Tactical EQUIP action to those slots.

   Lifecycle:
   - EQUIP puts an available Tactical card into the first free combat slot.
   - Tactical slots are usable only while combat is active.
   - Using a Tactical consumes that card for the entire current run/page session.
   - Guard Stance prototype effect: block the next incoming enemy hit completely.

   Tactical is still officially introduced in Zone 4; this module is DEV-only so
   production Zone 1-3 progression remains untouched.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone;
  if(zone!==3||window.HAJJEN_TACTICAL_COMBAT_DEV)return;

  const hand=document.getElementById('manipCards');
  const modal=document.getElementById('combatModal');
  const footer=window.HAJJEN_SHARED_FIGHT_WINDOW?.footer||modal?.querySelector('.combat-footer');
  const potion=document.getElementById('combatPotionBtn');
  const message=document.getElementById('combatMessage');
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!hand||!modal||!footer||!potion||!message||!state)return;

  const ICON='assets/hand-icons/hand-tactical.png';
  const slots=[null,null];
  const usedKeys=new Set();
  let guardArmed=false;
  let pendingBlockedDamage=0;
  let syncRaf=0;

  const clean=text=>String(text||'').replace(/\s+/g,' ').trim();
  const direct=(node,selector)=>node?.querySelector(`:scope > ${selector}`)||null;

  function titleOf(card){
    return clean(direct(card,'strong')?.textContent)||clean(card?.dataset?.handLabel)||'TACTICAL';
  }
  function keyOf(card){
    if(!card)return'';
    return clean(card.dataset.tacticalId||card.dataset.handLabel||titleOf(card)).toLowerCase();
  }
  function tacticalCards(){
    return [...hand.querySelectorAll(':scope > .shared-hand-card[data-hand-category="tactical"]')];
  }
  function equipButton(card){
    return direct(card,'.shared-tactical-equip')||direct(card,'button');
  }
  function isUsed(card){
    return !!card&&(card.classList.contains('is-used')||usedKeys.has(keyOf(card)));
  }
  function isEquipped(card){
    return !!card&&!isUsed(card)&&card.classList.contains('is-equipt');
  }

  let group=footer.querySelector(':scope > .hajjen-combat-tactical-slots');
  if(!group){
    group=document.createElement('div');
    group.className='hajjen-combat-tactical-slots';
    group.setAttribute('role','group');
    group.setAttribute('aria-label','Tactical cards');
    footer.insertBefore(group,potion);
  }

  const buttons=[0,1].map(index=>{
    let button=group.querySelector(`[data-tactical-slot="${index}"]`);
    if(button)return button;
    button=document.createElement('button');
    button.type='button';
    button.className='hajjen-combat-tactical-slot is-empty';
    button.dataset.tacticalSlot=String(index);

    const icon=document.createElement('img');
    icon.className='hajjen-combat-tactical-slot-icon';
    icon.src=ICON;
    icon.alt='';
    icon.setAttribute('aria-hidden','true');

    const copy=document.createElement('span');
    copy.className='hajjen-combat-tactical-slot-copy';
    const title=document.createElement('strong');
    title.className='hajjen-combat-tactical-slot-title';
    const status=document.createElement('small');
    status.className='hajjen-combat-tactical-slot-state';
    copy.append(title,status);
    button.append(icon,copy);
    group.appendChild(button);
    return button;
  });

  function renderSlots(){
    const inCombat=!!state.combat&&modal.classList.contains('show');
    buttons.forEach((button,index)=>{
      const card=slots[index];
      const title=button.querySelector('.hajjen-combat-tactical-slot-title');
      const status=button.querySelector('.hajjen-combat-tactical-slot-state');
      const empty=!card||isUsed(card);
      button.classList.toggle('is-empty',empty);
      if(empty){
        title.textContent=`TACTICAL ${index+1}`;
        status.textContent='EMPTY SLOT';
        button.disabled=true;
        button.removeAttribute('title');
        return;
      }
      const cardTitle=titleOf(card);
      title.textContent=cardTitle;
      status.textContent=cardTitle.toLowerCase()==='guard stance'&&guardArmed?'ACTIVE · NEXT HIT':'USE ONCE';
      button.disabled=!inCombat||(cardTitle.toLowerCase()==='guard stance'&&guardArmed);
      button.title=`${cardTitle} — one use for this run.`;
    });
  }

  function syncConsumedPresentation(card){
    if(!card)return;
    const used=usedKeys.has(keyOf(card));
    if(!used)return;
    card.classList.remove('is-equipt');
    card.classList.add('is-used');
    const button=equipButton(card);
    if(button){
      button.disabled=true;
      button.textContent='USED';
      button.setAttribute('aria-pressed','false');
    }
  }

  function syncEquipped(){
    syncRaf=0;

    /* campaign-zone.js rebuilds the Hand on every movement. A consumed Tactical
       card may therefore be represented by a fresh DOM node; restore USED before
       looking for equipped cards so it can never return to the combat slots. */
    tacticalCards().forEach(syncConsumedPresentation);

    // Remove consumed/disconnected cards from combat slots.
    slots.forEach((card,index)=>{
      if(card&&(!card.isConnected||isUsed(card)))slots[index]=null;
    });

    // Any card equipped through the real hidden Hand DOM enters first free slot.
    tacticalCards().filter(isEquipped).forEach(card=>{
      if(slots.includes(card))return;
      const free=slots.findIndex(item=>!item);
      if(free>=0)slots[free]=card;
    });
    renderSlots();
  }
  function scheduleSync(){
    if(syncRaf)return;
    syncRaf=requestAnimationFrame(()=>{syncRaf=0;syncEquipped();});
  }

  function markConsumed(card){
    if(!card)return;
    const key=keyOf(card);
    if(key)usedKeys.add(key);
    card.classList.remove('is-equipt');
    card.classList.add('is-used');
    const button=equipButton(card);
    if(button){
      button.disabled=true;
      button.textContent='USED';
      button.setAttribute('aria-pressed','false');
    }
    window.HAJJEN_TACTICAL_CARD_DEV?.setEquipped?.(false);
    window.HAJJEN_HAND_DECK_LIST_DEV?.render?.();
  }

  function useTactical(index){
    const card=slots[index];
    if(!card||isUsed(card)||!state.combat)return;
    const name=titleOf(card);

    // Consume immediately: Tactical cards are one use for the whole run.
    markConsumed(card);
    slots[index]=null;

    if(name.toLowerCase()==='guard stance'){
      guardArmed=true;
      message.textContent='Guard Stance activated. The next enemy hit is blocked. Choose a spell.';
    }else{
      message.textContent=`${name} used. Choose a spell.`;
    }

    renderSlots();
    window.HAJJEN_SHARED_FIGHT_WINDOW?.sync?.();
  }

  buttons.forEach((button,index)=>{
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      useTactical(index);
    });
  });

  // The real Tactical preview owns EQUIP. We only mirror its resulting state.
  document.addEventListener('click',event=>{
    const equip=event.target.closest?.('.shared-tactical-equip');
    if(!equip||!hand.contains(equip))return;
    queueMicrotask(scheduleSync);
  });
  const handObserver=new MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'))scheduleSync();
  });
  handObserver.observe(hand,{childList:true,subtree:false});

  /* Guard Stance must intercept damage BEFORE campaign-zone.js checks for defeat.
     The campaign state is a plain object, so a DEV-only accessor can safely block
     the next HP decrease while combat is active. */
  const hpDescriptor=Object.getOwnPropertyDescriptor(state,'hp');
  let hpValue=Number(state.hp)||0;
  if(!hpDescriptor||hpDescriptor.configurable!==false){
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
  }

  function rewriteBlockedMessage(){
    const blocked=pendingBlockedDamage;
    if(!(blocked>0))return;
    pendingBlockedDamage=0;
    const text=clean(message.textContent);
    if(/hits back for \d+/i.test(text)){
      message.textContent=text.replace(/hits back for \d+\.?/i,`hits back for 0. Guard Stance blocks ${blocked}.`);
    }else{
      message.textContent=`${text} Guard Stance blocks ${blocked} damage.`.trim();
    }
    renderSlots();
  }

  // Keep slot enabled state aligned with combat open/close transitions.
  const modalObserver=new MutationObserver(renderSlots);
  modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  syncEquipped();
  requestAnimationFrame(syncEquipped);

  window.HAJJEN_TACTICAL_COMBAT_DEV={
    version:'1.1-persistent-hand',
    slots,
    usedKeys,
    get guardArmed(){return guardArmed;},
    sync:syncEquipped,
    use:useTactical,
    handObserver,
    modalObserver
  };
})();
