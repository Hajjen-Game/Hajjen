(function(){
 "use strict";
 var R=window.DaisugiRules,V=window.DaisugiVisuals;
 var $=function(id){return document.getElementById(id);};
 var names={sakura:"Sakura",verdant:"Verdant",mistbloom:"Mistbloom",sunleaf:"Sunleaf"};
 var stages=["","Frö","Grodd","Blomma","Buske","Träd"];
 var KEY="daisugi-bloom-first-playable-v1";
 var defaults={unlocked:0,bestStars:{},bestEssence:{},totalEssence:0,style:"upright",bestScore:{},showStages:false,sound:true,reduceMotion:false,run:null};
 function readSave(){try{var raw=JSON.parse(localStorage.getItem(KEY));return Object.assign({},defaults,raw||{});}catch(e){return Object.assign({},defaults);}}
 var save=readSave(),game=null,level=0,garden=null,tree=null,selected=-1,powerFamily=null,busy=false,skip=false,fromResult=false,pendingPower=-1,audio=null,toastTimer=0;
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){/* storage may be disabled */}}
 function show(id){$(id).hidden=false;}
 function hide(id){$(id).hidden=true;}
 function toast(text){var el=$("toast");el.textContent=text;show("toast");clearTimeout(toastTimer);toastTimer=setTimeout(function(){hide("toast");},2500);}
 function sound(kind){
  if(!save.sound)return;
  try{
   if(!audio){var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio=new Audio();}
   if(audio.state==="suspended")audio.resume();
   var pitches={swap:392,fusion:523,pulse:659,harvest:784,win:880,power:590,lose:250};
   var hz=pitches[kind];if(!hz)return;
   var oscillator=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
   oscillator.type=kind==="harvest"?"triangle":"sine";oscillator.frequency.setValueAtTime(hz,t);
   if(kind==="pulse")oscillator.frequency.exponentialRampToValueAtTime(hz*1.13,t+.15);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.014);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.18);
   oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(t);oscillator.stop(t+.19);
  }catch(e){}
 }
 function pretty(value){return Math.max(0,Math.round(Number(value)||0)).toLocaleString("sv-SE");}
 function floatScore(amount,index,kind){
  if(!amount)return;
  var layer=$("scoreFx"),el=document.createElement("span");
  el.className="score-pop "+(kind||"");el.textContent="+"+pretty(amount);
  var anchor=Number.isInteger(index)?index:24;
  el.style.left=((anchor%7+.5)*100/7)+"%";
  el.style.top=((Math.floor(anchor/7)+.5)*100/7)+"%";
  layer.appendChild(el);
  setTimeout(function(){el.remove();},save.reduceMotion?170:1220);
 }
 function displayPoints(evt){
  if(!evt||!(evt.scoreDelta>0))return;
  if(evt.type==="fusion"&&evt.groups&&evt.groups.length){
   evt.groups.forEach(function(group){floatScore(group.points,group.at,"fusion");});
  }else if(evt.type==="pulse"&&evt.targets&&evt.targets.length){
   var each=Math.round(evt.scoreDelta/evt.targets.length);
   evt.targets.forEach(function(target){floatScore(each,target.to,"pulse");});
  }else if(evt.type==="harvest"){
   var anchors=evt.positions||[];
   var per=anchors.length?Math.round(evt.scoreDelta/anchors.length):evt.scoreDelta;
   anchors.forEach(function(index){floatScore(per,index,"harvest");});
  }
 }
 function setCombo(evt){
  var chip=$("comboChip");
  if(evt.type==="fusion"&&evt.combo>=2){
   chip.textContent="NATURE CASCADE ×"+(evt.multiplier||evt.combo).toLocaleString("sv-SE",{maximumFractionDigits:1});
   chip.hidden=false;
  }else if(evt.type==="harvest"&&evt.chain>=2){
   chip.textContent=evt.chain>=4?"WILD BLOOM · "+evt.chain+" TRÄD":"BLOOM CHAIN · "+evt.chain+" TRÄD";
   chip.hidden=false;
  }else if(evt.type==="swap"||evt.type==="power"){chip.hidden=true;}
 }
 async function celebrateTree(evt){
  var panel=$("treeCelebration");
  panel.querySelector("strong").textContent=(evt.positions||[]).length>1?"TRÄDEN BLOMSTRAR!":"TRÄD SKAPAT!";
  panel.querySelector("small").textContent=(evt.positions||[]).length+" TRÄD · BLOOM PULSE";
  panel.hidden=false;
  try{await garden.play(evt,save.reduceMotion||skip);}
  finally{panel.hidden=true;}
 }
 function renderMenu(){
  var list=$("levelList");list.replaceChildren();
  R.levels.forEach(function(config,i){
   var button=document.createElement("button"),allowed=i<=save.unlocked,best=save.bestStars[i]||0;
   button.className="level-tile"+(allowed?"":" locked");button.disabled=!allowed;
   var circle=document.createElement("span");circle.className="level-number";circle.textContent=allowed?String(i+1):"🔒";
   var desc=document.createElement("span"),title=document.createElement("strong"),sub=document.createElement("small");
   title.textContent=config.name;sub.textContent=config.subtitle;desc.append(title,sub);
   var stars=document.createElement("span");stars.className="level-scores";stars.textContent=best?"★".repeat(best)+"☆".repeat(3-best):allowed?"○ ○ ○":"";
   button.append(circle,desc,stars);button.addEventListener("click",function(){startLevel(i,false);});list.appendChild(button);
  });
  $("menuEssence").textContent="✧ "+save.totalEssence+" livskraft";
  var active=save.run&&save.run.level<=save.unlocked&&!(save.run.data&&save.run.data.complete)?save.run:null;
  $("continueButton").innerHTML=active?"Fortsätt nivå "+(active.level+1)+" <span>→</span>":"Spela nästa nivå <span>→</span>";
 }
 function menu(){if(busy){skip=true;return;}saveRun();renderMenu();hide("gameView");hide("resultModal");show("menuView");powerFamily=null;hide("familyPicker");selected=-1;garden.setSelected(-1);}
 function saveRun(){if(game&&!game.complete&&!game.failed){save.run={level:level,data:game.save()};persist();}}
 function resetRender(){garden.nodes.forEach(function(v){v.node.dispose(false,false);});garden.nodes.clear();garden.setSelected(-1);}
 function startLevel(i,resume){
  if(busy)return;
  level=i;selected=-1;powerFamily=null;skip=false;hide("resultModal");hide("menuView");hide("familyPicker");hide("treeModal");show("gameView");
  var snapshot=resume&&save.run&&save.run.level===i?save.run.data:null;
  game=new R.Game(i,snapshot);resetRender();garden.refresh(game.board);
  $("levelNumber").textContent="NIVÅ "+(i+1)+" AV "+R.levels.length;
  $("levelTitle").textContent=game.config.name;
  $("goalLabel").textContent=game.goalText();
  $("gameTip").textContent=game.config.intro;
  $("selectedInfo").textContent="Välj en växt och byt plats med en granne";
  hide("clearSelection");
  $("scoreFx").replaceChildren();hide("treeCelebration");hide("comboChip");
  renderHUD();
  saveRun();
  if(i===4&&!resume)toast("Power Move redo! Välj familj under spelplanen.");
 }
 function renderStages(board){
  var overlay=$("stageOverlay");overlay.replaceChildren();overlay.hidden=!save.showStages;
  if(!save.showStages)return;
  for(var i=0;i<49;i++){var tile=document.createElement("div");tile.className="stage-number";if(board[i]){var num=document.createElement("span");num.textContent=board[i].stage;tile.appendChild(num);}overlay.appendChild(tile);}
 }
 function renderHUD(evt){
  if(!game)return;
  var state=evt||game;
  $("movesCount").textContent=state.moves;
  $("scoreCount").textContent=pretty(state.score);
  $("scoreBest").textContent=pretty(Math.max(save.bestScore[level]||0,state.score||0));
  var goal=game.config.goal,progress=Math.min(game.target(),evt?evt.goal:game.progress());
  var line=progress+" / "+game.target();
  if(goal.type==="stage"&&goal.count)line+=" · "+((evt?evt.maxStage:game.maxStage)>=goal.stage?"🌿✓":"🌿");
  if(goal.type==="chain"&&goal.trees)line+=" · 🌳"+(evt?evt.trees:game.trees)+"/"+goal.trees;
  $("goalProgress").textContent=line;
  $("energyFill").style.width=Math.min(100,state.energy)+"%";
  $("energyLabel").textContent=state.powers?"KLAR!":state.energy+" / 100";
  $("powerButton").disabled=state.powers<1||busy;
  $("powerLabel").textContent=state.powers?"Power Move redo – välj familj":"Power Move laddas…";
  renderStages(state.board);
 }
 function select(index){
  if(index<0)return;selected=index;garden.setSelected(index,!!powerFamily);var p=game.board[index];
  $("selectedInfo").textContent=p?names[p.family]+" – "+stages[p.stage]+" · stadium "+p.stage+" / 5":"Tom ruta";
  show("clearSelection");
 }
 function deselect(){selected=-1;garden.setSelected(-1);$("selectedInfo").textContent="Välj en växt och byt plats med en granne";hide("clearSelection");}
 function onTile(start,end){
  if(busy){skip=true;return;}
  if(!game||game.complete||game.failed)return;
  var idx=end>=0?end:start;if(idx<0)return;
  if(powerFamily){plantPower(idx);return;}
  if(end>=0&&start!==end&&R.neighbors(start).indexOf(end)>=0){performSwap(start,end);return;}
  if(selected>=0&&selected!==idx&&R.neighbors(selected).indexOf(idx)>=0){performSwap(selected,idx);return;}
  select(idx);
 }
 function performSwap(a,b){var outcome=game.swap(a,b);if(!outcome.ok){toast(outcome.reason);select(b);return;}deselect();playEvents(outcome.events);}
 function plantPower(idx){
  var old=game.board[idx];
  if(old&&old.stage>1){pendingPower=idx;$("confirmMessage").textContent="Du ersätter "+names[old.family]+" ("+stages[old.stage]+", stadium "+old.stage+"/5) med ett nytt "+names[powerFamily]+"-frö. Vill du fortsätta?";show("confirmModal");return;}
  performPower(idx);
 }
 function performPower(idx){
  hide("confirmModal");var outcome=game.power(idx,powerFamily);
  if(!outcome.ok){toast(outcome.reason);return;}
  powerFamily=null;hide("familyPicker");deselect();playEvents(outcome.events);
 }
 async function playEvents(events){
  busy=true;skip=false;$("powerButton").disabled=true;
  var finished=null;
  try{
   for(var i=0;i<events.length;i++){
    var e=events[i];
    if(e.type==="win"||e.type==="lose"){finished=e;continue;}
    if(e.type==="hero")await celebrateTree(e);
    else await garden.play(e,save.reduceMotion||skip);
    renderHUD(e);
    displayPoints(e);setCombo(e);
    if(["fusion","pulse","harvest","power"].indexOf(e.type)>=0)sound(e.type);
    if(e.type==="harvest"&&e.chain>=2)toast(e.chain>=4?"✧ WILD BLOOM! · "+e.chain+" träd":"✦ BLOOM CHAIN · "+e.chain+" träd");
   }
  }catch(error){console.error("Daisugi animation error",error);garden.refresh(game.board);toast("Animationen avbröts, men spelresultatet sparades.");}
  busy=false;renderHUD();saveRun();
  if(finished){if(finished.type==="win")finishLevel(true);else finishLevel(false);}
 }
 function finishLevel(won){
  save.run=null;
  var gained=0;
  if(won){
   var previous=save.bestEssence[level]||0;gained=Math.max(0,game.essence-previous);
   save.bestEssence[level]=Math.max(previous,game.essence);
   save.bestStars[level]=Math.max(save.bestStars[level]||0,game.stars());
   save.bestScore[level]=Math.max(save.bestScore[level]||0,game.score);
   save.totalEssence+=gained;save.unlocked=Math.max(save.unlocked,Math.min(R.levels.length-1,level+1));
   sound("win");
  }else sound("lose");
  persist();
  $("resultEyebrow").textContent=won?"NIVÅ AVKLARAD":"FÖRSÖK IGEN";
  $("resultScore").textContent=pretty(game.score);
  $("resultBestScore").textContent="Bästa poäng: "+pretty(Math.max(save.bestScore[level]||0,game.score));
  $("resultTitle").textContent=won?(game.bestChain>=3?"En fantastisk blomning!":"Din trädgård växer!"):"Inte riktigt ännu";
  $("resultGlyph").textContent=won?"✺":"❧";
  $("resultStars").textContent=won?"★".repeat(game.stars())+"☆".repeat(3-game.stars()):"☆ ☆ ☆";
  $("resultSummary").textContent=won?"Nivåmålet är klart! Skördade träd stärker din enda permanenta Daisugi.":"Dina drag tog slut. Försök planera nästa tillväxtkedja lite tidigare.";
  var stats=$("resultStats");stats.replaceChildren();
  var entries=[["🌳 "+game.trees,"Träd skapade"],["✧ "+game.essence,"Livskraft denna runda"]];
  if(won){entries=[["★ "+game.stars()+" / 3","Effektivitetsbetyg"],["✦ "+game.bestChain,"Bästa trädkedja"],["+"+gained,"Ny permanent livskraft"],["✧ "+game.essence,"Livskraft denna omgång"]];}
  entries.forEach(function(x){var b=document.createElement("div"),s=document.createElement("strong"),t=document.createElement("small");s.textContent=x[0];t.textContent=x[1];b.append(s,t);stats.append(b);});
  $("resultNext").hidden=!won;
  $("resultNext").textContent=level<R.levels.length-1?"Nästa nivå →":"Till nivåvalet →";
  $("resultRetry").textContent=won?"Spela igen":"Försök igen";
  $("resultTree").hidden=!won;
  show("resultModal");
 }
 function openTree(){
  if(busy){skip=true;return;}
  fromResult=!$("resultModal").hidden;hide("resultModal");show("treeModal");
  $("treeEssence").textContent=save.totalEssence;
  $("treeMilestone").textContent=save.totalEssence<90?"Nästa stil vid 90 livskraft":save.totalEssence<180?"Nästa stil vid 180 livskraft":"Fortsätt forma ditt levande träd";
  document.querySelectorAll("[data-style]").forEach(function(b){
   var type=b.dataset.style,req=type==="canopy"?90:type==="bloom"?180:0,locked=save.totalEssence<req;
   b.disabled=locked;b.classList.toggle("locked",locked);b.classList.toggle("active",type===save.style);
  });
  if(!tree)tree=new V.TreeDisplay($("treeCanvas"));
  tree.show(save.totalEssence,save.style);tree.engine.resize();
 }
 function closeTree(){
  hide("treeModal");if(tree){tree.dispose();tree=null;}
  if(fromResult){show("resultModal");fromResult=false;}
 }
 function openSettings(){$("showStages").checked=save.showStages;$("soundEnabled").checked=save.sound;$("reduceMotion").checked=save.reduceMotion;show("settingsModal");}
 var artLabFamily=0,artLabStage=1,artLabTimers=[],artLabBuilt=false;
 function artFamily(){return window.DaisugiPlantArt.families[artLabFamily];}
 function setLabPreview(family,stage){
   var idx=window.DaisugiPlantArt.families.indexOf(family);
   if(idx<0)return;
   artLabFamily=idx;artLabStage=stage;
   var preview=$("plantLabPreview");
   preview.style.backgroundImage='url("'+window.DaisugiPlantArt.atlas[family]+'")';
   preview.style.backgroundPosition=((stage-1)*25)+"% center";
   $("labSelectedTitle").textContent=names[family];
   $("labStageTitle").textContent=stages[stage]+" · "+stage+"/5";
   preview.classList.remove("blooming");
   void preview.offsetWidth; // restart growth animation
   preview.classList.add("blooming");
   document.querySelectorAll(".plant-cell").forEach(function(cell){
     cell.classList.toggle("selected",cell.dataset.family===family&&Number(cell.dataset.stage)===stage);
   });
 }
 function stopLabPlayback(){
   artLabTimers.forEach(clearTimeout);artLabTimers=[];
   $("labPlay").disabled=false;
 }
 function makePlantLab(){
   if(artLabBuilt)return;
   artLabBuilt=true;
   var grid=$("plantLabGrid"),manifest=window.DaisugiPlantArt;
   manifest.families.forEach(function(family){
     var row=document.createElement("div");row.className="plant-family-row";
     var heading=document.createElement("div");heading.className="plant-family-name";
     var swatch=document.createElement("span");swatch.className="plant-family-swatch";
     swatch.style.backgroundColor={sakura:"#EFA2BD",verdant:"#88C579",mistbloom:"#82D8E5",sunleaf:"#F4C66E"}[family];
     heading.append(swatch,document.createTextNode(names[family]));
     var cells=document.createElement("div");cells.className="plant-family-cells";
     for(var stage=1;stage<=5;stage++){
       (function(stageNumber){
         var button=document.createElement("button");button.type="button";
         button.className="plant-cell";button.dataset.family=family;button.dataset.stage=stageNumber;
         button.setAttribute("aria-label",names[family]+" – "+stages[stageNumber]);
         button.style.backgroundImage='url("'+manifest.atlas[family]+'")';
         button.style.backgroundSize="500% 100%";
         button.style.backgroundPosition=((stageNumber-1)*25)+"% center";
         button.addEventListener("click",function(){stopLabPlayback();setLabPreview(family,stageNumber);});
         cells.appendChild(button);
       })(stage);
     }
     row.append(heading,cells);grid.appendChild(row);
   });
 }
 function openPlantLab(){
   if(!window.DaisugiPlantArt)return;
   makePlantLab();stopLabPlayback();setLabPreview(artFamily(),artLabStage);
   show("plantLabModal");$("closePlantLab").focus();
 }
 function closePlantLab(){
   stopLabPlayback();hide("plantLabModal");
   if(window.location.search.indexOf("lab=plants")!==-1){
     try{history.replaceState(null,"",window.location.pathname+window.location.hash);}catch(err){}
   }
 }
 function playLabEvolution(){
   stopLabPlayback();
   var family=artFamily();$("labPlay").disabled=true;
   setLabPreview(family,1);
   for(var stage=2;stage<=5;stage++){
     (function(nextStage){
       artLabTimers.push(setTimeout(function(){
         if($("plantLabModal").hidden)return;
         setLabPreview(family,nextStage);
         if(nextStage===5)$("labPlay").disabled=false;
       },(nextStage-1)*(save.reduceMotion?140:620)));
     })(stage);
   }
 }
 function bind(){
  garden.onTile=onTile;
  $("homeButton").addEventListener("click",menu);
  $("treeButton").addEventListener("click",openTree);
  $("settingsButton").addEventListener("click",openSettings);
  $("openPlantLab").addEventListener("click",openPlantLab);
  $("closePlantLab").addEventListener("click",closePlantLab);
  $("labPlay").addEventListener("click",playLabEvolution);
  $("labPrevFamily").addEventListener("click",function(){stopLabPlayback();artLabFamily=(artLabFamily+3)%4;setLabPreview(artFamily(),1);});
  $("labNextFamily").addEventListener("click",function(){stopLabPlayback();artLabFamily=(artLabFamily+1)%4;setLabPreview(artFamily(),1);});
  $("closeSettings").addEventListener("click",function(){hide("settingsModal");});
  $("showStages").addEventListener("change",function(e){save.showStages=e.target.checked;persist();if(game)renderStages(game.board);});
  $("soundEnabled").addEventListener("change",function(e){save.sound=e.target.checked;persist();});
  $("reduceMotion").addEventListener("change",function(e){save.reduceMotion=e.target.checked;persist();});
  $("clearSelection").addEventListener("click",deselect);
  $("continueButton").addEventListener("click",function(){
   if(save.run&&save.run.level<=save.unlocked&&!save.run.data.complete)startLevel(save.run.level,true);
   else{var index=0;while(index<R.levels.length-1&&(save.bestStars[index]||0)>0)index++;startLevel(Math.min(index,save.unlocked),false);}
  });
  $("restartButton").addEventListener("click",function(){if(busy){skip=true;return;}startLevel(level,false);});
  $("powerButton").addEventListener("click",function(){if(busy||!game||!game.powers)return;
   if(!$("familyPicker").hidden){hide("familyPicker");powerFamily=null;deselect();}
   else{show("familyPicker");powerFamily=null;toast("Välj en naturfamilj för ditt nya frö.");}
  });
  document.querySelectorAll("[data-family]").forEach(function(button){button.addEventListener("click",function(){
   powerFamily=button.dataset.family;document.querySelectorAll("[data-family]").forEach(function(b){b.classList.toggle("active",b===button);});
   $("powerHint").textContent="Välj nu en ruta på spelplanen för ditt "+names[powerFamily]+"-frö.";deselect();toast("Välj rutan du vill ersätta.");
  });});
  $("cancelPower").addEventListener("click",function(){powerFamily=null;hide("familyPicker");deselect();});
  $("confirmPower").addEventListener("click",function(){if(pendingPower>=0)performPower(pendingPower);pendingPower=-1;});
  $("rejectPower").addEventListener("click",function(){pendingPower=-1;hide("confirmModal");});
  $("resultNext").addEventListener("click",function(){hide("resultModal");if(level<R.levels.length-1)startLevel(level+1,false);else menu();});
  $("resultRetry").addEventListener("click",function(){hide("resultModal");startLevel(level,false);});
  $("resultTree").addEventListener("click",openTree);
  $("closeTree").addEventListener("click",closeTree);
  $("closeTreeContinue").addEventListener("click",closeTree);
  document.querySelectorAll("[data-style]").forEach(function(b){b.addEventListener("click",function(){
   var type=b.dataset.style,req=type==="canopy"?90:type==="bloom"?180:0;if(save.totalEssence<req)return;
   save.style=type;persist();document.querySelectorAll("[data-style]").forEach(function(button){button.classList.toggle("active",button.dataset.style===type);});if(tree)tree.show(save.totalEssence,type);
  });});
  $("instructionsButton").addEventListener("click",function(){show("helpModal");});
  $("closeHelp").addEventListener("click",function(){hide("helpModal");});
  $("closeHelpBottom").addEventListener("click",function(){hide("helpModal");});
  document.querySelectorAll(".modal-backdrop").forEach(function(modal){modal.addEventListener("click",function(e){if(e.target!==modal)return;if(modal.id==="treeModal")closeTree();else if(modal.id==="plantLabModal")closePlantLab();else if(modal.id!=="resultModal"&&modal.id!=="confirmModal")hide(modal.id);});});
  $("boardCanvas").addEventListener("keydown",function(e){
   if(!game||busy||game.complete||game.failed)return;
   var k=e.key;if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," ","Escape"].indexOf(k)<0)return;e.preventDefault();
   if(k==="Escape"){deselect();return;}
   if(selected<0){select(24);return;}
   if(k===" "){select(selected);return;}
   var r=Math.floor(selected/7),c=selected%7;if(k==="ArrowLeft")c--;if(k==="ArrowRight")c++;if(k==="ArrowUp")r--;if(k==="ArrowDown")r++;
   if(r>=0&&r<7&&c>=0&&c<7){var to=r*7+c;if(powerFamily)plantPower(to);else performSwap(selected,to);}
  });
 }
 function main(){
  if(!R||!V||!window.BABYLON){show("loadError");return;}
  try{garden=new V.Garden($("boardCanvas"));bind();renderMenu();if(new URLSearchParams(window.location.search).get("lab")==="plants")openPlantLab();}catch(e){console.error(e);$("loadError").textContent="Kunde inte starta Daisugi Bloom: "+e.message;show("loadError");}
 }
 main();
})();