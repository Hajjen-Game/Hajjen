(()=>{
  // Zone 1 is the beginning of a new campaign. Loading it means starting over,
  // so no progression, crafted-spell library or later-zone restart snapshot
  // from an earlier campaign may leak into the fresh run.
  localStorage.removeItem('hajjen-v4b-campaign');
  localStorage.removeItem('hajjen-v4b-spell-library-v2');
  localStorage.removeItem('hajjen-v4b-zone2-entry-snapshot');
  localStorage.removeItem('hajjen-v4b-zone2-entry-spell-library');
})();