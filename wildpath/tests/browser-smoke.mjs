// Browser smoke: real Chromium, Babylon + Pixi, both new and original world.
// Invoked from repo root with "node wildpath/tests/browser-smoke.mjs".
import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import puppeteer from 'puppeteer-core';
const chrome=[
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'
].find(p=>p&&existsSync(p));
assert.ok(chrome,'A real Chrome/Chromium executable is required for gameplay smoke tests');
const browser=await puppeteer.launch({executablePath:chrome,headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push('PAGE '+e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text());});
  for(const [suffix,mode] of [['?debug=1','open'],['?world=classic&debug=1','classic']]){
    await page.goto('http://127.0.0.1:8000/wildpath/'+suffix,
      {waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForFunction(()=>window.BABYLON!==undefined,{timeout:30000});
    await page.waitForFunction(()=>window.__wildpathDebug?.read,{timeout:35000});
    const start=await page.evaluate(()=>window.__wildpathDebug.read());
    assert.equal(start.mode,mode);
    const v=await page.evaluate(()=>({
      classMeThis:getComputedStyle(document.querySelector('[data-class="melee"]')).display,
      energyHidden:document.querySelector('#energyPanel').hidden
    }));
    assert.equal(v.energyHidden,mode==='classic');
    if(mode==='open')assert.equal(v.classMeThis,'none');
    await page.click('#playButton');
    await page.waitForFunction(()=>window.__wildpathDebug.read().state==='play',{timeout:15000});
    const initial=await page.evaluate(()=>window.__wildpathDebug.read());
    assert.equal(initial.enemies,0);
    await page.keyboard.down('d');
    await new Promise(r=>setTimeout(r,900));
    await page.keyboard.up('d');
    await page.keyboard.down('w');
    await new Promise(r=>setTimeout(r,900));
    await page.keyboard.up('w');
    await new Promise(r=>setTimeout(r,1300));
    const after=await page.evaluate(()=>window.__wildpathDebug.read());
    console.log('MOBILE GAME SNAPSHOTS',mode,JSON.stringify({initial,after,errors}));
    if(mode==='open'){
      mkdirSync('/tmp/wildpath',{recursive:true});
      await page.screenshot({path:'/tmp/wildpath/open-world-mobile.png'});
      mkdirSync('wildpath/docs',{recursive:true});
      await page.screenshot({path:'wildpath/docs/open-world-mobile-preview.jpg',type:'jpeg',quality:68});
      assert.ok(after.x>initial.x+.50,'Glintweaver should move freely to the right');
      assert.ok(after.z>initial.z+.50,'Glintweaver should move freely north');
      assert.ok(after.cameraX>initial.cameraX+.35,'Camera must follow X');
      assert.ok(after.enemies>0,'The OpenDirector must spawn real enemies');
    }else{
      assert.equal(after.mode,'classic');
      assert.ok(after.enemies>0,'Original road director still produces enemies');
    }
    console.log('PASS',mode,JSON.stringify(after));
  }
  assert.deepEqual(errors.filter(e=>e.startsWith('PAGE ')),[],'No JavaScript runtime exceptions');
  console.log('Browser resource reports:',errors);
  await page.close();
}finally{await browser.close();}
