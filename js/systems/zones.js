export function createZoneSystem(state, renderSharkan, toast) {
  let transitionLockedUntil=0;

  function goZone(z,x,y){
    const now=performance.now();
    if(now<transitionLockedUntil)return;
    transitionLockedUntil=now+700;

    document.querySelector(".scene.active").classList.remove("active");
    document.getElementById(z).classList.add("active");
    state.zone=z;

    if(z==="ember"){
      // Spawn safely inside Ember, well away from the return trigger at 190,165.
      // This point sits directly on the first Ember path segment.
      state.x=360;
      state.y=253;
      state.dir="down";
      document.getElementById("zoneName").textContent="Ember Hollow";
      document.getElementById("zoneSub").textContent="Primal Force: Ember";
      toast("Entered Ember Hollow");
    }else{
      // Spawn safely back on the Ember branch of the Crossroads path.
      state.x=x??340;
      state.y=y??702;
      state.dir="right";
      document.getElementById("zoneName").textContent="The Crossroads";
      document.getElementById("zoneSub").textContent="Introduction Zone";
      toast("Returned to The Crossroads");
    }

    state.moving=false;
    state.walkClock=0;
    state.walkFrame=0;
    renderSharkan();
  }

  return { goZone };
}
