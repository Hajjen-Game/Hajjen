/* Japanese Harmony · first playable mobile-first application */
(function(){
"use strict";
const R=window.HarmonyRules,$=id=>document.getElementById(id);
const names={sakura:"Sakura",lantern:"Lykta",koi:"Koi",fan:"Solfjäder",bonsai:"Bonsai"};
const symbols={sakura:"🌸",lantern:"🏮",koi:"🐟",fan:"🪭",bonsai:"🌳"};
const familyRows={sakura:0,lantern:1,koi:2,fan:3,bonsai:4};
const stages=["","Knopp / början","På väg","Utvecklad","Nästan mästerverk","Mästerverk"];
const KEY="japanese-harmony-puzzle-v2";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,sound:true,reduceMotion:false};
let save,game=null,level=0,selected=-1,busy=false,timer=0,comboTimer=0,soundContext=null,pointer=null,suppressClickUntil=0;
let scoreShown=0,scoreSession=0,scoreFlights=0,scoreOverlay=null;
try{save={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch(e){save={...defaults};}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}
function prettify(x){return Math.round(x||0).toLocaleString("sv-SE");}

// Festival Night / Zen Control: six approved vertical motifs in one AVIF atlas.
// Atlas is 1920x640 with six 320x640 panels side-by-side.
// No per-frame effects or heavy blur: only resize and level transitions update it.
const FESTIVAL_COUNT=6, FESTIVAL_CELL_W=320, FESTIVAL_CELL_H=640;
let currentBackground=-1,backgroundResizeFrame=0;
function layoutFestivalBackground(){
 if(currentBackground<0)return;
 const w=window.innerWidth||390,h=window.innerHeight||844;
 const scale=Math.max(w/FESTIVAL_CELL_W,h/FESTIVAL_CELL_H);
 const panelW=FESTIVAL_CELL_W*scale,panelH=FESTIVAL_CELL_H*scale;
 const x=(w-panelW)/2-currentBackground*panelW;
 const y=(h-panelH)/2;
 const root=document.documentElement.style;
 root.setProperty("--festival-atlas-width",Math.round(FESTIVAL_COUNT*panelW)+"px");
 root.setProperty("--festival-atlas-height",Math.round(panelH)+"px");
 root.setProperty("--festival-bg-x",Math.round(x)+"px");
 root.setProperty("--festival-bg-y",Math.round(y)+"px");
}
function chooseFestivalBackground(remembered){
 let next=Number.isInteger(remembered)&&remembered>=0&&remembered<FESTIVAL_COUNT?remembered:-1;
 if(next<0){
  const prev=Number.isInteger(save.lastBackground)?save.lastBackground:-1;
  // Uniform random choice without immediate repeats after the first one.
  next=prev>=0&&prev<FESTIVAL_COUNT?(prev+1+Math.floor(Math.random()*(FESTIVAL_COUNT-1)))%FESTIVAL_COUNT:Math.floor(Math.random()*FESTIVAL_COUNT);
 }
 currentBackground=next;save.lastBackground=next;
 document.body.dataset.festival=String(next+1);
 layoutFestivalBackground();persist();
}
function initFestivalBackground(){
 const img=new Image();
 img.onload=()=>document.documentElement.classList.add("has-festival-art");
 img.onerror=()=>document.documentElement.classList.remove("has-festival-art");
 img.src="./assets/backgrounds/festival-night-six.avif";
 const resumed=save.run&&Number.isInteger(save.run.backgroundId)?save.run.backgroundId:null;
 chooseFestivalBackground(resumed??save.lastBackground??null);
 window.addEventListener("resize",()=>{
  if(backgroundResizeFrame)return;
  backgroundResizeFrame=requestAnimationFrame(()=>{
   backgroundResizeFrame=0;layoutFestivalBackground();
  });
 },{passive:true});
}

function toast(text){const t=$("toast");t.textContent=text;t.hidden=false;clearTimeout(timer);timer=setTimeout(()=>t.hidden=true,2400);}
function sound(type){
 if(!save.sound)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!soundContext)soundContext=new Audio();
  if(soundContext.state==="suspended")soundContext.resume();
  const notes={swap:370,fusion:510,bonus:620,pulse:710,harvest:860,goal:930,score:1050};
  if(!notes[type])return;
  const o=soundContext.createOscillator(),g=soundContext.createGain(),now=soundContext.currentTime;
  o.type=type==="harvest"?"triangle":"sine";o.frequency.setValueAtTime(notes[type],now);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.19);
  o.connect(g);g.connect(soundContext.destination);o.start(now);o.stop(now+.2);
 }catch(e){}
}
function showMenu(){
 if(busy)return;
 clearScoreFx();
 saveRun();$("gameView").hidden=true;$("menuView").hidden=false;$("modal").hidden=true;renderMenu();
}
function renderMenu(){
 const list=$("levelList");list.replaceChildren();let earned=0;
 R.levels.forEach((cfg,i)=>{
  let allowed=i<=save.unlocked,stars=save.bestStars[i]||0;earned+=stars;
  const b=document.createElement("button");b.className="level-tile"+(allowed?"":" locked");b.disabled=!allowed;
  const n=document.createElement("span");n.className="level-number";n.textContent=allowed?String(i+1):"♧";
  const d=document.createElement("span");const title=document.createElement("strong");title.textContent=cfg.name;const sub=document.createElement("small");sub.textContent=cfg.subtitle;d.append(title,sub);
  const s=document.createElement("span");s.className="level-stars";s.textContent=allowed?(stars?"★".repeat(stars)+"☆".repeat(3-stars):"○ ○ ○"):"🔒";
  b.append(n,d,s);b.addEventListener("click",()=>startLevel(i,false));list.appendChild(b);
 });
 $("chapterStars").textContent="★ "+earned+" / "+(R.levels.length*3);
 const canResume=save.run&&save.run.level<=save.unlocked&&save.run.data&&save.run.data.moves>0;
 $("continueButton").textContent=canResume?"Fortsätt nivå "+(save.run.level+1)+" →":"Spela nivå "+(Math.min(R.levels.length-1,save.unlocked)+1)+" →";
}
function saveRun(){if(game&&game.moves>0&&!game.failed){save.run={level,data:game.save(),backgroundId:currentBackground};persist();}}
function startLevel(i,resume=false){
 if(busy)return;
 level=i;const data=resume&&save.run&&save.run.level===i?save.run.data:null;
 game=new R.Game(i,data);chooseFestivalBackground(resume&&save.run&&save.run.level===i?save.run.backgroundId:null);scoreShown=game.score;clearScoreFx();selected=-1;$("menuView").hidden=true;$("gameView").hidden=false;$("modal").hidden=true;
 $("levelTitle").textContent=game.config.name;$("levelNumber").textContent="NIVÅ "+(i+1)+" AV "+R.levels.length;
 $("gameTip").textContent=game.config.intro;$("goalLabel").textContent=game.goalText();
 clearTimeout(comboTimer);$("combo").hidden=true;
 renderBoard(game.board);renderHUD();saveRun();
}
// Keep 49 stable cells. Only update a sprite when the piece in that cell changes.
// The old renderer recreated ~150 DOM nodes and 49 listeners for EVERY fusion frame.
let boardTiles=[],boardKeys=[],presentedBoard=Array(49).fill(null);
function renderBoard(board,highlight,effect){
 const grid=$("board");
 if(boardTiles.length!==49||grid.children.length!==49){
  const frag=document.createDocumentFragment();
  boardTiles=[];boardKeys=Array(49).fill(null);
  for(let i=0;i<49;i++){
   const btn=document.createElement("button");
   btn.type="button";btn.className="tile";btn.setAttribute("role","gridcell");
   btn.dataset.index=i;
   btn.addEventListener("click",()=>{if(performance.now()<suppressClickUntil)return;choose(i);});
   boardTiles.push(btn);frag.append(btn);
  }
  grid.replaceChildren(frag);
 }
 const highlighted=highlight&&highlight.length?new Set(highlight):null;
 const flash=effect||(highlight&&highlight.effect)||"pulsed";
 for(let i=0;i<49;i++){
  const piece=board[i],btn=boardTiles[i],key=piece?piece.id+"|"+piece.family+"|"+piece.stage:"empty";
  // Most frames change only 1-4 pieces. Preserve the other sprites, textures,
  // event listeners and their DOM nodes for a smoother mobile experience.
  if(boardKeys[i]!==key){
   boardKeys[i]=key;
   btn.replaceChildren();
   btn.setAttribute("aria-label",piece?names[piece.family]+", stadium "+piece.stage+", ruta "+(Math.floor(i/7)+1)+"-"+(i%7+1):"Tom ruta");
   if(piece){
    const holder=document.createElement("span");holder.className="piece";
    const emoji=document.createElement("span");emoji.className="fallback";emoji.textContent=symbols[piece.family];
    const img=document.createElement("span");img.className="sprite";
    img.style.setProperty("--sx",((piece.stage-1)*25)+"%");
    img.style.setProperty("--sy",familyRows[piece.family]*25+"%");
    holder.append(emoji,img);btn.append(holder);
   }
  }
  const cls="tile"+(selected===i?" selected":"")+(highlighted&&highlighted.has(i)?" "+flash:"");
  if(btn.className!==cls)btn.className=cls;
 }
 presentedBoard=board.map(p=>p?{id:p.id,family:p.family,stage:p.stage}:null);
}
function renderHUD(state){
 if(!game)return;
 let current=state||game,progress=state?state.goal:game.progress();
 $("movesCount").textContent=current.moves;
 renderScoreOnly();
 $("goalProgress").textContent=Math.min(game.target(),progress)+" / "+game.target();
 $("statusStars").textContent=game.stars()?"★".repeat(game.stars())+"☆".repeat(3-game.stars()):"";
 $("goalBanner").hidden=!game.complete;
 $("endButton").hidden=!game.complete||busy;
}
function renderScoreOnly(){
 $("scoreCount").textContent=prettify(scoreShown);
 $("scoreBest").textContent=prettify(Math.max(scoreShown,save.bestScores[level]||0));
}
function choose(i){
 if(busy||!game||game.moves<=0)return;
 if(selected>=0&&selected!==i&&R.neighbors(selected).includes(i)){const a=selected;selected=-1;trySwap(a,i);return;}
 selected=selected===i?-1:i;
 $("selectedInfo").textContent=selected<0?"Välj två angränsande föremål eller svep.":names[game.board[i].family]+" · stadium "+game.board[i].stage+" av 5 · välj en granne";
 renderBoard(game.board);
}
function trySwap(a,b){
 if(busy||!game)return;
 const result=game.swap(a,b);
 if(!result.ok){toast(result.reason);selected=b;renderBoard(game.board);return;}
 selected=-1;$("selectedInfo").textContent="Välj två angränsande föremål eller svep.";
 playEvents(result.events);
}
function highlightIndices(evt){
 if(evt.type==="swap")return {indices:[evt.from,evt.to],effect:"swapped"};
 if(evt.type==="fusion")return {indices:evt.groups.flatMap(g=>[g.at,...g.removed]),effect:"swapped"};
 if(evt.type==="bonus"||evt.type==="pulse")return {indices:evt.targets.map(t=>t.to),effect:"pulsed"};
 if(evt.type==="hero"||evt.type==="harvest")return {indices:evt.positions,effect:"harvested"};
 if(evt.type==="shuffle")return {indices:Array.from({length:49},(_,i)=>i),effect:"shuffling"};
 return {indices:[],effect:""};
}
// Fusions move for real rather than swapping artwork separated by arbitrary timers.
// This uses the compositor's Web Animations to minimize main-thread mobile jank.
const FAST=()=>save.reduceMotion||(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
function animateNode(node,keyframes,ms,options={}){
 if(!node||!node.animate||FAST()||ms<=0)return Promise.resolve();
 const motion=node.animate(keyframes,{duration:ms,easing:"cubic-bezier(.2,.7,.2,1)",fill:"both",...options});
 return motion.finished.catch(()=>{}).then(()=>motion.cancel());
}
function indexRect(index){return boardTiles[index].getBoundingClientRect();}

// Fusion sparkle + a small stream of earned points to the score box.
// FX live in one pointer-free fixed overlay, never inside the 7x7 tiles.
// Web Animations are compositor-friendly and DO NOT hold up player input.
function scoreFxLayer(){
 if(!scoreOverlay||!scoreOverlay.isConnected){
  scoreOverlay=document.createElement("div");
  scoreOverlay.className="score-fx-overlay";
  scoreOverlay.setAttribute("aria-hidden","true");
  document.body.appendChild(scoreOverlay);
 }
 return scoreOverlay;
}
function clearScoreFx(){
 scoreSession++;
 scoreFlights=0;
 if(scoreOverlay)scoreOverlay.replaceChildren();
}
function fxAt(className,x,y,text){
 const span=document.createElement("span");
 span.className=className;span.style.left=x+"px";span.style.top=y+"px";
 if(text!==undefined)span.textContent=text;
 scoreFxLayer().appendChild(span);
 return span;
}
// A clearly readable but compact reward, scaled to match size.
// Ring and stars are painted in a single ephemeral fixed overlay, not in the board.
function fusionBurst(positions,groups=[],kind="fusion"){
 if(FAST()||!Element.prototype.animate)return;
 for(const at of [...new Set(positions)].slice(0,3)){
  if(!boardTiles[at])continue;
  const rect=indexRect(at),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const group=groups.find(g=>g.at===at);
  const big=kind==="hero"||(group?.number>=5),strong=big||(group?.number===4);
  const radius=Math.min(rect.width,rect.height)*(big?.49:.42);
  const tone=kind==="hero"?" mint":(big?" gold":"");
  const ring=fxAt("fusion-ring"+tone,x,y);
  ring.style.width=(radius*2)+"px";ring.style.height=(radius*2)+"px";
  animateNode(ring,[
   {transform:"scale(.25)",opacity:0,offset:0},
   {transform:"scale(.85)",opacity:.95,offset:.38},
   {transform:"scale(1.48)",opacity:0,offset:1}
  ],big?420:340).finally(()=>ring.remove());
  // Two light echoes establish the fusion origin without white explosions.
  const core=fxAt("fusion-core"+(kind==="hero"?" mint":""),x,y);
  animateNode(core,[
   {transform:"scale(.18)",opacity:0,offset:0},
   {transform:"scale(1)",opacity:.68,offset:.34},
   {transform:"scale(1.35)",opacity:0,offset:1}
  ],big?340:265).finally(()=>core.remove());
  const count=strong?8:6,drift=radius*(strong?.92:.76);
  for(let i=0;i<count;i++){
   const theta=(i/count)*Math.PI*2-.2,d=drift*(.85+(i%3)*.15);
   const spark=fxAt("fusion-spark"+(i%3===0?" mint":""),x,y);
   animateNode(spark,[
    {transform:"translate3d(0,0,0) scale(.5)",opacity:0,offset:0},
    {transform:"translate3d("+(Math.cos(theta)*d*.34)+"px,"+(Math.sin(theta)*d*.34)+"px,0) scale(1.35)",opacity:1,offset:.37},
    {transform:"translate3d("+(Math.cos(theta)*d)+"px,"+(Math.sin(theta)*d)+"px,0) scale(.18)",opacity:0,offset:1}
   ],big?375:315).finally(()=>spark.remove());
  }
  // Give exceptional matches a tiny reward word, but never cover the entire board.
  if(big&&kind!=="hero"){
   const tag=fxAt("fusion-milestone",x,y-radius*.8,"✦ SUPER!");
   animateNode(tag,[{transform:"translate3d(0,5px,0) scale(.8)",opacity:0,offset:0},
    {transform:"translate3d(0,-7px,0) scale(1)",opacity:1,offset:.3},
    {transform:"translate3d(0,-22px,0) scale(.9)",opacity:0,offset:1}],460).finally(()=>tag.remove());
  }
 }
}
function scoreArrival(points){
 const counter=$("scoreCount");
 if(!counter||!counter.isConnected)return;
 const panel=$("scorePanel"),r=counter.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 // A restrained but unmistakable impact at the destination. Restart safely
 // when another combo arrives immediately afterwards.
 if(!FAST()&&Element.prototype.animate){
  if(panel)animateNode(panel,[
   {transform:"scale(1)",filter:"brightness(1)",offset:0},
   {transform:"scale(1.035)",filter:"brightness(1.28)",offset:.45},
   {transform:"scale(1)",filter:"brightness(1)",offset:1}
  ],365);
  animateNode(counter,[
   {transform:"scale(1)",color:"#F2C66E",offset:0},
   {transform:"scale(1.30)",color:"#FFF2DC",offset:.38},
   {transform:"scale(1.07)",color:"#FFE6A0",offset:.70},
   {transform:"scale(1)",color:"#F2C66E",offset:1}
  ],430);
  const ring=fxAt("score-impact-ring",x,y);
  animateNode(ring,[
   {transform:"scale(.45)",opacity:.95,offset:0},
   {transform:"scale(1.45)",opacity:.58,offset:.48},
   {transform:"scale(2.0)",opacity:0,offset:1}
  ],360).finally(()=>ring.remove());
 }else{
  // Still acknowledge rewards for people who requested reduced motion.
  counter.classList.add("score-accessible-flash");
  setTimeout(()=>counter.classList.remove("score-accessible-flash"),260);
 }
 if(points>=500)sound("score");
}
function pointSources(evt){
 const amount=Math.round(evt.scoreDelta||0);
 if(amount<=0)return [];
 if(evt.type==="fusion"&&evt.groups?.length){
  const groups=evt.groups.filter(g=>g.at>=0);
  const limited=groups.slice(0,3);
  if(!limited.length)return [{at:24,points:amount}];
  const result=limited.map(g=>({at:g.at,points:Math.max(0,Math.round(g.points||0))}));
  const rest=amount-result.reduce((sum,p)=>sum+p.points,0);
  result[0].points+=rest;
  return result.filter(p=>p.points>0);
 }
 let at=24;
 if(evt.type==="bonus")at=evt.targets?.[0]?.to??24;
 if(evt.type==="pulse")at=evt.targets?.[0]?.to??24;
 if(evt.type==="harvest")at=evt.positions?.[0]??24;
 return [{at,points:amount}];
}
function flyPoints(evt){
 for(const item of pointSources(evt)){
  const points=item.points;
  // The actual game score is authoritative; these are only reward visuals.
  if(FAST()||!Element.prototype.animate||scoreFlights>=5){
   scoreShown+=points;renderScoreOnly();scoreArrival(points);continue;
  }
  const id=scoreSession,from=indexRect(item.at),dest=$("scoreCount").getBoundingClientRect();
  const x=from.left+from.width*.5,y=from.top+from.height*.45;
  const dx=dest.left+dest.width*.5-x,dy=dest.top+dest.height*.5-y;
  const bend=dx>=0?Math.min(-18,-Math.abs(dx)*.12):Math.max(18,Math.abs(dx)*.12);
  const n=scoreFlights++;
  // Arc above the board: legible +amount with a thick dark ink pill and gold rim.
  const keyframes=[
   {transform:"translate3d(0,6px,0) scale(.75)",opacity:0,offset:0},
   {transform:"translate3d(0,-8px,0) scale(1.12)",opacity:1,offset:.16},
   {transform:"translate3d("+(dx*.32+bend)+"px,"+(dy*.32-28)+"px,0) scale(1.06)",opacity:1,offset:.43},
   {transform:"translate3d("+(dx*.70+bend*.5)+"px,"+(dy*.70-23)+"px,0) scale(.94)",opacity:1,offset:.77},
   {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.48)",opacity:.96,offset:.96},
   {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.2)",opacity:0,offset:1}
  ];
  const duration=610;
  const label=fxAt("score-flight-token",x,y,"+"+prettify(points));
  label.dataset.points=String(points);
  const flight=animateNode(label,keyframes,duration,{easing:"linear"});
  // A visible stream of small gold sparks follows the exact same curved arc.
  const trails=Math.max(4,Math.min(6,6-n));
  for(let k=0;k<trails;k++){
   const bead=fxAt("score-trail-dot"+(k%2===0?" bright":""),x,y);
   const stagger=55+k*40;
   animateNode(bead,[
    {transform:"translate3d(0,0,0) scale(.3)",opacity:0,offset:0},
    {transform:"translate3d("+(dx*.2+bend*.7)+"px,"+(dy*.2-18)+"px,0) scale(1)",opacity:1,offset:.32},
    {transform:"translate3d("+(dx*.67+bend*.5)+"px,"+(dy*.67-22)+"px,0) scale(.8)",opacity:.95,offset:.77},
    {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.18)",opacity:0,offset:1}
   ],duration-45,{delay:stagger,easing:"linear"}).finally(()=>bead.remove());
  }
  flight.finally(()=>{
   label.remove();
   if(id!==scoreSession)return;
   scoreFlights=Math.max(0,scoreFlights-1);
   scoreShown+=points;
   renderScoreOnly();
   scoreArrival(points);
  });
 }
}
function animateTilePiece(index,piece,frames,duration,options){
 const cell=boardTiles[index];
 // During movement, allow the artwork to cross neighbouring grid cells.
 // Restore the original clipping immediately after the animation.
 cell.style.overflow="visible";
 cell.style.zIndex="3";
 return animateNode(piece,frames,duration,options).finally(()=>{
  cell.style.overflow="";cell.style.zIndex="";
 });
}

function makeFxLayer(){
 const board=$("board"),parent=board.parentElement;
 const b=board.getBoundingClientRect(),p=parent.getBoundingClientRect();
 const layer=document.createElement("div");layer.className="fusion-fx-layer";
 layer.style.left=(b.left-p.left)+"px";layer.style.top=(b.top-p.top)+"px";
 layer.style.width=b.width+"px";layer.style.height=b.height+"px";
 parent.appendChild(layer);
 return {node:layer,rect:b};
}
function flipMove(previous,next,type){
 if(FAST())return Promise.resolve();
 const origin=new Map();
 previous.forEach((p,i)=>{if(p)origin.set(p.id,i);});
 const tasks=[],size=indexRect(0).height;
 next.forEach((p,i)=>{
  if(!p)return;
  const before=origin.get(p.id);
  if(before===i)return;
  const piece=boardTiles[i].querySelector(".piece");if(!piece)return;
  if(before!==undefined){
   const a=indexRect(before),b=indexRect(i);
   const dx=a.left-b.left,dy=a.top-b.top;
   tasks.push(animateTilePiece(i,piece,[{transform:"translate3d("+dx+"px,"+dy+"px,0)"},{transform:"translate3d(0,0,0)"}],type==="swap"?145:210));
  }else if(type==="fall"){
   const row=Math.floor(i/7);
   tasks.push(animateTilePiece(i,piece,[{transform:"translate3d(0,"+(-(row+2)*size)+"px,0) scale(.91)",opacity:.45},{transform:"translate3d(0,0,0) scale(1)",opacity:1}],210+Math.min(70,(i%7)*9),{easing:"cubic-bezier(.16,.78,.3,1)"}));
  }
 });
 return Promise.all(tasks);
}
async function playFusion(evt){
 if(!FAST()){
  const layer=makeFxLayer(),ghosts=[],tasks=[];
  for(const group of evt.groups||[]){
   for(const i of group.removed){
    const original=boardTiles[i].querySelector(".piece");
    if(!original)continue;
    const tile=indexRect(i),dest=indexRect(group.at),ghost=original.cloneNode(true);
    ghost.classList.add("fusion-ghost");
    ghost.style.left=(tile.left-layer.rect.left)+"px";
    ghost.style.top=(tile.top-layer.rect.top)+"px";
    ghost.style.width=tile.width+"px";ghost.style.height=tile.height+"px";
    layer.node.appendChild(ghost);ghosts.push({original,ghost});
    original.style.visibility="hidden";
    tasks.push(animateNode(ghost,[
      {transform:"translate3d(0,0,0) scale(1)",opacity:1},
      {transform:"translate3d("+(dest.left-tile.left)+"px,"+(dest.top-tile.top)+"px,0) scale(.18)",opacity:.22}
    ],165));
   }
  }
  try{await Promise.all(tasks);}
  finally{for(const {original} of ghosts)original.style.visibility="";layer.node.remove();}
 }
 renderBoard(evt.board,(evt.groups||[]).map(g=>g.at),"swapped");
 fusionBurst((evt.groups||[]).map(g=>g.at),evt.groups||[]);
 await Promise.all((evt.groups||[]).map(g=>animateNode(boardTiles[g.at]?.querySelector(".piece"),[
  {transform:"scale(.80)"},{transform:"scale(1.15)",offset:.55},{transform:"scale(1)"}
 ],125)));
}
function pulseBeams(evt){
 if(FAST()||!evt.targets?.length)return Promise.resolve();
 const layer=makeFxLayer(),tasks=[];
 for(const target of evt.targets){
  const a=indexRect(target.from),b=indexRect(target.to);
  const dot=document.createElement("span");dot.className="pulse-dot";
  dot.style.left=(a.left-layer.rect.left+a.width*.5-6)+"px";
  dot.style.top=(a.top-layer.rect.top+a.height*.5-6)+"px";
  layer.node.appendChild(dot);
  tasks.push(animateNode(dot,[
   {transform:"translate3d(0,0,0) scale(.5)",opacity:.95},
   {transform:"translate3d("+(b.left-a.left)+"px,"+(b.top-a.top)+"px,0) scale(1.25)",opacity:.15}
  ],155));
 }
 return Promise.all(tasks).finally(()=>layer.node.remove());
}
async function animateEvent(evt){
 const previous=presentedBoard;
 switch(evt.type){
  case "swap":
   renderBoard(evt.board,[evt.from,evt.to],"swapped");
   await flipMove(previous,evt.board,"swap");
   break;
  case "fusion":
   await playFusion(evt);
   break;
  case "bonus":
  case "pulse":{
   const targets=evt.targets||[];
   renderBoard(evt.board,targets.map(t=>t.to),"pulsed");
   const grow=targets.map(t=>animateNode(boardTiles[t.to]?.querySelector(".piece"),[
     {transform:"scale(.75)"},{transform:"scale(1.15)",offset:.6},{transform:"scale(1)"}
   ],145));
   if(evt.type==="pulse"){grow.push(pulseBeams(evt));fusionBurst([...new Set(targets.map(t=>t.to))].slice(0,2),[],"hero");}
   await Promise.all(grow);
   break;
  }
  case "hero":
   renderBoard(evt.board,evt.positions||[],"harvested");
   fusionBurst(evt.positions||[],[],"hero");
   await Promise.all((evt.positions||[]).map(i=>animateNode(boardTiles[i]?.querySelector(".piece"),[
     {transform:"scale(.83)"},{transform:"scale(1.20)",offset:.55},{transform:"scale(1)"}
   ],155)));
   break;
  case "harvest":
   if(!FAST())await Promise.all((evt.positions||[]).map(i=>animateNode(boardTiles[i]?.querySelector(".piece"),[
     {transform:"scale(1)",opacity:1},{transform:"translate3d(0,-12px,0) scale(.15)",opacity:0}
   ],150)));
   renderBoard(evt.board);
   break;
  case "fall":
   renderBoard(evt.board);
   await flipMove(previous,evt.board,"fall");
   break;
  default:
   renderBoard(evt.board,evt.type==="shuffle"?Array.from({length:49},(_,i)=>i):[],"shuffling");
 }
}
async function playEvents(events){
 busy=true;$("board").setAttribute("aria-busy","true");$("endButton").hidden=true;
 let finished=false,goalReached=false;
 try{
  for(const evt of events){
   await animateEvent(evt);
   if(evt.scoreDelta>0)flyPoints(evt);
   if(["fusion","bonus","pulse","harvest","goal"].includes(evt.type))sound(evt.type);
   if(evt.type==="harvest"&&evt.chain>=2){
    $("combo").textContent="✦ HARMONY CHAIN · "+evt.chain+" MÄSTERVERK";
    $("combo").hidden=false;clearTimeout(comboTimer);
    comboTimer=setTimeout(()=>$("combo").hidden=true,save.reduceMotion?300:850);
   }else if(evt.type==="swap"){clearTimeout(comboTimer);$("combo").hidden=true;}
   if(evt.type==="goal"){goalReached=true;unlockGoal();toast("✦ Nivåmålet klart! Spela vidare för rekord.");}
   if(evt.type==="end"||evt.type==="lose")finished=true;
   renderHUD(evt);
  }
 }catch(error){
  console.error("Harmony animation interrupted",error);
  renderBoard(game.board);
 }finally{
  busy=false;$("board").setAttribute("aria-busy","false");renderBoard(game.board);renderHUD();saveRun();
 }
 if(goalReached)unlockGoal();
 if(finished)showResult();
}
function unlockGoal(){
 save.unlocked=Math.max(save.unlocked,Math.min(R.levels.length-1,level+1));
 save.bestStars[level]=Math.max(save.bestStars[level]||0,game.stars());
 persist();
}
function showResult(){
 if(!game)return;
 clearScoreFx();scoreShown=game.score;
 const won=game.complete;
 if(won){
  unlockGoal();
  save.bestScores[level]=Math.max(save.bestScores[level]||0,game.score);
  save.bestChain[level]=Math.max(save.bestChain[level]||0,game.bestChain);
 }
 save.run=null;persist();
 $("modalEyebrow").textContent=won?"LEVEL COMPLETE":"FÖRSÖK IGEN";
 $("modalTitle").textContent=won?"Vilken harmoni!":"Inga drag kvar";
 const panel=$("modalContent");panel.replaceChildren();
 if(won){
  const stars=document.createElement("div");stars.className="big-stars";stars.textContent="★".repeat(game.stars())+"☆".repeat(3-game.stars());panel.append(stars);
 }
 const sum=document.createElement("div");sum.className="summary";const line=document.createElement("div");line.textContent="SLUTPOÄNG";const strong=document.createElement("strong");strong.textContent=prettify(game.score);sum.append(line,strong);panel.append(sum);
 const stats=document.createElement("div");stats.className="result-stats";
 [[game.masterpieces,"Mästerverk"],[game.bestChain,"Bästa Harmony-kedja"],[game.fusions,"Fusioner"],[prettify(save.bestScores[level]||game.score),"Personligt rekord"]].forEach(([value,label])=>{
  const v=document.createElement("div");const a=document.createElement("strong"),b=document.createElement("small");a.textContent=value;b.textContent=label;v.append(a,b);stats.append(v);
 });panel.append(stats);
 const extra=document.createElement("p");extra.textContent=won?"Du har klarat nivån. Förbättra gärna rekordet genom att spela igen.":"Nytt försök ger en ny kontrollerad startvariant. Inga liv, väntetider eller Power Moves.";panel.append(extra);
 const actions=$("modalActions");actions.replaceChildren();
 if(won){modalButton(actions,level<R.levels.length-1?"Nästa nivå →":"Till nivåval →","primary",()=>{if(level<R.levels.length-1)startLevel(level+1);else showMenu();});}
 modalButton(actions,won?"Spela igen":"Försök igen med nytt bräde","secondary",()=>startLevel(level));
 modalButton(actions,"Nivåval","secondary",showMenu);
 $("modal").hidden=false;
}
function modalButton(parent,label,cls,fn){let b=document.createElement("button");b.className=cls;b.textContent=label;b.addEventListener("click",fn);parent.append(b);}
function modalInfo(title,html){
 $("modalEyebrow").textContent="JAPANESE HARMONY";$("modalTitle").textContent=title;
 $("modalContent").innerHTML=html;const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Tillbaka till spelet","primary",()=>{$("modal").hidden=true;});$("modal").hidden=false;
}
function bind(){
 $("homeButton").addEventListener("click",showMenu);
 $("menuButton").addEventListener("click",showMenu);
 $("continueButton").addEventListener("click",()=>{const r=save.run&&save.run.data&&save.run.data.moves>0?save.run:null;if(r)startLevel(r.level,true);else startLevel(Math.min(R.levels.length-1,save.unlocked));});
 $("retryButton").addEventListener("click",()=>{if(busy)return;startLevel(level);});
 $("endButton").addEventListener("click",()=>{if(busy||!game||!game.complete)return;game.finish();showResult();});
 $("helpButton").addEventListener("click",()=>modalInfo("Så spelar du",'<p><strong>Matcha:</strong> Byt två grannar och bilda tre eller fler av samma familj. Stadier får blandas. T- och L-former fungerar också.</p><p><strong>Förädla:</strong> Föremålet med högst stadium överlever på sin plats och får +1. Fyra matchade ger en grannuppgradering; fem eller fler ger två.</p><p><strong>Harmony Pulse:</strong> Vid stadium 5 sprider ett mästerverk sin kraft till upptagna rutor ovanför, nedanför, höger och vänster. Kedjor avslutas innan tomma rutor fylls.</p><p><strong>Nivåmål:</strong> När målet uppnås sparas dina stjärnor. Du får spela återstående drag för att slå ditt rekord. Inga Power Moves eller hinder.</p>'));
 $("settingsButton").addEventListener("click",()=>{
  modalInfo("Inställningar",'<p><label><input type="checkbox" id="settingsSound" '+(save.sound?"checked":"")+'> Ljud</label></p><p><label><input type="checkbox" id="settingsMotion" '+(save.reduceMotion?"checked":"")+'> Minska animationer</label></p>');
  $("settingsSound").addEventListener("change",e=>{save.sound=e.target.checked;persist();});
  $("settingsMotion").addEventListener("change",e=>{save.reduceMotion=e.target.checked;persist();});
 });
 $("board").addEventListener("pointerdown",e=>{const tile=e.target.closest(".tile");if(tile)pointer={i:Number(tile.dataset.index),x:e.clientX,y:e.clientY};});
 $("board").addEventListener("pointerup",e=>{
  if(!pointer)return;const start=pointer;pointer=null;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
  suppressClickUntil=performance.now()+450;
  const r=Math.floor(start.i/7),c=start.i%7;
  const destination=Math.abs(dx)>Math.abs(dy)?r*7+c+(dx>0?1:-1):(r+(dy>0?1:-1))*7+c;
  if(R.neighbors(start.i).includes(destination)){selected=-1;trySwap(start.i,destination);}
 });
 window.addEventListener("keydown",e=>{if(e.key==="Escape"&&!busy&&!$("modal").hidden){$("modal").hidden=true;}});
}
function checkAtlas(){
 const img=new Image();
 img.onload=()=>document.documentElement.classList.add("has-atlas");
 img.onerror=()=>{document.documentElement.classList.remove("has-atlas");console.warn("Japanese Harmony art atlas not installed: using temporary family symbols.");};
 img.src="./assets/harmony-atlas.webp";
}
bind();checkAtlas();initFestivalBackground();renderMenu();
})();