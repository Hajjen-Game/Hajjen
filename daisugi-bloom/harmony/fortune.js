/* Japanese Harmony · Pass 3 Omikuji Fortune 1.0
 * Lightweight fictional fortune slips. One free local-calendar-day draw;
 * no streak, no paid retries, no negative rewards and no gameplay effects.
 * Mutation is local to save.fortune + save.economy.coins and persisted by caller.
 */
(function(root){
"use strict";
const VERSION=1;
const REWARDS=Object.freeze([
 Object.freeze({id:"daikichi",title:"Dai-kichi",kanji:"大吉",label:"Great Fortune",weight:10,coins:16,
  text:"A bright day awaits. Let small steps guide you.",symbol:"✦"}),
 Object.freeze({id:"chukichi",title:"Chū-kichi",kanji:"中吉",label:"Good Fortune",weight:20,coins:12,
  text:"Harmony grows when you make space for what feels right.",symbol:"☀"}),
 Object.freeze({id:"kichi",title:"Kichi",kanji:"吉",label:"Fortune",weight:30,coins:9,
  text:"Beauty lives in what you have already begun.",symbol:"✿"}),
 Object.freeze({id:"shokichi",title:"Shō-kichi",kanji:"小吉",label:"Small Fortune",weight:25,coins:7,
  text:"Even the smallest step moves your journey forward.",symbol:"❀"}),
 Object.freeze({id:"suekichi",title:"Sue-kichi",kanji:"末吉",label:"Fortune Ahead",weight:15,coins:5,
  text:"Be patient. A quiet beginning can become something wonderful.",symbol:"☾"})
]);
const lookup=id=>REWARDS.find(f=>f.id===id)||null;
function dateKey(now=new Date()){
 const d=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(d.getTime()))return null;
 const pad=n=>String(n).padStart(2,"0");
 return String(d.getFullYear())+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}
const safeKey=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;
function initialize(save){
 if(!save||typeof save!=="object")throw new Error("Save required");
 if(!save.fortune||save.fortune.version!==VERSION){
  save.fortune={version:VERSION,lastDate:null,lastDraw:null,count:0};
  return {created:true,fortune:save.fortune};
 }
 const f=save.fortune;
 f.lastDate=safeKey(f.lastDate);
 if(!f.lastDraw||!lookup(f.lastDraw.id)||safeKey(f.lastDraw.date)!==f.lastDate||
    !Number.isInteger(f.lastDraw.coins)||f.lastDraw.coins<0||
    f.lastDraw.coins>lookup(f.lastDraw.id).coins)f.lastDraw=null;
 if(!Number.isSafeInteger(f.count)||f.count<0)f.count=0;
 return {created:false,fortune:f};
}
function status(save,now=new Date()){
 const day=dateKey(now);
 const {fortune:f}=initialize(save);
 const locked=!Number.isInteger(save?.unlocked)||save.unlocked<10;
 const available=!locked&&!!day&&(!f.lastDate||day>f.lastDate);
 const last=f.lastDraw?{...f.lastDraw,fortune:lookup(f.lastDraw.id)}:null;
 return {date:day,available,locked,count:f.count,last,coins:Number(save?.economy?.coins)||0};
}
function select(rng){
 const roll=rng();
 const r=Number.isFinite(roll)?Math.max(0,Math.min(0.9999999999,roll)):0.5;
 const total=REWARDS.reduce((sum,x)=>sum+x.weight,0);
 let cursor=r*total;
 for(const fortune of REWARDS){
  cursor-=fortune.weight;
  if(cursor<0)return fortune;
 }
 return REWARDS.at(-1);
}
function draw(save,now=new Date(),rng=Math.random){
 if(!save?.economy||save.economy.version!==1)return {ok:false,reason:"no-wallet"};
 if(!Number.isInteger(save.unlocked)||save.unlocked<10)return {ok:false,reason:"tutorial-locked"};
 const day=dateKey(now);
 if(!day)return {ok:false,reason:"invalid-date"};
 const {fortune:f}=initialize(save);
 if(f.lastDate&&day<=f.lastDate)return {ok:false,reason:"already-drawn",status:status(save,now)};
 const chosen=select(rng);
 const coins=Number.isSafeInteger(save.economy.coins)&&save.economy.coins>=0?save.economy.coins:0;
 const reward=Math.min(chosen.coins,Math.max(0,10000000-coins));
 // Persist both sides with the application's existing save call; no other
 // code path may credit the draw a second time for the same calendar day.
 f.lastDate=day;
 f.lastDraw={date:day,id:chosen.id,coins:reward};
 f.count+=1;
 save.economy.coins=coins+reward;
 return {ok:true,reason:"drawn",fortune:chosen,coins:reward,balance:save.economy.coins,date:day};
}
const api={VERSION,REWARDS,dateKey,initialize,status,draw,select};
root.HarmonyFortune=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
