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
  m.specularColor=new B.Color3(.065,.07,.055);m.specularPower=12;
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
  return put(B.MeshBuilder.CreateSphere(name,{diameter:1,segments:12},scene),parent,x,y,z,sx,sy,sz,material);
 }
 function trunk(scene,parent,material,x,y,z,h,bottom,top){
  return put(B.MeshBuilder.CreateCylinder("stem",{height:h,diameterBottom:bottom,diameterTop:top,tessellation:9},scene),parent,x,y,z,1,1,1,material);
 }
 function createMats(scene){
  var m={soil:mat(scene,"soil","#CEBEA5"),soil2:mat(scene,"soil2","#D3C4AC"),border:mat(scene,"earthEdge","#9DAD8A"),shadow:mat(scene,"shadow","#455C42",0,.25),trunk:mat(scene,"trunk","#896C4B"),root:mat(scene,"stem","#789267"),pulse:mat(scene,"pulse","#91F4B1",.90,.88),spark:mat(scene,"spark","#F5FFD2",.98),pulseHalo:mat(scene,"pulseHalo","#83DDA4",.85,.23),moss:mat(scene,"softMoss","#869E74")};
  Object.keys(palette).forEach(function(f){var p=palette[f];m[f]={main:mat(scene,f+"-main",p.main),light:mat(scene,f+"-light",p.light),dark:mat(scene,f+"-dark",p.dark),bud:mat(scene,f+"-bud",p.bud),stem:mat(scene,f+"-stem",p.stem)};});
  return m;
 }
 function leaf(scene,root,material,x,y,z,length,width,rot,tilt) {
   var piece=sphere(scene,root,"soft-leaf",material,x,y,z,length,.115,width);
   piece.rotation.y=rot||0;piece.rotation.z=tilt||0;return piece;
 }
 function petalBloom(scene,root,f,m,x,y,z,scale) {
   var count=f==="sunleaf"?8:f==="mistbloom"?4:f==="verdant"?5:6;
   for(var i=0;i<count;i++){
     var a=i*Math.PI*2/count,dist=scale*(f==="mistbloom"?.28:.32);
     var p=sphere(scene,root,f==="verdant"?"leaf-petal":"curved-petal",i%3===0?m.light:m.main,
       x+Math.cos(a)*dist,y+.025,z+Math.sin(a)*dist,
       f==="sunleaf"?.37*scale:.43*scale,.14*scale,
       f==="mistbloom"?.49*scale:.36*scale);
     p.rotation.y=-a+(f==="mistbloom"?.6:0);
     p.rotation.x=f==="mistbloom"?.40:.13;
   }
   sphere(scene,root,"flower-centre",f==="sunleaf"?m.dark:m.bud,x,y+.08,z,.30*scale,.19*scale,.30*scale);
   sphere(scene,root,"flower-highlight",m.light,x-.085*scale,y+.19*scale,z-.09*scale,.11*scale,.045*scale,.11*scale);
 }
 function makePlant(scene,mats,plant,index) {
   var parent=new B.TransformNode("gardenPlant-"+plant.id,scene);
   parent.position.set(index%7-3,.085,Math.floor(index/7)-3);
   var f=plant.family,stage=plant.stage,m=mats[f];
   sphere(scene,parent,"contact-shadow",mats.shadow,0,.004,0,.76,.019,.65);
   if(stage===1){
     // Four recognisable living seed silhouettes: sakura petals, verdant
     // leaves, mistbloom teardrop and sunleaf rays, not plain coloured balls.
     if(f==="sakura"){
       sphere(scene,parent,"sakura-seed-heart",m.dark,0,.17,0,.31,.25,.29);
       for(var k=0;k<5;k++){
         var a=k*2*Math.PI/5;
         var petal=sphere(scene,parent,"sakura-petal",k%2?m.main:m.light,
           Math.cos(a)*.205,.25,Math.sin(a)*.205,.30,.18,.27);
         petal.rotation.y=-a;
       }
       sphere(scene,parent,"sakura-center",m.bud,-.03,.34,0,.13,.095,.13);
     }else if(f==="verdant"){
       sphere(scene,parent,"verdant-kernel",m.dark,0,.17,0,.33,.24,.31);
       leaf(scene,parent,m.light,-.20,.28,-.07,.54,.26,-.35,-.30);
       leaf(scene,parent,m.main,.20,.28,.07,.54,.26,.35,.30);
       sphere(scene,parent,"verdant-center",m.bud,0,.33,0,.16,.11,.15);
     }else if(f==="mistbloom"){
       var dew=sphere(scene,parent,"mist-dew",m.main,0,.23,0,.42,.49,.40);
       sphere(scene,parent,"mist-lower-drop",m.dark,0,.13,.13,.34,.19,.29);
       sphere(scene,parent,"mist-light",m.bud,-.09,.37,-.10,.17,.13,.12);
       sphere(scene,parent,"mist-tip",m.light,0,.49,0,.15,.20,.15);
       leaf(scene,parent,m.stem,.17,.13,.04,.24,.12,.6,.10);
     }else{
       sphere(scene,parent,"sun-core",m.dark,0,.20,0,.34,.25,.35);
       for(var ray=0;ray<8;ray++){
         var angle=ray*Math.PI/4;
         var petal=sphere(scene,parent,"sunleaf-petal",ray%2?m.main:m.light,
           Math.cos(angle)*.29,.25,Math.sin(angle)*.29,.29,.14,.25);
         petal.rotation.y=angle;
       }
       sphere(scene,parent,"sun-heart",m.bud,0,.34,0,.18,.095,.18);
     }
   }
   if(stage===2){
     trunk(scene,parent,m.stem,0,.28,0,.42,.105,.065);
     leaf(scene,parent,m.dark,-.21,.38,-.04,.43,.23,.40,-.34);
     leaf(scene,parent,m.light,.23,.40,.06,.45,.23,-.35,.31);
     sphere(scene,parent,"new-growth",m.main,0,.56,0,.24,.24,.21);
     sphere(scene,parent,"bud-tip",m.bud,-.05,.70,-.055,.14,.12,.13);
   }
   if(stage===3){
     trunk(scene,parent,m.stem,0,.38,0,.61,.095,.062);
     leaf(scene,parent,m.dark,-.25,.32,.06,.36,.19,.52,-.24);
     leaf(scene,parent,m.light,.26,.42,-.05,.34,.18,-.45,.22);
     petalBloom(scene,parent,f,m,0,.69,0,.88);
     if(f==="verdant")leaf(scene,parent,m.light,.02,.75,-.17,.34,.18,.5,.06);
   }
   if(stage===4){
     trunk(scene,parent,m.stem,0,.37,0,.59,.16,.09);
     // Asymmetric rounded miniature shrub, overlapping foliage clumps.
     var lumps=[
       [-.29,.53,-.17,.52,.40,.46,m.dark],
       [.28,.52,.12,.51,.37,.43,m.main],
       [-.08,.72,.16,.56,.41,.48,m.light],
       [.13,.68,-.26,.44,.34,.41,m.main],
       [0,.51,.02,.62,.41,.56,m.dark]
     ];
     lumps.forEach(function(a){sphere(scene,parent,"foliage",a[6],a[0],a[1],a[2],a[3],a[4],a[5]);});
     for(var j=0;j<6;j++){
       var angle=j*2.399,px=Math.cos(angle)*.34,pz=Math.sin(angle)*.31;
       if(f==="verdant"){
         leaf(scene,parent,j%2?m.light:m.main,px,.81,pz,.34,.18,angle,.10);
       }else{
         petalBloom(scene,parent,f,m,px,.84-(j%2)*.09,pz,.35);
       }
     }
   }
   if(stage===5){
     trunk(scene,parent,mats.trunk,0,.65,0,1.20,.24,.125);
     for(var t=0;t<6;t++){
       var a=t*Math.PI*2/6;
       sphere(scene,parent,"tree-canopy",t%2?m.light:m.main,Math.cos(a)*.40,1.18+((t%2)*.12),Math.sin(a)*.36,.66,.53,.60);
     }
     sphere(scene,parent,"crown-centre",m.dark,0,1.38,0,.82,.60,.70);
     for(var w=0;w<5;w++){
       var b=w*2.399;
       if(f==="verdant")leaf(scene,parent,m.light,Math.cos(b)*.36,1.57,Math.sin(b)*.33,.34,.20,b,.1);
       else petalBloom(scene,parent,f,m,Math.cos(b)*.36,1.55,Math.sin(b)*.32,.39);
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
  var s=new B.Scene(engine);s.clearColor=new B.Color4(.86,.89,.78,1);
  var camera=new B.FreeCamera("gardenCamera",new B.Vector3(0,13,3.0),s);
  camera.setTarget(new B.Vector3(0,.15,0));camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft=-3.95;camera.orthoRight=3.95;camera.orthoTop=3.95;camera.orthoBottom=-3.95;
  var hemi=new B.HemisphericLight("softSky",new B.Vector3(0,1,.4),s);hemi.intensity=.72;hemi.diffuse=new B.Color3(.94,.97,.91);
  var sun=new B.DirectionalLight("warmSun",new B.Vector3(-.7,-1,-.4),s);sun.intensity=.48;
  return s;
 }
 function Garden(canvas){
  this.canvas=canvas;this.engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false,antialias:true},true);
  this.engine.setHardwareScalingLevel(Math.max(1,Math.min(1.6,window.devicePixelRatio||1)));
  this.scene=createScene(this.engine,canvas);this.mats=createMats(this.scene);
  this.nodes=new Map();this.tiles=[];this.softMoss=[];this.selected=-1;this.onTile=null;this.pointerStart=null;this.skip=false;
  var self=this;
  for(var i=0;i<49;i++){
   var r=Math.floor(i/7),c=i%7,x=c-3,z=r-3;
   var border=put(B.MeshBuilder.CreateBox("edge"+i,{width:.995,depth:.995,height:.08},this.scene),null,x,.018,z,1,1,1,this.mats.border);border.isPickable=false;
   var tile=put(B.MeshBuilder.CreateBox("tile"+i,{width:.976,depth:.976,height:.10},this.scene),null,x,.066,z,1,1,1,(r+c)%2?this.mats.soil:this.mats.soil2);
   tile.metadata={tileIndex:i};tile.isPickable=true;this.tiles.push(tile);
   // Irregular, extremely low moss trims break the spreadsheet grid while
   // preserving the 7x7 touch targets and predictable swap geometry.
   if((i*11)%5===0){
     var mx=x+((i%3)-1)*.26,mz=z+(((i*3)%5)-2)*.10;
     var moss=sphere(this.scene,null,"edge-moss",this.mats.moss,mx,.12,mz,.20,.045,.13);
     moss.isPickable=false;this.softMoss.push(moss);
   }
  }
  this.selectedMat=mat(this.scene,"chosen","#F6E6BC");this.powerMat=mat(this.scene,"powerSelect","#E4F0C8");
  this.engine.runRenderLoop(function(){self.scene.render();});
  this.onResize=function(){self.engine.resize();};window.addEventListener("resize",this.onResize);
  if(window.ResizeObserver){this.observer=new ResizeObserver(this.onResize);this.observer.observe(canvas);}
  canvas.addEventListener("pointerdown",function(e){if(canvas.setPointerCapture)try{canvas.setPointerCapture(e.pointerId);}catch(err){}self.pointerStart={index:self.pick(e),x:e.clientX,y:e.clientY};});
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
   if(old){old.node.dispose(false,false);self.nodes.delete(p.id);}
   var made=makePlant(self.scene,self.mats,p,i);self.nodes.set(p.id,made);
   if(mode==="fall")made.node.position.y=1.8+((i%7)*.09);
   if(mode==="fusion"||mode==="pulse")made.node.scaling.setAll(.18);
   arr.push({obj:made,to:new B.Vector3(i%7-3,.09,Math.floor(i/7)-3),isNew:true});
  });
  this.nodes.forEach(function(obj,id){if(!next.has(id)){obj.node.dispose(false,false);self.nodes.delete(id);}});
  return arr;
 };
 Garden.prototype.refresh=function(board){this.draw(board,"immediate");};
 function growthPulse(t){return 1.0+Math.sin(t*Math.PI)*.13;}
 function growModels(list,duration){
   return tween(duration,function(t){
     list.forEach(function(v){
       var bounce=t<.75?Math.sin(t*Math.PI/.75)*.17:0;
       var scale=.18+.82*t+bounce;
       v.obj.node.scaling.setAll(scale);
       v.obj.node.position.copyFrom(v.to);
       v.obj.node.position.y+=Math.sin(t*Math.PI)*.065;
     });
   }).then(function(){list.forEach(function(v){v.obj.node.scaling.setAll(1);v.obj.node.position.copyFrom(v.to);});});
 }
 function briefSparks(self,positions,kind){
   var scene=self.scene,group=[],count=kind==="tree"?9:5;
   positions.forEach(function(index){
     var x=index%7-3,z=Math.floor(index/7)-3;
     for(var k=0;k<count;k++){
       var phase=k*2.399963,d=.10+(k%3)*.07;
       var p=sphere(scene,null,"growth-glimmer",k%3===0?self.mats.spark:self.mats.pulse,x+Math.cos(phase)*d,.23+(k%2)*.13,z+Math.sin(phase)*d,
         .065,.065,.065);
       group.push({mesh:p,phase:phase,baseX:x,baseZ:z,h:p.position.y,speed:.24+(k%3)*.1});
     }
   });
   return group;
 }
 function fadeSparks(group,t){
   group.forEach(function(p){
     p.mesh.position.x=p.baseX+Math.cos(p.phase)*(.15+.40*t);
     p.mesh.position.y=p.h+p.speed*t;
     p.mesh.position.z=p.baseZ+Math.sin(p.phase)*(.13+.37*t);
     p.mesh.scaling.setAll(Math.max(.05,1-t));
   });
 }
 Garden.prototype.play=function(evt,instant){
   var self=this;
   if(instant){this.refresh(evt.board);return Promise.resolve();}
   if(evt.type==="swap"){
     var motions=this.draw(evt.board,"swap"),starts=motions.map(function(m){return m.obj.node.position.clone();});
     return tween(180,function(t){motions.forEach(function(m,k){
       m.obj.node.position=B.Vector3.Lerp(starts[k],m.to,t);
       if(starts[k].subtract(m.to).length()>.15)m.obj.node.position.y+=Math.sin(t*Math.PI)*.16;
     });});
   }
   if(evt.type==="fusion"){
     var incoming=[],locations=(evt.groups||[]).map(function(g){return g.at;});
     (evt.groups||[]).forEach(function(g){g.removed.forEach(function(i){
       self.nodes.forEach(function(v){if(v.index===i)incoming.push({obj:v,at:g.at,from:v.node.position.clone()});});
     });});
     return tween(185,function(t){incoming.forEach(function(v){
       var target=new B.Vector3(v.at%7-3,.085,Math.floor(v.at/7)-3);
       v.obj.node.position=B.Vector3.Lerp(v.from,target,t);
       v.obj.node.position.y+=Math.sin(t*Math.PI)*.14;
       v.obj.node.scaling.setAll(Math.max(.01,1-.94*t));
     });}).then(function(){
       var changed=self.draw(evt.board,"fusion"),grow=changed.filter(function(v){return v.isNew;});
       var sparkles=briefSparks(self,locations,"fusion");
       return Promise.all([growModels(grow,330),tween(330,function(t){fadeSparks(sparkles,t);})])
         .then(function(){sparkles.forEach(function(v){v.mesh.dispose();});});
     });
   }
   if(evt.type==="pulse"){
     var targets=evt.targets||[],sources=evt.sources||[],beams=[],rings=[];
     sources.forEach(function(i){
       var x=i%7-3,z=Math.floor(i/7)-3;
       var ring=put(B.MeshBuilder.CreateTorus("pulse-origin",{diameter:.76,thickness:.055,tessellation:26},self.scene),
         null,x,.16,z,1,1,1,self.mats.pulse);
       ring.rotation.x=Math.PI/2;ring.isPickable=false;rings.push(ring);
     });
     targets.forEach(function(target,i){
       var from={x:target.from%7-3,z:Math.floor(target.from/7)-3},to={x:target.to%7-3,z:Math.floor(target.to/7)-3};
       var front=sphere(self.scene,null,"green-wave",self.mats.pulse,from.x,.55,from.z,.32,.14,.34);
       var halo=sphere(self.scene,null,"soft-wave",self.mats.pulseHalo,from.x,.51,from.z,.65,.14,.58);
       var glimmers=[];
       for(var q=0;q<4;q++)glimmers.push(sphere(self.scene,null,"floating-light",q%2?self.mats.spark:self.mats.pulse,
          from.x,.58,from.z,.080,.075,.080));
       beams.push({from:from,to:to,front:front,halo:halo,glimmers:glimmers,offset:i*.7});
     });
     return tween(300,function(t){
       rings.forEach(function(r){r.scaling.setAll(.7+.55*t);});
       beams.forEach(function(e){
         var x=e.from.x+(e.to.x-e.from.x)*t,z=e.from.z+(e.to.z-e.from.z)*t;
         e.front.position.set(x,.53,z);e.halo.position.set(x,.51,z);
         e.front.scaling.set(.70+.35*Math.sin(t*Math.PI),.32,.70+.35*Math.sin(t*Math.PI));
         e.halo.scaling.set(.95+.18*Math.sin(t*Math.PI),.85,.95+.18*Math.sin(t*Math.PI));
         e.glimmers.forEach(function(p,j){
           p.position.set(x+Math.cos(j*2.399+t*3)*.15,.48+(j%2)*.17,z+Math.sin(j*2.399+t*3)*.16);
           p.scaling.setAll(.6+.4*(1-t));
         });
       });
     }).then(function(){
       rings.forEach(function(r){r.dispose();});
       beams.forEach(function(e){e.front.dispose();e.halo.dispose();e.glimmers.forEach(function(p){p.dispose();});});
       var diff=self.draw(evt.board,"pulse"),grown=diff.filter(function(v){return v.isNew;});
       var sparks=briefSparks(self,targets.map(function(t){return t.to;}),"pulse");
       return Promise.all([growModels(grown,340),tween(350,function(t){fadeSparks(sparks,t);})])
       .then(function(){sparks.forEach(function(p){p.mesh.dispose();});});
     });
   }
   if(evt.type==="hero"){
     // Tree Celebration: the completed tree is allowed to stand tall before
     // its pulse/harvest. Multiple trees born in one wave celebrate together.
     var indices=evt.positions||[],models=[];
     indices.forEach(function(index){
       self.nodes.forEach(function(item){if(item.index===index&&item.stage===5)models.push(item);});
     });
     var sparks=briefSparks(self,indices,"tree"),halos=[];
     indices.forEach(function(index){
       var x=index%7-3,z=Math.floor(index/7)-3;
       var ring=put(B.MeshBuilder.CreateTorus("tree-celebration-halo",{diameter:1.04,thickness:.055,tessellation:32},self.scene),
         null,x,.21,z,1,1,1,self.mats.spark);
       ring.rotation.x=Math.PI/2;ring.isPickable=false;halos.push(ring);
     });
     var hold=evt.first?990:680;
     return tween(hold,function(t){
       models.forEach(function(item){
         var breath=1+.14*Math.sin(t*Math.PI);
         item.node.scaling.set(breath,1+.19*Math.sin(t*Math.PI),breath);
         item.node.position.y=.085+.08*Math.sin(t*Math.PI);
       });
       halos.forEach(function(r){r.scaling.setAll(.75+t*.65);});
       fadeSparks(sparks,Math.min(1,t*.88));
     }).then(function(){
       halos.forEach(function(r){r.dispose();});sparks.forEach(function(p){p.mesh.dispose();});
       models.forEach(function(item){item.node.scaling.setAll(1);item.node.position.y=.085;});
     });
   }
   if(evt.type==="harvest"){
     var trees=(evt.positions||[]).map(function(i){var obj=null;self.nodes.forEach(function(p){if(p.index===i)obj=p;});return obj;}).filter(Boolean);
     var particles=briefSparks(self,evt.positions||[],"tree");
     return tween(330,function(t){
       trees.forEach(function(v){v.node.scaling.set(Math.max(.01,1-.85*t),1+.38*Math.sin(t*Math.PI),Math.max(.01,1-.85*t));v.node.position.y=.085+t*.62;});
       fadeSparks(particles,t);
     }).then(function(){particles.forEach(function(p){p.mesh.dispose();});self.draw(evt.board,"harvest");});
   }
   if(evt.type==="fall"){
     var fall=this.draw(evt.board,"fall"),starts=fall.map(function(v){return v.obj.node.position.clone();});
     return tween(310,function(t){fall.forEach(function(v,i){
       v.obj.node.position=B.Vector3.Lerp(starts[i],v.to,t);
       v.obj.node.position.y+=Math.sin(t*Math.PI)*.07*(v.isNew?1:.4);
     });});
   }
   if(evt.type==="power"){
     this.draw(evt.board,"fusion");
     var selected=[];this.nodes.forEach(function(v){if(v.index===evt.at)selected.push(v);});
     selected.forEach(function(v){v.node.scaling.setAll(.12);});
     return tween(275,function(t){selected.forEach(function(v){v.node.scaling.setAll(.12+.88*t+Math.sin(t*Math.PI)*.14);});});
   }
   if(evt.type==="shuffle"){
     this.draw(evt.board,"immediate");return Promise.resolve();
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
   this.parts.forEach(function(p){p.dispose(false,false);});this.parts=[];
   var root=new B.TransformNode("singlePermanentDaisugi",scene);this.parts.push(root);
   sphere(scene,root,"ground-contact",m.shadow,0,-.03,0,2.5,.045,1.7);
   // One continuously-growing mother trunk. New upright cedar trunks
   // emerge from the same base instead of mushroom-like flat platforms.
   var size=Math.min(1.17,Math.sqrt(Math.max(0,essence)/300)*.28),
       stemCount=Math.min(7,2+Math.floor(Math.sqrt(Math.max(0,essence)/75))),
       centerHeight=1.12+size*.35;
   trunk(scene,root,m.trunk,0,.49,0,.98,.52,.29);
   sphere(scene,root,"mother-crown",m.verdant.dark,0,.99,0,1.32,.43,1.12);
   sphere(scene,root,"mother-crown-front",m.verdant.main,-.36,.94,.22,.83,.35,.78);
   sphere(scene,root,"mother-crown-side",m.verdant.light,.42,1.03,.02,.70,.36,.72);
   var tone=style==="bloom"?m.sakura:m.verdant;
   for(var i=0;i<stemCount;i++){
     var side=(i-(stemCount-1)/2),
         x=side*.40,z=Math.sin((i+1)*2.39)*.26,
         h=centerHeight+.18+(i%3)*.23+size*.2;
     trunk(scene,root,m.trunk,x,1.06+(h-.84)*.5,z,h-.84,.19,.08);
     // More vertical, tapered small canopies: recognisably daisugi.
     var top=1.05+h-.8;
     var layers=style==="canopy"?4:3;
     for(var layer=0;layer<layers;layer++){
       var y=top-.28+layer*.24,span=(style==="canopy"?.64:.49)*(1-layer*.13);
       sphere(scene,root,"upright-foliage",layer%2?m.verdant.light:tone.main,x,y,z,span,.47,span*.92);
       sphere(scene,root,"cedar-tip",layer%2?tone.main:m.verdant.dark,x,y+.17,z,span*.48,.29,span*.47);
     }
     sphere(scene,root,"crown-tip",m.verdant.light,x,top+.47,z,.25,.35,.25);
     if(style==="bloom"){
       for(var j=0;j<5;j++){
         var angle=j*2.399;
         petalBloom(scene,root,"sakura",m.sakura,x+Math.cos(angle)*.23,top+.05+(j%2)*.20,z+Math.sin(angle)*.22,.28);
       }
     }
   }
   if(essence>=90){
     for(var k=0;k<4;k++){
       var a=k*Math.PI/2;
       leaf(scene,root,m.verdant.light,Math.cos(a)*.46,1.21,Math.sin(a)*.38,.35,.16,a,.10);
     }
   }
 };
 TreeDisplay.prototype.dispose=function(){this.engine.stopRenderLoop();this.scene.dispose();this.engine.dispose();window.removeEventListener("resize",this.onResize);};
 window.DaisugiVisuals={Garden:Garden,TreeDisplay:TreeDisplay,palette:palette};
})();