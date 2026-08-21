export function createZoneSystem(state, renderSharkan, toast) {
  function goZone(z,x,y){
    document.querySelector(".scene.active").classList.remove("active");
    document.getElementById(z).classList.add("active");
    state.zone=z;
    if(z==="ember"){
      state.x=220;state.y=180;state.dir="down";
      document.getElementById("zoneName").textContent="Ember Hollow";
      document.getElementById("zoneSub").textContent="Primal Force: Ember";
      toast("Entered Ember Hollow");
    }else{
      state.x=x??300;state.y=y??700;state.dir="right";
      document.getElementById("zoneName").textContent="The Crossroads";
      document.getElementById("zoneSub").textContent="Introduction Zone";
      toast("Returned to The Crossroads");
    }
    renderSharkan();
  }
  return { goZone };
}
