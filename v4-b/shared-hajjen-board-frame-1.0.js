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

  function roundedRectPath(x,y,w,h,r){
    const right=x+w,bottom=y+h;
    const radius=Math.min(r,w/2,h/2);
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
      const boardW=Math.max(80,viewport.clientWidth||shell.clientWidth||0);
      const boardH=Math.max(80,viewport.clientHeight||shell.clientHeight||0);
      const boardX=(w-boardW)/2;
      const boardY=(h-boardH)/2;
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);

      /* Anchor every rail to the real gameplay-board edge rather than the SVG edge.
         This keeps the frame slightly outside the board while placing the brown
         inner rail exactly 1px inside the playable viewport. */
      const shadowRect={x:boardX-4.15,y:boardY-4.15,w:boardW+8.3,h:boardH+8.3,r:10.4};
      const goldRect={x:boardX-2.35,y:boardY-2.35,w:boardW+4.7,h:boardH+4.7,r:9.0};
      const highlightRect={x:boardX-.45,y:boardY-.45,w:boardW+.9,h:boardH+.9,r:7.9};
      const innerRect={x:boardX+1,y:boardY+1,w:boardW-2,h:boardH-2,r:7.2};

      shadow.setAttribute('d',roundedRectPath(shadowRect.x,shadowRect.y,shadowRect.w,shadowRect.h,shadowRect.r));
      gold.setAttribute('d',roundedRectPath(goldRect.x,goldRect.y,goldRect.w,goldRect.h,goldRect.r));
      highlight.setAttribute('d',roundedRectPath(highlightRect.x,highlightRect.y,highlightRect.w,highlightRect.h,highlightRect.r));
      inner.setAttribute('d',roundedRectPath(innerRect.x,innerRect.y,innerRect.w,innerRect.h,innerRect.r));

      /* Keep the established larger board-corner motif, now anchored to the gold rail. */
      const inset=6.75,radius=7.1,arm=13.4,nodeOffset=4.35,sweepReach=18.8,sweepEdge=1.0;
      const gx=goldRect.x,gy=goldRect.y;
      const gr=goldRect.x+goldRect.w,gb=goldRect.y+goldRect.h;
      const data={
        tl:{accent:`M ${gx+inset} ${gy+inset+radius+arm} V ${gy+inset+radius} Q ${gx+inset} ${gy+inset} ${gx+inset+radius} ${gy+inset} H ${gx+inset+radius+arm}`,sweep:`M ${gx+inset+sweepEdge} ${gy+inset+sweepReach} C ${gx+inset+2.6} ${gy+inset+12.7}, ${gx+inset+10.2} ${gy+inset+2.7}, ${gx+inset+sweepReach} ${gy+inset+sweepEdge}`,cx:gx+inset+nodeOffset,cy:gy+inset+nodeOffset},
        tr:{accent:`M ${gr-inset-radius-arm} ${gy+inset} H ${gr-inset-radius} Q ${gr-inset} ${gy+inset} ${gr-inset} ${gy+inset+radius} V ${gy+inset+radius+arm}`,sweep:`M ${gr-inset-sweepEdge} ${gy+inset+sweepReach} C ${gr-inset-2.6} ${gy+inset+12.7}, ${gr-inset-10.2} ${gy+inset+2.7}, ${gr-inset-sweepReach} ${gy+inset+sweepEdge}`,cx:gr-inset-nodeOffset,cy:gy+inset+nodeOffset},
        br:{accent:`M ${gr-inset} ${gb-inset-radius-arm} V ${gb-inset-radius} Q ${gr-inset} ${gb-inset} ${gr-inset-radius} ${gb-inset} H ${gr-inset-radius-arm}`,sweep:`M ${gr-inset-sweepEdge} ${gb-inset-sweepReach} C ${gr-inset-2.6} ${gb-inset-12.7}, ${gr-inset-10.2} ${gb-inset-2.7}, ${gr-inset-sweepReach} ${gb-inset-sweepEdge}`,cx:gr-inset-nodeOffset,cy:gb-inset-nodeOffset},
        bl:{accent:`M ${gx+inset+radius+arm} ${gb-inset} H ${gx+inset+radius} Q ${gx+inset} ${gb-inset} ${gx+inset} ${gb-inset-radius} V ${gb-inset-radius-arm}`,sweep:`M ${gx+inset+sweepEdge} ${gb-inset-sweepReach} C ${gx+inset+2.6} ${gb-inset-12.7}, ${gx+inset+10.2} ${gb-inset-2.7}, ${gx+inset+sweepReach} ${gb-inset-sweepEdge}`,cx:gx+inset+nodeOffset,cy:gb-inset-nodeOffset}
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
