/* ================= DK-01 Deck Studio ================= */
/* lot grid in feet: x east, y north, elevations as on the plot plan. Local deck coords: u east from the nook wall, v north from the rear wall. */
const $ = id => document.getElementById(id);
const X0 = 122.54, Y0 = 134.73;          // nook east wall line, house rear wall line (plot plan footprint)
const CORNER = 22.0, NOOK_V = 8.0;       // house corner is 22.0' east of the nook wall; nook sticks out 8.0'
const FF = 889.35, TOP = 889.18;         // first floor (plot plan), deck surface 2" below the slider sill (assumed)
const PATIO = 879.5;                     // walkout grade (plot plan)
const DECK_T = 1 / 12, JOIST_D = 9.25 / 12, BEAM_D = 11.25 / 12;
const BEAM_BOT = TOP - DECK_T - JOIST_D - BEAM_D;
const JOIST_BOT = TOP - DECK_T - JOIST_D;
const NOOK_SLIDER = { v0: 1, v1: 7 };    // 6' slider on the nook's east wall (3D model)
const GR_WIN = { x0: 129.24, x1: 140.44, e0: 891.85, e1: 896.85 };   // great room rear window (3D model)
const BSMT = [{ name: 'walkout slider', x0: 129.7, x1: 135.7, e0: 879.67, e1: 886.47 }, { name: 'basement window', x0: 138.7, x1: 141.7, e0: 882.17, e1: 886.17 }];
const WELL = { x: 104.6, y: 157.2 };
const LAT = 42.92, LON = -83.05, GRID_ROT = 5.1;   // grid north is N05°06'W
const D2R = Math.PI / 180;
const TAX = 1.06, MK = [1.15, 1.25];

const ftin = ft => { let f = Math.floor(ft + 1e-6), i = Math.round((ft - f) * 12); if (i === 12) { f++; i = 0; } return f + '′-' + i + '″'; };
const inch = ft => Math.round(ft * 12 * 10) / 10 + '″';
const money = v => '$' + (Math.round(v / 10) * 10).toLocaleString('en-US');
const k = v => v >= 9950 ? '$' + (v / 1000).toFixed(1) + 'k' : money(v);
const rng2 = r => k(r[0]) + '–' + k(r[1]);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul2 = (a, m) => [a[0] * m, a[1] * m];

/* ---------------- choices ---------------- */
const PRESETS = [
  { id: 'D1', name: 'Notch', sub: 'Flush with the nook. Grill and a bistro set.', W: 22, D: 8, shape: 'rect' },
  { id: 'D2', name: 'Dining deck', sub: '4′ past the nook. Room for a table with an umbrella.', W: 22, D: 12, shape: 'rect' },
  { id: 'D3', name: 'Full cover', sub: 'Covers the whole patio below. Table, loungers and grill.', W: 22, D: 16, shape: 'rect' },
  { id: 'D4', name: 'Corner lounge', sub: 'Runs 6′ past the house corner into the sun, clipped corner.', W: 28, D: 12, shape: 'clip' },
  { id: 'D5', name: 'Table bay', sub: '12′ deep plus a 10′ × 4′ bay off the north edge.', W: 22, D: 12, shape: 'bump' },
];
const MATS = {
  pt: { name: 'Pressure-treated pine', short: 'PT wood', mat: [2.75, 4.0], lab: [3, 5], fascia: [1.5, 2.5], life: '15–20 yr', care: 'Stain or seal every 2–3 years (about $150–300 of product each time). Checks and splinters as it ages.', heat: 'Coolest underfoot.', tones: { warm: '#a6875a', grey: '#8f8b83', charcoal: '#4b4a47' } },
  cedar: { name: 'Cedar', short: 'Cedar', mat: [6, 9], lab: [3.5, 5.5], fascia: [3, 5], life: '15–25 yr', care: 'Oil or stain every 1–2 years. Softer than pine, so chair legs dent it.', heat: 'Cool underfoot.', tones: { warm: '#b07a4f', grey: '#8d8478', charcoal: '#4b4846' } },
  compE: { name: 'Composite, Trex Enhance class', short: 'Trex entry', mat: [6, 8], lab: [4, 7], fascia: [3, 5], life: '25–35 yr', care: 'Wash twice a year. No staining. 25-year fade and stain warranty is typical.', heat: 'Gets hot in full sun, worst in charcoal.', tones: { warm: '#8a6a4f', grey: '#8c8a84', charcoal: '#4a4b4c' } },
  compP: { name: 'Composite, Trex Transcend class', short: 'Trex premium', mat: [9, 13], lab: [4, 7], fascia: [4, 6.5], life: '25–50 yr', care: 'Wash. Deeper grain and better scratch and fade resistance than the entry line.', heat: 'Gets hot in full sun.', tones: { warm: '#7d5d44', grey: '#878580', charcoal: '#454647' } },
};
const RAILS = {
  cable: { name: 'Cable', long: 'Black aluminum posts, stainless cable', mat: [50, 100], lab: [45, 80], sp: 4, col: '#1d2023' },
  alum: { name: 'Aluminum pickets', long: 'Black aluminum pickets', mat: [45, 75], lab: [30, 55], sp: 6, col: '#1d2023' },
  wood: { name: 'Wood', long: 'Wood posts and 2×2 balusters', mat: [12, 20], lab: [25, 40], sp: 6, col: null },
};
const TABLES = { none: { name: 'No table', R: 0 }, bistro: { name: 'Bistro for 2', R: 3.5, top: 1.25 }, r48: { name: '48″ round, 4', R: 5, top: 2 }, r60: { name: '60″ round, 6', R: 6, top: 2.5 } };
const DATES = [{ id: 'may15', name: 'May 15', m: 5, d: 15 }, { id: 'jun21', name: 'Jun 21', m: 6, d: 21 }, { id: 'aug1', name: 'Aug 1', m: 8, d: 1 }, { id: 'sep21', name: 'Sep 21', m: 9, d: 21 }];
const LABOR = { diy: 'All DIY', split: 'Hire the frame', hired: 'Fully hired' };
const LABOR_NOTE = {
  diy: 'You and your crew do everything, including the posts and beams 10′ up. Totals are materials, tax, rentals, permit and an allowance for a drawing.',
  split: 'A deck crew sets footings, posts, beams, joists and bracing (and stair stringers). You lay the decking, railing and trim. Recommended at this height.',
  hired: 'One contractor does it all. Totals add 15–25% markup on materials plus labor.',
};

/* Yard Builder plan "LEGIT MANAUL SAVE" (version updated 2026-10-22): the entities near the deck */
const PLAN = [
  { id: 'Z5', t: 'bed', mat: 'permpav', pts: [[85.9, 134.36], [83.88, 132.52], [83, 141], [101, 152], [102.87, 134.73]] },
  { id: 'Z8', t: 'bed', mat: 'permpav', pts: [[122.54, 142.73], [122.54, 150.73], [101, 152], [104.17, 139.64]] },
  { id: 'Z9', t: 'bed', mat: 'pavers', pts: [[81.88, 138.53], [83, 141], [86.1, 143.85], [91.18, 147.66], [97.68, 151.35], [101, 152], [108.4, 152.81], [114.87, 152.31], [122.54, 150.73], [116, 159], [107, 158], [96.86, 156.81], [90.29, 154.8], [79.81, 154.76], [76, 156], [68.64, 154.81], [61.4, 140.4], [58.77, 134.43], [64.19, 133.65], [75.93, 134.22]] },
  { id: 'Z15', t: 'bed', mat: 'permpav', label: 'paver patio (your plan)', pts: [[144.54, 150.73], [143, 157], [146.54, 160.54], [154, 159], [158, 162], [154, 166], [146, 169], [137, 169], [117, 167], [111, 162], [108.4, 152.81], [122.54, 150.73]] },
  { id: 'Z16', t: 'bed', mat: 'needle', pts: [[144.54, 150.73], [146.9, 150.35], [145.08, 153.37], [143, 157], [146.54, 160.54], [151.68, 159.36], [156.1, 159.75], [164, 157], [171, 156], [176, 154], [179, 149], [172, 144], [168.46, 147.54], [163, 150], [156, 151], [147.9, 150.35]] },
  { id: 'Z10', t: 'bed', mat: 'river', pts: [[156, 111], [171, 111], [171, 133], [144.54, 134.73], [144.54, 113.24]] },
  { id: 'W1', t: 'path', mat: 'flagstone', w: 4, label: 'flagstone path', pts: [[144.54, 147.43], [164, 146], [174, 138], [175, 125]] },
  { id: 'W2', t: 'path', mat: 'splitrail', w: 0.7, label: 'split-rail fence', pts: [[171, 133], [170, 139], [165, 143], [159, 144], [152, 145], [144.54, 144.71], [144.54, 140.46]] },
  { id: 'S11', t: 'st', k: 'arbor', label: 'arbor', x: 146.9, y: 147.35, w: 6, h: 2, rot: 270 },
  { id: 'S8', t: 'st', k: 'pergola', label: 'pergola', x: 148.25, y: 129, w: 12, h: 12, rot: 270 },
  { id: 'S7', t: 'st', k: 'potting', label: 'potting bench', x: 147, y: 129, w: 6, h: 2.5, rot: 270 },
  { id: 'S3', t: 'st', k: 'raised', x: 160, y: 131, w: 4, h: 8, rot: 270 },
  { id: 'S2', t: 'st', k: 'raised', x: 169, y: 128, w: 4, h: 10, rot: 0 },
  { id: 'P98', t: 'plant', sp: 'hazel', x: 161, y: 154, r: 5 }, { id: 'P99', t: 'plant', sp: 'hazel', x: 150, y: 155, r: 5 }, { id: 'P100', t: 'plant', sp: 'hazel', x: 172, y: 150, r: 5 },
];
const PLAN_COL = { permpav: '#9a958c', pavers: '#a39484', needle: '#9a6b3c', river: '#8c8f93', flagstone: '#8d8a80', splitrail: '#7b5a3a' };
/* footprint of a Yard Builder structure: w along x and h along y before rotation; 90/270 swap them */
function stRect(e) { const sw = (e.rot % 180) ? e.h : e.w, sh = (e.rot % 180) ? e.w : e.h; return { x0: e.x - sw / 2, x1: e.x + sw / 2, y0: e.y - sh / 2, y1: e.y + sh / 2 }; }

/* ---------------- state ---------------- */
const DEF = { preset: 'D2', W: 22, D: 12, shape: 'rect', mat: 'compE', tone: 'grey', rail: 'cable', guard: 36, stairs: 'none', drain: false, posts: 'plain', brickAll: false, tableOn: true, table: 'r48', loungeOn: true, loungers: 2, grill: true, showFurn: true, labor: 'split', date: 'aug1', hour: 15, heat: true, frame: false, yard: false, view: '3d', pinned: true };
let S = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem('dk01') || 'null'); if (s) S = Object.assign(S, s); } catch (e) { }
if (S.brick) S.posts = 'brick'; delete S.brick; if (!MATS[S.mat]) S.mat = 'compE'; if (!S.posts) S.posts = 'plain';
if (S.table === 'none') { S.table = 'r60'; S.tableOn = false; } if (!S.loungers) { S.loungers = 2; S.loungeOn = false; }
const eff = s => Object.assign({}, s, { table: s.tableOn ? s.table : 'none', loungers: s.loungeOn ? s.loungers : 0 });
const persist = () => { try { localStorage.setItem('dk01', JSON.stringify(S)); } catch (e) { } };

/* ---------------- polygon helpers ---------------- */
const polyArea = p => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
function inPoly(pt, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
function scan(p, v) { const xs = []; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; if ((y1 <= v && y2 > v) || (y2 <= v && y1 > v)) xs.push(x1 + (v - y1) * (x2 - x1) / (y2 - y1)); } xs.sort((a, b) => a - b); const out = []; for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]); return out; }
const rectIn = (r, p) => [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]].every(q => inPoly([q[0] + (q[0] === r.u0 ? 0.02 : -0.02), q[1] + (q[1] === r.v0 ? 0.02 : -0.02)], p));
const rectHit = (a, b) => a.u0 < b.u1 - 0.01 && b.u0 < a.u1 - 0.01 && a.v0 < b.v1 - 0.01 && b.v0 < a.v1 - 0.01;
const circIn = (c, p) => { for (let i = 0; i < 24; i++) { const t = i / 24 * 2 * Math.PI; if (!inPoly([c.u + c.R * Math.cos(t) * 0.995, c.v + c.R * Math.sin(t) * 0.995], p)) return false; } return true; };
const circRect = (c, r) => { const cx = Math.max(r.u0, Math.min(c.u, r.u1)), cy = Math.max(r.v0, Math.min(c.v, r.v1)); return Math.hypot(c.u - cx, c.v - cy) < c.R - 0.01; };
function segHitsRect(a, b, r) {     // segment vs axis-aligned rect, sampled
  for (let i = 0; i <= 40; i++) { const t = i / 40, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true; } return false;
}
/* finished grade for the deck area: the shared model's soft pad blending leaves a few inches of hump where the house
   and patio pads meet, so the walkout patio is held dead level at 879.5 and eased into the yard over 4′ */
const PAT = { x0: 122.54, x1: 144.54, y0: 134.73, y1: 150.73 };
const pyH = (x, y) => {
  const dx = Math.max(PAT.x0 - x, 0, x - PAT.x1), dy = Math.max(PAT.y0 - y, 0, y - PAT.y1), d = Math.hypot(dx, dy);
  if (d === 0) return PATIO;
  const g = groundH(x, y); if (d >= 4) return g;
  const t = d / 4, k = t * t * (3 - 2 * t); return PATIO + (g - PATIO) * k;
};

