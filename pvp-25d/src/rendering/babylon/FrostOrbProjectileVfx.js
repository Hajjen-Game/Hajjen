// Frostbolt VFX 3.0 for Orb Arena. Dedicated 3D lance + animated GPU
// ribbon shaders + ice-fracture impact. No Pixi or Blender dependency.
// Visual only: game damage, collision and cast timing are unchanged.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x,0,1),3);
const rgb=h=>BABYLON.Color3.FromHexString(h);

const ICE_VERTEX=[
"precision highp float;",
"attribute vec3 position; attribute vec3 normal; attribute vec2 uv;",
"uniform mat4 worldViewProjection;",
"varying vec3 vNormal; varying vec2 vUv;",
"void main(){vNormal=normal;vUv=uv;gl_Position=worldViewProjection*vec4(position,1.0);}"
].join("\n");
const ICE_FRAGMENT=[
"precision highp float;",
"varying vec3 vNormal; varying vec2 vUv;",
"uniform vec3 tint; uniform float time; uniform float opacity;",
"void main(){",
"vec3 n=normalize(vNormal);",
"float facet=.50+.26*dot(n,normalize(vec3(-.42,.84,.43)));",
"float side=pow(1.0-abs(n.z),2.0);",
"float seam=pow(abs(sin(vUv.x*19.0+vUv.y*15.0)),15.0)*.055;",
"vec3 ice=tint*(.66+facet*.39+side*.13)+vec3(.05,.12,.15)*seam;",
"ice*=.96+.04*sin(time*11.0+vUv.x*13.0);",
"gl_FragColor=vec4(min(ice,vec3(.83,.91,.97)),opacity);",
"}"
].join("\n");
const RIBBON_VERTEX=[
"precision highp float;",
"attribute vec3 position; attribute vec2 uv;",
"uniform mat4 worldViewProjection; varying vec2 vUv;",
"void main(){vUv=uv;gl_Position=worldViewProjection*vec4(position,1.0);}"
].join("\n");
const RIBBON_FRAGMENT=[
"precision highp float;",
"varying vec2 vUv;",
"uniform float time; uniform float opacity; uniform vec3 tint;",
"void main(){",
"float x=vUv.x;float edge=abs(vUv.y*2.0-1.0);",
"float feather=pow(max(0.0,1.0-edge),1.55);",
"float swirl=sin(x*23.0-time*9.0+sin(x*11.0+time*2.0)*.75);",
"float filaments=.73+.27*sin((vUv.y-.5)*14.0+time*3.5-x*18.0);",
"float towardHead=smoothstep(.02,.94,x);",
"float broken=1.0-.18*pow(max(0.0,sin(time*8.0-x*21.0)),5.0);",
"float alpha=opacity*feather*towardHead*(.62+.38*swirl*swirl)*broken;",
"vec3 col=tint*(.72+.20*filaments);",
"gl_FragColor=vec4(col,clamp(alpha,0.0,.85));",
"}"
].join("\n");

function shader(scene,name,vertexSource,fragmentSource,attributes,uniforms){
  const m=new BABYLON.ShaderMaterial(name,scene,{vertexSource,fragmentSource},
    {attributes,uniforms,needAlphaBlending:true,needAlphaTesting:false});
  m.backFaceCulling=false;
  m.disableDepthWrite=true;
  m.needDepthPrePass=false;
  m.alphaMode=BABYLON.Engine.ALPHA_COMBINE;
  return m;
}
function regular(scene,name,hex,alpha,emissive=.55){
  const m=new BABYLON.StandardMaterial(name,scene),c=rgb(hex);
  m.diffuseColor=c.scale(.20);
  m.emissiveColor=c.scale(emissive);
  m.specularColor=c.scale(.14);
  m.alpha=alpha;
  m.disableLighting=true;
  m.backFaceCulling=false;
  m.needDepthPrePass=false;
  m.disableDepthWrite=true;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  return m;
}
const v3=(x,y,z)=>new BABYLON.Vector3(x,y,z);
function makeMesh(scene,method,name,opts,parent,material){
  const mesh=BABYLON.MeshBuilder[method](name,opts,scene);
  mesh.parent=parent;mesh.material=material;mesh.isPickable=false;
  return mesh;
}

