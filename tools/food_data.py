"""Food expansion for the Install phases page (phases.html).

Reads the page's current DATA (built earlier by phase_data.py from plan E) and the FOOD yield table
in planner.html, then:
  * adds kcal per lb, picking months, colours and storage to every crop
  * applies the plan E nut-tree change (3 American hazels -> hybrid hazelnuts, 2 Chinese chestnuts)
  * adds the sustaining-food add-ons from docs/food-expansion-plan.md section 6 (addon: true)
  * adds the chest freezer (non-essential) and the chicken coop (TBD, never counted)
  * lists the ornamental -> edible swaps for the "what if" toggle
and writes DATA back into phases.html.

Usage: python3 tools/food_data.py            (run from the repo root; edits phases.html in place)
"""
import json, math, re, sys

PAGE, PLANNER = 'phases.html', 'planner.html'
page = open(PAGE).read()
m = re.search(r'^const DATA = (.*);\s*$', page, re.M)
D = json.loads(m.group(1))
plan_src = open(PLANNER).read()
FOOD = json.loads(plan_src[plan_src.index('/*FOOD*/') + 8:plan_src.index('/*END*/')])

FRUIT = 'Fruit, nuts + staples'
COLOR = {'haskap': '#3a3f8f', 'aronia': '#1c1a24', 'blueberry': '#3c4f8f', 'elder': '#2a1630', 'service': '#5b2a52', 'appleL': '#b3202a',
         'hazel': '#8a6a3a', 'hazelH': '#8a6a3a', 'hickory': '#7a6a3c', 'chestnut': '#6b4a24', 'persimmon': '#e07a24', 'pawpaw': '#9aa84a',
         'rasp_fall': '#c21f3a', 'rasp_d': '#d0465a', 'veg': '#5f8a3a', 'hoop': '#7fae5a', 'potato': '#8a6a3a', 'wsquash': '#d88a2a',
         'drybean': '#7a3a2a', 'garlic': '#b9b29a', 'strawberry': '#d62a3a', 'asparagus': '#6fa04a', 'rhubarb': '#c23a4a',
         'walkonion': '#a8708a', 'horseradish': '#a89a70'}
# months the harvest keeps after picking; 'freezer' ones only count when the chest freezer is in the plan
STORE = {'potato': (5, 0), 'wsquash': (4, 0), 'garlic': (7, 0), 'drybean': (12, 0), 'appleL': (2, 0), 'chestnut': (2, 0),
         'hazel': (12, 0), 'hazelH': (12, 0), 'hickory': (12, 0), 'haskap': (12, 1), 'aronia': (12, 1), 'blueberry': (12, 1),
         'elder': (12, 1), 'service': (12, 1), 'rasp_fall': (12, 1), 'rasp_d': (12, 1), 'strawberry': (12, 1), 'persimmon': (12, 1), 'pawpaw': (12, 1)}
SPECIES = {  # growth numbers for the tree-size curve (match planner.html)
    'hazelH': dict(h0=2, hM=12, tau=4), 'chestnut': dict(h0=4, hM=40, tau=12), 'persimmon': dict(h0=4, hM=28, tau=12), 'pawpaw': dict(h0=5, hM=20, tau=11)}

def t75(s):
    tgt = 0.75 * s['hM']
    return 0 if s['h0'] >= tgt else round(-s['tau'] * math.log(1 - (tgt - s['h0']) / (s['hM'] - s['h0'])), 1)

def crop(key, qty, name=None):
    f = FOOD[key]; st = STORE.get(key, (0, 0))
    return dict(first=f['first'], full=f['full'], lb=f['lb'], price=f['price'], unit=f['unit'], kcal=f['kcal'], src=f['src'], key=key,
                name=name or f['name'], qty=qty, months=f['months'], color=COLOR.get(key, '#7a8a50'), store=st[0], freezer=bool(st[1]))

# the plan as it was before the food expansion (essentials only); kept from the first run
_base = [p for p in D['pk'] if p.get('crop') and not p.get('food') and not p.get('nonEss')]
base_kcal = D['base']['kcal'] if 'base' in D else sum(p['crop']['qty'] * p['crop']['lb'] * FOOD[p['crop']['key']]['kcal'] for p in _base)
base_lb = D['base']['lb'] if 'base' in D else sum(p['crop']['qty'] * p['crop']['lb'] for p in _base)

