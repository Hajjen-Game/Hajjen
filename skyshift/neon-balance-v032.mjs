// SKYSHIFT 0.3.2 – Refined Neon Balance.
// Deliberately preserve HDR and modern-device resolution while controlling
// local light energy, pixel coverage and bloom spread.
export const NEON_TUNING=Object.freeze({
  maxPixelRatio:2,
  bloomStrength:.43,
  bloomRadius:.21,
  bloomThreshold:1.40,
  edgeBodyLuminance:1.04,
  edgeCoreLuminance:1.85,
  jumpLuminance:1.26,
  haloOpacity:.038,
  haloLuminance:.34,
  beaconBodyLuminance:.91,
  beaconCoreLuminance:1.72,
  beaconHaloLuminance:.30,
  beaconHaloOpacity:.032,
  shipLuminance:1.44,
  landingLuminance:1.50,
  engineTrailLuminance:1.32,
  impactLuminance:1.85,
  archBodyLuminance:1.16,
  archCoreLuminance:1.80,
  archHaloOpacity:.038,
  enginePointIntensity:2.6,
  exposure:.96
});
export function validateNeonBalance(t=NEON_TUNING){
  const failures=[];
  const ordered=[
    ["edgeBodyLuminance","edgeCoreLuminance"],
    ["beaconBodyLuminance","beaconCoreLuminance"]
  ];
  for(const [a,b] of ordered)if(t[a]>=t[b])failures.push(a+" must be dimmer than "+b);
  if(t.edgeBodyLuminance>=t.bloomThreshold)
    failures.push("body should be below bloom threshold for clean sharp rails");
  if(t.bloomThreshold>=t.edgeCoreLuminance)
    failures.push("core should remain above bloom threshold for subtle HDR glow");
  if(t.bloomStrength>.65||t.bloomRadius>.32)
    failures.push("bloom spread too strong for track and ship readability");
  if(t.haloOpacity>.07||t.beaconHaloOpacity>.06)
    failures.push("geometry halo too opaque");
  if(t.shipLuminance>=t.edgeCoreLuminance)
    failures.push("ship must not outshine crisp rail cores");
  if(t.enginePointIntensity>4.5)failures.push("engine fill light overexposes hull");
  if(t.exposure>1.06)failures.push("scene exposure is too high");
  if(t.maxPixelRatio<2)failures.push("quality regressed below modern-device target");
  return failures;
}
