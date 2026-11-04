/* Japanese Harmony — Victory Celebration 2.2
 * An unhurried, board-local, pre-modal festival finale. No gameplay state, rewards,
 * timers, saves, touch handlers, audio engines, or purchases are mutated here.
 */
(function(root){
"use strict";
const DURATIONS=Object.freeze({1:2450,2:2620,3:2830});
const SPOTS=Object.freeze([
 [25,33],[77,47],[51,22],[35,71],[70,73],[43,26],[62,67]
]);
const PALETTE=Object.freeze(["gold","sakura","ivory","teal"]);
let active=null;
const reduced=()=>!!(root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
const playable=(boardShell,board)=>!!boardShell?.isConnected&&!!board?.isConnected;
const element=(name,className)=>{
 const node=root.document.createElement(name);node.className=className;return node;
};
function cancel(){
 if(active)active.finish("cancelled");
}
function play({boardShell,board,stars=1,reduceMotion=false,onStart}={}){
 cancel();
 const tier=Math.max(1,Math.min(3,Math.floor(Number(stars)||1)));
 const skip=reduceMotion||reduced()||root.document.hidden||!playable(boardShell,board);
 // Never defer a reduced-motion or background result, and never create
 // particle DOM in a hidden tab.
 if(skip)return Promise.resolve({status:"skipped",stars:tier,durationMs:0});
 const durationMs=DURATIONS[tier];
 const overlay=element("div","jh-victory-celebration");
 overlay.dataset.stars=String(tier);
 overlay.style.setProperty("--jh-victory-duration",durationMs+"ms");
 overlay.setAttribute("aria-hidden","true");
 const aura=element("span","jh-victory-aura");
 const title=element("span","jh-victory-title");
 const kanji=element("span","jh-victory-kanji");
 const english=element("span","jh-victory-word");
 kanji.textContent="調和";
 english.textContent="HARMONY";
 title.append(kanji,english);
 const finalRing=element("span","jh-victory-final-ring");
 overlay.append(aura,title,finalRing);
 // Distinct 1 / 2 / 3-star celebrations. Everything remains INSIDE the
 // board so it never creates viewport overflow on 320–390px phones.
 const firstWave=tier+1,encoreCount=tier;
 const bursts=firstWave+encoreCount;
 for(let i=0;i<bursts;i++){
  const encore=i>=firstWave;
  const burst=element("span","jh-victory-burst jh-victory-"+PALETTE[i%4]+
   (encore?" jh-victory-encore":""));
  const [x,y]=SPOTS[i];
  burst.style.setProperty("--x",x+"%");
  burst.style.setProperty("--y",y+"%");
  // The late encore is a new visible wave, not a static hold.
  const delayFraction=encore?
   .69+.08*(i-firstWave)/Math.max(1,encoreCount-1):
   .11+.39*i/(firstWave-1);
  burst.style.setProperty("--delay",Math.round(durationMs*delayFraction)+"ms");
  for(let ray=0;ray<8;ray++){
   const spark=element("i","jh-victory-ray");
   spark.style.setProperty("--angle",(ray*45)+"deg");
   burst.append(spark);
  }
  const center=element("i","jh-victory-center");burst.append(center);
  overlay.append(burst);
 }
 const count=tier===1?10:tier===2?17:25;
 for(let i=0;i<count;i++){
  const mote=element("span","jh-victory-mote jh-victory-"+PALETTE[i%4]);
  // Stable hand-arranged geometry without random input or reflow.
  mote.style.setProperty("--x",(12+(i*37)%75)+"%");
  mote.style.setProperty("--y",(21+(i*29)%63)+"%");
  mote.style.setProperty("--delay",Math.round(durationMs*(.09+.62*i/(count-1)))+"ms");
  mote.style.setProperty("--drift",((i%5)-2)*9+"px");
  overlay.append(mote);
 }
 // A few softly drifting sakura petals bridge the two Hanabi waves.
 // Keep the total DOM bounded even on slower mobile phones.
 const petalCount=tier===1?3:tier===2?5:7;
 for(let i=0;i<petalCount;i++){
  const petal=element("span","jh-victory-petal");
  petal.style.setProperty("--x",(18+(i*31)%66)+"%");
  petal.style.setProperty("--y",(24+(i*23)%52)+"%");
  petal.style.setProperty("--delay",Math.round(durationMs*(.40+.19*i/Math.max(1,petalCount-1)))+"ms");
  petal.style.setProperty("--drift",((i%3)-1)*24+"px");
  petal.style.setProperty("--twist",(i%2?75:-75)+"deg");
  overlay.append(petal);
 }
 boardShell.append(overlay);
 boardShell.classList.add("jh-victory-active");
 board.classList.add("jh-victory-board");
 // Match the board shimmer to the same duration as the festival layer.
 const priorBoardDuration=board.style.getPropertyValue("--jh-victory-duration");
 board.style.setProperty("--jh-victory-duration",durationMs+"ms");
 try{onStart?.(tier);}catch(error){root.console?.warn?.("Victory sound unavailable",error);}
 return new Promise(resolve=>{
  let done=false;
  const finish=status=>{
   if(done)return;
   done=true;
   root.clearTimeout(timeout);
   root.document.removeEventListener("visibilitychange",hidden);
   root.removeEventListener("pagehide",pageHidden);
   overlay.remove();
   boardShell.classList.remove("jh-victory-active");
   board.classList.remove("jh-victory-board");
   if(priorBoardDuration)board.style.setProperty("--jh-victory-duration",priorBoardDuration);
   else board.style.removeProperty("--jh-victory-duration");
   if(active?.finish===finish)active=null;
   resolve({status,stars:tier,durationMs});
  };
  const hidden=()=>{if(root.document.hidden)finish("hidden");};
  const pageHidden=()=>finish("hidden");
  const timeout=root.setTimeout(()=>finish("finished"),durationMs);
  active={finish};
  root.document.addEventListener("visibilitychange",hidden);
  root.addEventListener("pagehide",pageHidden,{once:true});
 });
}
root.HarmonyVictoryCelebration=Object.freeze({play,cancel,DURATIONS});
})(typeof window!=="undefined"?window:globalThis);
