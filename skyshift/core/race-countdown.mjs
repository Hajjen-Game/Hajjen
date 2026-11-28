// Countdown is presentation time only. Existing RAF owns it; no timers or
// simulation ticks while the race lifecycle is in countdown mode.
export function createRaceCountdown(){
 const labels=["3","2","1","GO!"],durations=[1,1,1,.6];
 let index=-1,remaining=0,history=[];
 const label=()=>labels[index]??"";
 return Object.freeze({
  start(){index=0;remaining=durations[0];history=["3"];},
  advance(dt,visible=true){
   if(index<0||!visible||!Number.isFinite(dt)||dt<=0)return label();
   remaining-=Math.min(.1,dt);
   if(remaining<=1e-8){
    index++;
    if(index>=labels.length){index=-1;remaining=0;}
    else{remaining=durations[index];history.push(label());}
   }
   return label();
  },
  cancel(){index=-1;remaining=0;},
  get label(){return label();},history:()=>history.slice()
 });
}
