/* ================= colors, post sizes ================= */
const TONES = [
  ['sand', 'Sand', '#bba886'], ['driftwood', 'Driftwood', '#9e9283'], ['honey', 'Honey', '#a8834f'], ['cedar', 'Cedar', '#8f6446'],
  ['walnut', 'Walnut', '#6a4a35'], ['ash', 'Ash grey', '#a4a19b'], ['grey', 'Mid grey', '#8c8a84'], ['slate', 'Slate', '#6f7073'],
  ['charcoal', 'Charcoal', '#4b4c4d'], ['espresso', 'Espresso', '#3d2f28'],
];
const TONE = Object.fromEntries(TONES.map(t => [t[0], t]));
const DARK_TONES = new Set(['charcoal', 'espresso', 'walnut', 'slate']);
const RFIN_METAL = [['black', 'Black', '#1d2023'], ['bronze', 'Bronze', '#4a3a2c'], ['white', 'White', '#eeeeea'], ['grey', 'Grey', '#8d9196']];
const RFIN_WOOD = [['match', 'Match the deck', null], ['white', 'Painted white', '#eeeeea'], ['black', 'Painted black', '#1d2023']];
const PFIN = [['natural', 'Natural PT', '#8a7458'], ['brown', 'Brown stain', '#6b4f38'], ['walnut', 'Dark walnut', '#3f2e23'], ['grey', 'Grey stain', '#77746e'], ['white', 'Painted white', '#eeeae2']];
const FAB = [['charcoal', 'Charcoal', '#3c4247'], ['navy', 'Navy', '#2f3e55'], ['sand', 'Sand', '#cfc3a8'], ['sage', 'Sage', '#7f8c74'], ['terracotta', 'Terracotta', '#a65c43'], ['white', 'White', '#e9e6df']];
const FFR = [['black', 'Black', '#1e2022'], ['teak', 'Teak', '#8a6440'], ['white', 'White', '#ece9e2'], ['grey', 'Grey', '#7e8186']];
const pick = (list, id) => list.find(x => x[0] === id) || list[0];
const railRGB = s => { if (s.rail === 'wood') { const f = pick(RFIN_WOOD, s.rfin); return f[2] || TONE[s.tone][2]; } return pick(RFIN_METAL, s.rfin)[2]; };
/* actual post sizes (inches), stock price per post for 10′ / 12′ lengths, extra hardware and handling per post */
const POSTS = {
  '6x6': { name: '6×6', act: 5.5, p10: [55, 85], p12: [70, 110], hw: [0, 0], lab: [0, 0], tube: 12, foot: [110, 170], lb: 125 },
  '8x8': { name: '8×8', act: 7.25, p10: [95, 150], p12: [115, 185], hw: [30, 60], lab: [20, 40], tube: 16, foot: [140, 220], lb: 210 },
  '10x10': { name: '10×10', act: 9.25, p10: [190, 320], p12: [230, 380], hw: [80, 160], lab: [50, 100], tube: 18, foot: [160, 250], lb: 330 },
};
const postFt = s => POSTS[s.postSize || '10x10'].act / 12;
const colIn = s => Math.max(16, Math.ceil(POSTS[s.postSize || '10x10'].act + 8));     // brick column face, inches
const sleeveIn = s => POSTS[s.postSize || '10x10'].act + 1;

/* ================= furniture catalog =================
   Sizes in feet. Local x = width, local y = depth; the front of a piece faces local −y at 0°.
   parts: footprint rectangles [x0, x1, y0, y1] used for the fit check (default: the whole w × d). round: a disc.
   clear: working room that must stay open (grill). rug: lies flat, other pieces may sit on it. */
