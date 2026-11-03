# 离线画天：透视的云层、刚落下的太阳从下面打光、远处的霾、地平线的光。
# 画出来的是一张「天」（不含地面），和原来那张画同样大小、同样的取景：
#   宽 1536、高 447，地平线在最下面一点点；太阳在右边（x ≈ 0.885）地平线下面一点。
import numpy as np
from scipy.ndimage import gaussian_filter, zoom

import os
SCALE = float(os.environ.get('SKY_SCALE', '1'))            # 试画时先画小一点
W, H = int(1536 * SCALE), int(447 * SCALE)
F = 774.0 * SCALE             # 焦距（像素）：天这一截大约是地平线往上 30°
HZ = H + 6.0 * SCALE          # 地平线在画布下面一点点
SUN_X = 0.885                 # 太阳的方位（画布宽度的比例）

def grid(ss=1):
    ys, xs = np.mgrid[0:H * ss, 0:W * ss].astype(np.float32)
    xs = (xs + 0.5) / ss; ys = (ys + 0.5) / ss
    dx = (xs - W / 2) / F; dy = (HZ - ys) / F           # 视线方向（向前为 1）
    return xs, ys, dx, dy

# ---------------- 噪声 ----------------
class Noise:
    def __init__(self, seed):
        r = np.random.default_rng(seed)
        a = r.random((256, 256)) * np.pi * 2
        self.gx = np.cos(a).astype(np.float32); self.gy = np.sin(a).astype(np.float32)
        self.wx = r.random((256, 256)).astype(np.float32); self.wy = r.random((256, 256)).astype(np.float32)
    def perlin(self, x, y):
        xi = np.floor(x); yi = np.floor(y); fx = (x - xi).astype(np.float32); fy = (y - yi).astype(np.float32)
        xi = xi.astype(np.int64) & 255; yi = yi.astype(np.int64) & 255; x1 = (xi + 1) & 255; y1 = (yi + 1) & 255
        def d(ix, iy, ox, oy): return self.gx[iy, ix] * ox + self.gy[iy, ix] * oy
        n00 = d(xi, yi, fx, fy); n10 = d(x1, yi, fx - 1, fy); n01 = d(xi, y1, fx, fy - 1); n11 = d(x1, y1, fx - 1, fy - 1)
        u = fx * fx * fx * (fx * (fx * 6 - 15) + 10); v = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
        a = n00 + (n10 - n00) * u; b = n01 + (n11 - n01) * u
        return (a + (b - a) * v) * 0.72 + 0.5                # 大致 0..1
    def fbm(self, x, y, oct=6, lac=2.03, gain=0.5, rot=0.6):
        s = np.zeros_like(x, dtype=np.float32); amp = 0.5; norm = 0.0
        c, sn = np.cos(rot), np.sin(rot)
        for i in range(oct):
            s += amp * self.perlin(x + i * 17.3, y + i * 9.1); norm += amp
            x, y = (x * c - y * sn) * lac, (x * sn + y * c) * lac
            amp *= gain
        return s / norm
    def worley(self, x, y, jitter=0.9):
        # 到最近的随机点的距离（每格一个点）——用来画一片一片的鳞云
        xi = np.floor(x).astype(np.int64); yi = np.floor(y).astype(np.int64)
        best = np.full(x.shape, 9.0, dtype=np.float32)
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                cx = xi + ox; cy = yi + oy
                px = cx + 0.5 + (self.wx[cy & 255, cx & 255] - 0.5) * jitter
                py = cy + 0.5 + (self.wy[cy & 255, cx & 255] - 0.5) * jitter
                dd = (x - px) ** 2 + (y - py) ** 2
                best = np.minimum(best, dd)
        return np.sqrt(best)

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def mixc(a, b, t):
    t = np.asarray(t, dtype=np.float32)
    if t.ndim: t = t[..., None]
    return a + (b - a) * t
def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0

# ---------------- 天的底色 ----------------
def sky_base(dx, dy, stops, glow=None):
    """stops: [(仰角比例 0=地平线..1=画布顶, 颜色)]；glow: dict(color, power, width, band)"""
    el = np.clip(dy / ((HZ) / F), 0, 1)                     # 0 = 地平线，1 = 画布顶
    out = np.zeros(dy.shape + (3,), dtype=np.float32)
    pos = [p for p, _ in stops]; cols = [hexc(c) for _, c in stops]
    for i in range(len(stops) - 1):
        a, b = pos[i], pos[i + 1]
        m = (el >= a) & (el <= b)
        t = smooth(a, b, el[m]) if False else (el[m] - a) / (b - a)
        out[m] = cols[i] + (cols[i + 1] - cols[i]) * t[:, None]
    if glow:
        sx = (SUN_X * W - W / 2) / F
        ang = np.sqrt((dx - sx) ** 2 * 0.55 + (dy + glow.get('below', 0.03)) ** 2)   # 到太阳的「角距离」（横向放宽）
        g = np.exp(-ang / glow['width']) * glow['power']
        band = np.exp(-dy / glow['band'][0]) * glow['band'][1] * (0.35 + 0.65 * np.exp(-np.abs(dx - sx) / glow['band'][2]))
        out = out + hexc(glow['color'])[None, None, :] * (g + band)[..., None]
    return out

