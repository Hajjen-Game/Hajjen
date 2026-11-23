// Stage H path-only reversible overlay: original Stage 5–8 test SHAs remain unchanged.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const skyshift=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(skyshift,'flight/stageH-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==18)throw Error('Stage H flight inventory has changed');
export function restoreStageHFlightReferences(contents){
 let source=contents;
 for(const name of names){
  source=source.split('../../flight/'+name).join('../../'+name);
  source=source.split('../flight/'+name).join('../'+name);
  source=source.split('./flight/'+name).join('./'+name);
  source=source.split('skyshift/flight/'+name).join('skyshift/'+name);
 }
 // Invert only allowlisted source-path regex/string literals added for Stage H.
 for(const name of names){
  const stem=name.replace(/\.mjs$/,'');
  source=source.split('"flight/'+stem+'"').join('"'+stem+'"');
  const escaped=name.replaceAll('.',String.raw`\.`);
  source=source.split(String.raw`\.\/flight\/`+escaped).join(String.raw`\.\/`+escaped);
 }
 if(source.includes('const realCamera=src("./cinematic-v0165.mjs")')){
  source=source.split(String.raw`from "\.\.\/trial-v0165\.mjs"`).join(String.raw`from "\.\/trial-v0165\.mjs"`);
 }
 return source;
}
