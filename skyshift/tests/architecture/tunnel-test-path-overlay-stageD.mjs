// Invert ONLY Stage D tunnel/ path additions before Stage 5–8 immutable
// historical test-source SHA audits. Original audit manifests remain untouched.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(root,'tunnel/stageD-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==12)throw Error('Unexpected Stage D relocation count');

export function restoreStageDTunnelReferences(contents){
  let result=contents;
  for(const name of names){
    result=result.split('../../tunnel/'+name).join('../../'+name);
    result=result.split('./tunnel/'+name).join('./'+name);
  }
  return result;
}
