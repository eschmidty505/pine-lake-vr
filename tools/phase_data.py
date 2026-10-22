import json, math, collections
D = json.load(open('budget_dump.json')); E = json.load(open('ents_dump.json')); SPD = D['sp']
det = {e['id']: e for e in D['det']}
PRICE = {'conifer': 165, 'tree': 185, 'fruit': 45, 'berry': 18, 'shrub': 35, 'perennial': 9, 'grass': 9}
ROW_PRICE = 6
beds = {e['id']: e for e in E if e['t'] == 'bed'}
plants = [e for e in E if e['t'] == 'plant']
rows = [e for e in E if e['t'] == 'row']
def offlot(e): return any('Off the lot' in m for m in det[e['id']]['chk'])
def bedcost(b):
    a, m = b['area'], b['mat']
    if m == 'mulchBlack': c = a * 3 / 12 / 27 * 48; q = f"{a*3/12/27:.1f} yd³ black mulch"
    elif m == 'needle': c = math.ceil(a / 45) * 9; q = f"{math.ceil(a/45)} bales pine straw"
    elif m == 'straw': c = math.ceil(a / 60) * 8; q = f"{math.ceil(a/60)} bales straw"
    elif m == 'meadow': c = a * 0.18; q = f"{a:,.0f} sf pollinator seed mix"
    elif m == 'river': c = a * 3 / 12 / 27 * 1.4 * 95; q = f"{a*3/12/27*1.4:.1f} tons river rock"
    elif m == 'pavers': c = a * 9; q = f"{a:,.0f} sf concrete pavers"
    elif m == 'permpav': c = a * 13; q = f"{a:,.0f} sf permeable pavers"
    else: c = 0; q = ''
    edge = b['perim'] * 3 if b.get('edge') == 'steel' else 0
    return round(c + edge), q + (f" + {b['perim']:.0f} LF steel edging" if edge else '')

pk = []
def add(**k):
    k.setdefault('deps', []); k.setdefault('flags', []); k.setdefault('H', 0); k.setdefault('T', 0); k.setdefault('L', 0); k.setdefault('season', 'any'); k.setdefault('must', False); k.setdefault('crop', None)
    k['cost'] = round(k['cost']); pk.append(k)

# --- foundation
add(id='lawn', name='Hydroseed the lawn', group='Foundation', cost=32824 * 0.12, detail='About 32,800 sf of lawn at $0.12/sf (DIY-rented hydroseeder or a low quote; pro range $0.07–$0.26/sf). Late Aug–mid Sept.', season='fall', must=True)
add(id='irr', name='Irrigation: spray zones 1–3 and 5', group='Foundation', cost=1350, detail='Mainline, valves and rotors/sprays for the lawn and front beds, DIY materials. Zones 4, 6 and 7 get stubbed.', season='any', must=True)
add(id='drip', name='Irrigation: drip zones 4, 6 and 7', group='Beds + prep', cost=800, detail='Drip for the berry patch, foundation beds and garden. Goes in with the first berries or beds.', season='any')
# --- beds (per bed)
bedname = {}
for bid, b in beds.items():
    inside = collections.Counter(SPD[p['sp']]['n'] for p in plants if p.get('bed') == bid)
    inside.update(SPD[r['sp']]['n'] + ' rows' for r in rows if r.get('bed') == bid)
    label = {'mulchBlack': 'Black mulch bed', 'needle': 'Pine-straw bed', 'straw': 'Straw berry bed', 'meadow': 'Meadow', 'river': 'River-rock garden court', 'pavers': 'Paver patio', 'permpav': 'Permeable-paver patio'}[b['mat']]
    what = ', '.join(k for k, _ in inside.most_common(2))
    c, q = bedcost(b)
    hard = b['mat'] in ('pavers', 'permpav', 'river')
    flags = []
    for m in det[bid]['chk']:
        if 'septic reserve' in m.lower() or 'Septic reserve' in m: pass
        flags.append(m.split(': ', 1)[1])
    if 'Septic reserve' in b.get('where', ''): flags.append('On the septic reserve: county OK needed for berries/beds.')
    name = f"{label}{' · ' + what if what else ''} ({b['area']:,.0f} sf)"
    bedname[bid] = name
    add(id='bed-' + bid, name=name, group='Patios + hardscape' if hard else 'Beds + prep', cost=c, detail=q, L=1 if hard else 0, flags=sorted(set(flags)), season='fall' if b['mat'] == 'meadow' else 'any',
        bed=bid, **({'note': 'Seed in late fall: the native mix needs winter cold to sprout.'} if b['mat'] == 'meadow' else {}))
