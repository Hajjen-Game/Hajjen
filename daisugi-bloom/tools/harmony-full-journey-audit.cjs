"use strict";
/* Difficulty Lab 2.0 — read-only reproducible Journey audit runner.
 * Smoke: all 40 approved levels, bounded turns. Full: complete move budgets.
 * Neither path reads or writes a real player's storage/progression.
 */
const fs=require("node:fs"),path=require("node:path");
const Lab=require("../harmony/difficulty-lab-v2.js");
const opts={
 smoke:process.argv.includes("--smoke"),
 compareStandard:process.argv.includes("--compare-standard")
};
for(const arg of process.argv.slice(2)){
 if(arg==="--smoke"||arg==="--compare-standard")continue;
 const [key,value,...extra]=arg.slice(2).split("=");
 if(!arg.startsWith("--")||!value||extra.length)throw Error("Invalid option: "+arg);
 if(["seeds","from","to","max-candidates","max-turns","base-seed"].includes(key)){
  if(!/^\d+$/.test(value))throw Error("Expected positive integer for "+key);
  opts[{"max-candidates":"maxCandidates","max-turns":"maxTurns","base-seed":"baseSeed"}[key]||key]=Number(value);
 }else if(key==="strategies"){
  const list=value.split(",");
  if(!list.length||list.some(x=>!["random","greedy","objective","spatial"].includes(x)))
   throw Error("Unknown strategy in "+value);
  opts.strategies=list;
 }else if(key==="out")opts.out=value;
 else throw Error("Unknown option: "+arg);
}
const auditOptions={
 from:opts.from??1,to:opts.to??40,seeds:opts.seeds??(opts.smoke?1:4),
 maxCandidates:opts.maxCandidates??(opts.smoke?3:5),
 maxTurns:opts.maxTurns??(opts.smoke?12:undefined),
 baseSeed:opts.baseSeed??20261105,
 strategies:opts.strategies??["random","objective"],
 compareStandard:opts.compareStandard,
 onLevel:result=>{
  const rows=result.runs.filter(x=>x.mode==="v63");
  const wins=rows.filter(x=>x.won).length;
  console.log("LEVEL "+String(result.level).padStart(2,"0")+" "+result.name+
   ": "+wins+"/"+rows.length+" diagnostic wins, "+
   result.warnings.map(w=>w.code).join(","));
 }
};
console.log("Difficulty Lab 2.0 "+(opts.smoke?"bounded 40-level smoke":"full authored Journey")+" audit");
const start=process.hrtime.bigint(),report=Lab.audit(auditOptions);
const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
report.execution={elapsedMs:Math.round(elapsedMs),mode:opts.smoke?"smoke":"full"};
const lines=[
 "# Japanese Harmony — Difficulty Lab 2.0 · "+(opts.smoke?"bounded smoke":"full Journey")+" audit",
 "",
 "> Automated, bounded bot diagnostics. Not a human win rate, mathematical proof of solvability, or a fairness verdict.",
 "",
 "## Coverage",
 "",
 "- Approved levels: "+report.scope.first+"–"+report.scope.last+
  " ("+report.scope.levels+" levels, "+report.scope.blueprints+" hand-authored openings)",
 "- Director: 6.3"+(report.settings.compareStandard?" paired with Standard":""),
 "- Seeds per level: "+report.settings.seeds+
  " (deterministic, paired across strategies and Directors)",
 "- Strategies: "+report.settings.strategies.join(", ")+
  "; candidates: "+report.settings.maxCandidates+
  "; turn cap: "+report.settings.maxTurns,
 "- Runs: "+report.totals.runs+" (v63 only), wins: "+report.totals.diagnosticWins+
  ", shuffles: "+report.totals.shuffles+", no-legal flags: "+report.totals.noLegal,
 "- Average objective completion: "+report.totals.avgObjectiveCompletion+
  "; objective work including partial Daruma/Stone hits: "+report.totals.avgWorkCompletion,
 "- Runtime: "+report.execution.elapsedMs+" ms",
 "",
 "## Chapter summary",
 "",
 "| Levels | Bot runs | Wins | Average goal work | Average work drought | Auto-shuffles | Review signals |",
 "|---|---:|---:|---:|---:|---:|---:|"
];
for(const c of report.chapters)lines.push("| "+((c.chapter-1)*10+1)+"–"+(c.chapter*10)+" | "+
 c.attempts+" | "+c.diagnosticWins+" | "+c.avgObjectiveWork+
 " | "+c.avgWorkDrought+" | "+c.shuffles+" | "+c.warnings+" |");
