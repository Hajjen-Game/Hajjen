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
try{save={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch(e){save={...defaults};}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}
function prettify(x){return Math.round(x||0).toLocaleString("sv-SE");}
function toast(text){const t=$("toast");t.textContent=text;t.hidden=false;clearTimeout(timer);timer=setTimeout(()=>t.hidden=true,2400);}
function sound(type){
 if(!save.sound)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!soundContext)soundContext=new Audio();
  if(soundContext.state==="suspended")soundContext.resume();
  const notes={swap:370,fusion:510,bonus:620,pulse:710,harvest:860,goal:930};
  if(!notes[type])return;
  const o=soundContext.createOscillator(),g=soundContext.createGain(),now=soundContext.currentTime;
  o.type=type==="harvest"?"triangle":"sine";o.frequency.setValueAtTime(notes[type],now);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.19);
  o.connect(g);g.connect(soundContext.destination);o.start(now);o.stop(now+.2);
 }catch(e){}
}
function showMenu(){
 if(busy)return;
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
function saveRun(){if(game&&game.moves>0&&!game.failed){save.run={level,data:game.save()};persist();}}
function startLevel(i,resume=false){
 if(busy)return;
 level=i;const data=resume&&save.run&&save.run.level===i?save.run.data:null;
 game=new R.Game(i,data);selected=-1;$("menuView").hidden=true;$("gameView").hidden=false;$("modal").hidden=true;
 $("levelTitle").textContent=game.config.name;$("levelNumber").textContent="NIVÅ "+(i+1)+" AV "+R.levels.length;
 $("gameTip").textContent=game.config.intro;$("goalLabel").textContent=game.goalText();
 clearTimeout(comboTimer);$("combo").hidden=true;
 renderBoard(game.board);renderHUD();saveRun();
}
// Keep 49 stable cells. Only update a sprite when the piece in that cell changes.
// The old renderer recreated ~150 DOM nodes and 49 listeners for EVERY fusion frame.
let boardTiles=[],boardKeys=[];
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
}
function renderHUD(state){
 if(!game)return;
 let current=state||game,progress=state?state.goal:game.progress();
 $("movesCount").textContent=current.moves;
 $("scoreCount").textContent=prettify(current.score);
 $("scoreBest").textContent=prettify(Math.max(current.score||0,save.bestScores[level]||0));
 $("goalProgress").textContent=Math.min(game.target(),progress)+" / "+game.target();
 $("statusStars").textContent=game.stars()?"★".repeat(game.stars())+"☆".repeat(3-game.stars()):"";
 $("goalBanner").hidden=!game.complete;
 $("endButton").hidden=!game.complete||busy;
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
const nap=ms=>new Promise(res=>setTimeout(res,ms));
async function playEvents(events){
 busy=true;$("endButton").hidden=true;let finished=false,goalReached=false;
 for(const evt of events){
  const marks=highlightIndices(evt);
  renderBoard(evt.board,marks.indices,marks.effect);
  renderHUD(evt);
  if(["fusion","bonus","pulse","harvest","goal"].includes(evt.type))sound(evt.type);
  if(evt.type==="harvest"&&evt.chain>=2){$("combo").textContent="✦ HARMONY CHAIN · "+evt.chain+" MÄSTERVERK";$("combo").hidden=false;clearTimeout(comboTimer);comboTimer=setTimeout(()=>$("combo").hidden=true,save.reduceMotion?450:950);}
  else if(evt.type==="swap"){clearTimeout(comboTimer);$("combo").hidden=true;}
  if(evt.type==="goal"){goalReached=true;unlockGoal();toast("✦ Nivåmålet klart! Spela vidare för rekord.");}
  if(evt.type==="end"||evt.type==="lose")finished=true;
  const d=save.reduceMotion?0:({swap:55,fusion:115,bonus:80,hero:85,pulse:105,harvest:135,fall:75,shuffle:100,goal:60})[evt.type]||0;
  if(d)await nap(d);
 }
 busy=false;renderBoard(game.board);renderHUD();saveRun();
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
bind();checkAtlas();renderMenu();
})();