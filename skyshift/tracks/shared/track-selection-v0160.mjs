// SKYSHIFT 0.16.0 — track registry; one race motor, distinct course geometry.
// URL selection is explicit, deterministic and kept when reloading settings.
export const TRACKS_0160=Object.freeze([
 Object.freeze({id:"skyline",name:"SKYLINE CIRCUIT",shortName:"SKYLINE",
  tag:"PRECISION · LEAP · WALL · CORKSCREW",hasRiskLines:true,
  hasSkylineChallenges:true,trackRevision:"skyline-risk-diversity-0151"}),
 Object.freeze({id:"aurora",name:"AURORA RUN",shortName:"AURORA",
  tag:"OPEN ROAD · FLOWING S-CURVES · ELEVATION",hasRiskLines:false,
  hasSkylineChallenges:false,trackRevision:"aurora-run-0160"}),
 Object.freeze({id:"vault",name:"NEON VAULT CIRCUIT",shortName:"NEON VAULT",
  tag:"FULL TUNNEL · FLOW S-LINKS · C2 CORNERS",hasRiskLines:false,
  hasSkylineChallenges:false,trackRevision:"full-tunnel-foundation-0270"})
]);
export const parseTrackId=search=>{
 const raw=new URLSearchParams(search||"").get("track");
 return raw==="aurora"?"aurora":raw==="vault"?"vault":"skyline";
};
export const TRACK_ID_0160=parseTrackId(typeof location==="undefined"?"":location.search);
export const ACTIVE_TRACK_0160=TRACKS_0160.find(x=>x.id===TRACK_ID_0160);
export const isAurora=()=>TRACK_ID_0160==="aurora";

export const isVault=()=>TRACK_ID_0160==="vault";