const FURN = {
  dine48: { name: '48″ round table, 4 chairs', short: 'table · 4', cat: 'Dining', w: 8.5, d: 8.5, round: true, umb: 4.5, price: [600, 1600] },
  dine60: { name: '60″ round table, 6 chairs', short: 'table · 6', cat: 'Dining', w: 10, d: 10, round: true, umb: 5, price: [900, 2300] },
  dine6r: { name: '72×40″ table, 6 chairs', short: 'table · 6', cat: 'Dining', w: 10, d: 8, umb: 5, price: [900, 2600] },
  dine8r: { name: '84×42″ table, 8 chairs', short: 'table · 8', cat: 'Dining', w: 11, d: 8.5, umb: 5.5, price: [1200, 3300] },
  bistro: { name: 'Bistro table, 2 chairs', short: 'bistro', cat: 'Dining', w: 5, d: 5, round: true, umb: 0, price: [200, 600] },
  bar4: { name: 'Bar-height table, 4 stools', short: 'bar · 4', cat: 'Dining', w: 6.5, d: 6.5, round: true, umb: 0, price: [500, 1400] },
  lounger: { name: 'Chaise lounge', short: 'chaise', cat: 'Lounge', w: 2.3, d: 6.7, price: [200, 700] },
  sofa: { name: 'Outdoor sofa', short: 'sofa', cat: 'Lounge', w: 7, d: 3, price: [700, 2000] },
  loveseat: { name: 'Loveseat', short: 'loveseat', cat: 'Lounge', w: 5, d: 3, price: [500, 1400] },
  club: { name: 'Club chair', short: 'chair', cat: 'Lounge', w: 2.8, d: 2.8, price: [250, 700] },
  sectional: { name: 'L sectional', short: 'sectional', cat: 'Lounge', w: 9, d: 7.5, parts: [[-4.5, 4.5, 0.75, 3.75], [-4.5, -1.5, -3.75, 0.75]], price: [1800, 4500] },
  adir: { name: 'Adirondack chair', short: 'adirondack', cat: 'Lounge', w: 2.6, d: 3.1, price: [150, 450] },
  coffee: { name: 'Coffee table', short: 'coffee', cat: 'Lounge', w: 4, d: 2, price: [150, 600] },
  side: { name: 'Side table', short: 'side', cat: 'Lounge', w: 1.6, d: 1.6, round: true, price: [60, 200] },
  grill: { name: 'Propane grill', short: 'grill', cat: 'Cooking & fire', w: 5, d: 2.2, clear: [-2.5, 2.5, -3.1, -1.1], grill: true, price: [400, 1200] },
  firetable: { name: 'Propane fire table', short: 'fire', cat: 'Cooking & fire', w: 3.5, d: 2, fire: true, price: [500, 1500] },
  heater: { name: 'Patio heater', short: 'heater', cat: 'Cooking & fire', w: 1.7, d: 1.7, round: true, fire: true, price: [200, 500] },
  cart: { name: 'Bar cart', short: 'cart', cat: 'Cooking & fire', w: 3, d: 1.6, price: [150, 400] },
  umbrella: { name: '10′ cantilever umbrella', short: 'umbrella', cat: 'Accents', w: 3, d: 3, canopy: true, price: [300, 900] },
  planter: { name: 'Planter, square', short: 'planter', cat: 'Accents', w: 2, d: 2, price: [80, 250] },
  planterT: { name: 'Planter, tall round', short: 'planter', cat: 'Accents', w: 1.4, d: 1.4, round: true, price: [50, 150] },
  bench: { name: 'Bench', short: 'bench', cat: 'Accents', w: 5, d: 1.5, price: [150, 400] },
  deckbox: { name: 'Storage deck box', short: 'deck box', cat: 'Accents', w: 4.5, d: 2, price: [150, 400] },
  rug58: { name: '5×8 outdoor rug', short: 'rug', cat: 'Accents', w: 8, d: 5, rug: true, price: [80, 300] },
  rug810: { name: '8×10 outdoor rug', short: 'rug', cat: 'Accents', w: 10, d: 8, rug: true, price: [150, 500] },
  hottub: { name: 'Hot tub, 7×7', short: 'hot tub', cat: 'Other', w: 7, d: 7, tub: true, price: [6000, 12000] },
};
const FCATS = ['Dining', 'Lounge', 'Cooking & fire', 'Accents', 'Other'];
const DEF_ITEMS = () => [
  { id: 'f1', t: 'dine48', u: 8, v: 7.4, r: 0, umb: true },
  { id: 'f2', t: 'grill', u: 20.5, v: 3.5, r: 270 },
  { id: 'f3', t: 'lounger', u: 18.25, v: 10.55, r: 90 },
  { id: 'f4', t: 'lounger', u: 18.25, v: 7.35, r: 90 },
];
let FSEQ = 100;
const newId = () => 'f' + (++FSEQ) + Math.random().toString(36).slice(2, 5);

/* ---------- geometry ---------- */
const rot2 = (x, y, th) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
const rectPoly = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
function itemShape(it) {
  const T = FURN[it.t], th = (it.r || 0) * D2R, tr = (x, y) => { const [a, b] = rot2(x, y, th); return [it.u + a, it.v + b]; };
  let parts;
  if (T.round) { const R = T.w / 2, n = 16; parts = [[...Array(n)].map((_, i) => tr(R * Math.cos(i / n * 2 * Math.PI), R * Math.sin(i / n * 2 * Math.PI)))]; }
  else parts = (T.parts || [[-T.w / 2, T.w / 2, -T.d / 2, T.d / 2]]).map(p => rectPoly(p[0], p[1], p[2], p[3]).map(q => tr(q[0], q[1])));
  const clear = T.clear ? rectPoly(...T.clear).map(q => tr(q[0], q[1])) : null;
  const all = parts.flat().concat(clear || []);
  const bb = { u0: Math.min(...all.map(p => p[0])), u1: Math.max(...all.map(p => p[0])), v0: Math.min(...all.map(p => p[1])), v1: Math.max(...all.map(p => p[1])) };
  return { parts, clear, bb };
}
function polyHit(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; let nx = y2 - y1, ny = x1 - x2; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, y] of A) { const d = x * nx + y * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const [x, y] of B) { const d = x * nx + y * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 <= b0 + 0.02 || b1 <= a0 + 0.02) return false;
  }
  return true;
}
function polyOnDeck(P, deck) {
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  const pts = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; pts.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); }
  return pts.every(p => inPoly([p[0] + (cx - p[0]) * 0.004, p[1] + (cy - p[1]) * 0.004], deck));
}
function keepZones(G) {
  const k = [{ name: 'slider landing', poly: rectPoly(0, 3.5, NOOK_SLIDER.v0 - 0.2, NOOK_SLIDER.v1 + 0.2) }];
  const st = G.stair; if (st) k.push({ name: 'stair top', poly: st.side === 'east' ? rectPoly(G.W - 4, G.W, st.a[1], st.b[1]) : rectPoly(st.a[0], st.b[0], G.D - 4, G.D) });
  return k;
}
/* fit check for every piece */
function furniture(s, G) {
  const keep = keepZones(G);
  const items = (s.items || []).filter(it => FURN[it.t]).map(it => Object.assign({}, it, { T: FURN[it.t], name: FURN[it.t].name }, itemShape(it)));
  for (const it of items) {
    const why = [];
    if (!it.parts.every(p => polyOnDeck(p, G.poly))) why.push('hangs off the deck');
    else if (it.clear && !polyOnDeck(it.clear, G.poly)) why.push('no room to stand in front of it');
    if (!it.T.rug) for (const z of keep) if (it.parts.some(p => polyHit(p, z.poly))) why.push('blocks the ' + z.name);
    for (const o of items) {
      if (o === it || it.T.rug || o.T.rug) continue;
      if (it.parts.some(p => o.parts.some(q => polyHit(p, q)))) why.push('overlaps the ' + o.T.short);
      if (it.clear && o.parts.some(q => polyHit(it.clear, q))) why.push('the ' + o.T.short + ' is in its working space');
    }
    it.why = [...new Set(why)].join(', '); it.ok = !why.length;
  }
  const lounge = items.filter(i => i.t === 'lounger');
  return { items, keep, lounge, grill: items.find(i => i.T.grill) || null };
}
function freeSpot(s, G, t, skipId) {
  const others = (s.items || []).filter(x => x.id !== skipId);
  const base = new Set(furniture(Object.assign({}, s, { items: others }), G).items.filter(x => x.ok).map(x => x.id));
  const T = FURN[t], half = Math.max(T.w, T.d) / 2, c = [G.W / 2, G.D / 2], cands = [];
  for (let u = 0.5; u < G.W; u += 0.5) for (let v = 0.5; v < G.Dmax; v += 0.5) cands.push([u, v]);
  cands.sort((a, b) => Math.hypot(a[0] - c[0], a[1] - c[1]) - Math.hypot(b[0] - c[0], b[1] - c[1]));
  for (const r of [0, 90, 180, 270]) for (const [u, v] of cands) {
    const hw = (r % 180 ? T.d : T.w) / 2, hd = (r % 180 ? T.w : T.d) / 2;
    if (u - hw < 0 || u + hw > G.W || v - hd < 0 || v + hd > G.Dmax) continue;
    const it = { id: '__try', t, u, v, r }, F = furniture(Object.assign({}, s, { items: others.concat([it]) }), G);
    if (F.items.every(x => x.ok || (x.id !== '__try' && !base.has(x.id)))) return { u, v, r };
  }
  return { u: c[0], v: c[1], r: 0 };
}
function arrange(s, G) {
  const order = (s.items || []).slice().sort((a, b) => FURN[b.t].w * FURN[b.t].d - FURN[a.t].w * FURN[a.t].d);
  const placed = [];
  for (const it of order) { const p = freeSpot(Object.assign({}, s, { items: placed }), G, it.t); placed.push(Object.assign({}, it, p)); }
  return (s.items || []).map(it => placed.find(p => p.id === it.id));
}
const furnBudget = items => items.reduce((a, it) => add2(a, FURN[it.t] ? FURN[it.t].price : [0, 0]), [0, 0]);

