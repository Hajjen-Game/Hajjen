// SKYSHIFT 0.27.0 — NEON VAULT, a genuinely new closed three-lap circuit.
// Independent geometry-only plan. Never modify Skyline/Aurora steering.
// Two identical 1700m half-laps: each turns exactly PI radians, so their
// displacements cancel under the half-turn rotation and the loop closes.
// Quintic-curvature entry/exit remain authoritative in trial-v0165.mjs.
const radians=deg=>deg*Math.PI/180;
export const FULL_TUNNEL_LAYOUT_0270=Object.freeze({
 version:"0.27.0",id:"neon-vault-circuit-0270",
 lapMeters:3400,laps:3,raceMeters:10200,
 halfMeters:1700,halfYawDegrees:180,
 tunnelStart:0,tunnelEnd:3400,tunnelMeters:3400,
 roadWidthMeters:23.2,continuousClosedTunnel:true,
 previousTracksUnchanged:true,physicsEngineUnchanged:true,
 steeringUnchanged:true,gripUnchanged:true,
 noGap:true,noMandatoryRoll:true,
 geometry:"mirrored C2 S-links, two technical 90 degree curves, two broad sweeps per lap"
});
const HALF=Object.freeze([
 Object.freeze(["vault-launch-straight",235,0,0]),
 Object.freeze(["vault-s-bend-entry",145,25,32]),
 Object.freeze(["vault-s-bend-link",90,0,0]),
 Object.freeze(["vault-s-bend-release",145,-25,32]),
 Object.freeze(["vault-acceleration",230,0,0]),
 Object.freeze(["vault-grip-curve",240,90,48]),
 Object.freeze(["vault-flow-straight",275,0,0]),
 Object.freeze(["vault-grand-sweep",340,90,70])
]);
export const VAULT_HALF_0270=HALF;
export const VAULT_SECTIONS_0270=Object.freeze(
 [0,1].flatMap(half=>HALF.map(([id,length,degrees,entry])=>
 Object.freeze([
  half===0?id:id+"-return",length,radians(degrees),entry
 ])))
);
export const VAULT_ELEVATION_KEYS_0270=Object.freeze([
 [0,0],[235,0],[475,3],[725,3],[930,8],[1220,8],
 [1500,-1],[1700,0],
 [1935,0],[2175,3],[2425,3],[2630,8],[2920,8],
 [3200,-1],[3400,0]
].map(([s,y])=>Object.freeze([s,y])));
export const VAULT_SECTORS_0270=Object.freeze([
 Object.freeze({id:"launch",name:"VAULT IGNITION",start:0,end:875}),
 Object.freeze({id:"flow",name:"CHROMATIC FLOW",start:875,end:1700}),
 Object.freeze({id:"return",name:"MIRROR RUN",start:1700,end:2575}),
 Object.freeze({id:"finale",name:"NEON FINALE",start:2575,end:3400})
]);
export function validateVaultLayout0270(){
 const length=VAULT_SECTIONS_0270.reduce((s,x)=>s+x[1],0);
 const halfLength=HALF.reduce((s,x)=>s+x[1],0);
 const halfAngle=HALF.reduce((s,x)=>s+radians(x[2]),0);
 const end=VAULT_ELEVATION_KEYS_0270.at(-1);
 return {length,halfLength,halfYaw:halfAngle,
  totalYaw:halfAngle*2,
  startsAtZero:VAULT_ELEVATION_KEYS_0270[0][0]===0,
  closedElevation:end[0]===length&&end[1]===VAULT_ELEVATION_KEYS_0270[0][1],
  nonnegativeHold:HALF.every(x=>x[1]>=x[3]*2),
  mirroredHalves:VAULT_SECTIONS_0270.every((x,i)=>i<HALF.length||
   Math.abs(x[1]-VAULT_SECTIONS_0270[i-HALF.length][1])<1e-8)
 };
}
