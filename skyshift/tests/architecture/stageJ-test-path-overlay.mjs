// Stage J reversible migration-only path inversion for strict historical Git SHA assertions.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const files=JSON.parse(readFileSync(resolve(root,'docs/architecture/stageJ-migration-manifest.json'),'utf8')).files;
export function restoreStageJPaths(contents) {
 let text=contents;
 for(const [name,{destination}] of Object.entries(files)) {
  const dir=destination.slice(0,-name.length);
  for(const prefix of ['../../','../','./']) text=text.split(prefix+dir+name).join(prefix+name);
  text=text.split('skyshift/'+dir+name).join('skyshift/'+name);
 }
 return text;
}
