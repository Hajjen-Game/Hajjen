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
function activeFamilies(index){return (LEVEL_FAMILIES[index]||LEVEL_FAMILIES.at(-1)).slice();}
const levels=[
 {name:"First Match",subtitle:"Början på resan",moves:12,par:7,goal:{type:"fusion",count:5},intro:"Byt två grannar och matcha tre föremål av samma familj."},
 {name:"Growing Beauty",subtitle:"Fem steg till ett mästerverk",moves:18,par:10,goal:{type:"stage3",count:3},intro:"Samma familj kan matchas oavsett utvecklingsstadium. Få tre föremål till stadium 3."},
 {name:"The Survivor",subtitle:"Välj den rätta vägen",moves:16,par:9,goal:{type:"stage4",count:1},intro:"Föremålet med högst stadium överlever på sin plats. Odla fram stadium 4."},
 {name:"First Masterpiece",subtitle:"Skapa något extraordinärt",moves:18,par:10,goal:{type:"masterpiece",count:1},intro:"Förädla ett föremål till stadium 5 för att skapa ditt första mästerverk."},
 {name:"Harmony Awakens",subtitle:"Låt utvecklingen sprida sig",moves:18,par:11,goal:{type:"pulseHits",count:3},intro:"Harmony Pulse utvecklar upptagna rutor ovanför, nedanför och vid sidan av mästerverket."},
 {name:"Lantern Festival",subtitle:"Varmt ljus i natten",moves:22,par:15,goal:{type:"familyMasterpiece",family:"lantern",count:2},intro:"Skapa två mästerverk från lykta-familjen."},
 {name:"Four of a Kind",subtitle:"Den fjärde gör skillnad",moves:18,par:11,goal:{type:"four",count:1},intro:"Matcha minst fyra i en fusion. En granne förädlas som bonus."},
 {name:"Beautiful Shapes",subtitle:"T och L är också matcher",moves:16,par:10,goal:{type:"shape",count:1},intro:"Skapa en T- eller L-matchning. Fem unika föremål ger två grannuppgraderingar."},
 {name:"Double Harmony",subtitle:"Förbered kedjan",moves:20,par:12,goal:{type:"chain",count:2},intro:"Skapa två mästerverk i samma Harmony Pulse-kedja."},
 {name:"Master of Harmony",subtitle:"Första kapitlets final",moves:24,par:15,goal:{type:"masterpiece",count:3},intro:"Skapa tre mästerverk på en och samma nivå."}
];
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
function seedFor(level){return (Date.now()^((level+1)*2654435761)^Math.floor(Math.random()*0xffffffff))>>>0;}
class Game{
 constructor(index=0,previous=null){
  this.level=Math.max(0,Math.min(levels.length-1,index));
  this.config=levels[this.level];this.families=activeFamilies(this.level);
  this.seed=seedFor(this.level);this.rolls=0;this.random=prng(this.seed);
  this.bag=[];this.board=startBoard(this.level,()=>this.fresh(),this.families);this.nextId=50;
  this.moves=this.config.moves;this.score=0;this.fusions=0;this.masterpieces=0;this.familyMasterpieces={};
  this.stage3=0;this.stage4=0;this.pulseHits=0;this.fours=0;this.shapes=0;this.bestChain=0;
  this.complete=false;this.failed=false;this.starsAtGoal=0;this.goalMove=null;
  if(previous){
   Object.assign(this,previous);this.config=levels[this.level];this.families=activeFamilies(this.level);
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
  }
 }
 fresh(){this.rolls++;return this.random();}
 nextFamily(){
  if(!this.bag.length){this.bag=this.families.flatMap(f=>Array.from({length:4},()=>f));}
  let at=Math.floor(this.fresh()*this.bag.length);return this.bag.splice(at,1)[0];
 }
 target(){return this.config.goal.count;}
 progress(){
  let g=this.config.goal;
  switch(g.type){case"fusion":return this.fusions;case"stage3":return this.stage3;case"stage4":return this.stage4;case"masterpiece":return this.masterpieces;case"pulseHits":return this.pulseHits;case"familyMasterpiece":return this.familyMasterpieces[g.family]||0;case"four":return this.fours;case"shape":return this.shapes;case"chain":return this.bestChain;default:return 0;}
 }
 goalText(){
  let g=this.config.goal;
  return ({fusion:"Fusioner",stage3:"Föremål till stadium 3",stage4:"Föremål till stadium 4",masterpiece:"Mästerverk",pulseHits:"Harmony-förädlingar",familyMasterpiece:"Lyktmästerverk",four:"Fyrmatchningar",shape:"T-/L-matchningar",chain:"Mästerverk i en kedja"})[g.type]||"Mål";
 }
 fulfilled(){return this.progress()>=this.target();}
 stars(){return this.starsAtGoal||0;}
 frame(type,extra={}){return {type,board:clone(this.board),moves:this.moves,score:this.score,fusions:this.fusions,masterpieces:this.masterpieces,goal:this.progress(),complete:this.complete,failed:this.failed,...extra};}
 markStage(p){if(p.stage===3)this.stage3++;if(p.stage===4)this.stage4++;}
 grow(i,created,indirect){
  const p=this.board[i];if(!p||p.stage>=5)return false;
  p.stage++;this.markStage(p);
  if(p.stage===5)created.add(i);
  return true;
 }
 resolve(preferred){
  let events=[],waveRound=0;
  while(waveRound++<35){
   let groups=scan(this.board);if(!groups.length)break;
   let created=new Set(),indirect=new Set(),records=[],shapeCount=0,earned=0;
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
    for(const i of all){let p=this.board[i];if(!p||p.stage!==5)continue;this.familyMasterpieces[p.family]=(this.familyMasterpieces[p.family]||0)+1;this.board[i]=null;this.masterpieces++;}
    this.bestChain=Math.max(this.bestChain,all.size);
    const points=all.size*500+Math.max(0,all.size-1)*250;this.score+=points;
    events.push(this.frame("harvest",{positions:[...all],chain:all.size,pulseHits:chainHits,scoreDelta:points}));
   }
   // Gravity and controlled stage-one refills only after all Harmony waves have finished.
   for(let c=0;c<N;c++){
    let keep=[];for(let r=N-1;r>=0;r--)if(this.board[r*N+c])keep.push(this.board[r*N+c]);
    for(let r=N-1;r>=0;r--)this.board[r*N+c]=keep[N-1-r]||null;
   }
   for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    let i=r*N+c;if(this.board[i])continue;
    let family=this.nextFamily();
    if(this.fresh()<.78){
     const alternatives=this.families.filter(f=>!wouldMatchAt(this.board,i,f));
     if(wouldMatchAt(this.board,i,family)&&alternatives.length)family=randItem(alternatives,()=>this.fresh());
    }
    this.board[i]={family,stage:1,id:this.nextId++};
   }
   events.push(this.frame("fall",{round:waveRound}));preferred=-1;
  }
  if(!validSwaps(this.board).length){
   const movable=this.board.map((p,i)=>p&&p.stage===1?i:-1).filter(i=>i>=0);
   for(let k=0;k<120&&!validSwaps(this.board).length;k++){
    let i=randItem(movable,()=>this.fresh()),j=randItem(movable,()=>this.fresh());
    if(i!==undefined&&j!==undefined){let f=this.board[i].family;this.board[i].family=this.board[j].family;this.board[j].family=f;}
   }
   // If a stage-one-only shuffle still cannot recover the board, swap any non-hero tiles.
   if(!validSwaps(this.board).length)for(let k=0;k<100&&!validSwaps(this.board).length;k++){
    let a=Math.floor(this.fresh()*49),b=Math.floor(this.fresh()*49);
    let f=this.board[a].family;this.board[a].family=this.board[b].family;this.board[b].family=f;
   }
   events.push(this.frame("shuffle"));
  }
  if(!this.complete&&this.fulfilled()){
   this.complete=true;this.goalMove=this.config.moves-this.moves;
   this.starsAtGoal=this.goalMove<=this.config.par?3:this.goalMove<=this.config.par+4?2:1;
   events.push(this.frame("goal",{stars:this.starsAtGoal}));
  }
  if(this.moves<=0){this.failed=!this.complete;events.push(this.frame(this.complete?"end":"lose",{stars:this.stars()}));}
  return events;
 }
 swap(a,b){
  if(this.moves<=0||this.failed)return {ok:false,reason:"Nivån är avslutad"};
  if(!Number.isInteger(a)||!Number.isInteger(b)||!neighbors(a).includes(b))return {ok:false,reason:"Välj två intilliggande föremål"};
  [this.board[a],this.board[b]]=[this.board[b],this.board[a]];
  if(!scan(this.board).some(g=>g.includes(a)||g.includes(b))){
   [this.board[a],this.board[b]]=[this.board[b],this.board[a]];
   return {ok:false,reason:"Bytet behöver skapa minst tre i samma familj"};
  }
  this.moves--;return {ok:true,events:[this.frame("swap",{from:a,to:b}),...this.resolve(b)]};
 }
 finish(){if(!this.complete)return false;this.moves=0;return true;}
 save(){return {board:clone(this.board),moves:this.moves,score:this.score,seed:this.seed,rolls:this.rolls,bag:this.bag.slice(),nextId:this.nextId,fusions:this.fusions,masterpieces:this.masterpieces,familyMasterpieces:{...this.familyMasterpieces},stage3:this.stage3,stage4:this.stage4,pulseHits:this.pulseHits,fours:this.fours,shapes:this.shapes,bestChain:this.bestChain,complete:this.complete,failed:this.failed,starsAtGoal:this.starsAtGoal,goalMove:this.goalMove};}
}
function wouldMatchAt(board,i,f){let r=Math.floor(i/N),c=i%N,match=(row,col)=>row>=0&&row<N&&col>=0&&col<N&&board[row*N+col]&&board[row*N+col].family===f;return match(r,c-1)&&match(r,c-2)||match(r,c+1)&&match(r,c+2)||match(r,c-1)&&match(r,c+1)||match(r-1,c)&&match(r-2,c)||match(r+1,c)&&match(r+2,c)||match(r-1,c)&&match(r+1,c);}
const api={Game,levels,families:ALL,levelFamilies:LEVEL_FAMILIES,activeFamilies,scan,neighbors,validSwaps,startBoard};
root.HarmonyRules=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
