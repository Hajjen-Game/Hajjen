// Optional PixiJS 8 accent layer, matching the sharp readability of Pixi 3v3.
// Babylon keeps glass, real 3D buildup and depth. Pixi only draws screen-space
// trails and hit highlights, never controls real damage, targeting or movement.
const PIXI_URL="https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const S=.02,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb=hex=>parseInt(hex.replace("#",""),16);
const COLORS={
  "crystal-bolt":{c:0x6fd8ff,core:0xebfcff,dim:0x278cbe},
  "sun-lance":{c:0xffb66b,core:0xfff1bf,dim:0xd36a43},
  "null-prison":{c:0xb895fa,core:0xf2dfff,dim:0x594aa1},
  "rift-slash":{c:0xb084ff,core:0xffd8ff,dim:0x7044b3},
  "gravity-hammer":{c:0xf28593,core:0xffdec7,dim:0xa73c62},
  "pulse-mend":{c:0x68efc0,core:0xeefff1,dim:0x339faa},
  "photon-barrier":{c:0xffc37f,core:0xfff7c6,dim:0xc87854},
  "reactive-thread":{c:0x75ecc2,core:0xd9fff2,dim:0x329cb9},
};
const HERO=new Set(Object.keys(COLORS));
const CAST_MS={"crystal-bolt":1300,"sun-lance":1800,"null-prison":1400,
  "rift-slash":390,"gravity-hammer":600,"pulse-mend":1500,
  "photon-barrier":390,"reactive-thread":390};
