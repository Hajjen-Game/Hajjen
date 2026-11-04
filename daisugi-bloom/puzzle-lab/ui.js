/* Japanese Harmony — non-persistent 7x7 Puzzle Architect developer UI. */
"use strict";
(()=>{
const R=window.HarmonyRules,A=window.HarmonyPuzzleArchitect,D=window.HarmonyJourneyDrafts;
const F=["sakura","lantern","koi","fan","bonsai","sushi","maneki","origami","ryu"];
const N={sakura:"Sakura",lantern:"Lantern",koi:"Koi",fan:"Fan",bonsai:"Bonsai",
 sushi:"Sushi",maneki:"Neko",origami:"Origami",ryu:"Ryū"};
const ICON={sakura:"✿",lantern:"灯",koi:"鯉",fan:"扇",bonsai:"木",
 sushi:"寿",maneki:"猫",origami:"折",ryu:"龍",
 moonMirror:"◇",hanabiCrate:"□",lotusSeed:"✦",daruma:"達",sealedStone:"◆",terrain:"×"};
const BG={sakura:"#ead0d2",lantern:"#e6c996",koi:"#e7b7a1",fan:"#cfc2dc",
 bonsai:"#bccbac",sushi:"#e7cbba",maneki:"#eadbaa",origami:"#bed8e7",ryu:"#9dc9bd"};
const $=id=>document.getElementById(id);
let blueprint=null,template=null,currentFamily="sakura",worker=null,lastReport=null;
const make=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined&&text!==null)el.textContent=String(text);
 if(cls)el.className=cls;
 return el;
};
const seed=()=>{
 const value=Number($("seed").value);
 if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error("Seed måste vara uint32");
 return value;
};
function status(message,valid){
 $("boardStatus").textContent=message;
 $("boardStatus").className="status"+(valid===true?" good":valid===false?" bad":"");
}
function snapshotFields(){
 if(!blueprint)return;
 blueprint.insight=$("insight").value;
 blueprint.primarySkill=$("skill").value;
 blueprint.secondarySkill=$("secondary").value.trim()||null;
 blueprint.sequence=$("sequence").value.split("\n").map(x=>x.trim()).filter(Boolean);
}
function populateFields(){
 $("insight").value=blueprint.insight;
 $("skill").value=blueprint.primarySkill;
 $("secondary").value=blueprint.secondarySkill||"";
 $("sequence").value=blueprint.sequence.join("\n");
}
function load(){
 try{
  const index=Number($("level").value);
  const recipe=D.get(index);
  if(!recipe)throw Error("Nivå saknas");
  const m=recipe.mechanics;
  blueprint=A.create(R,recipe,{seed:seed(),directorMode:$("mode").value,
   insight:recipe.intro,
   primarySkill:m.hanabi?"Hanabi delivery path":m.mirrors.length?
    "Mirror Fusion destination":m.wind?"Wind timing":"Treasure development",
   secondarySkill:m.mirrors.length&&m.hanabi?"Firework positioning":m.wind?
    "Forecast moving rows":null,
   sequence:["Read the board and choose a useful destination",
    "Prepare a match that moves the intended objective",
    "Trigger the mechanic and exploit the new configuration"]});
  template=A.captured(R,recipe,seed(),$("mode").value).game;
  currentFamily=R.activeFamilies(index,index<10?4:5)[0];
  populateFields();
  $("levelInfo").textContent=(index+1)+". "+recipe.name+" · "+recipe.moves+
   " drag · "+recipe.goal.type+(recipe.goal.requires?
   " + "+recipe.goal.requires.map(x=>x.type).join(" + "):"");
  render();validate();
  $("results").replaceChildren();
  $("analysisStatus").textContent="Startbräde hämtat. Kör ny analys för detta recept.";
  $("downloadReport").disabled=true;lastReport=null;
 }catch(e){status(e.message,false);}
}
function palette(){
 const active=R.activeFamilies(blueprint.recipe.index,blueprint.recipe.index<10?4:5);
 const holder=$("families");holder.replaceChildren();
 for(const f of active){
  const b=make("button",ICON[f]+" "+N[f],"family"+(currentFamily===f?" active":""));
  b.type="button";b.setAttribute("aria-pressed",String(currentFamily===f));
  b.addEventListener("click",()=>{currentFamily=f;render();});
  holder.append(b);
 }
}
function geometryText(){
 const m=blueprint.recipe.mechanics,out=[];
 if(m.hanabi)for(const start of m.hanabi.starts){
  const crate=m.hanabi.crates.find(c=>c%7===start%7);
  out.push("Hanabi: "+cellName(start)+" → "+(crate===undefined?"ingen matchad låda":cellName(crate)));
 }
 for(const mirror of m.mirrors){
  const delta={up:-7,down:7,left:-1,right:1}[mirror.direction];
  out.push("Mirror: "+cellName(mirror.at)+" → "+cellName(mirror.at+delta));
 }
 if(m.wind)out.push("Wind: var "+m.wind.every+":e giltiga drag, rader "+
  m.wind.steps.map(x=>(x.row+1)+" "+x.direction).join(", "));
 if(m.mist.length)out.push("Mist: "+m.mist.map(cellName).join(", "));
 if(m.daruma.length)out.push("Daruma: "+m.daruma.map(cellName).join(", "));
 if(m.sealedStones.length)out.push("Sealed Stones: "+m.sealedStones.map(cellName).join(", "));
 $("geometry").textContent=out.join("\n")||"Ingen fast mekanik på detta bräde.";
}
function cellName(i){return "ABCDEFG"[i%7]+(Math.floor(i/7)+1);}
function render(){
 if(!blueprint)return;
 palette();geometryText();
 const m=blueprint.recipe.mechanics,board=$("board");board.replaceChildren();
 const route=new Set((m.hanabi?.starts||[]).flatMap(start=>{
  const crate=m.hanabi.crates.find(x=>x%7===start%7);
  const cells=[];if(crate!==undefined)for(let i=start+7;i<crate;i+=7)cells.push(i);
  return cells;
 }));
 const targets=new Set(m.mirrors.map(x=>x.at+({up:-7,down:7,left:-1,right:1}[x.direction])));
 const windRows=new Set((m.wind?.steps||[]).map(x=>x.row));
 for(let i=0;i<49;i++){
  const fixture=template.board[i],fixed=A.FIXED.has(fixture?.family);
  const family=fixed?fixture.family:blueprint.opening.grid[i];
  const b=make("button",null,"tile"+
   (fixed?" fixed":"")+(windRows.has(Math.floor(i/7))?" wind":"")+
   (route.has(i)?" route":"")+(m.mist.includes(i)?" mist":"")+
   (targets.has(i)?" target":"")+(currentFamily===family&&!fixed?" paint":""));
  b.type="button";b.dataset.cell=String(i);
  const symbol=make("span",ICON[family]||"?");
  const caption=make("small",cellName(i)+" "+(fixed?family:(N[family]||family)));
  b.append(symbol,caption);b.setAttribute("aria-label",cellName(i)+" "+(fixed?
   "Fast "+family:"Familj "+family));
  if(!fixed){b.style.background=BG[family]||"#e1cfb0";
   b.addEventListener("click",()=>{
    blueprint.opening.grid[i]=currentFamily;
    blueprint.opening.provenance="hand-authored";
    render();
    status("Brädet är ändrat. Kör Kontrollera layout innan simuleringen.",null);
   });
  }else b.disabled=true;
  board.append(b);
 }
}
function validate(){
 if(!blueprint)return false;
 try{
  snapshotFields();
  const info=A.inspect(R,blueprint,{seed:seed(),directorMode:$("mode").value});
  status("Giltigt bräde: "+info.legalSwaps+" möjliga riktiga startdrag. "+
   info.fixed.length+" fasta objekt. "+
   (info.warnings.join(" ")||"Inga öppningsfel. Detta bevisar inte att nivån går att klara."),true);
  return true;
 }catch(e){status("Layouten går inte att spela: "+e.message,false);return false;}
}
function download(data,filename){
 const bytes=new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json"});
 const url=URL.createObjectURL(bytes);
 const a=make("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function report(data){
 const holder=$("results");holder.replaceChildren();
 const heading=make("h3","Resultat – "+data.level+" / "+data.blueprintId);
 holder.append(heading);
 const table=make("table",null,"report"),thead=make("thead");
 const hr=make("tr");
 for(const h of ["Strategi","Vinst","P50 drag","≤3 drag","Shuffles","Första framsteg"]){
  const col=make("th",h);hr.append(col);
 }
 thead.append(hr);table.append(thead);
 const body=make("tbody");
 for(const name of data.strategies){
  const stats=data.byStrategy[name],tr=make("tr");
  for(const s of [name,stats.wins+"/"+stats.attempts,
   stats.winningMoves.p50??"—",stats.winsWithinThreeMoves,
   stats.avgShuffles,stats.avgFirstProgressTurn]){
   tr.append(make("td",s));
  }
  body.append(tr);
 }
 table.append(body);holder.append(table);
 if(data.signals.length){
  const signals=make("ul",null,"flags");
  for(const flag of data.signals)signals.append(make("li",flag));
  holder.append(signals);
 }
 holder.append(make("p",data.caveat,"meta"));
}
function analyze(){
 if(!validate())return;
 if(worker){worker.terminate();worker=null;}
 snapshotFields();
 const runBtn=$("run");runBtn.disabled=true;
 $("analysisStatus").textContent="Difficulty Lab spelar riktiga rundor i separat worker…";
 $("results").replaceChildren();$("downloadReport").disabled=true;
 worker=new Worker("./worker.js?v=1.0.0");
 worker.onmessage=e=>{
  runBtn.disabled=false;
  const data=e.data;
  if(data?.ok){
   lastReport=data.result;report(lastReport);
   $("analysisStatus").textContent="Klar: "+lastReport.runs.length+
    " riktiga simulerade rundor. Botresultat är inte mänskliga vinstandelar.";
   $("downloadReport").disabled=false;
  }else $("analysisStatus").textContent="Analysen misslyckades: "+(data?.error||"okänt fel");
  worker?.terminate();worker=null;
 };
 worker.onerror=e=>{
  runBtn.disabled=false;
  $("analysisStatus").textContent="Worker-fel: "+e.message;
  worker?.terminate();worker=null;
 };
 worker.postMessage({blueprint:A.normalize(blueprint,R),options:{
  trials:Number($("trials").value),baseSeed:seed(),directorMode:$("mode").value,
  maxCandidates:7,maxTurns:120}});
}
function initialize(){
 for(let i=0;i<D.COUNT;i++){
  const d=D.get(i),opt=make("option",(i+1)+". "+d.name);
  opt.value=String(i);$("level").append(opt);
 }
 $("level").value="19";
 $("level").addEventListener("change",load);
 $("seed").addEventListener("change",load);
 $("capture").addEventListener("click",()=>{
  if(!blueprint)return;try{
   const sample=A.captured(R,blueprint.recipe,seed(),$("mode").value);
   blueprint.opening=sample.opening;template=sample.game;render();validate();
  }catch(e){status(e.message,false);}
 });
 $("validate").addEventListener("click",validate);
 $("export").addEventListener("click",()=>{
  if(validate())download(A.normalize(blueprint,R),blueprint.id+".json");
 });
 $("run").addEventListener("click",analyze);
 $("downloadReport").addEventListener("click",()=>{
  if(lastReport)download(lastReport,blueprint.id+"-difficulty-lab.json");
 });
 load();
}
if(!R||!A||!D){$("boardStatus").textContent="Kunde inte ladda spelmotorn.";return;}
initialize();
})();
