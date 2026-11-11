#!/usr/bin/env python3
"""Independent browser smoke and screenshot QA for NEON TRAILS 1.1."""
from __future__ import annotations
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "neon-trails-audit"
OUT.mkdir(parents=True, exist_ok=True)

def main():
    all_reports = []
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, executable_path=os.environ.get("CHROMA_CHROMIUM_PATH") or None,
            args=["--no-sandbox"])
        for width, height in ((960, 540), (812, 375), (1400, 700)):
            page = browser.new_page(
                viewport={"width": width, "height": height},
                device_scale_factor=3, is_mobile=width!=960,
                has_touch=width!=960, accept_downloads=True)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto((ROOT/"neon-trails.html").as_uri(), wait_until="load")
            assert page.locator("#trails-menu").is_visible(), "Menu must open"
            assert page.locator("#trails-start").is_visible()
            page.screenshot(path=str(OUT/f"neon-menu-{width}.png"))
            page.locator("#trails-start").click()
            page.wait_for_timeout(120)
            assert page.locator("#trails-hud").is_visible()
            assert page.locator("#trails-joystick").is_visible()
            assert page.locator("#trails-dash").is_visible()
            assert page.locator("#trails-zone").inner_text()=="ZONE 01"
            assert page.locator("#trails-count").inner_text()=="4 ALIVE"
            # Four colored glass cube sprites must actually draw. On ultrawide
            # devices the sides must show the same atmospheric sky.
            pixels=page.evaluate("""() => {
              const c=document.getElementById('trails-canvas'),g=c.getContext('2d');
              const sample=(x,y)=>{
                const p=g.getImageData(Math.round(c.width*x),
                  Math.round(c.height*y),1,1).data;
                return [...p];
              };
              return {w:c.width,h:c.height,left:sample(.01,.48),
                right:sample(.99,.48),center:sample(.5,.5)};
            }""")
            assert pixels["w"]*pixels["h"] <= 752000, pixels
            assert all(x[3]>=250 and sum(x[:3])>15 for x in
                       [pixels["left"],pixels["right"]]), pixels
            box=page.locator("#trails-joystick").bounding_box()
            assert box
            x,y=box["x"]+box["width"]/2,box["y"]+box["height"]/2
            page.mouse.move(x,y)
            page.mouse.down()
            page.mouse.move(x+box["width"]*.25,y-box["height"]*.15,steps=4)
            assert "calc(" in (page.locator("#trails-stick").get_attribute("style") or "")
            page.mouse.up()
            neutral=page.locator("#trails-stick").get_attribute("style") or ""
            assert re.search(r"translate\(-50%,\s*-50%\)",neutral), neutral
            page.locator("#trails-dash").click()
            page.wait_for_timeout(65)
            assert page.locator("#trails-dash").is_disabled(), "Dash must cool down"
            page.screenshot(path=str(OUT/f"neon-play-{width}.png"))
            page.locator("#trails-pause").click()
            assert page.locator("#trails-pause-menu").is_visible()
            with page.expect_download() as waiter:
                page.locator("#trails-export-pause").click()
            download=waiter.value
            assert download.suggested_filename.startswith("neon-trails-zone-")
            path=OUT/f"neon-run-{width}.json"
            download.save_as(str(path))
            log=json.loads(path.read_text(encoding="utf-8"))
            assert log["schema"]=="neon-trails-run-audit/1.1"
            assert log["status"]=="in_progress"
            assert log["summary"]["playerDashes"]==1, log
            page.locator("#trails-resume").click()
            assert page.locator("#trails-joystick").is_visible()
            page.locator("#trails-fullscreen").click()
            page.wait_for_timeout(80)
            fullscreen=page.evaluate("""() =>
              document.fullscreenElement === document.getElementById('trails-shell')
            """)
            if fullscreen:
                assert page.locator("#trails-fullscreen").get_attribute("aria-pressed")=="true"
                page.locator("#trails-fullscreen").click()
            # Pure core validation via actual browser loaded modules.
            simulation=page.evaluate("""() => {
              const c=window.ChromaNeonTrailsCore;
              const m=c.createGame(27);
              m.elapsed=9.995;
              c.tick(m,{x:0,y:0},1/60);
              return {zone:m.zone,speed:m.maxSpeed,
                pulse:m.paletteFade,players:m.players.length,
                stage:m.stage};
            }""")
            assert simulation["zone"]==1 and simulation["speed"]==121, simulation
            assert simulation["players"]==4
            assert simulation["pulse"]>0
            assert not errors, errors
            all_reports.append({"viewport":[width,height],"pixels":pixels,
                "simulation":simulation,"dashWorks":True,"logDownloaded":True,
                "fullscreenActivated":fullscreen,"pageErrors":[]})
            page.close()
        browser.close()
    assert not errors, errors
    path=OUT/"neon-trails-browser-audit.json"
    path.write_text(json.dumps({"checks":all_reports,"pageErrors":errors},indent=2),
        encoding="utf-8")
    print(json.dumps({"checks":all_reports,"pageErrors":errors}))

if __name__ == "__main__":
    main()
