#!/usr/bin/env node
"use strict";
/**
 * Japanese Harmony – Difficulty & Fairness Audit 3.0 (v6.39.0).
 * Read-only seeded simulation of the SHIPPED rules. No game/save changes.
 * Bot success is not a human win rate; star metrics are conditional on wins.
 *
 * node daisugi-bloom/tools/harmony-difficulty-fairness-audit.cjs
 * node daisugi-bloom/tools/harmony-difficulty-fairness-audit.cjs --trials 3 --levels 21-40 --out /tmp/harmony-audit
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../harmony/rules.js");
const Lab = require("../harmony/diagnostics.js").create(R);

const VERSION = "difficulty-fairness-3.0";
const GAME_VERSION = "6.39.0";
const STRATEGIES = ["random", "goal"];
const parseLevels = value => {
  const match = /^(\d+)-(\d+)$/.exec(value);
  if (!match) throw Error("--levels must be first-last, e.g. 1-40");
  const first = Number(match[1]), last = Number(match[2]);
  if (first < 1 || last > 40 || first > last) throw Error("--levels must stay within 1-40");
  return Array.from({length:last-first+1}, (_,i) => first-1+i);
};
function options(argv) {
  const out = {trials:8,seed:20261025,mode:"director3",levels:parseLevels("1-40"),out:"daisugi-bloom/reports"};
  for (let i=0;i<argv.length;i+=2) {
    const flag=argv[i],value=argv[i+1];
    if (!value) throw Error("Missing value for "+flag);
    switch(flag) {
      case "--trials":out.trials=Number(value);break;
      case "--seed":out.seed=Number(value);break;
      case "--mode":out.mode=value;break;
      case "--levels":out.levels=parseLevels(value);break;
      case "--out":out.out=value;break;
      default:throw Error("Unknown flag "+flag);
    }
  }
  if (!Number.isInteger(out.trials)||out.trials<1||out.trials>128) throw Error("Trials must be 1-128");
  if (!Number.isSafeInteger(out.seed)||out.seed<0||out.seed>0xffffffff) throw Error("Seed must be uint32");
  if (!Lab.MODES.includes(out.mode)) throw Error("Unsupported mode: "+out.mode);
  return out;
}
const round = (n,places=2) => Number(n.toFixed(places));
const median = a => {
  if (!a.length) return null;
  const s=a.slice().sort((x,y)=>x-y);
  return s[Math.floor(s.length/2)];
};
const mean = (a,field) => round(a.reduce((sum,x)=>sum+x[field],0)/a.length);
function summarizeRuns(sampled) {
  const won=sampled.filter(r=>r.won);
  return {
    samples:sampled.length,wins:won.length,
    diagnosticWinFraction:round(won.length/sampled.length,3),
    medianWinningMoves:median(won.map(r=>r.movesUsed)),
    medianFailedProgress:median(sampled.filter(r=>!r.won).map(r=>r.goalRatio)),
    avgGoalRatio:mean(sampled,"goalRatio"),
    avgLongestProgressDrought:mean(sampled,"maxGoalDrought"),
    avgNoProgressTurns:mean(sampled,"noGoalTurns"),
    avgInitialLegalSwaps:mean(sampled,"initialLegalMoves"),
    nearMissFailures:sampled.filter(r=>!r.won&&r.goalRatio>=0.8).length,
    winsWithinThreeMoves:won.filter(r=>r.movesUsed<=3).length,
    stars:{one:won.filter(r=>r.stars===1).length,two:won.filter(r=>r.stars===2).length,three:won.filter(r=>r.stars===3).length},
    avgRemainingMovesOnWin:won.length?round(won.reduce((sum,r)=>sum+(r.movesBudget-r.movesUsed),0)/won.length):null
  };
}
function flags(row,trials) {
  const result=[];
  const goal=row.goalBot,random=row.randomBot;
  // Screening flags, not declarations of objective difficulty or player fairness.
  if (goal.wins<=Math.floor(trials/4)) result.push("LOW_GOAL_BOT_COMPLETION");
  if (goal.wins>=Math.ceil(trials*.75)&&goal.medianWinningMoves!==null&&goal.medianWinningMoves<=3)
    result.push("VERY_EARLY_COMPLETION");
  if (goal.wins>=Math.ceil(trials*.5)&&goal.stars.three===0)
    result.push("NO_3STAR_GOAL_BOT_WINS");
  if (goal.avgLongestProgressDrought>=Math.min(12,row.moves*.38))
    result.push("LONG_GOAL_STAGNATION");
  if (random.wins===0&&goal.wins>0) result.push("LARGE_RANDOM_VS_GOAL_GAP");
  // Coverage concerns are design facts, separate from simulation heuristics.
  if (row.chapter===3&&row.objective!=="daruma") result.push("DARUMA_CHAPTER_FALLBACK_GOAL");
  if (row.chapter===4&&row.level<=33&&row.stonePositions.join(",")==="24") 
    result.push("STONE_POSITION_REPEATED");
  return result;
}
function analyze(opts) {
  const all=[];
  for(const level of opts.levels) for(let trial=0;trial<opts.trials;trial++) {
    const seed=Lab.sampleSeed(opts.seed,level,trial);
    // Pair the SAME level/trial start seed across bot strategies.
    for(const strategy of STRATEGIES) {
      const run=Lab.play(level,seed,strategy,opts.mode);
      const cfg=R.levelConfig(level);
      assert.equal(run.seed,seed);
      assert.equal(run.goalType,cfg.goal.type);
      assert.equal(run.movesBudget,cfg.moves);
      assert(run.movesUsed>=1&&run.movesUsed<=cfg.moves,"Invalid move accounting on level "+(level+1));
      assert(run.initialLegalMoves>=3,"Unfair starting board on level "+(level+1));
      assert.equal(run.zeroLegalTurns,0,"No valid swap on level "+(level+1));
      assert(run.goalRatio>=0&&run.goalRatio<=1,"Invalid objective ratio");
      assert.equal(run.won,run.stars>0,"Stars must require level completion");
      assert(!run.won||run.progress>=run.target,"Won without goal");
      if (cfg.goal.type==="sealedStone") assert(run.progress<=cfg.goal.count);
      all.push({...run,trial});
    }
  }
  const summary=opts.levels.map(level=>{
    const cfg=R.levelConfig(level),subset=all.filter(r=>r.level===level);
    const row={
      level:level+1,chapter:Math.floor(level/10)+1,
      objective:cfg.goal.type,target:cfg.goal.count,moves:cfg.moves,
      starThresholds:R.moveStarTargets(cfg),
      families:R.levelFamilyCount(level),
      darumaPositions:R.darumaPositions?R.darumaPositions(level):level===20?[24]:level===22?[17,31]:level===25?[16,32]:[],
      stonePositions:R.sealedPositions(level),
      randomBot:summarizeRuns(subset.filter(r=>r.strategy==="random")),
      goalBot:summarizeRuns(subset.filter(r=>r.strategy==="goal"))
    };
    row.flags=flags(row,opts.trials);
    return row;
  });
  assert.equal(all.length,opts.levels.length*opts.trials*STRATEGIES.length);
  return {version:VERSION,gameVersion:GAME_VERSION,
    methodology:"Actual HarmonyRules.Game; paired seeded runs, random and 1-turn-preview goal bot; NO human difficulty or completion inference.",
    options:{levels:opts.levels.map(i=>i+1),trials:opts.trials,seed:opts.seed,mode:opts.mode,strategies:STRATEGIES},
    summary,allRuns:all};
}
const csvValue = v => {
  const s=String(v===null?"":v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
};
function makeCsv(report) {
  const columns=["level","chapter","goal","target","budget","threeStarByMove","twoStarByMove","randomWins","goalWins",
    "goalMedianWinMoves","goalThreeStars","goalTwoStars","goalOneStar","goalAvgProgress","goalAvgMaxDrought",
    "goalNearMissFailures","randomAvgProgress","darumaCells","stoneCells","flags"];
  const lines=[columns.join(",")];
  for(const x of report.summary) {
    const g=x.goalBot,r=x.randomBot;
    lines.push([x.level,x.chapter,x.objective,x.target,x.moves,x.starThresholds.three,x.starThresholds.two,
      r.wins,g.wins,g.medianWinningMoves,g.stars.three,g.stars.two,g.stars.one,
      g.avgGoalRatio,g.avgLongestProgressDrought,g.nearMissFailures,r.avgGoalRatio,
      x.darumaPositions.join("|"),x.stonePositions.join("|"),x.flags.join("|")].map(csvValue).join(","));
  }
  return lines.join("\n")+"\n";
}
function makeMarkdown(report) {
  const o=report.options,n=o.trials;
  const lines=[
    "# Difficulty & Fairness Audit 3.0 – Japanese Harmony 6.39.0",
    "",
    "**Reproducible diagnostic report. Not a human-playtest result, not an estimate of player win rates.**",
    "",
    "Seed: "+o.seed+" · attempts per bot per level: "+n+" · refill: "+o.mode+
    " · strategies: random / goal-oriented one-turn-preview.",
    "",
    "## How to interpret",
    "",
    "The goal bot simulates legal next moves with full deterministic board knowledge; it is NOT a human beginner.",
    "Random-bot wins are a control only, not a target player success rate. A winning-move median includes wins only.",
    "3-star thresholds are the first player-move count earning 3 stars; 2-star thresholds show the last eligible move.",
    "Flags indicate topics needing design inspection or human replays, not proven balance defects.",
    "",
    "## Level-by-level",
    "",
    "| Nivå | Mål | Drag | ★★★ ≤ | ★★ ≤ | Slump | Målbot | Median målbot | ★★★/★★/★ (målbot) | Signaler |",
    "|---:|---|---:|---:|---:|---:|---:|---:|---|---|"
  ];
  for(const x of report.summary) {
    const g=x.goalBot;
    lines.push("| "+x.level+" | "+x.objective+" ×"+x.target+" | "+x.moves+" | "+x.starThresholds.three+
      " | "+x.starThresholds.two+" | "+x.randomBot.wins+"/"+n+" | "+g.wins+"/"+n+
      " | "+(g.medianWinningMoves===null?"—":g.medianWinningMoves)+" | "+
      g.stars.three+"/"+g.stars.two+"/"+g.stars.one+" | "+(x.flags.join(", ")||"—")+" |");
  }
  lines.push("","## Screening flags","");
  const flagged=report.summary.filter(x=>x.flags.length);
  if(!flagged.length)lines.push("No flags under current diagnostic thresholds. This does not prove balance.");
  for(const x of flagged)lines.push("- Nivå "+x.level+": "+x.flags.join(", "));
  lines.push("","## Next step: human playtesting","",
    "On each flagged level, record player experience, start seed (if available), valid attempts, win/loss,",
    "turns when the objective advanced, stars, and whether an opportunity was understandable.",
    "Test the specific goal, not just whether the board had valid swaps.",
    "Do not change move budgets or star thresholds based on eight diagnostic bots alone.","");
  return lines.join("\n");
}
function main(argv) {
  const opts=options(argv),report=analyze(opts);
  const base=path.resolve(opts.out);
  fs.mkdirSync(base,{recursive:true});
  const root=path.join(base,"difficulty-fairness-3.0");
  fs.writeFileSync(root+".json",JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(root+".csv",makeCsv(report));
  fs.writeFileSync(root+".md",makeMarkdown(report));
  console.log("Japanese Harmony "+GAME_VERSION+" · Difficulty & Fairness Audit 3.0 · "+report.allRuns.length+" seeded games");
  console.log("Level | Goal | Budget | 3star/2star | Random wins | Goal wins | Goal median moves | 3/2/1 star goal | Flags");
  for(const x of report.summary) {
    const g=x.goalBot;
    console.log([x.level,x.objective+" "+x.target,x.moves,
      x.starThresholds.three+"/"+x.starThresholds.two,
      x.randomBot.wins+"/"+opts.trials,g.wins+"/"+opts.trials,g.medianWinningMoves??"—",
      g.stars.three+"/"+g.stars.two+"/"+g.stars.one,x.flags.join(",")||"—"].join(" | "));
  }
  console.log("Audit flags: "+report.summary.filter(x=>x.flags.length).length+"/"+report.summary.length+" levels.");
  console.log("Reports: "+root+".{json,csv,md}");
}
if(require.main===module)main(process.argv.slice(2));
module.exports={options,analyze,flags,makeCsv,makeMarkdown,summarizeRuns};
