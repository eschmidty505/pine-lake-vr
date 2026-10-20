"""
7305 Pine Lake Blvd — west berry patch, Blender scene + renders.

Builds the berry patch (haskap / fall raspberry / aronia / summer raspberry) on the septic reserve, the
surrounding lot terrain (from the plot-plan grades used in index.html), the west meadow strip, the drive
bed, the driveway and a massing of the house, then renders the requested camera views.

Run with Blender's Python module (pip install bpy) or inside Blender:
    python3 berry_scene.py --views all --res 1600 --samples 64 --out renders
    blender -b -P berry_scene.py -- --views aisle_august --save pine-lake-berries.blend

Lot grid: feet, origin at the SW lot corner, +x east, +y north. Blender units are metres (1 ft = 0.3048 m),
z = 0 at elevation 880.0.
"""
import argparse, math, os, sys, time
import numpy as np
import bpy

# ------------------------------------------------------------------ args
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--views', default='all')
ap.add_argument('--res', type=int, default=1600)
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--out', default='renders')
ap.add_argument('--save', default='')
ap.add_argument('--lite', action='store_true', help='fewer grass blades / leaves for quick previews')
A = ap.parse_args(argv)
os.makedirs(A.out, exist_ok=True)
RNG = np.random.default_rng(7305)
LITE = 0.35 if A.lite else 1.0
FT = 0.3048
Z0 = 880.0

# ------------------------------------------------------------------ terrain (ported from index.html)
NWT = [[0, 884.2], [28, 883], [52, 882], [74, 881], [99.6, 880], [106.4, 879], [112.8, 878], [119.6, 877], [126.5, 876], [132.8, 875], [140.8, 874], [158.7, 873], [179, 872], [187.8, 871], [193.9, 870], [200, 869], [206.8, 868], [213, 867], [218.6, 866], [226, 865.2]]
NET = [[0, 886], [24, 885], [32, 884], [45, 883], [58, 882], [70, 881], [82, 880], [90, 879], [99, 878], [108.6, 877], [118, 876], [130.6, 875], [157, 873], [183, 871.5], [207, 870], [213, 869], [220, 867.5], [228, 866], [236, 865.2]]
POND = dict(cx=-54.5, cy=313, hx=259.5, hy=87, r=45, water=864.8)
HX, HY = 94.7, 89.9
clamp = lambda v, a, b: max(a, min(b, v))
lerp = lambda a, b, t: a + (b - a) * t
def sstep(a, b, x):
    t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def pl(tab, y):
    if y <= tab[0][0]: return tab[0][1]
    for i in range(1, len(tab)):
        if y <= tab[i][0]:
            y0, h0 = tab[i - 1]; y1, h1 = tab[i]; return h0 + (h1 - h0) * (y - y0) / (y1 - y0)
    return tab[-1][1]
def pond_sdf(x, y):
    P = POND; qx = abs(x - P['cx']) - P['hx'] + P['r']; qy = abs(y - P['cy']) - P['hy'] + P['r']
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - P['r']
road_h = lambda x: 884.6 + 1.6 * clamp(x / 236, -1.2, 1.6)
def natural(x, y):
    t = clamp(x / 236, -0.3, 1.3)
    if y >= 0:
        h = lerp(pl(NWT, y), pl(NET, y), t)
        far = sstep(30, 110, max(-x, x - 236, 0)); h += far * 0.7 * math.sin(x * 0.021 + 1.3) * math.cos(y * 0.017)
        return lerp(h, 860.5, sstep(6, -25, pond_sdf(x, y)))
    R = road_h(x); n0 = lerp(NWT[0][1], NET[0][1], t)
    if y > -21:
        s = (y + 21) / 21; return lerp(R - 0.1, n0, s) - 2.2 * math.sin(math.pi * s) ** 1.2
    if y > -45: return R - 0.02 * abs(y + 33)
    return R - 0.4
def house_grade(u, v):
    if v > 44.83: return 879.5
    tw = clamp((v - 26.75) / 18.08, 0, 1); te = clamp((v - 10) / 34.83, 0, 1)
    t = lerp(tw, te, clamp(u / 49.84, 0, 1)); drop = lerp(6, 8, clamp(u / 8.17, 0, 1))
    return 887.5 - t * drop
HRECTS = [[19.83, 49.84, 8, 44.83], [0, 19.83, 26.75, 44.83], [8.17, 27.84, 44.83, 52.83], [0, 20.83, 0, 26.75]]
PADS = [
    ([87, 234.7, 1.9, 85.4], lambda x, y: 886.3 + 0.5 * (y - 1.9) / 83.5 + 0.4 * (x - 87) / 147.7, 0.25),
    ([65.1, 85.1, -21, 89.9], lambda x, y: 885.1 + (y + 21) / 110.9 * 1.53, 0.33),
    ([65.1, 94.7, 89.9, 116.65], lambda x, y: 886.63 + (x - 65.1) / 29.6 * 0.9, 0.33),
    ([85.1, 131, 84.5, 87.5], lambda x, y: 887.3, 0.25),
    ([122.54, 144.54, 134.73, 150.73], lambda x, y: 879.5, 0.12),
] + [([HX + h[0], HX + h[1], HY + h[2], HY + h[3]], (lambda x, y: house_grade(x - HX, y - HY)), 0.2) for h in HRECTS]
def smax(a, b, k):
    h = max(k - abs(a - b), 0); return max(a, b) + h * h / (4 * k)
def ground_ft(x, y):
    h = natural(x, y)
    for r, T, s in PADS:
        cx = clamp(x, r[0], r[1]); cy = clamp(y, r[2], r[3]); d = math.hypot(x - cx, y - cy)
        if d > 60: continue
        h = smax(h, T(cx, cy) - s * d, 1.2)
    return h

# heightfield cache (1 ft) + vectorised bilinear lookup -> metres
HF_X0, HF_Y0, HF_X1, HF_Y1, HF_S = -80, -60, 300, 300, 1.0
_t = time.time()
hx = np.arange(HF_X0, HF_X1 + HF_S, HF_S); hy = np.arange(HF_Y0, HF_Y1 + HF_S, HF_S)
HF = np.array([[ground_ft(x, y) for x in hx] for y in hy])
print(f'heightfield {HF.shape} in {time.time() - _t:.1f}s')
def gz(xft, yft):
    """ground z in metres at lot-grid feet (vectorised)"""
    xf = np.clip((np.asarray(xft, float) - HF_X0) / HF_S, 0, len(hx) - 1.001); yf = np.clip((np.asarray(yft, float) - HF_Y0) / HF_S, 0, len(hy) - 1.001)
    i = np.floor(xf).astype(int); j = np.floor(yf).astype(int); fx = xf - i; fy = yf - j
    h = HF[j, i] * (1 - fx) * (1 - fy) + HF[j, i + 1] * fx * (1 - fy) + HF[j + 1, i] * (1 - fx) * fy + HF[j + 1, i + 1] * fx * fy
    return (h - Z0) * FT

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
try:
    import addon_utils; addon_utils.enable('cycles', default_set=True)
except Exception as e: print('cycles addon', e)
SC = bpy.context.scene
COLL = {}
def coll(name):
    if name not in COLL:
        c = bpy.data.collections.new(name); SC.collection.children.link(c); COLL[name] = c
    return COLL[name]

# ------------------------------------------------------------------ mesh helpers
def make_mesh(name, verts, faces_flat, loop_starts, mat=None, collection='SITE', attrs=None, smooth=True):
    me = bpy.data.meshes.new(name)
    nv = len(verts); me.vertices.add(nv); me.vertices.foreach_set('co', np.asarray(verts, np.float32).ravel())
    me.loops.add(len(faces_flat)); me.loops.foreach_set('vertex_index', np.asarray(faces_flat, np.int32))
    me.polygons.add(len(loop_starts)); me.polygons.foreach_set('loop_start', np.asarray(loop_starts, np.int32))
    me.update(calc_edges=True)
    if not smooth:
        a = me.attributes.new('sharp_face', 'BOOLEAN', 'FACE'); a.data.foreach_set('value', np.ones(len(loop_starts), bool))
    for k, v in (attrs or {}).items():
        a = me.attributes.new(k, 'FLOAT', 'POINT'); a.data.foreach_set('value', np.asarray(v, np.float32))
    ob = bpy.data.objects.new(name, me); coll(collection).objects.link(ob)
    if mat: me.materials.append(mat)
    return ob

