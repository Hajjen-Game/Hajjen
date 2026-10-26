/* Japanese Harmony · first playable mobile-first application */
(function(){
"use strict";
const R=window.HarmonyRules,G=window.HarmonyGoshuincho,E=window.HarmonyEconomy,F=window.HarmonyFortune,S=window.HarmonySpirits,P=window.HarmonyPowers,$=id=>document.getElementById(id);
const names={sakura:"Sakura",lantern:"Lykta",koi:"Koi",fan:"Solfjäder",bonsai:"Bonsai",sushi:"Sushi",maneki:"Maneki-neko",origami:"Origami",ryu:"Ryu-drake"};
const symbols={sakura:"🌸",lantern:"🏮",koi:"🐟",fan:"🪭",bonsai:"🌳",sushi:"🍣",maneki:"🐱",origami:"🕊️",ryu:"🐉"};
const familyRows={sakura:0,lantern:1,koi:2,fan:3,bonsai:4};
const newFamilyRows={sushi:0,maneki:1,origami:2,ryu:3};
const stages=["","Knopp / början","På väg","Utvecklad","Nästan mästerverk","Mästerverk"];
const KEY="japanese-harmony-puzzle-v2";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,sound:true,reduceMotion:false,playMode:"auto",fourFamilyScores:{},fourFamilyStars:{},fourFamilyChain:{}};
let save,game=null,level=0,selected=-1,busy=false,timer=0,pointer=null,suppressClickUntil=0;
const MENU_PAGE_SIZE=20;let menuPage=0;const collectionCards=new Map();
let goshuinChapter=0,goshuinPage=0;
let rewardStarsAtLevelStart=0; // transient baseline, never persisted
let powerSelection=null;
const PLAY_MODES={auto:"Automatiskt · 4.0 från nivå 10",v4:"Objective & Recovery 4.0",standard:"Standard",v2:"Opportunity 2.0",v3:"Pacing 3.0",v31:"Objective Awareness 3.1",v311:"Endgame Objective Awareness 3.1.1"};
const PACE_PHASE_NAMES={build:"BYGGER",flow:"FLOW",relax:"ANDRUM",recovery:"NYA MÖJLIGHETER"};
let decisionReadyAt=0;
function armDecisionClock(){decisionReadyAt=performance.now();}
function disarmDecisionClock(){decisionReadyAt=0;}
function updatePaceLabel(){
 const node=$("paceStatus");if(!node||!game)return;
 node.textContent=(game.familyCount===4?"4 FAMILJER · ":"5 FAMILJER · ")+
  (game.directorMode==="v4"?"OBJECTIVE 4.0 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BYGGER"):game.directorMode==="v311"?"ENDGAME 3.1.1 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BYGGER"):game.directorMode==="v31"?"OBJECTIVE 3.1 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BYGGER"):game.directorMode==="v3"?
  "PACING 3.0 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BYGGER"):
  game.directorMode==="v2"?"OPPORTUNITY 2.0":"STANDARD");
 node.title=game.directorMode==="v4"?"Director 4.0 bedömer nåbara nivåmål, delträffar på Daruma och Sealed Stones samt rättvisa påfyllningar.":game.directorMode==="v311"?"Endgame 3.1.1 värderar nåbarheten för de sista 1–3 dimrutorna med samma vanliga påfyllningar som 3.1.":
  game.directorMode==="v31"?"Objective Awareness värderar befintliga mål, fusionsposition och Pulse, men använder bara rättvisa påfyllningar.":
  game.directorMode==="v3"?"3.0 bygger på Opportunity 2.0 och väljer mellan vanliga, rättvisa påfyllningar.":"Påfyllningsläge för denna omgång";
 // Preserve diagnostics for accessibility / game testing but remove the
 // technical status strip from the visual game hierarchy.
 $("gameView")?.setAttribute("data-family-count",String(game.familyCount));
}
// Directed hint after 30 seconds of real play inactivity: show the SOURCE
// and TARGET of an evaluated, genuinely legal move, without spending turns.
const IDLE_HINT_DELAY_MS=30000;
let idleHintTimer=0,idleHintFrom=-1,idleHintTo=-1;
// Compute the expensive best-move simulation only once per unchanged board.
// Harmless taps and invalid swaps can restart the idle timer without redoing it.
let cachedIdleHint=null;
function bestIdleHint(){
 const signature=game.board.map(p=>p?p.id+":"+p.stage+":"+p.family:"-").join("|");
 if(cachedIdleHint&&cachedIdleHint.game===game&&
  cachedIdleHint.signature===signature&&cachedIdleHint.moves===game.moves&&
  cachedIdleHint.score===game.score&&cachedIdleHint.rolls===game.rolls)
  return cachedIdleHint.value;
 const value=R.bestHint(game);
 cachedIdleHint={game,signature,moves:game.moves,score:game.score,
  rolls:game.rolls,value};
 return value;
}
function clearIdleHint(){
 if(idleHintTimer){clearTimeout(idleHintTimer);idleHintTimer=0;}
 for(const index of [idleHintFrom,idleHintTo]){
  if(index>=0)document.querySelector('.tile[data-index="'+index+'"]')?.classList.remove("idle-hint-source","idle-hint-target");
 }
 idleHintFrom=-1;idleHintTo=-1;
}
function hintEligible(){
 return !!game&&game.moves>0&&!game.failed&&!busy&&
  !$("gameView").hidden&&$("modal").hidden&&!document.hidden;
}
function restartIdleHint(){
 clearIdleHint();
 if(!hintEligible())return;
 idleHintTimer=setTimeout(()=>{
  idleHintTimer=0;
  if(!hintEligible())return;
  const hint=bestIdleHint();
  if(!hint)return;
  idleHintFrom=hint.from;idleHintTo=hint.to;
  document.querySelector('.tile[data-index="'+hint.from+'"]')?.classList.add("idle-hint-source");
  document.querySelector('.tile[data-index="'+hint.to+'"]')?.classList.add("idle-hint-target");
 },IDLE_HINT_DELAY_MS);
}
let scoreShown=0,scoreDisplayed=0,scoreRaf=0,scoreSession=0,scoreFlights=0,scoreOverlay=null;
let lastGoalProgress=-1,lastScoreImpact=0;
const perf=window.HarmonyPerf?.create();
let rectCache=null,boardLayerRect=null;
const LITE_FX=()=>MOBILE_LITE&&!!perf?.constrained;
const fxCount=()=>scoreOverlay?.childElementCount||0;
// First 20 Levels Redesign 1.0: one-time RESET FOR EVERY BROWSER PROFILE.
// Scores, stars, old runs and unlocks belong to this browser's localStorage;
// the repository has no remotely deletable player account database.
// This marker is separate from the save so even historic save-migrations
// cannot repopulate archived scores or stars after the reset. Preferences
// are carried over, but every player restarts independently at level 1.
const RESET_MARKER="japanese-harmony-first20-reset-20261024-v1";
try{
 const stored=JSON.parse(localStorage.getItem(KEY)||"{}");
 if(localStorage.getItem(RESET_MARKER)!=="done"){
  save={...defaults,
   sound:typeof stored.sound==="boolean"?stored.sound:defaults.sound,
   reduceMotion:!!stored.reduceMotion,
   playMode:Object.hasOwn(PLAY_MODES,stored.playMode)?stored.playMode:defaults.playMode};
  localStorage.setItem(KEY,JSON.stringify(save));
  localStorage.setItem(RESET_MARKER,"done");
 }else save={...defaults,...stored};
}catch(e){save={...defaults};}
// Legacy ten-level saves capped the last unlock at level 10 (zero-based 9).
// Recover the next playable level using evidence of completed runs only;
// neither an unfinished run nor a lost run may unlock an extra level.
function reconcileCompletedLevels(state){
 let unlocked=Number.isInteger(state.unlocked)&&state.unlocked>=0?state.unlocked:0;
 for(const records of [state.bestStars,state.bestScores,state.fourFamilyStars,state.fourFamilyScores]){
  if(!records||typeof records!=="object")continue;
  for(const [key,value] of Object.entries(records)){
   const n=Number(key);
   if(Number.isInteger(n)&&n>=0&&n<1000000&&Number(value)>0)
    unlocked=Math.max(unlocked,n+1);
  }
 }
 const run=state.run;
 if(run?.data?.complete&&Number.isInteger(run.level)&&run.level>=0)
  unlocked=Math.max(unlocked,run.level+1);
 return unlocked;
}
const recoveredUnlock=reconcileCompletedLevels(save);
let migratedScores=false;
if(recoveredUnlock>save.unlocked){save.unlocked=recoveredUnlock;migratedScores=true;}
// Historical score-star recalibration is a ONE-TIME migration. After
// Objectives 2.0, newly earned move-efficiency stars must NEVER be
// overwritten with a score-based rating the next time the app opens.
if(save.objectiveArchiveVersion!==2){
 for(const [key,score] of Object.entries(save.bestScores||{})){
  const i=Number(key),value=Number(score);
  if(!Number.isInteger(i)||i<10||!Number.isFinite(value)||value<=0)continue;
  const earned=R.scoreStars(i,value,true);
  if(save.bestStars[i]!==earned){save.bestStars[i]=earned;migratedScores=true;}
 }
 save.objectiveArchiveVersion=2;migratedScores=true;
}
if(!Object.hasOwn(PLAY_MODES,save.playMode))save.playMode="auto";
// Old 3.0 was the default. Upgrade that stored default to automatic.
// Preserve other manually selected modes and all running game snapshots.
if(save.directorDefaultVersion!==4){
 if(save.playMode==="v3")save.playMode="auto";
 save.directorDefaultVersion=4;migratedScores=true;
}
for(const key of ["fourFamilyScores","fourFamilyStars","fourFamilyChain"]){
 if(!save[key]||typeof save[key]!=="object")save[key]={};
}
// Intro is now permanently four-family. Merge prior five-family tutorial
// achievements into the displayed intro archive ONCE, preserving both
// historical records and the already-earned four-family experiment results.
// Five-family records from level 11 onward are unchanged.
if(save.familyProgressionVersion!==1){
 for(let i=0;i<10;i++){
  for(const [from,to] of [["bestScores","fourFamilyScores"],["bestStars","fourFamilyStars"],["bestChain","fourFamilyChain"]]){
   const old=Number(save[from][i])||0;
   const experimental=Number(save[to][i])||0;
   if(old>experimental)save[to][i]=old;
  }
 }
 save.familyProgressionVersion=1;
 migratedScores=true;
}
function activeRecords(){return game?.familyCount===4?save.fourFamilyScores:save.bestScores;}
function recordsForLevel(index){return R.levelFamilyCount(index)===4?save.fourFamilyScores:save.bestScores;}
function starsForLevel(index){return R.levelFamilyCount(index)===4?save.fourFamilyStars:save.bestStars;}

