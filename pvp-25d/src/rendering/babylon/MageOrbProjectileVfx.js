// Spell-specific Babylon VFX for the Orb Arena Mage.
// Mirrors the Pixi 3v3 visual beats: directional release, detached coloured
// ribbons, readable ice spear / molten pyro head, and distinct hit afterglow.
// All positions are visual only; hit timing and combat stay in the game system.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const easeOut=v=>1-Math.pow(1-clamp(v,0,1),3);
const rgb=h=>BABYLON.Color3.FromHexString(h);

const LOOK={
  "mage-frostbolt":{
    kind:"frost",main:"#54d9ff",accent:"#719eff",hot:"#effdff",
    travelBase:330,travelMax:530,hitMs:270,trail:1.75,head:.30,
  },
  "mage-pyroblast":{
    kind:"pyro",main:"#ff612b",accent:"#ffb33d",hot:"#fff7ca",
    travelBase:420,travelMax:610,hitMs:410,trail:2.15,head:.44,
  },
};

function mat(scene,name,hex,a=1,strength=1){
  const m=new BABYLON.StandardMaterial(name,scene);
  m.diffuseColor=rgb(hex).scale(.14);
  m.emissiveColor=rgb(hex).scale(strength);
  m.specularColor=BABYLON.Color3.Black();
  m.alpha=a;
  m.disableLighting=true;
  m.backFaceCulling=false;
  m.needDepthPrePass=false;
  m.disableDepthWrite=true;
  if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined){
    m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return m;
}

function mesh(scene,method,name,options,parent,material){
  const m=BABYLON.MeshBuilder[method](name,options,scene);
  m.parent=parent;
  m.material=material;
  m.isPickable=false;
  return m;
}

function pos(x,y,z){return new BABYLON.Vector3(x,y,z);}

