#!/usr/bin/env python3
"""Development-only Chromium visual/performance comparisons.

Actual phone frame pacing requires device testing. Numbers in the JSON artifact
are headless Chromium benchmarks, not hardware guarantees.
"""
from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts' / 'performance-audit'
OUTPUT.mkdir(parents=True, exist_ok=True)
source = Path(__file__).with_name('visual-audit.py')
spec = importlib.util.spec_from_file_location('chroma_visual_suite', source)
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)
html = visual.inline_game_html()
marker = '  requestAnimationFrame(frame);\n})();'
assert html.count(marker) == 1, 'Cannot attach test-only benchmark controls'
html = html.replace(marker, r'''
  // Test-only synchronous renderer benchmark; never deployed with the game.
  window.__perfBench = {
    capture(mode, repeats=75){
      quality.setMode(mode);resize();
      const start=performance.now();
      for(let i=0;i<repeats;i++){worldTime+=.01667;draw();}
      const ms=(performance.now()-start)/repeats;
      return {mode,averageRenderMs:Math.round(ms*100)/100,
        canvasWidth:canvas.width,canvasHeight:canvas.height,
        profile:quality.snapshot().tier};
    }
  };
''' + marker, 1)

checks=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.getenv('CHROMA_CHROMIUM_PATH') or None,
                              args=['--no-sandbox'])
    for width,height in [(900,410),(640,330)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html,wait_until='load')
        page.evaluate('window.requestAnimationFrame=()=>0')
        page.evaluate('window.__visualAudit.setScene("hills")')
        profile_results={}
        for mode in ['high','balanced','performance']:
            # Mode changes set canvas backing resolution; gameplay geometry stays fixed.
            stats=page.evaluate('(mode)=>window.__perfBench.capture(mode)',mode)
            assert stats['mode']==mode and stats['profile']==mode,stats
            profile_results[mode]=stats
            page.screenshot(path=str(OUTPUT / f'{width}x{height}-{mode}.png'))
        hi=profile_results['high'];low=profile_results['performance']
        assert hi['canvasWidth']*hi['canvasHeight'] > low['canvasWidth']*low['canvasHeight'],profile_results
        # Recheck a real gap in performance mode. No black rectangle may reappear.
        page.evaluate('window.__visualAudit.setScene("gap")')
        gap=page.evaluate('window.__visualAudit.sample(790,575)')
        page.evaluate('window.__visualAudit.setScene("background")')
        back=page.evaluate('window.__visualAudit.sample(790,575)')
        assert gap==back, (gap,back)
        # Verify the new quality control exists and works on the smallest screen.
        page.locator('#graphics-btn').click()
        assert page.locator('#graphics-panel').is_visible()
        page.locator('#graphics-mode').select_option('balanced')
        assert page.locator('#graphics-active').inner_text()=='BALANCED · BALANCED'
        checks.append({'viewport':f'{width}x{height}','profiles':profile_results,
                       'gapBackgroundMatch':gap==back,'graphicsMenuWorks':True})
        page.close()
    browser.close()
assert not errors, errors
report={'note':'Synthetic headless Chromium. Not a prediction of Android FPS.',
        'results':checks,'browserErrors':errors}
(OUTPUT/'results.json').write_text(json.dumps(report,indent=2))
print('PASS: profile switching, visual screenshots, pixel caps and open gap background at 2 device-scale-2 sizes')
for c in checks:
    print(c['viewport'] + ': ' + ', '.join(
          m+' '+str(v['averageRenderMs'])+'ms/'+str(v['canvasWidth'])+'x'+str(v['canvasHeight'])
          for m,v in c['profiles'].items()))
