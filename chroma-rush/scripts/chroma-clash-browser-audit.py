#!/usr/bin/env python3
"""Headless smoke check for the standalone Chroma Clash 1.0 page."""
from __future__ import annotations

import json
import os
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
                is_mobile=width == 812, has_touch=width == 812)
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
            assert 'translate(-50%,-50%)' in neutral, 'Thumb did not recenter'
            page.screenshot(path=str(OUT / ('clash-play-%s.png' % width)))
            page.locator('#clash-pause').click()
            assert page.locator('#clash-pause-menu').is_visible(), 'Pause did not open'
            page.locator('#clash-resume').click()
            assert page.locator('#clash-joystick').is_visible(), 'Resume hid joystick'
            collapse = page.evaluate("""() => {
              const c=window.ChromaClashCore;
              const m=c.createMatch(43);
              m.elapsed=c.COLLAPSES[0]-.01;
              c.updateMatch(m,{x:0,y:0},.02);
              return {stage:m.stage,half:m.half,falling:m.falling.length};
            }""")
            assert collapse == {'stage': 1, 'half': 166, 'falling': 1}, collapse
            captures.append({'viewport': [width, height], 'rendered': True,
                             'joystickMoved': True, 'pausedAndResumed': True,
                             'collapse': collapse})
            page.close()
        browser.close()
    report = {'screens': captures, 'pageErrors': failures}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    if failures:
        raise AssertionError('Uncaught browser exception(s): ' + repr(failures))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
