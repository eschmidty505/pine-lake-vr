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
        await pg.click("#b-furn2"); await pg.click("#f-lounge"); await pg.wait_for_timeout(200)
        ok("lounge chairs toggle off", await ev("window.__dk.S.loungeOn === false") and "loungers" not in await pg.inner_html("#plan"))
        await pg.click("#tab-elev"); await pg.wait_for_timeout(200)
        ok("elevation tab", await pg.is_visible("#elev"))
        await pg.screenshot(path=f"{SP}/dk_elev.png")
        await pg.click("#tab-3d"); await pg.wait_for_timeout(200)
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
