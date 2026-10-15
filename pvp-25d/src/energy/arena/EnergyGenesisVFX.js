// Genesis VFX 1.0: high-detail living Vital effects for the five non-signature
// spells and additive Pulse Mend Evolution FX. Original Pulse Mend signature,
// Crystal Bolt and Sun Lance pipelines are left completely untouched.
const S=.02,TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
export const GENESIS_VFX_IDS=new Set(["pulse-mend","resonance-guard",
  "vital-cascade","stasis-seal","vital-recall","soul-relay"]);
const OWN=new Set(["resonance-guard","vital-cascade","stasis-seal",
  "vital-recall","soul-relay"]);
const HUES={core:"#effff2",mint:"#86ebbd",leaf:"#58d5b5",
  aqua:"#7fe4ec",deep:"#32989e",jade:"#399983",warm:"#c8ffa2",
  ivory:"#f7fff1",shadow:"#386e7c"};
export class EnergyGenesisVFX{
  constructor(scene){
    this.scene=scene;this.materials=new Map();this.live=[];
    this.limit=110;this.seq=0;this.statusFX=new Map();
    this.relayFirst=new Map();this.cascadeOrigins=new Map();
  }
  material(tone="mint",alpha=.85){
    const key=tone+":"+alpha;
    if(this.materials.has(key))return this.materials.get(key);
    const mat=new BABYLON.StandardMaterial("genesis:"+key,this.scene);
    const base=BABYLON.Color3.FromHexString(HUES[tone]||tone);
    mat.diffuseColor=base.scale(.11);
    mat.emissiveColor=base.scale(tone==="core"?1.4:1.02);
    mat.specularColor=BABYLON.Color3.Black();mat.alpha=alpha;
    mat.disableLighting=true;mat.backFaceCulling=false;
    if(alpha<1){
      mat.disableDepthWrite=true;
      if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined)
        mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    }
    this.materials.set(key,mat);return mat;
  }
  at(x,y,h=.95){return new BABYLON.Vector3(x*S,h,y*S)}
  pos(actor,h=.95){return this.at(actor.x,actor.y,h)}
  fx(kind,origin,ms=570,meta={}){
    const root=new BABYLON.TransformNode("genesis:"+kind+":"+(++this.seq),this.scene);
    root.position.copyFrom(origin);
    const item={kind,root,created:performance.now(),duration:ms,
      parts:[],nodes:[],...meta};
    this.live.push(item);
    while(this.live.length>this.limit)this.drop(this.live[0]);
    return item;
  }
  piece(f,mesh,tone="mint",alpha=.83){
    mesh.parent=f.root;mesh.material=this.material(tone,alpha);
    mesh.isPickable=false;f.parts.push({mesh,initial:mesh.position.clone()});
    return mesh;
  }
  petal(f,size=.13,height=.45,tone="leaf",x=0,y=0,z=0,alpha=.9){
    const mesh=BABYLON.MeshBuilder.CreatePolyhedron("vital-petal:"+this.seq,
      {type:1,size,flat:false},this.scene);
    this.piece(f,mesh,tone,alpha);
    mesh.scaling.set(1,Math.max(.3,height/(size*2)),1);
    mesh.position.set(x,y,z);return mesh;
  }
  heart(f,diam=.3,tone="core",x=0,y=0,z=0,alpha=.9){
    const mesh=BABYLON.MeshBuilder.CreateSphere("vital-heart:"+this.seq,
      {diameter:diam,segments:9},this.scene);
    this.piece(f,mesh,tone,alpha);mesh.position.set(x,y,z);return mesh;
  }
  ring(f,r=.75,tone="mint",y=0,width=.024,alpha=.70){
    const mesh=BABYLON.MeshBuilder.CreateTorus("vital-loop:"+this.seq,{
      diameter:r*2,thickness:width,tessellation:48
    },this.scene);
    this.piece(f,mesh,tone,alpha);mesh.position.y=y;return mesh;
  }
  thread(f,points,tone="aqua",width=.016,alpha=.75){
    const mesh=BABYLON.MeshBuilder.CreateTube("vital-thread:"+this.seq,{
      path:points,radius:width,tessellation:5,cap:BABYLON.Mesh.CAP_ALL
    },this.scene);
    return this.piece(f,mesh,tone,alpha);
  }
  leafBurst(point,large=false,kind="life-bloom"){
    const f=this.fx(kind,point,large?750:530,{burst:true});
    const count=large?12:8;
    for(let i=0;i<count;i++){
      const a=TAU*i/count+.14;
      const radius=.29+(i%3)*.14;
      const g=this.petal(f,large?.17:.095,large?.75:.45,
        i%4===0?"core":i%2===0?"mint":"aqua",
        Math.cos(a)*radius,(i%4-1.5)*.12,
        Math.sin(a)*radius,.75);
      g.rotation.z=.34+Math.sin(a)*.26;g.rotation.x=.1+Math.cos(a)*.32;
      if(i%3===0)this.thread(f,[
        new BABYLON.Vector3(Math.cos(a)*.10,.03,Math.sin(a)*.10),
        new BABYLON.Vector3(Math.cos(a)*.83,.29,Math.sin(a)*.83)
      ],i%2===0?"core":"aqua",.011,.61);
    }
    this.heart(f,large?.46:.24,"core",0,.07,0,.91);
    this.ring(f,large?.97:.62,"mint",-.54,.018,.51);
    return f;
  }
  // Five different disciplines of graceful Vital weaving, all confined to
  // the orb's interior so the build-up remains readable from arena zoom.
  windup(actor,spell,sec){
    const f=this.fx("charge-"+spell,this.pos(actor),clamp(sec*1000||380,320,2500),
      {casterId:actor.id});
    const n=spell==="vital-cascade"?10:spell==="stasis-seal"?8:7;
    for(let i=0;i<n;i++){
      const a=i*TAU/n;
      const g=this.petal(f,.053+(i%3)*.012,.29+(i%4)*.07,
        i%4===0?"core":i%2===0?"mint":"aqua",
        Math.cos(a)*.36,(i%3-1)*.11,Math.sin(a)*.36,.79);
      g.rotation.z=a*.35;
    }
    for(let i=0;i<3;i++){
      const g=this.ring(f,.29+i*.115,i===0?"ivory":i===1?"leaf":"aqua",
        (i-1)*.075,.016,.62);
      g.rotation.x=.36+i*.46;g.rotation.z=i*.37;
    }
    this.heart(f,.19,"core",0,0,0,.92);
    return f;
  }
  flight(from,to,kind="life-flight",ms=450,extras={}){
    const f=this.fx(kind,from,ms,{from:from.clone(),to:to.clone(),...extras});
    this.heart(f,kind==="cascade-flight"?.34:.26,"ivory",0,0,0,.84);
    for(let i=0;i<7;i++){
      const a=i*TAU/7;
      const p=this.petal(f,.049,.28,i%3===0?"core":i%2?"mint":"leaf",
        Math.cos(a)*.27,(i%3-1)*.10,Math.sin(a)*.27,.75);
      p.rotation.z=a*.25;
    }
    for(let i=0;i<2;i++)this.ring(f,.29+i*.13,
      i===0?"mint":"aqua",0,.014,.53);
    return f;
  }
  // Barriers use transparent faceted leaves, not opaque plates hiding the orb.
  shield(actor,subject,match){
    if(!subject)return;
    const status=subject.statuses?.find(s=>
      s.kind==="shield"&&s.spellId==="resonance-guard"&&
      s.sourceId===actor?.id&&s.remaining>0);
    if(!status)return;
    const key="guard:"+subject.id;
    if(this.statusFX.has(key))this.drop(this.statusFX.get(key));
    const f=this.fx("guard-shell",this.pos(subject),
      Math.max(600,status.remaining*1000),{
        subjectId:subject.id,sourceId:actor.id,statusKind:"guard",
        shieldLast:status.absorbLeft??0
      });
    for(let i=0;i<7;i++){
      const a=i*TAU/7;
      const g=this.petal(f,.23,1.3,i%3===0?"core":i%2?"mint":"aqua",
        Math.cos(a)*.93,.06,Math.sin(a)*.93,i%3===0?.44:.32);
      g.rotation.z=Math.sin(a)*.28;
      g.rotation.x=Math.cos(a)*.22;
    }
    for(let i=0;i<3;i++){
      const g=this.ring(f,.84+i*.13,i===0?"ivory":i===1?"mint":"deep",
        -.66+i*.63,.017,i===0?.66:.44);
      g.rotation.x=i*.13;
    }
    this.statusFX.set(key,f);return f;
  }
  stasis(actor,subject){
    const status=subject?.statuses?.find(s=>s.kind==="incapacitate"&&
      s.spellId==="stasis-seal"&&s.sourceId===actor?.id&&s.remaining>0);
    if(!status)return null;
    const key="stasis:"+subject.id;
    if(this.statusFX.has(key))this.drop(this.statusFX.get(key));
    const f=this.fx("stasis-lattice",this.pos(subject),
      Math.max(500,status.remaining*1000),{
        subjectId:subject.id,sourceId:actor.id,statusKind:"stasis"
      });
    // Eight upward pillars and interwoven slow Vital arcs surround target.
    for(let i=0;i<8;i++){
      const a=i*TAU/8;
      const height=i%2?1.38:1.1;
      const p=this.petal(f,.10,height,i%3===0?"ivory":i%2?"mint":"aqua",
        Math.cos(a)*.86,-.06,Math.sin(a)*.86,.62);
      p.rotation.z=.10*Math.cos(a);
      if(i%2===0){
        const path=[];
        for(let j=0;j<=8;j++){
          const angle=a+j*TAU/8/8;
          path.push(new BABYLON.Vector3(Math.cos(angle)*.82,
            .41+.06*Math.sin(j),Math.sin(angle)*.82));
        }
        this.thread(f,path,"aqua",.012,.58);
      }
    }
    for(let i=0;i<3;i++)this.ring(f,.89+i*.14,
      i===0?"ivory":i===1?"mint":"deep",-.65+i*.6,.017,.51);
    this.statusFX.set(key,f);return f;
  }
  secondHeart(actor,subject){
    if(!subject)return;
    const key="second-heart:"+subject.id;
    if(this.statusFX.has(key))this.drop(this.statusFX.get(key));
    const f=this.fx("second-heart",this.pos(subject,1.15),12600,{
      subjectId:subject.id,sourceId:actor?.id,statusKind:"heart"
    });
    this.heart(f,.46,"ivory",0,.29,0,.86);
    for(let j=0;j<6;j++){
      const a=j*TAU/6;
      this.petal(f,.07,.36,j%2?"mint":"core",
        Math.cos(a)*.45,.29,Math.sin(a)*.45,.80);
    }
    this.ring(f,.56,"mint",.29,.022,.58);
    this.statusFX.set(key,f);return f;
  }
  orbit(actor,subject){
    if(!subject)return;
    const key="orbit:"+subject.id;
    if(this.statusFX.has(key))this.drop(this.statusFX.get(key));
    const statuses=subject.statuses?.filter(s=>
      s.kind==="rejuvenating-orbit"&&s.sourceId===actor?.id&&s.remaining>0);
    if(!statuses?.length)return;
    const f=this.fx("rejuvenating-orbit",this.pos(subject),6300,{
      subjectId:subject.id,sourceId:actor.id,statusKind:"orbit"
    });
    for(let i=0;i<4;i++){
      const a=i*TAU/4;
      this.heart(f,.18,i%2===0?"core":"mint",
        Math.cos(a)*.85,Math.sin(a*2)*.14,Math.sin(a)*.85,.85);
      this.petal(f,.073,.25,"aqua",Math.cos(a+.2)*.7,
        .16,Math.sin(a+.2)*.7,.72);
    }
    this.ring(f,.87,"aqua",0,.013,.43);
    this.statusFX.set(key,f);return f;
  }
  recall(actor,subject){
    if(!subject)return;
    const key="recall:"+subject.id;
    if(this.statusFX.has(key))this.drop(this.statusFX.get(key));
    const stat=subject.statuses?.find(s=>s.kind==="vital-recall"&&
      s.sourceId===actor?.id&&s.remaining>0);
    if(!stat)return;
    const f=this.fx("recall-hourglass",this.pos(subject),
      Math.max(500,stat.remaining*1000),{
        subjectId:subject.id,sourceId:actor.id,statusKind:"recall"
    });
    // Two opposed spiral rings form a small temporal hourglass.
    for(let j=0;j<4;j++){
      const ring=this.ring(f,.52+j*.13,j%2?"mint":"ivory",
        j%2?.56:-.57,.016,.57);
      ring.rotation.x=j*.13;
    }
    for(let i=0;i<6;i++){
      const a=i*TAU/6;
      const p=this.petal(f,.085,.42,i%2?"aqua":"core",
        Math.cos(a)*.50,(i%2?.40:-.40),
        Math.sin(a)*.50,.79);
      p.rotation.z=.5*Math.sin(a);
    }
    this.heart(f,.23,"core",0,0,0,.89);
    this.statusFX.set(key,f);return f;
  }
  relay(actor,first,second){
    if(!first||!second||first.id===second.id)return;
    const key="relay:"+first.id+":"+second.id;
    if(this.statusFX.has(key))this.drop(this.statusFX.get(key));
    const f=this.fx("relay-tether",this.pos(first),10800,{
      subjectId:first.id,partnerId:second.id,sourceId:actor.id,
      statusKind:"relay",lastPackets:0
    });
    const p=this.pos(first),q=this.pos(second),delta=q.subtract(p);
    const span=Math.max(.1,Math.hypot(delta.x,delta.z));
    f.relayInitialSpan=span;
    f.root.rotation.y=Math.atan2(delta.x,delta.z);
    for(let lane=0;lane<3;lane++){
      const pts=[];
      for(let i=0;i<=14;i++){
        const t=i/14;
        pts.push(new BABYLON.Vector3(.07*Math.sin(t*TAU*2+lane),
          delta.y*t+.12*Math.sin(t*TAU+lane),
          span*t+.07*Math.cos(t*TAU*2+lane)));
      }
      this.thread(f,pts,lane===0?"core":lane===1?"mint":"aqua",
        lane===0?.024:.012,lane===0?.67:.49);
    }
    for(let i=0;i<2;i++)this.heart(f,.29,i===0?"core":"aqua",
      0,.0,span*i,.78);
    this.statusFX.set(key,f);return f;
  }
  proc(event,match){
    const actor=match.getActor(event.actorId);
    const target=match.getActor(event.targetId);
    const kind=event.kind;
    const x=Number.isFinite(event.x)?event.x:target?.x??actor?.x,
      y=Number.isFinite(event.y)?event.y:target?.y??actor?.y;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const point=this.at(x,y);
    if(kind==="second-heart-armed"&&target){
      this.secondHeart(actor,target);return;
    }
    if(kind==="second-heart"){
      const f=this.statusFX.get("second-heart:"+target?.id);
      if(f)this.drop(f);
      this.leafBurst(point,true,"second-heart-save");return;
    }
    if(kind==="vital-crescendo"){
      this.leafBurst(point,true,"crescendo-climax");return;
    }
    if(kind==="vital-reversal"){
      this.leafBurst(point,true,"reversal-impact");
      if(actor&&target){
        for(const ally of match.actors.filter(q=>q.team===actor.team&&
          q.alive&&q.hp<q.maxHp))
          this.flight(this.pos(target),this.pos(ally),
            "reversal-flight",420);
      }
      return;
    }
    if(kind==="guardian-network"&&actor&&target){
      this.shield(actor,target,match);return;
    }
    if(kind==="retaliation"){
      this.leafBurst(point,true,"retaliation-release");
      if(target&&actor)for(const foe of match.actors.filter(q=>q.alive&&
        q.team!==actor.team).slice(0,3))
        this.flight(this.pos(target),this.pos(foe),"retaliation-flight",420);
      return;
    }
    if(kind==="last-stand"){
      this.leafBurst(point,true,"last-stand-save");return;
    }
    if(kind==="rejuvenating-orbit"&&actor&&target){
      this.orbit(actor,target);return;
    }
    if(kind==="life-transfer"&&actor&&target){
      const donor=match.actors.filter(q=>q.team===actor.team&&q!==target&&q.alive)
        .sort((a,b)=>b.hp/b.maxHp-a.hp/a.maxHp)[0];
      if(donor)this.flight(this.pos(donor),point,"life-transfer-flight",500);
      this.leafBurst(point,false,"life-transfer-impact");return;
    }
    if(kind==="double-cascade"&&actor){
      for(const ally of match.actors.filter(q=>q.team===actor.team&&q.alive&&
        q.hp<q.maxHp)){
        this.flight(this.pos(actor),this.pos(ally),"cascade-echo",460);
      }
      return;
    }
    if(kind==="tranquility-wave"){
      this.leafBurst(point,true,"tranquility-wave");return;
    }
    if(kind==="mercy-bloom"){
      this.leafBurst(point,true,"mercy-bloom");return;
    }
    if(kind==="essence-siphon"&&actor&&target){
      this.flight(this.pos(target),this.pos(actor),"siphon-flight",470);
      return;
    }
    if(kind==="recall-anchor"&&actor&&target){
      this.recall(actor,target);return;
    }
    if(kind==="recall-release"&&target){
      const f=this.statusFX.get("recall:"+target.id);
      if(f)this.drop(f);
      this.leafBurst(point,true,"recall-release");return;
    }
    if(kind==="relay-select-first"&&actor&&target){
      this.relayFirst.set(actor.id,{targetId:target.id,
        until:performance.now()+7000});
      this.leafBurst(point,false,"relay-first");return;
    }
    if(kind==="relay-linked"&&actor&&target){
      const linked=target.statuses?.find(s=>s.kind==="soul-relay"&&
        s.sourceId===actor.id&&s.remaining>0);
      const partner=match.getActor(linked?.partnerId)||
        match.getActor(this.relayFirst.get(actor.id)?.targetId);
      if(partner)this.relay(actor,partner,target);
      this.relayFirst.delete(actor.id);return;
    }
    if((kind==="damage-relay"||kind==="healing-relay")&&target){
      this.leafBurst(point,false,kind);return;
    }
    if(kind==="team-cascade"&&actor&&target){
      this.leafBurst(point,false,"cascade-center");
      return;
    }
  }
  spawn(event,match){
    const id=event.spellId;
    if(!GENESIS_VFX_IDS.has(id))return false;
    const actor=match.getActor(event.actorId),target=match.getActor(event.targetId);
    // Pulse Mend has an established authored signature animation.
    // It STILL passes through the existing original pipeline for base casts
    // and heals. Only its three new Evolution procs get additive visuals.
    if(id==="pulse-mend"){
      if(event.type==="evolution-proc"||
          (event.type==="identity-proc"&&event.kind==="vital-reversal"))
        this.proc(event,match);
      return false;
    }
    if(event.type==="windup"&&actor){this.windup(actor,id,event.castSeconds||.38);return true;}
    if(event.type==="heal"&&target){
      const source=actor||target;
      if(id==="vital-cascade"&&source.id!==target.id)
        this.flight(this.pos(source),this.pos(target),"cascade-flight",480);
      else if(id==="soul-relay")
        this.leafBurst(this.pos(target),false,"relay-heal");
      else if(id==="vital-recall")
        this.leafBurst(this.pos(target),true,"recall-restoration");
      else this.leafBurst(this.pos(target),false,"vital-contact");
      return true;
    }
    if(event.type==="shield"&&id==="resonance-guard"){
      if(actor&&target)this.shield(actor,target,match);
      return true;
    }
    if(event.type==="control"&&id==="stasis-seal"){
      if(actor&&target)this.stasis(actor,target);
      return true;
    }
    if(event.type==="immune"&&id==="stasis-seal"){
      if(target)this.leafBurst(this.pos(target),false,"stasis-resisted");
      return true;
    }
    if(event.type==="link"&&id==="soul-relay"){
      const partner=match.getActor(target?.statuses?.find(s=>
        s.kind==="soul-relay")?.partnerId);
      if(actor&&target&&partner)this.relay(actor,partner,target);
      return true;
    }
    if(event.type==="identity-proc"||event.type==="evolution-proc"){
      this.proc(event,match);
      return true;
    }
    if(event.type==="ability"){
      if(id==="vital-cascade"&&actor){
        this.leafBurst(this.pos(actor),false,"cascade-release");
      }else if(id==="stasis-seal"&&target&&actor){
        if(!this.statusFX.has("stasis:"+target.id))this.stasis(actor,target);
      }
      return true;
    }
    return false;
  }
  update(match,now=performance.now()){
    for(let i=this.live.length-1;i>=0;i--){
      const f=this.live[i],actor=f.casterId?match.getActor(f.casterId):null;
      const subject=f.subjectId?match.getActor(f.subjectId):null;
      let progress=clamp((now-f.created)/f.duration,0,1);
      if(f.statusKind){
        if(!subject?.alive)progress=1;
        else if(f.statusKind==="guard"){
          const shield=subject.statuses?.find(s=>s.kind==="shield"&&
            s.spellId==="resonance-guard"&&s.sourceId===f.sourceId&&
            s.remaining>0);
          if(!shield)progress=1;
          else if(shield.absorbLeft<f.shieldLast){
            f.shieldLast=shield.absorbLeft;
            // An absorbed blow causes a small outward mint ripple; no
            // invented extra damage or knockback.
            this.leafBurst(this.pos(subject),false,"shield-absorb");
          }
        }else if(f.statusKind==="stasis"&&
          !subject.statuses.some(s=>s.spellId==="stasis-seal"&&
            s.kind==="incapacitate"&&s.sourceId===f.sourceId&&s.remaining>0))progress=1;
        else if(f.statusKind==="heart"&&
          !subject.statuses.some(s=>s.kind==="second-heart"&&
            s.sourceId===f.sourceId&&s.remaining>0))progress=1;
        else if(f.statusKind==="orbit"&&
          !subject.statuses.some(s=>s.kind==="rejuvenating-orbit"&&
            s.sourceId===f.sourceId&&s.remaining>0))progress=1;
        else if(f.statusKind==="recall"&&
          !subject.statuses.some(s=>s.kind==="vital-recall"&&
            s.sourceId===f.sourceId&&s.remaining>0))progress=1;
        else if(f.statusKind==="relay"){
          const partner=match.getActor(f.partnerId);
          if(!partner?.alive||
            !subject.statuses.some(s=>s.kind==="soul-relay"&&
              s.partnerId===partner.id&&s.remaining>0)||
            !partner.statuses.some(s=>s.kind==="soul-relay"&&
              s.partnerId===subject.id&&s.remaining>0))progress=1;
          else{
            const vector=this.pos(partner).subtract(this.pos(subject));
            // The static filament updates its orientation/length when actors
            // move, rather than becoming a misleading fixed map decoration.
            f.root.position.copyFrom(this.pos(subject));
            const length=Math.max(.1,Math.hypot(vector.x,vector.z));
            f.root.rotation.y=Math.atan2(vector.x,vector.z);
            const original=f.relayInitialSpan||length;
            if(!f.relayInitialSpan)f.relayInitialSpan=length;
            f.root.scaling.z=length/Math.max(.1,original);
          }
        }
        if(subject?.alive&&f.statusKind!=="relay")
          f.root.position.copyFrom(this.pos(subject));
      }
      if(f.casterId&&actor?.alive)f.root.position.copyFrom(this.pos(actor));
      if(progress>=1){
        const kind=f.kind,where=f.root.position.clone();
        this.drop(f);
        if(["stasis-lattice","guard-shell","recall-hourglass"].includes(kind))
          this.leafBurst(where,false,kind+"-end");
        continue;
      }
      if(f.from&&f.to){
        f.root.position.copyFrom(BABYLON.Vector3.Lerp(f.from,f.to,smooth(progress)));
      }
      for(const [j,entry]of f.parts.entries()){
        const mesh=entry.mesh,initial=entry.initial;
        if(f.kind.startsWith("charge-")){
          const a=now*.0016*(j%2?-1:1)+j*TAU/10;
          if(j<10){
            const r=(.28+j%3*.047)*(1-.42*smooth(progress));
            mesh.position.set(Math.cos(a)*r,Math.sin(a*1.3)*.12,Math.sin(a)*r);
          }else mesh.rotation.y=now*.00024;
          mesh.visibility=Math.min(.92,progress*11,(1-progress)*9);
        }else if(f.kind==="guard-shell"){
          if(j<7){
            const a=j*TAU/7+now*.00023;
            mesh.position.x=Math.cos(a)*.93;
            mesh.position.z=Math.sin(a)*.93;
            mesh.rotation.y=a*.26;
          }else mesh.rotation.y=now*.00029;
          mesh.visibility=Math.min(.55,progress*11,(1-progress)*8);
        }else if(f.kind==="stasis-lattice"){
          if(j<8)mesh.rotation.y=now*.00012*(j%2?1:-1);
          mesh.visibility=Math.min(.78,progress*10,(1-progress)*6);
        }else if(f.kind==="rejuvenating-orbit"){
          if(j<8){
            const a=j*TAU/8+now*.0011;
            mesh.position.x=Math.cos(a)*.85;
            mesh.position.z=Math.sin(a)*.85;
            mesh.position.y=.11*Math.sin(a*2);
          }else mesh.rotation.y=now*.00022;
          mesh.visibility=Math.min(.88,progress*12,(1-progress)*8);
        }else if(f.kind==="second-heart"){
          if(j<7){
            const a=j*TAU/6+now*.001;
            mesh.position.x=Math.cos(a)*.45;
            mesh.position.z=Math.sin(a)*.45;
          }else mesh.rotation.z=now*.00024;
          mesh.visibility=.70+.14*Math.sin(now*.004+j);
        }else if(f.kind==="recall-hourglass"){
          mesh.rotation.y=now*.00048*(j%2?1:-1);
          mesh.visibility=Math.min(.79,progress*13,(1-progress)*7);
        }else if(f.kind==="relay-tether"){
          mesh.visibility=Math.min(.82,progress*10,(1-progress)*5)*
            (.74+.26*Math.sin(now*.005+j));
        }else if(f.from&&f.to){
          mesh.rotation.y=now*.002*(j%2?1:-1);
          mesh.visibility=Math.min(.95,progress*11,(1-progress)*10);
        }else{
          const u=smooth(progress);
          mesh.position.set(initial.x*(.68+u*1.9),
            initial.y+u*(j%3-1)*.15,initial.z*(.68+u*1.9));
          mesh.rotation.x+=.014*(j%2?1:-1);
          mesh.visibility=Math.min(.91,progress*13,(1-progress)*3);
        }
      }
    }
    for(const [key,f] of this.statusFX)if(!this.live.includes(f))
      this.statusFX.delete(key);
    for(const [id,state]of this.relayFirst)if(state.until<now)
      this.relayFirst.delete(id);
  }
  remove(f){
    for(const p of f.parts)p.mesh.dispose();
    for(const n of f.nodes)n.dispose();
    f.root.dispose();
  }
  drop(f){
    const ix=this.live.indexOf(f);
    if(ix>=0){this.live.splice(ix,1);this.remove(f);}
  }
  clear(){
    while(this.live.length)this.drop(this.live[this.live.length-1]);
    this.statusFX.clear();this.relayFirst.clear();this.cascadeOrigins.clear();
  }
  dispose(){
    this.clear();
    for(const m of this.materials.values())m.dispose();
    this.materials.clear();
  }
}
