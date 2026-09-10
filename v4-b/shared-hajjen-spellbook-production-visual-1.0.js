/* HAJJEN Spellbook production visual layer — Zones 1–3.
   Mirrors the approved Zone 3 DEV presentation without changing spell/crafting state. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone||(zone===3&&params.get('dev')==='1'))return;
  if(window.HAJJEN_SPELLBOOK_PRODUCTION_VISUAL)return;

  const modal=document.getElementById('spellbookModal');
  const card=modal?.querySelector(':scope > .modal-card');
  const root=modal?.querySelector('.shared-spellbook-v2');
  if(!modal||!card||!root)return;

  modal.classList.add('hajjen-spellbook-dev');
  card.classList.add('hajjen-spellbook-dev-card');

  const NS='http://www.w3.org/2000/svg';
  const iconFiles={
    'ember bolt':'ember-bolt.png',
    'cinder burst':'cinder-burst.png',
    'thorn bloom':'thorn-bloom.png',
    'tide lash':'tide-lash.png',
    'stone breaker':'stone-breaker.png',
    'razor gust':'razor-gust.png',
    'rift pulse':'rift-pulse.png'
  };
  const forceIconFiles={
    growth:'thorn-bloom.png',ember:'cinder-burst.png',flow:'tide-lash.png',
    stone:'stone-breaker.png',gale:'razor-gust.png',aether:'rift-pulse.png'
  };

  function copyActionBarSurface(){
    const actionBar=document.querySelector('.action-hud.shared-action-bar');
    if(!actionBar)return;
    const style=getComputedStyle(actionBar);
    card.style.setProperty('--hajjen-spellbook-bg-color',style.backgroundColor||'#633431');
    if(style.backgroundImage&&style.backgroundImage!=='none')card.style.setProperty('--hajjen-spellbook-bg-image',style.backgroundImage);
  }

  function roundedFramePath(w,h,inset,r){
    const x=inset,y=inset,right=Math.max(x,w-inset),bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [`M ${x+radius} ${y}`,`H ${right-radius}`,`Q ${right} ${y} ${right} ${y+radius}`,`V ${bottom-radius}`,`Q ${right} ${bottom} ${right-radius} ${bottom}`,`H ${x+radius}`,`Q ${x} ${bottom} ${x} ${bottom-radius}`,`V ${y+radius}`,`Q ${x} ${y} ${x+radius} ${y}`,'Z'].join(' ');
  }

  let frameSerial=0;
  function mountFrame(target,frameClass){
    if(!target)return null;
    target.querySelector(`:scope > .${frameClass}`)?.remove();
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-shared-vector-frame',frameClass);
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');

    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=`hajjenSpellbookProductionGold-${++frameSerial}`;
    gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');
    gradient.setAttribute('gradientUnits','objectBoundingBox');
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
      group.append(accent,sweepShadow,sweep,node);svg.appendChild(group);
      return {name,accent,sweepShadow,sweep,node};
    });

    function render(){
      const w=Math.max(80,target.clientWidth||0),h=Math.max(80,target.clientHeight||0);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const outer=roundedFramePath(w,h,2.35,5.9),innerD=roundedFramePath(w,h,5.1,4.35),highlightD=roundedFramePath(w,h,3.5,5.15);
      shadow.setAttribute('d',outer);gold.setAttribute('d',outer);inner.setAttribute('d',innerD);highlight.setAttribute('d',highlightD);
      const inset=6.05,radius=4.15,arm=7.35,nodeOffset=2.95,sweepReach=10.9,sweepEdge=.72;
      const data={
        tl:{accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+1.55} ${inset+7.55}, ${inset+6.35} ${inset+1.75}, ${inset+sweepReach} ${inset+sweepEdge}`,cx:inset+nodeOffset,cy:inset+nodeOffset},
        tr:{accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-1.55} ${inset+7.55}, ${w-inset-6.35} ${inset+1.75}, ${w-inset-sweepReach} ${inset+sweepEdge}`,cx:w-inset-nodeOffset,cy:inset+nodeOffset},
        br:{accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-1.55} ${h-inset-7.55}, ${w-inset-6.35} ${h-inset-1.75}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,cx:w-inset-nodeOffset,cy:h-inset-nodeOffset},
        bl:{accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+1.55} ${h-inset-7.55}, ${inset+6.35} ${h-inset-1.75}, ${inset+sweepReach} ${h-inset-sweepEdge}`,cx:inset+nodeOffset,cy:h-inset-nodeOffset}
      };
      corners.forEach(({name,accent,sweepShadow,sweep,node})=>{
        accent.setAttribute('d',data[name].accent);sweepShadow.setAttribute('d',data[name].sweep);sweep.setAttribute('d',data[name].sweep);
        node.setAttribute('cx',data[name].cx);node.setAttribute('cy',data[name].cy);
      });
    }
    target.prepend(svg);render();
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;ro?.observe(target);
    if(!ro)window.addEventListener('resize',render,{passive:true});
    return {target,svg,render,resizeObserver:ro};
  }

  const outerFrame=mountFrame(card,'hajjen-spellbook-window-frame');
  const sectionFrames=[...root.querySelectorAll(':scope > .sbv2-section, :scope > .sbv2-middle-grid > .sbv2-section')]
    .map(section=>mountFrame(section,'hajjen-spellbook-section-frame'));

  function setSpellIcon(node,name){
    const file=iconFiles[String(name||'').trim().toLowerCase()];
    if(file){node.style.setProperty('--sb-spell-icon',`url("assets/action-bar-icons/${file}")`);node.dataset.spellbookIcon=file;}
    else{node.style.removeProperty('--sb-spell-icon');delete node.dataset.spellbookIcon;}
  }
  function syncIcons(){
    root.querySelectorAll('.sbv2-loaded-card').forEach(node=>setSpellIcon(node,node.querySelector('h5')?.textContent));
    root.querySelectorAll('.sbv2-library-card').forEach(node=>setSpellIcon(node,node.querySelector('h5')?.textContent));
    root.querySelectorAll('.sbv2-force').forEach(node=>{
      const force=Object.keys(forceIconFiles).find(name=>node.classList.contains(name));
      const file=force&&forceIconFiles[force];
      if(file){node.style.setProperty('--sb-force-icon',`url("assets/action-bar-icons/${file}")`);node.dataset.forceIcon=file;}
    });
  }
  let syncRaf=0;
  function scheduleSync(){
    if(syncRaf)cancelAnimationFrame(syncRaf);
    syncRaf=requestAnimationFrame(()=>{syncRaf=0;syncIcons();outerFrame?.render?.();sectionFrames.forEach(item=>item?.render?.());});
  }
  new MutationObserver(scheduleSync).observe(root,{childList:true,subtree:true});
  new MutationObserver(()=>{
    if(modal.classList.contains('show'))requestAnimationFrame(()=>{copyActionBarSurface();syncIcons();outerFrame?.render?.();sectionFrames.forEach(item=>item?.render?.());});
  }).observe(modal,{attributes:true,attributeFilter:['class']});

  copyActionBarSurface();syncIcons();requestAnimationFrame(()=>{copyActionBarSurface();syncIcons();outerFrame?.render?.();sectionFrames.forEach(item=>item?.render?.());});
  window.HAJJEN_SPELLBOOK_PRODUCTION_VISUAL={version:'1.0',modal,card,root,outerFrame,sectionFrames,sync(){copyActionBarSurface();syncIcons();outerFrame?.render?.();sectionFrames.forEach(item=>item?.render?.());}};
})();