"""Food expansion checks for planner.html: new species, calorie bed, strawberry bed, low tunnel,
coop placeholder, pollination warnings, swap-to-edible, food totals, 3D at every age.
Usage: python3 tests/test_food.py <folder with node_modules/three> [plan.json]
The optional plan JSON (a saved Yard Builder plan) is loaded as plan E for the plan-specific checks."""
import json, sys
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
PLAN = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
URL = "file:///home/claude/pine-lake-vr/planner.html"
NM = SP + "/node_modules/three"
R = []
def ok(name, cond, info=''):
    R.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name, info if not cond or info else '')

NEW = ['hazelH', 'chestnut', 'persimmon', 'persimmonM', 'pawpaw', 'asparagus', 'rhubarb', 'walkonion', 'horseradish']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    for vp, label in [({'width': 1400, 'height': 900}, 'desktop'), ({'width': 390, 'height': 844}, 'phone')]:
        pg = b.new_page(viewport=vp)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.route('**/three.min.js', lambda r: r.fulfill(path=NM + '/build/three.min.js'))
        pg.route('**/OrbitControls.js', lambda r: r.fulfill(path=NM + '/examples/js/controls/OrbitControls.js'))
        init = "localStorage.clear();"
        if PLAN: init += "localStorage.setItem('plb-plans', JSON.stringify({E: %s}));" % json.dumps(PLAN)
        pg.add_init_script(init)
        pg.goto(URL); pg.wait_for_timeout(1200)
        Y = 'window.__yb'
        if label == 'desktop':
            # species exist, priced, in the staples group
            r = pg.evaluate("""(NEW) => { const Y = window.__yb; return NEW.map(k => [k, !!Y.SP[k], Y.SP[k] && Y.SP[k].ed, !!Y.FOOD[Y.foodKey(k)]]); }""", NEW)
            ok('all new species defined, edible, with yields', all(x[1] and x[2] and x[3] for x in r), r)
            # blank lot: place every new species and structure
            pg.evaluate("() => window.__yb.setPlan('E')") if not PLAN else None
            pg.evaluate("""() => { const Y = window.__yb; Y.setPlan('A'); }""")
            res = pg.evaluate("""(NEW) => { const Y = window.__yb, E = Y.ents(); const before = Y.budget().total;
              NEW.forEach((k, i) => E.push({ id: 'FT' + i, t: 'plant', sp: k, x: 100 + i * 6, y: 175 }));
              E.push({ id: 'FS1', t: 'st', k: 'calbed', x: 196, y: 128, w: 4, h: 24, rot: 0, name: '', crop: 'potato' });
              E.push({ id: 'FS2', t: 'st', k: 'lowtunnel', x: 190, y: 128, w: 4, h: 12, rot: 0, name: '' });
              E.push({ id: 'FS3', t: 'st', k: 'coop', x: 200, y: 160, w: 8, h: 12, rot: 0, name: '' });
              E.push({ id: 'FZ1', t: 'bed', mat: 'strawbed', name: '', pts: [[180, 100], [190, 100], [190, 110], [180, 110]], comp: [], smooth: false, edge: 'none' });
              Y.ST.sel = []; Y.undo; window.dispatchEvent(new Event('resize'));
              const all = Y.ents(), chk = id => Y.checks(Y.byId(id), all).map(m => m[0] + ':' + m[1]);
              const B = Y.budget(), lines = [].concat(...Object.values(B.lines));
              return { chk: Object.fromEntries(['FT0', 'FT1', 'FT2', 'FT3', 'FT4', 'FS1', 'FS3', 'FZ1'].map(id => [id, chk(id)])),
                coopInBudget: lines.some(l => /coop/i.test(l.n)), hazelPrice: (lines.find(l => l.key === 'sp:hazelH') || {}).p, chestPrice: (lines.find(l => l.key === 'sp:chestnut') || {}).p,
                calbed: (lines.find(l => /Calorie/.test(l.n)) || {}).p, food: Y.foodOf(all).map(f => f[0]), z8: Y.zone8().lines.length }; }""", NEW)
            c = res['chk']
            ok('lone hybrid hazel warns about 3 for pollination', any('at least 3' in m for m in c['FT0']), c['FT0'])
            ok('lone chestnut warns it needs a second', any('Only one chestnut' in m for m in c['FT1']), c['FT1'])
            solo = pg.evaluate("() => { const Y = window.__yb, e = { id: 'S1', t: 'plant', sp: 'persimmon', x: 120, y: 180 }; return Y.checks(e, [e]).map(m => m[1]); }")
            ok('lone Prok persimmon warns', any('Meader' in m for m in solo), solo)
            ok('Meader persimmon does not warn about a partner', not any('Only one persimmon' in m for m in c['FT3']), c['FT3'])
            ok('lone pawpaw warns', any('second, genetically different pawpaw' in m for m in c['FT4']), c['FT4'])
            ok('coop is TBD and excluded from the budget', not res['coopInBudget'] and any('TBD' in m for m in c['FS3']), c['FS3'])
            ok('per-species prices used', res['hazelPrice'] == 40 and res['chestPrice'] == 80, (res['hazelPrice'], res['chestPrice']))
            ok('calorie bed priced', res['calbed'] and res['calbed'] > 200, res['calbed'])
            ok('food totals count calorie bed + strawberry bed', 'potato' in res['food'] and 'strawberry' in res['food'], res['food'])
            ok('drip zone 8 reaches the food beds', res['z8'] >= 3, res['z8'])
            # food beds blocked on septic field and reserve, warned near the well
            res = pg.evaluate("""() => { const Y = window.__yb, all = Y.ents(); const mk = (x, y) => ({ id: 'TMP', t: 'st', k: 'calbed', x, y, w: 4, h: 24, rot: 0 });
              const f = e => Y.checks(e, [...all, e]).map(m => m[0] + ':' + m[1]);
              const bed = (x, y) => ({ id: 'TMPB', t: 'bed', mat: 'strawbed', pts: [[x, y], [x + 8, y], [x + 8, y + 8], [x, y + 8]], comp: [] });
              return { field: f(mk(150, 40)), reserve: f(mk(30, 100)), well: f(mk(115, 170)), sbField: f(bed(150, 40)), sbWell: f(bed(110, 165)) }; }""")
            ok('calorie bed blocked on the septic field', any(m.startswith('block:No food beds on the septic field') for m in res['field']), res['field'])
            ok('calorie bed blocked on the septic reserve', any(m.startswith('block:No food beds on the septic reserve') for m in res['reserve']), res['reserve'])
            ok('calorie bed warned inside the well 50 ft', any('50′ of the well' in m for m in res['well']), res['well'])
            ok('strawberry bed is an error on the septic field', any(m.startswith('err:No food gardens') for m in res['sbField']), res['sbField'])
            ok('strawberry bed warned near the well', any('50′ of the well' in m for m in res['sbWell']), res['sbWell'])
            # chestnut root reach: 30 ft from trenches is an error now (reach 40)
            res = pg.evaluate("""() => { const Y = window.__yb, e = { id: 'TC', t: 'plant', sp: 'chestnut', x: 160, y: 108 }; return Y.checks(e, [...Y.ents(), e]).map(m => m[0] + ':' + m[1]); }""")
            ok('chestnut 32 ft from the trenches breaks its 40 ft root rule', any('keep ≥40′' in m for m in res), res)
            # swap to edible via the inspector
            sid = pg.evaluate("() => { const Y = window.__yb; Y.setTool('select'); const e = Y.ents().find(e => e.t === 'plant' && e.sp === 'birch'); Y.setSel([e.id]); return e.id; }")
            pg.wait_for_timeout(150)
            btn = pg.query_selector('#insp [data-eswap]')
            ok('swap-to-edible buttons show for a river birch', btn is not None)
            if btn:
                k = btn.get_attribute('data-eswap'); btn.evaluate('b => b.click()'); pg.wait_for_timeout(150)
                sp = pg.evaluate("(id) => window.__yb.byId(id).sp", sid)
                ok('swap replaces the species in place', sp == k, sp)
                ok('inspector shows the new plant after the swap', pg.evaluate("() => !document.querySelector('#insp').hidden && document.querySelector('#insp h3').textContent"), '')
            # calorie bed inspector: crop select changes yield label
            pg.evaluate("() => { const Y = window.__yb; Y.setPlan('A'); Y.ents().push({ id: 'FSX', t: 'st', k: 'calbed', x: 196, y: 128, w: 4, h: 24, rot: 0, name: '', crop: 'potato' }); Y.setTool('select'); Y.setSel(['FSX']); }")
            pg.wait_for_timeout(150)
            has = pg.query_selector('#iCrop') is not None
            ok('calorie bed inspector has a crop selector', has)
            if has:
                pg.evaluate("() => { const s = document.querySelector('#iCrop'); s.value = 'drybean'; s.dispatchEvent(new Event('change')); }"); pg.wait_for_timeout(100)
                ok('crop change saved', pg.evaluate("() => window.__yb.byId('FSX').crop") == 'drybean')
                pg.evaluate("() => { const s = document.querySelector('#iRotate'); s.checked = true; s.dispatchEvent(new Event('change')); }"); pg.wait_for_timeout(50)
                rot = pg.evaluate("() => { const Y = window.__yb, e = Y.byId('FSX'), out = []; for (const y of [1, 2, 3, 4]) { Y.ST.year = y; out.push(Y.calCrop(e)); } Y.ST.year = 1; return out; }")
                ok('rotation cycles four crops over four years', len(set(rot)) == 4, rot)
            pg.evaluate("() => window.__yb.setSel([])")
            # palette: staples group + TBD coop badge
            pg.evaluate("() => window.__yb.setTool('plant')"); pg.wait_for_timeout(100)
            ok('Nuts + staple crops section in the plant palette', pg.query_selector('[data-sec="pl-food"]') is not None)
            pg.evaluate("() => window.__yb.setTool('build')"); pg.wait_for_timeout(100)
            ok('coop shows greyed with a TBD badge', pg.query_selector('button.tbd[data-st="coop"] .tbdb') is not None)
            ok('calorie bed and low tunnel in the Build palette', pg.query_selector('[data-st="calbed"]') is not None and pg.query_selector('[data-st="lowtunnel"]') is not None)
            pg.evaluate("() => window.__yb.setTool('bed')"); pg.wait_for_timeout(100)
            ok('strawberry bed in the Beds palette', pg.query_selector('[data-bed="strawbed"]') is not None)
            # food readout in Plan > Budget
            pg.evaluate("() => { const Y = window.__yb; Y.ST.tab = 'plan'; Y.ST.planTab = 'budget'; }")
            pg.evaluate("() => document.querySelector('[data-tab=\"plan\"]').click()"); pg.wait_for_timeout(150)
            ok('Food at full crop section in the budget', pg.query_selector('[data-sec="bud-food"]') is not None)
            # 3D at every age and two months for the new things
            pg.evaluate("() => { const Y = window.__yb; Y.setPlan('A'); Y.setTool('select'); }")
            pg.evaluate("async () => { await window.__yb.setView('3d'); }"); pg.wait_for_timeout(2500)
            ok('3D view on', pg.evaluate("() => window.__yb.V3.on"))
            pg.evaluate("""(NEW) => { const Y = window.__yb, E = Y.ents(); NEW.forEach((k, i) => E.push({ id: 'G' + i, t: 'plant', sp: k, x: 100 + i * 6, y: 178 })); E.push({ id: 'GS1', t: 'st', k: 'calbed', x: 196, y: 128, w: 4, h: 24, rot: 0, name: '', crop: 'wsquash' }, { id: 'GS2', t: 'st', k: 'lowtunnel', x: 190, y: 128, w: 4, h: 12, rot: 0, name: '' }, { id: 'GS3', t: 'st', k: 'coop', x: 200, y: 160, w: 8, h: 12, rot: 30, name: '' }); Y.ST.layers.irrigation = true; }""", NEW)
            bad = []
            for age in [0, 3, 5, 10, 25]:
                for m in [5, 9]:
                    pg.evaluate("([a, m]) => { const Y = window.__yb; Y.ST.year = a; Y.ST.month = m; }", [age, m])
                    try:
                        pg.wait_for_function("() => window.__yb.settled3D()", timeout=15000)
                    except Exception as ex:
                        bad.append((age, m, 'not settled'))
                    n = pg.evaluate("""(NEW) => NEW.filter((k, i) => !window.__yb.V3.objs.get('G' + i)).length""", NEW)
                    if n: bad.append((age, m, n))
            ok('every new plant and structure renders in 3D at every age', not bad, bad)
            ok('calorie bed, low tunnel and coop have 3D models', pg.evaluate("() => ['GS1', 'GS2', 'GS3'].every(id => window.__yb.V3.objs.get(id))"))
            pg.evaluate("async () => { await window.__yb.setView('2d'); }"); pg.wait_for_timeout(300)
            # plan E specifics
            if PLAN:
                pg.evaluate("() => window.__yb.setPlan('E')"); pg.wait_for_timeout(200)
                res = pg.evaluate("""() => { const Y = window.__yb, all = Y.ents(); const nuts = all.filter(e => e.t === 'plant' && ['hazel', 'hazelH', 'chestnut', 'hickory'].includes(e.sp));
                  return { nuts: nuts.map(e => [e.id, e.sp, e.x, e.y, Y.checks(e, all).filter(m => m[0] !== 'ok').map(m => m[0] + ':' + m[1])]), food: Y.foodOf(all).reduce((a, f) => a + f[3], 0), n: all.length }; }""")
                for row in res['nuts']: print('   ', row)
                ok('plan E: hazels are hybrids, 3 of them', sum(1 for r in res['nuts'] if r[1] == 'hazelH') == 3 and not any(r[1] == 'hazel' for r in res['nuts']), res['nuts'])
                ok('plan E: two chestnuts, no rule errors on either', sum(1 for r in res['nuts'] if r[1] == 'chestnut') == 2 and all(not any(m.startswith(('err', 'block')) for m in r[4]) for r in res['nuts'] if r[1] == 'chestnut'))
                ok('plan E: hazels clear the 3-plant pollination rule', all(not any('at least 3' in m for m in r[4]) for r in res['nuts'] if r[1] == 'hazelH'))
                print('    plan E calories at full crop: %.0fk (%.1f%% of a family of 4), %d items' % (res['food'] / 1000, res['food'] / (2200 * 4 * 365) * 100, res['n']))
        else:
            pg.evaluate("() => window.__yb.setTool('plant')"); pg.wait_for_timeout(200)
            ok('phone: no horizontal scroll with the new palette', pg.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"))
            pg.evaluate("() => window.__yb.setTool('build')"); pg.wait_for_timeout(200)
            ok('phone: strip shows the Garden group with the new structures', pg.evaluate("() => !!document.querySelector('#strip [data-k=\"calbed\"]') || !!document.querySelector('#stripCat')"))
            ok('phone: still no horizontal scroll', pg.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"))
        ok(label + ': no script errors', not errs, errs[:5])
        pg.close()
    b.close()
print(('FAILED: %d of %d' % (R.count(False), len(R))))
sys.exit(1 if False in R else 0)
