/* HAJJEN Zone 3 DEV — Fight Window V2 inner panel frames.
   Presentation only. Adds shared bronze/gold vector rails to the two HP panels
   and the combat info panel without touching combat state or controls. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  if((window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone)!==3)return;

  const modal=document.getElementById('combatModal');
  const shared=window.HAJJEN_SHARED_FIGHT_WINDOW;
  const stats=shared?.stats||modal?.querySelector('.combat-stats');
  const message=shared?.message||document.getElementById('combatMessage');
  if(!modal||!stats||!message)return;

  const NS='http://www.w3.org/2000/svg';
  let serial=0;

  function roundedFramePath(w,h,inset,r){
    const x=inset,y=inset,right=Math.max(x,w-inset),bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [`M ${x+radius} ${y}`,`H ${right-radius}`,`Q ${right} ${y} ${right} ${y+radius}`,`V ${bottom-radius}`,`Q ${right} ${bottom} ${right-radius} ${bottom}`,`H ${x+radius}`,`Q ${x} ${bottom} ${x} ${bottom-radius}`,`V ${y+radius}`,`Q ${x} ${y} ${x+radius} ${y}`,'Z'].join(' ');
  }

  function mount(target){
    if(!target)return null;
    target.querySelector(':scope > .hajjen-fight-inner-frame')?.remove();

    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-shared-vector-frame','hajjen-fight-inner-frame');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');

    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=`hajjenFightInnerGold-${++serial}`;
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
      const node=document.createElementNS(NS,'circle');node.setAttribute('class','corner-node');node.setAttribute('r','1.25');
      group.append(accent,sweepShadow,sweep,node);svg.appendChild(group);
      return {name,accent,sweepShadow,sweep,node};
    });

    function render(){
      const w=Math.max(80,target.clientWidth||0),h=Math.max(64,target.clientHeight||0);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      shadow.setAttribute('d',roundedFramePath(w,h,2.3,5.6));
      gold.setAttribute('d',roundedFramePath(w,h,2.3,5.6));
      inner.setAttribute('d',roundedFramePath(w,h,5.0,4.15));
      highlight.setAttribute('d',roundedFramePath(w,h,3.45,4.95));

      const inset=5.9,radius=4,arm=6.6,nodeOffset=2.8,sweepReach=10.1,sweepEdge=.7;
      const data={
        tl:{accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+1.5} ${inset+7.1}, ${inset+5.9} ${inset+1.65}, ${inset+sweepReach} ${inset+sweepEdge}`,cx:inset+nodeOffset,cy:inset+nodeOffset},
        tr:{accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-1.5} ${inset+7.1}, ${w-inset-5.9} ${inset+1.65}, ${w-inset-sweepReach} ${inset+sweepEdge}`,cx:w-inset-nodeOffset,cy:inset+nodeOffset},
        br:{accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-1.5} ${h-inset-7.1}, ${w-inset-5.9} ${h-inset-1.65}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,cx:w-inset-nodeOffset,cy:h-inset-nodeOffset},
        bl:{accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+1.5} ${h-inset-7.1}, ${inset+5.9} ${h-inset-1.65}, ${inset+sweepReach} ${h-inset-sweepEdge}`,cx:inset+nodeOffset,cy:h-inset-nodeOffset}
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

  const mounted=[...stats.children].slice(0,2).map(mount).filter(Boolean);
  mounted.push(mount(message));

  new MutationObserver(()=>{
    if(!modal.classList.contains('show'))return;
    requestAnimationFrame(()=>mounted.forEach(item=>item?.render?.()));
  }).observe(modal,{attributes:true,attributeFilter:['class']});

  requestAnimationFrame(()=>mounted.forEach(item=>item?.render?.()));
  window.HAJJEN_FIGHT_WINDOW_DEV_V2={version:'1.0',mounted,sync:()=>mounted.forEach(item=>item?.render?.())};
})();
