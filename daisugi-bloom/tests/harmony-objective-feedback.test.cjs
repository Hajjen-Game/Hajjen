"use strict";
/* Objective & Reward Feedback 2.0 — deterministic read-only contracts. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js"),Q=require("../harmony/objective-feedback.js");
const mist=new R.Game(3,null,{seed:1402});
const stone=new R.Game(30,null,{seed:1403});
const daruma=new R.Game(20,null,{seed:1404});
const snapshots=[mist,stone,daruma].map(g=>JSON.stringify(g.save()));
assert(Q.detail(mist).includes("Mist tiles remaining"));
assert(Q.detail(daruma).includes("eyes to fill"));
assert(Q.detail(stone).includes("hits remaining"));
assert.equal(Q.eventLabels({type:"daruma",hits:[{at:14,filled:1}]} )[0].label,"1/2 EYES");
assert.equal(Q.eventLabels({type:"daruma",hits:[{at:14,filled:2}]} )[0].label,"COMPLETE");
for(const [remaining,label] of [[3,"1/4 HITS"],[2,"2/4 HITS"],[1,"3/4 HITS"],[0,"BROKEN"]])
 assert.equal(Q.eventLabels({type:"sealed-hit",hits:[{at:4,remaining}]} )[0].label,label);
assert.deepEqual(Q.eventLabels({type:"pulse",targets:[{to:4}]}),[]);
assert.deepEqual(Q.eventLabels({type:"sealed-hit",hits:[{at:-1,remaining:1}]}),[]);
assert.equal(Q.rewardLabel({assisted:true}),"PRACTICE RATING · NOT A STAMP");
assert.equal(Q.rewardLabel({assisted:false}),"GOSHUINCHO STAR RATING");
const mistEvents=[{type:"swap",goal:2},{type:"fusion",clearedMist:[1,8],goal:4}];
const mistView={config:{goal:{type:"mist",count:10}},progress:()=>4,target:()=>10};
assert.equal(Q.summary(mistEvents,mistView),"Mist cleared +2 · 4/10");
const lantern={config:{goal:{type:"familyFusion",count:7}},progress:()=>3,target:()=>7};
assert.equal(Q.summary([{type:"swap",goal:2},{type:"fusion",goal:3}],lantern),
 "Lantern fusions +1 · 3/7");
const stoneView={config:{goal:{type:"sealedStone",count:1}},progress:()=>0,target:()=>1};
assert.equal(Q.summary([{type:"swap",goal:0},{type:"sealed-hit",hits:[{at:3,remaining:1}],goal:0}],stoneView),
 "3/4 HITS");
assert.equal(Q.summary([{type:"swap",goal:0},{type:"goal",goal:1}],stoneView),null,
 "Never overwrite a completed-goal announcement");
assert.equal(Q.summary([{type:"swap",goal:0},{type:"lose",goal:0}],stoneView),null);
assert.equal(Q.summary([{type:"swap",goal:0}],stoneView),null);
[mist,stone,daruma].forEach((g,i)=>assert.equal(JSON.stringify(g.save()),snapshots[i],
 "Feedback must not mutate any game, rewards, or the RNG"));
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../harmony/objective-reward-feedback.css"),"utf8");
assert(html.indexOf("objective-feedback.js")<html.indexOf("app.js?v="));
assert(html.includes("objective-reward-feedback.css"));
assert(app.includes("Q.eventLabels(evt)"));
assert(app.includes("Q.summary(events,game)"));
assert(app.includes("Q.detail(game)"));
assert(app.includes("Q.rewardLabel(game)"));
assert(app.includes('game.assisted?"Omamori clear · ★":Q.rewardLabel(game)'));
assert(app.includes('if(game.assisted)result.append(make("p","omamori-assisted-notice"'));
assert(app.includes('const coinReward=won?E.claim'));
assert(app.includes('archive[level]=Math.max(archive[level]||0,game.assisted?1:game.stars())'));
assert(css.includes("prefers-reduced-motion:reduce"));
assert(css.includes(".jh-failed-goal"));
console.log("PASS Objective & Reward Feedback 2.0: truthful progress, blocker hits, v6 assisted rewards, immutable saves");