export class MageOrbProjectileVfx{
  constructor(scene,start,target,spellId,missed=false){
    this.scene=scene;
    this.profile=LOOK[spellId];
    if(!this.profile)throw new Error("Unsupported Mage orb projectile: "+spellId);
    this.isPyro=this.profile.kind==="pyro";
    this.missed=Boolean(missed);
    this.start=start.clone();
    this.target=target.clone();
    // Always originate near the caster's glass centre, then move just
    // outside its shell so the first frame reads as an actual release.
    const delta=target.subtract(start);
    delta.y=0;
    const len=Math.max(.001,delta.length());
    this.direction=pos(delta.x/len,0,delta.z/len);
    this.side=pos(-this.direction.z,0,this.direction.x);
    const outside=Math.min(.49,len*.22);
    this.launchAt=start.add(this.direction.scale(outside));
    this.totalDistance=this.target.subtract(this.launchAt).length();
    this.duration=clamp(
      this.profile.travelBase+this.totalDistance*(this.isPyro?25:23),
      this.isPyro?320:250,this.profile.travelMax,
    );
    this.phase="flight";
    this.elapsed=0;
    this.hitElapsed=0;
    this.disposed=false;
    this.materials=[];
    this.name="orb-mage-"+this.profile.kind+":"+Math.round(start.x*100)+":"+Math.round(start.z*100);
    const name=this.name;
    const m=(tag,hex,alpha,strength)=>{
      const value=mat(scene,name+":"+tag,hex,alpha,strength);
      this.materials.push(value);
      return value;
    };
    const mainMat=m("main",this.profile.main,.95,1.50);
    const accentMat=m("accent",this.profile.accent,.88,1.48);
    const hotMat=m("hot",this.profile.hot,.99,2.1);
    const auraMat=m("aura",this.profile.main,.20,.95);
    const trailMat=m("trail",this.profile.main,.46,1.28);
    const hotTrailMat=m("hot-trail",this.profile.hot,.80,1.65);

    this.root=new BABYLON.TransformNode(name+":effect",scene);
    this.head=new BABYLON.TransformNode(name+":head",scene);
    this.head.parent=this.root;
    this.head.rotation.y=Math.atan2(this.direction.x,this.direction.z);
    this.head.position.copyFrom(this.launchAt);
    this.impactRoot=new BABYLON.TransformNode(name+":impact-root",scene);
    this.impactRoot.parent=this.root;
    this.impactRoot.position.copyFrom(this.target);
    this.impactRoot.setEnabled(false);
    this.launchRoot=new BABYLON.TransformNode(name+":release-root",scene);
    this.launchRoot.parent=this.root;
    this.launchRoot.position.copyFrom(start);
    this.launchRoot.rotation.y=this.head.rotation.y;

    // Bright, small directional flash at the caster that fades before
    // the travelling bolt has left the immediate area.
    this.launchRing=mesh(scene,"CreateTorus",name+":release-ring",
      {diameter:.68,thickness:.018,tessellation:48},
      this.launchRoot,hotMat);
    this.launchSpokes=[];
    for(let i=0;i<(this.isPyro?8:6);i++){
      const a=i*TAU/(this.isPyro?8:6);
      const points=[pos(Math.cos(a)*.24,0,Math.sin(a)*.24),
        pos(Math.cos(a)*.57,.035,Math.sin(a)*.57)];
      this.launchSpokes.push(mesh(scene,"CreateTube",name+":release-ray:"+i,
        {path:points,radius:.009,tessellation:5},this.launchRoot,i%2?mainMat:accentMat));
    }

    // A true elongated crystal vs a round, multi-layer molten core.
    if(this.isPyro){
      this.headOuter=mesh(scene,"CreateSphere",name+":fire-body",
        {diameter:.51,segments:20},this.head,mainMat);
      this.headOuter.scaling.set(1.12,1.04,1.48);
      this.headInner=mesh(scene,"CreateSphere",name+":fire-core",
        {diameter:.31,segments:20},this.head,accentMat);
      this.headInner.scaling.z=1.28;
      this.headHot=mesh(scene,"CreateSphere",name+":fire-white-center",
        {diameter:.165,segments:18},this.head,hotMat);
      this.headAura=mesh(scene,"CreateSphere",name+":fire-envelope",
        {diameter:.80,segments:18},this.head,auraMat);
      this.headTongues=[];
      for(let i=0;i<3;i++){
        const flame=mesh(scene,"CreateCylinder",name+":flame-tip:"+i,
          {height:.34,diameterTop:.008,diameterBottom:.11,tessellation:6},
          this.head,i%2?accentMat:mainMat);
        const a=i*TAU/3;
        flame.position.set(Math.cos(a)*.14,Math.sin(a)*.14,-.30);
        flame.rotation.x=Math.PI*.5;
        this.headTongues.push(flame);
      }
    }else{
      this.headOuter=mesh(scene,"CreatePolyhedron",name+":ice-spear",
        {type:1,size:.29},this.head,mainMat);
      this.headOuter.scaling.set(.75,.75,1.72);
      this.headInner=mesh(scene,"CreatePolyhedron",name+":ice-lance-inner",
        {type:1,size:.185},this.head,hotMat);
      this.headInner.scaling.set(.55,.55,2.12);
      this.headHot=mesh(scene,"CreateSphere",name+":ice-core",
        {diameter:.15,segments:14},this.head,hotMat);
      this.headHot.position.z=.13;
      this.headAura=mesh(scene,"CreateSphere",name+":ice-envelope",
        {diameter:.70,segments:18},this.head,auraMat);
      this.headShoulders=[];
      for(const sign of [-1,1]){
        const shard=mesh(scene,"CreatePolyhedron",name+":ice-shoulder:"+sign,
          {type:1,size:.125},this.head,accentMat);
        shard.position.set(sign*.17,sign*.06,-.15);
        shard.scaling.set(.63,.70,1.65);
        this.headShoulders.push(shard);
      }
    }

    // Short curved ribbons are updated in place. Each starts behind the
    // moving head, never at the caster -- no beam/tether or lingering line.
    this.trails=[];
    const trailCount=this.isPyro?4:3;
    for(let i=0;i<trailCount;i++){
      const points=Array.from({length:12},(_,j)=>
        pos(this.launchAt.x,this.launchAt.y,this.launchAt.z-j*.002));
      const ribbon=mesh(scene,"CreateTube",name+":wake:"+i,
        {path:points,
         radiusFunction:(step)=>(
           (this.isPyro?.018:.009)+(this.isPyro?.031:.020)*(1-step/11)
         )*(1-i*.18),
         tessellation:6,updatable:true},
        this.root,i===trailCount-1?hotTrailMat:(i%2?accentMat:trailMat));
      ribbon.isPickable=false;
      this.trails.push({mesh:ribbon,index:i});
    }

    this.satellites=[];
    for(let i=0;i<(this.isPyro?7:4);i++){
      const particle=mesh(scene,this.isPyro?"CreateSphere":"CreatePolyhedron",
        name+":satellite:"+i,
        this.isPyro?{diameter:.044+(i%3)*.014,segments:9}
          :{type:1,size:.030+(i%3)*.008},
        this.head,i%3===0?hotMat:(i%2?accentMat:mainMat));
      this.satellites.push(particle);
    }

    // Contact flash with spell-specific shards, not the generic polyhedron.
    this.flash=mesh(scene,"CreateSphere",name+":hit-flash",
      {diameter:this.isPyro?.54:.30,segments:24},
      this.impactRoot,hotMat);
    this.hitAura=mesh(scene,"CreateSphere",name+":hit-aura",
      {diameter:this.isPyro?.88:.59,segments:20},
      this.impactRoot,auraMat);
    this.hitRings=[];
    for(let i=0;i<2;i++){
      this.hitRings.push(mesh(scene,"CreateTorus",name+":hit-ring:"+i,
        {diameter:(this.isPyro?.65:.45)+i*.24,
          thickness:(this.isPyro?.025:.019)-i*.005,tessellation:50},
        this.impactRoot,i===0?accentMat:mainMat));
    }
    this.hitPieces=[];
    for(let i=0;i<(this.isPyro?12:6);i++){
      const shard=mesh(scene,this.isPyro?"CreateSphere":"CreatePolyhedron",
        name+":hit-shard:"+i,
        this.isPyro?{diameter:.040+(i%4)*.016,segments:8}
          :{type:1,size:.055+(i%3)*.015},
        this.impactRoot,i%3===0?hotMat:(i%2?accentMat:mainMat));
      this.hitPieces.push(shard);
    }
    this.light=new BABYLON.PointLight(name+":light",this.launchAt.clone(),scene);
    this.light.diffuse=rgb(this.profile.main);
    this.light.intensity=this.isPyro?.70:.52;
    this.light.range=this.isPyro?2.8:2.35;
    this.currentPosition=this.launchAt.clone();
  }

