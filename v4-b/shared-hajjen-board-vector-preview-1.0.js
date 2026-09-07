/* HAJJEN board thin vector-frame preview — preview page only. */
(()=>{
  const NS='http://www.w3.org/2000/svg';

  function roundedFramePath(w,h,inset,r){
    const x=inset,y=inset;
    const right=Math.max(x,w-inset),bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [`M ${x+radius} ${y}`,`H ${right-radius}`,`Q ${right} ${y} ${right} ${y+radius}`,`V ${bottom-radius}`,`Q ${right} ${bottom} ${right-radius} ${bottom}`,`H ${x+radius}`,`Q ${x} ${bottom} ${x} ${bottom-radius}`,`V ${y+radius}`,`Q ${x} ${y} ${x+radius} ${y}`,'Z'].join(' ');
  }

  function mount(viewport,index){
    if(!viewport)return;
    let shell=viewport.parentElement;
    if(!shell?.classList.contains('hajjen-board-frame-shell')){
      shell=document.createElement('div');
      shell.className='hajjen-board-frame-shell';
      viewport.parentNode.insertBefore(shell,viewport);
      shell.appendChild(viewport);
    }

    shell.querySelector(':scope > .hajjen-board-frame-overlay')?.remove();
    if(shell.querySelector(':scope > .hajjen-board-vector-preview-frame'))return;

    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-board-vector-preview-frame');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');

    const gradientId=`hajjenBoardPreviewGold-${index}`;
    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=gradientId;
    gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');
    gradient.setAttribute('gradientUnits','objectBoundingBox');
    [['0%','#efd6a0'],['28%','#c9914f'],['62%','#7a4c29'],['82%','#b77a3b'],['100%','#dfb46b']].forEach(([offset,color])=>{
      const stop=document.createElementNS(NS,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.appendChild(stop);
    });
    defs.appendChild(gradient);svg.appendChild(defs);

    const makePath=cls=>{const p=document.createElementNS(NS,'path');p.setAttribute('class',cls);svg.appendChild(p);return p;};
    const shadow=makePath('frame-shadow');
    const gold=makePath('frame-gold');gold.setAttribute('stroke',`url(#${gradientId})`);
    const inner=makePath('frame-inner');
    const highlight=makePath('frame-highlight');

    const corners=['tl','tr','br','bl'].map(name=>{
      const group=document.createElementNS(NS,'g');group.dataset.corner=name;
      const accent=document.createElementNS(NS,'path');accent.setAttribute('class','corner-accent');
      const sweepShadow=document.createElementNS(NS,'path');sweepShadow.setAttribute('class','corner-sweep-shadow');
      const sweep=document.createElementNS(NS,'path');sweep.setAttribute('class','corner-sweep');
      const node=document.createElementNS(NS,'circle');node.setAttribute('class','corner-node');node.setAttribute('r','1.35');
      group.append(accent,sweepShadow,sweep,node);svg.appendChild(group);
      return {name,accent,sweepShadow,sweep,node};
    });

    function render(){
      const w=Math.max(80,shell.clientWidth||viewport.clientWidth||0),h=Math.max(80,shell.clientHeight||viewport.clientHeight||0);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const outer=roundedFramePath(w,h,2.35,5.9);
      shadow.setAttribute('d',outer);gold.setAttribute('d',outer);
      inner.setAttribute('d',roundedFramePath(w,h,5.1,4.35));highlight.setAttribute('d',roundedFramePath(w,h,3.5,5.15));

      const inset=6.05,radius=4.15,arm=7.35,nodeOffset=2.95,sweepReach=10.9,sweepEdge=.72;
      const data={
        tl:{accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+1.55} ${inset+7.55}, ${inset+6.35} ${inset+1.75}, ${inset+sweepReach} ${inset+sweepEdge}`,cx:inset+nodeOffset,cy:inset+nodeOffset},
        tr:{accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-1.55} ${inset+7.55}, ${w-inset-6.35} ${inset+1.75}, ${w-inset-sweepReach} ${inset+sweepEdge}`,cx:w-inset-nodeOffset,cy:inset+nodeOffset},
        br:{accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-1.55} ${h-inset-7.55}, ${w-inset-6.35} ${h-inset-1.75}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,cx:w-inset-nodeOffset,cy:h-inset-nodeOffset},
        bl:{accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+1.55} ${h-inset-7.55}, ${inset+6.35} ${h-inset-1.75}, ${inset+sweepReach} ${h-inset-sweepEdge}`,cx:inset+nodeOffset,cy:h-inset-nodeOffset}
      };
      corners.forEach(({name,accent,sweepShadow,sweep,node})=>{
        accent.setAttribute('d',data[name].accent);sweepShadow.setAttribute('d',data[name].sweep);sweep.setAttribute('d',data[name].sweep);node.setAttribute('cx',data[name].cx);node.setAttribute('cy',data[name].cy);
      });
    }

    shell.appendChild(svg);render();
    if(typeof ResizeObserver==='function')new ResizeObserver(render).observe(shell);else window.addEventListener('resize',render,{passive:true});
  }

  const apply=()=>document.querySelectorAll('.zone3-app .viewport').forEach((viewport,index)=>mount(viewport,index));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  const root=document.getElementById('campaignRoot')||document.body;
  new MutationObserver(apply).observe(root,{childList:true,subtree:true});
})();
