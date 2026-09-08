/* HAJJEN Zone 3 production visual parity — gameplay-safe.
   Presentation only. Never changes URL/search params, never rebuilds campaign
   state, and never runs the Tactical DEV preview. */
(()=>{
  if(new URLSearchParams(location.search).get('dev')==='1')return;
  if(document.documentElement.dataset.hajjenPromoted!=='zone3-safe')return;

  const NS='http://www.w3.org/2000/svg';
  const root=document.getElementById('campaignRoot')||document.body;
  const svgEl=(name,attrs={})=>{
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  };

  function buildPlaque(index=0,variant='green'){
    const svg=svgEl('svg',{class:'hajjen-vector-title-plaque-svg',viewBox:'0 0 360 42',preserveAspectRatio:'none','aria-hidden':'true'});
    const defs=svgEl('defs');
    const gold=svgEl('linearGradient',{id:`hajjenSafeTitleGold-${index}`,x1:'0',y1:'0',x2:'0',y2:'1',gradientUnits:'objectBoundingBox'});
    [['0%','#EFD6A0'],['16%','#ECD39D'],['58%','#ECD39D'],['74%','#DFB46B'],['88%','#C9914F'],['100%','#B77A3B']].forEach(([offset,color])=>gold.appendChild(svgEl('stop',{offset,'stop-color':color})));
    const surface=svgEl('linearGradient',{id:`hajjenSafeTitleSurface-${index}`,x1:'0',y1:'0',x2:'0',y2:'1',gradientUnits:'objectBoundingBox'});
    (variant==='blue'?[['0%','#52606D'],['34%','#434F5B'],['72%','#363F49'],['100%','#2E3741']]:[['0%','#82936A'],['34%','#74885C'],['72%','#62774B'],['100%','#56683F']]).forEach(([offset,color])=>surface.appendChild(svgEl('stop',{offset,'stop-color':color})));
    defs.append(gold,surface); svg.appendChild(defs);
    const outer='M 48 6 H 312 L 322 13 V 29 L 312 36 H 48 L 38 29 V 13 Z';
    const inner='M 51 8.5 H 309 L 319 15 V 27 L 309 33.5 H 51 L 41 27 V 15 Z';
    svg.appendChild(svgEl('path',{class:'plaque-base',d:outer,fill:`url(#hajjenSafeTitleSurface-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-shadow',d:outer}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-gold',d:outer,stroke:`url(#hajjenSafeTitleGold-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-inner',d:inner}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-highlight',d:'M 52 8.9 H 308 L 317.3 15.1'}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-lower',d:'M 52 33.1 H 308 L 317.3 26.9'}));
    [['48','21'],['312','21']].forEach(([cx,cy])=>{
      svg.appendChild(svgEl('circle',{class:'plaque-mount-ring',cx,cy,r:'4.1'}));
      svg.appendChild(svgEl('circle',{class:'plaque-mount-core',cx,cy,r:'2.65'}));
      svg.appendChild(svgEl('circle',{class:'plaque-mount-jewel',cx,cy:Number(cy)-.65,r:'.72'}));
    });
    return svg;
  }
  function mountPlaque(panel,index=0,{headingSelector=':scope > h2',labelSelector='',variant='green'}={}){
    if(!panel||panel.querySelector(':scope > .hajjen-vector-title-plaque-layer'))return;
    const heading=panel.querySelector(headingSelector); if(!heading)return;
    let label=labelSelector?heading.querySelector(labelSelector)?.textContent||'':'';
    if(!label)label=(heading.textContent||'').trim()||'SHARKAN';
    heading.classList.add('hajjen-vector-title-plaque-source');
    const layer=document.createElement('div'); layer.className=`hajjen-vector-title-plaque-layer hajjen-vector-title-plaque-${variant}`; layer.setAttribute('aria-hidden','true');
    const text=document.createElement('span'); text.className='hajjen-vector-title-plaque-text'; text.textContent=label.trim();
    layer.append(buildPlaque(index,variant),text); panel.appendChild(layer);
  }
  function applyPlaques(){
    mountPlaque(document.querySelector('.zone3-app .shared-status.hajjen-framed-panel'),0);
    mountPlaque(document.querySelector('.zone3-app .shared-event-log.hajjen-framed-panel'),1);
    mountPlaque(document.querySelector('.zone3-app .shared-action-bar'),2,{headingSelector:':scope > .action-hud-title',labelSelector:':scope > span:first-child',variant:'blue'});
    mountPlaque(document.querySelector('.zone3-app .shared-card-decks-panel'),3,{variant:'blue'});
    mountPlaque(document.querySelector('.zone3-app .shared-hand-panel'),4,{headingSelector:':scope > h2',labelSelector:':scope > .hand-title-text',variant:'blue'});
  }

  function mountHeader(header,index=0){
    if(!header||header.querySelector(':scope > .hajjen-header-vector-rail'))return;
    const svg=svgEl('svg',{class:'hajjen-header-vector-rail','aria-hidden':'true',preserveAspectRatio:'none'}),defs=svgEl('defs');
    const gradient=svgEl('linearGradient',{id:`hajjenSafeHeaderGold-${index}`,x1:'0',y1:'0',x2:'0',y2:'1',gradientUnits:'objectBoundingBox'});
    [['0%','#f2d9a1'],['24%','#cf9853'],['56%','#81502b'],['79%','#bb7d3c'],['100%','#e4b86d']].forEach(([offset,color])=>gradient.appendChild(svgEl('stop',{offset,'stop-color':color})));
    defs.appendChild(gradient); svg.appendChild(defs);
    const shadow=svgEl('path',{class:'header-frame-shadow'}),gold=svgEl('path',{class:'header-frame-gold',stroke:`url(#hajjenSafeHeaderGold-${index})`}),inner=svgEl('path',{class:'header-frame-inner'}),highlight=svgEl('path',{class:'header-frame-highlight'});
    svg.append(shadow,gold,inner,highlight); header.appendChild(svg);
    const render=()=>{const w=Math.max(320,header.clientWidth||innerWidth||0),h=Math.max(70,header.clientHeight||86);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);const x1=w*.021,x2=w*.032,x3=w*.151,x4=w*.163,base=h*.79,bay=h-2.8;shadow.setAttribute('d',`M 0 ${base} H ${x1} L ${x2} ${bay} H ${x3} L ${x4} ${base} H ${w}`);gold.setAttribute('d',shadow.getAttribute('d'));inner.setAttribute('d',`M 0 ${base+3.6} H ${x1-1} L ${x2-1} ${bay-3.4} H ${x3+1} L ${x4+1} ${base+3.6} H ${w}`);highlight.setAttribute('d',`M 0 ${base-1.15} H ${x1+.7} L ${x2+.7} ${bay-1.1} H ${x3-.7} L ${x4-.7} ${base-1.15} H ${w}`);};
    render(); if(window.ResizeObserver)new ResizeObserver(render).observe(header); else addEventListener('resize',render,{passive:true});
  }
  function applyHeader(){document.querySelectorAll('.zone3-app .titlebar').forEach(mountHeader);}

  function deckIcon(type){
    const svg=svgEl('svg',{class:'deck-vector-icon',viewBox:'0 0 48 48','aria-hidden':'true',focusable:'false'}),path=(d,e={})=>svg.appendChild(svgEl('path',{d,...e})),circle=(cx,cy,r,e={})=>svg.appendChild(svgEl('circle',{cx,cy,r,...e}));
    if(type==='manipulation'){path('M15 25V10.5c0-1.8 2.8-1.8 2.8 0V21');path('M17.8 21V7.5c0-1.9 2.9-1.9 2.9 0V21');path('M20.7 21V6.5c0-1.9 2.9-1.9 2.9 0V21');path('M23.6 21V9c0-1.9 2.9-1.9 2.9 0v14');path('M26.5 23l4.4-5c1.4-1.5 3.5.3 2.5 2L28 31c-1.6 3.2-4.2 5-8.1 5h-2.1c-5.5 0-8.5-3.6-8.5-8.6v-6.2c0-2 2.8-2.4 3.5-.5l2.2 5.1');path('M20.2 29l3.4 3.4 3.4-3.4-3.4-3.4z',{class:'deck-icon-fill'});}else if(type==='enchantment'){path('M24 7.5l3.2 10.2L37.5 21l-10.3 3.2L24 34.5l-3.2-10.3L10.5 21l10.3-3.3z');path('M24 12.2v23.6M12.2 21h23.6');circle('24','21','3.1',{class:'deck-icon-fill'});}else{path('M24 7.5c5 3.4 9.2 4.1 13 4.5v10.4c0 8-4.9 13.6-13 18.1-8.1-4.5-13-10.1-13-18.1V12c3.8-.4 8-1.1 13-4.5z');path('M24 13v20');path('M17 18.5c2.4 1.2 4.8 1.9 7 2.2 2.2-.3 4.6-1 7-2.2');} return svg;
  }
  function lockDeckHeight(panel){const row=panel.querySelector(':scope > .deck-row'),piles=row?[...row.querySelectorAll(':scope > .deck-pile')]:[];if(!row||!piles.length)return;const s=getComputedStyle(panel),first=piles[0].getBoundingClientRect(),last=piles.at(-1).getBoundingClientRect(),h=Math.ceil((parseFloat(s.paddingTop)||0)+Math.max(0,last.bottom-first.top)+(parseFloat(s.paddingBottom)||0));if(h>0)['height','min-height','max-height','block-size','min-block-size','max-block-size'].forEach(p=>panel.style.setProperty(p,`${h}px`,'important'));panel.style.setProperty('flex','0 0 auto','important');}
  function applyDecks(){const panel=document.querySelector('.zone3-app .shared-card-decks-panel');if(!panel)return;panel.classList.add('hajjen-vector-card-decks');panel.dataset.sharedComponent='card-decks-safe-vector';panel.querySelectorAll(':scope > .deck-row > .deck-pile').forEach(pile=>{if(pile.querySelector(':scope > .deck-icon-slot'))return;const title=pile.querySelector(':scope > strong'),note=[...pile.children].find(n=>n.tagName==='SPAN'&&!n.classList.contains('deck-lock'));if(!title||!note)return;pile.querySelector(':scope > .deck-lock')?.remove();const icon=document.createElement('span');icon.className='deck-icon-slot';icon.appendChild(deckIcon(pile.dataset.deckType||[...pile.classList].find(c=>['manipulation','enchantment','tactical'].includes(c))||'tactical'));const copy=document.createElement('span');copy.className='deck-copy';copy.append(title,note);pile.replaceChildren(icon,copy);});requestAnimationFrame(()=>requestAnimationFrame(()=>lockDeckHeight(panel)));}

  function manipulationIcon(){const svg=svgEl('svg',{class:'hajjen-manip-card-icon',viewBox:'0 0 48 48','aria-hidden':'true',focusable:'false'}),g=svgEl('g',{transform:'translate(2.6 3.4)'});svg.appendChild(g);const p=(d,e={})=>g.appendChild(svgEl('path',{d,...e}));p('M15 25V10.5c0-1.8 2.8-1.8 2.8 0V21');p('M17.8 21V7.5c0-1.9 2.9-1.9 2.9 0V21');p('M20.7 21V6.5c0-1.9 2.9-1.9 2.9 0V21');p('M23.6 21V9c0-1.9 2.9-1.9 2.9 0v14');p('M26.5 23l4.4-5c1.4-1.5 3.5.3 2.5 2L28 31c-1.6 3.2-4.2 5-8.1 5h-2.1c-5.5 0-8.5-3.6-8.5-8.6v-6.2c0-2 2.8-2.4 3.5-.5l2.2 5.1');p('M20.2 29l3.4 3.4 3.4-3.4-3.4-3.4z',{class:'manip-icon-fill'});return svg;}
  function enchantIcon(){const svg=svgEl('svg',{class:'hajjen-ench-card-icon',viewBox:'0 0 48 48','aria-hidden':'true',focusable:'false'});svg.append(svgEl('path',{d:'M24 7.5l3.2 10.2L37.5 21l-10.3 3.2L24 34.5l-3.2-10.3L10.5 21l10.3-3.3z'}),svgEl('path',{d:'M24 12.2v23.6M12.2 21h23.6'}),svgEl('circle',{cx:'24',cy:'21',r:'3.1',class:'ench-icon-fill'}));return svg;}
  function lockIcon(){const svg=svgEl('svg',{class:'hajjen-locked-card-icon',viewBox:'0 0 48 48','aria-hidden':'true',focusable:'false'});svg.append(svgEl('path',{d:'M15 22v-5c0-5.1 4-9 9-9s9 3.9 9 9v5'}),svgEl('rect',{x:'11',y:'21',width:'26',height:'19',rx:'3.5'}),svgEl('circle',{cx:'24',cy:'29',r:'2.2'}),svgEl('path',{d:'M24 31.2v4'}));return svg;}
  function applyHand(){const hand=document.getElementById('manipCards')||document.getElementById('manipulationCards');if(!hand)return;[...hand.children].forEach(card=>{if(card.matches('.shared-enchantment-card,[data-hand-category="enchantment"]')){let w=card.querySelector(':scope > .hajjen-ench-card-icon-wrap');if(!w){w=document.createElement('span');w.className='hajjen-ench-card-icon-wrap';w.setAttribute('aria-hidden','true');card.prepend(w);}if(!w.firstChild)w.appendChild(enchantIcon());}else if(!card.matches('.tactical,.shared-hand-placeholder')){let w=card.querySelector(':scope > .hajjen-manip-card-icon-wrap');if(!w){w=document.createElement('span');w.className='hajjen-manip-card-icon-wrap';w.setAttribute('aria-hidden','true');card.prepend(w);}if(!w.firstChild)w.appendChild(manipulationIcon());}});hand.querySelectorAll(':scope > .shared-hand-placeholder.locked').forEach(slot=>{if(slot.classList.contains('hajjen-vector-locked-slot')&&slot.querySelector('.hajjen-locked-card-icon'))return;slot.classList.add('hajjen-vector-locked-slot');slot.dataset.hajjenLockedDecorated='1';slot.setAttribute('aria-label','Slot locked');const w=document.createElement('div');w.className='hajjen-locked-card-icon-wrap';w.appendChild(lockIcon());const t=document.createElement('strong');t.textContent='SLOT LOCKED';const c=document.createElement('p');c.className='shared-locked-copy';c.textContent='See Card Decks for unlock timing.';slot.replaceChildren(w,t,c);});}

  function roundedFramePath(w,h,inset,r){const x=inset,y=inset,right=Math.max(x,w-inset),bottom=Math.max(y,h-inset),radius=Math.min(r,(right-x)/2,(bottom-y)/2);return `M ${x+radius} ${y} H ${right-radius} Q ${right} ${y} ${right} ${y+radius} V ${bottom-radius} Q ${right} ${bottom} ${right-radius} ${bottom} H ${x+radius} Q ${x} ${bottom} ${x} ${bottom-radius} V ${y+radius} Q ${x} ${y} ${x+radius} ${y} Z`;}
  function mountBoard(viewport,index){if(!viewport)return;let shell=viewport.parentElement?.classList.contains('hajjen-board-frame-shell')?viewport.parentElement:null;if(!shell){shell=document.createElement('div');shell.className='hajjen-board-frame-shell';viewport.parentNode.insertBefore(shell,viewport);shell.appendChild(viewport);}shell.querySelector(':scope > .hajjen-board-frame-overlay')?.remove();if(shell.querySelector(':scope > .hajjen-board-vector-frame'))return;shell.classList.add('hajjen-board-vector-shell');const svg=svgEl('svg',{class:'hajjen-board-vector-frame','aria-hidden':'true',preserveAspectRatio:'none'}),defs=svgEl('defs'),gradient=svgEl('linearGradient',{id:`hajjenSafeBoardGold-${index}`,x1:'0',y1:'0',x2:'0',y2:'1',gradientUnits:'objectBoundingBox'});[['0%','#f2d9a1'],['24%','#cf9853'],['56%','#81502b'],['79%','#bb7d3c'],['100%','#e4b86d']].forEach(([offset,color])=>gradient.appendChild(svgEl('stop',{offset,'stop-color':color})));defs.appendChild(gradient);svg.appendChild(defs);const shadow=svgEl('path',{class:'frame-shadow'}),gold=svgEl('path',{class:'frame-gold',stroke:`url(#hajjenSafeBoardGold-${index})`}),inner=svgEl('path',{class:'frame-inner'}),highlight=svgEl('path',{class:'frame-highlight'});svg.append(shadow,gold,inner,highlight);const corners=['tl','tr','br','bl'].map(name=>{const g=svgEl('g',{'data-corner':name}),accent=svgEl('path',{class:'corner-accent'}),ss=svgEl('path',{class:'corner-sweep-shadow'}),sw=svgEl('path',{class:'corner-sweep'}),node=svgEl('circle',{class:'corner-node',r:'1.8'}),jewel=svgEl('circle',{class:'corner-jewel',r:'.72'});g.append(accent,ss,sw,node,jewel);svg.appendChild(g);return{name,accent,ss,sw,node,jewel};});const render=()=>{const w=Math.max(100,svg.clientWidth||shell.clientWidth||0),h=Math.max(100,svg.clientHeight||shell.clientHeight||0);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);const outer=roundedFramePath(w,h,3.2,10.4);shadow.setAttribute('d',outer);gold.setAttribute('d',outer);inner.setAttribute('d',roundedFramePath(w,h,7.2,7.4));highlight.setAttribute('d',roundedFramePath(w,h,4.75,9));const i=9.1,r=7.1,a=13.4,n=4.35,s=18.8,e=1,data={tl:{a:`M ${i} ${i+r+a} V ${i+r} Q ${i} ${i} ${i+r} ${i} H ${i+r+a}`,s:`M ${i+e} ${i+s} C ${i+2.6} ${i+12.7}, ${i+10.2} ${i+2.7}, ${i+s} ${i+e}`,x:i+n,y:i+n},tr:{a:`M ${w-i-r-a} ${i} H ${w-i-r} Q ${w-i} ${i} ${w-i} ${i+r} V ${i+r+a}`,s:`M ${w-i-e} ${i+s} C ${w-i-2.6} ${i+12.7}, ${w-i-10.2} ${i+2.7}, ${w-i-s} ${i+e}`,x:w-i-n,y:i+n},br:{a:`M ${w-i} ${h-i-r-a} V ${h-i-r} Q ${w-i} ${h-i} ${w-i-r} ${h-i} H ${w-i-r-a}`,s:`M ${w-i-e} ${h-i-s} C ${w-i-2.6} ${h-i-12.7}, ${w-i-10.2} ${h-i-2.7}, ${w-i-s} ${h-i-e}`,x:w-i-n,y:h-i-n},bl:{a:`M ${i+r+a} ${h-i} H ${i+r} Q ${i} ${h-i} ${i} ${h-i-r} V ${h-i-r-a}`,s:`M ${i+e} ${h-i-s} C ${i+2.6} ${h-i-12.7}, ${i+10.2} ${h-i-2.7}, ${i+s} ${h-i-e}`,x:i+n,y:h-i-n}};corners.forEach(c=>{const d=data[c.name];c.accent.setAttribute('d',d.a);c.ss.setAttribute('d',d.s);c.sw.setAttribute('d',d.s);c.node.setAttribute('cx',d.x);c.node.setAttribute('cy',d.y);c.jewel.setAttribute('cx',d.x);c.jewel.setAttribute('cy',d.y);});};shell.appendChild(svg);render();if(window.ResizeObserver)new ResizeObserver(render).observe(svg);}
  function applyBoard(){document.querySelectorAll('.zone3-app .viewport').forEach(mountBoard);}

  function applySideBackgrounds(){const sharkan=document.querySelector('.zone3-app .shared-status.hajjen-framed-panel');if(!sharkan)return;const bg=getComputedStyle(sharkan,'::before').backgroundImage;if(!bg||bg==='none')return;let style=document.getElementById('hajjen-zone3-safe-side-backgrounds');if(!style){style=document.createElement('style');style.id='hajjen-zone3-safe-side-backgrounds';document.head.appendChild(style);}style.textContent=`html[data-hajjen-dev="zone3"] .zone3-app .objectives.shared-objectives::before,html[data-hajjen-dev="zone3"] .zone3-app .shared-event-log.hajjen-framed-panel::before{background-color:#efe1c2!important;background-image:${bg}!important;background-repeat:no-repeat!important;background-position:center!important;background-size:cover!important;}`;}

  function applyAll(){applyHeader();applyPlaques();applyDecks();applyHand();applyBoard();applySideBackgrounds();}
  applyAll();requestAnimationFrame(applyAll);setTimeout(applyAll,80);setTimeout(applyAll,260);
  const observer=new MutationObserver(()=>requestAnimationFrame(applyAll));observer.observe(root,{childList:true,subtree:true});
  window.HAJJEN_ZONE3_SAFE_VISUAL_PARITY={version:'1.0',apply:applyAll};
})();
