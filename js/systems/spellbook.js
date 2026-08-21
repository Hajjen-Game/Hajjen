export function createSpellbookSystem() {
  const panel=document.getElementById("spellbook");
  const slots=document.getElementById("spellSlots");

  function render(){
    slots.innerHTML="";
    for(let i=0;i<4;i++){
      const d=document.createElement("div");
      d.className="slot";
      d.innerHTML=`Ingredient slot ${i+1}<br><span style="opacity:.55">empty</span>`;
      slots.appendChild(d);
    }
  }

  return { panel, render };
}
