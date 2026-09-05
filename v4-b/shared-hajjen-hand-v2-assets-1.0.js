(()=>{
  const root=document.documentElement;
  const assets={
    manip:['assets/hand-cards/hand-v2-manip.b64.txt?v=1','--hajjen-hand-v2-manip'],
    ench:['assets/hand-cards/hand-v2-ench.b64.txt?v=1','--hajjen-hand-v2-ench'],
    tact:['assets/hand-cards/hand-v2-tact.b64.txt?v=1','--hajjen-hand-v2-tact'],
    locked:['assets/hand-cards/hand-v2-locked.b64.txt?v=1','--hajjen-hand-v2-locked']
  };
  Promise.all(Object.entries(assets).map(async([key,[url,prop]])=>{
    const r=await fetch(url,{cache:'force-cache'});
    if(!r.ok)throw new Error(`HAND v2 ${key} ${r.status}`);
    const data=(await r.text()).trim();
    if(!data.startsWith('UklG'))throw new Error(`Invalid HAND v2 ${key} asset`);
    root.style.setProperty(prop,`url("data:image/webp;base64,${data}")`);
  })).then(()=>root.classList.add('hajjen-hand-v2-ready'))
    .catch(err=>console.warn('[HAJJEN] HAND v2 asset fallback active:',err));
})();
