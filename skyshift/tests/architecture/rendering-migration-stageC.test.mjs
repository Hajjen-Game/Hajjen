// SKYSHIFT Architecture Cleanup 2.0 Stage C — strict reversible live-rendering migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skyshift = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rendering = resolve(skyshift, 'rendering');
const workflows = resolve(skyshift, '..', '.github', 'workflows');
const manifest = JSON.parse(readFileSync(resolve(rendering,'stageC-migration-manifest.json'),'utf8'));
const names = Object.keys(manifest.files);

function gitBlobSha(bytes) {
  return createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
}
function walk(dir, result = []) {
  for (const f of readdirSync(dir, {withFileTypes:true})) {
    const path = join(dir, f.name);
    if (f.isDirectory()) walk(path, result);
    else if(f.isFile() && ['.js','.mjs','.html','.yml','.yaml'].includes(extname(path))) result.push(path);
  }
  return result;
}

test('14 moved rendering modules preserve their original content after import-path inversion', () => {
  assert.equal(manifest.schemaVersion,1);
  assert.equal(names.length,14);
  for (const name of names) {
    assert.match(name,/^[a-z0-9-]+\.mjs$/);
    assert.equal(existsSync(resolve(skyshift,name)),false,'Old runtime module still in root: '+name);
    const full=resolve(rendering,name);
    assert.equal(existsSync(full),true,'Missing moved runtime module: '+name);
    const config=manifest.files[name];
    let content=readFileSync(full,'utf8'),restored=content;
    for (const external of config.externalImports) {
      const rebase='../'+external;
      assert.ok(restored.includes(rebase),'Expected rebased external import '+name+' -> '+rebase);
      restored=restored.split(rebase).join('./'+external);
      assert.ok(existsSync(resolve(skyshift,external)),'External source missing: '+external);
    }
    assert.equal(gitBlobSha(Buffer.from(restored,'utf8')),config.originalGitBlobSha,
      'Unexpected non-import source modifications in '+name);
    for (const match of content.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const target=resolve(dirname(full),match[1].split(/[?#]/)[0]);
      assert.ok(existsSync(target),'Unresolved ESM import '+name+' -> '+match[1]);
    }
  }
});

test('no old relocated module path remains in executable source or GitHub workflows', () => {
  const files=[...walk(skyshift),...walk(workflows)];
  const ignore=new Set([resolve(rendering,'stageC-migration-manifest.json'),fileURLToPath(import.meta.url)]);
  let checked=0;
  for(const file of files) {
    if (ignore.has(file) || file.endsWith('README.md')) continue;
    const text=readFileSync(file,'utf8');
    checked++;
    for(const name of names){
      if (file.startsWith(workflows)) {
        assert.equal(text.includes('skyshift/'+name),false,'Stale CI path: '+relative(skyshift,file)+' -> '+name);
        continue;
      }
      // Calls with a literal relative module basename must point into
      // rendering/, unless another already-moved module imports its sibling.
      const escaped=name.replace(/\./g,'\\.');
      const pathRegex=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]','g');
      if(file.startsWith(rendering+'/')) continue;
      assert.doesNotMatch(text,pathRegex,'Stale relative module target '+relative(skyshift,file)+' -> '+name);
    }
  }
  assert.ok(checked>200,'Unexpectedly small executable-source scan');
});
