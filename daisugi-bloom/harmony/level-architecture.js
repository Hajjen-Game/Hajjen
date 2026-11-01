/* Japanese Harmony · Level Architecture 2.0 — opt-in, chapter-independent recipes.
 * Step A: validate + compile real mechanics into the existing Rules config.
 * No published recipe registry yet. Journey 1–100 stays exactly as authored.
 */
(function(root){
"use strict";
const B=root.HarmonyBoardMechanics||(typeof require==="function"?require("./board-mechanics.js"):null);
const Mirror=root.HarmonyMoonMirrors||(typeof require==="function"?require("./moon-mirrors.js"):null);
const Wind=root.HarmonyWindGarden||(typeof require==="function"?require("./wind-garden.js"):null);
const Lotus=root.HarmonyLotusStream||(typeof require==="function"?require("./lotus-stream.js"):null);
if(!B||!Mirror||!Wind||!Lotus)throw Error("Level Architecture requires the four existing mechanic adapters");
const VERSION=2,MAX=49;
const families=new Set(["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"]);
const goals=new Set(["fusion","stage3","stage4","masterpiece","pulseHits","mist","daruma","sealedStone","lotus","fourTurns","familyFusion","familyMasterpiece"]);
const difficulties=new Set(["gentle","standard","challenge","expert"]);
const fields=new Set(["version","id","index","name","subtitle","intro","moves","starPar","goal","difficulty","mechanics","compatibility"]);
const mechanicalFields=new Set(["bamboo","mist","daruma","sealedStones","mirrors","wind","hanabi"]);
function object(value,label){
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error(label+" must be an object");
 return value;
}
function keys(value,known,label){
 for(const key of Object.keys(value))if(!known.has(key))throw Error("Unknown "+label+" field: "+key);
}
function positions(input,label){
 if(input===undefined||input===null)return [];
 if(!Array.isArray(input))throw Error(label+" must be an array");
 const seen=new Set();
 for(const cell of input){
  if(!Number.isInteger(cell)||cell<0||cell>=MAX||seen.has(cell))
   throw Error("Invalid or duplicate "+label+" cell");
  seen.add(cell);
 }
 return [...seen].sort((a,b)=>a-b);
}
function overlaps(a,b,label){
 for(const cell of a)if(b.includes(cell))throw Error(label+" overlap at "+cell);
}
function step(at,direction){
 const r=Math.floor(at/7),c=at%7;
 const offsets={up:r>0?at-7:null,down:r<6?at+7:null,
  left:c>0?at-1:null,right:c<6?at+1:null};
 return offsets[direction];
}
function normalize(recipe,index=recipe?.index){
 object(recipe,"Level recipe");
 keys(recipe,fields,"recipe");
 if(recipe.version!==VERSION)throw Error("Level recipe version must be 2");
 if(!Number.isInteger(index)||index<0||index>9999||recipe.index!==index)
  throw Error("Level recipe index mismatch");
 if(typeof recipe.id!=="string"||!/^[a-z0-9][a-z0-9-]{2,63}$/.test(recipe.id))
  throw Error("Level recipe needs a stable lowercase id");
 for(const key of ["name","subtitle","intro"]){
  if(typeof recipe[key]!=="string"||!recipe[key].trim()||recipe[key].length>300)
   throw Error("Level recipe needs "+key);
 }
 if(!Number.isInteger(recipe.moves)||recipe.moves<6||recipe.moves>120)
  throw Error("Level recipe moves must be 6–120");
 if(!Number.isInteger(recipe.starPar)||recipe.starPar<1||recipe.starPar>=recipe.moves-1)
  throw Error("Level recipe starPar must be lower than move budget");
 if(!difficulties.has(recipe.difficulty))throw Error("Unknown difficulty tier");
 const goal=object(recipe.goal,"Goal");
 keys(goal,new Set(["type","count","family"]),"goal");
 if(!goals.has(goal.type)||!Number.isInteger(goal.count)||goal.count<1||goal.count>120)
  throw Error("Invalid level goal");
 if(["familyFusion","familyMasterpiece"].includes(goal.type)){
  if(!families.has(goal.family))throw Error("Family goal requires a real treasure family");
 }else if(goal.family!==undefined)throw Error("Non-family goal cannot specify a family");
 const raw=object(recipe.mechanics,"Mechanics");
 keys(raw,mechanicalFields,"mechanics");
 const b=raw.bamboo===undefined?{}:object(raw.bamboo,"Bamboo");
 keys(b,new Set(["layout","blocked"]),"bamboo");
 const mask=B.normalize({layout:b.layout??null,blocked:positions(b.blocked,"bamboo"),
  mist:positions(raw.mist,"mist"),
  daruma:positions(raw.daruma,"daruma"),
  sealedStone:positions(raw.sealedStones,"sealed stones")});
 overlaps(mask.daruma,mask.sealedStone,"Daruma / Sealed Stone");
 const physical=[...mask.blocked,...mask.daruma,...mask.sealedStone];
 const mirrors=Mirror.normalize(raw.mirrors??[],mask.blocked);
 const mirrorCells=mirrors.map(m=>m.at);
 overlaps(mirrorCells,physical,"Moon Mirror / fixed fixture");
 for(const mirror of mirrors){
  if(step(mirror.at,mirror.direction)===null)
   throw Error("Moon Mirror must point inside the board");
 }
 const wind=raw.wind===undefined||raw.wind===null?null:Wind.normalize(raw.wind);
 const hanabi=raw.hanabi===undefined||raw.hanabi===null?null:
  Lotus.normalize({version:1,starts:positions(raw.hanabi.starts,"Hanabi rockets"),
   exits:positions(raw.hanabi.crates,"Hanabi crates")});
 if(hanabi&&(!hanabi.starts.length||!hanabi.exits.length))
  throw Error("Hanabi needs rockets and receiving crates");
 const compatibility=recipe.compatibility??{};
 object(compatibility,"Compatibility policy");
 keys(compatibility,new Set(["allowWindMist"]),"compatibility");
 if(compatibility.allowWindMist!==undefined&&typeof compatibility.allowWindMist!=="boolean")
  throw Error("allowWindMist must be boolean");
 if(wind&&mask.mist.length&&!compatibility.allowWindMist)
  throw Error("Wind + Mist is postponed by default; explicitly opt in after playtesting");
 if(wind)for(const {row} of wind.steps){
  const inRow=cell=>Math.floor(cell/7)===row;
  if([...physical,...mirrorCells].some(inRow))
   throw Error("Wind row cannot contain fixed blockers or Moon Mirrors");
 }
 if(hanabi){
  const anchors=[...hanabi.starts,...hanabi.exits];
  overlaps(anchors,[...physical,...mirrorCells],"Hanabi / fixed fixture");
  const occupiedColumns=new Set(hanabi.starts.map(i=>i%7));
  for(const cell of physical.concat(mirrorCells)){
   if(occupiedColumns.has(cell%7)){
    const same=hanabi.starts.some(start=>start%7===cell%7&&cell>start);
    if(same)throw Error("Hanabi route is blocked below a rocket");
   }
  }
  // The existing Hanabi opening uses a few fixed row-6 and row-7 starter
  // positions. Reserve those until a general opening authoring API exists.
  overlaps([...physical,...mirrorCells],[35,36,37,38,39,40,41,44,48],
   "Hanabi opening / fixture");
  if(wind){
   for(const {row} of wind.steps)
    if(hanabi.starts.some(start=>row>=Math.floor(start/7)&&row<=5))
     throw Error("Wind cannot sweep through an active Hanabi cargo route");
  }
 }
 if(goal.type==="daruma"&&goal.count>mask.daruma.length)throw Error("Daruma objective exceeds targets");
 if(goal.type==="sealedStone"&&goal.count>mask.sealedStone.length)throw Error("Stone objective exceeds targets");
 if(goal.type==="mist"&&goal.count>mask.mist.length)throw Error("Mist objective exceeds target cells");
 if(goal.type==="lotus"&&(!hanabi||goal.count>hanabi.starts.length))
  throw Error("Hanabi goal exceeds available rockets");
 // Each call returns fresh plain data. No mutation leaks into catalog entries
 // or into parallel seed simulations.
 return {
  version:VERSION,id:recipe.id,index,name:recipe.name,subtitle:recipe.subtitle,
  intro:recipe.intro,moves:recipe.moves,starPar:recipe.starPar,
  difficulty:recipe.difficulty,goal:{...goal},
  compatibility:{allowWindMist:compatibility.allowWindMist===true},
  mechanics:{
   bamboo:{layout:mask.layout,blocked:mask.blocked.slice()},
   mist:mask.mist.slice(),daruma:mask.daruma.slice(),sealedStones:mask.sealedStone.slice(),
   mirrors:mirrors.map(m=>({...m})),
   wind:wind?{every:wind.every,steps:wind.steps.map(s=>({...s}))}:null,
   hanabi:hanabi?{starts:hanabi.starts.slice(),crates:hanabi.exits.slice()}:null
  }
 };
}
function compile(index,base,raw){
 object(base,"Base level config");
 const recipe=normalize(raw,index),m=recipe.mechanics;
 const boardMechanics=B.normalize({layout:m.bamboo.layout,blocked:m.bamboo.blocked,
  mist:m.mist,daruma:m.daruma,sealedStone:m.sealedStones});
 const out={...base,name:recipe.name,subtitle:recipe.subtitle,intro:recipe.intro,
  moves:recipe.moves,starPar:recipe.starPar,goal:{...recipe.goal},
  boardMechanics,chapter:Math.floor(index/10)+1,
  levelArchitectureVersion:VERSION,levelRecipeId:recipe.id,
  difficultyTier:recipe.difficulty,
  moonMirrors:m.mirrors.map(x=>({...x})),
  windGarden:m.wind?{every:m.wind.every,steps:m.wind.steps.map(x=>({...x}))}:null
 };
 // Disable inherited chapter mechanics unless included in this recipe.
 delete out.lotus;delete out.lotusVersion;delete out.hanabiVersion;
 delete out.bambooVersion;delete out.darumaVersion;delete out.sealedStoneVersion;
 if(m.hanabi){
  out.lotus={version:1,starts:m.hanabi.starts.slice(),exits:m.hanabi.crates.slice()};
  out.lotusVersion=1;out.hanabiVersion=2;
 }
 if(m.bamboo.blocked.length||m.bamboo.layout)out.bambooVersion=1;
 return out;
}
function compatible(raw){try{return {ok:true,recipe:normalize(raw)};}catch(error){return {ok:false,reason:error.message};}}
const api=Object.freeze({VERSION,normalize,compile,compatible});
root.HarmonyLevelArchitecture=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
