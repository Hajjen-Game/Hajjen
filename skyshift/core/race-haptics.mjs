// Presentation-only mobile impact feedback. No timers, physics writes or GPU work.
export const HAPTIC_KEY="skyshift-haptics-1";
const MODES=Object.freeze(["off","subtle","standard","intense"]);
const normalize=v=>MODES.includes(v)?v:"standard";
export function readHapticMode(storage){
 try{return normalize(storage?.getItem(HAPTIC_KEY));}catch{return "standard";}
}
export function saveHapticMode(storage,value){
 const mode=normalize(value);try{storage?.setItem(HAPTIC_KEY,mode);}catch{}return mode;
}
export function syncHapticSettings(document,mode,supported,refined=false){
 document.getElementById("haptic-settings").classList.remove("hidden");
 const input=document.getElementById("haptic-mode");input.value=mode;
 document.getElementById("haptic-hint").textContent=supported?
  (refined?"Wall contact, falls and flight ended. Pulse duration and rhythm.":"Wall contact, falls, boost pads, landings and trick rewards. Pulse duration and rhythm."):
  "Vibration is unavailable in this browser or device. Your preference is saved.";
}
export const HAPTIC_PATTERNS=Object.freeze({
 wall:Object.freeze([55]),fall:Object.freeze([180,70,100]),pad:Object.freeze([25,30,65]),
 landing:Object.freeze([45]),trick:Object.freeze([45,45,20,25,90])
});
export const IMPACT_HAPTIC_PATTERNS=Object.freeze({wall:HAPTIC_PATTERNS.wall,fall:HAPTIC_PATTERNS.fall,death:Object.freeze([210,80,170,80,240])});
const PRIORITY=Object.freeze({wall:1,landing:2,pad:3,trick:4,fall:5,death:6});
export function createRaceHaptics({mode="standard",vibrate=null,now=()=>performance.now(),refined=false}={}){
 let current=normalize(mode),until=0,priority=0,lastWall=-Infinity,active=false;
 const supported=typeof vibrate==="function";
 const patterns=refined?IMPACT_HAPTIC_PATTERNS:HAPTIC_PATTERNS;
 const emptyCounts=()=>Object.fromEntries(Object.keys(patterns).map(k=>[k,0]));
 let accepted=emptyCounts(),rejected=0,terminal=false;
 function stop(){
  if(active&&supported)try{vibrate(0);}catch{}
  active=false;until=0;priority=0;lastWall=-Infinity;
 }
 function observe(result,visible=true){
  if(!supported||current==="off"||!visible||!result)return false;
  if(refined&&terminal)return false;
  const wall=result.railContactStarted||result.railContact;
  const kind=refined?(result.kind==="failed"?"death":result.crashed?"fall":wall?"wall":null):
   result.crashed?"fall":result.landed&&result.landingBoostAwarded?"trick":
   result.boostActivated?"pad":result.landed?"landing":wall?"wall":null;
  if(kind==="death")terminal=true;
  if(!kind)return false;
  const t=now();
  if(kind==="wall"&&t-lastWall<450)return false;
  if(t<until&&PRIORITY[kind]<=priority)return false;
  const factor=current==="subtle"?.6:current==="intense"?1.4:1;
  const pattern=patterns[kind].map((v,i)=>i%2?v:Math.round(v*factor));
  try{
   if(vibrate(pattern)!==true){rejected++;return false;}
   active=true;until=t+pattern.reduce((a,b)=>a+b,0);priority=PRIORITY[kind];
   if(kind==="wall")lastWall=t;
   accepted[kind]++;return true;
  }catch{rejected++;return false;}
 }
 return Object.freeze({observe,stop,reset(){stop();accepted=emptyCounts();rejected=0;terminal=false;},
  setMode(value){stop();current=normalize(value);},get mode(){return current;},supported,
  stats:()=>({version:refined?"1.1":"1.0",mode:current,supported,accepted:{...accepted},rejected})});
}
