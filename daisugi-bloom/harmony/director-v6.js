/* Japanese Harmony — Harmony Director 6.0, Mechanic-Aware Board Intelligence.
 * PURE assessment, not a move generator: never changes stages, tiles, goals,
 * randomness, rewards or the board. Evaluates legal swaps on the real shape.
 */
(function(root){
"use strict";
const N=7;
const fixed=new Set(["terrain","daruma","sealedStone","moonMirror","lotusSeed"]);
const neighbors=i=>[i-N,i+1,i+N,i-1].filter(j=>j>=0&&j<49&&(Math.abs((i%7)-(j%7))+Math.abs(Math.floor(i/7)-Math.floor(j/7)))===1);
const distance=(a,b)=>Math.abs(Math.floor(a/N)-Math.floor(b/N))+Math.abs(a%N-b%N);
function components(board){
 const seen=new Set(),parts=[],ownership=Array(49).fill(-1);
 for(let i=0;i<49;i++){
  if(seen.has(i)||!board[i]||fixed.has(board[i].family))continue;
  const cells=[i];seen.add(i);
  for(let k=0;k<cells.length;k++){
   for(const at of neighbors(cells[k]))
    if(!seen.has(at)&&board[at]&&!fixed.has(board[at].family)){
     seen.add(at);cells.push(at);
    }
  }
  for(const at of cells)ownership[at]=parts.length;
  parts.push(cells);
 }
 return {parts,ownership};
}
// Gravity never crosses a fixed piece. A connected board can still have
// narrow vertical channels with very few meaningful refill opportunities.
function gravityChannels(board){
 const runs=[];
 for(let col=0;col<N;col++){
  let run=[];
  for(let row=0;row<=N;row++){
   const at=row*N+col;
   if(row<N&&board[at]&&!fixed.has(board[at].family))run.push(at);
   else if(run.length){runs.push(run);run=[];}
  }
 }
 return runs;
}
// One-turn real swaps. The goal score is *opportunity*, not progress. In
// particular a pulse or cargo delivery is never assumed to have happened.
function evaluate(board,goal,context={},validSwaps,scan){
 if(!Array.isArray(board)||board.length!==49||typeof validSwaps!=="function"||
  typeof scan!=="function")throw Error("Director 6 requires a 7x7 board and pure swap/scan functions");
 const legal=validSwaps(board),parts=components(board),goals=goal?.type||"fusion";
 const active=new Set(),direct=new Set(),potential=new Set();
 const channels=gravityChannels(board);
 const supportedChannels=new Set();
 let meaningful=0,deep=0,pulse=0,echo=0,wind=0,lotus=0;
 const mirror=Array.isArray(context.mirrors)?context.mirrors:[];
 const winds=context.wind?.steps||[];
 const seeds=board.map((p,i)=>p?.family==="lotusSeed"?i:-1).filter(x=>x>=0);
 const mist=Array.isArray(context.mist)?context.mist:[];
 const barrier=goals==="daruma"?"daruma":goals==="sealedStone"?"sealedStone":null;
 const blockers=barrier?board.map((p,i)=>p?.family===barrier&&context.blockers?.[i]>0?i:-1).filter(x=>x>=0):[];
 for(const [a,b] of legal){
  if(parts.ownership[a]>=0)active.add(parts.ownership[a]);
  if(parts.ownership[b]>=0)active.add(parts.ownership[b]);
  for(let i=0;i<channels.length;i++)
   if(channels[i].includes(a)||channels[i].includes(b))supportedChannels.add(i);
  [board[a],board[b]]=[board[b],board[a]];
  try{
   const matches=scan(board).filter(g=>g.includes(a)||g.includes(b));
   const used=new Set(matches.flat());
   let moveQuality=0;
   for(const group of matches){
    const stage=Math.max(...group.map(at=>board[at].stage||1));
    const nextStage=Math.min(5,stage+1);
    if(stage>=2)moveQuality=Math.max(moveQuality,1);
    if(stage>=3)moveQuality=Math.max(moveQuality,2);
    if(nextStage>=5)deep++;
    for(const to of [a,b]){
     if(!group.includes(to))continue;
     if(goals==="pulseHits"){
      if(nextStage===5){
       const affected=neighbors(to).filter(at=>!used.has(at)&&board[at]&&
        !fixed.has(board[at].family)&&board[at].stage<5);
       pulse=Math.max(pulse,affected.length);
       if(affected.length)direct.add(to);
      }else if(nextStage===4)potential.add(to);
     }else if(goals==="mist"){
      if(mist[to])direct.add(to);
      else if(nextStage===5&&neighbors(to).some(at=>mist[at]))direct.add(to);
      else if(neighbors(to).some(at=>mist[at]))potential.add(to);
     }else if(barrier){
      if(blockers.some(at=>neighbors(to).includes(at)))direct.add(to);
      else if(blockers.some(at=>distance(at,to)<=2)&&nextStage>=3)potential.add(to);
     }else if(goals==="masterpiece"||goals==="familyMasterpiece"){
      if(nextStage===5)direct.add(to);
      else if(nextStage===4)potential.add(to);
     }else if(goals==="stage3"||goals==="stage4"){
      if(nextStage>=(goals==="stage3"?3:4))direct.add(to);
      else if(nextStage>=(goals==="stage3"?2:3))potential.add(to);
     }
     if(mirror.some(m=>neighbors(to).includes(m.at)))echo++;
    }
    // Cargo can ONLY fall if pieces beneath it get cleared in that lane.
    // This is directional, not a generic swap near a lotus seed.
    for(const seed of seeds){
     const under=group.filter(at=>at%N===seed%N&&at>seed);
     if(under.length)lotus++;
    }
    if(winds.some(w=>group.some(at=>Math.floor(at/N)===w.row)))wind++;
   }
   meaningful+=moveQuality>=1?1:0;
  }finally{[board[a],board[b]]=[board[b],board[a]];}
 }
 const usable=parts.parts.filter(p=>p.length>=3);
 const underserved=usable.filter(p=>!active.has(parts.ownership[p[0]])).length;
 const maxPart=Math.max(0,...usable.map(p=>p.length));
 const usableChannels=channels.filter(p=>p.length>=3);
 const unsupportedChannels=usableChannels.filter(p=>
  !supportedChannels.has(channels.indexOf(p))).length;
 // Most geometry pressure comes from too few actual choices, rather than
 // raw wall count. Penalize an isolated playable section but not its presence.
 const mobility=legal.length===0?-90:legal.length===1?-35:
  legal.length===2?-19:legal.length===3?-6:
  Math.min(legal.length,9)*1.8;
 const shape= -Math.min(3,underserved)*4 + Math.min(3,active.size)*1.15 +
  Math.min(4,supportedChannels.size)*.45-Math.min(4,unsupportedChannels)*.55+
  (maxPart<10?-3:0);
 const objective=(goals==="pulseHits"?
  Math.min(3,pulse)*2.2+Math.min(3,potential.size)*1.1:
  goals==="lotus"?
   Math.min(4,lotus)*2.7:
   Math.min(3,direct.size)*2.1+Math.min(3,potential.size)*.9);
 const mechanism=(seeds.length?Math.min(4,lotus)*1.4:0)+
  (mirror.length?Math.min(3,echo)*.65:0)+
  (winds.length?Math.min(3,wind)*.5:0);
 const score=mobility+shape+Math.min(6,meaningful)*.6+
  Math.min(3,deep)*.75+objective+mechanism;
 return {legal:legal.length,parts:usable.length,activeParts:active.size,
  channels:usableChannels.length,supportedChannels:supportedChannels.size,
  underserved,meaningful,objective:Math.round(objective*100)/100,
  pulse,lotus,mirror:echo,wind,score:Math.round(score*1000)/1000};
}
// Alternative refill selection without altering the ordinary object bag.
// Critical mobility always takes precedence over small pace/score advantages.
function choose(baseline,alternatives,scoreFn,context,validSwaps,scan){
 const b=evaluate(baseline.board,context.goal,context,validSwaps,scan);
 let selected=baseline,best=b,bestScore=scoreFn(baseline.board);
 const critical=b.legal<=2;
 const target=critical?4:3;
 let reason="baseline";
 for(const x of alternatives){
  if(x.autoMatches!==0)continue; // No synthetic free cascades.
  const m=evaluate(x.board,context.goal,context,validSwaps,scan);
  if(m.legal===0)continue;
  const v=scoreFn(x.board);
  if(critical&&m.legal>b.legal&&
    (m.legal>=target&&best.legal<target||
     best.legal<target&&m.legal>best.legal||
     m.legal===best.legal&&v>bestScore+1.5)){
   selected=x;best=m;bestScore=v;reason="health-recovery";continue;
  }
  if(best.legal<=4&&m.legal>=best.legal+2&&v>=bestScore-4){
   selected=x;best=m;bestScore=v;reason="proactive-mobility";continue;
  }
  if(best.legal<=2&&m.legal>best.legal){
   selected=x;best=m;bestScore=v;reason="health-recovery";continue;
  }
  if(m.legal>=Math.max(3,best.legal-1)&&
   m.score>best.score+4&&v>bestScore+1.5){
   selected=x;best=m;bestScore=v;reason="spatial-opportunity";
  }
 }
 return {selected,health:b,chosenHealth:best,reason};
}
// No forced win and no silently painted matches after shuffle. The caller
// verifies all fixed identities, and uses existing conservative fallbacks.
const api=Object.freeze({VERSION:1,evaluate,choose});
root.HarmonyDirector6=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