# ---------------- 一层云 ----------------
def deck(N, dx, dy, h, density_fn, light, shade, sun_col, amb_col, fog_col, fog_dist, alpha_k=2.2, steps=6, step_len=0.35, absorb=1.6, phase_g=0.55, phase_k=1.2, haze_far=None):
    """h：云层的高度（任意单位）；density_fn(u, v) → 0..1；
       light：光照方向在云平面上的方向 (lu, lv)；sun_col/amb_col：被照亮的颜色、背光的颜色；fog_col：远处并进去的颜色（每个像素一份）"""
    dyc = np.maximum(dy, 0.004)
    t = h / dyc
    u = dx * t; v = t
    dens = density_fn(u, v)
    # 朝太阳的方向走几步，看挡了多少
    occ = np.zeros_like(dens)
    for i in range(1, steps + 1):
        s = step_len * i
        occ += density_fn(u + light[0] * s * h, v + light[1] * s * h)
    T = np.exp(-absorb * occ * step_len)
    # 往太阳那边看时更亮（前向散射）
    sx = (SUN_X * W - W / 2) / F
    vx, vy, vz = dx, dy, np.ones_like(dx)
    nrm = np.sqrt(vx * vx + vy * vy + 1)
    sdx, sdy, sdz = sx, -0.03, 1.0
    sn = np.sqrt(sdx * sdx + sdy * sdy + 1)
    cosA = (vx * sdx + vy * sdy + vz * sdz) / (nrm * sn)
    g = phase_g
    hg = (1 - g * g) / (1 + g * g - 2 * g * cosA) ** 1.5 / (4 * np.pi)
    ph = 1.0 + phase_k * hg / ((1 - g * g) / (1 + g) ** 3 / (4 * np.pi))
    lit = sun_col[None, None, :] * (T * (0.35 + 0.65 * (1 - dens)) * np.minimum(ph, 3.5))[..., None]
    col = amb_col[None, None, :] * (1 - 0.45 * dens)[..., None] + lit * shade
    a = 1 - np.exp(-alpha_k * dens)
    fog = 1 - np.exp(-v / fog_dist)
    col = mixc(col, fog_col, fog * 0.85)
    a = a * (1 - fog * 0.55)
    if haze_far is not None: a = a * smooth(haze_far[0], haze_far[1], dy)
    return col, a

def over(base, col, a):
    return base * (1 - a[..., None]) + col * a[..., None]

def post(img, blur=0.7, bloom=(0.72, 18, 0.35), curve=0.0):
    out = img.copy()
    if blur: out = np.stack([gaussian_filter(out[..., i], blur) for i in range(3)], axis=-1)
    if bloom:
        thr, rad, k = bloom
        lum = out @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
        hi = out * smooth(thr, 1.0, lum)[..., None]
        bl = np.stack([gaussian_filter(hi[..., i], rad) for i in range(3)], axis=-1)
        out = out + bl * k
    if curve: out = out + curve * (out - 0.5) * (1 - np.abs(out - 0.5) * 2)   # 一点点 S 曲线
    return np.clip(out, 0, 1)

def save(img, path, q=92):
    from PIL import Image
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path, quality=q, subsampling=0)


