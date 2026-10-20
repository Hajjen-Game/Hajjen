(function () {
 "use strict";
 var B=window.BABYLON;
 function rgb(hex){return B.Color3.FromHexString(hex);}
 function mix(hex1,hex2,t){return B.Color3.Lerp(rgb(hex1),rgb(hex2),t);}
 var palette={
  sakura:{main:"#ED8CA9",light:"#FBC0CB",dark:"#C55D81",bud:"#F4AFC2",stem:"#668A58"},
  verdant:{main:"#5EAD70",light:"#A4D992",dark:"#377E58",bud:"#B8E8A5",stem:"#5B8051"},
  mistbloom:{main:"#69BFD0",light:"#B3E5DD",dark:"#468AA9",bud:"#A5D5F4",stem:"#568979"},
  sunleaf:{main:"#F1BC51",light:"#FFE6A2",dark:"#D58D3F",bud:"#FFF1AD",stem:"#8E9D56"}
 };
 function mat(scene,name,color,emissive,alpha){
  var m=new B.StandardMaterial(name,scene);m.diffuseColor=rgb(color);
  m.specularColor=new B.Color3(.15,.17,.15);m.specularPower=25;
  m.emissiveColor=rgb(color).scale(emissive||.035);
  if(alpha!==undefined)m.alpha=alpha;
  return m;
 }
 function put(mesh,parent,x,y,z,sx,sy,sz,material){
  mesh.parent=parent;mesh.position.set(x||0,y||0,z||0);
  mesh.scaling.set(sx||1,sy||1,sz||1);mesh.material=material;
  mesh.isPickable=false;return mesh;
 }
 function sphere(scene,parent,name,material,x,y,z,sx,sy,sz){
  return put(B.MeshBuilder.CreateSphere(name,{diameter:1,segments:8},scene),parent,x,y,z,sx,sy,sz,material);
 }
 function trunk(scene,parent,material,x,y,z,h,bottom,top){
  return put(B.MeshBuilder.CreateCylinder("stem",{height:h,diameterBottom:bottom,diameterTop:top,tessellation:9},scene),parent,x,y,z,1,1,1,material);
 }
 function createMats(scene){
  var m={soil:mat(scene,"soil","#F4EDDF"),soil2:mat(scene,"soil2","#F0E7D7"),border:mat(scene,"moss","#A2B894"),shadow:mat(scene,"shadow","#5B7963",0,.16),trunk:mat(scene,"trunk","#936C4A"),root:mat(scene,"stem","#789267"),pulse:mat(scene,"pulse","#9EEDAB",.82,.78),spark:mat(scene,"spark","#EDFFCC",.95)};
  Object.keys(palette).forEach(function(f){var p=palette[f];m[f]={main:mat(scene,f+"-main",p.main),light:mat(scene,f+"-light",p.light),dark:mat(scene,f+"-dark",p.dark),bud:mat(scene,f+"-bud",p.bud),stem:mat(scene,f+"-stem",p.stem)};});
  return m;
 }
 function petals(scene,root,f,materials,x,y,z,size){
  var count=f==="sunleaf"?7:f==="mistbloom"?4:f==="verdant"?5:5;
  for(var k=0;k<count;k++){
   var a=k*Math.PI*2/count,dist=size*.36;
   var pp=sphere(scene,root,"petal",k%2===0?materials.light:materials.main,x+Math.cos(a)*dist,y,z+Math.sin(a)*dist,size*.60,size*.16,size*.42);
   pp.rotation.y=-a;
  }
  sphere(scene,root,"flowerheart",materials.bud,x,y+.045,z,size*.35,size*.17,size*.35);
 }
 function makePlant(scene,mats,plant,index){
  var loc={x:index%7-3,z:Math.floor(index/7)-3};
  var parent=new B.TransformNode("plant-"+plant.id,scene);parent.position.set(loc.x,.09,loc.z);
  var f=plant.family,stage=plant.stage,m=mats[f];
  sphere(scene,parent,"contact",mats.shadow,0,-.005,0,.56,.012,.47);
  if(stage===1){
   sphere(scene,parent,"seed",m.main,0,.13,0,.28,.20,.25);
   sphere(scene,parent,"seed-gloss",m.light,-.045,.21,-.02,.09,.043,.10);
   if(f==="sunleaf")sphere(scene,parent,"seed-tip",m.dark,.10,.13,0,.11,.10,.12);
  }
  if(stage>=2){
   trunk(scene,parent,m.stem,0,.22,0,stage===2?.33:.48,.07,.045);
   sphere(scene,parent,"leaf-left",m.dark,-.15,.24,-.03,.31,.13,.17).rotation.z=-.35;
   sphere(scene,parent,"leaf-right",m.light,.15,.28,.04,.29,.12,.17).rotation.z=.28;
   if(stage===2){
    sphere(scene,parent,"bud",m.main,0,.43,0,.21,.19,.19);
    sphere(scene,parent,"bud-light",m.light,-.035,.49,-.03,.075,.058,.07);
   }
  }
  if(stage===3)petals(scene,parent,f,m,0,.53,0,.45);
  if(stage===4){
   sphere(scene,parent,"bush-body",m.dark,0,.43,0,.72,.45,.65);
   sphere(scene,parent,"bush-left",m.main,-.24,.47,-.03,.48,.43,.45);
   sphere(scene,parent,"bush-right",m.light,.24,.47,.07,.45,.42,.45);
   sphere(scene,parent,"bush-top",m.main,0,.64,-.05,.49,.35,.48);
   var ornaments=f==="verdant"?3:5;
   for(var t=0;t<ornaments;t++){
    var a=t*Math.PI*2/ornaments;
    sphere(scene,parent,"bush-bloom",t%2?m.bud:m.light,Math.sin(a)*.29,.66+Math.cos(a)*.075,Math.cos(a)*.22,.13,.12,.13);
   }
  }
  if(stage===5){
   trunk(scene,parent,mats.trunk,0,.51,0,.99,.21,.10);
   sphere(scene,parent,"canopy-one",m.dark,-.27,1.01,.02,.65,.63,.66);
   sphere(scene,parent,"canopy-two",m.main,.24,1.06,.10,.67,.63,.65);
   sphere(scene,parent,"canopy-top",m.light,.02,1.28,-.10,.78,.70,.72);
   for(var z=0;z<7;z++){
    var a=z*2.39996;
    sphere(scene,parent,"tree-flower",z%2?m.light:m.bud,Math.cos(a)*.34,1.28+Math.sin(a)*.17,Math.sin(a)*.32,.13,.12,.13);
   }
  }
  return {node:parent,stage:stage,family:plant.family,index:index,id:plant.id};
 }
 function tween(ms,update){
  return new Promise(function(resolve){
   var start=performance.now();function step(now){var t=Math.min(1,(now-start)/ms);update(t<1?1-Math.pow(1-t,3):1);if(t<1)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);
  });
 }
 function createScene(engine,canvas){
  var s=new B.Scene(engine);s.clearColor=new B.Color4(.94,.95,.89,1);
  var camera=new B.FreeCamera("gardenCamera",new B.Vector3(0,13,3.0),s);
  camera.setTarget(new B.Vector3(0,.15,0));camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft=-3.95;camera.orthoRight=3.95;camera.orthoTop=3.95;camera.orthoBottom=-3.95;
  var hemi=new B.HemisphericLight("softSky",new B.Vector3(0,1,.4),s);hemi.intensity=.91;hemi.diffuse=new B.Color3(.94,.97,.91);
  var sun=new B.DirectionalLight("warmSun",new B.Vector3(-.7,-1,-.4),s);sun.intensity=.55;
  return s;
 }
 function Garden(canvas){
  this.canvas=canvas;this.engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false,antialias:true},true);
  this.engine.setHardwareScalingLevel(Math.max(1,Math.min(1.6,window.devicePixelRatio||1)));
  this.scene=createScene(this.engine,canvas);this.mats=createMats(this.scene);
  this.nodes=new Map();this.tiles=[];this.selected=-1;this.onTile=null;this.pointerStart=null;this.skip=false;
  var self=this;
  for(var i=0;i<49;i++){
   var r=Math.floor(i/7),c=i%7,x=c-3,z=r-3;
   var border=put(B.MeshBuilder.CreateBox("edge"+i,{width:.975,depth:.975,height:.12},this.scene),null,x,.015,z,1,1,1,this.mats.border);border.isPickable=false;
   var tile=put(B.MeshBuilder.CreateBox("tile"+i,{width:.91,depth:.91,height:.13},this.scene),null,x,.083,z,1,1,1,(r+c)%2?this.mats.soil:this.mats.soil2);
   tile.metadata={tileIndex:i};tile.isPickable=true;this.tiles.push(tile);
  }
  this.selectedMat=mat(this.scene,"chosen","#F6E6BC");this.powerMat=mat(this.scene,"powerSelect","#E4F0C8");
  this.engine.runRenderLoop(function(){self.scene.render();});
  this.onResize=function(){self.engine.resize();};window.addEventListener("resize",this.onResize);
  if(window.ResizeObserver){this.observer=new ResizeObserver(this.onResize);this.observer.observe(canvas);}
  canvas.addEventListener("pointerdown",function(e){self.pointerStart={index:self.pick(e),x:e.clientX,y:e.clientY};});
  canvas.addEventListener("pointerup",function(e){
   if(!self.onTile||!self.pointerStart)return;
   var start=self.pointerStart,end=self.pick(e),dx=e.clientX-start.x,dy=e.clientY-start.y;
   self.pointerStart=null;
   if(start.index<0)return;
   if(end===start.index&&Math.max(Math.abs(dx),Math.abs(dy))>18){
    var row=Math.floor(end/7),col=end%7;
    if(Math.abs(dx)>Math.abs(dy))col+=dx>0?1:-1;else row+=dy>0?1:-1;
    if(row>=0&&row<7&&col>=0&&col<7)end=row*7+col;
   }
   self.onTile(start.index,end);
  });
 }
 Garden.prototype.pick=function(e){
  var box=this.canvas.getBoundingClientRect();
  var hit=this.scene.pick(e.clientX-box.left,e.clientY-box.top,function(mesh){return mesh.metadata&&Number.isInteger(mesh.metadata.tileIndex);});
  return hit&&hit.hit?hit.pickedMesh.metadata.tileIndex:-1;
 };
 Garden.prototype.setSelected=function(i,power){
  this.selected=i;
  for(var k=0;k<49;k++)this.tiles[k].material=k===i?(power?this.powerMat:this.selectedMat):(Math.floor(k/7)+k%7)%2?this.mats.soil:this.mats.soil2;
 };
 Garden.prototype.draw=function(board,mode){
  var self=this,next=new Set(),arr=[];
  board.forEach(function(p,i){
   if(!p)return;
   next.add(p.id);
   var old=self.nodes.get(p.id);
   if(old&&old.stage===p.stage&&old.family===p.family){old.index=i;arr.push({obj:old,to:new B.Vector3(i%7-3,.09,Math.floor(i/7)-3),isNew:false});return;}
   if(old){old.node.dispose(false,true);self.nodes.delete(p.id);}
   var made=makePlant(self.scene,self.mats,p,i);self.nodes.set(p.id,made);
   if(mode==="fall")made.node.position.z=-4.5-((i%7)*.1);
   if(mode==="fusion"||mode==="pulse")made.node.scaling.setAll(.55);
   arr.push({obj:made,to:new B.Vector3(i%7-3,.09,Math.floor(i/7)-3),isNew:true});
  });
  this.nodes.forEach(function(obj,id){if(!next.has(id)){obj.node.dispose(false,true);self.nodes.delete(id);}});
  return arr;
 };
 Garden.prototype.refresh=function(board){this.draw(board,"immediate");};
 Garden.prototype.play=function(evt,instant){
  var self=this;if(instant){this.refresh(evt.board);return Promise.resolve();}
  if(evt.type==="swap"){
   var motion=this.draw(evt.board,"swap"),starts=motion.map(function(m){return m.obj.node.position.clone();});
   return tween(155,function(t){motion.forEach(function(m,k){m.obj.node.position=B.Vector3.Lerp(starts[k],m.to,t);});});
  }
  if(evt.type==="fusion"){
   var incoming=[];
   (evt.groups||[]).forEach(function(g){g.removed.forEach(function(i){self.nodes.forEach(function(v){if(v.index===i)incoming.push({obj:v,at:g.at,from:v.node.position.clone()});});});});
   return tween(145,function(t){incoming.forEach(function(m){var to=new B.Vector3(m.at%7-3,.09,Math.floor(m.at/7)-3);m.obj.node.position=B.Vector3.Lerp(m.from,to,t);m.obj.node.scaling.setAll(1-.65*t);});}).then(function(){
    var changed=self.draw(evt.board,"fusion"),growing=changed.filter(function(p){return p.isNew;});
    return tween(245,function(t){growing.forEach(function(m){m.obj.node.scaling.setAll(.55+.45*t);m.obj.node.position.copyFrom(m.to);});});
   });
  }
  if(evt.type==="pulse"){
   var beams=[];
   (evt.targets||[]).forEach(function(t,i){
    var at={x:t.from%7-3,z:Math.floor(t.from/7)-3},to={x:t.to%7-3,z:Math.floor(t.to/7)-3};
    var orb=sphere(self.scene,null,"bloomWave",self.mats.pulse,at.x,.58,at.z,.23,.14,.23);
    var glint=sphere(self.scene,null,"bloomSpark",self.mats.spark,at.x,.66,at.z,.08,.09,.08);
    beams.push({orb:orb,glint:glint,from:at,to:to,phase:i});
   });
   return tween(210,function(t){beams.forEach(function(b){
    var x=b.from.x+(b.to.x-b.from.x)*t,z=b.from.z+(b.to.z-b.from.z)*t;
    b.orb.position.set(x,.56+.045*Math.sin(t*Math.PI),z);b.glint.position.set(x-.07,.64,z+.045);
    b.orb.scaling.set(.19+.09*Math.sin(t*Math.PI),.15,.19+.09*Math.sin(t*Math.PI));
   });}).then(function(){beams.forEach(function(b){b.orb.dispose();b.glint.dispose();});
    var changed=self.draw(evt.board,"pulse"),newGrowth=changed.filter(function(p){return p.isNew;});
    return tween(240,function(t){newGrowth.forEach(function(m){m.obj.node.position.copyFrom(m.to);m.obj.node.scaling.setAll(.55+.45*t);});});
   });
  }
  if(evt.type==="harvest"){
   var trees=(evt.positions||[]).map(function(i){var a=null;self.nodes.forEach(function(v){if(v.index===i)a=v;});return a;}).filter(Boolean);
   return tween(250,function(t){trees.forEach(function(v){v.node.scaling.set(1-.85*t,1+.2*t,1-.85*t);v.node.position.y=.09+t*.40;});}).then(function(){self.draw(evt.board,"harvest");});
  }
  if(evt.type==="fall"){
   var falling=this.draw(evt.board,"fall"),starts=falling.map(function(m){return m.obj.node.position.clone();});
   return tween(275,function(t){falling.forEach(function(m,i){m.obj.node.position=B.Vector3.Lerp(starts[i],m.to,t);});});
  }
  if(evt.type==="power"){
   this.draw(evt.board,"fusion");
   var growing=[];this.nodes.forEach(function(v){if(v.index===evt.at)growing.push(v);});
   return tween(240,function(t){growing.forEach(function(v){v.node.scaling.setAll(.5+.5*t);});});
  }
  if(evt.type==="shuffle"){
   var moves=this.draw(evt.board,"fall"),begin=moves.map(function(m){return m.obj.node.position.clone();});
   return tween(210,function(t){moves.forEach(function(m,i){m.obj.node.position=B.Vector3.Lerp(begin[i],m.to,t);});});
  }
  this.draw(evt.board,"immediate");return Promise.resolve();
 };
 Garden.prototype.dispose=function(){this.engine.stopRenderLoop();this.scene.dispose();this.engine.dispose();window.removeEventListener("resize",this.onResize);if(this.observer)this.observer.disconnect();};
 function TreeDisplay(canvas){
  this.canvas=canvas;this.engine=new B.Engine(canvas,true,{antialias:true});
  this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.91,.95,.87,1);
  var scene=this.scene;this.camera=new B.FreeCamera("treeCam",new B.Vector3(4,5,8),scene);this.camera.setTarget(new B.Vector3(0,1,0));
  this.camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;this.camera.orthoLeft=-3.2;this.camera.orthoRight=3.2;this.camera.orthoTop=3;this.camera.orthoBottom=-3;
  var sky=new B.HemisphericLight("sky",new B.Vector3(0,1,0),scene);sky.intensity=1.05;
  var sun=new B.DirectionalLight("sun",new B.Vector3(-1,-2,-1),scene);sun.intensity=.7;
  this.mats=createMats(scene);this.parts=[];
  var that=this;this.engine.runRenderLoop(function(){scene.render();});this.onResize=function(){that.engine.resize();};window.addEventListener("resize",this.onResize);
 }
 TreeDisplay.prototype.show=function(essence,style){
  var scene=this.scene,m=this.mats;
  this.parts.forEach(function(p){p.dispose(false,true);});this.parts=[];
  var root=new B.TransformNode("treeRoot",scene);this.parts.push(root);
  sphere(scene,root,"grass-shadow",m.shadow,0,-.015,0,2.7,.035,2.0);
  var baseHeight=1.22+Math.min(1.0,Math.sqrt(Math.max(0,essence)/420)*.4),stems=Math.min(6,1+Math.floor(Math.sqrt(essence/95)));
  trunk(scene,root,m.trunk,0,baseHeight*.39,0,baseHeight*.8,.43,.16);
  var family=style==="bloom"?"sakura":style==="canopy"?"verdant":"mistbloom",p=m[family];
  var base=sphere(scene,root,"motherCrown",style==="bloom"?m.sakura.main:m.verdant.main,0,baseHeight*.83,0,style==="canopy"?1.65:1.25,.62,style==="canopy"?1.35:1.13);
  for(var i=0;i<stems;i++){
   var x=(i-(stems-1)/2)*.39,z=Math.sin(i*2.4)*.18,h=.55+(i%3)*.14;
   trunk(scene,root,m.trunk,x,baseHeight*.95+h*.43,z,h,.15,.06);
   sphere(scene,root,"crown",i%2?p.light:p.main,x,baseHeight*.95+h,z,style==="canopy"?.72:.57,.55,style==="canopy"?.70:.52);
   if(style==="bloom")for(var k=0;k<3;k++)sphere(scene,root,"blossom",m.sakura.light,x+Math.cos(k*2.09)*.25,baseHeight*.95+h+.22,z+Math.sin(k*2.09)*.22,.25,.21,.25);
  }
 };
 TreeDisplay.prototype.dispose=function(){this.engine.stopRenderLoop();this.scene.dispose();this.engine.dispose();window.removeEventListener("resize",this.onResize);};
 window.DaisugiVisuals={Garden:Garden,TreeDisplay:TreeDisplay,palette:palette};
})();