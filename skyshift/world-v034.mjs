// SKYSHIFT 0.3.4 – Premium World Rebuild.
// Fewer, sculpted modular formations replace 155 plain cylinders, duplicated
// octahedrons and the unrelated decorative grid. Instanced geometry keeps draw
// calls predictable. Structures are well outside the playable track corridor.
import {TRIAL,positionAt,poseAt,widthAt} from "./trial-v03.mjs";
import {LUMINANCE} from "./luminance-v0331.mjs";

export const WORLD_DESIGN=Object.freeze({
  formationsPerSide:27,
  landmarkDistances:Object.freeze([288,540,782,1025,1257]),
  minimumLateralClearance:10,
  removedOldGrid:true,
  style:"Faceted canyon architecture"
});

function randomFactory(seed=0x5f198c) {
  let state=seed>>>0;
  return ()=> {
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
}

// Sculpted cliff silhouette. A faceted multi-ring mesh has a shoulder,
// deliberate taper, recessed waist and asymmetrical flat summit. The flat
// shading and vertex colors add material depth without emissive strips.
function sculptedGeometry(THREE,variant=0){
  const N=variant===2?9:8;
  const profile=variant===0?
    [[0,1],[.12,1.08],[.38,.82],[.56,.93],[.85,.57],[1,.43]]:
    variant===1?
    [[0,.82],[.15,.90],[.43,.70],[.75,.49],[.92,.25],[1,.08]]:
    [[0,.95],[.13,1.06],[.35,.87],[.52,1.02],[.79,.66],[1,.53]];
  const height=variant===1?18:variant===2?13.5:16;
  const verts=[],colors=[];
  const face=(a,b,c,brightness)=>{
    const base=new THREE.Color(0xffffff).multiplyScalar(brightness);
    for(const p of [a,b,c]){
      verts.push(p[0],p[1],p[2]);
      colors.push(base.r,base.g,base.b);
    }
  };
  const ring=(level,i)=>{
    const [h,r]=profile[level];
    const a=i*2*Math.PI/N;
    const organic=1+.09*Math.sin(i*2.69+variant*1.31);
    const squeeze=variant===1?.76:1;
    return [Math.cos(a)*r*organic*5,h*height,
      Math.sin(a)*r*(1+.08*Math.sin(i*1.97))*5*squeeze];
  };
  for(let j=0;j<profile.length-1;j++){
    for(let i=0;i<N;i++){
      const a=ring(j,i),b=ring(j,(i+1)%N);
      const c=ring(j+1,(i+1)%N),d=ring(j+1,i);
      const light=Math.min(1.12,.64+j*.072+((i*7)%5)*.047);
      face(a,b,c,light);face(a,c,d,light);
    }
  }
  const peak=profile.length-1;
  const center=[0,height+.01,0];
  for(let i=0;i<N;i++)face(ring(peak,i),ring(peak,(i+1)%N),center,1.14);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function createFormationPlan(){
  const random=randomFactory();
  const plan=[];
  for(let k=0;k<WORLD_DESIGN.formationsPerSide;k++){
    const s=45+k*45;
    if(s>=TRIAL.length-20)break;
    for(const side of [-1,1]){
      const variant=(k*3+(side===1?1:0)+Math.floor(random()*3))%3;
      const lateral=side*(widthAt(s)*.5+22+random()*21);
      const foot=-17-random()*6;
      const scale=.72+random()*.85;
      plan.push({s,side,variant,lateral,foot,scale,
        yaw:random()*6.28});
    }
  }
  return plan;
}

export function validateWorldPlan(plan=createFormationPlan()){
  const problems=[];
  for(const [i,f] of plan.entries()){
    if(f.s<0||f.s>TRIAL.length)problems.push(i+": outside trial");
    if(Math.abs(f.lateral)-widthAt(f.s)*.5<WORLD_DESIGN.minimumLateralClearance)
      problems.push(i+": too close to drivable corridor");
    if(f.variant<0||f.variant>2)problems.push(i+": unknown formation");
  }
  return problems;
}

function installFormations(THREE,world){
  const plan=createFormationPlan(),types=[[],[],[]];
  for(const p of plan)types[p.variant].push(p);
  const materials=[
    new THREE.MeshStandardMaterial({color:0x45647e,vertexColors:true,
      metalness:.15,roughness:.73,flatShading:true,
      emissive:0x12273b,emissiveIntensity:.13}),
    new THREE.MeshStandardMaterial({color:0x405a75,vertexColors:true,
      metalness:.12,roughness:.79,flatShading:true,
      emissive:0x12283b,emissiveIntensity:.13}),
    new THREE.MeshStandardMaterial({color:0x4b6480,vertexColors:true,
      metalness:.16,roughness:.70,flatShading:true,
      emissive:0x172c41,emissiveIntensity:.12})
  ];
  const proxy=new THREE.Object3D();
  let instances=0;
  for(let i=0;i<3;i++){
    if(!types[i].length)continue;
    const mesh=new THREE.InstancedMesh(sculptedGeometry(THREE,i),
      materials[i],types[i].length);
    mesh.name="SKYSHIFT sculpted terrain "+i;
    for(let n=0;n<types[i].length;n++){
      const f=types[i][n];
      const p=positionAt(f.s,f.lateral,f.foot);
      proxy.position.set(p.x,p.y,p.z);
      proxy.rotation.set(0,f.yaw,0);
      proxy.scale.set(f.scale,1.1*f.scale,f.scale);
      proxy.updateMatrix();mesh.setMatrixAt(n,proxy.matrix);
      const tint=new THREE.Color(f.side<0?0xc9d6f4:0xe2c0da);
      mesh.setColorAt(n,tint.lerp(new THREE.Color(0xffffff),.76));
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    // Do not force always-visible; a correct bounding sphere helps mobile GPUs.
    mesh.computeBoundingSphere();
    world.add(mesh);
    instances+=types[i].length;
  }
  return {instances,batches:types.filter(a=>a.length).length};
}

// Signature side structures. 6-sided engineered pillars with inset metal
// trenches are deliberate geometry; not a dense forest of random sticks.
function landmarkGeometry(THREE){
  const shape=new THREE.CylinderGeometry(2.05,3.25,13.2,6,1,false);
  shape.translate(0,6.6,0);
  return shape;
}
function installLandmarks(THREE,world){
  const spots=WORLD_DESIGN.landmarkDistances;
  const count=spots.length*2;
  const material=new THREE.MeshPhysicalMaterial({
    color:0x334d69,metalness:.66,roughness:.42,clearcoat:.52,
    clearcoatRoughness:.30,flatShading:true
  });
  const capMat=new THREE.MeshStandardMaterial({color:0x7890a8,
    metalness:.68,roughness:.33});
  const edgeMat=new THREE.MeshBasicMaterial({color:0x6ccbd9,
    transparent:true,opacity:.65,depthWrite:false});
  const bodies=new THREE.InstancedMesh(landmarkGeometry(THREE),material,count);
  const trims=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,7.8,.16),
    edgeMat,count);
  const caps=new THREE.InstancedMesh(new THREE.CylinderGeometry(2.22,2.22,.29,6),
    capMat,count);
  const proxy=new THREE.Object3D();
  let i=0;
  for(const s of spots){
    for(const side of [-1,1]){
      const pose=poseAt(s);
      const lateral=side*(widthAt(s)*.5+16);
      const pos=positionAt(s,lateral,-3.3);
      const size=s>1200?1.24:1;
      proxy.position.set(pos.x,pos.y,pos.z);
      proxy.rotation.set(0,-pose.heading,0);
      proxy.scale.set(size,size,size);proxy.updateMatrix();
      bodies.setMatrixAt(i,proxy.matrix);
      // inlaid vertical guiding light is located on the face of each pillar
      const edge=positionAt(s,lateral+side*2.0,-3.3);
      proxy.position.set(edge.x,edge.y+7.1,edge.z);
      proxy.scale.set(size,size,size);proxy.updateMatrix();
      trims.setMatrixAt(i,proxy.matrix);
      const cap=positionAt(s,lateral,9.8*size-3.3);
      proxy.position.set(cap.x,cap.y,cap.z);
      proxy.updateMatrix();caps.setMatrixAt(i,proxy.matrix);
      trims.setColorAt(i,new THREE.Color(s>900?0xd48ebc:0x64d3dc));
      i++;
    }
  }
  for(const mesh of [bodies,trims,caps]){
    mesh.count=i;mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();world.add(mesh);
  }
  return count;
}

export function installPremiumWorld(THREE,world){
  const formed=installFormations(THREE,world);
  const landmarks=installLandmarks(THREE,world);
  return {
    formations:formed.instances,
    formationBatches:formed.batches,
    landmarks:WORLD_DESIGN.landmarkDistances.length,
    landmarkInstances:landmarks,
    removedOldGrid:true
  };
}
