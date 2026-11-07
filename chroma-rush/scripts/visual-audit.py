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
      flow.value=85;
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
    setSpectralScene(progress){
      this.setScene('flat');
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
        assert page.locator('#export-run-btn').is_visible(), 'No audit export action on results screen'
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
