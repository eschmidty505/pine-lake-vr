import asyncio, sys
from playwright.async_api import async_playwright
SP=sys.argv[1]; R=[]
def ok(n,c,x=""): R.append(("PASS" if c else "FAIL",n,x))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":1440,"height":900}); errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
        await pg.goto("file:///home/claude/pine-lake-vr/planner.html"); await pg.wait_for_timeout(800); await pg.click("#hX")
        ev=pg.evaluate
        await ev("(()=>{const y=window.__yb; y.cam.tz=y.cam.z=8; y.cam.x=160; y.cam.y=170;})()"); await pg.wait_for_timeout(300)
        scr=lambda x,y: ev(f"window.__yb.w2s({x},{y})")
        n=lambda: ev("window.__yb.ents().length")
        await pg.keyboard.press("u"); await pg.wait_for_timeout(200)
        await pg.click("#drawer [data-surf='flagbed']"); await pg.wait_for_timeout(200)
        ok("surface swatch arms bed tool", await ev("window.__yb.ST.tool")=='bed' and await ev("window.__yb.ST.armed.bed")=='flagbed')
        await ev("window.__yb.ST.bedShape='poly'")
        n0=await n()
        for (x,y) in [(150,160),(170,160),(172,178),(152,180)]:
            sx,sy=await scr(x,y); await pg.mouse.click(sx,sy); await pg.wait_for_timeout(250)
        sx,sy=await scr(150,160); await pg.mouse.click(sx,sy); await pg.wait_for_timeout(300)
        ok("flagstone patio drawn by points", await n()==n0+1 and await ev("window.__yb.ents().at(-1).mat")=='flagbed')
        bid=await ev("window.__yb.ents().at(-1).id")
        ok("patio edging none", await ev("window.__yb.ents().at(-1).edge")=='none')
        c=await ev("window.__yb.checks({id:'Q',t:'plant',sp:'coneflower',x:160,y:170},window.__yb.ents()).map(m=>m[0]+':'+m[1]).join('|')")
        ok("plant on the patio is blocked", 'block' in c, c)
        await pg.keyboard.press("u"); await pg.wait_for_timeout(150)
        await ev("window.__yb.ST.armed.st='firepit'"); await pg.keyboard.press("]"); await pg.keyboard.press("]"); await pg.wait_for_timeout(150)
        await ev("window.__yb.ST.armed.st='bench'")
        sx,sy=await scr(160,170); await pg.mouse.move(sx,sy); await pg.wait_for_timeout(300); await pg.screenshot(path=SP+"/surf_ghost.png")
        await pg.mouse.click(sx,sy); await pg.wait_for_timeout(300)
        ok("bench placed on patio, rotated 30", await ev("window.__yb.ents().at(-1).k")=='bench' and await ev("window.__yb.ents().at(-1).rot")==30, str(await ev("window.__yb.ents().at(-1).rot")))
        await pg.click("#hintActs [data-h='rot90']"); await pg.wait_for_timeout(100)
        sx,sy=await scr(165,175); await pg.mouse.click(sx,sy); await pg.wait_for_timeout(300)
        ok("hint button turns 90", await ev("window.__yb.ents().at(-1).rot")==120)
        bud=await ev("JSON.stringify(window.__yb.budget().lines.beds.map(l=>[l.n,Math.round(l.q),l.u]))")
        ok("patio in budget by sf", 'Flagstone' in bud, bud)
        await pg.screenshot(path=SP+"/surf.png")
        ok("no errors", not errs, str(errs[:3]))
        for r in R: print(*r)
        await b.close()
asyncio.run(main())
