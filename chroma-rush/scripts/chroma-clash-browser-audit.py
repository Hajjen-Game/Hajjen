#!/usr/bin/env python3
"""Headless smoke check for the standalone Chroma Clash 1.0 page."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'clash-audit'
OUT.mkdir(parents=True, exist_ok=True)
URL = (ROOT / 'clash.html').as_uri()


def inline_wave_scene():
    """Render the REAL game Canvas at fixed wave stages (test-only injection)."""
    html = (ROOT / 'clash.html').read_text(encoding='utf-8')
    css = (ROOT / 'clash.css').read_text(encoding='utf-8')
    html, n = re.subn(r'<link rel="stylesheet" href="clash.css\?v=[^"]+">',
                       lambda _: '<style>' + css + '</style>', html)
    assert n == 1, 'CSS cannot be inlined'
    paths = (
        'src/core/config.js',
        'src/render/chroma-identity.js',
        'src/diagnostics/chroma-clash-audit.js',
        'src/render/chroma-center-pulse.js',
        'src/gameplay/chroma-clash.js',
    )
    for source_path in paths:
        source = (ROOT / source_path).read_text(encoding='utf-8')
        if source_path.endswith('/chroma-clash.js'):
            anchor = "  setScreen('menu');\n  window.requestAnimationFrame(frame);"
            hook = """
  // Test-only renderer seam; it does not exist in the deployed game.
  window.__clashWaveCapture=function(progress, hideCubes=true){
    match=createMatch(123);
    match.zone=1;
    match.elapsed=10.2;
    match.paletteFade=COLOR_FADE_SECONDS*(1-progress);
    if(hideCubes) match.cubes.forEach(c=>{c.fall=1.2;});
    setScreen('running');
    updateHUD();
    render(4.25);
    const rgb=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3);
    return {
      arenaCorner:rgb(CX-135,CY-135),
      center:rgb(CX,CY),
      player:rgb(CX-86,CY-79),
      besidePlayer:rgb(CX-125,CY-79),
      zone:match.zone,
      wave:match.paletteFade
    };
  };