/* ---------- 3D models (local coords: x = width, y = depth, h = height above the deck) ---------- */
function fmats() {
  const key = S.fab + '|' + S.ffr;
  if (fmats.k === key) return fmats.m;
  fmats.k = key;
  return (fmats.m = {
    fab: lam(pick(FAB, S.fab)[2]), fab2: lam(new THREE.Color(pick(FAB, S.fab)[2]).offsetHSL(0, 0, -0.06)), frm: lam(pick(FFR, S.ffr)[2]),
    top: lam(S.ffr === 'teak' ? 0x9a7048 : S.ffr === 'white' ? 0xf2f0ea : 0x3a3d40), blk: lam(0x1e2022), steel: lam(0xa9adb1),
    umb: lam(pick(FAB, S.fab === 'charcoal' ? 'sand' : S.fab)[2], { side: THREE.DoubleSide }), stone: lam(0x8a8780), plant: lam(0x4f7a3a), pot: lam(0x5a5b5e),
    glow: new THREE.MeshBasicMaterial({ color: 0xff8a2a }), water: lam(0x4f9fbf), tub: lam(0x6b6560), red: new THREE.MeshBasicMaterial({ color: 0xd04a3a, transparent: true, opacity: 0.35, depthWrite: false }),
  });
}
function FB(g, x0, x1, y0, y1, h0, h1, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.02, x1 - x0), Math.max(0.02, h1 - h0), Math.max(0.02, y1 - y0)), m); b.position.set((x0 + x1) / 2, (h0 + h1) / 2, -(y0 + y1) / 2); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
function FC(g, x, y, r, h0, h1, m, seg) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h1 - h0, seg || 20), m); c.position.set(x, (h0 + h1) / 2, -y); c.castShadow = true; g.add(c); return c; }
function sub(g, x, y, faceX, faceY) { const s = new THREE.Group(); s.position.set(x, 0, -y); s.rotation.y = Math.atan2(faceX, -faceY); g.add(s); return s; }   // local −y of the sub-group points along (faceX, faceY)
function chair(g, M) { FB(g, -0.8, 0.8, -0.8, 0.8, 1.35, 1.55, M.fab); for (const [x, y] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) FB(g, x - 0.06, x + 0.06, y - 0.06, y + 0.06, 0, 1.35, M.frm); FB(g, -0.8, 0.8, 0.65, 0.8, 1.55, 3.0, M.frm); }
function stool(g, M) { FC(g, 0, 0, 0.6, 2.4, 2.55, M.fab, 14); FC(g, 0, 0, 0.06, 0, 2.4, M.frm, 8); FC(g, 0, 0, 0.45, 0, 0.06, M.frm, 14); }
function umbrella(g, M, R, h) { FC(g, 0, 0, 0.06, 0, h, M.steel, 8); const c = new THREE.Mesh(new THREE.ConeGeometry(R, 1.4, 8, 1, true), M.umb); c.position.set(0, h + 0.4, 0); c.castShadow = true; g.add(c); }
function seatRun(g, M, x0, x1, y0, y1) {  // sofa body facing −y: base, cushion, back along +y, arms at the ends
  FB(g, x0, x1, y0, y1, 0, 1.25, M.frm); FB(g, x0 + 0.35, x1 - 0.35, y0 + 0.05, y1 - 0.6, 1.25, 1.65, M.fab); FB(g, x0, x1, y1 - 0.6, y1, 1.25, 2.85, M.fab2);
}
const BUILD = {
  roundTable(g, it, M, T, n, R, hTop) { FC(g, 0, 0, R, hTop - 0.1, hTop, M.top, 32); FC(g, 0, 0, 0.12, 0, hTop, M.frm, 10); FC(g, 0, 0, 0.8, 0, 0.08, M.frm, 16);
    for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI + Math.PI / n, r = R + (hTop > 3 ? 0.55 : 0.9); const sg = sub(g, Math.cos(a) * r, Math.sin(a) * r, -Math.cos(a), -Math.sin(a)); hTop > 3 ? stool(sg, M) : chair(sg, M); }
    if (it.umb && T.umb) umbrella(g, M, T.umb, 7.6); },
  dine48(g, it, M, T) { BUILD.roundTable(g, it, M, T, 4, 2, 2.45); }, dine60(g, it, M, T) { BUILD.roundTable(g, it, M, T, 6, 2.5, 2.45); },
  bistro(g, it, M, T) { BUILD.roundTable(g, it, M, T, 2, 1.25, 2.4); }, bar4(g, it, M, T) { BUILD.roundTable(g, it, M, T, 4, 1.6, 3.4); },
  rectTable(g, it, M, T, tw, td, per) { FB(g, -tw / 2, tw / 2, -td / 2, td / 2, 2.35, 2.45, M.top); for (const [x, y] of [[-tw / 2 + 0.3, -td / 2 + 0.3], [tw / 2 - 0.3, -td / 2 + 0.3], [-tw / 2 + 0.3, td / 2 - 0.3], [tw / 2 - 0.3, td / 2 - 0.3]]) FB(g, x - 0.1, x + 0.1, y - 0.1, y + 0.1, 0, 2.35, M.frm);
    for (let i = 0; i < per; i++) { const x = -tw / 2 + tw * (i + 0.5) / per; chair(sub(g, x, -td / 2 - 0.9, 0, 1), M); chair(sub(g, x, td / 2 + 0.9, 0, -1), M); }
    chair(sub(g, -tw / 2 - 0.9, 0, 1, 0), M); chair(sub(g, tw / 2 + 0.9, 0, -1, 0), M); if (it.umb && T.umb) umbrella(g, M, T.umb, 7.8); },
  dine6r(g, it, M, T) { BUILD.rectTable(g, it, M, T, 6, 3.33, 2); }, dine8r(g, it, M, T) { BUILD.rectTable(g, it, M, T, 7, 3.5, 3); },
  lounger(g, it, M) { FB(g, -1.15, 1.15, -3.35, 1.6, 0.0, 0.9, M.frm); FB(g, -1.05, 1.05, -3.25, 1.5, 0.9, 1.25, M.fab); const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 2.1), M.fab); b.position.set(0, 1.85, -2.35); b.rotation.x = 0.85; b.castShadow = true; g.add(b); FB(g, -1.15, 1.15, 1.6, 3.35, 0, 0.9, M.frm); },
  sofa(g, it, M, T) { seatRun(g, M, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2); FB(g, -T.w / 2, -T.w / 2 + 0.45, -T.d / 2, T.d / 2, 1.25, 2.2, M.frm); FB(g, T.w / 2 - 0.45, T.w / 2, -T.d / 2, T.d / 2, 1.25, 2.2, M.frm); },
  loveseat(g, it, M, T) { BUILD.sofa(g, it, M, T); }, club(g, it, M, T) { BUILD.sofa(g, it, M, T); },
  sectional(g, it, M) { seatRun(g, M, -4.5, 4.5, 0.75, 3.75); const s = sub(g, -3, -1.5, 1, 0); seatRun(s, M, -2.25, 2.25, -1.5, 1.5); FB(g, 4.05, 4.5, 0.75, 3.75, 1.25, 2.2, M.frm); FB(g, -4.5, -1.5, -3.75, -3.3, 1.25, 2.2, M.frm); },
  adir(g, it, M) { FB(g, -1.3, 1.3, -1.55, 0.6, 1.0, 1.15, M.frm); FB(g, -1.3, -1.1, -1.55, 0.6, 0, 2.0, M.frm); FB(g, 1.1, 1.3, -1.55, 0.6, 0, 2.0, M.frm); const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 0.12), M.frm); b.position.set(0, 2.2, -1.1); b.rotation.x = -0.35; b.castShadow = true; g.add(b); },
  coffee(g, it, M, T) { FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, 1.25, 1.4, M.top); FB(g, -T.w / 2 + 0.2, T.w / 2 - 0.2, -T.d / 2 + 0.2, T.d / 2 - 0.2, 0, 1.25, M.frm); },
  side(g, it, M) { FC(g, 0, 0, 0.8, 1.6, 1.7, M.top, 18); FC(g, 0, 0, 0.1, 0, 1.6, M.frm, 8); },
  grill(g, it, M) { FB(g, -1.5, 1.5, -1.1, 1.1, 0, 3.0, M.blk); FB(g, -1.4, 1.4, -0.9, 1.0, 3.0, 3.8, M.steel); FB(g, -2.5, -1.5, -1.0, 0.9, 2.9, 3.0, M.blk); FB(g, 1.5, 2.5, -1.0, 0.9, 2.9, 3.0, M.blk); FB(g, -1.4, 1.4, -1.15, -1.05, 3.2, 3.3, M.steel); },
  firetable(g, it, M, T) { FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, 0, 2.0, M.stone); FB(g, -1.1, 1.1, -0.45, 0.45, 2.0, 2.05, M.blk); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), M.glow); f.position.set(-0.8 + i * 0.4, 2.35, 0); g.add(f); } },
  heater(g, it, M) { FC(g, 0, 0, 0.8, 0, 0.5, M.blk, 16); FC(g, 0, 0, 0.1, 0.5, 7.2, M.steel, 8); const r = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 18, 1, true), M.steel); r.position.set(0, 7.4, 0); r.rotation.x = Math.PI; g.add(r); },
  cart(g, it, M, T) { for (const h of [0.6, 1.7, 3.0]) FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, h, h + 0.08, M.top); for (const [x, y] of [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]]) FB(g, x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0, 3.0, M.frm); },
  umbrella(g, it, M) { FB(g, -1.5, 1.5, -1.5, 1.5, 0, 0.35, M.blk); FC(g, -1.2, 0, 0.1, 0.35, 8.4, M.steel, 8); FB(g, -1.2, 3.8, -0.06, 0.06, 8.3, 8.45, M.steel); const c = new THREE.Mesh(new THREE.ConeGeometry(7.07, 1.4, 4, 1, true), M.umb); c.rotation.y = Math.PI / 4; c.position.set(3.8, 8.1, 0); c.castShadow = true; g.add(c); },
  planter(g, it, M, T) { FB(g, -1, 1, -1, 1, 0, 2.0, M.pot); const p = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), M.plant); p.position.set(0, 2.6, 0); p.castShadow = true; g.add(p); },
  planterT(g, it, M) { FC(g, 0, 0, 0.7, 0, 2.6, M.pot, 16); const p = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), M.plant); p.position.set(0, 3.3, 0); p.castShadow = true; g.add(p); },
  bench(g, it, M, T) { FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, 1.4, 1.55, M.top); FB(g, -T.w / 2 + 0.2, -T.w / 2 + 0.45, -T.d / 2, T.d / 2, 0, 1.4, M.frm); FB(g, T.w / 2 - 0.45, T.w / 2 - 0.2, -T.d / 2, T.d / 2, 0, 1.4, M.frm); },
  deckbox(g, it, M, T) { FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, 0, 2.1, lam(0x6a5a4a)); FB(g, -T.w / 2 - 0.05, T.w / 2 + 0.05, -T.d / 2 - 0.05, T.d / 2 + 0.05, 2.1, 2.2, lam(0x5a4b3e)); },
  rug(g, it, M, T) { const r = FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, 0.005, 0.03, M.fab2); r.castShadow = false; const i = FB(g, -T.w / 2 + 0.5, T.w / 2 - 0.5, -T.d / 2 + 0.5, T.d / 2 - 0.5, 0.03, 0.035, lam(new THREE.Color(pick(FAB, S.fab)[2]).offsetHSL(0, 0, 0.12))); i.castShadow = false; },
  rug58(g, it, M, T) { BUILD.rug(g, it, M, T); }, rug810(g, it, M, T) { BUILD.rug(g, it, M, T); },
  hottub(g, it, M, T) { FB(g, -T.w / 2, T.w / 2, -T.d / 2, T.d / 2, 0, 3.0, M.tub); FB(g, -T.w / 2 + 0.4, T.w / 2 - 0.4, -T.d / 2 + 0.4, T.d / 2 - 0.4, 3.0, 3.02, M.water); },
};
function buildFurn3D(F) {
  if (!V3.ok) return;
  if (!V3.furn) { V3.furn = new THREE.Group(); V3.sc.add(V3.furn); }
  const grp = V3.furn; while (grp.children.length) { const c = grp.children.pop(); c.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
  if (!S.showFurn) { V3.dirty = true; return; }
  const M = fmats();
  for (const it of F.items) {
    const g = new THREE.Group(), T = it.T; (BUILD[it.t] || BUILD.coffee)(g, it, M, T);
    g.position.copy(W3(X0 + it.u, Y0 + it.v, TOP)); g.rotation.y = (it.r || 0) * D2R; g.userData.id = it.id;
    if (!it.ok) { const red = new THREE.Mesh(new THREE.PlaneGeometry(T.w, T.d), M.red); red.rotation.x = -Math.PI / 2; red.position.y = 0.06; g.add(red); }
    grp.add(g);
    if (it.id === S.sel) { const bh = new THREE.BoxHelper(g, it.ok ? 0x2b7fbf : 0xd04a3a); bh.userData.helper = true; grp.add(bh); }
  }
  V3.dirty = true;
}

/* ---------- plan layer ---------- */
const PICON = {
  dine48: [['c', 0, 0, 2]], dine60: [['c', 0, 0, 2.5]], bistro: [['c', 0, 0, 1.25]], bar4: [['c', 0, 0, 1.6]],
  dine6r: [['r', -3, 3, -1.67, 1.67]], dine8r: [['r', -3.5, 3.5, -1.75, 1.75]],
  lounger: [['r', -1.05, 1.05, 0.9, 3.2]], sofa: [['r', -3.5, 3.5, 0.9, 1.5]], loveseat: [['r', -2.5, 2.5, 0.9, 1.5]], club: [['r', -1.4, 1.4, 0.8, 1.4]],
  sectional: [['r', -4.5, 4.5, 3.15, 3.75], ['r', -4.5, -3.9, -3.75, 3.75]], grill: [['r', -1.5, 1.5, -1.1, 1.1]], firetable: [['r', -1.1, 1.1, -0.45, 0.45]],
  umbrella: [['c', 3.8, 0, 5]],
};
function planFurn(F, sx, sy) {
  const o = [], L = u => X0 + u, V = v => Y0 + v;
  for (const it of F.items) {
    const T = it.T, sel = it.id === S.sel, col = it.ok ? 'var(--accent)' : 'var(--bad)';
    const tf = `translate(${sx(L(it.u))},${sy(V(it.v))}) rotate(${-(it.r || 0)}) scale(1,-1)`;
    let g = `<g class="fi${sel ? ' sel' : ''}" data-id="${it.id}" transform="${tf}">`;
    if (T.clear) g += `<rect x="${T.clear[0]}" y="${T.clear[2]}" width="${T.clear[1] - T.clear[0]}" height="${T.clear[3] - T.clear[2]}" fill="none" stroke="${col}" stroke-width=".08" stroke-dasharray=".35 .25"/>`;
    const fillO = T.rug ? .1 : .18;
    if (T.round) g += `<circle class="ol" r="${T.w / 2}" fill="${col}" fill-opacity="${fillO}" stroke="${col}" stroke-width=".12" ${T.w > 4 ? 'stroke-dasharray=".4 .25"' : ''}/>`;
    else for (const p of (T.parts || [[-T.w / 2, T.w / 2, -T.d / 2, T.d / 2]])) g += `<rect class="ol" x="${p[0]}" y="${p[2]}" width="${p[1] - p[0]}" height="${p[3] - p[2]}" fill="${col}" fill-opacity="${fillO}" stroke="${col}" stroke-width=".12" ${T.rug ? 'stroke-dasharray=".5 .3"' : ''}/>`;
    for (const s of (PICON[it.t] || [])) g += s[0] === 'c' ? `<circle cx="${s[1]}" cy="${s[2]}" r="${s[3]}" fill="${it.t === 'umbrella' ? 'none' : col}" fill-opacity=".22" stroke="${col}" stroke-width=".08" ${it.t === 'umbrella' ? 'stroke-dasharray=".3 .3"' : ''}/>` : `<rect x="${s[1]}" y="${s[3]}" width="${s[2] - s[1]}" height="${s[4] - s[3]}" fill="${col}" fill-opacity=".3" stroke="${col}" stroke-width=".06"/>`;
    if (!T.round && !T.rug) g += `<polygon points="-.35,${-T.d / 2 + 0.05} .35,${-T.d / 2 + 0.05} 0,${-T.d / 2 + 0.55}" fill="${col}"/>`;   // front marker
    if (sel) { const hy = (T.round ? T.w / 2 : T.d / 2) + 1.3; g += `<line x1="0" y1="0" x2="0" y2="${hy}" stroke="var(--accent)" stroke-width=".08"/><circle class="rh" data-id="${it.id}" cx="0" cy="${hy}" r=".75"><title>Drag to rotate</title></circle>`; }
    o.push(g + '</g>');
    o.push(`<text x="${sx(L(it.u))}" y="${+sy(V(it.v)) + 0.35}" text-anchor="middle" font-size=".85" fill="var(--ink)" pointer-events="none">${esc(T.short)}</text>`);
  }
  return `<g id="fi-layer">${o.join('')}</g>`;
}

/* ---------- panel ---------- */
function swatches(id, list, cur, on, nameId) {
  const el = $(id); el.innerHTML = list.map(c => `<button class="swb" type="button" data-v="${c[0]}" aria-pressed="${c[0] === cur}" title="${esc(c[1])}" aria-label="${esc(c[1])}" style="background:${c[2] || 'repeating-linear-gradient(45deg,var(--deck) 0 4px,var(--sheet) 4px 8px)'}"></button>`).join('');
  el.onclick = e => { const b = e.target.closest('[data-v]'); if (b) on(b.dataset.v); };
  if (nameId) $(nameId).textContent = pick(list, cur)[1];
}
function renderFurnPanel(F) {
  $('fpal').innerHTML = FCATS.map(c => `<span class="cat">${esc(c)}</span><div class="row">${Object.entries(FURN).filter(([, T]) => T.cat === c).map(([kk, T]) => `<button class="btn" type="button" data-add="${kk}" title="${esc(T.name)} · ${T.w}′ × ${T.d}′ · about $${T.price[0]}–${T.price[1]}">${esc(T.name)}</button>`).join('')}</div>`).join('');
  $('flist').innerHTML = F.items.length ? F.items.map(it => `<button class="fli" type="button" data-sel="${it.id}" aria-pressed="${it.id === S.sel}"><span>${esc(it.T.name)}</span><span class="fit ${it.ok ? 'ok' : 'no'}">${it.ok ? 'fits' : 'doesn’t fit'}</span></button>`).join('') : '<span class="tagline">No furniture on the deck. Add pieces below.</span>';
  const s = F.items.find(i => i.id === S.sel);
  if (s) {
    $('fsel').innerHTML = `<div class="fsel"><h4>${esc(s.T.name)}</h4><span class="tagline">${s.T.w}′ × ${s.T.d}′ · at ${ftin(s.u)} east, ${ftin(s.v)} out from the house · ${Math.round(s.r || 0)}°</span>${s.ok ? '' : `<span class="why">Doesn’t fit: ${esc(s.why)}.</span>`}
      <div class="row"><button class="btn" type="button" data-rot="-15">⟲ 15°</button><button class="btn" type="button" data-rot="15">⟳ 15°</button><button class="btn" type="button" data-rot="90">Turn 90°</button><input type="range" id="r-frot" min="0" max="345" step="15" value="${((Math.round(s.r || 0) % 360) + 360) % 360}" aria-label="Rotation"></div>
      <div class="row">${s.T.umb ? `<label class="tgl"><input type="checkbox" id="c-fumb" ${s.umb ? 'checked' : ''}> Umbrella</label>` : ''}<button class="btn" type="button" id="b-fdup">Duplicate</button><button class="btn" type="button" id="b-fdel">Remove</button><button class="btn" type="button" id="b-fdone">Done</button></div></div>`;
  } else $('fsel').innerHTML = '';
  swatches('sw-fab', FAB, S.fab, v => { S.fab = v; update(); }, 'fab-name');
  swatches('sw-ffr', FFR, S.ffr, v => { S.ffr = v; update(); }, 'ffr-name');
  const b = furnBudget(F.items);
  $('fbud').textContent = F.items.length ? `Furniture shown, rough retail: ${rng2(b)} (not in the deck price)` : '';
  const n = F.items.length, bad = F.items.filter(i => !i.ok).length;
  $('sv-furn').textContent = n ? n + ' pieces · ' + (bad ? bad + ' won’t fit' : 'all fit') + (S.showFurn ? '' : ' · hidden') : 'none';
}
const itemById = id => (S.items || []).find(i => i.id === id);
function selectItem(id) { S.sel = id || null; update({ furnOnly: true }); }
function rotItem(it, d) { it.r = ((Math.round(((it.r || 0) + d) / 15) * 15) % 360 + 360) % 360; }
function addItem(t) {
  const G = LAST ? LAST.G : geom(S); const p = freeSpot(S, G, t); const it = Object.assign({ id: newId(), t, umb: !!FURN[t].umb }, p);
  S.items = (S.items || []).concat([it]); S.sel = it.id; update({ furnOnly: true });
}
$('fpal').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) addItem(b.dataset.add); });
$('flist').addEventListener('click', e => { const b = e.target.closest('[data-sel]'); if (b) selectItem(b.dataset.sel === S.sel ? null : b.dataset.sel); });
$('fsel').addEventListener('click', e => {
  const it = itemById(S.sel); if (!it) return; const r = e.target.closest('[data-rot]');
  if (r) { rotItem(it, +r.dataset.rot); update({ furnOnly: true }); }
  if (e.target.id === 'b-fdel') { S.items = S.items.filter(x => x !== it); S.sel = null; update({ furnOnly: true }); }
  if (e.target.id === 'b-fdup') { const G = LAST.G, p = freeSpot(S, G, it.t); const c = Object.assign({}, it, { id: newId() }, p, { r: it.r }); S.items.push(c); S.sel = c.id; update({ furnOnly: true }); }
  if (e.target.id === 'b-fdone') selectItem(null);
});
$('fsel').addEventListener('input', e => { const it = itemById(S.sel); if (!it) return; if (e.target.id === 'r-frot') { it.r = +e.target.value; update({ furnOnly: true, keepPanel: true }); } });
$('fsel').addEventListener('change', e => { const it = itemById(S.sel); if (it && e.target.id === 'c-fumb') { it.umb = e.target.checked; update({ furnOnly: true }); } });
$('b-arrange').addEventListener('click', () => { S.items = arrange(S, LAST.G); update({ furnOnly: true }); });
$('b-fclear').addEventListener('click', () => { S.items = []; S.sel = null; update({ furnOnly: true }); });

