/* Japanese Harmony — Audio & Reward 4.2
 * Compact, self-contained Web Audio cue engine. No audio assets/network.
 * Soft five-tone pentatonic chimes, wooden clicks and water-like accents.
 * No autoplay: AudioContext is unlocked only after a user gesture.
 * Event priority/cooldowns and voice budget stop large Pulse chains
 * becoming a noisy wall of simultaneous oscillators.
 */
(function(root){
"use strict";
let enabled=true,context=null,master=null;
const voices=new Set(),lastPlayed=new Map();
const MAX_VOICES=8;
const FAMILY_PITCH={sakura:523.25,lantern:587.33,koi:659.25,fan:698.46,bonsai:783.99};
const PENTATONIC=[587.33,659.25,783.99,880,987.77,1174.66,1318.51];
const LIMITS={tap:65,swap:85,invalid:190,fusion:125,bonus:115,pulse:115,hero:240,harvest:285,goal:700,arrival:170,progress:150,result:900};
function unlock(){
 if(!enabled)return false;
 const Audio=root.AudioContext||root.webkitAudioContext;
 if(!Audio)return false;
 try{
  if(!context){
   context=new Audio();
   master=context.createGain();
   master.gain.value=.62;
   master.connect(context.destination);
  }
  if(context.state==="suspended")context.resume().catch(()=>{});
  return true;
 }catch(e){return false;}
}
function note(freq,delay,duration,volume,type="sine"){
 if(!context||!master||voices.size>=MAX_VOICES||context.state==="closed")return;
 let osc,gain;
 try{
  osc=context.createOscillator();
  gain=context.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(Math.min(2500,Math.max(150,freq)),context.currentTime);
  const start=context.currentTime+Math.max(.008,delay);
  const peak=Math.max(.0002,volume);
  // Slight pluck instead of a long single sine beep. A very short attack
  // gives a tangible click; exponentially decaying tail suggests a bell.
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(peak,start+.012);
  gain.gain.exponentialRampToValueAtTime(.00012,start+duration);
  osc.connect(gain);gain.connect(master);
  osc.onended=()=>{voices.delete(osc);try{osc.disconnect();gain.disconnect();}catch(e){}};
  voices.add(osc);
  osc.start(start);osc.stop(start+duration+.015);
 }catch(e){
  if(osc){voices.delete(osc);try{osc.disconnect();}catch(ignore){}}
  if(gain)try{gain.disconnect();}catch(ignore){}
 }
}
function stop(){
 for(const osc of voices){try{osc.stop();}catch(e){}}
 voices.clear();lastPlayed.clear();
}
function setEnabled(value){
 enabled=!!value;
 if(!enabled)stop();
}
function play(type,detail={}){
 if(!enabled||!LIMITS[type])return false;
 // performance.now is monotonic. Prefer it over Date to handle a device
 // clock changing during a long game.
 const now=(root.performance&&root.performance.now)?root.performance.now():Date.now();
 const last=lastPlayed.get(type);
 if(last!==undefined&&now-last<LIMITS[type])return false;
 if(!unlock())return false;
 lastPlayed.set(type,now);
 const stage=Math.max(1,Math.min(5,Number(detail.stage)||1));
 const base=FAMILY_PITCH[detail.family]||587.33;
 const wave=Math.max(0,Math.min(20,Number(detail.wave)||0));
 const combo=Math.max(1,Math.min(5,Number(detail.combo)||1));
 switch(type){
  case "tap": // a dry wood-like tap
   note(355,0,.07,.055,"triangle");
   break;
  case "swap": // reassuring wooden tick followed by motion
   note(410,0,.095,.055,"triangle");
   note(615,.045,.082,.030,"sine");
   break;
  case "invalid": // short muted two-part return
   note(290,0,.105,.047,"triangle");
   note(230,.070,.090,.035,"triangle");
   break;
  case "fusion":{ // unique pitch per family, slightly higher as the stage grows
   const pitch=base*Math.pow(2,(stage-1)*.047);
   note(pitch,0,.19,.066,"triangle");
   note(pitch*1.5,.078,.29,.049,"sine");
   if(combo>=4)note(pitch*2,.14,.20,.030,"sine");
   break;
  }
  case "bonus":
   note(740,0,.18,.042,"sine");
   note(987.77,.09,.19,.036,"sine");
   break;
  case "pulse":{ // each chained wave climbs one step through a pentatonic scale
   const index=Math.min(PENTATONIC.length-1,wave);
   note(PENTATONIC[index],0,.23,.062,"triangle");
   note(PENTATONIC[index]*1.5,.075,.20,.029,"sine");
   break;
  }
  case "hero":
   note(587.33,0,.35,.055,"triangle");
   note(783.99,.075,.33,.050,"sine");
   note(987.77,.145,.39,.044,"sine");
   break;
  case "harvest":
   note(659.25,0,.30,.055,"triangle");
   note(880,.075,.37,.055,"sine");
   note(1174.66,.17,.46,.045,"sine");
   break;
  case "goal":
   note(587.33,0,.23,.048,"triangle");
   note(783.99,.12,.25,.047,"sine");
   note(880,.23,.31,.049,"sine");
   note(1174.66,.37,.50,.046,"sine");
   break;
  case "progress":
   note(783.99,0,.18,.036,"sine");
   break;
  case "arrival":{
   const amount=Math.max(0,Number(detail.points)||0);
   note(amount>=500?1174.66:987.77,0,.145,amount>=500?.057:.039,"sine");
   if(amount>=500)note(1479.98,.048,.16,.032,"sine");
   break;
  }
  case "result":
   note(659.25,0,.29,.048,"sine");
   note(880,.16,.34,.048,"sine");
   note(1174.66,.31,.51,.050,"sine");
   break;
 }
 return true;
}
root.HarmonyAudio=Object.freeze({play,unlock,setEnabled,stop});
})(typeof window!=="undefined"?window:globalThis);
