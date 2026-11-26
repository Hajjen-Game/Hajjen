// Periodic centerline, grade-aware banked surface and local road frame.
// Independent of track selection, browser, renderer or authored route names.
// The course owns sections, elevation, bank profile and sampling resolution.
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const lerp=(a,b,t)=>a+(b-a)*t;
export function createTrackSampler({lapLength,sections,apexPulses={},lapPosition,
 elevationAt,groundNormalAt,magneticBankAt,corkscrewBankAt,step=.25}){
 const CIRCUIT={lapLength},COURSE_SEGMENTS=sections,TECHNICAL_APEX_PULSES=apexPulses,STEP=step;
function easedCurvature(u){
 const x=clamp(u,0,1);
 return x*x*x*(10+x*(-15+6*x));
}
function integratedEasedCurvature(u){
 const x=clamp(u,0,1);
 return x*x*x*x*(2.5+x*(-3+x));
}
function turnContribution(s,t){
 const {entry,hold,exit,curvature:k}=t;
 const d=clamp(s-t.start,0,entry+hold+exit);
 let base;
 if(d<=entry)base=k*entry*integratedEasedCurvature(d/entry);
 else if(d<=entry+hold)base=k*(entry*.5+d-entry);
 else {
  const x=(d-entry-hold)/exit;
  base=k*(entry*.5+hold+exit*(x-integratedEasedCurvature(x)));
 }
 const pulse=TECHNICAL_APEX_PULSES[t.id]??0;
 if(!pulse||d<=entry||d>=entry+hold)return base;
 // Integral of (cos(4πu)-cos(2πu))/4 is zero over [0,1].
 // Thus the *true* corner radius tightens at the apex while its final
 // heading and its C2 curvature joins stay exactly unchanged.
 const u=(d-entry)/hold;
 return base+pulse*hold*(Math.sin(4*Math.PI*u)/(16*Math.PI)-
    Math.sin(2*Math.PI*u)/(8*Math.PI));
}
function headingAt(s){
 const lap=Math.floor(s/CIRCUIT.lapLength);
 const local=lapPosition(s);
 return lap*2*Math.PI+COURSE_SEGMENTS.reduce((angle,t)=>
  angle+(t.type==="turn"?turnContribution(local,t):0),0);
}
function curvatureAt(s){
 const local=lapPosition(s);
 for(const t of COURSE_SEGMENTS){
  if(t.type!=="turn"||local<t.start||local>=t.end)continue;
  const d=local-t.start;
  if(d<t.entry)return t.curvature*easedCurvature(d/t.entry);
  if(d<t.entry+t.hold){
   const pulse=TECHNICAL_APEX_PULSES[t.id]??0;
   const u=(d-t.entry)/t.hold;
   return t.curvature+.25*pulse*(Math.cos(4*Math.PI*u)-
      Math.cos(2*Math.PI*u));
  }
  return t.curvature*(1-easedCurvature((d-t.entry-t.hold)/t.exit));
 }
 return 0;
}
function bankAt(s){return magneticBankAt(s)+corkscrewBankAt(s);}
function bankDegreesAt(s){return bankAt(s)*180/Math.PI;}
function heightAt(s){return elevationAt(s);}
function surfaceHeightAt(s,lateral=0){
 // The road's lateral tangent rolls about the true grade-aware forward
 // direction, so gravity and hover agree exactly with the rendered deck.
 const p=poseAt(s),ground=groundNormalAt(s,p.heading);
 return elevationAt(s)-ground.y*Math.sin(bankAt(s))*lateral;
}

const positionCount=Math.round(CIRCUIT.lapLength/STEP);
const positions=[{x:0,z:0}];
for(let i=1;i<=positionCount;i++){
 const mid=(i-.5)*STEP,angle=headingAt(mid),prev=positions[i-1];
 positions.push({x:prev.x+Math.sin(angle)*STEP,
  z:prev.z-Math.cos(angle)*STEP});
}
const closingError=positions.at(-1);
for(let i=1;i<=positionCount;i++){
 const f=i/positionCount;
 positions[i].x-=closingError.x*f;
 positions[i].z-=closingError.z*f;
}
const LOOP_CLOSURE_ERROR_METERS=Math.hypot(
 closingError.x,closingError.z);
function poseAt(s){
 const local=lapPosition(s);
 const fIndex=local/STEP,i=Math.floor(fIndex),f=fIndex-i;
 const a=positions[i],b=positions[i+1],heading=headingAt(s);
 return {
  x:lerp(a.x,b.x,f),y:heightAt(s),z:lerp(a.z,b.z,f),heading,
  forwardX:Math.sin(heading),forwardZ:-Math.cos(heading),
  rightX:Math.cos(heading),rightZ:Math.sin(heading)
 };
}
function surfaceNormalAt(s){
 const p=poseAt(s),normal=groundNormalAt(s,p.heading),b=bankAt(s);
 if(!b)return normal;
 return {x:normal.x*Math.cos(b)+p.rightX*Math.sin(b),
  y:normal.y*Math.cos(b),
  z:normal.z*Math.cos(b)+p.rightZ*Math.sin(b)};
}
function positionAt(s,lateral=0,height=0){
 const p=poseAt(s),normal=surfaceNormalAt(s),b=bankAt(s);
 const cb=Math.cos(b),sb=Math.sin(b),base=groundNormalAt(s,p.heading);
 // Rigid orthonormal local road frame: lane-right = right*cos(bank)
 // - grade-normal*sin(bank). Height always follows the true wall normal.
 return {x:p.x+lateral*(p.rightX*cb-base.x*sb)+normal.x*height,
   y:p.y-lateral*base.y*sb+normal.y*height,
   z:p.z+lateral*(p.rightZ*cb-base.z*sb)+normal.z*height};
}

 // EF07 render-build experiment. Route callbacks are immutable during a
 // static installation. Compute the very same frame once per adjacent arc
 // sample, without the duplicate pose/ground/bank evaluations in positionAt.
 // Preserve the original expression order (especially the Y component).
 // Finish clears the single retained frame and returns to the original path.
 function createStaticPositionSampler(){
  let frame=null,active=true,calls=0,frames=0,hits=0;
  const sample=(s,lateral=0,height=0)=>{
   if(!active)return positionAt(s,lateral,height);
   calls++;
   if(!frame||!Object.is(frame.s,s)){
    const p=poseAt(s),base=groundNormalAt(s,p.heading),b=bankAt(s);
    const cb=Math.cos(b),sb=Math.sin(b);
    const normal=b?{x:base.x*cb+p.rightX*sb,y:base.y*cb,z:base.z*cb+p.rightZ*sb}:base;
    frame={s,p,base,normal,cb,sb};frames++;
   }else hits++;
   const {p,base,normal,cb,sb}=frame;
   return {x:p.x+lateral*(p.rightX*cb-base.x*sb)+normal.x*height,
    y:p.y-lateral*base.y*sb+normal.y*height,
    z:p.z+lateral*(p.rightZ*cb-base.z*sb)+normal.z*height};
  };
  sample.finish=()=>{frame=null;active=false;};
  sample.stats=()=>({calls,frames,hits,resident:frame?1:0,active});
  return sample;
 }
 return Object.freeze({easedCurvature,integratedEasedCurvature,headingAt,curvatureAt,bankAt,bankDegreesAt,heightAt,surfaceHeightAt,LOOP_CLOSURE_ERROR_METERS,poseAt,surfaceNormalAt,positionAt,createStaticPositionSampler});
}
