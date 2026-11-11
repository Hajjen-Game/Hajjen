#!/usr/bin/env python3
"""Real Chromium mobile/desktop functional + screenshot audit: NEON CIRCUIT."""
from __future__ import annotations
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts"/"neon-circuit-audit"
OUT.mkdir(parents=True,exist_ok=True)

def main():
    all_checks=[]
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,
            executable_path=os.environ.get("CHROMA_CHROMIUM_PATH") or None,
            args=["--no-sandbox"])
        for w,h in [(960,540),(812,375),(1400,700)]:
            page=browser.new_page(viewport={"width":w,"height":h},
                device_scale_factor=3,is_mobile=w!=960,
                has_touch=w!=960,accept_downloads=True)
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.goto((ROOT/"neon-circuit.html").as_uri(),wait_until="load")
            assert page.locator("#circuit-menu").is_visible(), "Race menu unavailable"
            page.screenshot(path=str(OUT/f"circuit-menu-{w}.png"))
            geometry=page.evaluate("""() => {
                const c=window.ChromaNeonCircuitCore;
                const pts=c.TRACK.samples;
                const check=pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
                const r=c.seededRace(21);
                return {closed:Math.hypot(pts[0].x-pts.at(-1).x,
                    pts[0].y-pts.at(-1).y),length:c.TRACK.length,
                    points:pts.length,geometryFinite:check,
                    racerCount:r.racers.length,zoneSeconds:c.ZONE_SECONDS,
                    courses:c.TRACKS.map(t=>({id:t.courseId,length:t.length,
                      name:t.name,closed:Math.hypot(t.samples[0].x-t.samples.at(-1).x,
                        t.samples[0].y-t.samples.at(-1).y)}))};
            }""")
            assert geometry["closed"]<.01 and geometry["geometryFinite"],geometry
            assert geometry["length"]>1200 and geometry["racerCount"]==4,geometry
            assert len(geometry["courses"])==3,geometry
            assert all(t["closed"]<.01 for t in geometry["courses"]),geometry
            page.locator("#circuit-start").click()
            page.wait_for_timeout(300)
            assert page.locator("#circuit-joystick").is_visible()
            assert page.locator("#circuit-brake").is_visible()
            assert page.locator("#circuit-dash").is_visible()
            assert page.locator("#circuit-lap").inner_text()=="LAP 1/3"
            pixels=page.evaluate("""() => {
              const c=document.getElementById('circuit-canvas');
              const g=c.getContext('2d');
              const get=(x,y)=>Array.from(g.getImageData(
                  Math.min(c.width-1,Math.floor(c.width*x)),
                  Math.min(c.height-1,Math.floor(c.height*y)),1,1).data);
              return {width:c.width,height:c.height,left:get(.01,.48),
                right:get(.99,.48),road:get(.5,.22),center:get(.5,.5)};
            }""")
            assert pixels["width"]*pixels["height"]<=752000,pixels
            assert all(col[3]>=250 and sum(col[:3])>13 for col in
                (pixels["left"],pixels["right"])),pixels
            box=page.locator("#circuit-joystick").bounding_box()
            assert box
            x,y=box["x"]+box["width"]*.5,box["y"]+box["height"]*.5
            page.mouse.move(x,y);page.mouse.down()
            page.mouse.move(x+box["width"]*.25,y-box["height"]*.18,steps=5)
            assert "calc(" in (page.locator("#circuit-stick").get_attribute("style") or "")
            page.mouse.up()
            assert "translate(-50%," in (page.locator("#circuit-stick").get_attribute("style") or "")
            # Hold BRAKE with a real pointer interaction.
            b=page.locator("#circuit-brake").bounding_box()
            assert b
            page.mouse.move(b["x"]+b["width"]*.5,b["y"]+b["height"]*.5)
            page.mouse.down()
            assert "pressed" in (page.locator("#circuit-brake").get_attribute("class") or "")
            page.mouse.up()
            assert "pressed" not in (page.locator("#circuit-brake").get_attribute("class") or "")
            # Countdown is non-lethal, so wait for a real GO.
            page.wait_for_timeout(2650)
            page.locator("#circuit-dash").click()
            page.wait_for_timeout(100)
            assert page.locator("#circuit-dash").is_disabled(),"Dash cooldown missing"
            page.screenshot(path=str(OUT/f"circuit-race-{w}.png"))
            if w==960:
                # Pixel regression: the color wave MUST repaint the asphalt
                # while the inner-circuit background remains byte-identical.
                def colors():
                    return page.evaluate("""() => {
                      const c=document.getElementById('circuit-canvas'),
                        g=c.getContext('2d');
                      const at=(x,y)=>Array.from(g.getImageData(
                        Math.round(x),Math.round(y),1,1).data);
                      return {world:at(480,270),road:at(550,119)};
                    }""")
                first=colors()
                page.wait_for_function(
                    "() => document.getElementById('circuit-zone').textContent === 'ZONE 02'",
                    timeout=22000)
                page.wait_for_timeout(550)
                page.screenshot(path=str(OUT/"circuit-track-tide-mid.png"))
                page.wait_for_timeout(1100)
                after=colors()
                assert first["world"]==after["world"],(first,after)
                road_delta=sum(abs(a-b) for a,b in
                               zip(first["road"],after["road"]))
                assert road_delta>35,(road_delta,first,after)
                page.screenshot(path=str(OUT/"circuit-track-tide-complete.png"))
            page.locator("#circuit-pause").click()
            assert page.locator("#circuit-pause-menu").is_visible()
            with page.expect_download() as waiter:
                page.locator("#circuit-export-pause").click()
            download=waiter.value
            assert download.suggested_filename.startswith("neon-circuit-zone-")
            destination=OUT/f"circuit-run-{w}.json"
            download.save_as(str(destination))
            log=json.loads(destination.read_text(encoding="utf-8"))
            assert log["schema"]=="neon-circuit-run-audit/1.2",log
            assert log["summary"]["waveMode"]=="forward-track-only",log
            assert log["courseId"]==geometry["courses"][0]["id"],log
            assert log["status"]=="in_progress",log
            assert log["summary"]["dashes"]==1,log
            page.locator("#circuit-resume").click()
            assert page.locator("#circuit-dash").is_visible()
            page.locator("#circuit-fullscreen").click()
            page.wait_for_timeout(100)
            active=page.evaluate("""() =>
              document.fullscreenElement===document.getElementById('circuit-shell')
            """)
            if active:
                assert page.locator("#circuit-fullscreen").get_attribute("aria-pressed")=="true"
                page.locator("#circuit-fullscreen").click()
            # Pure core: zone changes and real 3-lap completion from track motion.
            logic=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore;
              const m=c.seededRace(12);m.phase='running';m.elapsed=9.995;
              c.tick(m,{},1/60);
              const result={zone:m.zone,tide:m.tide,speed:c.zoneSpeed(m.zone)};
              const racer=m.racers[0];m.elapsed=55;m.zone=5;
              racer.gatePasses=12;racer.laps=2;
              racer.progress=c.TRACK.length*3-4;
              const at=c.pointAt(racer.progress);
              racer.x=at.x;racer.y=at.y;racer.angle=at.angle;racer.speed=155;
              c.tick(m,{x:at.tx,y:at.ty},1/30);
              result.completed=racer.finished;result.place=m.finishPlace;
              result.laps=racer.laps;
              const w=c.waveState(m);
              result.waveScope=w.scope;result.waveDirection=w.direction;
              result.waveProgress=w.progress;
              return result;
            }""")
            assert logic["zone"]==1 and logic["tide"]>0,logic
            assert logic["speed"]==130 and logic["completed"],logic
            assert logic["laps"]==3,logic
            assert (logic["waveScope"]=="track-only" and
                    logic["waveDirection"]=="forward"),logic
            # Each new race changes the course rather than repeating an
            # identical oval. The HUD names the new route at countdown.
            page.locator("#circuit-pause").click()
            page.locator("#circuit-restart").click()
            assert "SPECTRAL STRAIGHTS" in page.locator("#circuit-announce").inner_text()
            page.screenshot(path=str(OUT/f"circuit-course-2-{w}.png"))
            page.locator("#circuit-pause").click()
            page.locator("#circuit-restart").click()
            assert "APEX SWITCHBACK" in page.locator("#circuit-announce").inner_text()
            page.screenshot(path=str(OUT/f"circuit-course-3-{w}.png"))
            assert not errors,errors
            all_checks.append({"viewport":[w,h],"track":geometry,
                "pixels":pixels,"raceRules":logic,
                "dashWorks":True,"brakeWorks":True,"logExported":True,
                "fullscreenActivated":active,"pageErrors":[]})
            page.close()
        browser.close()
    assert not errors,errors
    (OUT/"neon-circuit-browser-audit.json").write_text(
        json.dumps({"checks":all_checks,"pageErrors":errors},indent=2),
        encoding="utf-8")
    print(json.dumps({"checks":all_checks,"pageErrors":errors}))

if __name__=="__main__":
    main()