lines.push("","## Per-level diagnostics","",
 "| Level | Opening | Budget | Legal opening moves | Bot wins | Goal work | Partial hits | Shuffles | Longest work drought | Signals |",
 "|---|---|---:|---:|---:|---:|---:|---:|---:|---|");
for(const l of report.levels){
 const runs=l.runs.filter(x=>x.mode==="v63"),wins=runs.filter(x=>x.won).length;
 const mean=fn=>Math.round(runs.reduce((n,x)=>n+fn(x),0)/runs.length*100)/100;
 lines.push("| "+l.level+" "+l.name.replaceAll("|","/")+" | "+l.opening+
  " | "+l.moves+" | "+l.initialLegal+" | "+wins+"/"+runs.length+
  " | "+mean(x=>x.objectiveDetails.work)+
  " | "+mean(x=>x.partialBlockerHits)+" | "+runs.reduce((n,x)=>n+x.shuffles,0)+
  " | "+Math.max(...runs.map(x=>x.longestWorkDrought))+
  " | "+(l.warnings.map(x=>x.code).join(", ")||"—")+" |");
}
lines.push("","## Investigation queue","",
 "These are leads for playtesting and deeper analysis, not automatic prescriptions to change the approved board.","");
const severity={blocker:0,investigate:1,review:2};
const risks=report.warnings.slice().sort((a,b)=>(severity[a.severity]??9)-(severity[b.severity]??9)||a.level-b.level);
if(!risks.length)lines.push("No configured signals were triggered in this bounded sample.");
else for(const r of risks)lines.push("- **Level "+r.level+" · "+r.code+" ("+r.severity+")** — "+r.evidence);
if(report.settings.compareStandard){
 lines.push("","## Director 6.3 vs Standard (paired seeds)","");
 for(const l of report.levels){
  const c=l.comparison;
  lines.push("- Level "+l.level+": "+(c.paired?"same starting board":"unpaired opening!")+
   "; wins 6.3 "+c.v63WinRate+" vs Standard "+c.standardWinRate+
   "; goal work "+c.v63Work+" vs "+c.standardWork+
   "; shuffles "+c.v63Shuffles+" vs "+c.standardShuffles);
 }
}
lines.push("","## Method and limitations","",
 "- The first four tutorials and level 10 use their **actual seeded** openings. The other 35 levels use their authored 7×7 family layouts. No synthetic substitutes.",
 "- All bots make real legal swaps through HarmonyRules.Game with the selected Director and genuine random refills. Paired seeds are reused across agents.",
 "- **Objective completion** counts only completed requirements. **Goal work** also counts partial damage to Daruma and Sealed Stones toward their blocker objectives.",
 "- A work drought excludes turns that partially damage tracked blockers; it is not the same as a score drought.",
 "- Near-deadlock means at most two legal swaps after a turn. An auto-shuffle is counted only when the real game emitted a shuffle event.",
 "- Early wins, no bot wins, seed spread and outcome divergences are *review flags*, not automatic balancing changes.",
 "- Human understanding, puzzle elegance, intended solution count and 24-hour retention remain unknown. Collect voluntary player tests.",
 "");
const dir=path.resolve(opts.out??path.join(__dirname,"..","reports","difficulty-lab-2-"+(opts.smoke?"smoke":"full")));
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,"journey-audit.json"),JSON.stringify(report,null,2)+"\n","utf8");
fs.writeFileSync(path.join(dir,"journey-audit.md"),lines.join("\n")+"\n","utf8");
console.log("Wrote "+path.join(dir,"journey-audit.json"));
console.log("Wrote "+path.join(dir,"journey-audit.md"));
console.log("SUMMARY "+JSON.stringify({coverage:report.scope,totals:report.totals,signals:report.warnings.length,elapsedMs:report.execution.elapsedMs}));
