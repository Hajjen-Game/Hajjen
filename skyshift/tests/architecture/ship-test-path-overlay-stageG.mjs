// Stage G path-only reversible overlay for the unchanged historical test
// SHA checks from stages 5-8. Revert only the 8 allowlisted ships/ prefixes.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const skyshift=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(skyshift,'ships/stageG-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==8)throw Error('Stage G ship count changed');

export function restoreStageGShipReferences(contents){
 let source=contents;
 for(const name of names){
  source=source.split('../../ships/'+name).join('../../'+name);
  source=source.split('../ships/'+name).join('../'+name);
  source=source.split('./ships/'+name).join('./'+name);
  source=source.split('skyshift/ships/'+name).join('skyshift/'+name);
 }
 return source;
}
