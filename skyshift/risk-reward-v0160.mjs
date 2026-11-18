// SKYSHIFT 0.16.0 — two-track risk policy.
import {ACTIVE_TRACK_0160,isAurora} from "./track-selection-v0160.mjs";
import {RISK_REWARD_0151,RHYTHM_GATES_0151,BOOST_CHOICES_0151,
 RACE_BOOST_CHOICES_0151,riskChoiceAt as skylineRiskChoiceAt,
 riskCueAt as skylineRiskCueAt,approachingRiskGate as skylineApproach,
 RHYTHM_FLOW_0151,trackFlowAt as skylineFlowAt} from "./risk-reward-v0151.mjs";
export const RISK_REWARD_0160=isAurora()?Object.freeze({
 version:"aurora-no-risk-lines-0160",lapMeters:3400,totalGatesPerLap:0,
 safeLane:null,dynamicDirection:false,distinctRewardTiers:0,
 physicsSteeringUnchanged:true,roadGeometryUnchanged:true,
 additionalMeshes:0,additionalDrawCalls:0
}):RISK_REWARD_0151;
export const RHYTHM_GATES_0160=isAurora()?Object.freeze([]):RHYTHM_GATES_0151;
export const BOOST_CHOICES_0160=isAurora()?Object.freeze([]):BOOST_CHOICES_0151;
export const RACE_BOOST_CHOICES_0160=isAurora()?Object.freeze([]):RACE_BOOST_CHOICES_0151;
export const riskChoiceAt=(s,l)=>isAurora()?null:skylineRiskChoiceAt(s,l);
export const riskCueAt=(s,l,earned)=>isAurora()?null:skylineRiskCueAt(s,l,earned);
export const approachingRiskGate=s=>isAurora()?null:skylineApproach(s);
export const RHYTHM_FLOW_0160=isAurora()?Object.freeze([
 Object.freeze({start:0,end:450,kind:"accelerate"}),
 Object.freeze({start:450,end:880,kind:"flow"}),
 Object.freeze({start:880,end:1240,kind:"elevation"}),
 Object.freeze({start:1240,end:1700,kind:"switchback"}),
 Object.freeze({start:1700,end:2387.411,kind:"flow"}),
 Object.freeze({start:2387.411,end:2954.508,kind:"elevation"}),
 Object.freeze({start:2954.508,end:3400,kind:"switchback"})
]):RHYTHM_FLOW_0151;
export const trackFlowAt=s=>isAurora()?
 RHYTHM_FLOW_0160.find(b=>((s%3400)+3400)%3400>=b.start&&
 ((s%3400)+3400)%3400<b.end)??null:skylineFlowAt(s);