# ---------------- 一层云（第二种画法：每一小块云自己有受光面） ----------------
def deck2(dx, dy, h, density_fn, L, cell, sun_cols, shadow_col, fog_col, fog_dist, alpha_k=2.4, edge_k=6.0, cover_occ=None, rim=0.6, dark_core=0.45, top_fade=None):
    """sun_cols：[(到太阳的角距离, 颜色)…] 近处金、远处粉紫；shadow_col：背光处（被天光照着）的颜色；
       cell：云块的大小（云平面上的单位），用来决定受光面取样的距离"""
    dyc = np.maximum(dy, 0.004)
    t = h / dyc
    u = dx * t; v = t
    d = density_fn(u, v)
    e = cell * 0.45
    ds = density_fn(u + L[0] * e, v + L[1] * e)                 # 朝太阳走一点
    lit = np.clip((d - ds) * edge_k + 0.5, 0, 1)                # 靠太阳那一侧的边：亮
    lit = lit * lit * (3 - 2 * lit)
    thin = np.clip(1 - d * 1.4, 0, 1)                           # 薄的地方透光
    if cover_occ is not None:                                   # 大片的云挡住后面的光
        occ = sum(density_fn(u + L[0] * cell * k, v + L[1] * cell * k) for k in cover_occ) / len(cover_occ)
        T = np.exp(-occ * 1.6)
    else: T = 1.0
    # 到太阳的角距离 → 被照亮的颜色
    sx = (SUN_X * W - W / 2) / F
    ang = np.sqrt((dx - sx) ** 2 + (dy + 0.03) ** 2 * 2.0)
    sc = np.zeros(d.shape + (3,), dtype=np.float32)
    ps = [a for a, _ in sun_cols]; cs = [hexc(c) for _, c in sun_cols]
    sc[:] = cs[-1]
    for i in range(len(ps) - 1):
        m = (ang >= ps[i]) & (ang < ps[i + 1]); f = ((ang[m] - ps[i]) / (ps[i + 1] - ps[i]))[:, None]
        sc[m] = cs[i] + (cs[i + 1] - cs[i]) * f
    sc[ang < ps[0]] = cs[0]
    light = (0.25 + 0.75 * lit + rim * thin * lit) * T * (1 - dark_core * smooth(0.45, 1.0, d))
    col = mixc(shadow_col[None, None, :] * np.ones_like(sc), sc, np.clip(light, 0, 1.2))
    a = 1 - np.exp(-alpha_k * d)
    fog = 1 - np.exp(-v / fog_dist)
    col = mixc(col, fog_col, fog * 0.9)
    a = a * (1 - fog * 0.6)
    if top_fade is not None: a = a * smooth(top_fade[0], top_fade[1], v)
    return col, a


def ramp(x, stops):
    """按 stops [(位置, 颜色)…] 取颜色；x 是任意形状的数组"""
    out = np.zeros(x.shape + (3,), dtype=np.float32)
    ps = [p for p, _ in stops]; cs = [hexc(c) for _, c in stops]
    out[:] = cs[-1]
    out[x <= ps[0]] = cs[0]
    for i in range(len(ps) - 1):
        m = (x > ps[i]) & (x <= ps[i + 1]); f = ((x[m] - ps[i]) / (ps[i + 1] - ps[i]))[:, None]
        out[m] = cs[i] + (cs[i + 1] - cs[i]) * f
    return out

def sun_dist(dx, dy):
    sx = (SUN_X * W - W / 2) / F
    return np.sqrt((dx - sx) ** 2 + (dy + 0.03) ** 2 * 2.2)

# ---------------- 一层云（第三种画法：太阳在地平线下，从下面照亮云底） ----------------
def deck3(dx, dy, h, density_fn, L, cell, sun_stops, shadow_col, fog_col, fog_dist, alpha_k=2.6, edge=0.25, core=0.3,
          ambient=0.18, shade_far=None, occ=None, occ_k=1.2, gain=1.0):
    dyc = np.maximum(dy, 0.004)
    t = h / dyc
    u = dx * t; v = t
    d = density_fn(u, v)
    e = cell * 0.5
    ds = density_fn(u + L[0] * e, v + L[1] * e)
    lit = np.clip((d - ds) * 5.0 + 0.5, 0, 1)                    # 朝太阳那一侧的边亮一点
    sc = ramp(sun_dist(dx, dy), sun_stops)
    T = 1.0
    if occ:                                                       # 前面（靠太阳那边）的云挡掉一些光
        o = sum(density_fn(u + L[0] * cell * k, v + L[1] * cell * k) for k in occ) / len(occ)
        T = np.exp(-o * occ_k)
    k = (1 - edge + edge * lit) * (1 - core * smooth(0.5, 1.0, d)) * T
    if shade_far is not None: k = k * shade_far                  # 比如地影：高处的云已经照不到了
    col = shadow_col[None, None, :] * ambient + sc * (k * gain)[..., None]
    col = mixc(shadow_col[None, None, :] * np.ones_like(sc), col, smooth(0.0, 0.25, k)) if False else col
    a = 1 - np.exp(-alpha_k * d)
    fog = 1 - np.exp(-v / fog_dist)
    col = mixc(col, fog_col, fog * 0.9)
    a = a * (1 - fog * 0.6)
    return col, a
