/* HAJJEN HAND — blue textured background loader, DEV only. */
(()=>{
  if(new URLSearchParams(location.search).get('dev')!=='1')return;
  const source='assets/hand-panel/hand-background-blue-v1.b64.txt?v=1';
  fetch(source,{cache:'force-cache'})
    .then(response=>{
      if(!response.ok)throw new Error(`Hand background asset ${response.status}`);
      return response.text();
    })
    .then(raw=>{
      const data=raw.trim();
      if(!data.startsWith('oS'))throw new Error('Invalid Hand background WebP payload');
      document.documentElement.style.setProperty('--hajjen-hand-blue-bg',`url("data:image/webp;base64,${data}")`);
      document.documentElement.classList.add('hajjen-hand-blue-bg-ready');
    })
    .catch(error=>console.warn('[HAJJEN] Hand blue background fallback active:',error));
})();
