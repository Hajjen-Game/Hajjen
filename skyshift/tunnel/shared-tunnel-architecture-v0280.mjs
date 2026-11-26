// SKYSHIFT 0.28.0 — one authored tunnel STYLE, many track layouts.
//
// The canonical style comes from the approved Skyline 0.26.5 visual pipeline:
// original 0.21.1 cross-section, 0.24.1 sculpted panel palette,
// 0.26.0/0.26.1/0.26.5 native local GGX and 0.26.2 packed atlas.
// Track geometry/portals live in ROUTES, not in the look. Future tracks
// declare intervals; they DO NOT duplicate the tunnel renderer.
const freezeDeep=v=>{
 if(v&&typeof v==="object"&&!Object.isFrozen(v)){
  for(const key of Object.keys(v))freezeDeep(v[key]);
  Object.freeze(v);
 }
 return v;
};
export const SHARED_TUNNEL_STYLE_0280=freezeDeep({
 id:"skyline-premium-tunnel",
 version:"0.28.0",
 geometry:{
  crossSection:"original Skyline 0.21.1 31-facet closed vault",
  compressionStartY:9,
  vaultScale:.82,vaultWaveMeters:.55,vaultWidthWave:.015,
  roofSafetyMeters:25.95,panelDepthMeters:.58,
  panelBayMeters:22,panelSpanMeters:20.8,
  panelStepHighMeters:3.8,panelStep4GBMeters:5.5,
  defaultChunkMeters:170
 },
 // Exact original 0.21.4 FLOW_COLORS used by Skyline's 0.24.1 sculptor.
 // Vault uses this SAME palette before its known source-proximal tint.
 // Future edits here affect both tracks, not two copied tables.
 panels:{
  palette:{
   panel:0x142638,panelAlt:0x102031,
   roof:0x192b3d,roofAlt:0x112132,
   lip:0x253d50,shadow:0x06111c,
   brace:0x213749,braceShadow:0x091521,
   conduit:0x264153,groove:0x091828
  },
  wallFacets:[5,6,7,8,9,10,19,20,21,22,23,24],
  roofFacets:[12,13,14,15,16,17,18],
  mobileWallFacets:[5,7,9,20,22,24],
  mobileRoofFacets:[12,14,16,18]
 },
 // These numeric values match 0.26.0 P2's already approved original
 // physical coat, including its one shared geometry and native GGX.
 physical:{
  panel:{color:0x7f9ead,metalness:.89,roughness:.36,
   highOpacity:.60,mobileOpacity:.51,skylineMobileOpacity:.60},
  rib:{color:0x9ab0bc,metalness:.83,roughness:.30,
   highOpacity:.49,mobileOpacity:.41,skylineMobileOpacity:.49},
  highClearcoat:.14,mobileClearcoat:0,clearcoatRoughness:.32,
  atlasHigh:256,atlas4GB:128
 },
 lighting:{
  model:"source-local 0.26.0+0.26.1+0.26.5 native GGX",
  cyan:[.11,.68,.94],amber:[.94,.35,.085],
  additiveWorldLights:0,
  ambientSunIsolation:true
 }
});
const SKYLINE_PORTALS=Object.freeze([0,42,80,118,156,198,240,282,324,363]);
export const SHARED_TUNNEL_ROUTES_0280=freezeDeep({
 skyline:{
  track:"skyline",length:null,
  // Only the 368m authored tunnel is enclosed; racing road untouched.
  segments:[{start:0,end:368,profilePeriod:368,
   portals:SKYLINE_PORTALS,fixturePreset:"skyline-original-0265"}]
 },
 vault:{
  track:"vault",length:3400,
  segments:[{start:0,end:3400,profilePeriod:620,
   portalPitch:42.5,roofPitch:27,amberPitch:42.5,
   railPitch:24,fixturePreset:"vault-source-0273"}]
 },
 aurora:{track:"aurora",length:null,segments:[]}
});
export const TUNNEL_SHARED_ARCHITECTURE_0280=freezeDeep({
 version:"0.28.0",styleId:SHARED_TUNNEL_STYLE_0280.id,
 coreLayers:["source 0.21.1 swept shell profile",
 "source 0.24.1 physical raised panel sculptor",
 "source 0.26.2 packed micro metal",
 "source 0.26.0+0.26.1+0.26.5 local GGX"],
 independentTrackPhysics:true,independentTrackRoutes:true,
 commonPanelMaterials:true,commonPanelPalette:true,
 commonCrossSectionSampler:true,globalChangesRequireExplicitStyleId:true,
 defaultTier:"high",
 supportedTiers:["high","4GB"],
 legacySkylineProtected:true,legacyVaultProtected:true,
 comparison:"?sharedTunnel=classic"
});
const finite=(n)=>typeof n==="number"&&Number.isFinite(n);
const allFinite=(list)=>list.every(finite);
function assertSection(s,length){
 if(!s||!finite(s.start)||!finite(s.end)||s.start<0||
  s.end<=s.start||s.end>length+1e-6)
  throw Error("0.28.0 tunnel section outside its track");
 if(!finite(s.profilePeriod)||s.profilePeriod<=0)
  throw Error("0.28.0 tunnel section has no valid visual profile");
 if(s.portals&&(!Array.isArray(s.portals)||
  !allFinite(s.portals)||s.portals.some(v=>v<s.start||v>s.end)))
  throw Error("0.28.0 portal outside tunnel section");
 if(s.portalPitch!==undefined&&(!finite(s.portalPitch)||s.portalPitch<=0))
  throw Error("0.28.0 invalid fixture pitch");
}
const defaultRoute=(track)=>SHARED_TUNNEL_ROUTES_0280[track]??null;
export function makeTunnelPlan0280({
 track,trackLength=null,sections=null,quality="high",styleId=SHARED_TUNNEL_STYLE_0280.id,
 chunkMeters=SHARED_TUNNEL_STYLE_0280.geometry.defaultChunkMeters
}={}){
 if(typeof track!=="string"||!track.trim())throw Error("0.28.0 track ID required");
 if(styleId!==SHARED_TUNNEL_STYLE_0280.id)
  throw Error("0.28.0 no silent second tunnel look: unknown shared style");
 if(quality!=="high"&&quality!=="4GB")
  throw Error("0.28.0 unknown graphics tier");
 if(!finite(chunkMeters)||chunkMeters<40||chunkMeters>340)
  throw Error("0.28.0 bounded mesh chunk size required");
 const known=defaultRoute(track);
 if(sections===null&&!known)
  throw Error("0.28.0 new track requires explicit tunnel sections");
 const chosen=sections??known.segments;
 if(!Array.isArray(chosen))throw Error("0.28.0 sections must be an array");
 const last=chosen.length?Math.max(...chosen.map(x=>x.end)):0;
 const length=trackLength??(known?.length??last);
 if(!finite(length)||length<=0)throw Error("0.28.0 finite track length required");
 const ordered=chosen.map(s=>({...s})).sort((a,b)=>a.start-b.start);
 let previous=-1;
 const plans=[];
 for(const section of ordered){
  assertSection(section,length);
  if(section.start<previous-1e-6)
   throw Error("0.28.0 overlapping tunnel sections on one track");
  previous=section.end;
  const from=section.start,to=section.end;
  const chunkCount=Math.ceil((to-from)/chunkMeters);
  const chunks=[];
  for(let i=0;i<chunkCount;i++){
   const a=from+i*chunkMeters,b=Math.min(to,a+chunkMeters);
   chunks.push(Object.freeze({start:a,end:b,index:i}));
  }
  const portals=section.portals??(section.portalPitch?
   Array.from({length:Math.floor((to-from)/section.portalPitch)+1},
    (_,i)=>from+i*section.portalPitch).filter(s=>s<=to):[]);
  plans.push(Object.freeze({...section,
   start:from,end:to,portals:Object.freeze([...portals]),
   chunks:Object.freeze(chunks),meters:to-from}));
 }
 const profileAt=(segmentIndex,sharedSampler)=>{
  const segment=plans[segmentIndex];
  if(!segment||typeof sharedSampler!=="function")
   throw Error("0.28.0 reusable cross-section sampler required");
  return (j,s)=>sharedSampler(j,s,{
   start:segment.start,end:segment.end,period:segment.profilePeriod
  });
 };
 const segmentAt=s=>plans.find(x=>s>=x.start&&s<=x.end)??null;
 return Object.freeze({
  version:"0.28.0",track,length,quality,styleId,
  style:SHARED_TUNNEL_STYLE_0280,
  intervals:Object.freeze(plans),
  totalEnclosedMeters:plans.reduce((n,x)=>n+x.meters,0),
  totalChunks:plans.reduce((n,x)=>n+x.chunks.length,0),
  sourceProfile:"original Skyline 0.21.1",
  sharedPanels:"original Skyline 0.24.1",
  sharedMetal:"original Skyline 0.26.0/0.26.1/0.26.2/0.26.5",
  segmentAt,profileAt
 });
}
// The legacy Skyline/Vault release compares must keep working; 0.28.x
// enables all prior 0.27.x layers without listing every new release.
// Do not accidentally enable them for historical 0.26.x screenshots.
export function tunnelReleaseAtLeast0280(version,minPatch=0){
 if(typeof version!=="string")return false;
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.|$)/.exec(version);
 if(!m)return false;
 const [major,minor,patch]=m.slice(1).map(Number);
 return major>0||minor>27||(minor===27&&patch>=minPatch);
}
export function sharedTunnelVersionActive0280(version){
 const m=/^(\d+)\.(\d+)\.(\d+)(?:\.|$)/.exec(version??"");
 return !!m&&(Number(m[1])>0||Number(m[2])>28||
  (Number(m[2])===28&&Number(m[3])>=0));
}
export function tunnelQuality0280(lowMemory){
 return lowMemory?"4GB":"high";
}
export function sharedPhysicalPreset0280(role,mobile=false,track="vault"){
 if(role!=="panel"&&role!=="rib")
  throw Error("0.28.0 physical coat must be an existing panel or rib");
 const p=SHARED_TUNNEL_STYLE_0280.physical;
 const r=p[role];
 return Object.freeze({color:r.color,metalness:r.metalness,
  roughness:r.roughness,clearcoat:mobile?p.mobileClearcoat:p.highClearcoat,
  clearcoatRoughness:p.clearcoatRoughness,
  opacity:mobile?(track==="skyline"?r.skylineMobileOpacity:r.mobileOpacity):r.highOpacity,envMapIntensity:0});
}
