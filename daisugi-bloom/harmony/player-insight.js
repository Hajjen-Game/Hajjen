/* Japanese Harmony · Director 5.0 — Player Insight Foundation
 * Local-only observation, not difficulty or monetization targeting.
 * The completed-round report is manually exported. No network requests.
 */
(function(root){
"use strict";
const VERSION=1,MAX_MOVES=160,MAX_REFILLS=14,MAX_CARDS=12,MAX_REJECTED=80;
const nonnegative=x=>Number.isFinite(x)?Math.max(0,Math.trunc(x)):0;
const board=game=>game.board.map(p=>p?[p.id,p.family,p.stage]:null);
function snapshot(game){
 return {board:board(game),moves:game.moves,score:game.score,
  progress:game.progress(),rolls:game.rolls,
  fusions:game.fusions,stage3:game.stage3,stage4:game.stage4,
  masterpieces:game.masterpieces,echoes:game.echoes,pulseHits:game.pulseHits,
  mist:game.mist?.slice(),daruma:game.daruma?.slice(),sealed:game.sealed?.slice(),
  lotusDelivered:game.lotusDelivered};
}
function initial(game,partial=false){
 return {version:VERSION,partial,level:game.level+1,seed:game.seed,
  directorMode:game.directorMode,goal:{...game.config.goal},
  moonMirrors:game.moonMirrors?.map(x=>({...x}))||[],
  preview:game.bambooPreview?"bamboo-paths":game.moonMirrorPreview||game.windGardenPreview||null,
  previewType:game.bambooPreview?"bamboo-paths":game.windGardenPreview?"wind-garden":game.moonMirrorPreview?"moon-mirrors":null,
  windGarden:game.windGarden?{every:game.windGarden.every,steps:game.windGarden.steps.map(x=>({...x}))}:null,
  start:snapshot(game),moves:[],cards:[],rejected:[],truncated:false};
}
function valid(trace){
 return !!trace&&typeof trace==="object"&&!Array.isArray(trace)&&
  trace.version===VERSION&&Number.isInteger(trace.level)&&trace.level>=1&&
  Array.isArray(trace.moves)&&trace.moves.length<=MAX_MOVES&&
  Array.isArray(trace.cards)&&trace.cards.length<=MAX_CARDS&&
  (!trace.rejected||(Array.isArray(trace.rejected)&&trace.rejected.length<=MAX_REJECTED))&&
  !!trace.start&&Array.isArray(trace.start.board)&&trace.start.board.length===49;
}
function restore(trace,game){
 if(!valid(trace)||trace.level!==game.level+1||trace.seed!==game.seed)
  return initial(game,true);
 // Copy before storing in live gameplay, including the original round board.
 // Do not share arrays between hint trial clones and the real player.
 return JSON.parse(JSON.stringify(trace));
}
function beginMove(game,from,to,decisionMs){
 return {number:game.config.moves-game.moves+1,from,to,
  decisionMs:Number.isFinite(decisionMs)&&decisionMs>=0&&decisionMs<=90000?
   Math.round(decisionMs):null,
  before:snapshot(game),refills:[]};
}
function refill(turn,data){
 if(!turn)return;
 if(turn.refills.length<MAX_REFILLS)turn.refills.push(data);
 else turn.refillsTruncated=true;
}
function eventSummary(event){
 const kept={type:event.type};
 for(const key of ["round","wave","scoreDelta","chain","unused","from","to","source","mirrorAt","row","afterMove"]){
  if(Number.isFinite(event[key]))kept[key]=event[key];
 }
 for(const key of ["positions","clearedMist","mistTargets","darumaTargets","stoneTargets","mirrorTargets","visualOnlyTargets"]){
  if(Array.isArray(event[key]))kept[key]=event[key].slice(0,49).map(x=>
   typeof x==="number"?x:{at:x.at,to:x.to,from:x.from,via:x.via,source:x.source}).slice(0,49);
 }
 if(Array.isArray(event.groups))kept.groups=event.groups.slice(0,12).map(g=>({
  family:g.family,at:g.at,stage:g.stage,size:g.size,kind:g.kind,
  indices:Array.isArray(g.indices)?g.indices.slice(0,8):undefined
 }));
 if(Array.isArray(event.targets))kept.targets=event.targets.slice(0,49).map(t=>({
  from:t.from,to:t.to,stage:t.stage,via:t.via,source:t.source
 }));
 if(typeof event.direction==="string"&&["up","right","down","left"].includes(event.direction))kept.direction=event.direction;
 if(Array.isArray(event.reflections))kept.reflections=event.reflections.slice(0,16).map(r=>({from:r.from,to:r.to,direction:r.direction,source:r.source}));
 if(Array.isArray(event.moved))kept.moved=event.moved.slice(0,7).map(x=>({from:x.from,to:x.to,id:x.id}));
 if(event.type==="wind-blocked"&&typeof event.reason==="string")kept.reason=event.reason.slice(0,80);
 if(Array.isArray(event.delivered))kept.delivered=event.delivered.slice(0,8);
 // An identical snapshot must survive JSON save/reload. Omitting optional
 // undefined fields here avoids invisible differences between live and
 // restored fusion/target records in the actual round report.
 return JSON.parse(JSON.stringify(kept));
}
function finishMove(trace,turn,game,events){
 if(!valid(trace)||!turn)return;
 turn.after=snapshot(game);
 turn.events=events.map(eventSummary);
 turn.director={mode:game.directorMode,phase:game.pacePhase,
  refills:game.directorRefills,selections:game.directorSelections,
  drought:game.directorDrought,objectiveDrought:game.objectiveDrought,
  afterglowRemaining:game.omamoriAfterglow?.remaining||0};
 if(trace.moves.length>=MAX_MOVES){trace.truncated=true;return;}
 trace.moves.push(turn);
}
// Unsuccessful taps/swaps spend no moves but are useful to diagnose
// confusing layouts. Log them separately from the numbered legal moves.
function rejected(trace,game,from,to,reason){
 if(!valid(trace))return;
 if(!Array.isArray(trace.rejected))trace.rejected=[];
 if(trace.rejected.length>=MAX_REJECTED){trace.truncated=true;return;}
 trace.rejected.push({atMove:game.config.moves-game.moves+1,
  from,to,reason:String(reason).slice(0,120)});
}
function recordCard(trace,game,cardId,before,refills=[],events=[]){
 if(!valid(trace))return;
 if(trace.cards.length>=MAX_CARDS){trace.truncated=true;return;}
 trace.cards.push({card:cardId,turn:game.config.moves-game.moves,
  before,after:snapshot(game),refills:refills.slice(0,MAX_REFILLS),
  events:events.map(eventSummary),
  afterglow:game.omamoriAfterglow?.remaining||0});
}
function last(game,trace,profile,intentAwareness=null){
 return {format:"japanese-harmony-round",version:VERSION,
  privacy:"Player-exported locally. No account, device ID, wallet balance or purchase history.",
  level:game.level+1,levelName:game.config.name,
  goal:game.config.goal,directorMode:game.directorMode,
  preview:game.bambooPreview?"bamboo-paths":game.moonMirrorPreview||game.windGardenPreview||null,
  previewType:game.bambooPreview?"bamboo-paths":game.windGardenPreview?"wind-garden":game.moonMirrorPreview?"moon-mirrors":null,
  windGarden:game.windGarden?{every:game.windGarden.every,steps:game.windGarden.steps.map(x=>({...x}))}:null,
  moonMirrors:game.moonMirrors?.map(x=>({...x}))||[],
  result:{complete:!!game.complete,failed:!!game.failed,
   score:game.score,stars:game.bambooPreview||game.moonMirrorPreview||game.windGardenPreview?0:game.assisted?1:game.stars(),
   assisted:!!game.assisted,unranked:!!(game.bambooPreview||game.moonMirrorPreview||game.windGardenPreview),movesUsed:game.config.moves-game.moves,
   movesRemaining:game.moves,progress:game.progress(),target:game.target()},
  playerInsight:profile,intentAwareness,round:JSON.parse(JSON.stringify(trace))};
}
const PROFILE_MAX=10000,STAR_SIGNAL_VERSION=2;
const profileDefault=()=>({version:VERSION,starSignalVersion:STAR_SIGNAL_VERSION,
 rounds:0,replays:0,
 starsImproved:0,assistedRounds:0,largeChains:0,masterpieces:0,
 fusionCount:0,levels:[],lastRounds:[]});
function profileState(raw){
 if(!raw||raw.version!==VERSION||!Array.isArray(raw.levels)||
  !Array.isArray(raw.lastRounds))return profileDefault();
 const s=profileDefault();
 for(const k of ["rounds","replays","starsImproved","assistedRounds","largeChains","masterpieces","fusionCount"])
  s[k]=Math.min(PROFILE_MAX,nonnegative(raw[k]));
 // Old v1 counted a first clear as a star improvement. Do not present
 // that misleading historical value as verified replay improvement.
 s.starsImproved=raw.starSignalVersion===STAR_SIGNAL_VERSION?
  s.starsImproved:0;
 s.levels=[...new Set(raw.levels.filter(n=>Number.isInteger(n)&&n>=1&&n<=100000))].slice(-250);
 s.lastRounds=raw.lastRounds.filter(x=>x&&typeof x.key==="string"&&x.key.length<=65).slice(-25);
 return s;
}
function recordRound(save,game,previousStars){
 const s=profileState(save.playerInsight);
 const key=(game.level+1)+"-"+game.seed; // round identifier, not a player ID
 if(s.lastRounds.some(x=>x.key===key))return false;
 const level=game.level+1;
 s.rounds=Math.min(PROFILE_MAX,s.rounds+1);
 const oldStars=nonnegative(previousStars);
 const replayed=s.levels.includes(level)||oldStars>0;
 if(replayed)s.replays=Math.min(PROFILE_MAX,s.replays+1);
 if(!s.levels.includes(level))s.levels.push(level);
 // A new stamp is a first clear, NOT a 1→3-star improvement.
 if(oldStars>0&&(game.assisted?1:game.stars())>oldStars)
  s.starsImproved=Math.min(PROFILE_MAX,s.starsImproved+1);
 if(game.assisted)s.assistedRounds=Math.min(PROFILE_MAX,s.assistedRounds+1);
 if(game.bestChain>=5)s.largeChains=Math.min(PROFILE_MAX,s.largeChains+1);
 s.masterpieces=Math.min(PROFILE_MAX,s.masterpieces+nonnegative(game.masterpieces));
 s.fusionCount=Math.min(PROFILE_MAX,s.fusionCount+nonnegative(game.fusions));
 s.lastRounds.push({key,level,stars:game.assisted?1:game.stars()});
 s.lastRounds=s.lastRounds.slice(-25);
 save.playerInsight=s;
 return true;
}
function readProfile(save,goshuincho){
 const s=profileState(save.playerInsight),book=goshuincho?.summary?.(save)||{earned:0,stars:0};
 const total=Math.max(1,s.rounds),stamps=Math.max(0,book.earned||0);
 const archive={one:0,two:0,three:0},known=goshuincho?.archivedStars;
 if(typeof known==="function"){
  const visible=Math.max(0,Math.min(250,nonnegative(save.unlocked)+1));
  for(let i=0;i<visible;i++){
   const stars=known(save,i);
   if(stars===1)archive.one++;
   else if(stars===2)archive.two++;
   else if(stars===3)archive.three++;
  }
 }
 // Signals are evidence of play behavior, not inferred personality or spending intent.
 // Return 'unknown' when evidence is insufficient rather than guessing.
 const observed=s.rounds>=5;
 const signals={
  completion:{count:stamps,chapters:book.completedChapters||0,
   loggedFirstClears:Math.max(0,s.rounds-s.replays),
   oneStar:archive.one,twoStars:archive.two,threeStars:archive.three,
   source:"Goshuincho stamps"},
  replay:{count:s.replays,rate:Number((s.replays/total).toFixed(3)),
   description:"Completed rounds on levels already cleared"},
  starImprovement:{count:s.starsImproved,rate:Number((s.starsImproved/total).toFixed(3)),
   description:"Higher stars on a previously cleared level only"},
  chaining:{count:s.largeChains,rate:Number((s.largeChains/total).toFixed(3))},
  creation:{masterpieces:s.masterpieces,fusions:s.fusionCount},
  assisted:{count:s.assistedRounds}
 };
 return {version:VERSION,rounds:s.rounds,confidence:observed?"early":"insufficient",
  signals,preference:"undetermined",personalizationActive:false};
}
const api=Object.freeze({VERSION,MAX_MOVES,snapshot,initial,valid,restore,
 beginMove,refill,eventSummary,finishMove,rejected,recordCard,last,profileDefault,
 profileState,recordRound,readProfile});
root.HarmonyPlayerInsight=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