/* keyboard: rotate, nudge, delete the selected piece */
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) && e.target.type !== 'checkbox') return;
  if (FLY.on && /^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight)$/.test(e.code)) return;
  const it = itemById(S.sel); if (!it) return;
  const step = e.shiftKey ? 1 : 0.25;
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
  if (mv && !(e.target.closest && e.target.closest('.vtabs'))) { e.preventDefault(); e.stopPropagation(); it.u = +(it.u + mv[0]).toFixed(2); it.v = +(it.v + mv[1]).toFixed(2); update({ furnOnly: true }); return; }
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotItem(it, e.shiftKey ? -15 : 15); update({ furnOnly: true }); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); S.items = S.items.filter(x => x !== it); S.sel = null; update({ furnOnly: true }); return; }
  if (e.key === 'Escape' && !FLY.on) selectItem(null);
}, true);

/* plan: drag to move, drag the round handle to rotate, click empty space to deselect */
{
  const svg = $('plan'); let fd = null;
  const toLot = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x + PV.x0, PV.y1 - q.y]; };
  svg.addEventListener('pointerdown', e => {
    if (e.target.closest('.hdl')) return;
    const rh = e.target.closest('.rh'), fi = e.target.closest('.fi');
    if (!rh && !fi) { if (S.sel) selectItem(null); return; }
    e.preventDefault(); e.stopPropagation();
    const id = (rh || fi).dataset.id, it = itemById(id); if (!it) return;
    const [x, y] = toLot(e);
    fd = { id, rot: !!rh, du: it.u - (x - X0), dv: it.v - (y - Y0), moved: false };
    if (S.sel !== id) { S.sel = id; update({ furnOnly: true }); }
    svg.setPointerCapture(e.pointerId);
  }, true);
  svg.addEventListener('pointermove', e => {
    if (!fd) return; const it = itemById(fd.id); if (!it) return; const [x, y] = toLot(e);
    if (fd.rot) { let a = Math.atan2(y - (Y0 + it.v), x - (X0 + it.u)) / D2R - 90; if (!e.shiftKey) a = Math.round(a / 15) * 15; it.r = ((a % 360) + 360) % 360; }
    else { const snap = e.altKey ? 0.01 : 0.25; it.u = Math.round((x - X0 + fd.du) / snap) * snap; it.v = Math.round((y - Y0 + fd.dv) / snap) * snap; }
    fd.moved = true; update({ furnOnly: true, planOnly: true });
  });
  const end = () => { if (!fd) return; const m = fd.moved; fd = null; if (m) update({ furnOnly: true }); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
}

