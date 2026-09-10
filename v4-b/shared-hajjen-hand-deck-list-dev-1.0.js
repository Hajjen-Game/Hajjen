/* HAJJEN Zone 3 DEV — Hand deck-list experiment v1.0.
   Visual proxy over the real Hand DOM. Gameplay stays owned by shared-hand / zone3.
   Manipulation PLAY and Tactical EQUIP proxy the live buttons. Enchantment APPLY
   opens a compact spell picker, then delegates to the live select/apply controls.
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

  function openEnchantmentPicker(card){
    const select=selectFor(card);
    const apply=buttonFor(card,'enchantment');
    if(!select||!apply||apply.disabled)return;

    document.querySelectorAll('.hajjen-hand-enchant-picker-backdrop').forEach(node=>node.remove());
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
          select.value=option.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
          apply.click();
          backdrop.remove();
          schedule();
          setTimeout(schedule,80);
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
    backdrop.addEventListener('DOMNodeRemoved',()=>document.removeEventListener('keydown',onKey),{once:true});

    modal.append(head,note,options);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    close.focus({preventScroll:true});
  }

  function makeRow(source,category,index){
    const locked=!source||isLocked(source);
    const row=document.createElement('div');
    row.className=`hajjen-hand-list-row${locked?' is-locked':''}`;
    row.dataset.category=category;
    row.dataset.slot=String(index+1);

    const title=source?cardTitle(source):(locked?'SLOT LOCKED':'EMPTY SLOT');
    const description=source?cardCopy(source,category):(locked?'See Card Decks for unlock timing.':'Empty card slot.');
    row.title=description;

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
    desc.title=description;
    copy.append(name,desc);

    const action=document.createElement('button');
    action.type='button';
    action.className='hajjen-hand-list-action';
    action.textContent=actionLabel(source,category);
    const live=buttonFor(source,category);
    action.disabled=locked||!live||live.disabled;
    if(category==='enchantment'&&!locked){
      action.addEventListener('click',()=>openEnchantmentPicker(source));
    }else if(!locked&&live){
      action.addEventListener('click',()=>{
        live.click();
        schedule();
        setTimeout(schedule,60);
      });
    }

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

  let raf=0;
  function render(){
    raf=0;
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

  window.HAJJEN_HAND_DECK_LIST_DEV={version:'1.0',hand,panel,layout,render:schedule,observer};
})();
