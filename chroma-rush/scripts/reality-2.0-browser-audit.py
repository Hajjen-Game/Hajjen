#!/usr/bin/env python3
"""Reality Engine 2.3: physical paths, true Sentinel muzzle and Chromium."""
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
        const ok=isUpper?
          reality.captureUpper({time:34.8,worldX:trialPlan.markers.start+350}):
          reality.chooseRoute('lower',{time:38,plan:trialPlan,
            playerWorld:trialPlan.markers.crest+200});
        if(!ok)throw new Error('Could not enter route');
        time=40;worldTime=40;zone=4;speed=GAME.speedAt(time,zone);
        distance=trialPlan.markers.crest+speed*1.55-player.x;
      }else if(isBoss){
        time=65;worldTime=65;zone=6;speed=GAME.speedAt(time,zone);
        distance=30000;hurdles=[];
        camera.reset(speed);
        reality.tick(.016,{time,plan:trialPlan,playerWorld:distance+player.x,
          baseY:floorY,playerX:player.x,
          spawnX:camera.worldX(W*.80,player.x),
          bossY:camera.worldY(H*.31,floorY),speed});
      }else throw new Error('Unknown Reality scene');
      const palette=window.ChromaConfig.paletteForZone(zone);
      c1=palette.primary;c2=palette.secondary;c3=palette.shadow;
      camera.reset(speed);spectralWave.start({from:palette,to:palette,width:W,reducedMotion:true});
      player.feet=runMode==='reality'&&reality.route==='upper'?
        reality.upperSurfaceAt(distance+player.x,trialPlan,floorY):
        terrain.groundAt(distance+player.x)??floorY;
      player.landed=true;player.vy=0;player.duck=false;
      $.menu.classList.add('hidden');$.hud.classList.remove('hidden');
      $.controls.classList.remove('hidden');$.modeIndicator.classList.remove('hidden');
      updateHud();draw();
      return {mode:runMode,route:reality.route,feet:player.feet,
        bossPhase:reality.bossPhase,bossHealth:reality.bossHealth,
        projectiles:reality.projectiles.length,terrain:terrain.segments.length};
    },
    proveLanding(){
      // Exercise REAL button handling and simulation stepping: not a direct
      // route state mutation. The old Reality 2.0 shortcut would fail here.
      startRun('reality');
      time=34.55;worldTime=34.55;zone=3;speed=GAME.speedAt(time,zone);
      distance=trialPlan.markers.start+speed*.53-player.x;
      trialCursor=trialPlan.obstacles.length;
      player.feet=floorY;player.landed=true;player.vy=0;player.duck=false;
      const entry=player.feet;
      jump();
      let frames=0;
      for(;frames<90&&reality.route==='undecided';frames++)update(1/60);
      draw();
      return {route:reality.route,upperLandings:reality.upperLandings,
        time,feet:player.feet,entry,frames};
    },
    proveMuzzle(){
      // A real model update supplies camera-inverse coordinates of boss.
      // No manually drawn fake projectiles: test actual spawn and movement.
      startRun('reality');
      time=62;worldTime=62;zone=6;speed=GAME.speedAt(time,zone);
      camera.reset(speed);
      const spawnX=camera.worldX(W*.80,player.x);
      const bossY=camera.worldY(H*.31,floorY);
      reality.tick(.016,{time,plan:trialPlan,
        playerWorld:distance+player.x,
        baseY:floorY,playerX:player.x,spawnX,bossY,speed});
      const shot=reality.projectiles[0];
      if(!shot)throw Error('Sentinel failed to fire');
      const x=camera.screenX(shot.x,player.x);
      const y=camera.screenY(shot.y,floorY);
      reality.tickProjectiles(.42,{playerBox:GEO.playerBox(player),
        speed,leftBound:camera.visibleLeft(W,player.x)});
      draw();
      return {screenX:x,screenY:y,targetX:W*.80,targetY:H*.31,
        movedX:shot.x,firstX:spawnX,movedY:shot.y,firstY:bossY,
        laneY:shot.laneY,charged:shot.charging===false,
        muzzleFires:reality.muzzleFires};
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
            # A grounded JUMP really lands onto the deck, including
            # game-loop update and jump controller, on the actual canvas.
            landing=page.evaluate('window.__realityAudit.proveLanding')
            assert landing['route']=='upper' and landing['upperLandings']==1, (
                f'Player could not physically jump onto upper deck: {landing}')
            assert landing['feet']<landing['entry']-100,landing
            page.screenshot(path=str(OUT/f'actual-landing-{width}x{height}.png'))
            muzzle=page.evaluate('window.__realityAudit.proveMuzzle')
            assert abs(muzzle['screenX']-muzzle['targetX'])<1, muzzle
            assert abs(muzzle['screenY']-muzzle['targetY'])<1, muzzle
            assert muzzle['movedX']<muzzle['firstX'], muzzle
            assert muzzle['movedY']>muzzle['firstY'], muzzle
            assert muzzle['charged'] and muzzle['muzzleFires']>=1, muzzle
            page.screenshot(path=str(OUT/f'actual-muzzle-{width}x{height}.png'))
            captured={}
            for scene in ['lower','upper','boss']:
                result=page.evaluate('window.__realityAudit.setScene',scene)
                img=page.locator('#game').screenshot()
                page.screenshot(path=str(OUT/f'{scene}-{width}x{height}.png'))
                captured[scene]=(result,img)
                assert result['mode']=='reality'
            lo,hi,boss=captured['lower'][0],captured['upper'][0],captured['boss'][0]
            assert lo['route']=='lower' and hi['route']=='upper'
            assert 137<=lo['feet']-hi['feet']<=145, (lo,hi)
            assert captured['lower'][1]!=captured['upper'][1], (
                'World Fold visually identical for upper and lower routes')
            assert boss['bossPhase']==1 and boss['projectiles']>0, boss
            assert captured['boss'][1]!=captured['lower'][1], (
                'Sentinel attack produces no distinct gameplay presentation')
            results.append({'viewport':f'{width}x{height}',
                'upperHeight':hi['feet'],'lowerHeight':lo['feet'],
                'bossPhase':boss['bossPhase']})
            page.close()
        browser.close()
    assert not errors,'Browser errors: '+repr(errors[:8])
    (OUT/'report.json').write_text(json.dumps({'status':'passed','results':results},indent=2))
    print('PASS: Reality 2.3 upper landing, core-origin muzzle shot, and mobile route/attack scenes')

if __name__=='__main__':
    main()
