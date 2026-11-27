// The player-facing production catalog is distinct from historical source QA.
export const PRODUCTION_TRACK=Object.freeze({
 id:'vault',version:'0.28.9.10',name:'NEON VAULT CIRCUIT',
 option:'NEON VAULT — FULL TUNNEL CIRCUIT'
});
export const PRODUCTION_RELEASE_NAME='Curve Deck Cleanup';
export function productionRouteUrl(href){
 const url=new URL(href);
 url.searchParams.set('track',PRODUCTION_TRACK.id);
 url.searchParams.set('v',PRODUCTION_TRACK.version);
 // Classic tunnel renderers are available only in the source comparison entry.
 for(const key of ['sharedTunnel','trueSharedRenderer'])if(url.searchParams.get(key)==='classic')url.searchParams.delete(key);
 return url.href;
}
export function applyProductionCatalog(location,history){
 const canonical=productionRouteUrl(location.href);
 if(canonical!==location.href)history.replaceState(history.state,'',canonical);
 return canonical;
}

// Resolve release choice at the route boundary, not inside shared materials.
export function surfaceFinishEnabled02898(search){
 const q=new URLSearchParams(search||'');
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(q.get('v')||'');
 if(q.get('track')!=='vault'||!m||['classic','off'].includes(q.get('surfaceFinish')))return false;
 const [a,b,c,d]=m.slice(1).map(x=>Number(x||0));
 return a>0||b>28||(b===28&&(c>9||(c===9&&d>=8)));
}

export function vaultPolishEnabled02899(search){
 const q=new URLSearchParams(search||'');
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(q.get('v')||'');
 if(q.get('track')!=='vault'||!m)return false;
 const [a,b,c,d]=m.slice(1).map(x=>Number(x||0));
 return a>0||b>28||(b===28&&(c>9||(c===9&&d>=9)));
}

 // Current Vault: remove legacy decorative road washes and shoulder paint.
 export function curveDeckCleanupEnabled028910(search){
  const q=new URLSearchParams(search||'');
  const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(q.get('v')||'');
  if(q.get('track')!=='vault'||!m||q.get('curveDeck')==='classic')return false;
  const [a,b,c,d]=m.slice(1).map(x=>Number(x||0));
  return a>0||b>28||(b===28&&(c>9||(c===9&&d>=10)));
 }
