// SKYSHIFT 0.16.0 — track registry; one race motor, distinct course geometry.
// URL selection is explicit, deterministic and kept when reloading settings.
export const TRACKS_0160=Object.freeze([
 Object.freeze({id:"skyline",name:"SKYLINE CIRCUIT",shortName:"SKYLINE",
  tag:"PRECISION · LEAP · WALL · CORKSCREW",hasRiskLines:true,
  hasSkylineChallenges:true,trackRevision:"skyline-risk-diversity-0151"}),
 Object.freeze({id:"aurora",name:"AURORA RUN",shortName:"AURORA",
  tag:"OPEN ROAD · FLOWING S-CURVES · ELEVATION",hasRiskLines:false,
  hasSkylineChallenges:false,trackRevision:"aurora-fair-flow-0164"})
]);
export const parseTrackId=search=>{
 const raw=new URLSearchParams(search||"").get("track");
 return raw==="aurora"?"aurora":"skyline";
};
export const TRACK_ID_0160=parseTrackId(typeof location==="undefined"?"":location.search);
export const ACTIVE_TRACK_0160=TRACKS_0160.find(x=>x.id===TRACK_ID_0160);
export const isAurora=()=>TRACK_ID_0160==="aurora";
