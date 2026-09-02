(()=>{
  // Zone 1 is the beginning of a new campaign. Loading it means starting over,
  // so no progression or crafted-spell library from an earlier campaign may
  // leak into the fresh run. Zone 1 -> Zone 2 persistence is created later by
  // the normal campaign save flow when the player advances.
  localStorage.removeItem('hajjen-v4b-campaign');
  localStorage.removeItem('hajjen-v4b-spell-library-v2');
})();
