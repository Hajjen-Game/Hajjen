import {restoreTrialMove,trialCurrentPath} from './ef02-closure-trial-overlay.mjs';
// SKYSHIFT Architecture Cleanup 2.0 — Stage D live tunnel migration guard.
// Only source import paths change. Verify original immutable SHA after inversion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const tunnel=resolve(root,'tunnel');
const workflows=resolve(root,'../.github/workflows');
const manifest=JSON.parse(readFileSync(resolve(tunnel,'stageD-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
const importedSource=/\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g;

function sha(bytes) {
  return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function walk(dir, out=[]) {
  for(const f of readdirSync(dir,{withFileTypes:true})) {
    const full=join(dir,f.name);
    if(f.isDirectory())walk(full,out);
    else if(f.isFile()&&['.js','.mjs','.html','.yml','.yaml'].includes(extname(full)))out.push(full);
  }
  return out;
}

test('12 tunnel optics modules reproduce exact original Git blobs with only import rebases',()=>{
  assert.equal(manifest.schemaVersion,1);
  assert.equal(names.length,12);
  const owned=new Set(names);
  for(const name of names) {
    assert.match(name,/^[\w-]+\.mjs$/);
    assert.ok(!existsSync(resolve(root,name)),'Old live root module remained: '+name);
    const path=resolve(tunnel,name);
    assert.ok(existsSync(path),'Missing moved tunnel module: '+name);
    const actual=readFileSync(path,'utf8');
    const source=restoreTrialMove(actual,path);
    let original=source;
    for(const external of manifest.files[name].externalImports){
      assert.ok(existsSync(trialCurrentPath(resolve(root,external))),'Missing root external: '+external);
      assert.ok(source.includes('../'+external),'Missing permitted external import rebase: '+name+' -> '+external);
      original=original.split('../'+external).join('./'+external);
    }
    assert.equal(sha(Buffer.from(original,'utf8')),manifest.files[name].originalGitBlobSha,
      'Unexpected changes to actual tunnel shader, optics, lighting or logic: '+name);
    for(const match of actual.matchAll(importedSource)){
      const dest=resolve(dirname(path),match[1].split(/[?#]/)[0]);
      assert.ok(existsSync(dest),'Broken tunnel module import '+name+' -> '+match[1]);
      const relativePath=relative(root,dest);
      assert.ok(relativePath && relativePath!=='..' && !relativePath.startsWith('..'+sep),
        'Module escaped SKYSHIFT source root: '+name);
    }
    for(const n of owned) if(n!==name)
      assert.doesNotMatch(source,new RegExp('["\\x27]\\.\\./'+n.replaceAll('.','\\.')+'["\\x27]'),
        'Moved sibling incorrectly imported from root: '+name+' -> '+n);
  }
});

test('live code, historical tests and workflows cannot refer to removed root module paths',()=>{
  const files=[...walk(root),...walk(workflows)];
  let checked=0;
  for(const f of files) {
    if(f===fileURLToPath(import.meta.url))continue;
    const contents=readFileSync(f,'utf8');
    checked++;
    for(const name of names){
      if(f.startsWith(workflows)){
        assert.equal(contents.includes('skyshift/'+name),false,
          'Unrebased GitHub workflow: '+relative(root,f)+' -> '+name);
      }else if(!f.startsWith(tunnel+sep)){
        const escaped=name.replaceAll('.','\\.');
        const old=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+escaped+'["\\x27]');
        assert.doesNotMatch(contents,old,'Unrebased source/test path: '+relative(root,f)+' -> '+name);
      }
    }
  }
  assert.ok(checked>200,'Unexpectedly few executable source files');
});