  updateTrail(t){
    const p=this.currentPosition;
    const travelled=this.totalDistance*t;
    // Distance-dependent so point-blank spells don't extend past the caster.
    const length=Math.min(this.profile.trail,travelled*.74);
    const fadeIn=clamp(t/.12,0,1);
    for(const {mesh:part,index:i} of this.trails){
      const points=[];
      for(let j=0;j<12;j++){
        const f=j/11;
        const lag=f*length;
        const wave=Math.sin(t*(this.isPyro?32:22)-f*(this.isPyro?8:6)+i*1.9)
          *Math.pow(f,.75)*(this.isPyro?.115:.048);
        const spread=i-(this.trails.length-1)*.5;
        const lateral=spread*(this.isPyro?.043:.025)*f+wave;
        points.push(pos(
          p.x-this.direction.x*lag+this.side.x*lateral,
          p.y+Math.sin(t*17+f*7+i)*f*(this.isPyro?.085:.030),
          p.z-this.direction.z*lag+this.side.z*lateral,
        ));
      }
      // Keep the same mesh and index buffer for every update.
      BABYLON.MeshBuilder.CreateTube(null,{path:points,instance:part});
      part.visibility=fadeIn*(1-clamp((t-.89)/.11,0,1)*.40);
    }
  }

  flightTick(t){
    // Linear forward progress stays energetic all the way to contact.
    const fly=t;
    const p=BABYLON.Vector3.Lerp(this.launchAt,this.target,fly);
    p.y+=Math.sin(t*Math.PI)*(this.isPyro?.15:.09);
    this.currentPosition.copyFrom(p);
    this.head.position.copyFrom(p);
    const wobble=Math.sin(t*(this.isPyro?38:25));
    this.head.rotation.z=this.isPyro?wobble*.10:Math.sin(t*13)*.035;
    this.head.rotation.y=Math.atan2(this.direction.x,this.direction.z)
      +Math.sin(t*19)*.025;
    this.headAura.scaling.setAll(1+Math.sin(t*42)*.06);
    this.headAura.visibility=.55+Math.sin(t*27)*.12;
    if(this.isPyro){
      this.headInner.scaling.set(1+Math.sin(t*32)*.08,1+Math.cos(t*29)*.06,1.24);
      this.headHot.scaling.setAll(.88+Math.sin(t*43)*.14);
      this.headTongues.forEach((tongue,i)=>{
        tongue.scaling.y=.8+.3*Math.sin(t*39+i*2.1);
      });
    }else{
      this.headOuter.rotation.z=Math.sin(t*24)*.04;
      this.headHot.scaling.setAll(.85+Math.sin(t*29)*.09);
    }
    this.satellites.forEach((sat,i)=>{
      const a=t*(this.isPyro?16:12)*(i%2?1:-1)+i*TAU/this.satellites.length;
      const r=(this.isPyro?.33:.26)+(i%3)*.035;
      sat.position.set(Math.cos(a)*r,Math.sin(a)*r*.75,-.12+(i%2)*.07);
      sat.scaling.setAll(.76+.24*Math.sin(t*23+i)**2);
    });
    const release=clamp(1-t/.20,0,1);
    this.launchRoot.setEnabled(release>0);
    if(release>0){
      this.launchRing.scaling.setAll(.55+(1-release)*1.30);
      this.launchRing.visibility=release*.85;
      this.launchSpokes.forEach((spoke,i)=>{
        spoke.visibility=release*.65;
        spoke.scaling.setAll(.80+(1-release)*.55);
        spoke.rotation.y=(1-release)*(i%2?.32:-.30);
      });
    }
    this.updateTrail(t);
    this.light.position.copyFrom(p);
    this.light.intensity=(this.isPyro?.70:.52)*(1+.20*Math.sin(t*35));
  }

