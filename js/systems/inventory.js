export function createInventorySystem(state) {
  const panel=document.getElementById("inventory");
  const grid=document.getElementById("inventoryGrid");

  function render(){
    grid.innerHTML="";
    if(!state.inventory.length){
      grid.innerHTML='<div class="empty">Your backpack is empty. The six primal-force teachers will each give you something to begin your collection.</div>';
      return;
    }
    state.inventory.forEach(it=>{
      const d=document.createElement("div");
      d.className="item";
      d.innerHTML=`<div class="ico">🔥</div><b>${it.name}</b><div class="tags">${it.force}<br>${it.traits.join(" · ")}<br><br>${it.desc}</div>`;
      grid.appendChild(d);
    });
  }

  return { panel, render };
}
