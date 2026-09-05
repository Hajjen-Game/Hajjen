(()=>{
  const root=document.documentElement;
  const base='assets/hand-cards/';
  const assets={
    '--hajjen-hand-v2-manip':`${base}hand-clean-manip.webp?v=1`,
    '--hajjen-hand-v2-ench':`${base}hand-clean-ench.webp?v=1`,
    '--hajjen-hand-v2-tact':`${base}hand-clean-tact.webp?v=1`,
    '--hajjen-hand-v2-locked':`${base}hand-clean-locked.webp?v=1`
  };
  Object.entries(assets).forEach(([prop,url])=>root.style.setProperty(prop,`url("${url}")`));
  root.classList.add('hajjen-hand-v2-ready');
})();
