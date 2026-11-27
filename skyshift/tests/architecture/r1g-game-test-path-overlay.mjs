// R1G exact inverse of approved source-reader paths and archived boot target updates.
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../legacy/game/R1G-migration-manifest.json',import.meta.url),'utf8'));
const l1f=JSON.parse(readFileSync(new URL('../../docs/architecture/legacy-retirement-l1f.json',import.meta.url),'utf8'));
const l1h=JSON.parse(readFileSync(new URL('../../docs/architecture/root-relocation-l1h.json',import.meta.url),'utf8'));
const ef02e=JSON.parse(readFileSync(new URL('../../docs/architecture/ef02-retirement-early-snapshots.json',import.meta.url),'utf8'));
export function restoreR1GGamePaths(source){
 let out=source.replace('import {readEF08Source as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";','import {readFileSync} from "node:fs";');
 // EF02E: reverse only the recorded archive reader import, preserving original test hashes.
 if(ef02e.files.some(f=>source.includes(f.path.split('/').at(-1))))out=out.replace("import {readHistorical as readFileSync} from \"../architecture/legacy-retirement-l1a.mjs\";","import {readFileSync} from \"node:fs\";");
 for(const r of l1h.readers)for(const e of r.edits)out=out.split(e.after).join(e.before);
 // L1F: reverse only the approved source-reader filesystem adapter import.
 if(l1f.files.some(f=>source.includes(f.path.split('/').at(-1))))out=out.replace('import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";','import {readFileSync} from "node:fs";');
 if(["0131","0132","01321","0133","0134","01341","01342","01343","01344","01345"].some(v=>source.includes('legacy/game/game-v'+v+'.mjs')))out=out.replace("import {readHistorical as readFileSync} from \"../architecture/legacy-retirement-l1a.mjs\";","import {readFileSync} from \"node:fs\";");
 if(["01346","01347","01348","0140","0150","0151","0160","0161","0163","031","032","033","034","04","041","042","043","044","045","046","047","048","0481","0482","0483","0484","049","0491"].some(v=>source.includes('legacy/game/game-v'+v+'.mjs')))out=out.replace("import {readHistorical as readFileSync} from \"../architecture/legacy-retirement-l1a.mjs\";",source.includes('legacy/game/game-v031.mjs')?"import { readFileSync } from \"node:fs\";":"import {readFileSync} from \"node:fs\";");
 if(["0180","0190","0192","0200","0201","0202","02021","0204","02041","0104","0105","0106","0107","01071","0108","0109","01091","0110","0111","0112","0113","0114","0120","0121","0130"].some(v=>source.includes('./legacy/game/game-v'+v+'.mjs')))out=out.replace("import {readHistorical as readFileSync} from \"../architecture/legacy-retirement-l1a.mjs\";","import {readFileSync} from \"node:fs\";");
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
