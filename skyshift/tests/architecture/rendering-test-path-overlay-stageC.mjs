// Stage C path-only overlay for the ORIGINAL Stage 5–8 Git blob invariants.
// Reverses ONLY the 14 known rendering/ path additions before the original
// migration audits reverse their earlier test-directory moves.
// The old hashes, assertion text and original migration manifests remain intact.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest=JSON.parse(readFileSync(resolve(root,'rendering/stageC-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
if (names.length !== 14) throw Error('Unexpected Stage C rendering relocation count');

export function restoreStageCRenderingReferences(source) {
  let result=source;
  for (const name of names) {
    result=result.split('../../rendering/'+name).join('../../'+name);
    result=result.split('./rendering/'+name).join('./'+name);
  }
  return result;
}
