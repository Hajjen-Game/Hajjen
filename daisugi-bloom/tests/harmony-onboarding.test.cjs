/* Gameplay Clarity & Onboarding 2.0 — no DOM or browser required. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const R=require("../harmony/rules.js");
const O=require("../harmony/onboarding.js");

const lessons=[[0,"match"],[1,"stages"],[2,"pulse"],[3,"mist"],
 [5,"four"],[10,"families"],[20,"daruma"],[30,"stone"]];
assert.deepEqual(Object.keys(O.LESSONS).map(Number),lessons.map(([i])=>i));
for(const [index,key] of lessons){
 const l=O.lesson(index);
 assert.equal(l.key,key);
 assert(l.title.length>3&&l.short.length>20&&l.detail.length>50);
 assert(!l.short.includes("bonus score"),"Onboarding must teach actual mechanics");
}
assert.equal(O.lesson(4),null,"Regular puzzles do not interrupt with tutorials");
assert.equal(O.lesson(40),null,"Do not promise an unimplemented Lantern tutorial");
assert.equal(O.lesson(51),null);

for(let i=0;i<50;i++){
 const config=R.levelConfig(i),preview=O.preview(i,config,R.moveStarTargets);
 assert.equal(preview.level,i);
 assert.equal(preview.moves,config.moves);
 assert(preview.objective.startsWith(String(config.goal.count)+" "));
 assert.equal(preview.threeStars,R.moveStarTargets(config).three);
 assert.equal(preview.twoStars,R.moveStarTargets(config).two);
 assert(preview.tip.length>=10);
}
assert.equal(O.preview(3,R.levelConfig(3),R.moveStarTargets).objective,"3 Mist tiles");
assert.equal(O.preview(5,R.levelConfig(5),R.moveStarTargets).objective,
 "4 moves with a four-tile match");
assert.equal(O.preview(20,R.levelConfig(20),R.moveStarTargets).objective,"1 Daruma dolls");
assert.equal(O.preview(30,R.levelConfig(30),R.moveStarTargets).objective,"1 Sealed Stones");
assert.equal(O.preview(47,R.levelConfig(47),R.moveStarTargets).objective,"15 Mist tiles");
assert.equal(O.preview(47,R.levelConfig(47)).threeStars,null);

const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert(html.includes('id="goalHelpButton"'),"Game view must expose a goal help button");
assert(html.indexOf("onboarding.js")<html.indexOf("app.js"),"Lesson model must load before UI");
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
assert(app.includes("function levelPreview("));
assert(app.includes("function showGoalHelp("));
assert(app.includes("function offerFirstLesson("));
assert(app.includes("offerFirstLesson(i,!!data);"));
assert(app.includes("if(resuming)return;"),"Don't interrupt resumed games");
console.log("Gameplay Clarity & Onboarding 2.0 tests passed.");
