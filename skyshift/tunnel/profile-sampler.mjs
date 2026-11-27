// Shared optional section profile transform, independent of track identity.
// Keep the authoritative road/physics frame separate from the art envelope.
export function createTunnelProfileSampler(positionAt,profileAt){
 if(typeof positionAt!=="function"||typeof profileAt!=="function")throw Error("Invalid tunnel profile sampler");
 return (s,lateral=0,height=0)=>{
  const [x,y]=profileAt(s,lateral,height);
  return positionAt(s,x,y);
 };
}
