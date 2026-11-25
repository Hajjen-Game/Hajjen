// Validate the built artifact rather than a source-only green check.
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),dist=join(here,'dist');
const report=JSON.parse(await readFile(join(dist,'build-report.json'),'utf8'));
const html=await readFile(join(dist,'index.html'),'utf8');
assert.equal(report.cssOrder.length,8);
assert.equal(report.sourceVersion,'0.26.5');
assert.equal(report.three,'0.180.0');
assert.doesNotMatch(html,/cdn\.jsdelivr\.net\/npm\/three|type="importmap"|boot-v0210\.js\?/);
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(x=>x[1]);
const css=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(x=>x[1]);
assert.equal(scripts.length,1,'single bundled bootstrap');
assert.equal(css.length,1,'consolidated CSS');
for(const p of [...scripts,...css]){assert.match(p,/^\.\/bundles\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/);assert.ok((await stat(resolve(dist,p))).size>0);}
assert.ok(report.graph.chunks.some(x=>x.dynamicImports.length>0),'lazy module chunk');
assert.ok(report.graph.modules.every(x=>!/(?:^|\/)(?:tests|docs|previews)\//.test(x)));
for(const f of report.files){
 const b=await readFile(join(dist,f.path));assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);
}
for(const p of ['assets/ships/stingray-evo-hero-v4.gltf','assets/ships/stingray-evo-hero-v4.glb'])assert.ok((await stat(join(dist,p))).size>0);
const top=await readdir(dist);for(const p of ['tests','docs','legacy','previews','material-grade-v0203.html','game-v0210.mjs','node_modules'])assert.ok(!top.includes(p),p+' must not ship in production artifact');
console.log('SKYSHIFT_EF03_ARTIFACT verified hashed entry and CSS, lazy chunks, integrity and asset paths');
