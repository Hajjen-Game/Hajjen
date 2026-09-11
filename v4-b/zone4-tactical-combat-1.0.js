/* HAJJEN Zone 4 — two-slot Tactical combat bridge. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==4||!state||window.HAJJEN_ZONE4_TACTICAL_COMBAT)return;

  const hand=document.getElementById('manipCards');
  const modal=document.getElementById('combatModal');
  const footer=window.HAJJEN_SHARED_FIGHT_WINDOW?.footer||modal?.querySelector('.combat-footer');
  const potion=document.getElementById('combatPotionBtn');
  const message=document.getElementById('combatMessage');
  if(!hand||!modal||!footer||!potion||!message)return;

  const ICON='assets/hand-icons/hand-tactical.png';
  const slots=[null,null];
  const usedKeys=new Set();
  let guardArmed=false;
  let guardSetterInstalled=false;
  let pendingBlockedDamage=0;
  let focusArmed=false;
  let focusCombat=null;
  let pendingFocusBonus=0;
  let syncRaf=0;

  const clean=text=>String(text||'').replace(/\s+/g,' ').trim();
  const direct=(node,selector)=>node?.querySelector(`:scope > ${selector}`)||null;
  const tacticalCards=()=>[...hand.querySelectorAll(':scope > .shared-hand-card[data-hand-category="tactical"]')];
  const titleOf=card=>clean(direct(card,'strong')?.textContent)||clean(card?.dataset?.handLabel)||'TACTICAL';
  const keyOf=card=>clean(card?.dataset?.tacticalId||card?.dataset?.handLabel||titleOf(card)).toLowerCase();
  const equipButton=card=>direct(card,'.shared-tactical-equip')||direct(card,'button');
  const isUsed=card=>!!card&&(card.classList.contains('is-used')||usedKeys.has(keyOf(card)));
  const isEquipped=card=>!!card&&!isUsed(card)&&card.classList.contains('is-equipt');
  const cardForKey=key=>tacticalCards().find(card=>keyOf(card)===key)||null;
  const combatActive=()=>!!state.combat&&modal.classList.contains('show');

  let group=footer.querySelector(':scope > .hajjen-combat-tactical-slots');
  if(!group){
    group=document.createElement('div');group.className='hajjen-combat-tactical-slots';group.setAttribute('role','group');group.setAttribute('aria-label','Tactical cards');footer.insertBefore(group,potion);
  }

  const buttons=[0,1].map(index=>{
    const button=document.createElement('button');button.type='button';button.className='hajjen-combat-tactical-slot is-empty';button.dataset.tacticalSlot=String(index);
    const icon=document.createElement('img');icon.className='hajjen-combat-tactical-slot-icon';icon.src=ICON;icon.alt='';icon.setAttribute('aria-hidden','true');
    const copy=document.createElement('span');copy.className='hajjen-combat-tactical-slot-copy';
    const title=document.createElement('strong');title.className='hajjen-combat-tactical-slot-title';
    const status=document.createElement('small');status.className='hajjen-combat-tactical-slot-state';
    copy.append(title,status);button.append(icon,copy);group.appendChild(button);return button;
  });

  function renderSlots(){
    buttons.forEach((button,index)=>{
      const key=slots[index],card=key?cardForKey(key):null;
      const title=button.querySelector('.hajjen-combat-tactical-slot-title');
      const status=button.querySelector('.hajjen-combat-tactical-slot-state');
      const empty=!key||usedKeys.has(key);
      button.classList.toggle('is-empty',empty);
      if(empty){title.textContent=`TACTICAL ${index+1}`;status.textContent='EMPTY SLOT';button.disabled=true;button.removeAttribute('title');return;}
      const name=card?titleOf(card):key;
      title.textContent=name;
      if(name.toLowerCase()==='guard stance'&&guardArmed)status.textContent='ACTIVE · NEXT HIT';
      else if(name.toLowerCase()==='battle focus'&&focusArmed)status.textContent='ACTIVE · NEXT SPELL';
      else status.textContent='USE ONCE';
      button.disabled=!combatActive()||(name.toLowerCase()==='guard stance'&&guardArmed)||(name.toLowerCase()==='battle focus'&&focusArmed);
      button.title=`${name} — one use for this run.`;
    });
  }

  function syncEquipped(){
    syncRaf=0;
    slots.forEach((key,index)=>{if(key&&usedKeys.has(key))slots[index]=null;});
    tacticalCards().filter(isEquipped).forEach(card=>{
      const key=keyOf(card);if(!key||usedKeys.has(key)||slots.includes(key))return;
      const free=slots.findIndex(item=>!item);if(free>=0)slots[free]=key;
    });
    renderSlots();
  }
  function scheduleSync(){if(syncRaf)return;syncRaf=requestAnimationFrame(syncEquipped);}

  function markConsumed(card,key){
    if(key)usedKeys.add(key);
    if(card){
      card.classList.remove('is-equipt');card.classList.add('is-used');
      const button=equipButton(card);if(button){button.disabled=true;button.textContent='USED';button.setAttribute('aria-pressed','false');}
    }
    window.HAJJEN_ZONE4_TACTICAL_HAND?.sync?.();
    window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
  }

  function installGuardSetter(){
    if(guardSetterInstalled)return true;
    const descriptor=Object.getOwnPropertyDescriptor(state,'hp');
    if(descriptor&&descriptor.configurable===false)return false;
    let hpValue=Number(state.hp)||0;
    Object.defineProperty(state,'hp',{
      configurable:true,enumerable:true,get(){return hpValue;},
      set(value){
        let next=Number(value);if(!Number.isFinite(next))next=hpValue;
        if(guardArmed&&state.combat&&next<hpValue){pendingBlockedDamage=Math.max(0,hpValue-next);guardArmed=false;next=hpValue;queueMicrotask(rewriteGuardMessage);}
        hpValue=next;
      }
    });
    guardSetterInstalled=true;return true;
  }
  function rewriteGuardMessage(){
    const blocked=pendingBlockedDamage;if(!(blocked>0))return;pendingBlockedDamage=0;
    const text=clean(message.textContent);
    if(/hits back for \d+/i.test(text))message.textContent=text.replace(/hits back for \d+\.?/i,`hits back for 0. Guard Stance blocks ${blocked}.`);
    else message.textContent=`${text} Guard Stance blocks ${blocked} damage.`.trim();
    renderSlots();
  }

  function installFocusSetter(){
    const combat=state.combat;if(!combat)return false;
    if(focusCombat===combat)return true;
    const descriptor=Object.getOwnPropertyDescriptor(combat,'hp');
    if(descriptor&&descriptor.configurable===false)return false;
    let hpValue=Number(combat.hp)||0;
    Object.defineProperty(combat,'hp',{
      configurable:true,enumerable:true,get(){return hpValue;},
      set(value){
        let next=Number(value);if(!Number.isFinite(next))next=hpValue;
        if(focusArmed&&next<hpValue){pendingFocusBonus=20;focusArmed=false;next-=20;queueMicrotask(rewriteFocusMessage);}
        hpValue=next;
      }
    });
    focusCombat=combat;return true;
  }
  function rewriteFocusMessage(){
    if(!pendingFocusBonus)return;const bonus=pendingFocusBonus;pendingFocusBonus=0;
    if(state.combat)message.textContent=`${clean(message.textContent)} Battle Focus adds ${bonus} damage.`.trim();
    renderSlots();
  }

  function completeObjective(name,key){
    const required=Math.max(1,Math.min(2,Number(cfg.tactical?.draw)||2));
    state.zone4TacticalUsedKeys=[...usedKeys];
    state.tacticalUsed=true;
    if(cfg.introType==='tactical-pair'&&usedKeys.size>=required)state.introComplete=true;
    const intro=document.getElementById('introQuest');
    if(intro)intro.textContent=state.introComplete?'COMPLETE':`${Math.min(usedKeys.size,required)} / ${required} USED`;
    document.dispatchEvent(new CustomEvent('hajjen:tactical-used',{detail:{zone:4,name,key,used:usedKeys.size,required}}));
  }

  function useTactical(index){
    const key=slots[index];if(!key||usedKeys.has(key)||!state.combat)return;
    const card=cardForKey(key),name=card?titleOf(card):key;
    markConsumed(card,key);slots[index]=null;completeObjective(name,key);
    const lower=name.toLowerCase();
    if(lower==='guard stance'&&installGuardSetter()){
      guardArmed=true;message.textContent='Guard Stance activated. The next enemy hit is blocked. Choose a spell.';
    }else if(lower==='battle focus'&&installFocusSetter()){
      focusArmed=true;message.textContent='Battle Focus activated. Your next spell deals +20 damage.';
    }else message.textContent=`${name} used. Choose a spell.`;
    renderSlots();window.HAJJEN_SHARED_FIGHT_WINDOW?.sync?.();
  }

  buttons.forEach((button,index)=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();useTactical(index);}));
  document.addEventListener('click',event=>{const equip=event.target.closest?.('.shared-tactical-equip');if(equip&&hand.contains(equip))queueMicrotask(scheduleSync);});
  const handObserver=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))scheduleSync();});handObserver.observe(hand,{childList:true,subtree:false});
  const modalObserver=new MutationObserver(()=>{if(!state.combat){focusCombat=null;focusArmed=false;guardArmed=false;}renderSlots();});modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});

  syncEquipped();requestAnimationFrame(syncEquipped);
  window.HAJJEN_ZONE4_TACTICAL_COMBAT={version:'1.0-two-effects',zone:4,slots,usedKeys,sync:syncEquipped,use:useTactical,handObserver,modalObserver};
})();
