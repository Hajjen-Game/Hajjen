/* HAJJEN — production Hand list UI, Zones 1–3.
   Visual proxy over the real shared Hand DOM. Gameplay/state stays owned by
   shared-hand and the zone systems. This is the production promotion of the
   approved Zone 3 DEV Hand layout.
*/
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1'||window.HAJJEN_HAND_LIST_PRODUCTION)return;

  const shared=window.HAJJEN_SHARED_HAND;
  const zone=Number(shared?.zone||window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:0));
  if(zone<1||zone>3)return;

  const hand=shared?.hand||document.getElementById(zone===1?'manipulationCards':'manipCards');
  const panel=shared?.panel||hand?.closest('.manipulation-panel');
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
  const isPlaceholder=node=>!!node?.classList?.contains('shared-hand-placeholder');
  const isLocked=node=>!!node&&(node.classList.contains('locked')||node.classList.contains('hajjen-vector-locked-slot'));
  const isEmpty=node=>isPlaceholder(node)&&node.classList.contains('empty');

  function cardTitle(card){
    return clean(direct(card,'strong')?.textContent)||clean(card?.dataset?.handLabel)||'CARD';
  }
  function manipulationCopy(card){
    if(!card)return'';
    const candidates=[...card.children].filter(node=>{
      if(!(node instanceof HTMLElement)||!node.matches('span,small'))return false;
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
    if(isPlaceholder(source))return`${isLocked(source)?'locked':'empty'}:${category}:${index}`;
    if(category==='enchantment'&&source.dataset.enchantmentId)return`id:${source.dataset.enchantmentId}`;
    if(category==='tactical'&&source.dataset.tacticalId)return`id:${source.dataset.tacticalId}`;
    return`title:${cardTitle(source).toLowerCase()}`;
  }
  function resolveSource(category,key,index){
    const sources=sourceRows(category);
    if(key?.startsWith('id:')){
      const id=key.slice(3);
      const hit=sources.find(source=>source?.dataset?.enchantmentId===id||source?.dataset?.tacticalId===id);
      if(hit)return hit;
    }
    if(key?.startsWith('title:')){
      const wanted=key.slice(6);
      const hit=sources.find(source=>source&&!isPlaceholder(source)&&cardTitle(source).toLowerCase()===wanted);
      if(hit)return hit;
    }
    return sources[index]||null;
  }
  function buttonFor(card,category){
    if(!card||isPlaceholder(card)||isLocked(card))return null;
    if(category==='enchantment')return direct(card,'.shared-enchantment-apply');
    if(category==='tactical')return direct(card,'.shared-tactical-equip')||direct(card,'button');
    return direct(card,'button');
  }
  const selectFor=card=>direct(card,'.shared-enchantment-select');

  function actionLabel(card,category){
    if(!card||isLocked(card))return'LOCKED';
    if(isEmpty(card))return'EMPTY';
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
    return {source,live,disabled:!source||isPlaceholder(source)||isLocked(source)||!live||live.disabled};
  }

  function removePicker(){document.querySelectorAll('.hajjen-hand-enchant-picker-backdrop').forEach(node=>node.remove());}
  function openEnchantmentPicker(key,index){
    const card=resolveSource('enchantment',key,index);
    const select=selectFor(card);
    const apply=buttonFor(card,'enchantment');
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
          const api=window.HAJJEN_ZONE3_ENCHANTMENTS;
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
          if(applied){backdrop.remove();schedule();}
        });
        options.appendChild(choice);
      });
    }

    const closeModal=()=>backdrop.remove();
    close.addEventListener('click',closeModal);
    backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal();});
    const onKey=event=>{if(event.key==='Escape'){document.removeEventListener('keydown',onKey);closeModal();}};
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
    const placeholder=isPlaceholder(source);
    const locked=!source||isLocked(source);
    const empty=isEmpty(source);
    const key=sourceKey(source,category,index);
    const row=document.createElement('div');
    row.className=`hajjen-hand-list-row${locked?' is-locked':''}${empty?' is-empty':''}`;
    row.dataset.category=category;
    row.dataset.slot=String(index);
    row.dataset.sourceKey=key;

    const title=locked?'SLOT LOCKED':empty?'EMPTY SLOT':source?cardTitle(source):'SLOT LOCKED';
    const description=locked?'See Card Decks for unlock timing.':empty?'No card in this slot.':cardCopy(source,category);
    const safeDescription=description||'No description.';
    row.dataset.fullDescription=safeDescription;

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
    desc.textContent=safeDescription;
    desc.title=safeDescription;
    copy.append(name,desc);

    const action=document.createElement('button');
    action.type='button';
    action.className='hajjen-hand-list-action';
    action.dataset.category=category;
    action.dataset.sourceKey=key;
    action.dataset.slot=String(index);
    action.textContent=actionLabel(source,category);
    const state=currentActionState(category,key,index);
    action.disabled=locked||empty||placeholder||state.disabled;

    row.append(icon,copy,action);
    return row;
  }

  function makeCategory(category){
    const sources=sourceRows(category);
    const active=realCards(category).length;
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

  let tooltip=null;
  let tooltipTimer=0;
  function hideTooltip(){clearTimeout(tooltipTimer);tooltipTimer=0;tooltip?.remove();tooltip=null;}
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

  function performAction(button){
    if(button.disabled)return;
    const category=button.dataset.category;
    const key=button.dataset.sourceKey;
    const index=Number(button.dataset.slot)||0;
    hideTooltip();
    if(category==='enchantment'){openEnchantmentPicker(key,index);return;}
    const {live,disabled}=currentActionState(category,key,index);
    if(disabled||!live)return;
    live.click();
    schedule();
  }

  layout.addEventListener('click',event=>{
    const button=event.target.closest('.hajjen-hand-list-action');
    if(!button||!layout.contains(button))return;
    event.preventDefault();
    event.stopPropagation();
    performAction(button);
  },true);
  layout.addEventListener('pointerover',event=>{
    const row=event.target.closest('.hajjen-hand-list-row');
    if(!row||!layout.contains(row)||row.contains(event.relatedTarget))return;
    clearTimeout(tooltipTimer);
    tooltipTimer=setTimeout(()=>{if(row.isConnected&&row.matches(':hover'))showTooltip(row);},180);
  });
  layout.addEventListener('pointerout',event=>{
    const row=event.target.closest('.hajjen-hand-list-row');
    if(!row||!layout.contains(row)||row.contains(event.relatedTarget))return;
    hideTooltip();
  });
  window.addEventListener('scroll',hideTooltip,{passive:true});
  window.addEventListener('resize',hideTooltip,{passive:true});

  /* Shared Vector Frame, same geometry/palette as approved DEV. */
  const NS='http://www.w3.org/2000/svg';
  let frameSerial=0;
  let frameMounts=[];
  function roundedFramePath(w,h,inset,r){
    const x=inset,y=inset,right=Math.max(x,w-inset),bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [`M ${x+radius} ${y}`,`H ${right-radius}`,`Q ${right} ${y} ${right} ${y+radius}`,`V ${bottom-radius}`,`Q ${right} ${bottom} ${right-radius} ${bottom}`,`H ${x+radius}`,`Q ${x} ${bottom} ${x} ${bottom-radius}`,`V ${y+radius}`,`Q ${x} ${y} ${x+radius} ${y}`,'Z'].join(' ');
  }
  function mountFrame(section,index){
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-shared-vector-frame','hajjen-hand-category-shared-frame');
    svg.setAttribute('data-hand-category-frame',String(index));
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');
    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=`hajjenHandCategoryGoldProd-${++frameSerial}`;
    gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');gradient.setAttribute('gradientUnits','objectBoundingBox');
    [['0%','#efd6a0'],['28%','#c9914f'],['62%','#7a4c29'],['82%','#b77a3b'],['100%','#dfb46b']].forEach(([offset,color])=>{
      const stop=document.createElementNS(NS,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.appendChild(stop);
    });
    defs.appendChild(gradient);svg.appendChild(defs);
    const makePath=cls=>{const p=document.createElementNS(NS,'path');p.setAttribute('class',cls);svg.appendChild(p);return p;};
    const shadow=makePath('frame-shadow');
    const gold=makePath('frame-gold');gold.setAttribute('stroke',`url(#${gradient.id})`);
    const inner=makePath('frame-inner');
    const highlight=makePath('frame-highlight');
    const corners=['tl','tr','br','bl'].map(name=>{
      const group=document.createElementNS(NS,'g');group.setAttribute('data-corner',name);
      const accent=document.createElementNS(NS,'path');accent.setAttribute('class','corner-accent');
      const sweepShadow=document.createElementNS(NS,'path');sweepShadow.setAttribute('class','corner-sweep-shadow');
      const sweep=document.createElementNS(NS,'path');sweep.setAttribute('class','corner-sweep');
      const node=document.createElementNS(NS,'circle');node.setAttribute('class','corner-node');node.setAttribute('r','1.35');
      group.append(accent,sweepShadow,sweep,node);svg.appendChild(group);return{name,accent,sweepShadow,sweep,node};
    });
    function renderFrame(){
      const w=Math.max(80,section.clientWidth||0),h=Math.max(80,section.clientHeight||0);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      shadow.setAttribute('d',roundedFramePath(w,h,2.35,5.9));
      gold.setAttribute('d',roundedFramePath(w,h,2.35,5.9));
      inner.setAttribute('d',roundedFramePath(w,h,5.1,4.35));
      highlight.setAttribute('d',roundedFramePath(w,h,3.5,5.15));
      const inset=6.05,radius=4.15,arm=7.35,nodeOffset=2.95,sweepReach=10.9,sweepEdge=.72;
      const data={
        tl:{accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+1.55} ${inset+7.55}, ${inset+6.35} ${inset+1.75}, ${inset+sweepReach} ${inset+sweepEdge}`,cx:inset+nodeOffset,cy:inset+nodeOffset},
        tr:{accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-1.55} ${inset+7.55}, ${w-inset-6.35} ${inset+1.75}, ${w-inset-sweepReach} ${inset+sweepEdge}`,cx:w-inset-nodeOffset,cy:inset+nodeOffset},
        br:{accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-1.55} ${h-inset-7.55}, ${w-inset-6.35} ${h-inset-1.75}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,cx:w-inset-nodeOffset,cy:h-inset-nodeOffset},
        bl:{accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+1.55} ${h-inset-7.55}, ${inset+6.35} ${h-inset-1.75}, ${inset+sweepReach} ${h-inset-sweepEdge}`,cx:inset+nodeOffset,cy:h-inset-nodeOffset}
      };
      corners.forEach(({name,accent,sweepShadow,sweep,node})=>{accent.setAttribute('d',data[name].accent);sweepShadow.setAttribute('d',data[name].sweep);sweep.setAttribute('d',data[name].sweep);node.setAttribute('cx',data[name].cx);node.setAttribute('cy',data[name].cy);});
    }
    section.appendChild(svg);
    renderFrame();
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(renderFrame):null;
    ro?.observe(section);
    return{resizeObserver:ro};
  }
  function remountFrames(){
    frameMounts.forEach(item=>item?.resizeObserver?.disconnect?.());
    frameMounts=[...layout.querySelectorAll(':scope > .hajjen-hand-category')].map(mountFrame);
  }

  let raf=0;
  function render(){
    raf=0;
    hideTooltip();
    if(!document.body.contains(hand)||!document.body.contains(panel))return;
    frameMounts.forEach(item=>item?.resizeObserver?.disconnect?.());
    frameMounts=[];
    layout.replaceChildren(makeCategory('manipulation'),makeCategory('enchantment'),makeCategory('tactical'));
    remountFrames();
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(()=>requestAnimationFrame(render));}

  const observer=new MutationObserver(schedule);
  observer.observe(hand,{childList:true,subtree:false});
  document.addEventListener('hajjen:enchantment-applied',schedule);
  render();
  setTimeout(schedule,220);

  window.HAJJEN_HAND_LIST_PRODUCTION={version:'1.0',zone,hand,panel,layout,render:schedule,observer};
})();
