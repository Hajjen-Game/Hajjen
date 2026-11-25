// Shared pure ghost playback; independent of track, storage, renderer and URL state.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
function interp(a,b,r,angle=false){
 if(angle){
  let diff=(b-a+Math.PI)%(Math.PI*2);
  if(diff<0)diff+=Math.PI*2;
  return a+(diff-Math.PI)*r;
 }
 return a+(b-a)*r;
}
function searchPair(samples,value,idx){
 let lo=0,hi=samples.length-1;
 if(value<=samples[0][idx])return 0;
 if(value>=samples[hi][idx])return hi-1;
 while(lo+1<hi){
  const m=(lo+hi)>>1;
  if(samples[m][idx]<=value)lo=m;
  else hi=m;
 }
 return lo;
}
export function ghostPoseAt(best,elapsed,out={}){
 if(!best||!best.samples?.length||!Number.isFinite(elapsed)||elapsed<0||
  elapsed>best.duration)return null;
 const arr=best.samples,i=searchPair(arr,elapsed,0);
 const a=arr[i],b=arr[i+1];
 const f=clamp((elapsed-a[0])/Math.max(.000001,b[0]-a[0]));
 out.elapsed=elapsed;out.s=interp(a[1],b[1],f);
 out.worldX=interp(a[2],b[2],f);
 out.y=interp(a[3],b[3],f);out.worldZ=interp(a[4],b[4],f);
 out.heading=interp(a[5],b[5],f,true);
 out.roll=interp(a[6],b[6],f,true);
 out.pitch=interp(a[7],b[7],f,true);
 return out;
}
export function ghostTimeAtDistance(best,distance){
 if(!best||!best.samples?.length||!Number.isFinite(distance))return null;
 const a=best.samples,first=a[0],last=a[a.length-1];
 if(distance<=first[1])return 0;
 if(distance>=last[1])return best.duration;
 const i=searchPair(a,distance,1),s0=a[i],s1=a[i+1];
 const fraction=clamp((distance-s0[1])/Math.max(.0001,s1[1]-s0[1]));
 return interp(s0[0],s1[0],fraction);
}
