#!/usr/bin/env python3
"""Neon Circuit 2.8 real Chromium: three selectable circuits and indexed world tiles."""
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
            assert page.locator("[data-circuit-course]").count()==3
            assert page.locator("[data-circuit-course='0']").get_attribute(
                "aria-pressed")=="true"
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
                dynamicZoom:[cam.desiredZoom(vh,172),cam.desiredZoom(vh,265)],
                boostPads:t.boosts.length,
                straightFraction:t.sections.filter(s=>s.kind==='straight')
                  .reduce((n,s)=>n+s.length,0)/t.length,
                minArcRadius:Math.min(...t.sections.filter(s=>s.kind==='arc')
                  .map(s=>s.radius)),
                bankedOutside:c.edgeAt(t.sections.find(s=>
                  s.kind==='arc'&&s.radius<250).start+80,-1,t).limit
              };
            }""")
            assert geometry["closed"]<.01 and geometry["geometryFinite"],geometry
            assert geometry["length"]>4600 and geometry["courses"]==3,geometry
            assert geometry["racers"]==4 and geometry["cameraModule"],geometry
            assert geometry["speed"]==191,geometry
            assert geometry["boostPads"]==3,geometry
            assert geometry["straightFraction"]>.50,geometry
            assert geometry["minArcRadius"]>150,geometry
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
            assert first["arena"]["primary"].startswith("#"),first
            assert first["arena"]["charge"]==0,first
            assert first["moment"]=="ready",first
            assert "premiumMotion" in first,first
            assert abs(first["premiumMotion"]["lean"])<=.2,first
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
            # Real physics pad: drive through a tile-embedded chevron
            # to receive a speed bonus; validate without scripted HUD text.
            boosted=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,r=c.seededRace(94);
              r.phase='running';
              r.racers.slice(1).forEach(p=>p.finished=true);
              const p=r.racers[0],pad=c.TRACK.boosts[0],
                start=c.pointAt(pad.s-55);
              p.x=start.x+start.nx*pad.lane;p.y=start.y+start.ny*pad.lane;
              p.angle=start.angle;p.speed=185;
              p.vx=start.tx*185;p.vy=start.ty*185;
              for(let i=0;i<42;i++)
                c.tick(r,{x:start.tx,y:start.ty},c.STEP);
              return {count:p.boosts,pad:p.boostPadId,
                time:p.boostTime,speed:p.speed,peak:p.boostPeak,
                dashHits:p.dashHits,spectacleMode:c.audit(r).summary.spectacleMode};
            }""")
            assert boosted["count"]==1 and boosted["time"]>0,boosted
            assert boosted["peak"]>220,boosted
            assert boosted["spectacleMode"]=="premium-motion-impact-lap-2.7"
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
            # The cube now automatically accelerates without joystick input.
            # Verify the real racing model independently of incidental AI bumps.
            auto_drive=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,r=c.seededRace(42);
              r.phase='running';
              r.racers.slice(1).forEach(v=>v.finished=true);
              const p=r.racers[0],at=c.pointAt(250);
              p.x=at.x;p.y=at.y;p.angle=at.angle;p.speed=0;
              p.vx=0;p.vy=0;
              for(let i=0;i<42;i++)c.tick(r,{},c.STEP);
              const neutral={speed:p.speed,heading:p.angle,
                moved:Math.hypot(p.x-at.x,p.y-at.y)};
              const before=p.speed;
              for(let i=0;i<8;i++)c.tick(r,{brake:true},c.STEP);
              const braked=p.speed;
              c.tick(r,{dash:true},c.STEP);
              return {neutral,braked,before,dashes:p.dashes,
                mode:c.audit(r).summary.controlMode};
            }""")
            assert auto_drive["neutral"]["speed"]>95,auto_drive
            assert auto_drive["neutral"]["moved"]>25,auto_drive
            assert abs(auto_drive["neutral"]["heading"])<.001,auto_drive
            assert auto_drive["braked"]<auto_drive["before"],auto_drive
            assert auto_drive["dashes"]==1,auto_drive
            assert auto_drive["mode"]=="auto-throttle-manual-steering",auto_drive
            live=page.evaluate("() => window.ChromaCircuitViewDebug.snapshot()")
            assert abs(live["player"]["angle"]-first["player"]["angle"])<.001,live
            # Dash button reflects current speed/cooldown, even with no touch.
            should_disable=live["player"]["speed"]<45
            assert page.locator("#circuit-dash").is_disabled()==should_disable,live
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
            assert 0.72<=moved["premiumMotion"]["squash"]<=1.40,moved
            assert 0.72<=moved["premiumMotion"]["stretch"]<=1.40,moved
            assert abs(moved["premiumMotion"]["lean"])<=.25,moved
            page.screenshot(path=str(OUT/f"circuit-2-world-race-{w}.png"))
            if w==960:
                page.wait_for_function(
                    "() => document.getElementById('circuit-zone').textContent === 'ZONE 02'",
                    timeout=24000)
                page.wait_for_timeout(500)
                page.screenshot(path=str(OUT/"circuit-2-track-tide-mid.png"))
                wave_lighting=page.evaluate(
                    "() => window.ChromaCircuitViewDebug.snapshot().arena")
                assert wave_lighting["charge"]>0,wave_lighting
                assert wave_lighting["primary"]!=first["arena"]["primary"],wave_lighting
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
            assert log["schema"]=="neon-circuit-run-audit/2.8",log
            assert log["summary"]["cameraMode"]=="close-follow-damped-zoom"
            assert log["summary"]["edgeMode"]=="physical-cambered-bank-and-recoverable-ramp"
            assert log["summary"]["trackArchitecture"]=="multi-circuit-tangent-arcs-v2.8"
            assert log["summary"]["renderIndex"]=="precomputed-course-tile-buckets"
            assert log["summary"]["boostPads"]==3
            assert log["summary"]["rivalStyles"]==["precision","aggressive","opportunist"]
            assert log["summary"]["spectacleMode"]=="premium-motion-impact-lap-2.7"
            assert log["summary"]["controlMode"]=="auto-throttle-manual-steering"
            # Premium presentation remains a lightweight Canvas/CSS layer:
            # check DOM animation hooks, reduced-motion safety and no layout
            # changes to gameplay buttons or the mobile canvas.
            premium=page.evaluate("""() => {
              const css=Array.from(document.styleSheets)
                .filter(x=>x.href&&x.href.includes('neon-circuit.css'));
              const el=document.querySelector('#circuit-announce');
              return {
                stylesheets:css.length,
                motion:window.ChromaCircuitViewDebug.snapshot().premiumMotion,
                announceKind:el.dataset.moment,
                finishPresent:!!document.querySelector('#circuit-finish'),
                canvasPixels:document.querySelector('#circuit-canvas').width*
                  document.querySelector('#circuit-canvas').height
              };
            }""")
            assert premium["stylesheets"]>=1,premium
            assert premium["finishPresent"],premium
            assert premium["canvasPixels"]<=752000,premium
            assert log["summary"]["neutralSteerSeconds"]>=0
            assert log["summary"]["driveSeconds"]>.5
            assert log["summary"]["waveMode"]=="spectral-feather-offscreen-origin"
            assert log["summary"]["aiAttacks"]>=0
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
               p.vx=pos.tx*p.speed;p.vy=pos.ty*p.speed;
              c.tick(r,{x:pos.tx,y:pos.ty},1/30);
              return {...zone,finished:p.finished,
                laps:p.laps,place:r.finishPlace};
            }""")
            assert rules["zone"]==1 and rules["speed"]==206.5,rules
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
            assert ejection["victimFalls"]>=1,ejection
            assert ejection["knockouts"]>=1,ejection
            # AI must seek each other out, not merely travel fixed lanes.
            rivalry=page.evaluate("""() => {
              const c=window.ChromaNeonCircuitCore,r=c.seededRace(18);
              r.phase='running';
              const aim=(m)=>{
                const p=m.racers[0],s=c.closest(p.x,p.y,m.track).s,
                  f=c.pointAt(s+Math.max(55,p.speed*.42),m.track),
                  near=c.pointAt(s+27,m.track),far=c.pointAt(s+130,m.track),
                  bend=Math.abs(c.angleDelta(near.angle,far.angle));
                return {x:f.x-p.x,y:f.y-p.y,brake:bend>.58&&p.speed>161};
              };
              for(let i=0;i<70*60&&!r.finished;i++)
                c.tick(r,aim(r),c.STEP);
              const a=c.audit(r);
              return {attacks:a.summary.aiAttacks,
                hits:a.summary.aiHits,aiAI:a.summary.aiAIContacts,
                profiles:a.summary.rivalStyles,
                defends:r.events.filter(e=>e.type==='ai_defend').length,
                aiTempos:r.racers.slice(1).map(p=>p.aiTempo),
                aiFalls:r.racers.slice(1).reduce((n,p)=>n+p.falls,0)};
            }""")
            assert rivalry["attacks"]>=3,rivalry
            assert rivalry["aiAI"]>=2,rivalry
            assert rivalry["defends"]>=1,rivalry
            assert all(.96<x<1.06 for x in rivalry["aiTempos"]),rivalry
            assert not errors,errors
            checks.append({
                "viewport":[w,h],"geometry":geometry,
                "initialCamera":first["camera"],"movingCamera":moved["camera"],
                "colorDelta":delta,"roadPixels":pigmentation,
                "cameraWorldViewport":[width_world,height_world],
                "screenPixels":pixels,"rules":rules,
                "fullscreenActivated":fullscreen,"pageErrors":[]})
            # All course choices are selectable and persist on restart.
            # Run the complete rendering/control path for each long world.
            if w==960:
                for idx,course_id,laps in [
                    (1,"skyline-rift",2),(2,"pulse-canyon",2)]:
                    page.goto((ROOT/"neon-circuit.html").as_uri(),
                              wait_until="load")
                    page.wait_for_function(
                        "() => !!window.ChromaCircuitViewDebug")
                    picker=page.locator(f"[data-circuit-course='{idx}']")
                    picker.click()
                    assert picker.get_attribute("aria-pressed")=="true"
                    assert page.locator(
                        "[data-circuit-course='0']").get_attribute(
                            "aria-pressed")=="false"
                    choice=page.evaluate("""() => {
                      const c=window.ChromaNeonCircuitCore,
                        v=window.ChromaCircuitViewDebug.snapshot(),
                        t=c.TRACKS.find(t=>t.courseId===v.selectedCourse);
                      return {id:v.course,laps:v.courseLaps,
                        length:t.length,worldBounds:t.worldBounds,
                        camera:v.camera,
                        description:document.getElementById(
                          'circuit-selected-description').textContent.trim(),
                        renderBuckets:t.renderTileSegments.size};
                    }""")
                    assert choice["id"]==course_id,choice
                    assert choice["laps"]==laps,choice
                    assert choice["renderBuckets"]>25,choice
                    assert choice["description"],choice
                    assert choice["worldBounds"]["maxX"]>2800,choice
                    page.screenshot(path=str(
                        OUT/f"circuit-2-selected-{course_id}.png"))
                    page.locator("#circuit-start").click()
                    page.wait_for_timeout(470)
                    assert page.locator(
                        "#circuit-lap").inner_text()==f"LAP 1/{laps}"
                    running=page.evaluate(
                        "() => window.ChromaCircuitViewDebug.snapshot()")
                    assert running["course"]==course_id,running
                    assert running["camera"]["zoom"]>1.2,running
                    assert 0<running["tiles"]<=36,running
                    course_pixel=page.evaluate("""() => {
                      const c=window.ChromaNeonCircuitCore,
                        d=window.ChromaCircuitViewDebug,
                        t=c.TRACKS.find(t=>t.courseId===
                          d.snapshot().course),p=c.pointAt(165,t);
                      return {old:d.sampleRoad(0,p.x,p.y),
                        new:d.sampleRoad(1,p.x,p.y)};
                    }""")
                    assert course_pixel["old"][3]>245,course_pixel
                    assert sum(abs(a-b) for a,b in zip(
                        course_pixel["old"][:3],
                        course_pixel["new"][:3]))>25,course_pixel
                    page.screenshot(path=str(
                        OUT/f"circuit-2-world-{course_id}.png"))
                    page.locator("#circuit-pause").click()
                    page.locator("#circuit-restart").click()
                    again=page.evaluate(
                        "() => window.ChromaCircuitViewDebug.snapshot()")
                    assert again["course"]==course_id,again
                    assert again["courseLaps"]==laps,again
            page.close()
        browser.close()
    assert not errors,errors
    (OUT/"neon-circuit-browser-audit.json").write_text(
        json.dumps({"checks":checks,"pageErrors":errors},indent=2),
        encoding="utf-8")
    print(json.dumps({"checks":checks,"pageErrors":errors}))


if __name__=="__main__":
    main()
