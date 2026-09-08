(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const selector='.zone3-app .leftcol > .shared-card-decks-panel.hajjen-vector-card-decks';
  let panel=null;
  let row=null;
  let resizeObserver=null;
  let mutationObserver=null;
  let raf=0;

  function ensureFrameCss(){
    if(document.getElementById('hajjen-card-decks-isolated-frame-css'))return;
    const link=document.createElement('link');
    link.id='hajjen-card-decks-isolated-frame-css';
    link.rel='stylesheet';
    link.href='shared-hajjen-card-decks-frame-isolated-1.0.css?v=1';
    document.head.appendChild(link);
  }

  function mountIsolatedFrame(){
    panel=document.querySelector(selector);
    if(!panel)return false;

    ensureFrameCss();

    /* Keep only the live Card Decks panel in the left rail. */
    document.querySelectorAll('.zone3-app .leftcol > .deck-sidebar-panel').forEach(node=>{
      if(node!==panel)node.remove();
    });

    panel.classList.add('hajjen-card-decks-isolated-frame');

    /* The generic frame node is the part that has been inheriting conflicting
       frame-size/layout rules. Disable it completely for Card Decks DEV. */
    const oldFrame=panel.querySelector(':scope > .hajjen-panel-frame');
    if(oldFrame){
      oldFrame.style.setProperty('display','none','important');
      oldFrame.style.setProperty('visibility','hidden','important');
    }

    let frame=panel.querySelector(':scope > .hajjen-card-decks-frame');
    if(!frame){
      frame=document.createElement('span');
      frame.className='hajjen-card-decks-frame';
      frame.setAttribute('aria-hidden','true');
      ['tl','t','tr','l','r','bl','b','br'].forEach(part=>{
        const piece=document.createElement('span');
        piece.className=`hajjen-card-decks-frame-piece ${part}`;
        frame.appendChild(piece);
      });
      panel.prepend(frame);
    }

    /* Lock the new frame to the panel box even before the stylesheet finishes
       loading; the stylesheet only supplies the shared Family-A artwork. */
    frame.style.setProperty('position','absolute','important');
    frame.style.setProperty('left','0','important');
    frame.style.setProperty('top','0','important');
    frame.style.setProperty('right','0','important');
    frame.style.setProperty('bottom','0','important');
    frame.style.setProperty('width','100%','important');
    frame.style.setProperty('height','100%','important');
    frame.style.setProperty('z-index','6','important');
    frame.style.setProperty('pointer-events','none','important');

    return true;
  }

  function measure(){
    raf=0;
    if(!mountIsolatedFrame())return false;
    row=panel.querySelector(':scope > .deck-row')||null;
    const piles=row?[...row.querySelectorAll(':scope > .deck-pile')]:[];
    if(!row||!piles.length)return false;

    const panelStyle=getComputedStyle(panel);
    const paddingTop=parseFloat(panelStyle.paddingTop)||0;
    const paddingBottom=parseFloat(panelStyle.paddingBottom)||0;
    const first=piles[0].getBoundingClientRect();
    const last=piles[piles.length-1].getBoundingClientRect();
    const contentHeight=Math.max(0,last.bottom-first.top);
    if(!(contentHeight>0))return false;

    /* Measure the actual visible deck stack, never the row box itself: legacy
       layout rules can stretch .deck-row to the full left-column height. */
    const height=Math.ceil(paddingTop+contentHeight+paddingBottom);
    const px=`${height}px`;
    panel.style.setProperty('height',px,'important');
    panel.style.setProperty('min-height',px,'important');
    panel.style.setProperty('max-height',px,'important');
    panel.style.setProperty('block-size',px,'important');
    panel.style.setProperty('min-block-size',px,'important');
    panel.style.setProperty('max-block-size',px,'important');
    panel.style.setProperty('flex','0 0 auto','important');
    panel.dataset.hajjenDeckMeasuredHeight=String(height);
    return true;
  }

  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(()=>requestAnimationFrame(measure));
  }

  function attach(){
    if(!measure()){
      setTimeout(attach,40);
      return;
    }

    resizeObserver?.disconnect();
    resizeObserver=new ResizeObserver(schedule);
    row.querySelectorAll(':scope > .deck-pile').forEach(pile=>resizeObserver.observe(pile));

    mutationObserver?.disconnect();
    mutationObserver=new MutationObserver(schedule);
    mutationObserver.observe(row,{childList:true,subtree:true,characterData:true,attributes:true});

    window.addEventListener('resize',schedule,{passive:true});
    document.fonts?.ready?.then(schedule).catch(()=>{});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
