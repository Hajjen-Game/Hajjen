/* Harmony Director 6.1 — Objective Reachability & Strategic Mobility.
 * Read-only; no RNG, no real swaps, no free upgrades or promised wins.
 * Separate from 6.0 so saved v6 sessions replay byte-for-byte.
 */
(function(root){
"use strict";
const D6=root.HarmonyDirector6||(typeof require==="function"?require("./director-v6.js"):null);
if(!D6)throw Error("Director 6.0 must load before 6.1");
const N=7,L=49;
const FIXED=new Set(["terrain","daruma","sealedStone","moonMirror","lotusSeed"]);
const movable=p=>!!p&&!FIXED.has(p.family);
const adjacent=i=>[i-N,i+1,i+N,i-1].filter(j=>j>=0&&j<L&&
 Math.abs(Math.floor(j/N)-Math.floor(i/N))+Math.abs(j%N-i%N)===1);
const rounded=x=>Math.round(x*1000)/1000;
function geometry(board){
 // This is the set of ALL vertical gravity segments, including short runs.
 // v6 reported only long segments in 'channels' but counted short ones in
 // 'supportedChannels'. Every 6.1 supported count is a subset of this total.
 const channels=[];
 for(let col=0;col<N;col++){
  let segment=[];
  for(let row=0;row<=N;row++){
   const i=row*N+col;
   if(row<N&&movable(board[i]))segment.push(i);
   else if(segment.length){channels.push(segment);segment=[];}
  }
 }
 const eligible=channels.filter(c=>c.length>=3);
 // Shortest orthogonal distance inside currently open space. A path is an
 // investment proximity signal, never a prediction of legal future moves:
 // gravity/refill may change the board after the next fusion.
 const matrix=Array.from({length:L},()=>Array(L).fill(Infinity));
 for(let i=0;i<L;i++){
  if(!movable(board[i]))continue;
  const d=matrix[i];d[i]=0;const queue=[i];
  for(let q=0;q<queue.length;q++){
   const at=queue[q];
   for(const to of adjacent(at))if(movable(board[to])&&!Number.isFinite(d[to])){
    d[to]=d[at]+1;queue.push(to);
   }
  }
 }
 return {channels,eligible,matrix};
}
function assess(board,goal={},context={},validSwaps,scan){
 const base=D6.evaluate(board,goal,context,validSwaps,scan);
 const geo=geometry(board),legal=validSwaps(board),kind=goal.type||"fusion";
 const investments=[],scoreById=new Map(),shown=new Set(),families=new Set();
 const stageCounts=[0,0,0,0,0,0];
 for(let i=0;i<L;i++)if(movable(board[i])){
  const p=board[i];stageCounts[Math.min(5,p.stage||1)]++;
  if(p.stage>=2&&p.stage<5)investments.push({i,family:p.family,stage:p.stage,id:p.id});
 }
 // Real existing objects can already develop toward a Masterpiece without
 // a Director-injected booster. Distance is measured around blocked cells,
 // and stage-four anchors are more valuable than stage-two pieces.
 let anchors=0,highAnchors=0;
 for(const p of investments){
  const related=[];
  for(let j=0;j<L;j++)if(j!==p.i&&movable(board[j])&&
    board[j].family===p.family&&geo.matrix[p.i][j]<=5){
   related.push({i:j,d:geo.matrix[p.i][j]});
  }
  if(!related.length)continue;
  const closest=Math.min(...related.map(x=>x.d));
  const value=p.stage>=4?3:p.stage===3?1.65:.5;
  anchors+=value*(closest<=2?1:closest<=4?.63:.25);
  if(p.stage>=3)highAnchors++;
 }
 const occupied=new Set(),supported=new Set(),destinations=new Set();
 let strategicMoves=0,stage3Choices=0,stage4Choices=0,pulseChoices=0;
 let nextStepRoutes=0,pulseReach=0,goalActions=0;
 for(const [a,b] of legal){
  for(let i=0;i<geo.channels.length;i++){
   if(geo.channels[i].includes(a)||geo.channels[i].includes(b))supported.add(i);
  }
  [board[a],board[b]]=[board[b],board[a]];
  try{
   const matches=scan(board).filter(group=>group.includes(a)||group.includes(b));
   const consumed=new Set(matches.flat());
   let moveQuality=0;
   for(const group of matches){
    const maxStage=Math.max(...group.map(i=>board[i].stage||1));
    const nextStage=Math.min(5,maxStage+1);
    const family=board[group[0]].family;
    let options=0;
    for(const landing of [a,b]){
     if(!group.includes(landing))continue;
     const affected=nextStage===5?
      adjacent(landing).filter(i=>!consumed.has(i)&&movable(board[i])&&board[i].stage<5).length:0;
     if(nextStage===5&&affected) pulseReach=Math.max(pulseReach,affected);
     const partners=[];
     for(let i=0;i<L;i++){
      if(consumed.has(i)||!movable(board[i])||board[i].family!==family)continue;
      const distance=geo.matrix[landing][i];
      if(distance<=4)partners.push({i,distance});
     }
     // Developing a stage-three/stage-four treasure is a real immediately
     // legal swap. A nearby same-family survivor is a strategic *possibility*,
     // NOT a guaranteed two-move follow-up.
     const nearest=partners.length?Math.min(...partners.map(x=>x.distance)):Infinity;
     const viable=nearest<=4;
     if(nextStage>=3)stage3Choices++;
     if(nextStage>=4)stage4Choices++;
     if(nextStage===5&&affected)pulseChoices++;
     if(viable&&nextStage>=3){
      options++;destinations.add(family+":"+landing+":"+nextStage);
      if(nextStage===4)nextStepRoutes+=nearest<=2?1.8:1.1;
      else if(nextStage===3)nextStepRoutes+=nearest<=2?1.1:.55;
      else nextStepRoutes+=.5;
     }
     if(kind==="pulseHits"&&nextStage===5&&affected)goalActions+=affected;
     if(kind==="masterpiece"&&nextStage===5)goalActions++;
     if(kind==="familyMasterpiece"&&nextStage===5&&family===goal.family)goalActions++;
     if(kind==="lotus"){
      const seeds=board.map((p,i)=>p?.family==="lotusSeed"?i:-1).filter(i=>i>=0);
      for(const seed of seeds)if(group.some(i=>i%N===seed%N&&i>seed))goalActions++;
     }
     families.add(family);
    }
    moveQuality=Math.max(moveQuality,nextStage>=5?4:nextStage===4?3:nextStage===3?2:nextStage===2?1:0);
    if(options)occupied.add(family);
   }
   if(moveQuality>=2)strategicMoves++;
  }finally{[board[a],board[b]]=[board[b],board[a]];}
 }
 // Goal pressure should support an existing invested piece, never spawn one.
 // Saturation prevents a Director from stuffing the board with easy chains.
 const pulseGoal=kind==="pulseHits"||kind==="masterpiece"||kind==="familyMasterpiece";
 const goalDepth=pulseGoal?
  Math.min(5,pulseReach)*1.7+Math.min(4,stage4Choices)*1.05+
  Math.min(5,stage3Choices)*.48:Math.min(5,goalActions)*1.15;
 const routes=Math.min(6,nextStepRoutes)*1.2;
 const investment=Math.min(6,anchors)*.65;
 const variety=Math.min(3,occupied.size)*.45+
  Math.min(5,destinations.size)*.24+Math.min(4,strategicMoves)*.42;
 const baseStrategic=goalDepth+routes+investment+variety;
 const drought=Math.max(0,Math.min(12,Number(context.objectiveDrought)||0));
 // More reachability weight during prolonged goal drought, but capped,
 // and never a promise to win or a scripted target.
 const strategic=rounded(Math.min(18,baseStrategic)*(1+Math.min(8,drought)*.035));
 const channels=geo.channels.length,supportedChannels=supported.size;
 return {...base,channels,supportedChannels,
  viableChannels:geo.eligible.length,
  strategicMoves,stage3Choices,stage4Choices,pulseChoices,
  highAnchors,anchorScore:rounded(anchors),nextStepRoutes:rounded(nextStepRoutes),
  pulseReach,goalActions,routeFamilies:occupied.size,
  objectiveReachability:rounded(goalDepth+routes),
  strategic,score:rounded(base.score+strategic)};
}
function choose(baseline,alternatives,scoreFn,context,validSwaps,scan){
 const original=assess(baseline.board,context.goal,context,validSwaps,scan);
 let best=original,selected=baseline,bestPace=scoreFn(baseline.board),reason="baseline";
 const underPressure=original.legal<=2;
 for(const candidate of alternatives){
  if(candidate.autoMatches!==0)continue; // Never manufacture free cascades.
  const m=assess(candidate.board,context.goal,context,validSwaps,scan);
  if(m.legal===0)continue;
  // Do not sacrifice a usable puzzle just to maximize the potential of one
  // Masterpiece. Critical deadlocks take priority over speculative paths.
  if(!underPressure&&m.legal<Math.max(3,original.legal-1))continue;
  const pace=scoreFn(candidate.board);
  if(best.legal<=2&&m.legal>best.legal){
   selected=candidate;best=m;bestPace=pace;reason="mobility-recovery";continue;
  }
  const delta=m.score-best.score;
  const depthGain=m.objectiveReachability-best.objectiveReachability;
  const routeGain=m.nextStepRoutes-best.nextStepRoutes;
  const stageGain=m.strategic-best.strategic;
  if(m.legal>=Math.max(3,best.legal-1)&&
    ((delta>=2.5&&depthGain>=.75)||
     (delta>=3.5&&routeGain>=.8)||
     (delta>=4.5&&stageGain>=1.25))&&
    pace>=bestPace-4.5){
   selected=candidate;best=m;bestPace=pace;
   reason="objective-reachability";continue;
  }
  if(best.legal<=4&&m.legal>best.legal&&
    m.objectiveReachability>=best.objectiveReachability-1.5&&
    pace>=bestPace-3){
   selected=candidate;best=m;bestPace=pace;
   reason="strategic-mobility";continue;
  }
 }
 return {selected,health:original,chosenHealth:best,reason};
}
const api=Object.freeze({VERSION:1,assess,choose});
root.HarmonyDirector61=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
