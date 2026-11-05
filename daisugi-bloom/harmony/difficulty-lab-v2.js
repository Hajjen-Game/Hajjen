/* Japanese Harmony — Difficulty Lab 2.0 · Full Journey Audit
 * All 40 approved levels; actual authored/seeded openings and genuine swaps.
 * Offline diagnostic only: no profile writes, score awards or gameplay hooks.
 */
(function(root){
"use strict";
const Lab=root.HarmonyDifficultyLab||(typeof require==="function"?require("./difficulty-lab.js"):null);
const Architect=root.HarmonyPuzzleArchitect||(typeof require==="function"?require("./puzzle-architect.js"):null);
const Rules=root.HarmonyRules||(typeof require==="function"?require("./rules.js"):null);
const Journey=root.HarmonyJourneyDrafts||(typeof require==="function"?require("./journey-levels-v2.js"):null);
const Openings=root.HarmonyJourneyAuthoredOpenings||(typeof require==="function"?require("./journey-authored-openings.js"):null);
if(!Lab||!Architect||!Rules||!Journey||!Openings)throw Error("Difficulty Lab 2.0 dependencies missing");
const VERSION=2,COUNT=40,STRATEGIES=Object.freeze(["random","objective","greedy","spatial"]);
const round=(n,d=3)=>Math.round(n*10**d)/10**d;
const sum=a=>a.reduce((v,n)=>v+n,0);
const avg=(rows,key)=>rows.length?round(sum(rows.map(key))/rows.length):null;
const between=(n,lo,hi,name)=>{if(!Number.isInteger(n)||n<lo||n>hi)throw Error(name+" must be "+lo+"–"+hi);return n;};
function descriptor(index){
 if(!Number.isInteger(index)||index<0||index>=COUNT)throw Error("Published Journey level must be 1–40");
 const recipe=Journey.get(index),blueprint=Openings.get(index);
 if(!recipe)throw Error("Missing published Journey recipe "+(index+1));
 // 1–4 and 10 retain their official seeded tutorial/opening rather than
 // synthesizing unrelated author-boards for the sake of an audit.
 return {index,recipe,blueprint,opening:blueprint?"hand-authored":"seeded"};
}
function officialGame(entry,seed,directorMode){
 return entry.blueprint?
  Architect.build(Rules,entry.blueprint,{seed,directorMode}):
  new Rules.Game(entry.index,null,{seed,directorMode,
   journeyDiagnostic:true,levelRecipe:entry.recipe});
}
const hp=game=>({
 daruma:sum(game.daruma||[]),sealedStone:sum(game.sealed||[])
});
function goalParts(game){
 const parts=typeof game.goalParts==="function"?game.goalParts():
  [{type:game.config.goal.type,count:game.target(),progress:game.progress()}];
 return parts.map(x=>({type:x.type,target:x.count,complete:Math.min(x.count,Math.max(0,x.progress))}));
}
function fractions(game,initialHealth){
 const current=hp(game),parts=goalParts(game);
 const enhanced=parts.map(p=>{
  const ordinary=p.complete/Math.max(1,p.target);
  const hits=(p.type==="daruma"||p.type==="sealedStone")?
   Math.max(0,(initialHealth[p.type]||0)-(current[p.type]||0)):0;
  const partial=(p.type==="daruma"||p.type==="sealedStone")&&initialHealth[p.type]>0?
   hits/initialHealth[p.type]:ordinary;
  return {...p,ratio:round(Math.min(1,ordinary)),workRatio:round(Math.min(1,Math.max(ordinary,partial)))};
 });
 return {parts:enhanced,completed:round(avg(enhanced,x=>x.ratio)||0),
  work:round(avg(enhanced,x=>x.workRatio)||0),
  health:current};
}
function makeObserver(entry){
 let start=null,last=null,turns=0,drought=0,workDrought=0,damageTurns=0,workTurns=0;
 let longestWorkDrought=0,nearDeadlockTurns=0,zeroLegalAfterMove=0;
 let firstWorkTurn=null,firstHitTurn=null,totalHits=0,refillStart=0,selectionStart=0;
 let startSignature="",openingMatches=0;
 const onStart=(game,info)=>{
  if(game.level!==entry.index||game.levelRecipe?.id!==entry.recipe.id)
   throw Error("Audit must use exact published Puzzle Architect recipe");
  const health=hp(game);
  start=fractions(game,health);
  last=start;
  openingMatches=Rules.scan(game.board).length;
  startSignature=game.board.map(p=>p?String(p.family)+":"+String(p.stage):"-").join("|");
  refillStart=game.directorRefills||0;
  selectionStart=game.directorSelections||0;
  if(info.initialLegal<1||openingMatches)throw Error("Unsafe published opening at level "+(entry.index+1));
 };
 const onTurn=(game,info)=>{
  turns++;
  const current=fractions(game,start.health),damage=
   Math.max(0,last.health.daruma-current.health.daruma)+
   Math.max(0,last.health.sealedStone-current.health.sealedStone);
  totalHits+=damage;
  if(damage>0){damageTurns++;if(firstHitTurn===null)firstHitTurn=info.turn;}
  if(current.completed>last.completed+1e-9)drought=0;else drought++;
  if(current.work>last.work+1e-9){workTurns++;workDrought=0;
   if(firstWorkTurn===null)firstWorkTurn=info.turn;
  }else{workDrought++;longestWorkDrought=Math.max(workDrought,longestWorkDrought);}
  if(info.legal<=2&&!game.complete)nearDeadlockTurns++;
  if(info.legal===0&&!game.complete)zeroLegalAfterMove++;
  last=current;
 };
 const finish=(game,run)=>({
  ...run,
  level:entry.index+1,recipeId:entry.recipe.id,opening:entry.opening,
  openingMatches,openingSignature:startSignature,
  objectiveDetails:fractions(game,start.health),
  partialBlockerHits:totalHits,damageTurns,firstPartialHitTurn:firstHitTurn,
  meaningfulWorkTurns:workTurns,firstWorkTurn,
  longestWorkDrought,nearDeadlockTurns,zeroLegalAfterMove,
  directorRefills:(game.directorRefills||0)-refillStart,
  directorSelections:(game.directorSelections||0)-selectionStart
 });
 return {onStart,onTurn,finish};
}
function auditRun(entry,options={}){
 const seeds=between(options.seeds??3,1,50,"Seeds");
 const agents=options.strategies??["random","objective"];
 if(!Array.isArray(agents)||!agents.length||new Set(agents).size!==agents.length||
    !agents.every(x=>STRATEGIES.includes(x)))throw Error("Choose unique valid diagnostic strategies");
 const modes=options.compareStandard?["v63","standard"]:["v63"];
 const baseSeed=between(options.baseSeed??20261105,0,0xffffffff,"Base seed");
 const maxCandidates=between(options.maxCandidates??5,3,40,"Candidate limit");
 const maxTurns=between(options.maxTurns??entry.recipe.moves,1,120,"Max turns");
 const runs=[];
 for(let n=0;n<seeds;n++){
  const seed=(baseSeed+Math.imul(entry.index,197)+Math.imul(n,7919))>>>0;
  for(const mode of modes)for(const strategy of agents){
   const observer=makeObserver(entry);
   let finalGame=null;
   const raw=Lab.play(Rules,Architect,entry.blueprint,{
    seed,strategy,directorMode:mode,maxCandidates,maxTurns,
    gameFactory:(seed,directorMode)=>officialGame(entry,seed,directorMode),
    onStart:observer.onStart,onTurn:observer.onTurn,
    onFinish:game=>{finalGame=game;}
   });
   runs.push({mode,...observer.finish(finalGame,raw)});
  }
 }
 const primary=runs.filter(x=>x.mode==="v63");
 const byStrategy=Object.fromEntries(agents.map(strategy=>{
  const rows=primary.filter(x=>x.strategy===strategy);
  return { ...Lab.summarize(rows),
   avgWorkCompletion:avg(rows,x=>x.objectiveDetails.work),
   avgPartialBlockerHits:avg(rows,x=>x.partialBlockerHits),
   avgLongestWorkDrought:avg(rows,x=>x.longestWorkDrought),
   avgNearDeadlockTurns:avg(rows,x=>x.nearDeadlockTurns),
   avgDirectorRefills:avg(rows,x=>x.directorRefills),
   avgDirectorSelections:avg(rows,x=>x.directorSelections)};
 }));
 const warnings=[];
 const add=(code,severity,evidence)=>warnings.push({code,severity,evidence});
 if(primary.some(x=>x.initialLegal<3||x.openingMatches))
  add("UNSAFE_OPENING","blocker","A starting board lacks at least three legal moves or contains an automatic match");
 if(primary.some(x=>x.won&&x.movesUsed<=3))
  add("VERY_EARLY_CLEAR","review","At least one simulated win took three moves or fewer");
 if(primary.some(x=>x.shuffles>=2))
  add("MULTIPLE_SHUFFLES","review","At least one genuine simulated run shuffled at least twice");
 if(primary.some(x=>x.zeroLegal||x.zeroLegalAfterMove))
  add("MOBILITY_BREAKDOWN","review","At least one run reached a state with no ordinary legal move");
 if(primary.some(x=>x.longestWorkDrought>=12))
  add("LONG_WORK_DROUGHT","review","At least one bot made no objective or partial-blocker progress for twelve consecutive turns");
 if(primary.length>=4&&primary.every(x=>!x.won))
  add("NO_BOT_COMPLETION","investigate","No bounded diagnostic agent completed this level; this does not prove it is impossible");
 for(const strategy of agents){
  const rows=primary.filter(x=>x.strategy===strategy),vals=rows.map(x=>x.objectiveDetails.work);
  if(rows.length>=3&&Math.max(...vals)-Math.min(...vals)>=.45)
   add("SEED_SENSITIVITY_"+strategy.toUpperCase(),"investigate",
    "The same strategy varied by at least 45 percentage points of objective work across seeds");
 }
 const random=byStrategy.random,objective=byStrategy.objective;
 if(random&&objective&&random.diagnosticWinRate>objective.diagnosticWinRate&&seeds>=3)
  add("STRATEGY_ADVANTAGE_UNCERTAIN","review",
   "This bounded random agent won more often than the objective agent in this small paired sample");
 let comparison=null;
 if(options.compareStandard){
  const baseline=runs.filter(x=>x.mode==="standard");
  const incompatible=primary.some(row=>{
   const other=baseline.find(x=>x.seed===row.seed&&x.strategy===row.strategy);
   return !other||row.openingSignature!==other.openingSignature;
  });
  comparison={paired:!incompatible,mode:"standard",
   v63WinRate:round(primary.filter(x=>x.won).length/primary.length),
   standardWinRate:round(baseline.filter(x=>x.won).length/baseline.length),
   v63Work:avg(primary,x=>x.objectiveDetails.work),
   standardWork:avg(baseline,x=>x.objectiveDetails.work),
   v63Shuffles:sum(primary.map(x=>x.shuffles)),
   standardShuffles:sum(baseline.map(x=>x.shuffles))};
  if(incompatible)add("UNPAIRED_OPENINGS","investigate","Different start boards make the Director comparison inconclusive");
  else if(Math.abs(comparison.v63Work-comparison.standardWork)>=.25)
   add("DIRECTOR_OUTCOME_DIVERGENCE","investigate",
    "Director 6.3 and Standard differed by at least 25 percentage points of objective work");
 }
 return {level:entry.index+1,name:entry.recipe.name,recipeId:entry.recipe.id,
  chapter:Math.floor(entry.index/10)+1,opening:entry.opening,
  moves:entry.recipe.moves,goal:entry.recipe.goal,
  mechanics:Object.keys(entry.recipe.mechanics).filter(key=>{
   const v=entry.recipe.mechanics[key];return Array.isArray(v)?v.length>0:!!v;
  }),initialLegal:primary[0]?.initialLegal,
  byStrategy,comparison,warnings,runs};
}
function audit(options={}){
 const from=between(options.from??1,1,COUNT,"First level");
 const to=between(options.to??COUNT,1,COUNT,"Last level");
 if(to<from)throw Error("Last level must be >= first level");
 const levels=[];
 for(let i=from-1;i<to;i++){
  const entry=descriptor(i);
  const result=auditRun(entry,options);
  levels.push(result);
  if(typeof options.onLevel==="function")options.onLevel(result);
 }
 const all=levels.flatMap(x=>x.runs.filter(r=>r.mode==="v63"));
 const warnings=levels.flatMap(l=>l.warnings.map(w=>({level:l.level,...w})));
 const chapters=Array.from(new Set(levels.map(x=>x.chapter)),chapter=>{
  const subset=levels.filter(x=>x.chapter===chapter),rows=subset.flatMap(x=>x.runs.filter(r=>r.mode==="v63"));
  return {chapter,levels:subset.length,attempts:rows.length,diagnosticWins:rows.filter(x=>x.won).length,
   avgObjectiveWork:avg(rows,x=>x.objectiveDetails.work),
   avgWorkDrought:avg(rows,x=>x.longestWorkDrought),
   shuffles:sum(rows.map(x=>x.shuffles)),
   warnings:subset.reduce((n,x)=>n+x.warnings.length,0)};
 });
 return {version:VERSION,scope:{first:from,last:to,levels:levels.length,blueprints:levels.filter(x=>x.opening==="hand-authored").length},
  settings:{seeds:options.seeds??3,strategies:options.strategies??["random","objective"],
   compareStandard:!!options.compareStandard,baseSeed:options.baseSeed??20261105,
   maxCandidates:options.maxCandidates??5,maxTurns:options.maxTurns??"level move budget"},
  totals:{runs:all.length,diagnosticWins:all.filter(x=>x.won).length,
   shuffles:sum(all.map(x=>x.shuffles)),noLegal:all.filter(x=>x.zeroLegal||x.zeroLegalAfterMove).length,
   avgObjectiveCompletion:avg(all,x=>x.goalCompletion),avgWorkCompletion:avg(all,x=>x.objectiveDetails.work)},
  chapters,warnings,levels,
  caveat:"Heuristic agents and matched seeds are diagnostics only. A legal opening does not prove solvability, fairness, strategic depth, player enjoyment or human win rate."};
}
const api=Object.freeze({VERSION,COUNT,descriptor,officialGame,hp,goalParts,fractions,auditRun,audit});
root.HarmonyDifficultyLabV2=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
