"""DK-01 Deck Studio checks: python3 tests/test_deck.py <folder with node_modules/three@0.128.0>"""
import asyncio, sys, json
from playwright.async_api import async_playwright
SP = sys.argv[1]
URL = "file:///home/claude/pine-lake-vr/deck.html"
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
    ctx = await b.new_context(viewport=vp, is_mobile=phone, has_touch=phone)
    pg = await ctx.new_page(); errs = []; tag = "phone" if phone else "desktop"
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_FAILED" not in m.text and "fonts" not in m.text else None)
    await pg.route("**/*", route)
    await pg.goto(URL); await pg.wait_for_timeout(2500)
    ev = pg.evaluate
    ok(f"{tag}: 3D started", await ev("window.__dk.V3.ok === true"))
    ok(f"{tag}: house model in scene", await ev("!!window.__dk.V3.house"))
    ok(f"{tag}: deck meshes built", await ev("window.__dk.V3.deck.children.length") > 50, str(await ev("window.__dk.V3.deck.children.length")))
    sw = await ev("document.documentElement.scrollWidth"); ok(f"{tag}: no horizontal page scroll", sw <= vp["width"], str(sw))
    if not phone:
        await pg.screenshot(path=f"{SP}/dk_{tag}_top.png")
        # every preset x material x stairs x labor produces sane numbers
        bad = await ev("""(() => { const out = []; const D = window.__dk; for (const p of D.PRESETS) for (const m of Object.keys(D.MATS)) for (const st of ['none','east','north']) { const s = Object.assign({}, D.S, {W:p.W, D:p.D, shape:p.shape, mat:m, stairs:st}); const G = D.geom(s), E = D.estimate(s, G); for (const k of ['diy','split','hired']) { const r = E[k]; if (!(r[0] > 1000 && r[1] > r[0] && r[1] < 200000)) out.push([p.id,m,st,k,r]); } if (!(E.diy[0] < E.split[0] && E.split[0] < E.hired[0])) out.push([p.id,m,st,'order',E.diy,E.split,E.hired]); if (G.stair && !(G.stair.rise <= 7.75 && G.stair.rise > 6)) out.push([p.id,'rise',G.stair.rise]); } return out; })()""")
        ok("all combos priced sanely, DIY < split < hired", not bad, json.dumps(bad[:3]))
        g = await ev("(() => { const D = window.__dk, s = Object.assign({}, D.S, {W:22, D:12, shape:'rect'}), G = D.geom(s); return {posts:G.posts.map(p=>[+p.u.toFixed(2), p.beam]), area:G.area, rail:G.railLf, gap:G.innerGap, max:G.maxSpan}; })()")
        ok("22x12 area 264 sf, guard 38 lf", abs(g["area"] - 264) < 0.01 and abs(g["rail"] - 38) < 0.01, json.dumps(g))
        inner = [p[0] for p in g["posts"] if p[1] == "inner"]
        ok("house-side posts avoid the walkout slider and window", all(not (6.8 < u < 13.5) and not (15.8 < u < 19.5) for u in inner), str(inner))
        sun = await ev("(() => { const D = window.__dk, s = D.sunPos(6, 21, 13.6); return [s.alt*180/Math.PI, s.az*180/Math.PI]; })()")
        ok("solar noon Jun 21 ~70° high, due south", 69 < sun[0] < 71.5 and 170 < sun[1] < 190, str(sun))
        # controls
        # views: plan tab, drag the corner handle out 4' east and 2' north
        await pg.click("#tab-plan"); await pg.wait_for_timeout(300)
        ok("plan tab shows the plan", await pg.is_visible("#plan") and not await pg.is_visible("#v3d"))
        h = await pg.query_selector("#plan .hdl[data-h='wd']"); bb = await h.bounding_box()
        svgw = await ev("(() => { const r = document.getElementById('plan').getScreenCTM(); return r.a; })()")
        await pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); await pg.mouse.down()
        cx, cy = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        await pg.mouse.move(cx + 2 * svgw, cy - 1 * svgw, steps=4); await pg.wait_for_timeout(150)
        f = await ev("(() => { const r = document.getElementById('plan').getScreenCTM(); return r.a; })()")
        await pg.mouse.move(cx + 4 * f, cy - 2 * f, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(300)
        wd = await ev("[window.__dk.S.W, window.__dk.S.D]"); ok("dragging the plan handle resizes the deck", wd == [26, 14], str(wd))
        await pg.screenshot(path=f"{SP}/dk_plan.png")
        await pg.click("#b-furn2"); await pg.wait_for_timeout(200)
        ok("furniture hides from the plan", "umbrella" not in await pg.inner_html("#plan"))
        await pg.click("#b-furn2"); await pg.wait_for_timeout(200)
        ok("furniture shows again", "chaise" in await pg.inner_html("#plan"))
        await pg.click("#tab-elev"); await pg.wait_for_timeout(200)
        ok("elevation tab", await pg.is_visible("#elev"))
        await pg.screenshot(path=f"{SP}/dk_elev.png")
        await pg.click("#tab-3d"); await pg.wait_for_timeout(200)
        # free flight
        await pg.click("#tab-3d"); await pg.click("#b-fly"); await pg.wait_for_timeout(200)
        p0 = await ev("window.__dk.V3.cam.position.toArray()")
        await pg.keyboard.down("KeyW"); await pg.wait_for_timeout(700); await pg.keyboard.up("KeyW")
        await pg.keyboard.down("KeyE"); await pg.wait_for_timeout(300); await pg.keyboard.up("KeyE")
        p1 = await ev("window.__dk.V3.cam.position.toArray()")
        ok("fly: W moves forward, E rises", sum((a - b) ** 2 for a, b in zip(p0, p1)) ** 0.5 > 1.5 and p1[1] > p0[1], f"{p0} -> {p1}")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
        ok("fly: Esc returns to orbit", await ev("!window.__dk.FLY.on && window.__dk.V3.ctl.enabled"))
        # pick and place
        n0 = await ev("window.__dk.S.items.length")
        await pg.click("#fpal [data-add='dine6r']"); await pg.wait_for_timeout(400)
        ok("palette adds a rectangular table", await ev(f"window.__dk.S.items.length === {n0 + 1} && window.__dk.S.items.at(-1).t === 'dine6r'"))
        sel = await ev("window.__dk.S.sel")
        r0 = await ev("window.__dk.S.items.find(i => i.id === window.__dk.S.sel).r")
        await pg.keyboard.press("r"); await pg.wait_for_timeout(200)
        r1 = await ev("window.__dk.S.items.find(i => i.id === window.__dk.S.sel).r")
        ok("R rotates the selected piece 15°", (r1 - r0) % 360 == 15, f"{r0}->{r1}")
        await pg.click("#tab-plan"); await pg.wait_for_timeout(300)
        g = await pg.query_selector(f"#plan .fi[data-id='{sel}'] .ol"); bb = await g.bounding_box()
        u0 = await ev("window.__dk.S.items.find(i => i.id === window.__dk.S.sel).u")
        f = await ev("document.getElementById('plan').getScreenCTM().a")
        cx, cy = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx - 2 * f, cy, steps=5); await pg.mouse.up(); await pg.wait_for_timeout(300)
        u1 = await ev("window.__dk.S.items.find(i => i.id === window.__dk.S.sel).u")
        ok("drag in the plan moves the piece 2 ft", abs((u0 - u1) - 2) < 0.3, f"{u0}->{u1}")
        await pg.screenshot(path=f"{SP}/dk_pnp_plan.png")
        await pg.keyboard.press("Delete"); await pg.wait_for_timeout(200)
        ok("Delete removes it", await ev(f"window.__dk.S.items.length === {n0} && !window.__dk.S.sel"))
        await pg.click("#b-arrange"); await pg.wait_for_timeout(600)
        ok("auto-arrange fits the default set", await ev("window.__dk.furniture(window.__dk.S, window.__dk.LAST.G).items.every(i => i.ok)"))
        await pg.click("#tab-3d"); await pg.wait_for_timeout(200)
        # drag a piece in 3D: project the grill to the screen and pull it 3 ft west
        await ev("window.__dk.camPreset('top')"); await pg.wait_for_timeout(400)
        gid = await ev("window.__dk.S.items.find(i => i.t === 'grill').id")
        pt = await ev(f"""(() => {{ const D = window.__dk, it = D.S.items.find(i => i.id === '{gid}'), V = D.V3, v = new THREE.Vector3(122.54 + it.u, 889.18 + 3.4 - 870, -(134.73 + it.v)).project(V.cam), r = V.R.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height, it.u]; }})()""")
        a = await ev(f"(() => {{ const V = window.__dk.V3, r = V.R.domElement.getBoundingClientRect(), p = new THREE.Vector3(0, 0, 0); return 0; }})()")
        px = await ev("""(() => { const V = window.__dk.V3, a = new THREE.Vector3(130, 19.2, -140).project(V.cam), b = new THREE.Vector3(133, 19.2, -140).project(V.cam), r = V.R.domElement.getBoundingClientRect(); return (b.x - a.x) / 2 * r.width; })()""")
        await pg.mouse.move(pt[0], pt[1]); await pg.mouse.down(); await pg.mouse.move(pt[0] - px, pt[1], steps=6); await pg.mouse.up(); await pg.wait_for_timeout(400)
        u2 = await ev(f"window.__dk.S.items.find(i => i.id === '{gid}').u")
        ok("drag in 3D moves the grill about 3 ft", abs((pt[2] - u2) - 3) < 0.8, f"{pt[2]}->{u2}")
        await pg.click("#seg-psize [data-v='6x6']"); await pg.wait_for_timeout(200)
        c6 = await ev("window.__dk.LAST.E.split[0]")
        await pg.click("#seg-psize [data-v='10x10']"); await pg.wait_for_timeout(200)
        c10 = await ev("window.__dk.LAST.E.split[0]")
        ok("10x10 posts cost more than 6x6", c10 > c6, f"{c6} vs {c10}")
        await pg.click("#sw-tone [data-v='sand']"); await pg.click("#sw-rfin [data-v='bronze']"); await pg.click("#sw-pfin [data-v='walnut']"); await pg.wait_for_timeout(300)
        ok("color swatches apply", await ev("window.__dk.S.tone === 'sand' && window.__dk.S.rfin === 'bronze' && window.__dk.S.pfin === 'walnut'"))
        await pg.click("#b-cols"); await pg.wait_for_timeout(500)
        ok("brick columns built in 3D", await ev("window.__dk.S.posts === 'brick'") and await pg.is_visible("#v3d"))
        lines = await ev("window.__dk.estimate(window.__dk.S, window.__dk.geom(window.__dk.S)).lines.map(l => l.name).join('|')")
        ok("brick columns priced", "Brick columns" in lines, lines[:120])
        await pg.screenshot(path=f"{SP}/dk_cols.png")
        await pg.click("#seg-posts [data-v='plain']"); await pg.wait_for_timeout(200)
        await pg.click("#b-cmp"); await pg.click("#presets [data-p='D3']"); await pg.wait_for_timeout(300); await pg.click("#b-cmp"); await pg.wait_for_timeout(200)
        ok("compare lists two layouts", await ev("document.querySelectorAll('#cmp tr').length") == 3)
        ok("preset D3 applies", await ev("window.__dk.S.D === 16"))
        await pg.click("#pg-stairs > summary"); await pg.click("#seg-stairs [data-v='east']"); await pg.wait_for_timeout(300)
        ok("east stair drawn in plan", "DN" in await pg.inner_html("#plan"))
        await pg.click("#mx td.cell[data-p='D4'][data-m='pt']"); await pg.wait_for_timeout(300)
        ok("matrix cell loads D4 + PT", await ev("window.__dk.S.W === 28 && window.__dk.S.mat === 'pt'"))
        for cam in ["slider", "great", "under", "top", "yard"]:
            await pg.click(f"[data-cam='{cam}']"); await pg.wait_for_timeout(250)
            if cam in ("slider", "under"): await pg.screenshot(path=f"{SP}/dk_cam_{cam}.png", clip={"x": 0, "y": 0, "width": 1440, "height": 900})
        await pg.click("#todo input[type=checkbox]"); await pg.wait_for_timeout(200)
        ok("checklist ticks", "1 of" in await pg.inner_text("#todo-sync"))
        await pg.click("#b-save"); await pg.wait_for_timeout(200)
        ok("pick saved", "Our pick" in await pg.inner_text("#pick-info"))
        await pg.screenshot(path=f"{SP}/dk_{tag}_full.png", full_page=True)
    else:
        await pg.click("#tab-plan"); await pg.wait_for_timeout(300)
        await ev("window.scrollTo(0, 1400)"); await pg.wait_for_timeout(300)
        top = await ev("document.getElementById('viewer').getBoundingClientRect().top")
        ok("phone: viewer stays pinned while scrolling the options", abs(top) < 2, str(top))
        await pg.screenshot(path=f"{SP}/dk_{tag}_pinned.png")
        await pg.screenshot(path=f"{SP}/dk_{tag}_full.png", full_page=True)
    ok(f"{tag}: no page errors", not errs, "; ".join(errs[:4]))
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        await run(b); await run(b, phone=True); await b.close()
    for r in results: print(*r)
    print(sum(r[0] == "PASS" for r in results), "/", len(results), "passed")
asyncio.run(main())
