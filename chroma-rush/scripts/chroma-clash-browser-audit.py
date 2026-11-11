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


def main():
    captures = []
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, executable_path=os.environ.get('CHROMA_CHROMIUM_PATH') or None,
            args=['--no-sandbox'])
        for width, height in ((960, 540), (812, 375)):
            page = browser.new_page(
                viewport={'width': width, 'height': height}, device_scale_factor=1,
                is_mobile=width == 812, has_touch=width == 812, accept_downloads=True)
            page.on('pageerror', lambda error: failures.append(str(error)))
            page.goto(URL, wait_until='load')
            page.wait_for_timeout(140)
            assert page.locator('#clash-menu').is_visible(), 'Missing first menu'
            assert page.locator('#clash-start').is_visible(), 'Start button not visible'
            assert page.locator('#clash-canvas').is_visible(), 'Canvas missing'
            assert page.locator('#clash-mode-link').count() == 0, 'Runner menu leaked'
            page.screenshot(path=str(OUT / ('clash-menu-%s.png' % width)))
            page.locator('#clash-start').click()
            page.wait_for_timeout(180)
            assert page.locator('#clash-hud').is_visible(), 'Arena HUD hidden after start'
            assert page.locator('#clash-joystick').is_visible(), 'Joystick hidden after start'
            assert page.locator('#clash-zone').inner_text() == 'ZONE 01', 'Invalid first zone'
            assert page.locator('#clash-count').inner_text() == '4 ALIVE', 'Missing AI cubes'
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
                                       'paletteFade': 1.55, 'oldColor': '#54dfff'}, timing
            collapse = timing['collapse']
            assert collapse == {'zone': 1, 'stage': 1, 'half': 166, 'falling': 1}, collapse
            transition = page.evaluate("""() => {
              const t=window.ChromaCornerTide;
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
            assert all(p[1] > 140 for p in transition['corners']), transition
            assert transition['center'][:3] == [18, 17, 34], transition
            assert transition['duration'] >= 1.4, transition
            captures.append({'viewport': [width, height], 'rendered': True,
                             'joystickMoved': True, 'pausedAndResumed': True,
                             'collapse': collapse, 'tenSecondZone': timing['first'],
                             'fourCornerWave': transition, 'runLogDownloaded': True})
            page.close()
        browser.close()
    report = {'screens': captures, 'pageErrors': failures}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    if failures:
        raise AssertionError('Uncaught browser exception(s): ' + repr(failures))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
