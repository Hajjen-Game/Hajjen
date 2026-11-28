// Exact artifact byte checks, used for both local Pages rehearsal and live deploy.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
const here=dirname(fileURLToPath(import.meta.url));
const expected=JSON.parse(await readFile(join(here,'site/skyshift/publication.json'),'utf8'));
const base=new URL(process.argv[2]||'https://hajjen-game.github.io/Hajjen/');
const retries=Number(process.argv[3]||1);
assert.ok(Number.isInteger(retries)&&retries>0);
const sha=b=>createHash('sha256').update(b).digest('hex');
async function get(path,bust=true){
 const url=new URL(path,base);
 if(bust)url.searchParams.set('release',expected.commit.slice(0,12)+'-'+Date.now());
 const r=await fetch(url,{headers:bust?{'Cache-Control':'no-cache'}:{},signal:AbortSignal.timeout(25000)});
 assert.ok(r.ok,path+' HTTP '+r.status);
 return {body:Buffer.from(await r.arrayBuffer()),cache:r.headers.get('cache-control'),etag:r.headers.get('etag'),mime:r.headers.get('content-type')};
}
async function verify(){
 const actual=JSON.parse((await get('skyshift/publication.json')).body.toString());
 assert.equal(actual.commit,expected.commit,'stale published commit');assert.deepEqual(actual,expected);
 const entries=[...expected.production,...expected.preserved],cache=[];
 for(const f of entries){
  const r=await get(f.path);assert.equal(sha(r.body),f.sha256,f.path+' public bytes mismatch');
  if(f.path.startsWith('skyshift/bundles/')){
   assert.match(f.path,/-[A-Za-z0-9_-]{8,}\.(?:js|css)$/);
   assert.match(r.mime||'',f.path.endsWith('.css')?/text\/css/:/(?:javascript|ecmascript)/);
   const warm=await get(f.path,false);assert.equal(sha(warm.body),f.sha256,f.path+' cache returned wrong content');
   cache.push({path:f.path,cacheControl:warm.cache,etag:warm.etag});
  }
 }
 for(const path of ['skyshift/','skyshift/?track=vault&v=0.28.9.7','skyshift/?track=vault&v=0.29.0&vaultJump=1','skyshift/?track=vault&v=0.29.1&vaultJump=1','skyshift/?track=vault&v=0.29.2&vaultJump=1','skyshift/?track=vault&v=0.29.3&vaultJump=1','skyshift/?track=vault&v=0.29.3.1&vaultJump=1','skyshift/?track=vault&v=0.29.4&vaultJump=1','skyshift/?track=vault&v=0.29.4.1&vaultJump=1','skyshift/?track=vault&v=0.29.4.2&vaultJump=1','skyshift/?track=vault&v=0.29.5&vaultJump=1','skyshift/?track=vault&v=0.29.5.1&vaultJump=1','skyshift/?track=vault&v=0.29.5.2&vaultJump=1','skyshift/?track=vault&v=0.29.6&vaultJump=1','skyshift/?track=vault&v=0.29.7&vaultJump=1','skyshift/?track=vault&v=0.29.8&vaultJump=1','skyshift/?track=vault&v=0.29.8.1&vaultJump=1','skyshift/?track=vault&v=0.29.8.2&vaultJump=1','skyshift/?track=aurora&v=0.26.5','skyshift/?v=0.26.5']){
  assert.equal(sha((await get(path)).body),expected.production.find(f=>f.path==='skyshift/index.html').sha256,path+' route');
 }
 console.log('SKYSHIFT_EF03_PUBLICATION '+JSON.stringify({base:base.href,commit:actual.commit,verified:entries.length,cache}));
}
for(let attempt=1;;attempt++){
 try{await verify();break;}catch(e){if(attempt>=retries)throw e;console.log('Propagation '+attempt+'/'+retries+': '+e.message);await sleep(12000);}
}