/* ---------------- geometry ---------------- */
function geom(s) {
  const W = s.W, D = s.D;
  let poly, c = 0, bump = null;
  if (s.shape === 'clip') { c = Math.min(4, D / 2, W / 3); poly = [[0, 0], [W, 0], [W, D - c], [W - c, D], [0, D]]; }
  else if (s.shape === 'bump') { bump = { u0: 2, u1: 12, d: 4 }; poly = [[0, 0], [W, 0], [W, D], [bump.u1, D], [bump.u1, D + bump.d], [bump.u0, D + bump.d], [bump.u0, D], [0, D]]; }
  else poly = [[0, 0], [W, 0], [W, D], [0, D]];
  const area = polyArea(poly), Dmax = D + (bump ? bump.d : 0);

  /* edges: which ones are against the house (no railing) */
  const segs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (Math.abs(a[1]) < 1e-6 && Math.abs(b[1]) < 1e-6) {           // along the rear wall line
      const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
      if (lo < CORNER) segs.push({ a: [lo, 0], b: [Math.min(hi, CORNER), 0], open: false, side: 'house' });
      if (hi > CORNER) segs.push({ a: [Math.max(lo, CORNER), 0], b: [hi, 0], open: true, side: 'south' });
    } else if (Math.abs(a[0]) < 1e-6 && Math.abs(b[0]) < 1e-6) {    // along the nook's east wall line
      const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
      if (lo < NOOK_V) segs.push({ a: [0, lo], b: [0, Math.min(hi, NOOK_V)], open: false, side: 'nook' });
      if (hi > NOOK_V) segs.push({ a: [0, Math.max(lo, NOOK_V)], b: [0, hi], open: true, side: 'west' });
    } else {
      const side = Math.abs(a[0] - b[0]) < 1e-6 ? (a[0] > W / 2 ? 'east' : 'west') : Math.abs(a[1] - b[1]) < 1e-6 ? 'north' : 'corner';
      segs.push({ a, b, open: true, side });
    }
  }
  segs.forEach(sg => sg.len = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]));

  /* beams and posts: freestanding, a beam near the house and one near the outer edge */
  const c1 = D >= 10 ? 1.5 : 1.0, vb1 = D - c1, vb0 = Math.max(1.0, Math.min(2.0, vb1 / 5)), js = vb1 - vb0;
  const maxSpan = Math.max(7.5, Math.min(11, 14.5 - 0.5 * js));
  const uEndOuter = s.shape === 'clip' ? W - Math.max(0, c - c1) : W;
  const even = (a, b) => { const n = Math.ceil((b - a) / maxSpan - 1e-6) + 1, out = []; for (let i = 0; i < n; i++) out.push(a + (b - a) * i / (n - 1)); return out; };
  const avoid = BSMT.map(o => ({ u0: o.x0 - X0 - 0.45, u1: o.x1 - X0 + 0.45, name: o.name }));
  let inner = null;
  for (let extra = 0; extra < 4; extra++) {
    const n = Math.ceil((W - 2) / maxSpan - 1e-6) + 1 + extra, ps = [];
    for (let i = 0; i < n; i++) ps.push(1 + (W - 2) * i / (n - 1));
    const moved = ps.map(p => { for (const o of avoid) if (p > o.u0 && p < o.u1) return (p - o.u0 < o.u1 - p) ? o.u0 : o.u1; return p; }).sort((a, b) => a - b);
    const gap = Math.max(...moved.slice(1).map((p, i) => p - moved[i]));
    inner = { ps: moved, gap }; if (gap <= maxSpan + 1e-6) break;
  }
  const outer = even(1, uEndOuter - 1);
  const posts = [];
  inner.ps.forEach(u => posts.push({ u, v: vb0, beam: 'inner' }));
  outer.forEach(u => posts.push({ u, v: vb1, beam: 'outer' }));
  const beams = [{ v: vb0, u0: 0.25, u1: W - 0.25, name: 'house-side beam' }, { v: vb1, u0: 0.25, u1: uEndOuter - 0.25, name: 'outer beam' }];
  if (bump) { const vb = D + bump.d - 1; beams.push({ v: vb, u0: bump.u0 + 0.25, u1: bump.u1 - 0.25, name: 'bay beam' }); [bump.u0 + 1, bump.u1 - 1].forEach(u => posts.push({ u, v: vb, beam: 'bump' })); }
  const postTop = BEAM_BOT;
  posts.forEach(p => { p.grade = pyH(X0 + p.u, Y0 + p.v); p.h = postTop - (p.grade + 0.17); });
  const outerGap = Math.max(...outer.slice(1).map((p, i) => p - outer[i]));

  /* joists 16" o.c. perpendicular to the house, boards parallel to the house */
  const jCount = Math.ceil(W * 12 / 16) + 1, jBump = bump ? Math.ceil((bump.u1 - bump.u0) * 12 / 16) + 1 : 0;
  const joistLf = jCount * D + jBump * (bump ? bump.d + c1 : 0) + 2 * (W + D) + (bump ? 2 * bump.d + (bump.u1 - bump.u0) : 0);
  const beamLf = beams.reduce((t, b) => t + (b.u1 - b.u0), 0);
  const railSegs = segs.filter(sg => sg.open).map(sg => Object.assign({}, sg));

  /* stairs */
  let stair = null;
  if (s.stairs !== 'none') {
    const wS = 4;
    let a, b, dir;
    if (s.stairs === 'east') { const ve = s.shape === 'clip' ? D - c : D; const v1 = Math.max(4.5, ve - 0.5); dir = [1, 0]; a = [W, v1 - wS]; b = [W, v1]; }
    else { const ue = (s.shape === 'clip' ? W - c : W) - 0.5; dir = [0, 1]; a = [ue - wS, D]; b = [ue, D]; }
    let run = 14, R = 10, n = 16, rise = 7.5, treads = 15, foot = null;
    for (let it = 0; it < 3; it++) {
      const mid = [(a[0] + b[0]) / 2 + dir[0] * run, (a[1] + b[1]) / 2 + dir[1] * run];
      foot = { x: X0 + mid[0], y: Y0 + mid[1] }; const g = pyH(foot.x, foot.y);
      R = TOP - g; n = Math.ceil(R * 12 / 7.5 - 1e-6); rise = R * 12 / n; treads = n - 1; run = treads * 10.5 / 12;
      foot.g = g;
    }
    const rect = dir[0] ? { u0: W, u1: W + run, v0: a[1], v1: b[1] } : { u0: a[0], u1: b[0], v0: D, v1: D + run };
    const slope = Math.hypot(run, R);
    stair = { side: s.stairs, a, b, dir, run, R, n, rise, treads, rect, slope, foot, width: wS, stringers: (s.mat === 'pt' || s.mat === 'cedar') ? 4 : 5 };
    // cut the stair opening out of its railing segment
    for (let i = 0; i < railSegs.length; i++) {
      const sg = railSegs[i];
      if (s.stairs === 'east' && sg.side === 'east') { const lo = Math.min(sg.a[1], sg.b[1]), hi = Math.max(sg.a[1], sg.b[1]); const parts = []; if (a[1] - lo > 0.05) parts.push({ a: [W, lo], b: [W, a[1]] }); if (hi - b[1] > 0.05) parts.push({ a: [W, b[1]], b: [W, hi] }); railSegs.splice(i, 1, ...parts.map(p => Object.assign({ open: true, side: 'east' }, p))); break; }
      if (s.stairs === 'north' && sg.side === 'north' && Math.abs(sg.a[1] - D) < 1e-6 && Math.max(sg.a[0], sg.b[0]) >= b[0] - 1e-6) { const lo = Math.min(sg.a[0], sg.b[0]), hi = Math.max(sg.a[0], sg.b[0]); const parts = []; if (a[0] - lo > 0.05) parts.push({ a: [lo, D], b: [a[0], D] }); if (hi - b[0] > 0.05) parts.push({ a: [b[0], D], b: [hi, D] }); railSegs.splice(i, 1, ...parts.map(p => Object.assign({ open: true, side: 'north' }, p))); break; }
    }
    railSegs.forEach(sg => sg.len = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]));
  }
  const railLf = railSegs.reduce((t, sg) => t + sg.len, 0);
  const openLf = segs.filter(sg => sg.open).reduce((t, sg) => t + sg.len, 0);
  return { W, D, Dmax, c, bump, poly, area, segs, railSegs, railLf, openLf, vb0, vb1, c1, js, maxSpan, innerGap: inner.gap, outerGap, posts, beams, beamLf, jCount, joistLf, stair, uEndOuter };
}

/* ---------------- furniture layout ----------------
   Tries a few sensible spots for each piece (grill on the east rail or against the house, loungers along the north
   edge or the east end, upright or end to end) and keeps the first arrangement where everything fits. */
function furniture(s, G) {
  const P = G.poly, W = G.W, D = G.D, st = G.stair;
  const landing = { u0: 0, u1: 3.5, v0: NOOK_SLIDER.v0 - 0.2, v1: NOOK_SLIDER.v1 + 0.2, name: 'slider landing' };
  const keep = [landing];
  if (st) keep.push(st.side === 'east' ? { u0: W - 4, u1: W, v0: st.a[1], v1: st.b[1], name: 'stair top' } : { u0: st.a[0], u1: st.b[0], v0: D - 4, v1: D, name: 'stair top' });
  const eastAt = v => G.c ? W - Math.max(0, v - (D - G.c)) : W;           // east edge at height v (clipped corner)
  const T = TABLES[s.table];
  const tables = !T.R ? [null] : (G.bump && T.R <= 6.2 ? [{ u: (G.bump.u0 + G.bump.u1) / 2, v: D + G.bump.d - T.R - 0.3 }] : []).concat([
    { u: 3.5 + T.R + 0.2, v: Math.max(T.R + 0.2, D - T.R - 0.3) }, { u: 3.5 + T.R + 0.2, v: Math.max(T.R + 0.2, (D) / 2) }]).map(p => ({ kind: 'table', name: T.name + ' with umbrella', u: p.u, v: p.v, R: T.R, top: T.top }));
  const ue = Math.min(W, CORNER);
  const grills = !s.grill ? [null] : [
    { kind: 'grill', name: 'Grill', where: 'east rail', u0: W - 2.6, u1: W - 0.4, v0: 0.4, v1: 5.4, clear: { u0: W - 4.6, u1: W - 2.6, v0: 0.4, v1: 5.4 } },
    { kind: 'grill', name: 'Grill', where: 'house wall', u0: ue - 5.6, u1: ue - 0.6, v0: 0.4, v1: 2.6, clear: { u0: ue - 5.6, u1: ue - 0.6, v0: 2.6, v1: 4.6 } }];
  const L = 6.7, w = 2.3, n = s.loungers;
  const lounges = [];
  if (!n) lounges.push([]);
  else {
    const mk = (u0, u1, v0, v1, i) => ({ kind: 'lounger', name: 'Lounge chair ' + (i + 1), u0, u1, v0, v1 });
    let v1 = D - 0.3, v0 = v1 - L, e = eastAt(v1) - 0.4; if (st && st.side === 'east' && st.b[1] > v0) e = Math.min(e, W - 4.3); if (st && st.side === 'north') e = Math.min(e, st.a[0] - 0.3);
    lounges.push([...Array(n)].map((_, i) => mk(e - i * (w + 1.2) - w, e - i * (w + 1.2), v0, v1, i)));                  // upright, NE corner
    lounges.push([...Array(n)].map((_, i) => { const b = D - 0.3 - i * (w + 0.9), ee = Math.min(eastAt(b), st && st.side === 'north' ? st.a[0] - 0.3 : 99) - 0.4; return mk(ee - L, ee, b - w, b, i); }));   // end to end along the north edge
    lounges.push([...Array(n)].map((_, i) => mk(W - 0.4 - i * (w + 1.2) - w, W - 0.4 - i * (w + 1.2), 0.4, 0.4 + L, i)));   // upright, SE corner (grill moves to the wall)
  }
  const evalSet = items => {
    let bad = 0;
    for (const it of items) {
      let ok = true, why = '';
      if (it.kind === 'table') {
        if (!circIn(it, P)) { ok = false; why = 'the chair circle runs off the deck'; }
        for (const o of [...keep, ...items.filter(x => x !== it && x.kind !== 'table')]) { if (circRect(it, o)) { ok = false; why = 'crowds the ' + o.name.toLowerCase(); } if (o.kind === 'grill' && circRect(it, o.clear)) { ok = false; why = 'sits in the grill’s working space'; } }
      } else {
        if (!rectIn(it, P)) { ok = false; why = 'runs off the deck'; }
        for (const o of [...keep, ...items.filter(x => x !== it && x.kind !== 'table')]) if (rectHit(it, o)) { ok = false; why = 'overlaps the ' + o.name.toLowerCase(); }
        if (it.kind === 'grill') for (const o of [...keep, ...items.filter(x => x.kind === 'lounger')]) if (rectHit(it.clear, o)) { ok = false; why = 'no 2′ working space in front'; }
        for (const g of items.filter(x => x.kind === 'grill' && x !== it)) if (rectHit(it, g.clear)) { ok = false; why = 'blocks the grill'; }
      }
      it.ok = ok; it.why = why; if (!ok) bad++;
    }
    return bad;
  };
  let best = null;
  for (const t of tables) for (const g of grills) for (const lg of lounges) {
    const items = [g, t, ...lg].filter(Boolean).map(x => Object.assign({}, x));
    const bad = evalSet(items);
    if (!best || bad < best.bad) best = { bad, items };
    if (!bad) break;
  }
  const out = best.items, table = out.find(i => i.kind === 'table') || null, grill = out.find(i => i.kind === 'grill') || null, lounge = out.filter(i => i.kind === 'lounger');
  const walk = table ? (G.bump && table.v > D ? D : Math.max(0, table.v - table.R)) : null;
  if (table) table.walk = walk;
  return { items: out, keep, table, grill, lounge, walk };
}

/* ---------------- sun ---------------- */
function doy(m, d) { return [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m - 1] + d; }
function sunPos(m, d, hr) {
  const N = doy(m, d), dst = (m > 3 && m < 11) || (m === 3 && d >= 9) || (m === 11 && d < 2), tz = dst ? -4 : -5;
  const g = 2 * Math.PI / 365 * (N - 1 + (hr - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hr * 60 + eqt + 4 * LON - 60 * tz, ha = (tst / 4 - 180) * D2R, lat = LAT * D2R;
  const cz = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha), zen = Math.acos(Math.max(-1, Math.min(1, cz)));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;   // clockwise from true north
  const alt = Math.PI / 2 - zen, azg = az + GRID_ROT * D2R;
  return { alt, az, dir: [Math.sin(azg) * Math.cos(alt), Math.cos(azg) * Math.cos(alt), Math.sin(alt)] };
}
/* shadow casters: the 2-story block with its hip roof, and the nook (lot grid, elevations) */
const SHADE = (() => {
  const b = [[94.7, 144.54, 97.9, 134.73, 870, 907.95], [102.87, 122.54, 134.73, 142.73, 870, 898.8], [101.7, 123.7, 134.85, 143.9, 898.3, 899.9], [101.7, 123.7, 134.85, 139, 899.9, 901.8]];
  const x0 = 93.4, x1 = 145.84, n0 = 96.6, n1 = 136.03, eave = 907.95, st = 19.715 / 6;
  for (let i = 0; i < 6; i++) { const ins = i * st; b.push([x0 + ins, x1 - ins, n0 + ins, n1 - ins, eave - 0.5, eave + 0.5 * (ins + st)]); }
  return b;
})();
function blocked(p, d) {
  for (const B of SHADE) {
    let t0 = 0.05, t1 = 1e9, ok = true;
    for (let a = 0; a < 3; a++) {
      const lo = B[a * 2], hi = B[a * 2 + 1];
      if (Math.abs(d[a]) < 1e-9) { if (p[a] < lo || p[a] > hi) { ok = false; break; } }
      else { let ta = (lo - p[a]) / d[a], tb = (hi - p[a]) / d[a]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } }
    }
    if (ok) return true;
  }
  return false;
}
const SUNCACHE = new Map();
function sunMap(G, dt) {
  const key = G.poly.map(q => q.join(',')).join(';') + '|' + dt.id;
  if (SUNCACHE.has(key)) return SUNCACHE.get(key);
  const cells = [];
  for (let u = 0; u < G.W; u++) for (let v = 0; v < G.Dmax; v++) { const c = [u + 0.5, v + 0.5]; if (inPoly(c, G.poly)) cells.push({ u, v, h: 0 }); }
  const steps = [];
  for (let hr = 5; hr <= 21.5; hr += 0.25) { const s = sunPos(dt.m, dt.d, hr); if (s.alt > 0.03) steps.push(s.dir); }
  for (const c of cells) { const p = [X0 + c.u + 0.5, Y0 + c.v + 0.5, TOP + 0.3]; for (const d of steps) if (!blocked(p, d)) c.h += 0.25; }
  const hs = cells.map(c => c.h), avg = hs.reduce((a, b) => a + b, 0) / Math.max(1, hs.length);
  const day = steps.length * 0.25;
  const r = { cells, avg, max: Math.max(0, ...hs), min: Math.min(...hs), pct6: hs.filter(h => h >= 6).length / Math.max(1, hs.length), day };
  if (SUNCACHE.size > 60) SUNCACHE.clear();
  SUNCACHE.set(key, r); return r;
}
const zoneSun = (map, r) => { const c = map.cells.filter(c => c.u + 0.5 > r.u0 && c.u + 0.5 < r.u1 && c.v + 0.5 > r.v0 && c.v + 0.5 < r.v1); return c.length ? c.reduce((a, b) => a + b.h, 0) / c.length : 0; };

/* ---------------- cost ---------------- */
function estimate(s, G) {
  const M = MATS[s.mat], R = RAILS[s.rail], gF = s.guard === 42 ? 1.12 : 1, L = [];
  const line = (grp, name, qty, mat, lab, note) => L.push({ grp, name, qty, mat, lab, note });
  const nP = G.posts.length;
  line('frame', 'Footings, 12″ tube to 42″ frost depth', nP + ' ea', mul2([110, 170], nP), mul2([220, 380], nP), 'concrete, tube, gravel, rebar, post base');
  const long = G.posts.some(p => p.h > 8.5);
  line('frame', '6×6 PT posts (' + (long ? '12′' : '10′') + ' stock)', nP + ' ea', mul2(long ? [70, 110] : [55, 85], nP), [0, 0], 'avg ' + ftin(G.posts.reduce((a, p) => a + p.h, 0) / nP) + ' tall');
  line('frame', 'Beams, 3-ply 2×12 PT', Math.round(G.beamLf) + ' lf', mul2([3.2 * 3, 4.6 * 3], G.beamLf), [0, 0]);
  line('frame', 'Joists + rim, 2×10 PT @ 16″', Math.round(G.joistLf) + ' lf', mul2([2.2, 3.1], G.joistLf), [0, 0], G.jCount + ' joists');
  line('frame', 'Knee braces, both directions', 2 * nP + ' ea', mul2([25, 40], 2 * nP), [0, 0], 'a freestanding deck needs them');
  const hwSf = s.mat === 'pt' || s.mat === 'cedar' ? [2.0, 3.2] : [2.25, 3.6];
  line('frame', 'Connectors, bolts, hangers' + (s.mat === 'pt' || s.mat === 'cedar' ? '' : ', joist tape'), Math.round(G.area) + ' sf', add2(mul2(hwSf, G.area), mul2([45, 70], nP)), [0, 0]);
  line('frame', 'Frame labor at ~10′ (crew + scaffold)', Math.round(G.area) + ' sf', [0, 0], mul2([9, 15], G.area));
  const wrapped = G.posts.filter(p => s.brickAll || p.beam !== 'inner').length;
  if (s.posts === 'brick') { line('finish', 'Brick columns, 16″ thin-brick wrap' + (s.brickAll ? ' (all posts)' : ' (outer posts)'), wrapped + ' ea', mul2([690, 1180], wrapped), mul2([900, 1500], wrapped), 'cement-board box, thin brick, precast cap and base; wider footing'); line('frame', 'Hidden bracing for wrapped posts', wrapped + ' ea', mul2([40, 80], wrapped), mul2([60, 120], wrapped), 'knee braces would show, so bracing moves inside or to engineered bases'); }
  if (s.posts === 'sleeve') line('finish', 'Post sleeves, white composite' + (s.brickAll ? ' (all posts)' : ' (outer posts)'), wrapped + ' ea', mul2([60, 120], wrapped), mul2([40, 70], wrapped), 'slips over the 6×6, with base and cap trim');
  const deckMat = M.mat;
  line('finish', 'Decking: ' + M.name, Math.round(G.area) + ' sf +10%', mul2(deckMat, G.area * 1.1), mul2(M.lab, G.area));
  line('finish', 'Fascia on the open edges', Math.round(G.openLf) + ' lf', mul2(M.fascia, G.openLf), mul2([4, 7], G.openLf));
  line('finish', 'Railing: ' + R.long + ', ' + s.guard + '″', Math.round(G.railLf) + ' lf', mul2(R.mat, G.railLf * gF), mul2(R.lab, G.railLf * gF));
  if (s.drain) line('finish', 'Under-deck drainage (dry patio below)', Math.round(G.area) + ' sf', mul2([3, 5], G.area), mul2([3, 5], G.area), 'goes in before the decking');
  if (G.stair) {
    const st = G.stair, sl = st.slope + 1, stock = sl > 16 ? [75, 105] : [55, 75];
    line('stairs', 'Stair stringers, 2×12 PT', st.stringers + ' ea', mul2(stock, st.stringers), [0, 0], st.n + ' risers × ' + inch(st.rise / 12));
    line('stairs', 'Bottom footings, posts, landing pad', '2 + pad', add2(mul2([150, 230], 2), [150, 300]), [440, 760]);
    line('stairs', 'Stair labor (layout, cut, set)', '1', [80, 150], [900, 1800], 'hardware in materials');
    const tsf = st.treads * st.width * 0.94;
    line('stairfin', 'Treads and riser boards', st.treads + ' treads', add2(mul2(deckMat, tsf * 1.15), mul2(M.fascia, st.n * st.width)), mul2([18, 30], st.n));
    line('stairfin', 'Stair railing, both sides', Math.round(2 * st.slope) + ' lf', mul2(R.mat, 2 * st.slope * 1.25 * gF), mul2(R.lab, 2 * st.slope * 1.4 * gF));
  }
  const fixed = { permit: [150, 400], drawing: [0, 750], delivery: [75, 150], toolsFrame: [300, 600], toolsFin: [150, 350] };
  const sum = f => L.reduce((t, l) => add2(t, f(l)), [0, 0]);
  const matT = l => mul2(l.mat, TAX), hireT = l => [l.mat[0] * TAX * MK[0] + l.lab[0], l.mat[1] * TAX * MK[1] + l.lab[1]];
  const isFrame = l => l.grp === 'frame' || l.grp === 'stairs';
  const base = add2(fixed.permit, fixed.drawing);
  const diy = add2(add2(sum(matT), base), add2(fixed.delivery, add2(fixed.toolsFrame, fixed.toolsFin)));
  const hired = add2(sum(hireT), base);
  const split = add2(add2(sum(l => isFrame(l) ? hireT(l) : matT(l)), base), add2(fixed.delivery, fixed.toolsFin));
  return { lines: L, fixed, diy, split, hired, by: { diy, split, hired } };
}

