/* Hanabi Crate 1.0 · deterministic on-board collection and vertical Pulse.
 * The existing Lotus cargo ID is kept only for saved-game compatibility.
 * Never changes the board automatically without a genuine delivery.
 */
(function(root){
"use strict";
const VERSION=2,SIZE=7;
const crateAt=at=>Number.isInteger(at)&&at>=42&&at<49;
const isCrate=p=>p?.family==="hanabiCrate"&&p.stage===0;
const crate=at=>{if(!crateAt(at))throw Error("Hanabi crate must be on bottom row");return {family:"hanabiCrate",stage:0,id:-(3000+at)};};
function install(board,exits){for(const at of exits)board[at]=crate(at);return board;}
// The firework is delivered from the cell directly ABOVE a permanent crate.
function collect(board,exits){const out=[];for(const at of exits){const from=at-SIZE;
 if(board[from]?.family==="lotusSeed"&&board[from].stage===0&&isCrate(board[at])){
  out.push({at,from,id:board[from].id});board[from]=null;
 }}return out;}
// Original, genuine two-swap opportunities now take place on row six.
function opening(board,families){
 if(!Array.isArray(families)||families.length<4)throw Error("Hanabi opening requires at least four treasure families");
 // Early Journey has four families; later chapters have five. Never write
 // an undefined family into the seeded bottom-row opening.
 const [a,c,b,d]=families,e=families[4]||d;
 for(const [at,family] of [[35,a],[36,a],[37,b],[38,e],[39,c],[40,c],[41,d],[44,a],[48,c]])
  board[at]={...board[at],family,stage:1};
 return board;
}
const fixed=new Set(["terrain","lotusSeed","moonMirror","hanabiCrate"]);
function path(at){
 if(!Number.isInteger(at)||at<42||at>=49)throw Error("Hanabi box must occupy the bottom row");
 const out=[];for(let i=at-SIZE;i>=0;i-=SIZE)out.push(i);
 return out;
}
function launch(game,delivered,h){
 const {events,frame,hitDaruma,hitStone,emitAwakenings,neighbors,pendingAwakenings}=h;
 const struck=new Set(),created=new Set();
 for(const {at} of delivered){
  const targets=[],darumaTargets=[],stoneTargets=[],mistTargets=[],visualOnlyTargets=[];
  for(const to of path(at)){
   const p=game.board[to],ray={from:at,to};
   if(p?.family==="daruma"){darumaTargets.push(ray);continue;}
   if(p?.family==="sealedStone"){stoneTargets.push(ray);continue;}
   if(!p||fixed.has(p.family)||p.stage>=5||struck.has(to)){
    if(game.mist[to])mistTargets.push({...ray,empty:!p});
    else visualOnlyTargets.push({...ray,empty:!p});
    continue;
   }
   struck.add(to);game.grow(to,created,true);
   targets.push({...ray,stage:game.board[to].stage});
  }
  const clearedMist=game.clearMist([...targets.map(t=>t.to),...mistTargets.map(t=>t.to)]);
  const scoreDelta=targets.length*75;
  game.score+=scoreDelta;game.pulseHits+=targets.length;
  events.push(frame("hanabi-launch",{at,column:at%7,targets,
   darumaTargets,stoneTargets,mistTargets,visualOnlyTargets,clearedMist,scoreDelta}));
  if(darumaTargets.length)hitDaruma(darumaTargets.map(t=>t.to),"hanabi",true);
  if(stoneTargets.length)hitStone(stoneTargets.map(t=>t.to),"hanabi",true);
 }
 // Any new stage-5 objects release regular neighboring Harmony Pulse,
 // with one upgrade per cell across the whole Hanabi launch chain.
 const all=new Set(created),pulsed=new Set();
 let active=[...created],wave=0;
 if(active.length)events.push(frame("hero",{positions:active}));
 while(active.length&&wave++<49){
  const targets=[],darumaTargets=[],stoneTargets=[],mistTargets=[],next=[];
  for(const source of active){
   if(pulsed.has(source))continue;pulsed.add(source);
   for(const to of neighbors(source)){
    const p=game.board[to],ray={from:source,to};
    if(p?.family==="daruma"){darumaTargets.push(ray);continue;}
    if(p?.family==="sealedStone"){stoneTargets.push(ray);continue;}
    if(!p||fixed.has(p.family)||p.stage>=5||struck.has(to)){
     if(game.mist[to])mistTargets.push({...ray,empty:!p});
     continue;
    }
    struck.add(to);game.grow(to,all,true);
    targets.push({...ray,stage:game.board[to].stage});
    if(game.board[to].stage===5)next.push(to);
   }
  }
  const clearedMist=game.clearMist([...targets.map(t=>t.to),...mistTargets.map(t=>t.to)]);
  const scoreDelta=targets.length*75;
  game.score+=scoreDelta;game.pulseHits+=targets.length;
  if(targets.length||darumaTargets.length||stoneTargets.length||mistTargets.length)
   events.push(frame("pulse",{sources:active,targets,
    darumaTargets,stoneTargets,mistTargets,clearedMist,scoreDelta,wave}));
  if(darumaTargets.length)hitDaruma(darumaTargets.map(t=>t.to),"pulse",true);
  if(stoneTargets.length)hitStone(stoneTargets.map(t=>t.to),"pulse",true);
  if(pendingAwakenings.length)
   for(const at of emitAwakenings(struck,all))if(!next.includes(at))next.push(at);
  if(next.length)events.push(frame("hero",{positions:next}));
  active=[...new Set(next)];
 }
 if(pendingAwakenings.length)emitAwakenings(struck,all);
 if(all.size){
  const awards=[];
  for(const i of all){
   const p=game.board[i];if(!p||p.stage!==5)continue;
   const count=(game.familyMasterpieces[p.family]||0)+1;
   game.familyMasterpieces[p.family]=count;game.board[i]=null;game.masterpieces++;
   awards.push({family:p.family,count,at:i,points:Math.min(1200,
    [0,100,200,350,550,800][count]??800+Math.min(400,(count-5)*80))});
  }
  game.bestChain=Math.max(game.bestChain,all.size);
  const scoreDelta=all.size*500+Math.max(0,all.size-1)*250;
  game.score+=scoreDelta;events.push(frame("harvest",{positions:[...all],chain:all.size,scoreDelta}));
  if(awards.length){
   const points=awards.reduce((n,x)=>n+x.points,0);
   game.collectionBonusTotal+=points;game.score+=points;
   events.push(frame("collection",{awards,scoreDelta:points}));
  }
 }
}
// Presentation-only targeting. Logic still fires through the whole column;
// blank and un-misted squares never pretend to receive a visual hit.
function visiblePath(event){
 const meaningful=[
  ...(event.targets||[]),...(event.darumaTargets||[]),
  ...(event.stoneTargets||[]),...(event.mistTargets||[]),
  ...(event.visualOnlyTargets||[]).filter(t=>!t.empty)
 ];
 const at=new Set(meaningful.map(t=>t.to).filter(Number.isInteger));
 return path(event.at).filter(to=>at.has(to));
}
const api=Object.freeze({VERSION,path,visiblePath,launch,crate,isCrate,install,collect,opening});
root.HarmonyHanabiCrate=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