/* 3D: pick and drag furniture on the deck plane */
function furnPointer3D() {
  const host = $('v3d'), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP - Z0)), hit = new THREE.Vector3();
  let fd = null, down = null;
  const cast = e => { const r = V3.R.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, V3.cam); };
  const idOf = obj => { while (obj && !(obj.userData && obj.userData.id)) obj = obj.parent; return obj ? obj.userData.id : null; };
  host.addEventListener('pointerdown', e => {
    if (e.target !== V3.R.domElement || !S.showFurn || !V3.furn) return;
    cast(e); const hits = ray.intersectObjects(V3.furn.children.filter(c => !c.userData.helper), true);
    down = { x: e.clientX, y: e.clientY };
    if (!hits.length) return;
    const id = idOf(hits[0].object), it = itemById(id); if (!it) return;
    e.stopPropagation(); e.preventDefault(); V3.ctl.enabled = false; FLY.block = true;
    ray.ray.intersectPlane(plane, hit);
    fd = { id, du: it.u - (hit.x - X0), dv: it.v - (-hit.z - Y0), moved: false };
    if (S.sel !== id) { S.sel = id; update({ furnOnly: true }); }
    host.setPointerCapture(e.pointerId);
  }, true);
  host.addEventListener('pointermove', e => {
    if (!fd) return; const it = itemById(fd.id); if (!it) return; cast(e);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const snap = e.altKey ? 0.01 : 0.25;
    it.u = Math.round((hit.x - X0 + fd.du) / snap) * snap; it.v = Math.round((-hit.z - Y0 + fd.dv) / snap) * snap; fd.moved = true;
    const g = V3.furn.children.find(c => c.userData.id === it.id); if (g) { g.position.copy(W3(X0 + it.u, Y0 + it.v, TOP)); V3.dirty = true; }
  });
  const end = e => {
    if (fd) { const m = fd.moved; fd = null; V3.ctl.enabled = !FLY.on; FLY.block = false; update({ furnOnly: true }); return; }
    if (down && e && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4 && S.sel && e.target === V3.R.domElement) selectItem(null);
    down = null;
  };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', () => end());
}

