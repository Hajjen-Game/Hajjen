/* HAJJEN HAND outer frame mount v1.1.
   Attaches the shared panel-frame component to the live HAND panel.
   In Zone 3 ?dev=1 it also swaps only the inner panel surface to the
   user-approved blue low-poly texture. Cards, plaque, frame and layout stay untouched. */
(()=>{
  const panel=window.HAJJEN_SHARED_HAND?.panel||document.querySelector('.zone3-app .cards-hud .shared-hand-panel');
  if(!panel)return;

  window.HAJJEN_PANEL_FRAME?.mount?.(panel);

  const isDev=new URLSearchParams(location.search).get('dev')==='1';
  if(!isDev)return;

  const styleId='hajjen-hand-blue-background-style';
  if(!document.getElementById(styleId)){
    const style=document.createElement('style');
    style.id=styleId;
    style.textContent=`
      .zone3-app .cards-hud .shared-hand-panel.hajjen-framed-panel.hajjen-hand-blue-bg::before{
        background-color:#4c6178!important;
        background-image:var(--hajjen-hand-blue-bg)!important;
        background-repeat:no-repeat!important;
        background-position:center center!important;
        background-size:cover!important;
      }
    `;
    document.head.appendChild(style);
  }

  fetch('assets/hand-panel/hand-background-blue-v1.b64.txt?v=1',{cache:'force-cache'})
    .then(response=>{
      if(!response.ok)throw new Error(`Hand background asset ${response.status}`);
      return response.text();
    })
    .then(raw=>{
      const data=raw.trim();
      if(!data.startsWith('oS'))throw new Error('Invalid Hand background WebP payload');
      panel.style.setProperty('--hajjen-hand-blue-bg',`url("data:image/webp;base64,${data}")`);
      panel.classList.add('hajjen-hand-blue-bg');
    })
    .catch(error=>console.warn('[HAJJEN] Hand blue background fallback active:',error));
})();