/* ---------------- checks ---------------- */
function checks(s, G, F, E, sun, sunJun) {
  const out = [], st = G.stair;
  out.push({ s: 'info', t: 'Freestanding frame, no ledger on the house', d: 'The rear wall is brick, and a deck ledger can’t hang on brick veneer (IRC R507.9.1.1, part of the Michigan Residential Code). So a beam on posts runs ' + ftin(G.vb0) + ' off the wall instead, plus knee braces both ways.' });
  const hr = BEAM_BOT - PATIO;
  out.push({ s: hr >= 7 ? 'ok' : 'warn', t: 'Headroom on the patio ' + ftin(hr), d: 'Under the beams (bottom at ' + BEAM_BOT.toFixed(2) + '). The walkout slider head is at 886.47, ' + inch(BEAM_BOT - 886.47) + ' below the beam, so it opens freely.' });
  out.push({ s: G.innerGap <= G.maxSpan + 1e-6 ? 'ok' : 'warn', t: 'House-side posts miss the slider and window', d: 'Posts at ' + G.posts.filter(p => p.beam === 'inner').map(p => ftin(p.u)).join(', ') + ' from the nook wall, kept clear of the walkout slider and basement window. Longest beam span ' + ftin(G.innerGap) + ' (allowed about ' + ftin(G.maxSpan) + ' for 3-ply 2×12 with ' + ftin(G.js) + ' joists).' });
  const jMax = 14.0;
  out.push({ s: G.js <= jMax ? 'ok' : 'bad', t: 'Joist span ' + ftin(G.js) + ' between beams', d: '2×10 southern pine at 16″ spans about 14′ for a 40 psf deck (IRC R507.6). Joists cantilever ' + ftin(G.c1) + ' past the outer beam and ' + ftin(G.vb0) + ' back toward the house.' });
  const hMax = Math.max(...G.posts.map(p => p.h));
  out.push({ s: hMax <= 14 ? 'ok' : 'bad', t: 'Posts ' + ftin(Math.min(...G.posts.map(p => p.h))) + ' to ' + ftin(hMax) + ' tall', d: '6×6 posts are allowed to 14′ (IRC R507.4). ' + G.posts.length + ' posts, ' + G.posts.length + ' footings 42″ deep for Michigan frost.' });
  out.push({ s: 'warn', t: 'House-side footings sit near the house footing', d: 'Their centers are ' + inch(G.vb0) + ' from the brick. The walkout wall’s footing usually sticks out 6–10″ past the brick at about the same depth. Locate it before digging and bear on undisturbed soil at the same depth, or move this beam out to 2′.' });
  out.push({ s: 'ok', t: 'Guard ' + s.guard + '″ on ' + Math.round(G.railLf) + ' lf', d: (s.guard === 36 ? 'Michigan requires 36″ for a house deck more than 30″ up; 42″ feels safer this high and costs about 12% more. ' : '42″ is above the 36″ minimum and feels better 10′ up. ') + (s.rail === 'cable' ? 'Cable must stop a 4″ ball: use the kit’s cable spacing (about 3″) and post spacing, and keep it tight.' : 'Pickets and balusters must stop a 4″ ball.') });
  if (s.rail !== 'cable') out.push({ s: 'info', t: 'View from the great room', d: 'The great room sill is 30″ above the floor, so the guard crosses the lower view out of the window. Cable keeps that view more open than pickets.' });
  const dw = Math.hypot(X0 - WELL.x, Math.max(0, Y0 + G.Dmax - WELL.y));
  out.push({ s: 'ok', t: 'Well, septic and easements clear', d: 'The deck’s west edge is ' + ftin(X0 - WELL.x) + ' east of the well (10′ needed) and clear of the well-rig path west of it. Rear yard, no easement under it.' });
  // furniture
  const bad = F.items.filter(i => !i.ok);
  if (F.items.length) out.push({ s: bad.length ? 'warn' : 'ok', t: bad.length ? bad.length + ' of ' + F.items.length + ' furniture pieces don’t fit' : 'Furniture fits: ' + F.items.map(i => i.kind === 'lounger' ? null : i.name.split(' with')[0]).filter(Boolean).concat(F.lounge.length ? [F.lounge.length + ' loungers'] : []).join(', '), d: bad.length ? bad.map(i => i.name + ' ' + i.why).join('; ') + '. Make the deck deeper or wider, or pick a smaller table.' : 'Layout keeps the slider landing clear.' + (F.table ? ' Walkway between the table and the house: ' + ftin(F.walk) + (F.walk < 3 ? ' (tight; 3′ is comfortable).' : '.') : '') });
  if (F.table && F.walk < 3 && !G.bump) out.push({ s: 'warn', t: 'Tight path past the table', d: 'Only ' + ftin(Math.max(0, F.walk)) + ' between the chairs and the house wall to reach the east end. 3′ is comfortable.' });
  // sun
  const dt = DATES.find(d => d.id === s.date) || DATES[2];
  const lz = F.lounge.length ? zoneSun(sun, { u0: Math.min(...F.lounge.map(l => l.u0)), u1: Math.max(...F.lounge.map(l => l.u1)), v0: F.lounge[0].v0, v1: F.lounge[0].v1 }) : null;
  out.push({ s: sun.avg >= 5 ? 'ok' : sun.avg >= 3 ? 'warn' : 'bad', t: 'Sun on ' + dt.name + ': ' + sun.avg.toFixed(1) + ' h average', d: 'The house is south of the deck and shades it for part of the day. ' + Math.round(sun.pct6 * 100) + '% of the deck gets 6+ hours. Best spot gets ' + sun.max.toFixed(1) + ' h, worst ' + sun.min.toFixed(1) + ' h.' + (lz != null ? ' The lounge chairs get about ' + lz.toFixed(1) + ' h.' : '') + ' (Jun 21: ' + sunJun.avg.toFixed(1) + ' h average.)' });
  if (MATS[s.mat] && (s.mat === 'compE' || s.mat === 'compP') && s.tone === 'charcoal') out.push({ s: 'warn', t: 'Charcoal composite in the sun', d: 'Dark composite can get too hot for bare feet on summer afternoons. Grey or warm brown runs noticeably cooler; check the maker’s heat-rated lines.' });
  if (s.posts === 'brick') out.push({ s: 'warn', t: 'Brick columns hide the knee braces', d: 'A freestanding deck still needs lateral bracing. With 16″ brick wraps it moves inside the wrap, between posts under the joists, or to engineered post bases; show it on the permit drawing. Brick needs a footing about 24″ wide so the veneer sits on concrete, not wood. Thin brick matching Chimney Mountain isn’t confirmed; compare samples against the house.' });
  if (s.grill && F.grill) out.push({ s: 'info', t: 'Grill against the ' + F.grill.where, d: 'Away from the slider. Propane tank grill, so no gas line; a GFCI outlet on the rear wall near the house corner covers lights and a rotisserie. Use a grill mat on composite and store the spare tank outside, not under the deck or in the garage.' });
  // stairs
  if (st) {
    const okR = st.rise <= 7.75 + 1e-6, okRise = st.R * 12 <= 151;
    out.push({ s: okR && okRise ? 'ok' : 'bad', t: 'Stairs: ' + st.n + ' risers at ' + inch(st.rise / 12) + ', ' + st.treads + ' treads at 10½″', d: 'Rise ' + ftin(st.R) + ', run ' + ftin(st.run) + ', 4′ wide. Max riser 7¾″, min tread 10″; no mid landing needed under 12′-7″ of rise. Lands at ' + st.foot.g.toFixed(1) + ' grade.' });
    const hits = [];
    if (S.yard) {
    const r = { x0: X0 + st.rect.u0, x1: X0 + st.rect.u1, y0: Y0 + st.rect.v0, y1: Y0 + st.rect.v1 };
    const land = st.side === 'east' ? { x0: r.x1, x1: r.x1 + 4, y0: r.y0, y1: r.y1 } : { x0: r.x0, x1: r.x1, y0: r.y1, y1: r.y1 + 4 };
    for (const e of PLAN) {
      if (e.t === 'path' && e.mat === 'splitrail') { for (let i = 0; i + 1 < e.pts.length; i++) if (segHitsRect(e.pts[i], e.pts[i + 1], r)) { hits.push('the split-rail fence around the garden court'); break; } }
      if (e.t === 'st') { const q = stRect(e); if (q.x0 < r.x1 && r.x0 < q.x1 && q.y0 < r.y1 && r.y0 < q.y1) hits.push('the ' + (e.label || e.k)); }
    }
    let onPath = false; const w1 = PLAN.find(e => e.id === 'W1');
    for (let i = 0; i + 1 < w1.pts.length; i++) if (segHitsRect(w1.pts[i], w1.pts[i + 1], { x0: land.x0 - 2, x1: land.x1 + 2, y0: land.y0 - 2, y1: land.y1 + 2 })) onPath = true;
    }
    if (!S.yard) out.push({ s: 'ok', t: 'Stairs land on the yard at ' + st.foot.g.toFixed(1), d: 'Foot of the stairs sits ' + ftin(TOP - st.foot.g) + ' below the deck. Turn on “Yard plan” to check it against the fence, path and garden.' });
    else out.push({ s: hits.length ? 'warn' : 'ok', t: hits.length ? 'Stairs cross ' + [...new Set(hits)].join(' and ') : 'Stairs clear your yard plan', d: (hits.length ? 'Move that leg of the fence south a few feet, or make the stair foot the garden gate. ' : '') + (onPath ? 'The foot lands on the flagstone path to the garden.' : st.side === 'north' ? 'The foot lands on the paver patio north of the deck.' : 'Extend the flagstone path to the stair foot.') });
  }
  if (G.D > 16) out.push({ s: 'info', t: 'Deck reaches past the walkout patio', d: 'The patio under the deck is 16′ deep in your plans. Past that, the deck runs over open yard' + (S.yard ? ' and part of the paver patio you drew north of it.' : '.') });
  if (G.W > CORNER) out.push({ s: 'info', t: 'Runs ' + ftin(G.W - CORNER) + ' past the house corner', d: 'That part needs railing on its south side too and sits over the side yard, which drops toward the garden court.' });
  return out;
}

