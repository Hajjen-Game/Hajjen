/* HAJJEN Zone 3 DEV — Fight Window visual prototype V1.
   Presentation only: copies the Action Bar surface, binds the same PNG icons,
   and mounts the approved shared vector frame geometry. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  if((window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone)!==3)return;

  const modal=document.getElementById('combatModal');
  const shared=window.HAJJEN_SHARED_FIGHT_WINDOW;
  const card=shared?.card||modal?.querySelector('.modal-card');
  const spells=shared?.spells||document.getElementById('combatSpells');
  if(!modal||!card||!spells)return;

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

  modal.classList.add('hajjen-fight-dev');
  card.classList.add('hajjen-fight-dev-card');

  function copyActionBarSurface(){
    const actionBar=document.querySelector('.zone3-app .action-hud.shared-action-bar');
    if(!actionBar)return;
    const style=getComputedStyle(actionBar);
    card.style.setProperty('--hajjen-fight-bg-color',style.backgroundColor||'#633431');
    if(style.backgroundImage&&style.backgroundImage!=='none')card.style.setProperty('--hajjen-fight-bg-image',style.backgroundImage);
    if(style.backgroundRepeat)card.style.setProperty('--hajjen-fight-bg-repeat',style.backgroundRepeat);
    if(style.backgroundPosition)card.style.setProperty('--hajjen-fight-bg-position',style.backgroundPosition);
    if(style.backgroundSize)card.style.setProperty('--hajjen-fight-bg-size',style.backgroundSize);
  }

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

  let frameSerial=0;
  function mountFrame(target,frameClass,outset=0){
    if(!target)return null;
    target.querySelector(`:scope > .${frameClass}`)?.remove();
    const serial=++frameSerial;
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-shared-vector-frame',frameClass);
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');

    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=`hajjenFightGoldDev-${serial}`;
    gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');
    gradient.setAttribute('gradientUnits','objectBoundingBox');
    [['0%','#efd6a0'],['28%','#c9914f'],['62%','#7a4c29'],['82%','#b77a3b'],['100%','#dfb46b']].forEach(([offset,color])=>{
      const stop=document.createElementNS(NS,'stop');
      stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.appendChild(stop);
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
      const w=Math.max(80,(target.clientWidth||0)+(outset*2));
      const h=Math.max(80,(target.clientHeight||0)+(outset*2));
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const outer=roundedFramePath(w,h,2.35,5.9);
      const innerD=roundedFramePath(w,h,5.1,4.35);
      const highlightD=roundedFramePath(w,h,3.5,5.15);
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

    target.prepend(svg);
    render();
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
    ro?.observe(target);
    if(!ro)window.addEventListener('resize',render,{passive:true});
    return {target,svg,render,resizeObserver:ro};
  }

  const outerFrame=mountFrame(card,'hajjen-fight-window-frame');
  let spellFrames=[];

  function currentSpells(){
    return Array.isArray(window.HAJJEN_CAMPAIGN_STATE?.spells)?window.HAJJEN_CAMPAIGN_STATE.spells:[];
  }

  function syncSpellPresentation(){
    spellFrames.forEach(item=>item?.resizeObserver?.disconnect?.());
    spellFrames=[];
    const source=currentSpells();
    [...spells.querySelectorAll(':scope > button')].forEach((button,index)=>{
      const name=String(source[index]?.name||button.textContent||'').trim().toLowerCase();
      const file=iconFiles[name];
      if(file){
        button.style.setProperty('--fight-icon-image',`url("assets/action-bar-icons/${file}")`);
        button.dataset.fightPngIcon=file;
      }else{
        button.style.removeProperty('--fight-icon-image');
        delete button.dataset.fightPngIcon;
      }
      spellFrames.push(mountFrame(button,'hajjen-fight-spell-frame',5));
    });
  }

  let spellRaf=0;
  function scheduleSpellSync(){
    if(spellRaf)cancelAnimationFrame(spellRaf);
    spellRaf=requestAnimationFrame(()=>{spellRaf=0;syncSpellPresentation();});
  }

  new MutationObserver(scheduleSpellSync).observe(spells,{childList:true});
  new MutationObserver(()=>{
    if(modal.classList.contains('show')){
      requestAnimationFrame(()=>{
        copyActionBarSurface();
        outerFrame?.render?.();
        syncSpellPresentation();
      });
    }
  }).observe(modal,{attributes:true,attributeFilter:['class']});

  copyActionBarSurface();
  syncSpellPresentation();
  requestAnimationFrame(()=>{copyActionBarSurface();outerFrame?.render?.();syncSpellPresentation();});

  window.HAJJEN_FIGHT_WINDOW_DEV={
    version:'1.0',
    modal,card,spells,outerFrame,
    sync(){copyActionBarSurface();outerFrame?.render?.();syncSpellPresentation();}
  };
})();
