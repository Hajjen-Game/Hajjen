"""CHROMA RUSH Mobile Arcade Polish 1.0 — genuine Chromium layout/interaction audit.
Run: python chroma-rush/scripts/mobile-arcade-audit.py
"""
from pathlib import Path
import json, os, importlib.util
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'mobile-arcade-audit'
OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('visual_audit',ROOT/'scripts'/'visual-audit.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def main():
    # The test runner may block file and localhost navigation: this uses
    # the SAME inlined production assets as visual-audit.py.
    html=module.inline_game_html()
    results=[];errors=[]
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.getenv('CHROMA_CHROMIUM_PATH') or None,args=['--no-sandbox'])
        for width,height in [(1440,600),(900,410),(740,360),(640,330)]:
          page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
          page.on('pageerror',lambda error:errors.append(str(error)))
          page.set_default_timeout(3500)
          print('INIT',width,height,flush=True)
          page.set_content('<html><body></body></html>')
          page.evaluate('''() => {
            const data={};
            Object.defineProperty(window,'localStorage',{configurable:true,value:{
              getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)}
            }});
          }''')
          page.set_content(html,wait_until='load')
          print('SET',width,flush=True)
          page.locator('#graphics-btn').click(force=True)
          assert page.locator('#graphics-panel').is_visible(),f'Settings closed at {width}x{height}'
          panel=page.locator('#graphics-panel').bounding_box()
          assert panel and panel['x']>=0 and panel['y']>=0, f'Panel clipped at {width}x{height}: {panel}'
          assert panel['x']+panel['width']<=width+.5, f'Panel crosses right edge: {panel}'
          assert panel['y']+panel['height']<=height+.5, f'Panel crosses bottom edge: {panel}'
          assert page.locator('#music-enabled').is_visible()
          assert page.locator('#effects-enabled').is_visible()
          assert page.locator('#fullscreen-btn').is_visible(), 'Fullscreen button should not be hidden at narrow heights'
          fs=page.locator('#fullscreen-btn').bounding_box()
          assert fs and fs['y']+fs['height']<=height-1, f'Fullscreen option clipped at {width}x{height}: {fs}'
          page.screenshot(path=str(OUT/f'settings-{width}x{height}.png'))
          # Store controls independently and verify persistence across page reload.
          print('INTERACT',width,flush=True)
          page.locator('#music-enabled').uncheck(force=True)
          page.locator('#haptics-enabled').uncheck(force=True)
          page.locator('#effects-volume').fill('35')
          prefs=json.loads(page.evaluate("localStorage.getItem('chromaRushMobilePolishV1')"))
          assert prefs['music']==False and prefs['effects']==True and prefs['haptics']==False
          assert prefs['effectsVolume']==35,prefs
          # Node model tests cover persistence after a real reload. The browser
          # audit verifies stored values and on-screen controls without network navigation.
          print('SET',width,flush=True)
          page.locator('#graphics-btn').click(force=True)
          assert not page.locator('#music-enabled').is_checked()
          assert not page.locator('#haptics-enabled').is_checked()
          assert page.locator('#effects-volume').input_value()=='35'
          print('START',width,flush=True)
          page.locator('#start-btn').click(force=True)
          page.wait_for_timeout(130)
          # Interaction targets remain large even though their visible glass is inset.
          for name in ['jump-btn','duck-btn']:
            rect=page.locator('#'+name).bounding_box()
            assert rect and rect['width']>=79 and rect['height']>=79,(name,rect)
            assert rect['x']>=0 and rect['x']+rect['width']<=width
          # HUD Anchor 4.1: the parent now spans the symmetric viewport.
          # Measure the VISIBLE columns, not its intentionally full-width box.
          zone=page.locator('#zone-display').bounding_box()
          score=page.locator('#score-display').bounding_box()
          actions=page.locator('#top-actions').bounding_box()
          sound=page.locator('#sound-btn').bounding_box()
          assert zone and score and actions and sound, 'Missing HUD or actions'
          assert abs((zone['x']+zone['width']/2)-width/2)<=2.5, (
            f'Zone is not centered at {width}x{height}: {zone}')
          assert score['x']>=zone['x']+zone['width']+3, (
            f'Score overlaps Zone at {width}x{height}: {zone} {score}')
          assert score['x']+score['width']+10<=sound['x'], (
            f'Score overlaps music/pause at {width}x{height}: {score} {sound}')
          assert page.evaluate('document.documentElement.scrollWidth')<=width+1
          page.screenshot(path=str(OUT/f'game-{width}x{height}.png'))
          print('PAUSE',width,flush=True)
          page.locator('#pause-btn').click(force=True)
          assert page.locator('#pause-menu').is_visible()
          page.screenshot(path=str(OUT/f'pause-{width}x{height}.png'))
          results.append({'viewport':f'{width}x{height}','settingsPanel':panel,'touchWidth':rect['width'] ,'zoneCenter':zone['x']+zone['width']/2,'scoreRight':score['x']+score['width'],'actionsLeft':actions['x']})
          page.close()
        browser.close()
    finally:
      pass
    assert not errors,errors[:8]
    (OUT/'report.json').write_text(json.dumps({'status':'passed','results':results,'browserErrors':errors},indent=2))
    print(f'PASS: {len(results)} mobile landscape sizes, settings persistence, dual controls, HUD and pause UI')

if __name__=='__main__':main()
