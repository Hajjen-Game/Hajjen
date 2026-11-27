// SKYSHIFT 0.29.3. Presentation scheduling is independent of the fixed 120Hz simulation.
export const PERFORMANCE_KEY="skyshift-performance-0293";
export const FRAME_CAPS=Object.freeze([60,90,120]);
export function normalizePerformance(value={},mobile=false){
 return {fps:FRAME_CAPS.includes(Number(value?.fps))?Number(value.fps):mobile?60:120,
  quality:value?.quality==="fixed"?"fixed":"auto",diagnostics:value?.diagnostics===true,
  sections:value?.sections!==false};
}
export function readPerformance(storage,mobile=false,legacy={}){
 let saved={};try{saved=JSON.parse(storage?.getItem(PERFORMANCE_KEY)||"{}")||{}}catch{}
 const p=normalizePerformance(saved,mobile);
 // Old explicit benchmark URLs continue to work, not required for players.
 if(legacy.enabled){p.diagnostics=true;p.quality="fixed";}
 return p;
}
export function savePerformance(storage,value){try{storage?.setItem(PERFORMANCE_KEY,JSON.stringify(value));}catch{}}
export function createPresentationGate(){
 let deadline=null,lastCap=null,rendered=0,skipped=0;
 function allow(now,cap){
  const step=1000/cap;
  if(deadline===null||lastCap!==cap||now>=deadline+step*4){
   lastCap=cap;deadline=now+step;rendered++;return true;
  }
  // RAF delivery is quantized by the physical screen refresh rate.
  if(now+.6<deadline){skipped++;return false;}
  deadline+=step;
  if(deadline<now-.6)deadline=now+step;
  rendered++;return true;
 }
 return {allow,reset(){deadline=null;lastCap=null;rendered=skipped=0;},stats:()=>({rendered,skipped,cap:lastCap})};
}
