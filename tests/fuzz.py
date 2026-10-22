import asyncio, sys, random
from playwright.async_api import async_playwright
SP = sys.argv[1]; SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 1
async def main():
    random.seed(SEED)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]); ctx = await b.new_context(viewport={"width": 1366, "height": 860}); pg = await ctx.new_page(); pg.set_default_timeout(20000); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        NM = SP + "/node_modules/three"
        async def route(r):
            u = r.request.url
            if u.startswith("file://"): return await r.continue_()
            if u.endswith("three.min.js"): return await r.fulfill(path=NM + "/build/three.min.js", content_type="application/javascript")
            if u.endswith("OrbitControls.js"): return await r.fulfill(path=NM + "/examples/js/controls/OrbitControls.js", content_type="application/javascript")
            await r.abort()
        await pg.route("**/*", route)
        await pg.goto("file:///home/claude/pine-lake-vr/planner.html"); await pg.wait_for_timeout(1000); await pg.click("#hX"); await pg.evaluate("window.__yb.V3.shadows=false")
        await pg.evaluate("(()=>{const y=window.__yb;y.cam.tz=y.cam.z=3.6;y.cam.x=110;y.cam.y=110;})()")
        keys = ["v", "p", "b", "l", "u", "x", "g", "Escape", "Enter", "Delete", "Control+z", "Control+Shift+z", "Control+d", "r", "Shift+R", "Control+c", "Control+v", "ArrowLeft", "f", "t", "t"]
        for i in range(int(sys.argv[3]) if len(sys.argv) > 3 else 200):
            r = random.random()
            if r < 0.35:
                x, y = random.randint(440, 1000), random.randint(130, 800)
                if random.random() < 0.5: await pg.mouse.click(x, y)
                else:
                    await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x + random.randint(-120, 120), y + random.randint(-120, 120), steps=5); await pg.mouse.up()
            elif r < 0.6: await pg.keyboard.press(random.choice(keys))
            elif r < 0.7:
                for sel in ["#drawer [data-sp]", "#drawer [data-bed]", "#drawer [data-path]", "#drawer [data-st]", "#drawer [data-shape]"]:
                    loc = pg.locator(sel + ":visible")
                    if await loc.count(): await loc.nth(random.randrange(await loc.count())).click(); break
            elif r < 0.78:
                loc = pg.locator("#insp button:visible, #insp select:visible")
                c = await loc.count()
                if c:
                    el = loc.nth(random.randrange(c))
                    tag = await el.evaluate("e=>e.tagName")
                    if tag == "SELECT":
                        opts = await el.evaluate("e=>[...e.options].map(o=>o.value)"); await el.select_option(random.choice(opts))
                    else: await el.click()
            elif r < 0.81: await pg.click(f"#tabs [data-tab='{random.choice(['palette','plan','season','view'])}']")
            elif r < 0.84:
                loc = pg.locator("#drawer summary:visible, #psubtabs button:visible, #drawer [data-v]:visible, #strip select:visible")
                c = await loc.count()
                if c: await loc.nth(random.randrange(c)).click()
            elif r < 0.88: await pg.select_option("#planSel", random.choice(["A", "B", "C", "D", "E"]))
            elif r < 0.92: await pg.click(f"#months [data-m='{random.randint(1,12)}']")
            else: await pg.mouse.wheel(0, random.choice([-300, 300]))
            if errs: print("ERROR at step", i, errs[:3]); break
        bad = await pg.evaluate("Object.values(window.__yb.ST.plans).flatMap(p=>p.ents).filter(e=>!e.id||!e.t||(e.t==='bed'&&e.pts.length<3)||(e.t==='path'&&e.pts.length<2)||Object.values(e).some(v=>typeof v==='number'&&!isFinite(v))).length")
        ids = await pg.evaluate("Object.values(window.__yb.ST.plans).map(p=>p.ents.length - new Set(p.ents.map(e=>e.id)).size)")
        v3 = await pg.evaluate("window.__yb.V3.on")
        print(f"seed {SEED}: 3d_on={v3} errors={len(errs)} invalid_entities={bad} duplicate_ids={sum(ids)}", flush=True)
        try: await pg.screenshot(path=f"{SP}/fuzz_{SEED}.png", timeout=60000)
        except Exception as e: print("screenshot slow", flush=True)
        await b.close()
asyncio.run(main())
