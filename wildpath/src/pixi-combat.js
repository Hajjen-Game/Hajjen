// Wildpath 1.0 — Energy Arena's proven Pixi/Babylon hybrid.
// Reuses the original Energy Arena Crystal Bolt and impact renderers unchanged.
// Babylon remains authoritative for the game, targeting, movement and camera.
import { drawSlimGlint } from './slim-projectile.js?v=1.0.3';
import {drawWaterProjectile,drawWaterSpell,drawRainfallField} from './water-pixi.js?v=3.1.0';
import { slashFramePaths,slashFrameIndex,slashScreenAngle,slashVisualSize } from './weapon-slash.js?v=1.1.0';
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
  'Water Dart':{c:0x02bfe6,core:0x7beaf2,dim:0x087fbd},
  'Rainfall':{c:0x13c6e7,core:0x81e5f6,dim:0x1d86c7},
  'Tidal Bloom':{c:0x0ac2df,core:0x8be8ea,dim:0x1789c6},
  'Tide Guard':{c:0x1bdbaa,core:0x8cebc7,dim:0x159982},
  'Tidal Cascade':{c:0x6dcdea,core:0xe5fffb,dim:0x3b92b3},
  'Water Splash':{c:0x79dbe6,core:0xf7fffb,dim:0x4aa0b2},
  'Winter Pool':{c:0x81cefb,core:0xebffff,dim:0x3f8ab3},
  'Crystal Bloom':{c:0xb5a1ff,core:0xffffff,dim:0x5262a5},
  'Pale Guard':{c:0x7df4c4,core:0xebfff6,dim:0x3c9b8b},
  'Magic Pickup':{c:0xffba3c,core:0xffdc78,dim:0x26af9f},
  'Magic Surge':{c:0xffc94e,core:0xffe78f,dim:0x23d4a8},
  'Guard Block':{c:0x8dfbd9,core:0xffffff,dim:0x47b6a4},
  'Crystal Cascade':{c:0xb4a3ff,core:0xffffff,dim:0x585fc1},
  'Glint Splash':{c:0x86efff,core:0xf2ffff,dim:0x369fb2},
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
  if(drawWaterSpell(g,e,p,scale))return;
  if(e.name==='Glint Splash'&&e.stage==='burst'){
    // A broad but CLEAN ring, not an oversized glint projectile tail.
    const radius=(7+u*35)*clamp(e.intensity,.8,1.5);
    ellipse(g,p,radius,radius*.74,0x72eeff,3,fade*.9);
    ellipse(g,p,radius*.67,radius*.5,0xedffff,1.25,fade*.65);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+e.seed*.05;
      const q={x:p.x+Math.cos(a)*radius*.83,y:p.y+Math.sin(a)*radius*.63};
      shard(g,q,a,9,2.1,0xc4faff,fade*.87);
    }
    return;
  }
  // Nature Rebirth: clean, brief petals/leaves on spawn and tier upgrades.
  if(e.name==='Nature Fusion'&&e.stage==='burst'){
    const r=(10+u*55)*clamp(e.intensity,.8,1.8),tone=e.color??0xb4daa2;
    ellipse(g,p,r,r*.72,tone,2.8,fade*.8);
    ellipse(g,p,r*.67,r*.46,0xe9ffd2,1.25,fade*.72);
    for(let i=0;i<9;i++){
      const a=i*TAU/9+e.seed*.02;
      const q={x:p.x+Math.cos(a)*r*.75,y:p.y+Math.sin(a)*r*.53};
      shard(g,q,a+.34,5.5,2,i%3?0xf2dec9:tone,fade*.75);
    }
    return;
  }
  if(e.name==='Nature Bloom'&&e.stage==='burst'){
    const width=clamp(e.intensity,.7,2.2),radius=(6+u*24)*width;
    const blossom=e.color??0xeaa6c2;
    ellipse(g,p,radius,radius*.68,blossom,Math.max(1,2.3*width),fade*.78);
    ellipse(g,p,radius*.60,radius*.42,0xd9f7c1,1.05,fade*.45);
    const petals=width>1.6?12:width>1.05?9:6;
    for(let i=0;i<petals;i++){
      const a=(i+e.seed*.07)*TAU/petals;
      const d=radius*(.38+u*.55);
      const q={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d*.67};
      const color=i%5===0?0xfff2ce:i%3===0?0xb8dba7:blossom;
      shard(g,q,a,clamp(4.2*width,3,12),2.0*width,color,fade*.92);
    }
    dot(g,p,Math.max(1.6,5*(1-u)*width),0xffffe9,fade*.75);
    return;
  }
  // Pass 5: compact readable special moments, never multi-layered travel blobs.
  if(e.stage==='burst'&&e.name==='Magic Pickup'){
    const radius=7+u*18;
    ellipse(g,p,radius,radius*.70,0x83ffe0,2.4,fade*.9);
    dot(g,p,Math.max(1,4*(1-u)),0xeafff3,fade);
    for(let i=0;i<4;i++){
      const a=(i+.5)*TAU/4+e.seed*.1;
      const q={x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius*.7};
      dot(g,q,1.9,0xc4ffeb,fade*.85);
    }
    return;
  }
  if(e.stage==='burst'&&e.name==='Magic Surge'){
    const radius=18+u*clamp(scale*8,50,100);
    ellipse(g,p,radius,radius*.78,0x9cffe4,4.4,fade*.90);
    ellipse(g,p,radius*.73,radius*.58,0xf5ffbc,1.9,fade*.77);
    dot(g,p,clamp(12*(1-u),1,12),0xffffff,fade*.53);
    for(let i=0;i<8;i++){
      const a=i*TAU/8+e.seed*.025;
      const q={x:p.x+Math.cos(a)*radius*.9,y:p.y+Math.sin(a)*radius*.67};
      shard(g,q,a,7+scale*.5,2.1,i%2?0xa8ffdd:0xffffc7,fade*.95);
    }
    return;
  }
  if(e.stage==='burst'&&e.name==='Guard Block'){
    const radius=(23+u*19)*clamp(scale/13,.85,1.4);
    ellipse(g,p,radius,radius*.82,0xa5ffe4,3.4,fade);
    ellipse(g,p,radius*.74,radius*.62,0xe6fff3,1.8,fade*.8);
    return;
  }
  if(e.stage==='burst'&&e.name==='Crystal Cascade'){
    const radius=10+u*43;
    ellipse(g,p,radius,radius*.72,0xbfaaff,2.7,fade*.92);
    for(let i=0;i<7;i++){
      const a=i*TAU/7+e.seed*.06,q={
        x:p.x+Math.cos(a)*radius*.78,
        y:p.y+Math.sin(a)*radius*.55
      };
      shard(g,q,a,10+scale*.3,2.9,i%2?0x9fdfff:0xe9ddff,fade*.96);
    }
    return;
  }
  if(e.stage==='charge'||e.stage==='core'){
    const w=e.stage==='charge'?r*.67:r*.44;
    ellipse(g,p,w,w*.62,style.c,Math.max(1.15,r*.12),fade*.63);
    arc(g,p,w*1.27,w*.9,u*TAU*1.3,Math.PI*.9,style.core,1.3,fade*.9);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+u*4;
      dot(g,{x:p.x+Math.cos(a)*w*.8,y:p.y+Math.sin(a)*w*.62},1.3,style.core,fade*.87);
    }
    dot(g,p,Math.max(1.2,w*.19),style.core,fade*.58);
    if(e.name==='Glint Dart'){
      // One short crisp muzzle flash; the in-flight projectile stays slim.
      for(let i=0;i<4;i++){
        const a=i*TAU/4+Math.PI/4;
        line(g,{x:p.x+Math.cos(a)*4,y:p.y+Math.sin(a)*4},
          {x:p.x+Math.cos(a)*11,y:p.y+Math.sin(a)*11},
          0xd0ffff,1.35,fade*.86);
      }
    }
  }
  if(e.stage==='burst'||e.stage==='reaction'){
    if(e.name==='Glint Dart'&&e.stage==='burst'){
      // A compact but visibly bright impact, not a larger flying projectile.
      const source=from||{x:p.x-18,y:p.y+3};
      drawProjectileImpact(g,{spellId:'crystal-bolt',seed:e.seed},source,p,u,
        style,clamp(scale/12.5,.83,1.16));
      const reach=6+u*15;
      for(let i=0;i<4;i++){
        const a=i*TAU/4+e.seed*.07;
        line(g,{x:p.x+Math.cos(a)*5,y:p.y+Math.sin(a)*5},
          {x:p.x+Math.cos(a)*reach,y:p.y+Math.sin(a)*reach},
          0xc9fbff,1.5,fade*.83);
      }
      return;
    }
    // Reuse Energy Arena's hand-authored class signatures rather than drawing
    // generic Babylon circles. Scale is capped for Wildpath's distant camera.
    if(e.stage==='burst'){
      const k=clamp(scale/13,.65,1.26);
      if(e.name==='Crystal Bloom'){
        drawEclipsePixi(g,{spellId:'avalanche',type:'ability',kind:'avalanche-wave',
          seed:e.seed},p,p,u,k*1.08);
        const radius=(14+u*56)*clamp(e.intensity,.8,2.1);
        ellipse(g,p,radius,radius*.77,0xb5a1ff,2.6,fade*.89);
        for(let i=0;i<6;i++){
          const a=i*TAU/6+e.seed*.03;
          const q={x:p.x+Math.cos(a)*radius*.75,y:p.y+Math.sin(a)*radius*.65};
          shard(g,q,a,11+scale*.5,3.1,i%2?0xaeeaff:0xece0ff,fade*.94);
        }
        dot(g,p,Math.max(2,scale*.38),0xffffff,fade*.47);
        return;
      }
      if(e.name==='Winter Pool'){
        drawEclipsePixi(g,{spellId:'froststorm',type:'ability',kind:'froststorm-start',
          seed:e.seed},p,p,u,k*1.13);
        const pulse=(17+u*42)*clamp(e.intensity,.8,1.5);
        ellipse(g,p,pulse,pulse*.78,0xc6f6ff,2.5,fade*.86);
        return;
      }
      if(e.name==='Pale Guard'){
        drawGenesisPixi(g,{spellId:'resonance-guard',type:'ability',seed:e.seed},
          p,p,u,k*1.12);
        const pulse=22+u*clamp(scale*4.5,33,70);
        ellipse(g,p,pulse,pulse*.8,0xc5ffe5,3.1,fade*.86);
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
  const rx=clamp(Math.hypot(px.x-p.x,px.y-p.y)*1.10,11,135),
    ry=clamp(Math.hypot(pz.x-p.x,pz.y-p.y)*1.10,7,108);
  g.ellipse(p.x,p.y,rx,ry).fill({color:0x69bce9,alpha:.22});
  ellipse(g,p,rx,ry,0xc6faff,3,.86);
  ellipse(g,p,rx*.86,ry*.84,0x67cbe9,1.5,.72);
  for(let i=0;i<(area.radius>5.7?12:8);i++){
    const count=area.radius>5.7?12:8;
    const a=i*TAU/count+time*.22;
    const x=p.x+Math.cos(a)*rx*.64,y=p.y+Math.sin(a)*ry*.59;
    shard(g,{x,y},a+time*.32,clamp(scale*.68,5.2,11),2.2,0xe5ffff,.83);
    dot(g,{x:x+Math.sin(time*2+i)*3,y:y-4-Math.abs(Math.sin(time*3+i))*6},
      area.radius>5.7?2.4:1.8,0xd8fdff,.8);
    if(area.radius>5.7&&i%2===0){
      const q={x:x+Math.sin(time*3+i)*7,y:y-Math.abs(Math.sin(time*5+i))*13};
      shard(g,q,time+i,8.8,2,0xe6ffff,.78);
    }
  }
}
function drawMagicPickups(g,pickups,project,time){
  const max=Math.min(pickups.length,100);
  for(let i=0;i<max;i++){
    const e=pickups[i],p=project(e.x,.98,e.z);
    if(!p)continue;
    const pulse=1+Math.sin(time*7+e.seed)*.12,magnet=e.magnet;
    const r=(magnet?9.5:8)*pulse;
    // Warm collectible core contrasted with a cool mint rim and crisp gleam.
    dot(g,p,r*1.43,0x15c7aa,.08);
    dot(g,p,r,0xffac24,.27);
    ellipse(g,p,r*.88,r*.76,0x24d6b7,1.7,.82);
    dot(g,p,r*.65,0xffb52f,.91);
    dot(g,p,r*.31,0xffd368,.98);
    const twinkle={x:p.x-r*.31,y:p.y-r*.44};
    dot(g,twinkle,1.2,0xfff1a0,.85);
    if(magnet&&time>0){
      const drift={x:p.x-5-Math.sin(time*9+e.seed)*5,
        y:p.y+7+Math.cos(time*6+e.seed)*3};
      line(g,drift,p,0xffd574,2,.58);
    }
  }
}
function drawWard(g,hero,project,time,scale){
  const p=project(hero.x,1.05,hero.z);if(!p)return;
  const radius=clamp(scale*2.65,18,57),pulse=1+Math.sin(time*4)*.05;
  g.ellipse(p.x,p.y,radius*pulse,radius*.80*pulse).fill({color:0x7affcc,alpha:.09});
  ellipse(g,p,radius*pulse,radius*.80*pulse,0x83ffca,3.1,.86);
  ellipse(g,p,radius*.80,radius*.66,0xf0ffeb,1.6,.8);
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
    this.waterLinks=[];this.waterWaves=[];
    this.width=0;this.height=0;this.alive=true;this.time=0;
    this.slashMode='asset'; // default: Cethiel CC0. Previous Pixi available for A/B.
    this.enableSlashFrames=true;
    this.slashFrames={basic:[],wide:[]};
    this.slashLayer=null;this.slashes=[];this.PIXI=null;
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
      this.slashLayer=new PIXI.Container();
      this.app.stage.addChild(this.graphics);
      this.app.stage.addChild(this.slashLayer);
      this.PIXI=PIXI;
      this.ready=true;
      // Sprite fetching is optional and never blocks the game loop.
      if(this.enableSlashFrames)void this.loadSlashFrames();
    }catch(error){
      this.failed=true;this.ready=false;
      view?.remove();
      console.warn('Pixi VFX unavailable, using Babylon fallback:',error);
    }
  }

  async loadSlashFrames(){
    if(!this.PIXI||!this.alive)return;
    try{
      const PIXI=this.PIXI;
      const pairs=await Promise.all(['basic','wide'].map(async kind=>{
        const textures=await Promise.all(slashFramePaths(kind).map(path=>
          PIXI.Assets.load(new URL(path,document.baseURI).href)));
        return [kind,textures];
      }));
      if(!this.alive)return;
      for(const [kind,frames] of pairs)this.slashFrames[kind]=frames;
    }catch(error){
      // Keep the previous Energy Arena effect as fallback.
      console.warn('Cethiel Weapon Slash sprites unavailable; using Pixi arc:',error);
    }
  }
  setSlashMode(mode){
    this.slashMode=mode==='original'?'original':'asset';
    return this.slashMode;
  }
  addSlash(name,point,intensity){
    const kind=name==='Wide Arc'?'wide':'basic';
    const textures=this.slashFrames[kind];
    if(!textures.length||!this.PIXI||!this.slashLayer)return false;
    if(this.slashes.length>=14){
      const oldest=this.slashes.shift();
      oldest.sprite.destroy();
    }
    const sprite=new this.PIXI.Sprite(textures[0]);
    sprite.anchor.set(.5);
    sprite.blendMode='normal';
    sprite.eventMode='none';
    this.slashLayer.addChild(sprite);
    this.slashes.push({sprite,textures,age:0,life:kind==='wide'?.35:.29,
      x:point.originX??point.x,z:point.originZ??point.z,y:point.y??1.3,
      targetX:point.targetX,targetZ:point.targetZ,
      followPlayer:!!point.followPlayer,
      intensity:Math.max(.5,Math.min(2,intensity)),kind});
    return true;
  }
  updateSlashes(dt,game){
    for(let i=this.slashes.length-1;i>=0;i--){
      const e=this.slashes[i];e.age+=dt;
      if(e.age>=e.life){
        e.sprite.destroy();
        this.slashes.splice(i,1);
        continue;
      }
      const x=e.followPlayer&&game?.state==='play'?game.x:e.x;
      const z=e.followPlayer&&game?.state==='play'?game.z:e.z;
      const p=this.at(x,z,e.y),target=this.at(e.targetX??(x+1),e.targetZ??z,e.y);
      if(!p){e.sprite.visible=false;continue;}
      e.sprite.visible=true;
      e.sprite.position.set(p.x,p.y);
      e.sprite.texture=e.textures[slashFrameIndex(e.age,e.life,e.textures.length)];
      const angle=slashScreenAngle(p,target);
      e.sprite.rotation=angle-Math.PI/2;
      const size=slashVisualSize(this.scaleAt(x,z),e.kind==='wide')*e.intensity;
      // Maintain original frame aspect ratio; mobile width is capped by size.
      const h=Math.max(e.sprite.texture.height||150,1);
      e.sprite.scale.set(size/h);
      e.sprite.alpha=Math.min(1,(e.life-e.age)/.055);
    }
  }
  clearSlashes(){
    for(const s of this.slashes)s.sprite.destroy();
    this.slashes.length=0;
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
  waterLink(from,to,type='chain'){
    if(!from||!to||this.waterLinks.length>=26)return;
    this.waterLinks.push({x1:from.x,z1:from.z,x2:to.x,z2:to.z,
      type,age:0,life:type==='chain'?.29:.22});
  }
  waterWave(x,z,angle,length,width){
    if(this.waterWaves.length>=5)this.waterWaves.shift();
    this.waterWaves.push({x,z,angle,length,width,age:0,life:.42});
  }
  drawDaisugiWater(g,dt,playing){
    if(!playing)return;
    for(let i=this.waterLinks.length-1;i>=0;i--){
      const link=this.waterLinks[i];link.age+=dt;
      if(link.age>=link.life){this.waterLinks.splice(i,1);continue;}
      const a=1-link.age/link.life;
      const start=this.project(link.x1,1.2,link.z1),
        end=this.project(link.x2,1.2,link.z2);
      if(!start||!end)continue;
      const nx=-(end.y-start.y),ny=end.x-start.x;
      const dist=Math.max(1,Math.hypot(nx,ny));
      const displacement=link.type==='chain'?9:5;
      const points=[start];
      for(let j=1;j<=4;j++){
        const t=j/5;
        const wobble=Math.sin(j*5.3+link.age*35)*displacement*a;
        points.push({x:start.x+(end.x-start.x)*t+nx/dist*wobble,
          y:start.y+(end.y-start.y)*t+ny/dist*wobble});
      }
      points.push(end);
      for(let j=1;j<points.length;j++){
        g.moveTo(points[j-1].x,points[j-1].y)
          .lineTo(points[j].x,points[j].y)
          .stroke({color:0x0ebbd9,width:5*a+1.2,alpha:a*.62,cap:'round'});
        g.moveTo(points[j-1].x,points[j-1].y)
          .lineTo(points[j].x,points[j].y)
          .stroke({color:0xb6f8e9,width:1.5*a+.7,alpha:a*.91,cap:'round'});
      }
      g.circle(end.x,end.y,2.5+3*a).fill({color:0x4eeccf,alpha:a*.8});
    }
    for(let i=this.waterWaves.length-1;i>=0;i--){
      const wave=this.waterWaves[i];wave.age+=dt;
      if(wave.age>=wave.life){this.waterWaves.splice(i,1);continue;}
      const t=wave.age/wave.life,a=1-t;
      const forward=1.1+wave.length*t;
      const length=wave.width*(.5+.5*t);
      const cs=Math.cos(wave.angle),sn=Math.sin(wave.angle);
      let prev=null;
      for(let j=0;j<=14;j++){
        const along=(j/14*2-1),bend=1-.20*along*along;
        const depth=forward*bend;
        const px=wave.x+cs*depth-sn*length*along;
        const pz=wave.z+sn*depth+cs*length*along;
        const p=this.project(px,.45+.14*Math.sin(j*1.7+t*12),pz);
        if(p&&prev){
          g.moveTo(prev.x,prev.y).lineTo(p.x,p.y)
            .stroke({color:0x19b8dc,width:10*a+3,alpha:a*.55,cap:'round'});
          g.moveTo(prev.x,prev.y).lineTo(p.x,p.y)
            .stroke({color:0xa6f9e8,width:3*a+1,alpha:a*.92,cap:'round'});
        }
        if(p&&j%3===0)
          g.circle(p.x,p.y,2+3*a).fill({color:0xdcfff1,alpha:a*.78});
        prev=p;
      }
    }
  }
  stage(name,stage,point,intensity=1){
    if(!this.ready||stage==='sound'||stage==='trail')return;
    if(stage==='burst'&&(name==='Steel Arc'||name==='Wide Arc')&&
       this.slashMode==='asset'&&this.addSlash(name,point,intensity))return;
    if(this.effects.length>=90)this.effects.shift();
    const life=stage==='burst'?(name==='Tidal Bloom'?.57:name==='Rainfall'?.55:
      name==='Nature Fusion'?1.05:name==='Nature Bloom'?.74:.37):stage==='reaction'?.19:
      stage==='charge'?.20:stage==='core'?.23:stage==='aftermath'?.52:.3;
    this.effects.push({name,stage,x:point.x,z:point.z,y:point.y??1.3,
      color:point.color,intensity,elapsed:0,life,seed:++this.sequence});
  }
  clear(){
    this.effects.length=0;
    this.waterLinks.length=0;this.waterWaves.length=0;
    this.clearSlashes();
    this.graphics?.clear();
    if(this.ready)this.app.render();
  }
  update(dt,game){
    if(!this.ready)return;
    this.resize();this.time+=dt;
    const g=this.graphics;g.clear();
    if(game?.state==='play'){
      drawMagicPickups(g,game.pickups??[],(x,y,z)=>this.project(x,y,z),this.time);
      for(const area of game.areas){
        if(area.water)drawRainfallField(g,area,
          (x,y,z)=>this.project(x,y,z),this.time);
        else drawPool(g,area,(x,y,z)=>this.project(x,y,z),this.time,
          this.scaleAt(area.x,area.z));
      }
      if(game.shield>0)drawWard(g,game,(x,y,z)=>this.project(x,y,z),this.time,
        this.scaleAt(game.x,game.z));
      for(const p of game.projectiles){
        if(p.hostile)continue;
        const head=this.at(p.x,p.z,p.y??1.4);
        if(!head)continue;
        const prev=this.at(p.x-(p.dirX||0)*4.3,p.z-(p.dirZ||1)*4.3,p.y??1.4);
        const dir=prev?{x:head.x-prev.x,y:head.y-prev.y}:{x:0,y:-1};
        // Slim mobile-only rendering: exactly one tapered cyan tail and one
        // compact white core. All the old spirals, halos, ribbons and shards
        // are removed from the projectile's travel stage. Impacts remain rich.
        const from=volleyVector(head.x,head.y,dir.x,dir.y,22);
        const scale=clamp(this.scaleAt(p.x,p.z)/13,.82,1.03);
        if(p.water)drawWaterProjectile(g,from,head,scale,this.time,p.fxSeed);
        else drawSlimGlint(g,from,head,scale);
      }
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];e.elapsed+=dt;
      if(e.elapsed>=e.life){this.effects.splice(i,1);continue;}
      if(game?.state!=='play')continue;
      const p=this.at(e.x,e.z,e.y);if(!p)continue;
      spellEvent(g,e,p,this.scaleAt(e.x,e.z));
    }
    this.drawDaisugiWater(g,dt,game?.state==='play');
    this.updateSlashes(dt,game);
    this.app.render();
  }
  dispose(){
    this.alive=false;this.ready=false;
    try{this.app?.destroy(true,{children:true});}catch{}
    this.view?.remove();this.effects=[];this.graphics=null;
    this.clearSlashes();this.slashFrames={basic:[],wide:[]};
    this.app=null;this.view=null;this.slashLayer=null;this.PIXI=null;
  }
}
