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
const GAME_VERSION = "6.41.0";
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
// Additional obstacle-aware BOT. Unlike the generic goal bot, it values EACH
// cracked Sealed Stone layer / painted Daruma eye, not only the final clear.
// This is a stronger diagnostic counterfactual, NOT a human skill model.
function obstacleUnits(g,positions,type) {
  return positions.reduce((total,at) => total+
    (type==="sealedStone"?4-(g.sealed[at]||0):2-Math.min(2,g.daruma[at]||0)),0);
}
function specialistPlay(level,seed,mode) {
  const map={director3:"v3",director31:"v31",director311:"v311",director2:"v2",director:"v1",standard:"standard"};
  const g=new R.Game(level,null,{seed,directorMode:map[mode]||"v3"});
  const type=g.config.goal.type;
  assert(["daruma","sealedStone"].includes(type));
  const positions=g.board.flatMap((p,i)=>p&&p.family===type?[i]:[]);
  const totalUnits=positions.length*(type==="daruma"?2:4);
  const firstLegal=R.validSwaps(g.board).length;
  let moves=0,drought=0,maxGoalDrought=0,noGoalTurns=0;
  let damageDrought=0,maxDamageDrought=0,damageTurns=0,zeroLegalTurns=0;
  while(g.moves>0&&!g.complete) {
    const options=R.validSwaps(g.board);
    if(!options.length){zeroLegalTurns++;break;}
    const snapshot=g.save(),priorUnits=obstacleUnits(g,positions,type);
    const priorGoal=g.progress(),priorScore=g.score;
    const decisionMs=10500+(moves%4)*2200;
    let best=null;
    for(const [a,b] of options) {
      const trial=new R.Game(level,snapshot,{fastRestore:true});
      const result=trial.swap(a,b,{decisionMs});
      assert(result.ok);
      const deltaUnits=obstacleUnits(trial,positions,type)-priorUnits;
      const goalDelta=trial.progress()-priorGoal;
      const scoreDelta=trial.score-priorScore;
      let future=0;
      // Small tie-breaker: invest in developed ordinary pieces next to
      // fixed obstacles, without fabricating a guaranteed next turn.
      for(const pos of positions)if(trial.board[pos]?.family===type){
        for(const near of R.neighbors(pos)) {
          const p=trial.board[near];
          if(p&&p.stage>=3)future+=p.stage===4?40:15;
        }
      }
      const value=deltaUnits*6500+goalDelta*2000+
        scoreDelta*.05+future+Math.min(12,R.validSwaps(trial.board).length)*2;
      if(!best||value>best.value)best={a,b,value};
    }
    const outcome=g.swap(best.a,best.b,{decisionMs});
    assert(outcome.ok);
    moves++;
    const newUnits=obstacleUnits(g,positions,type);
    if(newUnits>priorUnits){damageTurns++;damageDrought=0;}else{
      damageDrought++;maxDamageDrought=Math.max(maxDamageDrought,damageDrought);
    }
    if(g.progress()>priorGoal)drought=0;
    else{drought++;noGoalTurns++;maxGoalDrought=Math.max(maxGoalDrought,drought);}
  }
  return {level,seed:seed>>>0,strategy:"obstacle-specialist",mode,goalType:type,won:g.complete,
    movesUsed:moves,movesBudget:g.config.moves,progress:g.progress(),target:g.target(),
    goalRatio:Math.min(1,g.progress()/g.target()),score:g.score,stars:g.stars(),
    initialLegalMoves:firstLegal,zeroLegalTurns,maxGoalDrought,noGoalTurns,
    damageTurns,damageUnits:obstacleUnits(g,positions,type),
    totalDamageUnits:totalUnits,maxDamageDrought};
}

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
  if (row.specialistBot) {
    if (row.specialistBot.wins<=Math.floor(trials/4)) result.push("LOW_OBSTACLE_SPECIALIST_COMPLETION");
    if (row.specialistBot.avgLongestDamageDrought>=Math.min(10,row.moves*.32))
      result.push("LONG_PARTIAL_DAMAGE_STAGNATION");
  } else if (goal.avgLongestProgressDrought>=Math.min(12,row.moves*.38))
    result.push("LONG_GOAL_STAGNATION");
  if (random.wins===0&&goal.wins>0) result.push("LARGE_RANDOM_VS_GOAL_GAP");
  // Chapter Identity 1.0 deliberately alternates Daruma missions with
  // four breathers and introduces a DIFFERENT stone layout at every stage.
  // These choices are verified by chapter tests, not per-level warning flags.
  // A center stone on level 31 is NOT evidence of a repeated layout.
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
    if (["daruma","sealedStone"].includes(R.levelConfig(level).goal.type)) {
      const run=specialistPlay(level,seed,opts.mode);
      assert.equal(run.seed,seed);
      assert.equal(run.zeroLegalTurns,0);
      assert(run.initialLegalMoves>=3);
      assert(run.movesUsed>=1&&run.movesUsed<=run.movesBudget);
      assert.equal(run.won,run.stars>0);
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
    const specialistRuns=subset.filter(r=>r.strategy==="obstacle-specialist");
    if(specialistRuns.length){
      row.specialistBot={...summarizeRuns(specialistRuns),
        avgDamageTurns:mean(specialistRuns,"damageTurns"),
        avgDamageUnits:mean(specialistRuns,"damageUnits"),
        avgLongestDamageDrought:mean(specialistRuns,"maxDamageDrought"),
        maxPossibleDamageUnits:specialistRuns[0].totalDamageUnits};
    }
    row.flags=flags(row,opts.trials);
    return row;
  });
  const obstacles=opts.levels.filter(i=>["daruma","sealedStone"].includes(R.levelConfig(i).goal.type)).length;
  assert.equal(all.length,(opts.levels.length*STRATEGIES.length+obstacles)*opts.trials);
  return {version:VERSION,gameVersion:GAME_VERSION,
    methodology:"Actual HarmonyRules.Game; paired seeded random and goal preview bots, plus an obstacle damage-aware preview bot for Daruma and Sealed Stone goals. NO human win-rate inference.",
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
    "goalNearMissFailures","randomAvgProgress","specialistWins","specialistMedianMoves","specialistThreeStars","specialistAvgDamageTurns","specialistAvgLongestDamageDrought","darumaCells","stoneCells","flags"];
  const lines=[columns.join(",")];
  for(const x of report.summary) {
    const g=x.goalBot,r=x.randomBot;
    lines.push([x.level,x.chapter,x.objective,x.target,x.moves,x.starThresholds.three,x.starThresholds.two,
      r.wins,g.wins,g.medianWinningMoves,g.stars.three,g.stars.two,g.stars.one,
      g.avgGoalRatio,g.avgLongestProgressDrought,g.nearMissFailures,r.avgGoalRatio,
      x.specialistBot?.wins??null,x.specialistBot?.medianWinningMoves??null,x.specialistBot?.stars.three??null,
      x.specialistBot?.avgDamageTurns??null,x.specialistBot?.avgLongestDamageDrought??null,
      x.darumaPositions.join("|"),x.stonePositions.join("|"),x.flags.join("|")].map(csvValue).join(","));
  }
  return lines.join("\n")+"\n";
}
function makeMarkdown(report) {
  const o=report.options,n=o.trials;
  const lines=[
    "# Difficulty & Fairness Audit 3.0 – Japanese Harmony "+GAME_VERSION+"",
    "",
    "**Reproducible diagnostic report. Not a human-playtest result, not an estimate of player win rates.**",
    "",
    "Seed: "+o.seed+" · attempts per bot per level: "+n+" · refill: "+o.mode+
    " · strategies: random / goal-oriented one-turn-preview.",
    "",
    "## How to interpret",
    "",
    "The goal bot simulates legal next moves with full deterministic board knowledge; it is NOT a human beginner.",
    "Obstacle specialist separately values each damaged stone layer / Daruma eye and cannot predict human choices.",
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
  lines.push("","## Obstacle damage-aware bot (additional paired baseline)","",
    "| Level | Goal | Specialist wins | Specialist median moves | Specialist 3★ | Mean turns with damage | Longest damage drought (mean) |",
    "|---:|---|---:|---:|---:|---:|---:|");
  for(const x of report.summary)if(x.specialistBot){
    const b=x.specialistBot;
    lines.push("| "+x.level+" | "+x.objective+" ×"+x.target+" | "+b.wins+"/"+n+" | "+
      (b.medianWinningMoves??"—")+" | "+b.stars.three+" | "+b.avgDamageTurns+" | "+
      b.avgLongestDamageDrought+" |");
  }
  lines.push("","## Screening flags","");
  const flagged=report.summary.filter(x=>x.flags.length);
  if(!flagged.length)lines.push("No flags under current diagnostic thresholds. This does not prove balance.");
  for(const x of flagged)lines.push("- Nivå "+x.level+": "+x.flags.join(", "));
  lines.push("","## Next step: human playtesting","",
    "On each flagged level, record player experience, start seed (if available), valid attempts, win/loss,",
    "turns when the objective or individual obstacle advanced, stars, and whether an opportunity was understandable.",
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
  console.log("Level | Goal | Budget | 3star/2star | Random wins | Goal wins | Specialist wins | Goal median moves | 3/2/1 star goal | Flags");
  for(const x of report.summary) {
    const g=x.goalBot;
    console.log([x.level,x.objective+" "+x.target,x.moves,
      x.starThresholds.three+"/"+x.starThresholds.two,
      x.randomBot.wins+"/"+opts.trials,g.wins+"/"+opts.trials,
      x.specialistBot?x.specialistBot.wins+"/"+opts.trials:"—",g.medianWinningMoves??"—",
      g.stars.three+"/"+g.stars.two+"/"+g.stars.one,x.flags.join(",")||"—"].join(" | "));
  }
  console.log("Audit flags: "+report.summary.filter(x=>x.flags.length).length+"/"+report.summary.length+" levels.");
  console.log("Reports: "+root+".{json,csv,md}");
}
if(require.main===module)main(process.argv.slice(2));
module.exports={options,analyze,flags,makeCsv,makeMarkdown,summarizeRuns};
