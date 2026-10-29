/* Japanese Harmony · first playable mobile-first application */
(function(){
"use strict";
const R=window.HarmonyRules,G=window.HarmonyGoshuincho,E=window.HarmonyEconomy,F=window.HarmonyFortune,S=window.HarmonySpirits,P=window.HarmonyPowers,C=window.HarmonyCards,O=window.HarmonyOnboarding,Q=window.HarmonyObjectiveFeedback,H=window.HarmonySaveHealth,T=window.HarmonyTutorialHelp,$=id=>document.getElementById(id);
const names={sakura:"Sakura",lantern:"Lantern",koi:"Koi",fan:"Fan",bonsai:"Bonsai",sushi:"Sushi",maneki:"Maneki-neko",origami:"Origami",ryu:"Ryu Dragon"};
const symbols={sakura:"🌸",lantern:"🏮",koi:"🐟",fan:"🪭",bonsai:"🌳",sushi:"🍣",maneki:"🐱",origami:"🕊️",ryu:"🐉"};
const familyRows={sakura:0,lantern:1,koi:2,fan:3,bonsai:4};
const newFamilyRows={sushi:0,maneki:1,origami:2,ryu:3};
const stages=["","Bud / beginning","Growing","Developed","Near masterpiece","Masterpiece"];
const KEY="japanese-harmony-puzzle-v2";
const defaults={unlocked:0,bestStars:{},bestScores:{},bestChain:{},run:null,sound:true,reduceMotion:false,playMode:"auto",fourFamilyScores:{},fourFamilyStars:{},fourFamilyChain:{}};
let save,game=null,level=0,selected=-1,busy=false,timer=0,pointer=null,suppressClickUntil=0;
const MENU_PAGE_SIZE=20;let menuPage=0;const collectionCards=new Map();
let goshuinChapter=0,goshuinPage=0;
let rewardStarsAtLevelStart=0; // transient baseline, never persisted
let powerSelection=null,powerTargets=[],moonOfferShown=false;
const PLAY_MODES={auto:"Automatic · 4.0 from level 10",v4:"Objective & Recovery 4.0",standard:"Standard",v2:"Opportunity 2.0",v3:"Pacing 3.0",v31:"Objective Awareness 3.1",v311:"Endgame Objective Awareness 3.1.1"};
const PACE_PHASE_NAMES={build:"BUILD",flow:"FLOW",relax:"CALM",recovery:"RECOVERY"};
let decisionReadyAt=0;
function armDecisionClock(){decisionReadyAt=performance.now();}
function disarmDecisionClock(){decisionReadyAt=0;}
function updatePaceLabel(){
 const node=$("paceStatus");if(!node||!game)return;
 node.textContent=(game.familyCount===4?"4 FAMILIES · ":"5 FAMILIES · ")+
  (game.directorMode==="v4"?"OBJECTIVE 4.0 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BUILD"):game.directorMode==="v311"?"ENDGAME 3.1.1 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BUILD"):game.directorMode==="v31"?"OBJECTIVE 3.1 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BUILD"):game.directorMode==="v3"?
  "PACING 3.0 · "+(PACE_PHASE_NAMES[game.pacePhase]||"BUILD"):
  game.directorMode==="v2"?"OPPORTUNITY 2.0":"STANDARD");
 node.title=game.directorMode==="v4"?"Director 4.0 evaluates reachable goals, partial hits on Daruma and Sealed Stones, and fair refills.":game.directorMode==="v311"?"Endgame 3.1.1 evaluates the last 1–3 Mist tiles with the same fair refills as 3.1.":
  game.directorMode==="v31"?"Objective Awareness considers goals, fusion placement and Pulse while using fair refills.":
  game.directorMode==="v3"?"3.0 builds on Opportunity 2.0 and selects fair refills.":"Refill mode for this run";
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
const saveBootstrap=H.bootstrap(()=>window.localStorage,KEY,RESET_MARKER,defaults,PLAY_MODES);
save=saveBootstrap.save;
let saveStorageWritable=saveBootstrap.writable;
let saveStorageWarning=saveBootstrap.warning;
let saveStorageWarningShown=false,saveBootComplete=false;
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
if(!save.omamoriCards||save.omamoriCards.version!==C.VERSION){C.initialize(save);persist();}
if(!save.assistedStars||typeof save.assistedStars!=="object")save.assistedStars={};
if(!save.assistedScores||typeof save.assistedScores!=="object")save.assistedScores={};
// Match CSS-only ambient effects to the in-game accessibility preference.
document.body.classList.toggle("harmony-reduced-motion",!!save.reduceMotion);
function notifySaveWarning(){
 if(!saveBootComplete||saveStorageWarningShown||!saveStorageWarning)return;
 saveStorageWarningShown=true;
 toast(saveStorageWarning==="corrupt-save"?
  "Damaged save detected. A backup was kept; a fresh local save was started.":
  "Progress cannot be saved on this device. Check browser storage settings.",7500);
}
function persist(){
 if(!saveStorageWritable)return false;
 if(H.persist(()=>window.localStorage,KEY,save))return true;
 saveStorageWritable=false;
 saveStorageWarning="storage-unavailable";
 notifySaveWarning();
 return false;
}
function prettify(x){return Math.round(x||0).toLocaleString("en-US");}

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

