/* Japanese Harmony · Goshuincho Level Select 2.0
 * Fictional travel-stamp album inspired by Japan's goshuincho tradition.
 * Pure read-only projections of the existing star archive: no new currency,
 * save migration, unlocks, gameplay mutations, or real shrine stamps.
 * Future generated assets: fill URL entries in ART below.
 */
(function(root){
"use strict";
const CHAPTER_SIZE=10;
const PAGE_SIZE=4;
const PAGES_PER_CHAPTER=Math.ceil(CHAPTER_SIZE/PAGE_SIZE);
const THEMES=[
 {title:"Första harmonin",subtitle:"Din resa tar sin början",motif:"sakura",symbol:"✿"},
 {title:"Dimträdgården",subtitle:"Genom dimma och mästerverk",motif:"mist",symbol:"☁"},
 {title:"Darumas önskan",subtitle:"Två ögon, ett löfte",motif:"daruma",symbol:"◉"},
 {title:"Månljusets väg",subtitle:"Nya steg i natten",motif:"moon",symbol:"☾"},
 {title:"Lyktornas stig",subtitle:"Ett varmt sken framåt",motif:"lantern",symbol:"✦"}
];
// Stamp Slot Polish 1.0: the nine approved transparent illustrations live in
// one tiny optimized 3x3 AVIF sprite sheet. Rows: chapter art, level stamps,
// grade seals. Columns: Sakura/Mist/Daruma or 1/2/3 stars.
// Every slot is independently replaceable by a PNG/WebP/AVIF string later.
const ATLAS="./assets/goshuincho/goshuincho-nine-atlas.avif?v=6.34.0";
const tile=(column,row)=>({src:ATLAS,column,row});
const ART={
 covers:{}, // reserved for future hand-made chapter completion artwork
 chapters:{0:tile(0,0),1:tile(1,0),2:tile(2,0)},
 stamps:{0:tile(0,1),1:tile(1,1),2:tile(2,1)}, // reusable chapter motifs
 levelStamps:{}, // optional per-level override, keyed by zero-based stage
 grades:{1:tile(0,2),2:tile(1,2),3:tile(2,2)}
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
const api={CHAPTER_SIZE,PAGE_SIZE,PAGES_PER_CHAPTER,ART,archivedStars,levelStatus,chapter,chapterSnapshot,pageForLevel,pageSnapshot,summary,artUrl};
root.HarmonyGoshuincho=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
