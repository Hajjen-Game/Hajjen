(()=>{
  const root=document.documentElement;
  const source='assets/hand-cards/enchantment-shell-v2-q80.b64.txt?v=1';
  fetch(source,{cache:'force-cache'})
    .then(response=>{
      if(!response.ok)throw new Error(`Enchantment shell asset ${response.status}`);
      return response.text();
    })
    .then(raw=>{
      const data=raw.trim();
      if(!data.startsWith('UklG'))throw new Error('Invalid Enchantment WebP payload');
      root.style.setProperty('--hajjen-enchantment-shell',`url("data:image/webp;base64,${data}")`);
      root.classList.add('hajjen-enchantment-shell-ready');
    })
    .catch(error=>console.warn('[HAJJEN] Enchantment shell fallback active:',error));
})();
