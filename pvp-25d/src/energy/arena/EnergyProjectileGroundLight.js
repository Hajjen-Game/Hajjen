// Pixi 3v3's travelling floor light, projected onto the real Babylon floor.
// A soft, directional light pool follows each projectile; a short wider bloom
// follows contact. This is visual-only and works when Pixi accents are OFF.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
const TONES={
  "crystal-bolt":{color:"#59caff",core:"#d7f9ff"},
  "sun-lance":{color:"#ff9946",core:"#ffe7a6"},
};

export class EnergyProjectileGroundLight {
  constructor(scene){
    this.scene=scene;
    this.texture=null;
    this.materials=new Map();
    this.flashes=[];
    this.nextId=0;
  }
  makeTexture(){
    if(this.texture)return this.texture;
    const texture=new BABYLON.DynamicTexture("energy-projectile-floor-gradient",
      {width:128,height:128},this.scene,false);
    const ctx=texture.getContext();
    const gradient=ctx.createRadialGradient(64,64,0,64,64,63);
    gradient.addColorStop(0,"rgba(255,255,255,0.91)");
    gradient.addColorStop(.19,"rgba(255,255,255,0.59)");
    gradient.addColorStop(.49,"rgba(255,255,255,0.21)");
    gradient.addColorStop(1,"rgba(255,255,255,0)");
    ctx.clearRect(0,0,128,128);
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,128,128);
    texture.hasAlpha=true;
    texture.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.update(false);
    this.texture=texture;
    return texture;
  }
  material(spellId,core=false){
    const key=spellId+(core?":core":":glow");
    if(this.materials.has(key))return this.materials.get(key);
    const mat=new BABYLON.StandardMaterial("energy-floor-light:"+key,this.scene);
    const color=BABYLON.Color3.FromHexString(
      core?TONES[spellId].core:TONES[spellId].color);
    mat.diffuseColor=color.scale(.25);
    mat.emissiveColor=color.scale(core?.96:.80);
    mat.specularColor=BABYLON.Color3.Black();
    mat.diffuseTexture=this.makeTexture();
    mat.useAlphaFromDiffuseTexture=true;
    mat.alpha=core?.60:.46;
    mat.disableLighting=true;
    mat.disableDepthWrite=true;
    mat.backFaceCulling=false;
    mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    this.materials.set(key,mat);
    return mat;
  }
  plane(spellId,core=false){
    const mesh=BABYLON.MeshBuilder.CreatePlane(
      "energy-floor-light:"+this.nextId++,
      {size:2,sideOrientation:BABYLON.Mesh.DOUBLESIDE},this.scene);
    mesh.rotation.x=Math.PI/2;
    mesh.position.y=core?.041:.035; // above arena floor, below floor markers/orbs
    mesh.material=this.material(spellId,core);
    mesh.isPickable=false;
    mesh.visibility=0;
    return mesh;
  }
  attach(fx){
    if(!TONES[fx.spellId])return;
    fx.floorLights=[this.plane(fx.spellId),this.plane(fx.spellId,true)];
  }
  updateProjectile(fx,position,progress){
    if(!fx.floorLights)return;
    const dx=fx.destination.x-fx.origin.x;
    const dz=fx.destination.z-fx.origin.z;
    const length=Math.max(.01,Math.hypot(dx,dz));
    const ux=dx/length,uz=dz/length;
    const fade=smooth(progress/.16)*(1-smooth((progress-.83)/.17));
    for(let i=0;i<fx.floorLights.length;i++){
      const mesh=fx.floorLights[i],core=i===1;
      const back=core?.015:.20;
      mesh.position.x=position.x-ux*back;
      mesh.position.z=position.z-uz*back;
      // Soft elliptical pools, slightly elongated behind the travel direction.
      mesh.rotation.y=-Math.atan2(ux,uz);
      mesh.scaling.set(core?.45:.88,core?.32:.57,1);
      mesh.visibility=fade*(core?.82:.76);
    }
  }
  impact(spellId,point,now=performance.now()){
    if(!TONES[spellId])return;
    const mesh=this.plane(spellId);
    mesh.position.set(point.x,.038,point.z);
    mesh.visibility=.96;
    if(this.flashes.length>=12)this.flashes.shift().mesh.dispose();
    this.flashes.push({mesh,start:now,duration:270});
  }
  update(now=performance.now()){
    for(let i=this.flashes.length-1;i>=0;i--){
      const f=this.flashes[i],p=clamp((now-f.start)/f.duration,0,1);
      if(p>=1){f.mesh.dispose();this.flashes.splice(i,1);continue;}
      f.mesh.scaling.set(.68+p*1.26,.55+p*.90,1);
      f.mesh.visibility=(1-smooth(p))*.85;
    }
  }
  detach(fx){
    for(const mesh of fx.floorLights||[])mesh.dispose();
    fx.floorLights=null;
  }
  clear(){
    for(const f of this.flashes)f.mesh.dispose();
    this.flashes.length=0;
  }
  dispose(){
    this.clear();
    for(const material of this.materials.values())material.dispose();
    this.materials.clear();
    this.texture?.dispose();
    this.texture=null;
  }
}
