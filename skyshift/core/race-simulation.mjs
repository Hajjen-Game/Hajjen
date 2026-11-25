// Race simulation orchestration: renderer-independent fixed clock, input and presentation snapshots.
// Physics stays in the supplied step function; callers own UI, telemetry and effects.
import {createFrameClock,advanceFrame,capturePose,interpolatePose,shouldSnapPose} from "./frame-pacing-v0112.mjs";

export function createRaceSimulation(){
 return {clock:createFrameClock(),current:null,previous:null,alpha:0,interpolated:{}};
}
export function snapRacePose(state,flight,resetAlpha=true){
 state.current=capturePose(flight);
 state.previous=state.current;
 if(resetAlpha)state.alpha=0;
}
export function resetRaceSimulation(state,flight){
 state.clock=createFrameClock();
 snapRacePose(state,flight);
}
export function advanceRaceSimulation(state,rawDelta,flight,stepFlight){
 const tick=advanceFrame(state.clock,rawDelta,step=>{
  if(!state.current)state.current=capturePose(flight);
  if(!state.previous||state.previous===state.current)
   state.previous=capturePose(state.current);
  capturePose(state.current,state.previous);
  stepFlight(step);
  capturePose(flight,state.current);
  if(shouldSnapPose(state.previous,state.current))
   capturePose(state.current,state.previous);
 });
 state.alpha=tick.alpha;
 return tick;
}
export function raceRenderPose(state,flight,playing){
 return playing&&state.current?
  interpolatePose(state.previous,state.current,state.alpha,state.interpolated):flight;
}
export function readRaceInput(input){
 const right=input.keys.has("ArrowRight")||input.keys.has("KeyD");
 const left=input.keys.has("ArrowLeft")||input.keys.has("KeyA");
 const keyboard=(right?1:0)-(left?1:0);
 return {steer:Math.max(-1,Math.min(1,keyboard*.74+input.inputX)),
  grip:input.gripHeld||input.keys.has("ShiftLeft")||input.keys.has("ShiftRight")};
}
// null = continue; true/false = finish with success/failure.
export function raceOutcome(flight,result,challenge){
 if(challenge){
  const reached=flight.s>=challenge.endS&&!flight.failed;
  return reached||flight.failed?reached:null;
 }
 return result.finished?true:flight.failed?false:null;
}
