import {createTimeTrialAPI} from "./core/time-trial.mjs";
export {ghostPoseAt,ghostTimeAtDistance} from "./core/ghost-playback.mjs";
import {ACTIVE_TRACK_0160,isAurora} from "./tracks/shared/track-selection-v0160.mjs";
// SKYSHIFT 0.13.0 — deterministic local Personal Best Time Trial + Ghost.
// Recorded from the authoritative 120 Hz pilot state; compressed at 10 Hz.
// Pure gameplay-adjacent data, never a source of physical steering/boost.
// Stored locally per track, no account, network, analytics, or global rankings.
export const TIME_TRIAL_0160=Object.freeze({
 version:"multi-track-time-trial-0160",mode:"time-trial",
 storageKey:isAurora()?"skyshift-time-trial-ghost-aurora-0160":
  "skyshift-time-trial-ghost-0151",
 trackId:isAurora()?"aurora-flow-v0160":"skyline-grip-first-v0901",
 trackRevision:ACTIVE_TRACK_0160.trackRevision,
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
}=createTimeTrialAPI(TIME_TRIAL_0160);
