# Yard Builder tests

Playwright (Python) checks for `planner.html`. Run from a folder that has `node_modules/three@0.128.0` installed (the 3D test serves three.js locally instead of from the CDN):

```
npm i three@0.128.0
python3 tests/test_2d.py "$PWD"        # 2D builder, desktop + phone (62 checks)
python3 tests/test_3d.py "$PWD"        # 3D view, desktop + phone (43 checks)
python3 tests/test_surfaces.py "$PWD"  # patios drawn by points, rotate-before-placing
python3 tests/fuzz.py "$PWD" 4 120     # random clicks/keys; reports errors, bad entities, duplicate IDs
python3 tests/test_food.py "$PWD" [plan.json]  # food expansion: new species, calorie bed, strawberry bed, coop, pollination, swaps, 3D at every age
python3 tests/test_deck.py "$PWD"     # DK-01 Deck Studio (deck.html): pricing for every size x decking x stairs, posts vs openings, sun position, 3D, phone width
```

The scripts open `file:///home/claude/pine-lake-vr/planner.html`; change `URL` at the top if the repo lives elsewhere.