// Explicitly tapered 8-sided ice lance; never a built-in cube/polyhedron.
// Geometry has real normals so the fragment shader reveals individual facets.
function iceLance(scene,name,parent,material,size=1){
  const stations=[[-.46,.020],[-.33,.100],[-.12,.150],[.20,.116],[.52,.003]];
  const positions=[],indices=[],normals=[],uvs=[];
  let index=0;
  for(let s=0;s<stations.length-1;s++){
    for(let f=0;f<8;f++){
      const p0=stations[s],p1=stations[s+1];
      const a=f*TAU/8,b=(f+1)*TAU/8;
      const wob=f%2===0?1.08:.94;
      const pts=[
        [Math.cos(a)*p0[1]*wob,Math.sin(a)*p0[1]*.88,p0[0]],
        [Math.cos(b)*p0[1],Math.sin(b)*p0[1]*.88,p0[0]],
        [Math.cos(b)*p1[1],Math.sin(b)*p1[1]*.88,p1[0]],
        [Math.cos(a)*p1[1]*wob,Math.sin(a)*p1[1]*.88,p1[0]]
      ];
      for(const q of [0,1,2,0,2,3]){
        positions.push(pts[q][0]*size,pts[q][1]*size,pts[q][2]*size);
        uvs.push(s/4+q*.04,f/8);
      }
      indices.push(index,index+1,index+2,index+3,index+4,index+5);
      index+=6;
    }
  }
  BABYLON.VertexData.ComputeNormals(positions,indices,normals);
  const body=new BABYLON.Mesh(name,scene);
  const data=new BABYLON.VertexData();
  data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;
  data.applyToMesh(body);
  body.parent=parent;body.material=material;body.isPickable=false;
  return body;
}
function trailSurface(scene,name,parent,material){
  const body=new BABYLON.Mesh(name,scene);
  const positions=[],uvs=[],indices=[],normals=[];
  for(let i=0;i<17;i++){
    positions.push(0,0,0,0,0,0);
    uvs.push(i/16,0,i/16,1);
    normals.push(0,1,0,0,1,0);
    if(i<16){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
  }
  const data=new BABYLON.VertexData();
  data.positions=positions;data.uvs=uvs;data.normals=normals;data.indices=indices;
  data.applyToMesh(body,true);
  body.parent=parent;body.material=material;body.isPickable=false;
  body.alwaysSelectAsActiveMesh=true;
  return {mesh:body,positions};
}

export class FrostOrbProjectileVfx{
  constructor(scene,start,target,missed=false){
    this.scene=scene;
    this.start=start.clone();
    this.target=target.clone();
    this.missed=Boolean(missed);
    const delta=target.subtract(start);delta.y=0;
    const length=Math.max(.001,delta.length());
    this.forward=v3(delta.x/length,0,delta.z/length);
    this.side=v3(-this.forward.z,0,this.forward.x);
    this.launch=this.start.add(this.forward.scale(Math.min(.48,length*.20)));
    this.distance=this.target.subtract(this.launch).length();
    this.duration=clamp(300+this.distance*21,240,520);
    this.elapsed=0;this.hitElapsed=0;this.impactDuration=265;
    this.phase="flight";this.disposed=false;this.materials=[];
    const id="orb-frostbolt-vfx";
    this.root=new BABYLON.TransformNode(id+":root",scene);
    this.head=new BABYLON.TransformNode(id+":head",scene);
    this.head.parent=this.root;
    this.head.position.copyFrom(this.launch);
    this.head.rotation.y=Math.atan2(this.forward.x,this.forward.z);
    this.tailRoot=new BABYLON.TransformNode(id+":tail",scene);
    this.tailRoot.parent=this.root;
    this.releaseRoot=new BABYLON.TransformNode(id+":release",scene);
    this.releaseRoot.parent=this.root;this.releaseRoot.position.copyFrom(start);
    this.hitRoot=new BABYLON.TransformNode(id+":impact",scene);
    this.hitRoot.parent=this.root;this.hitRoot.position.copyFrom(target);
    this.hitRoot.setEnabled(false);
    const standard=(name,hex,a,e)=>{
      const m=regular(scene,id+":"+name,hex,a,e);this.materials.push(m);return m;
    };
    this.iceShader=shader(scene,id+":ice",ICE_VERTEX,ICE_FRAGMENT,
      ["position","normal","uv"],["worldViewProjection","tint","time","opacity"]);
    this.iceShader.setColor3("tint",rgb("#3d9cca"));
    this.iceShader.setFloat("opacity",.95);
    this.materials.push(this.iceShader);
    this.innerShader=shader(scene,id+":inner",ICE_VERTEX,ICE_FRAGMENT,
      ["position","normal","uv"],["worldViewProjection","tint","time","opacity"]);
    this.innerShader.setColor3("tint",rgb("#80d8f0"));
    this.innerShader.setFloat("opacity",.88);
    this.materials.push(this.innerShader);
    this.lance=iceLance(scene,id+":facet-lance",this.head,this.iceShader);
    this.inner=iceLance(scene,id+":inner-lance",this.head,this.innerShader,.48);
    this.inner.position.z=.045;
    const tipMat=standard("tiny-highlight","#daf9ff",.90,.57);
    this.tip=makeMesh(scene,"CreateSphere",id+":tip",{diameter:.055,segments:14},
      this.head,tipMat);
    this.tip.position.z=.39;
    const hazeMat=standard("haze","#1683bd",.10,.30);
    this.haze=makeMesh(scene,"CreateSphere",id+":haze",
      {diameter:.46,segments:24},this.head,hazeMat);
    this.haze.scaling.set(.75,.68,1.9);
    const shardMat=standard("micro-shards","#60c5e3",.81,.48);
    const shardBright=standard("micro-glints","#9ad9ed",.80,.49);
    this.microShards=[];
    for(let i=0;i<10;i++){
      this.microShards.push(iceLance(scene,id+":chip:"+i,this.head,
        i%3===0?shardBright:shardMat,.10+(i%3)*.045));
    }
    this.ribbons=[];
    const palette=["#0a6cb3","#27a3de","#7bcfe9"];
    for(let i=0;i<3;i++){
      const mat=shader(scene,id+":flow:"+i,RIBBON_VERTEX,RIBBON_FRAGMENT,
        ["position","uv"],["worldViewProjection","tint","time","opacity"]);
      mat.setColor3("tint",rgb(palette[i]));
      mat.setFloat("opacity",.26+i*.08);
      this.materials.push(mat);
      const surface=trailSurface(scene,id+":flow-surface:"+i,this.tailRoot,mat);
      this.ribbons.push({...surface,mat,index:i});
    }
    const ringMat=standard("release-ring","#399ec9",.58,.48);
    const rayMat=standard("release-rays","#77cbea",.70,.60);
    this.releaseRing=makeMesh(scene,"CreateTorus",id+":release-ring",
      {diameter:.72,thickness:.014,tessellation:52},this.releaseRoot,ringMat);
    this.releaseRays=[];
    for(let i=0;i<6;i++){
      const a=i*TAU/6;
      this.releaseRays.push(makeMesh(scene,"CreateTube",id+":release-ray:"+i,
        {path:[v3(Math.cos(a)*.22,0,Math.sin(a)*.22),
          v3(Math.cos(a)*.54,0,Math.sin(a)*.54)],radius:.009,tessellation:5},
        this.releaseRoot,rayMat));
    }
    const hitMat=standard("impact-flash","#adeaf7",.78,.56);
    const hitCool=standard("impact-shards","#56b6dc",.70,.48);
    const hitHaze=standard("impact-haze","#237bb3",.13,.27);
    this.flash=makeMesh(scene,"CreateSphere",id+":impact-flash",
      {diameter:.27,segments:24},this.hitRoot,hitMat);
    this.impactHaze=makeMesh(scene,"CreateSphere",id+":impact-haze",
      {diameter:.67,segments:24},this.hitRoot,hitHaze);
    this.impactRings=[];
    for(let i=0;i<2;i++){
      this.impactRings.push(makeMesh(scene,"CreateTorus",id+":impact-ring:"+i,
        {diameter:.53+i*.13,thickness:i===0?.021:.012,tessellation:52},
        this.hitRoot,i===0?hitMat:hitCool));
    }
    this.fragments=[];
    for(let i=0;i<6;i++){
      this.fragments.push(iceLance(scene,id+":fracture:"+i,this.hitRoot,
        i%2?shardBright:hitCool,.19+(i%3)*.045));
    }
    this.light=new BABYLON.PointLight(id+":light",this.launch.clone(),scene);
    this.light.diffuse=rgb("#56c8ea");
    this.light.intensity=.38;this.light.range=2.1;
    this.position=this.launch.clone();
  }
  updateRibbons(t,time){
    const travelled=t*this.distance;
    const reach=Math.min(1.55,travelled*.66);
    const fadeIn=clamp(travelled/.38,0,1);
    const falloff=1-clamp((t-.91)/.09,0,1)*.30;
    const lead=this.position;
    for(const ribbon of this.ribbons){
      const i=ribbon.index,vertices=ribbon.positions;
      for(let k=0;k<=16;k++){
        const f=k/16,behind=(1-f)*reach;
        const width=Math.sin(f*Math.PI*.9)*(.072+i*.030)*(1-.45*i/3);
        const wav=Math.sin(time*(4.7+i*.8)-behind*(7+i)+i*1.7)
          *(.028+i*.016)*Math.sin(f*Math.PI);
        const side=(i-1)*.040+wav;
        const cx=lead.x-this.forward.x*behind+this.side.x*side;
        const cz=lead.z-this.forward.z*behind+this.side.z*side;
        const cy=lead.y+Math.sin(time*5.2+f*8+i)*.025*(1-f);
        for(let edge=0;edge<2;edge++){
          const d=(edge?1:-1)*width,base=(k*2+edge)*3;
          vertices[base]=cx+this.side.x*d*(i===2?.45:1);
          vertices[base+1]=cy+(i===2?d*.93:d*.20);
          vertices[base+2]=cz+this.side.z*d*(i===2?.45:1);
        }
      }
      ribbon.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind,vertices,false,false);
      ribbon.mat.setFloat("time",time+i*.37);
      ribbon.mat.setFloat("opacity",fadeIn*falloff*(.25+i*.08));
      ribbon.mesh.visibility=reach>.015?1:0;
    }
  }
  flightTick(p){
    const point=BABYLON.Vector3.Lerp(this.launch,this.target,p);
    point.y+=Math.sin(p*Math.PI)*.075;
    this.position.copyFrom(point);this.head.position.copyFrom(point);
    const t=this.elapsed*.001;
    this.head.rotation.y=Math.atan2(this.forward.x,this.forward.z);
    this.head.rotation.z=Math.sin(t*17)*.033;
    this.lance.scaling.setAll(.97+Math.sin(t*26)*.022);
    this.inner.scaling.setAll(.94+Math.sin(t*17+1)*.040);
    this.haze.visibility=.65+Math.sin(t*11)*.12;
    this.iceShader.setFloat("time",t);
    this.innerShader.setFloat("time",t+1.4);
    this.microShards.forEach((shard,i)=>{
      const a=i*2.39996+t*(i%2?9:-7);
      const r=.19+(i%3)*.042;
      const z=-.24-(i%4)*.095+Math.sin(t*13+i)*.032;
      shard.position.set(Math.cos(a)*r,Math.sin(a)*r*.67,z);
      shard.rotation.z=a*.35;shard.rotation.y=t*(i%2?2.7:-2.3);
      shard.visibility=.60+Math.sin(t*14+i)*.20;
    });
    this.updateRibbons(p,t);
    const snap=1-clamp(p/.16,0,1);
    this.releaseRoot.setEnabled(snap>.01);
    if(snap>.01){
      this.releaseRing.scaling.setAll(.72+(1-snap)*.85);
      this.releaseRing.visibility=snap*.72;
      this.releaseRays.forEach((ray,i)=>{
        ray.scaling.setAll(.79+(1-snap)*.38);
        ray.visibility=snap*(i%2?.52:.76);
      });
    }
    this.light.position.copyFrom(point);
    this.light.intensity=.33+.06*Math.sin(t*19);
  }
  impactTick(t){
    const p=clamp(t,0,1),out=ease(p),snap=Math.exp(-p*14);
    const after=Math.exp(-p*4.3),strength=this.missed?.30:1;
    this.flash.scaling.setAll(.68+.65*out);
    this.flash.visibility=strength*(snap*.88+after*.06);
    this.impactHaze.scaling.setAll(.6+out*1.9);
    this.impactHaze.visibility=strength*after*.55;
    this.impactRings.forEach((ring,i)=>{
      ring.scaling.setAll(.56+out*(2.5+i*.7));
      ring.visibility=strength*after*(i?.55:.88);
      ring.rotation.y=p*(i?-.45:.43);
    });
    this.fragments.forEach((shard,i)=>{
      const a=i*TAU/6+.16;
      const r=(.20+(i%3)*.045)+out*(.56+(i%2)*.18);
      shard.position.set(Math.cos(a)*r,.10+out*(.06+Math.sin(a*2)*.11),Math.sin(a)*r);
      shard.rotation.y=a+p*(i%2?4:-3);
      shard.rotation.x=p*(i%2?3:-2);
      shard.scaling.setAll(1-p*.48);
      shard.visibility=strength*after;
    });
    this.light.position.copyFrom(this.target);
    this.light.intensity=strength*.55*Math.exp(-p*7);
  }
  update(dt){
    if(this.disposed)return true;
    const step=clamp(Number(dt)||0,0,100);
    if(this.phase==="flight"){
      this.elapsed+=step;
      const p=clamp(this.elapsed/this.duration,0,1);
      this.flightTick(p);
      if(p>=1){
        this.phase="impact";
        this.head.setEnabled(false);this.tailRoot.setEnabled(false);
        this.releaseRoot.setEnabled(false);this.hitRoot.setEnabled(true);
        this.impactTick(0);
      }
    }else{
      this.hitElapsed+=step;
      this.impactTick(this.hitElapsed/this.impactDuration);
    }
    return this.phase==="impact"&&this.hitElapsed>=this.impactDuration;
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.light?.dispose();this.root.dispose(false,true);
    for(const material of this.materials)material.dispose();
    this.materials.length=0;
  }
}
