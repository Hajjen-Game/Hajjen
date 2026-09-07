/* HAJJEN board-frame loader.
   Normal Zone 3 keeps the approved bitmap frame.
   Zone 3 ?dev=1 swaps only the board frame to a larger, more elegant vector frame
   in the same visual family as the shared HUD panels. */
(function(){
  const params=new URLSearchParams(location.search);
  const devVector=params.get('dev')==='1';
  const NS='http://www.w3.org/2000/svg';
  const parts=[
    'assets/board-frame-data/part0.txt?v=1',
    'assets/board-frame-data/part1.txt?v=1',
    'assets/board-frame-data/part2.txt?v=1',
    'assets/board-frame-data/part3.txt?v=1'
  ];

  function ensureShell(viewport){
    if(viewport.parentElement?.classList.contains('hajjen-board-frame-shell'))return viewport.parentElement;
    viewport.querySelector(':scope > .hajjen-board-frame-overlay')?.remove();
    const shell=document.createElement('div');
    shell.className='hajjen-board-frame-shell';
    viewport.parentNode.insertBefore(shell,viewport);
    shell.appendChild(viewport);
    return shell;
  }

  function roundedFramePath(w,h,inset,r){
    const x=inset,y=inset;
    const right=Math.max(x,w-inset),bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [`M ${x+radius} ${y}`,`H ${right-radius}`,`Q ${right} ${y} ${right} ${y+radius}`,`V ${bottom-radius}`,`Q ${right} ${bottom} ${right-radius} ${bottom}`,`H ${x+radius}`,`Q ${x} ${bottom} ${x} ${bottom-radius}`,`V ${y+radius}`,`Q ${x} ${y} ${x+radius} ${y}`,'Z'].join(' ');
  }

  function mountDevVector(viewport,index){
    const shell=ensureShell(viewport);
    shell.querySelector(':scope > .hajjen-board-frame-overlay')?.remove();
    if(shell.querySelector(':scope > .hajjen-board-vector-frame'))return;

    shell.classList.add('hajjen-board-vector-shell');
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-board-vector-frame');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');

    const gradientId=`hajjenBoardGold-${index}`;
    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=gradientId;
    gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');
    gradient.setAttribute('gradientUnits','objectBoundingBox');
    [['0%','#f2d9a1'],['24%','#cf9853'],['56%','#81502b'],['79%','#bb7d3c'],['100%','#e4b86d']].forEach(([offset,color])=>{
      const stop=document.createElementNS(NS,'stop');
      stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.appendChild(stop);
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
      const node=document.createElementNS(NS,'circle');node.setAttribute('class','corner-node');node.setAttribute('r','1.8');
      const jewel=document.createElementNS(NS,'circle');jewel.setAttribute('class','corner-jewel');jewel.setAttribute('r','.72');
      group.append(accent,sweepShadow,sweep,node,jewel);svg.appendChild(group);
      return {name,accent,sweepShadow,sweep,node,jewel};
    });

    function render(){
      const w=Math.max(100,svg.clientWidth||shell.clientWidth||0);
      const h=Math.max(100,svg.clientHeight||shell.clientHeight||0);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);

      const outer=roundedFramePath(w,h,3.2,10.4);
      shadow.setAttribute('d',outer);gold.setAttribute('d',outer);
      inner.setAttribute('d',roundedFramePath(w,h,7.2,7.4));
      highlight.setAttribute('d',roundedFramePath(w,h,4.75,9.0));

      const inset=9.1,radius=7.1,arm=13.4,nodeOffset=4.35,sweepReach=18.8,sweepEdge=1.0;
      const data={
        tl:{accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+2.6} ${inset+12.7}, ${inset+10.2} ${inset+2.7}, ${inset+sweepReach} ${inset+sweepEdge}`,cx:inset+nodeOffset,cy:inset+nodeOffset},
        tr:{accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-2.6} ${inset+12.7}, ${w-inset-10.2} ${inset+2.7}, ${w-inset-sweepReach} ${inset+sweepEdge}`,cx:w-inset-nodeOffset,cy:inset+nodeOffset},
        br:{accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-2.6} ${h-inset-12.7}, ${w-inset-10.2} ${h-inset-2.7}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,cx:w-inset-nodeOffset,cy:h-inset-nodeOffset},
        bl:{accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+2.6} ${h-inset-12.7}, ${inset+10.2} ${h-inset-2.7}, ${inset+sweepReach} ${h-inset-sweepEdge}`,cx:inset+nodeOffset,cy:h-inset-nodeOffset}
      };
      corners.forEach(({name,accent,sweepShadow,sweep,node,jewel})=>{
        const d=data[name];
        accent.setAttribute('d',d.accent);sweepShadow.setAttribute('d',d.sweep);sweep.setAttribute('d',d.sweep);
        node.setAttribute('cx',d.cx);node.setAttribute('cy',d.cy);jewel.setAttribute('cx',d.cx);jewel.setAttribute('cy',d.cy);
      });
    }

    shell.appendChild(svg);render();
    if(typeof ResizeObserver==='function')new ResizeObserver(render).observe(svg);
    else window.addEventListener('resize',render,{passive:true});
  }

  async function loadBitmapFrame(){
    try{
      const chunks=await Promise.all(parts.map(async path=>{
        const res=await fetch(path,{cache:'force-cache'});
        if(!res.ok)throw new Error('Frame chunk failed: '+path);
        return (await res.text()).trim();
      }));
      const src='data:image/webp;base64,'+chunks.join('');
      const apply=()=>document.querySelectorAll('.zone3-app .viewport').forEach(viewport=>{
        const shell=ensureShell(viewport);
        if(shell.querySelector(':scope > .hajjen-board-frame-overlay'))return;
        const img=document.createElement('img');
        img.className='hajjen-board-frame-overlay';img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;img.src=src;
        shell.appendChild(img);
      });
      apply();
      const root=document.getElementById('campaignRoot')||document.body;
      new MutationObserver(apply).observe(root,{childList:true,subtree:true});
    }catch(err){console.error('[HAJJEN] board frame failed to load',err);}
  }

  function loadDevVector(){
    const apply=()=>document.querySelectorAll('.zone3-app .viewport').forEach((viewport,index)=>mountDevVector(viewport,index));
    apply();
    const root=document.getElementById('campaignRoot')||document.body;
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
  }

  const start=()=>devVector?loadDevVector():loadBitmapFrame();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
