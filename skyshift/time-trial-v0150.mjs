import {createTimeTrialAPI} from "./core/time-trial.mjs";
export {ghostPoseAt,ghostTimeAtDistance} from "./core/ghost-playback.mjs";
// SKYSHIFT 0.13.0 — deterministic local Personal Best Time Trial + Ghost.
// Recorded from the authoritative 120 Hz pilot state; compressed at 10 Hz.
// Pure gameplay-adjacent data, never a source of physical steering/boost.
// Stored locally per track, no account, network, analytics, or global rankings.
export const TIME_TRIAL_0150=Object.freeze({
 version:"time-trial-ghost-0150",mode:"time-trial",
 storageKey:"skyshift-time-trial-ghost-0150",
 trackId:"skyline-grip-first-v0901",trackRevision:"skyline-risk-choice-0150",
 laps:3,raceMeters:10200,sampleIntervalSeconds:.10,
 maxSamples:3600,maxStorageChars:340000,
 ghostMaxDrawCalls:2,ghostColliders:0,ghostLights:0,
 physicalFlightUnchanged:true,
 timeTrialSameFlightPhysics:true,
 cloudSaving:false,offlineOnly:true
});

export const {
 formatTrialTime,
 formatTrialDelta,
 createTimeTrialState,
 validateGhost,
 GHOST_TOGGLE_KEY,
 readGhostEnabled,
 saveGhostEnabled,
 loadPersonalGhost,
 savePersonalGhost,
 clearPersonalGhost,
 startTimeTrial,
 captureTimeTrialSample,
 finishTimeTrial,
 updateGhostDelta,
 ghostAudit
}=createTimeTrialAPI(TIME_TRIAL_0150);
