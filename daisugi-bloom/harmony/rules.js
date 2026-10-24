/* Japanese Harmony puzzle rules 2.0 — pure match logic, no rendering dependencies. */
(function(root){
"use strict";
const N=7, ALL=["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"];
// Fixed progression: four active families on levels 1–10, five from level
// 11 onward. All nine families rotate across the introduction. The original
// five-family recipes are retained for saves from before the progression.
const LEVEL_FAMILIES=[
 ["sakura","lantern","koi","fan","bonsai"],
 ["sakura","koi","fan","sushi","maneki"],
 ["lantern","koi","bonsai","origami","ryu"],
 ["sakura","fan","sushi","origami","maneki"],
 ["lantern","bonsai","sushi","ryu","maneki"],
 ["lantern","koi","bonsai","origami","ryu"],
 ["sakura","fan","sushi","origami","ryu"],
 ["koi","fan","bonsai","maneki","origami"],
 ["sakura","lantern","sushi","maneki","ryu"],
 ["koi","bonsai","sushi","origami","ryu"]
];
// Stable family mix for arbitrarily many numbered levels. No per-level quests.
function endlessFamilies(index){
 const chosen=ALL.slice(),random=prng((Math.imul(index+1,0x9e3779b1)^0x68bc21eb)>>>0);
 for(let i=chosen.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[chosen[i],chosen[j]]=[chosen[j],chosen[i]];}
 return chosen.slice(0,5);
}
function levelFamilyCount(index){return index<10?4:5;}
function activeFamilies(index,count=5){
 // Five remains the explicit original recipe; the live intro uses four.
 // Existing old snapshots retain their original five-family board on resume.
 const picked=index<LEVEL_FAMILIES.length?LEVEL_FAMILIES[index].slice():endlessFamilies(index);
 return picked.slice(0,count===4?4:5);
}
const levels=[
 {name:"First Match",subtitle:"Början på resan",moves:24,par:7,goal:{type:"fusion",count:5},intro:"Byt två grannar och matcha tre föremål av samma familj."},
 {name:"Growing Beauty",subtitle:"Fem steg till ett mästerverk",moves:36,par:10,goal:{type:"stage3",count:3},intro:"Samma familj kan matchas oavsett utvecklingsstadium. Få tre föremål till stadium 3."},
 {name:"The Survivor",subtitle:"Välj den rätta vägen",moves:32,par:9,goal:{type:"stage4",count:1},intro:"Högsta matchade stadium bestämmer resultatet. Du bestämmer fusionsrutan med ditt drag. Odla fram stadium 4."},
 {name:"First Masterpiece",subtitle:"Skapa något extraordinärt",moves:36,par:10,goal:{type:"masterpiece",count:1},intro:"Förädla ett föremål till stadium 5 för att skapa ditt första mästerverk."},
 {name:"Harmony Awakens",subtitle:"Låt utvecklingen sprida sig",moves:36,par:11,goal:{type:"pulseHits",count:3},intro:"Harmony Pulse utvecklar upptagna rutor ovanför, nedanför och vid sidan av mästerverket."},
 {name:"Lantern Festival",subtitle:"Varmt ljus i natten",moves:40,par:12,goal:{type:"familyMasterpiece",family:"lantern",count:1},intro:"Skapa ett mästerverk från lykta-familjen. Övriga mästerverk ger fortfarande poäng."},
 {name:"Four of a Kind",subtitle:"Den fjärde gör skillnad",moves:36,par:11,goal:{type:"four",count:1},intro:"Matcha minst fyra i en fusion. En granne förädlas som bonus."},
 {name:"Garden in Bloom",subtitle:"Fem utvecklade föremål",moves:40,par:12,goal:{type:"stage3",count:5},intro:"Utveckla fem föremål till stadium 3 med vanliga fusioner. T- och L-former är bonusar, inte ett krav."},
 {name:"Double Harmony",subtitle:"Varje mästerverk räknas",moves:40,par:12,goal:{type:"masterpiece",count:2},intro:"Skapa två mästerverk under nivån. Harmony Pulse-kedjor ger fortfarande extra poäng."},
 {name:"Master of Harmony",subtitle:"Första kapitlets final",moves:48,par:15,goal:{type:"masterpiece",count:3},intro:"Skapa tre mästerverk på en och samma nivå."}
];
// A level number is enough to recreate its configuration. This is the one
// reusable level recipe for all stages after the 10-level tutorial.
// After doubling moves, rebalance all score-based Journey star requirements
// by +50%. Introduction levels 1–10 instead rate stars by goal timing.
const JOURNEY_STAR_SCORE_MULTIPLIER=1.5;
function endlessScoreConfig(index){
 const number=index+1,tier=Math.floor((index-10)/10);
 const moves=2*Math.max(17,22-((index-10)%5)-Math.floor(tier/4));
 // Journey 6.6: actual mobile player records showed a sharp difficulty cliff
 // when the introductory 4-family board becomes 5 families on level 11.
 // Separate passing from star excellence. The first 5–10 Journey levels are
 // attainable for a deliberate human player; mastery scales gradually later.
 // No level adapts its score target based on the individual player's history.
 const advancement=Math.max(0,index-10),early=Math.min(39,advancement);
 const distance=Math.max(0,index-49);
 const originalTarget=Math.round((5000+52*early+35*Math.floor(early/5)+
  Math.min(1100,Math.log2(1+distance/12)*180))/50)*50;
 const mastery=Math.min(1,advancement/39);
 const originalStars=[originalTarget,
  Math.ceil(originalTarget*(1.5+.15*mastery)/50)*50,
  Math.ceil(originalTarget*(2.25+.2*mastery)/50)*50];
 const stars=originalStars.map(points=>Math.round(points*JOURNEY_STAR_SCORE_MULTIPLIER));
 return {name:"Harmony Journey",subtitle:"Poängjakt · bana "+number,moves,par:0,
  goal:{type:"score",count:stars[0]},stars,
  intro:"Nå poängmålet för en stjärna. Fortsätt samla poäng för två eller tre stjärnor."};
}
// HARMONY OBJECTIVES 2.0 — beyond the tutorial, every Journey level has
// a tangible objective. Score remains a side challenge / personal record.
// Objectives are fixed by level index, never adjusted by Director or player.
function endlessConfig(index){
 const base=endlessScoreConfig(index),number=index+1;
 const stage=(index-10)%10;
 const chapter=Math.floor((index-10)/10);
 // Rebalance 1.0: the first ten mission levels previously used the doubled
 // 36–44-move score-game budget and a compact 6–12-cell mist cluster.
 // Broaden the coverage so a single three-match rarely sweeps many targets,
 // while keeping enough moves for real human experimentation.
 const earlyJourney=index>=10&&index<20;
 const mistCount=earlyJourney?[9,11,0,12,0,13,0,14,0,15][stage]:
  Math.min(16,[9,11,0,12,0,13,0,14,0,15][stage]+Math.min(2,Math.floor(chapter/3)));
 const earlyMoves=[28,28,27,27,26,28,27,28,27,29];
 const quests=[
  {type:"mist",count:mistCount},
  {type:"mist",count:mistCount},
  {type:"masterpiece",count:earlyJourney?3:2+Math.min(1,Math.floor(chapter/2))},
  {type:"mist",count:mistCount},
  {type:"fusion",count:earlyJourney?20:10+Math.min(5,chapter)},
  {type:"mist",count:mistCount},
  {type:"stage3",count:earlyJourney?10:6+Math.min(4,chapter)},
  {type:"mist",count:mistCount},
  {type:"pulseHits",count:earlyJourney?8:5+Math.min(4,chapter)},
  {type:"mist",count:mistCount}
 ];
 const goal=quests[stage];
 const mist=goal.type==="mist";
 const label=mist?"Harmony Mist":goal.type==="masterpiece"?"Masterpiece Garden":
  goal.type==="fusion"?"Harmony Fusion":goal.type==="stage3"?"Growing Harmony":"Harmony Pulse";
 const description=mist?"Rena "+goal.count+" dimtäckta rutor. Fusionera på en dimruta eller träffa den med Harmony Pulse. Föremål i dimman kan fortfarande flyttas.":
  goal.type==="masterpiece"?"Skapa "+goal.count+" mästerverk för att återställa harmonin.":
  goal.type==="fusion"?"Gör "+goal.count+" lyckade fusioner.":
  goal.type==="stage3"?"Utveckla "+goal.count+" föremål till stadium 3.":
  "Träffa "+goal.count+" föremål med Harmony Pulse.";
 return {...base,name:label,subtitle:mist?"Rena trädgårdens magiska dimma":"Ett nytt harmonimål",
  moves:earlyJourney?earlyMoves[stage]:base.moves,
  goal,par:mist?(earlyJourney?17+Math.floor(stage/3):12+Math.min(5,chapter)):
   goal.type==="masterpiece"?(earlyJourney?16:16+chapter):
   goal.type==="fusion"?(earlyJourney?15:13+chapter):
   goal.type==="stage3"?(earlyJourney?17:15+chapter):(earlyJourney?17:18+chapter),
  intro:description,objectiveVersion:2,balanceVersion:1,chapter:number};
}
// Mist Layout Rebalance 2.0: current Fusion Destination Control cleanses
// only the fusion LANDING cell, and Harmony Pulse cleanses only occupied
// neighbouring tiles it actually hits. The former scattered layout required
// too many independent precise fusions (9 of 9 fog cells isolated on Stage 11).
// New runs use four/five separate 2–3-cell patches, plus at most one deliberate
// precision cell. Clusters can be reached by strategic Pulse placement; no
// initial rows/columns of 3 mist cells, giant blobs or unreachable corners.
// The prefix order is hand-designed for 9–16 targets; deterministic 90-degree
// rotations vary the landscape across Journey levels. Mist remains fixed to
// board CELLS, never to pieces; existing saved masks are kept unchanged.
const MIST_LAYOUT_V2=[
// Patch A (L, 3)                  Patch B (L, 3)
 8,9,15,                           12,19,20,
// Patch C (pair), one precision tile, Patch D (pair)
 29,36,                             24,39,40,
// Extend C (3), D (3), form E (pair, then L)
 37,46,                             17,25,
// Only for later 16-fog chapters: one separate upper-edge tile
 3
];
// Version 1 is kept only for reproducible before/after Engine Lab runs
// and historical comparisons. New gameplay always starts on version 2.
const MIST_LAYOUT_V1=[8,12,16,24,30,36,40,20,28,9,32,38,14,34,46,42,6,26];
function mistLayout(index,count,version=2){
 if(!count)return [];
 const pattern=version===1?MIST_LAYOUT_V1:MIST_LAYOUT_V2;
 const rotation=((Math.floor((index-10)/3)%4)+4)%4;
 const transform=i=>{
  let r=Math.floor(i/7),c=i%7;
  for(let k=0;k<rotation;k++)[r,c]=[c,6-r];
  return r*7+c;
 };
 return pattern.slice(0,count).map(transform);
}
function levelConfig(index){return levels[index]||endlessConfig(index);}
function scoreStars(index,score,previouslyWon=false){
 // Historical score-only Journey runs and score archives retain their
 // original star thresholds even though new plays use objective goals.
 const live=levelConfig(index);
 const config=live.goal.type==="score"?live:index>=10?endlessScoreConfig(index):live;
 if(config.goal.type!=="score")return 0;
 const [one,two,three]=config.stars;
 const earned=score>=three?3:score>=two?2:score>=one?1:0;
 // Preserve previously completed levels from before the calibration. The old
 // high score may be below the new 1-star requirement; do not revoke a win.
 return Math.max(earned,previouslyWon?1:0);
}
for(let i=10;i<50;i++)levels.push(endlessConfig(i));
function prng(seed){return function(){seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function clone(b){return b.map(p=>p?{family:p.family,stage:p.stage,id:p.id}:null);}
function neighbors(i){let row=Math.floor(i/N),col=i%N,a=[];if(row>0)a.push(i-N);if(col<N-1)a.push(i+1);if(row<N-1)a.push(i+N);if(col>0)a.push(i-1);return a;}
function scan(board){
 const lines=[];
 for(let r=0;r<N;r++)for(let c=0;c<N;){let i=r*N+c,f=board[i]&&board[i].family,e=c+1;while(f&&e<N&&board[r*N+e]&&board[r*N+e].family===f)e++;if(f&&e-c>=3)lines.push(Array.from({length:e-c},(_,k)=>r*N+c+k));c=e;}
 for(let c=0;c<N;c++)for(let r=0;r<N;){let i=r*N+c,f=board[i]&&board[i].family,e=r+1;while(f&&e<N&&board[e*N+c]&&board[e*N+c].family===f)e++;if(f&&e-r>=3)lines.push(Array.from({length:e-r},(_,k)=>(r+k)*N+c));r=e;}
 const groups=[];
 for(const line of lines){let group=new Set(line),found=true;while(found){found=false;for(let j=groups.length-1;j>=0;j--)if(groups[j].some(v=>group.has(v))){for(const v of groups[j])group.add(v);groups.splice(j,1);found=true;}}groups.push([...group].sort((a,b)=>a-b));}
 return groups.sort((a,b)=>a[0]-b[0]);
}
function validSwaps(board){
 const all=[];
 for(let a=0;a<49;a++)for(const b of [a+1,a+N]){
  if(b>=49 || (b===a+1&&a%7===6)||!board[a]||!board[b]||board[a].family===board[b].family)continue;
  [board[a],board[b]]=[board[b],board[a]];
  let yes=scan(board).some(g=>g.includes(a)||g.includes(b));
  [board[a],board[b]]=[board[b],board[a]];
  if(yes)all.push([a,b]);
 }
 return all;
}
// Distinguish the piece to MOVE from the space WHERE it belongs.
// A legal exchange can be performed in either direction, but a useful hint
// highlights the piece whose arrival completes a three-or-more match.
// This only reads a swapped copy: no board mutations or score changes.
function directedHint(board,pair){
 if(!Array.isArray(pair)||pair.length!==2)return null;
 const [a,b]=pair;
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=N*N||b>=N*N||!board[a]||!board[b]||!neighbors(a).includes(b))return null;
 const next=board.slice();[next[a],next[b]]=[next[b],next[a]];
 const groups=scan(next);
 const score=i=>groups.reduce((sum,g)=>sum+(g.includes(i)?g.length:0),0);
 const sa=score(a),sb=score(b);
 if(!sa&&!sb)return null;
 const to=sa>sb?a:sb>sa?b:b;
 return {from:to===a?b:a,to};
}
// Harmony Resonance 1.0: a developed piece (stage 3–4) resonates with
// an orthogonally adjacent piece of the SAME family. This is a pure board
// query and never changes the tile, family, stage or refill distribution.
function resonanceLinks(board){
 const links=[];
 for(let a=0;a<N*N;a++){
  const x=board[a];
  if(!x||x.stage>=5)continue;
  for(const b of [a+1,a+N]){
   if(b>=N*N||(b===a+1&&a%N===N-1))continue;
   const y=board[b];
   if(!y||y.stage>=5||x.family!==y.family||Math.max(x.stage,y.stage)<3)continue;
   const anchor=(x.stage>=y.stage?a:b),partner=anchor===a?b:a;
   links.push({anchor,partner,anchorId:board[anchor].id,partnerId:board[partner].id,
    family:x.family,stage:board[anchor].stage});
  }
 }
 return links;
}
function randItem(a,rand){return a[Math.floor(rand()*a.length)];}
function fillBoard(families,rand){
 let board=[];
 for(let i=0;i<49;i++){
  let avoid=[],c=i%7,r=Math.floor(i/7);
  if(c>1&&board[i-1].family===board[i-2].family)avoid.push(board[i-1].family);
  if(r>1&&board[i-7].family===board[i-14].family)avoid.push(board[i-7].family);
  board.push({family:randItem(families.filter(f=>!avoid.includes(f)),rand),stage:1,id:i+1});
 }
 return board;
}
function startBoard(level,random,families){
 // NEW BOARD CONTRACT: all 49 items start at stage ONE, on EVERY level and retry.
 // Difficulty comes from family placement and objectives, never pre-evolved pieces.
 // Keep fair variants: no free match and at least three legal first swaps.
 for(let tries=0;tries<650;tries++){
  const board=fillBoard(families,random);
  if(families.every(f=>board.some(p=>p.family===f))&&validSwaps(board).length>=3)return board;
 }
 // Deterministic fallback: keep trying stage-one layouts instead of inserting
 // higher-stage "helping" pieces or permitting a locked starting position.
 while(true){
  const board=fillBoard(families,random);
  if(families.every(f=>board.some(p=>p.family===f))&&validSwaps(board).length>=3)return board;
 }
}
// Fair Shuffle 2.0 — physical object relocation, never identity mutation.
// Rebuild a valid arrangement of the exact same pieces (id, family, stage).
// No free matches, at least three legal swaps where attainable. No boosters,
// pieces, extra moves or artificial stage upgrades are introduced.
function fairShuffle(board,rand){
 if(board.length!==N*N||board.some(p=>!p))throw new Error("Fair shuffle needs a full 7x7 board");
 const originals=board.slice();
 const byFamily=new Map();
 for(const piece of originals){
  if(!byFamily.has(piece.family))byFamily.set(piece.family,[]);
  byFamily.get(piece.family).push(piece);
 }
 // A weighted bag retains exact object counts. Each source object is moved,
 // never duplicated or converted to a different family or stage.
 for(let attempt=0;attempt<240;attempt++){
  const pools=new Map([...byFamily].map(([f,items])=>[f,items.slice()]));
  const candidate=[];
  let deadEnd=false;
  for(let i=0;i<N*N;i++){
   const banned=new Set(),c=i%N,r=Math.floor(i/N);
   if(c>=2&&candidate[i-1].family===candidate[i-2].family)banned.add(candidate[i-1].family);
   if(r>=2&&candidate[i-N].family===candidate[i-2*N].family)banned.add(candidate[i-N].family);
   let total=0,options=[];
   for(const [family,items] of pools){
    if(items.length&&!banned.has(family)){options.push([family,items]);total+=items.length;}
   }
   if(!total){deadEnd=true;break;}
   let pick=Math.floor(rand()*total),chosen=options[0];
   for(const option of options){if(pick<option[1].length){chosen=option;break;}pick-=option[1].length;}
   const items=chosen[1],at=Math.floor(rand()*items.length);
   candidate.push(items.splice(at,1)[0]);
  }
  if(!deadEnd&&validSwaps(candidate).length>=3)return candidate;
 }
 // Fallback for particularly uneven piece distributions: pairwise repair of
 // the existing, match-free board, again moving whole object identities.
 for(let i=0;i<N*N;i++)for(let j=i+1;j<N*N;j++){
  if(originals[i].family===originals[j].family)continue;
  const candidate=originals.slice();
  [candidate[i],candidate[j]]=[candidate[j],candidate[i]];
  if(scan(candidate).length===0&&validSwaps(candidate).length>=1)return candidate;
 }
 // A malformed all-one-family board cannot be resolved by permutation alone.
 // Fail clearly, rather than secretly destroying invested stage-4 objects.
 throw new Error("No playable identity-preserving shuffle exists for this board");
}
// Harmony Opportunity Director 1.0 — developer-only experimental refill.
// Candidate pools use the SAME 4-of-each-family bag and the SAME 78%
// anti-free-match roll as standard 5.3. All candidate worlds are in-memory,
// deterministic forks from one parent RNG draw, never hand-authored rewards.
function drawBagFamily(bag,families,board,index,rand){
 if(!bag.length)for(const family of families)for(let n=0;n<4;n++)bag.push(family);
 const original=Math.floor(rand()*bag.length);
 let chosen=original;
 if(board&&index>=0&&rand()<.78&&wouldMatchAt(board,index,bag[original])){
  const safe=[];
  for(let n=0;n<bag.length;n++)if(!wouldMatchAt(board,index,bag[n]))safe.push(n);
  if(safe.length)chosen=safe[Math.floor(rand()*safe.length)];
 }
 return bag.splice(chosen,1)[0];
}
// Count playable matches that develop invested stages and/or the objective
// family. Never look into future RNG here: this examines CURRENT legal swaps.
function opportunityMetrics(board,goal){
 const swaps=validSwaps(board);
 let meaningful=0,goalReady=0,nearMasterpiece=0;
 for(const [a,b] of swaps){
  [board[a],board[b]]=[board[b],board[a]];
  const groups=scan(board).filter(g=>g.includes(a)||g.includes(b));
  for(const group of groups){
   const maxStage=Math.max(...group.map(i=>board[i].stage));
   if(maxStage>=3)meaningful++;
   if(maxStage>=4)nearMasterpiece++;
   if(goal?.type==="familyMasterpiece"&&board[group[0]].family===goal.family){
    if(maxStage>=2)goalReady+=maxStage>=4?3:maxStage===3?2:1;
   }
  }
  [board[a],board[b]]=[board[b],board[a]];
 }
 const legal=swaps.length;
 // Reward choices but do not simply optimize for 30+ low-value moves.
 const score=Math.min(legal,16)*.28+
  Math.min(meaningful,8)*2.7+
  Math.min(nearMasterpiece,4)*4.2+
  Math.min(goalReady,9)*4.4;
 return {legal,meaningful,nearMasterpiece,goalReady,score};
}
// Director 2.0 measures opportunities AROUND existing investment, not just
// the raw number of three-matches. No previews are applied to the real board.
function opportunityMetricsV2(board,goal,drought=0){
 const basic=opportunityMetrics(board,goal);
 const actions=validSwaps(board);
 const developed=new Set(),nearReady=new Set(),goalPieces=new Set();
 let goodMoves=0,strongMoves=0;
 for(const [a,b] of actions){
  [board[a],board[b]]=[board[b],board[a]];
  const groups=scan(board).filter(group=>group.includes(a)||group.includes(b));
  let moveGood=false,moveStrong=false;
  for(const group of groups){
   const survivor=group.reduce((i,j)=>board[i].stage>=board[j].stage?i:j);
   const stage=board[survivor].stage;
   if(stage>=2)moveGood=true;
   if(stage>=3)moveStrong=true;
   if(stage>=3)developed.add(board[survivor].id);
   if(stage>=4)nearReady.add(board[survivor].id);
   if(goal?.type==="familyMasterpiece"&&board[survivor].family===goal.family&&stage>=2)
    goalPieces.add(board[survivor].id);
  }
  [board[a],board[b]]=[board[b],board[a]];
  if(moveGood)goodMoves++;
  if(moveStrong)strongMoves++;
 }
 // Preserve previously evolved pieces and their neighbourhood prospects,
 // without inserting any special family or modifying existing stages.
 let investments=0,prospects=0;
 for(let i=0;i<board.length;i++){
  const p=board[i];
  if(!p||p.stage<3||p.stage>=5)continue;
  investments++;
  // Only orthogonal one- and two-step neighbours; not a promise of a match.
  const r=Math.floor(i/N),c=i%N;
  const nearby=[[r-1,c],[r+1,c],[r,c-1],[r,c+1],[r-2,c],[r+2,c],[r,c-2],[r,c+2]];
  if(nearby.some(([rr,cc])=>rr>=0&&rr<N&&cc>=0&&cc<N&&
   board[rr*N+cc]?.family===p.family))prospects++;
 }
 const pressure=Math.min(1,Math.max(0,drought-1)/3);
 // Stronger intervention only when the player hasn't reached higher stages
 // for multiple moves. Cap near-Masterpiece options to avoid gifting wins.
 const score=
  Math.min(basic.legal,14)*.22+
  Math.min(goodMoves,9)*(1.5+pressure*.9)+
  Math.min(strongMoves,6)*(1.9+pressure*1.4)+
  Math.min(developed.size,5)*(3+pressure*2.3)+
  Math.min(nearReady.size,3)*(4.2+pressure*2.2)+
  Math.min(goalPieces.size,4)*5.4+
  Math.min(prospects,5)*(1.1+pressure*1.4)-
  Math.max(0,3-basic.legal)*5-
  Math.max(0,basic.legal-17)*.5;
 return {...basic,goodMoves,strongMoves,developed:developed.size,
  nearReady:nearReady.size,investments,prospects,drought,score};
}
// Harmony Pacing Director 3.0: a small rolling decision-time and outcome model.
// Timing is supplied by the browser only for genuinely VALID moves. No clock,
// timers, telemetry, or behavioral prediction runs inside deterministic rules.
// The classifications regulate which ordinary bag refill looks promising;
// they NEVER change an existing piece, level goal, turns, or score.
function pacingPhase(times,outcomes,drought,previousMajor=false){
 const recent=times.slice(-6),n=recent.length;
 if(previousMajor)return "relax"; // Let the just-earned spectacle breathe.
 if(drought>=3)return "recovery";
 if(n<3)return "build";
 const sorted=recent.slice().sort((a,b)=>a-b);
 const median=sorted[Math.floor(sorted.length/2)];
 const progress=outcomes.slice(-5).filter(Boolean).length;
 if(median<=9000&&progress>=1)return "flow";
 return "build"; // Deliberation is NOT a signal of poor play.
}
function pacingOpportunityScore(metrics,phase){
 const base=metrics.score;
 switch(phase){
  case "recovery":return base+Math.min(metrics.developed,4)*2+
   Math.min(metrics.nearReady,3)*2.6+Math.min(metrics.prospects,4)*1.4;
  case "flow":return base+Math.min(metrics.goodMoves,8)*.55+
   Math.min(metrics.strongMoves,5)*1.25+Math.min(metrics.prospects,4)*.8;
  case "relax":return base+Math.min(metrics.legal,12)*.16; // Maintain options, don't force a climax.
  default:return base;
 }
}
// Harmony Director 3.1 – Objective Awareness. Read-only tactical assessment
// of CURRENT legal swaps in BOTH directions, reflecting Fusion Destination
// Control 1.0 and the first ring of real Harmony Pulse hits. No future bag
// peeking, automatic moves, promised cascades or fabricated rewards.
// Return a capped signal: Director still compares ordinary stage-one refills
// conservatively using 3.0's scoring and pacing as its foundation.
function objectiveAwarenessMetrics(board,goal,mist=Array(N*N).fill(0)){
 const choices=validSwaps(board),kind=goal?.type||"score";
 let bestImmediate=0,directChoices=0,nearChoices=0,distinguished=0;
 const fog=kind==="mist"?mist:[];
 for(const [a,b] of choices){
  [board[a],board[b]]=[board[b],board[a]];
  try{
   const groups=scan(board).filter(g=>g.includes(a)||g.includes(b));
   // Both drag directions are possible even though validSwaps is unordered.
   for(const [from,to] of [[a,b],[b,a]]){
    let immediate=0,potential=0,hasNearby=false;
    const used=new Set(groups.flat());
    const cleared=new Set();
    for(const group of groups){
     const maxStage=Math.max(...group.map(i=>board[i].stage));
     const landing=group.includes(to)?to:group.includes(from)?from:
      group.reduce((i,j)=>board[i].stage>=board[j].stage?i:j);
     const resultStage=Math.min(5,maxStage+1);
     const family=board[landing].family;
     switch(kind){
      case "mist":
       if(fog[landing])cleared.add(landing);
       if(resultStage===5){
        // Stage-five Pulse upgrades OCCUPIED non-consumed neighbours only.
        // The first wave is reliable; chains are not counted as guaranteed.
        for(const n of neighbors(landing)){
         if(!used.has(n)&&board[n]&&board[n].stage<5&&fog[n])
          cleared.add(n);
        }
       }
       if(resultStage>=3&&fog.some(Boolean)){
        if(neighbors(landing).some(n=>fog[n])||
           neighbors(landing).some(n=>neighbors(n).some(j=>fog[j])))hasNearby=true;
       }
       break;
      case "familyMasterpiece":
       if(family===goal.family&&resultStage===5)immediate++;
       else if(family===goal.family&&resultStage>=3)potential++;
       break;
      case "masterpiece": if(resultStage===5)immediate++;else if(resultStage===4)potential++;break;
      case "pulseHits":
       if(resultStage===5)
        immediate+=neighbors(landing).filter(n=>!used.has(n)&&board[n]&&board[n].stage<5).length;
       else if(resultStage===4)potential++;
       break;
      case "stage3":if(maxStage===2)immediate++;else if(maxStage===1)potential++;break;
      case "stage4":if(maxStage===3)immediate++;else if(maxStage===2)potential++;break;
      case "fusion":immediate++;break;
      case "four":if(group.length>=4)immediate++;else if(group.length===3)potential++;break;
      case "shape":
       if(group.length>=5&&new Set(group.map(i=>Math.floor(i/N))).size>1&&
        new Set(group.map(i=>i%N)).size>1)immediate++;
       break;
      case "chain":if(resultStage===5)potential++;break;
      default:if(maxStage>=3)potential++;
     }
    }
    if(kind==="mist"){immediate=cleared.size;if(hasNearby)potential++;}
    if(immediate>0)directChoices++;
    if(potential>0)nearChoices++;
    bestImmediate=Math.max(bestImmediate,immediate);
    distinguished=Math.max(distinguished,Math.min(2,potential));
   }
  }finally{[board[a],board[b]]=[board[b],board[a]];}
 }
 // Never reward an excessive number of trivial choices. Direct goal access
 // matters most; several alternative routes and investments matter slightly.
 const score=Math.min(6.5,Math.min(bestImmediate,3)*1.40+
  Math.min(directChoices,3)*.42+Math.min(nearChoices,4)*.31+
  distinguished*.37);
 return {goalType:kind,legal:choices.length,bestImmediate,directChoices,
  nearChoices,score};
}
// Harmony Director 3.1.1 – Endgame Objective Awareness.
// The final 1–3 fog tiles are treated as distinct reachability problems,
// rather than averaging opportunities over the whole board. This is a PURE,
// one-turn estimate: direct fusion/Pulse reaches are exact for the first
// resolution wave; staged routes are possibilities, never guaranteed wins.
// Only candidate ordinary bag refills are compared; the board is restored.
function endgameMistMetrics(board,mist){
 const targets=[];
 for(let i=0;i<N*N;i++)if(mist[i])targets.push(i);
 if(!targets.length||targets.length>3)
  return {remaining:targets.length,direct:0,staged:0,isolated:0,weakest:0,score:0};
 const direct=new Set(),planned=new Set(),potential=new Map(targets.map(i=>[i,0]));
 const choices=validSwaps(board);
 for(const [a,b] of choices){
  [board[a],board[b]]=[board[b],board[a]];
  try{
   const groups=scan(board).filter(g=>g.includes(a)||g.includes(b));
   const consumed=new Set(groups.flat());
   for(const [from,to] of [[a,b],[b,a]])for(const group of groups){
    const strongest=Math.max(...group.map(i=>board[i].stage));
    const at=group.includes(to)?to:group.includes(from)?from:
     group.reduce((i,j)=>board[i].stage>=board[j].stage?i:j);
    const newStage=Math.min(5,strongest+1);
    if(mist[at])direct.add(at);
    if(newStage===5)for(const n of neighbors(at))
     if(mist[n]&&!consumed.has(n)&&board[n]&&board[n].stage<5)direct.add(n);
    for(const t of targets){
     if(direct.has(t))continue;
     const distance=Math.abs(Math.floor(at/N)-Math.floor(t/N))+
      Math.abs(at%N-t%N);
     if(distance===1&&newStage===4){
      planned.add(t);potential.set(t,Math.max(potential.get(t),2.4));
     }else if(distance===1&&newStage===3)
      potential.set(t,Math.max(potential.get(t),1.35));
     else if(distance===2&&newStage>=4)
      potential.set(t,Math.max(potential.get(t),.7));
    }
   }
  }finally{[board[a],board[b]]=[board[b],board[a]];}
 }
 // If no current swap reaches a tile, inspect only nearby family links and
 // developed-stage pieces for a longer-term, *uncertain* assembly path.
 // A lone mature piece with no matching partner is not called reachable.
 for(const t of targets){
  if(direct.has(t))continue;
  const adjacent=neighbors(t);
  const nearSameFamily=adjacent.filter(i=>board[i]?.family===board[t]?.family);
  const sameFurther=adjacent.some(i=>neighbors(i).some(j=>
   j!==t&&board[j]?.family===board[t]?.family));
  if(nearSameFamily.length>=2)
   potential.set(t,Math.max(potential.get(t),1.1));
  else if(nearSameFamily.length>=1&&sameFurther)
   potential.set(t,Math.max(potential.get(t),.72));
  for(const i of adjacent){
   const piece=board[i];
   if(!piece||piece.stage<3||piece.stage>=5)continue;
   const support=neighbors(i).some(j=>j!==t&&board[j]?.family===piece.family);
   if(support)potential.set(t,Math.max(potential.get(t),piece.stage===4?1.9:1.1));
  }
 }
 const strengths=targets.map(t=>direct.has(t)?3:potential.get(t));
 const weakest=Math.min(...strengths);
 const staged=strengths.filter(v=>v>0&&v<3).length;
 const isolated=strengths.filter(v=>v===0).length;
 // Reward the least-reachable fog tile first; never trade away three useful
 // options elsewhere for an artificial guaranteed solution. Strict cap.
 const score=Math.min(5.2,
  weakest*1.05+direct.size*.40+staged*.23-isolated*.28+
  (targets.length===1&&weakest>0?.65:0));
 return {remaining:targets.length,direct:direct.size,staged,isolated,
  weakest,score:Math.max(0,score)};
}
// The first Journey levels are a 4→5-family transition. Let Pacing 3.0
// compare at most two extra *ordinary* bag refills so it can gently prefer
// useful follow-on decisions. There is no new object type, free fusion,
// hidden score bonus, altered goal, or guaranteed winning board.
function pacingProposalCount(level,drought,mode){
 if(!["v3","v31","v311"].includes(mode)||level<10||level>=20)return 4;
 if(level<15)return drought>=3?6:5;
 return drought>=3?5:4;
}
function draftRefill(board,bag,families,nextId,rand){
 const candidate=clone(board),remaining=bag.slice();
 let serial=nextId,placed=0;
 for(let i=0;i<N*N;i++){
  if(candidate[i])continue;
  const family=drawBagFamily(remaining,families,candidate,i,rand);
  candidate[i]={family,stage:1,id:serial++};placed++;
 }
 return {board:candidate,bag:remaining,nextId:serial,placed,
  autoMatches:scan(candidate).length};
}
function seedFor(level){return (Date.now()^((level+1)*2654435761)^Math.floor(Math.random()*0xffffffff))>>>0;}
class Game{
 constructor(index=0,previous=null,options=null){
  this.level=Number.isInteger(index)&&index>=0?index:0;
  this.config=levelConfig(this.level);
  this.familyCount=options?.familyCount===4?4:options?.familyCount===5?5:levelFamilyCount(this.level);
  this.families=activeFamilies(this.level,this.familyCount);
  // The optional deterministic seed is exclusively used by the diagnostics
  // harness. Normal gameplay still uses the original random seedFor(level).
  this.seed=options&&Number.isInteger(options.seed)?options.seed>>>0:seedFor(this.level);
  this.directorMode=options?.directorMode==="v311"?"v311":options?.directorMode==="v31"?"v31":options?.directorMode==="v3"?"v3":options?.directorMode==="v2"?"v2":options?.opportunity===true?"v1":"standard";
  this.opportunity=this.directorMode!=="standard"; // Both Directors are opt-in.
  this.directorRefills=0;this.directorSelections=0;this.directorDrought=0;this.objectiveDrought=0;
  this.paceTimes=[];this.paceOutcomes=[];this.pacePhase="build";this.paceLastMajor=false;
  this.rolls=0;this.random=prng(this.seed);
  this.bag=[];
  // Diagnostics-only fast restore avoids creating an unused random start
  // board for each simulated candidate. Normal start/resume is unchanged.
  this.board=options?.fastRestore&&previous?clone(previous.board):
   startBoard(this.level,()=>this.fresh(),this.families);
  this.nextId=50;
  this.objectiveVersion=2;
  this.objectiveBalanceVersion=1;
  this.mistLayoutVersion=options?.mistLayoutVersion===1?1:2;
  this.mist=this.config.goal.type==="mist"?Array.from({length:49},(_,i)=>Number(mistLayout(this.level,this.config.goal.count,this.mistLayoutVersion).includes(i))):Array(49).fill(0);
  this.mistCleared=0;
  this.moves=this.config.moves;this.score=0;this.fusions=0;this.masterpieces=0;this.familyMasterpieces={};this.collectionBonusTotal=0;
  this.stage3=0;this.stage4=0;this.echoes=0;this.pulseHits=0;this.fours=0;this.shapes=0;this.bestChain=0;
  this.complete=false;this.failed=false;this.rewardVersion=2;this.starsAtGoal=0;this.goalMove=null;this.legacyScoreCompletion=false;
  if(previous){
   Object.assign(this,previous);
   // Existing runs retain their historical rating contract. New plays
   // award one completion star; previous two-/three-star records are never revoked.
   this.rewardVersion=previous.rewardVersion===2?2:1;
   // Continue older score-only Journey saves under their ORIGINAL goal.
   // Freshly started levels receive Objectives 2.0; no existing run is
   // silently converted or has its star/completion requirements changed.
   const isLegacyJourney=this.level>=10&&previous.objectiveVersion!==2;
   this.config=isLegacyJourney?endlessScoreConfig(this.level):levelConfig(this.level);
   this.objectiveVersion=isLegacyJourney?1:2;
   // Old Objective 2.0 saves get the new move budget exactly once,
   // preserving actual moves already spent rather than resetting the run.
   // Legacy score-only sessions keep every original move.
   if(!isLegacyJourney&&this.level>=10&&this.level<20&&
      previous.objectiveBalanceVersion!==1&&!previous.complete&&!previous.failed){
    const oldBudget=endlessScoreConfig(this.level).moves;
    const spent=Math.max(0,oldBudget-(Number(previous.moves)||0));
    this.moves=Math.max(1,this.config.moves-spent);
   }
   this.objectiveBalanceVersion=isLegacyJourney?0:1;
   // Preserving an in-progress mask is intentional: old layouts are not
   // silently moved under an active player, even when nearly complete.
   this.mistLayoutVersion=Number.isInteger(previous.mistLayoutVersion)?previous.mistLayoutVersion:1;
   this.mist=this.objectiveVersion===2&&this.config.goal.type==="mist"&&
    Array.isArray(previous.mist)&&previous.mist.length===49?
    previous.mist.map(v=>v?1:0):
    this.objectiveVersion===2&&this.config.goal.type==="mist"?
    Array.from({length:49},(_,i)=>Number(mistLayout(this.level,this.config.goal.count).includes(i))):Array(49).fill(0);
   this.mistCleared=this.objectiveVersion===2&&this.config.goal.type==="mist"?
    Math.max(0,Math.min(this.config.goal.count,Number(previous.mistCleared)||0)):0;
   if(!isLegacyJourney&&this.level>=10&&this.level<20&&
      this.config.goal.type==="mist"&&previous.objectiveBalanceVersion!==1){
    // Old Mist saves contain only 6–12 fog patches but the new win target
    // can be 9–15. Keep already cleared cells cleared and add just enough
    // NEW patches to make the new objective mathematically achievable.
    const remaining=Math.max(0,this.config.goal.count-this.mistCleared);
    let count=this.mist.filter(Boolean).length;
    if(count>remaining){
     for(let i=48;i>=0&&count>remaining;i--)if(this.mist[i]){this.mist[i]=0;count--;}
    }
    for(const i of mistLayout(this.level,this.config.goal.count)){
     if(count>=remaining)break;
     if(!this.mist[i]){this.mist[i]=1;count++;}
    }
    // Pathological older saves with missing masks still stay winnable.
    for(let i=0;i<49&&count<remaining;i++)if(!this.mist[i]){this.mist[i]=1;count++;}
   }
   // Existing snapshots without a family count are ALWAYS five-family runs.
   this.familyCount=previous.familyCount===4?4:5;
   this.families=activeFamilies(this.level,this.familyCount);
   if(this.config.goal.type==="score"&&previous.complete&&previous.score<this.config.goal.count)
    this.legacyScoreCompletion=true;
   this.directorMode=previous.directorMode==="v311"?"v311":previous.directorMode==="v31"?"v31":previous.directorMode==="v3"?"v3":previous.directorMode==="v2"?"v2":previous.opportunity?"v1":"standard";
   this.opportunity=this.directorMode!=="standard";
   this.directorDrought=Number.isInteger(previous.directorDrought)?Math.max(0,previous.directorDrought):0;
   this.objectiveDrought=Number.isInteger(previous.objectiveDrought)?Math.max(0,Math.min(12,previous.objectiveDrought)):0;
   this.paceTimes=Array.isArray(previous.paceTimes)?previous.paceTimes.filter(t=>Number.isFinite(t)&&t>=0&&t<=90000).slice(-8):[];
   this.paceOutcomes=Array.isArray(previous.paceOutcomes)?previous.paceOutcomes.map(Boolean).slice(-8):[];
   this.pacePhase=["build","flow","relax","recovery"].includes(previous.pacePhase)?previous.pacePhase:"build";
   this.paceLastMajor=!!previous.paceLastMajor;
   this.collectionBonusTotal=this.collectionBonusTotal||0;
   this.familyMasterpieces=this.familyMasterpieces||{};
   this.random=prng(this.seed);for(let i=0;i<this.rolls;i++)this.random();this.board=clone(previous.board);
   // Upgrade an unfinished pre-expansion saved run without discarding the
   // player's moves, stages, score or RNG position. Each obsolete identity is
   // mapped to a family missing from the new level pool, one-to-one, which
   // avoids creating an instant match by merging two old identities.
   const obsolete=[...new Set(this.board.filter(Boolean).map(p=>p.family).filter(f=>!this.families.includes(f)))];
   if(obsolete.length){
    const present=new Set(this.board.filter(Boolean).map(p=>p.family));
    const missing=this.families.filter(f=>!present.has(f));
    const mapping=new Map(obsolete.map((f,i)=>[f,missing[i]||this.families[i%this.families.length]]));
    for(const p of this.board)if(p&&mapping.has(p.family))p.family=mapping.get(p.family);
    this.bag=(this.bag||[]).map(f=>mapping.get(f)||f).filter(f=>this.families.includes(f));
    const remapped={};
    for(const [family,count] of Object.entries(this.familyMasterpieces||{}))
      remapped[mapping.get(family)||family]=(remapped[mapping.get(family)||family]||0)+count;
    this.familyMasterpieces=remapped;
   }
   // Level 8 used to require a rare T/L match. Grant the four added turns
   // once when continuing a pre-change level 8 save; preserve board and progress.
   if(this.level===7&&!previous.level8Revision&&!this.complete&&!this.failed)
    this.moves=Math.min(this.config.moves,Math.max(0,this.moves)+4);
   // Moves Expansion 1.0: continuing older sessions receive their original
   // turn budget once. Preserve existing board, progress and RNG state.
   if(!previous.movesExpansionVersion&&this.moves>0&&!this.failed)
    this.moves=Math.min(this.config.moves,this.moves+this.config.moves/2);
  }
  this.level8Revision=this.level===7?1:0;
  this.movesExpansionVersion=1;
 }
 fresh(){this.rolls++;return this.random();}
 nextFamily(board=null,index=-1){
  return drawBagFamily(this.bag,this.families,board,index,()=>this.fresh());
 }
 refillOpportunity(){
  const vacancies=this.board.filter(p=>!p).length;
  if(!vacancies)return;
  // Candidate zero is EXACTLY the 5.3 standard refill, consuming the
  // ordinary RNG stream. Alternative candidate RNGs fork independently from
  // this turn's existing seed/roll counter, without advancing that stream.
  // As long as Director chooses candidate zero, both engines remain identical.
  const baseline=draftRefill(this.board,this.bag,this.families,
   this.nextId,()=>this.fresh());
  const candidates=[baseline];
  const fork=(this.seed^Math.imul(this.rolls+1,0x85ebca6b)^
   Math.imul(this.nextId+1,0x9e3779b1))>>>0;
  for(let c=1;c<pacingProposalCount(this.level,this.directorDrought,this.directorMode);c++){
   const seed=(fork^Math.imul(c,0x9e3779b1))>>>0;
   candidates.push(draftRefill(this.board,this.bag,this.families,
    this.nextId,prng(seed)));
  }
  let selected=baseline;
  // Preserve the existence of automatic chain reactions in baseline random
  // outcome. Only compare alternative boards when baseline has NO free match.
  if(baseline.autoMatches===0){
   const isV2=["v2","v3","v31","v311"].includes(this.directorMode);
   const isV3=["v3","v31","v311"].includes(this.directorMode);
   const metric=board=>{
    if(!isV2)return opportunityMetrics(board,this.config.goal);
    const m=opportunityMetricsV2(board,this.config.goal,this.directorDrought);
    if(!isV3)return m;
    const base=pacingOpportunityScore(m,this.pacePhase);
    if(this.directorMode!=="v31"&&this.directorMode!=="v311")return {...m,score:base};
    const aware=objectiveAwarenessMetrics(board,this.config.goal,this.mist);
    // Bounded bonus, no guaranteed win and no excessive recovery cheating.
    const pressure=Math.min(1,this.objectiveDrought/5);
    const endgame=this.directorMode==="v311"&&this.config.goal.type==="mist"?
     endgameMistMetrics(board,this.mist):null;
    // Endgame only affects the final 1–3 fog tiles; normal 3.1 is
    // byte-for-byte identical everywhere else. No candidate may give an
    // extra move, cleanse mist, or manufacture a match.
    const urgency=endgame?.remaining<=3&&endgame?.remaining>0?
     .80+Math.min(1,this.objectiveDrought/6)*.20:0;
    return {...m,objective:aware,endgame,
     score:base+aware.score*(.72+pressure*.18)+
      (endgame?endgame.score*urgency:0)};
   };
   let best=metric(baseline.board).score;
   // 2.0 intervenes conservatively (>=1.5 score advantage); it can increase
   // pressure after several turns without evolved-stage progress.
   const threshold=["v31","v311"].includes(this.directorMode)?(this.pacePhase==="relax"?3.0:2.2):
    isV3&&this.pacePhase==="relax"?2.8:
    isV2?(this.directorDrought>=3?1.1:1.5):.8;
   for(const candidate of candidates.slice(1)){
    if(candidate.autoMatches!==0)continue;
    const value=metric(candidate.board).score;
    if(value>best+threshold){best=value;selected=candidate;}
   }
  }
  this.board=selected.board;
  this.bag=selected.bag;
  this.nextId=selected.nextId;
  this.directorRefills=(this.directorRefills||0)+1;
  if(selected!==baseline)this.directorSelections=(this.directorSelections||0)+1;
 }
 target(){return this.config.goal.count;}
 clearMist(positions){
  if(this.config.goal.type!=="mist")return [];
  const cleared=[];
  for(const i of new Set(positions))if(Number.isInteger(i)&&i>=0&&i<49&&this.mist[i]){
   this.mist[i]=0;this.mistCleared++;cleared.push(i);
  }
  return cleared;
 }
 progress(){
  let g=this.config.goal;
  switch(g.type){case"mist":return this.mistCleared;case"score":return this.score;case"fusion":return this.fusions;case"stage3":return this.stage3;case"stage4":return this.stage4;case"masterpiece":return this.masterpieces;case"pulseHits":return this.pulseHits;case"familyMasterpiece":return this.familyMasterpieces[g.family]||0;case"four":return this.fours;case"shape":return this.shapes;case"chain":return this.bestChain;default:return 0;}
 }
 goalText(){
  let g=this.config.goal;
  return ({mist:"Rena dimman",score:"Poängmål",fusion:"Fusioner",stage3:"Föremål till stadium 3",stage4:"Föremål till stadium 4",masterpiece:"Mästerverk",pulseHits:"Harmony-förädlingar",familyMasterpiece:"Lyktmästerverk",four:"Fyrmatchningar",shape:"T-/L-matchningar",chain:"Mästerverk i en kedja"})[g.type]||"Mål";
 }
 fulfilled(){return this.progress()>=this.target();}
 stars(){
  if(this.rewardVersion===2)return this.complete?1:0;
  if(this.config.goal.type==="score"){
   return scoreStars(this.level,this.score,this.complete&&this.legacyScoreCompletion);
  }
  return this.starsAtGoal||0;
 }
 frame(type,extra={}){return {type,board:clone(this.board),mist:this.mist.slice(),mistCleared:this.mistCleared,moves:this.moves,score:this.score,fusions:this.fusions,masterpieces:this.masterpieces,familyMasterpieces:{...this.familyMasterpieces},collectionBonusTotal:this.collectionBonusTotal,echoes:this.echoes,goal:this.progress(),complete:this.complete,failed:this.failed,...extra};}
 markStage(p){if(p.stage===3)this.stage3++;if(p.stage===4)this.stage4++;}
 grow(i,created,indirect){
  const p=this.board[i];if(!p||p.stage>=5)return false;
  p.stage++;this.markStage(p);
  if(p.stage===5)created.add(i);
  return true;
 }
 // Fusion Destination Control 1.0: player-driven first-wave matches land on
 // the swapped destination when it belongs to a match. A match formed only
 // at the swapped source lands there. Cascades keep the strongest-stage rule.
 resolve(preferred,armedLinks=[],alternate=-1){
  let events=[],waveRound=0,echoAwarded=false;
  while(waveRound++<35){
   let groups=scan(this.board);if(!groups.length)break;
   let created=new Set(),indirect=new Set(),records=[],shapeCount=0,earned=0;
   // Only the first player-triggered wave may consume a pre-existing link.
   // Resolve against immutable IDs before any matched piece is removed.
   let echoCandidate=null;
   if(waveRound===1&&armedLinks.length){
    for(const indices of groups){
     const ids=new Set(indices.map(i=>this.board[i]?.id));
     const matched=armedLinks.filter(link=>ids.has(link.anchorId)&&ids.has(link.partnerId));
     if(matched.length){
      const strongest=matched.sort((a,b)=>b.stage-a.stage||a.anchor-b.anchor)[0];
      if(!echoCandidate||strongest.stage>echoCandidate.link.stage){
       echoCandidate={link:strongest,indices:indices.slice()};
      }
     }
    }
   }
   for(const indices of groups){
    // The maximum stage determines the result, not the fusion destination.
    // Preserve that piece's identity through the merge (and through save/FX).
    const strongest=indices.slice().sort((a,b)=>
     this.board[b].stage-this.board[a].stage||a-b)[0];
    const playerDestination=waveRound===1?
     (indices.includes(preferred)?preferred:indices.includes(alternate)?alternate:-1):-1;
    const destination=playerDestination>=0?playerDestination:strongest;
    const p=this.board[strongest],before=p.stage;
    const rows=new Set(indices.map(i=>Math.floor(i/N))),cols=new Set(indices.map(i=>i%N));
    const shape=indices.length>=5&&rows.size>1&&cols.size>1;
    if(shape){this.shapes++;shapeCount++;}
    const number=indices.length;
    if(number>=4)this.fours++;
    for(const i of indices)if(i!==destination)this.board[i]=null;
    this.board[destination]=p; // A stronger piece can travel to the selected cell.
    this.grow(destination,created,false);this.fusions++;
    let pts=(number===3?100:number===4?175:300+(number-5)*60)+(p.stage>=4?100:0);
    pts=Math.round(pts*(1+Math.min(3,waveRound-1)*.25));earned+=pts;
    records.push({at:destination,origin:strongest,from:before,to:p.stage,family:p.family,
     removed:indices.filter(i=>i!==destination),number,shape,points:pts});
   }
   // Mist belongs to fixed CELLS: only the actual fusion survivor/output
   // position can cleanse it. Consumed pieces and crossed tiles do not count.
   // Every cascade fusion uses the same rule. Harmony Pulse also clears
   // cells it actually hits; bonus upgrades do not clear mist.
   const clearedMist=this.clearMist(records.map(record=>record.at));
   this.score+=earned;events.push(this.frame("fusion",{groups:records,round:waveRound,clearedMist,scoreDelta:earned}));
   if(!echoAwarded&&echoCandidate){
    const record=records.find(record=>echoCandidate.indices.includes(record.at));
    if(record){
     const points=echoCandidate.link.stage===4?200:125;
     this.score+=points;this.echoes++;echoAwarded=true;
     events.push(this.frame("echo",{
      at:record.at,family:record.family,stage:echoCandidate.link.stage,
      anchorId:echoCandidate.link.anchorId,partnerId:echoCandidate.link.partnerId,
      scoreDelta:points
     }));
    }
   }
   // Bonus follows all direct fusions, never the cells that have just been removed.
   let bonuses=[],unused=0;
   for(const record of records){
    let count=record.number===4?1:record.number>=5?2:0;
    let eligible=neighbors(record.at).filter(i=>this.board[i]&&this.board[i].stage<5&&!indirect.has(i));
    eligible.sort((a,b)=>this.board[b].stage-this.board[a].stage||neighbors(record.at).indexOf(a)-neighbors(record.at).indexOf(b));
    for(const i of eligible.slice(0,count))if(this.grow(i,created,true)){indirect.add(i);bonuses.push({from:record.at,to:i,stage:this.board[i].stage});}
    unused+=Math.max(0,count-Math.min(count,eligible.length));
   }
   if(bonuses.length||unused){let pts=bonuses.length*75+unused*35;this.score+=pts;events.push(this.frame("bonus",{targets:bonuses,unused,scoreDelta:pts}));}
   if(created.size){
    let all=new Set(created),active=[...created],pulsed=new Set(),wave=0,chainHits=0;
    events.push(this.frame("hero",{positions:active}));
    while(active.length&&wave++<49){
     let targets=[],next=[];
     for(const source of active){
      if(pulsed.has(source))continue;pulsed.add(source);
      for(const to of neighbors(source)){
       if(indirect.has(to)||!this.board[to]||this.board[to].stage===5)continue;
       indirect.add(to);this.grow(to,all,true);targets.push({from:source,to,stage:this.board[to].stage});
       if(this.board[to].stage===5)next.push(to);
      }
     }
     if(targets.length){
      // Pulse cleanses fog on the occupied neighbour tiles it actually hits.
      const clearedMist=this.clearMist(targets.map(target=>target.to));
      chainHits+=targets.length;this.pulseHits+=targets.length;
      let points=targets.length*75;this.score+=points;
      events.push(this.frame("pulse",{sources:active,targets,wave,clearedMist,scoreDelta:points}));
     }
     if(next.length)events.push(this.frame("hero",{positions:next}));
     active=[...new Set(next)];
    }
    const newCounts=[];
    for(const i of all){
     const p=this.board[i];if(!p||p.stage!==5)continue;
     const count=(this.familyMasterpieces[p.family]||0)+1;
     this.familyMasterpieces[p.family]=count;this.board[i]=null;this.masterpieces++;
     newCounts.push({family:p.family,count,at:i,points:Math.min(1200,
      [0,100,200,350,550,800][count]??800+Math.min(400,(count-5)*80))});
    }
    this.bestChain=Math.max(this.bestChain,all.size);
    const points=all.size*500+Math.max(0,all.size-1)*250;this.score+=points;
    events.push(this.frame("harvest",{positions:[...all],chain:all.size,pulseHits:chainHits,scoreDelta:points}));
    if(newCounts.length){
     const collectedPoints=newCounts.reduce((total,entry)=>total+entry.points,0);
     this.collectionBonusTotal+=collectedPoints;
     this.score+=collectedPoints;
     events.push(this.frame("collection",{awards:newCounts,scoreDelta:collectedPoints}));
    }
   }
   // Gravity and controlled stage-one refills only after all Harmony waves have finished.
   for(let c=0;c<N;c++){
    let keep=[];for(let r=N-1;r>=0;r--)if(this.board[r*N+c])keep.push(this.board[r*N+c]);
    for(let r=N-1;r>=0;r--)this.board[r*N+c]=keep[N-1-r]||null;
   }
   if(this.opportunity)this.refillOpportunity();
   else for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    let i=r*N+c;if(this.board[i])continue;
    const family=this.nextFamily(this.board,i);
    this.board[i]={family,stage:1,id:this.nextId++};
   }
   events.push(this.frame("fall",{round:waveRound}));preferred=-1;
  }
  if(!validSwaps(this.board).length){
   this.board=fairShuffle(this.board,()=>this.fresh());
   events.push(this.frame("shuffle"));
  }
  if(!this.complete&&this.fulfilled()){
   this.complete=true;this.goalMove=this.config.moves-this.moves;
   this.starsAtGoal=this.rewardVersion===2?1:
     this.config.goal.type==="score"?this.stars():this.goalMove<=this.config.par?3:this.goalMove<=this.config.par+4?2:1;
   events.push(this.frame("goal",{stars:this.starsAtGoal}));
  }
  if(this.moves<=0){this.failed=!this.complete;events.push(this.frame(this.complete?"end":"lose",{stars:this.stars()}));}
  return events;
 }
 swap(a,b,options=null){
  if(this.moves<=0||this.failed)return {ok:false,reason:"Nivån är avslutad"};
  if(!Number.isInteger(a)||!Number.isInteger(b)||!neighbors(a).includes(b))return {ok:false,reason:"Välj två intilliggande föremål"};
  const armed=resonanceLinks(this.board);
  [this.board[a],this.board[b]]=[this.board[b],this.board[a]];
  if(!scan(this.board).some(g=>g.includes(a)||g.includes(b))){
   [this.board[a],this.board[b]]=[this.board[b],this.board[a]];
   return {ok:false,reason:"Bytet behöver skapa minst tre i samma familj"};
  }
  if(["v3","v31","v311"].includes(this.directorMode)){
   const ms=options?.decisionMs;
   // Ignore interruptions, background sleep and idle gaps beyond 90s.
   if(Number.isFinite(ms)&&ms>=0&&ms<=90000){
    this.paceTimes.push(Math.round(ms));this.paceTimes=this.paceTimes.slice(-8);
   }
   this.pacePhase=pacingPhase(this.paceTimes,this.paceOutcomes,
    this.directorDrought,this.paceLastMajor);
  }
  // Arm only resonances that existed BEFORE this player's legal move.
  // Fresh matches, free gravity cascades and Harmony Pulse cannot farm Echo.
  // Pairs are located by persistent object IDs, not original slot indices.
  const beforeStage3=this.stage3,beforeStage4=this.stage4,beforeMasterpiece=this.masterpieces;
  const beforeEcho=this.echoes,beforePulse=this.pulseHits,beforeObjective=this.progress();
  this.moves--;
  const events=[this.frame("swap",{from:a,to:b}),...this.resolve(b,armed,a)];
  // Update drought ONCE per player move, not per cascade wave; never use score
  // progress because score-based levels gain points on virtually every turn.
  if(["v2","v3","v31","v311"].includes(this.directorMode)){
   const advanced=this.stage3>beforeStage3||this.stage4>beforeStage4||
    this.masterpieces>beforeMasterpiece||this.echoes>beforeEcho||this.pulseHits>beforePulse;
   this.directorDrought=advanced?0:Math.min(12,this.directorDrought+1);
   if(["v3","v31","v311"].includes(this.directorMode)){
    const objectiveAdvanced=this.progress()>beforeObjective;
    if(["v31","v311"].includes(this.directorMode))this.objectiveDrought=objectiveAdvanced?0:
     Math.min(12,this.objectiveDrought+1);
    this.paceOutcomes.push(advanced||(["v31","v311"].includes(this.directorMode)&&objectiveAdvanced));
    this.paceOutcomes=this.paceOutcomes.slice(-8);
    const major=this.masterpieces>beforeMasterpiece||this.echoes>beforeEcho||this.pulseHits>beforePulse;
    this.paceLastMajor=major;
    this.pacePhase=pacingPhase(this.paceTimes,this.paceOutcomes,this.directorDrought,major);
   }
  }
  return {ok:true,events};
 }
 finish(){if(!this.complete)return false;this.moves=0;return true;}
 save(){return {rewardVersion:this.rewardVersion,objectiveVersion:this.objectiveVersion,objectiveBalanceVersion:this.objectiveBalanceVersion,mistLayoutVersion:this.mistLayoutVersion,mist:this.mist.slice(),mistCleared:this.mistCleared,familyCount:this.familyCount,board:clone(this.board),moves:this.moves,score:this.score,seed:this.seed,rolls:this.rolls,bag:this.bag.slice(),nextId:this.nextId,opportunity:this.opportunity,directorMode:this.directorMode,directorDrought:this.directorDrought||0,paceTimes:this.paceTimes.slice(),paceOutcomes:this.paceOutcomes.slice(),pacePhase:this.pacePhase,paceLastMajor:this.paceLastMajor,objectiveDrought:this.objectiveDrought,directorRefills:this.directorRefills||0,directorSelections:this.directorSelections||0,fusions:this.fusions,masterpieces:this.masterpieces,familyMasterpieces:{...this.familyMasterpieces},collectionBonusTotal:this.collectionBonusTotal,stage3:this.stage3,stage4:this.stage4,echoes:this.echoes,pulseHits:this.pulseHits,fours:this.fours,shapes:this.shapes,bestChain:this.bestChain,complete:this.complete,failed:this.failed,starsAtGoal:this.starsAtGoal,goalMove:this.goalMove,legacyScoreCompletion:this.legacyScoreCompletion,level8Revision:this.level8Revision,movesExpansionVersion:this.movesExpansionVersion};}
}
// Smart Idle Hint 1.2: evaluate the game's REAL deterministic outcome for
// each legal move in a cloned, non-destructive Game instance. Reward immediate
// points, progress toward the objective, higher evolution, Masterpieces, Echo,
// and Pulse; never choose randomly just because a move is technically legal.
//
// Hints must not consume moves, random rolls, saved state, or award score.
// Deliberately a one-move assessment: does not play the level for the user.
function bestHint(game){
 if(!game||!game.board||game.board.length!==N*N||game.moves<=0||game.failed)return null;
 const legal=validSwaps(game.board);
 if(!legal.length)return null;
 let best=null;
 const previousProgress=game.progress();
 for(const pair of legal){
  const hint=directedHint(game.board,pair);
  if(!hint)continue;
  // New snapshot for EACH trial: the preview's bag and RNG must be isolated
  // from the real game and other candidate previews.
  const trial=new Game(game.level,game.save(),{fastRestore:true});
  // Use the SAME direction presented by the hint: destination controls
  // first-wave placement, bonuses, Pulse origin and fog-clearing progress.
  const result=trial.swap(hint.from,hint.to);
  if(!result.ok)continue;
  const points=trial.score-game.score;
  const made=trial.masterpieces-game.masterpieces;
  const stage4=trial.stage4-game.stage4;
  const stage3=trial.stage3-game.stage3;
  const echo=trial.echoes-game.echoes;
  const pulse=trial.pulseHits-game.pulseHits;
  const goalProgress=Math.max(0,trial.progress()-previousProgress);
  // For score levels, points ARE the objective; never double-count them.
  const goalWeight=game.config.goal.type==="score"?0:450;
  const value=points+made*1100+stage4*350+stage3*150+
   echo*200+pulse*55+goalProgress*goalWeight;
  const sourceStage=game.board[hint.from]?.stage||0;
  // Stable tie-break favors moving the LESS evolved object; it leaves a
  // mature piece in position when equivalent swaps give the same outcome.
  const candidate={...hint,pair:pair.slice(),value,expectedPoints:points,
   goalProgress,made,stage4,stage3,echo,pulse,sourceStage};
  if(!best||candidate.value>best.value||
   (candidate.value===best.value&&candidate.sourceStage<best.sourceStage)||
   (candidate.value===best.value&&candidate.sourceStage===best.sourceStage&&
    (candidate.from<best.from||(candidate.from===best.from&&candidate.to<best.to))))best=candidate;
 }
 return best;
}
function wouldMatchAt(board,i,f){let r=Math.floor(i/N),c=i%N,match=(row,col)=>row>=0&&row<N&&col>=0&&col<N&&board[row*N+col]&&board[row*N+col].family===f;return match(r,c-1)&&match(r,c-2)||match(r,c+1)&&match(r,c+2)||match(r,c-1)&&match(r,c+1)||match(r-1,c)&&match(r-2,c)||match(r+1,c)&&match(r+2,c)||match(r-1,c)&&match(r+1,c);}
const api={Game,levels,levelConfig,endlessConfig,legacyScoreConfig:endlessScoreConfig,scoreStars,levelFamilyCount,pacingProposalCount,families:ALL,levelFamilies:LEVEL_FAMILIES,activeFamilies,scan,neighbors,validSwaps,directedHint,bestHint,startBoard,fairShuffle,opportunityMetrics,opportunityMetricsV2,pacingPhase,pacingOpportunityScore,objectiveAwarenessMetrics,endgameMistMetrics,mistLayout,resonanceLinks};
root.HarmonyRules=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
