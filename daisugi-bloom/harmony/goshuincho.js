/* Japanese Harmony · Goshuincho Level Select 2.0
 * Fictional travel-stamp album inspired by Japan's goshuincho tradition.
 * Pure read-only projections of the existing star archive: no new currency,
 * save migration, unlocks, gameplay mutations, or real shrine stamps.
 * Future generated assets: fill URL entries in ART below.
 */
(function(root){
"use strict";
// Conventional Japanese numeral characters for Goshuincho stamp numbers:
// 1 一, 10 十, 11 十一, 20 二十, 32 三十二, 100 百, 1000 千.
// Supports later chapters without hard-coding each individual level card.
function japaneseNumeral(value){
 if(!Number.isSafeInteger(value)||value<=0)return String(value);
 const digits=["","一","二","三","四","五","六","七","八","九"];
 const groupUnits=["","万","億","兆"];
 const groupText=n=>{
  let result="";
  for(const [divisor,unit] of [[1000,"千"],[100,"百"],[10,"十"]]){
   const count=Math.floor(n/divisor);
   if(count)result+=(count===1?"":digits[count])+unit;
   n%=divisor;
  }
  return result+digits[n];
 };
 let rest=value,blocks=[],i=0;
 while(rest>0&&i<groupUnits.length){
  const group=rest%10000;
  if(group)blocks.unshift(groupText(group)+groupUnits[i]);
  rest=Math.floor(rest/10000);
  i++;
 }
 return rest?String(value):blocks.join("");
}
const CHAPTER_SIZE=10;
const PAGE_SIZE=4;
const PAGES_PER_CHAPTER=Math.ceil(CHAPTER_SIZE/PAGE_SIZE);
const THEMES=[
 {title:"First Harmony",subtitle:"The journey begins",motif:"sakura",symbol:"✿"},
 {title:"Garden of Mist",subtitle:"Through mist and masterpieces",motif:"mist",symbol:"☁"},
 {title:"Daruma's Wish",subtitle:"Two eyes, one promise",motif:"daruma",symbol:"◉"},
 {title:"Path of the Seals",subtitle:"Four cracks, eight directions",motif:"sealed-stone",symbol:"✦"},
 {title:"Lantern Path",subtitle:"A warm light ahead",motif:"lantern",symbol:"✦"}
];
// Asset Fidelity 2.0: the six APPROVED independent high-resolution PNGs
// supply chapter headings and 1/2/3-star seals. Keep the old atlas only as
// legacy fallback for future per-level stamp overrides, never as the visible
// chapter or rating asset. Standalone 4:5 cards are in ART.cards.
const ATLAS="./assets/goshuincho/goshuincho-nine-atlas.avif?v=6.34.0";
const tile=(column,row)=>({src:ATLAS,column,row});
const ART={
 // Three user-approved illustrated 4:5 cards. Keep number/rating as HTML layers.
 cards:{
  0:"./assets/goshuincho/level-card-sakura.webp?v=6.35.0",
  1:"./assets/goshuincho/level-card-mist.webp?v=6.35.0",
  2:"./assets/goshuincho/level-card-daruma.webp?v=6.35.0"
 },
 covers:{}, // reserved for future hand-made chapter completion artwork
 chapters:{
  0:"./assets/goshuincho/chapter-icon-sakura.png?v=6.36.0",
  1:"./assets/goshuincho/chapter-icon-mist.png?v=6.36.0",
  2:"./assets/goshuincho/chapter-icon-daruma.png?v=6.36.0"
 },
 stamps:{0:tile(0,1),1:tile(1,1),2:tile(2,1)}, // legacy optional standalone level-stamp override; not used by current cards
 levelStamps:{}, // optional per-level override, keyed by zero-based stage
 grades:{
  1:"./assets/goshuincho/star-seal-1.png?v=6.36.0",
  2:"./assets/goshuincho/star-seal-2.png?v=6.36.0",
  3:"./assets/goshuincho/star-seal-3.png?v=6.36.0"
 }
};
const clampStars=value=>{
 const v=Number(value);
 return Number.isFinite(v)?Math.max(0,Math.min(3,Math.trunc(v))):0;
};
const archivedStars=(state,index)=>{
 if(!Number.isInteger(index)||index<0)return 0;
 const main=index<10?"fourFamilyStars":"bestStars";
 const scores=index<10?"fourFamilyScores":"bestScores";
 const archived=clampStars(state?.[main]?.[index]);
 // A historic achieved score is genuine evidence of completion even when
 // the star migration did not populate that particular archive record.
 if(archived)return archived;
 if(Number(state?.[scores]?.[index])>0)return 1;
 if(state?.run?.level===index&&state?.run?.data?.complete)
  return Math.max(1,clampStars(state.run.data.starsAtGoal));
 return 0;
};
function chapter(index){
 const n=Math.max(0,Math.floor(Number(index)||0));
 const idea=THEMES[n]||{title:"Harmony Journey "+(n+1),
  subtitle:"En ny sida i din resa",motif:"journey",symbol:"✿"};
 return {index:n,first:n*CHAPTER_SIZE,last:n*CHAPTER_SIZE+CHAPTER_SIZE-1,
  number:n+1,artKey:"chapter-"+String(n+1).padStart(2,"0"),...idea};
}
function levelStatus(state,index){
 const current=Number.isInteger(state?.unlocked)?Math.max(0,state.unlocked):0;
 const playable=Number.isInteger(index)&&index>=0&&index<=current;
 const stars=archivedStars(state,index);
 const run=state?.run;
 const resumable=playable&&run?.level===index&&run?.data&&
  Number(run.data.moves)>0&&!run.data.failed;
 return {playable,earned:stars>0,stars,isCurrent:playable&&index===current,
  resumable:!!resumable,locked:!playable};
}
function chapterSnapshot(state,index){
 const meta=chapter(index);
 const stamps=Array.from({length:CHAPTER_SIZE},(_,offset)=>{
  const level=meta.first+offset,status=levelStatus(state,level);
  return {level,number:level+1,...status,
   artKey:"level-"+String(level+1).padStart(3,"0"),
   gradeKey:"stars-"+status.stars};
 });
 const earned=stamps.filter(s=>s.earned).length;
 return {...meta,stamps,earned,stars:stamps.reduce((a,s)=>a+s.stars,0),
  completed:earned===CHAPTER_SIZE};
}
// A chapter is a TEN-level collectible; book pages are a separate 4+4+2
// presentation only. Stamps, stars, completion and level IDs never change.
function pageForLevel(level){
 return Math.min(PAGES_PER_CHAPTER-1,Math.floor((Math.max(0,level)%CHAPTER_SIZE)/PAGE_SIZE));
}
function pageSnapshot(state,chapterIndex,pageIndex){
 const all=chapterSnapshot(state,chapterIndex);
 const page=Math.min(PAGES_PER_CHAPTER-1,Math.max(0,Math.floor(Number(pageIndex)||0)));
 const from=page*PAGE_SIZE,visible=all.stamps.slice(from,from+PAGE_SIZE);
 return {...all,page,pageNumber:page+1,pages:PAGES_PER_CHAPTER,
  visible,visibleEarned:visible.filter(st=>st.earned).length,
  pageFirst:visible[0]?.number||0,pageLast:visible.at(-1)?.number||0,
  isFinalPage:page===PAGES_PER_CHAPTER-1};
}
function summary(state){
 const current=Number.isInteger(state?.unlocked)?Math.max(0,state.unlocked):0;
 const lastCurrentChapter=Math.floor(current/CHAPTER_SIZE);
 let totalStamps=0,totalStars=0,completedChapters=0;
 for(let c=0;c<=lastCurrentChapter;c++){
  const v=chapterSnapshot(state,c);
  totalStamps+=v.earned;totalStars+=v.stars;
  if(v.completed)completedChapters++;
 }
 return {earned:totalStamps,stars:totalStars,completedChapters,
  visibleChapters:Math.max(1,lastCurrentChapter+1),
  currentChapter:lastCurrentChapter};
}
function artUrl(type,key){
 // A chapter-stamp may be reused by ten levels until unique illustrations
 // are approved, but each level can later override its own artwork.
 if(type==="stamps"){
  const own=ART.levelStamps?.[key];
  return own||ART.stamps?.[Math.floor(Number(key)/CHAPTER_SIZE)]||null;
 }
 return ART[type]?.[key]||null;
}
const api={CHAPTER_SIZE,PAGE_SIZE,PAGES_PER_CHAPTER,ART,japaneseNumeral,archivedStars,levelStatus,chapter,chapterSnapshot,pageForLevel,pageSnapshot,summary,artUrl};
root.HarmonyGoshuincho=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
