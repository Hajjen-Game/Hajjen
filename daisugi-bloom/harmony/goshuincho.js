/* Japanese Harmony · Goshuincho Collection 1.0
 * Fictional travel-stamp album inspired by Japan's goshuincho tradition.
 * Pure read-only projections of the existing star archive: no new currency,
 * save migration, unlocks, gameplay mutations, or real shrine stamps.
 * Future generated assets: fill URL entries in ART below.
 */
(function(root){
"use strict";
const CHAPTER_SIZE=10;
const THEMES=[
 {title:"Första harmonin",subtitle:"Din resa tar sin början",motif:"sakura",symbol:"✿"},
 {title:"Dimträdgården",subtitle:"Genom dimma och mästerverk",motif:"mist",symbol:"☁"},
 {title:"Darumas önskan",subtitle:"Två ögon, ett löfte",motif:"daruma",symbol:"◉"},
 {title:"Månljusets väg",subtitle:"Nya steg i natten",motif:"moon",symbol:"☾"},
 {title:"Lyktornas stig",subtitle:"Ett varmt sken framåt",motif:"lantern",symbol:"✦"}
];
// Everything rendered with CSS/text until image assets are explicitly added.
// Examples: chapters:{2:"./assets/goshuincho/chapter-daruma.webp"},
// stamps:{20:"./assets/goshuincho/level-21.webp"},
// grades:{3:"./assets/goshuincho/three-star-seal.webp"}.
// Each image is layered on its own replaceable slot, not baked into UI text.
const ART={covers:{},chapters:{},stamps:{},grades:{}};
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
function chapterSnapshot(state,index){
 const meta=chapter(index);
 const stamps=Array.from({length:CHAPTER_SIZE},(_,offset)=>{
  const level=meta.first+offset,stars=archivedStars(state,level);
  const current=Number.isInteger(state?.unlocked)?Math.max(0,state.unlocked):0;
  return {level,number:level+1,stars,earned:stars>0,
   playable:level<=current,artKey:"level-"+String(level+1).padStart(3,"0"),
   gradeKey:"stars-"+stars};
 });
 const earned=stamps.filter(s=>s.earned).length;
 return {...meta,stamps,earned,stars:stamps.reduce((a,s)=>a+s.stars,0),
  completed:earned===CHAPTER_SIZE};
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
 const dictionary=ART[type];
 return dictionary&&Object.prototype.hasOwnProperty.call(dictionary,key)?
  dictionary[key]:null;
}
const api={CHAPTER_SIZE,ART,archivedStars,chapter,chapterSnapshot,summary,artUrl};
root.HarmonyGoshuincho=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