/* ================= rendering: panel ================= */
function seg(id, opts, cur, on) {
  const el = $(id); el.innerHTML = opts.map(o => `<button class="btn" type="button" data-v="${esc(o[0])}" aria-pressed="${String(o[0]) === String(cur)}">${esc(o[1])}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; on(b.dataset.v); };
}
const SHAPE_SVG = p => { const W = p.W, D = p.D + (p.shape === 'bump' ? 4 : 0), sc = 20 / Math.max(D, 12), w = 32 * sc / 1.0, pts = p.shape === 'clip' ? [[0, 0], [p.W, 0], [p.W, p.D - 4], [p.W - 4, p.D], [0, p.D]] : p.shape === 'bump' ? [[0, 0], [p.W, 0], [p.W, p.D], [12, p.D], [12, p.D + 4], [2, p.D + 4], [2, p.D], [0, p.D]] : [[0, 0], [p.W, 0], [p.W, p.D], [0, p.D]];
  return `<svg class="shape" viewBox="-1 -1 34 ${D + 2}" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><rect x="-1" y="${D - 0.5}" width="23" height="1.5" fill="var(--house)"/><polygon points="${pts.map(q => q[0] + ',' + (D - q[1])).join(' ')}" fill="var(--deck)" stroke="var(--ink)" stroke-width=".5"/></svg>`; };
function renderPanel(G, E) {
  const presetCost = p => { const s2 = Object.assign({}, S, { W: p.W, D: p.D, shape: p.shape }); return estimate(s2, geom(s2)).by[S.labor]; };
  const cur = PRESETS.find(p => S.W === p.W && S.D === p.D && S.shape === p.shape);
  $('presets').innerHTML = PRESETS.map(p => `<button class="pre" type="button" data-p="${p.id}" aria-pressed="${cur === p}" title="${esc(p.sub)}">${SHAPE_SVG(p)}<b>${p.id} · ${esc(p.name)}</b><span class="dim">${p.W}×${p.D}${p.shape === 'bump' ? ' + bay' : p.shape === 'clip' ? ' clipped' : ''}</span><span class="tot">${rng2(presetCost(p))}</span></button>`).join('') + `<button class="pre" type="button" data-p="custom" aria-pressed="${!cur}" tabindex="-1" style="cursor:default"><b>Custom</b><span class="dim">${S.W}×${S.D}${S.shape !== 'rect' ? ' ' + S.shape : ''}</span><span class="tot">use the sliders or drag in the plan</span></button>`;
  $('preset-note').textContent = cur ? cur.sub : 'A custom size. Presets above reset it.';
  $('presets').onclick = e => { const b = e.target.closest('[data-p]'); if (!b || b.dataset.p === 'custom') return; const p = PRESETS.find(q => q.id === b.dataset.p); Object.assign(S, { W: p.W, D: p.D, shape: p.shape }); update(); };
  $('r-w').value = S.W; $('o-w').textContent = ftin(S.W); $('r-d').value = S.D; $('o-d').textContent = ftin(S.D);
  seg('seg-shape', [['rect', 'Rectangle'], ['clip', 'Clipped corner'], ['bump', 'Table bay']], S.shape, v => { S.shape = v; update(); });
  $('sv-size').textContent = `${S.W}×${S.D} · ${Math.round(G.area)} sf`;
  $('mats').innerHTML = Object.entries(MATS).map(([kk, m]) => { const s2 = Object.assign({}, S, { mat: kk }), c = estimate(s2, geom(s2)).by[S.labor]; return `<button class="card" type="button" data-m="${kk}" aria-pressed="${S.mat === kk}"><span class="sw" style="background:repeating-linear-gradient(0deg,${m.tones[S.tone]} 0 5px,rgba(0,0,0,.28) 5px 6px)"></span><span><b>${esc(m.short)}</b><small>$${m.mat[0]}–${m.mat[1]}/sf · ${esc(m.life)}</small></span><span class="tot">${rng2(c)}</span></button>`; }).join('');
  $('mats').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; S.mat = b.dataset.m; update(); };
  seg('seg-tone', [['warm', 'Warm brown'], ['grey', 'Mid grey'], ['charcoal', 'Charcoal']], S.tone, v => { S.tone = v; update(); });
  $('sv-mat').textContent = MATS[S.mat].short + ' · ' + S.tone;
  seg('seg-rail', Object.entries(RAILS).map(([kk, r]) => [kk, r.name]), S.rail, v => { S.rail = v; update(); });
  seg('seg-guard', [[36, '36″ guard (code minimum)'], [42, '42″ guard']], S.guard, v => { S.guard = +v; update(); });
  $('sv-rail').textContent = `${RAILS[S.rail].name} ${S.guard}″ · ${Math.round(G.railLf)} lf`;
  seg('seg-stairs', [['none', 'No stairs'], ['east', 'East, to the garden path'], ['north', 'North, to the patio']], S.stairs, v => { S.stairs = v; update(); });
  const dS = [E.withS[S.labor][0] - E.noS[S.labor][0], E.withS[S.labor][1] - E.noS[S.labor][1]];
  $('stair-note').textContent = G.stair ? `Shown as an option: ${G.stair.n} risers, ${ftin(G.stair.run)} run, ${ftin(G.stair.R)} drop. Adds ${rng2(dS)} in this labor mode.` : `Your plan is no stairs: the yard is reached through the walkout slider. The east stair would add ${rng2(dS)} here.`;
  $('sv-stairs').textContent = S.stairs === 'none' ? 'none (plan)' : S.stairs + ' · +' + k(dS[0]);
  $('c-drain').checked = S.drain; $('c-brickall').checked = S.brickAll; $('c-heat').checked = S.heat; $('c-furn').checked = S.showFurn;
  $('sv-add').textContent = S.drain ? 'drainage' : 'none';
  seg('seg-posts', [['plain', '6×6 wood'], ['sleeve', 'White sleeves'], ['brick', 'Brick columns']], S.posts, v => { S.posts = v; update(); });
  const nw = G.posts.filter(p => S.brickAll || p.beam !== 'inner').length;
  $('sv-posts').textContent = { plain: '6×6 wood', sleeve: 'white sleeves', brick: 'brick columns' }[S.posts] + (S.posts !== 'plain' ? ' · ' + nw : '');
  const pd = (mode) => { const a = estimate(Object.assign({}, S, { posts: mode }), G).by[S.labor], b = estimate(Object.assign({}, S, { posts: 'plain' }), G).by[S.labor]; return [a[0] - b[0], a[1] - b[1]]; };
  $('posts-note').textContent = S.posts === 'plain' ? `Brick columns would add ${rng2(pd('brick'))}; white sleeves ${rng2(pd('sleeve'))}.` : `Adds ${rng2(pd(S.posts))} over plain 6×6 posts in this labor mode.`;
  $('c-brickall').closest('label').hidden = S.posts === 'plain';
  seg('seg-labor', Object.entries(LABOR), S.labor, v => { S.labor = v; update(); });
  $('labor-note').textContent = LABOR_NOTE[S.labor]; $('sv-labor').textContent = LABOR[S.labor];
  seg('seg-date', DATES.map(d => [d.id, d.name]), S.date, v => { S.date = v; update({ noBuild: true }); });
  $('r-hour').value = S.hour; $('o-hour').textContent = hourLabel(S.hour);
  $('b-frame').setAttribute('aria-pressed', String(!!S.frame));
  ['b-furn2', 'b-furn3'].forEach(id => $(id).setAttribute('aria-pressed', String(!!S.showFurn)));
  ['b-yard2', 'b-yard3'].forEach(id => $(id).setAttribute('aria-pressed', String(!!S.yard)));
  $('lg-yard').hidden = !S.yard;
}
function renderFurn(F) {
  const fit = kind => { const it = F.items.filter(i => i.kind === kind); if (!it.length) return ''; const bad = it.filter(i => !i.ok); return bad.length ? `<span class="fit no" title="${esc(bad.map(i => i.why).join('; '))}">doesn’t fit</span>` : '<span class="fit ok">fits</span>'; };
  const row = (id, on, label, fitHtml, segHtml) => `<div class="frow"><label class="tgl"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${label}</label>${fitHtml || ''}${segHtml ? `<div class="seg" role="group" aria-label="${label} options" id="${id}-seg"></div>` : ''}</div>`;
  $('furn').innerHTML = row('f-table', S.tableOn, 'Table with umbrella', fit('table'), true) + row('f-lounge', S.loungeOn, 'Lounge chairs', fit('lounger'), true) + row('f-grill', S.grill, 'Propane grill', fit('grill'), false);
  if (S.tableOn) seg('f-table-seg', [['bistro', 'Bistro, 2'], ['r48', '48″ round, 4'], ['r60', '60″ round, 6']], S.table, v => { S.table = v; update(); }); else $('f-table-seg').hidden = true;
  if (S.loungeOn) seg('f-lounge-seg', [[1, 'One'], [2, 'Two']], S.loungers, v => { S.loungers = +v; update(); }); else $('f-lounge-seg').hidden = true;
  $('f-table').onchange = e => { S.tableOn = e.target.checked; update(); };
  $('f-lounge').onchange = e => { S.loungeOn = e.target.checked; update(); };
  $('f-grill').onchange = e => { S.grill = e.target.checked; update(); };
  const n = F.items.length, bad = F.items.filter(i => !i.ok).length;
  $('sv-furn').textContent = n ? (bad ? bad + ' won’t fit' : 'all fit') + (S.showFurn ? '' : ' · hidden') : 'none';
}
function hourLabel(h) { const hh = Math.floor(h), mm = Math.round((h - hh) * 60), ap = hh >= 12 ? 'pm' : 'am', h12 = ((hh + 11) % 12) + 1; const dt = DATES.find(d => d.id === S.date) || DATES[2], sp = sunPos(dt.m, dt.d, h); return `${h12}:${String(mm).padStart(2, '0')} ${ap} · sun ${sp.alt > 0 ? Math.round(sp.alt / D2R) + '° up' : 'down'}`; }

/* ================= plan SVG ================= */
let PLAN_SUM = '', ELEV_SUM = '';
let PV = { x0: 96, x1: 188, y0: 118, y1: 178 };
function renderPlan(G, F, sun) {
  const ex = G.stair && G.stair.side === 'east' ? G.stair.run + 10 : 9, ny = G.stair && G.stair.side === 'north' ? G.stair.run + 6 : 6;
  PV = { x0: 100, x1: X0 + 32 + (S.stairs === 'east' ? 24 : 8), y0: 126, y1: Y0 + 22 + (S.stairs === 'north' ? 21 : 5) };   // fixed extent, so dragging never rescales the view
  const sx = x => (x - PV.x0).toFixed(2), sy = y => (PV.y1 - y).toFixed(2), L = s => (X0 + s), V = s => (Y0 + s);
  const P = pts => pts.map(p => sx(p[0]) + ',' + sy(p[1])).join(' ');
  const o = [];
  o.push(`<rect x="0" y="0" width="${PV.x1 - PV.x0}" height="${PV.y1 - PV.y0}" fill="var(--sheet)"/>`);
  for (let x = Math.ceil(PV.x0); x <= PV.x1; x++) o.push(`<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${PV.y1 - PV.y0}" stroke="var(--rule)" stroke-width="${x % 10 ? 0.03 : 0.08}"/>`);
  for (let y = Math.ceil(PV.y0); y <= PV.y1; y++) o.push(`<line x1="0" y1="${sy(y)}" x2="${PV.x1 - PV.x0}" y2="${sy(y)}" stroke="var(--rule)" stroke-width="${y % 10 ? 0.03 : 0.08}"/>`);
  for (let x = 100; x <= PV.x1; x += 10) o.push(`<text x="${sx(x) - 0 + 0.3}" y="1.4" font-size="1.1" fill="var(--ink2)" font-family="IBM Plex Mono,monospace">x ${x}</text>`);
  for (let y = 120; y <= PV.y1; y += 10) o.push(`<text x="0.4" y="${+sy(y) - 0.3}" font-size="1.1" fill="var(--ink2)" font-family="IBM Plex Mono,monospace">y ${y}</text>`);
  // yard plan (hidden by default so the deck stands alone)
  for (const e of (S.yard ? PLAN : [])) {
    if (e.t === 'bed') o.push(`<polygon points="${P(e.pts)}" fill="${PLAN_COL[e.mat] || '#888'}" fill-opacity=".22" stroke="var(--plan)" stroke-width=".12"/>`);
    else if (e.t === 'path') o.push(`<polyline points="${P(e.pts)}" fill="none" stroke="${PLAN_COL[e.mat]}" stroke-opacity="${e.mat === 'splitrail' ? .9 : .45}" stroke-width="${e.w}" stroke-linejoin="round" ${e.mat === 'splitrail' ? 'stroke-dasharray="1.2 .5"' : ''}/>`);
    else if (e.t === 'st') { const r = stRect(e); o.push(`<rect x="${sx(r.x0)}" y="${sy(r.y1)}" width="${(r.x1 - r.x0).toFixed(2)}" height="${(r.y1 - r.y0).toFixed(2)}" fill="var(--plan)" fill-opacity=".14" stroke="var(--plan)" stroke-width=".12"/>`); }
    else if (e.t === 'plant') o.push(`<circle cx="${sx(e.x)}" cy="${sy(e.y)}" r="${e.r}" fill="var(--plan)" fill-opacity=".18" stroke="var(--plan)" stroke-width=".1"/><text x="${sx(e.x)}" y="${+sy(e.y) + 0.4}" text-anchor="middle" font-size="1" fill="var(--ink2)">hazel</text>`);
  }
  const lab = (x, y, t, a) => o.push(`<text x="${sx(x)}" y="${sy(y)}" font-size="0.95" fill="var(--ink2)" text-anchor="${a || 'start'}">${esc(t)}</text>`);
  if (S.yard) lab(171.8, 136, 'split-rail fence'); if (S.yard) { lab(158, 148.2, 'flagstone path'); lab(150.5, 130.5, 'pergola + potting bench', 'start'); lab(132, 165.2, 'paver patio (your plan)', 'middle'); } if (S.yard) lab(155, 117.8 + 3, 'garden court');
  // house
  o.push(`<polygon points="${P([[94.7, 118], [144.54, 118], [144.54, 134.73], [122.54, 134.73], [122.54, 142.73], [102.87, 142.73], [102.87, 134.73], [94.7, 134.73]])}" fill="var(--house)" stroke="var(--ink)" stroke-width=".22"/>`);
  lab(133.5, 127, 'GREAT ROOM', 'middle'); lab(112.7, 138.2, 'NOOK', 'middle'); lab(108, 127, 'KITCHEN', 'middle');
  o.push(`<line x1="${sx(GR_WIN.x0)}" y1="${sy(Y0)}" x2="${sx(GR_WIN.x1)}" y2="${sy(Y0)}" stroke="var(--accent)" stroke-width=".45"/>`); lab((GR_WIN.x0 + GR_WIN.x1) / 2, Y0 - 1.5, 'great room window, sill 30″', 'middle');
  o.push(`<line x1="${sx(X0)}" y1="${sy(Y0 + NOOK_SLIDER.v0)}" x2="${sx(X0)}" y2="${sy(Y0 + NOOK_SLIDER.v1)}" stroke="var(--accent)" stroke-width=".6"/>`); lab(X0 - 0.6, Y0 + 4.4, 'slider', 'end');
  for (const b of BSMT) o.push(`<line x1="${sx(b.x0)}" y1="${+sy(Y0) - 0.6}" x2="${sx(b.x1)}" y2="${+sy(Y0) - 0.6}" stroke="var(--ink2)" stroke-width=".25" stroke-dasharray=".6 .3"/>`);
  o.push(`<circle cx="${sx(WELL.x)}" cy="${sy(WELL.y)}" r="10" fill="none" stroke="var(--bad)" stroke-width=".12" stroke-dasharray=".8 .4"/><circle cx="${sx(WELL.x)}" cy="${sy(WELL.y)}" r=".5" fill="var(--bad)"/>`); lab(WELL.x, WELL.y - 1.8, 'well · 10′ setback', 'middle');
  o.push(`<rect x="${sx(122.54)}" y="${sy(150.73)}" width="22" height="16.0" fill="none" stroke="var(--ink2)" stroke-width=".12" stroke-dasharray=".5 .4"/>`); lab(X0 + 0.3, 150.73 + 0.7, 'walkout patio below (yours to build)');
  // sun map
  if (S.heat) {
    const mx = Math.max(1, sun.day);
    for (const c of sun.cells) { const t = Math.min(1, c.h / Math.min(mx, 10)); o.push(`<rect x="${sx(L(c.u))}" y="${sy(V(c.v + 1))}" width="1" height="1" fill="${t > .5 ? 'var(--sun)' : 'var(--shade)'}" fill-opacity="${(0.15 + 0.6 * Math.abs(t - 0.5) * 2 * 0.8).toFixed(2)}"/>`); }
  }
  // deck
  const dp = G.poly.map(p => [L(p[0]), V(p[1])]);
  o.push(`<polygon points="${P(dp)}" fill="var(--deck)" fill-opacity="${S.heat ? .22 : .5}" stroke="var(--ink)" stroke-width=".18"/>`);
  for (let v = 0.47; v < G.Dmax; v += 0.47 * 3) for (const [a, b] of scan(G.poly, v)) o.push(`<line x1="${sx(L(a))}" y1="${sy(V(v))}" x2="${sx(L(b))}" y2="${sy(V(v))}" stroke="var(--ink)" stroke-opacity=".12" stroke-width=".05"/>`);
  for (const sg of G.railSegs) o.push(`<line x1="${sx(L(sg.a[0]))}" y1="${sy(V(sg.a[1]))}" x2="${sx(L(sg.b[0]))}" y2="${sy(V(sg.b[1]))}" stroke="var(--ink)" stroke-width=".5"/>`);
  for (const b of G.beams) o.push(`<line x1="${sx(L(b.u0))}" y1="${sy(V(b.v))}" x2="${sx(L(b.u1))}" y2="${sy(V(b.v))}" stroke="var(--ink2)" stroke-width=".22" stroke-dasharray=".7 .35"/>`);
  for (const p of G.posts) { const wr = S.posts !== 'plain' && (S.brickAll || p.beam !== 'inner'), hs = wr ? (S.posts === 'brick' ? .67 : .33) : .23; o.push(`<circle cx="${sx(L(p.u))}" cy="${sy(V(p.v))}" r="${wr && S.posts === 'brick' ? 1 : .67}" fill="none" stroke="var(--ink2)" stroke-width=".08" stroke-dasharray=".25 .15"/><rect x="${+sx(L(p.u)) - hs}" y="${+sy(V(p.v)) - hs}" width="${2 * hs}" height="${2 * hs}" fill="${wr ? (S.posts === 'brick' ? 'var(--brick)' : 'var(--sheet)') : 'var(--ink)'}" stroke="var(--ink)" stroke-width=".08"/>`); }
  // stairs
  if (G.stair) {
    const st = G.stair, r = st.rect;
    o.push(`<rect x="${sx(L(r.u0))}" y="${sy(V(r.v1))}" width="${(r.u1 - r.u0).toFixed(2)}" height="${(r.v1 - r.v0).toFixed(2)}" fill="var(--deck)" fill-opacity=".45" stroke="var(--ink)" stroke-width=".15"/>`);
    for (let i = 1; i < st.n; i++) { const t = i * 10.5 / 12; if (st.dir[0]) o.push(`<line x1="${sx(L(r.u0 + t))}" y1="${sy(V(r.v0))}" x2="${sx(L(r.u0 + t))}" y2="${sy(V(r.v1))}" stroke="var(--ink)" stroke-width=".05"/>`); else o.push(`<line x1="${sx(L(r.u0))}" y1="${sy(V(r.v0 + t))}" x2="${sx(L(r.u1))}" y2="${sy(V(r.v0 + t))}" stroke="var(--ink)" stroke-width=".05"/>`); }
    const cx = L((r.u0 + r.u1) / 2), cy = V((r.v0 + r.v1) / 2);
    o.push(`<text x="${sx(cx)}" y="${+sy(cy) + 0.4}" text-anchor="middle" font-size="1.1" font-weight="600" fill="var(--ink)">DN ${st.n}R · option</text>`);
  }
  // furniture
  for (const it of (S.showFurn ? F.items : [])) {
    const col = it.ok ? 'var(--accent)' : 'var(--bad)';
    if (it.kind === 'table') { o.push(`<circle cx="${sx(L(it.u))}" cy="${sy(V(it.v))}" r="${it.R}" fill="none" stroke="${col}" stroke-width=".12" stroke-dasharray=".4 .25"/><circle cx="${sx(L(it.u))}" cy="${sy(V(it.v))}" r="${it.top}" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-width=".1"/>`); lab(L(it.u), V(it.v) - 0.4, it.R > 4 ? 'table + umbrella' : 'bistro', 'middle'); }
    else { o.push(`<rect x="${sx(L(it.u0))}" y="${sy(V(it.v1))}" width="${(it.u1 - it.u0).toFixed(2)}" height="${(it.v1 - it.v0).toFixed(2)}" fill="${col}" fill-opacity=".15" stroke="${col}" stroke-width=".12"/>`); if (it.kind === 'grill' || it === F.lounge[0]) lab(L((it.u0 + it.u1) / 2) - (it.kind === 'grill' ? 0 : 1.2), V((it.v0 + it.v1) / 2), it.kind === 'grill' ? 'grill' : 'loungers', 'middle'); }
  }
  // dimensions
  const dimH = (xa, xb, y, t) => { o.push(`<line x1="${sx(xa)}" y1="${sy(y)}" x2="${sx(xb)}" y2="${sy(y)}" stroke="var(--ink)" stroke-width=".08"/><line x1="${sx(xa)}" y1="${+sy(y) - .6}" x2="${sx(xa)}" y2="${+sy(y) + .6}" stroke="var(--ink)" stroke-width=".08"/><line x1="${sx(xb)}" y1="${+sy(y) - .6}" x2="${sx(xb)}" y2="${+sy(y) + .6}" stroke="var(--ink)" stroke-width=".08"/><text x="${sx((xa + xb) / 2)}" y="${+sy(y) - .35}" text-anchor="middle" font-size="1.1" font-weight="600" fill="var(--ink)" font-family="IBM Plex Mono,monospace">${t}</text>`); };
  const dimV = (ya, yb, x, t) => { o.push(`<line x1="${sx(x)}" y1="${sy(ya)}" x2="${sx(x)}" y2="${sy(yb)}" stroke="var(--ink)" stroke-width=".08"/><line x1="${+sx(x) - .6}" y1="${sy(ya)}" x2="${+sx(x) + .6}" y2="${sy(ya)}" stroke="var(--ink)" stroke-width=".08"/><line x1="${+sx(x) - .6}" y1="${sy(yb)}" x2="${+sx(x) + .6}" y2="${sy(yb)}" stroke="var(--ink)" stroke-width=".08"/><text x="${+sx(x) + .5}" y="${+sy((ya + yb) / 2) + .4}" font-size="1.25" font-weight="600" fill="var(--ink)" font-family="IBM Plex Mono,monospace">${t}</text>`); };
  dimH(X0, X0 + G.W, Y0 + G.Dmax + (G.stair && G.stair.side === 'north' ? G.stair.run + 1.5 : 1.8), ftin(G.W));
  dimV(Y0, Y0 + G.D, X0 + G.W + (G.stair && G.stair.side === 'east' ? G.stair.run + 5.5 : 1.4), ftin(G.D));
  // north arrow
  const ax = PV.x1 - PV.x0 - 4, ay = 6;
  o.push(`<g transform="translate(${ax},${ay})"><line x1="0" y1="2.5" x2="0" y2="-2.5" stroke="var(--ink)" stroke-width=".18"/><polygon points="0,-3.4 -0.9,-1.6 0.9,-1.6" fill="var(--ink)"/><text x="0" y="4.4" text-anchor="middle" font-size="1.2" font-weight="700" fill="var(--ink)">N</text><line x1="0" y1="0" x2="${(3 * Math.sin(5.1 * D2R)).toFixed(2)}" y2="${(-3 * Math.cos(5.1 * D2R)).toFixed(2)}" stroke="var(--sun)" stroke-width=".14"/><text x="1.2" y="-2.8" font-size=".9" fill="var(--ink2)">true</text></g>`);
  // resize handles: east edge, north edge, corner
  const hx = L(G.W), hy = V(G.D);
  o.push(`<circle class="hdl" data-h="w" cx="${sx(hx)}" cy="${sy(V(G.D / 2))}" r="1.05"><title>Drag to change the width</title></circle>`);
  o.push(`<circle class="hdl" data-h="d" cx="${sx(L(Math.min(G.W, CORNER) / 2 + (G.bump ? 7 : 0)))}" cy="${sy(hy)}" r="1.05"><title>Drag to change the depth</title></circle>`);
  o.push(`<rect class="hdl" data-h="wd" x="${+sx(hx) - 1.05}" y="${+sy(hy) - 1.05}" width="2.1" height="2.1"><title>Drag to change width and depth</title></rect>`);
  const svg = $('plan'); svg.setAttribute('viewBox', `0 0 ${PV.x1 - PV.x0} ${PV.y1 - PV.y0}`); svg.innerHTML = o.join('');
  PLAN_SUM = `${ftin(G.W)} × ${ftin(G.D)}${G.bump ? ' + 10′ × 4′ bay' : G.c ? ' with a ' + ftin(G.c) + ' clipped corner' : ''} = ${Math.round(G.area)} sf. ${G.posts.length} posts on ${G.beams.length} beams, ${Math.round(G.railLf)} lf of guard${G.stair ? ', stairs drawn as an option' : ''}. Sun map: ${(DATES.find(d => d.id === S.date) || DATES[2]).name}, ${sun.avg.toFixed(1)} h average on the deck.`;
}

/* ================= elevation SVG (looking south: east is on the left) ================= */
function renderElev(G) {
  const st = G.stair, xr = Math.max(X0 + G.W + (st && st.side === 'east' ? st.run + 5 : 4), 152), xl = 100;
  const EV = { e0: 873.5, e1: 919 }, Wd = xr - xl, Hd = EV.e1 - EV.e0;
  const sx = x => (xr - x).toFixed(2), sy = e => (EV.e1 - e).toFixed(2), o = [];
  o.push(`<rect x="0" y="0" width="${Wd}" height="${Hd}" fill="var(--sheet)"/>`);
  for (let e = Math.ceil(EV.e0); e <= EV.e1; e++) o.push(`<line x1="0" y1="${sy(e)}" x2="${Wd}" y2="${sy(e)}" stroke="var(--rule)" stroke-width="${e % 5 ? 0.025 : 0.07}"/>`);
  for (let x = Math.ceil(xl); x <= xr; x++) o.push(`<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${Hd}" stroke="var(--rule)" stroke-width="${x % 10 ? 0.025 : 0.07}"/>`);
  for (let e = 875; e <= 915; e += 5) o.push(`<text x="${Wd - 0.3}" y="${+sy(e) - 0.2}" text-anchor="end" font-size=".95" fill="var(--ink2)" font-family="IBM Plex Mono,monospace">${e}</text>`);
  const R = (x0, x1, e0, e1, fill, extra) => o.push(`<rect x="${sx(x1)}" y="${sy(e1)}" width="${(x1 - x0).toFixed(2)}" height="${(e1 - e0).toFixed(2)}" fill="${fill}" ${extra || ''}/>`);
  // house rear wall (main) + nook face (closer to the viewer)
  R(94.7, 144.54, 879.67, 898.35, 'var(--brick)', 'fill-opacity=".55"'); R(94.7, 144.54, 898.35, 907.95, 'var(--house)');
  o.push(`<polygon points="${sx(93.4)},${sy(907.95)} ${sx(145.84)},${sy(907.95)} ${sx(145.84 - 19.7)},${sy(917.8)} ${sx(93.4 + 19.7)},${sy(917.8)}" fill="var(--ink2)" fill-opacity=".55"/>`);
  R(102.87, 122.54, 879.67, 898.8, 'var(--brick)', 'fill-opacity=".75" stroke="var(--ink)" stroke-width=".1"');
  o.push(`<polygon points="${sx(101.7)},${sy(898.8)} ${sx(123.7)},${sy(898.8)} ${sx(123.7 - 3)},${sy(901.8)} ${sx(101.7 + 3)},${sy(901.8)}" fill="var(--ink2)" fill-opacity=".7"/>`);
  R(GR_WIN.x0, GR_WIN.x1, GR_WIN.e0, GR_WIN.e1, 'var(--accent)', 'fill-opacity=".35" stroke="var(--ink)" stroke-width=".08"');
  for (const b of BSMT) R(b.x0, b.x1, b.e0, b.e1, 'var(--accent)', 'fill-opacity=".25" stroke="var(--ink)" stroke-width=".08"');
  o.push(`<text x="${sx((GR_WIN.x0 + GR_WIN.x1) / 2)}" y="${sy(GR_WIN.e1 + 0.5)}" text-anchor="middle" font-size="1" fill="var(--ink)">great room window</text><text x="${sx(132.7)}" y="${sy(882.6)}" text-anchor="middle" font-size=".9" fill="var(--ink)">walkout slider</text><text x="${sx(112.7)}" y="${sy(893)}" text-anchor="middle" font-size="1" fill="var(--ink)">nook</text>`);
  // grade along the outer edge, and the patio
  const pts = []; for (let x = xl; x <= xr + 0.01; x += 1) pts.push([x, pyH(x, Y0 + G.D)]);
  o.push(`<polygon points="${pts.map(p => sx(p[0]) + ',' + sy(p[1])).join(' ')} ${sx(xr)},${sy(EV.e0)} ${sx(xl)},${sy(EV.e0)}" fill="var(--plan)" fill-opacity=".25" stroke="var(--plan)" stroke-width=".15"/>`);
  R(122.54, 144.54, PATIO - 0.33, PATIO, 'var(--ink2)', 'fill-opacity=".35"'); o.push(`<text x="${sx(124.5)}" y="${sy(PATIO - 1.3)}" font-size=".95" fill="var(--ink2)" text-anchor="end">patio 879.5 (yours)</text>`);
  // deck
  const xa = X0, xb = X0 + G.W;
  R(xa, xb, JOIST_BOT, TOP, 'var(--deck)', 'stroke="var(--ink)" stroke-width=".1"');
  R(xa + 0.25, X0 + G.uEndOuter - 0.25, BEAM_BOT, JOIST_BOT, 'var(--ink2)', 'fill-opacity=".8"');
  for (const p of G.posts.filter(p => p.beam !== 'inner')) {
    const x = X0 + p.u, g = pyH(x, Y0 + p.v);
    if (S.posts === 'brick') { R(x - 0.83, x + 0.83, g, g + 0.33, 'var(--house)', 'stroke="var(--ink)" stroke-width=".06"'); R(x - 0.67, x + 0.67, g + 0.33, BEAM_BOT - 0.25, 'var(--brick)', 'stroke="var(--ink)" stroke-width=".08"'); for (let e = g + 0.55; e < BEAM_BOT - 0.3; e += 0.45) o.push(`<line x1="${sx(x + 0.67)}" y1="${sy(e)}" x2="${sx(x - 0.67)}" y2="${sy(e)}" stroke="var(--ink)" stroke-opacity=".25" stroke-width=".03"/>`); R(x - 0.83, x + 0.83, BEAM_BOT - 0.25, BEAM_BOT, 'var(--house)', 'stroke="var(--ink)" stroke-width=".06"'); }
    else if (S.posts === 'sleeve') R(x - 0.33, x + 0.33, g + 0.17, BEAM_BOT, 'var(--sheet)', 'stroke="var(--ink)" stroke-width=".08"');
    else R(x - 0.23, x + 0.23, g + 0.17, BEAM_BOT, 'var(--ink2)');
    o.push(`<rect x="${(+sx(x + 0.67))}" y="${sy(g)}" width="1.33" height="3.5" fill="none" stroke="var(--ink2)" stroke-width=".08" stroke-dasharray=".3 .2"/>`);
    if (S.posts === 'plain') for (const s2 of [-1, 1]) { const xe = x + s2 * 2; if (xe > xa && xe < xb) o.push(`<line x1="${sx(x)}" y1="${sy(BEAM_BOT - 2)}" x2="${sx(xe)}" y2="${sy(BEAM_BOT)}" stroke="var(--ink2)" stroke-width=".22"/>`); }
  }
  // guard
  const gt = TOP + S.guard / 12, rcol = RAILS[S.rail].col || 'var(--deck)';
  R(xa, xb, gt - 0.12, gt, rcol);
  if (S.rail === 'cable') for (let e = TOP + 0.3; e < gt - 0.15; e += 0.25) o.push(`<line x1="${sx(xa)}" y1="${sy(e)}" x2="${sx(xb)}" y2="${sy(e)}" stroke="${rcol}" stroke-width=".03"/>`);
  else for (let x = xa + 0.2; x < xb; x += 0.38) o.push(`<line x1="${sx(x)}" y1="${sy(TOP + 0.25)}" x2="${sx(x)}" y2="${sy(gt - 0.1)}" stroke="${rcol}" stroke-width=".06"/>`);
  for (let x = xa; x <= xb + 0.01; x += RAILS[S.rail].sp) R(Math.min(x, xb) - 0.11, Math.min(x, xb) + 0.11, TOP, gt + 0.05, rcol);
  // stairs profile
  if (st && st.side === 'east') {
    const p = []; for (let i = 0; i < st.n; i++) { const x = xb + i * 10.5 / 12, e = TOP - i * st.rise / 12; p.push([x, e], [x, e - st.rise / 12]); if (i < st.n - 1) p.push([x + 10.5 / 12, e - st.rise / 12]); }
    o.push(`<polyline points="${p.map(q => sx(q[0]) + ',' + sy(q[1])).join(' ')}" fill="none" stroke="var(--ink)" stroke-width=".12"/>`);
    o.push(`<line x1="${sx(xb)}" y1="${sy(TOP + 3)}" x2="${sx(xb + st.run)}" y2="${sy(st.foot.g + 3)}" stroke="${rcol}" stroke-width=".12"/>`);
    o.push(`<text x="${sx(xb + st.run / 2 + 1)}" y="${sy(TOP - st.R / 2 - 1)}" font-size=".95" fill="var(--ink)">stairs (option): ${st.n} × ${inch(st.rise / 12)}</text>`);
  } else if (st) { R(X0 + st.rect.u0, X0 + st.rect.u1, st.foot.g, TOP, 'var(--deck)', 'fill-opacity=".4" stroke="var(--ink)" stroke-width=".08"'); o.push(`<text x="${sx(X0 + st.rect.u1 + 0.3)}" y="${sy(TOP - 3)}" font-size=".95" fill="var(--ink)" text-anchor="start">stairs (option), seen end-on</text>`); }
  // person for scale on the patio and on the deck
  const person = (x, e) => o.push(`<g fill="var(--ink2)" fill-opacity=".7"><circle cx="${sx(x)}" cy="${sy(e + 5.45)}" r=".42"/><rect x="${+sx(x) - .45}" y="${sy(e + 5)}" width=".9" height="2.6" rx=".3"/><rect x="${+sx(x) - .38}" y="${sy(e + 2.5)}" width=".3" height="2.5"/><rect x="${+sx(x) + .08}" y="${sy(e + 2.5)}" width=".3" height="2.5"/></g>`);
  person(139, PATIO); person(X0 + 4, TOP);
  // dimensions
  const dv = (x, ea, eb, t, left) => { o.push(`<line x1="${sx(x)}" y1="${sy(ea)}" x2="${sx(x)}" y2="${sy(eb)}" stroke="var(--ink)" stroke-width=".07"/><line x1="${+sx(x) - .5}" y1="${sy(ea)}" x2="${+sx(x) + .5}" y2="${sy(ea)}" stroke="var(--ink)" stroke-width=".07"/><line x1="${+sx(x) - .5}" y1="${sy(eb)}" x2="${+sx(x) + .5}" y2="${sy(eb)}" stroke="var(--ink)" stroke-width=".07"/><text x="${+sx(x) + (left ? -.4 : .4)}" y="${+sy((ea + eb) / 2) + .35}" text-anchor="${left ? 'end' : 'start'}" font-size="1.05" font-weight="600" fill="var(--ink)" font-family="IBM Plex Mono,monospace">${t}</text>`); };
  dv(X0 + 1.5, PATIO, TOP, 'deck ' + ftin(TOP - PATIO), true);
  dv(X0 + 3.5, PATIO, BEAM_BOT, 'clear ' + ftin(BEAM_BOT - PATIO), false);
  dv(xb + 0.8, TOP, gt, S.guard + '″ guard', false);
  const svg = $('elev'); svg.setAttribute('viewBox', `0 0 ${Wd.toFixed(2)} ${Hd}`); svg.innerHTML = o.join('');
  ELEV_SUM = `Deck surface ${TOP} (2″ below the nook floor at ${FF}). ${ftin(TOP - PATIO)} above the patio, ${ftin(BEAM_BOT - PATIO)} clear under the beams. Footings shown dashed 42″ deep.`;
}

/* ================= cost table, matrix, notes ================= */
function renderCost(G, E) {
  const M = MATS[S.mat];
  $('cost-name').textContent = `${PRESETS.find(p => p.W === S.W && p.D === S.D && p.shape === S.shape)?.id || 'Custom'} ${S.W}×${S.D} · ${M.short} · ${RAILS[S.rail].name}`;
  const grpName = { frame: 'Structure · a crew does this in “hire the frame” mode', finish: 'Surface and railing · yours in “hire the frame” mode', stairs: 'Stairs, structure (option)', stairfin: 'Stairs, treads and rails (option)' };
  const rows = [`<tr><th>Item</th><th class="n">Qty</th><th class="n">DIY materials</th><th class="n">Hired, installed</th></tr>`];
  let g = '';
  const GO = { frame: 0, finish: 1, stairs: 2, stairfin: 3 };
  for (const l of E.lines.slice().sort((x, y) => GO[x.grp] - GO[y.grp])) {
    if (l.grp !== g) { g = l.grp; rows.push(`<tr class="grp"><td colspan="4">${grpName[g]}</td></tr>`); }
    const h = [l.mat[0] * TAX * MK[0] + l.lab[0], l.mat[1] * TAX * MK[1] + l.lab[1]];
    rows.push(`<tr><td>${esc(l.name)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td><td class="n">${esc(l.qty)}</td><td class="n">${l.mat[1] ? rng2(l.mat) : '—'}</td><td class="n">${rng2(h)}</td></tr>`);
  }
  const f = E.fixed;
  rows.push(`<tr class="grp"><td colspan="4">Fixed costs</td></tr>`);
  rows.push(`<tr><td>Township permit<small>Almont Twp fee, assumed</small></td><td class="n">1</td><td class="n">${rng2(f.permit)}</td><td class="n">${rng2(f.permit)}</td></tr>`);
  rows.push(`<tr><td>Permit drawing<small>from this page and the AWC DCA 6 details; an engineer only if the township asks</small></td><td class="n">1</td><td class="n">${rng2(f.drawing)}</td><td class="n">${rng2(f.drawing)}</td></tr>`);
  rows.push(`<tr><td>Lumber delivery</td><td class="n">1</td><td class="n">${rng2(f.delivery)}</td><td class="n">incl.</td></tr>`);
  rows.push(`<tr><td>Rentals and tools<small>auger and scaffold for the frame; crimper or hidden-fastener tool for the finish</small></td><td class="n">—</td><td class="n">${rng2(add2(f.toolsFrame, f.toolsFin))}</td><td class="n">incl.</td></tr>`);
  const tot = (lbl, r, on) => `<tr class="tot"${on ? ' style="color:var(--accent)"' : ''}><td colspan="3">${lbl}</td><td class="n">${rng2(r)}</td></tr>`;
  rows.push(tot('All DIY (materials × 1.06 tax + fixed)', E.diy, S.labor === 'diy'));
  rows.push(tot('Hire the frame, DIY the rest', E.split, S.labor === 'split'));
  rows.push(tot('Fully hired', E.hired, S.labor === 'hired'));
  rows.push(`<tr class="sub"><td colspan="4">Per square foot (${Math.round(G.area)} sf): DIY ${k(E.diy[0] / G.area)}–${k(E.diy[1] / G.area)} · split ${k(E.split[0] / G.area)}–${k(E.split[1] / G.area)} · hired ${k(E.hired[0] / G.area)}–${k(E.hired[1] / G.area)}. National 2026 guides quote $30–75/sf for decks 3–4′ up; this one is 10′ up and freestanding, so it runs higher.</td></tr>`);
  $('cost').innerHTML = rows.join('');
  // matrix
  const mx = [`<tr><th>Size</th>${Object.values(MATS).map(m => `<th class="n">${esc(m.short)}</th>`).join('')}</tr>`];
  for (const p of PRESETS) {
    mx.push(`<tr><td><b>${p.id}</b> ${esc(p.name)}<small>${p.W}×${p.D}${p.shape === 'bump' ? ' + bay' : ''} · ${Math.round(geom(Object.assign({}, S, p)).area)} sf</small></td>` + Object.keys(MATS).map(m => {
      const s2 = Object.assign({}, S, { W: p.W, D: p.D, shape: p.shape, mat: m }), e = estimate(s2, geom(s2)).by[S.labor];
      const on = S.W === p.W && S.D === p.D && S.shape === p.shape && S.mat === m;
      return `<td class="cell${on ? ' on' : ''}" data-p="${p.id}" data-m="${m}" tabindex="0">${k(e[0])}<span>to ${k(e[1])}</span></td>`;
    }).join('') + '</tr>');
  }
  $('mx').innerHTML = mx.join('');
  $('mx').onclick = e => { const c = e.target.closest('td.cell'); if (!c) return; const p = PRESETS.find(q => q.id === c.dataset.p); Object.assign(S, { W: p.W, D: p.D, shape: p.shape, mat: c.dataset.m }); update(); };
  $('mx').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } };
  const d = mode => [E.withS[mode][0] - E.noS[mode][0], E.withS[mode][1] - E.noS[mode][1]];
  const sg = geom(Object.assign({}, S, { stairs: S.stairs === 'none' ? 'east' : S.stairs })).stair;
  $('stair-delta').textContent = `The ${sg.side} stair would be ${sg.n} risers at ${inch(sg.rise / 12)} and ${sg.treads} treads, a ${ftin(sg.run)} run, 4′ wide, with guards both sides. It adds ${rng2(d('diy'))} DIY, ${rng2(d('split'))} with the frame crew building the stringers, or ${rng2(d('hired'))} fully hired. Easiest to add while the frame crew is there; adding it later means a second mobilization and two more footings.`;
  $('matnotes').innerHTML = `<tr><th>Decking</th><th>Lasts</th><th>Upkeep</th><th>Underfoot</th></tr>` + Object.values(MATS).map(m => `<tr><td><b>${esc(m.short)}</b></td><td>${esc(m.life)}</td><td>${esc(m.care)}</td><td>${esc(m.heat)}</td></tr>`).join('') + `<tr><td><b>Brick</b></td><td colspan="3">A brick deck surface only works at grade, not 10′ up. Brick shows up two ways here: brick columns around the posts (Posts &amp; columns in the options) and brick pavers on the patio below, which you’re building anyway.</td></tr>`;
}

