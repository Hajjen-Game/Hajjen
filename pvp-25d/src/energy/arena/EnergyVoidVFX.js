// Void VFX 1.0 — genuine event/status-driven, spatial low-poly dark matter.
// Original Rift Slash Hero/Pixi dual-blade hit is intentionally not intercepted.
// Dedicated to six Void class spells; never changes combat math or targeting.
const S=.02, TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const V=(x=0,y=0,z=0)=>new BABYLON.Vector3(x,y,z);
export const VOID_VFX_IDS=new Set([
  "rift-slash","entropy-mark","phase-slip","void-metamorphosis","abyssal-rift","dark-pact"
]);
const H={heart:"#f7d9ff",white:"#ffeaff",lilac:"#d4a5ff",amethyst:"#a26ff0",
  violet:"#8154c9",purple:"#6333a1",deep:"#45256d",abyss:"#261935",
  magenta:"#d583eb",smoke:"#6f689b",steel:"#6c6a99"};
const META=new Set(["phantom-assault","umbral-cyclone","executioners-veil","marked-fracture"]);
export class EnergyVoidVFX {
  constructor(scene){
    this.scene=scene;this.live=[];this.mats=new Map();this.seq=0;
    this.limit=122;this.marks=new Map();this.rifts=new Map();
    this.forms=new Map();this.veils=new Map();
    this.lastRiftHits=new Map();
  }
  point(x,y,h=.94){return V(x*S,h,y*S)}
  actor(a,h=.94){return this.point(a.x,a.y,h)}
  material(tone="violet",alpha=.8){
    const key=tone+":"+alpha;
    if(this.mats.has(key))return this.mats.get(key);
    const m=new BABYLON.StandardMaterial("void-vfx:"+key,this.scene);
    const c=BABYLON.Color3.FromHexString(H[tone]||tone);
    m.diffuseColor=c.scale(.10);m.emissiveColor=c.scale(tone==="white"?1.30:tone==="heart"?1.23:1.05);
    m.specularColor=BABYLON.Color3.Black();
    m.alpha=alpha;m.disableLighting=true;m.backFaceCulling=false;
    if(alpha<1){
      m.disableDepthWrite=true;
      if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
        m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    }
    this.mats.set(key,m);return m;
  }
  make(kind,at,ms=540,meta={}){
    const root=new BABYLON.TransformNode("void-fx:"+kind+":"+(++this.seq),this.scene);
    root.position.copyFrom(at);
    const f={kind,root,started:performance.now(),duration:ms,parts:[],nodes:[],...meta};
    this.live.push(f);
    while(this.live.length>this.limit)this.drop(this.live[0]);
    return f;
  }
  add(f,m,tone="violet",alpha=.82){
    m.parent=f.root;m.material=this.material(tone,alpha);m.isPickable=false;
    f.parts.push({mesh:m,p:m.position.clone(),s:m.scaling.clone(),alpha});
    return m;
  }
  shard(f,x,y,z,size=.12,height=.44,tone="violet",alpha=.83){
    const m=BABYLON.MeshBuilder.CreatePolyhedron("void-facet",{
      type:1,size
    },this.scene);
    m.position.set(x,y,z);
    m.scaling.set(1,height/Math.max(.01,size*2),1);
    return this.add(f,m,tone,alpha);
  }
  core(f,x=0,y=0,z=0,r=.31,tone="heart",alpha=.9){
    const m=BABYLON.MeshBuilder.CreateSphere("void-singularity",{
      diameter:r,segments:9
    },this.scene);
    m.position.set(x,y,z);return this.add(f,m,tone,alpha);
  }
  ring(f,r=.76,y=-.78,tone="amethyst",w=.024,alpha=.68){
    const m=BABYLON.MeshBuilder.CreateTorus("void-fracture-ring",{
      diameter:2*r,thickness:w,tessellation:42
    },this.scene);
    m.position.y=y;return this.add(f,m,tone,alpha);
  }
  filament(f,pts,tone="lilac",radius=.015,alpha=.8){
    if(pts.length<2)return null;
    const m=BABYLON.MeshBuilder.CreateTube("void-fine-tendril",{
      path:pts,radius,tessellation:5,cap:BABYLON.Mesh.CAP_ALL
    },this.scene);
    return this.add(f,m,tone,alpha);
  }
  rays(f,num=10,size=1){
    for(let i=0;i<num;i++){
      const a=i*TAU/num+(i%3)*.11,r=(.54+i%4*.16)*size;
      this.shard(f,Math.cos(a)*r,(i%3-1)*.15,Math.sin(a)*r,
        .065+i%3*.018,.27+i%4*.12,i%4===0?"white":i%3===0?"smoke":"violet",.79);
      if(i%2===0)this.filament(f,[
        V(Math.cos(a)*.14,.04,Math.sin(a)*.14),
        V(Math.cos(a)*r*.95,(i%3-1)*.10,Math.sin(a)*r*.95)
      ],i%3?"amethyst":"magenta",.014,.63);
    }
  }
  burst(pos,kind="fracture",scale=1){
    const f=this.make(kind,pos,scale>1?800:540);
    this.core(f,0,.04,0,.31*scale,"heart",.79);
    this.ring(f,.77*scale,-.75,"lilac",.026,.75);
    this.ring(f,1.06*scale,-.73,"purple",.018,.65);
    this.rays(f,scale>1?16:11,scale);
    return f;
  }
  charge(a,id,seconds=0){
    const f=this.make("charge",this.actor(a),clamp(seconds*1000||410,300,2600),
      {sourceId:a.id,spellId:id});
    this.core(f,0,0,0,.27,"heart",.8);
    for(let i=0;i<12;i++){
      const a0=i*TAU/12;
      this.shard(f,Math.cos(a0)*.48,(i%4-1.5)*.09,Math.sin(a0)*.48,
        .058,.25+(i%4)*.085,i%3?"violet":"white",.79);
    }
    for(let j=0;j<3;j++){
      const hoop=this.ring(f,.36+j*.15,0,j===0?"lilac":"purple",.017,.62);
      hoop.rotation.x=.16+j*.36;hoop.rotation.z=j*.31;
    }
  }
  // Animated octahedral projectile core and nested moving energy threads.
  flight(from,to,{kind="void-flight",ms=410,scale=1}={}){
    const f=this.make(kind,from.clone(),ms,{
      from:from.clone(),to:to.clone(),travels:true});
    const dx=to.x-from.x,dz=to.z-from.z,phi=Math.atan2(dz,dx);
    this.core(f,0,0,0,.26*scale,"heart",.91);
    for(let i=0;i<8;i++){
      const a=i*TAU/8;
      const g=this.shard(f,Math.cos(a)*.22*scale,(i%3-1)*.1,
        Math.sin(a)*.22*scale,.060*scale,.30*scale,i%3?"violet":"white",.84);
      g.rotation.y=a;
    }
    for(let lane=-2;lane<=2;lane++){
      const offset=lane*.07*scale;
      this.filament(f,[
        V(-.85*scale,offset*.46,-offset),
        V(-.45*scale,offset,offset*.8),V(.03,0,offset*.35)
      ],lane===0?"white":lane%2?"lilac":"amethyst",lane===0?.024:.012,.75);
    }
    f.root.rotation.y=phi;
    return f;
  }
  // Actual mark recipient follows, and expires with the real DoT status.
  mark(source,target){
    const key=source.id+":"+target.id;
    const old=this.marks.get(key);
    if(old)this.drop(old);
    const f=this.make("entropy-mark",this.actor(target,1.04),14500,{
      persistent:true,sourceId:source.id,targetId:target.id,key});
    this.core(f,0,.06,0,.26,"purple",.78);
    for(let j=0;j<3;j++){
      const loop=this.ring(f,.42+j*.13,-.04+j*.09,
        j===1?"magenta":"violet",.017,.66);
      loop.rotation.x=.3+j*.42;
    }
    for(let i=0;i<7;i++){
      const a=i*TAU/7;
      this.shard(f,Math.cos(a)*.55,Math.sin(a*2)*.12,
        Math.sin(a)*.55,.067,.27,i%2?"amethyst":"lilac",.76);
    }
    this.marks.set(key,f);return f;
  }
  // Persistent four-second wound in space, tied to match.voidRifts.
  openRift(a,x,y){
    if(this.rifts.get(a.id))this.drop(this.rifts.get(a.id));
    const f=this.make("abyssal-open",this.point(x,y,.18),4850,{
      persistent:true,ownerId:a.id,x,y});
    for(let j=0;j<5;j++){
      const loop=this.ring(f,.54+j*.34,-.11+j*.025,
        j%2?"magenta":j===0?"abyss":"purple",.033,.68);
      loop.rotation.z=j*.21;
    }
    this.core(f,0,.10,0,.95,"abyss",.89);
    this.core(f,0,.14,0,.40,"deep",.8);
    for(let i=0;i<14;i++){
      const angle=i*TAU/14,r=.65+(i%5)*.33;
      this.shard(f,Math.cos(angle)*r,(i%3)*.09,Math.sin(angle)*r,
        .10,.38+i%4*.09,i%3?"violet":"lilac",.71);
      if(i%2===0){
        this.filament(f,[V(Math.cos(angle)*1.7,.10,Math.sin(angle)*1.7),
          V(Math.cos(angle+.3)*.9,.25,Math.sin(angle+.3)*.9),
          V(Math.cos(angle+.6)*.35,.20,Math.sin(angle+.6)*.35)],
        i%4?"amethyst":"magenta",.020,.64);
      }
    }
    this.rifts.set(a.id,f);
  }
  form(a){
    if(this.forms.get(a.id))this.drop(this.forms.get(a.id));
    const f=this.make("metamorphosis",this.actor(a),8500,{
      persistent:true,sourceId:a.id});
    // Keeps existing authored twin curved blades and orb visible; adds fractured halo.
    for(let j=0;j<4;j++){
      const h=this.ring(f,.65+j*.16,.04+j*.12,
        j%2?"purple":"amethyst",.022,.54);
      h.rotation.x=.20+j*.29;
    }
    for(let i=0;i<12;i++){
      const a0=i*TAU/12,r=.86+(i%3)*.13;
      this.shard(f,Math.cos(a0)*r,(i%4-1.5)*.18,Math.sin(a0)*r,
        .086,.37+i%3*.16,i%4?"violet":"white",.78);
    }
    this.forms.set(a.id,f);
    this.burst(this.actor(a),"transformation-arrival",1.45);
  }
  veil(a){
    const old=this.veils.get(a.id);if(old)this.drop(old);
    const f=this.make("veilwalk",this.actor(a),2800,{
      persistent:true,sourceId:a.id});
    for(let j=0;j<5;j++){
      const loop=this.ring(f,.66+j*.12,(j-2)*.17,j%2?"smoke":"lilac",.014,.49);
      loop.rotation.x=j*.4;
    }
    for(let i=0;i<8;i++)this.shard(f,Math.cos(i*TAU/8)*.78,
      Math.sin(i*TAU/8)*.22,Math.sin(i*TAU/8)*.78,.075,.33,"amethyst",.44);
    this.veils.set(a.id,f);
  }
  teleport(from,to){
    this.burst(from,"phase-shed");
    const f=this.make("phase-arrival",to.clone(),580);
    this.core(f,0,0,0,.28,"white",.81);
    this.rays(f,13,1.1);
    const dx=to.x-from.x,dz=to.z-from.z,len=Math.hypot(dx,dz)||1;
    // Five narrow sequential echoes, all strictly within the actual legal path.
    for(let j=0;j<5;j++){
      const u=(j+1)/6;
      const node=this.make("phase-echo",V(from.x+dx*u,.90,from.z+dz*u),
        360+j*55);
      const phi=Math.atan2(dz,dx);
      for(let k=0;k<3;k++){
        const a=phi+k*TAU/3;
        this.shard(node,Math.cos(a)*.17,k*.11,Math.sin(a)*.17,.065,.37,
          k===0?"white":"purple",.65);
      }
      this.ring(node,.25,-.74,"violet",.011,.46);
    }
  }
  slashProc(at,kind){
    const scale=kind==="umbral-cyclone"?1.5:kind==="executioners-veil"?1.25:1.0;
    const f=this.make("slash-"+kind,at,kind==="umbral-cyclone"?760:520);
    const arms=kind==="umbral-cyclone"?12:kind==="executioners-veil"?6:4;
    for(let lane=0;lane<(kind==="umbral-cyclone"?3:2);lane++){
      const pts=[];
      for(let j=0;j<=23;j++){
        const a=j*TAU*(kind==="umbral-cyclone"?.86:.43)/23+lane*TAU/3;
        const radius=(.49+lane*.18)*scale;
        pts.push(V(Math.cos(a)*radius,Math.sin(a*2)*.21,Math.sin(a)*radius));
      }
      this.filament(f,pts,lane===0?"white":lane===1?"amethyst":"magenta",
        lane===0?.039:.023,.82);
    }
    for(let i=0;i<arms;i++){
      const a=i*TAU/arms,r=scale*(.6+i%3*.13);
      const g=this.shard(f,Math.cos(a)*r,(i%4)*.13,Math.sin(a)*r,.075,.46,
        i%3?"violet":"white",.82);
      g.rotation.z=a;
    }
    return f;
  }
  phantom(a,b){
    // The clone visually appears behind the actual struck enemy, relative
    // to the true source of the Rift Slash (not behind the player's target frame).
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    const pos=this.point(b.x+dx/len*70,b.y+dy/len*70,1.04);
    const f=this.make("phantom-clone",pos,660);
    this.core(f,0,0,0,.48,"deep",.55);
    this.core(f,0,0,0,.20,"heart",.69);
    for(const side of [-1,1]){
      const path=[];
      for(let j=0;j<=15;j++){
        const t=j/15,ang=.55+1.75*t;
        path.push(V(side*(.24+Math.cos(ang)*.55),
          .12+Math.sin(ang)*.67,side*(.12+Math.cos(ang)*.15)));
      }
      this.filament(f,path,side>0?"lilac":"magenta",.041,.83);
      this.shard(f,side*.58,.37,0,.11,.65,side>0?"white":"violet",.73);
    }
    for(let i=0;i<7;i++){
      const theta=i*TAU/7;
      this.shard(f,Math.cos(theta)*.44,Math.sin(theta)*.28,
        Math.sin(theta)*.44,.06,.25,"smoke",.6);
    }
    return f;
  }
  skySpear(at,kind="dark-spear"){
    const isPact=kind==="dark-spear";
    const f=this.make("sky-"+kind,at.clone(),690,{
      falling:true,sky:4.7,impactAt:.58});
    const root=this.shard(f,0,4.7,0,isPact?.56:.35,isPact?4.8:3.0,
      "purple",.85);
    root.rotation.z=Math.PI;
    this.shard(f,0,4.10,0,isPact?.27:.18,isPact?2.5:1.6,"white",.84).rotation.z=Math.PI;
    for(let i=0;i<4;i++){
      const a=i*TAU/4;
      const sliver=this.shard(f,Math.cos(a)*.24,3.4+i%2*.42,
        Math.sin(a)*.24,.12,.85,i%2?"magenta":"amethyst",.72);
      sliver.rotation.z=Math.PI*.12;
    }
    // The impact has ALREADY happened in the combat event: show instant
    // sky-to-ground contact, with residual fragments continuing to fall.
    this.filament(f,[V(0,-.70,0),V(0,2.2,0),V(0,4.9,0)],
      "white",.043,.88);
    for(let j=0;j<3;j++){
      const a=j*TAU/3;
      this.filament(f,[
        V(Math.cos(a)*.16,-.55,Math.sin(a)*.16),
        V(Math.cos(a+.18)*.29,1.6,Math.sin(a+.18)*.29),
        V(Math.cos(a)*.16,4.5,Math.sin(a)*.16)
      ],j%2?"magenta":"lilac",.019,.67);
    }
    this.ring(f,isPact?.92:.7,-.79,"lilac",.021,.70);
    for(let i=0;i<8;i++){
      const a=i*TAU/8;
      this.shard(f,Math.cos(a)*.83,-.73,Math.sin(a)*.83,.058,.23,
        i%2?"violet":"white",.64);
    }
    // Immediate narrow fracture on the real resolved strike.
    this.burst(at,isPact?"pact-impact":"mindstorm-impact",isPact?1.05:.78);
    return f;
  }
  spawn(e,match){
    if(!VOID_VFX_IDS.has(e.spellId))return false;
    const id=e.spellId,kind=e.kind||"";
    // Capture the REAL slash victim before returning to the authored blade path.
    // Devouring Pact's soul fragment must originate at that victim, not the healer.
    if(id==="rift-slash"&&e.type==="hit"){
      const source=match.getActor(e.actorId),victim=match.getActor(e.targetId);
      if(source&&victim&&source.team!==victim.team)
        this.lastRiftHits.set(source.id,{targetId:victim.id,
          x:victim.x,y:victim.y,until:performance.now()+1000});
    }
    // Original authored Rift Slash sword travel, core buildup and impact retained.
    // Evolutions/procs are supplementary only, exactly as Pulse Mend was handled.
    if(id==="rift-slash"&&
      !((e.type==="identity-proc"||e.type==="evolution-proc")&&
        (META.has(kind))))return false;
    const a=match.getActor(e.actorId),b=match.getActor(e.targetId);
    const point=Number.isFinite(e.x)&&Number.isFinite(e.y)?
      this.point(e.x,e.y):b?this.actor(b):a?this.actor(a):null;
    if(!a)return true;
    if(e.type==="windup"){
      this.charge(a,id,e.castSeconds);
      return true;
    }
    if(id==="rift-slash"){
      if(kind==="phantom-assault"&&b)this.phantom(a,b);
      if(point)this.slashProc(point,kind);
      return true;
    }
    if(id==="entropy-mark"){
      if(e.type==="identity-proc"&&kind==="entropy-applied"&&b){
        this.flight(this.actor(a),this.actor(b),
          {kind:"entropy-flight",ms:420,scale:.88});
        this.mark(a,b);
        this.burst(point,"mark-imprint");
      }else if(e.type==="hit"&&b){
        const f=this.make("dot-tick",this.actor(b,1.05),420);
        this.core(f,0,.02,0,.18,"magenta",.78);
        for(let j=0;j<6;j++){
          const ang=j*TAU/6;
          this.shard(f,Math.cos(ang)*.30,Math.sin(ang)*.24,
            Math.sin(ang)*.30,.045,.22,j%2?"white":"violet",.71);
        }
      }else if(e.type==="evolution-proc"&&kind==="psychic-collapse"&&point){
        const old=this.marks.get(a.id+":"+b?.id);if(old)this.drop(old);
        this.burst(point,"psychic-implosion",1.55);
      }else if(e.type==="evolution-proc"&&kind==="contagion"&&b){
        this.burst(this.actor(b),"contagion-release",1.32);
        for(const infected of (match.actors||[]).filter(q=>q.alive&&q.team!==a.team&&q.id!==b.id&&
          q.statuses?.some(s=>s.kind==="dot"&&s.spellId==="entropy-mark"&&
            s.sourceId===a.id&&s.generation>0)).slice(0,3)){
          this.flight(this.actor(b),this.actor(infected),
            {kind:"contagion-flight",ms:410,scale:.70});
          if(!this.marks.has(a.id+":"+infected.id))this.mark(a,infected);
        }
      }else if(e.type==="evolution-proc"&&kind==="devouring-pact"){
        const hit=this.lastRiftHits.get(a.id);
        // Only use a recently confirmed direct Rift Slash hit, never stale targeting.
        if(hit?.until>performance.now())
          this.flight(this.point(hit.x,hit.y),this.actor(a),
            {kind:"soul-return",ms:470,scale:.7});
        else this.burst(this.actor(a),"soul-recovered",.7);
      }
      return true;
    }
    if(id==="phase-slip"){
      if(e.type==="dash"&&Number.isFinite(e.fromX)&&Number.isFinite(e.toX)){
        this.teleport(this.point(e.fromX,e.fromY),this.point(e.toX,e.toY));
      }else if(e.type==="evolution-proc"&&kind==="veilwalk")this.veil(a);
      else if(e.type==="evolution-proc"&&kind==="veilwalk-dodge"){
        const old=this.veils.get(a.id);if(old)this.drop(old);
        this.burst(this.actor(a),"veilwalk-evade",1.0);
      }else if(e.type==="evolution-proc"&&kind==="rift-echo"){
        const f=this.make("rift-echo-hit",point||this.actor(a),490);
        this.shard(f,0,.2,0,.21,.83,"lilac",.82);
        this.ring(f,.51,-.77,"amethyst",.021,.74);
        this.rays(f,6,.67);
      }else if(e.type==="evolution-proc"&&kind==="shadow-ambush"&&point)
        this.slashProc(point,"shadow-ambush");
      else if(e.type==="evolution-proc"&&kind==="rift-echo-start"&&point)
        this.burst(point,"echo-depart");
      return true;
    }
    if(id==="void-metamorphosis"){
      if(e.type==="identity-proc"&&kind==="metamorphosis-start")this.form(a);
      else if(e.type==="identity-proc"&&kind==="metamorphosis-end"){
        const old=this.forms.get(a.id);if(old)this.drop(old);
        this.burst(this.actor(a),"form-dissolve",.85);
      }else if(e.type==="evolution-proc"&&point){
        if(kind==="form-blades"||kind==="dreadblade-arcs")
          this.slashProc(point,kind==="dreadblade-arcs"?"umbral-cyclone":"form-blades");
        else if(kind==="mark-psychic-pulse")this.burst(point,"form-mark-contact",.65);
        else if(kind==="mindstorm-spear")this.skySpear(point,"mindstorm-spear");
        else if(kind==="soul-devourer"){
          this.flight(point,this.actor(a),{kind:"devour-soul",ms:510,scale:.8});
        }else if(kind==="soul-devourer-finale")this.burst(point,"devourer-finale",1.9);
      }
      return true;
    }
    if(id==="abyssal-rift"){
      if(e.type==="evolution-proc"&&kind==="rift-open"&&Number.isFinite(e.x)){
        this.openRift(a,e.x,e.y);
      }else if(e.type==="evolution-proc"&&kind==="rift-tendrils"&&point){
        const f=this.make("rift-tendril-pulse",point,590);
        for(let i=0;i<9;i++){
          const phi=i*TAU/9,r=1.25+i%3*.25;
          this.filament(f,[V(Math.cos(phi)*r,-.55,Math.sin(phi)*r),
            V(Math.cos(phi+.4)*r*.62,.15,Math.sin(phi+.4)*r*.62),
            V(Math.cos(phi+.8)*.30,.30,Math.sin(phi+.8)*.30)],
          i%2?"amethyst":"magenta",.023,.81);
        }
        this.ring(f,1.5,-.72,"violet",.02,.58);
      }else if(e.type==="evolution-proc"&&kind==="rift-swallow"&&point)
        this.burst(point,"projectile-swallowed",.8);
      else if(e.type==="evolution-proc"&&kind==="rift-implosion"&&point){
        const prior=this.rifts.get(a.id);if(prior)this.drop(prior);
        this.burst(point,"rift-implosion",1.85);
      }
      return true;
    }
    if(id==="dark-pact"){
      if(e.type==="identity-proc"&&kind==="pact-sacrifice"){
        const f=this.make("pact-sacrifice",this.actor(a),850);
        this.core(f,0,0,0,.38,"abyss",.91);
        for(let i=0;i<12;i++){
          const theta=i*TAU/12;
          this.shard(f,Math.cos(theta)*.8,(i%3-1)*.16,
            Math.sin(theta)*.8,.085,.48,i%2?"purple":"white",.8);
          this.filament(f,[V(Math.cos(theta)*.8,(i%3-1)*.16,Math.sin(theta)*.8),
            V(Math.cos(theta)*.18,0,Math.sin(theta)*.18)],
          "magenta",.018,.71);
        }
      }else if(e.type==="evolution-proc"&&kind==="dark-spear"&&point)
        this.skySpear(point,"dark-spear");
      return true;
    }
    return true;
  }
  update(match,now=performance.now()){
    for(let i=this.live.length-1;i>=0;i--){
      const f=this.live[i],t=clamp((now-f.started)/f.duration,0,1);
      const a=f.sourceId?match.getActor(f.sourceId):null;
      const b=f.targetId?match.getActor(f.targetId):null;
      let active=true;
      if(f.kind==="entropy-mark"){
        active=!!(a?.alive&&b?.alive&&b.statuses?.some(q=>
          q.kind==="dot"&&q.spellId==="entropy-mark"&&q.sourceId===a.id&&q.remaining>0));
        if(active)f.root.position.copyFrom(this.actor(b,1.04));
      }else if(f.kind==="abyssal-open"){
        active=!!(a?.alive&&match.voidRifts?.some(q=>q.owner===f.ownerId&&
          q.until>match.time&&Math.hypot(q.x-f.x,q.y-f.y)<8));
      }else if(f.kind==="metamorphosis"){
        active=!!(a?.alive&&a.voidForm?.until>match.time);
        if(active)f.root.position.copyFrom(this.actor(a));
      }else if(f.kind==="veilwalk"){
        active=!!(a?.alive&&a.statuses?.some(q=>q.kind==="veilwalk"&&q.remaining>0));
        if(active)f.root.position.copyFrom(this.actor(a));
      }else if(f.kind==="charge"&&a){
        active=!!a.alive;
        if(active)f.root.position.copyFrom(this.actor(a));
      }
      if(!active||t>=1){this.drop(f);continue;}
      if(f.travels){
        f.root.position.set(f.from.x+(f.to.x-f.from.x)*smooth(t),
          f.from.y+(f.to.y-f.from.y)*smooth(t)+Math.sin(t*Math.PI)*.19,
          f.from.z+(f.to.z-f.from.z)*smooth(t));
      }
      const hold=f.persistent?Math.min(1,t*10,(1-t)*7):Math.min(1,t*13,(1-t)*5);
      for(let j=0;j<f.parts.length;j++){
        const p=f.parts[j],m=p.mesh;
        m.visibility=p.alpha*hold;
        if(f.kind==="charge"){
          if(j<13){
            const angle=now*.0013*(j%2?1:-1)+j*TAU/12;
            const r=(.45+j%3*.025)*(1-.47*smooth(t));
            if(j>0)m.position.set(Math.cos(angle)*r,p.p.y,Math.sin(angle)*r);
          }else m.rotation.y=now*.00042;
        }else if(f.kind==="entropy-mark"||f.kind==="metamorphosis"||
          f.kind==="veilwalk"){
          if(j>0&&j%3===0)m.rotation.y=now*.00047*(j%2?1:-1);
          if(f.kind==="metamorphosis"&&j>=4){
            const angle=j*TAU/12+now*.00067;
            m.position.set(Math.cos(angle)*(.92+j%3*.08),
              p.p.y+Math.sin(angle*2)*.08,
              Math.sin(angle)*(.92+j%3*.08));
          }
        }else if(f.kind==="abyssal-open"){
          if(j<5)m.rotation.y=now*.00028*(j%2?-1:1);
          else if(j>6&&j%4===0)m.rotation.z=now*.00021;
        }else if(f.falling&&j<6){
          // Actual delayed proc spawns the falling spear; no premature damage cue.
          const height=Math.max(0,1-smooth(t/Math.max(.01,f.impactAt)));
          m.position.y=p.p.y*height;
        }else if(f.kind==="rift-implosion"||f.kind==="psychic-implosion"||
          f.kind==="devourer-finale"){
          const mul=1-.68*smooth(t);
          m.position.set(p.p.x*mul,p.p.y*mul,p.p.z*mul);
        }else if(f.kind==="phase-arrival"||f.kind==="phase-echo"||
          f.kind.startsWith("slash-")){
          m.rotation.y=now*.00044*(j%2?1:-1);
        }
      }
    }
  }
  drop(f){
    if(!f)return;
    const at=this.live.indexOf(f);if(at<0)return;
    this.live.splice(at,1);
    for(const p of f.parts)p.mesh.dispose();
    for(const n of f.nodes)n.dispose();
    f.root.dispose();
    for(const map of [this.marks,this.rifts,this.forms,this.veils])
      for(const [k,v]of map)if(v===f)map.delete(k);
  }
  clear(){
    while(this.live.length)this.drop(this.live[this.live.length-1]);
    this.lastRiftHits.clear();
  }
  dispose(){
    this.clear();for(const m of this.mats.values())m.dispose();this.mats.clear();
  }
}
