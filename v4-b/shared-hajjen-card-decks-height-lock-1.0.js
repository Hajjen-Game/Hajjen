(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const selector='.zone3-app .leftcol > .shared-card-decks-panel.hajjen-vector-card-decks';
  let panel=null;
  let row=null;
  let resizeObserver=null;
  let mutationObserver=null;
  let raf=0;

  function measure(){
    raf=0;
    panel=document.querySelector(selector);
    row=panel?.querySelector(':scope > .deck-row')||null;
    const piles=row?[...row.querySelectorAll(':scope > .deck-pile')]:[];
    if(!panel||!row||!piles.length)return false;

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
