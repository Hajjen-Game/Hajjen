/* CHROMA RUSH — safe main-menu build freshness check 1.0.
 * GitHub Pages can cache index.html separately from versioned JS.
 * Probe only while in the menu; never reload an active run.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){root.ChromaBuildFreshness=api;api.start(root);}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const META=/\<meta\s+name=["']chroma-build["']\s+content=["']([^"']+)["']/i;
  function versionFromHTML(html){
    const found=META.exec(typeof html==='string'?html:'');
    return found?found[1]:null;
  }
  function monitor(scope,{minimumIntervalMs=30000,clock=()=>Date.now()}={}){
    if(!scope||!scope.document||!scope.location)return null;
    const doc=scope.document,meta=doc.querySelector('meta[name="chroma-build"]');
    const menu=doc.getElementById('menu');
    if(!meta||!meta.content||!menu||typeof scope.fetch!=='function')return null;
    const localBuild=meta.content;
    let lastChecked=-Infinity,checking=false,reloading=false;
    async function check(){
      if(reloading||checking||doc.visibilityState==='hidden'||menu.classList.contains('hidden'))return false;
      const now=clock();
      if(now-lastChecked<minimumIntervalMs)return false;
      lastChecked=now;checking=true;
      try{
        const url=new URL('index.html',scope.location.href);
        url.searchParams.set('_chroma_probe',String(now));
        const response=await scope.fetch(url.href,{cache:'no-store'});
        if(!response||!response.ok)return false;
        const remoteBuild=versionFromHTML(await response.text());
        if(!remoteBuild||remoteBuild===localBuild||menu.classList.contains('hidden'))return false;
        const freshURL=new URL(scope.location.href);
        // Prevent an endless redirect if a CDN ignores the query parameter.
        if(freshURL.searchParams.get('build')===remoteBuild)return false;
        freshURL.searchParams.set('build',remoteBuild);
        reloading=true;
        scope.location.replace(freshURL.href);
        return true;
      }catch(_){return false;}
      finally{checking=false;}
    }
    if(typeof scope.MutationObserver==='function'){
      const observer=new scope.MutationObserver(()=>{if(!menu.classList.contains('hidden'))void check();});
      observer.observe(menu,{attributes:true,attributeFilter:['class']});
    }
    if(typeof scope.addEventListener==='function'){
      scope.addEventListener('pageshow',()=>{void check();});
      scope.addEventListener('focus',()=>{void check();});
    }
    if(typeof doc.addEventListener==='function')
      doc.addEventListener('visibilitychange',()=>{void check();});
    void check();
    return {check,localBuild};
  }
  return {versionFromHTML,monitor,start:monitor};
});
