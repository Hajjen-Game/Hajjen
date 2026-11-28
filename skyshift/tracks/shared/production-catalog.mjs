// The player-facing production catalog is distinct from historical source QA.
export const PRODUCTION_TRACK=Object.freeze({
 id:'vault',version:'0.28.9.11',name:'NEON VAULT CIRCUIT',
 option:'NEON VAULT — FULL TUNNEL CIRCUIT'
});
export const PRODUCTION_RELEASE_NAME='Authoritative Vault Deck Geometry';
export const VAULT_JUMP_RELEASE='0.29.0';
export const VAULT_POLISH_RELEASE='0.29.1';
export const VAULT_COMPACT_RELEASE='0.29.2';
export function productionRouteUrl(href){
 const url=new URL(href);
 url.searchParams.set('track',PRODUCTION_TRACK.id);
 const requested=url.searchParams.get('vaultJump');
 const version=url.searchParams.get('v');
 const polish=version===VAULT_POLISH_RELEASE||version===VAULT_COMPACT_RELEASE||version==='0.29.3'||version==='0.29.3.1'||version==='0.29.4'||version==='0.29.4.1'||version==='0.29.4.2'||version==='0.29.5'||version==='0.29.5.1';
 const jump=requested==='1'||(requested!=='0'&&(version===VAULT_JUMP_RELEASE||polish));
 url.searchParams.set('v',jump?(polish?version:VAULT_JUMP_RELEASE):PRODUCTION_TRACK.version);
 if(jump){
  url.searchParams.set('vaultJump','1');
  for(const key of ['sharedTunnel','trueSharedRenderer','curveDeck'])url.searchParams.delete(key);
 }
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

 // Vault's live deck must use the exact same route sampler as physics and rails.
 export function authoritativeDeckEnabled028911(search){
  const q=new URLSearchParams(search||'');
  const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(q.get('v')||'');
  if(q.get('track')!=='vault'||!m)return false;
  const [a,b,c,d]=m.slice(1).map(x=>Number(x||0));
  return a>0||b>28||(b===28&&(c>9||(c===9&&d>=11)));
 }
