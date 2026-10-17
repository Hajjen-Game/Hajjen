// Wildpath Living Water 1.0 — decorative wetland meshes for Babylon.
// The combat engine remains authoritative for Rainfall damage. This owns no hits.
import {newWaterLedger,waterCast,waterKill,ageWater,waterState} from './water-life.js';
const B=window.BABYLON;
function mat(scene,name,hex,alpha){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;m.emissiveColor=c.scale(.22);
  m.specularColor=new B.Color3(.08,.11,.11);m.alpha=alpha;
  m.backFaceCulling=false;
  return m;
}
export class LivingWater {
  constructor(scene,{onPond=()=>{}}={}){
    this.scene=scene;this.onPond=onPond;
    this.ledger=newWaterLedger();
    this.entries=new Map();
    this.time=0;
    this.texture=new B.DynamicTexture('living water soft radial shoreline',
      {width:128,height:128},scene,false);
    const ctx=this.texture.getContext();
    const gradient=ctx.createRadialGradient(64,64,3,64,64,63);
    gradient.addColorStop(0,'rgba(61,173,216,.97)');
    gradient.addColorStop(.30,'rgba(53,163,208,.92)');
    gradient.addColorStop(.67,'rgba(64,180,204,.85)');
    gradient.addColorStop(.83,'rgba(116,226,218,.54)');
    gradient.addColorStop(1,'rgba(110,224,205,0)');
    ctx.clearRect(0,0,128,128);ctx.fillStyle=gradient;
    ctx.fillRect(0,0,128,128);this.texture.hasAlpha=true;this.texture.update();
    this.waterMaterial=mat(scene,'shallow turquoise water','#ffffff',.95);
    this.waterMaterial.diffuseTexture=this.texture;
    this.waterMaterial.useAlphaFromDiffuseTexture=true;
    this.waterMaterial.disableLighting=true;
    this.waterMaterial.needDepthPrePass=true;
    this.padMat=mat(scene,'lily pads','#679c82',1);
    this.padAccent=mat(scene,'sunlit lily leaves','#93c6a0',1);
    this.lilyMat=mat(scene,'water lily petals','#f7dbeb',1);
    this.centerMat=mat(scene,'water lily pollen','#f8dfad',1);
    this.padSource=B.MeshBuilder.CreateSphere('lily-pad source',
      {diameter:1,segments:8},scene);
    this.padSource.material=this.padMat;this.padSource.position.y=-900;
    this.padAccentSource=B.MeshBuilder.CreateSphere('lily pad highlight source',
      {diameter:1,segments:8},scene);
    this.padAccentSource.material=this.padAccent;this.padAccentSource.position.y=-900;
    this.lilySource=B.MeshBuilder.CreateSphere('water lily blossom source',
      {diameter:1,segments:8},scene);
    this.lilySource.material=this.lilyMat;this.lilySource.position.y=-900;
    this.centerSource=B.MeshBuilder.CreateSphere('water lily center source',
      {diameter:1,segments:8},scene);
    this.centerSource.material=this.centerMat;this.centerSource.position.y=-900;
  }
  growMesh(spot){
    const e=this.entries.get(spot.id);
    if(e){
      e.data={...spot};e.age=0;
      if(spot.permanent&&!e.pond){
        e.pond=true;this.addLilies(e);
        this.onPond(spot);
      }else if(spot.rare&&!e.rare){
        e.rare=true;this.addLilies(e);
        this.onPond(spot);
      }
      return;
    }
    const root=new B.TransformNode('living water spot '+spot.id,this.scene);
    root.position.set(spot.x,0,spot.z);
    const mesh=B.MeshBuilder.CreateGround('shallow water '+spot.id,
      {width:1,height:1,subdivisions:1},this.scene);
    mesh.parent=root;mesh.position.y=-.087;
    mesh.material=this.waterMaterial;mesh.isPickable=false;
    const entry={id:spot.id,root,mesh,data:{...spot},pond:Boolean(spot.permanent),
      rare:Boolean(spot.rare),lilies:[],age:0};
    this.entries.set(spot.id,entry);
    if(entry.pond)this.addLilies(entry);
  }
  addLilies(e){
    for(const p of e.lilies)p.dispose();
    e.lilies=[];
    // Three tiny recognizable lily pads only for persistent ponds.
    const count=e.data.rare?4:2;
    const rad=Math.min(2.2,e.data.radius*.47);
    for(let i=0;i<count;i++){
      const a=i*2.39996+e.id*.77,r=rad*(i%2?.70:1);
      const x=Math.cos(a)*r,z=Math.sin(a)*r*.78;
      const pad=(source,y,px,pz,sx,sy,sz)=>{
        const leaf=source.createInstance('pond lily '+e.id);
        leaf.parent=e.root;leaf.position.set(px,y,pz);
        leaf.scaling.set(sx,sy,sz);leaf.isPickable=false;e.lilies.push(leaf);
      };
      pad(i%2?this.padAccentSource:this.padSource,-.068,x,z,.70,.075,.57);
      if(i%2===0){
        for(let j=0;j<4;j++){
          const a2=j*Math.PI/2;
          pad(this.lilySource,-.026,x+Math.cos(a2)*.14,
            z+Math.sin(a2)*.14,.24,.10,.19);
        }
        pad(this.centerSource,-.010,x,z,.12,.08,.12);
      }
    }
  }
  cast(kind,x,z,radius,time){
    const e=waterCast(this.ledger,{kind,x,z,radius,time});
    if(e)this.growMesh(e);
    this.sync();
    return e;
  }
  kill(x,z,time){
    const updates=waterKill(this.ledger,{x,z,time});
    for(const event of updates)this.growMesh(event);
    return updates;
  }
  sync(){
    const live=new Set(this.ledger.spots.map(s=>s.id));
    for(const [id,e] of this.entries)if(!live.has(id))this.release(e);
  }
  release(e){
    for(const p of e.lilies)p.dispose();
    e.mesh.dispose();e.root.dispose();this.entries.delete(e.id);
  }
  update(dt,now){
    this.time+=dt;
    const expired=ageWater(this.ledger,now);
    if(expired.length)this.sync();
    for(const e of this.entries.values()){
      e.age+=dt;
      const u=Math.min(1,e.age/(e.pond?1.1:.50));
      const grow=1-Math.pow(1-u,3);
      const pulse=1+Math.sin(this.time*1.75+e.id)*.018;
      e.mesh.scaling.set(Math.max(.01,e.data.radius*2*grow*pulse),1,
        Math.max(.01,e.data.radius*1.64*grow*pulse));
    }
  }
  snapshot(){return waterState(this.ledger);}
  surfaces(){return this.ledger.spots.map(s=>({
    id:s.id,x:s.x,z:s.z,radius:s.radius,
    permanent:s.permanent,rare:s.rare,kind:s.kind
  }));}
  clear(){
    for(const e of [...this.entries.values()])this.release(e);
    this.ledger=newWaterLedger();this.time=0;
  }
  dispose(){
    this.clear();this.padSource.dispose();this.padAccentSource.dispose();
    this.lilySource.dispose();this.centerSource.dispose();
    for(const m of [this.waterMaterial,this.padMat,this.padAccent,
      this.lilyMat,this.centerMat])m.dispose();
    this.texture.dispose();
  }
}