/* ================= DIY or hire table ================= */
function renderHire(G, E) {
  const nP = G.posts.length, frame = E.lines.filter(l => l.grp === 'frame' || l.grp === 'stairs'), fh = frame.reduce((t, l) => add2(t, [l.mat[0] * TAX * MK[0] + l.lab[0], l.mat[1] * TAX * MK[1] + l.lab[1]]), [0, 0]), fd = frame.reduce((t, l) => add2(t, mul2(l.mat, TAX)), [0, 0]);
  const prem = [fh[0] - fd[0], fh[1] - fd[1]];
  const rows = [
    ['Footings (' + nP + ' holes, 42″ deep)', 'either', 'DIY works: rent a two-person or tow-behind auger, and the clay digs clean. The township inspects the holes before you pour. Hire it if the inspector wants helical piers, which need a machine.', '1 day'],
    ['Posts, beams, joists, knee braces', 'hire', `Hire this. Posts run up to ${ftin(Math.max(...G.posts.map(p => p.h)))} tall and each 3-ply ${Math.round(G.W)}′ beam weighs about ${Math.round(G.W * 9)} lb going up 8′. A freestanding deck stands or falls on its post-to-beam connections and bracing, and a fall from that height is the main way DIY decks hurt people. A crew with scaffolding does it in 2–3 days. It costs about ${rng2(prem)} more than doing it yourself, which is the difference between the DIY and “hire the frame” columns.`, '2–3 crew days'],
    ['Stair stringers (if you add stairs)', 'hire', 'Let the frame crew cut and set them while they’re there. About ' + (G.stair ? G.stair.n : 17) + ' matched risers on long stringers plus two landing footings is fussy work, and a second visit costs more.', 'with the frame'],
    ['Decking and fascia', 'diy', 'Yours. Hidden fasteners or color-matched screws; work off the joists with scaffold planks at the edges. Three people lay it in 2–3 days.', '2–3 days'],
    ['Cable railing', 'diy', 'Yours, with a kit. Drill the posts, run cable, crimp or swage the ends and tension in order from the middle out. Use the kit’s posts, since end posts carry the cable load. Budget a crimper.', '2–3 days'],
    ['Under-deck drainage', 'diy', 'Yours, and it has to go in after the joists and before the decking.', '1–2 days'],
    ['Brick-wrapped posts', 'either', 'Thin brick on cement board is DIY-able. A mason matches the house better; Chimney Mountain thin brick may not exist, so compare samples.', '2 days'],
    ['Deck outlet and lights', 'lom', 'Through Lombardo before drywall (licensed trades, covered by the house permit and warranty). After closing each one needs its own permit and opening the brick. The grill runs on propane tanks, so no gas line.', 'before closing'],
    ['Permit drawing', 'either', 'Draw it from this page using the AWC DCA 6 freestanding-deck details. Pay an engineer only if Almont Twp asks for a stamp at this height.', '1 evening'],
  ];
  const lbl = { diy: 'DIY', hire: 'Hire', either: 'Your call', lom: 'Lombardo' };
  $('hire').innerHTML = `<tr><th>Part</th><th>Who</th><th>Why</th><th>Time</th></tr>` + rows.map(r => `<tr><td><b>${esc(r[0])}</b></td><td><span class="chip ${r[1]}">${lbl[r[1]]}</span></td><td>${esc(r[2])}</td><td class="mono" style="font-size:.8rem;white-space:nowrap">${esc(r[3])}</td></tr>`).join('');
}

