/* HAJJEN Card Decks isolated frame mount — DEV only.
   Avoids the legacy shared frame node/cascade while reusing the exact same
   Family-A frame artwork as SHARKAN and EVENT LOG. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  function mount(){
    const panel=document.querySelector('.zone3-app .shared-card-decks-panel.hajjen-vector-card-decks');
    if(!panel)return false;

    /* There must only be one Card Decks panel in the left rail. Older shell
       passes can leave a duplicate panel behind while iterating on the HUD. */
    document.querySelectorAll('.zone3-app .leftcol .deck-sidebar-panel').forEach(node=>{
      if(node!==panel)node.remove();
    });

    panel.classList.add('hajjen-card-decks-isolated-frame');

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

    return true;
  }

  function start(){
    if(mount())return;
    const root=document.getElementById('campaignRoot')||document.body;
    const observer=new MutationObserver(()=>{
      if(mount())observer.disconnect();
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
