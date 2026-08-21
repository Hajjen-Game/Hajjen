import { PATHS } from "../data/zones.js";

function segInfo(px,py,a,b){
  const vx=b[0]-a[0],vy=b[1]-a[1],wx=px-a[0],wy=py-a[1],c2=vx*vx+vy*vy;
  const t=Math.max(0,Math.min(1,(vx*wx+vy*wy)/c2)),qx=a[0]+t*vx,qy=a[1]+t*vy;
  return {d:Math.hypot(px-qx,py-qy),qx,qy,t};
}

export function nearestPath(zone,x,y){
  let best=null;
  for(const s of PATHS[zone]){
    const info=segInfo(x,y,s.a,s.b);
    if(!best||info.d<best.info.d)best={s,info};
  }
  return best;
}

export function allowed(zone,x,y){
  const n=nearestPath(zone,x,y);
  return n.info.d<=n.s.w;
}

export function applyPathMagnet(zone,x,y){
  const n=nearestPath(zone,x,y);
  if(n.info.d<n.s.w*.58)return[x,y];
  const strength=Math.min(.28,(n.info.d-n.s.w*.58)/(n.s.w*.42)*.28);
  return[x+(n.info.qx-x)*strength,y+(n.info.qy-y)*strength];
}
