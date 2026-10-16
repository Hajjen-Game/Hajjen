// Wildpath 1.0 — Energy Arena's proven Pixi/Babylon hybrid.
// Reuses the original Energy Arena Crystal Bolt and impact renderers unchanged.
// Babylon remains authoritative for the game, targeting, movement and camera.
import { drawEnergyProjectile } from '../../pvp-25d/src/energy/arena/EnergyPixiProjectiles.js?v=wildpath-core-1.0.2';
import { drawProjectileImpact } from '../../pvp-25d/src/energy/arena/EnergyPixiImpacts.js';
import { drawEclipsePixi } from '../../pvp-25d/src/energy/arena/EnergyEclipsePixiAccents.js';
import { drawImpactPixi } from '../../pvp-25d/src/energy/arena/EnergyImpactPixiAccents.js';
import { drawGenesisPixi } from '../../pvp-25d/src/energy/arena/EnergyGenesisPixiAccents.js';

const PIXI_URL='https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs';
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n)};
const S={
  'Glint Dart':{c:0x65cfff,core:0xf3ffff,dim:0x258cbf},
  'Winter Pool':{c:0x81cefb,core:0xebffff,dim:0x3f8ab3},
  'Crystal Bloom':{c:0xb5a1ff,core:0xffffff,dim:0x5262a5},
  'Pale Guard':{c:0x7df4c4,core:0xebfff6,dim:0x3c9b8b},
  'Steel Arc':{c:0xffd28a,core:0xfff7cf,dim:0xb27749},
  'Wide Arc':{c:0xffcf8e,core:0xffffff,dim:0xb7754f},
  'Rushstrike':{c:0xffb977,core:0xfff2ca,dim:0xb96d55},
  'Earthwake':{c:0xd8b497,core:0xffeed0,dim:0x93745d}
};
export function volleyVector(x,y,dx,dy,length=50){
  const d=Math.max(.00001,Math.hypot(dx,dy));
  const n=Math.max(0,Math.min(length,72));
  return {x:x-dx/d*n,y:y-dy/d*n};
}
export function styleForSpell(name){return S[name]||S['Glint Dart'];}
export function projectedPair(project,x,z,offset=2.7,y=1.1){
  const p=project(x,y,z),q=project(x+offset,y,z);
  if(!p||!q)return null;
  return {origin:p,pixelsPerWorld:Math.hypot(q.x-p.x,q.y-p.y)/offset};
}
function line(g,from,to,color,width,alpha){
  if(alpha<=0)return;
  g.moveTo(from.x,from.y).lineTo(to.x,to.y)
    .stroke({color,width,alpha:clamp(alpha,0,1),cap:'round',join:'round'});
}
function dot(g,p,r,color,a){if(a>0)g.circle(p.x,p.y,Math.max(.5,r)).fill({color,alpha:clamp(a,0,1)})}
function ellipse(g,p,rx,ry,color,width,alpha){
  if(!p||rx<=0||ry<=0||alpha<=0)return;
  g.ellipse(p.x,p.y,rx,ry).stroke({color,width,alpha});
}
function arc(g,p,rx,ry,start,span,color,width,alpha){
  if(alpha<=0)return;
  const steps=18;
  for(let i=0;i<steps;i++){
    const a=start+i*span/steps,b=start+(i+1)*span/steps;
    line(g,{x:p.x+Math.cos(a)*rx,y:p.y+Math.sin(a)*ry},
      {x:p.x+Math.cos(b)*rx,y:p.y+Math.sin(b)*ry},color,width,alpha);
  }
}
function shard(g,p,angle,len,width,color,alpha){
  const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  g.moveTo(p.x-dx*len*.5,p.y-dy*len*.5)
    .lineTo(p.x+nx*width,p.y+ny*width)
    .lineTo(p.x+dx*len*.65,p.y+dy*len*.65)
    .lineTo(p.x-nx*width,p.y-ny*width)
    .closePath().fill({color,alpha});
}
function spellEvent(g,e,p,scale){
  const style=styleForSpell(e.name),u=clamp(e.elapsed/e.life,0,1);
  const fade=(1-smooth((u-.08)/.9))*Math.min(1,u*8+.3);
  const r=clamp(scale*1.8,10,33)*clamp(e.intensity,.5,2.1);
  const from=e.from?e.from:null;
  if(e.stage==='charge'||e.stage==='core'){
    const w=e.stage==='charge'?r*.67:r*.44;
    ellipse(g,p,w,w*.62,style.c,Math.max(1.15,r*.12),fade*.63);
    arc(g,p,w*1.27,w*.9,u*TAU*1.3,Math.PI*.9,style.core,1.3,fade*.9);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+u*4;
      dot(g,{x:p.x+Math.cos(a)*w*.8,y:p.y+Math.sin(a)*w*.62},1.3,style.core,fade*.87);
    }
    dot(g,p,Math.max(1.2,w*.19),style.core,fade*.58);
  }
  if(e.stage==='burst'||e.stage==='reaction'){
    if(e.name==='Glint Dart'&&e.stage==='burst'){
      // Exact original Energy Arena crystal impact, restrained for mobile.
      const source=from||{x:p.x-18,y:p.y+3};
      drawProjectileImpact(g,{spellId:'crystal-bolt',seed:e.seed},source,p,u,
        style,clamp(scale/15,.65,.93));
      return;
    }
    // Reuse Energy Arena's hand-authored class signatures rather than drawing
    // generic Babylon circles. Scale is capped for Wildpath's distant camera.
    if(e.stage==='burst'){
      const k=clamp(scale/13,.65,1.26);
      if(e.name==='Crystal Bloom'){
        drawEclipsePixi(g,{spellId:'avalanche',type:'ability',kind:'avalanche-wave',
          seed:e.seed},p,p,u,k);
        dot(g,p,Math.max(2,scale*.38),0xf4e7ff,fade*.37);
        return;
      }
      if(e.name==='Winter Pool'){
        drawEclipsePixi(g,{spellId:'froststorm',type:'ability',kind:'froststorm-start',
          seed:e.seed},p,p,u,k*.82);
        return;
      }
      if(e.name==='Pale Guard'){
        drawGenesisPixi(g,{spellId:'resonance-guard',type:'ability',seed:e.seed},
          p,p,u,k*.85);
        return;
      }
      const impactIDs={'Steel Arc':['arc-strike','hit',''],
        'Wide Arc':['arc-strike','hit','twin-arc'],
        'Rushstrike':['phase-rush','charge-impact','meteor-charge'],
        'Earthwake':['gravity-hammer','ability','gravity-impact']};
      const id=impactIDs[e.name];
      if(id){
        const source={x:p.x-18,y:p.y+10};
        drawImpactPixi(g,{spellId:id[0],type:id[1],kind:id[2],
          seed:e.seed,duration:e.life*1000},source,p,u,k);
        return;
      }
    }
    const crystal=e.name==='Crystal Bloom',melee=/Arc|Rushstrike|Earthwake/.test(e.name);
    const short=e.stage==='reaction';
    const factor=short?.45:1;
    if(melee){
      arc(g,p,r*1.1*factor,r*.64*factor,-Math.PI*.67+u*.9,Math.PI*1.33,
        style.dim,Math.max(4,scale*.56),fade*.25);
      arc(g,p,r*.94*factor,r*.54*factor,-Math.PI*.66+u*.9,Math.PI*1.28,
        style.c,Math.max(1.7,scale*.22),fade*.94);
      arc(g,p,r*.73*factor,r*.46*factor,-Math.PI*.7+u*.9,Math.PI*1.2,
        style.core,1.1,fade*.86);
    }else{
      ellipse(g,p,r*.9*factor,r*.54*factor,style.c,2.1,fade*.76);
      ellipse(g,p,r*.55*factor,r*.36*factor,style.core,1.2,fade*.76);
    }
    if(!short){
      const shards=crystal?9:melee?7:5;
      for(let i=0;i<shards;i++){
        const a=i*TAU/shards+e.seed*.025;
        const reach=r*(.40+u*.62);
        const pos={x:p.x+Math.cos(a)*reach,y:p.y+Math.sin(a)*reach*.72};
        shard(g,pos,a,crystal?8+scale*.36:5+scale*.28,
          crystal?2.4:1.7,i%3?style.c:style.core,fade*(i%3?.74:.96));
      }
      dot(g,p,clamp(r*.37,2,12),style.c,fade*.17);
      dot(g,p,clamp(r*.11,1.6,4),style.core,fade*.84);
    }
  }
  if(e.stage==='aftermath'){
    arc(g,p,r*(.55+u*.75),r*(.31+u*.45),.5+e.seed*.03,Math.PI*1.17,
      style.c,1.45,fade*.48);
    for(let i=0;i<3;i++){
      const a=(i+.35)*TAU/3+e.seed*.04;
      dot(g,{x:p.x+Math.cos(a)*r*.7,y:p.y+Math.sin(a)*r*.49-u*8},
        1.3,style.core,fade*.74);
    }
  }
  if(e.stage==='damage'){
    dot(g,p,clamp(r*.2,1.4,3.8),style.core,fade*.7);
  }
}
function drawPool(g,area,project,time,scale){
  const p=project(area.x,.26,area.z);
  const px=project(area.x+area.radius,.26,area.z);
  const pz=project(area.x,.26,area.z+area.radius);
  if(!p||!px||!pz)return;
  const rx=clamp(Math.hypot(px.x-p.x,px.y-p.y),8,105),
    ry=clamp(Math.hypot(pz.x-p.x,pz.y-p.y),5,95);
  g.ellipse(p.x,p.y,rx,ry).fill({color:0x6bbcf0,alpha:.12});
  ellipse(g,p,rx,ry,0xa8e5ff,2,.73);
  ellipse(g,p,rx*.85,ry*.84,0x469dcd,1,.46);
  for(let i=0;i<6;i++){
    const a=i*TAU/6+time*.22;
    const x=p.x+Math.cos(a)*rx*.64,y=p.y+Math.sin(a)*ry*.59;
    shard(g,{x,y},a+time*.32,clamp(scale*.48,3.5,7.5),2,0xd7faff,.6);
  }
}
function drawWard(g,hero,project,time,scale){
  const p=project(hero.x,1.05,hero.z);if(!p)return;
  const radius=clamp(scale*1.85,12,42),pulse=1+Math.sin(time*4)*.045;
  ellipse(g,p,radius*pulse,radius*.80*pulse,0x66efbc,2,.67);
  ellipse(g,p,radius*.81,radius*.65,0xe0fff0,1.1,.74);
  for(let i=0;i<5;i++){
    const a=i*TAU/5+time*.4;
    dot(g,{x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius*.8},
      1.4,0xe8fff5,.7);
  }
}
export class WildpathPixiCombat {
  constructor(canvas,scene,engine){
    this.canvas=canvas;this.scene=scene;this.engine=engine;
    this.app=null;this.graphics=null;this.view=null;
    this.ready=false;this.failed=false;this.effects=[];this.sequence=0;
    this.width=0;this.height=0;this.alive=true;this.time=0;
  }
  async init(){
    let view;
    try{
      const PIXI=await import(PIXI_URL);
      if(!this.alive)return;
      const container=this.canvas.parentElement;
      if(!container)throw Error('Game stage missing for Pixi overlay');
      view=document.createElement('canvas');
      view.className='wildpath-pixi-combat';
      view.setAttribute('aria-hidden','true');
      Object.assign(view.style,{position:'absolute',inset:'0',width:'100%',height:'100%',
        pointerEvents:'none',zIndex:'2',background:'transparent'});
      this.canvas.insertAdjacentElement('afterend',view);
      this.width=Math.max(1,container.clientWidth);
      this.height=Math.max(1,container.clientHeight);
      const app=new PIXI.Application();
      await app.init({canvas:view,width:this.width,height:this.height,
        backgroundAlpha:0,antialias:true,autoStart:false,
        preference:'webgl',resolution:Math.min(2,Math.max(1.25,window.devicePixelRatio||1))});
      if(!this.alive){app.destroy(true,{children:true});view.remove();return;}
      this.app=app;this.view=view;this.graphics=new PIXI.Graphics();
      this.app.stage.addChild(this.graphics);
      this.ready=true;
    }catch(error){
      this.failed=true;this.ready=false;
      view?.remove();
      console.warn('Pixi VFX unavailable, using Babylon fallback:',error);
    }
  }
  resize(){
    if(!this.ready)return;
    const root=this.canvas.parentElement;
    const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);
    if(w!==this.width||h!==this.height){
      this.width=w;this.height=h;this.app.renderer.resize(w,h);
    }
  }
  project(x,y,z){
    const B=window.BABYLON;
    // Using the same CSS viewport for Babylon's clip projection and Pixi's canvas.
    const pos=B.Vector3.Project(new B.Vector3(x,y,z),
      B.Matrix.Identity(),this.scene.getTransformMatrix(),
      new B.Viewport(0,0,this.width,this.height));
    return Number.isFinite(pos.x)&&Number.isFinite(pos.y)&&pos.z>=0&&pos.z<=1
      ?{x:pos.x,y:pos.y}:null;
  }
  at(x,z,y=1.3){return this.project(x,y,z)}
  scaleAt(x,z){
    const pair=projectedPair((a,b,c)=>this.project(a,b,c),x,z);
    return pair?clamp(pair.pixelsPerWorld,4.8,22):12;
  }
  stage(name,stage,point,intensity=1){
    if(!this.ready||stage==='sound'||stage==='trail')return;
    if(this.effects.length>=90)this.effects.shift();
    const life=stage==='burst'?.37:stage==='reaction'?.19:
      stage==='charge'?.20:stage==='core'?.23:stage==='aftermath'?.52:.3;
    this.effects.push({name,stage,x:point.x,z:point.z,y:point.y??1.3,
      intensity,elapsed:0,life,seed:++this.sequence});
  }
  clear(){this.effects.length=0;this.graphics?.clear();if(this.ready)this.app.render();}
  update(dt,game){
    if(!this.ready)return;
    this.resize();this.time+=dt;
    const g=this.graphics;g.clear();
    if(game?.state==='play'){
      for(const area of game.areas)drawPool(g,area,(x,y,z)=>this.project(x,y,z),this.time,
        this.scaleAt(area.x,area.z));
      if(game.shield>0)drawWard(g,game,(x,y,z)=>this.project(x,y,z),this.time,
        this.scaleAt(game.x,game.z));
      for(const p of game.projectiles){
        if(p.hostile)continue;
        const head=this.at(p.x,p.z,p.y??1.4);
        if(!head)continue;
        const prev=this.at(p.x-(p.dirX||0)*4.3,p.z-(p.dirZ||1)*4.3,p.y??1.4);
        const dir=prev?{x:head.x-prev.x,y:head.y-prev.y}:{x:0,y:-1};
        const from=volleyVector(head.x,head.y,dir.x,dir.y,50);
        // Wildpath's zoomed-out camera needs a smaller HOT HEAD, not a
        // diminished tail. Energy Arena's original head stays untouched.
        drawEnergyProjectile(g,{spellId:'crystal-bolt',seed:p.fxSeed||11},
          from,head,1,styleForSpell('Glint Dart'),
          clamp(this.scaleAt(p.x,p.z)/13,.72,.96),{coreScale:.55});
      }
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];e.elapsed+=dt;
      if(e.elapsed>=e.life){this.effects.splice(i,1);continue;}
      if(game?.state!=='play')continue;
      const p=this.at(e.x,e.z,e.y);if(!p)continue;
      spellEvent(g,e,p,this.scaleAt(e.x,e.z));
    }
    this.app.render();
  }
  dispose(){
    this.alive=false;this.ready=false;
    try{this.app?.destroy(true,{children:true});}catch{}
    this.view?.remove();this.effects=[];this.graphics=null;
    this.app=null;this.view=null;
  }
}