/* ================= facts ================= */
function renderFacts() {
  const F = [
    ['Deck off the nook’s east slider, over the walkout', 'Owner', 'c'], ['No stairs planned; stair shown as an option', 'Owner', 'c'],
    ['Brick on the whole first floor, rear wall included', 'Owner', 'c'], ['So the deck is freestanding (no ledger on brick veneer)', 'Code', 'c'],
    ['Lombardo doesn’t build a walkout patio; you build it', 'Owner', 'c'], ['Use: dining with an umbrella table, sunbathing, grill', 'Owner', 'c'],
    ['First floor 889.35, walkout grade about 879.5', 'Plot plan', 'c'], ['Deck surface 889.18, 2″ below the slider sill', 'Assumed', 'a'],
    ['Notch 22.0′ from the nook wall to the house corner; nook sticks out 8.0′', 'Plot plan footprint', 'i'],
    ['Nook slider 6′ wide, 1′ off the rear wall; walkout slider and basement window positions', '3D model', 'i'],
    ['Great room rear window 11.2′ wide, sill 30″', '3D model', 'i'], ['Grade beyond the patio', '3D model grading', 'i'],
    ['Joist and beam spans', 'IRC R507 tables, #2 southern pine, approx.', 'a'], ['House footing projection and depth at the walkout wall', 'Assumed', 'a'],
    ['Natural gas house; the grill will run on propane tanks (no gas stub)', 'Owner', 'c'], ['All prices: 2026 retail ranges, not quotes', 'Assumed', 'a'],
    ['Fence, path, arbor, pergola, patios near the deck', 'Yard Builder plan, updated 2026-10-22', 'c'],
  ];
  const tl = { c: 'Confirmed', i: 'Inferred', a: 'Assumed' };
  $('facts').innerHTML = `<tr><th>Item</th><th>Source</th><th>Status</th></tr>` + F.map(f => `<tr><td>${esc(f[0])}</td><td>${esc(f[1])}</td><td><span class="tag ${f[2]}">${tl[f[2]]}</span></td></tr>`).join('');
}

/* ================= checklist (shared through the page's database) ================= */
const TODO = [
  { id: 'nook-slider', t: 'Ask what Lombardo puts on the nook slider at closing', p: 'With no deck it opens onto a 9′-8″ drop. Ask whether they install a guard bar or lock the panel, and whether the occupancy inspection needs anything.', who: 'Debbie Kern', due: 'Pre-construction meeting' },
  { id: 'lombardo-deck', t: 'Get Lombardo’s deck option price, if they have one', p: 'Compare it to the "hire the frame" total here. A builder deck gets financed at the mortgage rate for 30 years, and contractor quotes for a cash job wait until after closing so they don’t touch underwriting.', who: 'Debbie Kern', due: 'Pre-construction meeting' },
  { id: 'gfci', t: 'Weatherproof GFCI outlet on the rear wall at deck height', p: 'East end, about 18″ above the deck surface (≈ 890.7) and 2–3′ west of the house corner, by the grill. It goes in before the brick.', who: 'Lombardo electrical', due: 'Before brick / pre-drywall walk' },
  { id: 'light', t: 'Exterior light at the nook slider, switched inside', p: 'On the brick beside the slider, high enough to clear a 36–42″ guard. Optional second switched box for string lights at the east end.', who: 'Lombardo electrical', due: 'Pre-drywall walk' },
  { id: 'under', t: 'Power on the walkout wall for the patio below', p: 'A GFCI outlet and a switched box on the basement walkout wall if you add under-deck drainage and a fan or lights later.', who: 'Lombardo electrical', due: 'Pre-drywall walk' },
  { id: 'hose', t: 'Hose bib on the rear wall', p: 'Near the walkout, for washing the deck and patio. Check the base plan; add if missing.', who: 'Lombardo plumbing', due: 'Plumbing rough-in' },
  { id: 'vents', t: 'Keep vents and the AC off the deck zone', p: 'Find where the fireplace direct-vent cap, furnace and water heater vents, dryer vent and AC condenser land. None should end up under the deck, beside the stair, or within the vent maker’s clearance of the deck surface.', who: 'Debbie / site super', due: 'Pre-construction meeting' },
  { id: 'footing', t: 'Get the rear foundation footing detail', p: 'How far the walkout wall’s footing sticks out past the brick and how deep it sits. Sets where the house-side deck footings go.', who: 'Site super', due: 'Before backfill' },
  { id: 'grade', t: 'Confirm final grade under the deck at about 879.5', p: 'Ask that the patio area be left flat and free of stockpiles and debris, and where the sump discharge exits so footings miss it.', who: 'Site super', due: 'Before final grade' },
  { id: 'hoa', t: 'Submit the deck plan for Developer approval', p: 'Plan, rear elevation and materials from this page. Rear yard only; nothing over a utility easement.', who: 'You → Lombardo (Developer)', due: 'After closing, before building' },
  { id: 'permit', t: 'Almont Twp building permit', p: 'Freestanding deck, about 10′ high. Ask whether they want an engineer’s stamp. Call MISS DIG 811 before digging.', who: 'You', due: 'After closing, before building' },
];
let TD = {}; let DB = null, dbMode = 'local';
try { TD = JSON.parse(localStorage.getItem('dk01-todo') || '{}') || {}; } catch (e) { TD = {}; }
function renderTodo() {
  $('todo').innerHTML = TODO.map(it => { const s = TD[it.id] || {}; return `<li class="${s.done ? 'done' : ''}"><input type="checkbox" id="td-${it.id}" data-id="${it.id}" ${s.done ? 'checked' : ''} aria-label="${esc(it.t)}"><div><b>${esc(it.t)}</b><p>${esc(it.p)}</p><textarea id="tn-${it.id}" data-id="${it.id}" rows="1" placeholder="Notes (what Lombardo said, price, date)">${esc(s.note || '')}</textarea></div><div class="who"><span class="tag ${/After/.test(it.due) ? 'i' : 'a'}">${esc(it.due)}</span><span>${esc(it.who)}</span></div></li>`; }).join('');
  const done = TODO.filter(it => (TD[it.id] || {}).done).length;
  $('todo-sync').textContent = `${done} of ${TODO.length} done · ` + (dbMode === 'db' ? 'shared, saves for everyone' : dbMode === 'wait' ? 'connecting…' : 'saved in this browser only');
}
async function saveTodo(id) {
  const s = TD[id] || {}; try { localStorage.setItem('dk01-todo', JSON.stringify(TD)); } catch (e) { }
  if (DB) { try { await DB.collection('checklist').doc(id).set({ done: !!s.done, note: s.note || '', at: new Date().toISOString() }); } catch (e) { $('todo-sync').textContent = 'Couldn’t save to the shared list; kept in this browser.'; } }
  renderTodoSum();
}
function renderTodoSum() { const done = TODO.filter(it => (TD[it.id] || {}).done).length; $('todo-sync').textContent = `${done} of ${TODO.length} done · ` + (dbMode === 'db' ? 'shared, saves for everyone' : 'saved in this browser only'); }
$('todo').addEventListener('change', e => { const id = e.target.dataset.id; if (!id) return; TD[id] = Object.assign({}, TD[id]); if (e.target.type === 'checkbox') { TD[id].done = e.target.checked; e.target.closest('li').classList.toggle('done', e.target.checked); } else TD[id].note = e.target.value; saveTodo(id); });

