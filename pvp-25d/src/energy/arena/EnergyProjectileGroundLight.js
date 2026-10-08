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
    mat.alpha=core?.60:.31;
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
    // Pixi 3v3 uses four staggered soft pools plus a small bright contact
    // ellipse; recreate that structure on the physical floor.
    fx.floorLights=[this.plane(fx.spellId,true),
      ...Array.from({length:4},()=>this.plane(fx.spellId))];
  }
  updateProjectile(fx,position,progress){
    if(!fx.floorLights)return;
    const dx=fx.destination.x-fx.origin.x;
    const dz=fx.destination.z-fx.origin.z;
    const length=Math.max(.01,Math.hypot(dx,dz));
    const ux=dx/length,uz=dz/length;
    const fade=smooth(progress/.16); // Stay lit until the projectile actually hits.
    for(let i=0;i<fx.floorLights.length;i++){
      const mesh=fx.floorLights[i],core=i===0,q=core?0:(i-1)/3;
      const back=core?.015:q*.55;
      mesh.position.x=position.x-ux*back;
      mesh.position.z=position.z-uz*back;
      // Staggered soft elliptical pools stretch behind travel like Pixi 3v3.
      mesh.rotation.y=-Math.atan2(ux,uz);
      mesh.scaling.set(core?.40:.78+q*.16,core?.28:.47+q*.08,1);
      mesh.visibility=fade*(core?.84:.65-q*.29);
    }
  }
  impact(spellId,point,now=performance.now()){
    if(!TONES[spellId])return;
    // Two independent pools: a bright tight contact bloom and an amber/cyan
    // spill that briefly expands across the real 3D floor.
    const glow=this.plane(spellId);
    const hot=this.plane(spellId,true);
    glow.position.set(point.x,.037,point.z);
    hot.position.set(point.x,.043,point.z);
    const meshes=[glow,hot];
    // The impact cap counts EFFECTS, not individual meshes.
    if(this.flashes.length>=12){
      const oldest=this.flashes.shift();
      for(const item of oldest.meshes)item.dispose();
    }
    this.flashes.push({meshes,start:now,duration:205});
  }
  update(now=performance.now()){
    for(let i=this.flashes.length-1;i>=0;i--){
      const f=this.flashes[i],p=clamp((now-f.start)/f.duration,0,1);
      if(p>=1){
        for(const item of f.meshes)item.dispose();
        this.flashes.splice(i,1);
        continue;
      }
      const onset=smooth((p+.04)/.14);
      const cooling=1-smooth((p-.19)/.77);
      const [glow,hot]=f.meshes;
      glow.scaling.set(.63+p*.57,.49+p*.42,1);
      hot.scaling.set(.30+p*.36,.23+p*.27,1);
      glow.visibility=clamp(onset*cooling*.64,0,1);
      hot.visibility=clamp(onset*(1-smooth((p-.13)/.62))*.78,0,1);
    }
  }
  detach(fx){
    for(const mesh of fx.floorLights||[])mesh.dispose();
    fx.floorLights=null;
  }
  clear(){
    for(const f of this.flashes)for(const item of f.meshes)item.dispose();
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
