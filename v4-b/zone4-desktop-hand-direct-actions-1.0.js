/* HAJJEN Zone 4 — desktop Hand direct-action bridge.
   Desktop renders a visual Hand proxy above the real hidden controls. This
   bridge treats Zone 4's gameplay owners as source of truth and routes mouse
   actions by screen coordinates, so a stale disabled button or decorative
   overlay cannot swallow Enchantment/Tactical input. Mobile is left alone. */
(()=>{
  if(window.HAJJEN_ZONE4_DESKTOP_HAND_DIRECT_ACTIONS)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const hand=document.getElementById('manipCards');
  if(Number(cfg?.zone)!==4||!state||!hand)return;

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const finePointer=()=>window.matchMedia?.('(pointer:fine)')?.matches!==false;
  const cards=category=>[...hand.querySelectorAll(`:scope > .shared-hand-card[data-hand-category="${category}"]`)];
  const layout=()=>document.querySelector('.hajjen-hand-list-layout');
  const proxyButtons=()=>[...(layout()?.querySelectorAll('.hajjen-hand-list-action')||[])];

  function sourceFor(button){
    const category=button?.dataset?.category;
    const index=Math.max(0,Number(button?.dataset?.slot)||0);
    const list=cards(category),key=String(button?.dataset?.sourceKey||'');
    if(key.startsWith('id:')){
      const id=key.slice(3);
      const hit=list.find(card=>card.dataset.enchantmentId===id||card.dataset.tacticalId===id);
      if(hit)return hit;
    }
    if(key.startsWith('title:')){
      const title=key.slice(6);
      const hit=list.find(card=>clean(card.querySelector(':scope > strong')?.textContent).toLowerCase()===title);
      if(hit)return hit;
    }
    return list[index]||null;
  }
  function liveButton(source,category){
    if(!source)return null;
    if(category==='enchantment')return source.querySelector(':scope > .shared-enchantment-apply');
    if(category==='tactical')return source.querySelector(':scope > .shared-tactical-equip')||source.querySelector(':scope > button');
    return source.querySelector(':scope > button');
  }
  function enchantState(source){
    const id=source?.dataset?.enchantmentId;
    const api=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
    const card=api?.getHand?.().find?.(entry=>entry?.id===id)||null;
    const spells=(state.spells||[]).filter(spell=>spell&&!spell.fallback);
    return {id,api,card,spells,applied:!!card?.appliedTo,usable:!!id&&!!api?.apply&&!card?.appliedTo&&spells.length>0&&!state.gameOver};
  }
  function tacticalState(source){
    const key=String(source?.dataset?.tacticalId||'');
    const owner=window.HAJJEN_ZONE4_TACTICAL_HAND;
    const combat=window.HAJJEN_ZONE4_TACTICAL_COMBAT;
    const used=!!key&&(combat?.usedKeys instanceof Set?combat.usedKeys.has(key):source?.classList.contains('is-used'));
    const equipped=!!key&&owner?.equipped instanceof Set&&owner.equipped.has(key)&&!used;
    return {key,owner,combat,used,equipped,usable:!!key&&!!owner?.equipped&&!used&&!equipped&&!state.gameOver};
  }

  function proxyState(button){
    const category=button?.dataset?.category,source=sourceFor(button);
    if(!source||state.gameOver)return {source,usable:false,label:button?.textContent||''};
    if(category==='enchantment'){
      const s=enchantState(source);return {source,usable:s.usable,label:s.applied?'APPLIED':'APPLY'};
    }
    if(category==='tactical'){
      const s=tacticalState(source);return {source,usable:s.usable,label:s.used?'USED':s.equipped?'EQUIPT':'EQUIP'};
    }
    const live=liveButton(source,category);
    return {source,usable:!!live&&!live.disabled,label:clean(live?.textContent)||'PLAY'};
  }

  function syncProxy(){
    proxyButtons().forEach(button=>{
      const {source,usable,label}=proxyState(button);
      if(source)button.closest('.hajjen-hand-list-row')?.classList.remove('is-locked','is-empty');
      button.disabled=!usable;
      if(label)button.textContent=label;
    });
  }

  function closePickers(){document.querySelectorAll('.hajjen-hand-enchant-picker-backdrop').forEach(node=>node.remove());}
  function openEnchantmentPicker(source){
    const {id,api,spells,usable}=enchantState(source);if(!usable)return false;
    closePickers();
    const backdrop=document.createElement('div');backdrop.className='hajjen-hand-enchant-picker-backdrop';
    const modal=document.createElement('div');modal.className='hajjen-hand-enchant-picker';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    const head=document.createElement('div');head.className='hajjen-hand-enchant-picker-head';
    const title=document.createElement('span');title.textContent=`APPLY ${clean(source.querySelector(':scope > strong')?.textContent)||'ENCHANTMENT'}`;
    const close=document.createElement('button');close.type='button';close.className='hajjen-hand-enchant-picker-close';close.textContent='× CLOSE';head.append(title,close);
    const note=document.createElement('p');note.className='hajjen-hand-enchant-picker-note';note.textContent='Choose which crafted spell receives this Enchantment.';
    const options=document.createElement('div');options.className='hajjen-hand-enchant-picker-options';
    spells.forEach(spell=>{
      const choice=document.createElement('button');choice.type='button';choice.className='hajjen-hand-enchant-picker-option';choice.textContent=spell.name||spell.id;
      choice.addEventListener('click',()=>{
        if(api.apply(id,spell.id)===true){
          backdrop.remove();window.HAJJEN_SHARED_HAND?.sync?.();window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();setTimeout(syncProxy,0);
        }
      });options.appendChild(choice);
    });
    const dismiss=()=>backdrop.remove();close.addEventListener('click',dismiss);backdrop.addEventListener('click',event=>{if(event.target===backdrop)dismiss();});
    modal.append(head,note,options);backdrop.appendChild(modal);document.body.appendChild(backdrop);close.focus({preventScroll:true});return true;
  }

  function equipTactical(source){
    const s=tacticalState(source);if(!s.usable)return false;
    s.owner.equipped.add(s.key);state.tacticalEquippedKeys=[...s.owner.equipped];
    s.owner.sync?.();s.combat?.sync?.();window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();setTimeout(syncProxy,0);return true;
  }
  function runAction(button){
    if(!button||state.gameOver)return false;
    const category=button.dataset.category,source=sourceFor(button);if(!source)return false;
    if(category==='enchantment')return openEnchantmentPicker(source);
    if(category==='tactical')return equipTactical(source);
    const live=liveButton(source,category);if(!live||live.disabled)return false;live.click();setTimeout(syncProxy,0);return true;
  }

  /* elementsFromPoint can still omit a control hidden below a decorative SVG.
     The proxy action rectangles themselves are stable, so use geometry as the
     final source of truth for desktop mouse input. */
  function buttonAtPoint(x,y){
    return proxyButtons().find(button=>{
      const r=button.getBoundingClientRect();return r.width>0&&r.height>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
    })||null;
  }

  let suppressClickUntil=0;
  function onPointerDown(event){
    if(!finePointer()||event.button!==0||event.pointerType==='touch')return;
    const button=buttonAtPoint(event.clientX,event.clientY);if(!button)return;
    const stateNow=proxyState(button);if(!stateNow.usable)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(runAction(button))suppressClickUntil=performance.now()+500;
  }
  function onClick(event){
    if(!finePointer())return;
    const button=(event.target instanceof Element?event.target.closest('.hajjen-hand-list-action'):null)||buttonAtPoint(event.clientX,event.clientY);
    if(!button)return;
    if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
    const stateNow=proxyState(button);if(!stateNow.usable)return;
    event.preventDefault();event.stopImmediatePropagation();runAction(button);
  }

  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('click',onClick,true);
  const timer=setInterval(syncProxy,180);
  [0,80,220,600,1400].forEach(delay=>setTimeout(syncProxy,delay));
  window.addEventListener('pageshow',syncProxy);
  document.addEventListener('hajjen-ui-redesign-promoted',()=>setTimeout(syncProxy,0));
  document.addEventListener('hajjen:enchantment-applied',()=>setTimeout(syncProxy,0));
  document.addEventListener('hajjen:tactical-used',()=>setTimeout(syncProxy,0));

  window.HAJJEN_ZONE4_DESKTOP_HAND_DIRECT_ACTIONS={
    version:'2.0-coordinate-owner-routing',sync:syncProxy,
    stop:()=>{clearInterval(timer);document.removeEventListener('pointerdown',onPointerDown,true);document.removeEventListener('click',onClick,true);}
  };
})();