/* ================= 3D ================= */
const V3 = { ok: false };
const W3 = (x, y, e) => new THREE.Vector3(x, e - Z0, -y);
function lam(c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})); }
function init3D() {
  const host = $('v3d');
  if (!window.THREE || !THREE.OrbitControls) { $('vtag').textContent = '3D view couldn’t load (three.js blocked). The plan, elevation and costs below still work.'; return; }
  try {
    const R = new THREE.WebGLRenderer({ antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(R.domElement);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 1, 0.3, 3000);
    const ctl = new THREE.OrbitControls(cam, R.domElement); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.495; ctl.minDistance = 3; ctl.maxDistance = 400;
    sc.add(new THREE.HemisphereLight(0xe6eef5, 0x6b6450, 0.55));
    const sun = new THREE.DirectionalLight(0xfff3df, 0.9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sh = sun.shadow.camera; sh.left = -70; sh.right = 70; sh.top = 70; sh.bottom = -70; sh.near = 1; sh.far = 400; sun.shadow.bias = -0.0006;
    sc.add(sun); sc.add(sun.target); sun.target.position.copy(W3(133, 142, 885));
    Object.assign(V3, { R, sc, cam, ctl, sun, host, ok: true });
    buildGround(); buildContext();
    try { const H = housePort(); H.traverse(m => { if (m.isMesh) { m.castShadow = m.castShadow !== false; m.receiveShadow = true; } }); sc.add(H); V3.house = H; } catch (e) { console.warn('house model', e); }
    V3.deck = new THREE.Group(); sc.add(V3.deck);
    const rs = () => { const w = host.clientWidth, h = host.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); V3.dirty = true; };
    new ResizeObserver(rs).observe(host); rs();
    ctl.addEventListener('change', () => V3.dirty = true);
    camPreset('yard');
    const loop = () => { requestAnimationFrame(loop); if (ctl.update() || V3.dirty) { R.render(sc, cam); V3.dirty = false; } };
    loop();
    theme3D(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme3D);
    new MutationObserver(theme3D).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) { console.warn(e); $('vtag').textContent = '3D view couldn’t start on this device. The plan, elevation and costs below still work.'; V3.ok = false; }
}
function theme3D() { if (!V3.ok) return; const dk = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); V3.sc.background = new THREE.Color(dk ? 0x1d2429 : 0xc9d8e2); V3.sc.fog = new THREE.Fog(V3.sc.background, 180, 520); V3.dirty = true; }
function buildGround() {
  /* grid lines every 2′, plus every house wall line, so the terrain meets the foundation cleanly; cells inside the
     house footprint are left out, so the ground never runs through the basement (its floor slab shows instead) */
  const lines = (a, b, extra) => { const v = new Set(); for (let t = a; t <= b + 1e-6; t += 2) v.add(+t.toFixed(3)); extra.forEach(e => v.add(+e.toFixed(3))); return [...v].sort((p, q) => p - q); };
  const xs = lines(30, 290, HRECTS.flatMap(h => [HX + h[0], HX + h[1]])), ys = lines(60, 262, HRECTS.flatMap(h => [HY + h[2], HY + h[3]]).concat([PAT.y1]));
  const nx = xs.length, ny = ys.length, pos = new Float32Array(nx * ny * 3), col = new Float32Array(nx * ny * 3), idx = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], y = ys[j], h = pyH(x, y) - (x >= PAT.x0 && x <= PAT.x1 && y >= PAT.y0 && y <= PAT.y1 ? 0.06 : 0), q = (j * nx + i) * 3, v = W3(x, y, h);
    pos[q] = v.x; pos[q + 1] = v.y; pos[q + 2] = v.z; const t = 0.9 + 0.1 * Math.sin(x * 0.7) * Math.cos(y * 0.5);
    col[q] = 0.36 * t; col[q + 1] = 0.52 * t; col[q + 2] = 0.27 * t;
  }
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (inHouseCut((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2)) continue;
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; V3.sc.add(m);
  // level basement floor under the whole footprint, and the garage slab, so the openings look onto floor, not grass
  for (const h of HRECTS.slice(0, 3)) V3.sc.add(box3(HX + h[0], HX + h[1], HY + h[2], HY + h[3], EL.B - 0.5, EL.B, lam(0xb7b5ae)));
  { const h = HRECTS[3]; V3.sc.add(box3(HX + h[0], HX + h[1], HY + h[2], HY + h[3], EL.G - 0.5, EL.G, lam(0xb7b5ae))); }
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), lam(0x5d7a45)); far.rotation.x = -Math.PI / 2; far.position.y = 858 - Z0; V3.sc.add(far);
  const patio = box3(122.54, 144.54, 134.73, 150.73, PATIO - 0.2, PATIO + 0.06, lam(0xb5b0a6)); patio.receiveShadow = true; V3.sc.add(patio);
}
function box3(x0, x1, y0, y1, e0, e1, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, x1 - x0), Math.max(0.01, e1 - e0), Math.max(0.01, y1 - y0)), mat); m.position.set((x0 + x1) / 2, (e0 + e1) / 2 - Z0, -(y0 + y1) / 2); m.castShadow = true; m.receiveShadow = true; return m; }
function rod(a, b, w, h, mat) { const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.castShadow = true; m.receiveShadow = true; return m; }
function flat(pts, e, mat) { const shp = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); const g = new THREE.ShapeGeometry(shp); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.scale.z = -1; m.position.y = e - Z0; m.receiveShadow = true; return m; }
function buildContext() {
  const G = (V3.yardG = new THREE.Group()), wood = lam(0x7b5a3a), pav = lam(0xa8a397), stone = lam(0x8f8b80), grn = lam(0x557a3c);
  for (const e of PLAN) {
    if (e.t === 'bed' && (e.mat === 'permpav' || e.mat === 'pavers')) { const pts = e.pts, eg = Math.min(...pts.map(p => groundH(p[0], p[1]))); const m = flat(pts.map(p => [p[0], p[1]]), eg + 0.08, pav); m.material.side = THREE.DoubleSide; G.add(m); }
    if (e.t === 'path' && e.mat === 'flagstone') for (let i = 0; i + 1 < e.pts.length; i++) { const [a, b] = [e.pts[i], e.pts[i + 1]]; const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2); for (let j = 0; j < n; j++) { const t0 = j / n, t1 = (j + 1) / n, p = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], q = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]; const A = W3(p[0], p[1], groundH(p[0], p[1]) + 0.08), B = W3(q[0], q[1], groundH(q[0], q[1]) + 0.08); G.add(rod(A, B, e.w, 0.12, stone)); } }
    if (e.t === 'path' && e.mat === 'splitrail') for (let i = 0; i + 1 < e.pts.length; i++) { const [a, b] = [e.pts[i], e.pts[i + 1]]; for (const hgt of [1.4, 2.8]) G.add(rod(W3(a[0], a[1], groundH(a[0], a[1]) + hgt), W3(b[0], b[1], groundH(b[0], b[1]) + hgt), 0.25, 0.25, wood)); G.add(box3(a[0] - 0.2, a[0] + 0.2, a[1] - 0.2, a[1] + 0.2, groundH(a[0], a[1]), groundH(a[0], a[1]) + 3.4, wood)); }
    if (e.t === 'st') { const r = stRect(e), g0 = groundH(e.x, e.y);
      if (e.k === 'pergola' || e.k === 'arbor') { const hh = e.k === 'pergola' ? 8.5 : 7.5; for (const [x, y] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]]) G.add(box3(x - 0.25, x + 0.25, y - 0.25, y + 0.25, g0, g0 + hh, wood)); G.add(box3(r.x0 - 0.5, r.x1 + 0.5, r.y0, r.y0 + 0.3, g0 + hh - 0.6, g0 + hh, wood)); G.add(box3(r.x0 - 0.5, r.x1 + 0.5, r.y1 - 0.3, r.y1, g0 + hh - 0.6, g0 + hh, wood)); }
      else if (e.k === 'raised') G.add(box3(r.x0, r.x1, r.y0, r.y1, g0, g0 + 1.4, lam(0x9a7a55)));
      else G.add(box3(r.x0, r.x1, r.y0, r.y1, g0, g0 + 3, wood)); }
    if (e.t === 'plant') { const s = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 8), grn); s.position.copy(W3(e.x, e.y, groundH(e.x, e.y) + 3.5)); s.castShadow = true; G.add(s); }
  }
  G.traverse(m => { if (m.isMesh) m.receiveShadow = true; });
  G.visible = !!S.yard; V3.sc.add(G);
}
const MAT3 = {};
let BRICK3 = null;
function brickMat() {
  if (BRICK3) return BRICK3;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  g.fillStyle = '#b3a897'; g.fillRect(0, 0, 256, 256); const rows = 9, bh = 256 / rows, bw = 256 / 3;
  const cols = ['#6e4a3a', '#7b5443', '#855d49', '#5f4034', '#74503f', '#8d6650', '#694637'];
  for (let j = 0; j < rows; j++) for (let i = -1; i < 4; i++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(i * bw + (j % 2 ? bw / 2 : 0) + 2, j * bh + 2, bw - 4, bh - 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.33 / 2, 7.4 / 2);   // modular brick: 3 bricks per 2′, 9 courses per 2′
  return (BRICK3 = new THREE.MeshLambertMaterial({ map: t }));
}
const m3 = (key, c, o) => MAT3[key] || (MAT3[key] = lam(c, o));
function build3D(G, F) {
  if (!V3.ok) return;
  const grp = V3.deck; while (grp.children.length) { const c = grp.children.pop(); c.geometry && c.geometry.dispose(); }
  const add = m => grp.add(m), L = u => X0 + u, V = v => Y0 + v;
  const pt = lam(0x8a7458), M = MATS[S.mat], tone = new THREE.Color(M.tones[S.tone]);
  const boards = [0, 1, 2].map(i => lam(tone.clone().offsetHSL(0, 0, (i - 1) * 0.025)));
  const rcol = RAILS[S.rail].col ? new THREE.Color(RAILS[S.rail].col) : tone.clone().offsetHSL(0, 0, 0.05);
  const rail = lam(rcol), steel = lam(0xc9cdd1);
  // framing
  for (const p of G.posts) { const x = L(p.u), y = V(p.v), g = p.grade; add(box3(x - 0.75, x + 0.75, y - 0.75, y + 0.75, g - 0.05, g + 0.17, lam(0xb8b4ab))); const wr = S.posts !== 'plain' && (S.brickAll || p.beam !== 'inner');
    if (wr && S.posts === 'brick') { add(box3(x - 0.83, x + 0.83, y - 0.83, y + 0.83, g, g + 0.33, m3('cap', 0xd8d3c7))); const col = box3(x - 0.67, x + 0.67, y - 0.67, y + 0.67, g + 0.33, BEAM_BOT - 0.25, brickMat()); add(col); add(box3(x - 0.83, x + 0.83, y - 0.83, y + 0.83, BEAM_BOT - 0.25, BEAM_BOT, m3('cap', 0xd8d3c7))); }
    else if (wr) { add(box3(x - 0.33, x + 0.33, y - 0.33, y + 0.33, g + 0.17, BEAM_BOT, m3('sleeve', 0xf3f1ec))); add(box3(x - 0.4, x + 0.4, y - 0.4, y + 0.4, g + 0.17, g + 0.5, m3('sleeve', 0xf3f1ec))); }
    else add(box3(x - 0.23, x + 0.23, y - 0.23, y + 0.23, g + 0.17, BEAM_BOT, pt));
    if (!wr) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const ux = p.u + dx, vy = p.v + dy; if (ux < 0.2 || ux > G.W - 0.2 || vy < 0.2 || vy > G.Dmax - 0.2) continue; if (dy && Math.abs(p.v - G.vb0) < 0.01 && dy < 0) continue; add(rod(W3(x, y, BEAM_BOT - 2), W3(x + dx, y + dy, BEAM_BOT - 0.02), 0.29, 0.29, pt)); } }
  for (const b of G.beams) add(box3(L(b.u0), L(b.u1), V(b.v) - 0.19, V(b.v) + 0.19, BEAM_BOT, JOIST_BOT, pt));
  for (let u = 0.06; u < G.W; u += 16 / 12) for (const [a, b] of scan(G.poly.map(q => [q[1], q[0]]), u)) add(box3(L(u) - 0.0625, L(u) + 0.0625, V(a) + 0.03, V(b) - 0.03, JOIST_BOT, TOP - DECK_T, pt));
  for (const sg of G.segs) { const a = sg.a, b = sg.b; add(rod(W3(L(a[0]), V(a[1]), TOP - 0.47), W3(L(b[0]), V(b[1]), TOP - 0.47), 0.1, 0.78, sg.open ? boards[1] : pt)); }
  if (S.drain) { const m = flat(G.poly.map(q => [L(q[0]), V(q[1])]), JOIST_BOT - 0.04, lam(0xdcdad4, { side: THREE.DoubleSide })); add(m); }
  // decking
  if (!S.frame) {
    if (S.mat === 'porc') { for (let v = 0; v < G.Dmax - 0.01; v += 2) for (let u = 0; u < G.W - 0.01; u += 2) { const c = [u + 1, v + 1]; if (!inPoly(c, G.poly)) continue; add(box3(L(u) + 0.02, L(Math.min(u + 2, G.W)) - 0.02, V(v) + 0.02, V(Math.min(v + 2, G.Dmax)) - 0.02, TOP - DECK_T, TOP, boards[((u + v) / 2) % 3])); } }
    else { let i = 0; for (let v = 0; v < G.Dmax - 0.05; v += 0.479) { for (const [a, b] of scan(G.poly, v + 0.23)) add(box3(L(a) + 0.01, L(b) - 0.01, V(v) + 0.01, V(Math.min(v + 0.458, G.Dmax)), TOP - DECK_T, TOP, boards[i % 3])); i++; } }
  }
  // railing
  const gH = S.guard / 12, sp = RAILS[S.rail].sp;
  for (const sg of G.railSegs) {
    const a = [L(sg.a[0]), V(sg.a[1])], b = [L(sg.b[0]), V(sg.b[1])], len = sg.len, n = Math.max(1, Math.ceil(len / sp - 1e-6));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, s = S.rail === 'wood' ? 0.15 : 0.11; add(box3(x - s, x + s, y - s, y + s, TOP, TOP + gH + 0.04, rail)); }
    add(rod(W3(a[0], a[1], TOP + gH), W3(b[0], b[1], TOP + gH), S.rail === 'wood' ? 0.46 : 0.22, 0.12, rail));
    if (S.rail === 'cable') { for (let e = TOP + 0.28; e < TOP + gH - 0.12; e += 0.25) add(rod(W3(a[0], a[1], e), W3(b[0], b[1], e), 0.02, 0.02, steel)); }
    else { add(rod(W3(a[0], a[1], TOP + 0.25), W3(b[0], b[1], TOP + 0.25), 0.15, 0.1, rail)); const pitch = S.rail === 'wood' ? 0.46 : 0.375, m = Math.floor(len / pitch); for (let i = 1; i < m; i++) { const t = i / m, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, s = S.rail === 'wood' ? 0.06 : 0.03; add(box3(x - s, x + s, y - s, y + s, TOP + 0.3, TOP + gH - 0.06, rail)); } }
  }
  // stairs
  if (G.stair) {
    const st = G.stair, d = st.dir, top0 = [L(st.a[0]), V(st.a[1])], top1 = [L(st.b[0]), V(st.b[1])];
    const across = [top1[0] - top0[0], top1[1] - top0[1]];
    for (let i = 0; i < st.stringers; i++) { const f = i / (st.stringers - 1); const px = top0[0] + across[0] * (0.04 + 0.92 * f), py = top0[1] + across[1] * (0.04 + 0.92 * f); add(rod(W3(px, py, TOP - 0.85), W3(px + d[0] * st.run, py + d[1] * st.run, st.foot.g + 0.1), 0.125, 0.9, pt)); }
    for (let i = 0; i < st.treads; i++) { const off = i * 10.5 / 12, e = TOP - (i + 1) * st.rise / 12; const x0 = top0[0] + d[0] * off, y0 = top0[1] + d[1] * off, x1 = top1[0] + d[0] * (off + 11.25 / 12), y1 = top1[1] + d[1] * (off + 11.25 / 12); add(box3(Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1), e - DECK_T, e, boards[i % 3])); }
    for (const side of [top0, top1]) { const A = W3(side[0], side[1], TOP + 3), B = W3(side[0] + d[0] * st.run, side[1] + d[1] * st.run, st.foot.g + 3); add(rod(A, B, 0.2, 0.12, rail)); add(box3(side[0] + d[0] * st.run - 0.15, side[0] + d[0] * st.run + 0.15, side[1] + d[1] * st.run - 0.15, side[1] + d[1] * st.run + 0.15, st.foot.g, st.foot.g + 3.1, rail)); if (S.rail === 'cable') for (let k2 = 0.6; k2 < 2.9; k2 += 0.3) add(rod(W3(side[0], side[1], TOP + k2), W3(side[0] + d[0] * st.run, side[1] + d[1] * st.run, st.foot.g + k2), 0.02, 0.02, steel)); }
    const fx = top0[0] + d[0] * st.run, fy = top0[1] + d[1] * st.run; add(box3(Math.min(fx, top1[0] + d[0] * st.run) - (d[1] ? 0 : 0), Math.max(fx, top1[0] + d[0] * st.run) + d[0] * 4, Math.min(fy, top1[1] + d[1] * st.run), Math.max(fy, top1[1] + d[1] * st.run) + d[1] * 4, st.foot.g - 0.1, st.foot.g + 0.08, lam(0xa9a497)));
  }
  // furniture
  const fab = m3('fab', 0x3c4247), white = m3('white', 0xeeeae2), um = m3('umb', 0xd9d2c3, { side: THREE.DoubleSide }), blk = m3('blk', 0x1e2022);
  for (const it of (S.showFurn ? F.items : [])) {
    if (it.kind === 'table') { const c = W3(L(it.u), V(it.v), TOP); const top = new THREE.Mesh(new THREE.CylinderGeometry(it.top, it.top, 0.1, 28), white); top.position.copy(c).add(new THREE.Vector3(0, 2.45, 0)); top.castShadow = true; add(top); add(box3(L(it.u) - 0.1, L(it.u) + 0.1, V(it.v) - 0.1, V(it.v) + 0.1, TOP, TOP + 7.4, blk));
      if (it.R > 4) { const cone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.6, 8, 1, true), um); cone.position.copy(c).add(new THREE.Vector3(0, 7.6, 0)); cone.castShadow = true; add(cone); }
      const n = it.R > 5.5 ? 6 : it.R > 4 ? 4 : 2; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = it.top + 0.9, x = L(it.u) + Math.cos(a) * r, y = V(it.v) + Math.sin(a) * r; add(box3(x - 0.75, x + 0.75, y - 0.75, y + 0.75, TOP, TOP + 1.5, fab)); } }
    else if (it.kind === 'grill') { add(box3(L(it.u0), L(it.u1), V(it.v0), V(it.v1), TOP, TOP + 3.0, blk)); add(box3(L(it.u0) + 0.2, L(it.u1) - 0.2, V(it.v0) + 1.2, V(it.v1) - 1.2, TOP + 3.0, TOP + 3.9, blk)); }
    else if (it.u1 - it.u0 > it.v1 - it.v0) { const vm = V((it.v0 + it.v1) / 2); add(box3(L(it.u0), L(it.u1) - 1.8, V(it.v0), V(it.v1), TOP + 0.9, TOP + 1.3, fab)); add(rod(W3(L(it.u1) - 1.9, vm, TOP + 1.1), W3(L(it.u1) - 0.3, vm, TOP + 2.9), it.v1 - it.v0, 0.35, fab)); }
    else { add(box3(L(it.u0), L(it.u1), V(it.v0), V(it.v1) - 1.8, TOP + 0.9, TOP + 1.3, fab)); add(rod(W3((L(it.u0) + L(it.u1)) / 2, V(it.v1) - 1.9, TOP + 1.1), W3((L(it.u0) + L(it.u1)) / 2, V(it.v1) - 0.3, TOP + 2.9), it.u1 - it.u0, 0.35, fab)); }
  }
  V3.dirty = true;
}
function setSun() {
  if (!V3.ok) return;
  const dt = DATES.find(d => d.id === S.date) || DATES[2], s = sunPos(dt.m, dt.d, S.hour), d = s.dir;
  const t = W3(133, 142, 885); V3.sun.target.position.copy(t);
  V3.sun.position.set(t.x + d[0] * 150, t.y + Math.max(0.02, d[2]) * 150, t.z - d[1] * 150);
  V3.sun.intensity = s.alt > 0 ? 0.35 + 0.6 * Math.min(1, s.alt / (25 * D2R)) : 0.05; V3.dirty = true;
  $('vtag').textContent = `${S.W}×${S.D} · ${MATS[S.mat].short} · ${RAILS[S.rail].name} · ${dt.name} ${hourLabel(S.hour).split(' · ')[0]}`;
}
const CAMS = {
  yard: [[150, 206, 898], [134, 142, 886]], slider: [[123.6, 138.7, FF + 5.3], [150, 152, TOP + 2.2]], great: [[134.6, 131.2, FF + 5.2], [134.6, 165, FF + 2]],
  under: [[127, 160, PATIO + 5.4], [137, 138, PATIO + 3.5]], top: [[134, 146, 962], [134, 145.9, 889]],
};
function camPreset(kk) { if (!V3.ok) return; if (kk === 'cols') { const G = LAST ? LAST.G : geom(S); CAMS.cols = [[X0 - 3, Y0 + G.Dmax + 13, PATIO + 4.8], [X0 + G.W * 0.55, Y0 + G.vb1, (PATIO + BEAM_BOT) / 2 + 0.8]]; } const [p, t] = CAMS[kk]; V3.cam.position.copy(W3(...p)); V3.ctl.target.copy(W3(...t)); V3.ctl.update(); V3.dirty = true; document.querySelectorAll('[data-cam]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cam === kk))); }
document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => camPreset(b.dataset.cam)));