pk = []
for p in D['pk']:
    if p['id'] in ('sp-hazel', 'sp-hazelH', 'sp-chestnut') or p.get('food'):
        continue  # rebuilt below (re-runnable)
    if p['group'] in ('Fruit + nuts', FRUIT):
        p['group'] = FRUIT
    if p.get('crop'):
        c = p['crop']; p['crop'] = crop(c['key'], c['qty'], c['name'])
    pk.append(p)

# --- plan E nut trees (drawn in the plan)
hz = crop('hazelH', 3)
pk.append(dict(id='sp-hazelH', name='Hybrid hazelnut × 3', group=FRUIT, cost=3 * 40, detail='3 × $40 (seedling tubes or 1-gal), in the pine-straw bed by the garden gate',
               deps=['bed-Z16'], flags=[], H=0, T=1, L=0, season='any', must=False, crop=hz, sp='hazelH', count=3,
               mature=dict(h=12, w=10, t75=t75(SPECIES['hazelH'])), short='hybrid hazelnuts', food='plan'))
pk.append(dict(id='sp-chestnut', name='Chinese chestnut × 2', group=FRUIT, cost=2 * 80, detail='2 × $80 (grafted or seedling, 3–5 ft), planted on low mounds: north of the house at (117, 188) and on the east side at (196, 124)',
               deps=[], flags=['The east chestnut is 3′ from the drawn hoop house; at 40′ wide its crown will shade it.'], H=0, T=1, L=0, season='spring', must=False,
               crop=crop('chestnut', 2), sp='chestnut', count=2, mature=dict(h=40, w=40, t75=t75(SPECIES['chestnut'])), short='chestnuts', food='plan'))

# --- sustaining-food add-ons (not drawn yet; section 6 of the food plan)
S = 'Staple crops'
def addon(**k):
    k.setdefault('deps', []); k.setdefault('flags', []); k.setdefault('H', 0); k.setdefault('T', 0); k.setdefault('L', 0)
    k.setdefault('season', 'spring'); k.setdefault('must', False); k.setdefault('crop', None); k['food'] = 'addon'; k['cost'] = round(k['cost'])
    pk.append(k)
addon(id='f-compost', name='Compost bays (3)', group=S, cost=250, season='any', detail='The calorie beds need about 2″ of compost a year. Site it ≥50′ from the well.', short='compost bays')
addon(id='f-drip8', name='Drip zone 8: food beds', group=S, cost=250, detail='Valve, ½″ header and drip line for the calorie and strawberry beds (or extend zone 7).', short='drip zone 8')
for key, sf, nm, season in [('potato', 200, 'potatoes', 'spring'), ('wsquash', 150, 'winter squash', 'spring'), ('drybean', 100, 'dry beans', 'spring'), ('garlic', 50, 'garlic (then beans)', 'fall')]:
    addon(id='f-cal-' + key, name=f'Calorie beds: {nm}, {sf} sf', group=S, cost=sf * 2.6, season=season, deps=['f-compost', 'f-drip8'],
          detail=f'{sf // 96 or 1}–{math.ceil(sf / 96)} cedar beds 4×24 with soil; rotate potatoes → beans → squash → garlic each year', crop=crop(key, sf), short='calorie beds')
addon(id='f-straw', name='Strawberry bed, 100 sf', group=S, cost=120, deps=['f-drip8'], detail="100 plants ('Jewel' June-bearing or 'Albion' day-neutral) at 18¢ plus compost", crop=crop('strawberry', 100), short='strawberry bed')
addon(id='f-asparagus', name='Asparagus, 25 crowns', group=S, cost=75, detail="'Millennium' crowns in a permanent 4×20 bed; first light picking year 2", crop=crop('asparagus', 25), short='asparagus')
addon(id='f-rhubarb', name='Rhubarb × 3', group=S, cost=45, detail="'Canada Red' crowns", crop=crop('rhubarb', 3), short='rhubarb')
addon(id='f-onion', name='Walking onions × 3', group=S, cost=18, season='any', detail='A corner they can “walk” in', crop=crop('walkonion', 3), short='walking onions')
addon(id='f-horse', name='Horseradish × 1', group=S, cost=8, season='any', detail='In a sunk container: it is hard to remove once planted', crop=crop('horseradish', 1), short='horseradish')
addon(id='f-hazel', name='Hybrid hazelnut × 3 more (makes 6)', group=S, cost=120, season='any', detail='A 6′-spaced hedge along the north or east side, outside the easements', crop=crop('hazelH', 3, 'Hybrid hazelnuts, 3 more'),
      T=1, mature=dict(h=12, w=10, t75=t75(SPECIES['hazelH'])), sp='hazelH', count=3, short='more hazels')
