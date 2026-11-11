#!/usr/bin/env python3
"""Reality Engine 2.0: real Chromium, real game canvas, no shipped debug hooks."""
from __future__ import annotations
import importlib.util, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'reality-audit'
OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('visual_audit',ROOT/'scripts'/'visual-audit.py')
visual=importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)

# Inject ONLY into the in-memory game used by Chromium in this test.
# The production game.js does not contain an inspector.
EXTRA=r"""
  window.__realityAudit={
    setScene(scene){
      startRun('reality');
      const isUpper=scene==='upper',isBoss=scene==='boss';
      if(isUpper||scene==='lower'){
        const selected=isUpper?'upper':'lower';
        const ok=reality.chooseRoute(selected,{time:30.5,terrain,plan:trialPlan,
          grounded:true});
        if(!ok)throw new Error('Could not select route '+selected);
        time=40;worldTime=40;zone=4;speed=GAME.speedAt(time,zone);
        distance=trialPlan.markers.crest+speed*1.55-player.x;
      }else if(isBoss){
        time=65;worldTime=65;zone=6;speed=GAME.speedAt(time,zone);
        const attack=trialPlan.obstacles.find(o=>o.bossPhase===1);
        distance=attack.worldX-player.x-240;
        hurdles=[{...attack,x:attack.worldX-distance,
          groundY:terrain.groundAt(attack.worldX)??floorY,
          hit:false,cleared:false,closestClearance:Infinity,
          entryDuckTime:null,dashAssisted:false,mechanicIntro:false}];
        reality.tick(.016,{time,terrain,plan:trialPlan});
      }else throw new Error('Unknown Reality scene');
      const palette=window.ChromaConfig.paletteForZone(zone);
      c1=palette.primary;c2=palette.secondary;c3=palette.shadow;
      camera.reset(speed);spectralWave.start({from:palette,to:palette,width:W,reducedMotion:true});
      player.feet=terrain.groundAt(distance+player.x)??floorY;
      player.landed=true;player.vy=0;player.duck=false;
      $.menu.classList.add('hidden');$.hud.classList.remove('hidden');
      $.controls.classList.remove('hidden');$.modeIndicator.classList.remove('hidden');
      updateHud();draw();
      return {mode:runMode,route:reality.route,feet:player.feet,
        bossPhase:reality.bossPhase,bossHealth:reality.bossHealth,
        obstacles:hurdles.length,terrain:terrain.segments.length};
    }
  };
"""
MARKER='  requestAnimationFrame(frame);\n})();'
html=visual.inline_game_html()
assert html.count(MARKER)==1,'Game debug hook cannot be injected safely'
html=html.replace(MARKER,EXTRA+MARKER)

def main():
    results=[];errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,
            executable_path=os.environ.get('CHROMA_CHROMIUM_PATH') or None,
            args=['--no-sandbox'])
        for width,height in [(900,410),(640,330)]:
            page=browser.new_page(viewport={'width':width,'height':height},
                device_scale_factor=1)
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.set_default_timeout(4500)
            page.set_content(html,wait_until='load')
            page.evaluate('window.requestAnimationFrame=()=>0')
            page.locator('#trial-toggle-btn').click(force=True)
            assert page.locator('#menu-trials').is_visible()
            btn=page.locator('#reality-start-btn')
            assert btn.is_visible() and btn.is_enabled(), 'Reality 2.0 not selectable'
            drawer=page.locator('#menu-trials').bounding_box()
            assert drawer is not None
            assert drawer['y']>=-1 and drawer['y']+drawer['height']<=height+2, (
                f'Trials drawer clipped at {width}x{height}: {drawer}')
            btn.click(force=True)
            assert page.locator('#mode-indicator').is_visible()
            assert 'REALITY' in page.locator('#mode-indicator').text_content()
            assert page.locator('#trial-timer').is_visible()
            assert page.locator('#controls').is_visible()
            captured={}
            for scene in ['lower','upper','boss']:
                result=page.evaluate('window.__realityAudit.setScene',scene)
                img=page.locator('#game').screenshot()
                page.screenshot(path=str(OUT/f'{scene}-{width}x{height}.png'))
                captured[scene]=(result,img)
                assert result['mode']=='reality'
            lo,hi,boss=captured['lower'][0],captured['upper'][0],captured['boss'][0]
            assert lo['route']=='lower' and hi['route']=='upper'
            assert 168<=lo['feet']-hi['feet']<=171, (lo,hi)
            assert captured['lower'][1]!=captured['upper'][1], (
                'World Fold visually identical for upper and lower routes')
            assert boss['bossPhase']==1 and boss['obstacles']>0, boss
            assert captured['boss'][1]!=captured['lower'][1], (
                'Sentinel attack produces no distinct gameplay presentation')
            results.append({'viewport':f'{width}x{height}',
                'upperHeight':hi['feet'],'lowerHeight':lo['feet'],
                'bossPhase':boss['bossPhase']})
            page.close()
        browser.close()
    assert not errors,'Browser errors: '+repr(errors[:8])
    (OUT/'report.json').write_text(json.dumps({'status':'passed','results':results},indent=2))
    print('PASS: Reality 2.0 branch geometries, boss collider and menu at both mobile viewports')

if __name__=='__main__':
    main()
