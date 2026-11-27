// SKYSHIFT 0.3.3.1 – Luminance & Atmosphere Rebalance.
// Scene midtones are lifted independently of emissive neon/bloom.
// No changes to road collision, jump physics, camera or resolution.
export const LUMINANCE=Object.freeze({
  version:"0.3.3.1",
  exposure:1.015, // small global trim; most lift comes from material midtones
  fogDensity:.0068,
  sectors:Object.freeze([
    Object.freeze({sky:0x10243b,fog:0x27485e}), // cyan / The Launch
    Object.freeze({sky:0x201f3d,fog:0x3a365d}), // purple / Skybreak
    Object.freeze({sky:0x2a1c37,fog:0x49334f})  // magenta / Final Velocity
  ]),
  roadBase:0x304e6c,
  roadTintMix:.135,
  roadColor:0xd4e4f2,
  roadEmissive:0x10293e,
  roadEmissiveIntensity:.24,
  roadMetalness:.28,
  roadRoughness:.52,
  rockColor:0x28435f,
  rockEmissive:0x102438,
  rockEmissiveIntensity:.20,
  housingColor:0x31475e,
  panelColor:0x3a5870,
  panelMetalness:.58,
  panelRoughness:.50,
  panelEmissive:0x10283c,
  panelEmissiveIntensity:.17,
  seamColor:0x57738a,
  towerColor:0x2b4660,
  towerInset:0x3e5e78,
  ambientSky:0xb8d9f1,
  ambientGround:0x344961,
  ambientIntensity:1.62,
  keyIntensity:2.55,
  fillIntensity:.72,
  navAccent:.80,
  energyAccent:.95,
  backgroundAccent:.45,
  landmarkAccent:1.33,
  vignetteEdgeOpacity:.19
});

export function validateLuminance(t=LUMINANCE){
  const errors=[];
  const v=hex=>[(hex>>>16)&255,(hex>>>8)&255,hex&255];
  // sRGB display-luminance proxy is sufficient for checking design *direction*.
  const brightness=hex=>{
    const [r,g,b]=v(hex);
    return .2126*r+.7152*g+.0722*b;
  };
  if(!(t.exposure>=.97&&t.exposure<=1.06))
    errors.push("Exposure outside safe range; do not recreate 0.3.1 bloom wash");
  if(!(t.fogDensity>=.005&&t.fogDensity<=.008))
    errors.push("Fog density outside the established visible-horizon range");
  if(!(brightness(t.roadBase)>brightness(0x14233a)*1.7))
    errors.push("Road midtone must be brighter than version 0.3.3");
  if(!(brightness(t.rockColor)>brightness(0x0a1528)*1.7))
    errors.push("World silhouettes must be brighter");
  if(!(brightness(t.panelColor)>brightness(0x17283f)*1.6))
    errors.push("Panels should no longer resemble black gap holes");
  if(!(brightness(t.panelColor)>brightness(t.roadBase)*.93))
    errors.push("Decorative panels should not read as darker collision voids");
  if(!(t.roadTintMix>0&&t.roadTintMix<.24))
    errors.push("Sector colors should tint the road rather than repaint it");
  if(!(t.navAccent<1.4&&t.energyAccent<1.4&&t.landmarkAccent<1.4))
    errors.push("Decorative accents should stay under the HDR bloom threshold");
  if(!(t.vignetteEdgeOpacity<=.26))
    errors.push("Vignette must not darken the world again");
  if(!(t.sectors.length===3))errors.push("Expected three distinct sector palettes");
  if(t.sectors.length===3){
    for(let i=0;i<3;i++)if(brightness(t.sectors[i].fog)<=brightness([0x10263a,0x1a2140,0x251b36][i])*1.25)
      errors.push("Sector "+i+" fog needs a visible atmosphere lift");
  }
  return errors;
}
