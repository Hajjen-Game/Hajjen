import {createZoneWaveAPI} from "./core/zone-wave.mjs";
export {ZONE_PALETTES,SPECTRAL_FRONT_GLSL} from "./core/zone-wave.mjs";
// SKYSHIFT 0.6.0 — eight 18s world-space zone transitions for faster race
// color fronts. Simulation clock comes from the fixed 120Hz flight state;
// neither render frame rate nor camera motion schedules the waves.
export const ZONE_WAVE=Object.freeze({
 firstSeconds:18,intervalSeconds:18,triggers:Array.from({length:8},(_,i)=>(i+1)*18),
 behindMeters:90,frontMetersPerSecond:170,
 featherMeters:24,stages:9,fronts:1,
 crestMeters:4.5,afterglowMeters:62,resonanceSeconds:.62,
 whiteCoreMeters:2.9,whiteBloomMeters:14,
 filamentRangeMeters:19,filamentIntensity:.17,
 whiteCoreEnergy:.72,whiteBloomEnergy:.20,
 horizonCueMeters:135,
 chargingSeconds:.19,atmosphereTransitionMeters:66,
 direction:"behind-to-ahead",screenFlash:false,
 shaderUniformOnly:true
});

export const {
 frontPaletteBlend,
 spectralChargeStrength,
 horizonWaveCue,
 waveResonanceStrength,
 newZoneWaveState,
 stageAtS,
 updateZoneWave
}=createZoneWaveAPI(ZONE_WAVE);
