#!/usr/bin/env python3
"""Neon Circuit 2.2 real Chromium: Close Camera & Roller Ejections."""
from __future__ import annotations
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts"/"neon-circuit-audit"
OUT.mkdir(parents=True,exist_ok=True)


def main():
    checks=[]
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(
            headless=True,
            executable_path=os.environ.get("CHROMA_CHROMIUM_PATH") or None,
            args=["--no-sandbox"])
        for w,h in [(960,540),(812,375),(1400,700)]:
            page=browser.new_page(
                viewport={"width":w,"height":h},device_scale_factor=3,
                is_mobile=w!=960,has_touch=w!=960,accept_downloads=True)
            page.on("pageerror",lambda error:errors.append(str(error)))
            page.goto((ROOT/"neon-circuit.html").as_uri(),wait_until="load")
            page.wait_for_function("() => !!window.ChromaCircuitViewDebug")
            assert page.locator("#circuit-menu").is_visible()
            page.screenshot(path=str(OUT/f"circuit-2-menu-{w}.png"))
            geometry=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,
                cam=window.ChromaCircuitCamera,
                t=c.TRACK,pts=t.samples,r=c.seededRace(26);
              const vw=window.innerWidth,vh=window.innerHeight;
              return {
                length:t.length,geometryFinite:pts.every(s=>
                  Number.isFinite(s.x)&&Number.isFinite(s.y)),
                closed:Math.hypot(pts[0].x-pts.at(-1).x,
                  pts[0].y-pts.at(-1).y),
                layout:t.layout,courses:c.TRACKS.length,
                bounds:t.bounds,name:t.name,racers:r.racers.length,
                worldBounds:c.WORLD_BOUNDS,
                cameraModule:typeof cam.step==="function",
                speed:c.zoneSpeed(0),viewport:[vw,vh],
                dynamicZoom:[cam.desiredZoom(vh,172),cam.desiredZoom(vh,265)]
              };
            }""")
            assert geometry["closed"]<.01 and geometry["geometryFinite"],geometry
            assert geometry["length"]>4600 and geometry["courses"]==1,geometry
            assert geometry["racers"]==4 and geometry["cameraModule"],geometry
            assert geometry["speed"]==172,geometry
            assert geometry["layout"]=="multi-screen-world-track",geometry
            b=geometry["bounds"]
            assert b["maxX"]-b["minX"]>1800 and b["maxY"]-b["minY"]>900,b
            assert geometry["dynamicZoom"][1]<geometry["dynamicZoom"][0],geometry

            page.locator("#circuit-start").click()
            page.wait_for_timeout(400)
            for id in ["circuit-joystick","circuit-brake","circuit-dash","circuit-pause"]:
                assert page.locator("#"+id).is_visible(),id
            assert page.locator("#circuit-lap").inner_text()=="LAP 1/3"
            first=page.evaluate("() => window.ChromaCircuitViewDebug.snapshot()")
            assert first["camera"] is not None,first
            assert first["tiles"]>0 and first["tiles"]<=36,first
            assert first["camera"]["zoom"]>1.4*h/540,first
            # A 2D follow camera reveals only a FRACTION of the road.
            width_world=first["viewport"]["width"]/first["camera"]["zoom"]
            height_world=first["viewport"]["height"]/first["camera"]["zoom"]
            assert width_world<(b["maxX"]-b["minX"])*.85,(width_world,b)
            assert height_world<(b["maxY"]-b["minY"])*.85,(height_world,b)
            pixels=page.evaluate("""() => {
              const c=document.getElementById('circuit-canvas'),
                g=c.getContext('2d'),
                pixel=(x,y)=>Array.from(g.getImageData(
                  Math.floor(c.width*x),Math.floor(c.height*y),1,1).data);
              return {width:c.width,height:c.height,left:pixel(.01,.5),
                right:pixel(.99,.5),center:pixel(.5,.5)};
            }""")
            assert pixels["width"]*pixels["height"]<=752000,pixels
            assert all(col[3]>=250 for col in [pixels["left"],pixels["right"]]),pixels
            # Compare a ROAD pixel in two cached zones, at precisely the
            # SAME WORLD coordinate, avoiding camera motion artifacts.
            pigmentation=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,
                debug=window.ChromaCircuitViewDebug,
                p=c.pointAt(150);
              return {old:debug.sampleRoad(0,p.x,p.y),
                new:debug.sampleRoad(1,p.x,p.y)};
            }""")
            delta=sum(abs(a-b) for a,b in zip(
                pigmentation["old"][:3],pigmentation["new"][:3]))
            assert pigmentation["old"][3]>245 and pigmentation["new"][3]>245,pigmentation
            assert delta>35,(delta,pigmentation)
            # Controls remain user-driven and responsive.
            box=page.locator("#circuit-joystick").bounding_box()
            assert box
            x,y=box["x"]+box["width"]*.5,box["y"]+box["height"]*.5
            page.mouse.move(x,y);page.mouse.down()
            page.mouse.move(x+box["width"]*.24,y-box["height"]*.14,steps=4)
            assert "calc(" in (page.locator("#circuit-stick").get_attribute("style") or "")
            page.mouse.up()
            assert "translate(-50%," in (page.locator("#circuit-stick").get_attribute("style") or "")
            brake=page.locator("#circuit-brake").bounding_box()
            assert brake
            page.mouse.move(brake["x"]+brake["width"]*.5,
                            brake["y"]+brake["height"]*.5)
            page.mouse.down()
            assert "pressed" in (page.locator("#circuit-brake").get_attribute("class") or "")
            page.mouse.up()
            assert "pressed" not in (page.locator("#circuit-brake").get_attribute("class") or "")
            page.wait_for_timeout(2600)
            # The cube cannot automatically drive while the player is idle.
            stationary=page.evaluate("() => window.ChromaCircuitViewDebug.snapshot()")
            idle_distance=((stationary["player"]["x"]-first["player"]["x"])**2+
                (stationary["player"]["y"]-first["player"]["y"])**2)**.5
            assert stationary["player"]["speed"]<1,("neutral drive regression",stationary)
            # With genuine bump physics AI may displace an idle player.
            assert idle_distance<90,("unexpected idle displacement",idle_distance)
            assert page.locator("#circuit-dash").is_disabled()
            # Keyboard is a deterministic full-deflection joystick surrogate.
            page.keyboard.down("ArrowRight")
            page.wait_for_timeout(1600)
            assert page.locator("#circuit-dash").is_enabled()
            page.locator("#circuit-dash").click()
            page.wait_for_timeout(450)
            page.keyboard.up("ArrowRight")
            assert page.locator("#circuit-dash").is_disabled()
            moved=page.evaluate("() => window.ChromaCircuitViewDebug.snapshot()")
            assert moved["camera"]["updates"]>5,moved
            assert moved["player"]["x"]>first["player"]["x"]+12,(first,moved)
            assert moved["camera"]["x"]>first["camera"]["x"]+10,(first,moved)
            assert moved["tiles"]<=36,moved
            page.screenshot(path=str(OUT/f"circuit-2-world-race-{w}.png"))
            if w==960:
                page.wait_for_function(
                    "() => document.getElementById('circuit-zone').textContent === 'ZONE 02'",
                    timeout=24000)
                page.wait_for_timeout(500)
                page.screenshot(path=str(OUT/"circuit-2-track-tide-mid.png"))
                page.wait_for_timeout(1150)
                page.screenshot(path=str(OUT/"circuit-2-track-tide-complete.png"))
            page.locator("#circuit-pause").click()
            assert page.locator("#circuit-pause-menu").is_visible()
            with page.expect_download() as waiter:
                page.locator("#circuit-export-pause").click()
            download=waiter.value
            assert download.suggested_filename.startswith("neon-circuit-zone-")
            destination=OUT/f"circuit-2-run-{w}.json"
            download.save_as(str(destination))
            log=json.loads(destination.read_text(encoding="utf-8"))
            assert log["schema"]=="neon-circuit-run-audit/2.2",log
            assert log["summary"]["cameraMode"]=="close-follow-damped-zoom"
            assert log["summary"]["edgeMode"]=="momentum-falls-without-autocorrect"
            assert log["summary"]["controlMode"]=="hold-to-drive-manual-steering"
            assert log["summary"]["driveSeconds"]>.5
            assert log["summary"]["waveMode"]=="forward-track-only"
            assert log["courseId"]=="spectral-highway"
            assert log["summary"]["dashes"]==1,log
            assert log["summary"]["performance"]["tileBuilds"]>0,log
            page.locator("#circuit-resume").click()
            assert page.locator("#circuit-dash").is_visible()
            page.locator("#circuit-fullscreen").click()
            page.wait_for_timeout(100)
            fullscreen=page.evaluate("""() =>
              document.fullscreenElement===document.getElementById('circuit-shell')
            """)
            if fullscreen:
                assert page.locator("#circuit-fullscreen").get_attribute("aria-pressed")=="true"
                page.locator("#circuit-fullscreen").click()
            # Ensure AI and player share real physical finish gates.
            rules=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,
                r=c.seededRace(12);r.phase='running';r.elapsed=9.995;
              c.tick(r,{},c.STEP);
              const zone={zone:r.zone,speed:c.zoneSpeed(r.zone),
                wave:c.waveState(r).scope};
              const p=r.racers[0];
              r.elapsed=74;r.zone=6;p.gatePasses=12;p.laps=2;
              p.progress=r.track.length*3-4;
              const pos=c.pointAt(p.progress,r.track);
              p.x=pos.x;p.y=pos.y;p.angle=pos.angle;p.speed=230;
              c.tick(r,{x:pos.tx,y:pos.ty},1/30);
              return {...zone,finished:p.finished,
                laps:p.laps,place:r.finishPlace};
            }""")
            assert rules["zone"]==1 and rules["speed"]==186,rules
            assert rules["wave"]=="track-only",rules
            assert rules["finished"] and rules["laps"]==3,rules
            # Deterministic browser proof: a momentum hit can push a rival
            # over the shoulder while the attacking player recovers.
            ejection=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,r=c.seededRace(10);
              r.phase='running';r.elapsed=5;
              for(const p of r.racers.slice(2))p.finished=true;
              const a=r.racers[0],b=r.racers[1],p=c.pointAt(540);
              a.x=p.x-p.nx*12;a.y=p.y-p.ny*12;
              a.angle=Math.atan2(p.ny,p.nx);a.speed=210;
              b.x=p.x+p.nx*9;b.y=p.y+p.ny*9;
              b.angle=p.angle;b.speed=20;
              for(let i=0;i<120;i++)c.tick(r,i<2?
                {x:p.nx,y:p.ny}:{x:p.tx,y:p.ty,brake:i<25},c.STEP);
              return {victimFalls:b.falls,attackerFalls:a.falls,
                knockouts:a.knockouts};
            }""")
            assert ejection=={"victimFalls":1,"attackerFalls":0,
                "knockouts":1},ejection
            assert not errors,errors
            checks.append({
                "viewport":[w,h],"geometry":geometry,
                "initialCamera":first["camera"],"movingCamera":moved["camera"],
                "colorDelta":delta,"roadPixels":pigmentation,
                "cameraWorldViewport":[width_world,height_world],
                "screenPixels":pixels,"rules":rules,
                "fullscreenActivated":fullscreen,"pageErrors":[]})
            page.close()
        browser.close()
    assert not errors,errors
    (OUT/"neon-circuit-browser-audit.json").write_text(
        json.dumps({"checks":checks,"pageErrors":errors},indent=2),
        encoding="utf-8")
    print(json.dumps({"checks":checks,"pageErrors":errors}))


if __name__=="__main__":
    main()
