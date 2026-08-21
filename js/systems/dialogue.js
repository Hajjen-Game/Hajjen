import { ASSETS } from "../config.js";

export function createDialogueSystem() {
  const dialogue=document.getElementById("dialogue");
  const speaker=document.getElementById("speaker");
  const line=document.getElementById("line");
  const portrait=document.getElementById("portrait");
  const next=document.getElementById("next");
  let current={lines:[],i:0,done:null};

  function showLine(){
    const [sp,tx]=current.lines[current.i];
    speaker.textContent=sp;
    line.textContent=tx;
    portrait.style.backgroundImage =
      sp==="Professor Morrow" ? `url("${ASSETS.portraits.professor}")` :
      sp==="Ember Keeper" ? `url("${ASSETS.portraits.emberKeeper}")` :
      `url("${ASSETS.sharkan.down}")`;
    dialogue.classList.add("show");
  }

  function start(lines,done){
    current={lines,i:0,done};
    showLine();
  }

  next.addEventListener("click",()=>{
    current.i++;
    if(current.i>=current.lines.length){
      dialogue.classList.remove("show");
      if(current.done)current.done();
    }else showLine();
  });

  return { start, isOpen:()=>dialogue.classList.contains("show") };
}