/* ================= free flight ================= */
const FLY = { on: false, keys: new Set(), yaw: 0, pitch: 0, speed: 10, block: false, last: 0, look: null };
function flyAngles() { const d = new THREE.Vector3(); V3.cam.getWorldDirection(d); FLY.yaw = Math.atan2(-d.x, -d.z); FLY.pitch = Math.asin(Math.max(-1, Math.min(1, d.y))); }
function setFly(on) {
  if (!V3.ok) return;
  FLY.on = on; FLY.keys.clear();
  $('b-fly').setAttribute('aria-pressed', String(on)); $('v3d').classList.toggle('fly', on);
  $('flyhelp').hidden = !on; $('flypad').hidden = !on;
  $('hint3').textContent = on ? 'flying · Esc to stop' : 'drag to orbit · drag furniture to move it · R to rotate';
  if (on) { V3.ctl.enabled = false; V3.cam.rotation.order = 'YXZ'; flyAngles(); $('v3d').focus && $('v3d').setAttribute('tabindex', '-1'); }
  else { const d = new THREE.Vector3(); V3.cam.getWorldDirection(d); V3.ctl.target.copy(V3.cam.position).addScaledVector(d, 12); V3.ctl.enabled = true; V3.ctl.update(); }
  V3.dirty = true;
}
function flyStep(dt) {
  if (!FLY.on) return false;
  const k = FLY.keys, f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0), r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0), u = (k.has('KeyE') || k.has('Space') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
  V3.cam.rotation.set(FLY.pitch, FLY.yaw, 0, 'YXZ');
  if (!f && !r && !u) return false;
  const sp = FLY.speed * (k.has('ShiftLeft') || k.has('ShiftRight') ? 3 : 1) * dt;
  const fw = new THREE.Vector3(); V3.cam.getWorldDirection(fw);
  const rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize();
  V3.cam.position.addScaledVector(fw, f * sp).addScaledVector(rt, r * sp); V3.cam.position.y += u * sp;
  return true;
}
function flyInit() {
  const host = $('v3d');
  $('b-fly').addEventListener('click', () => setFly(!FLY.on));
  addEventListener('keydown', e => {
    if (!FLY.on) return; if (/INPUT|TEXTAREA/.test(e.target.tagName || '') && e.target.type !== 'range') return;
    if (e.code === 'Escape') { setFly(false); return; }
    if (/^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight)$/.test(e.code) || (!S.sel && /^Arrow/.test(e.code))) { FLY.keys.add(e.code); e.preventDefault(); }
  });
  addEventListener('keyup', e => FLY.keys.delete(e.code));
  addEventListener('blur', () => FLY.keys.clear());
  host.addEventListener('pointerdown', e => { if (!FLY.on || FLY.block || e.target !== V3.R.domElement) return; FLY.look = { x: e.clientX, y: e.clientY }; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', e => { if (!FLY.on || !FLY.look || FLY.block) return; FLY.yaw -= (e.clientX - FLY.look.x) * 0.004; FLY.pitch = Math.max(-1.5, Math.min(1.5, FLY.pitch - (e.clientY - FLY.look.y) * 0.004)); FLY.look = { x: e.clientX, y: e.clientY }; V3.dirty = true; });
  addEventListener('pointerup', () => { FLY.look = null; });
  host.addEventListener('wheel', e => { if (!FLY.on) return; e.preventDefault(); FLY.speed = Math.max(2, Math.min(60, FLY.speed * (e.deltaY > 0 ? 0.85 : 1.18))); $('flyhelp').textContent = `Fly speed ${FLY.speed.toFixed(0)} ft/s · W A S D move · Q / E down, up · drag to look · Shift faster · Esc stops`; }, { passive: false });
  const pad = $('flypad');
  pad.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); FLY.keys.add(b.dataset.k); b.setPointerCapture(e.pointerId); });
  const up = e => { const b = e.target.closest('[data-k]'); if (b) FLY.keys.delete(b.dataset.k); };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
}
