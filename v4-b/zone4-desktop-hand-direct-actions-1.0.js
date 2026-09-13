/* HAJJEN Zone 4 — desktop Hand direct-action bridge.
   The promoted desktop Hand is a visual proxy over the real hidden controls.
   On Zone 4 restore/reload that proxy can keep stale disabled/source metadata.
   This bridge resolves the current live Enchantment/Tactical cards directly
   and routes only those proxy actions to their real Zone 4 owners. */
(()=>{
  if(window.HAJJEN_ZONE4_DESKTOP_HAND_DIRECT_ACTIONS)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const hand=document.getElementById('manipCards');
  if(Number(cfg?.zone)!==4||!state||!hand)return;

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const cards=category=>[...hand.querySelectorAll(`:scope > .shared-hand-card[data-hand-category="${category}"]`)];
  const actionFor=(card,category)=>{
    if(!card)return null;
    if(category==='enchantment')return card.querySelector(':scope > .shared-enchantment-apply');
    if(category==='tactical')return card.querySelector(':scope > .shared-tactical-equip')||card.querySelector(':scope > button');
    return card.querySelector(':scope > button');
  };
  const selectFor=card=>card?.querySelector(':scope > .shared-enchantment-select')||null;

  function resolveSource(button){
    const category=button?.dataset?.category;
    const index=Math.max(0,Number(button?.dataset?.slot)||0);
    const list=cards(category);
    const key=String(button?.dataset?.sourceKey||'');
    if(key.startsWith('id:')){
      const id=key.slice(3);
      const hit=list.find(card=>card.dataset.enchantmentId===id||card.dataset.tacticalId===id);
      if(hit)return hit;
    }
    return list[index]||null;
  }

  function usable(button){
    const category=button?.dataset?.category;
    if(category!=='enchantment'&&category!=='tactical')return false;
    const source=resolveSource(button),live=actionFor(source,category);
    if(!source||!live||state.gameOver)return false;
    if(category==='enchantment'){
      const select=selectFor(source);
      return !live.disabled&&!!select&&[...select.options].some(option=>!option.disabled&&!!option.value);
    }
    return !live.disabled;
  }

  function syncProxy(){
    document.querySelectorAll('.hajjen-hand-list-layout .hajjen-hand-list-action').forEach(button=>{
      const category=button.dataset.category;
      if(category!=='enchantment'&&category!=='tactical')return;
      const source=resolveSource(button),live=actionFor(source,category),ok=usable(button);
      const row=button.closest('.hajjen-hand-list-row');
      if(source){row?.classList.remove('is-locked','is-empty');}
      button.disabled=!ok;
      if(live){
        const text=clean(live.textContent);
        if(category==='enchantment')button.textContent=/applied/i.test(text)?'APPLIED':'APPLY';
        else if(text)button.textContent=text;
      }
    });
  }

  function closePickers(){document.querySelectorAll('.hajjen-hand-enchant-picker-backdrop').forEach(node=>node.remove());}
  function openEnchantmentPicker(source){
    const select=selectFor(source),cardId=source?.dataset?.enchantmentId;
    const api=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
    if(!select||!cardId||!api?.apply)return false;
    const available=[...select.options].filter(option=>!option.disabled&&option.value);
    if(!available.length)return false;

    closePickers();
    const backdrop=document.createElement('div');backdrop.className='hajjen-hand-enchant-picker-backdrop';
    const modal=document.createElement('div');modal.className='hajjen-hand-enchant-picker';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    const head=document.createElement('div');head.className='hajjen-hand-enchant-picker-head';
    const title=document.createElement('span');title.textContent=`APPLY ${clean(source.querySelector(':scope > strong')?.textContent)||'ENCHANTMENT'}`;
    const close=document.createElement('button');close.type='button';close.className='hajjen-hand-enchant-picker-close';close.textContent='× CLOSE';
    head.append(title,close);
    const note=document.createElement('p');note.className='hajjen-hand-enchant-picker-note';note.textContent='Choose which crafted spell receives this Enchantment.';
    const options=document.createElement('div');options.className='hajjen-hand-enchant-picker-options';
    available.forEach(option=>{
      const choice=document.createElement('button');choice.type='button';choice.className='hajjen-hand-enchant-picker-option';choice.textContent=clean(option.textContent)||option.value;
      choice.addEventListener('click',()=>{
        const current=cards('enchantment').find(card=>card.dataset.enchantmentId===cardId)||source;
        if(api.apply(cardId,option.value)===true){backdrop.remove();window.HAJJEN_SHARED_HAND?.sync?.();window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();setTimeout(syncProxy,0);}
      });
      options.appendChild(choice);
    });
    const dismiss=()=>backdrop.remove();
    close.addEventListener('click',dismiss);backdrop.addEventListener('click',event=>{if(event.target===backdrop)dismiss();});
    modal.append(head,note,options);backdrop.appendChild(modal);document.body.appendChild(backdrop);close.focus({preventScroll:true});return true;
  }

  function handleProxyClick(event){
    const button=event.target instanceof Element?event.target.closest('.hajjen-hand-list-action'):null;
    if(!button||!button.closest('.hajjen-hand-list-layout'))return;
    const category=button.dataset.category;
    if(category!=='enchantment'&&category!=='tactical')return;
    const source=resolveSource(button),live=actionFor(source,category);
    if(!source||!live||state.gameOver)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(category==='enchantment')openEnchantmentPicker(source);
    else if(!live.disabled){live.click();queueMicrotask(()=>{window.HAJJEN_ZONE4_TACTICAL_COMBAT?.sync?.();window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();setTimeout(syncProxy,0);});}
  }

  document.addEventListener('click',handleProxyClick,true);
  const timer=setInterval(syncProxy,180);
  [0,80,220,600,1400].forEach(delay=>setTimeout(syncProxy,delay));
  window.addEventListener('pageshow',syncProxy);
  document.addEventListener('hajjen-ui-redesign-promoted',()=>setTimeout(syncProxy,0));
  document.addEventListener('hajjen:enchantment-applied',()=>setTimeout(syncProxy,0));
  document.addEventListener('hajjen:tactical-used',()=>setTimeout(syncProxy,0));

  window.HAJJEN_ZONE4_DESKTOP_HAND_DIRECT_ACTIONS={version:'1.0-direct-live-routing',sync:syncProxy,stop:()=>{clearInterval(timer);document.removeEventListener('click',handleProxyClick,true);}};
})();