def instances(name, bv, bf, P, X, Y, Z, S, mat, collection, rnd=None, smooth=True):
    """Instance base mesh (bv: k×3 local verts, bf: m×q uniform faces) at frames P (N×3) with axes X/Y/Z (N×3) and scale S (N or N×3)."""
    P = np.asarray(P, float); N = len(P)
    if N == 0: return None
    S = np.asarray(S, float)
    if S.ndim == 1: S = np.repeat(S[:, None], 3, 1)
    bv = np.asarray(bv, float); k = len(bv)
    loc = bv[None, :, :] * S[:, None, :]                      # N×k×3
    W = P[:, None, :] + loc[:, :, 0:1] * X[:, None, :] + loc[:, :, 1:2] * Y[:, None, :] + loc[:, :, 2:3] * Z[:, None, :]
    bf = np.asarray(bf, np.int64); m, q = bf.shape
    F = (bf[None, :, :] + (np.arange(N) * k)[:, None, None]).reshape(-1)
    starts = np.arange(N * m) * q
    attrs = {'rnd': np.repeat(rnd if rnd is not None else RNG.random(N), k)}
    return make_mesh(name, W.reshape(-1, 3), F, starts, mat, collection, attrs, smooth)

def norm(v):
    v = np.asarray(v, float); n = np.linalg.norm(v, axis=-1, keepdims=True); return v / np.maximum(n, 1e-9)
def frame_from(Y, Zhint):
    """orthonormal X,Y,Z with Y along Y and Z as close as possible to Zhint"""
    Y = norm(Y); Z = Zhint - (Zhint * Y).sum(-1, keepdims=True) * Y
    bad = np.linalg.norm(Z, axis=-1) < 1e-4
    if bad.any(): Z[bad] = np.cross(Y[bad], [1, 0, 0])
    Z = norm(Z); X = np.cross(Y, Z); return X, Y, Z
def frame_up(D):
    """frame whose local Z axis is direction D (for cylinders / stems)"""
    Zd = norm(D); ref = np.where(np.abs(Zd[:, 2:3]) > 0.9, [[1, 0, 0]], [[0, 0, 1]])
    X = norm(np.cross(ref, Zd)); Y = np.cross(Zd, X); return X, Y, Zd

# base geometry -------------------------------------------------------------
def leaf_base(n=7, width=0.42, curl=0.10, droop=0.10, tip=1.0):
    """leaf along +Y (length 1), width ~width, one n-gon face"""
    ts = np.linspace(0.08, 0.94, n)
    w = np.sin(np.pi * ts) ** 0.75 * width / 2 * (1 - 0.35 * ts * (1 - tip))
    right = [(w[i], ts[i]) for i in range(n)]; left = [(-w[i], ts[i]) for i in reversed(range(n))]
    pts = [(0, 0)] + right + [(0, 1.0)] + left
    v = np.array([(x, y, curl * (x / (width / 2)) ** 2 * width - droop * y * y) for x, y in pts])
    return v, np.arange(len(v))[None, :]
def blade_base():
    v = np.array([[-0.5, 0, 0], [0.5, 0, 0], [0.3, 0, 0.5], [0, 0.12, 1.0], [-0.3, 0, 0.5]])
    return v, np.array([[0, 1, 2, 3, 4]])
def cyl_base(seg=6, taper=0.6):
    a = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    v = np.concatenate([np.stack([np.cos(a), np.sin(a), np.zeros(seg)], 1), np.stack([np.cos(a) * taper, np.sin(a) * taper, np.ones(seg)], 1)])
    f = np.array([[i, (i + 1) % seg, seg + (i + 1) % seg, seg + i] for i in range(seg)]); return v, f
def ico_base(sub=1):
    t = (1 + 5 ** 0.5) / 2
    V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    V = [np.array(v, float) / np.linalg.norm(v) for v in V]
    for _ in range(sub):
        cache = {}; F2 = []
        def mid(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache: m = V[a] + V[b]; V.append(m / np.linalg.norm(m)); cache[key] = len(V) - 1
            return cache[key]
        for a, b, c in Fc:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a); F2 += [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]
        Fc = F2
    return np.array(V), np.array(Fc)
LEAF_OVAL = leaf_base(7, 0.42, 0.10, 0.12)          # haskap: oblong
LEAF_OBOV = leaf_base(7, 0.62, 0.08, 0.10, 0.6)     # aronia: obovate
LEAF_RASP = leaf_base(7, 0.66, 0.14, 0.08)          # raspberry leaflet
LEAF_SMALL = leaf_base(5, 0.55, 0.08, 0.05)
BLADE = blade_base(); CYL = cyl_base(); CYL_STRAIGHT = cyl_base(6, 1.0); ICO1 = ico_base(1); ICO2 = ico_base(2)
CARD = (np.array([[-0.5, 0, 0], [0.5, 0, 0], [0.5, 1, 0.05], [-0.5, 1, 0.05]]), np.array([[0, 1, 2, 3]]))

# ------------------------------------------------------------------ materials
def nmat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; [nt.nodes.remove(n) for n in list(nt.nodes)]
    out = nt.nodes.new('ShaderNodeOutputMaterial'); return m, nt, out
def rgb(c): return (c[0], c[1], c[2], 1.0)
def principled(nt, **kw):
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    for k, v in kw.items():
        if k in b.inputs:
            try: b.inputs[k].default_value = v
            except Exception: pass
    return b
def ramp_attr(nt, cols, attr='rnd'):
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = attr
    cr = nt.nodes.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
    el[0].color = rgb(cols[0]); el[1].color = rgb(cols[-1])
    for i, c in enumerate(cols[1:-1]):
        e = el.new((i + 1) / (len(cols) - 1)); e.color = rgb(c)
    nt.links.new(at.outputs['Fac'], cr.inputs['Fac']); return cr
def mat_leaf(name, cols, under=(0.36, 0.42, 0.28), transl=0.32, rough=0.55, coat=0.0):
    m, nt, out = nmat(name); cr = ramp_attr(nt, cols)
    geo = nt.nodes.new('ShaderNodeNewGeometry'); mix = nt.nodes.new('ShaderNodeMixRGB'); mix.inputs[2].default_value = rgb(under)
    nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac']); nt.links.new(cr.outputs['Color'], mix.inputs[1])
    b = principled(nt, Roughness=rough, **{'Coat Weight': coat, 'Coat Roughness': 0.25})
    nt.links.new(mix.outputs['Color'], b.inputs['Base Color'])
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent'); nt.links.new(cr.outputs['Color'], tr.inputs['Color'])
    ms = nt.nodes.new('ShaderNodeMixShader'); ms.inputs['Fac'].default_value = transl
    nt.links.new(b.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2]); nt.links.new(ms.outputs[0], out.inputs['Surface'])
    return m
def mat_simple(name, cols, rough=0.6, **kw):
    m, nt, out = nmat(name); b = principled(nt, Roughness=rough, **kw)
    if len(cols) > 1: cr = ramp_attr(nt, cols); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = rgb(cols[0])
    nt.links.new(b.outputs[0], out.inputs['Surface']); return m