if(migratedScores)persist();
// One-time credit for already earned levels; never reward historical records again.
const economyStart=E.initialize(save);
if(economyStart.newlyCreated)persist();
// Fortune is an independent cosmetic collection field: keep all existing
// wallet purchases, saved stars and level archives exactly as they were.
if(F.initialize(save).created)persist();
if(!save.spirits||save.spirits.version!==S.VERSION){S.initialize(save);persist();}
if(!save.powers||save.powers.version!==P.VERSION){P.initialize(save);persist();}
if(!save.assistedStars||typeof save.assistedStars!=="object")save.assistedStars={};
if(!save.assistedScores||typeof save.assistedScores!=="object")save.assistedScores={};
// Match CSS-only ambient effects to the in-game accessibility preference.
document.body.classList.toggle("harmony-reduced-motion",!!save.reduceMotion);
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
 disarmDecisionClock();clearIdleHint();
 resetResonanceVisuals();clearScoreFx();clearPraise();
 saveRun();document.body.classList.remove("harmony-playing");$("gameView").hidden=true;$("menuView").hidden=false;$("modal").hidden=true;renderMenu();
}
// Primary level selection is the book. Keep the landing menu accessible for
// daily Omikuji, Omamori and Game Dev; leaving a run opens Goshuincho directly.
function showLevelSelection(){
 if(busy)return;
 showMenu();
 showGoshuincho();
}
function renderMenu(){
 const journal=G.summary(save);
 const coins=$("harmonyCoins");
 const menuWallet=E.snapshot(save);
 if(coins)coins.textContent=prettify(menuWallet.coins)+" mynt";
 const charmProgress=$("omamoriProgress");
 if(charmProgress){
 const worn=S.status(save,menuWallet.equipped);
 charmProgress.textContent=worn?"Bär "+worn.name+" · Bond "+worn.tier+"/3":menuWallet.ownedCount+" av "+menuWallet.totalItems+" amuletter";
}
 const daily=$("omikujiStatus");
 if(daily)daily.textContent=F.status(save).available?"Gratis idag":"Dagens lapp dragen";
 const journalButton=$("goshuinButton");
 if(journalButton){
  $("goshuinProgress").textContent=journal.earned+" / "+(journal.visibleChapters*G.CHAPTER_SIZE)+" stämplar";
  journalButton.setAttribute("aria-label","Öppna Goshuincho samlarbok, "+journal.earned+" stämplar");
 }
 const selected=$("gameDirectorMode");
 if(selected)selected.value=save.playMode;
 // Legacy level list remains hidden for historical regression checks only.
 // Players now see Goshuincho as the sole visible level-selection surface.
 const list=$("levelList");list.replaceChildren();
 const first=menuPage*MENU_PAGE_SIZE,last=first+MENU_PAGE_SIZE;
 for(let i=first;i<last;i++){
  const cfg=R.levelConfig(i),allowed=i<=save.unlocked,stars=starsForLevel(i)[i]||0,record=Number(recordsForLevel(i)[i])||0;
  const b=document.createElement("button");
  // Visual distinctions only: previously earned stars and current unlocked
  // level are already authoritative in the same save. Never alter access.
  const current=allowed&&i===save.unlocked;
  b.className="level-tile"+(allowed?"":" locked")+
   (stars>0?" is-completed":"")+(current?" is-current":"");
  b.disabled=!allowed;
  if(current)b.setAttribute("aria-current","step");
  const n=document.createElement("span");n.className="level-number";n.textContent=allowed?String(i+1):"♧";
  const d=document.createElement("span"),title=document.createElement("strong"),sub=document.createElement("small");
  title.textContent=i<10?cfg.name:cfg.name+" · "+(i+1);
  sub.textContent=i<10?cfg.subtitle:
   cfg.moves+" drag · "+(cfg.goal.type==="mist"?cfg.goal.count+" dimrutor":
    cfg.goal.type==="masterpiece"?cfg.goal.count+" mästerverk":
    cfg.goal.type==="daruma"?cfg.goal.count+" Daruma":
    cfg.goal.type==="sealedStone"?cfg.goal.count+" Sealed Stones":
    cfg.goal.type==="fusion"?cfg.goal.count+" fusioner":
    cfg.goal.type==="stage3"?cfg.goal.count+" utvecklingar":
    cfg.goal.type==="pulseHits"?cfg.goal.count+" Harmony Pulse-träffar":
    cfg.goal.type==="fourTurns"?cfg.goal.count+" drag med fyrmatchning":
    cfg.goal.type==="four"?cfg.goal.count+" fyrmatchningar":
    prettify(cfg.goal.count)+" poäng");
  d.append(title,sub);
  if(allowed&&record>0){
   const best=document.createElement("span");best.className="level-best";
   best.textContent="REKORD  "+prettify(record)+" poäng";
   d.append(best);
  }
  const starsNode=document.createElement("span");starsNode.className="level-stars";
  starsNode.textContent=allowed?(stars?"★".repeat(stars)+"☆".repeat(3-stars):"☆☆☆"):"🔒";
  b.dataset.familyCount=String(R.levelFamilyCount(i));
  b.append(n,d,starsNode);b.addEventListener("click",()=>startLevel(i,false));list.appendChild(b);
 }
 const intro=menuPage===0;
 $("chapterEyebrow").textContent="DIN NIVÅRESA";
 $("chapterTitle").textContent="Goshuincho";
 $("chapterSubtitle").textContent="Samla stämplar och upptäck nästa kapitel.";
 const stars=Object.entries(save.fourFamilyStars).reduce((n,[i,v])=>
  n+(Number(i)<10?Number(v)||0:0),0)+
  Object.entries(save.bestStars).reduce((n,[i,v])=>
   n+(Number(i)>=10?Number(v)||0:0),0);
 $("chapterStars").textContent="★ "+stars+" stjärnor";
 const pager=$("levelPager");pager.replaceChildren();
 const prev=document.createElement("button");prev.className="secondary small";prev.textContent="← Föregående";prev.disabled=menuPage===0;
 prev.addEventListener("click",()=>{menuPage--;renderMenu();});
 const range=document.createElement("span");range.textContent="Nivå "+(first+1)+"–"+last;
 const next=document.createElement("button");next.className="secondary small";next.textContent="Nästa →";
 // Show the next chapter only when the player has progressed to it.
 next.disabled=save.unlocked<last;
 next.addEventListener("click",()=>{menuPage++;renderMenu();});
 pager.append(prev,range,next);
 const canResume=save.run&&save.run.level<=save.unlocked&&save.run.data&&save.run.data.moves>0;
 $("continueButton").textContent=canResume?"Fortsätt nivå "+(save.run.level+1)+" →":"Spela nivå "+(save.unlocked+1)+" →";
}
// Goshuincho Primary Level Select 1.0: sole visible level selector, sharing
// the existing progression, launch/resume behaviour and stored star archive.
// The former list is hidden temporarily for migration regression coverage.
const goshuinArtCache=new Map();
function goshuinArtReady(src){
 if(!goshuinArtCache.has(src)){
  goshuinArtCache.set(src,new Promise(resolve=>{
   const probe=new Image();
   probe.onload=()=>resolve(true);
   probe.onerror=()=>resolve(false);
   probe.src=src;
  }));
 }
 return goshuinArtCache.get(src);
}
function goshuinArtwork(slot,kind,key){
 const asset=G.artUrl(kind,key);
 if(!asset)return;
 const source=typeof asset==="string"?asset:asset.src;
 if(!source)return;
 const artwork=typeof asset==="string"?document.createElement("img"):document.createElement("span");
 artwork.className="goshuin-art"+(typeof asset==="string"?"":" goshuin-atlas-art");
 if(typeof asset==="string"){
  artwork.alt="";
  artwork.decoding="async";
  artwork.src=source;
 }else{
  const col=Math.max(0,Math.min(2,Number(asset.column)||0));
  const row=Math.max(0,Math.min(2,Number(asset.row)||0));
  artwork.style.backgroundImage='url("'+source+'")';
  artwork.style.backgroundSize="300% 300%";
  artwork.style.backgroundPosition=(col*50)+"% "+(row*50)+"%";
 }
 goshuinArtReady(source).then(ok=>{
  if(!ok||!slot.isConnected)return; // preserve fallback when art is missing
  slot.append(artwork);slot.classList.add("has-art");
 });
}
function goshuinNode(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
function showGoshuincho(chapterIndex=null){
 if(busy||!$("gameView").hidden)return;
 const available=G.summary(save).currentChapter+1;
 goshuinChapter=Math.min(available,Math.max(0,
  Number.isInteger(chapterIndex)?chapterIndex:Math.floor(save.unlocked/G.CHAPTER_SIZE)));
 goshuinPage=goshuinChapter===Math.floor(save.unlocked/G.CHAPTER_SIZE)?
  G.pageForLevel(save.unlocked):0;
 $("modalActions").classList.remove("pause-menu-actions","victory-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY · DIN RESA";
 $("modalTitle").textContent="Goshuincho";
 const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Stäng boken","primary goshuin-close",()=>{$("modal").hidden=true;$("goshuinButton").focus();});
 $("modal").hidden=false;
 renderGoshuincho();
}
function renderGoshuincho(){
 const area=$("modalContent");area.replaceChildren();
 const summary=G.summary(save),maxChapter=summary.currentChapter+1;
 goshuinChapter=Math.min(maxChapter,Math.max(0,goshuinChapter));
 goshuinPage=Math.max(0,Math.min(G.PAGES_PER_CHAPTER-1,goshuinPage));
 const info=G.pageSnapshot(save,goshuinChapter,goshuinPage);
 const album=goshuinNode("div","goshuincho-book");
 album.setAttribute("aria-label","Goshuincho, kapitel "+info.number+", sida "+info.pageNumber+" av "+info.pages);
 const intro=goshuinNode("p","goshuin-intro",
  "Din nivåresa i en samlarbok. Välj en nivåbricka för att se målet och spela. Klarade nivåer får en stjärnstämpel.");
 album.append(intro);
 const totals=goshuinNode("div","goshuin-totals");
 totals.append(goshuinNode("strong","",summary.earned+" stämplar"),
  goshuinNode("span","",summary.stars+" stjärnor · "+summary.completedChapters+" färdiga kapitel"));
 album.append(totals);
 const page=goshuinNode("section","goshuin-page");
 page.dataset.chapter=String(info.index+1);
 page.dataset.page=String(info.pageNumber);
 page.classList.toggle("is-last-page",info.isFinalPage);
 const cap=goshuinNode("div","goshuin-page-heading");
 const crest=goshuinNode("div","goshuin-cover-slot");
 crest.dataset.artKey=info.artKey;
 crest.append(goshuinNode("span","goshuin-slot-fallback",info.symbol));
 goshuinArtwork(crest,"chapters",info.index);
 const copy=goshuinNode("div","goshuin-chapter-copy");
 copy.append(goshuinNode("span","goshuin-eyebrow",
  "KAPITEL "+info.number+" · NIVÅ "+(info.first+1)+"–"+(info.last+1)),
  goshuinNode("h3","",info.title),
  goshuinNode("p","",info.subtitle));
 cap.append(crest,copy);
 page.append(cap);
 const nav=goshuinNode("nav","goshuin-pager");
 nav.setAttribute("aria-label","Bläddra i samlarboken");
 const previous=goshuinNode("button","goshuin-nav-button","← Föregående");
 previous.type="button";previous.disabled=goshuinChapter===0&&goshuinPage===0;
 previous.addEventListener("click",()=>{
  if(goshuinPage>0)goshuinPage--;
  else if(goshuinChapter>0){goshuinChapter--;goshuinPage=G.PAGES_PER_CHAPTER-1;}
  renderGoshuincho();
 });
 const current=goshuinNode("span","goshuin-page-count",
  "Kapitel "+info.number+" · Sida "+info.pageNumber+" / "+info.pages);
 current.setAttribute("aria-live","polite");
 const next=goshuinNode("button","goshuin-nav-button","Nästa →");
 next.type="button";
 next.disabled=goshuinChapter>=maxChapter&&goshuinPage===G.PAGES_PER_CHAPTER-1;
 next.addEventListener("click",()=>{
  if(goshuinPage<G.PAGES_PER_CHAPTER-1)goshuinPage++;
  else if(goshuinChapter<maxChapter){goshuinChapter++;goshuinPage=0;}
  renderGoshuincho();
 });
 nav.append(previous,current,next);page.append(nav);
 const chapterStatus=goshuinNode("div","goshuin-chapter-status");
 chapterStatus.append(
  goshuinNode("strong","",info.earned+" av 10 stämplar"),
  goshuinNode("span","",info.visibleEarned+" av "+info.visible.length+" på sidan · Nivå "+info.pageFirst+"–"+info.pageLast)
 );
 page.append(chapterStatus);
 // Real ink marks only for archived levels, never for merely unlocked levels.
 const band=goshuinNode("div","goshuin-reward-band"+(info.completed?" is-complete":""));
 const bandText=goshuinNode("div","goshuin-reward-copy");
 bandText.append(goshuinNode("strong","",info.completed?"✦ Kapitelsigillet är intjänat":"Kapitlets stämplar"),
  goshuinNode("span","",info.completed?"Alla tio nivåer är klara":
   (G.CHAPTER_SIZE-info.earned)+" kvar till kapitelsigillet"));
 const marks=goshuinNode("div","goshuin-reward-marks");
 marks.setAttribute("role","progressbar");
 marks.setAttribute("aria-label","Stämplar i kapitel "+info.number);
 marks.setAttribute("aria-valuemin","0");
 marks.setAttribute("aria-valuemax",String(G.CHAPTER_SIZE));
 marks.setAttribute("aria-valuenow",String(info.earned));
 for(const stamp of info.stamps){
  const mark=goshuinNode("span","goshuin-reward-mark"+(stamp.earned?" is-earned":""));
  mark.setAttribute("aria-hidden","true");marks.append(mark);
 }
 band.append(bandText,marks);page.append(band);
 const stamps=goshuinNode("div","goshuin-stamp-grid");
 stamps.setAttribute("aria-label","Nivåbrickor för kapitel "+info.number+", sida "+info.pageNumber);
 const detail=goshuinNode("section","goshuin-level-detail");
 detail.setAttribute("aria-label","Vald nivå");
 detail.hidden=true;
 const note=goshuinNode("p","goshuin-detail","Välj en stämpel för att läsa om nivån.");
 detail.append(note);
 const describeGoal=cfg=>{
  const goal=cfg.goal||{},count=goal.count;
  return goal.type==="mist"?count+" dimrutor":
   goal.type==="daruma"?count+" Daruma":
   goal.type==="sealedStone"?count+" Sealed Stones":
   goal.type==="masterpiece"?count+" mästerverk":
   goal.type==="fusion"?count+" fusioner":
   goal.type==="stage3"?count+" utvecklingar till stadium 3":
   goal.type==="stage4"?count+" utvecklingar till stadium 4":
   goal.type==="pulseHits"?count+" Harmony Pulse-träffar":
   goal.type==="fourTurns"?count+" olika drag med fyrmatchning":
   goal.type==="four"?count+" fyrmatchningar":
   goal.type==="shape"?count+" T-/L-matchningar":
   goal.type==="score"?prettify(count)+" poäng":
   cfg.subtitle||"Slutför nivåmålet";
 };
 const chooseStamp=(stamp,tile)=>{
  // A stamp selects its stage; an explicit button STARTS the stage.
  // Browsing and tapping locked stamps never changes the game/save.
  for(const other of stamps.children){
   other.classList.toggle("is-selected",other===tile);
   other.setAttribute("aria-pressed",other===tile?"true":"false");
  }
  const cfg=R.levelConfig(stamp.level);
  const status=stamp.locked?"LÅST":
   stamp.resumable?"PÅBÖRJAD":
   stamp.isCurrent?"NÄSTA NIVÅ":
   stamp.earned?"KLARAD":"UPPLÅST";
  const record=Number(recordsForLevel(stamp.level)[stamp.level])||0;
  detail.hidden=false;
  detail.replaceChildren();
  const header=goshuinNode("div","goshuin-level-heading");
  const heading=goshuinNode("div","goshuin-level-heading-text");
  heading.append(goshuinNode("span","goshuin-level-status",status),
   goshuinNode("strong","goshuin-level-title","Nivå "+stamp.number+" · "+cfg.name));
  header.append(heading);
  if(stamp.earned)header.append(goshuinNode("span","goshuin-level-rating",
   "★".repeat(stamp.stars)+"☆".repeat(3-stamp.stars)));
  detail.append(header);
  note.textContent=stamp.locked?"Nivå "+stamp.number+" är låst. Klara föregående nivå för att låsa upp den.":
   stamp.earned?"Nivå "+stamp.number+" · "+stamp.stars+" av 3 stjärnor. Du kan spela om nivån för ett bättre betyg.":
   stamp.resumable?"Nivå "+stamp.number+" är påbörjad. Fortsätt där du slutade.":
   "Nivå "+stamp.number+" är redo att spelas.";
  detail.append(note);
  const objective=goshuinNode("p","goshuin-level-objective",
   cfg.moves+" drag · Mål: "+describeGoal(cfg));
  detail.append(objective);
  if(record>0)detail.append(goshuinNode("p","goshuin-level-record",
   "Rekord: "+prettify(record)+" poäng"));
  const play=goshuinNode("button","goshuin-play primary",
   stamp.resumable?"Fortsätt nivå "+stamp.number+" →":
   stamp.earned?"Spela nivå "+stamp.number+" igen →":"Spela nivå "+stamp.number+" →");
  play.type="button";play.disabled=stamp.locked;
  play.setAttribute("aria-label",stamp.locked?"Nivå "+stamp.number+" är låst":play.textContent);
  play.addEventListener("click",()=>{
   // Guard again at activation time, using the exact same unlock boundary
   // as the original list. Never allow preview/future chapters to be started.
   const latest=G.levelStatus(save,stamp.level);
   if(!latest.playable)return;
   startLevel(stamp.level,latest.resumable);
  });
  detail.append(play);
 };
 for(const stamp of info.visible){
  const state=stamp.locked?"is-locked":stamp.resumable?"is-in-progress":
   stamp.isCurrent?"is-current":stamp.earned?"is-earned":"is-available";
  const tile=goshuinNode("button","goshuin-stamp "+state+(stamp.earned?" is-earned":" is-empty"));
  tile.type="button";
  tile.dataset.level=String(stamp.number);
  tile.dataset.artKey=stamp.artKey;
  tile.dataset.stars=String(stamp.stars);
  tile.dataset.state=state;
  tile.setAttribute("aria-pressed","false");
  if(stamp.isCurrent)tile.setAttribute("aria-current","step");
  const levelConfig=R.levelConfig(stamp.level);
  tile.setAttribute("aria-label","Nivå "+stamp.number+" · "+levelConfig.name+": "+
   (stamp.locked?"låst":stamp.resumable?"påbörjad":stamp.isCurrent?"nästa nivå":
    stamp.earned?"klarad, "+stamp.stars+" av 3 stjärnor":"upplåst"));
  // Goshuincho Warm Parchment 2.0: every level in every chapter shares
  // the approved Omikuji-style paper card. Keep live stage names and
  // the original high-resolution rating seals, not baked-in illustrations.
  // The chapter header remains its own separately illustrated section.
  tile.classList.add("is-omikuji-preview");
  const japanese=G.japaneseNumeral(stamp.number);
  const heading=goshuinNode("span","goshuin-paper-eyebrow","第"+japanese+"番 · NIVÅ "+stamp.number);
  heading.lang="ja";
  const numeral=goshuinNode("span","goshuin-paper-kanji",japanese);
  numeral.lang="ja";
  if(japanese.length>=3)numeral.classList.add("is-multi-kanji");
  if(japanese.length>=4)numeral.classList.add("is-long-kanji");
  const title=goshuinNode("strong","goshuin-paper-title",levelConfig.name);
  if(levelConfig.name.length>20)title.classList.add("is-long");
  const flourish=goshuinNode("span","goshuin-paper-sakura","✿");
  flourish.setAttribute("aria-hidden","true");
  tile.append(heading,numeral,title,flourish);
  if(stamp.earned){
   const grade=goshuinNode("span","goshuin-grade grade-"+stamp.stars);
   grade.dataset.grade=String(stamp.stars);
   grade.dataset.artKey=stamp.gradeKey;
   grade.append(goshuinNode("span","goshuin-slot-fallback","★".repeat(stamp.stars)));
   goshuinArtwork(grade,"grades",stamp.stars);
   tile.append(grade);
  } // Locked/current status uses the card border + accessible aria label, no extra printed text.
  tile.addEventListener("click",()=>chooseStamp(stamp,tile));
  stamps.append(tile);
 }
 page.append(stamps,detail);
 // Opening the active chapter provides a one-tap continuation action,
 // while earlier and future preview chapters require deliberate selection.
 const recommended=info.visible.find(stamp=>stamp.resumable)||
  info.visible.find(stamp=>stamp.isCurrent);
 if(recommended){
  const button=stamps.querySelector('[data-level="'+recommended.number+'"]');
  if(button)chooseStamp(recommended,button);
 }
 if(info.isFinalPage){
  // Final chapter page has only two stamps. Use the extra space for a clear
  // sense of collection progress and for later generated completion artwork.
  const finale=goshuinNode("div","goshuin-finale");
  finale.append(goshuinNode("span","goshuin-finale-eyebrow","KAPITELAVSLUTNING"));
  const finaleIntro=goshuinNode("p","goshuin-finale-description",
   info.completed?"Alla tio stämplar är samlade. Kapitlets sigill är ditt.":
   "De sista två nivåerna avslutar kapitlet. Samla alla tio stämplar för kapitelsigillet.");
  finale.append(finaleIntro);
  const progress=goshuinNode("div","goshuin-finale-progress");
  progress.setAttribute("role","progressbar");
  progress.setAttribute("aria-label","Stämplar insamlade i kapitel "+info.number);
  progress.setAttribute("aria-valuemin","0");
  progress.setAttribute("aria-valuemax",String(G.CHAPTER_SIZE));
  progress.setAttribute("aria-valuenow",String(info.earned));
  const fill=goshuinNode("span","goshuin-finale-progress-fill");
  fill.style.width=(info.earned/G.CHAPTER_SIZE*100)+"%";
  progress.append(fill);
  finale.append(progress);
  const sigil=goshuinNode("div","goshuin-chapter-sigil"+(info.completed?" is-earned":""));
  sigil.dataset.artKey=info.artKey+"-complete";
  const sealSlot=goshuinNode("span","goshuin-chapter-seal-slot");
  sealSlot.dataset.artKey=info.artKey+"-complete";
  sealSlot.append(goshuinNode("span","goshuin-slot-fallback",info.completed?"✦":"○"));
  if(info.completed)goshuinArtwork(sealSlot,"covers",info.index);
  sigil.append(sealSlot,goshuinNode("span","goshuin-chapter-seal-label",
   info.completed?"Kapitelsigill intjänat":
    info.earned+" / "+G.CHAPTER_SIZE+" stämplar · Kapitelsigillet väntar"));
  finale.append(sigil);
  page.append(finale);
 }
 album.append(page);
 area.append(album);
}
// Omikuji Fortune 1.0 — one free draw per local day, never interrupts combat.
// No streaks, paid retries, negative prizes or changes to the matching rules.
function showOmikuji(){
 if(busy||!$("gameView").hidden)return;
 const info=F.status(save),todayDraw=info.last?.date===info.date?info.last:null;
 $("modalActions").classList.remove("pause-menu-actions","victory-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY · LITEN ÖVERRASKNING";
 $("modalTitle").textContent="Omikuji Fortune";
 const content=$("modalContent");content.replaceChildren();
 const wrapper=goshuinNode("section","omikuji-fortune");
 wrapper.append(goshuinNode("p","omikuji-intro",
  "Dra en lyckolapp inspirerad av japanska omikuji. Du får en liten myntgåva med ett vänligt budskap. En gratis lapp per dag, utan krav på att logga in varje dag."));
 const paper=goshuinNode("div","omikuji-paper"+(todayDraw?" is-revealed":" is-folded"));
 if(todayDraw){
  paper.dataset.fortune=todayDraw.id;
  paper.append(goshuinNode("span","omikuji-paper-top","本日の運勢 · DAGENS LYCKA"),
   goshuinNode("span","omikuji-paper-kanji",todayDraw.fortune.kanji),
   goshuinNode("strong","omikuji-paper-name",todayDraw.fortune.label),
   goshuinNode("span","omikuji-paper-description",todayDraw.fortune.text));
 }else{
  paper.append(goshuinNode("span","omikuji-paper-top","OMIKUJI · LYCKOLAPP"),
   goshuinNode("span","omikuji-paper-symbol","✿"),
   goshuinNode("span","omikuji-paper-fold","Din lyckolapp väntar"));
 }
 wrapper.append(paper);
 const results=goshuinNode("div","omikuji-result");
 if(todayDraw){
  results.append(goshuinNode("strong","omikuji-earned",
   "✧ +"+prettify(todayDraw.coins)+" Harmony Coins"),
   goshuinNode("span","omikuji-result-note",
    "Belöningen är redan tillagd i din Omamori-plånbok."));
 }else{
  results.append(goshuinNode("span","omikuji-result-note",
   info.available?"Dagens dragning är gratis. Resultatet sparas i den här webbläsaren.":
   "Du har redan dragit en lapp. Nästa är tillgänglig en ny kalenderdag."));
 }
 wrapper.append(results);
 if(info.count>0){
  wrapper.append(goshuinNode("p","omikuji-total",
   "Tidigare lyckolappar: "+prettify(info.count)+" · Ingen daglig serie att hålla."));
 }
 const actions=$("modalActions");actions.replaceChildren();
 if(info.available){
  const drawButton=modalButton(actions,"Dra dagens lyckolapp","primary omikuji-draw",()=>{
   const result=F.draw(save,new Date());
   if(!result.ok){showOmikuji();return;}
   persist();renderMenu();showOmikuji();
  });
  drawButton.setAttribute("aria-label","Dra en gratis Omikuji lyckolapp idag");
 }
 modalButton(actions,"Stäng lyckolappen","secondary omikuji-close",()=>{
  $("modal").hidden=true;$("omikujiButton").focus();
 });
 content.append(wrapper);$("modal").hidden=false;
}

// Cosmetic-only Omamori Spirits 2.0. Rules, score, moves and stars are unchanged.
function updateSpiritBadge(){
 const badge=$("spiritBadge");if(!badge)return;
 const spirit=S.status(save,E.snapshot(save).equipped);
 badge.hidden=!spirit;
 if(!spirit)return;
 badge.dataset.spirit=spirit.id;
 badge.dataset.tier=String(spirit.tier);
 badge.textContent=spirit.symbol+" "+spirit.name+" · Bond "+spirit.tier+"/3";
 badge.title=spirit.mission+(spirit.tier<3?" · "+spirit.count+"/"+spirit.next+" nivåer":" · fullbordad");
 badge.setAttribute("aria-label","Buren Omamori: "+spirit.name+", Bond "+spirit.tier+" av 3. "+spirit.mission);
}
function spiritMoment(evt){
 const spirit=S.status(save,E.snapshot(save).equipped);
 if(!spirit||!spirit.owned||FAST()||document.hidden||!Element.prototype.animate)return;
 const sakura=spirit.id==="sakura"&&evt.type==="hero";
 const daruma=spirit.id==="daruma"&&(evt.type==="daruma"||evt.type==="sealed-hit");
 if(!sakura&&!daruma)return;
 const at=sakura?evt.positions?.[0]:evt.hits?.[0]?.at;
 if(!Number.isInteger(at)||!boardTiles[at])return;
 const rect=indexRect(at),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 const node=fxAt("omamori-spirit-fx spirit-"+spirit.id+" tier-"+spirit.tier,x,y,
  sakura?(spirit.tier>=2?"✿ ✦ ✿":"✿"):(spirit.tier>=2?"◉ ✦":"◉"));
 node.setAttribute("aria-hidden","true");
 animateNode(node,[
  {opacity:0,transform:"translate(-50%,-40%) scale(.45)",offset:0},
  {opacity:1,transform:"translate(-50%,-75%) scale(1.08)",offset:.4},
  {opacity:0,transform:"translate(-50%,-130%) scale(1.22)",offset:1}
 ],spirit.tier===3?760:550).finally(()=>node.remove());
}
// Harmony Economy & Omamori 1.0 — the collection stays outside the 7x7 board.
function showOmamori(tab="shop"){
 if(busy||!$("gameView").hidden)return;
 const account=E.snapshot(save);
 $("modalActions").classList.remove("pause-menu-actions","victory-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY · DIN SAMLING";
 $("modalTitle").textContent="Omamori";
 const panel=$("modalContent");panel.replaceChildren();
 const wrapper=goshuinNode("section","omamori-shop");
 const wallet=goshuinNode("div","omamori-wallet");
 wallet.append(goshuinNode("span","omamori-wallet-icon","✧"));
 const walletCopy=goshuinNode("div","omamori-wallet-copy");
 walletCopy.append(goshuinNode("span","","DIN BALANS"),
  goshuinNode("strong","",prettify(account.coins)+" Harmony Coins"));
 wallet.append(walletCopy,goshuinNode("span","omamori-owned-count",
  account.ownedCount+" / "+account.totalItems+" samlade"));
 wrapper.append(wallet);
 // The collection shelf is only a view of the existing six cosmetic items.
 const shelf=goshuinNode("div","omamori-shelf");
 shelf.setAttribute("role","group");
 shelf.setAttribute("aria-label","Omamori: "+account.ownedCount+" av "+account.totalItems+" samlade");
 for(const item of E.CATALOG){
  const owned=account.owned.includes(item.id),equipped=account.equipped===item.id;
  const slot=goshuinNode("span","omamori-shelf-slot"+(owned?" is-owned":"")+(equipped?" is-equipped":""),owned?item.symbol:"◇");
  slot.setAttribute("role","img");
  slot.setAttribute("aria-label",item.name+": "+(equipped?"bärs":owned?"samlad":"inte samlad"));
  slot.title=item.name+(equipped?" · bärs":owned?" · i samlingen":" · inte samlad");
  shelf.append(slot);
 }
 wrapper.append(shelf);
 const nextCharm=E.CATALOG.find(item=>!account.owned.includes(item.id));
 wrapper.append(goshuinNode("p","omamori-next-charm",nextCharm?
  "Nästa i samlingen: "+nextCharm.name+" · "+(account.coins>=nextCharm.price?
   "du har tillräckligt med mynt":prettify(nextCharm.price-account.coins)+" mynt kvar"):
  "✦ Hela Omamori-samlingen är fullbordad"));
 wrapper.append(goshuinNode("p","omamori-explanation",
  "Harmony Coins tjänas genom nivåer och stjärnor. Bär Sakura eller Daruma för att låsa upp kosmetiska Bond-effekter genom sidouppdrag på olika nivåer. Ingen påverkan på drag, mål eller poäng. Inga riktiga köp."));
 const tabs=goshuinNode("div","omamori-tabs");
 for(const [id,label] of [["shop","Butik"],["collection","Min samling"]]){
  const button=goshuinNode("button","omamori-tab"+(tab===id?" is-active":""),label);
  button.type="button";button.setAttribute("aria-pressed",String(tab===id));
  button.addEventListener("click",()=>showOmamori(id));tabs.append(button);
 }
 wrapper.append(tabs);
 const list=goshuinNode("div","omamori-catalog");
 const shown=tab==="collection"?E.CATALOG.filter(item=>account.owned.includes(item.id)):E.CATALOG;
 if(!shown.length)list.append(goshuinNode("p","omamori-empty",
  "Du har ännu inga Omamori. Välj en amulett i butiken när du har samlat mynt."));
 for(const item of shown){
  const owned=account.owned.includes(item.id),equipped=account.equipped===item.id;
  const card=goshuinNode("article","omamori-card"+(owned?" is-owned":"")+(equipped?" is-equipped":""));
  card.dataset.omamoriId=item.id;
  const charm=goshuinNode("div","omamori-charm omamori-"+item.theme);
  charm.setAttribute("aria-hidden","true");
  charm.append(goshuinNode("span","omamori-knot","⌁"),
   goshuinNode("span","omamori-charm-glyph",item.symbol));
  const copy=goshuinNode("div","omamori-card-copy");
  copy.append(goshuinNode("strong","",item.name),
   goshuinNode("small","",item.subtitle),
   goshuinNode("span","omamori-card-tag",
    equipped?"Bärs just nu":owned?"I din samling":prettify(item.price)+" Harmony Coins"));
  const action=goshuinNode("button","omamori-action","");
  action.type="button";
  if(equipped)action.textContent="Ta av";
  else if(owned)action.textContent="Bär";
  else if(account.coins<item.price){
   action.textContent="Saknar "+prettify(item.price-account.coins)+" mynt";action.disabled=true;
  }else action.textContent="Samla · "+prettify(item.price)+" mynt";
  action.addEventListener("click",()=>{
   if(owned){
    if(E.equip(save,equipped?null:item.id).ok){persist();showOmamori(tab);showOmamoriNotice(equipped?"unequip":"equip",item);}
   }else{
    if(E.purchase(save,item.id).ok){persist();renderMenu();showOmamori(tab);showOmamoriNotice("purchase",item);}
   }
  });
  const bond=S.status(save,item.id);
  let detail=null;
  if(bond){
   detail=goshuinNode("div","omamori-bond-detail");
   detail.append(goshuinNode("strong","omamori-bond-title","✦ Bond "+bond.tier+"/3 · "+(bond.tier?bond.titles[bond.tier-1]:"Ett nytt band")),
    goshuinNode("span","omamori-bond-mission","Uppdrag: "+bond.mission));
   const progress=goshuinNode("div","omamori-bond-track");
   progress.setAttribute("role","progressbar");
   progress.setAttribute("aria-label",item.name+" Bond-framsteg");
   progress.setAttribute("aria-valuemin","0");progress.setAttribute("aria-valuemax",String(bond.max));
   progress.setAttribute("aria-valuenow",String(Math.min(bond.count,bond.max)));
   const bar=goshuinNode("span","omamori-bond-fill");
   bar.style.width=Math.min(100,Math.round(bond.count/bond.max*100))+"%";
   progress.append(bar);detail.append(progress);
   detail.append(goshuinNode("small","omamori-bond-next",bond.tier===3?
    "Alla tre Bond-stadier upplåsta · "+bond.currentReward:
    bond.count+"/"+bond.next+" nivåer · Nästa: "+bond.nextReward));
   if(!owned)detail.append(goshuinNode("small","omamori-bond-locked","Samla och bär Omamori för att påbörja dess Bond."));
   card.classList.add("has-bond");card.dataset.bondTier=String(bond.tier);
  }
  card.append(charm,copy,action);
  if(detail)card.append(detail);
  list.append(card);
 }
 wrapper.append(list);
 if(account.equipped){
  const worn=E.CATALOG.find(item=>item.id===account.equipped);
  wrapper.append(goshuinNode("p","omamori-equipped",
   "✦ Din valda Omamori: "+worn.name+" · "+(S.status(save,worn.id)?"ger kosmetiska effekter och Bond-framsteg":"samlarfavorit utan speleffekter")+". Ingen påverkan på nivåbalans."));
 }
 panel.append(wrapper);
 const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Stäng butiken","primary omamori-close",()=>{
  $("modal").hidden=true;$("omamoriButton").focus();
 });
 $("modal").hidden=false;
}

function showOmamoriNotice(action,item){
 const shop=$("modalContent").querySelector(".omamori-shop");
 if(!shop)return;
 const note=goshuinNode("div","omamori-reward-notice"+(action==="purchase"?" is-new":""));
 note.setAttribute("role","status");
 note.append(
  goshuinNode("span","omamori-reward-emblem",action==="purchase"?"✦":"✧"),
  goshuinNode("strong","",action==="purchase"?"Ny Omamori i samlingen":
   action==="equip"?"Du bär nu din Omamori":"Amuletten finns kvar i samlingen"),
  goshuinNode("small","",item.name+(action==="purchase"?" · ett nytt minne från din resa":""))
 );
 shop.insertBefore(note,shop.querySelector(".omamori-tabs"));
}
function collectionSprite(family){
 const isNew=Object.hasOwn(newFamilyRows,family);
 const art=document.createElement("span");art.className="collection-art"+(isNew?" collection-new":"");
 art.style.setProperty("--collection-y",(isNew?newFamilyRows[family]*100/3:familyRows[family]*25)+"%");
 const fallback=document.createElement("span");fallback.className="collection-fallback";fallback.textContent=symbols[family];
 return [art,fallback];
}
function prepareCollection(){
 const container=$("masterpieceCollection");container.replaceChildren();collectionCards.clear();
 container.classList.toggle("four-families",game.familyCount===4);
 for(const family of game.families){
  const cell=document.createElement("div");cell.className="collection-card";cell.dataset.family=family;
  cell.setAttribute("aria-label",names[family]+" mästerverk 0");
  const icon=document.createElement("div");icon.className="collection-icon";
  icon.append(...collectionSprite(family));
  const count=document.createElement("strong");count.className="collection-count";count.textContent="0";
  count.setAttribute("aria-hidden","true");
  icon.append(count); // Small badge over the bottom-left of the free-standing art.
  const label=document.createElement("span");label.className="collection-label";label.textContent=names[family];
  cell.append(icon,label);container.append(cell);collectionCards.set(family,cell);
 }
 renderCollection(game.familyMasterpieces);
}
function renderCollection(counts,awards=[]){
 if(!counts)return;
 for(const [family,card] of collectionCards){
  const count=Math.max(0,Number(counts[family])||0);
  const previous=Number(card.dataset.count)||0;
  card.dataset.count=String(count);
  card.querySelector(".collection-count").textContent=String(count);
  card.classList.toggle("collected",count>0);
  card.setAttribute("aria-label",names[family]+": "+count+" mästerverk under nivån");
  if(count>previous&&awards.some(a=>a.family===family)&&!save.reduceMotion){
   card.classList.remove("collection-awarded");void card.offsetWidth;
   card.classList.add("collection-awarded");
  }
 }
}
// Visual Harmony VFX 2.0: small shared celebration accents for rewards which
// do not already use the full fusionFirework (Echo, Pulse and Collection).
// Same pink/pearl/champagne/gold alphabet. Two or three short-lived glyphs;
// no duplicate firework, game RNG, state mutation or permanent particle system.
const REWARD_ACCENT_SHAPES=Object.freeze([
 ["star","✦"],["diamond","◆"],["flower","✿"]
]);
function rewardAccentAt(x,y,kind){
 if(FAST()||document.hidden||!Element.prototype.animate||fxCount()>=(MOBILE_LITE?32:66))return;
 const count=LITE_FX()?2:3;
 const radius=kind==="collection"?21:kind==="pulse"?20:26;
 for(let i=0;i<count;i++){
  if(fxCount()>=(MOBILE_LITE?36:72))break;
  const [shape,glyph]=REWARD_ACCENT_SHAPES[i];
  const node=fxAt("harmony-reward-accent harmony-"+shape+" harmony-accent-"+kind,x,y,glyph);
  node.setAttribute("aria-hidden","true");
  const a=(i/count)*Math.PI*2-.8;
  const dx=Math.cos(a)*radius,dy=Math.sin(a)*radius;
  animateNode(node,[
   {transform:"translate3d(0,2px,0) scale(.35)",opacity:0,offset:0},
   {transform:"translate3d("+(dx*.28)+"px,"+(dy*.28)+"px,0) scale(1.17)",opacity:.97,offset:.27},
   {transform:"translate3d("+(dx*.72)+"px,"+(dy*.72-2)+"px,0) scale(.93)",opacity:.89,offset:.57},
   {transform:"translate3d("+dx+"px,"+(dy-5)+"px,0) scale(.30)",opacity:0,offset:1}
  ],kind==="echo"?560:kind==="collection"?485:450,
  {easing:"cubic-bezier(.18,.6,.3,1)"}).finally(()=>node.remove());
 }
}
async function celebrateCollection(evt){
 renderCollection(evt.familyMasterpieces,evt.awards||[]);
 const tasks=[];
 for(const award of evt.awards||[]){
  const card=collectionCards.get(award.family);if(!card)continue;
  if(award===evt.awards[0]&&!FAST()){
   const r=card.querySelector(".collection-icon")?.getBoundingClientRect();
   if(r&&r.width)rewardAccentAt(r.left+r.width*.5,r.top+r.height*.52,"collection");
  }
  if(!FAST()&&award.points){
   const popup=document.createElement("span");popup.className="collection-bonus";
   popup.textContent="+"+prettify(award.points);card.append(popup);
   tasks.push(animateNode(popup,[
    {transform:"translateY(9px) scale(.85)",opacity:0},
    {transform:"translateY(-2px) scale(1.04)",opacity:1,offset:.35},
    {transform:"translateY(-22px) scale(.97)",opacity:0}
   ],530).finally(()=>popup.remove()));
  }
 }
 await Promise.all(tasks);
}
function saveRun(){if(game&&game.moves>0&&!game.failed){save.run={level,data:{...game.save(),assisted:!!game.assisted,blessingUsed:!!game.blessingUsed},backgroundId:currentBackground};persist();}}
function startLevel(i,resume=false){
 if(busy)return;
 disarmDecisionClock();clearIdleHint();cachedIdleHint=null;
 resetResonanceVisuals();clearPraise();
 level=i;powerSelection=null;rewardStarsAtLevelStart=G.archivedStars(save,i);
 const data=resume&&save.run&&save.run.level===i?save.run.data:null;
 activeSealedFrame=null;activeDarumaFrame=null;activeMistFrame=null;
 game=new R.Game(i,data,data?null:{directorMode:save.playMode==="auto"?(i>=9?"v4":"v3"):save.playMode});chooseFestivalBackground(resume&&save.run&&save.run.level===i?save.run.backgroundId:null);scoreShown=game.score;clearScoreFx();lastGoalProgress=game.progress();selected=-1;$("menuView").hidden=true;$("gameView").hidden=false;document.body.classList.add("harmony-playing");$("modal").hidden=true;
 $("levelTitle").textContent=game.config.name;$("levelNumber").textContent="NIVÅ "+(i+1);
 $("goalLabel").textContent=game.goalText();
 $("goalLabel").title=game.config.intro||"";
 document.querySelector(".goal-glyph").textContent=game.config.goal.type==="mist"?"☁":
  game.config.goal.type==="daruma"?"◉":
  game.config.goal.type==="sealedStone"?"✦":"✿";
 const milestones=$("starTargets");
 milestones.hidden=game.rewardVersion>=2||game.config.goal.type!=="score";
 if(!milestones.hidden){
  [...milestones.children].forEach((node,j)=>{
   node.textContent="★".repeat(j+1)+" "+prettify(game.config.stars[j]);
  });
 }
 prepareCollection();renderBoard(game.board);renderHUD();updatePaceLabel();updateSpiritBadge();renderPowerBar();saveRun();armDecisionClock();restartIdleHint();
 if(i===30&&!resume&&game.config.goal.type==="sealedStone")
  toast("Sealed Stones står stilla. Fyra träffar på olika drag bryter stenen och utlöser en Awakening Pulse till alla åtta grannar.");
 if(i===20&&!resume&&game.config.goal.type==="daruma")
  toast("Daruma står stilla. Fusionera bredvid den eller träffa med Harmony Pulse. Varje öga kräver ett eget drag.");
 if(i===3&&!resume&&game.config.goal.type==="mist"&&!save.mistPulseIntroShown){
  toast("Rena dimman med en fusion på rutan eller Harmony Pulse från en grannruta. Pulsen renar även tomma dimrutor.");
  save.mistPulseIntroShown=true;persist();
 }
}
// Keep 49 stable cells. Only update a sprite when the piece in that cell changes.
// The old renderer recreated ~150 DOM nodes and 49 listeners for EVERY fusion frame.
let boardTiles=[],boardKeys=[],presentedBoard=Array(49).fill(null);
// Game is already at the end of the turn when playback begins. Event-specific
// mist snapshots prevent revealing cleansed cells before the relevant effect.
let activeMistFrame=null,activeDarumaFrame=null,activeSealedFrame=null;
// Cleansed fog gets a short floating dissolve in a separate overlay. It does
// not touch piece movement, game rules, or the turn's animation schedule.
function releaseMist(positions){
 if(FAST()||document.hidden||!Element.prototype.animate||!positions.length)return;
 const layer=makeFxLayer();
 layer.node.classList.add("mist-release-layer");
 const tasks=[];
 for(const at of positions.slice(0,MOBILE_LITE?16:24)){
  const rect=indexRect(at);
  const fog=document.createElement("span");
  fog.className="mist-release";
  fog.dataset.at=String(at);
  fog.setAttribute("aria-hidden","true");
  fog.style.left=(rect.left-layer.rect.left+rect.width*.5)+"px";
  fog.style.top=(rect.top-layer.rect.top+rect.height*.5)+"px";
  fog.style.width=rect.width+"px";
  fog.style.height=rect.height+"px";
  layer.node.append(fog);
  const dx=((at%3)-1)*7;
  tasks.push(animateNode(fog,[
   {transform:"translate3d(-50%,-50%,0) scale(.88)",opacity:.55,offset:0},
   {transform:"translate3d(calc(-50% + "+dx*.35+"px),calc(-50% - 4px),0) scale(1.06)",opacity:.43,offset:.32},
   {transform:"translate3d(calc(-50% + "+dx+"px),calc(-50% - 16px),0) scale(1.24)",opacity:0,offset:1}
  ],440,{easing:"ease-out"}).finally(()=>fog.remove()));
 }
 void Promise.all(tasks).finally(()=>layer.node.remove());
}
// Keep the same line nodes between renders, so their slow CSS energy streams
// do not restart on every tile selection. A new link pulses exactly once
// when first observed on a settled board (never on intermediate animation).
const resonanceNodes=new Map();
let resonanceLastKeys=new Set();
const echoLinkSnapshot=new Map();
// Reuse settled filament geometry until a piece/stage actually changes.
// This avoids repeated layout reads and style writes on simple tile selection.
let settledResonanceCache=null;
function resonanceKey(link){
 return [link.anchorId,link.partnerId].sort((a,b)=>a-b).join(":");
}
function resetResonanceVisuals(){
 const layer=$("resonanceLinks");
 if(layer){layer.replaceChildren();layer.classList.remove("resonance-paused");}
 resonanceNodes.clear();resonanceLastKeys.clear();echoLinkSnapshot.clear();
 settledResonanceCache=null;
}
function refreshResonance(board){
 const overlay=$("resonanceLinks");
 const anchors=new Set(),partners=new Set(),awakened=new Set();
 if(!overlay)return {anchors,partners,awakened};
 // Hide threads during the turn, but remember which IDs were linked before
 // it. Recreating the SAME link after an animation must not fire a new pulse.
 if(!game||game.moves<=0||game.failed){
  overlay.replaceChildren();overlay.classList.remove("resonance-paused");
  resonanceNodes.clear();resonanceLastKeys.clear();settledResonanceCache=null;
  return {anchors,partners,awakened};
 }
 if(busy||board!==game.board){
  // Preserve the real beam nodes and running filament animations across turns.
  overlay.classList.add("resonance-paused");
  return {anchors,partners,awakened};
 }
 overlay.classList.remove("resonance-paused");
 // A click or an unrelated HUD repaint must not remeasure all six beams.
 // Include position, identity, family and stage (not just board reference):
 // the real game mutates its 49-piece array in place between turns.
 const signature=board.map(p=>p?p.id+":"+p.family+":"+p.stage:"-").join("|");
 if(settledResonanceCache?.game===game&&settledResonanceCache.signature===signature){
  return {anchors:settledResonanceCache.anchors,
   partners:settledResonanceCache.partners,awakened};
 }
 const links=R.resonanceLinks(board)
  .sort((a,b)=>b.stage-a.stage||a.anchor-b.anchor).slice(0,6);
 const current=new Set();
 const shellRect=overlay.getBoundingClientRect();
 for(const link of links){
  const key=resonanceKey(link);
  current.add(key);
  anchors.add(link.anchor);partners.add(link.partner);
  const from=boardTiles[link.anchor]?.getBoundingClientRect();
  const to=boardTiles[link.partner]?.getBoundingClientRect();
  if(!from||!to||!from.width||!to.width)continue;
  const dx=to.left+to.width*.5-from.left-from.width*.5;
  const dy=to.top+to.height*.5-from.top-from.height*.5;
  const length=Math.hypot(dx,dy);
  if(length<=0)continue;
  const vx=dx/length,vy=dy/length;
  const inset=Math.min(from.width,to.width)*.22;
  let line=resonanceNodes.get(key);
  const isNew=!resonanceLastKeys.has(key);
  if(!line){
   line=document.createElement("span");
   line.dataset.pair=key;
   line.setAttribute("aria-hidden","true");
   resonanceNodes.set(key,line);
   overlay.append(line);
  }
  line.className="resonance-link"+(link.stage===4?" mature":"")+
   (isNew?" resonance-new":"");
  line.style.left=(from.left+from.width*.5+vx*inset-shellRect.left)+"px";
  line.style.top=(from.top+from.height*.5+vy*inset-shellRect.top)+"px";
  line.style.width=Math.max(2,length-inset*2)+"px";
  line.style.transform="rotate("+Math.atan2(dy,dx)+"rad)";
  if(isNew){awakened.add(link.anchor);awakened.add(link.partner);}
 }
 for(const [key,line] of resonanceNodes){
  if(!current.has(key)){line.remove();resonanceNodes.delete(key);}
 }
 resonanceLastKeys=current;
 settledResonanceCache={game,signature,anchors,partners};
 return {anchors,partners,awakened};
}
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
 const mist=activeMistFrame||game?.mist||[];
 const daruma=activeDarumaFrame||game?.daruma||[];
 const sealed=activeSealedFrame||game?.sealed||[];
 const removedMist=[];
 const resonance=refreshResonance(board);
 for(let i=0;i<49;i++){
  const piece=board[i],btn=boardTiles[i],doll=piece?.family==="daruma",stone=piece?.family==="sealedStone";
  const dState=doll?(daruma[i]===2?0:daruma[i]===1?1:2):-1;
  const stoneLeft=stone?(sealed[i]??4):0,stoneStage=stone?Math.min(3,Math.max(0,4-stoneLeft)):-1;
  const key=piece?piece.id+"|"+piece.family+"|"+piece.stage+"|"+dState+"|"+stoneStage:"empty";
  // Most frames change only 1-4 pieces. Preserve the other sprites, textures,
  // event listeners and their DOM nodes for a smoother mobile experience.
  if(boardKeys[i]!==key){
   boardKeys[i]=key;
   btn.replaceChildren();
   btn.setAttribute("aria-label",stone?"Sealed Stone, "+stoneLeft+" träffar kvar":
    doll?"Daruma, "+(dState===0?"två ögon kvar":dState===1?"ett öga kvar":"fullbordad"):
    piece?names[piece.family]+", stadium "+piece.stage+", ruta "+(Math.floor(i/7)+1)+"-"+(i%7+1):"Tom ruta");
   if(stone){
    const art=document.createElement("span");art.className="sealed-stone-art state-"+stoneStage;
    art.setAttribute("aria-hidden","true");btn.append(art);
   }else if(doll){
    const art=document.createElement("span");art.className="daruma-art state-"+dState;
    art.setAttribute("aria-hidden","true");btn.append(art);
   }else if(piece){
    const holder=document.createElement("span");holder.className="piece";
    const isNew=Object.hasOwn(newFamilyRows,piece.family);
    if(isNew)holder.classList.add("new-family");
    const emoji=document.createElement("span");emoji.className="fallback";emoji.textContent=symbols[piece.family];
    const img=document.createElement("span");img.className="sprite";
    img.style.setProperty("--sx",((piece.stage-1)*25)+"%");
    img.style.setProperty("--sy",(isNew?(newFamilyRows[piece.family]*100/3):familyRows[piece.family]*25)+"%");
    if(isNew)img.classList.add("sprite-new");
    // Stage 1 refresh: independent transparent art only for the paw and koi.
    // Stage 2–5 keep their original atlas cells and all existing stage rules.
    if(piece.stage===1&&(piece.family==="koi"||piece.family==="maneki"))
     img.classList.add("sprite-stage1-"+piece.family);
    holder.append(emoji,img);btn.append(holder);
   }
  }
  // Mist belongs to fixed cells. Its overlay is managed independently from
  // the atlas sprite to avoid repainting/replacing pieces on clearance.
  const misted=!!mist[i];
  if(!misted&&btn.dataset.mist==="1"&&activeMistFrame)removedMist.push(i);
  let veil=btn.querySelector(":scope > .harmony-mist");
  if(misted&&!veil){
   veil=document.createElement("span");veil.className="harmony-mist";
   veil.setAttribute("aria-hidden","true");btn.prepend(veil);
  }else if(!misted&&veil){veil.remove();}
  const label=stone?"Sealed Stone, "+stoneLeft+" träffar kvar, ruta "+
   (Math.floor(i/7)+1)+"-"+(i%7+1):
   doll?"Daruma, "+(dState===0?"två ögon kvar":dState===1?"ett öga kvar":"fullbordad")+", ruta "+
   (Math.floor(i/7)+1)+"-"+(i%7+1):
   piece?names[piece.family]+", stadium "+piece.stage+", ruta "+
   (Math.floor(i/7)+1)+"-"+(i%7+1):"Tom ruta";
  const accessible=label+(misted?", magisk dimma":"");
  if(btn.dataset.mist!==(misted?"1":"0")||btn.getAttribute("aria-label")!==accessible){
   btn.dataset.mist=misted?"1":"0";
   btn.setAttribute("aria-label",accessible);
  }
  const cls="tile"+(doll?" daruma-tile":"")+(stone?" sealed-stone-tile":"")+(misted?" misted":"")+(idleHintFrom===i?" idle-hint-source":"")+(idleHintTo===i?" idle-hint-target":"")+(selected===i?" selected":"")+
   (highlighted&&highlighted.has(i)?" "+flash:"")+
   (resonance.anchors.has(i)?" resonance-anchor":"")+
   (resonance.partners.has(i)?" resonance-partner":"")+
   (resonance.awakened.has(i)?" resonance-awakening":"");
  if(btn.className!==cls)btn.className=cls;
 }
 presentedBoard=board.map(p=>p?{id:p.id,family:p.family,stage:p.stage}:null);
 if(removedMist.length)releaseMist(removedMist);
}
window.addEventListener("resize",()=>{
 settledResonanceCache=null; // Width/position may change with the viewport.
 if(game&&!busy&&!$("gameView").hidden)renderBoard(game.board);
},{passive:true});
function renderHUD(state){
 if(!game)return;
 let current=state||game,progress=state?state.goal:game.progress();
 $("movesCount").textContent=current.moves;
 renderScoreOnly();
 $("goalProgress").textContent=prettify(Math.min(game.target(),progress))+" / "+prettify(game.target());
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
 $("statusStars").textContent=game.rewardVersion===2?(earnedStars?"★":"☆"):"★".repeat(earnedStars)+"☆".repeat(3-earnedStars);
 if(game.rewardVersion===3){
  const thresholds=R.moveStarTargets(game.config);
  $("statusStars").setAttribute("aria-label",game.complete?
   earnedStars+" av 3 stjärnor. Målet klarades på "+game.goalMove+" drag.":
   "Klara målet för en stjärna, på högst "+thresholds.two+" drag för två eller "+thresholds.three+" för tre.");
 }else if(game.rewardVersion===2){
  $("statusStars").setAttribute("aria-label",earnedStars?"Nivå klarad · 1 stjärna":"Klara nivåmålet för 1 stjärna");
 }else if(game.config.goal.type==="score"){
  const milestones=$("starTargets");
  [...milestones.children].forEach((node,j)=>{
   node.classList.toggle("reached",current.score>=game.config.stars[j]);
  });
  $("statusStars").setAttribute("aria-label",
   earnedStars+" av 3 stjärnor. Krav: "+game.config.stars.map(prettify).join(", "));
 }else{
  $("statusStars").setAttribute("aria-label",
   earnedStars+" av 3 stjärnor. Klara målet på högst "+
   game.config.par+" drag för 3 stjärnor eller "+(game.config.par+4)+" för 2.");
 }
 document.querySelector(".goal").classList.toggle("goal-complete",game.complete);
}
function renderScoreOnly(){
 $("scoreCount").textContent=prettify(scoreDisplayed);
 $("scoreBest").textContent=prettify(Math.max(scoreShown,activeRecords()[level]||0));
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
 if(powerSelection){confirmPowerTarget(i);return;}
 if(game.board[i]?.family==="daruma"){
  selected=-1;toast("Daruma flyttas inte. Matcha bredvid för att fylla dess ögon.");return;
 }
 if(game.board[i]?.family==="sealedStone"){
  selected=-1;toast("Sealed Stone flyttas inte. Matcha bredvid stenen eller träffa med Harmony Pulse (max en träff per drag).");return;
 }
 restartIdleHint();
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
 if(busy||!game||powerSelection||!$("modal").hidden)return;
 clearIdleHint();
 // Remember the real screen geometry of linked source objects BEFORE swapping
 // so an earned Echo can visibly pull that thread into the fusion landing.
 echoLinkSnapshot.clear();
 if(!FAST()){
  for(const link of R.resonanceLinks(game.board)){
   const first=boardTiles[link.anchor]?.getBoundingClientRect();
   const second=boardTiles[link.partner]?.getBoundingClientRect();
   if(!first||!second)continue;
   echoLinkSnapshot.set(resonanceKey(link),[
    {x:first.left+first.width/2,y:first.top+first.height/2},
    {x:second.left+second.width/2,y:second.top+second.height/2}
   ]);
  }
 }
 const decisionMs=decisionReadyAt&&!document.hidden?performance.now()-decisionReadyAt:null;
 const result=game.swap(a,b,{decisionMs});
 if(result.ok)disarmDecisionClock();
 if(!result.ok){
  echoLinkSnapshot.clear();
  selected=b;renderBoard(game.board);
  $("selectedInfo").textContent="Ingen matchning – prova ett annat byte.";
  // The rules did not consume a move. The animation is feedback only.
  sound("invalid");
  // Bounce holds busy=true until it settles. A timer restart during that
  // interval was rejected by hintEligible(), leaving the hint disabled.
  void invalidSwapBounce(a,b).finally(()=>restartIdleHint());
  return;
 }
 selected=-1;$("selectedInfo").textContent="Välj två grannar eller svep.";
 sound("swap");
 const bondGain=S.observe(save,level,result.events);
 if(bondGain.ok)persist();
 void playEvents(result.events,bondGain);
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
// Harmony Firework 1.0: a single Sakura-inspired, gold-forward evolution
// cue shared by ALL nine families. The flower is the pink accent; diamonds
// and stars are carried by the matching fusionBurst mini-firework below.
// Keep the familiar .evo-family and .evo-FAMILY classes for test coverage,
// but never render nine unrelated effects on the same style of fusion.
const EVOLUTION_FAMILIES=new Set(["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"]);
function evolveFamilyFx(groups){
 if(FAST()||!Element.prototype.animate)return;
 for(const g of groups.slice(0,MOBILE_LITE?2:3)){
  if(!EVOLUTION_FAMILIES.has(g.family)||!boardTiles[g.at])continue;
  const r=indexRect(g.at),size=Math.min(r.width,r.height);
  const x=r.left+r.width/2,y=r.top+r.height/2;
  const tier=g.to>=4?"medium":"small";
  const node=fxAt("evo-family evo-"+g.family+" harmony-evolution harmony-"+tier,x,y);
  node.style.setProperty("--evo-size",Math.round(size*1.45)+"px");
  animateNode(node,[
   {transform:"translate3d(0,4px,0) rotate(-10deg) scale(.34)",opacity:0,offset:0},
   {transform:"translate3d(0,0,0) rotate(5deg) scale(.94)",opacity:.93,offset:.28},
   {transform:"translate3d(0,-5px,0) rotate(13deg) scale(1.18)",opacity:.88,offset:.58},
   {transform:"translate3d(0,-10px,0) rotate(23deg) scale(1.34)",opacity:0,offset:1}
  ],tier==="medium"?690:540,{easing:"cubic-bezier(.16,.7,.25,1)"})
   .finally(()=>node.remove());
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
// Board Praise 1.0: exactly three rare, event-driven rewards.
const PRAISE_WORDS=Object.freeze({
 echo:"HARMONY ECHO!",
 masterpiece:"MASTERPIECE!",
 pulse:"HARMONY PULSE!",
 awakening:"AWAKENING PULSE!"
});
let praiseQueue=[],praiseSeen=new Set(),praiseTimer=0,praiseActive=false,praiseSession=0;
function clearPraise(){
 praiseSession++;clearTimeout(praiseTimer);praiseTimer=0;
 praiseQueue=[];praiseSeen.clear();praiseActive=false;
 $("boardPraise")?.replaceChildren();
}
function showNextPraise(){
 if(praiseActive||!praiseQueue.length)return;
 const layer=$("boardPraise");if(!layer)return;
 const kind=praiseQueue.shift();
 const word=document.createElement("span");
 word.className="board-praise-word praise-"+kind;
 word.textContent=PRAISE_WORDS[kind];
 layer.replaceChildren(word);
 praiseActive=true;
 const session=praiseSession;
 praiseTimer=setTimeout(()=>{
  if(session!==praiseSession)return;
  layer.replaceChildren();praiseActive=false;praiseTimer=0;
  showNextPraise();
 },FAST()?520:1160);
}
function praise(kind){
 if(!Object.hasOwn(PRAISE_WORDS,kind)||praiseSeen.has(kind))return;
 praiseSeen.add(kind);praiseQueue.push(kind);showNextPraise();
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
// Harmony Firework 1.0 — gold-forward Sakura celebration for EVERY family.
// Shapes: pink ✿ blossom, pearl-white ◆ crystal, gold ✦ star. All three have
// distinct glow and an outward pop/fade motion. No canvas, no board mutation.
// Size tiers are a normal stage 2–3 fusion, a strong stage 4+ fusion, and a
// Masterpiece. Existing family-neutral ring and core establish visual origin.
function fireworkTier(group,kind){
 return kind==="hero"?"masterpiece":group?.to>=4||group?.number>=4?"medium":"small";
}
const FIREWORK_SHAPES=Object.freeze([
 {type:"star",glyph:"✦"},
 {type:"flower",glyph:"✿"},
 {type:"diamond",glyph:"◆"}
]);
function fusionBurst(positions,groups=[],kind="fusion"){
 if(FAST()||!Element.prototype.animate||document.hidden)return;
 const maxPositions=MOBILE_LITE?2:3;
 for(const at of [...new Set(positions)].slice(0,maxPositions)){
  if(!boardTiles[at])continue;
  const rect=indexRect(at),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const group=groups.find(g=>g.at===at),tier=fireworkTier(group,kind);
  const tile=Math.min(rect.width,rect.height);
  const radius=tile*(tier==="masterpiece"?.81:tier==="medium"?.63:.51);
  const duration=tier==="masterpiece"?880:tier==="medium"?720:570;
  const count=LITE_FX()?4:MOBILE_LITE?
   (tier==="masterpiece"?9:tier==="medium"?7:5):
   (tier==="masterpiece"?12:tier==="medium"?9:6);
  // Ordinary fusion should be a clean merger, without expanding circles.
  // Keep stronger Masterpiece celebrations when kind === "hero".
  if(kind==="hero"){
   // Preserve the tactile ring, now a restrained, warm golden ripple.
   const ring=fxAt("fusion-ring harmony-firework-ring harmony-"+tier,x,y);
   ring.style.width=(tile*(tier==="masterpiece"?1.24:1.02))+"px";
   ring.style.height=ring.style.width;
   animateNode(ring,[
    {transform:"scale(.28)",opacity:0,offset:0},
    {transform:"scale(.98)",opacity:.98,offset:.25},
    {transform:"scale(1.50)",opacity:0,offset:1}
   ],duration*.79).finally(()=>ring.remove());
   const core=fxAt("fusion-core harmony-firework-core harmony-"+tier,x,y);
   animateNode(core,[
    {transform:"scale(.22)",opacity:0,offset:0},
    {transform:"scale(1.02)",opacity:.90,offset:.26},
    {transform:"scale(1.40)",opacity:0,offset:1}
   ],duration*.76).finally(()=>core.remove());
  }
  for(let i=0;i<count;i++){
   // Repeat a balanced triad — pink petals, pearl-white gems, gold stars.
   // Stagger and asymmetric travel avoid a mechanical wheel/spinner.
   if(fxCount()>=(MOBILE_LITE?44:84))break;
   const shape=FIREWORK_SHAPES[i%FIREWORK_SHAPES.length];
   const angle=(i/count)*Math.PI*2-.37+((i%3)-1)*.085;
   const distance=radius*(.77+(i%4)*.095);
   const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;
   const symbol=fxAt("fusion-spark harmony-firework-particle harmony-"+shape.type+
    " harmony-"+tier,x,y,shape.glyph);
   symbol.setAttribute("aria-hidden","true");
   symbol.dataset.fireworkShape=shape.type;
   const twist=(i%2===0?1:-1)*(tier==="masterpiece"?38:26);
   const pop=1.30+(i%3)*.12;
   animateNode(symbol,[
    {transform:"translate3d(0,0,0) rotate(0deg) scale(.22)",opacity:0,offset:0},
    {transform:"translate3d("+(dx*.23)+"px,"+(dy*.23)+"px,0) rotate("+(twist*.30)+"deg) scale("+pop+")",opacity:1,offset:.28},
    {transform:"translate3d("+(dx*.68)+"px,"+(dy*.68-2)+"px,0) rotate("+(twist*.70)+"deg) scale(1.02)",opacity:.95,offset:.58},
    {transform:"translate3d("+dx+"px,"+(dy-5)+"px,0) rotate("+twist+"deg) scale(.26)",opacity:0,offset:1}
   ],duration+(i%3)*24,{easing:"cubic-bezier(.15,.6,.3,1)"})
    .finally(()=>symbol.remove());
  }
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
 if(evt.type==="echo")at=evt.at??24;
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
// FLOATING MAGIC DUST 1.1 — early energy release during fusion travel.
// Seamless fusions overlap original object motion and drifting motes; ordinary
// harvests retain their 1.0 timing. No score, board, or match-rule changes.
// Dust is placed in a separate transient board overlay. Unlike tile children
// it survives renderBoard replacing cells, so gravity can begin underneath.
// The legacy 280ms fusion movement, Pulse targeting and scoring are untouched.
function sparkleVacatedCells(positions,board,timing="after"){
 if(FAST()||document.hidden||!Element.prototype.animate)return [];
 const cells=[...new Set(positions)].filter(i=>
  Number.isInteger(i)&&i>=0&&i<49&&!board[i]&&boardTiles[i]);
 if(!cells.length)return [];
 const budget=LITE_FX()?16:MOBILE_LITE?30:60;
 const seamless=timing==="fusion";
 // Every empty cell is represented, even on very large Pulse harvests.
 const perCell=Math.min(5,Math.max(1,Math.floor(budget/cells.length)));
 const anchors=[[22,72],[58,65],[76,44],[37,51],[52,32],[29,35],[69,73]];
 const layer=makeFxLayer();
 layer.node.classList.add("magic-dust-layer");
 const tasks=[];
 for(const at of cells){
  const rect=indexRect(at);
  for(let n=0;n<perCell;n++){
   const idx=(at+n*3)%anchors.length,[px,py]=anchors[idx];
   const x=rect.left-layer.rect.left+rect.width*px/100;
   const y=rect.top-layer.rect.top+rect.height*py/100;
   const particle=document.createElement("span");
   const tone=(n+at)%3;
   particle.className="fusion-afterglow-spark magic-dust "+
    (tone===0?"dust-pearl":tone===1?"dust-gold":"dust-sakura")+
    (n===0&&perCell>=4?" dust-star":" dust-mote");
   particle.dataset.at=String(at);
   particle.dataset.phase=seamless?"fusion":"after";
   particle.setAttribute("aria-hidden","true");
   particle.style.left=x+"px";
   particle.style.top=y+"px";
   layer.node.append(particle);
   // Different per-particle delay, curved ascent and sideways drift.
   // A single soft opacity peak, never a double flash or scale-pop.
   // Spawn ~75ms into the original 280ms gather, then keep drifting into
   // the 215ms survivor contact and the following gravity/refill.
   const delay=(seamless?75:0)+(n*37+(at%5)*19)%122;
   const duration=(seamless?395:290)+((n+at)%4)*(seamless?25:30);
   const dx=((idx%2===0)?-1:1)*(2.5+(n%3)*1.3);
   const dy=-(9+(idx%4)*2.5);
   const move=(x,y,scale)=>
    "translate3d(calc(-50% + "+x+"px),calc(-50% + "+y+"px),0) scale("+scale+")";
   particle.dataset.delay=String(delay);
   tasks.push(animateNode(particle,[
    {transform:move(0,0,.5),opacity:0,offset:0},
    {transform:move(dx*.14,dy*.12,.78),opacity:.39,offset:.21},
    {transform:move(dx*.5,dy*.47,1),opacity:.72,offset:.49},
    {transform:move(dx*.83,dy*.78,.85),opacity:.40,offset:.77},
    {transform:move(dx,dy,.53),opacity:0,offset:1}
   ],duration,{delay,easing:"linear"}).finally(()=>particle.remove()));
  }
 }
 // This cleanup runs independently of the next board event. Callers may let
 // gravity/refill start now; lingering motes are not attached to tile nodes.
 void Promise.all(tasks).finally(()=>layer.node.remove());
 return tasks;
}
async function playFusion(evt){
 const groups=evt.groups||[];
 if(!FAST()&&groups.length){
  const layer=makeFxLayer(),hidden=[],tasks=[];
  try{
   for(const group of groups){
    const landingPiece=boardTiles[group.at]?.querySelector(".piece");
    // Fusion Destination Control 1.0: when the strongest-stage piece comes
    // FROM another cell, the resident destination piece joins the merge.
    // A ghost of the stronger source travels here through group.removed.
    const relocating=group.origin!=null&&group.origin!==group.at;
    if(landingPiece)tasks.push(animateNode(landingPiece,relocating?[
     {transform:"scale(1)",opacity:1,offset:0},
     {transform:"scale(.95)",opacity:1,offset:.24},
     {transform:"scale(.76)",opacity:.78,offset:.78},
     {transform:"scale(.52)",opacity:.15,offset:1}
    ]:[
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
   // Start the dust while sources are still moving. Its own FX layer
   // survives the coming renderBoard() call and is NEVER awaited here.
   sparkleVacatedCells(groups.flatMap(g=>g.removed),evt.board,"fusion");
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
// Harmony Pulse Anticipation 1.0 — target glow BEFORE the real Pulse arrives.
// Keep existing art visible and shorten preparation for successive chain waves.
// The engine's score, stages and affected positions are never modified.
const PULSE_CHARGE_TIMINGS=Object.freeze([
 {delay:85,ramp:265}, // First wave: deliberate visual anticipation.
 {delay:45,ramp:185}, // Second: faster, maintaining chain momentum.
 {delay:20,ramp:135}  // Third and later: snappy but still readable.
]);
async function pulseAnticipation(evt){
 const visualTargets=[...(evt.darumaTargets||[]),...(evt.stoneTargets||[]),...(evt.mistTargets||[]),...(evt.visualOnlyTargets||[]),...(evt.targets||[])];
 const affected=[...new Set(visualTargets.map(t=>t.to))];
 if(!affected.length||FAST()||document.hidden||!Element.prototype.animate)return ()=>{};
 const wave=Math.max(1,Number(evt.wave)||1);
 const timing=PULSE_CHARGE_TIMINGS[Math.min(wave-1,2)];
 const overlays=[],tasks=[];
 try{
  for(const to of affected){
   const tile=boardTiles[to];
   if(!tile)continue;
   const target=visualTargets.find(t=>t.to===to);
   const glow=document.createElement("span");
   glow.className="pulse-anticipation-glow"+
    (target?.stage===5?" pulse-anticipation-masterpiece":"");
   glow.dataset.to=String(to);
   glow.dataset.wave=String(wave);
   glow.setAttribute("aria-hidden","true");
   tile.append(glow);
   overlays.push(glow);
   tasks.push(animateNode(glow,[
    {opacity:0,transform:"scale(.84)",offset:0},
    {opacity:.19,transform:"scale(.90)",offset:.26},
    {opacity:.64,transform:"scale(.98)",offset:.68},
    {opacity:1,transform:"scale(1.035)",offset:1}
   ],timing.ramp,{delay:timing.delay,easing:"cubic-bezier(.22,.32,.25,1)"}));
  }
  // animateNode cancels its finished animation. With default CSS opacity=1
  // the fully charged glow stays visible until the incoming beam lands.
  await Promise.all(tasks);
 }catch(error){
  overlays.forEach(node=>node.remove());
  throw error;
 }
 return ()=>overlays.forEach(node=>node.remove());
}
// Energy travels out from the masterpiece BEFORE affected items transform.
// Capped number of visible energy paths; never cap logical target updates.
// Pulse Readability 4.1.1 – a visible travelling energy line and core.
// Animate real from/to coordinates, cap decorative FX, update all logical
// targets AFTER travel as in 4.1. No canvas or full-screen filters.
function pulseBeams(evt){
 const visualTargets=[...(evt.darumaTargets||[]),...(evt.stoneTargets||[]),...(evt.mistTargets||[]),...(evt.visualOnlyTargets||[]),...(evt.targets||[])];
 if(visualTargets.length)sound("pulse",{wave:evt.wave||0});
 if(FAST()||!visualTargets.length)return Promise.resolve();
 // Prioritize mist-clearing beams when decorative paths are capped on mobile.
 // Logical target updates are NEVER capped.
 const targets=visualTargets.slice(0,evt.type==="awakening"?8:MOBILE_LITE?(LITE_FX()?3:5):9);
 const travelMs=(evt.wave||1)>=3?170:(evt.wave||1)===2?195:230;
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
  ],travelMs,{easing:"cubic-bezier(.2,.4,.5,1)"}));
  const dot=document.createElement("span");dot.className="pulse-dot";
  dot.style.left=(sx-6)+"px";dot.style.top=(sy-6)+"px";
  layer.node.appendChild(dot);
  tasks.push(animateNode(dot,[
   {transform:"translate3d(0,0,0) scale(.4)",opacity:.18,offset:0},
   {transform:"translate3d("+(dx*.5)+"px,"+(dy*.5)+"px,0) scale(1.45)",opacity:1,offset:.5},
   {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.65)",opacity:0,offset:1}
  ],travelMs,{easing:"cubic-bezier(.28,.5,.54,1)"}));
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
 // One restrained celebratory accent for the entire wave; NOT every tile.
 if(positions.length){
  const r=indexRect(positions[0]);
  rewardAccentAt(r.left+r.width/2,r.top+r.height/2,"pulse");
 }
}
async function animateEcho(evt){
 sound("echo",{family:evt.family,stage:evt.stage});
 if(FAST()||!Element.prototype.animate||!boardTiles[evt.at])return;
 const rect=indexRect(evt.at),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 const sources=echoLinkSnapshot.get(resonanceKey(evt))||[];
 // Two miniature mint-gold beams converge from the PRE-SWAP link endpoints.
 // They reuse the global pointer-free FX layer; no persistent sprite/particle
 // systems and no rule-engine changes.
 if(sources.length){
  const beams=sources.map(source=>{
   const dx=source.x-x,dy=source.y-y,length=Math.hypot(dx,dy);
   if(length<3)return null;
   const arm=fxAt("resonance-collapse-arm",x,y);
   arm.style.transform="rotate("+Math.atan2(-dy,-dx)+"rad)";
   const beam=document.createElement("span");beam.className="resonance-collapse-beam";
   beam.style.width=Math.min(length,Math.max(rect.width*1.6,22))+"px";
   arm.append(beam);
   return {arm,beam};
  }).filter(Boolean);
  await Promise.all(beams.map(({beam})=>animateNode(beam,[
   {transform:"scaleX(1)",opacity:.95},
   {transform:"scaleX(.08)",opacity:0}
  ],170,{easing:"ease-in"}))).finally(()=>beams.forEach(({arm})=>arm.remove()));
 }
 const ring=fxAt("resonance-echo-ring",x,y);
 ring.style.width=Math.round(rect.width*1.34)+"px";
 ring.style.height=Math.round(rect.height*1.34)+"px";
 const label=fxAt("resonance-echo-label",x,y-Math.min(24,rect.height*.48),"✦ HARMONY ECHO");
 rewardAccentAt(x,y,"echo");
 await Promise.all([
  animateNode(ring,[
   {transform:"scale(.40)",opacity:0,offset:0},
   {transform:"scale(1)",opacity:1,offset:.32},
   {transform:"scale(1.6)",opacity:0,offset:1}
  ],450),
  animateNode(label,[
   {transform:"translate3d(0,7px,0) scale(.85)",opacity:0,offset:0},
   {transform:"translate3d(0,-8px,0) scale(1.04)",opacity:1,offset:.32},
   {transform:"translate3d(0,-26px,0) scale(.96)",opacity:0,offset:1}
  ],540)
 ]).finally(()=>{ring.remove();label.remove();});
}
async function animateEvent(evt){
 const previous=presentedBoard;
 activeMistFrame=Array.isArray(evt.mist)?evt.mist:null;
 activeDarumaFrame=Array.isArray(evt.daruma)?evt.daruma:null;
 activeSealedFrame=Array.isArray(evt.sealed)?evt.sealed:null;
 switch(evt.type){
  case "swap":
   renderBoard(evt.board,[evt.from,evt.to],"swapped");
   await flipMove(previous,evt.board,"swap");
   break;
  case "fusion":
   await playFusion(evt);
   break;
  case "echo":
   await animateEcho(evt);
   break;
  case "bonus":{
   const targets=evt.targets||[];
   renderBoard(evt.board,targets.map(t=>t.to),"pulsed");
   await Promise.all(targets.slice(0,MOBILE_LITE?4:7).map(t=>animateNode(boardTiles[t.to]?.querySelector(".piece"),[
    {transform:"scale(.83)",offset:0},{transform:"scale(1.13)",offset:.58},{transform:"scale(1)",offset:1}
   ],133)));
   break;
  }
  case "awakening":
  praise("awakening");
  // Use the existing travelling pulse VFX for all eight destinations.
  case "pulse":{
   const targets=evt.targets||[];
   const visualTargets=[...(evt.darumaTargets||[]),...(evt.stoneTargets||[]),...(evt.mistTargets||[]),...(evt.visualOnlyTargets||[]),...targets];
   // Empty mist-covered cells glow as well; their sprites stay empty.
   const releaseCharge=await pulseAnticipation(evt);
   try{
    await pulseBeams(evt); // The outgoing energy catches up to the glow.
   }finally{
    releaseCharge(); // Remove overlays just before the upgraded art appears.
   }
   renderBoard(evt.board,visualTargets.map(t=>t.to),"pulsed");
   pulseLandingCues(visualTargets);
   await Promise.all(targets.slice(0,MOBILE_LITE?5:9).map(t=>animateNode(boardTiles[t.to]?.querySelector(".piece"),[
    {transform:"scale(.76)",offset:0},{transform:"scale(1.22)",offset:.49},{transform:"scale(1)",offset:1}
   ],(evt.wave||1)>=2?135:165)));
   break;
  }
  case "sealed-hit":{
   renderBoard(evt.board,(evt.hits||[]).map(h=>h.at),"sealed-hit");
   if(!FAST())await Promise.all((evt.hits||[]).map(h=>
    animateNode(boardTiles[h.at]?.querySelector(".sealed-stone-art"),[
     {transform:"scale(.89)",filter:"brightness(1)",offset:0},
     {transform:"scale(1.09)",filter:"brightness(1.4)",offset:.55},
     {transform:"scale(1)",filter:"brightness(1)",offset:1}
    ],240)));
   break;
  }
  case "daruma":{
   renderBoard(evt.board,(evt.hits||[]).map(h=>h.at),"daruma-hit");
   if(!FAST())await Promise.all((evt.hits||[]).map(h=>
    animateNode(boardTiles[h.at]?.querySelector(".daruma-art"),[
     {transform:"scale(.87)",filter:"brightness(1)",offset:0},
     {transform:"scale(1.13)",filter:"brightness(1.3)",offset:.55},
     {transform:"scale(1)",filter:"brightness(1)",offset:1}
    ],220)));
   break;
  }
  case "daruma-release":{
   if(!FAST())for(const at of evt.positions||[]){
    const r=indexRect(at),fx=fxAt("harvest-release",r.left+r.width*.5,r.top+r.height*.5);
    fx.style.width=r.width+"px";fx.style.height=r.height+"px";
    animateNode(fx,[{opacity:.8,transform:"scale(.4)"},{opacity:.75,transform:"scale(1.1)",offset:.42},
     {opacity:0,transform:"scale(1.5)"}],360).finally(()=>fx.remove());
   }
   renderBoard(evt.board,(evt.positions||[]),"pulsed");
   break;
  }
  case "hero":
   sound("hero");
   renderBoard(evt.board,evt.positions||[],"harvested");
   masterpieceMoment(evt.positions||[]);
   fusionBurst(evt.positions||[],[],"hero");
   await Promise.all((evt.positions||[]).slice(0,MOBILE_LITE?3:7).map(i=>animateNode(boardTiles[i]?.querySelector(".piece"),[
    {transform:"scale(.88)",offset:0},{transform:"scale(1.19)",offset:.56},{transform:"scale(1)",offset:1}
   ],180)));
   break;
  case "collection":
   await celebrateCollection(evt);
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
   // Pulse-upgraded masterpieces disappear at harvest, not during Pulse.
   // Let their dust drift into the falling refill, with no added turn delay.
   sparkleVacatedCells(positions,evt.board);
   break;
  }
  case "fall":
   renderBoard(evt.board);
   await flipMove(previous,evt.board,"fall");
   break;
  case "shuffle":
   // A fair shuffle relocates complete piece identities; use the existing
   // ID-based FLIP animation so developed objects visibly move to new slots
   // instead of appearing to change family/stage in place.
   renderBoard(evt.board,Array.from({length:49},(_,i)=>i),"shuffling");
   await flipMove(previous,evt.board,"shuffle");
   break;
  default:
   renderBoard(evt.board);
 }
}
async function playEvents(events,bondGain=null){
 clearIdleHint();
 busy=true;$("board").setAttribute("aria-busy","true");
 $("resonanceLinks")?.classList.add("resonance-paused");
 rectCache=new Array(49);boardLayerRect=null;
 perf?.begin();
 clearPraise();
 let finished=false,goalReached=false,spiritCuePlayed=false;
 try{
  for(const evt of events){
   await animateEvent(evt);
   if(!spiritCuePlayed&&((evt.type==="hero"&&save.economy?.equipped==="sakura")||
    ((evt.type==="daruma"||evt.type==="sealed-hit")&&save.economy?.equipped==="daruma"))){
    spiritMoment(evt);spiritCuePlayed=true;
   }
   if(evt.scoreDelta>0){
    if(evt.type==="collection"){
     scoreShown+=evt.scoreDelta;animateScoreCount();scoreArrival(evt.scoreDelta);
    }else flyPoints(evt);
   }
   if(["bonus","goal"].includes(evt.type))sound(evt.type);
   if(evt.type==="daruma"&&(evt.hits||[]).some(h=>h.filled===2))toast("✦ Daruma fullbordad!");
   if(evt.type==="echo")praise("echo");
   else if(evt.type==="hero")praise("masterpiece");
   else if(evt.type==="pulse"&&((evt.targets?.length||0)+(evt.mistTargets?.length||0)+(evt.darumaTargets?.length||0)>0))praise("pulse");
   if(evt.type==="goal"){goalReached=true;unlockGoal();toast("✦ Nivåmålet klart!");}
   if(evt.type==="end"||evt.type==="lose")finished=true;
   renderHUD(evt);
  }
 }catch(error){
  console.error("Harmony animation interrupted",error);
  renderBoard(game.board);
 }finally{
  activeMistFrame=null;activeDarumaFrame=null;
  echoLinkSnapshot.clear();
  rectCache=null;boardLayerRect=null;
  perf?.stop();
  busy=false;$("board").setAttribute("aria-busy","false");renderBoard(game.board);renderHUD();updatePaceLabel();saveRun();
  if(!finished)armDecisionClock();
  if(!finished)restartIdleHint();
 }
 if(bondGain?.ok){
  updateSpiritBadge();
  toast(bondGain.tierUnlocked?"✦ Omamori Bond "+bondGain.tierUnlocked+" upplåst!":
   "✦ "+bondGain.status.name+" · Bond "+bondGain.status.count+"/"+bondGain.status.max);
 }
 if(goalReached)unlockGoal();
 if(finished||goalReached)showResult();
}
function unlockGoal(){
 save.unlocked=Math.max(save.unlocked,level+1);
 if(save.unlocked>=MENU_PAGE_SIZE*(menuPage+1))menuPage=Math.floor(save.unlocked/MENU_PAGE_SIZE);
 const archive=game.familyCount===4?save.fourFamilyStars:save.bestStars;
 if(!game.assisted)archive[level]=Math.max(archive[level]||0,game.stars());
 // A pre-upgrade 5-family intro run may still be completed after the update.
 // Reflect its achievement in the permanent four-family introduction archive,
 // without altering or discarding the original five-family history.
 if(level<10&&!game.assisted)save.fourFamilyStars[level]=Math.max(save.fourFamilyStars[level]||0,game.stars());
 persist();
}
function showResult(){
 $("modalActions").classList.remove("pause-menu-actions");
 if(!game)return;
 disarmDecisionClock();clearIdleHint();clearPraise();clearScoreFx();scoreShown=game.score;scoreDisplayed=scoreShown;renderScoreOnly();
 const won=game.complete;
 if(won)sound("result");
 if(won){
  unlockGoal();
  if(game.assisted){
   save.assistedStars[level]=Math.max(save.assistedStars[level]||0,game.stars());
   save.assistedScores[level]=Math.max(save.assistedScores[level]||0,game.score);
  }
  const scores=game.familyCount===4?save.fourFamilyScores:save.bestScores;
  const chains=game.familyCount===4?save.fourFamilyChain:save.bestChain;
  if(!game.assisted)scores[level]=Math.max(scores[level]||0,game.score);
  if(!game.assisted)chains[level]=Math.max(chains[level]||0,game.bestChain);
  if(level<10&&!game.assisted){
   save.fourFamilyScores[level]=Math.max(save.fourFamilyScores[level]||0,game.score);
   save.fourFamilyChain[level]=Math.max(save.fourFamilyChain[level]||0,game.bestChain);
  }
 }
 const coinReward=won&&!game.assisted?E.claim(save,level,Math.max(1,game.stars())):{delta:0};
 const powerReward=won?P.grantForClear(save,level,!!game.assisted):{ok:false};
 const canContinue=won&&game.moves>0;
 if(!canContinue)save.run=null;
 persist();
 $("modalEyebrow").textContent=won?"LEVEL COMPLETE":"FÖRSÖK IGEN";
 $("modalTitle").textContent=won?"Vilken harmoni!":"Inga drag kvar";
 const panel=$("modalContent");panel.replaceChildren();
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!=null)node.textContent=text;
  return node;
 };
 if(won){
  const result=make("div","victory-result");
  panel.append(result);
  // Stars are the emotional headline, but never the whole reward contract:
  // retain the three-star accessible text and the legacy v2 completion label.
  const stars=make("div","big-stars");
  if(game.rewardVersion===2){
   stars.classList.add("legacy-stars");
   stars.textContent="★ NIVÅ KLAR";
  }else{
   stars.setAttribute("role","img");
   stars.setAttribute("aria-label",game.stars()+" av 3 stjärnor");
   for(let i=0;i<3;i++){
    const filled=i<game.stars();
    const star=make("span","victory-star"+(filled?" is-earned":" is-empty"),filled?"★":"☆");
    star.setAttribute("aria-hidden","true");
    star.style.setProperty("--star-index",i);
    stars.append(star);
   }
  }
  const starWrap=make("div","victory-stars");
  starWrap.append(stars);
  result.append(starWrap);
  // Avoid replay celebrations even if unlockGoal() saved during playback.
  const earnedStars=G.archivedStars(save,level);
  const chapterReward=G.chapterSnapshot(save,Math.floor(level/G.CHAPTER_SIZE));
  if(earnedStars>rewardStarsAtLevelStart){
   const isNew=rewardStarsAtLevelStart===0;
   const chapterComplete=isNew&&chapterReward.completed;
   const ribbon=make("div","victory-archive-reward"+(chapterComplete?" is-chapter-complete":""));
   const copyRibbon=make("div","victory-archive-copy");
   copyRibbon.append(make("strong","",chapterComplete?"Kapitelsigillet är intjänat!":
    isNew?"Ny stämpel i Goshuincho":"Stämpeln förbättrad"),
    make("small","",chapterComplete?"Kapitel "+chapterReward.number+" fullbordat · 10 av 10 stämplar":
     "Kapitel "+chapterReward.number+" · "+chapterReward.earned+" av 10 stämplar · "+earnedStars+" av 3 stjärnor"));
   ribbon.append(make("span","victory-archive-seal","✦"),copyRibbon);result.append(ribbon);
  }
  rewardStarsAtLevelStart=earnedStars;
  if(game.assisted)result.append(make("p","omamori-assisted-notice","✧ Assisterad seger – nästa nivå låses upp. Vanliga stjärnor, mynt och rekord påverkas inte."));
  const income=make("div","victory-harmony-income");
  const gained=coinReward.delta;
  income.append(make("span","victory-harmony-mark","✧"),
   make("strong","",gained?("+"+prettify(gained)+" Harmony Coins"):"Harmony Coins redan insamlade"),
   make("small","",gained?
    "Belöning för nya stjärnor · sparad i din samling":
    "Nya mynt får du när du klarar en ny nivå eller förbättrar betyget."));
  result.append(income);
  if(powerReward.ok)result.append(make("p","omamori-power-earned","✦ Ny "+P.POWERS[powerReward.id].name+"-välsignelse! "+powerReward.charges+" i förrådet."));
  const goal=make("section","victory-goal");
  goal.setAttribute("aria-label","Avklarat nivåmål");
  const goalCopy=make("div","victory-goal-copy");
  goalCopy.append(make("span","victory-kicker","NIVÅMÅL UPPNÅTT"),
   make("strong","victory-goal-title",game.goalText()));
  const goalProgress=make("span","victory-goal-count",
   prettify(game.target())+" / "+prettify(game.target()));
  goal.append(goalCopy,goalProgress);
  result.append(goal);
  if(game.rewardVersion===3){
   const timing=make("div","victory-timing");
   const moves=make("div","victory-timing-stat");
   moves.append(make("strong","",String(game.goalMove)),
    make("span","","av "+game.config.moves+" drag"));
   const rating=make("div","victory-timing-stat");
   rating.append(make("strong","",game.stars()+" / 3"),
    make("span","","stjärnor"));
   timing.append(moves,rating);
   const note=make("p","victory-star-note","Betyget låses när du når målet.");
   result.append(timing,note);
  }
  if(game.config.goal.type==="mist"){
   result.append(make("p","victory-mist-note","✦ Trädgårdens dimma är renad"));
  }
  const sum=make("section","summary victory-score");
  const scoreHeader=make("div","victory-score-head");
  scoreHeader.append(make("div","victory-kicker","BONUSPOÄNG"));
  const record=make("span","victory-record");
  record.append(make("span","victory-record-mark","✦"),
   make("span","","REKORD "+prettify(activeRecords()[level]||game.score)));
  scoreHeader.append(record);
  const strong=make("strong","victory-score-number",prettify(game.score));
  sum.append(scoreHeader,strong);
  result.append(sum);
  const stats=make("div","result-stats victory-stats");
  const entries=[
   [game.masterpieces,"Mästerverk","✿"],
   [game.echoes||0,"Harmony Echo","≋"],
   [game.bestChain,"Bästa Harmony-kedja","∞"],
   [game.fusions,"Fusioner","✧"]
  ];
  entries.forEach(([value,label,symbol])=>{
   const card=make("div","victory-stat");
   card.append(make("span","victory-stat-icon",symbol));
   const copy=make("span","victory-stat-copy");
   copy.append(make("strong","",String(value)),make("small","",label));
   card.append(copy);stats.append(card);
  });
  result.append(stats);
  const note=make("p","victory-next-note",canContinue?
   "✦ "+game.moves+" drag kvar · spela vidare för poängrekord eller gå till nästa nivå.":
   "✦ Nivån är klar · spela igen för ett nytt rekord eller gå vidare.");
  result.append(note);
 }else{
  if(game.config.goal.type==="mist"){
   const msg=make("p","mist-result",
    "Du renade "+game.mistCleared+" av "+game.target()+" dimrutor. Försök nå resten.");
   panel.append(msg);
  }
  const sum=make("div","summary"),label=make("div","","BONUSPOÄNG"),
   number=make("strong","",prettify(game.score));
  sum.append(label,number);panel.append(sum);
  // This pass only redesigns wins; preserve the existing failed-run stats.
  const stats=make("div","result-stats");
  [[game.masterpieces,"Mästerverk"],[game.echoes||0,"Harmony Echo"],
   [game.bestChain,"Bästa Harmony-kedja"],[game.fusions,"Fusioner"],
   [prettify(activeRecords()[level]||game.score),"Personligt rekord"]].forEach(([value,label])=>{
    const entry=make("div");
    entry.append(make("strong","",String(value)),make("small","",label));
    stats.append(entry);
   });
  panel.append(stats);
  panel.append(make("p","","Nytt försök ger en ny kontrollerad startvariant. Inga liv eller väntetider."));
 }
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.toggle("victory-actions",won);
 if(!won&&P.status(save,"tsuki")?.owned&&P.status(save,"tsuki").charges>0&&!game.blessingUsed)
  modalButton(actions,"☾ Månens ro · +3 drag ("+P.status(save,"tsuki").charges+" kvar)","primary omamori-moon-revive",()=>confirmMoonRescue());
 if(won)modalButton(actions,"Nästa nivå →","primary victory-next",()=>startLevel(level+1));
 if(canContinue)modalButton(actions,"Fortsätt för poängrekord","secondary victory-continue",()=>{
  $("modal").hidden=true;armDecisionClock();restartIdleHint();
 });
 modalButton(actions,won?"Spela igen":"Försök igen med nytt bräde",won?"secondary victory-tertiary":"secondary",()=>startLevel(level));
 modalButton(actions,"Goshuincho · Nivåval",won?"secondary victory-tertiary":"secondary",()=>{
  if(won){game.finish();save.run=null;persist();}
  showLevelSelection();
 });
 $("modal").hidden=false;
}
function modalButton(parent,label,cls,fn){let b=document.createElement("button");b.className=cls;b.textContent=label;b.addEventListener("click",fn);parent.append(b);return b;}
function modalInfo(title,html){
 $("modalActions").classList.remove("pause-menu-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY";$("modalTitle").textContent=title;
 $("modalContent").innerHTML=html;const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Tillbaka till spelet","primary",()=>{$("modal").hidden=true;});$("modal").hidden=false;
}
// This is a turn-based puzzle; the menu overlay blocks touches while open.
// Local report only: no analytics, disk write or network transfer.
function showPerformanceReport(){
 $("modalActions").classList.remove("pause-menu-actions");
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
// Game Dev / Engine Lab 1.0: all experiments run on disposable rule-engine
// instances, never on the player's live Game, localStorage or save data.
let engineLabRun=null;
function engineLabText(element,value){element.textContent=String(value);}
function openEngineLab(){
 $("modalActions").classList.remove("pause-menu-actions");
 if(engineLabRun){engineLabRun.cancelled=true;engineLabRun=null;}
 const api=window.HarmonyDiagnostics?.create(R);
 $("modalEyebrow").textContent="GAME DEV · ENGINE LAB";
 $("modalTitle").textContent="Harmony Intelligence";
 const content=$("modalContent");content.replaceChildren();
 const hint=document.createElement("p");
 hint.textContent="Jämför Director 4.0 mot tidigare motorer på samma startbräden. Simulerade omgångar påverkar inte stjärnor, poäng eller sparfiler.";
 content.append(hint);
 if(!api){
  const missing=document.createElement("p");missing.textContent="Diagnostikmodulen kunde inte laddas. Öppna sidan på nytt.";
  content.append(missing);
  const actions=$("modalActions");actions.replaceChildren();
  modalButton(actions,"Tillbaka","primary",()=>{$("modal").hidden=true;});$("modal").hidden=false;
  return;
 }
 const controls=document.createElement("div");controls.className="engine-controls";
 const field=(name,node)=>{
  const label=document.createElement("label");label.textContent=name;label.append(node);controls.append(label);
 };
 const levels=document.createElement("select");
 const allOption=document.createElement("option");allOption.value="all";allOption.textContent="Introduktion nivå 1–10";levels.append(allOption);
 R.levels.forEach((cfg,i)=>{const option=document.createElement("option");option.value=String(i);option.textContent=(i+1)+". "+cfg.name;levels.append(option);});
 if(level>=R.levels.length){const option=document.createElement("option");option.value=String(level);option.textContent=(level+1)+". "+R.levelConfig(level).name;levels.append(option);}
 levels.value=game?String(level):"all";field("Nivåer",levels);
 const samples=document.createElement("select");
 for(const n of [2,5,10,25]){const option=document.createElement("option");option.value=String(n);option.textContent=n+" seeds per strategi och nivå";samples.append(option);}
 samples.value="5";field("Testomgångar",samples);
 const seedInput=document.createElement("input");seedInput.type="number";seedInput.min="0";seedInput.max="4294967295";seedInput.step="1";seedInput.value="20261022";field("Grundseed (reproducerbar)",seedInput);
 const engineMode=document.createElement("select");engineMode.id="engineMode";
 for(const [value,label] of [
  ["compare","Jämför Standard + Director 1.0 + 2.0 + 3.0"],
  ["compare31","Jämför Director 3.0 mot Objective 3.1"],
  ["compare311","Jämför Objective 3.1 mot Endgame 3.1.1"],
   ["compare4","Jämför Endgame 3.1.1 mot Director 4.0"],
  ["standard","Endast Standard"],
  ["director","Endast Director 1.0"],
  ["director2","Endast Director 2.0"],
  ["director3","Endast Pacing Director 3.0"],
  ["director31","Endast Objective Awareness 3.1"],
  ["director311","Endast Endgame Objective Awareness 3.1.1"],
   ["director4","Endast Harmony Director 4.0"]
 ]){
  const opt=document.createElement("option");opt.value=value;opt.textContent=label;engineMode.append(opt);
 }
 engineMode.value="compare4";field("Spelmotor",engineMode);
 const scopeNote=document.createElement("p");
 scopeNote.className="engine-lab-note";
 scopeNote.textContent="Director 4.0 är standard från nivå 10. Den förstår Daruma och Sealed Stones, räknar delträffar och föredrar mer användbara påfyllningar vid måltorka. Botarnas tempo är syntetiskt.";

 content.append(controls,scopeNote);
 const status=document.createElement("p");status.className="engine-lab-status";status.setAttribute("role","status");
 status.textContent="Redo att mäta spelmotorn.";content.append(status);
 const output=document.createElement("div");output.className="engine-lab-output";content.append(output);
 const actions=$("modalActions");actions.replaceChildren();
 const runButton=modalButton(actions,"Kör analys","primary",()=>{});
 const cancelButton=modalButton(actions,"Avbryt","secondary",()=>{if(engineLabRun)engineLabRun.cancelled=true;});
 cancelButton.disabled=true;
 const exportButton=modalButton(actions,"Exportera JSON","secondary",()=>{});
 exportButton.disabled=true;
 modalButton(actions,"Tillbaka","secondary",()=>{if(engineLabRun)engineLabRun.cancelled=true;$("modal").hidden=true;});
 let latest=null;
 exportButton.addEventListener("click",()=>{
  if(!latest)return;
  const data=new Blob([JSON.stringify(latest,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(data);
  const a=document.createElement("a");a.href=url;a.download="japanese-harmony-engine-lab-"+latest.options.seed+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 function pct(value){return Math.round(value*100)+" %";}
 function display(result){
  output.replaceChildren();
  const summary=document.createElement("p");
  summary.textContent=result.runs.length+" omgångar · "+
   new Set(result.results.map(r=>r.level)).size+" nivåer · "+
   result.options.modes.map(x=>api.MODE_LABELS[x]).join(" + ")+
   " · version "+result.gameVersion+".";

  output.append(summary);
  const wrap=document.createElement("div");wrap.className="engine-table-scroll";
  const table=document.createElement("table");table.className="engine-table";
  const head=document.createElement("thead"),header=document.createElement("tr");
  for(const label of ["Nivå","Motor","AI","Vinst","Mål","Drag","Val","Kedjor","Echo","Utveckl.","Målfam.","Torka"]){
   const cell=document.createElement("th");cell.textContent=label;header.append(cell);
  }
  head.append(header);table.append(head);
  const body=document.createElement("tbody");
  for(const row of result.results){
   const tr=document.createElement("tr");
   const cols=[String(row.level+1),api.MODE_LABELS[row.mode],api.LABELS[row.strategy],
    pct(row.winRate),pct(row.avgGoalRatio),row.avgMoves.toFixed(1),
    row.avgLegalMoves.toFixed(1),row.avgCascades.toFixed(1),row.avgEchoes.toFixed(1),
    row.avgMeaningful.toFixed(1),row.avgGoalReady.toFixed(1),row.avgGoalDrought.toFixed(1)];
   cols.forEach((v,i)=>{
    const cell=document.createElement("td");cell.textContent=v;
    if(i===3&&row.winRate<.25)cell.className="engine-low";
    tr.append(cell);
   });
   body.append(tr);
  }
  table.append(body);wrap.append(table);output.append(wrap);
  const explain=document.createElement("p");explain.className="engine-lab-note";
  explain.textContent="Val = tillåtna byten. Kedjor = drag med flera fusionsvågor. Echo = aktiverade resonansbelöningar per spel. Utveckl. = möjliga matcher som involverar stadium 3+. Målfam. = möjliga utvecklingsmatcher med den efterfrågade familjen (relevant på t.ex. nivå 6). Torka = drag i följd utan registrerade målpoäng. Startseeds är identiska.";
  if(result.options.modes.length>=2){
   const comparison=document.createElement("div");comparison.className="engine-comparison";
   const title=document.createElement("strong");title.textContent="Direkt jämförelse · målframsteg, vinst och utveckling";
   comparison.append(title);
   const baselineMode=result.options.modes.includes("standard")?"standard":
   result.options.modes.includes("director3")?"director3":result.options.modes.includes("director311")?"director311":"director31";
   for(const classic of result.results.filter(x=>x.mode===baselineMode)){
    for(const mode of result.options.modes.filter(m=>m!==baselineMode)){
    const newer=result.results.find(x=>x.level===classic.level&&x.strategy===classic.strategy&&x.mode===mode);
    if(!newer)continue;
    const line=document.createElement("p");
    line.textContent="Nivå "+(classic.level+1)+" · "+api.LABELS[classic.strategy]+" · "+api.MODE_LABELS[mode]+": "+
     classic.wins+"/"+classic.samples+" → "+newer.wins+"/"+newer.samples+
     " · Måluppfyllelse "+pct(classic.avgGoalRatio)+" → "+pct(newer.avgGoalRatio)+
     " · Utveckl. "+classic.avgMeaningful.toFixed(1)+" → "+newer.avgMeaningful.toFixed(1)+
     " · Möjligheter kring stadium 4 "+classic.avgNearReady.toFixed(1)+" → "+newer.avgNearReady.toFixed(1);
    comparison.append(line);
   }
   }
   output.append(comparison);
  }
  output.append(explain);
 }
 runButton.addEventListener("click",async()=>{
  if(engineLabRun)return;
  const requestedSeed=Number(seedInput.value);
  if(!Number.isInteger(requestedSeed)||requestedSeed<0||requestedSeed>0xffffffff){
   engineLabText(status,"Ange ett heltal mellan 0 och 4294967295.");return;
  }
  const job={cancelled:false};engineLabRun=job;latest=null;
  runButton.disabled=true;cancelButton.disabled=false;exportButton.disabled=true;output.replaceChildren();
  levels.disabled=true;samples.disabled=true;seedInput.disabled=true;engineMode.disabled=true;
  const modes=engineMode.value==="compare"?["standard","director","director2","director3"]:
   engineMode.value==="compare31"?["director3","director31"]:
   engineMode.value==="compare311"?["director31","director311"]:
    engineMode.value==="compare4"?["director311","director4"]:[engineMode.value];
  const opts={levels:levels.value==="all"?Array.from({length:10},(_,i)=>i):[Number(levels.value)],
   trials:Number(samples.value),seed:requestedSeed,strategies:api.STRATEGIES,modes,
   yieldEvery:1,cancel:()=>job.cancelled};
  const total=opts.levels.length*opts.trials*opts.strategies.length*opts.modes.length;
  engineLabText(status,"Analyserar 0 / "+total+" testomgångar …");
  try{
   const result=await api.runAsync(opts,({completed,total})=>{
    if(engineLabRun===job)engineLabText(status,"Analyserar "+completed+" / "+total+" testomgångar …");
   });
   if(engineLabRun!==job)return;
   if(result.cancelled)engineLabText(status,"Avbrutet efter "+result.completed+" testomgångar.");
   else{latest=result;display(result);engineLabText(status,"Analysen klar. Du kan exportera resultatet med seeds och alla omgångar.");exportButton.disabled=false;}
  }catch(error){
   if(engineLabRun===job){engineLabText(status,"Analysen kunde inte slutföras: "+error.message);console.error("Harmony Engine Lab",error);}
  }finally{
   if(engineLabRun===job){
    engineLabRun=null;runButton.disabled=false;cancelButton.disabled=true;
    levels.disabled=false;samples.disabled=false;seedInput.disabled=false;engineMode.disabled=false;
   }
  }
 });
 $("modal").hidden=false;
}
function openGameMenu(){
 if(!game||$("gameView").hidden||busy)return;
 disarmDecisionClock();clearIdleHint();
 $("modalEyebrow").textContent="JAPANESE HARMONY";
 $("modalTitle").textContent="Spelmeny";
 const content=$("modalContent");content.replaceChildren();
 const desc=document.createElement("p");desc.className="pause-summary";
 desc.textContent="Nivå "+(level+1)+" · "+game.familyCount+" familjer · "+game.moves+" drag kvar";
 content.append(desc);
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.add("pause-menu-actions");
 const add=(label,style,group,callback)=>{
  const b=modalButton(actions,label,style,callback);
  b.classList.add("pause-action","pause-"+group);
  return b;
 };
 add("Fortsätt spela","primary","resume",()=>{$("modal").hidden=true;armDecisionClock();});
 if(game.complete)add("Avsluta med resultat","secondary","finish",()=>{if(busy)return;game.finish();showResult();});
 add("Börja om nivån","secondary","restart",()=>{if(!busy)startLevel(level);});
 // Keep these DOM positions intact: the existing game and smoke tests rely
 // on direct button access and keyboard tab order, even with the new layout.
 add("Så spelar du","secondary","help",()=>{$("helpButton").click();});
 add("Inställningar","secondary","settings",()=>{$("settingsButton").click();});
 add("Prestanda","secondary","performance",showPerformanceReport);
 add("Game Dev · Motorlab","secondary","dev",openEngineLab);
 add("Till Goshuincho","secondary","levels",()=>{if(!busy)showLevelSelection();});
 $("modal").hidden=false;
}
function bind(){
 const directorChoice=$("gameDirectorMode");
 const explainDirectorMode=()=>{
  $("directorModeDescription").textContent=save.playMode==="auto"?
   "Automatiskt: Harmony Pacing 3.0 på nivå 1–9, Harmony Director 4.0 från nivå 10. En påbörjad nivå behåller sin motor.":
   save.playMode==="v4"?
   "Director 4.0 analyserar mål, delträffar mot hinder och måltorka utan gratismatchningar.":
   save.playMode==="v311"?
   "Experimentell Endgame 3.1.1 analyserar de sista dimrutorna, utan extra drag.":
   save.playMode==="v31"?
   "Experimentell Director 3.1 analyserar mål, fusionspositioner, Mist och Pulse.":
   save.playMode==="v3"?
   "Director 3.0 följer spelarens rytm och använder rättvisa påfyllningar.":
   save.playMode==="v2"?"Director 2.0 prioriterar utvecklingsmöjligheter i den vanliga objektpåsen.":
   "Originalsystemets slumpmässiga påfyllning.";
 };
 directorChoice.value=save.playMode;
 directorChoice.addEventListener("change",event=>{
  save.playMode=Object.hasOwn(PLAY_MODES,event.target.value)?event.target.value:"auto";
  persist();explainDirectorMode();
 });
 explainDirectorMode();
 $("homeButton").addEventListener("click",()=>{
  if($("gameView").hidden)showGoshuincho();
  else showLevelSelection();
 });
 $("goshuinButton").addEventListener("click",()=>showGoshuincho());
 $("omamoriButton").addEventListener("click",()=>showOmamori());
 $("omikujiButton").addEventListener("click",()=>showOmikuji());
 $("pauseButton").addEventListener("click",openGameMenu);
 $("devButton").addEventListener("click",openEngineLab);
 $("continueButton").addEventListener("click",()=>{const r=save.run&&save.run.data&&save.run.data.moves>0?save.run:null;if(r)startLevel(r.level,true);else startLevel(save.unlocked);});
 $("helpButton").addEventListener("click",()=>modalInfo("Så spelar du",'<p><strong>Matcha:</strong> Byt två grannar och bilda tre eller fler av samma familj. Stadier får blandas. T- och L-former fungerar också.</p><p><strong>Förädla:</strong> När du skapar en match sker fusionen på rutan dit du flyttade föremålet (eller på den andra bytesrutan om matchen bara bildas där). Resultatet blir högsta matchade stadium +1, oavsett var det högre föremålet låg. Automatiska kedjor använder det högsta stadiets ruta. Fyra matchade ger en grannuppgradering; fem eller fler ger två.</p><p><strong>Harmony Resonance:</strong> Föremål i stadium 3–4 får en diskret ljuskoppling till en granne av samma familj. Om du använder båda i en efterföljande fusion skapas Harmony Echo med bonuspoäng (högst en per drag).</p><p><strong>Harmony Pulse:</strong> Vid stadium 5 sprider ett mästerverk sin kraft uppåt, nedåt, höger och vänster. Befintliga föremål uppgraderas; dimma renas även på tomma rutor. Kedjor avslutas innan tomma rutor fylls.</p><p><strong>Masterpiece Collection:</strong> Under spelplanen räknar varje ikon hur många mästerverk du har skapat av sin familj. Varje nytt mästerverk ger en växande bonus; antalet kan öka utan gräns.</p><p><strong>Harmony Mist från nivå 4:</strong> Varje nivå har ett konkret mål. På Harmony Mist-nivåer ska du rena magisk dimma som ligger på vissa rutor. Fusionera så att det uppgraderade föremålet stannar på en dimruta för att rena just den rutan. Harmony Pulse renar även tomma dimrutor i de fyra väderstrecken runt mästerverket. Föremål får fortfarande flyttas från och till dimrutor, men en vanlig matchning över dimman utan fusionens slutruta där rensar inte. Dimman sitter kvar när brickorna faller.</p><p><strong>Daruma, nivå 21–30:</strong> Daruma står stilla och får ett öga när en fusion landar intill eller Harmony Pulse träffar den. Varje Daruma behöver två träffar på olika drag. Kapitlet växlar mellan Daruma-utmaningar och dimma/fusion så att du kan prova olika taktiker.</p><p><strong>Sealed Stones, nivå 31–40:</strong> Varje sten står stilla och har fyra lager. Fusionera intill stenen eller träffa den med Harmony Pulse, högst en skada per sten och drag. Den sista träffen frigör Awakening Pulse till alla åtta grannar, även diagonalt. En sten som står intill en annan kan hjälpa dig skapa en kedja.</p><p><strong>Belöning:</strong> Nystartade nivåer ger minst en stjärna när du klarar målet. Två eller tre stjärnor får du när du når målet med färre drag, och betyget låses direkt. Poäng är ett frivilligt rekord. När målet är klart kan du gå vidare direkt eller fortsätta använda återstående drag för rekordet. Inga Power Moves.</p>'));
 $("settingsButton").addEventListener("click",()=>{
  modalInfo("Inställningar",'<p><label><input type="checkbox" id="settingsSound" '+(save.sound?"checked":"")+'> Ljud</label></p><p><label><input type="checkbox" id="settingsMotion" '+(save.reduceMotion?"checked":"")+'> Minska animationer</label></p>');
  $("settingsSound").addEventListener("change",e=>{save.sound=e.target.checked;window.HarmonyAudio?.setEnabled(save.sound);if(save.sound)window.HarmonyAudio?.unlock();persist();});
  $("settingsMotion").addEventListener("change",e=>{save.reduceMotion=e.target.checked;document.body.classList.toggle("harmony-reduced-motion",!!save.reduceMotion);persist();});
 });
 $("board").addEventListener("pointerdown",e=>{if(!$("gameView").hidden)restartIdleHint();const tile=e.target.closest(".tile");if(tile&&$("modal").hidden)pointer={i:Number(tile.dataset.index),x:e.clientX,y:e.clientY};});
 $("board").addEventListener("pointerup",e=>{
  if(!pointer)return;const start=pointer;pointer=null;
  if(!$("modal").hidden)return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
  suppressClickUntil=performance.now()+450;
  const r=Math.floor(start.i/7),c=start.i%7;
  const destination=Math.abs(dx)>Math.abs(dy)?r*7+c+(dx>0?1:-1):(r+(dy>0?1:-1))*7+c;
  if(!powerSelection&&R.neighbors(start.i).includes(destination)){selected=-1;trySwap(start.i,destination);}
 });
 // A click may open OR close a dialog: the final bubbling phase sees the
 // actual state, so resuming always starts a new 30-second interval.
 document.addEventListener("click",()=>restartIdleHint());
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden){disarmDecisionClock();clearIdleHint();}else{if(game&&!busy&&!$("gameView").hidden&&$("modal").hidden)armDecisionClock();restartIdleHint();}
 });
 window.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!busy&&!$("modal").hidden){
   if(engineLabRun)engineLabRun.cancelled=true;$("modal").hidden=true;
   if(game&&!$("gameView").hidden)armDecisionClock();
  }
  restartIdleHint();
 });
}
// Art Recovery 1.1: never gate the user-approved standalone stage-1 images
// behind either atlas. All loads are checked for true decode, and transient
// network/cache failures retry with a different URL. CSS points to the exact
// successful URL (including cache-buster), not the stale failed request.
const ART_RESOURCES=[
 {file:"harmony-atlas.webp",query:"v=icons-20261022",ready:"has-atlas",css:"--harmony-classic-art"},
 {file:"harmony-new-families.avif",query:"v=5.0",ready:"has-new-atlas",css:"--harmony-new-art"},
 {file:"koi-stage1.avif",query:"v=20261023",ready:"has-koi-stage1",css:"--harmony-koi-stage1-art"},
 {file:"maneki-stage1.avif",query:"v=20261023",ready:"has-maneki-stage1",css:"--harmony-maneki-stage1-art"}
];
const artworkLoaders=[];
function checkAtlas(){
 const root=document.documentElement;
 for(const item of ART_RESOURCES){
  let tries=0,finished=false;
  const load=()=>{
   if(finished)return;
   const src="./assets/"+item.file+"?"+item.query+(tries?"&recovery="+tries:"");
   const img=new Image();
   artworkLoaders.push(img); // hold references during slow mobile downloads
   const recover=()=>{
    if(finished)return;
    if(++tries<=3){
     setTimeout(load,tries===1?650:tries===2?1300:2400);
    }else{
     console.warn("Japanese Harmony artwork unavailable after recovery:",item.file);
    }
   };
   img.onload=()=>{
    if(!img.naturalWidth||!img.naturalHeight){recover();return;}
    finished=true;
    // Resolved URL from Image.src is absolute, so CSS variables work both
    // when declared on <html> and inside /harmony/*.css stylesheets.
    root.style.setProperty(item.css,'url("'+img.src+'")');
    root.classList.add(item.ready);
    if(game&&!$("gameView").hidden)renderBoard(game.board);
   };
   img.onerror=recover;
   img.src=src;
  };
  load();
 }
}
// Returning online also helps recover from images that exhausted their first
// short batch of retries while the player was temporarily disconnected.
window.addEventListener("online",()=>{
 for(const item of ART_RESOURCES){
  if(!document.documentElement.classList.contains(item.ready)){
   const img=new Image();
   img.onload=()=>{
    if(!img.naturalWidth)return;
    document.documentElement.style.setProperty(item.css,'url("'+img.src+'")');
    document.documentElement.classList.add(item.ready);
    if(game&&!$("gameView").hidden)renderBoard(game.board);
   };
   img.src="./assets/"+item.file+"?"+item.query+"&online="+Date.now();
  }
 }
});
window.HarmonyAudio?.setEnabled(save.sound);
menuPage=Math.floor(Math.max(0,save.unlocked)/MENU_PAGE_SIZE);
bind();checkAtlas();initFestivalBackground();renderMenu();
})();