# --- produce: yields per plant (lb/yr at full), years to first crop / full crop, $/lb grocery-equivalent
CROPS = {
 'haskap': dict(first=2, full=6, lb=7, price=10, unit='plant', src='USU Extension: 5–15 lb per mature bush; picks up in years 3–4'),
 'aronia': dict(first=3, full=5, lb=15, price=4, unit='plant', src='UW–Madison: 15–20 lb per mature plant; big yields in years 4–5'),
 'blueberry': dict(first=3, full=7, lb=7, price=5, unit='plant', src='Typical 5–10 lb per mature highbush plant; needs acid soil'),
 'elder': dict(first=2, full=4, lb=8, price=6, unit='plant', src='OSU: light crop year 2, full crop years 3–4 (trial plants ran 1–3 lb early)'),
 'service': dict(first=3, full=7, lb=5, price=6, unit='plant', src='Estimate; birds take a share'),
 'appleL': dict(first=3, full=8, lb=170, price=1.75, unit='plant', src='Stark Bros: 5–10 bushels per semi-dwarf; estimate assumes ~4 bu home yield'),
 'hazel': dict(first=4, full=8, lb=4, price=6, unit='plant', src='Estimate for American hazel, in-shell nuts'),
 'hickory': dict(first=12, full=30, lb=40, price=4, unit='plant', src='Shagbark often takes 10–40 years to bear; legacy tree'),
 'rasp_fall': dict(first=1, full=3, lb=0.7, price=8, unit='ft', src='CSU Extension: 15–20 lb per 25 ft row by year 3; fall types fruit the first fall'),
 'rasp_d': dict(first=2, full=3, lb=0.7, price=8, unit='ft', src='CSU Extension: same row yield; summer crop starts year 2'),
 'veg': dict(first=1, full=1, lb=0.6, price=2.5, unit='sf', src='Estimate: ~0.5–1 lb per sf of raised bed per season'),
 'hoop': dict(first=1, full=2, lb=1.0, price=3, unit='sf', src='Estimate: longer season under plastic, ~1 lb per sf'),
}
CROPNAME = {'haskap': 'Haskap', 'aronia': 'Aronia', 'blueberry': 'Blueberries', 'elder': 'Elderberries', 'service': 'Serviceberries', 'appleL': 'Apples', 'hazel': 'Hazelnuts', 'hickory': 'Hickory nuts', 'rasp_fall': 'Fall raspberries', 'rasp_d': 'Summer raspberries', 'veg': 'Vegetables', 'hoop': 'Hoop-house vegetables'}
def t75(s):
    h0, hM, tau = s['h0'], s['hM'], s['tau']; tgt = 0.75 * hM
    if h0 >= tgt: return 0
    return round(-tau * math.log(1 - (tgt - h0) / (hM - h0)), 1)
def bedsof(lst): return sorted({'bed-' + p['bed'] for p in lst if p.get('bed')})
def flagsof(lst):
    f = collections.Counter()
    for p in lst:
        for m in det[p['id']]['chk']:
            if m.startswith('err') or 'septic reserve' in m or 'pH' in m or 'Pond Easement' in m: f[m.split(': ', 1)[1]] += 1
    return [f"{m}{' (' + str(n) + ')' if n > 1 else ''}" for m, n in f.most_common()]
# split street-edge (right-of-way) plants out
row_plants = [p for p in plants if offlot(p) and p['y'] < 0]
onlot = [p for p in plants if p not in row_plants]
by = collections.defaultdict(list)
for p in onlot: by[p['sp']].append(p)
GROUP = {'conifer': 'Trees + screening', 'tree': 'Trees + screening', 'fruit': 'Fruit + nuts', 'berry': 'Fruit + nuts', 'shrub': 'Trees + screening', 'perennial': 'Perennials + grasses', 'grass': 'Perennials + grasses'}
for sp, lst in by.items():
    s = SPD[sp]; n = len(lst); cost = n * PRICE[s['c']]
    crop = sp if sp in CROPS else None
    g = 'Fruit + nuts' if crop else GROUP[s['c']]
    nm = f"{s['n']}{' ' + s['v'] if s['v'] and len(s['v']) < 24 else ''} × {n}"
    season = 'spring' if s['c'] == 'berry' else 'any'
    k = dict(id='sp-' + sp, name=nm, group=g, cost=cost, deps=bedsof(lst), flags=flagsof(lst), season=season, sp=sp, count=n,
             detail=f"{n} × ${PRICE[s['c']]} ({s['c'] if s['c'] != 'tree' else 'shade tree'}, B&B or container)" if s['c'] in ('conifer', 'tree', 'fruit') else f"{n} × ${PRICE[s['c']]}",
             mature=dict(h=s['hM'], w=s['sM'], t75=t75(s)), ev=s['c'] == 'conifer')
    if crop: k['crop'] = dict(CROPS[crop], key=crop, name=CROPNAME[crop], qty=n)
    if s['c'] in ('conifer', 'tree') or sp in ('hazel',): k['T'] = 1
    if s['c'] in ('perennial', 'grass'): k['L'] = 0.35
    if 'berry' == s['c'] or crop: k['deps'] = sorted(set(k['deps'] + ['drip'])) if any(p.get('bed') for p in lst) else k['deps']
    add(**k)
