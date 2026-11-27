// 0.29.0 experimental Vault spectacle; off unless explicitly requested.
export const VAULT_MEGA_JUMP=Object.freeze({
 id:"vault-mega-jump",name:"VAULT MEGA JUMP",
 start:1136,end:1190.4,lipMeters:1136,approachStart:1090,
 landingClearance:54.4,launchVelocity:15.6,gravity:22,
 autoLaunch:true,minTakeoffSpeed:40,widthMeters:23.2,
 chamberStart:1085,chamberFullStart:1136,chamberFullEnd:1280,chamberEnd:1360,
 rampRise:3,pitDepth:8,upperWidthScale:1.28,roofScale:1.7
});
export function vaultMegaJumpEnabled(search=typeof location==="undefined"?"":location.search){
 const q=new URLSearchParams(search||"");
 return q.get("track")==="vault"&&q.get("vaultJump")==="1"&&
 !["classic","off"].includes(q.get("sharedTunnel"))&&
 !["classic","off"].includes(q.get("trueSharedRenderer"))&&
 (q.get("v")==="0.28.9.11"||q.get("v")==="0.29.0");
}
export const VAULT_MEGA_JUMP_ACTIVE=vaultMegaJumpEnabled();
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=t=>{const x=clamp(t);return x*x*x*(10+x*(-15+6*x));};
const derivative=t=>{const x=clamp(t);return 30*x*x*(1-x)*(1-x);};
export function chamberBlend(s){
 const j=VAULT_MEGA_JUMP;
 if(s<=j.chamberStart||s>=j.chamberEnd)return 0;
 if(s<j.chamberFullStart)return ease((s-j.chamberStart)/(j.chamberFullStart-j.chamberStart));
 if(s<=j.chamberFullEnd)return 1;
 return ease((j.chamberEnd-s)/(j.chamberEnd-j.chamberFullEnd));
}
export function megaJumpRise(s){return VAULT_MEGA_JUMP.rampRise*chamberBlend(s);}
export function megaJumpGrade(s){
 const j=VAULT_MEGA_JUMP;
 if(s<=j.chamberStart||s>=j.chamberEnd)return 0;
 if(s<j.chamberFullStart){const d=j.chamberFullStart-j.chamberStart;return j.rampRise*derivative((s-j.chamberStart)/d)/d;}
 if(s<=j.chamberFullEnd)return 0;
 const d=j.chamberEnd-j.chamberFullEnd;
 return -j.rampRise*derivative((j.chamberEnd-s)/d)/d;
}
export function chamberProfileAt(s,lateral,height){
 const j=VAULT_MEGA_JUMP,b=chamberBlend(s);
 // Leave shoulder/rail/edge-light anchors at the approved road frame.
 // Non-affine only in the upper envelope; never use an affine source
 // frame cache AFTER this transform.
 const upper=ease((height-2)/12);
 return [lateral*(1+b*upper*(j.upperWidthScale-1)),
  height+b*Math.max(0,height-2)*(j.roofScale-1)*upper];
}