def add_bump(nt, b, kind='noise', scale=40.0, strength=0.3, dist=0.01, coord='Object'):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    tex = nt.nodes.new('ShaderNodeTexNoise' if kind == 'noise' else 'ShaderNodeTexVoronoi'); tex.inputs['Scale'].default_value = scale
    nt.links.new(tc.outputs[coord], tex.inputs['Vector'])
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = strength; bm.inputs['Distance'].default_value = dist
    nt.links.new(tex.outputs['Fac' if kind == 'noise' else 'Distance'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    return tex

M = {}
M['haskap_leaf'] = mat_leaf('haskap leaf', [(0.10, 0.20, 0.10), (0.16, 0.27, 0.13), (0.20, 0.30, 0.18)], under=(0.30, 0.38, 0.30), rough=0.6)
M['aronia_leaf'] = mat_leaf('aronia leaf', [(0.04, 0.16, 0.04), (0.07, 0.22, 0.05), (0.10, 0.26, 0.06)], under=(0.20, 0.32, 0.14), rough=0.35, coat=0.15)
M['aronia_leaf_aug'] = mat_leaf('aronia leaf aug', [(0.04, 0.15, 0.04), (0.06, 0.19, 0.05), (0.07, 0.21, 0.05), (0.08, 0.22, 0.05), (0.09, 0.22, 0.05), (0.09, 0.21, 0.05), (0.09, 0.21, 0.05), (0.08, 0.2, 0.05), (0.09, 0.18, 0.04), (0.10, 0.17, 0.04), (0.18, 0.10, 0.04), (0.30, 0.06, 0.03)], under=(0.20, 0.30, 0.14), rough=0.35, coat=0.15)
M['rasp_leaf'] = mat_leaf('raspberry leaf', [(0.10, 0.25, 0.06), (0.15, 0.32, 0.08), (0.18, 0.36, 0.10)], under=(0.55, 0.60, 0.50), rough=0.7)
M['service_leaf'] = mat_leaf('serviceberry leaf', [(0.07, 0.17, 0.04), (0.11, 0.23, 0.06)], under=(0.22, 0.30, 0.16), rough=0.55, transl=0.2)
M['dogwood_leaf'] = mat_leaf('dogwood leaf', [(0.12, 0.25, 0.08), (0.16, 0.30, 0.10)], rough=0.6)
M['tree_leaf'] = mat_leaf('tree canopy', [(0.07, 0.17, 0.04), (0.11, 0.24, 0.06), (0.16, 0.30, 0.08)], rough=0.6, transl=0.25)
M['pine'] = mat_leaf('pine needles', [(0.04, 0.12, 0.06), (0.06, 0.16, 0.08)], rough=0.7, transl=0.15)
M['bark'] = mat_simple('bark', [(0.16, 0.12, 0.09), (0.24, 0.18, 0.13)], rough=0.85)
M['cane'] = mat_simple('raspberry cane', [(0.30, 0.15, 0.10), (0.22, 0.28, 0.12)], rough=0.6)
M['twig'] = mat_simple('twig', [(0.20, 0.15, 0.10), (0.18, 0.20, 0.10)], rough=0.7)
M['pedicel'] = mat_simple('pedicel', [(0.16, 0.26, 0.08), (0.22, 0.30, 0.10)], rough=0.6)
M['redtwig'] = mat_simple('red twig', [(0.45, 0.04, 0.03), (0.55, 0.08, 0.05)], rough=0.5)
M['grass_lawn'] = mat_leaf('lawn blades', [(0.06, 0.20, 0.04), (0.10, 0.28, 0.05), (0.16, 0.33, 0.07), (0.20, 0.32, 0.10)], under=(0.12, 0.28, 0.06), rough=0.55, transl=0.3)
M['bluestem'] = mat_leaf('little bluestem', [(0.24, 0.34, 0.30), (0.30, 0.38, 0.30), (0.40, 0.30, 0.22)], rough=0.6, transl=0.2)
M['switch'] = mat_leaf('switchgrass', [(0.20, 0.32, 0.12), (0.30, 0.38, 0.18)], rough=0.6, transl=0.25)
M['dropseed'] = mat_leaf('prairie dropseed', [(0.18, 0.34, 0.08), (0.26, 0.40, 0.12)], rough=0.6, transl=0.25)
M['cone_petal'] = mat_leaf('coneflower petal', [(0.62, 0.16, 0.38), (0.75, 0.30, 0.50)], under=(0.6, 0.25, 0.4), rough=0.5, transl=0.25)
M['bes_petal'] = mat_leaf('black-eyed susan petal', [(0.85, 0.50, 0.01), (0.95, 0.66, 0.03)], under=(0.85, 0.55, 0.02), rough=0.5, transl=0.25)
M['bee_petal'] = mat_leaf('bee balm', [(0.55, 0.30, 0.62), (0.70, 0.42, 0.75)], under=(0.6, 0.4, 0.7), rough=0.5, transl=0.25)
M['cone_disk'] = mat_simple('cone disk', [(0.30, 0.10, 0.02), (0.42, 0.16, 0.03)], rough=0.9)
M['bes_disk'] = mat_simple('susan disk', [(0.06, 0.03, 0.01)], rough=0.9)
M['stem'] = mat_simple('flower stem', [(0.12, 0.24, 0.06)], rough=0.7)
# fruit
m, nt, out = nmat('haskap berry'); b = principled(nt, Roughness=0.42, **{'Base Color': (0.07, 0.07, 0.22, 1), 'Sheen Weight': 0.9, 'Sheen Tint': (0.55, 0.62, 0.80, 1), 'Sheen Roughness': 0.35})
nt.links.new(b.outputs[0], out.inputs['Surface']); M['haskap_fruit'] = m
m, nt, out = nmat('raspberry'); b = principled(nt, Roughness=0.28, **{'Base Color': (0.50, 0.02, 0.05, 1), 'Subsurface Weight': 0.35, 'Subsurface Radius': (0.6, 0.1, 0.1), 'Subsurface Scale': 0.004, 'Sheen Weight': 0.2})
add_bump(nt, b, 'voronoi', 230, 0.65, 0.004); nt.links.new(b.outputs[0], out.inputs['Surface']); M['rasp_fruit'] = m
m, nt, out = nmat('raspberry unripe'); b = principled(nt, Roughness=0.4, **{'Base Color': (0.45, 0.50, 0.18, 1)}); add_bump(nt, b, 'voronoi', 230, 0.6, 0.004)
nt.links.new(b.outputs[0], out.inputs['Surface']); M['rasp_green'] = m
M['aronia_fruit'] = mat_simple('aronia berry', [(0.015, 0.012, 0.02), (0.03, 0.02, 0.04)], rough=0.18, **{'Coat Weight': 0.5})
M['aronia_green'] = mat_simple('aronia unripe', [(0.25, 0.38, 0.10), (0.35, 0.40, 0.12)], rough=0.35)
M['service_fruit'] = mat_simple('serviceberry fruit', [(0.12, 0.03, 0.10)], rough=0.3)
# ground
m, nt, out = nmat('lawn ground'); b = principled(nt, Roughness=0.85)
tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.35; n1.inputs['Detail'].default_value = 6
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); cr = nt.nodes.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].color = (0.05, 0.13, 0.03, 1); cr.color_ramp.elements[1].color = (0.13, 0.25, 0.06, 1); e = cr.color_ramp.elements.new(0.75); e.color = (0.17, 0.25, 0.07, 1)
wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 0.6; wv.bands_direction = 'Y'; nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY_ADD'; mx.inputs[1].default_value = 0.12; nt.links.new(wv.outputs['Fac'], mx.inputs[0]); nt.links.new(n1.outputs['Fac'], mx.inputs[2])
nt.links.new(mx.outputs[0], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
add_bump(nt, b, 'noise', 90, 0.5, 0.02); nt.links.new(b.outputs[0], out.inputs['Surface']); M['lawn'] = m
m, nt, out = nmat('mulch'); b = principled(nt, Roughness=0.95)
tc = nt.nodes.new('ShaderNodeTexCoord'); vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 55; nt.links.new(tc.outputs['Object'], vo.inputs['Vector'])
cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (0.05, 0.03, 0.02, 1); cr.color_ramp.elements[1].color = (0.24, 0.15, 0.09, 1)
e = cr.color_ramp.elements.new(0.5); e.color = (0.15, 0.09, 0.05, 1); nt.links.new(vo.outputs['Color'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.9; bm.inputs['Distance'].default_value = 0.02
nt.links.new(vo.outputs['Distance'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal']); nt.links.new(b.outputs[0], out.inputs['Surface']); M['mulch'] = m
m, nt, out = nmat('concrete'); b = principled(nt, Roughness=0.8, **{'Base Color': (0.52, 0.51, 0.48, 1)}); add_bump(nt, b, 'noise', 60, 0.15, 0.01); nt.links.new(b.outputs[0], out.inputs['Surface']); M['conc'] = m
M['drip'] = mat_simple('drip tube', [(0.01, 0.01, 0.01)], rough=0.4)
M['water'] = mat_simple('pond', [(0.05, 0.09, 0.08)], rough=0.04, **{'Transmission Weight': 0.0})
# house
m, nt, out = nmat('brick Chimney Mountain'); b = principled(nt, Roughness=0.85)
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
ad = nt.nodes.new('ShaderNodeMath'); nt.links.new(sep.outputs[0], ad.inputs[0]); nt.links.new(sep.outputs[1], ad.inputs[1])
cb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(ad.outputs[0], cb.inputs[0]); nt.links.new(sep.outputs[2], cb.inputs[1])
br = nt.nodes.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 4.6; br.inputs['Color1'].default_value = (0.15, 0.05, 0.028, 1); br.inputs['Color2'].default_value = (0.10, 0.042, 0.03, 1)
br.inputs['Mortar'].default_value = (0.42, 0.40, 0.36, 1); br.inputs['Mortar Size'].default_value = 0.012; nt.links.new(cb.outputs[0], br.inputs['Vector'])
nt.links.new(br.outputs['Color'], b.inputs['Base Color']); bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.4; nt.links.new(br.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
nt.links.new(b.outputs[0], out.inputs['Surface']); M['brick'] = m
m, nt, out = nmat('board and batten Almost Midnight'); b = principled(nt, Roughness=0.8, **{'Base Color': (0.022, 0.03, 0.05, 1), 'Specular IOR Level': 0.3})
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0]); ad = nt.nodes.new('ShaderNodeMath'); nt.links.new(sep.outputs[0], ad.inputs[0]); nt.links.new(sep.outputs[1], ad.inputs[1])
wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 1.0; wv.wave_profile = 'SAW'; cb = nt.nodes.new('ShaderNodeCombineXYZ'); mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 1.0
nt.links.new(ad.outputs[0], cb.inputs[0]); nt.links.new(cb.outputs[0], wv.inputs['Vector']); bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.6
nt.links.new(wv.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal']); nt.links.new(b.outputs[0], out.inputs['Surface']); M['siding'] = m
M['shingle'] = mat_simple('shingles Charcoal', [(0.05, 0.05, 0.055)], rough=0.9); add_bump(M['shingle'].node_tree, M['shingle'].node_tree.nodes['Principled BSDF'], 'noise', 30, 0.4)
M['trim'] = mat_simple('trim', [(0.80, 0.80, 0.78)], rough=0.5)
M['glass'] = mat_simple('window glass', [(0.02, 0.025, 0.03)], rough=0.03, **{'Specular IOR Level': 0.8})
M['gdoor'] = mat_simple('garage door', [(0.04, 0.04, 0.045)], rough=0.5)

# ------------------------------------------------------------------ terrain mesh
def grid_mesh(name, x0, x1, y0, y1, step, zfn, mat, keep=None, collection='SITE', lift=0.0):
    xs = np.arange(x0, x1 + 1e-6, step); ys = np.arange(y0, y1 + 1e-6, step); nx, ny = len(xs), len(ys)
    X, Y = np.meshgrid(xs, ys); Z = zfn(X, Y) + lift
    V = np.stack([X * FT, Y * FT, Z], -1).reshape(-1, 3)
    I = np.arange(nx * ny).reshape(ny, nx)
    quads = np.stack([I[:-1, :-1], I[:-1, 1:], I[1:, 1:], I[1:, :-1]], -1).reshape(-1, 4)
    if keep is not None:
        cx = (X[:-1, :-1] + step / 2).ravel(); cy = (Y[:-1, :-1] + step / 2).ravel(); quads = quads[keep(cx, cy)]
    return make_mesh(name, V, quads.ravel(), np.arange(len(quads)) * 4, mat, collection)

BOX = [20, 48, 42, 94]
ROWS = [dict(x=25, n0=46, n1=90, crop='haskap'), dict(x=34, n0=46, n1=90, crop='fallRasp'), dict(x=43, n0=46, n1=66, crop='aronia'), dict(x=43, n0=70, n1=90, crop='summerRasp')]
in_strip = lambda x, y: np.any([(np.abs(x - r['x']) < 2) & (y > r['n0'] - 1) & (y < r['n1'] + 1) for r in ROWS], 0)
in_drive = lambda x, y: ((x > 65.1) & (x < 85.1) & (y > -21) & (y < 89.9)) | ((x > 65.1) & (x < 94.7) & (y >= 89.9) & (y < 116.65)) | ((x > 85.1) & (x < 131) & (y > 84.5) & (y < 87.5))
in_house = lambda x, y: (x > HX) & (x < HX + 49.84) & (y > HY) & (y < HY + 44.83)
_t = time.time()
grid_mesh('terrain', -80, 300, -60, 300, 2.0, gz, M['lawn'], keep=lambda x, y: ~in_drive(x, y) & ~in_house(x, y))
grid_mesh('drive', 64, 96, -21, 117, 1.0, gz, M['conc'], keep=lambda x, y: in_drive(x, y), lift=0.03)
for r in ROWS:   # mulch strips: crowned 2" in the middle
    grid_mesh('mulch ' + r['crop'], r['x'] - 2, r['x'] + 2, r['n0'] - 1, r['n1'] + 1, 0.5, lambda X, Y, r=r: gz(X, Y) + 0.03 + 0.04 * (1 - ((X - r['x']) / 2) ** 2), M['mulch'], collection='BERRIES')
grid_mesh('mulch drive bed', 54, 63, 14, 114, 1.0, lambda X, Y: gz(X, Y) + 0.03, M['mulch'], collection='SITE')
pw = [] ; # pond water plane
make_mesh('pond', np.array([[-300, 226, 0], [240, 226, 0], [240, 420, 0], [-300, 420, 0]]) * [FT, FT, 1] + [0, 0, (POND['water'] - Z0) * FT], np.arange(4), [0], M['water'], 'SITE')
make_mesh('far shore', np.array([[-700, 420, 0], [700, 420, 0], [700, 900, 0], [-700, 900, 0]]) * [FT, FT, 1] + [0, 0, (866.0 - Z0) * FT], np.arange(4), [0], M['lawn'], 'SITE')
print(f'terrain in {time.time() - _t:.1f}s')

# ------------------------------------------------------------------ plant builders
def m3(x, y, z=None):
    x = np.asarray(x, float); y = np.asarray(y, float)
    return np.stack([x * FT, y * FT, gz(x, y) if z is None else z], -1)

def shrub(cx, cy, H, R, nleaf, leafsize, zbase=0.0, shell=0.35, flat=1.0):
    """leaf points in an ellipsoid crown; returns P, outward directions, centre"""
    base = m3([cx], [cy])[0] + [0, 0, zbase]
    m = nleaf * 3; u = RNG.random(m); r = u ** shell; th = RNG.random(m) * 2 * np.pi; ph = np.arccos(1 - 2 * RNG.random(m))
    d = np.stack([np.sin(ph) * np.cos(th), np.sin(ph) * np.sin(th), np.cos(ph)], 1)
    c = base + [0, 0, H * 0.55]
    P = c + d * r[:, None] * [R, R, H * 0.5 * flat]
    P = P[P[:, 2] > base[2] + 0.18 + H * 0.08][:nleaf]
    out = norm(P - (base + [0, 0, H * 0.35]))
    return P, out, base

def add_leaves(name, P, out, size, leafbase, mat, coll_, up=0.55, jitter=0.6, aspect=1.0):
    N = len(P); Y = norm(out + [0, 0, up] + RNG.normal(0, jitter, (N, 3)))
    Zh = norm(np.array([0, 0, 1.0]) + RNG.normal(0, 0.45, (N, 3)) + out * 0.3)
    X, Y, Z = frame_from(Y, Zh); s = size * (0.7 + 0.6 * RNG.random(N))
    return instances(name, leafbase[0], leafbase[1], P, X, Y, Z, np.stack([s * aspect, s, s], 1), mat, coll_)

def add_stems(name, A, B, rad, mat, coll_, base=CYL):
    A = np.asarray(A); B = np.asarray(B); D = B - A; L = np.linalg.norm(D, axis=1); X, Y, Z = frame_up(D)
    return instances(name, base[0], base[1], A, X, Y, Z, np.stack([rad, rad, L], 1), mat, coll_)

def add_spheres(name, P, r, mat, coll_, stretch=(1, 1, 1), base=ICO1, hang=None):
    P = np.asarray(P); N = len(P)
    if hang is None: X, Y, Z = np.tile([1, 0, 0.], (N, 1)), np.tile([0, 1, 0.], (N, 1)), np.tile([0, 0, 1.], (N, 1))
    else: X, Y, Z = frame_up(hang)
    r = np.asarray(r) * np.ones(N)
    return instances(name, base[0], base[1], P, X, Y, Z, np.stack([r * stretch[0], r * stretch[1], r * stretch[2]], 1), mat, coll_)

def branches(base, P, H, R, n, r0, key='bark'):
    """n curved main stems from a crown at the base splaying out to ~70% of the canopy, then a twig to each leaf"""
    ang = RNG.random(n) * 2 * np.pi; rad = R * (0.35 + 0.4 * RNG.random(n)); top = H * (0.55 + 0.3 * RNG.random(n))
    starts = base + np.stack([np.cos(ang) * 0.05, np.sin(ang) * 0.05, np.zeros(n)], 1)
    ends = base + np.stack([np.cos(ang) * rad, np.sin(ang) * rad, top], 1)
    A_, B_, rr = [], [], []
    for t0, t1, w in ((0, 0.35, 1.0), (0.35, 0.7, 0.75), (0.7, 1.0, 0.5)):
        f = lambda t: starts + (ends - starts) * np.stack([np.full(n, t ** 1.4), np.full(n, t ** 1.4), np.full(n, t ** 0.8)], 1)
        A_.append(f(t0)); B_.append(f(t1)); rr.append(np.full(n, r0 * w))
    collect(STEMS, key, np.concatenate(A_), np.concatenate(B_), np.concatenate(rr))
    # twig: each leaf back toward the nearest point on the nearest main stem
    E = ends[None, :, :]; S0 = starts[None, :, :]; D = E - S0; Q = P[:, None, :]
    t = np.clip(((Q - S0) * D).sum(-1) / (D * D).sum(-1), 0.25, 1.0); C = S0 + D * t[..., None]
    k = np.argmin(np.linalg.norm(Q - C, axis=-1), 1); tgt = C[np.arange(len(P)), k]
    tgt = P + norm(tgt - P) * np.minimum(np.linalg.norm(tgt - P, axis=1, keepdims=True), 0.22)
    collect(STEMS, 'twig', P, tgt, np.full(len(P), 0.0018))

def shoot_shrub(cx, cy, H, R, n_shoots, leaves_per, opposite, stem_n, stem_r):
    """main stems -> leafy shoots (15–28 cm) ending on the crown shell -> leaves along each shoot.
    returns leaf P/out, shoot tips, leaf-node points (for fruit), base"""
    tips, _, base = shrub(cx, cy, H, R, n_shoots, 0, shell=0.22)
    ang = RNG.random(stem_n) * 2 * np.pi; rad = R * (0.3 + 0.35 * RNG.random(stem_n)); top = H * (0.5 + 0.25 * RNG.random(stem_n))
    S0 = base + np.stack([np.cos(ang) * 0.05, np.sin(ang) * 0.05, np.zeros(stem_n)], 1); E = base + np.stack([np.cos(ang) * rad, np.sin(ang) * rad, top], 1)
    f = lambda t: S0 + (E - S0) * np.array([t ** 1.4, t ** 1.4, t ** 0.8])
    for t0, t1, w in ((0, 0.35, 1.0), (0.35, 0.7, 0.75), (0.7, 1.0, 0.5)): collect(STEMS, 'bark', f(t0), f(t1), np.full(stem_n, stem_r * w))
    D = E - S0; Q = tips[:, None, :]; t = np.clip(((Q - S0[None]) * D[None]).sum(-1) / (D * D).sum(-1)[None], 0.3, 1.0); C = S0[None] + D[None] * t[..., None]
    k = np.argmin(np.linalg.norm(Q - C, axis=-1), 1); anchor = C[np.arange(len(tips)), k]
    L = 0.15 + 0.13 * RNG.random(len(tips)); sb = tips + norm(anchor - tips) * L[:, None]       # shoot base
    collect(STEMS, 'twig', sb, anchor, np.full(len(tips), 0.0028)); collect(STEMS, 'twig', tips, sb, np.full(len(tips), 0.0018))
    tt = np.linspace(0.25, 1.0, leaves_per // (2 if opposite else 1))
    node = (sb[:, None, :] + (tips - sb)[:, None, :] * tt[None, :, None]).reshape(-1, 3); sd = np.repeat(norm(tips - sb), len(tt), 0)
    side = norm(np.cross(sd, [0, 0, 1.0]) + RNG.normal(0, 0.3, sd.shape)); flip = np.where(np.arange(len(node)) % 2, 1, -1)[:, None]
    if opposite: P = np.concatenate([node, node]); out = np.concatenate([norm(side + sd * 0.5), norm(-side + sd * 0.5)])
    else: P = node; out = norm(side * flip + sd * 0.5)
    return P, out, tips, node, base

# ----- haskap: 8 shrubs @ 5.5', ~1.35 m tall (year 4–5), June fruit
LEAVES = {k: [] for k in ['haskap', 'aronia', 'rasp', 'service', 'dogwood']}
FRUIT = {k: [] for k in ['haskap', 'rasp_fall', 'rasp_green', 'aronia_ripe', 'aronia_green', 'service']}
STEMS = {k: [] for k in ['bark', 'cane', 'redtwig', 'twig', 'pedicel']}
def collect(d, k, *a): d[k].append(a)

R0 = ROWS[0]
for i, cy in enumerate(np.arange(R0['n0'] + 1.5, R0['n1'] - 1, 5.5)):
    cx = R0['x'] + RNG.normal(0, 0.15); H = 1.30 + RNG.random() * 0.2; R = 0.62 + RNG.random() * 0.08
    P, out, tips, nodes, base = shoot_shrub(cx, cy, H, R, int(300 * LITE), 10, True, 14, 0.0075)
    collect(LEAVES, 'haskap', P, out)
    # fruit: pairs hanging from leaf nodes on the outer, sunny side
    k = int(170 * max(LITE, 0.5)); node = nodes[RNG.choice(len(nodes), k)] - [0, 0, 0.004]
    fp = np.concatenate([node - [0, 0, 0.03], node - [0, 0, 0.028] + RNG.normal(0, 0.012, (k, 3)) * [1, 1, 0]])
    collect(FRUIT, 'haskap', fp, None); collect(STEMS, 'pedicel', fp + [0, 0, 0.012], np.concatenate([node, node]), np.full(2 * k, 0.0012))

# ----- aronia 'Viking': 4 @ 6', ~1.6 m, glossy leaves, corymbs of berries
R2 = ROWS[2]
for cy in np.arange(R2['n0'] + 1.5, R2['n1'] - 1, 6):
    cx = R2['x'] + RNG.normal(0, 0.15); H = 1.55 + RNG.random() * 0.2; R = 0.72
    P, out, tips, nodes, base = shoot_shrub(cx, cy, H, R, int(330 * LITE), 8, False, 16, 0.009)
    collect(LEAVES, 'aronia', P, out)
    nc = int(45 * max(LITE, 0.5)); cidx = RNG.choice(np.where(tips[:, 2] > base[2] + H * 0.45)[0], nc)
    pts, hub = [], []
    for c in cidx:
        cc = tips[c] + [0, 0, -0.01]; m_ = RNG.integers(8, 16); b = cc + RNG.normal(0, 0.016, (m_, 3)) * [1, 1, 0.4] - [0, 0, 0.022]
        pts.append(b); hub.append(np.repeat([cc], m_, 0))
    pts = np.concatenate(pts); hub = np.concatenate(hub)
    collect(FRUIT, 'aronia_ripe', pts, None); collect(FRUIT, 'aronia_green', pts, None); collect(STEMS, 'twig', pts + [0, 0, 0.004], hub, np.full(len(pts), 0.0009))

# ----- raspberries: hedgerow of canes, compound leaves, fruit on fall row
def raspberry_row(r, fruit_key, ripe_frac, hmin, hmax):
    ys = np.arange(r['n0'] + 0.6, r['n1'] - 0.3, 0.55)          # ~2 canes per foot of row
    for y in ys:
        for _ in range(2):
            x = r['x'] + RNG.normal(0, 0.55)
            b0 = m3([x], [y + RNG.normal(0, 0.2)])[0]; H = hmin + RNG.random() * (hmax - hmin)
            lean = np.array([RNG.normal(0, 0.18), RNG.normal(0, 0.12), 0]); segs = 4; pts = [b0]
            for s in range(1, segs + 1):
                t = s / segs; pts.append(b0 + [0, 0, H * t] + lean * t * t * H)
            pts = np.array(pts)
            collect(STEMS, 'cane', pts[:-1], pts[1:], np.linspace(0.0055, 0.0035, segs))
            # leaves at nodes on the upper 70%
            nodes = np.linspace(0.22, 1.0, 17 if LITE == 1 else 9)
            for t in nodes:
                p = b0 + [0, 0, H * t] + lean * t * t * H; ang = RNG.random() * 2 * np.pi
                o = np.array([np.cos(ang), np.sin(ang), 0.25]); pet = p + o * 0.07; collect(STEMS, 'pedicel', p[None], pet[None], np.array([0.0018]))
                # 3 leaflets: terminal + 2 laterals
                for la, sc in ((0, 1.0), (0.9, 0.8), (-0.9, 0.8)):
                    dd = np.array([np.cos(ang + la), np.sin(ang + la), 0.15])
                    collect(LEAVES, 'rasp', pet[None, :] + dd[None, :] * 0.01, dd[None, :] * sc)
            if fruit_key:
                nf = RNG.integers(5, 12); tt = 0.55 + RNG.random(nf) * 0.45
                fp = b0 + tt[:, None] * np.array([0, 0, H]) + (tt ** 2)[:, None] * lean * H
                ang = RNG.random(nf) * 2 * np.pi; cp = fp.copy(); fp = fp + np.stack([np.cos(ang), np.sin(ang), -np.ones(nf) * 0.6], 1) * 0.07
                collect(STEMS, 'pedicel', fp + [0, 0, 0.008], cp, np.full(nf, 0.0016))
                ripe = RNG.random(nf) < ripe_frac
                collect(FRUIT, fruit_key, fp[ripe], None); collect(FRUIT, 'rasp_green', fp[~ripe], None)
raspberry_row(ROWS[1], 'rasp_fall', 0.7, 1.15, 1.55)     # fall-bearing 'Caroline' (fruiting in Aug render)
raspberry_row(ROWS[3], None, 0, 1.2, 1.6)                # 'Nova' summer raspberry (fruited in July)

# ----- drive bed (Plan A): serviceberry ×2, red-twig dogwood, switchgrass, little bluestem, black-eyed Susan
for cy in (45, 90):
    cx = 58.5; base = m3([cx], [cy])[0]
    for k in range(5):     # multi-stem trunk, splaying into the crown
        top = base + [RNG.normal(0, 0.45), RNG.normal(0, 0.45), 2.0 + RNG.random() * 0.6]; collect(STEMS, 'bark', base[None], top[None], np.array([0.03]))
    P, out, _ = shrub(cx, cy, 2.8, 1.6, int(16000 * LITE), 0.045, zbase=1.2, shell=0.18, flat=0.85)
    collect(LEAVES, 'service', P, out)
    collect(FRUIT, 'service', P[RNG.choice(len(P), 60)] - [0, 0, 0.03], None)
dog = [(57, 20), (60, 30), (57, 62), (60, 72), (57, 104), (60, 110)]
for cx, cy in dog:
    P, out, base = shrub(cx, cy, 1.5, 0.8, int(1600 * LITE), 0.05, shell=0.3)
    collect(LEAVES, 'dogwood', P, out); n = 18; collect(STEMS, 'redtwig', np.repeat([base], n, 0), base + (P[RNG.choice(len(P), n)] - base) * 0.85, np.full(n, 0.01))

def clump(name, pts, mat, H, spread, nbl, coll_='SITE'):
    allP, allX, allY, allZ, allS = [], [], [], [], []
    for x, y in pts:
        b0 = m3([x], [y])[0]; ang = RNG.random(nbl) * 2 * np.pi; tilt = RNG.random(nbl) * spread
        D = np.stack([np.cos(ang) * tilt, np.sin(ang) * tilt, np.ones(nbl)], 1)
        X, Y, Z = frame_up(D); allP.append(np.repeat([b0], nbl, 0)); allX.append(X); allY.append(Y); allZ.append(Z)
        h = H * (0.6 + 0.4 * RNG.random(nbl)); allS.append(np.stack([np.full(nbl, 0.012), np.full(nbl, 0.012), h], 1))
    return instances(name, BLADE[0], BLADE[1], np.concatenate(allP), np.concatenate(allX), np.concatenate(allY), np.concatenate(allZ), np.concatenate(allS), mat, coll_)

def scatter_pts(x0, x1, y0, y1, n, avoid=None):
    p = np.stack([x0 + (x1 - x0) * RNG.random(n * 2), y0 + (y1 - y0) * RNG.random(n * 2)], 1)
    if avoid is not None: p = p[~avoid(p[:, 0], p[:, 1])]
    return p[:n]

avoid_trees = lambda x, y: (np.hypot(x - 58.5, y - 45) < 4) | (np.hypot(x - 58.5, y - 90) < 4) | np.any([np.hypot(x - a, y - b) < 2.5 for a, b in dog], 0)
clump('switchgrass', scatter_pts(54.6, 62.4, 14, 113, 14, avoid_trees), M['switch'], 1.25, 0.35, 70)
clump('little bluestem drive', scatter_pts(54.6, 62.4, 14, 113, 14, avoid_trees), M['bluestem'], 0.75, 0.45, 55)

# ----- flowers (meadow strip x 7–19 + black-eyed Susans in the drive bed)
def flowers(name, pts, petal_mat, disk_mat, petal_len, n_pet, disk_r, hmin, hmax, droop=0.35, disk_stretch=1.0):
    pts = np.asarray(pts); N = len(pts); g = m3(pts[:, 0], pts[:, 1]); H = hmin + (hmax - hmin) * RNG.random(N)
    lean = np.stack([RNG.normal(0, 0.08, N), RNG.normal(0, 0.08, N), np.ones(N)], 1)
    top = g + norm(lean) * H[:, None]
    add_stems(name + ' stems', g, top, np.full(N, 0.0035), M['stem'], 'MEADOW', CYL_STRAIGHT)
    add_spheres(name + ' disks', top, disk_r, disk_mat, 'MEADOW', (1, 1, disk_stretch), ICO1)
    a = (np.arange(n_pet)[None, :] / n_pet * 2 * np.pi + RNG.random((N, 1))).reshape(-1)
    Pp = np.repeat(top, n_pet, 0); out = np.stack([np.cos(a), np.sin(a), np.full(len(a), -droop)], 1)
    X, Y, Z = frame_from(out, np.tile([0, 0, 1.0], (len(a), 1)))
    s = petal_len * (0.85 + 0.3 * RNG.random(len(a)))
    instances(name + ' petals', LEAF_SMALL[0], LEAF_SMALL[1], Pp + out * disk_r * 0.6, X, Y, Z, np.stack([s * 0.45, s, s], 1), petal_mat, 'MEADOW')
    # basal leaves
    nl = 5; lp = np.repeat(g, nl, 0) + [0, 0, 0.05]; aa = RNG.random(N * nl) * 2 * np.pi
    add_leaves(name + ' leaves', lp, np.stack([np.cos(aa), np.sin(aa), np.zeros(len(aa))], 1), 0.13, LEAF_OVAL, M['stem'], 'MEADOW', up=0.4, jitter=0.2)

mead = lambda n: scatter_pts(7.5, 19.3, 14, 140, int(n * LITE))
flowers('coneflower', mead(700), M['cone_petal'], M['cone_disk'], 0.045, 13, 0.017, 0.6, 0.95, droop=0.6, disk_stretch=1.3)
flowers('black-eyed susan', np.concatenate([mead(700), scatter_pts(54.6, 62.4, 14, 113, int(60 * LITE), avoid_trees)]), M['bes_petal'], M['bes_disk'], 0.035, 13, 0.011, 0.45, 0.75, droop=0.15)
flowers('bee balm', mead(350), M['bee_petal'], M['bee_petal'], 0.03, 16, 0.016, 0.7, 1.0, droop=-0.6)
clump('prairie dropseed', mead(260), M['dropseed'], 0.5, 0.9, 60, 'MEADOW')
clump('little bluestem', mead(220), M['bluestem'], 0.8, 0.4, 45, 'MEADOW')

# ----- mown fescue blades around the patch (eye-level views); the lawn material carries the rest
near = lambda x, y: ~in_strip(x, y)
n_bl = int(260000 * LITE); bp = scatter_pts(19.6, 52.6, 30, 100, n_bl, lambda x, y: in_strip(x, y))
bg = m3(bp[:, 0], bp[:, 1]); N = len(bp); ang = RNG.random(N) * 2 * np.pi; tilt = RNG.random(N) * 0.5
D = np.stack([np.cos(ang) * tilt, np.sin(ang) * tilt, np.ones(N)], 1); X, Y, Z = frame_up(D)
instances('mown fescue', BLADE[0], BLADE[1], bg, X, Y, Z, np.stack([np.full(N, 0.006), np.full(N, 0.006), 0.06 + 0.05 * RNG.random(N)], 1), M['grass_lawn'], 'BERRIES')
# meadow-strip grass matrix
mp = scatter_pts(7.2, 19.6, 14, 140, int(60000 * LITE)); mg = m3(mp[:, 0], mp[:, 1]); N = len(mp); ang = RNG.random(N) * 2 * np.pi; tilt = RNG.random(N) * 0.7
D = np.stack([np.cos(ang) * tilt, np.sin(ang) * tilt, np.ones(N)], 1); X, Y, Z = frame_up(D)
instances('meadow grass', BLADE[0], BLADE[1], mg, X, Y, Z, np.stack([np.full(N, 0.01), np.full(N, 0.01), 0.25 + 0.35 * RNG.random(N)], 1), M['grass_lawn'], 'MEADOW')

# ----- drip line under the mulch edge (visible as a black tube at the base)
for r in ROWS[:3] if False else ROWS:
    ys = np.arange(r['n0'] - 0.5, r['n1'] + 0.5, 1.0); A_ = m3(np.full(len(ys) - 1, r['x'] + 0.6), ys[:-1]) + [0, 0, 0.075]; B_ = m3(np.full(len(ys) - 1, r['x'] + 0.6), ys[1:]) + [0, 0, 0.075]
    add_stems('drip ' + r['crop'], A_, B_, np.full(len(A_), 0.008), M['drip'], 'BERRIES', CYL_STRAIGHT)

# flush collected leaves / fruit / stems into objects
def flush():
    for k, lst in LEAVES.items():
        if not lst: continue
        P = np.concatenate([a[0] for a in lst]); O = np.concatenate([a[1] for a in lst])
        cfg = {'haskap': (0.055, LEAF_OVAL, M['haskap_leaf'], 'BERRIES', 1.0), 'aronia': (0.065, LEAF_OBOV, M['aronia_leaf'], 'BERRIES', 1.0),
               'rasp': (0.10, LEAF_RASP, M['rasp_leaf'], 'BERRIES', 1.0), 'service': (0.07, LEAF_OVAL, M['service_leaf'], 'SITE', 1.3), 'dogwood': (0.07, LEAF_OVAL, M['dogwood_leaf'], 'SITE', 1.3)}[k]
        if k == 'rasp':
            X, Y, Z = frame_from(norm(O + RNG.normal(0, 0.15, O.shape) - [0, 0, 0.15]), np.tile([0, 0, 1.0], (len(O), 1)) + RNG.normal(0, 0.2, O.shape))
            s = cfg[0] * np.linalg.norm(O, axis=1) * (0.8 + 0.4 * RNG.random(len(O)))
            ob = instances('leaves rasp', cfg[1][0], cfg[1][1], P, X, Y, Z, np.stack([s, s, s], 1), cfg[2], cfg[3])
        else:
            ob = add_leaves('leaves ' + k, P, O, cfg[0], cfg[1], cfg[2], cfg[3], aspect=cfg[4])
        if k == 'aronia': ob['season_aug_mat'] = 1
    for k, lst in STEMS.items():
        if not lst: continue
        A_ = np.concatenate([a[0] for a in lst]); B_ = np.concatenate([a[1] for a in lst]); r = np.concatenate([a[2] for a in lst])
        add_stems('stems ' + k, A_, B_, r, {'bark': M['bark'], 'cane': M['cane'], 'redtwig': M['redtwig'], 'twig': M['twig'], 'pedicel': M['pedicel']}[k], 'BERRIES' if k != 'redtwig' else 'SITE', CYL if k in ('bark', 'cane', 'redtwig') else CYL_STRAIGHT)
    spec = {'haskap': (0.0075, M['haskap_fruit'], (1, 1, 1.9), ICO1), 'rasp_fall': (0.0095, M['rasp_fruit'], (1, 1, 1.15), ICO2), 'rasp_green': (0.007, M['rasp_green'], (1, 1, 1.1), ICO2),
            'aronia_ripe': (0.0062, M['aronia_fruit'], (1, 1, 1), ICO1), 'aronia_green': (0.0045, M['aronia_green'], (1, 1, 1), ICO1), 'service': (0.005, M['service_fruit'], (1, 1, 1), ICO1)}
    for k, lst in FRUIT.items():
        if not lst: continue
        P = np.concatenate([a[0] for a in lst]); r, mt, st, base = spec[k]
        hang = np.tile([0, 0, -1.0], (len(P), 1)) + RNG.normal(0, 0.25, (len(P), 3)) if k == 'haskap' else None
        add_spheres('fruit ' + k, P, r * (0.85 + 0.3 * RNG.random(len(P))), mt, 'BERRIES', st, base, hang)
flush()
STEMS = {k: [] for k in STEMS}

# ------------------------------------------------------------------ backdrop: house massing, trees
def box(name, x0, x1, y0, y1, z0, z1, mat, coll_='HOUSE'):
    v = np.array([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], float)
    v[:, :2] *= FT; v[:, 2] = (v[:, 2] - Z0) * FT
    f = np.array([[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
    return make_mesh(name, v, f.ravel(), np.arange(6) * 4, mat, coll_, smooth=False)
hx0, hx1, hy0, hy1 = HX, HX + 49.84, HY, HY + 44.83
box('brick', hx0, hx1, hy0, hy1, 876.0, 899.3, M['brick'])
box('siding', hx0 - 0.05, hx1 + 0.05, hy0 - 0.05, hy1 + 0.05, 899.3, 908.0, M['siding'])
box('frieze', hx0 - 0.25, hx1 + 0.25, hy0 - 0.25, hy1 + 0.25, 907.6, 908.2, M['trim'])
# hip roof
o = 1.2; rx0, rx1, ry0, ry1 = hx0 - o, hx1 + o, hy0 - o, hy1 + o; ridge_z = 919.5; inset = (ry1 - ry0) / 2
rv = np.array([[rx0, ry0, 908.2], [rx1, ry0, 908.2], [rx1, ry1, 908.2], [rx0, ry1, 908.2], [rx0 + inset, (ry0 + ry1) / 2, ridge_z], [rx1 - inset, (ry0 + ry1) / 2, ridge_z]], float)
rv[:, :2] *= FT; rv[:, 2] = (rv[:, 2] - Z0) * FT
make_mesh('roof', rv, [0, 1, 5, 4, 1, 2, 5, 2, 3, 4, 5, 3, 0, 4], [0, 4, 7, 11], M['shingle'], 'HOUSE', smooth=False)
# garage doors on the west face (side entry, facing the pad), windows on west/south
box('garage door N', hx0 - 0.3, hx0 + 0.05, 101.5, 117.5, 887.83, 895.83, M['gdoor']); box('garage door S', hx0 - 0.3, hx0 + 0.05, 92.0, 100.5, 887.83, 895.83, M['gdoor'])
for y0 in (122, 128.5):
    box('win W1', hx0 - 0.25, hx0 + 0.05, y0, y0 + 3, 891.5, 896.5, M['glass']); box('trim W1', hx0 - 0.2, hx0, y0 - 0.4, y0 + 3.4, 891.1, 896.9, M['trim'])
for y0 in (93, 103, 113, 124):
    box('win W2', hx0 - 0.25, hx0 + 0.05, y0, y0 + 3, 901.5, 906.0, M['glass']); box('trim W2', hx0 - 0.2, hx0, y0 - 0.4, y0 + 3.4, 901.1, 906.4, M['trim'])
for x0 in (118, 133, 139):
    box('win S1', x0, x0 + 3, hy0 - 0.25, hy0 + 0.05, 891.5, 897.0, M['glass']); box('trim S1', x0 - 0.4, x0 + 3.4, hy0 - 0.2, hy0, 891.1, 897.4, M['trim'])
for x0 in (100, 108, 118, 133, 139):
    box('win S2', x0, x0 + 3, hy0 - 0.25, hy0 + 0.05, 901.5, 906.0, M['glass']); box('trim S2', x0 - 0.4, x0 + 3.4, hy0 - 0.2, hy0, 901.1, 906.4, M['trim'])

def tree(name_key, cx, cy, H, R, crown_base, n=3500, conifer=False):
    base = m3([cx], [cy])[0]
    collect(STEMS, 'bark', base[None], (base + [0, 0, crown_base + (H - crown_base) * 0.5])[None], np.array([0.12 if not conifer else 0.16]))
    if conifer:
        u = RNG.random(n); z = crown_base + (H - crown_base) * u ** 0.8; rr = R * (1 - u ** 0.8) * np.sqrt(RNG.random(n)) ** 0.4
        th = RNG.random(n) * 2 * np.pi; P = base + np.stack([np.cos(th) * rr, np.sin(th) * rr, z], 1)
    else:
        P, _, _ = shrub(cx, cy, H - crown_base, R, n, 0.3, zbase=crown_base, shell=0.25, flat=0.85)
    TREES.append((P, conifer, base))
TREES = []
tr = np.random.default_rng(11)
for i in range(58):       # pond buffer + neighbours' tree line to the north and west, mixed sizes
    cx = tr.uniform(-70, 210); cy = tr.uniform(205, 300) if i < 44 else tr.uniform(30, 260)
    if i >= 44: cx = tr.uniform(-85, -40)
    big = tr.random() < 0.45; H = tr.uniform(13, 21) if big else tr.uniform(6, 12)
    tree('bg', cx, cy, H, tr.uniform(0.25, 0.4) * H, tr.uniform(0.15, 0.3) * H, int((3200 if big else 1600) * max(LITE, 0.6)))
for cx, cy in ((18, 200), (38, 206)): tree('pine', cx, cy, 7.5, 2.6, 0.6, 3000, True)
for i in range(46):       # far shore of the pond, so it reads as a pond and not open water to the horizon
    tree('far', tr.uniform(-320, 260), tr.uniform(430, 480), tr.uniform(12, 22), tr.uniform(5, 8), tr.uniform(2, 4), int(1800 * max(LITE, 0.6)))
P = np.concatenate([t[0] for t in TREES if not t[1]]); out = norm(P - np.concatenate([np.repeat([t[2] + [0, 0, 6]], len(t[0]), 0) for t in TREES if not t[1]]))
X, Y, Z = frame_from(norm(out + RNG.normal(0, 0.8, out.shape)), np.tile([0, 0, 1.0], (len(P), 1)) + RNG.normal(0, 0.6, out.shape))
s = 0.32 * (0.7 + 0.6 * RNG.random(len(P))); instances('tree canopies', CARD[0], CARD[1], P, X, Y, Z, np.stack([s, s, s], 1), M['tree_leaf'], 'BACKDROP')
P = np.concatenate([t[0] for t in TREES if t[1]]); X, Y, Z = frame_from(norm(RNG.normal(0, 1, P.shape) * [1, 1, 0.3]), np.tile([0, 0, 1.0], (len(P), 1)))
s = 0.35 * (0.7 + 0.6 * RNG.random(len(P))); instances('pines', CARD[0], CARD[1], P, X, Y, Z, np.stack([s, s, s], 1), M['pine'], 'BACKDROP')
lst = STEMS['bark']   # trunks collected by tree() after the first flush
if lst: add_stems('tree trunks', np.concatenate([a[0] for a in lst]), np.concatenate([a[1] for a in lst]), np.concatenate([a[2] for a in lst]), M['bark'], 'BACKDROP')
print('objects:', len(bpy.data.objects), ' verts:', sum(len(o.data.vertices) for o in bpy.data.objects if o.type == 'MESH'))

# ------------------------------------------------------------------ world, render settings
W = bpy.data.worlds.new('sky'); SC.world = W
try: W.use_nodes = True
except Exception: pass
wn = W.node_tree; [wn.nodes.remove(n) for n in list(wn.nodes)]
sky = wn.nodes.new('ShaderNodeTexSky'); bg = wn.nodes.new('ShaderNodeBackground'); wo = wn.nodes.new('ShaderNodeOutputWorld')
try: sky.sky_type = 'MULTIPLE_SCATTERING'
except Exception: pass
sky.altitude = 270; sky.air_density = 1.0; sky.aerosol_density = 1.6
wn.links.new(sky.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])
SC.render.engine = 'CYCLES'; SC.cycles.device = 'CPU'; SC.cycles.samples = A.samples; SC.cycles.use_adaptive_sampling = True; SC.cycles.adaptive_threshold = 0.02
SC.cycles.use_denoising = True
try: SC.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
SC.cycles.max_bounces = 6; SC.cycles.transparent_max_bounces = 4; SC.cycles.diffuse_bounces = 3; SC.cycles.glossy_bounces = 2; SC.cycles.transmission_bounces = 4
SC.render.film_transparent = False
try:
    SC.view_settings.view_transform = 'AgX'; SC.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    try: SC.view_settings.look = 'Medium High Contrast'
    except Exception: pass
SC.render.image_settings.file_format = 'PNG'

def set_season(season):
    """June: haskap ripe, aronia green fruit, raspberries leafy. August: fall raspberries + aronia ripe."""
    vis = {'june': {'fruit haskap', 'fruit aronia_green', 'fruit service'}, 'aug': {'fruit rasp_fall', 'fruit rasp_green', 'fruit aronia_ripe'}}[season]
    for ob in bpy.data.objects:
        if ob.name.startswith('fruit '): ob.hide_render = ob.name not in vis
    ar = bpy.data.objects.get('leaves aronia')
    if ar: ar.data.materials[0] = M['aronia_leaf_aug'] if season == 'aug' else M['aronia_leaf']
    # sun: June ~4 pm high from SW; late Aug ~6:15 pm lower from WSW
    sky.sun_elevation = math.radians(46 if season == 'june' else 24)
    sky.sun_rotation = math.radians(225 if season == 'june' else 250)
    sky.sun_intensity = 1.0
    SC.view_settings.exposure = -4.0 if season == 'june' else -3.7

def camera(name, eye_ft, target_ft, lens=30, eye_h=1.55, tgt_h=0.6, fstop=0, focus=None):
    cam = bpy.data.cameras.new(name); cam.lens = lens; ob = bpy.data.objects.new(name, cam); coll('CAMERAS').objects.link(ob)
    e = np.array([eye_ft[0] * FT, eye_ft[1] * FT, float(gz(eye_ft[0], eye_ft[1])) + eye_h]); t = np.array([target_ft[0] * FT, target_ft[1] * FT, float(gz(target_ft[0], target_ft[1])) + tgt_h])
    ob.location = e.tolist(); d = t - e
    import mathutils
    ob.rotation_euler = mathutils.Vector(d.tolist()).to_track_quat('-Z', 'Y').to_euler()
    cam.clip_start = 0.02; cam.clip_end = 2000
    if fstop:
        cam.dof.use_dof = True; cam.dof.aperture_fstop = fstop; cam.dof.focus_distance = focus or float(np.linalg.norm(d))
    return ob

VIEWS = {
    # name: (season, eye_ft, target_ft, lens, eye_h_m, tgt_h_m, fstop, focus_m, aspect)
    'aisle_august': ('aug', (29.5, 36.5), (31.5, 92), 26, 1.6, 0.5, 8, 6.0, (16, 9)),
    'aisle_june': ('june', (29.5, 36.5), (31.5, 92), 26, 1.6, 0.5, 8, 6.0, (16, 9)),
    'aerial': ('aug', (-8, -20), (44, 74), 28, 17.0, 0.0, 0, None, (16, 9)),
    'haskap_closeup': ('june', (27.6, 55.0), (25.2, 58.6), 70, 1.05, 0.85, 3.2, 1.25, (3, 2)),
    'raspberry_closeup': ('aug', (31.3, 55.5), (34.0, 58.8), 70, 1.15, 1.0, 3.2, 1.3, (3, 2)),
    'aronia_closeup': ('aug', (40.0, 48.5), (43.0, 51.5), 60, 1.35, 1.05, 3.5, 1.4, (3, 2)),
}
todo = list(VIEWS) if A.views == 'all' else A.views.split(',')
cams = {k: camera(k, v[1], v[2], v[3], v[4], v[5], v[6], v[7]) for k, v in VIEWS.items()}
if A.save:
    set_season('aug'); SC.camera = cams['aisle_august']
    try: bpy.ops.file.pack_all()
    except Exception as e: print('pack', e)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(A.save), compress=True); print('saved', A.save)
for k in todo:
    if k not in VIEWS: continue
    season, *_r, aspect = VIEWS[k]; set_season(season); SC.camera = cams[k]
    SC.render.resolution_x = A.res; SC.render.resolution_y = int(A.res * aspect[1] / aspect[0]); SC.render.resolution_percentage = 100
    SC.render.filepath = os.path.join(os.path.abspath(A.out), f'berry_{k}.png'); t = time.time()
    bpy.ops.render.render(write_still=True); print(f'rendered {k} in {time.time() - t:.0f}s', flush=True)
