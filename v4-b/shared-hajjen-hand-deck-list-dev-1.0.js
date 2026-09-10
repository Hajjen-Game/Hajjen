/* HAJJEN Zone 3 DEV — Hand deck-list experiment v1.1.
   Visual proxy over the real Hand DOM. Gameplay stays owned by shared-hand / zone3.
   - Manipulation PLAY resolves the current live card before clicking it.
   - Tactical EQUIP resolves the current live card before clicking it.
   - Enchantment APPLY opens a spell picker and uses the Zone 3 enchantment API.
   - Rows keep the full gameplay description and expose it through a hover tooltip.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone;
  if(zone!==3)return;

  const hand=document.getElementById('manipCards');
  const panel=hand?.closest('.manipulation-panel');
  if(!hand||!panel)return;

  const CAPACITY={manipulation:4,enchantment:2,tactical:2};
  const LABEL={manipulation:'MANIPULATION',enchantment:'ENCHANTMENT',tactical:'TACTICAL'};
  const ICON={
    manipulation:'assets/hand-icons/hand-manipulation.png',
    enchantment:'assets/hand-icons/hand-enchantment.png',
    tactical:'assets/hand-icons/hand-tactical.png',
    locked:'assets/hand-icons/hand-locked.png'
  };

  let layout=panel.querySelector(':scope > .hajjen-hand-list-layout');
  if(!layout){
    layout=document.createElement('div');
    layout.className='hajjen-hand-list-layout';
    layout.setAttribute('aria-label','Hand card lists');
    panel.appendChild(layout);
  }
  panel.classList.add('hajjen-hand-list-active');

  const direct=(node,selector)=>node?.querySelector(`:scope > ${selector}`)||null;
  const clean=text=>String(text||'').replace(/\s+/g,' ').trim();

  function cardTitle(card){
    return clean(direct(card,'strong')?.textContent)||clean(card?.dataset?.handLabel)||'CARD';
  }

  function manipulationCopy(card){
    const candidates=[...card.children].filter(node=>{
      if(!(node instanceof HTMLElement))return false;
      if(!node.matches('span,small'))return false;
      return !node.classList.contains('hajjen-hand-icon-slot')&&
        !node.classList.contains('hajjen-hand-title-rule')&&
        !node.classList.contains('hajjen-manip-card-icon-wrap');
    });
    return clean(candidates[0]?.textContent);
  }

  function cardCopy(card,category){
    if(!card)return'';
    if(category==='enchantment')return clean(direct(card,'.shared-enchantment-copy')?.textContent);
    if(category==='tactical')return clean(direct(card,'.shared-tactical-copy')?.textContent||direct(card,'.shared-locked-copy')?.textContent);
    return manipulationCopy(card);
  }

  function isLocked(node){
    return !!node&&(node.classList.contains('locked')||node.classList.contains('hajjen-vector-locked-slot'));
  }

  function realCards(category){
    return [...hand.querySelectorAll(`:scope > .shared-hand-card[data-hand-category="${category}"]`)];
  }

  function placeholders(category){
    return [...hand.querySelectorAll(`:scope > .shared-hand-placeholder[data-hand-placeholder="${category}"]`)];
  }

  function sourceRows(category){
    const rows=[...realCards(category)];
    const needed=Math.max(0,CAPACITY[category]-rows.length);
    rows.push(...placeholders(category).slice(0,needed));
    while(rows.length<CAPACITY[category])rows.push(null);
    return rows.slice(0,CAPACITY[category]);
  }

  function sourceKey(source,category,index){
    if(!source)return`empty:${category}:${index}`;
    if(category==='enchantment'&&source.dataset.enchantmentId)return`id:${source.dataset.enchantmentId}`;
    return`title:${cardTitle(source).toLowerCase()}`;
  }

  function resolveSource(category,key,index){
    const sources=sourceRows(category);
    if(key?.startsWith('id:')){
      const id=key.slice(3);
      const hit=sources.find(source=>source?.dataset?.enchantmentId===id);
      if(hit)return hit;
    }
    if(key?.startsWith('title:')){
      const wanted=key.slice(6);
      const hit=sources.find(source=>source&&!isLocked(source)&&cardTitle(source).toLowerCase()===wanted);
      if(hit)return hit;
    }
    return sources[index]||null;
  }

  function buttonFor(card,category){
    if(!card||isLocked(card))return null;
    if(category==='enchantment')return direct(card,'.shared-enchantment-apply');
    if(category==='tactical')return direct(card,'.shared-tactical-equip')||direct(card,'button');
    return direct(card,'button');
  }

  function selectFor(card){return direct(card,'.shared-enchantment-select');}

  function actionLabel(card,category){
    if(!card||isLocked(card))return'LOCKED';
    const live=buttonFor(card,category);
    if(category==='enchantment'){
      const text=clean(live?.textContent).toUpperCase();
      return text==='APPLIED'?'APPLIED':'APPLY';
    }
    const text=clean(live?.textContent);
    if(text)return text;
    return category==='tactical'?'EQUIP':'PLAY';
  }

  function currentActionState(category,key,index){
    const source=resolveSource(category,key,index);
    const live=buttonFor(source,category);
    return {source,live,disabled:!source||isLocked(source)||!live||live.disabled};
  }

  function removePicker(){
    document.querySelectorAll('.hajjen-hand-enchant-picker-backdrop').forEach(node=>node.remove());
  }

  function openEnchantmentPicker(key,index){
    const card=resolveSource('enchantment',key,index);
    const select=selectFor(card);
    const apply=buttonFor(card,'enchantment');
    const api=window.HAJJEN_ZONE3_ENCHANTMENTS;
    if(!card||!select||!apply||apply.disabled)return;

    removePicker();
    const backdrop=document.createElement('div');
    backdrop.className='hajjen-hand-enchant-picker-backdrop';
    const modal=document.createElement('div');
    modal.className='hajjen-hand-enchant-picker';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label',`Apply ${cardTitle(card)}`);

    const head=document.createElement('div');
    head.className='hajjen-hand-enchant-picker-head';
    const heading=document.createElement('span');
    heading.textContent=`APPLY ${cardTitle(card)}`;
    const close=document.createElement('button');
    close.type='button';
    close.className='hajjen-hand-enchant-picker-close';
    close.textContent='× CLOSE';
    head.append(heading,close);

    const note=document.createElement('p');
    note.className='hajjen-hand-enchant-picker-note';
    note.textContent='Choose which crafted spell receives this Enchantment.';

    const options=document.createElement('div');
    options.className='hajjen-hand-enchant-picker-options';
    const available=[...select.options].filter(option=>!option.disabled&&option.value);
    if(!available.length){
      const empty=document.createElement('div');
      empty.className='hajjen-hand-enchant-picker-empty';
      empty.textContent='No eligible crafted spells.';
      options.appendChild(empty);
    }else{
      available.forEach(option=>{
        const choice=document.createElement('button');
        choice.type='button';
        choice.className='hajjen-hand-enchant-picker-option';
        choice.textContent=clean(option.textContent)||option.value;
        choice.addEventListener('click',()=>{
          const current=resolveSource('enchantment',key,index);
          if(!current)return;
          const currentId=current.dataset.enchantmentId;
          let applied=false;
          if(api?.apply&&currentId){
            applied=api.apply(currentId,option.value)===true;
          }else{
            const currentSelect=selectFor(current);
            const currentApply=buttonFor(current,'enchantment');
            if(currentSelect&&currentApply&&!currentApply.disabled){
              currentSelect.value=option.value;
              currentSelect.dispatchEvent(new Event('change',{bubbles:true}));
              currentApply.click();
              applied=true;
            }
          }
          if(applied){
            backdrop.remove();
            schedule();
            setTimeout(schedule,80);
          }
        });
        options.appendChild(choice);
      });
    }

    const closeModal=()=>backdrop.remove();
    close.addEventListener('click',closeModal);
    backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal();});
    const onKey=event=>{
      if(event.key==='Escape'){
        document.removeEventListener('keydown',onKey);
        closeModal();
      }
    };
    document.addEventListener('keydown',onKey);
    const cleanup=new MutationObserver(()=>{
      if(!document.body.contains(backdrop)){
        document.removeEventListener('keydown',onKey);
        cleanup.disconnect();
      }
    });
    cleanup.observe(document.body,{childList:true});

    modal.append(head,note,options);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    close.focus({preventScroll:true});
  }

  function makeRow(source,category,index){
    const locked=!source||isLocked(source);
    const key=sourceKey(source,category,index);
    const row=document.createElement('div');
    row.className=`hajjen-hand-list-row${locked?' is-locked':''}`;
    row.dataset.category=category;
    row.dataset.slot=String(index);
    row.dataset.sourceKey=key;

    const title=source?cardTitle(source):(locked?'SLOT LOCKED':'EMPTY SLOT');
    const description=source?cardCopy(source,category):(locked?'See Card Decks for unlock timing.':'Empty card slot.');
    row.dataset.fullDescription=description;

    const icon=document.createElement('img');
    icon.className='hajjen-hand-list-row-icon';
    icon.src=locked?ICON.locked:ICON[category];
    icon.alt='';
    icon.setAttribute('aria-hidden','true');

    const copy=document.createElement('div');
    copy.className='hajjen-hand-list-row-copy';
    const name=document.createElement('strong');
    name.className='hajjen-hand-list-row-title';
    name.textContent=title;
    const desc=document.createElement('span');
    desc.className='hajjen-hand-list-row-description';
    desc.textContent=description||'No description.';
    copy.append(name,desc);

    const action=document.createElement('button');
    action.type='button';
    action.className='hajjen-hand-list-action';
    action.dataset.category=category;
    action.dataset.sourceKey=key;
    action.dataset.slot=String(index);
    action.textContent=actionLabel(source,category);
    const state=currentActionState(category,key,index);
    action.disabled=locked||state.disabled;

    row.append(icon,copy,action);
    return row;
  }

  function makeCategory(category){
    const sources=sourceRows(category);
    const active=sources.filter(source=>source&&!isLocked(source)).length;

    const section=document.createElement('section');
    section.className='hajjen-hand-category';
    section.dataset.category=category;

    const header=document.createElement('div');
    header.className='hajjen-hand-category-header';
    const icon=document.createElement('img');
    icon.className='hajjen-hand-category-icon';
    icon.src=ICON[category];
    icon.alt='';
    icon.setAttribute('aria-hidden','true');
    const name=document.createElement('div');
    name.className='hajjen-hand-category-name';
    name.textContent=LABEL[category];
    const count=document.createElement('div');
    count.className='hajjen-hand-category-count';
    count.textContent=`${active} / ${CAPACITY[category]}`;
    header.append(icon,name,count);

    const rows=document.createElement('div');
    rows.className='hajjen-hand-category-rows';
    sources.forEach((source,index)=>rows.appendChild(makeRow(source,category,index)));
    section.append(header,rows);
    return section;
  }

  function performAction(button){
    if(button.disabled)return;
    const category=button.dataset.category;
    const key=button.dataset.sourceKey;
    const index=Number(button.dataset.slot)||0;
    if(category==='enchantment'){
      openEnchantmentPicker(key,index);
      return;
    }
    const {live,disabled}=currentActionState(category,key,index);
    if(disabled||!live)return;
    live.click();
    schedule();
    setTimeout(schedule,50);
    setTimeout(schedule,140);
  }

  /* Stable event delegation: proxy buttons survive repeated re-renders and always
     resolve the CURRENT live source card at click time. */
  layout.addEventListener('click',event=>{
    const button=event.target.closest('.hajjen-hand-list-action');
    if(!button||!layout.contains(button))return;
    event.preventDefault();
    event.stopPropagation();
    performAction(button);
  });

  /* Custom full-description hover tooltip. */
  let tooltip=null;
  function hideTooltip(){
    tooltip?.remove();
    tooltip=null;
  }
  function showTooltip(row){
    const text=clean(row?.dataset?.fullDescription);
    if(!text)return;
    hideTooltip();
    tooltip=document.createElement('div');
    tooltip.className='hajjen-hand-list-tooltip';
    tooltip.textContent=text;
    document.body.appendChild(tooltip);
    const rect=row.getBoundingClientRect();
    const tip=tooltip.getBoundingClientRect();
    let left=rect.left+rect.width/2-tip.width/2;
    left=Math.max(8,Math.min(left,window.innerWidth-tip.width-8));
    let top=rect.top-tip.height-7;
    if(top<8)top=rect.bottom+7;
    tooltip.style.left=`${Math.round(left)}px`;
    tooltip.style.top=`${Math.round(top)}px`;
  }
  layout.addEventListener('pointerover',event=>{
    const row=event.target.closest('.hajjen-hand-list-row');
    if(!row||!layout.contains(row)||row.contains(event.relatedTarget))return;
    showTooltip(row);
  });
  layout.addEventListener('pointerout',event=>{
    const row=event.target.closest('.hajjen-hand-list-row');
    if(!row||!layout.contains(row)||row.contains(event.relatedTarget))return;
    hideTooltip();
  });
  window.addEventListener('scroll',hideTooltip,{passive:true});
  window.addEventListener('resize',hideTooltip,{passive:true});

  let raf=0;
  function render(){
    raf=0;
    hideTooltip();
    if(!document.body.contains(hand)||!document.body.contains(panel))return;
    layout.replaceChildren(
      makeCategory('manipulation'),
      makeCategory('enchantment'),
      makeCategory('tactical')
    );
  }
  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(()=>requestAnimationFrame(render));
  }

  const observer=new MutationObserver(schedule);
  observer.observe(hand,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','aria-pressed','data-hand-category','data-hand-placeholder']});
  document.addEventListener('hajjen:enchantment-applied',schedule);

  render();
  requestAnimationFrame(render);
  setTimeout(render,80);
  setTimeout(render,250);

  window.HAJJEN_HAND_DECK_LIST_DEV={version:'1.1',hand,panel,layout,render:schedule,observer};
})();
