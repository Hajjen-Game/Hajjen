/* HAJJEN Zone 4 — stable desktop Hand proxy + direct actions.
   The production Hand is a visual proxy over hidden gameplay cards. Rebuilding
   that proxy repeatedly replaces the button under the mouse and causes rapid
   hover flicker. Zone 4 now keeps the visible proxy DOM mounted and synchronizes
   text/state in place. Hidden Hand mutations may be frequent; visible nodes are
   never replaced for those routine syncs. */
(()=>{
  if(window.HAJJEN_ZONE4_DESKTOP_HAND_DIRECT_ACTIONS)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const hand=document.getElementById('manipCards');
  const production=window.HAJJEN_HAND_LIST_PRODUCTION;
  if(Number(cfg?.zone)!==4||!state||!hand||!production)return;

  const clean=v=>String(v||'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim();
  const finePointer=()=>window.matchMedia?.('(pointer:fine)')?.matches!==false;
  const layout=()=>document.querySelector('.hajjen-hand-list-layout');
  const cards=category=>[...hand.querySelectorAll(`:scope > .shared-hand-card[data-hand-category="${category}"]`)];
  const sourceForSlot=(category,index)=>cards(category)[Math.max(0,Number(index)||0)]||null;
  const titleOf=source=>clean(source?.querySelector(':scope > strong')?.textContent)||clean(source?.dataset?.handLabel)||'CARD';
  const copyOf=(source,category)=>{
    if(!source)return'';
    if(category==='enchantment')return clean(source.querySelector(':scope > .shared-enchantment-copy')?.textContent);
    if(category==='tactical')return clean(source.querySelector(':scope > .shared-tactical-copy')?.textContent||source.querySelector(':scope > .shared-locked-copy')?.textContent);
    const node=[...source.children].find(n=>n instanceof HTMLElement&&n.matches('span,small')&&!n.classList.contains('hajjen-hand-icon-slot')&&!n.classList.contains('hajjen-hand-title-rule')&&!n.classList.contains('hajjen-manip-card-icon-wrap'));
    return clean(node?.textContent);
  };
  const liveButton=(source,category)=>{
    if(!source)return null;
    if(category==='enchantment')return source.querySelector(':scope > .shared-enchantment-apply');
    if(category==='tactical')return source.querySelector(':scope > .shared-tactical-equip')||source.querySelector(':scope > button');
    return source.querySelector(':scope > button');
  };
  const keyFor=(source,category,index)=>{
    if(!source)return`empty:${category}:${index}`;
    if(category==='enchantment'&&source.dataset.enchantmentId)return`id:${source.dataset.enchantmentId}`;
    if(category==='tactical'&&source.dataset.tacticalId)return`id:${source.dataset.tacticalId}`;
    return`title:${titleOf(source).toLowerCase()}`;
  };

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

  function visibleState(source,category){
    if(!source)return {label:'EMPTY',disabled:true};
    if(category==='enchantment'){
      const s=enchantState(source);return {label:s.applied?'APPLIED':'APPLY',disabled:!s.usable};
    }
    if(category==='tactical'){
      const s=tacticalState(source);return {label:s.used?'USED':s.equipped?'EQUIPPED':'EQUIP',disabled:!s.usable};
    }
    const live=liveButton(source,category);
    return {label:clean(live?.textContent)||'PLAY',disabled:!live||!!live.disabled};
  }

  let syncRaf=0;
  function syncStable(){
    syncRaf=0;
    const root=layout();if(!root)return;
    ['manipulation','enchantment','tactical'].forEach(category=>{
      const list=cards(category);
      const count=root.querySelector(`.hajjen-hand-category[data-category="${category}"] .hajjen-hand-category-count`);
      const capacity=category==='manipulation'?4:2;
      if(count){const wanted=`${list.length} / ${capacity}`;if(count.textContent!==wanted)count.textContent=wanted;}
      root.querySelectorAll(`.hajjen-hand-category[data-category="${category}"] .hajjen-hand-list-row`).forEach((row,index)=>{
        const source=sourceForSlot(category,index);
        const title=row.querySelector('.hajjen-hand-list-row-title');
        const desc=row.querySelector('.hajjen-hand-list-row-description');
        const button=row.querySelector('.hajjen-hand-list-action');
        if(!button)return;
        if(!source){
          row.classList.add('is-empty');
          if(title&&title.textContent!=='EMPTY SLOT')title.textContent='EMPTY SLOT';
          if(desc&&desc.textContent!=='No card in this slot.')desc.textContent='No card in this slot.';
          if(button.textContent!=='EMPTY')button.textContent='EMPTY';
          if(!button.disabled)button.disabled=true;
          return;
        }
        row.classList.remove('is-empty','is-locked');
        const name=titleOf(source),copy=copyOf(source,category),key=keyFor(source,category,index),v=visibleState(source,category);
        row.dataset.sourceKey=key;row.dataset.fullDescription=copy||'No description.';
        button.dataset.category=category;button.dataset.slot=String(index);button.dataset.sourceKey=key;
        if(title&&title.textContent!==name)title.textContent=name;
        if(desc&&desc.textContent!==(copy||'No description.')){desc.textContent=copy||'No description.';desc.title=copy||'No description.';}
        if(button.textContent!==v.label)button.textContent=v.label;
        if(button.disabled!==v.disabled)button.disabled=v.disabled;
      });
    });
  }
  function scheduleStable(){if(syncRaf)return;syncRaf=requestAnimationFrame(syncStable);}

  // Critical: stop the generic rebuild observer and replace the public render
  // hook with an in-place sync. Other Zone 4 systems may call render often;
  // those calls can no longer replace the hovered button element.
  production.observer?.disconnect?.();
  production.render=scheduleStable;
  const hiddenObserver=new MutationObserver(scheduleStable);
  hiddenObserver.observe(hand,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','data-hand-label','data-enchantment-id','data-tactical-id']});

  const stableStyle=document.createElement('style');
  stableStyle.dataset.zone4HandStable='v5';
  stableStyle.textContent=`html[data-hajjen-promoted] .zone3-app .cards-hud .hajjen-hand-list-action{transition:none!important} html[data-hajjen-promoted] .zone3-app .cards-hud .hajjen-hand-list-action:hover{transform:none!important}`;
  document.head.appendChild(stableStyle);

  function buttonAtPoint(x,y){
    return [...(layout()?.querySelectorAll('.hajjen-hand-list-action')||[])].find(button=>{
      if(button.dataset.category!=='enchantment'&&button.dataset.category!=='tactical')return false;
      const r=button.getBoundingClientRect();return r.width>0&&r.height>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
    })||null;
  }
  function sourceForButton(button){return sourceForSlot(button?.dataset?.category,button?.dataset?.slot);}

  function closePickers(){document.querySelectorAll('.hajjen-hand-enchant-picker-backdrop').forEach(node=>node.remove());}
  function openEnchantmentPicker(source){
    const {id,api,spells,usable}=enchantState(source);if(!usable)return false;
    closePickers();
    const backdrop=document.createElement('div');backdrop.className='hajjen-hand-enchant-picker-backdrop';
    const modal=document.createElement('div');modal.className='hajjen-hand-enchant-picker';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    const head=document.createElement('div');head.className='hajjen-hand-enchant-picker-head';
    const title=document.createElement('span');title.textContent=`APPLY ${titleOf(source)}`;
    const close=document.createElement('button');close.type='button';close.className='hajjen-hand-enchant-picker-close';close.textContent='× CLOSE';head.append(title,close);
    const note=document.createElement('p');note.className='hajjen-hand-enchant-picker-note';note.textContent='Choose which crafted spell receives this Enchantment.';
    const options=document.createElement('div');options.className='hajjen-hand-enchant-picker-options';
    spells.forEach(spell=>{
      const choice=document.createElement('button');choice.type='button';choice.className='hajjen-hand-enchant-picker-option';choice.textContent=spell.name||spell.id;
      choice.addEventListener('click',()=>{if(api.apply(id,spell.id)===true){backdrop.remove();scheduleStable();}});options.appendChild(choice);
    });
    const dismiss=()=>backdrop.remove();close.addEventListener('click',dismiss);backdrop.addEventListener('click',e=>{if(e.target===backdrop)dismiss();});
    modal.append(head,note,options);backdrop.appendChild(modal);document.body.appendChild(backdrop);close.focus({preventScroll:true});return true;
  }
  function equipTactical(source){
    const s=tacticalState(source);if(!s.usable)return false;
    s.owner.equipped.add(s.key);state.tacticalEquippedKeys=[...s.owner.equipped];
    source.classList.add('is-equipt');
    const real=liveButton(source,'tactical');if(real){real.textContent='EQUIPPED';real.disabled=true;real.setAttribute('aria-pressed','true');}
    s.combat?.sync?.();scheduleStable();return true;
  }
  function runDirect(button){
    const source=sourceForButton(button);if(!source||state.gameOver)return false;
    if(button.dataset.category==='enchantment')return openEnchantmentPicker(source);
    if(button.dataset.category==='tactical')return equipTactical(source);
    return false;
  }

  let suppressClickUntil=0;
  function onPointerDown(event){
    if(!finePointer()||event.button!==0||event.pointerType==='touch')return;
    const button=buttonAtPoint(event.clientX,event.clientY);if(!button||button.disabled)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(runDirect(button))suppressClickUntil=performance.now()+500;
  }
  function onClick(event){
    if(!finePointer())return;
    const direct=event.target instanceof Element?event.target.closest('.hajjen-hand-list-action'):null;
    const button=(direct&&(direct.dataset.category==='enchantment'||direct.dataset.category==='tactical')?direct:null)||buttonAtPoint(event.clientX,event.clientY);
    if(!button)return;
    if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
    if(button.disabled)return;
    event.preventDefault();event.stopImmediatePropagation();runDirect(button);
  }
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('click',onClick,true);

  [0,80,220,600].forEach(delay=>setTimeout(scheduleStable,delay));
  window.addEventListener('pageshow',scheduleStable);
  document.addEventListener('hajjen-ui-redesign-promoted',()=>{production.observer?.disconnect?.();scheduleStable();});
  document.addEventListener('hajjen:enchantment-applied',scheduleStable);
  document.addEventListener('hajjen:enchantment-replaced',scheduleStable);
  document.addEventListener('hajjen:tactical-used',scheduleStable);
  document.addEventListener('hajjen:tactical-replaced',scheduleStable);

  window.HAJJEN_ZONE4_DESKTOP_HAND_DIRECT_ACTIONS={
    version:'5.0-stable-proxy-dom',sync:scheduleStable,render:scheduleStable,
    stop:()=>{hiddenObserver.disconnect();document.removeEventListener('pointerdown',onPointerDown,true);document.removeEventListener('click',onClick,true);stableStyle.remove();}
  };
})();