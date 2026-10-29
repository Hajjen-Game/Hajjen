/* Japanese Harmony · Harmony Economy & Omamori 1.0
 * Offline, cosmetic-only collection. One-time rewards for first clears and
 * higher earned stars; no random drops, pay-to-win or repeat-farming.
 * Pure helpers; only the caller persists its local browser save.
 */
(function(root){
"use strict";
const VERSION=1;
const START=12,PER_STAR=8,MAX_COINS=10000000;
const CATALOG=Object.freeze([
 Object.freeze({id:"sakura",name:"Sakura's Blessing",theme:"sakura",symbol:"✿",price:80,subtitle:"A reminder of new beginnings.",meaning:"Bloom"}),
 Object.freeze({id:"kiri",name:"Stillness of Mist",theme:"mist",symbol:"☁",price:140,subtitle:"Calm even when the path is unclear.",meaning:"Stillness"}),
 Object.freeze({id:"daruma",name:"Daruma's Promise",theme:"daruma",symbol:"◉",price:220,subtitle:"A small promise of perseverance.",meaning:"Perseverance"}),
 Object.freeze({id:"akari",name:"Lantern Glow",theme:"lantern",symbol:"✦",price:320,subtitle:"Carry a little warmth with you.",meaning:"Warmth"}),
 Object.freeze({id:"koi",name:"Path of the Koi",theme:"koi",symbol:"〰",price:440,subtitle:"Follow the current, find your rhythm.",meaning:"Flow"}),
 Object.freeze({id:"tsuki",name:"Moon's Serenity",theme:"moon",symbol:"☾",price:560,subtitle:"A quiet light along the journey.",meaning:"Peace"})
]);
const byId=id=>CATALOG.find(x=>x.id===id)||null;
const stars=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(3,Math.trunc(Number(n)))):0;
const earnedValue=rating=>rating?START+PER_STAR*stars(rating):0;
const saneCoins=n=>Number.isSafeInteger(n)&&n>=0?Math.min(MAX_COINS,n):0;
const completedRating=(save,index)=>{
 const first=index<10,grade=first?"fourFamilyStars":"bestStars",score=first?"fourFamilyScores":"bestScores";
 const direct=stars(save?.[grade]?.[index]);
 if(direct)return direct;
 if(Number(save?.[score]?.[index])>0)return 1;
 if(save?.run?.level===index&&save?.run?.data?.complete)return Math.max(1,stars(save.run.data.starsAtGoal));
 return 0;
};
function newAccount(save){
 const paid={};
 const keys=new Set();
 for(const field of ["fourFamilyStars","bestStars","fourFamilyScores","bestScores"]){
  for(const key of Object.keys(save?.[field]||{})){
   const n=Number(key);
   if(Number.isInteger(n)&&n>=0&&n<1000000)keys.add(n);
  }
 }
 if(save?.run?.data?.complete&&Number.isInteger(save.run.level)&&save.run.level>=0)keys.add(save.run.level);
 let total=0;
 for(const i of keys){
  const rating=completedRating(save,i);
  if(rating){paid[i]=rating;total+=earnedValue(rating);}
 }
 return {version:VERSION,coins:Math.min(MAX_COINS,total),paidStars:paid,owned:[],equipped:null};
}
function initialize(save){
 if(!save||typeof save!=="object")throw new Error("Save required");
 if(!save.economy||save.economy.version!==VERSION){
  // Historic save receives a ONE-TIME credit reflecting real achievement.
  // Do not infer achievement from simply unlocked stage numbers.
  save.economy=newAccount(save);
  return {newlyCreated:true,account:save.economy};
 }
 const e=save.economy;
 e.coins=saneCoins(e.coins);
 if(!e.paidStars||typeof e.paidStars!=="object"||Array.isArray(e.paidStars))e.paidStars={};
 if(!Array.isArray(e.owned))e.owned=[];
 e.owned=[...new Set(e.owned.filter(id=>typeof id==="string"&&!!byId(id)))];
 if(e.equipped!==null&&!e.owned.includes(e.equipped))e.equipped=null;
 return {newlyCreated:false,account:e};
}
function snapshot(save){
 const {account:e}=initialize(save);
 return {coins:e.coins,owned:[...e.owned],equipped:e.equipped,
  ownedCount:e.owned.length,totalItems:CATALOG.length};
}
function claim(save,index,rating){
 if(!Number.isInteger(index)||index<0||index>=1000000)return {delta:0,reason:"invalid-level"};
 const {account:e}=initialize(save);
 const earned=stars(rating),previous=stars(e.paidStars[index]);
 if(earned===0||earned<=previous)return {delta:0,reason:"already-paid"};
 const delta=Math.max(0,earnedValue(earned)-earnedValue(previous));
 e.paidStars[index]=earned;
 e.coins=Math.min(MAX_COINS,e.coins+delta);
 return {delta,reason:previous?"better-stars":"first-clear",coins:e.coins};
}
function purchase(save,id){
 const item=byId(id);if(!item)return {ok:false,reason:"unknown-item"};
 const {account:e}=initialize(save);
 if(e.owned.includes(id))return {ok:false,reason:"already-owned"};
 if(e.coins<item.price)return {ok:false,reason:"not-enough-coins"};
 e.coins-=item.price;e.owned.push(id);
 return {ok:true,reason:"purchased",coins:e.coins,item};
}
function equip(save,id){
 const {account:e}=initialize(save);
 if(id===null){e.equipped=null;return {ok:true};}
 if(!byId(id)||!e.owned.includes(id))return {ok:false,reason:"not-owned"};
 e.equipped=id;return {ok:true};
}
const api={VERSION,CATALOG,earnedValue,completedRating,initialize,snapshot,claim,purchase,equip};
root.HarmonyEconomy=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
