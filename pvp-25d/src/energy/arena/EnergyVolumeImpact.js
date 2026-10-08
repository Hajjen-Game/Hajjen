// Hero impact depth pass. Pure Babylon mesh volume: real faceted polyhedra,
// suspended curved sheets, axial energy darts and ground-bound debris.
// Invoked in parallel with the existing small core and sharp optional Pixi FX.
// Build-ups, hit/damage rules, orb meshes and old arena are untouched.
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const SPHERE=new Set(["crystal-bolt","sun-lance","rift-slash"]);
const SUPPORTED=new Set(["crystal-bolt","sun-lance","rift-slash","gravity-hammer"]);

export class EnergyVolumeImpact {
  constructor(hero){
    this.hero=hero;
    this.enabled=true;
    this.maxActive=9;
    this.stats={total:0,active:0};
  }
  setEnabled(on){this.enabled=!!on;}
  // All meshes are owned by hero.makeEffect, therefore automatically disposed
  // by hero.clear(), a replay, or a finished effect.
  makePart(fx,mesh,slot,kind,index,origin,velocity,opts={}){
    this.hero.bind(fx,mesh,slot,index);
    if(origin)mesh.position.copyFrom(origin);
    const p={mesh,slot,kind,index,
      origin:mesh.position.clone(),
      rotation:mesh.rotation.clone(),
      velocity:velocity||new BABYLON.Vector3(),
      delay:opts.delay||0,
      spin:opts.spin||new BABYLON.Vector3(.2,.5,.35),
      intensity:opts.intensity??1};
    fx.volumeParts.push(p);
    return p;
  }
  faceted(fx,name,diameter,slot,index,origin,velocity,opts={}){
    // These are actual solid polyhedra, not flat glowing sprites.
    const mesh=BABYLON.MeshBuilder.CreatePolyhedron(name,{
      type:opts.type??0,size:diameter,
    },this.hero.scene);
    return this.makePart(fx,mesh,slot,"debris",index,origin,velocity,opts);
  }
  dart(fx,name,radius,length,slot,index,origin,velocity,opts={}){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{
      diameterTop:0,diameterBottom:radius*2,
      height:length,tessellation:5,subdivisions:1,
    },this.hero.scene);
    return this.makePart(fx,mesh,slot,"dart",index,origin,velocity,opts);
  }
  arc(fx,name,radius,start,span,elevation,tilt,slot,index){
    // 3D filaments rotate in tilted planes; the target is physically between
    // front and back lobes, creating parallax under Babylon's arena camera.
    const path=[];
    for(let k=0;k<=19;k++){
      const a=start+span*k/19;
      path.push(new BABYLON.Vector3(
        Math.cos(a)*radius,
        elevation+Math.sin(a*1.4)*.18,
        Math.sin(a)*radius));
    }
    const mesh=BABYLON.MeshBuilder.CreateTube(name,{
      path,radius:.015,tessellation:6,cap:BABYLON.Mesh.CAP_ROUND,
    },this.hero.scene);
    mesh.rotation.set(tilt,.14*index,.29*(index%3-1));
    return this.makePart(fx,mesh,slot,"orbit",index,null,null,{
      spin:new BABYLON.Vector3(.33*(index%2?1:-1),.41,.19),
      intensity:.80,
    });
  }
  sheet(fx,name,index,side){
    // A non-billboard ribbon twists through X/Y/Z: angular fragments
    // with volume and depth instead of a screen-space slash emblem.
    const front=[],back=[];
    for(let k=0;k<=18;k++){
      const t=k/18-.5;
      const x=t*2.20;
      const y=side*(t*.9+Math.sin(t*8)*.085);
      const z=side*(Math.sin(t*4.3)*.42+.19*t);
      const width=(.10+Math.sin(Math.PI*(t+.5))*.17)*(side<0?1:.75);
      front.push(new BABYLON.Vector3(x,y-width*.5,z-.045));
      back.push(new BABYLON.Vector3(x,y+width*.5,z+.055));
    }
    const mesh=BABYLON.MeshBuilder.CreateRibbon(name,{
      pathArray:[front,back],closeArray:false,
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
      updatable:false,
    },this.hero.scene);
    mesh.rotation.set(.23*side,.34*side,.08);
    return this.makePart(fx,mesh,side<0?"dark":"soft","sheet",
      index,new BABYLON.Vector3(0,.02*side,.05*side),
      new BABYLON.Vector3(0,.10*side,.32*side),{
        spin:new BABYLON.Vector3(.06*side,.15*side,.12*side),
        intensity:.62,
      });
  }
  groundRing(fx,name,radius,index,slot="main"){
    const mesh=BABYLON.MeshBuilder.CreateTorus(name,{
      diameter:radius*2,thickness:.019,tessellation:48,
    },this.hero.scene);
    mesh.position.y=.015;
    return this.makePart(fx,mesh,slot,"ground",index,null,null,{
      intensity:index===0?.72:.48,
    });
  }
  spawn(spellId,position,options={}){
    if(!this.enabled||!SUPPORTED.has(spellId))return null;
    const active=this.hero.live.filter(x=>x.type==="volume-impact");
    if(active.length>=this.maxActive)return null;
    const ground=spellId==="gravity-hammer";
    const centre=ground?
      new BABYLON.Vector3(position.x,.115,position.z):position.clone();
    const duration={
      "crystal-bolt":560,"sun-lance":480,"rift-slash":430,
      "gravity-hammer":640,
    }[spellId];
    const fx=this.hero.makeEffect(spellId,"volume-impact",centre,duration,{
      targetId:options.targetId||null,volumeParts:[],ground,
      motionDir:options.direction||new BABYLON.Vector3(1,0,0),
    });
    const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
    if(spellId==="crystal-bolt"){
      // Frostbolt's spear disintegrates FORWARD through the glass volume.
      // These are solid faceted ice splinters with different heights/rotation,
      // not a symmetric ring or circular icy emblem around the victim.
      const dir=fx.motionDir,planar=Math.hypot(dir.x,dir.z)||1;
      const tx=dir.x/planar,tz=dir.z/planar,sx=-tz,sz=tx;
      for(let i=0;i<10;i++){
        const side=i%2?-1:1;
        const lateral=side*(.09+(i%4)*.050);
        const along=-.24+(i%5)*.105;
        const lift=(i%3-1)*.16;
        const origin=V(tx*along+sx*lateral,lift,tz*along+sz*lateral);
        const forward=(i%5===0?-.32:.58)+(i%3)*.13;
        const velocity=V(tx*forward+sx*side*(.17+i%3*.035),
          lift*.65+(i%4-1.5)*.12,
          tz*forward+sz*side*(.17+i%3*.035));
        const part=this.faceted(fx,"ice-3d-directional-splinter:"+i,
          .10+(i%3)*.025,i%5===0?"light":i%4===0?"dark":"main",
          i,origin,velocity,{type:i%3===0?1:0,
            delay:(i%4)*.028,
            spin:V(1.8+(i%3)*.4,1.2+i*.18,2.0+(i%4)*.22),
            intensity:.79});
        part.mesh.rotation.set(i*.19,Math.atan2(tx,tz),side*.36);
      }
      // Two slim 3D needle streaks start inside the orb and continue through
      // it, keeping the same crystal spear axis as the travelling projectile.
      for(let lane=0;lane<2;lane++){
        const side=lane?1:-1,offset=side*.12;
        const trail=this.hero.tube(fx,[
          V(-tx*.42+sx*offset,-.04+side*.10,-tz*.42+sz*offset),
          V(-tx*.07+sx*offset*.56,side*.065,-tz*.07+sz*offset*.56),
          V(tx*.54+sx*offset*.30,.05-side*.055,tz*.54+sz*offset*.30),
        ],lane===0?.015:.010,lane===0?"main":"light",20+lane);
        // The auxiliary needle's parent is the volume root; fade it with
        // the same lifetime but without the old rotating corona logic.
        fx.volumeStatic=fx.volumeStatic||[];
        fx.volumeStatic.push(trail);
      }
    }else if(spellId==="sun-lance"){
      // Solar lance penetrates as a forward heat jet. Gold embers peel away
      // asymmetrically from the axis; no upright radial sun/star wheel.
      const dir=fx.motionDir,planar=Math.hypot(dir.x,dir.z)||1;
      const tx=dir.x/planar,tz=dir.z/planar,sx=-tz,sz=tx;
      for(let i=0;i<9;i++){
        const side=i%2?-1:1;
        const lateral=side*(.08+(i%4)*.055);
        const along=-.17+(i%4)*.095;
        const up=(i%3-1)*.145;
        const origin=V(tx*along+sx*lateral,up,tz*along+sz*lateral);
        const forward=.48+(i%4)*.12;
        const velocity=V(tx*forward+sx*side*(.15+(i%3)*.05),
          up*.55+(i%5-2)*.07,
          tz*forward+sz*side*(.15+(i%3)*.05));
        const dart=this.dart(fx,"sun-3d-forward-ember:"+i,
          .023+(i%3)*.006,.15+(i%4)*.055,
          i%4===0?"light":i%3===0?"dark":"main",i,
          origin,velocity,{
            delay:(i%3)*.024,
            spin:V(.21,.78,.35),intensity:.73,
          });
        dart.mesh.rotation.set(.38,Math.atan2(tx,tz),side*.3);
      }
      // The hot filament behind the moving tip becomes the hit afterimage.
      const shaft=this.hero.tube(fx,[
        V(-tx*.40,-.035,-tz*.40),
        V(-tx*.12,.01,-tz*.12),
        V(tx*.52,.025,tz*.52),
      ],.016,"light",22);
      fx.volumeStatic=[shaft];
      for(let i=0;i<4;i++){
        const a=i*TAU/4+.36,side=i%2?-1:1;
        this.faceted(fx,"sun-3d-loose-ember:"+i,
          .070,i%3===0?"light":"main",i+14,
          V(tx*.10+sx*side*.19,Math.sin(a)*.16,tz*.10+sz*side*.19),
          V(tx*(.37+i*.07)+sx*side*.29,Math.cos(a)*.22,
            tz*(.37+i*.07)+sz*side*.29),
          {spin:V(.5,.7,.8),intensity:.55});
      }
    }else if(spellId==="rift-slash"){
      // The signature is two TWISTED SURFACES which briefly open through the
      // victim, then recoil. No round sprite ring can fake this perspective.
      this.sheet(fx,"rift-depth-sheet-1",0,-1);
      this.sheet(fx,"rift-depth-sheet-2",1,1);
      for(let i=0;i<7;i++){
        const a=(i+.15)*TAU/7;
        const p=this.faceted(fx,"rift-3d-chip:"+i,
          .10+(i%2)*.04,i%3===0?"dark":"main",i+2,
          V(Math.cos(a)*.27,Math.sin(a)*.17,(i%3-1)*.14),
          V(Math.cos(a)*.73,Math.sin(a)*.54,(i%2?-.55:.55)),{
            delay:(i%3)*.035,
            spin:V(1.8,.8+(i%3),2.1),intensity:.65,
          });
        p.mesh.rotation.y=a;
      }
      this.arc(fx,"rift-3d-far-edge",.87,-.72,Math.PI*1.04,.04,
        1.09,"dark",11);
    }else if(ground){
      // A LOW, VOLUMETRIC SLAM: debris shoots upward from a real contact
      // plane, describing parabolic arcs; an elliptical pressure shell spreads
      // across the arena instead of covering the target with a vertical disk.
      this.groundRing(fx,"gravity-3d-pressure-near",.76,0,"main");
      this.groundRing(fx,"gravity-3d-pressure-far",1.13,1,"dark");
      for(let i=0;i<12;i++){
        const a=(i+.11)*TAU/12;
        const r=.28+(i%3)*.065;
        const p=this.faceted(fx,"gravity-3d-fragment:"+i,
          .11+(i%4)*.020,i%5===0?"light":i%3===0?"dark":"main",
          i+2,V(Math.cos(a)*r,.035,Math.sin(a)*r),
          V(Math.cos(a)*(.57+(i%3)*.14),.45+(i%4)*.17,
            Math.sin(a)*(.57+(i%3)*.14)),{
            delay:i%3*.027,
            spin:V(1.3+(i%3),.9+(i%4)*.2,2.2),
            intensity:.73,
          });
        p.mesh.rotation.y=a;
      }
      for(let i=0;i<3;i++){
        const a=i*TAU/3;
        this.dart(fx,"gravity-3d-shock-jet:"+i,.026,.24,
          "main",i+15,V(Math.cos(a)*.23,.035,Math.sin(a)*.23),
          V(Math.cos(a)*.53,.36,Math.sin(a)*.53),{
            spin:V(.4,1.1,.8),intensity:.50,
          });
      }
    }
    this.stats.total++;
    this.stats.active++;
    return fx;
  }
  update(fx,t,now){
    const progress=smooth(t);
    const fade=clamp(Math.min(1,t*13,(1-t)*1.82),0,.92);
    // The two penetrating filaments fade quickly after contact rather than
    // becoming lingering rings in front of the target.
    for(const filament of fx.volumeStatic||[]){
      filament.visibility=clamp((1-smooth((t-.06)/.46))*.62,0,.66);
    }
    for(const p of fx.volumeParts){
      const u=clamp((t-p.delay)/Math.max(.001,1-p.delay),0,1);
      const k=smooth(u);
      const m=p.mesh;
      if(p.kind==="ground"){
        m.scaling.setAll(.75+1.05*k);
        m.position.y=p.origin.y+.013*(1-k);
        m.visibility=fade*p.intensity;
        continue;
      }
      if(p.kind==="orbit"){
        m.rotation.x=p.rotation.x+p.spin.x*k;
        m.rotation.y=p.rotation.y+p.spin.y*k;
        m.rotation.z=p.rotation.z+p.spin.z*k;
        m.scaling.setAll(.80+.48*k);
        m.visibility=fade*p.intensity*.75;
        continue;
      }
      const rise=fx.ground?(.42*Math.sin(Math.PI*u)-.15*u*u):0;
      m.position.set(
        p.origin.x+p.velocity.x*k,
        p.origin.y+p.velocity.y*k+rise,
        p.origin.z+p.velocity.z*k);
      if(fx.ground)m.position.y=Math.max(-.075,m.position.y);
      m.rotation.x=p.rotation.x+p.spin.x*k;
      m.rotation.y=p.rotation.y+p.spin.y*k;
      m.rotation.z=p.rotation.z+p.spin.z*k;
      m.scaling.setAll(p.kind==="sheet"?.78+.18*(1-u):.79-.38*u);
      m.visibility=fade*p.intensity*(p.slot==="light"?.85:1);
    }
  }
}
