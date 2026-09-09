/* HAJJEN Action Bar production presentation binder.
   Safe by design: no spell/loadout mutation, no button child rewrites, no Action Bar
   MutationObserver. Reads live spell names, sets CSS variables/data attributes and
   draws passive shared vector frames around existing Action Bar slots. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')==='1')return;

  const actionHud=document.querySelector('.action-hud.shared-action-bar');
  const actionbar=document.getElementById('actionbar');
  if(!actionHud||!actionbar)return;

  actionHud.classList.add('hajjen-actionbar-cards-production');

  const iconFiles={
    'ember bolt':'ember-bolt.png',
    'cinder burst':'cinder-burst.png',
    'thorn bloom':'thorn-bloom.png',
    'tide lash':'tide-lash.png',
    'stone breaker':'stone-breaker.png',
    'razor gust':'razor-gust.png',
    'rift pulse':'rift-pulse.png',
    'healing potion':'healing-potion.png'
  };

  function normalizedName(slot){
    if(slot.classList.contains('shared-potion-slot'))return 'healing potion';
    return (slot.querySelector(':scope > strong')?.textContent||'').trim().toLowerCase();
  }

  function syncIcons(){
    actionbar.querySelectorAll(':scope > .action-slot').forEach(slot=>{
      const file=iconFiles[normalizedName(slot)];
      if(!file){
        slot.style.removeProperty('--ab-icon-image');
        delete slot.dataset.actionPngIcon;
        return;
      }
      slot.style.setProperty('--ab-icon-image',`url("assets/action-bar-icons/${file}")`);
      slot.dataset.actionPngIcon=file;
    });
  }

  let iconRaf=0;
  function scheduleIconSync(){
    if(iconRaf)cancelAnimationFrame(iconRaf);
    iconRaf=requestAnimationFrame(()=>{
      iconRaf=0;
      syncIcons();
    });
  }

  syncIcons();
  requestAnimationFrame(syncIcons);

  /* Observe only the spell source. shared-action-bar mirrors that source into the
     Action Bar; this callback only refreshes icon CSS variables afterwards. */
  const spellSource=window.HAJJEN_SHARED_ACTION_BAR?.spellSource||document.getElementById('spellGrid')||document.getElementById('spells');
  const spellObserver=spellSource&&typeof MutationObserver==='function'
    ?new MutationObserver(scheduleIconSync)
    :null;
  spellObserver?.observe(spellSource,{childList:true,subtree:true,characterData:true});

  /* Passive exact shared vector-frame overlay. */
  const NS='http://www.w3.org/2000/svg';
  const FRAME_OUTSET=5;
  actionbar.querySelector(':scope > .hajjen-action-card-shared-frame-overlay')?.remove();
  const slots=[...actionbar.querySelectorAll(':scope > .action-slot')];
  if(!slots.length)return;

  function roundedFramePath(w,h,inset,r){
    const x=inset;
    const y=inset;
    const right=Math.max(x,w-inset);
    const bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [
      `M ${x+radius} ${y}`,
      `H ${right-radius}`,
      `Q ${right} ${y} ${right} ${y+radius}`,
      `V ${bottom-radius}`,
      `Q ${right} ${bottom} ${right-radius} ${bottom}`,
      `H ${x+radius}`,
      `Q ${x} ${bottom} ${x} ${bottom-radius}`,
      `V ${y+radius}`,
      `Q ${x} ${y} ${x+radius} ${y}`,
      'Z'
    ].join(' ');
  }

  const svg=document.createElementNS(NS,'svg');
  svg.classList.add('hajjen-shared-vector-frame','hajjen-action-card-shared-frame-overlay');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','none');

  const defs=document.createElementNS(NS,'defs');
  const gradient=document.createElementNS(NS,'linearGradient');
  gradient.id='hajjenActionCardSharedGoldProduction';
  gradient.setAttribute('x1','0');
  gradient.setAttribute('y1','0');
  gradient.setAttribute('x2','0');
  gradient.setAttribute('y2','1');
  gradient.setAttribute('gradientUnits','objectBoundingBox');
  [
    ['0%','#efd6a0'],
    ['28%','#c9914f'],
    ['62%','#7a4c29'],
    ['82%','#b77a3b'],
    ['100%','#dfb46b']
  ].forEach(([offset,color])=>{
    const stop=document.createElementNS(NS,'stop');
    stop.setAttribute('offset',offset);
    stop.setAttribute('stop-color',color);
    gradient.appendChild(stop);
  });
  defs.appendChild(gradient);
  svg.appendChild(defs);

  function makePath(parent,cls){
    const p=document.createElementNS(NS,'path');
    p.setAttribute('class',cls);
    parent.appendChild(p);
    return p;
  }

  const frames=slots.map((slot,index)=>{
    const group=document.createElementNS(NS,'g');
    group.setAttribute('data-action-card-frame',String(index));
    svg.appendChild(group);

    const shadow=makePath(group,'frame-shadow');
    const gold=makePath(group,'frame-gold');
    gold.setAttribute('stroke','url(#hajjenActionCardSharedGoldProduction)');
    const inner=makePath(group,'frame-inner');
    const highlight=makePath(group,'frame-highlight');

    const corners=['tl','tr','br','bl'].map(name=>{
      const cornerGroup=document.createElementNS(NS,'g');
      cornerGroup.setAttribute('data-corner',name);
      const accent=document.createElementNS(NS,'path');
      accent.setAttribute('class','corner-accent');
      const sweepShadow=document.createElementNS(NS,'path');
      sweepShadow.setAttribute('class','corner-sweep-shadow');
      const sweep=document.createElementNS(NS,'path');
      sweep.setAttribute('class','corner-sweep');
      const node=document.createElementNS(NS,'circle');
      node.setAttribute('class','corner-node');
      node.setAttribute('r','1.35');
      cornerGroup.append(accent,sweepShadow,sweep,node);
      group.appendChild(cornerGroup);
      return {name,accent,sweepShadow,sweep,node};
    });
    return {slot,group,shadow,gold,inner,highlight,corners};
  });

  function renderFrame(frame){
    const {slot,group,shadow,gold,inner,highlight,corners}=frame;
    const x=slot.offsetLeft-FRAME_OUTSET;
    const y=slot.offsetTop-FRAME_OUTSET;
    const w=Math.max(80,(slot.offsetWidth||0)+(FRAME_OUTSET*2));
    const h=Math.max(80,(slot.offsetHeight||0)+(FRAME_OUTSET*2));
    group.setAttribute('transform',`translate(${x} ${y})`);

    const outer=roundedFramePath(w,h,2.35,5.9);
    const innerD=roundedFramePath(w,h,5.1,4.35);
    const highlightD=roundedFramePath(w,h,3.5,5.15);
    shadow.setAttribute('d',outer);
    gold.setAttribute('d',outer);
    inner.setAttribute('d',innerD);
    highlight.setAttribute('d',highlightD);

    const inset=6.05;
    const radius=4.15;
    const arm=7.35;
    const nodeOffset=2.95;
    const sweepReach=10.9;
    const sweepEdge=.72;
    const data={
      tl:{accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+1.55} ${inset+7.55}, ${inset+6.35} ${inset+1.75}, ${inset+sweepReach} ${inset+sweepEdge}`,cx:inset+nodeOffset,cy:inset+nodeOffset},
      tr:{accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-1.55} ${inset+7.55}, ${w-inset-6.35} ${inset+1.75}, ${w-inset-sweepReach} ${inset+sweepEdge}`,cx:w-inset-nodeOffset,cy:inset+nodeOffset},
      br:{accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-1.55} ${h-inset-7.55}, ${w-inset-6.35} ${h-inset-1.75}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,cx:w-inset-nodeOffset,cy:h-inset-nodeOffset},
      bl:{accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+1.55} ${h-inset-7.55}, ${inset+6.35} ${h-inset-1.75}, ${inset+sweepReach} ${h-inset-sweepEdge}`,cx:inset+nodeOffset,cy:h-inset-nodeOffset}
    };
    corners.forEach(({name,accent,sweepShadow,sweep,node})=>{
      accent.setAttribute('d',data[name].accent);
      sweepShadow.setAttribute('d',data[name].sweep);
      sweep.setAttribute('d',data[name].sweep);
      node.setAttribute('cx',data[name].cx);
      node.setAttribute('cy',data[name].cy);
    });
  }

  function render(){
    const w=Math.max(actionbar.clientWidth,actionbar.scrollWidth,1);
    const h=Math.max(actionbar.clientHeight,actionbar.scrollHeight,1);
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.setAttribute('width',String(w));
    svg.setAttribute('height',String(h));
    svg.style.width=`${w}px`;
    svg.style.height=`${h}px`;
    frames.forEach(renderFrame);
  }

  actionbar.appendChild(svg);
  render();
  const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
  if(ro){
    ro.observe(actionbar);
    slots.forEach(slot=>ro.observe(slot));
  }else{
    window.addEventListener('resize',render,{passive:true});
  }
  requestAnimationFrame(render);

  window.HAJJEN_ACTION_BAR_PRODUCTION={
    version:'1.0',actionHud,actionbar,iconFiles,syncIcons,spellObserver,
    frameOutset:FRAME_OUTSET,svg,slots,render,resizeObserver:ro
  };
})();
