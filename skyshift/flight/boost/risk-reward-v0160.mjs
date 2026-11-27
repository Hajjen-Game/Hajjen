// SKYSHIFT 0.16.0 — two-track risk policy.
import {ACTIVE_TRACK_0160,isAurora} from "../../tracks/shared/track-selection-v0160.mjs";
import {VAULT_BOOST_0283,VAULT_MAIN_BOOST_PADS_0283,
 VAULT_RACE_BOOST_PADS_0283,vaultBoostEnabled0283,vaultMainBoostAt0283}
 from "../../tracks/vault/vault-boost-clarity-v0283.mjs";
export const VAULT_BOOST_0283_ACTIVE=vaultBoostEnabled0283();
import {RISK_REWARD_0151,RHYTHM_GATES_0151,BOOST_CHOICES_0151,
 RACE_BOOST_CHOICES_0151,riskChoiceAt as skylineRiskChoiceAt,
 riskCueAt as skylineRiskCueAt,approachingRiskGate as skylineApproach,
 RHYTHM_FLOW_0151,trackFlowAt as skylineFlowAt} from "./risk-reward-v0151.mjs";
export const RISK_REWARD_0160=isAurora()?Object.freeze({
 version:"aurora-no-risk-lines-0160",lapMeters:3400,totalGatesPerLap:0,
 safeLane:null,dynamicDirection:false,distinctRewardTiers:0,
 physicsSteeringUnchanged:true,roadGeometryUnchanged:true,
 additionalMeshes:0,additionalDrawCalls:0
}):VAULT_BOOST_0283_ACTIVE?Object.freeze({
 version:"vault-boost-clarity-no-risk-lines-0283",
 lapMeters:3400,totalGatesPerLap:0,safeLane:"CENTER",
 dynamicDirection:false,distinctRewardTiers:1,
 standardBoostPadsPerLap:VAULT_MAIN_BOOST_PADS_0283.length,
 riskBoostsPerLap:0,roadGeometryUnchanged:true,
 physicsSteeringUnchanged:true,additionalMeshes:0,
 additionalDrawCalls:0
}):RISK_REWARD_0151;
export const RHYTHM_GATES_0160=isAurora()||VAULT_BOOST_0283_ACTIVE?
 Object.freeze([]):RHYTHM_GATES_0151;
export const BOOST_CHOICES_0160=isAurora()?Object.freeze([]):
 VAULT_BOOST_0283_ACTIVE?VAULT_MAIN_BOOST_PADS_0283:BOOST_CHOICES_0151;
export const RACE_BOOST_CHOICES_0160=isAurora()?Object.freeze([]):
 VAULT_BOOST_0283_ACTIVE?VAULT_RACE_BOOST_PADS_0283:RACE_BOOST_CHOICES_0151;
export const riskChoiceAt=(s,l)=>isAurora()?null:
 VAULT_BOOST_0283_ACTIVE?vaultMainBoostAt0283(s,l):skylineRiskChoiceAt(s,l);
export const riskCueAt=(s,l,earned)=>isAurora()||VAULT_BOOST_0283_ACTIVE?
 null:skylineRiskCueAt(s,l,earned);
export const approachingRiskGate=s=>isAurora()||VAULT_BOOST_0283_ACTIVE?
 null:skylineApproach(s);
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
