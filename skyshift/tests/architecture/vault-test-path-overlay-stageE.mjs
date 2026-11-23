// Inverts only Stage E Vault-specific relative source paths before Stage 5–8
// original test SHA verification. No assertions or historic SHA are relaxed.
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(root,'tracks/vault/stageE-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if(names.length!==7)throw Error('Stage E Vault module count changed');

export function restoreStageEVaultReferences(contents){
 let source=contents;
 for(const name of names){
  source=source.split('../../tracks/vault/'+name).join('../../'+name);
  source=source.split('./tracks/vault/'+name).join('./'+name);
 }
 return source;
}
