# 体积云：沿视线穿过云层一步一步走，每一步再朝太阳走几步，看光被挡掉多少（离线画，慢一点没关系）
import numpy as np
from sky import W, H, F, HZ, SUN_X, smooth, hexc, mixc, Noise

class Noise3:
    def __init__(self, seed):
        r = np.random.default_rng(seed)
        self.p = r.permutation(256).astype(np.int64)
        self.p = np.concatenate([self.p, self.p])
        self.v = r.random(256).astype(np.float32)
    def value(self, x, y, z):
        xi = np.floor(x); yi = np.floor(y); zi = np.floor(z)
        fx = (x - xi).astype(np.float32); fy = (y - yi).astype(np.float32); fz = (z - zi).astype(np.float32)
        xi = xi.astype(np.int64) & 255; yi = yi.astype(np.int64) & 255; zi = zi.astype(np.int64) & 255
        P, V = self.p, self.v
        def h(ix, iy, iz): return V[P[P[P[ix] + iy] + iz] & 255]
        x1 = (xi + 1) & 255; y1 = (yi + 1) & 255; z1 = (zi + 1) & 255
        u = fx * fx * (3 - 2 * fx); v = fy * fy * (3 - 2 * fy); w = fz * fz * (3 - 2 * fz)
        a = h(xi, yi, zi); b = h(x1, yi, zi); c = h(xi, y1, zi); d = h(x1, y1, zi)
        e = h(xi, yi, z1); f = h(x1, yi, z1); g = h(xi, y1, z1); k = h(x1, y1, z1)
        l1 = a + (b - a) * u; l2 = c + (d - c) * u; l3 = e + (f - e) * u; l4 = g + (k - g) * u
        m1 = l1 + (l2 - l1) * v; m2 = l3 + (l4 - l3) * v
        return m1 + (m2 - m1) * w
    def fbm(self, x, y, z, oct=5, lac=2.07, gain=0.5):
        s = np.zeros_like(x, dtype=np.float32); amp = 0.5; norm = 0
        for i in range(oct):
            s += amp * self.value(x + i * 13.7, y + i * 7.3, z + i * 3.1); norm += amp
            x, y, z = x * lac + y * 0.2, y * lac - x * 0.2, z * lac
            amp *= gain
        return s / norm

def hg(c, g):
    return (1 - g * g) / (4 * np.pi * (1 + g * g - 2 * g * c) ** 1.5)

def rays(ss=1.0):
    h, w = int(H * ss), int(W * ss)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    xs = (xs + 0.5) / ss; ys = (ys + 0.5) / ss
    dx = (xs - W / 2) / F; dy = (HZ - ys) / F
    n = np.sqrt(dx * dx + dy * dy + 1)
    return dx, dy, dx / n, dy / n, 1 / n

def march(dirs, y0, y1, density, sun_dir, sun_col, amb_fn, steps=24, lsteps=(0.04, 0.1, 0.2, 0.35, 0.55), sigma=18.0, lsigma=12.0,
          tmax=60.0, phase=(0.65, -0.15, 0.7), powder=0.0, ms=0.35, seed=1):
    """dirs：rays() 的 (rx, ry, rz)；density(x, y, z) → 0..1；返回 (散射的光, 透过率)"""
    rx, ry, rz = dirs
    ryc = np.maximum(ry, 1e-4)
    t0 = y0 / ryc; t1 = np.minimum(y1 / ryc, tmax)
    ok = t0 < tmax
    t0 = np.where(ok, t0, tmax); t1 = np.where(ok, np.maximum(t1, t0), tmax)
    dt = (t1 - t0) / steps
    jit = np.random.default_rng(seed).random(rx.shape).astype(np.float32)
    T = np.ones_like(rx); col = np.zeros(rx.shape + (3,), dtype=np.float32)
    cosA = rx * sun_dir[0] + ry * sun_dir[1] + rz * sun_dir[2]
    ph = phase[2] * hg(cosA, phase[0]) + (1 - phase[2]) * hg(cosA, phase[1])
    ph = 1.0 + phase[3] * ph / hg(np.float32(1.0), phase[0]) if len(phase) > 3 else ph / hg(np.float32(1.0), phase[0]) * 6.0
    amb = amb_fn
    for i in range(steps):
        t = t0 + dt * (i + jit)
        px, py, pz = rx * t, ry * t, rz * t
        d = density(px, py, pz) * ok
        live = d > 0.002
        if not live.any(): continue
        od = np.zeros_like(d)
        for l in lsteps:
            od += density(px + sun_dir[0] * l, py + sun_dir[1] * l, pz + sun_dir[2] * l) * l
        Ls = np.exp(-lsigma * od)
        if powder: Ls = Ls * (1 - np.exp(-powder * d * 2))
        Ls = Ls + ms * np.exp(-lsigma * od * 0.25) * 0.25           # 粗略的多次散射：深处也透一点光
        sc = sun_col if sun_col.ndim == 3 else sun_col[None, None, :]
        S = sc * (Ls * ph)[..., None] + amb * (1 - 0.3 * d)[..., None]
        a = 1 - np.exp(-sigma * d * dt)
        col += S * (T * a)[..., None]
        T = T * (1 - a)
    return col, T, t0


def filmic(x):
    # ACES 的一个近似：亮处慢慢压下来，不会一片死白
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)

def layers(base, dirs, specs, fog_col=None):
    """specs：从高到低（远到近）排好的若干层，每层 dict(y0, y1, density, sun, amb, fog, kw)。返回合好的图"""
    img = base.copy()
    for sp in specs:
        col, T, t0 = march(dirs, sp['y0'], sp['y1'], sp['density'], sp['sun_dir'], sp['sun'], sp['amb'], **sp.get('kw', {}))
        fog = (1 - np.exp(-t0 / sp['fog']))[..., None] * sp.get('fogk', 0.8)
        fc = fog_col if fog_col is not None else base
        col = col * (1 - fog) + fc * (1 - T[..., None]) * fog
        img = img * T[..., None] + col
    return img
