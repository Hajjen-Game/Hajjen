// R1G exact inverse of approved source-reader paths and archived boot target updates.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/game/R1G-migration-manifest.json',import.meta.url),'utf8'));
export function restoreR1GGamePaths(source){
 let out=source;
 // Scoped R1G post-merge repair: these archived game readers assert the rebased ESM imports.
 if(["0200","0201","0202","02021","0204","02041","0205","0135","0192","0180","0190"].some(v=>source.includes('./legacy/game/game-v'+v+'.mjs'))){
  out=out.split("assert.match(game,/from \"\\.\\.\\/\\.\\.\\/").join("assert.match(game,/from \"\\.\\/");
  out=out.split("game.includes('from \"../../'+").join("game.includes('from \"./'+");
 }
 for(const {name,version} of manifest.files){
  for(const [a,b] of [['../../legacy/game/'+name,'../../'+name],['./legacy/game/'+name,'./'+name],['legacy/game/'+name,name]])for(const q of ['"',"'"])out=out.split(q+a+q).join(q+b+q);
  out=out.split("\\.\\.\\/game\\/game-v"+version+'\\.mjs').join("\\.\\.\\/\\.\\.\\/game-v"+version+'\\.mjs');
 }
 // Only the seven explicitly audited historical v0165 ESM import assertions.
 const v0165ImportPairs=[
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/trial-v0165\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/trial-v0165\\.mjs\"/);"
  ],
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/tracks\\/barriers\\/aero-barrier-v0165\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/tracks\\/barriers\\/aero-barrier-v0165\\.mjs\"/);"
  ],
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/shadow-tunnel-v0160\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/shadow-tunnel-v0160\\.mjs\"/);"
  ],
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/flight\\/cinematic-v0165\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/flight\\/cinematic-v0165\\.mjs\"/);"
  ],
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/flight\\/unified-flight-v0165\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/flight\\/unified-flight-v0165\\.mjs\"/);"
  ],
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/rail-scrape-sparks-v0165\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/rail-scrape-sparks-v0165\\.mjs\"/);"
  ],
  [
    "assert.match(game,/from \"\\.\\.\\/\\.\\.\\/time-trial-v0160\\.mjs\"/);",
    "assert.match(game,/from \"\\.\\/time-trial-v0160\\.mjs\"/);"
  ]
];
 for(const [a,b] of v0165ImportPairs)out=out.split(a).join(b);
 return out;
}
export function restoreR1GBootImport(source){
 let out=source;
 for(const {version} of manifest.bootstraps)out=out.split('import("../game/game-v'+version+'.mjs').join('import("../../game-v'+version+'.mjs');
 return out;
}
