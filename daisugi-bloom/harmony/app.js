/* Japanese Harmony · first playable mobile-first application */
(function(){
"use strict";
const R=window.HarmonyRules,$=id=>document.getElementById(id);
const names={sakura:"Sakura",lantern:"Lykta",koi:"Koi",fan:"Solfjäder",bonsai:"Bonsai",sushi:"Sushi",maneki:"Maneki-neko",origami:"Origami",ryu:"Ryu-drake"};
const symbols={sakura:"🌸",lantern:"🏮",koi:"🐟",fan:"🪭",bonsai:"🌳",sushi:"🍣",maneki:"🐱",origami:"🕊️",ryu:"🐉"};
const familyRows={sakura:0,lantern:1,koi:2,fan:3,bonsai:4};
const newFamilyRows={sushi:0,maneki:1,origami:2,ryu:3};
const stages=["","Knopp / början","På väg","Utvecklad","Nästan mästerverk","Mästerverk"];
const KEY="japanese-harmony-puzzle-v2";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,sound:true,reduceMotion:false};
let save,game=null,level=0,selected=-1,busy=false,timer=0,comboTimer=0,pointer=null,suppressClickUntil=0;
let scoreShown=0,scoreDisplayed=0,scoreRaf=0,scoreSession=0,scoreFlights=0,scoreOverlay=null;
let lastGoalProgress=-1,lastScoreImpact=0;
const perf=window.HarmonyPerf?.create();
let rectCache=null,boardLayerRect=null;
const LITE_FX=()=>MOBILE_LITE&&!!perf?.constrained;
const fxCount=()=>scoreOverlay?.childElementCount||0;
try{save={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch(e){save={...defaults};}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}
function prettify(x){return Math.round(x||0).toLocaleString("sv-SE");}

// Festival Night HD · Mobile 3.3
// Three user-supplied 768x1536 scenes, stored as individual AVIF files.
// Use the browser's native image decoder and a single fixed CSS backdrop.
// No canvas readback, sharpening, image cloning or huge atlas composite.
const FESTIVAL_SCENES=[
 "./assets/backgrounds/festival-hd-1.avif", // moonlit lake and pagoda
 "./assets/backgrounds/festival-hd-2.avif", // lantern-lit bamboo stream
 "./assets/backgrounds/festival-hd-3.avif"  // lantern gate and stone pathway
];
const FESTIVAL_COUNT=FESTIVAL_SCENES.length;
let currentBackground=-1;
const loadedFestivalScenes=new Set();

// If the new HD files are temporarily unavailable (for example while GitHub
// Pages is deploying), show one of the known-good legacy atlas scenes.
function useFestivalFallback(scene){
 if(scene!==currentBackground)return;
 const w=window.innerWidth||390,h=window.innerHeight||844;
 const scale=Math.max(w/320,h/640),sceneW=320*scale,sceneH=640*scale;
 const root=document.documentElement.style;
 root.setProperty("--festival-atlas-width",Math.round(6*sceneW)+"px");
 root.setProperty("--festival-atlas-height",Math.round(sceneH)+"px");
 root.setProperty("--festival-bg-x",Math.round((w-sceneW)/2-scene*sceneW)+"px");
 root.setProperty("--festival-bg-y",Math.round((h-sceneH)/2)+"px");
 document.body.classList.add("festival-fallback");
 document.documentElement.classList.remove("has-festival-art","has-festival-hd");
}
function showFestivalBackground(scene){
 const root=document.documentElement;
 const relative=FESTIVAL_SCENES[scene];
 if(!relative)return;
 const absolute=new URL(relative,document.baseURI).href;
 const apply=()=>{
  if(scene!==currentBackground)return;
  const backdrop=$("festivalBackdrop");
  backdrop.src=absolute; // Real image DOM element, not a CSS url() string.
  document.body.classList.remove("festival-fallback");
  root.classList.add("has-festival-art","has-festival-hd");
 };
 if(loadedFestivalScenes.has(scene)){apply();return;}
 const image=new Image();
 image.decoding="async";
 image.onload=()=>{loadedFestivalScenes.add(scene);apply();};
 image.onerror=()=>{
  if(scene!==currentBackground)return;
  console.warn("Festival HD not ready; showing fallback background:",absolute);
  useFestivalFallback(scene);
 };
 image.src=absolute;
}
function chooseFestivalBackground(remembered){
 let next=Number.isInteger(remembered)&&remembered>=0&&remembered<FESTIVAL_COUNT?remembered:-1;
 if(next<0){
  const prev=Number.isInteger(save.lastBackground)&&save.lastBackground>=0&&save.lastBackground<FESTIVAL_COUNT?save.lastBackground:-1;
  // Randomize only among the supplied high-resolution scenes without repeats.
  next=prev<0?Math.floor(Math.random()*FESTIVAL_COUNT):
       (prev+1+Math.floor(Math.random()*(FESTIVAL_COUNT-1)))%FESTIVAL_COUNT;
 }
 currentBackground=next;
 save.lastBackground=next;
 document.body.dataset.festival=String(next+1);
 showFestivalBackground(next);
 persist();
}
function initFestivalBackground(){
 const backdrop=$("festivalBackdrop");
 backdrop.addEventListener("error",()=>useFestivalFallback(currentBackground));
 const resumed=save.run&&Number.isInteger(save.run.backgroundId)?save.run.backgroundId:null;
 chooseFestivalBackground(resumed??save.lastBackground??null);
 window.addEventListener("resize",()=>{
  if(document.body.classList.contains("festival-fallback"))useFestivalFallback(currentBackground);
 },{passive:true});
}

function toast(text){const t=$("toast");t.textContent=text;t.hidden=false;clearTimeout(timer);timer=setTimeout(()=>t.hidden=true,2400);}
// Event-specific sound design lives in harmony/audio.js. The engine unlocks
// only after user interaction, respects preferences and limits polyphony.
function sound(type,detail){
 if(!save.sound||document.hidden)return;
 window.HarmonyAudio?.play(type,detail||{});
}
function showMenu(){
 if(busy)return;
 clearScoreFx();
 saveRun();document.body.classList.remove("harmony-playing");$("gameView").hidden=true;$("menuView").hidden=false;$("modal").hidden=true;renderMenu();
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
 game=new R.Game(i,data);chooseFestivalBackground(resume&&save.run&&save.run.level===i?save.run.backgroundId:null);scoreShown=game.score;clearScoreFx();lastGoalProgress=game.progress();selected=-1;$("menuView").hidden=true;$("gameView").hidden=false;document.body.classList.add("harmony-playing");$("modal").hidden=true;
 $("levelTitle").textContent=game.config.name;$("levelNumber").textContent="NIVÅ "+(i+1)+" AV "+R.levels.length;
 $("goalLabel").textContent=game.goalText();
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
    const isNew=Object.hasOwn(newFamilyRows,piece.family);
    if(isNew)holder.classList.add("new-family");
    const emoji=document.createElement("span");emoji.className="fallback";emoji.textContent=symbols[piece.family];
    const img=document.createElement("span");img.className="sprite";
    img.style.setProperty("--sx",((piece.stage-1)*25)+"%");
    img.style.setProperty("--sy",(isNew?(newFamilyRows[piece.family]*100/3):familyRows[piece.family]*25)+"%");
    if(isNew)img.classList.add("sprite-new");
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
 if(progress>lastGoalProgress&&lastGoalProgress>=0){
  const node=$("goalProgress");
  if(!save.reduceMotion)animateNode(node,[
   {transform:"scale(.95)",offset:0},
   {transform:"scale(1.24)",offset:.46},
   {transform:"scale(1)",offset:1}
  ],330);
 }
 lastGoalProgress=progress;
 const earnedStars=game.stars();
 $("statusStars").textContent="★".repeat(earnedStars)+"☆".repeat(3-earnedStars);
 document.querySelector(".goal").classList.toggle("goal-complete",game.complete);
}
function renderScoreOnly(){
 $("scoreCount").textContent=prettify(scoreDisplayed);
 $("scoreBest").textContent=prettify(Math.max(scoreShown,save.bestScores[level]||0));
}
// Count actual earned points only on arrival, then visibly roll the displayed
// number forward. No gameplay scores are changed; 260ms maximum tween.
function animateScoreCount(){
 if(scoreRaf)cancelAnimationFrame(scoreRaf);
 scoreRaf=0;
 const from=scoreDisplayed,target=scoreShown;
 if(from===target)return;
 if(save.reduceMotion||(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)||document.hidden){
  scoreDisplayed=target;renderScoreOnly();return;
 }
 const duration=260,started=performance.now();
 const frame=now=>{
  const t=Math.max(0,Math.min(1,(now-started)/duration));
  scoreDisplayed=Math.round(from+(target-from)*(1-Math.pow(1-t,3)));
  renderScoreOnly();
  if(t<1)scoreRaf=requestAnimationFrame(frame);
  else{scoreRaf=0;scoreDisplayed=target;renderScoreOnly();}
 };
 scoreRaf=requestAnimationFrame(frame);
}
function choose(i){
 if(busy||!game||game.moves<=0||!$("modal").hidden)return;
 if(selected>=0&&selected!==i&&R.neighbors(selected).includes(i)){const a=selected;selected=-1;trySwap(a,i);return;}
 selected=selected===i?-1:i;
 if(selected===i)sound("tap");
 $("selectedInfo").textContent=selected<0?"Välj två grannar eller svep.":names[game.board[i].family]+" · stadium "+game.board[i].stage+" av 5 · välj en granne";
 renderBoard(game.board);
 if(selected===i&&!FAST()){
  const piece=boardTiles[i]?.querySelector(".piece");
  // This settles into the selected CSS pose, rather than popping back at the end.
  animateNode(piece,[
   {transform:"translate3d(0,0,0) scale(.96)"},
   {transform:"translate3d(0,-3px,0) scale(1.085)",offset:.65},
   {transform:"translate3d(0,-2px,0) scale(1.055)"}
  ],115,{easing:"cubic-bezier(.19,.8,.25,1)"});
 }
}
function trySwap(a,b){
 if(busy||!game||!$("modal").hidden)return;
 const result=game.swap(a,b);
 if(!result.ok){
  selected=b;renderBoard(game.board);
  $("selectedInfo").textContent="Ingen matchning – prova ett annat byte.";
  // The rules did not consume a move. The animation is feedback only.
  sound("invalid");
  void invalidSwapBounce(a,b);
  return;
 }
 selected=-1;$("selectedInfo").textContent="Välj två grannar eller svep.";
 sound("swap");
 void playEvents(result.events);
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
const MOBILE_LITE=!!(window.matchMedia&&window.matchMedia("(max-width: 650px) and (pointer: coarse)").matches);
function animateNode(node,keyframes,ms,options={}){
 if(!node||!node.animate||FAST()||document.hidden||ms<=0)return Promise.resolve();
 const motion=node.animate(keyframes,{duration:ms,easing:"cubic-bezier(.2,.7,.2,1)",fill:"both",...options});
 perf?.animated();
 return motion.finished.catch(()=>{}).then(()=>motion.cancel());
}
// A stable board does not move mid-turn. Cache viewport geometry per turn.
function indexRect(index){
 if(rectCache){
  if(!rectCache[index])rectCache[index]=boardTiles[index].getBoundingClientRect();
  return rectCache[index];
 }
 return boardTiles[index].getBoundingClientRect();
}
// Reversible invalid swap: genuine movement to ~75% of the adjacent cell
// followed by a gentle spring back. No fake board mutation or score change.
async function invalidSwapBounce(a,b){
 if(busy||FAST())return;
 const pieceA=boardTiles[a]?.querySelector(".piece");
 const pieceB=boardTiles[b]?.querySelector(".piece");
 if(!pieceA||!pieceB)return;
 const rectA=indexRect(a),rectB=indexRect(b);
 const dx=rectB.left-rectA.left,dy=rectB.top-rectA.top;
 const frames=(sign)=>[
  {transform:"translate3d(0,0,0) scale(1)",offset:0},
  {transform:"translate3d("+(dx*sign*.74)+"px,"+(dy*sign*.74)+"px,0) scale(.95)",offset:.44},
  {transform:"translate3d("+(dx*sign*.88)+"px,"+(dy*sign*.88)+"px,0) scale(.96)",offset:.55},
  {transform:"translate3d("+(-dx*sign*.055)+"px,"+(-dy*sign*.055)+"px,0) scale(1.04)",offset:.87},
  {transform:"translate3d(0,0,0) scale(1)",offset:1}
 ];
 busy=true;$("board").setAttribute("aria-busy","true");
 try{
  await Promise.all([
   animateTilePiece(a,pieceA,frames(1),215,{easing:"ease-in-out"}),
   animateTilePiece(b,pieceB,frames(-1),215,{easing:"ease-in-out"})
  ]);
 }finally{
  busy=false;$("board").setAttribute("aria-busy","false");
 }
}

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
 if(scoreOverlay){
  // An element removed during a score flight can still own an active WAAPI
  // animation. Cancel its compositor work before dropping the layer.
  for(const animation of scoreOverlay.getAnimations?.({subtree:true})||[])animation.cancel();
  scoreOverlay.replaceChildren();
 }
 if(scoreRaf){cancelAnimationFrame(scoreRaf);scoreRaf=0;}
 scoreDisplayed=scoreShown;
}
function fxAt(className,x,y,text){
 const span=document.createElement("span");
 span.className=className;span.style.left=x+"px";span.style.top=y+"px";
 if(text!==undefined)span.textContent=text;
 scoreFxLayer().appendChild(span);
 perf?.fx(fxCount());
 return span;
}
// Family-specific evolution overlays: one small recycled-style visual cue
// per survivor, no canvas, huge particle cloud or modification to game logic.
const EVOLUTION_FAMILIES=new Set(["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"]);
function evolveFamilyFx(groups){
 if(FAST()||!Element.prototype.animate)return;
 for(const g of groups.slice(0,MOBILE_LITE?2:3)){
  if(!EVOLUTION_FAMILIES.has(g.family)||!boardTiles[g.at])continue;
  const r=indexRect(g.at),size=Math.min(r.width,r.height);
  const node=fxAt("evo-family evo-"+g.family,r.left+r.width/2,r.top+r.height/2);
  node.style.setProperty("--evo-size",Math.round(size*1.45)+"px");
  const paths={
   sakura:[{transform:"translate3d(0,6px,0) rotate(-22deg) scale(.5)",opacity:0},
    {transform:"translate3d(0,-3px,0) rotate(10deg) scale(1.12)",opacity:.95,offset:.46},
    {transform:"translate3d(9px,-11px,0) rotate(32deg) scale(1.24)",opacity:0}],
   lantern:[{transform:"scale(.42)",opacity:0},
    {transform:"scale(1.14)",opacity:.87,offset:.45},{transform:"scale(1.5)",opacity:0}],
   koi:[{transform:"scale(.45) rotate(-12deg)",opacity:0},
    {transform:"scale(.97) rotate(10deg)",opacity:.96,offset:.38},
    {transform:"scale(1.42) rotate(26deg)",opacity:0}],
   fan:[{transform:"rotate(-32deg) scale(.45)",opacity:0},
    {transform:"rotate(11deg) scale(1.1)",opacity:.90,offset:.44},
    {transform:"rotate(34deg) scale(1.35)",opacity:0}],
   bonsai:[{transform:"translate3d(0,9px,0) scale(.56)",opacity:0},
    {transform:"translate3d(0,-2px,0) scale(1.08)",opacity:.9,offset:.45},
    {transform:"translate3d(0,-12px,0) scale(1.1)",opacity:0}],
   sushi:[{transform:"scale(.5) rotate(-10deg)",opacity:0},
    {transform:"scale(1.05) rotate(8deg)",opacity:.95,offset:.45},{transform:"scale(1.4) rotate(20deg)",opacity:0}],
   maneki:[{transform:"translate3d(0,5px,0) scale(.5)",opacity:0},
    {transform:"translate3d(0,-2px,0) scale(1.08)",opacity:.94,offset:.47},{transform:"translate3d(0,-12px,0) scale(1.26)",opacity:0}],
   origami:[{transform:"rotate(-32deg) scale(.5)",opacity:0},
    {transform:"rotate(10deg) scale(1.1)",opacity:.95,offset:.44},{transform:"rotate(34deg) scale(1.34)",opacity:0}],
   ryu:[{transform:"rotate(-24deg) scale(.5)",opacity:0},
    {transform:"rotate(8deg) scale(1.08)",opacity:.98,offset:.45},{transform:"rotate(28deg) scale(1.45)",opacity:0}]
  };
  animateNode(node,paths[g.family],590,{easing:"cubic-bezier(.14,.65,.27,1)"}).finally(()=>node.remove());
 }
}
// A clear, local confirmation that a normal 3-match advanced a stage.
// The small marker fades upward while the original sprite remains readable.
function evolutionStageLabels(groups){
 if(FAST()||!Element.prototype.animate)return;
 for(const g of groups.slice(0,MOBILE_LITE?2:3)){
  if(!boardTiles[g.at]||!Number.isFinite(g.to))continue;
  const r=indexRect(g.at),x=r.left+r.width/2,y=r.top+r.height*.15;
  const node=fxAt("evolution-stage-label",x,y,"✦ STADIUM "+g.to);
  animateNode(node,[
   {transform:"translate3d(0,8px,0) scale(.82)",opacity:0,offset:0},
   {transform:"translate3d(0,-8px,0) scale(1.02)",opacity:1,offset:.28},
   {transform:"translate3d(0,-16px,0) scale(1)",opacity:1,offset:.69},
   {transform:"translate3d(0,-24px,0) scale(.88)",opacity:0,offset:1}
  ],650).finally(()=>node.remove());
 }
}
let rewardTier=0;
function announceReward(tier,label,duration=700){
 if(tier<=rewardTier)return;
 rewardTier=tier;
 const chip=$("combo");
 clearTimeout(comboTimer);
 chip.textContent="✦ "+label;
 chip.dataset.tier=String(tier);
 chip.hidden=false;
 comboTimer=setTimeout(()=>{chip.hidden=true;},FAST()?300:duration);
}
function masterpieceMoment(positions){
 if(FAST()||!Element.prototype.animate)return;
 for(const at of [...new Set(positions)].slice(0,MOBILE_LITE?2:3)){
  if(!boardTiles[at])continue;
  const r=indexRect(at),size=Math.min(r.width,r.height);
  const halo=fxAt("masterpiece-halo",r.left+r.width/2,r.top+r.height/2);
  halo.style.width=Math.round(size*1.62)+"px";halo.style.height=Math.round(size*1.62)+"px";
  animateNode(halo,[
   {transform:"scale(.36)",opacity:0,offset:0},
   {transform:"scale(.92)",opacity:1,offset:.31},
   {transform:"scale(1.18)",opacity:.9,offset:.59},
   {transform:"scale(1.45)",opacity:0,offset:1}
  ],680).finally(()=>halo.remove());
 }
}
// A clearly readable but compact reward, scaled to match size.
// Ring and stars are painted in a single ephemeral fixed overlay, not in the board.
function fusionBurst(positions,groups=[],kind="fusion"){
 if(FAST()||!Element.prototype.animate)return;
 for(const at of [...new Set(positions)].slice(0,MOBILE_LITE?2:3)){
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
  const count=MOBILE_LITE?(strong?5:4):(strong?8:6),drift=radius*(strong?.92:.76);
  for(let i=0;i<count;i++){
   // Keep the tactile fusion ring; skip only excess decorative sparks.
   if((LITE_FX()&&i>=2)||(MOBILE_LITE&&fxCount()>=32))break;
   const theta=(i/count)*Math.PI*2-.2,d=drift*(.85+(i%3)*.15);
   const spark=fxAt("fusion-spark"+(i%3===0?" mint":""),x,y);
   animateNode(spark,[
    {transform:"translate3d(0,0,0) scale(.5)",opacity:0,offset:0},
    {transform:"translate3d("+(Math.cos(theta)*d*.34)+"px,"+(Math.sin(theta)*d*.34)+"px,0) scale(1.35)",opacity:1,offset:.37},
    {transform:"translate3d("+(Math.cos(theta)*d)+"px,"+(Math.sin(theta)*d)+"px,0) scale(.18)",opacity:0,offset:1}
   ],big?375:315).finally(()=>spark.remove());
  }
  // Significant matches use a single quiet reward chip above the board.
 }
}
function scoreArrival(points){
 const counter=$("scoreCount");
 if(!counter||!counter.isConnected)return;
 const panel=$("scorePanel"),r=counter.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 // Arrival is one brief weighted tap at the destination. Cap the repeated
 // decorative pulse when two score streams finish almost simultaneously.
 const now=performance.now(),mayPulse=(now-lastScoreImpact>=120);
 if(mayPulse)lastScoreImpact=now;
 if(mayPulse&&!FAST()&&Element.prototype.animate){
  if(panel)animateNode(panel,[
   {transform:"scale(1)",offset:0},
   {transform:"scale("+(points>=500?"1.07":"1.045")+")",offset:.43},
   {transform:"scale(1)",offset:1}
  ],315);
  animateNode(counter,[
   {transform:"scale(1)",color:"#F2C66E",offset:0},
   {transform:"scale(1.30)",color:"#FFF2DC",offset:.38},
   {transform:"scale(1.07)",color:"#FFE6A0",offset:.70},
   {transform:"scale(1)",color:"#F2C66E",offset:1}
  ],430);
  const ring=fxAt("score-impact-ring",x,y);
  animateNode(ring,[
   {transform:"scale(.48)",opacity:.95,offset:0},
   {transform:"scale(1.38)",opacity:.60,offset:.47},
   {transform:"scale(1.9)",opacity:0,offset:1}
  ],345).finally(()=>ring.remove());
  if(points>=250){
   const glint=fxAt("score-arrival-glint",r.right-10,r.top+8,"✦");
   animateNode(glint,[
    {transform:"translate3d(0,8px,0) scale(.5)",opacity:0,offset:0},
    {transform:"translate3d(1px,-6px,0) scale(1.16)",opacity:1,offset:.42},
    {transform:"translate3d(8px,-22px,0) scale(.67)",opacity:0,offset:1}
   ],365).finally(()=>glint.remove());
  }
 }else if(FAST()){
  // Accessible feedback remains instant; no recurring heavy glow on fast
  // chained arrivals when the normal motion setting is enabled.
  counter.classList.add("score-accessible-flash");
  setTimeout(()=>counter.classList.remove("score-accessible-flash"),240);
 }
 sound("arrival",{points});
}
function pointSources(evt){
 const amount=Math.round(evt.scoreDelta||0);
 if(amount<=0)return [];
 if(evt.type==="fusion"&&evt.groups?.length){
  const groups=evt.groups.filter(g=>g.at>=0);
  const limited=groups.slice(0,MOBILE_LITE?2:3);
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
  if(FAST()||!Element.prototype.animate||scoreFlights>=(MOBILE_LITE?2:5)){
   scoreShown+=points;animateScoreCount();scoreArrival(points);continue;
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
  const duration=MOBILE_LITE?500:555;
  const label=fxAt("score-flight-token",x,y,"+"+prettify(points));
  label.dataset.points=String(points);
  const flight=animateNode(label,keyframes,duration,{easing:"linear"});
  // A visible stream of small gold sparks follows the exact same curved arc.
  const trails=MOBILE_LITE?2:Math.max(3,Math.min(5,5-n));
  for(let k=0;k<trails;k++){
   if((LITE_FX()&&k>=1)||(MOBILE_LITE&&fxCount()>=32))break;
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
   animateScoreCount();
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
 const b=board.getBoundingClientRect(),p=boardLayerRect||parent.getBoundingClientRect();
 if(rectCache&&!boardLayerRect)boardLayerRect=p;
 const layer=document.createElement("div");layer.className="fusion-fx-layer";
 // Absolute children are positioned from the shell's PADDING edge, not
 // getBoundingClientRect()'s outside border edge. Account for shell borders,
 // then all ghost/tile coordinates share exactly the same origin.
 layer.style.left=(b.left-p.left-parent.clientLeft)+"px";
 layer.style.top=(b.top-p.top-parent.clientTop)+"px";
 layer.style.width=b.width+"px";layer.style.height=b.height+"px";
 parent.appendChild(layer);
 return {node:layer,rect:b};
}
// Identical 49 stable tiles; only actual moving pieces get animations.
// The last 20% is a short landing cushion, not a whole-board shake.
function flipMove(previous,next,type){
 if(FAST())return Promise.resolve();
 const origin=new Map();
 previous.forEach((p,i)=>{if(p)origin.set(p.id,i);});
 const tasks=[],size=indexRect(0).height;
 next.forEach((p,i)=>{
  if(!p)return;
  const before=origin.get(p.id);
  if(before===i)return;
  const piece=boardTiles[i].querySelector(".piece");
  if(!piece)return;
  if(before!==undefined){
   const a=indexRect(before),b=indexRect(i);
   const dx=a.left-b.left,dy=a.top-b.top;
   if(type==="swap"){
    tasks.push(animateTilePiece(i,piece,[
     {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.98)",offset:0},
     {transform:"translate3d("+(dx*.25)+"px,"+(dy*.25)+"px,0) scale(1.025)",offset:.72},
     {transform:"translate3d(0,0,0) scale(1)",offset:1}
    ],166,{easing:"cubic-bezier(.22,.72,.28,1)"}));
   }else{
    const distance=Math.abs(dy)/Math.max(1,size);
    tasks.push(animateTilePiece(i,piece,[
     {transform:"translate3d("+dx+"px,"+dy+"px,0)",offset:0},
     {transform:"translate3d(0,2.2px,0) scale(1.015,.955)",offset:.86},
     {transform:"translate3d(0,-1.2px,0) scale(.995,1.01)",offset:.95},
     {transform:"translate3d(0,0,0) scale(1)",offset:1}
    ],195+Math.min(65,distance*14),{easing:"cubic-bezier(.25,.65,.24,1)"}));
   }
  }else if(type==="fall"){
   // Newly spawned objects drop along their column, then settle with a very
   // small squash / release; cap duration for large mobile cascades.
   const row=Math.floor(i/7),entry=(row+2)*size;
   tasks.push(animateTilePiece(i,piece,[
    {transform:"translate3d(0,"+(-entry)+"px,0) scale(.95)",opacity:.52,offset:0},
    {transform:"translate3d(0,2.4px,0) scale(1.025,.95)",opacity:1,offset:.84},
    {transform:"translate3d(0,-1.4px,0) scale(.99,1.02)",opacity:1,offset:.94},
    {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:1}
   ],205+Math.min(65,row*8),{easing:"cubic-bezier(.26,.64,.24,1)",delay:Math.min(22,(i%7)*4)}));
  }
 });
 return Promise.all(tasks);
}
// Fusion 4.3.1 — physical absorption instead of fading away in transit.
// The sprite remains fully opaque until it reaches the survivor; the
// upgraded art is revealed only AFTER every source has visibly arrived.
// Pass 5 / 4.3.2: let the player follow every source object into the
// surviving tile. Times below refer to visible travel only: the anticipation
// and brief contact hold are separate beats, before the new sprite appears.
// Fusion 4.3.4 — A/B timing correction after fixing actual tile positioning.
// Restore the original 4.3.1 280ms travel, not the slower 4.3.2 timing.
// Keep the 4.3.3 CSS/board coordinate fix unchanged.
function fusionGatherFrames(dx,dy){
 const at=(t,scale,opacity=1,offset)=>({
  transform:"translate3d("+(dx*t)+"px,"+(dy*t)+"px,0) scale("+scale+")",
  opacity,offset
 });
 return [
  at(0,1,1,0),
  at(0,1.075,1,.13),         // small anticipation: player sees who will move
  at(.35,1.0,1,.47),          // travel at full visibility
  at(.80,.86,1,.79),         // begins to converge near survivor
  at(.98,.66,1,.94),         // remains clearly recognizable almost at contact
  at(1,.49,.92,1)            // final absorbed at the exact target location
 ];
}
function fusionIntake(groups){
 if(FAST()||!Element.prototype.animate)return;
 // One compact amber / family-tinted contact ring per important survivor.
 for(const g of groups.slice(0,MOBILE_LITE?2:3)){
  if(!boardTiles[g.at])continue;
  const r=indexRect(g.at),size=Math.min(r.width,r.height);
  const cue=fxAt("fusion-intake intake-"+g.family,r.left+r.width*.5,r.top+r.height*.5);
  cue.style.width=Math.round(size*.84)+"px";
  cue.style.height=Math.round(size*.84)+"px";
  animateNode(cue,[
   {transform:"scale(.55)",opacity:0,offset:0},
   {transform:"scale(.92)",opacity:.95,offset:.30},
   {transform:"scale(1.33)",opacity:.58,offset:.62},
   {transform:"scale(1.6)",opacity:0,offset:1}
  ],260).finally(()=>cue.remove());
 }
}
async function playFusion(evt){
 const groups=evt.groups||[];
 if(!FAST()&&groups.length){
  const layer=makeFxLayer(),hidden=[],tasks=[];
  try{
   for(const group of groups){
    const survivor=boardTiles[group.at]?.querySelector(".piece");
    if(survivor)tasks.push(animateNode(survivor,[
     {transform:"scale(1)",offset:0},
     {transform:"scale(.91)",offset:.24},
     {transform:"scale(1.10)",offset:.85},
     {transform:"scale(.96)",offset:1}
    ],280,{easing:"cubic-bezier(.26,.3,.65,1)"}));
    for(const i of group.removed){
     const original=boardTiles[i]?.querySelector(".piece");
     if(!original)continue;
     const from=indexRect(i),to=indexRect(group.at);
     const ghost=original.cloneNode(true);
     ghost.classList.add("fusion-ghost");
     ghost.style.left=(from.left-layer.rect.left)+"px";
     ghost.style.top=(from.top-layer.rect.top)+"px";
     ghost.style.width=from.width+"px";
     ghost.style.height=from.height+"px";
     // Ghost is safely above the board and carries the unchanged sprite.
     layer.node.appendChild(ghost);
     hidden.push(original);
     original.style.visibility="hidden";
     tasks.push(animateNode(ghost,
      fusionGatherFrames(to.left-from.left,to.top-from.top),
      280,{easing:"cubic-bezier(.34,.16,.72,1)"}));
    }
   }
   await Promise.all(tasks);
  }finally{
   for(const original of hidden)original.style.visibility="";
   layer.node.remove();
  }
 }
 if(groups.length)sound("fusion",{
  family:groups[0].family,stage:groups[0].to,
  combo:Math.max(...groups.map(g=>g.number))
 });
 // Contact is the boundary between moving sources and new survivor stage.
 // The existing fusion effects are kept deliberately subtle.
 renderBoard(evt.board,groups.map(g=>g.at),"swapped");
 fusionIntake(groups);
 fusionBurst(groups.map(g=>g.at),groups);
 await Promise.all(groups.map(g=>animateNode(boardTiles[g.at]?.querySelector(".piece"),[
  {transform:"translate3d(0,1px,0) scale(.80)",opacity:.9,offset:0},
  {transform:"translate3d(0,-2px,0) scale(1.13)",opacity:1,offset:.58},
  {transform:"translate3d(0,1px,0) scale(.97)",opacity:1,offset:.85},
  {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:1}
 ],215,{easing:"cubic-bezier(.2,.67,.26,1)"})));
 evolveFamilyFx(groups);
 evolutionStageLabels(groups);
}
// Energy travels out from the masterpiece BEFORE affected items transform.
// Capped number of visible energy paths; never cap logical target updates.
// Pulse Readability 4.1.1 – a visible travelling energy line and core.
// Animate real from/to coordinates, cap decorative FX, update all logical
// targets AFTER travel as in 4.1. No canvas or full-screen filters.
function pulseBeams(evt){
 if(evt.targets?.length)sound("pulse",{wave:evt.wave||0});
 if(FAST()||!evt.targets?.length)return Promise.resolve();
 const targets=evt.targets.slice(0,MOBILE_LITE?(LITE_FX()?3:5):9);
 const layer=makeFxLayer(),tasks=[];
 const sources=[...new Set(targets.map(t=>t.from))];
 for(const from of sources.slice(0,MOBILE_LITE?2:4)){
  const r=indexRect(from),halo=fxAt("pulse-source-halo",r.left+r.width/2,r.top+r.height/2);
  halo.style.width=Math.round(r.width*1.1)+"px";halo.style.height=Math.round(r.height*1.1)+"px";
  animateNode(halo,[
   {transform:"scale(.3)",opacity:0,offset:0},
   {transform:"scale(1)",opacity:1,offset:.33},
   {transform:"scale(1.42)",opacity:0,offset:1}
  ],425).finally(()=>halo.remove());
 }
 for(const target of targets){
  const a=indexRect(target.from),b=indexRect(target.to);
  const dx=b.left-a.left,dy=b.top-a.top;
  const sx=a.left-layer.rect.left+a.width*.5,sy=a.top-layer.rect.top+a.height*.5;
  const angle=Math.atan2(dy,dx),dist=Math.hypot(dx,dy);
  const trace=document.createElement("span");trace.className="pulse-trace";
  trace.style.left=sx+"px";trace.style.top=sy+"px";trace.style.width=dist+"px";
  layer.node.appendChild(trace);
  tasks.push(animateNode(trace,[
   {transform:"rotate("+angle+"rad) scaleX(0)",opacity:0,offset:0},
   {transform:"rotate("+angle+"rad) scaleX(.48)",opacity:1,offset:.48},
   {transform:"rotate("+angle+"rad) scaleX(1)",opacity:.18,offset:1}
  ],230,{easing:"cubic-bezier(.2,.4,.5,1)"}));
  const dot=document.createElement("span");dot.className="pulse-dot";
  dot.style.left=(sx-6)+"px";dot.style.top=(sy-6)+"px";
  layer.node.appendChild(dot);
  tasks.push(animateNode(dot,[
   {transform:"translate3d(0,0,0) scale(.4)",opacity:.18,offset:0},
   {transform:"translate3d("+(dx*.5)+"px,"+(dy*.5)+"px,0) scale(1.45)",opacity:1,offset:.5},
   {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.65)",opacity:0,offset:1}
  ],230,{easing:"cubic-bezier(.28,.5,.54,1)"}));
 }
 return Promise.all(tasks).finally(()=>layer.node.remove());
}
function pulseLandingCues(targets){
 if(FAST()||!Element.prototype.animate)return;
 const positions=[...new Set((targets||[]).map(t=>t.to))].slice(0,MOBILE_LITE?3:5);
 for(const at of positions){
  if(!boardTiles[at])continue;
  const r=indexRect(at),node=fxAt("pulse-target-hit",r.left+r.width/2,r.top+r.height/2);
  node.style.width=Math.round(r.width*1.1)+"px";node.style.height=Math.round(r.height*1.1)+"px";
  animateNode(node,[
   {transform:"scale(.38)",opacity:0,offset:0},
   {transform:"scale(1.02)",opacity:1,offset:.30},
   {transform:"scale(1.45)",opacity:0,offset:1}
  ],350).finally(()=>node.remove());
 }
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
  case "bonus":{
   const targets=evt.targets||[];
   renderBoard(evt.board,targets.map(t=>t.to),"pulsed");
   await Promise.all(targets.slice(0,MOBILE_LITE?4:7).map(t=>animateNode(boardTiles[t.to]?.querySelector(".piece"),[
    {transform:"scale(.83)",offset:0},{transform:"scale(1.13)",offset:.58},{transform:"scale(1)",offset:1}
   ],133)));
   break;
  }
  case "pulse":{
   const targets=evt.targets||[];
   await pulseBeams(evt);
   renderBoard(evt.board,targets.map(t=>t.to),"pulsed");
   pulseLandingCues(targets);
   await Promise.all(targets.slice(0,MOBILE_LITE?5:9).map(t=>animateNode(boardTiles[t.to]?.querySelector(".piece"),[
    {transform:"scale(.78)",offset:0},{transform:"scale(1.19)",offset:.5},{transform:"scale(1)",offset:1}
   ],150)));
   break;
  }
  case "hero":
   sound("hero");
   renderBoard(evt.board,evt.positions||[],"harvested");
   masterpieceMoment(evt.positions||[]);
   await Promise.all((evt.positions||[]).slice(0,MOBILE_LITE?3:7).map(i=>animateNode(boardTiles[i]?.querySelector(".piece"),[
    {transform:"scale(.88)",offset:0},{transform:"scale(1.19)",offset:.56},{transform:"scale(1)",offset:1}
   ],180)));
   break;
  case "harvest":{
   sound("harvest",{chain:evt.chain});
   const positions=evt.positions||[];
   if(!FAST()){
    // Masterpieces remain intact while rising. Only the final quarter
    // of the motion dissolves, with a small warm "released energy" ring.
    const tasks=positions.map(i=>animateNode(boardTiles[i]?.querySelector(".piece"),[
     {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
     {transform:"translate3d(0,-3px,0) scale(1.10)",opacity:1,offset:.26},
     {transform:"translate3d(0,-10px,0) scale(.94)",opacity:1,offset:.71},
     {transform:"translate3d(0,-18px,0) scale(.58)",opacity:0,offset:1}
    ],295,{easing:"cubic-bezier(.25,.4,.46,1)"}));
    for(const at of positions.slice(0,MOBILE_LITE?2:3)){
     if(!boardTiles[at])continue;
     const r=indexRect(at),cue=fxAt("harvest-release",r.left+r.width*.5,r.top+r.height*.5);
     cue.style.width=Math.round(r.width)+"px";
     cue.style.height=Math.round(r.height)+"px";
     animateNode(cue,[
      {transform:"scale(.46)",opacity:0,offset:0},
      {transform:"scale(1)",opacity:.85,offset:.35},
      {transform:"scale(1.52)",opacity:0,offset:1}
     ],330).finally(()=>cue.remove());
    }
    await Promise.all(tasks);
   }
   renderBoard(evt.board);
   break;
  }
  case "fall":
   renderBoard(evt.board);
   await flipMove(previous,evt.board,"fall");
   break;
  default:
   renderBoard(evt.board,evt.type==="shuffle"?Array.from({length:49},(_,i)=>i):[],"shuffling");
 }
}
async function playEvents(events){
 busy=true;$("board").setAttribute("aria-busy","true");
 rectCache=new Array(49);boardLayerRect=null;
 perf?.begin();
 rewardTier=0;
 let finished=false,goalReached=false;
 try{
  for(const evt of events){
   await animateEvent(evt);
   if(evt.scoreDelta>0)flyPoints(evt);
   if(["bonus","goal"].includes(evt.type))sound(evt.type);
   if(evt.type==="fusion"){
    const groups=evt.groups||[];
    if(groups.some(g=>g.shape||g.number>=5)||evt.round>=2)announceReward(2,"HARMONI!",710);
    else if(groups.some(g=>g.number>=4))announceReward(1,"VACKERT!",610);
   }else if(evt.type==="hero")announceReward(3,"MÄSTERVERK!",925);
   else if(evt.type==="harvest"&&evt.chain>=2)announceReward(4,"PERFEKT HARMONI · x"+evt.chain,1080);
   else if(evt.type==="swap"){clearTimeout(comboTimer);$("combo").hidden=true;}
   if(evt.type==="goal"){goalReached=true;unlockGoal();toast("✦ Nivåmålet klart! Spela vidare för rekord.");}
   if(evt.type==="end"||evt.type==="lose")finished=true;
   renderHUD(evt);
  }
 }catch(error){
  console.error("Harmony animation interrupted",error);
  renderBoard(game.board);
 }finally{
  rectCache=null;boardLayerRect=null;
  perf?.stop();
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
 clearScoreFx();scoreShown=game.score;scoreDisplayed=scoreShown;renderScoreOnly();
 const won=game.complete;
 if(won)sound("result");
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
// This is a turn-based puzzle; the menu overlay blocks touches while open.
// Local report only: no analytics, disk write or network transfer.
function showPerformanceReport(){
 const stats=perf?.summary(),item=stats?.latest;
 const node=document.createElement("div");
 node.className="performance-report";
 const rows=[
  ["Mätta drag",String(stats?.turns||0)],
  ["Effekter",stats?.constrained?"Reducerade extra partiklar":"Normala"],
  ["Senaste mätning",item?item.frames+" bildrutor":"Spela ett drag för att mäta"],
  ["Genomsnittlig bildrutetid",item?item.averageMs+" ms":"—"],
  ["95:e percentilen",item?item.p95Ms+" ms":"—"],
  ["Uppskattad bildfrekvens",item?.approxFps?item.approxFps+" FPS":"—"],
  ["Långsamma bildrutor",item?item.slowPct+" %":"—"],
  ["Max tillfälliga effekter",item?String(item.peakFx):"—"],
  ["Startade animationer",item?String(item.animations):"—"]
 ];
 for(const [label,value] of rows){
  const p=document.createElement("p"),bold=document.createElement("strong");
  bold.textContent=label+": ";
  p.append(bold,document.createTextNode(value));node.append(p);
 }
 const note=document.createElement("p");
 note.textContent="Mätningen gäller det senaste dragets animationer, inte hela telefonen. Inga data skickas iväg.";
 node.append(note);
 $("modalEyebrow").textContent="MOBILDIAGNOSTIK";
 $("modalTitle").textContent="Prestanda";
 $("modalContent").replaceChildren(node);
 const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Tillbaka till spelet","primary",()=>{$("modal").hidden=true;});
 $("modal").hidden=false;
}
function openGameMenu(){
 if(!game||$("gameView").hidden||busy)return;
 $("modalEyebrow").textContent="JAPANESE HARMONY";
 $("modalTitle").textContent="Spelmeny";
 const content=$("modalContent");content.replaceChildren();
 const desc=document.createElement("p");
 desc.textContent="Nivå "+(level+1)+" · "+game.config.name+" · "+game.moves+" drag kvar";
 content.append(desc);
 const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Fortsätt spela","primary",()=>{$("modal").hidden=true;});
 if(game.complete)modalButton(actions,"Avsluta med resultat","secondary",()=>{if(busy)return;game.finish();showResult();});
 modalButton(actions,"Börja om nivån","secondary",()=>{if(!busy)startLevel(level);});
 modalButton(actions,"Så spelar du","secondary",()=>{$("helpButton").click();});
 modalButton(actions,"Inställningar","secondary",()=>{$("settingsButton").click();});
 modalButton(actions,"Prestanda","secondary",showPerformanceReport);
 modalButton(actions,"Till nivåval","secondary",()=>{if(!busy)showMenu();});
 $("modal").hidden=false;
}
function bind(){
 $("homeButton").addEventListener("click",showMenu);
 $("pauseButton").addEventListener("click",openGameMenu);
 $("continueButton").addEventListener("click",()=>{const r=save.run&&save.run.data&&save.run.data.moves>0?save.run:null;if(r)startLevel(r.level,true);else startLevel(Math.min(R.levels.length-1,save.unlocked));});
 $("helpButton").addEventListener("click",()=>modalInfo("Så spelar du",'<p><strong>Matcha:</strong> Byt två grannar och bilda tre eller fler av samma familj. Stadier får blandas. T- och L-former fungerar också.</p><p><strong>Förädla:</strong> Föremålet med högst stadium överlever på sin plats och får +1. Fyra matchade ger en grannuppgradering; fem eller fler ger två.</p><p><strong>Harmony Pulse:</strong> Vid stadium 5 sprider ett mästerverk sin kraft till upptagna rutor ovanför, nedanför, höger och vänster. Kedjor avslutas innan tomma rutor fylls.</p><p><strong>Nivåmål:</strong> När målet uppnås sparas dina stjärnor. Du får spela återstående drag för att slå ditt rekord. Inga Power Moves eller hinder.</p>'));
 $("settingsButton").addEventListener("click",()=>{
  modalInfo("Inställningar",'<p><label><input type="checkbox" id="settingsSound" '+(save.sound?"checked":"")+'> Ljud</label></p><p><label><input type="checkbox" id="settingsMotion" '+(save.reduceMotion?"checked":"")+'> Minska animationer</label></p>');
  $("settingsSound").addEventListener("change",e=>{save.sound=e.target.checked;window.HarmonyAudio?.setEnabled(save.sound);if(save.sound)window.HarmonyAudio?.unlock();persist();});
  $("settingsMotion").addEventListener("change",e=>{save.reduceMotion=e.target.checked;persist();});
 });
 $("board").addEventListener("pointerdown",e=>{const tile=e.target.closest(".tile");if(tile&&$("modal").hidden)pointer={i:Number(tile.dataset.index),x:e.clientX,y:e.clientY};});
 $("board").addEventListener("pointerup",e=>{
  if(!pointer)return;const start=pointer;pointer=null;
  if(!$("modal").hidden)return;
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
 img.onerror=()=>{document.documentElement.classList.remove("has-atlas");console.warn("Japanese Harmony classic atlas unavailable; using fallback symbols.");};
 img.src="./assets/harmony-atlas.webp";
 // Twenty new, transparent stage images packed into a single mobile-friendly
 // AVIF. Each 192px cell maps to a distinct object, including its masterpiece.
 const extra=new Image();
 extra.onload=()=>document.documentElement.classList.add("has-new-atlas");
 extra.onerror=()=>{document.documentElement.classList.remove("has-new-atlas");console.warn("New harmony sprites unavailable; using fallback symbols.");};
 extra.src="./assets/harmony-new-families.avif?v=5.0";
}
window.HarmonyAudio?.setEnabled(save.sound);
bind();checkAtlas();initFestivalBackground();renderMenu();
})();