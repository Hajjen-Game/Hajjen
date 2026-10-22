/* Japanese Harmony puzzle rules 2.0 — pure match logic, no rendering dependencies. */
(function(root){
"use strict";
const N=7, ALL=["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"];
// Five active families per level, never all nine at once. The complete
// collection has appeared by level 3, and continues rotating through level 10.
// This is a fixed per-level identity so retry and save/resume are predictable.
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
function activeFamilies(index){return index<LEVEL_FAMILIES.length?LEVEL_FAMILIES[index].slice():endlessFamilies(index);}
const levels=[
 {name:"First Match",subtitle:"Början på resan",moves:12,par:7,goal:{type:"fusion",count:5},intro:"Byt två grannar och matcha tre föremål av samma familj."},
 {name:"Growing Beauty",subtitle:"Fem steg till ett mästerverk",moves:18,par:10,goal:{type:"stage3",count:3},intro:"Samma familj kan matchas oavsett utvecklingsstadium. Få tre föremål till stadium 3."},
 {name:"The Survivor",subtitle:"Välj den rätta vägen",moves:16,par:9,goal:{type:"stage4",count:1},intro:"Föremålet med högst stadium överlever på sin plats. Odla fram stadium 4."},
 {name:"First Masterpiece",subtitle:"Skapa något extraordinärt",moves:18,par:10,goal:{type:"masterpiece",count:1},intro:"Förädla ett föremål till stadium 5 för att skapa ditt första mästerverk."},
 {name:"Harmony Awakens",subtitle:"Låt utvecklingen sprida sig",moves:18,par:11,goal:{type:"pulseHits",count:3},intro:"Harmony Pulse utvecklar upptagna rutor ovanför, nedanför och vid sidan av mästerverket."},
 {name:"Lantern Festival",subtitle:"Varmt ljus i natten",moves:20,par:12,goal:{type:"familyMasterpiece",family:"lantern",count:1},intro:"Skapa ett mästerverk från lykta-familjen. Övriga mästerverk ger fortfarande poäng."},
 {name:"Four of a Kind",subtitle:"Den fjärde gör skillnad",moves:18,par:11,goal:{type:"four",count:1},intro:"Matcha minst fyra i en fusion. En granne förädlas som bonus."},
 {name:"Garden in Bloom",subtitle:"Fem utvecklade föremål",moves:20,par:12,goal:{type:"stage3",count:5},intro:"Utveckla fem föremål till stadium 3 med vanliga fusioner. T- och L-former är bonusar, inte ett krav."},
 {name:"Double Harmony",subtitle:"Varje mästerverk räknas",moves:20,par:12,goal:{type:"masterpiece",count:2},intro:"Skapa två mästerverk under nivån. Harmony Pulse-kedjor ger fortfarande extra poäng."},
 {name:"Master of Harmony",subtitle:"Första kapitlets final",moves:24,par:15,goal:{type:"masterpiece",count:3},intro:"Skapa tre mästerverk på en och samma nivå."}
];
// A level number is enough to recreate its configuration. This is the one
// reusable level recipe for all stages after the 10-level tutorial.
function endlessConfig(index){
 const number=index+1,tier=Math.floor((index-10)/10);
 const moves=Math.max(17,22-((index-10)%5)-Math.floor(tier/4));
 // First 50 steadily teach score play; beyond that, logarithmic growth avoids
 // making very high stage numbers mathematically unwinnable.
 const distance=Math.max(0,index-49);
 const target=Math.round((1600+Math.min(39,index-10)*83+
  Math.floor(Math.min(39,index-10)/20)*140+Math.log2(1+distance/8)*175)/50)*50;
 return {name:"Harmony Journey",subtitle:"Poängjakt · bana "+number,moves,par:0,
  goal:{type:"score",count:target},stars:[target,Math.round(target*1.4/50)*50,Math.round(target*1.85/50)*50],
  intro:"Samla poäng genom fusioner, mästerverk och Harmony Pulse. Högre poäng ger fler stjärnor."};
}
function levelConfig(index){return levels[index]||endlessConfig(index);}
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
  this.config=levelConfig(this.level);this.families=activeFamilies(this.level);
  // The optional deterministic seed is exclusively used by the diagnostics
  // harness. Normal gameplay still uses the original random seedFor(level).
  this.seed=options&&Number.isInteger(options.seed)?options.seed>>>0:seedFor(this.level);
  this.directorMode=options?.directorMode==="v2"?"v2":options?.opportunity===true?"v1":"standard";
  this.opportunity=this.directorMode!=="standard"; // Both Directors are opt-in.
  this.directorRefills=0;this.directorSelections=0;this.directorDrought=0;
  this.rolls=0;this.random=prng(this.seed);
  this.bag=[];
  // Diagnostics-only fast restore avoids creating an unused random start
  // board for each simulated candidate. Normal start/resume is unchanged.
  this.board=options?.fastRestore&&previous?clone(previous.board):
   startBoard(this.level,()=>this.fresh(),this.families);
  this.nextId=50;
  this.moves=this.config.moves;this.score=0;this.fusions=0;this.masterpieces=0;this.familyMasterpieces={};this.collectionBonusTotal=0;
  this.stage3=0;this.stage4=0;this.echoes=0;this.pulseHits=0;this.fours=0;this.shapes=0;this.bestChain=0;
  this.complete=false;this.failed=false;this.starsAtGoal=0;this.goalMove=null;
  if(previous){
   Object.assign(this,previous);this.config=levelConfig(this.level);this.families=activeFamilies(this.level);
   this.directorMode=previous.directorMode==="v2"?"v2":previous.opportunity?"v1":"standard";
   this.opportunity=this.directorMode!=="standard";
   this.directorDrought=Number.isInteger(previous.directorDrought)?Math.max(0,previous.directorDrought):0;
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
  }
  this.level8Revision=this.level===7?1:0;
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
  for(let c=1;c<4;c++){
   const seed=(fork^Math.imul(c,0x9e3779b1))>>>0;
   candidates.push(draftRefill(this.board,this.bag,this.families,
    this.nextId,prng(seed)));
  }
  let selected=baseline;
  // Preserve the existence of automatic chain reactions in baseline random
  // outcome. Only compare alternative boards when baseline has NO free match.
  if(baseline.autoMatches===0){
   const isV2=this.directorMode==="v2";
   const metric=board=>isV2?opportunityMetricsV2(board,this.config.goal,this.directorDrought):
    opportunityMetrics(board,this.config.goal);
   let best=metric(baseline.board).score;
   // 2.0 intervenes conservatively (>=1.5 score advantage); it can increase
   // pressure after several turns without evolved-stage progress.
   const threshold=isV2?(this.directorDrought>=3?1.1:1.5):.8;
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
 progress(){
  let g=this.config.goal;
  switch(g.type){case"score":return this.score;case"fusion":return this.fusions;case"stage3":return this.stage3;case"stage4":return this.stage4;case"masterpiece":return this.masterpieces;case"pulseHits":return this.pulseHits;case"familyMasterpiece":return this.familyMasterpieces[g.family]||0;case"four":return this.fours;case"shape":return this.shapes;case"chain":return this.bestChain;default:return 0;}
 }
 goalText(){
  let g=this.config.goal;
  return ({score:"Poängmål",fusion:"Fusioner",stage3:"Föremål till stadium 3",stage4:"Föremål till stadium 4",masterpiece:"Mästerverk",pulseHits:"Harmony-förädlingar",familyMasterpiece:"Lyktmästerverk",four:"Fyrmatchningar",shape:"T-/L-matchningar",chain:"Mästerverk i en kedja"})[g.type]||"Mål";
 }
 fulfilled(){return this.progress()>=this.target();}
 stars(){
  if(this.config.goal.type==="score"){
   const thresholds=this.config.stars;
   return this.score>=thresholds[2]?3:this.score>=thresholds[1]?2:this.score>=thresholds[0]?1:0;
  }
  return this.starsAtGoal||0;
 }
 frame(type,extra={}){return {type,board:clone(this.board),moves:this.moves,score:this.score,fusions:this.fusions,masterpieces:this.masterpieces,familyMasterpieces:{...this.familyMasterpieces},collectionBonusTotal:this.collectionBonusTotal,echoes:this.echoes,goal:this.progress(),complete:this.complete,failed:this.failed,...extra};}
 markStage(p){if(p.stage===3)this.stage3++;if(p.stage===4)this.stage4++;}
 grow(i,created,indirect){
  const p=this.board[i];if(!p||p.stage>=5)return false;
  p.stage++;this.markStage(p);
  if(p.stage===5)created.add(i);
  return true;
 }
 resolve(preferred,armedLinks=[]){
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
    let survivor=indices.slice().sort((a,b)=>this.board[b].stage-this.board[a].stage||(a===preferred?-1:b===preferred?1:a-b))[0];
    let p=this.board[survivor],before=p.stage;
    let rows=new Set(indices.map(i=>Math.floor(i/N))),cols=new Set(indices.map(i=>i%N));
    let shape=indices.length>=5&&rows.size>1&&cols.size>1;
    if(shape){this.shapes++;shapeCount++;}
    let number=indices.length;
    if(number>=4)this.fours++;
    for(const i of indices)if(i!==survivor)this.board[i]=null;
    this.grow(survivor,created,false);this.fusions++;
    let pts=(number===3?100:number===4?175:300+(number-5)*60)+(p.stage>=4?100:0);
    pts=Math.round(pts*(1+Math.min(3,waveRound-1)*.25));earned+=pts;
    records.push({at:survivor,from:before,to:p.stage,family:p.family,removed:indices.filter(i=>i!==survivor),number,shape,points:pts});
   }
   this.score+=earned;events.push(this.frame("fusion",{groups:records,round:waveRound,scoreDelta:earned}));
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
     if(targets.length){chainHits+=targets.length;this.pulseHits+=targets.length;let points=targets.length*75;this.score+=points;events.push(this.frame("pulse",{sources:active,targets,wave,scoreDelta:points}));}
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
   this.starsAtGoal=this.config.goal.type==="score"?this.stars():this.goalMove<=this.config.par?3:this.goalMove<=this.config.par+4?2:1;
   events.push(this.frame("goal",{stars:this.starsAtGoal}));
  }
  if(this.moves<=0){this.failed=!this.complete;events.push(this.frame(this.complete?"end":"lose",{stars:this.stars()}));}
  return events;
 }
 swap(a,b){
  if(this.moves<=0||this.failed)return {ok:false,reason:"Nivån är avslutad"};
  if(!Number.isInteger(a)||!Number.isInteger(b)||!neighbors(a).includes(b))return {ok:false,reason:"Välj två intilliggande föremål"};
  const armed=resonanceLinks(this.board);
  [this.board[a],this.board[b]]=[this.board[b],this.board[a]];
  if(!scan(this.board).some(g=>g.includes(a)||g.includes(b))){
   [this.board[a],this.board[b]]=[this.board[b],this.board[a]];
   return {ok:false,reason:"Bytet behöver skapa minst tre i samma familj"};
  }
  // Arm only resonances that existed BEFORE this player's legal move.
  // Fresh matches, free gravity cascades and Harmony Pulse cannot farm Echo.
  // Pairs are located by persistent object IDs, not original slot indices.
  const beforeStage3=this.stage3,beforeStage4=this.stage4,beforeMasterpiece=this.masterpieces;
  const beforeEcho=this.echoes,beforePulse=this.pulseHits;
  this.moves--;
  const events=[this.frame("swap",{from:a,to:b}),...this.resolve(b,armed)];
  // Update drought ONCE per player move, not per cascade wave; never use score
  // progress because score-based levels gain points on virtually every turn.
  if(this.directorMode==="v2"){
   const advanced=this.stage3>beforeStage3||this.stage4>beforeStage4||
    this.masterpieces>beforeMasterpiece||this.echoes>beforeEcho||this.pulseHits>beforePulse;
   this.directorDrought=advanced?0:Math.min(12,this.directorDrought+1);
  }
  return {ok:true,events};
 }
 finish(){if(!this.complete)return false;this.moves=0;return true;}
 save(){return {board:clone(this.board),moves:this.moves,score:this.score,seed:this.seed,rolls:this.rolls,bag:this.bag.slice(),nextId:this.nextId,opportunity:this.opportunity,directorMode:this.directorMode,directorDrought:this.directorDrought||0,directorRefills:this.directorRefills||0,directorSelections:this.directorSelections||0,fusions:this.fusions,masterpieces:this.masterpieces,familyMasterpieces:{...this.familyMasterpieces},collectionBonusTotal:this.collectionBonusTotal,stage3:this.stage3,stage4:this.stage4,echoes:this.echoes,pulseHits:this.pulseHits,fours:this.fours,shapes:this.shapes,bestChain:this.bestChain,complete:this.complete,failed:this.failed,starsAtGoal:this.starsAtGoal,goalMove:this.goalMove,level8Revision:this.level8Revision};}
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
  // Use the SAME direction presented by the hint: preferred destination
  // can change the fusion survivor, bonus placement, cascades and points.
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
const api={Game,levels,levelConfig,endlessConfig,families:ALL,levelFamilies:LEVEL_FAMILIES,activeFamilies,scan,neighbors,validSwaps,directedHint,bestHint,startBoard,fairShuffle,opportunityMetrics,opportunityMetricsV2,resonanceLinks};
root.HarmonyRules=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
