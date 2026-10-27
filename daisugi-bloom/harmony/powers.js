/* Japanese Harmony · Omamori Powers 3.0 — Active Blessings & Consumables
 * Sakura: single-stage promotion and ordinary orthogonal Pulse.
 * Koi: localized, legal 3x3 shuffle. Moon: three-move second chance.
 * All effects are deterministic, only one per run, with no paid checkout.
 */
(function(root){
"use strict";
const VERSION=1,IDS=Object.freeze(["sakura","koi","tsuki"]),MAX=3;
const POWERS=Object.freeze({
 sakura:Object.freeze({name:"Bloom Touch",symbol:"✿",description:"Utveckla en bricka ett stadium. Stadium 5 ger Harmony Pulse."}),
 koi:Object.freeze({name:"Ripple Shuffle",symbol:"〰",description:"Blanda den valda rutans 3×3-område. Hinder flyttas inte."}),
 tsuki:Object.freeze({name:"Second Chance",symbol:"☾",description:"Få 3 extra drag efter att dragen tagit slut."})
});
const validLevel=n=>Number.isInteger(n)&&n>=0&&n<1000000;
function initialize(save){
 if(!save||typeof save!=="object")throw Error("Save required");
 if(!save.powers||save.powers.version!==VERSION){
  const owned=Array.isArray(save.economy?.owned)?save.economy.owned:[];
  // A one-off test blessing for existing owners; never repeated on reload.
  save.powers={version:VERSION,charges:Object.fromEntries(IDS.map(id=>[id,owned.includes(id)?1:0])),
   claimed:Object.fromEntries(IDS.map(id=>[id,[]])),starters:owned.filter(id=>IDS.includes(id))};
 }
 const p=save.powers;
 if(!p.charges||typeof p.charges!=="object")p.charges={};
 if(!p.claimed||typeof p.claimed!=="object")p.claimed={};
 p.starters=[...new Set((Array.isArray(p.starters)?p.starters:[]).filter(id=>IDS.includes(id)))];
 for(const id of IDS){
  const n=p.charges[id];
  p.charges[id]=Number.isInteger(n)?Math.max(0,Math.min(MAX,n)):0;
  p.claimed[id]=[...new Set((Array.isArray(p.claimed[id])?p.claimed[id]:[]).filter(validLevel))];
 }
 return p;
}
const owned=(save,id)=>!!POWERS[id]&&Array.isArray(save?.economy?.owned)&&save.economy.owned.includes(id);
function status(save,id){
 if(!POWERS[id])return null;
 const p=initialize(save);
 return {...POWERS[id],id,owned:owned(save,id),charges:p.charges[id],max:MAX};
}
function grantForClear(save,level,assisted=false){
 const id=save?.economy?.equipped;
 if(assisted||!validLevel(level)||!owned(save,id))return {ok:false,reason:"ineligible"};
 const p=initialize(save);
 if(!POWERS[id])return {ok:false,reason:"cosmetic-only"};
 if(p.claimed[id].includes(level))return {ok:false,reason:"already-earned"};
 p.claimed[id].push(level);
 if(p.charges[id]>=MAX)return {ok:false,reason:"full",recorded:true};
 p.charges[id]++;
 return {ok:true,id,charges:p.charges[id]};
}
function starterForNewPurchase(save,id){
 if(!owned(save,id)||!POWERS[id])return false;
 const p=initialize(save);
 if(!Array.isArray(p.starters))p.starters=[];
 if(p.starters.includes(id))return false;
 p.starters.push(id);p.charges[id]=Math.min(MAX,p.charges[id]+1);
 return true;
}
function consume(save,id){
 if(!owned(save,id))return false;
 const p=initialize(save);
 if(p.charges[id]<=0)return false;
 p.charges[id]--;
 return true;
}
const fixed=p=>p?.family==="daruma"||p?.family==="sealedStone";
const snapshot=(g,type,fields={})=>g.frame(type,fields);
function refill(g,events){
 if(!g.board.some(p=>!p))return;
 if(g.opportunity)g.refillOpportunity();
 else for(let i=0;i<49;i++)if(!g.board[i]){
  g.board[i]={family:g.nextFamily(g.board,i),stage:1,id:g.nextId++};
 }
 events.push(snapshot(g,"fall",{round:1}));
}
function pulseFrom(g,source,events){
 const active=[source],pulsed=new Set(),everUpgraded=new Set(),all=new Set([source]);
 const stoneHits=new Set(),darumaHits=new Set(),pendingAwakenings=[];
 let wave=0;
 const hitBlocker=(to,via)=>{
  const p=g.board[to];
  if(p?.family==="daruma"&&g.daruma[to]&&!darumaHits.has(to)){
   darumaHits.add(to);g.daruma[to]=g.daruma[to]===2?1:3;
   const final=g.daruma[to]===3;
   events.push(snapshot(g,"daruma",{hits:[{at:to,via,filled:final?2:1}]}));
   if(final){g.daruma[to]=0;g.board[to]=null;g.darumaCleared++;events.push(snapshot(g,"daruma-release",{positions:[to]}));}
  }else if(p?.family==="sealedStone"&&g.sealed[to]&&!stoneHits.has(to)){
   stoneHits.add(to);g.sealed[to]--;
   events.push(snapshot(g,"sealed-hit",{hits:[{at:to,via,remaining:g.sealed[to]}]}));
   if(!g.sealed[to]){g.board[to]=null;g.sealedCleared++;pendingAwakenings.push(to);}
  }
 };
 function broadcast(sources,eight,awakening){
  const targets=[],darumaTargets=[],stoneTargets=[],mistTargets=[],visualOnlyTargets=[],next=[];
  const visited=new Set();
  for(const from of sources){
   for(const to of (eight?root.HarmonyRules.neighbors8(from):root.HarmonyRules.neighbors(from))){
    if(visited.has(to))continue;
    visited.add(to);
    const piece=g.board[to];
    if(piece?.family==="daruma"){darumaTargets.push({from,to});continue;}
    if(piece?.family==="sealedStone"){stoneTargets.push({from,to});continue;}
    if(!piece||piece.stage>=5||everUpgraded.has(to)){
     if(g.config.goal.type==="mist"&&g.mist[to])mistTargets.push({from,to,empty:!piece});
     else if(awakening)visualOnlyTargets.push({from,to,empty:!piece});
     continue;
    }
    everUpgraded.add(to);g.grow(to,all,true);
    targets.push({from,to,stage:g.board[to].stage});
    if(g.board[to].stage===5)next.push(to);
   }
  }
  const clearedMist=g.clearMist([...targets.map(t=>t.to),...mistTargets.map(t=>t.to)]);
  const points=targets.length*75;g.pulseHits+=targets.length;g.score+=points;
  if(targets.length||darumaTargets.length||stoneTargets.length||mistTargets.length||awakening){
   events.push(snapshot(g,awakening?"awakening":"pulse",{
    sources,source:sources[0],targets,darumaTargets,stoneTargets,mistTargets,
    visualOnlyTargets,clearedMist,wave:awakening?1:wave,scoreDelta:points
   }));
  }
  for(const t of darumaTargets)hitBlocker(t.to,awakening?"awakening":"pulse");
  for(const t of stoneTargets)hitBlocker(t.to,awakening?"awakening":"pulse");
  return next;
 }
 // A stage-five creation acts exactly once as a Pulse source.
 while(active.length&&wave++<49){
  const sources=active.splice(0).filter(i=>!pulsed.has(i));
  if(!sources.length)break;
  sources.forEach(i=>pulsed.add(i));
  active.push(...broadcast(sources,false,false));
  // A stone's eighth-direction Awakening can propagate into other stones.
  let guard=0;
  while(pendingAwakenings.length&&guard++<49){
   const at=pendingAwakenings.shift();
   active.push(...broadcast([at],true,true));
  }
 }
 const counts=[];
 for(const at of all){
  const piece=g.board[at];
  if(!piece||piece.stage!==5)continue;
  const count=(g.familyMasterpieces[piece.family]||0)+1;
  g.familyMasterpieces[piece.family]=count;g.board[at]=null;g.masterpieces++;
  const points=Math.min(1200,[0,100,200,350,550,800][count]??800+Math.min(400,(count-5)*80));
  counts.push({family:piece.family,count,at,points});
 }
 if(counts.length){
  const points=all.size*500+Math.max(0,all.size-1)*250;
  g.score+=points;
  events.push(snapshot(g,"harvest",{positions:[...all],chain:all.size,scoreDelta:points}));
  const total=counts.reduce((sum,v)=>sum+v.points,0);
  g.score+=total;g.collectionBonusTotal+=total;
  events.push(snapshot(g,"collection",{awards:counts,scoreDelta:total}));
 }
 refill(g,events);
}
// 2x2 stage I; 3x3 stage II; 3x3 plus one optional reroll stage III.
function shuffleArea(g,at,tier=1){
 const size=tier===1?2:3;
 const row=Math.floor(at/7),col=at%7;
 const firstRow=Math.min(7-size,Math.max(0,row-(size===3?1:0)));
 const firstCol=Math.min(7-size,Math.max(0,col-(size===3?1:0)));
 const cells=[];
 for(let dr=0;dr<size;dr++)for(let dc=0;dc<size;dc++){
  const i=(firstRow+dr)*7+firstCol+dc;
  if(!fixed(g.board[i]))cells.push(i);
 }
 if(cells.length<2)return false;
 const baseline=g.board.slice();
 const seed=(g.seed^Math.imul(at+1,0x9e3779b1)^Math.imul(g.moves+1,0x85ebca6b)^g.rolls^
  Math.imul((g.koiRerolls||0)+1,0x6d2b79f5))>>>0;
 for(let trial=0;trial<180;trial++){
  let x=(seed+Math.imul(trial+1,0x6d2b79f5))>>>0;
  const rnd=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
  const shuffled=cells.map(i=>baseline[i]);
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  if(shuffled.every((p,i)=>p===baseline[cells[i]]))continue;
  const candidate=baseline.slice();
  cells.forEach((i,k)=>{candidate[i]=shuffled[k];});
  if(root.HarmonyRules.scan(candidate).length||!root.HarmonyRules.validSwaps(candidate).length)continue;
  g.board=candidate;
  return {cells,size,origin:firstRow*7+firstCol};
 }
 return false;
}
function reroll(g){
 if(!Number.isInteger(g?.koiRerollAt)||g.koiRerollAt<0||g.koiRerollAt>=49||g.complete||g.failed)
  return {ok:false,reason:"unavailable"};
 const at=g.koiRerollAt;
 const changed=shuffleArea(g,at,3);
 if(!changed)return {ok:false,reason:"no-fair-shuffle"};
 g.koiRerollAt=-1;g.koiRerolls=(g.koiRerolls||0)+1;
 return {ok:true,events:[snapshot(g,"shuffle",{power:"koi",at,cells:changed.cells,reroll:true})]};
}
function apply(g,id,at=-1,tier=1){
 if(!POWERS[id]||g.complete)return {ok:false,reason:"unavailable"};
 const stage=Math.max(1,Math.min(3,Math.trunc(tier)||1));
 if(id==="tsuki"){
  if(!g.failed||g.moves!==0)return {ok:false,reason:"not-out-of-moves"};
  g.failed=false;g.moves=[0,2,3,5][stage];g.assisted=true;
  g.blessingUses=(g.blessingUses||0)+1;
  return {ok:true,events:[snapshot(g,"power",{power:id,tier:stage})]};
 }
 if(g.failed||g.moves<=0)return {ok:false,reason:"unavailable"};
 let events=[];
 if(id==="sakura"){
  const targets=Array.isArray(at)?at:[at];
  if(targets.length!==stage||new Set(targets).size!==targets.length||
    targets.some(i=>!Number.isInteger(i)||i<0||i>=49||!g.board[i]||fixed(g.board[i])||g.board[i].stage>=5))
   return {ok:false,reason:"invalid-target"};
  const created=new Set();
  for(const i of targets)g.grow(i,created,false);
  events.push(snapshot(g,"power",{power:id,tier:stage,targets:targets.slice(),at:targets[0]}));
  for(const i of created){
   events.push(snapshot(g,"hero",{positions:[i]}));
   pulseFrom(g,i,events);
  }
 }else if(id==="koi"){
  if(!Number.isInteger(at)||at<0||at>=49)return {ok:false,reason:"invalid-target"};
  const changed=shuffleArea(g,at,stage);
  if(!changed)return {ok:false,reason:"no-fair-shuffle"};
  events.push(snapshot(g,"shuffle",{power:id,at,tier:stage,cells:changed.cells}));
  g.koiRerollAt=stage===3?at:-1;
 }
 g.assisted=true;g.blessingUses=(g.blessingUses||0)+1;
 events=events.concat(g.resolve(-1));
 return {ok:true,events,tier:stage};
}
const api={VERSION,IDS,MAX,POWERS,initialize,status,grantForClear,starterForNewPurchase,consume,apply,reroll,shuffleArea};
root.HarmonyPowers=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
