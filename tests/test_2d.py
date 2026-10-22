import asyncio, sys, json
from playwright.async_api import async_playwright
SP = sys.argv[1]
URL = "file:///home/claude/pine-lake-vr/planner.html"
results = []
def ok(name, cond, extra=""):
    results.append(("PASS" if cond else "FAIL", name, extra))

async def desktop(b):
    ctx = await b.new_context(viewport={"width": 1440, "height": 900})
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_FAILED" not in m.text else None)
    await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
    await pg.goto(URL); await pg.wait_for_timeout(1200)
    ok("help dialog shows on first visit", await pg.is_visible("#dlg"))
    await pg.click("#hX"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=f"{SP}/bt_d0.png")
    async def scr(x, y): return await pg.evaluate(f"window.__yb.w2s({x},{y})")
    async def n(): return await pg.evaluate("window.__yb.ents().length")
    async def ev(js): return await pg.evaluate(js)
    # zoom in a bit around the west yard
    await ev("(()=>{const y=window.__yb; y.cam.tz=y.cam.z=5; y.cam.x=95; y.cam.y=150;})()"); await pg.wait_for_timeout(300)

    # --- plant tool: place one plant
    n0 = await n()
    await pg.keyboard.press("p"); await pg.wait_for_timeout(150)
    ok("plant tool active", (await ev("window.__yb.ST.tool")) == "plant")
    await pg.click("#drawer [data-sp='redbud']"); await pg.wait_for_timeout(100)
    x, y = await scr(80, 165)
    await pg.mouse.move(x, y); await pg.wait_for_timeout(100); await pg.mouse.click(x, y); await pg.wait_for_timeout(250)
    ok("plant placed", await n() == n0 + 1, f"{n0}->{await n()}")
    last = await ev("(()=>{const e=window.__yb.ents().at(-1);return [e.t,e.sp,e.x,e.y]})()")
    ok("plant at snapped grid spot", last[0] == "plant" and last[1] == "redbud" and abs(last[2] - 80) < 1 and abs(last[3] - 165) < 1, str(last))
    # blocked placement on the house
    hx, hy = await scr(115, 110)
    nb = await n(); await pg.mouse.click(hx, hy); await pg.wait_for_timeout(250)
    ok("planting on the house is refused", await n() == nb)
    toast = await pg.inner_text("#toast"); ok("refusal toast explains why", "house" in toast.lower(), toast)
    # row mode
    await pg.click("#drawer [data-row='1']"); await pg.wait_for_timeout(100)
    a = await scr(70, 150); bpt = await scr(90, 150)
    nb = await n(); await pg.mouse.move(*a); await pg.mouse.down(); await pg.mouse.move(a[0] + 30, a[1], steps=4); await pg.mouse.move(*bpt, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(300)
    ok("row of plants placed", await n() > nb + 1, f"{nb}->{await n()}")
    await pg.keyboard.press("Control+z"); await pg.wait_for_timeout(200)
    ok("undo removes the row", await n() == nb)
    await pg.keyboard.press("Control+Shift+z"); await pg.wait_for_timeout(200)
    ok("redo restores the row", await n() > nb + 1)
    await pg.keyboard.press("Control+z"); await pg.wait_for_timeout(150)

    # --- bed tool: rectangle
    await pg.keyboard.press("b"); await pg.wait_for_timeout(150)
    await pg.click("#drawer [data-shape='rect']"); await pg.click("#drawer [data-bed='needle']"); await pg.wait_for_timeout(100)
    a = await scr(60, 180); bpt = await scr(75, 192)
    nb = await n(); await pg.mouse.move(*a); await pg.mouse.down(); await pg.mouse.move(*bpt, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(300)
    bed = await ev("(()=>{const e=window.__yb.ents().at(-1);return [e.t,e.mat,Math.round(window.__yb.geo(e).area)]})()")
    ok("rectangle bed drawn", await n() == nb + 1 and bed[0] == "bed" and bed[1] == "needle" and 150 < bed[2] < 200, str(bed))
    ok("tool returns to select with the bed selected", (await ev("window.__yb.ST.tool")) == "select" and (await ev("window.__yb.ST.sel.length")) == 1)
    ok("inspector opens for the bed", await pg.is_visible("#insp"))
    # change material from inspector
    await pg.click("#insp [data-bed='gravel']"); await pg.wait_for_timeout(200)
    ok("inspector swaps material", (await ev("window.__yb.ents().at(-1).mat")) == "gravel")
    # add planting mix
    await pg.click("#iMixAdd"); await pg.wait_for_timeout(200)
    ok("planting mix row added", (await ev("window.__yb.ents().at(-1).comp.length")) == 1)
    # drag a vertex handle
    v = await ev("window.__yb.ents().at(-1).pts[2]"); vs = await scr(v[0], v[1])
    await pg.mouse.move(*vs); await pg.mouse.down(); await pg.mouse.move(vs[0] + 25, vs[1] - 25, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(250)
    v2 = await ev("window.__yb.ents().at(-1).pts[2]")
    ok("vertex handle reshapes the bed", v2[0] > v[0] + 2 and v2[1] > v[1] + 2, f"{v}->{v2}")
    # insert vertex via midpoint
    pts_before = await ev("window.__yb.ents().at(-1).pts.length")
    p0, p1 = await ev("window.__yb.ents().at(-1).pts.slice(0,2)")
    ms = await scr((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    await pg.mouse.move(*ms); await pg.mouse.down(); await pg.mouse.move(ms[0], ms[1] + 20, steps=5); await pg.mouse.up(); await pg.wait_for_timeout(250)
    ok("dragging a + adds a corner", await ev("window.__yb.ents().at(-1).pts.length") == pts_before + 1)

    # --- polygon bed with double-click finish
    await pg.keyboard.press("Escape"); await pg.keyboard.press("b"); await pg.wait_for_timeout(100)
    await pg.click("#drawer [data-shape='poly']"); await pg.click("#drawer [data-bed='meadow']")
    nb = await n()
    for (wx, wy) in [(90, 175), (105, 178), (100, 186)]:
        sx, sy = await scr(wx, wy); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(120)
    sx, sy = await scr(88, 184); await pg.mouse.dblclick(sx, sy); await pg.wait_for_timeout(300)
    ok("freeform bed closes on double-click", await n() == nb + 1 and (await ev("window.__yb.ents().at(-1).mat")) == "meadow", f"pts={await ev('window.__yb.ents().at(-1).pts?.length')}")

    # --- path tool with snapping to an existing path end (plan B has paths; use plan A: snap to bed corner)
    await pg.keyboard.press("l"); await pg.wait_for_timeout(100)
    await pg.click("#drawer [data-path='flagstone']")
    corner = await ev("window.__yb.ents().find(e=>e.t==='bed'&&e.mat==='gravel').pts[0]")
    c1 = await scr(corner[0] + 0.3, corner[1] - 0.3)  # near, not exactly on, the corner
    nb = await n()
    await pg.mouse.click(*c1); await pg.wait_for_timeout(120)
    sx, sy = await scr(corner[0] + 12, corner[1] - 8); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(120)
    sx, sy = await scr(corner[0] + 22, corner[1] - 9); await pg.mouse.dblclick(sx, sy); await pg.wait_for_timeout(300)
    pth = await ev("(()=>{const e=window.__yb.ents().at(-1);return [e.t,e.mat,e.pts[0],e.pts.length]})()")
    ok("path drawn", await n() == nb + 1 and pth[0] == "path" and pth[1] == "flagstone", str(pth))
    ok("path start snapped exactly to the bed corner", abs(pth[2][0] - corner[0]) < 0.01 and abs(pth[2][1] - corner[1]) < 0.01, f"{pth[2]} vs {corner}")
    # second path snaps to the first path's end
    end = await ev("window.__yb.ents().at(-1).pts.at(-1)")
    await pg.keyboard.press("l"); await pg.click("#drawer [data-path='stepping']")
    s1 = await scr(end[0] - 0.25, end[1] + 0.25); await pg.mouse.click(*s1); await pg.wait_for_timeout(120)
    sx, sy = await scr(end[0] + 10, end[1] + 10); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(100)
    await pg.keyboard.press("Enter"); await pg.wait_for_timeout(250)
    p2 = await ev("window.__yb.ents().at(-1).pts[0]")
    ok("second path snaps to the first path's end", abs(p2[0] - end[0]) < 0.01 and abs(p2[1] - end[1]) < 0.01, f"{p2} vs {end}")
    # fence
    await pg.keyboard.press("l"); await pg.click("#drawer [data-path='splitrail']")
    for (wx, wy) in [(60, 160), (60, 175)]:
        sx, sy = await scr(wx, wy); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(100)
    await pg.keyboard.press("Enter"); await pg.wait_for_timeout(250)
    ok("fence drawn", (await ev("window.__yb.ents().at(-1).mat")) == "splitrail")

    # --- build tool: place shed, move, resize, rotate
    await pg.keyboard.press("u"); await pg.wait_for_timeout(100)
    await pg.click("#drawer [data-st='shed']")
    nb = await n(); sx, sy = await scr(75, 205); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(250)
    ok("shed placed", await n() == nb + 1 and (await ev("window.__yb.ents().at(-1).k")) == "shed")
    sid = await ev("window.__yb.ents().at(-1).id")
    await pg.keyboard.press("v"); await pg.wait_for_timeout(100)
    sx, sy = await scr(75, 205); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(150)
    ok("click selects the shed", (await ev("window.__yb.ST.sel[0]")) == sid)
    await pg.mouse.move(sx, sy); await pg.mouse.down(); await pg.mouse.move(sx + 50, sy + 20, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(250)
    pos = await ev(f"(()=>{{const e=window.__yb.byId('{sid}');return [e.x,e.y]}})()")
    ok("drag moves the shed", pos[0] > 80 and pos[1] < 203, str(pos))
    # resize from corner 2 (+,+)
    c = await ev(f"(()=>{{const e=window.__yb.byId('{sid}');return [e.x+e.w/2,e.y+e.h/2,e.w,e.h]}})()")
    cs = await scr(c[0], c[1]); await pg.mouse.move(*cs); await pg.mouse.down(); await pg.mouse.move(cs[0] + 20, cs[1] - 20, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(250)
    wh = await ev(f"(()=>{{const e=window.__yb.byId('{sid}');return [e.w,e.h]}})()")
    ok("corner handle resizes", wh[0] > c[2] + 1 and wh[1] > c[3] + 1, f"{c[2:]}->{wh}")
    # rotate via keyboard and handle
    await pg.keyboard.press("r"); await pg.wait_for_timeout(150)
    ok("R rotates 15°", (await ev(f"window.__yb.byId('{sid}').rot")) == 15)
    rh = await ev(f"(()=>{{const y=window.__yb,e=y.byId('{sid}');const c=Math.cos(e.rot*Math.PI/180),s=Math.sin(e.rot*Math.PI/180),ly=e.h/2+26/y.cam.z;return [e.x-ly*s,e.y+ly*c,e.x,e.y]}})()")
    rs = await scr(rh[0], rh[1]); cen = await scr(rh[2], rh[3])
    await pg.mouse.move(*rs); await pg.mouse.down(); await pg.mouse.move(cen[0] + 80, cen[1], steps=8); await pg.mouse.up(); await pg.wait_for_timeout(250)
    rot = await ev(f"window.__yb.byId('{sid}').rot")
    ok("rotate handle turns it (snaps to 15°)", rot % 15 == 0 and rot in (270, 285, 255), str(rot))
    # duplicate + delete
    nb = await n(); await pg.keyboard.press("Control+d"); await pg.wait_for_timeout(200)
    ok("Ctrl+D duplicates", await n() == nb + 1)
    await pg.keyboard.press("Delete"); await pg.wait_for_timeout(200)
    ok("Delete removes", await n() == nb)
    # move the kitchen garden
    kg = await ev("(()=>{const e=window.__yb.ents().find(e=>e.k==='kgarden');return [e.id,e.x,e.y]})()")
    await ev("(()=>{const y=window.__yb; y.cam.tz=y.cam.z=4; y.cam.x=150; y.cam.y=130;})()"); await pg.wait_for_timeout(200)
    ks = await scr(kg[1], kg[2]); await pg.mouse.click(*ks); await pg.wait_for_timeout(150)
    await pg.mouse.move(*ks); await pg.mouse.down(); await pg.mouse.move(ks[0], ks[1] + 40, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(250)
    kg2 = await ev(f"(()=>{{const e=window.__yb.byId('{kg[0]}');return [e.x,e.y]}})()")
    ok("kitchen garden moves", kg2[1] < kg[2] - 5, f"{kg[1:]}->{kg2}")
    await pg.screenshot(path=f"{SP}/bt_d1.png")
    # moving it onto the house is refused and bounced back
    hs = await scr(115, 112); cur = await scr(kg2[0], kg2[1])
    await pg.mouse.move(*cur); await pg.mouse.down(); await pg.mouse.move(*hs, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(250)
    kg3 = await ev(f"(()=>{{const e=window.__yb.byId('{kg[0]}');return [e.x,e.y]}})()")
    ok("dragging onto the house bounces back", abs(kg3[0] - kg2[0]) < 0.01 and abs(kg3[1] - kg2[1]) < 0.01, f"{kg3}")
    # erase tool
    await pg.keyboard.press("x"); nb = await n()
    t1 = await ev("(()=>{const e=window.__yb.ents().find(e=>e.id==='T10');return [e.x,e.y]})()")
    ts = await scr(*t1); await pg.mouse.click(*ts); await pg.wait_for_timeout(200)
    ok("erase removes a tree", await n() == nb - 1 and not await ev("!!window.__yb.byId('T10')"))
    await pg.keyboard.press("Control+z"); await pg.wait_for_timeout(150)
    ok("undo brings it back", await ev("!!window.__yb.byId('T10')"))
    # marquee
    await pg.keyboard.press("v"); await ev("(()=>{const y=window.__yb; y.cam.tz=y.cam.z=5; y.cam.x=35; y.cam.y=68;})()"); await pg.wait_for_timeout(200)
    a = await scr(21, 95); bpt = await scr(28, 44)
    await pg.keyboard.down("Shift"); await pg.mouse.move(*a); await pg.mouse.down(); await pg.mouse.move(*bpt, steps=8); await pg.mouse.up(); await pg.keyboard.up("Shift"); await pg.wait_for_timeout(250)
    seln = await ev("window.__yb.ST.sel.length")
    ok("shift-drag box-selects the haskap row", seln >= 8, str(seln))
    # walk mode
    await pg.keyboard.press("g"); await pg.wait_for_timeout(100)
    p0 = await ev("[window.__yb.cam.x]")
    await pg.keyboard.down("w"); await pg.wait_for_timeout(700); await pg.keyboard.up("w"); await pg.wait_for_timeout(300)
    await pg.keyboard.press("e"); await pg.wait_for_timeout(200)
    ok("walk + E inspects", True)
    # tabs
    for t in ["plan", "season", "view", "palette"]:
        await pg.click(f"#tabs [data-tab='{t}']"); await pg.wait_for_timeout(150)
    await pg.click("#tabs [data-tab='plan']"); await pg.wait_for_timeout(150)
    ok("plan tab has budget/checks/plans sub-tabs", await pg.locator("#psubtabs [data-ptab]").count() == 3)
    tot = await pg.inner_text(".tot b"); ok("budget totals", tot.startswith("$") and len(tot) > 2, tot)
    inp = pg.locator("[data-price]").first; await inp.fill("999"); await inp.dispatch_event("change"); await pg.wait_for_timeout(200)
    tot2 = await pg.inner_text(".tot b"); ok("editing a unit price changes the total", tot2 != tot, f"{tot}->{tot2}")
    await pg.click("#psubtabs [data-ptab='checks']"); await pg.wait_for_timeout(150)
    ok("checks sub-tab lists sections", await pg.locator("#drawer details.sec").count() >= 1)
    await pg.click("#psubtabs [data-ptab='plans']"); await pg.wait_for_timeout(150)
    ok("plans sub-tab lists all plans", await pg.locator("#drawer [data-plan]").count() >= 5)
    await pg.click("#tabs [data-tab='season']"); await pg.click("#months [data-m='10']"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=f"{SP}/bt_d2.png")
    # plans
    await pg.select_option("#planSel", "B"); await pg.wait_for_timeout(300)
    ok("switch to Secluded", (await ev("window.__yb.ST.cur")) == "B" and await n() > 60)
    await ev("window.__yb.fitLot()"); await pg.wait_for_timeout(500)
    await pg.screenshot(path=f"{SP}/bt_d3.png")
    await pg.click("#newPlan"); await pg.wait_for_timeout(150)
    await pg.select_option("#npBase", "E"); await pg.fill("#npName", "Test yard"); await pg.click("#npGo"); await pg.wait_for_timeout(300)
    ok("new blank plan", (await ev("window.__yb.plan().name")) == "Test yard" and await n() == 0)
    # place something in the new plan, then reload and check persistence
    await pg.keyboard.press("u"); await pg.click("#drawer [data-st='greenhouse']"); sx, sy = await scr(150, 170); await pg.mouse.click(sx, sy); await pg.wait_for_timeout(1200)
    await pg.reload(); await pg.wait_for_timeout(1500)
    names = await ev("window.__yb.ST.order.map(k=>window.__yb.ST.plans[k].name)")
    ok("custom plan persists after reload", "Test yard" in names, str(names))
    a_n = await ev("window.__yb.ST.plans.A.ents.length"); ok("edited Balanced plan persists", a_n > 45 and await ev("window.__yb.ST.plans.A.edited"), str(a_n))
    tp = [k for k in await ev("window.__yb.ST.order") if (await ev(f"window.__yb.ST.plans['{k}'].name")) == "Test yard"][0]
    ok("its greenhouse persisted", await ev(f"window.__yb.ST.plans['{tp}'].ents.some(e=>e.k==='greenhouse')"))
    ok("help not shown again", not await pg.is_visible("#dlg"))
    # dark theme
    await ev("document.documentElement.dataset.theme='dark'"); await pg.wait_for_timeout(500)
    await pg.screenshot(path=f"{SP}/bt_d4_dark.png")
    ok("desktop: no script errors", not errs, "; ".join(errs[:5]))
    await ctx.close()

async def phone(b):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_FAILED" not in m.text else None)
    await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
    await pg.goto(URL); await pg.wait_for_timeout(1200)
    await pg.tap("#hX"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=f"{SP}/bt_p0.png")
    async def ev(js): return await pg.evaluate(js)
    async def scr(x, y): return await pg.evaluate(f"window.__yb.w2s({x},{y})")
    async def n(): return await pg.evaluate("window.__yb.ents().length")
    sw = await ev("document.documentElement.scrollWidth"); ok("phone: no horizontal scroll", sw <= 390, str(sw))
    ok("phone: tool bar visible", await pg.is_visible("#tools"))
    await ev("(()=>{const y=window.__yb; y.cam.tz=y.cam.z=4.5; y.cam.x=80; y.cam.y=160;})()"); await pg.wait_for_timeout(200)
    # plant via strip
    await pg.tap("#tools [data-tool='plant']"); await pg.wait_for_timeout(200)
    ok("phone: strip shows", await pg.is_visible("#strip"))
    await pg.tap("#strip [data-k='service']"); await pg.wait_for_timeout(100)
    nb = await n(); sx, sy = await scr(80, 165); await pg.touchscreen.tap(sx, sy); await pg.wait_for_timeout(300)
    ok("phone: tap plants a serviceberry", await n() == nb + 1 and (await ev("window.__yb.ents().at(-1).sp")) == "service")
    # path by taps, finish with Done
    await pg.tap("#tools [data-tool='path']"); await pg.wait_for_timeout(150)
    nb = await n()
    for (wx, wy) in [(70, 150), (85, 155), (95, 168)]:
        sx, sy = await scr(wx, wy); await pg.touchscreen.tap(sx, sy); await pg.wait_for_timeout(450)
    ok("phone: Done button appears", await pg.is_visible("#hintActs [data-h='done']"))
    await pg.tap("#hintActs [data-h='done']"); await pg.wait_for_timeout(300)
    ok("phone: path finished with Done", await n() == nb + 1 and (await ev("window.__yb.ents().at(-1).t")) == "path")
    ok("phone: inspector sheet opens", await pg.is_visible("#insp"))
    await pg.screenshot(path=f"{SP}/bt_p1.png")
    await pg.tap("#ix"); await pg.wait_for_timeout(150)
    # bed polygon closing by tapping first corner
    await pg.tap("#tools [data-tool='bed']"); await pg.wait_for_timeout(150)
    nb = await n()
    for (wx, wy) in [(60, 175), (72, 175), (72, 186), (60, 186)]:
        sx, sy = await scr(wx, wy); await pg.touchscreen.tap(sx, sy); await pg.wait_for_timeout(450)
    sx, sy = await scr(60, 175); await pg.touchscreen.tap(sx, sy); await pg.wait_for_timeout(300)
    ok("phone: tapping the first corner closes the bed", await n() == nb + 1 and (await ev("window.__yb.ents().at(-1).t")) == "bed")
    # build: place a bench, then select & drag with touch
    await pg.tap("#tools [data-tool='build']"); await pg.wait_for_timeout(150)
    await pg.select_option("#stripCat", label="Accents"); await pg.wait_for_timeout(150)
    ok("phone: strip group picker switches chips", await pg.is_visible("#strip [data-k='bench']"))
    await pg.tap("#strip [data-k='bench']"); nb = await n(); sx, sy = await scr(100, 180); await pg.touchscreen.tap(sx, sy); await pg.wait_for_timeout(300)
    ok("phone: bench placed", await n() == nb + 1)
    # drawer opens/closes
    await pg.tap("#menuBtn"); await pg.wait_for_timeout(350)
    ok("phone: panel slides in", await ev("document.body.classList.contains('open')"))
    await pg.tap("#tabs [data-tab='plan']"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=f"{SP}/bt_p2.png")
    await pg.mouse.click(380, 400); await pg.wait_for_timeout(350)
    ok("phone: tapping outside closes the panel", not await ev("document.body.classList.contains('open')"))
    # walk mode joystick
    await pg.tap("#tools [data-tool='walk']"); await pg.wait_for_timeout(200)
    ok("phone: joystick shows in walk mode", await pg.is_visible("#joy"))
    await pg.screenshot(path=f"{SP}/bt_p3.png")
    sw = await ev("document.documentElement.scrollWidth"); ok("phone: still no horizontal scroll", sw <= 390, str(sw))
    ok("phone: no script errors", not errs, "; ".join(errs[:5]))
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await desktop(b)
        await phone(b)
        await b.close()
    for r in results: print(*r)
    print("FAILED:", sum(1 for r in results if r[0] == "FAIL"), "of", len(results))
asyncio.run(main())
