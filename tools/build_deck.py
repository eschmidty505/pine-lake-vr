"""Assemble deck.html (DK-01 Deck Studio) from tools/deck/ plus the live house model.

The terrain grading comes from index.html and the house geometry (housePort) from planner.html,
so the deck sits on the same model as the walkthrough and the Yard Builder. Re-run after either changes:
    python3 tools/build_deck.py
"""
import pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent
idx = (R / 'index.html').read_text().split('\n')
pl = (R / 'planner.html').read_text().split('\n')

def find(lines, pat, start=0):
    for i in range(start, len(lines)):
        if re.search(pat, lines[i]): return i
    raise SystemExit('pattern not found: ' + pat)

a = find(idx, r'^const E0 = 880;'); b = find(idx, r'^const EL = \{')
c = find(idx, r'^const clamp = '); d = find(idx, r'^const sstep = ')
e = find(idx, r'^const NWT = '); f = find(idx, r'^const inHouseCut = ')
terrain = idx[a:b + 1] + idx[c:d + 1] + idx[e:f + 1]

h0 = find(pl, r'^function housePort\(\) \{'); h1 = find(pl, r'G\.position\.y = E0 - Z0; return G;', h0)
house = pl[h0:h1 + 2]
d0 = next(i for i, l in enumerate(house) if '/* rear deck:' in l)
d1 = next(i for i, l in enumerate(house) if 'rail(D.u0, D.u1, D.v1, D.v1)' in l)
house = house[:d0] + ['  /* rear deck removed: DK-01 draws its own parametric deck */'] + house[d1 + 1:]

src = (R / 'tools/deck/deck_src.html').read_text()
main = (R / 'tools/deck/deck_main.js').read_text().replace('/*@@FURN@@*/', (R / 'tools/deck/deck_furn.js').read_text())
out = src.replace('/*@@TERRAIN@@*/', '\n'.join(terrain)).replace('/*@@HOUSE@@*/', '\n'.join(house)).replace('/*@@MAIN@@*/', main)
SKEL = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}'
        'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>')
out = SKEL + out + '</body></html>'   # same skeleton the Artifact publisher uses, so GitHub Pages and the artifact match
(R / 'deck.html').write_text(out)
print('deck.html', len(out), 'bytes')
