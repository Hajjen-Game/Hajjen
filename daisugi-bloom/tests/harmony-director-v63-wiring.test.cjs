"use strict";
/* Release guard: active game, Puzzle Architect, labs and UI use 6.3.
 * Old 6.2 code, saved-mode restoration and comparative diagnostics remain.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(base,name),"utf8");
const html=read("index.html"),app=read("harmony/app.js");
const rules=read("harmony/rules.js"),diag=read("harmony/diagnostics.js");
const architect=read("harmony/puzzle-architect.js"),lab=read("harmony/difficulty-lab.js");
const full=read("harmony/difficulty-lab-v2.js");
const cli=read("tools/harmony-full-journey-audit.cjs");
const puzzleHtml=read("puzzle-lab/index.html"),puzzleWorker=read("puzzle-lab/worker.js");
const afterglow=read("harmony/omamori-afterglow.js"),prev=read("harmony/director-v62.js"),next=read("harmony/director-v63.js");
const check=(name,ok)=>{assert(ok,name);console.log("PASS "+name);};
check("6.3 loads after retained 6.2 and before live Rules",html.indexOf("director-v62.js")<html.indexOf("director-v63.js")&&html.indexOf("director-v63.js")<html.indexOf("rules.js"));
const picker=html.match(/<select id="gameDirectorMode"[\s\S]*?<\/select>/)?.[0]||"";
check("Current player engine selector contains only Automatic and 6.3",
 JSON.stringify([...picker.matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]))===JSON.stringify(["auto","v63"]));
check("Play mode UI and current Journey default use v63",
 app.includes('VISIBLE_PLAY_MODES=new Set(["auto","v63"])')&&
 app.includes('useJourney?{directorMode:"v63"')&&
 app.includes('directorMode:save.playMode==="auto"?"v63":save.playMode')&&
 app.includes("OBJECTIVES 6.3"));
check("Rules are actually routed to 6.3, and older 6.2 rounds are preserved",
 rules.includes('Director63.choose(')&&rules.includes('Director63.assess(')&&
 rules.includes('previous.directorMode==="v63"?"v63":previous.directorMode==="v62"?"v62"'));
check("6.3 sees current subgoals, both health arrays and bounded refill telemetry",
 rules.includes("goalParts:this.goalParts()")&&
 rules.includes("darumaHealth:this.daruma,sealedHealth:this.sealed")&&
 rules.includes('detailed-telemetry-budget'));
check("6.3 handles unfinished subgoals without invented matches",
 next.includes("function activeGoals(")&&next.includes("function opportunities(")&&
 next.includes("candidate.autoMatches!==0")&&next.includes("const shortlist="));
check("Historical Director 6.2 has its own unchanged implementation",
 prev.includes("root.HarmonyDirector62=api")&&next.includes("root.HarmonyDirector63=api"));
check("Harmony Intelligence compares 6.2 and 6.3, not 4.0 as current",
 app.includes('["compare63","Compare Director 6.2 vs Harmony Director 6.3"]')&&
 diag.includes('director63:"Harmony Director 6.3"')&&
 app.includes('["director63","Only Harmony Director 6.3"]'));
check("Puzzle Architect and diagnostic bots default to 6.3",
 architect.includes('"v62","v63"')&&
 architect.includes('directorMode??"v63"')&&
 lab.includes('directorMode:options.directorMode??"v63"')&&
 full.includes('const modes=options.compareStandard?["v63","standard"]:["v63"]'));
check("Full Journey report now measures and names v63",
 cli.includes('x.mode==="v63"')&&cli.includes("Director 6.3"));
check("Puzzle Lab worker and selector load 6.3",
 puzzleWorker.includes('"../harmony/director-v63.js"')&&
 puzzleHtml.includes('value="v63" selected')&&
 puzzleHtml.indexOf("director-v63.js")<puzzleHtml.indexOf("rules.js"));
check("Omamori Afterglow recognizes current 6.3",
 afterglow.includes('["v4","v63"].includes(mode)'));
console.log("PASS Director 6.3 release-wide consistency and legacy compatibility");
