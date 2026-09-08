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
    if(!panel||!row)return false;

    const panelStyle=getComputedStyle(panel);
    const paddingTop=parseFloat(panelStyle.paddingTop)||0;
    const paddingBottom=parseFloat(panelStyle.paddingBottom)||0;
    const rowHeight=row.getBoundingClientRect().height;
    if(!(rowHeight>0))return false;

    /* Card Decks must end immediately after Tactical. Older shared/mobile CSS can
       stretch the left-column panel, so lock the rendered box to its measured
       content height instead of relying on flex/grid intrinsic sizing. */
    const height=Math.ceil(paddingTop+rowHeight+paddingBottom);
    const px=`${height}px`;
    panel.style.setProperty('height',px,'important');
    panel.style.setProperty('min-height',px,'important');
    panel.style.setProperty('max-height',px,'important');
    panel.style.setProperty('flex','0 0 auto','important');
    panel.style.setProperty('flex-basis','auto','important');
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
    resizeObserver.observe(row);

    mutationObserver?.disconnect();
    mutationObserver=new MutationObserver(schedule);
    mutationObserver.observe(row,{childList:true,subtree:true,characterData:true,attributes:true});

    window.addEventListener('resize',schedule,{passive:true});
    document.fonts?.ready?.then(schedule).catch(()=>{});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
