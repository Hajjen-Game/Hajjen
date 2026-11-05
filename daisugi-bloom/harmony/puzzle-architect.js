/* Japanese Harmony — Puzzle Architect 1.0.
 * Separate development-only blueprints and exact 7x7 openings. The only game
 * engine interaction is an explicit diagnostic Game + fast restored snapshot;
 * no live level, profile, or save contract is changed.
 */
(function(root){
"use strict";
const Architecture=root.HarmonyLevelArchitecture||
 (typeof require==="function"?require("./level-architecture.js"):null);
if(!Architecture)throw Error("Puzzle Architect needs Level Architecture 2.0");
const VERSION=1,SIZE=7,CELLS=49;
const FIXED=new Set(["terrain","lotusSeed","hanabiCrate","daruma","sealedStone","moonMirror"]);
const FAMILY=new Set(["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"]);
const MODES=new Set(["standard","v2","v3","v31","v311","v4","v6","v61","v62","v63"]);
function check(cond,message){if(!cond)throw Error(message);}
function obj(value,label){check(value&&typeof value==="object"&&!Array.isArray(value),label+" must be an object");return value;}
function strict(value,allowed,label){
 for(const key of Object.keys(value))check(allowed.includes(key),"Unknown "+label+" field: "+key);
}
function textField(value,label,min=5,max=500){
 check(typeof value==="string"&&value.trim().length>=min&&value.length<=max,
  label+" needs "+min+"–"+max+" characters");
 return value.trim();
}
function cellFixed(p){return !!p&&FIXED.has(p.family);}
function cellsOf(game){return game.board.map(p=>cellFixed(p)?null:p?.family||null);}
function normalize(input,rules){
 obj(input,"Blueprint");
 strict(input,["version","id","insight","primarySkill","secondarySkill","sequence",
  "recipe","opening","designNotes"],"blueprint");
 check(input.version===VERSION,"Blueprint version must be 1");
 check(typeof input.id==="string"&&/^[a-z0-9][a-z0-9-]{2,63}$/.test(input.id),
  "Blueprint id must be stable kebab-case");
 const insight=textField(input.insight,"Player insight",15,350);
 const primarySkill=textField(input.primarySkill,"Primary skill",3,100);
 const secondarySkill=input.secondarySkill?textField(input.secondarySkill,"Secondary skill",3,100):null;
 check(Array.isArray(input.sequence)&&input.sequence.length>=2&&input.sequence.length<=6,
  "Intended decision sequence requires 2–6 steps");
 const sequence=input.sequence.map((x,i)=>textField(x,"Sequence step "+(i+1),3,180));
 const recipe=Architecture.normalize(obj(input.recipe,"Recipe"));
 let opening=null;
 if(input.opening!==null&&input.opening!==undefined){
  const spec=obj(input.opening,"Opening");
  strict(spec,["grid","provenance"],"opening");
  check(Array.isArray(spec.grid)&&spec.grid.length===CELLS,
   "Opening must include EXACTLY 49 cells (7 × 7)");
  const grid=spec.grid.map((v,i)=>{
   check(v===null||FAMILY.has(v),"Unknown treasure family at cell "+i);
   return v;
  });
  const provenance=spec.provenance===undefined?"hand-authored":spec.provenance;
  check(["hand-authored","captured-seed"].includes(provenance),
   "Unknown opening provenance");
  // Fixed-fixture positions are reserved for the real Rules.Game adapters.
  const m=recipe.mechanics;
  const anchors=new Set([...m.bamboo.blocked,...m.daruma,...m.sealedStones,
   ...m.mirrors.map(x=>x.at),...(m.hanabi?[...m.hanabi.starts,...m.hanabi.crates]:[])]);
  for(const at of anchors)check(grid[at]===null,
   "Fixed fixture at cell "+at+" must have a null opening token");
  for(let i=0;i<CELLS;i++)if(!anchors.has(i))
   check(grid[i]!==null,"Ordinary cell "+i+" needs an authored family");
  // No fifth-family icons can silently appear in the four-family tutorial.
  if(rules){
   const active=rules.activeFamilies(recipe.index,recipe.index<10?4:5);
   for(let i=0;i<CELLS;i++)if(grid[i]!==null)
    check(active.includes(grid[i]),"Family "+grid[i]+" is not active at cell "+i);
  }
  opening={grid,provenance};
 }
 return {version:VERSION,id:input.id,insight,primarySkill,secondarySkill,
  sequence,recipe,opening,designNotes:typeof input.designNotes==="string"?
  input.designNotes.slice(0,1200):""};
}
function compatible(input,rules){
 try{return {ok:true,blueprint:normalize(input,rules)};}
 catch(e){return {ok:false,reason:e.message};}
}
function mode(value){check(MODES.has(value),"Unknown Director mode");return value;}
function captured(rules,recipe,seed=20261104,directorMode="v63"){
 check(rules&&typeof rules.Game==="function","Real HarmonyRules.Game required");
 const normalized=Architecture.normalize(recipe),choice=mode(directorMode);
 const game=new rules.Game(normalized.index,null,{seed,
  journeyDiagnostic:true,levelRecipe:normalized,directorMode:choice});
 return {
  game,
  opening:{grid:cellsOf(game),provenance:"captured-seed"}
 };
}
function create(rules,recipe,options={}){
 const r=Architecture.normalize(recipe);
 const seed=options.seed??20261104;
 check(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,"Seed must be uint32");
 const sample=captured(rules,r,seed,options.directorMode??"v63");
 return normalize({
  version:VERSION,id:"architect-"+r.id,
  insight:options.insight??"Use the intended mechanic to unlock a meaningful later decision.",
  primarySkill:options.primarySkill??"Fusion destination control",
  secondarySkill:options.secondarySkill??null,
  sequence:options.sequence??["Prepare the board","Exploit the mechanic","Complete the objective"],
  recipe:r,opening:sample.opening,designNotes:"Captured opening; revise cells before calling it hand-authored."
 },rules);
}
function build(rules,input,options={}){
 check(rules&&typeof rules.Game==="function","HarmonyRules.Game required");
 const bp=normalize(input,rules),seed=options.seed??20261104;
 check(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,"Seed must be uint32");
 const directorMode=mode(options.directorMode??"v63");
 let game=new rules.Game(bp.recipe.index,null,{
  seed,directorMode,journeyDiagnostic:true,levelRecipe:bp.recipe
 });
 if(!bp.opening)return game;
 const saved=game.save();
 const active=new Set(game.families);
 const normalGrid=bp.opening.grid;
 for(let i=0;i<CELLS;i++){
  const old=saved.board[i],token=normalGrid[i];
  if(cellFixed(old)){
   check(token===null,"Reserved fixture at "+i+" was painted over");
   continue;
  }
  check(old&&token!==null,"Cannot paint an empty ordinary cell at "+i);
  check(active.has(token),"Family "+token+" unavailable on this level");
  // Keep the genuine engine's persistent IDs and all fixture metadata.
  saved.board[i]={...old,family:token,stage:1};
 }
 const autoMatches=rules.scan(saved.board);
 check(autoMatches.length===0,
  "Opening contains "+autoMatches.length+" free automatic matches");
 const legal=rules.validSwaps(saved.board);
 check(legal.length>=3,"Opening needs at least three real legal swaps (found "+legal.length+")");
 saved.bag=[];  // Rebuild ordinary refill bag from the actually authored opening.
 saved.roundTrace=null; // Rebuild round telemetry from the modified opening.
 // A preview played by a person must record every real move. The fast-restore
 // path is for disposable simulations and intentionally disables telemetry.
 // Authored openings are genuine round starts, not resumed partial rounds.
 game=new rules.Game(bp.recipe.index,saved,{fastRestore:!options.recordRound});
 if(options.recordRound&&game.roundTrace){
  game.roundTrace.partial=false;
  check(game.traceEnabled,"Live authored round must enable move telemetry");
 }
 check(game.config.levelRecipeId===bp.recipe.id,"Restored test game lost recipe identity");
 return game;
}
function inspect(rules,input,options={}){
 const bp=normalize(input,rules),game=build(rules,bp,options);
 const m=bp.recipe.mechanics;
 const hanabi=(m.hanabi?.starts||[]).map(start=>{
  const crate=m.hanabi.crates.find(x=>x%SIZE===start%SIZE);
  const path=[];for(let i=start+SIZE;i<=crate;i+=SIZE)path.push(i);
  return {start,crate,path};
 });
 const direction={up:-SIZE,down:SIZE,left:-1,right:1};
 const mirrors=m.mirrors.map(x=>({
  ...x,target:x.at+direction[x.direction]
 }));
 return {
  level:bp.recipe.index+1,blueprintId:bp.id,
  opening:cellsOf(game),
  legalSwaps:rules.validSwaps(game.board).length,
  fixed:game.board.flatMap((p,i)=>cellFixed(p)?[{at:i,family:p.family}]:[]),
  hanabi,mirrors,wind:m.wind,
  warnings:[...(bp.opening?.provenance==="captured-seed"?
   ["Opening comes from a sampled seed; it is not yet a deliberately authored puzzle."]:[])]
 };
}
const api=Object.freeze({VERSION,SIZE,CELLS,FIXED,
 normalize,compatible,create,captured,build,inspect,cellsOf});
root.HarmonyPuzzleArchitect=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
