/* HAJJEN board-frame loader — rebuilds the approved user-supplied frame from
   four static base64 text chunks and overlays it on the Zone 3 viewport. */
(function(){
  const parts=[
    'assets/board-frame-data/part0.txt?v=1',
    'assets/board-frame-data/part1.txt?v=1',
    'assets/board-frame-data/part2.txt?v=1',
    'assets/board-frame-data/part3.txt?v=1'
  ];

  async function loadFrame(){
    try{
      const chunks=await Promise.all(parts.map(async path=>{
        const res=await fetch(path,{cache:'force-cache'});
        if(!res.ok) throw new Error('Frame chunk failed: '+path);
        return (await res.text()).trim();
      }));
      const src='data:image/webp;base64,'+chunks.join('');

      const apply=()=>{
        document.querySelectorAll('.zone3-app .viewport').forEach(viewport=>{
          if(viewport.querySelector(':scope > .hajjen-board-frame-overlay')) return;
          const img=document.createElement('img');
          img.className='hajjen-board-frame-overlay';
          img.alt='';
          img.setAttribute('aria-hidden','true');
          img.draggable=false;
          img.src=src;
          viewport.appendChild(img);
        });
      };

      apply();
      const root=document.getElementById('campaignRoot')||document.body;
      new MutationObserver(apply).observe(root,{childList:true,subtree:true});
    }catch(err){
      console.error('[HAJJEN] board frame failed to load',err);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadFrame,{once:true});
  }else{
    loadFrame();
  }
})();