addon(id='f-persimmon', name="American persimmon × 2 ('Meader' + 'Prok')", group=S, cost=130, detail='Grafted 3–4 ft; native, clay-tolerant, sweet after frost', crop=crop('persimmon', 2),
      T=1, mature=dict(h=28, w=16, t75=t75(SPECIES['persimmon'])), sp='persimmon', count=2, short='persimmons')
addon(id='f-pawpaw', name='Pawpaw × 2 (two unrelated varieties)', group=S, cost=90, detail='Plant with tree shelters: they want shade for the first 1–2 years', crop=crop('pawpaw', 2),
      T=1, mature=dict(h=20, w=14, t75=t75(SPECIES['pawpaw'])), sp='pawpaw', count=2, short='pawpaws')
addon(id='f-tunnel', name='Low tunnels × 2', group=S, cost=240, season='any', deps=['f-cal-potato'], detail='Wire hoops + row cover on two calorie beds: about 4 more weeks of spring greens and fall carrots', short='low tunnels')
# storage + TBD
addon(id='f-freezer', name='Chest freezer', group='Storage', cost=300, season='any', nonEss=True, detail='Berries, persimmon and pawpaw pulp keep a year frozen', short='chest freezer')
addon(id='f-coop', name='Chicken coop + run (TBD)', group='Storage', cost=1500, season='any', tbd=True,
      detail='Pending the Pine Crest HOA covenants and Almont Township zoning. 6 hens ≈ 1,200–1,500 eggs a year (≈100k kcal). Never counted until the rules are known.', short='coop')

# --- what-if: ornamental -> edible swaps on the lot (street-edge plants left out)
SWAPS = [('sp-willow', 'pawpaw', 'pawpaw', 2, 'Golden weeping willow × 2 → pawpaw'), ('sp-birch', 'persimmon', 'persimmon', 2, "River birch × 2 → persimmon ('Meader')"),
         ('sp-sweetgum', 'chestnut', 'chestnut', 2, 'Columnar sweetgum × 2 → Chinese chestnut'), ('sp-arbor', 'hazelH', 'hazelH', 4, 'Arborvitae × 4 → hybrid hazelnut (loses the winter screen)')]
swaps = []
for pid, key, sp, n, label in SWAPS:
    if any(p['id'] == pid for p in pk):
        swaps.append(dict(id=pid, label=label, crop=crop(key, n), sp=sp))

for k, v in SPECIES.items():
    D['sp'][k] = v
D['pk'] = pk
D['swaps'] = swaps
D['family'] = 2200 * 4 * 365
D['base'] = dict(kcal=round(base_kcal), lb=round(base_lb))
D['storage'] = [
    ['Potatoes', '38–40°F, humid and dark (unheated basement corner)', '4–6 months'], ['Winter squash', '50–55°F and dry (basement shelf)', '3–6 months'],
    ['Onions, garlic', 'Cool and dry, braided or in mesh bags', '6–9 months'], ['Dry beans', 'Jars at room temperature', 'Years'],
    ["Apples ('GoldRush', 'Enterprise')", 'Fridge or a cold room', 'Into spring'], ['Chestnuts', 'Fridge: they’re perishable, like fresh produce', '1–2 months; freeze for longer'],
    ['Hazelnuts', 'Dried in the shell, room temperature', '1 year'], ['Berries, persimmon and pawpaw pulp', 'Chest freezer', '1 year']]
D['items'] = D.get('items', 217) + 2
D['read'] = '2026-10-22'

page = page[:m.start(1)] + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + page[m.end(1):]
open(PAGE, 'w').write(page)
tot = lambda f: sum(p['crop']['qty'] * p['crop']['lb'] * p['crop']['kcal'] for p in pk if p.get('crop') and f(p) and not p.get('nonEss') and not p.get('tbd'))
print('baseline kcal %.0fk (%.1f%%)' % (base_kcal / 1000, base_kcal / D['family'] * 100))
print('plan + nut change %.0fk (%.1f%%)' % (tot(lambda p: p.get('food') != 'addon') / 1000, tot(lambda p: p.get('food') != 'addon') / D['family'] * 100))
print('with add-ons %.0fk (%.1f%%)' % (tot(lambda p: True) / 1000, tot(lambda p: True) / D['family'] * 100))
print('add-on cost $%d' % sum(p['cost'] for p in pk if p.get('food') == 'addon' and not p.get('nonEss') and not p.get('tbd')))
sw = sum(s['crop']['qty'] * s['crop']['lb'] * s['crop']['kcal'] for s in swaps)
print('swaps add %.0fk (%.1f%%)' % (sw / 1000, sw / D['family'] * 100))
