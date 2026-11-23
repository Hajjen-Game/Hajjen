// SKYSHIFT Architecture Cleanup 2.0 Stage N: source-identical ship HERO migration.
// Verify immutable original Git blobs, resolved glTF URLs and all consumers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,join,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const repo=resolve(root,'..');
const shipDir=resolve(root,'ships');
const manifest=JSON.parse(readFileSync(resolve(shipDir,'stageN-migration-manifest.json'),'utf8'));
const names=Object.keys(manifest.files);
const expected=[
 'ship-art-pipeline-v0132.mjs','ship-art-pipeline-v0133.mjs',
 'ship-art-pipeline-v0134.mjs','ship-art-pipeline-v01342.mjs',
 'ship-hero-loader-v0132.mjs','ship-hero-loader-v01321.mjs',
 'ship-hero-loader-v0133.mjs','ship-hero-loader-v0134.mjs',
 'ship-hero-loader-v01342.mjs',
 'stingray-presentation-v01342.mjs','stingray-presentation-v01343.mjs',
 'stingray-presentation-v01344.mjs','stingray-presentation-v01345.mjs',
 'stingray-presentation-v01346.mjs',
 'hangar-hero-v0133.mjs','hangar-hero-v0134.mjs'];
function gitBlobSha(contents){
 const b=Buffer.from(contents,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function walk(dir,out=[]){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,item.name);
  if(item.isDirectory())walk(p,out);
  else if(item.isFile()&&['.js','.mjs','.html','.yml','.yaml'].includes(extname(p)))out.push(p);
 }
 return out;
}

test('16 original Stingray HERO source Git hashes and original asset URLs are preserved',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.deepEqual([...names].sort(),[...expected].sort());
 let dependent=0,unchanged=0,verifiedModels=0;
 for(const name of names){
  const record=manifest.files[name];
  const moved=resolve(shipDir,name);
  assert.equal(record.destination,'skyshift/ships/'+name);
  assert.ok(!existsSync(resolve(root,name)),'Legacy root path still exists: '+name);
  assert.ok(existsSync(moved),'Missing relocated HERO module: '+name);
  const source=readFileSync(moved,'utf8');
  const oldSource=record.assetPathRebased?
   source.replaceAll('../assets/ships/','./assets/ships/'):source;
  assert.equal(gitBlobSha(oldSource),record.originalGitBlobSha,
   'Unexpected changes beyond permitted relative asset URLs: '+name);
  if(record.assetPathRebased){
   dependent++;
   assert.ok(source.includes('../assets/ships/'),name+' must use rebased asset URL');
   assert.ok(!source.includes('"./assets/ships/'),name+' still uses root-relative URL');
  }else unchanged++;
  if(name.startsWith('ship-hero-loader-')){
   assert.match(source,/new URL\((?:srcPath|SHIP_ART_\d+\.(?:assetPath|previewAssetPath)),import\.meta\.url\)/);
   assert.ok(source.includes('new URL("../assets/ships/",import.meta.url)'),
    'glTF auxiliary resource base must remain anchored in assets/ships: '+name);
  }
  for(const match of source.matchAll(/(?:assetPath|previewAssetPath|blenderAssetPath):"(\.\.\/assets\/ships\/[^"\s]+)"/g)){
   const url=new URL(match[1],pathToFileURL(moved));
   const actual=fileURLToPath(url);
   assert.equal(dirname(actual),resolve(root,'assets/ships'));
   if(actual.endsWith('.gltf')){
    assert.ok(existsSync(actual),'Missing deployed glTF: '+actual);
    verifiedModels++;
   }
  }
  for(const m of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)){
   const target=resolve(dirname(moved),m[1].split(/[?#]/)[0]);
   assert.ok(existsSync(target),'Unresolved ship HERO sibling import '+name+' -> '+m[1]);
  }
 }
 assert.equal(dependent,9);
 assert.equal(unchanged,7);
 assert.ok(verifiedModels>=4,'Four original deployed glTF models must remain reachable');
});

test('all historical/runtime games, unit suites and CI use the new ship HERO source paths',()=>{
 const files=[...walk(root),...walk(resolve(repo,'.github/workflows'))];
 let checked=0;
 for(const file of files){
  const source=readFileSync(file,'utf8');
  checked++;
  for(const name of names){
   assert.ok(!source.includes('skyshift/'+name),
    'Stale root CI/path reference in '+relative(repo,file)+' -> '+name);
   if(file.startsWith(shipDir+sep))continue; // source siblings legitimately import each other.
   const oldName=name.replaceAll('.','\\.');
   const stale=new RegExp('["\\x27](?:\\./|(?:\\.\\./)+)'+oldName+'(?:["\\x27?])');
   assert.doesNotMatch(source,stale,
    'Stale source import in '+relative(repo,file)+' -> '+name);
  }
 }
 assert.ok(checked>200,'Expected complete SKYSHIFT source and historical tests audit');
});
