(()=>{
  const root=document.documentElement;
  fetch('assets/hand-cards/hand-v2-assets.json?v=1',{cache:'force-cache'})
    .then(r=>{if(!r.ok)throw new Error(`HAND v2 assets ${r.status}`);return r.json();})
    .then(assets=>{
      const map={manip:'--hajjen-hand-v2-manip',ench:'--hajjen-hand-v2-ench',tact:'--hajjen-hand-v2-tact',locked:'--hajjen-hand-v2-locked'};
      Object.entries(map).forEach(([key,prop])=>{
        const data=(assets[key]||'').trim();
        if(!data.startsWith('UklG'))throw new Error(`Invalid HAND v2 ${key} asset`);
        root.style.setProperty(prop,`url("data:image/webp;base64,${data}")`);
      });
      root.classList.add('hajjen-hand-v2-ready');
    })
    .catch(err=>console.warn('[HAJJEN] HAND v2 asset fallback active:',err));
})();
