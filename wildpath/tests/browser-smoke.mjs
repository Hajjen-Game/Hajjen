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
    await page.waitForFunction(()=>window.__wildpathDebug.read().pixiReady||
      window.__wildpathDebug.read().pixiFailed,{timeout:25000});
    const initial=await page.evaluate(()=>window.__wildpathDebug.read());
    assert.ok(initial.pixiReady,'Real Pixi renderer must initialize on mobile');
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
      // Unlike a static smoke check, verify an actual kill → pickup →
      // collection transition in the running 3D game.
      await page.waitForFunction(()=>window.__wildpathDebug.read().energy>0,
        {timeout:32000,polling:300});
      const collected=await page.evaluate(()=>({
        ...window.__wildpathDebug.read(),
        energyText:document.querySelector('#energyText')?.textContent,
        energyWidth:document.querySelector('#energyFill')?.style.width,
        panelHidden:document.querySelector('#energyPanel')?.hidden
      }));
      assert.ok(collected.energy>=1,'Real kills must yield collectible magic');
      assert.ok(collected.energyText.startsWith(String(collected.energy)+' / '));
      assert.ok(parseFloat(collected.energyWidth)>0,'Energy fill must visibly advance');
      assert.equal(collected.panelHidden,false);
      assert.ok(collected.nature?.plants>=1,
        'A real enemy kill must grow a wildflower in the scene');
      console.log('PASS ENERGY + WILDFLOWER',JSON.stringify(collected));
      await page.screenshot({path:'/tmp/wildpath/open-world-energy.png'});
      // Deterministic visual smoke on 10 clustered kills without altering combat.
      const bloomed=await page.evaluate(()=>window.__wildpathDebug.previewNature(10));
      assert.ok(bloomed?.tiers.blossom>=1,
        '10 rapid kills must transform the same plant into a blossom tree');
      await new Promise(r=>setTimeout(r,1400));
      await page.screenshot({path:'/tmp/wildpath/nature-rebirth-blossom.png'});
      console.log('PASS NATURE TIERS',JSON.stringify(bloomed));
      // Real production cast vs. 10 close enemies, not simulated deaths.
      const burst=await page.evaluate(()=>window.__wildpathDebug.testPowerBurst());
      assert.ok(burst?.kills>=10,
        'Grand Bloom must kill a full pack through real combat');
      assert.ok(burst?.plants?.tiers.blossom>=1,
        'Ten rapid real kills must create a blossom tree');
      assert.ok(burst?.water?.ponds>=1,
        'A real upgraded Tidal Bloom must grow a permanent lily pond');
      console.log('PASS POWER BLOOM PACK',JSON.stringify(burst));
      await new Promise(r=>setTimeout(r,1100));
      await page.screenshot({path:'/tmp/wildpath/power-bloom-pack.png'});
      const pondText=await page.$eval('#waterBadge',el=>el.textContent);
      assert.match(pondText,/[1-8] PONDS/,'The pond counter must respond to AoE kills');
      await page.screenshot({path:'/tmp/wildpath/living-water-pond.png'});
      const gallery=await page.evaluate(()=>window.__wildpathDebug.previewNatureGallery());
      const colors=gallery?.palettes||{};
      assert.ok(Object.values(colors).filter(n=>n>0).length>=6,
        'A normal series of flowerings must demonstrate six independent palettes');
      assert.ok(gallery.biggestScale>2,'Premium trees must be much larger');
      assert.ok(gallery.tiers.bush>=1&&gallery.tiers.tree>=1&&gallery.tiers.blossom>=1);
      assert.ok(gallery.visibleBranches>=3,'Trees must have visible branches');
      assert.ok(gallery.foliageClusters>=6,'Trees must have layered crown clusters');
      assert.equal(gallery.contactShadows,gallery.plants,
        'Every created plant needs a soft ground contact shadow');
      await new Promise(r=>setTimeout(r,1450));
      await page.screenshot({path:'/tmp/wildpath/nature-variety-gallery.png'});
      console.log('PASS NATURE VARIETY',JSON.stringify(gallery));
      const fusionStart=await page.evaluate(()=>window.__wildpathDebug.previewFusionGarden());
      assert.ok(fusionStart.after.plants>=fusionStart.before.plants+7,
        'New flowers remain individually visible at first');
      // Directly advance the PRODUCTION animation while deterministic
      // validation is running. Gameplay can pause for an upgrade mid-test.
      const fused=await page.evaluate(()=>window.__wildpathDebug.advanceNature(4.2));
      console.log('FUSION QA SNAPSHOT',JSON.stringify({
        before:fusionStart.before,after:fusionStart.after,fused
      }));
      assert.ok(fused.fusedPlants>=fusionStart.before.fusedPlants+3 &&
        fused.regions>=1,'Settled neighbor plants must fuse into a visual patch');
      assert.ok(fused.plants<fusionStart.after.plants,
        'Fusion must replace individual plant meshes, not just add grass');
      assert.ok(fused.regions<=22,'Combined patches have a strict rendering cap');
      assert.ok(fused.tiers.blossom>=1,'Rare trees survive spatial fusion');
      const gardenHud=await page.$eval('#natureBadge',el=>el.textContent);
      assert.ok(gardenHud.includes(fused.regions+' GROVES'),
        'HUD must show actual visible fusion regions');
      console.log('PASS LIVING WORLD NATURE FUSION',JSON.stringify(fused));
      await page.screenshot({path:'/tmp/wildpath/nature-fusion-garden.png'});
      const restarted=await page.evaluate(()=>window.__wildpathDebug.restart());
      assert.equal(restarted.plants,0,'New rounds must clear all grown plants');
      assert.equal(restarted.upgrades,0,'New rounds reset plant evolution');
      assert.equal(restarted.regions,0,'New rounds clear combined groves');
      assert.equal(restarted.fusedPlants,0,'New rounds clear fusion counters');
      const clearedPonds=await page.evaluate(()=>window.__wildpathDebug.read().water);
      assert.equal(clearedPonds.ponds,0,'New rounds must remove old water');
      const waterGarden=await page.evaluate(()=>window.__wildpathDebug.previewWaterGarden());
      assert.equal(waterGarden.ponds,1,'Preview must grow one permanent lily pond');
      assert.equal(waterGarden.rarePonds,1,'Six nearby kills create an ornate lily pond');
      assert.equal(waterGarden.temporary,1,'Rainfall creates a distinct temporary pool');
      await new Promise(r=>setTimeout(r,700));
      await page.screenshot({path:'/tmp/wildpath/living-water-gallery.png'});
      console.log('PASS LIVING WATER GALLERY',JSON.stringify(waterGarden));
    }else{
      assert.equal(after.mode,'classic');
      assert.ok(after.enemies>0,'Original road director still produces enemies');
    }
    console.log('PASS',mode,JSON.stringify(after));
  }
  // Inspect the REAL playable open world with the authored Willowglow tree.
  await page.goto('http://127.0.0.1:8000/wildpath/?willowglow=1&debug=1',
    {waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>window.__wildpathDebug?.read?.()?.willowglow,{timeout:45000});
  const willowglow=await page.evaluate(()=>window.__wildpathDebug.read().willowglow);
  assert.equal(willowglow.version,'11.0');
  assert.ok(willowglow.meshes>=10,'Real 3D tree meshes expected, not placeholder blobs');
  assert.ok(willowglow.leaves>3000);
  assert.ok(willowglow.scale>=.5&&willowglow.scale<.8);
  assert.equal(await page.$eval('#willowglowPreviewNote',el=>el.hidden),false);
  await page.click('#playButton');
  await page.waitForFunction(()=>window.__wildpathDebug.read().state==='play',{timeout:15000});
  await new Promise(r=>setTimeout(r,1200));
  await page.screenshot({path:'/tmp/wildpath/willowglow-game-preview.png'});
  const live=await page.evaluate(()=>window.__wildpathDebug.read());
  assert.ok(live.willowglow?.meshes>=10,'Tree remains in the world while playing');
  assert.equal(live.mode,'open');
  console.log('PASS WILLOWGLOW IN-GAME PREVIEW',JSON.stringify(live.willowglow));

  assert.deepEqual(errors.filter(e=>e.startsWith('PAGE ')),[],'No JavaScript runtime exceptions');
  console.log('Browser resource reports:',errors);
  await page.close();
}finally{await browser.close();}
