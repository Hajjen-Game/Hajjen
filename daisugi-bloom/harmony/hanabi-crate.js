/* Hanabi Firework Spread 2.0 · refilled-board launch, vertical Pulse and seeded upper burst.
 * The existing Lotus cargo ID is kept only for saved-game compatibility.
 * Never changes the board automatically without a genuine delivery.
 */
(function(root){
"use strict";
const VERSION=3,SIZE=7;
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
// Three genuine extra upgrades form an irregular burst across the top three
// rows, at most two columns from the rocket. Only ordinary, unstruck,
// upgradeable treasures qualify. Independent seeded shuffle means the effect
// is replayable without using Math.random or changing the refill bag.
function spreadPositions(board,crateAt,seed,struck=new Set()){
 const column=crateAt%SIZE,candidates=[];
 for(let row=0;row<3;row++)for(let col=Math.max(0,column-2);col<=Math.min(6,column+2);col++){
  if(col===column)continue;
  const at=row*SIZE+col,p=board[at];
  if(!p||fixed.has(p.family)||p.family==="daruma"||
   p.family==="sealedStone"||p.stage>=5||struck.has(at))continue;
  candidates.push(at);
 }
 let state=(seed>>>0)||0x6d2b79f5;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;
  return (state>>>0)/4294967296;};
 for(let i=candidates.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
 }
 return candidates.slice(0,3);
}
function launch(game,delivered,h){
 const {events,frame,hitDaruma,hitStone,emitAwakenings,neighbors,pendingAwakenings}=h;
 const struck=new Set(),created=new Set();
 for(const {at} of delivered){
  const targets=[],spreadTargets=[],darumaTargets=[],stoneTargets=[],mistTargets=[],visualOnlyTargets=[];
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
  // Side sparks arrive at the upper canopy only after the delivery and
  // pre-launch refill. Three hits are real upgrades, never cosmetic targets.
  const spreadSeed=(game.seed^Math.imul((game.rolls||0)+1,0x9e3779b1)^
   Math.imul((game.moves||0)+1,0x85ebca6b)^
   Math.imul(at+1,0xc2b2ae35)^
   Math.imul((game.lotusDelivered||0)+1,0x27d4eb2d))>>>0;
  for(const to of (game.hanabiVersion>=2?spreadPositions(game.board,at,spreadSeed,struck):[])){
   struck.add(to);game.grow(to,created,true);
   spreadTargets.push({from:SIZE+at%SIZE,to,stage:game.board[to].stage});
  }
  const clearedMist=game.clearMist([...targets.map(t=>t.to),
   ...spreadTargets.map(t=>t.to),...mistTargets.map(t=>t.to)]);
  const scoreDelta=(targets.length+spreadTargets.length)*75;
  game.score+=scoreDelta;game.pulseHits+=targets.length+spreadTargets.length;
  events.push(frame("hanabi-launch",{at,column:at%7,targets,spreadTargets,
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
const api=Object.freeze({VERSION,path,visiblePath,spreadPositions,launch,crate,isCrate,install,collect,opening});
root.HarmonyHanabiCrate=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