function toast(text,duration=2400){const t=$("toast");t.textContent=text;t.hidden=false;clearTimeout(timer);timer=setTimeout(()=>t.hidden=true,duration);}
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
 if(coins)coins.textContent=prettify(menuWallet.coins)+" coins";
 const charmProgress=$("omamoriProgress");
 if(charmProgress)charmProgress.textContent=C.total(save)+" cards ready · 8 boost types";
 const daily=$("omikujiStatus");
 if(daily)daily.textContent=F.status(save).available?"Free today":"Fortune drawn today";
 const journalButton=$("goshuinButton");
 if(journalButton){
  $("goshuinProgress").textContent=journal.earned+" / "+(journal.visibleChapters*G.CHAPTER_SIZE)+" stamps";
  journalButton.setAttribute("aria-label","Open Goshuincho stamp book, "+journal.earned+" stamps");
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
   cfg.moves+" moves · "+(cfg.goal.type==="mist"?cfg.goal.count+" Mist tiles":
    cfg.goal.type==="masterpiece"?cfg.goal.count+" masterpieces":
    cfg.goal.type==="daruma"?cfg.goal.count+" Daruma":
    cfg.goal.type==="sealedStone"?cfg.goal.count+" Sealed Stones":
    cfg.goal.type==="fusion"?cfg.goal.count+" fusions":
    cfg.goal.type==="stage3"?cfg.goal.count+" upgrades":
    cfg.goal.type==="pulseHits"?cfg.goal.count+" Harmony Pulse hits":
    cfg.goal.type==="fourTurns"?cfg.goal.count+" moves with a four-tile match":
    cfg.goal.type==="four"?cfg.goal.count+" four-tile matches":
    prettify(cfg.goal.count)+" points");
  d.append(title,sub);
  if(allowed&&record>0){
   const best=document.createElement("span");best.className="level-best";
   best.textContent="BEST  "+prettify(record)+" points";
   d.append(best);
  }
  const starsNode=document.createElement("span");starsNode.className="level-stars";
  starsNode.textContent=allowed?(stars?"★".repeat(stars)+"☆".repeat(3-stars):"☆☆☆"):"🔒";
  b.dataset.familyCount=String(R.levelFamilyCount(i));
  b.append(n,d,starsNode);b.addEventListener("click",()=>startLevel(i,false));list.appendChild(b);
 }
 const intro=menuPage===0;
 if($("chapterEyebrow"))$("chapterEyebrow").textContent="YOUR JOURNEY";
 if($("chapterTitle"))$("chapterTitle").textContent="Goshuincho";
 if($("chapterSubtitle"))$("chapterSubtitle").textContent="Collect stamps and discover the next chapter.";
 const stars=Object.entries(save.fourFamilyStars).reduce((n,[i,v])=>
  n+(Number(i)<10?Number(v)||0:0),0)+
  Object.entries(save.bestStars).reduce((n,[i,v])=>
   n+(Number(i)>=10?Number(v)||0:0),0);
 if($("chapterStars"))$("chapterStars").textContent="★ "+stars+" stars";
 const pager=$("levelPager");pager.replaceChildren();
 const prev=document.createElement("button");prev.className="secondary small";prev.textContent="← Previous";prev.disabled=menuPage===0;
 prev.addEventListener("click",()=>{menuPage--;renderMenu();});
 const range=document.createElement("span");range.textContent="Level "+(first+1)+"–"+last;
 const next=document.createElement("button");next.className="secondary small";next.textContent="Next →";
 // Show the next chapter only when the player has progressed to it.
 next.disabled=save.unlocked<last;
 next.addEventListener("click",()=>{menuPage++;renderMenu();});
 pager.append(prev,range,next);
 const canResume=save.run&&save.run.level<=save.unlocked&&save.run.data&&save.run.data.moves>0;
 const playButton=$("continueButton");
 const playLabel=canResume?"Resume level "+(save.run.level+1):"Play level "+(save.unlocked+1);
 playButton.setAttribute("aria-label",playLabel);
 const playText=playButton.querySelector("strong");
 if(playText)playText.textContent=canResume?"CONTINUE":"PLAY";
 else playButton.textContent=playLabel;
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
// Washi Zen UI 1.3: visibly press before switching views (one-shot for double taps).
function activateWashiPlay(button,launch){
 if(!button||button.disabled||button.dataset.launching==="1")return;
 button.dataset.launching="1";
 button.classList.add("is-pressed");
 window.setTimeout(()=>{
  button.classList.remove("is-pressed");
  delete button.dataset.launching;
  launch();
 },185);
}
function goshuinNode(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
}
// Onboarding 2.0: never change the underlying move, objective or reward rules.
function levelPreview(index,resumable=false){
 let cfg=R.levelConfig(index),remaining=null,rewardVersion=3;
 if(resumable&&save.run?.level===index&&save.run.data){
  const restored=new R.Game(index,save.run.data,{fastRestore:true});
  cfg=restored.config;remaining=restored.moves;rewardVersion=restored.rewardVersion;
 }
 return {data:O.preview(index,cfg,rewardVersion===3?R.moveStarTargets:null),remaining,rewardVersion};
}
// Tutorial Help Modal 1.0: reuse the SAME illustrated guide for the first
// encounter and the ? next to GOAL. Only OK acknowledges a new lesson.
function goalLesson(){
 const original=O.lesson(level);
 if(original)return original;
 const key=({mist:"mist",daruma:"daruma",sealedStone:"stone",fourTurns:"four",
  familyFusion:"lantern",familyMasterpiece:"lantern-masterpiece",
  masterpiece:"pulse",pulseHits:"pulse"})[game.config.goal.type];
 return key?Object.values(O.LESSONS).find(item=>item.key===key)||null:null;
}
function showTutorialHelp(lesson,firstTime=false){
 if(!game||busy||$("gameView").hidden)return;
 disarmDecisionClock();clearIdleHint();
 const info=O.preview(level,game.config,R.moveStarTargets);
 const topic=lesson||{key:"match",title:game.goalText(),short:game.config.intro||"Match treasures to complete this goal.",
  detail:game.config.intro||"Match at least three objects in a line."};
 $("modalEyebrow").textContent="LEVEL "+(level+1)+" · HOW TO PLAY";
 $("modalTitle").textContent=topic.title;
 const panel=$("modalContent");panel.replaceChildren();
 panel.append(T.render(topic));
 if(!firstTime){
  const state=goshuinNode("div","jh-tutorial-status");
  state.append(goshuinNode("strong","jh-guide-goal","GOAL · "+info.objective),
   goshuinNode("span","jh-guide-state",Q.detail(game)));
  panel.append(state);
  const more=goshuinNode("details","jh-tutorial-more");
  more.append(goshuinNode("summary","","More about this goal"),
   goshuinNode("p","",topic.detail||info.tip));
  panel.append(more);
 }
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.remove("pause-menu-actions","victory-actions");
 const ok=modalButton(actions,"OK","primary jh-tutorial-ok",()=>{
  if(firstTime){
   if(!save.tutorialHelpSeen||typeof save.tutorialHelpSeen!=="object"||
      Array.isArray(save.tutorialHelpSeen))save.tutorialHelpSeen={};
   save.tutorialHelpSeen[topic.key]=true;
   persist();
  }
  $("modal").hidden=true;armDecisionClock();restartIdleHint();
 });
 $("modal").hidden=false;
 ok.focus({preventScroll:true});
}
function showGoalHelp(){
 if(!game||busy||$("gameView").hidden)return;
 showTutorialHelp(goalLesson(),false);
}
function offerFirstLesson(index){
 const lesson=O.lesson(index);if(!lesson)return;
 if(save.tutorialHelpSeen&&typeof save.tutorialHelpSeen==="object"&&
    !Array.isArray(save.tutorialHelpSeen)&&save.tutorialHelpSeen[lesson.key]===true)return;
 // No timed auto-hide and no premature seen flag. A resumed level still shows
 // an unread guide; pressing OK is the sole persisted acknowledgment.
 showTutorialHelp(lesson,true);
}
function showGoshuincho(chapterIndex=null){
 if(busy||!$("gameView").hidden)return;
 const max=G.summary(save).currentChapter;
 goshuinChapter=Math.min(max,Math.max(0,
  Number.isInteger(chapterIndex)?chapterIndex:Math.floor(save.unlocked/G.CHAPTER_SIZE)));
 goshuinPage=0;
 $("modalActions").classList.remove("pause-menu-actions","victory-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY";
 $("modalTitle").textContent="Goshuincho";
 $("modalActions").replaceChildren();
 $("modal").hidden=false;
 renderGoshuincho();
}
function renderGoshuincho(){
 const area=$("modalContent");area.replaceChildren();
 const summary=G.summary(save);
 goshuinChapter=Math.min(summary.currentChapter,Math.max(0,goshuinChapter));
 const info=G.chapterSnapshot(save,goshuinChapter);
 const album=goshuinNode("section","washi-goshuincho");
 album.setAttribute("aria-label","Goshuincho · chapter "+info.number+" · level "+(info.first+1)+" to "+(info.last+1));
 const head=goshuinNode("header","washi-book-top");
 const close=goshuinNode("button","washi-book-close","✕");
 close.type="button";close.setAttribute("aria-label","Close level book");
 close.addEventListener("click",()=>{$("modal").hidden=true;$("goshuinButton")?.focus();});
 const heading=goshuinNode("div","washi-book-heading");
 heading.append(goshuinNode("small","washi-book-eyebrow","第"+G.japaneseNumeral(info.number)+"章"),
  goshuinNode("h2","",info.title),
  goshuinNode("span","washi-book-subtitle",info.subtitle),
  goshuinNode("span","washi-book-flourish","── ✿ ──"));
 const progress=goshuinNode("span","washi-book-progress",info.earned+" / 10");
 progress.setAttribute("aria-label",info.earned+" of 10 level stamps");
 head.append(heading,progress,close);album.append(head);
 const nav=goshuinNode("nav","washi-book-nav");
 nav.setAttribute("aria-label","Switch chapters");
 const prev=goshuinNode("button","washi-nav washi-prev","");prev.type="button";
 prev.disabled=goshuinChapter===0;prev.setAttribute("aria-label","Previous chapter");
 prev.addEventListener("click",()=>{if(goshuinChapter>0){goshuinChapter--;renderGoshuincho();}});
 const count=goshuinNode("span","washi-chapter-count",
  "LEVEL "+(info.first+1)+"–"+(info.last+1));
 const next=goshuinNode("button","washi-nav washi-next","");next.type="button";
 next.disabled=goshuinChapter>=summary.currentChapter;next.setAttribute("aria-label","Next chapter");
 next.addEventListener("click",()=>{if(goshuinChapter<summary.currentChapter){goshuinChapter++;renderGoshuincho();}});
 nav.append(prev,count,next);album.append(nav);
 const grid=goshuinNode("div","washi-level-grid");
 grid.setAttribute("aria-label","Ten level tiles in chapter "+info.number);
 const detail=goshuinNode("section","washi-level-detail");
 detail.setAttribute("aria-live","polite");
 const select=(stamp,tile)=>{
  for(const b of grid.children){
   b.classList.toggle("is-selected",b===tile);
   b.setAttribute("aria-pressed",b===tile?"true":"false");
  }
  const preview=levelPreview(stamp.level,stamp.resumable),info=preview.data;
  detail.replaceChildren();
  const copy=goshuinNode("div","washi-detail-copy");
  // Four concise lines. Full guidance belongs to the in-level GOAL help,
  // not in this narrow painted card.
  copy.append(goshuinNode("span","washi-detail-numeral","LEVEL "+stamp.number+" · "+G.japaneseNumeral(stamp.number)),
   goshuinNode("strong","washi-detail-name",info.name),
   goshuinNode("span","washi-detail-objective","GOAL · "+info.objective),
   goshuinNode("span","washi-detail-budget",preview.remaining!==null?
    preview.remaining+" MOVES LEFT":info.moves+" MOVES"+(info.threeStars!==null?" · ★★★ ≤"+info.threeStars:"")));
  const play=goshuinNode("button","washi-detail-play",stamp.resumable?"CONTINUE":"PLAY");
  play.type="button";play.disabled=!stamp.playable;
  play.setAttribute("aria-label",stamp.playable?"Play level "+stamp.number+", "+info.name:"Level "+stamp.number+" is locked");
  play.addEventListener("click",()=>activateWashiPlay(play,()=>{
   const latest=G.levelStatus(save,stamp.level);
   if(latest.playable)startLevel(stamp.level,latest.resumable);
  }));
  detail.append(copy,play);
 };
 for(const stamp of info.stamps){
  const cfg=R.levelConfig(stamp.level);
  const tile=goshuinNode("button","washi-level-tile"+
    (stamp.locked?" is-locked":"")+(stamp.earned?" is-earned":"")+
    (stamp.isCurrent?" is-current":""));
  tile.type="button";tile.dataset.level=String(stamp.number);
  tile.setAttribute("aria-pressed","false");
  tile.setAttribute("aria-label","Level "+stamp.number+", "+cfg.name+
    (stamp.locked?", locked":", "+stamp.stars+" of 3 stars"));
  if(stamp.isCurrent)tile.setAttribute("aria-current","step");
  const numeralText=G.japaneseNumeral(stamp.number);
  const numeral=goshuinNode("span","washi-tile-jp"+(numeralText.length>=4?" is-long-jp":numeralText.length>=3?" is-medium-jp":""),numeralText);
  numeral.lang="ja";
  const label=goshuinNode("strong","washi-tile-label","Level "+stamp.number);
  const grade=goshuinNode("span","washi-tile-seal");
  grade.setAttribute("aria-hidden","true");
  if(stamp.earned){
   const seal=goshuinNode("span","washi-stamp-art grade-"+stamp.stars);
   seal.append(goshuinNode("span","goshuin-slot-fallback","★".repeat(stamp.stars)));
   goshuinArtwork(seal,"grades",stamp.stars);
   grade.append(seal);
  }else{
   grade.append(goshuinNode("span","washi-empty-seal","✿"));
  }
  tile.append(label,numeral,grade);
  tile.addEventListener("click",()=>select(stamp,tile));
  grid.append(tile);
 }
 album.append(grid,detail);
 const recommended=info.stamps.find(s=>s.resumable)||info.stamps.find(s=>s.isCurrent)||
  info.stamps.find(s=>s.earned)||info.stamps[0];
 const recommendedButton=Array.from(grid.children).find(b=>Number(b.dataset.level)===recommended.number);
 if(recommendedButton)select(recommended,recommendedButton);
 area.append(album);
}

// Omikuji Fortune 1.0 — one free draw per local day, never interrupts combat.
// No streaks, paid retries, negative prizes or changes to the matching rules.
function showOmikuji(){
 if(busy||!$("gameView").hidden)return;
 const info=F.status(save),todayDraw=info.last?.date===info.date?info.last:null;
 $("modalActions").classList.remove("pause-menu-actions","victory-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY · A LITTLE SURPRISE";
 $("modalTitle").textContent="Omikuji Fortune";
 const content=$("modalContent");content.replaceChildren();
 const wrapper=goshuinNode("section","omikuji-fortune");
 wrapper.append(goshuinNode("p","omikuji-intro",
  "Draw a fortune inspired by Japanese omikuji. Receive a small coin gift and an uplifting message. One free fortune each day, with no login streak."));
 const paper=goshuinNode("div","omikuji-paper"+(todayDraw?" is-revealed":" is-folded"));
 if(todayDraw){
  paper.dataset.fortune=todayDraw.id;
  paper.append(goshuinNode("span","omikuji-paper-top","本日の運勢 · TODAY'S FORTUNE"),
   goshuinNode("span","omikuji-paper-kanji",todayDraw.fortune.kanji),
   goshuinNode("strong","omikuji-paper-name",todayDraw.fortune.label),
   goshuinNode("span","omikuji-paper-description",todayDraw.fortune.text));
 }else{
  paper.append(goshuinNode("span","omikuji-paper-top","OMIKUJI · FORTUNE"),
   goshuinNode("span","omikuji-paper-symbol","✿"),
   goshuinNode("span","omikuji-paper-fold","Your fortune awaits"));
 }
 wrapper.append(paper);
 const results=goshuinNode("div","omikuji-result");
 if(todayDraw){
  results.append(goshuinNode("strong","omikuji-earned",
   "✧ +"+prettify(todayDraw.coins)+" Harmony Coins"),
   goshuinNode("span","omikuji-result-note",
    "Your reward has already been added to your Omamori wallet."));
 }else{
  results.append(goshuinNode("span","omikuji-result-note",
   info.available?"Today's draw is free. Your result is saved in this browser.":
   "You've already drawn a fortune today. Another is available tomorrow."));
 }
 wrapper.append(results);
 if(info.count>0){
  wrapper.append(goshuinNode("p","omikuji-total",
   "Fortunes drawn: "+prettify(info.count)+" · No daily streak required."));
 }
 const actions=$("modalActions");actions.replaceChildren();
 if(info.available){
  const drawButton=modalButton(actions,"Draw today's fortune","primary omikuji-draw",()=>{
   const result=F.draw(save,new Date());
   if(!result.ok){showOmikuji();return;}
   persist();renderMenu();showOmikuji();
  });
  drawButton.setAttribute("aria-label","Draw a free Omikuji fortune today");
 }
 modalButton(actions,"Close fortune","secondary omikuji-close",()=>{
  $("modal").hidden=true;$("omikujiButton").focus();
 });
 content.append(wrapper);$("modal").hidden=false;
}

// Omamori 6.0 · one unobtrusive drawer button below the 7×7 board.
// No passive effects, equipment, mastery, or buttons for individual cards.
function updateSpiritBadge(){
 const badge=$("spiritBadge");if(badge)badge.hidden=true;
}
function omamoriPowerEffect(id){
 return P.POWERS[id]?.description||"One-use Omamori boost.";
}
const moonIds=["tsuki","moonGrace"];
const normalOmamori=id=>!moonIds.includes(id);
const normalUses=()=>Math.min(2,game?.blessingUses||0);
function renderPowerBar(){
 const bar=$("omamoriPowerBar");if(!bar)return;
 bar.replaceChildren();bar.hidden=false;
 const button=goshuinNode("button","omamori-open","✿  OMAMORI · お守り");
 button.type="button";button.disabled=!!powerSelection;
 button.setAttribute("aria-label","Open your Omamori boosts. "+C.total(save)+" cards owned, "+normalUses()+" of 2 regular boosts used.");
 button.addEventListener("click",showPowerPicker);
 const count=goshuinNode("span","omamori-remaining",C.total(save)+" cards  ·  "+normalUses()+"/2 used");
 bar.append(button,count);
 if(powerSelection){
  const cancel=goshuinNode("button","omamori-power-cancel","Cancel");
  cancel.addEventListener("click",()=>{powerSelection=null;powerTargets=[];selected=-1;renderPowerBar();});
  bar.append(cancel);
  count.textContent="Select target · "+P.POWERS[powerSelection].name;
 }
 if(game?.koiRerollAt>=0){
  const reroll=goshuinNode("button","omamori-reroll-button","≋ Again");
  reroll.addEventListener("click",showKoiReroll);bar.append(reroll);
 }
}
function showPowerPicker(){
 if(!game||busy||game.failed||game.complete||!$("modal").hidden||powerSelection)return;
 disarmDecisionClock();clearIdleHint();
 $("modalEyebrow").textContent="OMAMORI · お守り";
 $("modalTitle").textContent="Choose a boost";
 const panel=$("modalContent");panel.replaceChildren();
 const wrap=goshuinNode("section","omamori-picker");
 wrap.append(goshuinNode("p","omamori-picker-intro",
  "Use up to two board boosts per level. Moon cards appear automatically when you run out of moves."));
 wrap.append(goshuinNode("strong","omamori-picker-uses",normalUses()+" / 2 boosts used"));
 const grid=goshuinNode("div","omamori-picker-grid");
 const options=E.CATALOG.filter(item=>C.has(save,item.id)&&normalOmamori(item.id));
 for(const item of options){
  const button=goshuinNode("button","omamori-picker-item","");
  button.type="button";button.dataset.power=item.id;
  button.disabled=normalUses()>=2;
  button.append(goshuinNode("span","omamori-picker-symbol",item.symbol),
   goshuinNode("strong","",item.name),
   goshuinNode("span","omamori-picker-count","×"+C.count(save,item.id)),
   goshuinNode("small","",omamoriPowerEffect(item.id)));
  button.addEventListener("click",()=>{
   if(normalUses()>=2)return;
   powerSelection=item.id;powerTargets=[];selected=-1;
   $("modal").hidden=true;renderPowerBar();armDecisionClock();restartIdleHint();
   toast("Choose "+(item.id==="grandBloom"||item.id==="twinSealbreaker"?"two different tiles":"a tile")+
    " for "+item.name+". You can cancel without spending a card.",4300);
  });grid.append(button);
 }
 if(!options.length)wrap.append(goshuinNode("p","omamori-picker-empty",
  "No board boosts owned. You can buy cards from Omamori Shop on the home screen."));
 if(options.length)wrap.append(grid);
 panel.append(wrap);
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.remove("victory-actions","pause-menu-actions");
 modalButton(actions,"Back to game","primary",()=>{
  $("modal").hidden=true;armDecisionClock();restartIdleHint();
 });
 $("modal").hidden=false;
}
function commitActivePower(id,at){
 if(!game||!C.has(save,id)||normalOmamori(id)&&normalUses()>=2)return false;
 const result=P.apply(game,id,at);
 if(!result.ok){toast("This card cannot be used here. Choose another tile.");return false;}
 const spent=C.consume(save,id);
 if(!spent.ok)throw Error("Card inventory changed before confirmation");
 powerSelection=null;powerTargets=[];selected=-1;
 // Preserve the revived run even if the old state was already marked failed.
 persist();$("modal").hidden=true;renderPowerBar();renderMenu();
 if(moonIds.includes(id)){
  saveRun();renderBoard(game.board);renderHUD();armDecisionClock();restartIdleHint();
  toast("☾ "+P.POWERS[id].name+" · +"+game.moves+" moves!");
 }else void playEvents(result.events);
 return true;
}
function confirmPowerTarget(at){
 const id=powerSelection;
 if(!C.has(save,id)){powerSelection=null;powerTargets=[];renderPowerBar();return;}
 const count=(id==="grandBloom"||id==="twinSealbreaker")?2:1;
 const blocker=id==="sealbreaker"||id==="twinSealbreaker";
 const piece=game.board[at];
 if(id==="sakura"||id==="grandBloom"){
  if(!piece||piece.stage>=5||["daruma","sealedStone"].includes(piece.family)){
   toast("Choose a normal treasure at stage 1–4.");return;
  }
 }else if(blocker){
  if(!((game.config.goal.type==="mist"&&game.mist[at])||
    (piece?.family==="daruma"&&game.daruma[at])||
    (piece?.family==="sealedStone"&&game.sealed[at]))){
   toast("Choose a Mist tile, Daruma or Sealed Stone.");return;
  }
 }
 if(powerTargets.includes(at)){toast("Choose another tile.");return;}
 powerTargets.push(at);
 if(powerTargets.length<count){
  toast("Choose one more different tile.",1900);return;
 }
 clearIdleHint();disarmDecisionClock();
 $("modalEyebrow").textContent="OMAMORI · ONE-USE CARD";
 $("modalTitle").textContent=P.POWERS[id].name;
 const panel=$("modalContent");panel.replaceChildren();
 panel.append(goshuinNode("p","omamori-power-confirm",omamoriPowerEffect(id)+
  " One card will be consumed. Cancel to keep it."));
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.remove("victory-actions","pause-menu-actions");
 const targets=count===2?powerTargets.slice():powerTargets[0];
 modalButton(actions,"Use card · 1 copy","primary",()=>{
  if(!commitActivePower(id,targets)){powerSelection=null;powerTargets=[];$("modal").hidden=true;renderPowerBar();restartIdleHint();}
 });
 modalButton(actions,"Cancel","secondary",()=>{
  powerSelection=null;powerTargets=[];$("modal").hidden=true;renderPowerBar();armDecisionClock();restartIdleHint();
 });
 $("modal").hidden=false;
}
function showKoiReroll(){
 if(!game||!Number.isInteger(game.koiRerollAt)||game.koiRerollAt<0||game.complete)return;
 $("modalEyebrow").textContent="PATH OF THE KOI · TIER III";
 $("modalTitle").textContent="Keep or shuffle again?";
 $("modalContent").textContent="Keep the new 3×3 arrangement or shuffle the same area once more for free.";
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.remove("victory-actions","pause-menu-actions");
 modalButton(actions,"〰 Shuffle again","primary",()=>{
  const again=P.reroll(game);
  if(!again.ok){toast("No alternative valid shuffle was found.");return;}
  $("modal").hidden=true;saveRun();renderPowerBar();
  void playEvents(again.events);
 });
 modalButton(actions,"Keep","secondary",()=>{
  game.koiRerollAt=-1;saveRun();$("modal").hidden=true;renderPowerBar();armDecisionClock();restartIdleHint();
 });
 $("modal").hidden=false;
}
function confirmMoonRescue(){
 if(!game?.failed)return;
 const available=moonIds.filter(id=>C.has(save,id));
 if(!available.length){showResult();return;}
 disarmDecisionClock();clearIdleHint();
 $("modalEyebrow").textContent="OMAMORI · LAST CHANCE";
 $("modalTitle").textContent="Out of moves!";
 const panel=$("modalContent");panel.replaceChildren();
 panel.append(goshuinNode("p","omamori-moon-intro",
  "Continue this level? Choose a Moon card. Only the card you use will be consumed."));
 const choices=goshuinNode("div","omamori-picker-grid omamori-moon-choices");
 for(const id of available){
  const item=E.CATALOG.find(x=>x.id===id);
  const choice=goshuinNode("button","omamori-picker-item","");
  choice.type="button";choice.dataset.power=id;
  choice.append(goshuinNode("span","omamori-picker-symbol",item.symbol),
   goshuinNode("strong","",item.name),
   goshuinNode("span","omamori-picker-count","×"+C.count(save,id)),
   goshuinNode("small","",id==="moonGrace"?"+5 moves":"+3 moves"));
  choice.addEventListener("click",()=>commitActivePower(id,-1));choices.append(choice);
 }
 panel.append(choices);
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.remove("victory-actions","pause-menu-actions");
 modalButton(actions,"No thanks · End level","secondary",showResult);
 $("modal").hidden=false;
}
// Harmony Economy & Omamori 1.0 — the collection stays outside the 7x7 board.
function showOmamori(tab="shop"){
 if(busy||!$("gameView").hidden)return;
 const account=E.snapshot(save);
 $("modalActions").classList.remove("pause-menu-actions","victory-actions");
 $("modalEyebrow").textContent="JAPANESE HARMONY · YOUR CARDS";
 $("modalTitle").textContent="Omamori";
 const panel=$("modalContent");panel.replaceChildren();
 const wrapper=goshuinNode("section","omamori-shop");
 const wallet=goshuinNode("div","omamori-wallet");
 wallet.append(goshuinNode("span","omamori-wallet-icon","✧"));
 const walletCopy=goshuinNode("div","omamori-wallet-copy");
 walletCopy.append(goshuinNode("span","","YOUR BALANCE"),
  goshuinNode("strong","",prettify(account.coins)+" Harmony Coins"));
 const count=E.CATALOG.filter(item=>C.has(save,item.id)).length;
 wallet.append(walletCopy,goshuinNode("span","omamori-owned-count",count+" / "+E.CATALOG.length+" Omamori"));
 wrapper.append(wallet);
 const shelf=goshuinNode("div","omamori-shelf");shelf.setAttribute("role","group");
 shelf.setAttribute("aria-label","Omamori: "+count+" owned power cards and keepsakes");
 for(const item of E.CATALOG){
  const owned=C.has(save,item.id),equipped=owned&&account.equipped===item.id;
  const slot=goshuinNode("span","omamori-shelf-slot"+(owned?" is-owned":"")+(equipped?" is-equipped":""),owned?item.symbol:"◇");
  slot.setAttribute("role","img");slot.setAttribute("aria-label",item.name+": "+(equipped?"equipped":owned?"in your deck":"not owned"));
  slot.title=item.name+(owned?" · tier "+C.status(save,item.id).tier:" · buy a new card");
  shelf.append(slot);
 }
 wrapper.append(shelf);
 const nextCharm=E.CATALOG.find(item=>!C.has(save,item.id));
 wrapper.append(goshuinNode("p","omamori-next-charm",nextCharm?
  "Next card: "+nextCharm.name+" · "+(account.coins>=nextCharm.price?
   "enough coins available":prettify(nextCharm.price-account.coins)+" coins needed"):
  "✦ You own every type of card"));
 wrapper.append(goshuinNode("p","omamori-explanation",
  "POWER CARDS · Sakura, Koi and Moon are playable boosts. Use them from the game board even without equipping; use consumes the whole card, even after a loss. Buy a replacement at Tier I. KEEPSAKES · Mist, Daruma and Lantern are permanent collectibles with decorative effects, not board powers. Equip one Omamori to earn its tier missions across different levels. Assisted wins unlock levels but do not earn regular stars, coins or records. Harmony Coins only; no real-money purchases."));
 const tabs=goshuinNode("div","omamori-tabs");
 for(const [id,label] of [["shop","Shop"],["collection","My Cards"]]){
  const button=goshuinNode("button","omamori-tab"+(tab===id?" is-active":""),label);
  button.type="button";button.setAttribute("aria-pressed",String(tab===id));
  button.addEventListener("click",()=>showOmamori(id));tabs.append(button);
 }
 wrapper.append(tabs);
 const list=goshuinNode("div","omamori-catalog");
 const shown=E.CATALOG.filter(item=>tab!=="collection"||C.has(save,item.id)).sort((a,b)=>Number(b.kind==="power")-Number(a.kind==="power"));
 if(!shown.length)list.append(goshuinNode("p","omamori-empty","Your Omamori collection is empty. Visit the shop for a power card or keepsake."));
 let lastKind="";
 for(const item of shown){
  if(item.kind!==lastKind){
   lastKind=item.kind;
   list.append(goshuinNode("h3","omamori-group-heading",item.kind==="power"?"POWER CARDS · CONSUMABLE":"KEEPSAKES · PERMANENT"));
  }
  const status=C.status(save,item.id),owned=status.owned,equipped=owned&&account.equipped===item.id;
  const card=goshuinNode("article","omamori-card"+(owned?" is-owned":"")+(equipped?" is-equipped":""));
  card.dataset.omamoriId=item.id;card.dataset.bondTier=String(status.tier);card.dataset.kind=item.kind;
  const charm=goshuinNode("div","omamori-charm omamori-"+item.theme);
  charm.setAttribute("aria-hidden","true");
  charm.append(goshuinNode("span","omamori-knot","⌁"),goshuinNode("span","omamori-charm-glyph",item.symbol));
  const copy=goshuinNode("div","omamori-card-copy");
  copy.append(goshuinNode("strong","",item.name),goshuinNode("small","",item.subtitle),
   goshuinNode("span","omamori-card-tag",(item.kind==="power"?"Power card · ":"Permanent keepsake · ")+
    (owned?(equipped?"equipped · ":"")+"Tier "+status.tier+"/3":prettify(item.price)+" Coins")));
  if(status.active)copy.append(goshuinNode("span","omamori-power-shop",
   "✦ "+P.POWERS[item.id].name+" · "+omamoriPowerEffect(item.id,owned?status.tier:1)));
  else copy.append(goshuinNode("span","omamori-keepsake-note",
   "✿ Permanent · equip for decorative effects and missions · no board power"));
  const action=goshuinNode("button","omamori-action","");
  action.type="button";
  if(equipped)action.textContent="Unequip";
  else if(owned)action.textContent="Equip";
  else if(account.coins<item.price){action.textContent="Need "+prettify(item.price-account.coins)+" coins";action.disabled=true;}
  else action.textContent=(item.kind==="power"?"Buy card · ":"Collect · ")+prettify(item.price)+" coins";
  action.addEventListener("click",()=>{
   if(owned){
    if(C.equip(save,equipped?null:item.id).ok){persist();renderMenu();showOmamori(tab);showOmamoriNotice(equipped?"unequip":"equip",item);}
   }else{
    if(C.buy(save,item.id).ok){persist();renderMenu();showOmamori(tab);showOmamoriNotice("purchase",item);}
   }
  });
  card.classList.add("has-bond");
  const detail=goshuinNode("div","omamori-bond-detail");
  detail.append(goshuinNode("strong","omamori-bond-title",
   "✦ "+(owned?"Tier "+status.tier+"/3":item.kind==="power"?"New power card · Tier I":"Permanent keepsake · Tier I")),
   goshuinNode("span","omamori-bond-mission","Mission: "+status.mission));
  const progress=goshuinNode("div","omamori-bond-track");
  progress.setAttribute("role","progressbar");progress.setAttribute("aria-label",item.name+" card progress");
  progress.setAttribute("aria-valuemin","0");progress.setAttribute("aria-valuemax","6");
  progress.setAttribute("aria-valuenow",String(status.count));
  const bar=goshuinNode("span","omamori-bond-fill");bar.style.width=Math.min(100,Math.round(status.count/6*100))+"%";
  progress.append(bar);detail.append(progress);
  detail.append(goshuinNode("small","omamori-bond-next",!owned?
   (item.kind==="power"?"Buy at Tier I; use now or develop through missions":"Collect once; keep forever and improve its appearance"):
   status.tier===3?(item.kind==="power"?"Tier III · maximum power":"Tier III · permanent collection complete"):
   status.count+"/"+status.next+" different level missions to Tier "+(status.tier+1)));
  card.append(charm,copy,action,detail);list.append(card);
 }
 wrapper.append(list);
 if(account.equipped&&C.has(save,account.equipped)){
  const worn=E.CATALOG.find(item=>item.id===account.equipped);
  wrapper.append(goshuinNode("p","omamori-equipped",
   "✦ Equipped: "+worn.name+" · Tier "+C.status(save,worn.id).tier+
    (worn.kind==="power"?". Equip for missions; you can use the power without equipping. Use consumes the card. A replacement starts at Tier I.":". Permanent keepsake · decorative only, never consumed.")));
 }
 panel.append(wrapper);
 const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Close shop","primary omamori-close",()=>{
  $("modal").hidden=true;$("omamoriButton").focus();
 });$("modal").hidden=false;
}
function showOmamoriNotice(action,item){
 const shop=$("modalContent").querySelector(".omamori-shop");
 if(!shop)return;
 const note=goshuinNode("div","omamori-reward-notice"+(action==="purchase"?" is-new":""));
 note.setAttribute("role","status");
 note.append(
  goshuinNode("span","omamori-reward-emblem",action==="purchase"?"✦":"✧"),
  goshuinNode("strong","",action==="purchase"?(item.kind==="power"?"New power card · Tier I":"Permanent keepsake collected"):
   action==="equip"?"Equipped for tier missions":"Omamori unequipped"),
  goshuinNode("small","",item.name+(action==="purchase"?(item.kind==="power"?" · consumed on activation":" · yours to keep"):""))
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
  cell.setAttribute("aria-label",names[family]+" masterpieces 0");
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
  card.setAttribute("aria-label",names[family]+": "+count+" masterpieces during the level");
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
function saveRun(){if(game&&game.moves>0&&!game.failed){save.run={level,data:{...game.save(),assisted:!!game.assisted,blessingUses:game.blessingUses||0,koiRerollAt:game.koiRerollAt??-1,koiRerolls:game.koiRerolls||0,replayCoinClaimed:!!game.replayCoinClaimed},backgroundId:currentBackground};persist();}}
function startLevel(i,resume=false){
 if(busy)return;
 powerSelection=null;
 disarmDecisionClock();clearIdleHint();cachedIdleHint=null;
 resetResonanceVisuals();clearPraise();
 level=i;powerSelection=null;powerTargets=[];moonOfferShown=false;rewardStarsAtLevelStart=G.archivedStars(save,i);
 const data=resume&&save.run&&save.run.level===i?save.run.data:null;
 activeSealedFrame=null;activeDarumaFrame=null;activeMistFrame=null;
 game=new R.Game(i,data,data?null:{directorMode:save.playMode==="auto"?(i>=9?"v4":"v3"):save.playMode});chooseFestivalBackground(resume&&save.run&&save.run.level===i?save.run.backgroundId:null);scoreShown=game.score;clearScoreFx();lastGoalProgress=game.progress();selected=-1;$("menuView").hidden=true;$("gameView").hidden=false;document.body.classList.add("harmony-playing");$("modal").hidden=true;
 $("levelTitle").textContent=game.config.name;$("levelNumber").textContent="LEVEL "+(i+1);
 $("goalLabel").textContent=game.goalText();
 $("goalLabel").title=game.config.intro||"";
 document.querySelector(".goal-glyph").textContent=game.config.goal.type==="mist"?"☁":
  game.config.goal.type==="daruma"?"◉":
  game.config.goal.type==="sealedStone"?"✦":
  ["familyFusion","familyMasterpiece"].includes(game.config.goal.type)?"灯":"✿";
 const milestones=$("starTargets");
 milestones.hidden=game.rewardVersion>=2||game.config.goal.type!=="score";
 if(!milestones.hidden){
  [...milestones.children].forEach((node,j)=>{
   node.textContent="★".repeat(j+1)+" "+prettify(game.config.stars[j]);
  });
 }
 prepareCollection();renderBoard(game.board);renderHUD();updatePaceLabel();updateSpiritBadge();renderPowerBar();saveRun();armDecisionClock();restartIdleHint();
 // One-time, player-acknowledged illustrated lesson, including resumed unread runs.
 offerFirstLesson(i);
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
   btn.setAttribute("aria-label",stone?"Sealed Stone, "+stoneLeft+" hits left":
    doll?"Daruma, "+(dState===0?"two eyes left":dState===1?"one eye left":"completed"):
    piece?names[piece.family]+", tier "+piece.stage+", tile "+(Math.floor(i/7)+1)+"-"+(i%7+1):"Tom ruta");
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
  const label=stone?"Sealed Stone, "+stoneLeft+" hits left, tile "+
   (Math.floor(i/7)+1)+"-"+(i%7+1):
   doll?"Daruma, "+(dState===0?"two eyes left":dState===1?"one eye left":"completed")+", tile "+
   (Math.floor(i/7)+1)+"-"+(i%7+1):
   piece?names[piece.family]+", tier "+piece.stage+", tile "+
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
 // The existing compact panel remains unchanged; extra information is in
 // accessibility text and the question-mark help view.
 const progressHint=Q.detail(game);
 $("goalProgress").setAttribute("aria-label",progressHint);
 $("goalProgress").title=progressHint;
 $("goalHelpButton").setAttribute("aria-label","Goal details: "+progressHint);
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
   earnedStars+" of 3 stars. Objective completed in "+game.goalMove+" moves.":
   "Complete the goal for one star; use at most "+thresholds.two+" moves for two stars, or "+thresholds.three+" for three.");
 }else if(game.rewardVersion===2){
  $("statusStars").setAttribute("aria-label",earnedStars?"Level complete · 1 star":"Complete the goal to earn 1 star");
 }else if(game.config.goal.type==="score"){
  const milestones=$("starTargets");
  [...milestones.children].forEach((node,j)=>{
   node.classList.toggle("reached",current.score>=game.config.stars[j]);
  });
  $("statusStars").setAttribute("aria-label",
   earnedStars+" of 3 stars. Targets: "+game.config.stars.map(prettify).join(", "));
 }else{
  $("statusStars").setAttribute("aria-label",
   earnedStars+" of 3 stars. Complete the goal in at most "+
   game.config.par+" moves for 3 stars, or "+(game.config.par+4)+" for 2.");
 }
 document.querySelector(".goal").classList.toggle("goal-complete",game.complete);
 $("statusStars").classList.toggle("jh-practice-stars",!!game.assisted);
 if(game.assisted)$("statusStars").setAttribute("aria-label",
  "Practice rating only: "+earnedStars+" of 3 stars. Omamori-assisted wins do not award Goshuincho stamps.");
}
function renderScoreOnly(){
 $("scoreCount").textContent=prettify(scoreDisplayed);
 $("scoreBest").textContent=prettify(game?.assisted?(activeRecords()[level]||0):Math.max(scoreShown,activeRecords()[level]||0));
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
  selected=-1;toast("Daruma cannot move. Match beside it to fill its eyes.");return;
 }
 if(game.board[i]?.family==="sealedStone"){
  selected=-1;toast("Sealed Stone cannot move. Match beside it or hit it with Harmony Pulse (once per move).");return;
 }
 restartIdleHint();
 if(selected>=0&&selected!==i&&R.neighbors(selected).includes(i)){const a=selected;selected=-1;trySwap(a,i);return;}
 selected=selected===i?-1:i;
 if(selected===i)sound("tap");
 $("selectedInfo").textContent=selected<0?"Swap two adjacent tiles or swipe.":names[game.board[i].family]+" · stage "+game.board[i].stage+" of 5 · choose a neighbor";
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
 selected=-1;$("selectedInfo").textContent="Swap two adjacent tiles or swipe.";
 sound("swap");
 const bondGain=C.observe(save,level,result.events);
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
  const node=fxAt("evolution-stage-label",x,y,"✦ STAGE "+g.to);
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
   renderBoard(evt.board,evt.power==="koi"&&Number.isInteger(evt.at)?[evt.at,...R.neighbors8(evt.at)]:Array.from({length:49},(_,i)=>i),"shuffling");
   await flipMove(previous,evt.board,"shuffle");
   break;
  default:
   renderBoard(evt.board);
 }
}
// Objective feedback 2.0: tiny labels at the actual blocker, never a new HUD row.
function objectiveHitCue(evt){
 if(FAST()||document.hidden||!Element.prototype.animate)return;
 for(const hit of Q.eventLabels(evt).slice(0,MOBILE_LITE?2:4)){
  const rect=indexRect(hit.at);
  if(!rect?.width)continue;
  const cue=fxAt("jh-objective-hit jh-hit-"+hit.kind,
   rect.left+rect.width/2,rect.top+rect.height*.42,hit.label);
  cue.setAttribute("aria-hidden","true");
  void animateNode(cue,[
   {opacity:0,transform:"translate(-50%,0) scale(.84)",offset:0},
   {opacity:1,transform:"translate(-50%,-6px) scale(1)",offset:.3},
   {opacity:0,transform:"translate(-50%,-22px) scale(1.03)",offset:1}
  ],680).finally(()=>cue.remove());
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
   if(evt.type==="daruma"||evt.type==="sealed-hit")objectiveHitCue(evt);
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
   if(evt.type==="echo")praise("echo");
   else if(evt.type==="hero")praise("masterpiece");
   else if(evt.type==="pulse"&&((evt.targets?.length||0)+(evt.mistTargets?.length||0)+(evt.darumaTargets?.length||0)>0))praise("pulse");
   if(evt.type==="goal"){goalReached=true;unlockGoal();toast("✦ Level goal reached!");}
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
  busy=false;$("board").setAttribute("aria-busy","false");renderBoard(game.board);renderHUD();updatePaceLabel();renderPowerBar();saveRun();
  if(!finished)armDecisionClock();
  if(!finished)restartIdleHint();
 }
 if(bondGain?.ok){
  updateSpiritBadge();renderPowerBar();
  toast(bondGain.promoted?"✦ Omamori upgraded to tier "+bondGain.tier+"!":
   "✦ Omamori mission "+bondGain.progress+"/6");
 }
 if(goalReached)unlockGoal();
 const objectiveMessage=Q.summary(events,game);
 if(objectiveMessage&&!bondGain?.ok)toast("✦ "+objectiveMessage,2250);
 if(finished||goalReached)showResult();
 else if(game?.koiRerollAt>=0)showKoiReroll();
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
 // A completed clean replay earns a small capped amount after normal one-off rewards.
 const replayReward=won&&!game.assisted&&!coinReward.delta&&!game.replayCoinClaimed?
  C.replayCoins(save,level,true,false,new Date().toISOString().slice(0,10)):0;
 if(won)game.replayCoinClaimed=true;
 const moonMission=won?C.observe(save,level,[],true):{ok:false};
 const canContinue=won&&game.moves>0;
 if(!canContinue)save.run=null;
 persist();
 $("modalEyebrow").textContent=won?"LEVEL COMPLETE":"TRY AGAIN";
 $("modalTitle").textContent=won?"Beautiful harmony!":"Out of moves";
 const panel=$("modalContent");panel.replaceChildren();
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!=null)node.textContent=text;
  return node;
 };
 if(won){
  const result=make("div","victory-result"+(game.assisted?" is-assisted":""));
  panel.append(result);
  // Stars are the emotional headline, but never the whole reward contract:
  // retain the three-star accessible text and the legacy v2 completion label.
  const stars=make("div","big-stars");
  if(game.rewardVersion===2){
   stars.classList.add("legacy-stars");
   stars.textContent="★ LEVEL COMPLETE";
  }else{
   stars.setAttribute("role","img");
   stars.setAttribute("aria-label",game.stars()+" of 3 "+(game.assisted?"practice stars, not Goshuincho stamps":"Goshuincho stars"));
   for(let i=0;i<3;i++){
    const filled=i<game.stars();
    const star=make("span","victory-star"+(filled?" is-earned":" is-empty"),filled?"★":"☆");
    star.setAttribute("aria-hidden","true");
    star.style.setProperty("--star-index",i);
    stars.append(star);
   }
  }
  const starWrap=make("div","victory-stars");
  starWrap.append(stars,make("span","jh-rating-label",Q.rewardLabel(game)));
  result.append(starWrap);
  // Avoid replay celebrations even if unlockGoal() saved during playback.
  const earnedStars=G.archivedStars(save,level);
  const chapterReward=G.chapterSnapshot(save,Math.floor(level/G.CHAPTER_SIZE));
  if(earnedStars>rewardStarsAtLevelStart){
   const isNew=rewardStarsAtLevelStart===0;
   const chapterComplete=isNew&&chapterReward.completed;
   const ribbon=make("div","victory-archive-reward"+(chapterComplete?" is-chapter-complete":""));
   const copyRibbon=make("div","victory-archive-copy");
   copyRibbon.append(make("strong","",chapterComplete?"Chapter seal earned!":
    isNew?"New stamp in Goshuincho":"Stamp upgraded"),
    make("small","",chapterComplete?"10/10 stamps · Chapter seal in Goshuincho":
     "Chapter "+chapterReward.number+" · "+chapterReward.earned+" of 10 stamps · "+earnedStars+" of 3 stars"));
   ribbon.append(make("span","victory-archive-seal","✦"),copyRibbon);result.append(ribbon);
  }
  rewardStarsAtLevelStart=earnedStars;
  if(game.assisted)result.append(make("p","omamori-assisted-notice","✧ Assisted win — the next level unlocks. Standard stars, coins and records are unaffected."));
  const income=make("div","victory-harmony-income");
  const gained=coinReward.delta;
  income.append(make("span","victory-harmony-mark","✧"),
   make("strong","",game.assisted?"Assisted win · no Harmony Coins":gained?("+"+prettify(gained)+" Harmony Coins"):"Harmony Coins already collected"),
   make("small","",game.assisted?"Omamori help lets you advance but does not award standard bonus coins.":gained?
    "New-star reward · saved to your collection":
    "Earn new coins by clearing new levels or improving your star rating."));
  result.append(income);
  if(replayReward)result.append(make("p","omamori-power-earned","✦ Unassisted replay · +"+replayReward+" Harmony Coins"));
  if(moonMission.ok)result.append(make("p","omamori-power-earned",
   moonMission.promoted?"✦ Omamori reached tier "+moonMission.tier:"✦ Omamori mission "+moonMission.progress+"/6"));
  const goal=make("section","victory-goal");
  goal.setAttribute("aria-label","Completed level goal");
  const goalCopy=make("div","victory-goal-copy");
  goalCopy.append(make("span","victory-kicker","GOAL COMPLETED"),
   make("strong","victory-goal-title",game.goalText()));
  const goalProgress=make("span","victory-goal-count",
   prettify(game.target())+" / "+prettify(game.target()));
  goal.append(goalCopy,goalProgress);
  result.append(goal);
  if(game.rewardVersion===3){
   const timing=make("div","victory-timing");
   const moves=make("div","victory-timing-stat");
   moves.append(make("strong","",String(game.goalMove)),
    make("span","","of "+game.config.moves+" moves"));
   const rating=make("div","victory-timing-stat");
   rating.append(make("strong","",game.stars()+" / 3"),
    make("span","",game.assisted?"practice stars":"Goshuincho stars"));
   timing.append(moves,rating);
   const note=make("p","victory-star-note",game.assisted?
    "Practice rating only. The next level unlocks; no stamps, coins or standard records are awarded.":
    "The Goshuincho rating locks when you complete the objective.");
   result.append(timing,note);
  }
  if(game.config.goal.type==="mist"){
   result.append(make("p","victory-mist-note","✦ The garden Mist is cleared"));
  }
  const sum=make("section","summary victory-score");
  const scoreHeader=make("div","victory-score-head");
  scoreHeader.append(make("div","victory-kicker","SCORE"));
  const record=make("span","victory-record");
  record.append(make("span","victory-record-mark","✦"),
   make("span","",game.assisted?"ASSISTED · NOT A RECORD":"RECORD "+prettify(activeRecords()[level]||game.score)));
  scoreHeader.append(record);
  const strong=make("strong","victory-score-number",prettify(game.score));
  sum.append(scoreHeader,strong);
  result.append(sum);
  const stats=make("div","result-stats victory-stats");
  const entries=[
   [game.masterpieces,"Masterpiece","✿"],
   [game.echoes||0,"Harmony Echo","≋"],
   [game.bestChain,"Best Harmony chain","∞"],
   [game.fusions,"Fusions","✧"]
  ];
  entries.forEach(([value,label,symbol])=>{
   const card=make("div","victory-stat");
   card.append(make("span","victory-stat-icon",symbol));
   const copy=make("span","victory-stat-copy");
   copy.append(make("strong","",String(value)),make("small","",label));
   card.append(copy);stats.append(card);
  });
  result.append(stats);
  const note=make("p","victory-next-note",level===49?
   "✦ Lantern Path complete! Endless Garden opens next with generated puzzle challenges.":
   canContinue?"✦ "+game.moves+" moves left · keep playing for a high score or advance to the next level.":
   "✦ Level complete · replay for a new record or move on.");
  result.append(note);
 }else{
  // Failure still shows objective progress, including unbroken seals/eyes.
  const progressSection=make("section","jh-failed-goal");
  progressSection.append(make("strong","","GOAL PROGRESS · "+game.progress()+" / "+game.target()),
   make("span","",Q.detail(game)));
  panel.append(progressSection);
  if(game.config.goal.type==="mist"){
   const msg=make("p","mist-result",
    "You cleared "+game.mistCleared+" of "+game.target()+" Mist tiles. Try to clear the rest.");
   panel.append(msg);
  }
  const sum=make("div","summary"),label=make("div","","SCORE"),
   number=make("strong","",prettify(game.score));
  sum.append(label,number);panel.append(sum);
  // This pass only redesigns wins; preserve the existing failed-run stats.
  const stats=make("div","result-stats");
  [[game.masterpieces,"Masterpiece"],[game.echoes||0,"Harmony Echo"],
   [game.bestChain,"Best Harmony chain"],[game.fusions,"Fusions"],
   [prettify(activeRecords()[level]||game.score),"Personal best"]].forEach(([value,label])=>{
    const entry=make("div");
    entry.append(make("strong","",String(value)),make("small","",label));
    stats.append(entry);
   });
  panel.append(stats);
  panel.append(make("p","","Each retry offers a fresh, fair board. No lives or waiting timers."));
 }
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.toggle("victory-actions",won);
 if(!won&&C.status(save,"tsuki")?.owned)
  modalButton(actions,"☾ Moon's Serenity · +"+([0,2,3,5][C.status(save,"tsuki").tier])+" moves","primary omamori-moon-revive",()=>confirmMoonRescue());
 if(won)modalButton(actions,level===49?"Enter Endless Garden →":"Next level →","primary victory-next",()=>startLevel(level+1));
 if(canContinue)modalButton(actions,"Keep playing for a high score","secondary victory-continue",()=>{
  $("modal").hidden=true;armDecisionClock();restartIdleHint();
 });
 modalButton(actions,won?"Play again":"Try again on a new board",won?"secondary victory-tertiary":"secondary",()=>startLevel(level));
 modalButton(actions,"Goshuincho · Level Select",won?"secondary victory-tertiary":"secondary",()=>{
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
 modalButton(actions,"Back to spelet","primary",()=>{$("modal").hidden=true;});$("modal").hidden=false;
}
// This is a turn-based puzzle; the menu overlay blocks touches while open.
// Local report only: no analytics, disk write or network transfer.
function showPerformanceReport(){
 $("modalActions").classList.remove("pause-menu-actions");
 const stats=perf?.summary(),item=stats?.latest;
 const node=document.createElement("div");
 node.className="performance-report";
 const rows=[
  ["Measured moves",String(stats?.turns||0)],
  ["Effects",stats?.constrained?"Fewer extra particles":"Normal"],
  ["Latest sample",item?item.frames+" frames":"Make a move to measure"],
  ["Average frame time",item?item.averageMs+" ms":"—"],
  ["95th percentile",item?item.p95Ms+" ms":"—"],
  ["Estimated frame rate",item?.approxFps?item.approxFps+" FPS":"—"],
  ["Slow frames",item?item.slowPct+" %":"—"],
  ["Peak simultaneous effects",item?String(item.peakFx):"—"],
  ["Animations started",item?String(item.animations):"—"]
 ];
 for(const [label,value] of rows){
  const p=document.createElement("p"),bold=document.createElement("strong");
  bold.textContent=label+": ";
  p.append(bold,document.createTextNode(value));node.append(p);
 }
 const note=document.createElement("p");
 note.textContent="This measures animations from the last move, not your whole phone. No data is sent.";
 node.append(note);
 $("modalEyebrow").textContent="MOBILE DIAGNOSTICS";
 $("modalTitle").textContent="Performance";
 $("modalContent").replaceChildren(node);
 const actions=$("modalActions");actions.replaceChildren();
 modalButton(actions,"Back to spelet","primary",()=>{$("modal").hidden=true;});
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
 hint.textContent="Compare Director 4.0 with earlier engines on identical starting boards. Simulated runs never affect stars, points, or saves.";
 content.append(hint);
 if(!api){
  const missing=document.createElement("p");missing.textContent="Could not load diagnostics. Reload the page.";
  content.append(missing);
  const actions=$("modalActions");actions.replaceChildren();
  modalButton(actions,"Back","primary",()=>{$("modal").hidden=true;});$("modal").hidden=false;
  return;
 }
 const controls=document.createElement("div");controls.className="engine-controls";
 const field=(name,node)=>{
  const label=document.createElement("label");label.textContent=name;label.append(node);controls.append(label);
 };
 const levels=document.createElement("select");
 const allOption=document.createElement("option");allOption.value="all";allOption.textContent="Introduction levels 1–10";levels.append(allOption);
 R.levels.forEach((cfg,i)=>{const option=document.createElement("option");option.value=String(i);option.textContent=(i+1)+". "+cfg.name;levels.append(option);});
 if(level>=R.levels.length){const option=document.createElement("option");option.value=String(level);option.textContent=(level+1)+". "+R.levelConfig(level).name;levels.append(option);}
 levels.value=game?String(level):"all";field("Levels",levels);
 const samples=document.createElement("select");
 for(const n of [2,5,10,25]){const option=document.createElement("option");option.value=String(n);option.textContent=n+" seeds per strategy and level";samples.append(option);}
 samples.value="5";field("Test runs",samples);
 const seedInput=document.createElement("input");seedInput.type="number";seedInput.min="0";seedInput.max="4294967295";seedInput.step="1";seedInput.value="20261022";field("Base seed (reproducible)",seedInput);
 const engineMode=document.createElement("select");engineMode.id="engineMode";
 for(const [value,label] of [
  ["compare","Compare Standard + Director 1.0 + 2.0 + 3.0"],
  ["compare31","Compare Director 3.0 vs Objective 3.1"],
  ["compare311","Compare Objective 3.1 vs Endgame 3.1.1"],
   ["compare4","Compare Endgame 3.1.1 vs Director 4.0"],
  ["standard","Only Standard"],
  ["director","Only Director 1.0"],
  ["director2","Only Director 2.0"],
  ["director3","Only Pacing Director 3.0"],
  ["director31","Only Objective Awareness 3.1"],
  ["director311","Only Endgame Objective Awareness 3.1.1"],
   ["director4","Only Harmony Director 4.0"]
 ]){
  const opt=document.createElement("option");opt.value=value;opt.textContent=label;engineMode.append(opt);
 }
 engineMode.value="compare4";field("Game engine",engineMode);
 const scopeNote=document.createElement("p");
 scopeNote.className="engine-lab-note";
 scopeNote.textContent="Director 4.0 is the default from level 10. It understands Daruma, Sealed Stones, partial hits, and goal progress. Bot pacing is simulated.";

 content.append(controls,scopeNote);
 const status=document.createElement("p");status.className="engine-lab-status";status.setAttribute("role","status");
 status.textContent="Ready to analyze the game engine.";content.append(status);
 const output=document.createElement("div");output.className="engine-lab-output";content.append(output);
 const actions=$("modalActions");actions.replaceChildren();
 const runButton=modalButton(actions,"Run analysis","primary",()=>{});
 const cancelButton=modalButton(actions,"Cancel","secondary",()=>{if(engineLabRun)engineLabRun.cancelled=true;});
 cancelButton.disabled=true;
 const exportButton=modalButton(actions,"Exportera JSON","secondary",()=>{});
 exportButton.disabled=true;
 modalButton(actions,"Back","secondary",()=>{if(engineLabRun)engineLabRun.cancelled=true;$("modal").hidden=true;});
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
  summary.textContent=result.runs.length+" runs · "+
   new Set(result.results.map(r=>r.level)).size+" levels · "+
   result.options.modes.map(x=>api.MODE_LABELS[x]).join(" + ")+
   " · version "+result.gameVersion+".";

  output.append(summary);
  const wrap=document.createElement("div");wrap.className="engine-table-scroll";
  const table=document.createElement("table");table.className="engine-table";
  const head=document.createElement("thead"),header=document.createElement("tr");
  for(const label of ["Level","Engine","AI","Win","Goal","Moves","Choices","Chains","Echo","Growth","Goal family","Drought"]){
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
  explain.textContent="Choices = legal swaps. Chains = moves with multiple fusion waves. Echo = resonance rewards per run. Growth = possible matches involving stage 3+. Goal family = possible upgrades of the requested family. Drought = consecutive moves with no goal progress. Start seeds are identical.";
  if(result.options.modes.length>=2){
   const comparison=document.createElement("div");comparison.className="engine-comparison";
   const title=document.createElement("strong");title.textContent="Direct comparison · goal progress, wins and growth";
   comparison.append(title);
   const baselineMode=result.options.modes.includes("standard")?"standard":
   result.options.modes.includes("director3")?"director3":result.options.modes.includes("director311")?"director311":"director31";
   for(const classic of result.results.filter(x=>x.mode===baselineMode)){
    for(const mode of result.options.modes.filter(m=>m!==baselineMode)){
    const newer=result.results.find(x=>x.level===classic.level&&x.strategy===classic.strategy&&x.mode===mode);
    if(!newer)continue;
    const line=document.createElement("p");
    line.textContent="Level "+(classic.level+1)+" · "+api.LABELS[classic.strategy]+" · "+api.MODE_LABELS[mode]+": "+
     classic.wins+"/"+classic.samples+" → "+newer.wins+"/"+newer.samples+
     " · Goal completion "+pct(classic.avgGoalRatio)+" → "+pct(newer.avgGoalRatio)+
     " · Growth "+classic.avgMeaningful.toFixed(1)+" → "+newer.avgMeaningful.toFixed(1)+
     " · Stage 4 opportunities "+classic.avgNearReady.toFixed(1)+" → "+newer.avgNearReady.toFixed(1);
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
   engineLabText(status,"Enter an integer between 0 and 4294967295.");return;
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
  engineLabText(status,"Analyzing 0 / "+total+" test runs …");
  try{
   const result=await api.runAsync(opts,({completed,total})=>{
    if(engineLabRun===job)engineLabText(status,"Analyzing "+completed+" / "+total+" test runs …");
   });
   if(engineLabRun!==job)return;
   if(result.cancelled)engineLabText(status,"Cancelled after "+result.completed+" test runs.");
   else{latest=result;display(result);engineLabText(status,"Analysis complete. You can export the results with seeds and all runs.");exportButton.disabled=false;}
  }catch(error){
   if(engineLabRun===job){engineLabText(status,"Analysis failed: "+error.message);console.error("Harmony Engine Lab",error);}
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
 powerSelection=null;renderPowerBar();
 disarmDecisionClock();clearIdleHint();
 $("modalEyebrow").textContent="JAPANESE HARMONY";
 $("modalTitle").textContent="Game Menu";
 const content=$("modalContent");content.replaceChildren();
 const desc=document.createElement("p");desc.className="pause-summary";
 desc.textContent="Level "+(level+1)+" · "+game.familyCount+" families · "+game.moves+" moves left";
 content.append(desc);
 const actions=$("modalActions");actions.replaceChildren();
 actions.classList.add("pause-menu-actions");
 const add=(label,style,group,callback)=>{
  const b=modalButton(actions,label,style,callback);
  b.classList.add("pause-action","pause-"+group);
  return b;
 };
 add("Resume game","primary","resume",()=>{$("modal").hidden=true;armDecisionClock();});
 if(game.complete)add("Finish and view results","secondary","finish",()=>{if(busy)return;game.finish();showResult();});
 add("Restart level","secondary","restart",()=>{if(!busy)startLevel(level);});
 // Keep these DOM positions intact: the existing game and smoke tests rely
 // on direct button access and keyboard tab order, even with the new layout.
 add("How to Play","secondary","help",()=>{$("helpButton").click();});
 add("Settings","secondary","settings",()=>{$("settingsButton").click();});
 add("Performance","secondary","performance",showPerformanceReport);
 add("Game Dev · Enginelab","secondary","dev",openEngineLab);
 add("Back to Goshuincho","secondary","levels",()=>{if(!busy)showLevelSelection();});
 $("modal").hidden=false;
}
function bind(){
 const directorChoice=$("gameDirectorMode");
 const explainDirectorMode=()=>{
  $("directorModeDescription").textContent=save.playMode==="auto"?
   "Automatic: Harmony Pacing 3.0 on levels 1–9 and Director 4.0 from level 10. Started levels keep their current engine.":
   save.playMode==="v4"?
   "Director 4.0 analyzes goals, obstacle hits and stalled progress without free matches.":
   save.playMode==="v311"?
   "Experimental Endgame 3.1.1 analyzes the last Mist tiles without adding moves.":
   save.playMode==="v31"?
   "Experimental Director 3.1 considers goals, fusion placement, Mist and Pulse.":
   save.playMode==="v3"?
   "Director 3.0 follows the player's rhythm and uses fair refills.":
   save.playMode==="v2"?"Director 2.0 prioritizes upgrade opportunities within the normal object pool.":
   "The original random refill system.";
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
 $("goalHelpButton").addEventListener("click",showGoalHelp);
 $("devButton").addEventListener("click",openEngineLab);
 $("continueButton").addEventListener("click",()=>activateWashiPlay($("continueButton"),()=>{const r=save.run&&save.run.data&&save.run.data.moves>0?save.run:null;if(r)startLevel(r.level,true);else startLevel(save.unlocked);}));
 $("helpButton").addEventListener("click",()=>modalInfo("How to Play",'<p><strong>Match:</strong> Swap adjacent tiles to match three or more objects from the same family. Stages can differ. T- and L-shaped matches also work.</p><p><strong>Fuse:</strong> A match fuses at the destination of your swap (or the other swapped tile if only that position makes a match). The result advances one stage above the highest matched object. Automatic chains fuse at the highest-stage tile. A match of four upgrades a neighbor; five or more upgrades two.</p><p><strong>Harmony Resonance:</strong> Objects at stages 3–4 may form a subtle light link with a neighboring object in the same family. Fuse both together to trigger Harmony Echo and earn bonus points, at most once per move.</p><p><strong>Harmony Pulse:</strong> A stage-5 masterpiece sends power to its four orthogonal neighbors. Existing objects advance, and Mist clears even on empty tiles. Chains finish before empty spaces refill.</p><p><strong>Masterpieces:</strong> Each new masterpiece still grants bonus points; the old masterpiece collection panel is hidden during play.</p><p><strong>Harmony Mist (from level 4):</strong> Clear magical Mist from marked tiles. Fuse onto a Mist tile or reach it with Harmony Pulse. Pieces can move into and out of Mist, but matching across Mist does not clear it unless the fusion lands there. Mist remains in place as pieces fall.</p><p><strong>Daruma (levels 21–30):</strong> Daruma cannot move. Each doll requires two hits on separate moves, from an adjacent fusion or Harmony Pulse. The chapter alternates between Daruma, Mist, and fusion challenges.</p><p><strong>Sealed Stones (levels 31–40):</strong> Stones cannot move and take four separate hits. Fuse beside a stone or hit it with Harmony Pulse, at most once per move. The final hit releases an Awakening Pulse toward all eight neighbors, including diagonals, and can start a chain.</p><p><strong>Rewards:</strong> Completing the objective awards at least one star. Earn two or three by finishing with fewer moves; your star rating locks when the goal is reached. Bonus score is an optional record. You can continue playing after the goal or move on. Omamori cards are purchased with Harmony Coins at tier I and upgraded through missions to tiers II and III. Sakura upgrades 1–3 selected tiles, Koi shuffles 2×2 or 3×3 areas (and can reroll once at tier III), and Moon\'s Serenity adds 2, 3, or 5 moves. Each used card is fully consumed. Multiple cards may be used in a level; a new card always starts at tier I. Assisted wins do not affect standard records or star stamps.</p>'));
 $("settingsButton").addEventListener("click",()=>{
  modalInfo("Settings",'<p><label><input type="checkbox" id="settingsSound" '+(save.sound?"checked":"")+'> Sound</label></p><p><label><input type="checkbox" id="settingsMotion" '+(save.reduceMotion?"checked":"")+'> Reduce animations</label></p>');
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
saveBootComplete=true;notifySaveWarning();
})();