"use strict";
/* Lotus Stream 1.0 — single playable, authored drop-and-collection pilot. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const R=require("../harmony/rules.js"),L=require("../harmony/lotus-stream.js"),
 H=require("../harmony/save-health.js"),O=require("../harmony/onboarding.js"),
 G=require("../harmony/goshuincho.js");
const check=(name,fn)=>{fn();console.log("PASS "+name);};
check("Level 61 is the only Lotus pilot; chapter 7 is marked as a pilot",()=>{
 const c=R.levelConfig(60);
 assert.equal(c.name,"First Lotus Stream");
 assert.deepEqual(c.goal,{type:"lotus",count:2});
 assert.deepEqual(c.lotus,L.normalize({version:1,starts:[36,40],exits:[43,47]}));
 assert.equal(c.chapter,7);
 assert.equal(R.levelConfig(59).goal.type,"mist");
 assert.equal(R.levelConfig(61).goal.type,"mist");
 assert.equal(G.chapter(6).title,"Lotus Stream · Pilot");
 assert.equal(O.lesson(60).key,"lotus-intro");
 assert.equal(O.preview(60,c,R.moveStarTargets).objective,"2 Lotus seeds");
 assert.deepEqual(R.moveStarTargets(c),{two:28,three:17});
});
check("Lotus descriptors reject impossible columns and malformed collection targets",()=>{
 assert.throws(()=>L.normalize({version:1,starts:[0],exits:[44]}),/reachable/);
 assert.throws(()=>L.normalize({version:1,starts:[36],exits:[36]}),/collection gate/);
 assert.throws(()=>L.normalize({version:2,starts:[],exits:[]}),/Unsupported/);
 assert.throws(()=>L.normalize({version:1,starts:[36,36],exits:[43]}),/starts/);
});
check("Each of 24 random pilot openings has two real match-based deliveries",()=>{
 for(let seed=1;seed<=24;seed++){
  const g=new R.Game(60,null,{seed:seed*217+6,directorMode:"v4"});
  assert.equal(g.lotusVersion,1);
  assert.equal(g.progress(),0);
  assert.deepEqual(g.board.map((p,i)=>L.isSeed(p)?i:-1).filter(i=>i>=0),[36,40]);
  assert.equal(R.scan(g.board).length,0);
  assert(R.validSwaps(g.board).length>=3);
  assert(H.validRun({level:60,data:g.save()}));
  const movesBefore=g.moves;
  const refused=g.swap(36,37);
  assert.equal(refused.ok,false);
  assert.equal(g.moves,movesBefore);
  assert.match(refused.reason,/Lotus seeds fall/);
  const delivered1=g.swap(37,44);
  assert.equal(delivered1.ok,true);
  assert.equal(delivered1.events.filter(e=>e.type==="lotus-delivery").length,1);
  assert.deepEqual(delivered1.events.find(e=>e.type==="lotus-delivery").delivered.map(d=>d.at),[43]);
  assert.equal(g.progress(),1);
  const save=g.save();
  assert(H.validRun({level:60,data:save}));
  const resumed=new R.Game(60,save,{fastRestore:true});
  assert.deepEqual(resumed.board,g.board);
  assert.deepEqual(resumed.lotus,g.lotus);
  assert.equal(resumed.lotusDelivered,1);
  assert.deepEqual(resumed.save(),save);
  const delivered2=resumed.swap(41,48);
  assert.equal(delivered2.ok,true);
  assert.deepEqual(delivered2.events.find(e=>e.type==="lotus-delivery").delivered.map(d=>d.at),[47]);
  assert.equal(resumed.progress(),2);
  assert.equal(resumed.complete,true);
  assert.equal(resumed.moves,movesBefore-2);
  assert.equal(resumed.board.some(L.isSeed),false);
  assert(H.validRun({level:60,data:resumed.save()}));
 }
});
check("A seed neither fuses nor grows and stays in its lane through shuffle",()=>{
 const g=new R.Game(60,null,{seed:27064});
 assert.equal(g.board[36].stage,0);
 assert.equal(g.grow(36,new Set(),true),false);
 assert.equal(R.scan(g.board).length,0);
 assert(R.validSwaps(g.board).every(([a,b])=>a!==36&&a!==40&&b!==36&&b!==40));
 let value=27064;
 const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 const shuffled=R.fairShuffle(g.board,random);
 assert.deepEqual(shuffled[36],g.board[36]);
 assert.deepEqual(shuffled[40],g.board[40]);
 assert.equal(R.scan(shuffled).length,0);
});
check("Lotus save guard rejects changing cargo, IDs and collected counts",()=>{
 const g=new R.Game(60,null,{seed:2739});
 const snapshot=g.save(),clone=()=>JSON.parse(JSON.stringify(snapshot));
 const corrupt=clone();corrupt.lotusDelivered=1;
 assert.equal(H.validRun({level:60,data:corrupt}),false);
 const corruptId=clone();corruptId.board[36].id=-9999;
 assert.equal(H.validRun({level:60,data:corruptId}),false);
 const corruptLane=clone();[corruptLane.board[36],corruptLane.board[38]]=[corruptLane.board[38],corruptLane.board[36]];
 assert.equal(H.validRun({level:60,data:corruptLane}),false);
 const wrongLevel=clone();
 assert.equal(H.validRun({level:61,data:wrongLevel}),false);
});
check("Historical Endless Garden level 61 round is never converted on resume",()=>{
 const legacy=new R.Game(60,null,{seed:9123,boardMechanics:{}});
 const previous=legacy.save();delete previous.lotusVersion;delete previous.lotus;delete previous.lotusDelivered;
 previous.mist=Array(49).fill(0);
 const old=R.endlessConfig(60,true,true,true,true,false);
 const resumed=new R.Game(60,previous,{fastRestore:true});
 assert.equal(resumed.lotusVersion,0);
 assert.equal(resumed.board.some(L.isSeed),false);
 assert.deepEqual(resumed.config.goal,old.goal);
 assert.equal(resumed.config.moves,old.moves);
 assert.deepEqual(resumed.board,legacy.board);
});
check("UI and educational assets are wired with visible receiver and seed cues",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../harmony/lotus-stream.css"),"utf8");
 assert(html.includes("lotus-stream.js?v="));
 assert(html.indexOf("lotus-stream.js?v=")<html.indexOf("rules.js?v="));
 assert(html.includes("lotus-stream.css"));
 assert(app.includes("lotus-seed-art")&&app.includes("lotus-collector"));
 assert(app.includes('case "lotus-delivery"'));
 assert(css.includes("prefers-reduced-motion:reduce"));
});
console.log("Lotus Stream 1.0 pilot unit checks passed.");