/* ================= update ================= */
let LAST = null;
function update(opts) {
  S.W = Math.max(14, Math.min(32, Math.round(S.W))); S.D = Math.max(8, Math.min(18, Math.round(S.D)));
  const G = geom(S), F = furniture(eff(S), G), E = estimate(S, G);
  const sN = Object.assign({}, S, { stairs: 'none' }), sE = Object.assign({}, S, { stairs: S.stairs === 'none' ? 'east' : S.stairs });
  E.noS = estimate(sN, geom(sN)).by; E.withS = estimate(sE, geom(sE)).by;
  const dt = DATES.find(d => d.id === S.date) || DATES[2], sun = sunMap(G, dt), sunJun = sunMap(G, DATES[1]);
  renderPanel(G, E); renderFurn(F);
  $('sm-size').textContent = `${S.W}′ × ${S.D}′${G.bump ? ' + bay' : ''}`;
  $('sm-desc').textContent = `${Math.round(G.area)} sf · ${MATS[S.mat].short} · ${RAILS[S.rail].name}${G.stair ? ' · stairs' : ''}`;
  $('sm-diy').textContent = rng2(E.diy); $('sm-split').textContent = rng2(E.split); $('sm-hired').textContent = rng2(E.hired);
  $('sm-psf').textContent = `${k(E.hired[0] / G.area)}–${k(E.hired[1] / G.area)} per sf`;
  ['diy', 'split', 'hired'].forEach(m => $('sm-' + m + '-box').classList.toggle('on', S.labor === m));
  $('pn-lbl').textContent = 'Your deck · ' + LABOR[S.labor].toLowerCase(); $('pn-cost').textContent = rng2(E.by[S.labor]);
  $('pn-desc').textContent = `${S.W}×${S.D}${G.bump ? ' + bay' : ''} · ${Math.round(G.area)} sf · ${MATS[S.mat].short} · ${RAILS[S.rail].name} ${S.guard}″${G.stair ? ' · stairs' : ''} · ${sun.avg.toFixed(1)} h sun ${dt.name}`;
  $('tb-h').textContent = `${TOP} · ${ftin(TOP - PATIO)} above patio`;
  const C = checks(eff(S), G, F, E, sun, sunJun);
  $('checks').innerHTML = C.map(c => `<li class="${c.s}"><span class="st">${{ ok: 'OK', warn: 'Check', bad: 'Fix', info: 'Note' }[c.s]}</span><div><b>${esc(c.t)}</b><span>${esc(c.d)}</span></div></li>`).join('');
  const nW = C.filter(c => c.s === 'warn').length, nB = C.filter(c => c.s === 'bad').length;
  $('chk-sum').textContent = `${C.filter(c => c.s === 'ok').length} ok · ${nW} to check · ${nB} to fix`;
  $('chk-n').textContent = nW + nB; $('chk-t').textContent = nB ? 'to fix / check' : 'to check'; $('chk-link').classList.toggle('allok', !(nW + nB));
  renderPlan(G, F, sun); renderElev(G); renderCost(G, E); renderHire(G, E); renderCmp();
  $('vsum').textContent = S.view === 'elev' ? ELEV_SUM : PLAN_SUM;
  if (!opts || !opts.noBuild) build3D(G, F);
  setSun(); persist(); LAST = { G, E, F, sun };
}
/* views */
function setView(v) {
  S.view = v;
  for (const [id, key] of [['v3d', '3d'], ['vplan', 'plan'], ['velev', 'elev']]) $(id).hidden = key !== v;
  for (const b of document.querySelectorAll('.vtabs .tab')) b.setAttribute('aria-selected', String(b.dataset.view === v));
  $('bar-3d').hidden = v !== '3d'; $('bar-plan').hidden = v !== 'plan';
  $('vsum').textContent = v === 'elev' ? ELEV_SUM : PLAN_SUM; persist();
  if (v === '3d' && V3.ok) { V3.dirty = true; window.dispatchEvent(new Event('resize')); }
  if (v === 'plan') centerPlan();
}
function centerPlan() { const el = $('vplan'); if (!el || el.hidden || el.scrollWidth <= el.clientWidth) return; const f = (X0 + S.W / 2 - PV.x0) / (PV.x1 - PV.x0); el.scrollLeft = Math.max(0, f * el.scrollWidth - el.clientWidth / 2); }
document.querySelectorAll('.vtabs .tab').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
document.querySelector('.vtabs').addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const order = ['3d', 'plan', 'elev'], i = order.indexOf(S.view), n = order[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; setView(n); $('tab-' + n).focus(); });
function setPin(on) { S.pinned = on; $('viewer').classList.toggle('unpinned', !on); $('b-pin').setAttribute('aria-pressed', String(on)); $('b-pin').textContent = on ? 'Pinned' : 'Pin view'; persist(); }
$('b-pin').addEventListener('click', () => setPin(!S.pinned));
/* drag-to-resize in the plan: the view is frozen at its largest extent while dragging so the handle stays under the pointer */
{
  const svg = $('plan'); let drag = null;
  const toLot = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x + PV.x0, PV.y1 - q.y]; };
  svg.addEventListener('pointerdown', e => { const h = e.target.closest('.hdl'); if (!h) return; e.preventDefault();
    drag = { h: h.dataset.h };
    svg.setPointerCapture(e.pointerId); svg.classList.add('dragging'); });
  svg.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = toLot(e); let ch = false;
    if (drag.h.includes('w')) { const w = Math.max(14, Math.min(32, Math.round(x - X0))); if (w !== S.W) { S.W = w; ch = true; } }
    if (drag.h.includes('d')) { const d = Math.max(8, Math.min(18, Math.round(y - Y0 - (S.shape === 'bump' ? 0 : 0)))); if (d !== S.D) { S.D = d; ch = true; } }
    if (ch) update({ noBuild: true }); });
  const end = () => { if (!drag) return; drag = null; svg.classList.remove('dragging'); update(); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', e => { const m = { ArrowRight: ['W', 1], ArrowLeft: ['W', -1], ArrowUp: ['D', 1], ArrowDown: ['D', -1] }[e.key]; if (!m) return; e.preventDefault(); S[m[0]] += m[1]; update(); });
  svg.setAttribute('tabindex', '0');
}
$('r-w').addEventListener('input', e => { S.W = +e.target.value; update({ noBuild: true }); });
$('r-d').addEventListener('input', e => { S.D = +e.target.value; update({ noBuild: true }); });
['r-w', 'r-d'].forEach(id => $(id).addEventListener('change', () => update()));
$('r-hour').addEventListener('input', e => { S.hour = +e.target.value; $('o-hour').textContent = hourLabel(S.hour); setSun(); persist(); });
$('c-drain').addEventListener('change', e => { S.drain = e.target.checked; update(); });
$('c-brickall').addEventListener('change', e => { S.brickAll = e.target.checked; update(); });
$('b-cols').addEventListener('click', () => { if (S.posts === 'plain') S.posts = 'brick'; update(); setView('3d'); camPreset('cols'); });
$('c-heat').addEventListener('change', e => { S.heat = e.target.checked; update({ noBuild: true }); });
const toggleYard = () => { S.yard = !S.yard; if (V3.yardG) V3.yardG.visible = S.yard; V3.dirty = true; update({ noBuild: true }); };
$('b-yard3').addEventListener('click', toggleYard); $('b-yard2').addEventListener('click', toggleYard);
const toggleFurn = () => { S.showFurn = !S.showFurn; update(); };
$('c-furn').addEventListener('change', e => { S.showFurn = e.target.checked; update(); });
$('b-furn2').addEventListener('click', toggleFurn); $('b-furn3').addEventListener('click', toggleFurn);
$('b-frame').addEventListener('click', () => { S.frame = !S.frame; update(); });
$('b-reset').addEventListener('click', () => { const v = S.view, p = S.pinned; S = Object.assign({}, DEF, { view: v, pinned: p }); update(); camPreset('yard'); });
document.querySelectorAll('.summary [data-labor]').forEach(b => b.addEventListener('click', () => { S.labor = b.dataset.labor; update({ noBuild: true }); }));
let PLAY = null;
$('b-play').addEventListener('click', e => {
  const btn = $('b-play');
  if (PLAY) { clearInterval(PLAY); PLAY = null; btn.setAttribute('aria-pressed', 'false'); return; }
  btn.setAttribute('aria-pressed', 'true'); if (S.hour >= 20.9) S.hour = 6;
  PLAY = setInterval(() => { S.hour = Math.round((S.hour + 0.25) * 4) / 4; if (S.hour > 21) { clearInterval(PLAY); PLAY = null; btn.setAttribute('aria-pressed', 'false'); S.hour = 21; } $('r-hour').value = S.hour; $('o-hour').textContent = hourLabel(S.hour); setSun(); }, 220);
});

/* ================= compare (this browser) ================= */
const CMP_KEYS = ['W', 'D', 'shape', 'mat', 'tone', 'rail', 'guard', 'stairs', 'drain', 'posts', 'brickAll'];
let CMP = []; try { CMP = JSON.parse(localStorage.getItem('dk01-cmp') || '[]') || []; } catch (e) { CMP = []; }
const cmpKey = c => CMP_KEYS.map(kk => c[kk]).join('|');
function renderCmp() {
  const el = $('cmp');
  if (!CMP.length) { el.innerHTML = '<div class="empty">Nothing to compare yet. Set up a layout and press “Add to compare” in the options. Add up to four.</div>'; return; }
  const dt = DATES.find(d => d.id === 'aug1');
  const rows = CMP.map((c, i) => { const s2 = Object.assign({}, S, c), G = geom(s2), E = estimate(s2, G), sun = sunMap(G, dt), on = cmpKey(c) === cmpKey(S);
    return `<tr class="${on ? 'cur' : ''}"><td><b>${c.W}×${c.D}</b>${c.shape !== 'rect' ? ' ' + c.shape : ''}<small>${Math.round(G.area)} sf</small></td><td>${esc(MATS[c.mat].short)}<small>${c.tone}</small></td><td>${esc(RAILS[c.rail].name)} ${c.guard}″<small>${c.stairs === 'none' ? 'no stairs' : c.stairs + ' stairs'}${c.drain ? ' · drainage' : ''}${c.posts === 'brick' ? ' · brick columns' : c.posts === 'sleeve' ? ' · post sleeves' : ''}</small></td><td class="n">${sun.avg.toFixed(1)} h</td><td class="n">${rng2(E.diy)}</td><td class="n">${rng2(E.split)}</td><td class="n">${rng2(E.hired)}</td><td class="n"><button class="btn sm" type="button" data-load="${i}">Load</button> <button class="btn sm" type="button" data-del="${i}" aria-label="Remove from compare">✕</button></td></tr>`; });
  el.innerHTML = `<table class="cmp"><tr><th>Size</th><th>Decking</th><th>Railing</th><th class="n">Sun, Aug 1</th><th class="n">All DIY</th><th class="n">Hire the frame</th><th class="n">Fully hired</th><th></th></tr>${rows.join('')}</table>`;
}
$('cmp').addEventListener('click', e => { const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
  if (l) { Object.assign(S, CMP[+l.dataset.load]); update(); $('viewer').scrollIntoView({ block: 'start' }); }
  if (d) { CMP.splice(+d.dataset.del, 1); try { localStorage.setItem('dk01-cmp', JSON.stringify(CMP)); } catch (er) { } renderCmp(); } });
$('b-cmp').addEventListener('click', () => {
  const c = {}; CMP_KEYS.forEach(kk => c[kk] = S[kk]);
  if (!CMP.some(x => cmpKey(x) === cmpKey(c))) { CMP.push(c); if (CMP.length > 4) CMP.shift(); }
  try { localStorage.setItem('dk01-cmp', JSON.stringify(CMP)); } catch (e) { }
  renderCmp(); $('b-cmp').textContent = `In compare (${CMP.length})`; setTimeout(() => $('b-cmp').textContent = 'Add to compare', 1600);
});

/* ================= our pick (shared) ================= */
$('b-save').addEventListener('click', async () => {
  if (!LAST) return;
  const { G, E } = LAST;
  const pick = { W: S.W, D: S.D, shape: S.shape, area: Math.round(G.area), mat: S.mat, matName: MATS[S.mat].name, tone: S.tone, rail: S.rail, guard: S.guard, stairs: S.stairs, drain: S.drain, posts: S.posts, brickAll: S.brickAll, labor: S.labor,
    table: S.tableOn ? S.table : 'none', loungers: S.loungeOn ? S.loungers : 0, grill: S.grill,
    diy: E.diy.map(Math.round), split: E.split.map(Math.round), hired: E.hired.map(Math.round), posts: G.posts.length, railLf: Math.round(G.railLf), savedAt: new Date().toISOString() };
  try { localStorage.setItem('dk01-pick', JSON.stringify(pick)); } catch (e) { }
  if (DB) { try { await DB.collection('picks').doc('current').set(pick); $('pick-sync').textContent = 'saved for everyone'; } catch (e) { $('pick-sync').textContent = 'saved in this browser'; } }
  else $('pick-sync').textContent = 'saved in this browser';
  showPick(pick);
});
function showPick(p) { if (!p) return; $('pick-info').textContent = `Our pick (${new Date(p.savedAt).toLocaleDateString()}): ${p.W}×${p.D}${p.shape === 'rect' ? '' : ' ' + p.shape} · ${p.matName} · ${RAILS[p.rail] ? RAILS[p.rail].name : p.rail} ${p.guard}″ · ${p.stairs === 'none' ? 'no stairs' : p.stairs + ' stairs'} · ${LABOR[p.labor]} ${rng2(p[p.labor])}.`; }
try { showPick(JSON.parse(localStorage.getItem('dk01-pick') || 'null')); } catch (e) { }

/* ================= start ================= */
renderFacts(); dbMode = 'wait'; renderTodo();
setPin(S.pinned !== false);
update({ noBuild: true });
setView(S.view || '3d');
init3D(); if (LAST) build3D(LAST.G, LAST.F); setSun();
(async () => {
  let db = null;
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
  if (!db) { dbMode = 'local'; renderTodo(); return; }
  DB = db; dbMode = 'db';
  DB.collection('checklist').onSnapshot(snap => {
    const active = document.activeElement && document.activeElement.tagName === 'TEXTAREA' ? document.activeElement.dataset.id : null;
    for (const d of snap.docs) { const v = d.data() || {}; if (d.id !== active) TD[d.id] = { done: !!v.done, note: v.note || '' }; }
    renderTodo(); if (active) { const el = $('tn-' + active); if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; } }
  }, () => { dbMode = 'local'; renderTodo(); });
  DB.doc('picks/current').onSnapshot(s => { if (s.exists) { showPick(s.data()); $('pick-sync').textContent = 'shared'; } }, () => { });
})();
/* test hook (tests/test_deck.py) */
window.__dk = { get S() { return S; }, set S(v) { S = v; }, geom, estimate, furniture, setView, eff, sunMap, sunPos, update, camPreset, V3, get LAST() { return LAST; }, DATES, PRESETS, MATS };
