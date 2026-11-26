// The player-facing production catalog is distinct from historical source QA.
export const PRODUCTION_TRACK=Object.freeze({
 id:'vault',version:'0.28.9.7',name:'NEON VAULT CIRCUIT',
 option:'NEON VAULT — FULL TUNNEL CIRCUIT'
});
export function productionRouteUrl(href){
 const url=new URL(href);
 url.searchParams.set('track',PRODUCTION_TRACK.id);
 url.searchParams.set('v',PRODUCTION_TRACK.version);
 return url.href;
}
export function applyProductionCatalog(location,history){
 const canonical=productionRouteUrl(location.href);
 if(canonical!==location.href)history.replaceState(history.state,'',canonical);
 return canonical;
}
