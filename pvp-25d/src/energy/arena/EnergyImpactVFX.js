// Impact VFX 1.0 — six real-event Kinetic skills. Babylon geometry only.
// Visuals neither apply damage nor modify charge paths, collision, crowd control or AI.
const S=.02, TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export const IMPACT_VFX_IDS=new Set([
  "phase-rush","arc-strike","pulse-sever","gravity-hammer",
  "seismic-uppercut","kinetic-rampart"
]);
const H={white:"#fff1e6",peach:"#ffcabd",coral:"#fa8495",
  magenta:"#d85383",wine:"#89456e",dark:"#56416a",
  violet:"#b38ecb",steel:"#8c9cba",glint:"#ffe6c8"};
const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
export class EnergyImpactVFX {
  constructor(scene){
    this.scene=scene;this.live=[];this.materials=new Map();
    this.sequence=0;this.limit=112;
    this.ramparts=new Map();this.wells=new Map();this.warpaths=new Map();
    this.telegraphs=new Map();
  }
  world(x,y,h=.9){return V(x*S,h,y*S);}
  at(a,h=.9){return this.world(a.x,a.y,h);}
  mat(tone="coral",alpha=.86){
    const key=tone+":"+alpha;
    if(this.materials.has(key))return this.materials.get(key);
    const m=new BABYLON.StandardMaterial("impact:"+key,this.scene);
    const c=BABYLON.Color3.FromHexString(H[tone]||tone);
    m.diffuseColor=c.scale(.1);m.emissiveColor=c.scale(tone==="white"?1.36:1.12);
    m.specularColor=BABYLON.Color3.Black();
    m.alpha=alpha;m.disableLighting=true;m.backFaceCulling=false;
    if(alpha<1){
      m.disableDepthWrite=true;
      if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
        m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    }
    this.materials.set(key,m);return m;
  }
  make(kind,at,ms=520,meta={}){
    const root=new BABYLON.TransformNode("impact:"+kind+":"+(++this.sequence),this.scene);
    root.position.copyFrom(at);
    const fx={kind,root,born:performance.now(),ms,parts:[],...meta};
    this.live.push(fx);
    while(this.live.length>this.limit)this.drop(this.live[0]);
    return fx;
  }
  add(fx,mesh,tone="coral",alpha=.82){
    mesh.parent=fx.root;mesh.material=this.mat(tone,alpha);mesh.isPickable=false;
    fx.parts.push({mesh,p:mesh.position.clone(),s:mesh.scaling.clone(),alpha});
    return mesh;
  }
  gem(fx,x,y,z,size=.11,height=.35,tone="coral",alpha=.86){
    const m=BABYLON.MeshBuilder.CreatePolyhedron("impact-facet",{
      type:1,size
    },this.scene);
    m.position.set(x,y,z);
    m.scaling.set(1,height/Math.max(.01,size*2),1);
    return this.add(fx,m,tone,alpha);
  }
  orb(fx,x,y,z,r=.3,tone="white",alpha=.8){
    const m=BABYLON.MeshBuilder.CreateSphere("impact-heart",{
      diameter:r,segments:8
    },this.scene);
    m.position.set(x,y,z);
    return this.add(fx,m,tone,alpha);
  }
  ring(fx,r=.85,y=-.74,tone="coral",thick=.025,alpha=.75){
    const m=BABYLON.MeshBuilder.CreateTorus("impact-ring",{
      diameter:r*2,thickness:thick,tessellation:42
    },this.scene);
    m.position.y=y;return this.add(fx,m,tone,alpha);
  }
  thread(fx,pts,tone="peach",radius=.019,alpha=.8){
    if(pts.length<2)return null;
    const m=BABYLON.MeshBuilder.CreateTube("impact-vein",{
      path:pts,radius,tessellation:5,cap:BABYLON.Mesh.CAP_ALL
    },this.scene);
    return this.add(fx,m,tone,alpha);
  }
  shards(fx,n=9,r=.58,wide=1){
    for(let i=0;i<n;i++){
      const a=i*TAU/n+(i%3)*.13,rad=r*(.65+(i%4)*.15);
      this.gem(fx,Math.cos(a)*rad,(i%3-1)*.16,Math.sin(a)*rad,
        .075+(i%3)*.015,.29+(i%4)*.13,i%4?"coral":"white",.79);
      if(i%2===0)this.thread(fx,[V(Math.cos(a)*.13,.08,Math.sin(a)*.13),
        V(Math.cos(a)*rad*wide,(i%2)*.19,Math.sin(a)*rad*wide)],
        i%3?"peach":"violet",.012,.67);
    }
  }
  bloom(at,kind="kinetic-contact",large=false){
    const fx=this.make(kind,at,large?810:520);
    this.orb(fx,0,.04,0,large?.4:.24,"white",.76);
    this.ring(fx,large?1.2:.7,-.73,"peach",.027,.82);
    this.ring(fx,large?1.53:.88,-.71,"magenta",.013,.7);
    this.shards(fx,large?15:9,large?1:.52,large?1.3:1);
    return fx;
  }
  charge(a,id,seconds=0){
    const fx=this.make("windup",this.at(a),
      clamp(seconds*1000||320,280,2500),{actorId:a.id,spellId:id});
    for(let i=0;i<10;i++){
      const phi=i*TAU/10,rad=.39+i%2*.09;
      this.gem(fx,Math.cos(phi)*rad,(i%3-1)*.11,Math.sin(phi)*rad,
        .055,.22+i%3*.07,i%3?"coral":"white",.8);
    }
    this.orb(fx,0,0,0,.23,"white",.69);
    for(let i=0;i<3;i++){
      const m=this.ring(fx,.43+i*.15,0,i?"magenta":"peach",.014,.65);
      m.rotation.x=i*.27;m.rotation.z=i*.17;
    }
  }
  // A physical broad curved cutting front, rather than a generic upright star.
  cut(a,b,{second=false,wide=false,kind="arc-cut"}={}){
    const fx=this.make(kind,this.at(b),wide?650:440);
    const theta=Math.atan2(b.y-a.y,b.x-a.x);
    const span=wide?2.65:1.96,dist=wide?1.48:.93;
    for(let strand=0;strand<3;strand++){
      const pts=[];
      for(let i=0;i<=16;i++){
        const ang=theta-span*.5+i*span/16;
        const rad=dist+(strand-1)*.11;
        pts.push(V(Math.cos(ang)*rad,
          .01+Math.sin(i*Math.PI/16)*(.49+strand*.07),
          Math.sin(ang)*rad));
      }
      this.thread(fx,pts,strand===0?"white":strand===1?"coral":"magenta",
        strand===1?.048:.022,strand===1?.91:.76);
    }
    for(let k=0;k<8;k++){
      const ang=theta-span/2+k*span/7,rad=dist*(.86+k%3*.08);
      const s=this.gem(fx,Math.cos(ang)*rad,.11+k%2*.19,
        Math.sin(ang)*rad,.065,.23+k%3*.07,k%3?"peach":"white",.85);
      s.rotation.z=ang;
    }
    if(second)this.ring(fx,.68,-.78,"white",.028,.85);
    return fx;
  }
  seam(at,{large=false,kind="gravity-fissure"}={}){
    const fx=this.bloom(at,kind,large);
    const arms=large?11:8;
    for(let i=0;i<arms;i++){
      const a=TAU*i/arms,r=large?1.8:1.12;
      this.thread(fx,[V(Math.cos(a)*.24,-.8,Math.sin(a)*.24),
        V(Math.cos(a+.12)*r*.56,-.79,Math.sin(a+.12)*r*.56),
        V(Math.cos(a-.07)*r,-.78,Math.sin(a-.07)*r)],
        i%2?"magenta":"steel",.028,.73);
    }
    return fx;
  }
  trail(at,kind="charge-trace"){
    const fx=this.make(kind,at,350);
    this.gem(fx,0,.03,0,.11,.45,"peach",.88);
    this.gem(fx,.22,.11,-.09,.055,.22,"coral",.73);
    this.gem(fx,-.22,-.11,.09,.055,.22,"violet",.73);
    this.ring(fx,.29,-.73,"coral",.013,.53);
  }
  front(a){
    const old=this.ramparts.get(a.id);
    if(old)this.drop(old);
    const fx=this.make("rampart",this.at(a),5000,{
      actorId:a.id,persistent:true});
    // Faceted front-facing wall, not an opaque full-screen dome.
    for(let i=-3;i<=3;i++){
      const x=i*.28,tip=1.25-Math.abs(i)*.095;
      this.gem(fx,x,.15,tip,.27,.79,i%2?"magenta":"steel",.46);
      this.thread(fx,[V(x,-.34,tip),V(x,.74,tip)],"peach",.018,.66);
    }
    for(let i=0;i<3;i++){
      const band=this.ring(fx,.77+i*.13,-.13+i*.21,i%2?"coral":"violet",.018,.48);
      band.rotation.x=Math.PI/2.25;
    }
    this.ramparts.set(a.id,fx);
  }
  rushRibbon(from,to,kind="piercing-shock"){
    const fx=this.make(kind,from.clone(),470,{
      moving:true,from:from.clone(),to:to.clone()});
    const dx=to.x-from.x,dz=to.z-from.z,len=Math.hypot(dx,dz)||1;
    const ux=dx/len,uz=dz/len,px=-uz,pz=ux;
    // Short local wake follows the projectile; never draw a premature full-distance beam.
    for(let j=-2;j<=2;j++){
      const offset=j*.10,pts=[
        V(-ux*.82+px*offset,-.07,-uz*.82+pz*offset),
        V(-ux*.37+px*offset,.10,-uz*.37+pz*offset),
        V(px*offset,.03,pz*offset)];
      this.thread(fx,pts,j?"coral":"white",j===0?.043:.017,.79);
    }
    this.gem(fx,0,0,0,.17,.52,"white",.93);
    this.gem(fx,-ux*.32,.04,-uz*.32,.09,.34,"peach",.79);
  }
  spawn(e,match){
    if(!IMPACT_VFX_IDS.has(e.spellId))return false;
    const a=match.getActor(e.actorId),b=match.getActor(e.targetId);
    const kind=e.kind||"",id=e.spellId,hasPoint=Number.isFinite(e.x)&&Number.isFinite(e.y);
    const point=hasPoint?this.world(e.x,e.y):b?this.at(b):a?this.at(a):null;
    if(e.type==="windup"){
      if(a)this.charge(a,id,e.castSeconds||0);
      return true;
    }
    if(id==="phase-rush"){
      if(e.type==="charge-start"&&a){
        this.charge(a,id,.52);this.bloom(this.at(a),"rush-start");
      }else if(e.type==="charge-trail"&&point){
        this.trail(point);
      }else if(e.type==="charge-impact"&&point){
        this.seam(point,{kind:"charge-landing"});
      }else if(e.type==="evolution-proc"&&point){
        if(kind==="meteor-charge")this.seam(point,{large:true,kind:"meteor-impact"});
        else if(kind==="piercing-charge"&&a){
          this.rushRibbon(this.at(a),point);
          this.bloom(point,"piercing-contact");
        }else if(kind==="relentless-pursuit")this.bloom(point,"pursuit-refill",true);
        else this.bloom(point,"rush-empower");
      }else if(e.type==="hit"&&point)this.bloom(point,"charge-contact");
      return true;
    }
    if(id==="arc-strike"){
      if(e.type==="hit"&&a&&b){
        this.cut(a,b,{second:(a.strikeSwingCounter||0)%2===0});
      }else if((e.type==="identity-proc"||e.type==="evolution-proc")&&point){
        if(kind==="arc-second-strike")this.bloom(point,"second-beat");
        else if(kind==="twin-arc"&&a&&b)this.cut(a,b,{wide:true,kind:"twin-arc"});
        else if(kind==="overdrive"&&a&&b)this.cut(a,b,{wide:false,kind:"overdrive-open"});
        else if(kind==="overdrive-hit")this.seam(point,{kind:"overdrive-hit"});
        else if(kind==="kinetic-reprisal-ready"&&a){
          const fx=this.bloom(this.at(a),"reprisal-ready");
          fx.actorId=a.id;
        }else if(kind==="kinetic-reprisal"&&a&&b)
          this.rushRibbon(this.at(a),this.at(b),"reprisal-return");
      }
      return true;
    }
    if(id==="pulse-sever"){
      // Failed/non-interrupt attempts never show an interrupt success.
      if(e.type==="interrupt"&&point){
        const fx=this.make("sever-lock",point,680);
        for(let j=0;j<3;j++){
          const r=this.ring(fx,.48+j*.21,-.18+j*.24,j===1?"magenta":"white",.024,.82);
          r.rotation.x=.25+j*.43;
        }
        for(let i=0;i<7;i++)this.gem(fx,Math.cos(i*TAU/7)*.49,
          .08,Math.sin(i*TAU/7)*.49,.065,.36,"peach",.84);
      }else if(e.type==="identity-proc"&&kind==="counterstrike"&&a&&b)
        this.cut(a,b,{kind:"sever-counter"});
      else if(e.type==="evolution-proc"&&point){
        if(kind==="echo-sever"||kind==="countershock")
          this.seam(point,{large:true,kind});
        else if(kind==="warpath"&&a){
          const prior=this.warpaths.get(a.id);if(prior)this.drop(prior);
          const f=this.make("warpath",this.at(a),4400,
            {persistent:true,actorId:a.id});
          for(let i=0;i<8;i++){
            const ang=i*TAU/8;
            this.gem(f,Math.cos(ang)*.78,Math.sin(ang*1.4)*.22,
              Math.sin(ang)*.78,.065,.3,i%2?"coral":"white",.72);
          }
          this.ring(f,.92,-.73,"magenta",.019,.63);
          this.warpaths.set(a.id,f);
        }
      }
      return true;
    }
    if(id==="gravity-hammer"){
      if(e.type==="ground-telegraph"&&hasPoint){
        const prev=this.telegraphs.get(a?.id);
        if(prev)this.drop(prev);
        const f=this.make("gravity-warning",this.world(e.x,e.y,.1),
          Math.max(400,(e.duration||.6)*1000),{actorId:a?.id,preview:true});
        const r=Math.max(.55,(e.radius||127)*S);
        for(let j=0;j<3;j++)this.ring(f,r*(.51+j*.22),-.01,
          j===0?"white":j===1?"coral":"wine",.023,.68);
        for(let i=0;i<10;i++){
          const ang=i*TAU/10;
          this.gem(f,Math.cos(ang)*r*.82,.05,Math.sin(ang)*r*.82,
            .078,.35,i%2?"magenta":"peach",.75);
        }
        this.telegraphs.set(a?.id,f);
      }else if(e.type==="evolution-proc"&&point){
        if(kind==="gravity-impact"){
          const focused=a?.evolutions?.["gravity-hammer"]==="singularity-impact";
          const f=this.seam(point,{large:!focused,
            kind:focused?"gravity-singularity":"gravity-collapse"});
          this.gem(f,0,3.4,0,.65,1.3,"dark",.83);
          this.orb(f,0,2.7,0,.58,"white",.69);
        }else if(kind==="seismic-wave"){
          const f=this.make("seismic-expansion",point,690);
          for(let j=0;j<3;j++)this.ring(f,.77+j*.55,-.77,
            j===0?"white":j===1?"coral":"violet",.034,.78);
          this.shards(f,10,1.28,1.15);
        }else if(kind==="gravity-well"){
          const key=e.actorId;
          if(!this.wells.has(key)||!this.live.includes(this.wells.get(key))){
            const f=this.make("gravity-well",this.world(e.x,e.y,.13),3300,{
              persistent:true});
            for(let j=0;j<4;j++){
              const r=this.ring(f,.54+j*.33,-.03+j*.08,
                j%2?"wine":"violet",.027,.59);
              r.rotation.z=j*.16;
            }
            for(let i=0;i<10;i++){
              const ang=i*TAU/10,r=.68+i%3*.27;
              this.gem(f,Math.cos(ang)*r,.04,Math.sin(ang)*r,
                .065,.39,i%2?"magenta":"peach",.76);
            }
            this.wells.set(key,f);
          }
        }else if(kind==="singularity-impact")this.seam(point,{kind:"singularity"});
      }else if(e.type==="ability"&&point){
        // Main impact is already driven by the real gravity-impact proc.
      }
      return true;
    }
    if(id==="seismic-uppercut"){
      if(e.type==="hit"&&a&&b)this.cut(a,b,{kind:"uppercut-swipe"});
      else if(e.type==="evolution-proc"&&point){
        if(kind==="uppercut-launch"){
          const f=this.make("uppercut-rise",point,740);
          this.shards(f,12,.45,1);
          for(let j=0;j<4;j++)
            this.thread(f,[V(Math.cos(j*TAU/4)*.45,-.7,Math.sin(j*TAU/4)*.45),
              V(Math.cos(j*TAU/4)*.27,1.9,Math.sin(j*TAU/4)*.27)],
            j%2?"peach":"white",.025,.81);
        }else if(kind==="uppercut-fracture")
          this.seam(point,{large:true,kind:"boss-grounded-fracture"});
        else if(kind==="uppercut-crash")
          this.seam(point,{large:true,kind:"uppercut-slam"});
      }
      return true;
    }
    if(id==="kinetic-rampart"){
      if(e.type==="identity-proc"&&a){
        if(kind==="rampart-start")this.front(a);
        else if(kind==="rampart-catch")this.bloom(this.at(a),"rampart-catch",true);
        else if(kind==="rampart-volley"){
          const f=this.ramparts.get(a.id);
          if(f)this.drop(f);
          this.bloom(this.at(a),"rampart-break");
        }
      }else if(e.type==="hit"&&a&&b){
        this.rushRibbon(this.at(a),this.at(b),"rampart-projectile");
        this.bloom(this.at(b),"rampart-hit");
      }
      return true;
    }
    return true;
  }
  update(match,now=performance.now()){
    for(let i=this.live.length-1;i>=0;i--){
      const f=this.live[i],a=f.actorId?match.getActor(f.actorId):null;
      const t=clamp((now-f.born)/f.ms,0,1);
      const activeRampart=f.kind==="rampart"&&a?.rampart?.until>match.time;
      const activeWarpath=f.kind==="warpath"&&a?.statuses?.some(q=>
        q.kind==="warpath"&&q.remaining>0);
      if((f.kind==="rampart"&&!activeRampart)||
        (f.kind==="warpath"&&!activeWarpath)||
        (f.preview&&(!a?.alive||a.cast?.spellId!=="gravity-hammer"))||
        (!f.persistent&&t>=1)||t>=1){this.drop(f);continue;}
      if(f.moving){
        const u=ease(t);
        f.root.position.set(
          f.from.x+(f.to.x-f.from.x)*u,
          f.from.y+(f.to.y-f.from.y)*u+Math.sin(Math.PI*u)*.22,
          f.from.z+(f.to.z-f.from.z)*u);
      }
      if(f.kind==="windup"){
        if(!a?.alive||a.cast&&a.cast.spellId!==f.spellId){
          this.drop(f);continue;
        }
        if(a)f.root.position.copyFrom(this.at(a));
      }else if((f.kind==="rampart"||f.kind==="warpath")&&a){
        f.root.position.copyFrom(this.at(a));
        if(f.kind==="rampart"){
          const dir=a.rampart?.facing||{x:1,y:0};
          f.root.rotation.y=Math.atan2(dir.x,dir.y);
        }else f.root.rotation.y=now*.0009;
      }
      const fade=f.persistent?Math.min(1,(1-t)*6,t*8):
        Math.min(1,(1-t)*5,t*12);
      for(const [i,p] of f.parts.entries()){
        const m=p.mesh;
        m.visibility=p.alpha*fade;
        if(f.kind==="windup"){
          const a0=i*TAU/10+now*.0016*(i%2?1:-1);
          if(i<10){
            const rad=(.44+i%2*.06)*(1-.55*ease(t));
            m.position.set(Math.cos(a0)*rad,p.p.y,Math.sin(a0)*rad);
          }else m.rotation.y=now*.00052;
        }else if((f.kind==="gravity-collapse"||f.kind==="gravity-singularity")&&
          i>=f.parts.length-2){
          m.position.y=p.p.y*(1-ease(t));
          m.scaling.scaleInPlace(1); // position-driven fall; no perpetual growth
        }else if(f.kind==="gravity-warning"||f.kind==="gravity-well"||
          f.kind==="seismic-expansion"){
          if(f.kind==="seismic-expansion")m.scaling.set(
            p.s.x*(.55+ease(t)*1.15),p.s.y,p.s.z*(.55+ease(t)*1.15));
          else m.rotation.y=now*.0003*(i%2?1:-1);
        }else if(f.kind==="uppercut-rise"){
          m.position.y=p.p.y+t*1.25;
        }else if(f.kind==="charge-trace"||f.kind==="meteor-impact"||
          f.kind==="charge-landing"){
          m.scaling.set(p.s.x*(1+t*.45),p.s.y*(1+t*.22),p.s.z*(1+t*.45));
        }else if(f.kind==="warpath"){
          const angle=i*TAU/9+now*.0013;
          if(i<8)m.position.set(Math.cos(angle)*.78,p.p.y,Math.sin(angle)*.78);
        }
      }
    }
  }
  drop(f){
    if(!f)return;
    const i=this.live.indexOf(f);if(i<0)return;
    this.live.splice(i,1);
    for(const part of f.parts)part.mesh.dispose();
    f.root.dispose();
    for(const map of [this.ramparts,this.wells,this.warpaths,this.telegraphs])
      for(const [key,v] of map)if(v===f)map.delete(key);
  }
  clear(){while(this.live.length)this.drop(this.live[this.live.length-1]);}
  dispose(){
    this.clear();
    for(const m of this.materials.values())m.dispose();
    this.materials.clear();
  }
}