  impactTick(t){
    const p=clamp(t,0,1);
    const explode=easeOut(p);
    const flash=Math.exp(-p*(this.isPyro?10:17));
    const after=Math.exp(-p*(this.isPyro?3.0:4.8));
    const alphaScale=this.missed?.38:1;
    this.flash.scaling.setAll(
      (this.isPyro?1.2:1.0)+explode*(this.isPyro?1.25:.80)
    );
    this.flash.visibility=alphaScale*(flash*.95+after*.10);
    this.hitAura.scaling.setAll(1+explode*(this.isPyro?1.70:1.10));
    this.hitAura.visibility=alphaScale*after*(this.isPyro?.35:.27);
    this.hitRings.forEach((ring,i)=>{
      ring.scaling.setAll(.70+explode*(this.isPyro?2.8:2.1)+i*.30);
      ring.visibility=alphaScale*after*(i?.56:.83);
      ring.rotation.y=p*(i?-.8:.6);
    });
    for(let i=0;i<this.hitPieces.length;i++){
      const shard=this.hitPieces[i];
      const a=i*TAU/this.hitPieces.length+i*.085;
      const travel=(this.isPyro?.85:.72)*explode*(1+(i%4)*.11);
      shard.position.set(
        Math.cos(a)*travel,
        Math.sin(a*2.3+i)*travel*.44+explode*(this.isPyro?.24:.08),
        Math.sin(a)*travel,
      );
      shard.rotation.y=p*(i%2?7:-6)+i;
      shard.rotation.x=p*5+i*.6;
      shard.scaling.setAll(
        (this.isPyro?.95:1.1)*(1-p*.55)
      );
      shard.visibility=alphaScale*after;
    }
    this.light.position.copyFrom(this.target);
    this.light.intensity=alphaScale*(this.isPyro?.95:.70)*Math.exp(-p*5.0);
  }

  update(dt){
    if(this.disposed)return true;
    const step=Math.max(0,Math.min(100,dt||0));
    if(this.phase==="flight"){
      this.elapsed+=step;
      const t=clamp(this.elapsed/this.duration,0,1);
      this.flightTick(t);
      if(t>=1){
        this.phase="impact";
        this.head.setEnabled(false);
        for(const item of this.trails)item.mesh.setEnabled(false);
        this.launchRoot.setEnabled(false);
        this.impactRoot.setEnabled(true);
        this.impactTick(0);
      }
    }else{
      this.hitElapsed+=step;
      this.impactTick(this.hitElapsed/this.profile.hitMs);
    }
    return this.phase==="impact"&&this.hitElapsed>=this.profile.hitMs;
  }

  dispose(){
    if(this.disposed)return;
    this.disposed=true;
    this.light?.dispose();
    this.root.dispose(false,true);
    for(const material of this.materials)material.dispose();
    this.materials.length=0;
  }
}