"""
            assert source.count(anchor) == 1, 'Could not insert fixed-wave snapshot hook'
            source = source.replace(anchor, hook + anchor)
        pattern = r'<script src="' + re.escape(source_path) + r'\?v=[^"]+"></script>'
        html, n = re.subn(pattern, lambda _: '<script>' + source + '</script>', html)
        assert n == 1, 'Could not inline '+source_path
    return html


def main():
    captures = []
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, executable_path=os.environ.get('CHROMA_CHROMIUM_PATH') or None,
            args=['--no-sandbox'])
        for width, height in ((960, 540), (812, 375), (1400, 700)):
            page = browser.new_page(
                viewport={'width': width, 'height': height}, device_scale_factor=3,
                is_mobile=width != 960, has_touch=width != 960, accept_downloads=True)
            page.on('pageerror', lambda error: failures.append(str(error)))
            page.goto(URL, wait_until='load')
            page.wait_for_timeout(140)
            assert page.locator('#clash-menu').is_visible(), 'Missing first menu'
            assert page.locator('#clash-start').is_visible(), 'Start button not visible'
            assert page.locator('#clash-canvas').is_visible(), 'Canvas missing'
            canvas_size = page.evaluate("""() => {
              const c=document.getElementById('clash-canvas');
              return {w:c.width,h:c.height,cssW:innerWidth,cssH:innerHeight,dpr:devicePixelRatio};
            }""")
            assert canvas_size['w'] * canvas_size['h'] <= 750000 + 2000, canvas_size
            assert canvas_size['w'] <= width, canvas_size
            assert canvas_size['h'] <= height, canvas_size
            assert page.locator('#clash-mode-link').count() == 0, 'Runner menu leaked'
            page.screenshot(path=str(OUT / ('clash-menu-%s.png' % width)))
            page.locator('#clash-start').click()
            page.wait_for_timeout(180)
            assert page.locator('#clash-hud').is_visible(), 'Arena HUD hidden after start'
            assert page.locator('#clash-joystick').is_visible(), 'Joystick hidden after start'
            assert page.locator('#clash-zone').inner_text() == 'ZONE 01', 'Invalid first zone'
            assert page.locator('#clash-count').inner_text() == '4 ALIVE', 'Missing AI cubes'
            assert page.locator('#clash-fullscreen').is_visible(), 'HUD fullscreen button missing'
            assert page.locator('#clash-zone').bounding_box()['x'] > width * .3, 'Zone not centered'
            # The old contain-only renderer left transparent sidebars on wide
            # mobile displays. Pixel samples must now be opaque and colored.
            edges = page.evaluate("""() => {
              const c=document.getElementById('clash-canvas'),g=c.getContext('2d');
              const y=Math.floor(c.height*.48);
              const get=x=>Array.from(g.getImageData(x,y,1,1).data);
              return {left:get(Math.max(0,Math.floor(c.width*.01))),
                      right:get(Math.min(c.width-1,Math.floor(c.width*.99))),
                      width:c.width,height:c.height};
            }""")
            assert edges['left'][3] >= 250 and edges['right'][3] >= 250, edges
            assert sum(edges['left'][:3]) > 15 and sum(edges['right'][:3]) > 15, edges
            box = page.locator('#clash-joystick').bounding_box()
            assert box is not None
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.mouse.move(cx, cy)
            page.mouse.down()
            page.mouse.move(cx + box['width'] * 0.24, cy - box['height'] * 0.11, steps=4)
            page.wait_for_timeout(100)
            moved = page.locator('#clash-stick').get_attribute('style') or ''
            assert 'calc(' in moved, 'Thumb did not react to real pointer movement'
            page.mouse.up()
            neutral = page.locator('#clash-stick').get_attribute('style') or ''
            assert re.search(r'translate\(-50%,\s*-50%\)', neutral), 'Thumb did not recenter: %r' % neutral
            page.screenshot(path=str(OUT / ('clash-play-%s.png' % width)))
            page.locator('#clash-pause').click()
            assert page.locator('#clash-pause-menu').is_visible(), 'Pause did not open'
            with page.expect_download() as pending:
                page.locator('#clash-export-pause').click()
            download = pending.value
            assert download.suggested_filename.startswith('chroma-clash-zone-'), download.suggested_filename
            destination = OUT / ('clash-run-%s.json' % width)
            download.save_as(str(destination))
            log = json.loads(destination.read_text(encoding='utf-8'))
            assert log['status'] == 'in_progress', log
            assert log['summary']['highestZone'] == 1, log
            assert log['schema'] == 'chroma-clash-run-audit/1.0', log
            assert log['events'][0]['type'] == 'start', log
            page.locator('#clash-resume').click()
            assert page.locator('#clash-joystick').is_visible(), 'Resume hid joystick'
            # A direct button tap must request the native browser fullscreen
            # state; unsupported browsers show an honest, readable fallback.
            fullscreen_supported = page.evaluate("""() =>
              document.fullscreenEnabled !== false &&
              typeof document.getElementById('clash-shell').requestFullscreen === 'function'
            """)
            page.locator('#clash-fullscreen').click()
            page.wait_for_timeout(180)
            fullscreen_active = page.evaluate("""() =>
              document.fullscreenElement === document.getElementById('clash-shell')
            """)
            if fullscreen_active:
                assert page.locator('#clash-fullscreen').get_attribute('aria-pressed') == 'true'
                page.locator('#clash-fullscreen').click()
                page.wait_for_timeout(90)
                assert page.evaluate("() => !document.fullscreenElement")
            else:
                assert not fullscreen_supported or page.locator('#clash-fullscreen-status').is_visible(), 'Fullscreen was silently denied'
            timing = page.evaluate("""() => {
              const c=window.ChromaClashCore;
              const m=c.createMatch(43);
              m.elapsed=9.995;
              c.updateMatch(m,{x:0,y:0},1/120);
              const first={zone:m.zone,stage:m.stage,speed:c.speedForZone(m.zone),
                paletteFade:m.paletteFade,oldColor:c.activePalette(m)[0]};
              m.elapsed=c.COLLAPSES[0]-.01;
              c.updateMatch(m,{x:0,y:0},.02);
              const collapse={zone:m.zone,stage:m.stage,half:m.half,falling:m.falling.length};
              return {first,collapse};
            }""")
            assert timing['first'] == {'zone': 1, 'stage': 0, 'speed': 157,
                                       'paletteFade': 1.10, 'oldColor': '#3feeff'}, timing
            collapse = timing['collapse']
            assert collapse == {'zone': 1, 'stage': 1, 'half': 166, 'falling': 1}, collapse
            transition = page.evaluate("""() => {
              const t=window.ChromaCenterPulse;
              const source=document.createElement('canvas');
              source.width=120;source.height=80;
              const cx=source.getContext('2d',{willReadFrequently:true});
              cx.fillStyle='#121122';cx.fillRect(0,0,120,80);
              cx.save();
              t.clipNewColor(cx,{x:0,y:0,w:120,h:80},.4);
              cx.fillStyle='#33ccaa';cx.fillRect(0,0,120,80);
              cx.restore();
              t.drawFront(cx,{x:0,y:0,w:120,h:80},.4,'#33ccaa');
              const rgb=(x,y)=>Array.from(cx.getImageData(x,y,1,1).data).slice(0,3);
              return {corners:[[0,0],[119,0],[0,79],[119,79]].map(p=>rgb(...p)),
                center:rgb(60,40),duration:window.ChromaClashCore.COLOR_FADE_SECONDS};
            }""")
            assert all(p == [18, 17, 34] for p in transition['corners']), transition
            assert transition['center'][:3] == [51, 204, 170], transition
            assert transition['duration'] == 1.10, transition
            captures.append({'viewport': [width, height], 'canvas': canvas_size,
                             'rendered': True,
                             'joystickMoved': True, 'pausedAndResumed': True,
                             'collapse': collapse, 'tenSecondZone': timing['first'],
                             'centerPulse': transition, 'edgePixels': edges,
                             'fullscreenSupported': fullscreen_supported,
                             'fullscreenActivated': fullscreen_active,
                             'runLogDownloaded': True})
            page.close()
        # Exercise actual cached-world compositing, not just clip geometry:
        # the arena center must recolor BEFORE the outer playable corners.
        visual = browser.new_page(viewport={'width': 960, 'height': 540},
                                  device_scale_factor=1)
        visual.on('pageerror', lambda error: failures.append(str(error)))
        visual.set_content(inline_wave_scene(), wait_until='load')
        visual.evaluate('window.requestAnimationFrame=()=>0')
        old = visual.evaluate('window.__clashWaveCapture(0)')
        mid = visual.evaluate('window.__clashWaveCapture(.25)')
        new = visual.evaluate('window.__clashWaveCapture(1)')
        visual.evaluate('window.__clashWaveCapture(.25)')
        visual.screenshot(path=str(OUT / 'clash-center-pulse-25pct.png'))
        with_players = visual.evaluate('window.__clashWaveCapture(.02,false)')
        def delta(a, b):
            return sum(abs(u-v) for u, v in zip(a, b))
        assert delta(old['arenaCorner'], new['arenaCorner']) > 12, (old, new)
        assert delta(old['center'], new['center']) > 12, (old, new)
        assert delta(mid['arenaCorner'], old['arenaCorner']) <= 3, (old, mid, new)
        assert delta(mid['center'], new['center']) <= 3, (old, mid, new)
        assert delta(with_players['player'], with_players['besidePlayer']) > 30, with_players
        timings = visual.evaluate("""() => {
          const started=performance.now(), durations=[];
          for(let i=0;i<35;i++){
            const t=performance.now();
            window.__clashWaveCapture(.04+i/40);
            durations.push(performance.now()-t);
          }
          return {totalMs:performance.now()-started,
                  worstMs:Math.max(...durations)};
        }""")
        assert timings['totalMs'] < 3500, timings
        steady = visual.evaluate("""() => {
          const times=[];
          for(let i=0;i<120;i++){
            const t=performance.now();
            window.__clashWaveCapture(1);
            times.push(performance.now()-t);
          }
          return {totalMs:times.reduce((a,b)=>a+b,0),
                  maxMs:Math.max(...times)};
        }""")
        assert steady['totalMs'] < 3000, steady
        captures.append({'canvasWorld': 'Rush-style center-out Chroma Pulse, cached composite',
                         'performance': timings, 'steadyState': steady,
                         'playersVisibleAtZoneChange': True,
                         'oldColors': old, 'midTransition': mid, 'newColors': new})
        visual.close()
        browser.close()
    report = {'screens': captures, 'pageErrors': failures}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    if failures:
        raise AssertionError('Uncaught browser exception(s): ' + repr(failures))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
