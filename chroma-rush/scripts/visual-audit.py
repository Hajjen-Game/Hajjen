#!/usr/bin/env python3
"""Browser-level visual/experience smoke test for CHROMA RUSH.

Run from the repository root: python chroma-rush/scripts/visual-audit.py
Requires Playwright Python + Chromium, only for development/CI.
The actual game has no runtime browser-test dependency.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'visual-audit'
OUT.mkdir(parents=True, exist_ok=True)

SCENE_HOOK = r'''
  // Development-only injection, never included in the deployed gameplay script.
  window.__visualAudit={
    setScene(kind){
      status='running';time=36;worldTime=0;zone=4;distance=2400;speed=770;
      hp=100;shake=0;hitFlash=0;gapRecovery=null;
      c1=PALETTES[3].primary;c2=PALETTES[3].secondary;c3=PALETTES[3].shadow;
      const x=distance;
      if(['flat','duck','duck-release','impact'].includes(kind))terrain.segments=[
        {type:'flat',start:0,end:10000,y0:floorY,y1:floorY}];
      if(kind==='hills')terrain.segments=[
        {type:'flat',start:0,end:x+220,y0:floorY,y1:floorY},
        {type:'slope',start:x+220,end:x+700,y0:floorY,y1:floorY+65},
        {type:'flat',start:x+700,end:x+950,y0:floorY+65,y1:floorY+65},
        {type:'slope',start:x+950,end:x+1430,y0:floorY+65,y1:floorY-45},
        {type:'flat',start:x+1430,end:10000,y0:floorY-45,y1:floorY-45}];
      if(kind==='gap')terrain.segments=[
        {type:'flat',start:0,end:x+680,y0:floorY,y1:floorY},
        {type:'gap',start:x+680,end:x+900,y0:floorY,y1:floorY},
        {type:'flat',start:x+900,end:10000,y0:floorY,y1:floorY}];
      if(kind==='background')terrain.segments=[
        {type:'gap',start:0,end:10000,y0:floorY,y1:floorY}];
      terrain.generated=10000;
      terrain.gaps=terrain.segments.filter(s=>s.type==='gap');
      player.x=W*.265;
      player.feet=terrain.groundAt(distance+player.x)??floorY;
      player.vy=0;player.landed=true;player.invulnerable=0;
      flow.value=85;flow.syncChroma();
      chromaVfx.reset();spectralWave.reset();speedTrails.reset();
      hurdles=[];motes=[];streaks=[];effects.reset();motion.reset();player.duck=false;
      if(kind==='duck'){
        player.duck=true;motion.duckStart();
        effects.ground(player.x,player.feet-2,c2,22,1.1);
        effects.tick(.035);
      }
      if(kind==='duck-release'){
        motion.duckStart();motion.duckRelease();motion.tick(.06);
        effects.ground(player.x,player.feet-2,c1,18,.7);
        effects.tick(.045);
      }
      if(kind==='impact'){
        motion.land(1000);
        effects.ground(player.x,player.feet-2,c2,29,1.25);
        effects.tick(.07);
      }
      $.hud.classList.remove('hidden');$.controls.classList.remove('hidden');
      $.menu.classList.add('hidden');$.pauseBtn.classList.remove('hidden');
      director.tick=()=>{};
      draw();
    },
    setArcadeCueScene({kind=null,age=.085}={}){
      // Real EffectLanguage 2.0 renderer in the actual game Canvas.
      // This seam exists only inside the browser audit.
      window.__visualAudit.setScene('flat');
      if(kind){
        const y=['precision','perfect'].includes(kind)?player.feet-24:player.feet-2;
        effects.cue(kind,player.x,y,c1,c2,{speed:770});
        effects.tick(age);
      }
      draw();
      return {kind,age,active:effects.active.filter(e=>e.kind.startsWith('cue-')).length,
        state:status,score,hp,flow:flow.value,playerX:player.x};
    },
    setOriginalBackdropScene({motif='CYAN',time=0,profile='high'}={}){
      // Actual pre-2.0 background, using its original time/speed-driven drift.
      // The hook exists only in this isolated Chromium visual audit.
      window.__visualAudit.setScene('background');
      const p=PALETTES.find(v=>v.name===motif)||PALETTES[0];
      const presets={high:{name:'high',density:1,glow:1},
        balanced:{name:'balanced',density:.65,glow:.64},
        performance:{name:'performance',density:.36,glow:.24}};
      ctx.save();
      ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
      worldBackground.drawBackground({ctx,width:W,height:H,time,
        speed:1020,primary:p.primary,secondary:p.secondary,shadow:p.shadow,
        flow:75,quality:presets[profile]||presets.high,glowLine});
      ctx.restore();
      return {motif:p.name,time,profile};
    },
    setSpeedTrailScene(kind){
      // A repeatable high-speed timeline, using only public fixed-step
      // trail updates. This hook never ships in the production game.
      window.__visualAudit.setScene('flat');
      if(kind==='off'){
        draw();
        return {...speedTrails.diagnostics,kind,speed};
      }
      const fast=['fast','chroma','duck','jump'].includes(kind);
      speed=fast?1550:490;
      flow.value=kind==='chroma'?95:40;
      flow.syncChroma();
      if(kind==='chroma'){chromaVfx.setActive(true);chromaVfx.tick(.8);}
      if(kind==='duck'){
        player.duck=true;motion.duckStart();motion.tick(.15);
      }
      const frameCount=31,dt=1/60;
      for(let i=0;i<frameCount;i++){
        const fraction=i/(frameCount-1);
        if(kind==='jump'){
          player.landed=false;
          player.vy=-220;
          player.feet=floorY-135*Math.sin(fraction*Math.PI*.77);
        }
        distance+=speed*dt;
        const hit=GEO.playerBox(player);
        const shape=motion.sample({landed:player.landed,duck:player.duck,vy:player.vy});
        speedTrails.tick(dt,{playerX:player.x,feet:player.feet,
          width:hit.w*shape.scaleX,height:hit.h*shape.scaleY,
          distance,speed,flow:flow.value,chromaActive:flow.tier===3,
          primary:c1,secondary:c2,quality:quality.profile});
      }
      updateHud();draw();
      return {...speedTrails.diagnostics,kind,speed,
        sampleFeet:speedTrails.samples.map(sample=>sample.feet)};
    },
    setFlowMultiplierScene(value){
      window.__visualAudit.setScene('flat');
      flow.reset();flow.value=value;flow.syncChroma();
      updateHud();
      const number=$.flowMultiplier,box=number.getBoundingClientRect();
      const heading=document.querySelector('.flow-heading').getBoundingClientRect();
      const left=document.querySelector('.flow-heading > span').getBoundingClientRect();
      const style=window.getComputedStyle(number);
      draw();
      return {tier:flow.tier,multiplier:number.textContent,
        size:parseFloat(style.fontSize),animation:style.animationName,
        duration:style.animationDuration,box:{left:box.left,right:box.right},
        leftRight:left.right,headingRight:heading.right};
    },
    setChromaScene(kind){
      window.__visualAudit.setScene('flat');
      flow.value=95;flow.syncChroma(); // Identical gameplay state in both images.
      chromaVfx.reset();
      if(kind!=='off'){
        chromaVfx.setActive(true);
        chromaVfx.tick(kind==='entry'?.17:.70);
      }
      if(kind==='duck'){
        player.duck=true;motion.duckStart();
      }
      draw();
      return {active:chromaVfx.active,intensity:chromaVfx.intensity,
        tier:flow.tier,flow:flow.value};
    },
    setSpectralScene(progress){
      window.__visualAudit.setScene('flat');
      zone=2;
      const incoming=PALETTES[1],outgoing=PALETTES[0];
      c1=incoming.primary;c2=incoming.secondary;c3=incoming.shadow;
      spectralWave.start({from:outgoing,to:incoming,width:W,duration:.92});
      if(progress>0)spectralWave.tick(Math.min(1,progress)*.92,
        {playerX:player.x,playerY:player.feet,height:H});
      $.zoneCallout.classList.add('hidden');
      draw();
      return {front:spectralWave.frontAt(H*.3,H),active:spectralWave.active,
        playerColor:spectralWave.colorAt(player.x,'primary',player.feet,H)};
    },
    sample(x,y){
      const px=Math.max(0,Math.min(canvas.width-1,Math.round(x*canvas.width/W)));
      const py=Math.max(0,Math.min(canvas.height-1,Math.round(y*canvas.height/H)));
      return Array.from(ctx.getImageData(px,py,1,1).data).slice(0,3);
    },
    info(){return {W,H,floorY,zone,status,distance,segments:terrain.segments.length};},
    endRun(){endRun();}
  };
'''


def inline_game_html():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = re.sub(
        r'<link rel="stylesheet" href="([^"]+)"\s*/>',
        lambda m: '<style>' + (ROOT / m.group(1).split('?')[0]).read_text(encoding='utf-8') + '</style>',
        html,
    )

    def inline_script(match):
        name = match.group(1).split('?')[0]
        src = (ROOT / name).read_text(encoding='utf-8')
        if name == 'src/gameplay/game.js':
            marker = '  requestAnimationFrame(frame);\n})();'
            assert src.count(marker) == 1, 'Cannot inject visual test seam'
            src = src.replace(marker, SCENE_HOOK + marker)
        # Escape any accidental script-closing sequences.
        return '<script>' + src.replace('</script>', '<\\/script>') + '</script>'

    return re.sub(r'<script src="([^"]+)"></script>', inline_script, html)


def main():
    html = inline_game_html()
    errors = []
    measurements = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=os.environ.get('CHROMA_CHROMIUM_PATH') or None,
            args=['--no-sandbox'],
        )
        for vw, vh in [(1440, 600), (900, 410), (740, 360), (640, 330)]:
            page = browser.new_page(viewport={'width': vw, 'height': vh}, device_scale_factor=1)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.set_content(html, wait_until='load')
            # Disable ongoing updates: screenshots compare fixed scene parameters.
            page.evaluate('window.requestAnimationFrame=()=>0')
            page.wait_for_timeout(80)
            menu = page.locator('#menu').bounding_box()
            assert menu is not None, 'Menu not drawn'
            assert menu['y'] >= -0.5, f'Menu clipped at {vw}x{vh}: {menu}'
            assert menu['y'] + menu['height'] <= vh + 0.5, f'Menu overflows bottom at {vw}x{vh}: {menu}'
            page.screenshot(path=str(OUT / f'menu-{vw}x{vh}.png'))
            colors = {}
            for scene in ['flat', 'hills', 'gap', 'background']:
                page.evaluate('window.__visualAudit.setScene', scene)
                # Capture DOM+canvas, not only a synthetic terrain module.
                if scene != 'background':
                    page.screenshot(path=str(OUT / f'{scene}-{vw}x{vh}.png'))
                colors[scene] = page.evaluate('window.__visualAudit.sample(790, 620)')
            # The exact pre-2.0 background is restored, not a replacement
            # architecture or mountain scene. Validate its original time drift,
            # colors and graphics quality at all tested landscape sizes.
            original=page.evaluate('window.__visualAudit.setOriginalBackdropScene',
                {'motif':'CYAN','time':0,'profile':'high'})
            still=page.locator('#game').screenshot()
            page.screenshot(path=str(OUT/f'original-backdrop-cyan-{vw}x{vh}.png'))
            again=page.evaluate('window.__visualAudit.setOriginalBackdropScene',
                {'motif':'CYAN','time':0,'profile':'high'})
            assert still==page.locator('#game').screenshot(), (
                f'Original background not deterministic at {vw}x{vh}')
            moved=page.evaluate('window.__visualAudit.setOriginalBackdropScene',
                {'motif':'CYAN','time':6,'profile':'high'})
            moving=page.locator('#game').screenshot()
            page.screenshot(path=str(OUT/f'original-backdrop-motion-{vw}x{vh}.png'))
            assert original['time']==again['time']==0 and moved['time']==6
            assert still!=moving, f'Original background motion missing at {vw}x{vh}'
            for motif in ['VIOLET','LIME','AMBER','ELECTRIC']:
                result=page.evaluate('window.__visualAudit.setOriginalBackdropScene',
                    {'motif':motif,'time':6,'profile':'high'})
                page.screenshot(path=str(OUT/f'original-backdrop-{motif.lower()}-{vw}x{vh}.png'))
                assert result['motif']==motif
                assert page.locator('#game').screenshot()!=moving, (
                    f'Original background palette unchanged in {motif} at {vw}x{vh}')
            page.evaluate('window.__visualAudit.setOriginalBackdropScene',
                {'motif':'LIME','time':6,'profile':'performance'})
            page.screenshot(path=str(OUT/f'original-backdrop-low-{vw}x{vh}.png'))

            # A spectrum front must actually recolor two independent portions
            # of the world while remaining behind obstacles/player.
            def spectral_capture(progress):
                info=page.evaluate('window.__visualAudit.setSpectralScene',progress)
                left=page.evaluate('([x,y]) => window.__visualAudit.sample(x,y)', [160,215])
                right=page.evaluate('([x,y]) => window.__visualAudit.sample(x,y)',
                    [page.evaluate('window.__visualAudit.info().W')-160,215])
                return info,left,right

            old,old_left,old_right=spectral_capture(0)
            middle,mid_left,mid_right=spectral_capture(.5)
            new,new_left,new_right=spectral_capture(1)
            left_diff=max(abs(a-b) for a,b in zip(old_left,mid_left))
            right_diff=max(abs(a-b) for a,b in zip(new_right,mid_right))
            palette_diff=max(abs(a-b) for a,b in zip(old_right,new_right))
            assert left_diff<=5, f'Old left side changed early at {vw}x{vh}: {left_diff}'
            assert right_diff<=5, f'New right side not recolored at {vw}x{vh}: {right_diff}'
            assert palette_diff>=4, f'Zone colors indistinguishable: {old_right} vs {new_right}'
            assert middle['active'] and not new['active'], 'Wave did not complete on time'
            for progress,label in [(0,'entry'),(.5,'crossing'),(.75,'arrival'),(1,'complete')]:
                page.evaluate('window.__visualAudit.setSpectralScene',progress)
                page.screenshot(path=str(OUT / f'spectral-{label}-{vw}x{vh}.png'))

            # Arcade Animation Language 2.0: verify seven distinct, brief,
            # straight-line cues in the REAL game Canvas at each viewport.
            quiet=page.evaluate('window.__visualAudit.setArcadeCueScene',{})
            baseline=page.locator('#game').screenshot()
            for cue in ['jump','land','duck','release','precision','speed','perfect']:
                detail=page.evaluate('window.__visualAudit.setArcadeCueScene',
                    {'kind':cue,'age':.08})
                picture=page.locator('#game').screenshot()
                assert detail['active']==1, f'No {cue} animation at {vw}x{vh}'
                assert picture!=baseline, f'{cue} not visible at {vw}x{vh}'
                assert detail['score']==quiet['score'] and detail['hp']==quiet['hp'] and detail['flow']==quiet['flow'], (
                    f'{cue} accidentally changed game state at {vw}x{vh}')
                page.screenshot(path=str(OUT/f'arcade-cue-{cue}-{vw}x{vh}.png'))
            late=page.evaluate('window.__visualAudit.setArcadeCueScene',
                {'kind':'precision','age':.30})
            assert late['active']==1, f'Precision celebration too short at {vw}x{vh}'
            assert page.locator('#game').screenshot()!=baseline
            finished=page.evaluate('window.__visualAudit.setArcadeCueScene',
                {'kind':'precision','age':.43})
            assert finished['active']==0, f'Precision animation lingered at {vw}x{vh}'

            # Flow Multiplier Glow 1.0: each tier must be larger and pulse
            # more emphatically, without colliding with the other HUD text.
            flow_views=[]
            for value,expected,expected_label in [
                (0,0,'1×'),(30,1,'1.25×'),(65,2,'1.5×'),(90,3,'2×')]:
                state=page.evaluate('window.__visualAudit.setFlowMultiplierScene',value)
                assert state['tier']==expected
                assert state['multiplier']==expected_label
                assert state['box']['right']<=state['headingRight']+4, (
                    f'Multiplier overflows Flow heading at {vw}x{vh}, tier {expected}: {state}')
                assert state['leftRight']<=state['box']['left']+3, (
                    f'Multiplier collides with Flow label at {vw}x{vh}, tier {expected}: {state}')
                if expected>0:
                    assert 'flowMultiplierBreath' in state['animation']
                    page.screenshot(path=str(OUT / f'flow-multiplier-{expected}-{vw}x{vh}.png'))
                else:
                    assert state['animation']=='none'
                flow_views.append(state)
            assert all(flow_views[i]['size']<flow_views[i+1]['size'] for i in range(3)), (
                f'Multiplier font sizes should rise with each Flow tier: {flow_views}')
            durations=[float(v['duration'].rstrip('s')) for v in flow_views[1:]]
            assert durations[0]>durations[1]>durations[2], (
                f'Multiplier glow should pulse faster at higher tiers: {durations}')
            page.emulate_media(reduced_motion='reduce')
            reduced=page.evaluate('window.__visualAudit.setFlowMultiplierScene',90)
            assert reduced['animation']=='none', 'Reduced motion must disable glow pulse'
            page.emulate_media(reduced_motion='no-preference')

            # Chroma State 2.0 is a genuine transformation, not just a
            # slightly brighter static Flow bar: compare the ACTUAL canvas.
            base=page.evaluate('window.__visualAudit.setChromaScene','off')
            base_pixels=page.locator('#game').screenshot()
            entry=page.evaluate('window.__visualAudit.setChromaScene','entry')
            page.screenshot(path=str(OUT / f'chroma-entry-{vw}x{vh}.png'))
            live=page.evaluate('window.__visualAudit.setChromaScene','steady')
            live_pixels=page.locator('#game').screenshot()
            page.screenshot(path=str(OUT / f'chroma-live-{vw}x{vh}.png'))
            duck=page.evaluate('window.__visualAudit.setChromaScene','duck')
            page.screenshot(path=str(OUT / f'chroma-duck-{vw}x{vh}.png'))
            assert base['tier']==entry['tier']==live['tier']==duck['tier']==3
            assert base['flow']==live['flow']==95
            assert entry['intensity']>0 and entry['intensity']<live['intensity']
            assert live['intensity']==1
            assert base_pixels!=live_pixels, f'Chroma 2.0 VFX invisible at {vw}x{vh}'

            # Speed Trails 2.0 must show actual pose-history silhouettes,
            # directed backward particles and a longer wake at high speed.
            trail_base=page.evaluate('window.__visualAudit.setSpeedTrailScene','off')
            cruise=page.evaluate('window.__visualAudit.setSpeedTrailScene','cruise')
            page.screenshot(path=str(OUT/f'speed-trails-cruise-{vw}x{vh}.png'))
            fast=page.evaluate('window.__visualAudit.setSpeedTrailScene','fast')
            page.screenshot(path=str(OUT/f'speed-trails-fast-{vw}x{vh}.png'))
            chroma=page.evaluate('window.__visualAudit.setSpeedTrailScene','chroma')
            page.screenshot(path=str(OUT/f'speed-trails-chroma-{vw}x{vh}.png'))
            duck_trails=page.evaluate('window.__visualAudit.setSpeedTrailScene','duck')
            page.screenshot(path=str(OUT/f'speed-trails-duck-{vw}x{vh}.png'))
            jump_trails=page.evaluate('window.__visualAudit.setSpeedTrailScene','jump')
            page.screenshot(path=str(OUT/f'speed-trails-jump-{vw}x{vh}.png'))
            assert trail_base['samples']==trail_base['fragments']==0
            assert cruise['samples']>0 and cruise['fragments']>0
            assert fast['reach']>cruise['reach'], f'Speed trails do not scale: {cruise} -> {fast}'
            assert chroma['samples']>0 and chroma['fragments']>0
            assert duck_trails['samples']>0
            assert len({round(v,2) for v in jump_trails['sampleFeet']})>=3, (
                f'Jump trail did not preserve historical heights: {jump_trails}')

            # Capture the real player motion and horizontal/geometric VFX as well.
            for scene in ['duck','duck-release','impact']:
                page.evaluate('window.__visualAudit.setScene', scene)
                page.screenshot(path=str(OUT / f'{scene}-{vw}x{vh}.png'))
            # The void must reveal exactly the same background pixels as the
            # no-floor scene, not an opaque rectangle or shadow gradient.
            diff = max(abs(a-b) for a, b in zip(colors['gap'], colors['background']))
            assert diff <= 3, f'Gap hides background at {vw}x{vh}: diff={diff} {colors}'
            land_vs_void = max(abs(a-b) for a, b in zip(colors['flat'], colors['gap']))
            assert land_vs_void >= 8, f'Solid floor not distinguishable from gap at {vw}x{vh}'
            # Running/pause controls must remain reachable, with no horizontal scrolling.
            btn = page.locator('#jump-btn').bounding_box()
            assert btn and btn['x'] >= 0 and btn['y'] >= 0 and btn['y'] + btn['height'] <= vh
            page_width = page.evaluate('document.documentElement.scrollWidth')
            assert page_width <= vw + 1, f'Unwanted horizontal scrolling at {vw}x{vh}'
            # Screen after a run should fit vertically, including the new log action.
            page.evaluate('window.__visualAudit.endRun()')
            result_box=page.locator('#gameover').bounding_box()
            assert result_box is not None
            if result_box['y'] < -0.5 or result_box['y'] + result_box['height'] > vh + .5:
                raise AssertionError(f'Results panel clipped at {vw}x{vh}: {result_box}')
            page.screenshot(path=str(OUT/f'results-{vw}x{vh}.png'))
            measurements.append({'viewport':f'{vw}x{vh}', 'gapBackgroundPixelDifference':diff,
                'landGapPixelDifference':land_vs_void,'menuBounds':menu})
            page.close()
        # Exercise the real DOM download control on a completed round. The
        # synthetic end command is never shipped in the production game.
        page = browser.new_page(viewport={'width':900,'height':410},accept_downloads=True)
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.set_content(html,wait_until='load')
        page.locator('#start-btn').click()
        page.evaluate('window.__visualAudit.endRun()')
        # Pass 4: diagnostics remain available under the opt-in Run Details
        # drawer. They should NOT clutter the default results screen.
        assert not page.locator('#export-run-btn').is_visible(), (
            'Diagnostics should stay inside collapsed Run Details')
        page.locator('#result-details-btn').click()
        assert page.locator('#result-details-btn').get_attribute('aria-expanded')=='true'
        assert page.locator('#export-run-btn').is_visible(), (
            'No audit export action inside Run Details')
        with page.expect_download() as downloaded:
            page.locator('#export-run-btn').click()
        file = downloaded.value
        assert file.suggested_filename.endswith('-arcade-audit.json')
        log_path=OUT/'sample-run-log.json'
        file.save_as(str(log_path))
        audit_log=json.loads(log_path.read_text())
        assert audit_log['format']=='chroma-rush-round-audit'
        assert {event['type'] for event in audit_log['events']}>={'start','run_end'}
        page.close()
        browser.close()
    if errors:
        raise AssertionError(f'Browser runtime errors: {errors[:6]}')
    (OUT / 'results.json').write_text(json.dumps({'status':'passed','checks':measurements},indent=2))
    print(f'PASS: {len(measurements)} landscape viewport profiles, flat/hills/gap/background and menu; no browser JS errors.')
    for check in measurements:
        print(f"  {check['viewport']}: gap=background Δ{check['gapBackgroundPixelDifference']}; land/gap Δ{check['landGapPixelDifference']}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        (OUT/'failure.txt').write_text(str(e))
        print(f'VISUAL AUDIT FAILED: {e}',file=sys.stderr)
        raise