# raspberry rows
rb = collections.defaultdict(list)
for r in rows: rb[r['sp']].append(r)
for sp, lst in rb.items():
    s = SPD[sp]; ft = sum(r['len'] for r in lst); canes = sum(r['count'] for r in lst)
    add(id='row-' + sp, name=f"{s['n']}{' ' + s['v'] if s['v'] else ''}: {len(lst)} rows, {ft:.0f} ft", group='Fruit + nuts', cost=canes * ROW_PRICE + (len(lst) * 45 if sp == 'rasp_d' else 0),
        detail=f"{canes} bare-root canes × ${ROW_PRICE}" + (f" + T-trellis posts and wire (~$45/row)" if sp == 'rasp_d' else ''), deps=sorted(set(bedsof(lst) + ['drip'])), flags=flagsof(lst), season='spring', sp=sp,
        crop=dict(CROPS[sp], key=sp, name=CROPNAME[sp], qty=ft), mature=dict(h=s['hM'], w=s['sM'], t75=t75(s)))
# street-edge buffer
cnt = collections.Counter(p['sp'] for p in row_plants); cost = sum(PRICE[SPD[k]['c']] * v for k, v in cnt.items())
add(id='rowbuffer', name='Street-edge buffer (road right-of-way)', group='Trees + screening', cost=cost,
    detail=' · '.join(f"{v} {SPD[k]['n'].lower()}" for k, v in cnt.most_common()), T=0.7, L=0.4,
    flags=['All of these sit between the lot line and the road, in the county right-of-way: get Lapeer County Road Commission approval first (sight lines at the drive, plowing, salt spray, utilities).'],
    mature=dict(h=40, w=14, t75=t75(SPD['arbor'])), ev=True, sp='arbor')
# --- structures
st = [e for e in E if e['t'] == 'st']
veg_sf = sum(e['w'] * e['h'] for e in st if e['k'] in ('raised', 'raised8'))
nr = sum(1 for e in st if e['k'] in ('raised', 'raised8'))
add(id='veg', name=f"Vegetable garden: {nr} raised beds + potting bench", group='Fruit + nuts', cost=3 * 150 + 2 * 190 + 220, detail=f"{veg_sf:.0f} sf of 4′ beds, cedar kits + soil fill, plus the potting bench", deps=['bed-Z10'], season='spring', crop=dict(CROPS['veg'], key='veg', name=CROPNAME['veg'], qty=veg_sf))
add(id='hoop', name='Hoop house 12×24', group='Fruit + nuts', cost=1800, detail='Kit, ground posts and plastic; 288 sf growing space', season='any', flags=['Accessory building: check Pine Crest HOA rules and Almont Township setbacks before building.'], crop=dict(CROPS['hoop'], key='hoop', name=CROPNAME['hoop'], qty=288))
for k, nm, c in [('pergola', 'Pergola 12×12 over the garden court', 3200), ('swing', 'Swing set', 900), ('fountain', 'Bubbler fountain on the patio', 450), ('arbor', 'Garden arbor', 260)]:
    add(id='st-' + k, name=nm, group='Outdoor living', cost=c, detail='DIY kit or materials', L=1, deps=['bed-Z10'] if k == 'pergola' else (['bed-Z5'] if k == 'fountain' else []))
add(id='flag', name='Flagstone walk (46 ft)', group='Patios + hardscape', cost=183 * 14, detail='183 sf flagstone on a gravel base', L=0.9)
add(id='fence', name='Split-rail fence (84 LF)', group='Patios + hardscape', cost=84 * 9, detail='Two runs, DIY posts and rails', L=0.5)
json.dump(dict(pk=pk, plan='LEGIT MANAUL SAVE', items=217, read='2026-10-21'), open('phase_pk.json', 'w'), indent=1)
print(len(pk), sum(p['cost'] for p in pk))
for p in pk: print(p['id'], p['group'], p['cost'], p['deps'], p.get('crop', {}) and p['crop']['key'] if p.get('crop') else '', p['flags'][:1])
