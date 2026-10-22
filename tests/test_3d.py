import asyncio, sys
from playwright.async_api import async_playwright
SP = sys.argv[1]
URL = "file:///home/claude/pine-lake-vr/planner.html"
NM = SP + "/node_modules/three"
LIB = {"three.min.js": NM + "/build/three.min.js", "OrbitControls.js": NM + "/examples/js/controls/OrbitControls.js"}
results = []
def ok(name, cond, extra=""): results.append(("PASS" if cond else "FAIL", name, extra))

async def route(r):
    u = r.request.url
    if u.startswith("file://"): return await r.continue_()
    for k, f in LIB.items():
        if u.endswith(k): return await r.fulfill(path=f, content_type="application/javascript")
    await r.abort()

async def run(b, phone=False):
    vp = {"width": 390, "height": 844} if phone else {"width": 1440, "height": 900}
    ctx = await b.new_context(viewport=vp, is_mobile=phone, has_touch=phone, device_scale_factor=2 if phone else 1)
    pg = await ctx.new_page(); errs = []; tag = "phone" if phone else "desktop"
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_FAILED" not in m.text else None)
    await pg.route("**/*", route)
    await pg.goto(URL); await pg.wait_for_timeout(1000)
    if await pg.is_visible("#hX"): await pg.click("#hX")
    ev = pg.evaluate
    if phone: await pg.tap("#viewBtn")
    else: await pg.keyboard.press("t")
    for _ in range(40):
        if await ev("window.__yb.V3.ready && window.__yb.V3.on"): break
        await pg.wait_for_timeout(250)
    ok(f"{tag}: 3D view loads", await ev("window.__yb.V3.on"))
    await pg.wait_for_timeout(1500)
    ok(f"{tag}: 3D canvas shown, 2D hidden", await pg.is_visible("#gl3") and not await pg.is_visible("#map"))
    nobj = await ev("window.__yb.V3.objs.size"); ok(f"{tag}: plan objects built in 3D", nobj > 20, str(nobj))
    await pg.screenshot(path=f"{SP}/t3_{tag}_0.png")
    # orbit by dragging empty sky / ground
    p0 = await ev("window.__yb.V3.C.position.toArray()")
    W, H = vp["width"], vp["height"]
    if phone:
        await ev("window.__yb.camPreset('top')"); await pg.wait_for_timeout(300)
        p0 = await ev("window.__yb.V3.C.position.toArray()")
        await ev("window.__yb.camPreset('home')"); await pg.wait_for_timeout(300)
        p1 = await ev("window.__yb.V3.C.position.toArray()")
    else:
        await pg.mouse.move(W * 0.62, 170); await pg.mouse.down(); await pg.mouse.move(W * 0.62 + 160, 200, steps=10); await pg.mouse.up(); await pg.wait_for_timeout(600)
        p1 = await ev("window.__yb.V3.C.position.toArray()")
    ok(f"{tag}: camera orbits", p0 != p1, f"{p0} -> {p1}")
    if not phone:
        await pg.mouse.move(W * 0.6, H * 0.5); await pg.mouse.wheel(0, -600); await pg.wait_for_timeout(600)
        p2 = await ev("window.__yb.V3.C.position.toArray()"); ok("desktop: wheel zooms", p2 != p1)
    await ev("window.__yb.camPreset('home')"); await pg.wait_for_timeout(500)
    # project helper
    proj = """(([x,y,up])=>{const V=window.__yb.V3,v=new THREE.Vector3(x,0,-y);const r=new THREE.Raycaster(new THREE.Vector3(x,500,-y),new THREE.Vector3(0,-1,0));const h=r.intersectObject(V.terrain)[0];v.y=(h?h.point.y:0)+(up||0);v.project(V.C);const b=document.getElementById('gl3').getBoundingClientRect();return [(v.x+1)/2*b.width+b.left,(1-v.y)/2*b.height+b.top];})"""
    async def at(x, y, up=0): return await ev(f"{proj}([{x},{y},{up}])")
    async def tap(sx, sy):
        if phone: await pg.touchscreen.tap(sx, sy)
        else: await pg.mouse.click(sx, sy)
    n = lambda: ev("window.__yb.ents().length")
    async def settle():
        for _ in range(80):
            if await ev("window.__yb.settled3D()"): break
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(200)
    # plant on the ground
    await ev("window.__yb.setTool('plant'); window.__yb.ST.armed.plant='redbud'"); await pg.wait_for_timeout(200)
    n0 = await n(); sx, sy = await at(60, 130); await settle(); await tap(sx, sy); await pg.wait_for_timeout(600); await settle()
    ok(f"{tag}: click ground plants a redbud", await n() == n0 + 1 and await ev("window.__yb.ents().at(-1).sp") == "redbud", f"{n0}->{await n()}")
    pid = await ev("window.__yb.ents().at(-1).id")
    # build
    await ev("window.__yb.setTool('build'); window.__yb.ST.armed.st='shed'"); await pg.wait_for_timeout(200)
    n0 = await n(); sx, sy = await at(200, 120); await settle(); await tap(sx, sy); await pg.wait_for_timeout(600); await settle()
    ok(f"{tag}: click ground places a shed", await n() == n0 + 1 and await ev("window.__yb.ents().at(-1).k") == "shed")
    sid = await ev("window.__yb.ents().at(-1).id")
    await settle()
    ok(f"{tag}: new shed has a 3D object", await ev(f"window.__yb.V3.objs.has('{sid}')"))
    # select it
    await ev("window.__yb.setTool('select')"); await settle()
    sx, sy = await at(200, 120, 4); await tap(sx, sy); await pg.wait_for_timeout(400)
    ok(f"{tag}: click selects the shed", await ev("window.__yb.ST.sel.join()") == sid, await ev("window.__yb.ST.sel.join()"))
    ok(f"{tag}: inspector opens for 3D selection", await pg.is_visible("#insp"))
    # drag it
    x0 = await ev(f"window.__yb.byId('{sid}').x"); u0 = await ev("(window.__yb.UNDO[window.__yb.ST.cur]||[]).length")
    sx, sy = await at(200, 120, 4); tx, ty = await at(185, 120, 4)
    if phone:
        await pg.tap("#ix"); await pg.wait_for_timeout(200)
        cdp = await ctx.new_cdp_session(pg)
        async def t(type_, x, y): await cdp.send("Input.dispatchTouchEvent", {"type": type_, "touchPoints": [] if type_ == "touchEnd" else [{"x": x, "y": y}]})
        await t("touchStart", sx, sy)
        for i in range(1, 11): await t("touchMove", sx + (tx - sx) * i / 10, sy + (ty - sy) * i / 10); await pg.wait_for_timeout(20)
        await t("touchEnd", tx, ty)
    else:
        await pg.mouse.move(sx, sy); await pg.mouse.down(); await pg.mouse.move(tx, ty, steps=12); await pg.mouse.up()
    await pg.wait_for_timeout(600); await settle()
    x1 = await ev(f"window.__yb.byId('{sid}').x"); u1 = await ev("(window.__yb.UNDO[window.__yb.ST.cur]||[]).length")
    ok(f"{tag}: drag moves the shed west", x1 < x0 - 6, f"{x0}->{x1}")
    ok(f"{tag}: the move is one undo step", u1 == u0 + 1, f"{u0}->{u1}")
    await pg.screenshot(path=f"{SP}/t3_{tag}_1.png")
    # erase the redbud
    await ev("window.__yb.setTool('erase')"); await pg.wait_for_timeout(200)
    px_, py_ = await ev(f"[window.__yb.byId('{pid}').x, window.__yb.byId('{pid}').y]")
    sx, sy = await at(px_, py_, 8); await settle(); n0 = await n(); await tap(sx, sy); await pg.wait_for_timeout(500); await settle()
    ok(f"{tag}: erase removes the clicked tree", await n() == n0 - 1 and not await ev(f"!!window.__yb.byId('{pid}')"))
    # season change rebuilds
    await ev("window.__yb.ST.month=1"); await ev("document.querySelector('#months [data-m=\"1\"]')?.click()"); await pg.wait_for_timeout(600)
    await pg.screenshot(path=f"{SP}/t3_{tag}_winter.png")
    if not phone:
        await ev("window.__yb.camPreset('home')"); await pg.wait_for_timeout(300)
        await ev("window.__yb.setTool('plant'); window.__yb.ST.armed.plant='redbud'")
        sx, sy = await at(60, 140); await pg.mouse.move(sx, sy); await pg.mouse.move(sx + 3, sy + 2); await pg.wait_for_timeout(1500)
        tip = await ev("document.getElementById('gtip').hidden ? '' : document.getElementById('gtip').textContent")
        ok("desktop: placement ghost + tip while hovering", "redbud" in tip.lower() and await ev("!!window.__yb.V3.ghost"), tip)
        await ev("window.__yb.setTool('select')"); await pg.wait_for_timeout(200)
        c0 = await ev("window.__yb.V3.O.target.toArray()")
        await pg.keyboard.down("w"); await pg.wait_for_timeout(700); await pg.keyboard.up("w"); await pg.wait_for_timeout(200)
        c1 = await ev("window.__yb.V3.O.target.toArray()"); ok("desktop: W moves the 3D camera", c0 != c1, f"{c0}->{c1}")
        p0 = await ev("window.__yb.V3.C.position.toArray()")
        await pg.keyboard.down("e"); await pg.wait_for_timeout(1500); await pg.keyboard.up("e"); await pg.wait_for_timeout(200)
        p1 = await ev("window.__yb.V3.C.position.toArray()"); ok("desktop: E orbits", p0 != p1)
        await pg.keyboard.press("h"); await pg.wait_for_timeout(300)
        ok("desktop: H resets the camera", abs((await ev("window.__yb.V3.O.target.x")) - 118) < 0.5)
    if not phone:
        v0 = await ev("[window.__yb.V3.zonesG.visible, window.__yb.V3.irrG.visible]")
        await pg.click("#ovbar [data-ov='setbacks']"); await pg.click("#ovbar [data-ov='irrigation']"); await pg.wait_for_timeout(300)
        v1 = await ev("[window.__yb.V3.zonesG.visible, window.__yb.V3.irrG.visible]")
        ok("desktop: overlay toggles flip zones + sprinklers", v0 == [not v1[0], not v1[1]], f"{v0}->{v1}")
        await pg.click("#ovbar [data-ov='setbacks']"); await pg.click("#ovbar [data-ov='irrigation']")
        flat = await ev("(()=>{const r=new THREE.Raycaster();const hs=[];for(const [x,y] of [[124,136],[143,149],[133,142]]){r.set(new THREE.Vector3(x,200,-y),new THREE.Vector3(0,-1,0));const h=r.intersectObject(window.__yb.V3.terrain)[0];hs.push(h.point.y)}return Math.max(...hs)-Math.min(...hs)})()")
        ok("desktop: walkout patio is flat", flat < 0.05, str(flat))
    if not phone:
        await ev("window.__yb.camPreset('home')"); await pg.wait_for_timeout(400)
        await ev("window.__yb.setTool('path'); window.__yb.ST.armed.path='flagstone'")
        n0 = await n()
        for (wx, wy) in [(40, 60), (50, 70), (60, 72)]:
            sx, sy = await at(wx, wy); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(500)
        await pg.keyboard.press("Enter"); await pg.wait_for_timeout(600)
        ok("desktop: path drawn in 3D", await n() == n0 + 1 and await ev("window.__yb.ents().at(-1).t") == "path" and await ev("window.__yb.ents().at(-1).pts.length") == 3, str(await ev("window.__yb.ents().at(-1).t")))
        await ev("window.__yb.setTool('bed'); window.__yb.ST.bedShape='rect'; window.__yb.ST.armed.bed='mulch'"); await pg.wait_for_timeout(300)
        n0 = await n(); sx, sy = await at(150, 175); tx, ty = await at(165, 185)
        await pg.mouse.move(sx, sy); await pg.mouse.down(); await pg.mouse.move(tx, ty, steps=10); await pg.mouse.up(); await pg.wait_for_timeout(600)
        ok("desktop: rectangle bed dragged in 3D", await n() == n0 + 1 and await ev("window.__yb.ents().at(-1).t") == "bed", str(await n() - n0))
        ok("desktop: still in 3D after drawing", await ev("window.__yb.V3.on"))
        lv = await ev("window.__yb.checks({id:'Q',t:'plant',sp:'dropseed',x:140,y:95},window.__yb.ents()).map(m=>m[0]).join()")
        ok("desktop: perennial by the front porch is allowed", 'block' not in lv and 'err' not in lv, lv)
        await ev("window.__yb.setTool('select')")
    # walk tool switches to 2D
    await ev("window.__yb.setTool('walk')"); await pg.wait_for_timeout(300)
    ok(f"{tag}: Walk tool switches back to 2D", not await ev("window.__yb.V3.on") and await pg.is_visible("#map"))
    await ev("window.__yb.setTool('select')")
    # back to 3D, view tab presets, then 2D
    await ev("window.__yb.setView('3d')"); await pg.wait_for_timeout(400)
    if not phone:
        await pg.click("#tabs [data-tab='view']"); await pg.wait_for_timeout(200)
        await pg.click("#v3street"); await pg.wait_for_timeout(500); await pg.screenshot(path=f"{SP}/t3_{tag}_street.png")
        await pg.click("#v3top"); await pg.wait_for_timeout(500); await pg.screenshot(path=f"{SP}/t3_{tag}_top.png")
        await pg.click("#v3sh"); await pg.wait_for_timeout(300)
        await pg.click("#v3home"); await pg.click("[data-v='2d']"); await pg.wait_for_timeout(300)
    else:
        await pg.tap("#viewBtn"); await pg.wait_for_timeout(300)
    ok(f"{tag}: back to 2D", not await ev("window.__yb.V3.on") and await pg.is_visible("#map"))
    await pg.reload(); await pg.wait_for_timeout(1500)
    ok(f"{tag}: 2D remembered after reload", not await ev("window.__yb.V3.on"))
    ok(f"{tag}: no script errors", not errs, "; ".join(errs[:5]))
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        await run(b, False); await run(b, True)
        await b.close()
    for r in results: print(*r)
    print("FAILED:", sum(1 for r in results if r[0] == "FAIL"), "of", len(results))
asyncio.run(main())