export class EnergyPixiVFXOverlay {
  constructor(stage,renderer){
    this.stage=stage;this.renderer=renderer;this.ready=false;
    this.effects=[];this.app=null;this.graphics=null;
    this.alive=true;this.failed=false;this.enabled=true;
    this.resizeHandler=null;
  }
  async init(){
    try{
      const PIXI=await import(PIXI_URL);
      if(!this.alive)return;
      const app=new PIXI.Application();
      await app.init({
        width:Math.max(1,this.stage.clientWidth),
        height:Math.max(1,this.stage.clientHeight),
        antialias:true,backgroundAlpha:0,autoStart:false,
        resolution:Math.min(2.5,Math.max(1.5,window.devicePixelRatio||1)),
      });
      if(!this.alive){app.destroy(true,{children:true});return;}
      this.app=app;this.graphics=new PIXI.Graphics();
      app.stage.addChild(this.graphics);
      const canvas=app.canvas;
      canvas.className="energy-pixi-layer";
      Object.assign(canvas.style,{
        position:"absolute",inset:"0",width:"100%",height:"100%",
        pointerEvents:"none",zIndex:"2",display:"block",
      });
      this.stage.appendChild(canvas);
      canvas.style.display=this.enabled?"block":"none";
      this.resizeHandler=()=>{
        if(!this.app||!this.alive)return;
        const w=Math.max(1,this.stage.clientWidth),h=Math.max(1,this.stage.clientHeight);
        this.app.renderer.resize(w,h);
      };
      if("ResizeObserver"in window){
        this.observer=new ResizeObserver(this.resizeHandler);
        this.observer.observe(this.stage);
      }else window.addEventListener("resize",this.resizeHandler);
      this.ready=true;
    }catch(error){
      this.failed=true;
      console.warn("Optional Pixi VFX accents unavailable; Babylon VFX continue.",error);
    }
  }
  spawn(event,match){
    if(!HERO.has(event.spellId))return;
    if(!["windup","hit","heal","control","shield","ability"].includes(event.type))return;
    if(event.type==="ability"&&event.spellId!=="reactive-thread")return;
    if(event.type==="heal"&&event.spellId!=="pulse-mend"&&event.spellId!=="reactive-thread")return;
    const source=match.getActor(event.actorId),target=match.getActor(event.targetId);
    if(!source)return;
    const spellId=event.spellId;
    const distance=target?Math.hypot(source.x-target.x,source.y-target.y)*S:0;
    const contactMs=spellId==="sun-lance"||spellId==="crystal-bolt"
      ?clamp(235+distance*18,255,490)
      :spellId==="rift-slash"?269:spellId==="gravity-hammer"?478:0;
    const isSignatureHit=event.type==="hit"&&contactMs>0;
    const duration=event.type==="windup"?CAST_MS[spellId]
      :event.type==="control"?1300:event.type==="shield"?1400
      :event.type==="ability"?1200:isSignatureHit?contactMs+750:750;
    this.effects.push({spellId,type:event.type,start:performance.now(),
      duration,contactMs,sourceId:source.id,targetId:target?.id||null});
    if(this.effects.length>52)this.effects.shift();
  }
  point(actor){
    if(!actor||!this.renderer.scene)return null;
    const scene=this.renderer.scene;
    const view=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const pos=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*S,.88,actor.y*S),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),view);
    if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||pos.z<0||pos.z>1)return null;
    return {x:pos.x,y:pos.y};
  }
  impactScale(actor,centre){
    // A world-size reference projected through the active Babylon camera:
    // impacts shrink with the arena zoom instead of staying giant in pixels.
    if(!actor||!centre||!this.renderer.scene)return .72;
    const scene=this.renderer.scene;
    const viewport=new BABYLON.Viewport(0,0,
      Math.max(1,this.stage.clientWidth),Math.max(1,this.stage.clientHeight));
    const edge=BABYLON.Vector3.Project(
      new BABYLON.Vector3(actor.x*S+.55,.88,actor.y*S),
      BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport);
    const px=Math.hypot(edge.x-centre.x,edge.y-centre.y);
    return Number.isFinite(px)?clamp(px/21,.48,1.08):.72;
  }
  stroke(g,points,color,width,alpha=1){
    if(points.length<2)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke({color,width,alpha,cap:"round",join:"round"});
  }
  circle(g,x,y,r,color,width,alpha){
    g.circle(x,y,Math.max(.5,r)).stroke({color,width,alpha});
  }
  flare(g,x,y,t,style,scale=1){
    const fade=1-t,r=(13+33*t)*scale;
    this.circle(g,x,y,r,style.c,2.3*scale,.66*fade);
    this.circle(g,x,y,r*.50,style.core,1.6*scale,.82*fade);
    for(let i=0;i<7;i++){
      const a=i*TAU/7+t*.8;
      const a0=r*.34,a1=r*(.85+(i%2)*.27);
      this.stroke(g,[{x:x+Math.cos(a)*a0,y:y+Math.sin(a)*a0},
        {x:x+Math.cos(a)*a1,y:y+Math.sin(a)*a1}],
      i%2?style.c:style.core,2.3*scale,(1-t)*.9);
    }
  }
  charge(g,e,from,t,style){
    const fade=Math.min(1,t*6,Math.max(0,(1-t)*12));
    const speed=e.spellId==="crystal-bolt"?-2.0:e.spellId==="sun-lance"?4.2:2.7;
    const radius=e.spellId==="sun-lance"?21:
      e.spellId==="gravity-hammer"?17:e.spellId==="pulse-mend"?15:18;
    const arms=e.spellId==="sun-lance"?6:e.spellId==="crystal-bolt"?5:4;
    const core=e.spellId==="null-prison"?.5:.25;
    const r=(radius*(.83-t*core));
    for(let i=0;i<arms;i++){
      const a=i*TAU/arms+t*speed*TAU;
      const arc=[];
      for(let j=0;j<=9;j++){
        const phi=a+j*.11*(i%2?-1:1);
        const rr=r+(i%2?5:-3);
        arc.push({x:from.x+Math.cos(phi)*rr,y:from.y+Math.sin(phi)*rr*.76});
      }
      this.stroke(g,arc,i%2?style.c:style.core,i===0?2.0:1.3,
        fade*(.60+.3*t));
    }
    if(e.spellId==="sun-lance")for(let i=0;i<6;i++){
      const a=i*TAU/6;
      this.stroke(g,[{x:from.x+Math.cos(a)*9,y:from.y+Math.sin(a)*9},
      {x:from.x+Math.cos(a)*(17+15*t),y:from.y+Math.sin(a)*(17+15*t)}],
      style.core,1.6,.60*t*fade);
    }
    if(e.spellId==="null-prison"){
      const r=14+t*11,vertices=Array.from({length:7},(_,i)=>({
        x:from.x+Math.cos(i*TAU/6)*r,y:from.y+Math.sin(i*TAU/6)*r}));
      this.stroke(g,vertices,style.c,2,fade*.65);
    }
  }
  // Contact has its own timeline; trails finish when the Babylon missile
  // arrives, then the splinter/star/crater remains briefly on the victim.
  // Impact refinement: compact and intricate. Geometry borrows the same
  // motifs as each buildup instead of introducing broad white shock wheels.
  contact(g,e,from,to,t,style,scale=1){
    const k=clamp(t,0,1),a=e.spellId;
    const fade=Math.min(1,k*10,Math.pow(1-k,1.25)*1.25);
    const unit=(n)=>n*scale;
    if(a==="crystal-bolt"){
      // Seven 4-vertex prism fragments + two incomplete cold orbit arcs.
      for(let i=0;i<7;i++){
        const angle=(i+.18)*TAU/7,rr=unit(9+(i%3)*2+13*k);
        const x=to.x+Math.cos(angle)*rr,y=to.y+Math.sin(angle)*rr*.78;
        const shard=[{x:x-Math.cos(angle+.5)*unit(4),y:y-Math.sin(angle+.5)*unit(4)},
          {x:x+Math.cos(angle)*unit(7),y:y+Math.sin(angle)*unit(6)},
          {x:x+Math.cos(angle-.6)*unit(3),y:y+Math.sin(angle-.6)*unit(3)},
          {x:x-Math.cos(angle+.5)*unit(4),y:y-Math.sin(angle+.5)*unit(4)}];
        this.stroke(g,shard,i===0?style.core:style.c,
          unit(i===0?1.65:.95),fade*(i%3===0?.85:.69));
      }
      for(let i=0;i<2;i++){
        const arc=[];
        for(let j=0;j<=13;j++){
          const angle=.35+i*2.85+j*1.65/13;
          arc.push({x:to.x+Math.cos(angle)*unit(16+12*k+i*4),
            y:to.y+Math.sin(angle)*unit(13+8*k+i*3)});
        }
        this.stroke(g,arc,i===0?style.c:style.dim,unit(1.0),fade*.65);
      }
    }else if(a==="sun-lance"){
      // Single tight corona with five SHORT needle-like, offset solar rays.
      const radius=unit(12+11*k);
      const arc=[];
      for(let j=0;j<=19;j++){
        const angle=-.7+j*4.65/19;
        arc.push({x:to.x+Math.cos(angle)*radius,
          y:to.y+Math.sin(angle)*radius*.86});
      }
      this.stroke(g,arc,style.c,unit(1.45),fade*.86);
      for(let i=0;i<5;i++){
        const angle=(i+.17)*TAU/5;
        const out=unit(19+(i%2)*4+9*k);
        this.stroke(g,[{x:to.x+Math.cos(angle)*unit(7),
          y:to.y+Math.sin(angle)*unit(7)},
          {x:to.x+Math.cos(angle)*out,
          y:to.y+Math.sin(angle)*out*.83}],
          i===0?style.core:style.c,unit(i===0?1.75:1.0),
          fade*(i===0?.9:.67));
      }
      this.circle(g,to.x,to.y,unit(5.5),style.c,unit(1.4),fade*.9);
    }else if(a==="rift-slash"){
      // A narrow dark void seam framed by two coloured hairlines.
      for(let side=-1;side<=1;side+=2){
        const line=[];
        for(let j=0;j<=18;j++){
          const u=j/18-.5;
          const x=u*2*unit(23+10*k);
          line.push({x:to.x+x,
            y:to.y+side*(u*unit(18)+Math.sin(u*10+side)*unit(2.4))});
        }
        this.stroke(g,line,side===1?style.dim:style.c,
          unit(side===1?2.1:1.3),fade*.86);
      }
      for(let i=0;i<5;i++){
        const a0=(i+.12)*TAU/5;
        this.stroke(g,[{x:to.x+Math.cos(a0)*unit(8),
          y:to.y+Math.sin(a0)*unit(7)},
          {x:to.x+Math.cos(a0+.12)*unit(16+(i%2)*5+9*k),
          y:to.y+Math.sin(a0+.12)*unit(14+7*k)}],
          style.c,unit(.88),fade*.5);
      }
    }else if(a==="gravity-hammer"){
      // Ground-hugging elliptical pressure wave + tiny branched cracks.
      for(let ring=0;ring<2;ring++){
        const line=[],radius=unit(11+11*k+ring*6);
        for(let j=0;j<=24;j++){
          const angle=j*TAU/24;
          line.push({x:to.x+Math.cos(angle)*radius,
            y:to.y+Math.sin(angle)*radius*.59});
        }
        this.stroke(g,line,ring===0?style.c:style.dim,
          unit(ring===0?1.35:.85),fade*(ring===0?.79:.46));
      }
      for(let i=0;i<8;i++){
        const angle=i*TAU/8+.16,len=unit(20+(i%3)*2+13*k);
        this.stroke(g,[
          {x:to.x+Math.cos(angle)*unit(7),y:to.y+Math.sin(angle)*unit(4)},
          {x:to.x+Math.cos(angle+.1)*len*.69,
            y:to.y+Math.sin(angle+.1)*len*.36},
          {x:to.x+Math.cos(angle-.06)*len,
            y:to.y+Math.sin(angle-.06)*len*.60}
        ],i===0?style.core:style.c,unit(i===0?1.5:.9),fade*.74);
      }
    }
  }
  trail(g,e,from,to,t,style,scale=1){
    if(!from||!to)return;
    const elapsed=t*e.duration,hitAt=e.contactMs||e.duration*.60;
    const travel=clamp(elapsed/hitAt,0,1);
    const ease=travel*travel*(3-2*travel);
    const x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease;
    const dx=to.x-from.x,dy=to.y-from.y;
    const len=Math.max(1,Math.hypot(dx,dy)),px=-dy/len,py=dx/len;
    const attack=e.spellId;
    if(elapsed<hitAt&&(attack==="sun-lance"||attack==="crystal-bolt")){
      const tail=(attack==="sun-lance"?43:35)*scale,nx=dx/len,ny=dy/len;
      for(let i=-1;i<=1;i++){
        const wobble=attack==="crystal-bolt"?Math.sin(t*25+i*2.3)*3*scale:0;
        const spread=i*2.8*scale+wobble;
        this.stroke(g,[{x:x-nx*tail+px*spread,y:y-ny*tail+py*spread},
          {x:x+px*i*2*scale,y:y+py*i*2*scale}],
          i===0?style.c:style.dim,(i===0?2.0:.85)*scale,
          (1-travel*.5)*(i===0?.86:.58));
      }
      this.circle(g,x,y,(attack==="sun-lance"?4.2:3.4)*scale,
        style.c,1.35*scale,.88);
    }else if(elapsed<hitAt&&attack==="rift-slash"){
      const radius=(14+10*travel)*scale;
      for(let i=0;i<3;i++){
        const points=[];
        for(let j=0;j<=23;j++){
          const a=-1.3+j*2.6/23+travel*.65+i*.095;
          points.push({x:x+Math.cos(a)*(radius-i*2.6*scale),
            y:y+Math.sin(a)*(radius*.85-i*2*scale)});
        }
        this.stroke(g,points,i===0?style.dim:i===1?style.c:style.core,
          (i===0?1.8:i===1?1.35:.7)*scale,(1-travel*.2)*.82);
      }
    }else if(elapsed<hitAt&&attack==="gravity-hammer"){
      const v=1-travel,headY=to.y-(85*v*v)*scale;
      for(let i=-1;i<=1;i++){
        this.stroke(g,[{x:to.x+i*7*scale,y:headY-(17+5*Math.abs(i))*scale},
          {x:to.x+i*3*scale,y:headY+7*scale}],
          i===0?style.c:style.dim,(i===0?2.35:.95)*scale,1-travel*.25);
      }
      this.circle(g,to.x,headY,(7+4*travel)*scale,style.c,1.55*scale,.9);
    }
    if(elapsed>=hitAt){
      const impactT=clamp((elapsed-hitAt)/Math.max(1,e.duration-hitAt),0,1);
      if(["sun-lance","crystal-bolt","rift-slash","gravity-hammer"].includes(attack))
        this.contact(g,e,from,to,impactT,style,scale);
      else this.flare(g,to.x,to.y,impactT,style,.9);
    }
    // The healing signature is intentionally unchanged in this pass.
    if(attack==="pulse-mend"){
      for(let i=0;i<3;i++){
        const phase=i*TAU/3+t*TAU*3;
        const ox=Math.cos(phase)*9,oy=Math.sin(phase)*10;
        this.stroke(g,[{x:from.x+ox,y:from.y+oy},
          {x:x+ox,y:y+oy}],i===0?style.core:style.c,
          1.5+i*.38,1-t*.35);
      }
    }
  }
  status(g,e,p,t,style){
    const fade=Math.min(1,t*6,(1-t)*5);
    if(e.spellId==="null-prison"){
      for(let ring=0;ring<2;ring++){
        const r=27+ring*8,hex=[];
        for(let i=0;i<=6;i++){
          const a=i*TAU/6+(ring?-.1:.1)+t*(ring?-.2:.2);
          hex.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.77});
        }
        this.stroke(g,hex,ring?style.c:style.core,ring?1.4:2.5,fade*.84);
      }
    }else if(e.spellId==="photon-barrier"){
      const sides=8;
      for(let shell=0;shell<2;shell++){
        const shape=[],r=29+shell*8;
        for(let i=0;i<=sides;i++){
          const a=i*TAU/sides+t*(shell?-.9:.9);
          shape.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.84});
        }
        this.stroke(g,shape,shell?style.c:style.core,2.3-shell*.65,.75*fade);
      }
    }else if(e.spellId==="reactive-thread"){
      for(let i=0;i<4;i++){
        const arc=[],start=i*TAU/4+t*2.4;
        for(let j=0;j<=14;j++){
          const angle=start+j*.12;
          arc.push({x:p.x+Math.cos(angle)*(23+i%2*5),
            y:p.y+Math.sin(angle)*(15+i%2*5)});
        }
        this.stroke(g,arc,i===0?style.core:style.c,2.1,fade*.91);
      }
    }else this.flare(g,p.x,p.y,t,style,.85);
  }
  setEnabled(value){
    this.enabled=!!value;
    if(this.app?.canvas)this.app.canvas.style.display=this.enabled?"block":"none";
  }
  update(match,now=performance.now()){
    if(!this.ready||!this.graphics||!this.enabled)return;
    const g=this.graphics;g.clear();
    this.effects=this.effects.filter(e=>now-e.start<e.duration);
    for(const e of this.effects){
      const t=clamp((now-e.start)/e.duration,0,1);
      const a=match.getActor(e.sourceId),b=match.getActor(e.targetId);
      const from=this.point(a),to=this.point(b||a);
      if(!from||!to)continue;
      const style=COLORS[e.spellId];
      if(e.type==="windup")this.charge(g,e,from,t,style);
      else if(e.type==="hit"||e.type==="heal")this.trail(g,e,from,to,t,style,
        this.impactScale(b||a,to));
      else this.status(g,e,to,t,style);
    }
    this.app.render();
  }
  dispose(){
    this.alive=false;
    this.observer?.disconnect();
    if(!this.observer&&this.resizeHandler)window.removeEventListener("resize",this.resizeHandler);
    try{this.app?.destroy(true,{children:true});}catch{}
    this.effects=[];this.graphics=null;this.app=null;this.ready=false;
  }
}
