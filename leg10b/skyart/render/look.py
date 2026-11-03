# 把 pbr.py 画出来的线性光，冲洗成一张「画」：曝光、光晕、胶片曲线、在 OKLab 里调色、颗粒，最后缩到 1536×447
import sys, os, math, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

def lum(x):
    return x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722

def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)

def srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)

def lin(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)

def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0

def to_lab(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)

def from_lab(c):
    L, a, b = c[..., 0], c[..., 1], c[..., 2]
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return np.stack([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                     -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                     -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s], -1)

def angd(a, b):
    return (a - b + 180.0) % 360.0 - 180.0

def grade_lch(y, mask, ops):
    """ops：[(色相中心, 宽, 目标色相, 力度, 彩度倍数, 亮度加减, 'dark'|'light'|'all')]，mask 乘在力度上"""
    lab = to_lab(np.clip(y, 0, None))
    L = lab[..., 0]; C = np.hypot(lab[..., 1], lab[..., 2]); h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    for (hc, hw, ht, k, ck, dl, where) in ops:
        w = (np.exp(-(angd(h, hc) / hw) ** 2) if hw < 360 else 1.0) * mask
        if where == 'dark': w = w * np.clip(1.15 - L * 1.3, 0, 1)
        elif where == 'light': w = w * np.clip(L * 1.5 - 0.35, 0, 1)
        h = h + angd(ht, h) * k * w
        C = C * (1 + (ck - 1) * w)
        L = L + dl * w
    hr = np.radians(h)
    out = from_lab(np.stack([L, C * np.cos(hr), C * np.sin(hr)], -1))
    return np.clip(out, 0, 1)

def sky_gradient(y, mask, stops, k=0.8, kl=1.0):
    """天的每一行，平均颜色挪到调好的那一条渐变上（同一行里左右的明暗、太阳那边的光照旧）。stops: [(高度 0=地平线..1=顶, '#hex')]"""
    lab = to_lab(np.clip(y, 0, None))
    H = y.shape[0]
    w = np.clip(mask, 0, 1)
    wr = w ** 6                                    # 只拿干干净净的天来量这一行的平均
    ws = wr.sum(1)
    ref = (lab * wr[..., None]).sum(1) / (ws[:, None] + 1e-6)
    ok = ws > 2
    idx = np.arange(H)
    if not ok.all():
        for c in range(3): ref[:, c] = np.interp(idx, idx[ok], ref[ok, c])
    from scipy.ndimage import gaussian_filter1d
    ref = gaussian_filter1d(ref, max(1.0, H / 40.0), axis=0, mode='nearest')
    el = 1 - (np.arange(H) + 0.5) / H
    sp = np.array([s for s, _ in stops]); sc = to_lab(lin(np.stack([hexc(c) for _, c in stops])))
    order = np.argsort(sp); sp = sp[order]; sc = sc[order]
    tgt = np.stack([np.interp(el, sp, sc[:, c]) for c in range(3)], -1)
    d = (tgt - ref); d[:, 0] *= kl
    lab = lab + d[:, None, :] * (k * w)[..., None]
    return np.clip(from_lab(lab), 0, 1)

def lum_map(y, mask, stops, k=0.8, kc=1.0):
    """按亮度上色（画家的「渐变映射」）：暗处一种颜色，亮处一种颜色。stops: [(OKLab 亮度, 色相°, 彩度)]，色相按顺序可以超过 360"""
    lab = to_lab(np.clip(y, 0, None))
    L = lab[..., 0]; C = np.hypot(lab[..., 1], lab[..., 2]); h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    sl = np.array([s[0] for s in stops]); sh = np.array([s[1] for s in stops], float); sc = np.array([s[2] for s in stops])
    ht = np.interp(L, sl, sh) % 360; ct = np.interp(L, sl, sc)
    w = np.clip(mask, 0, 1) * k
    h = h + angd(ht, h) * w
    C = C + (ct - C) * w * kc
    hr = np.radians(h)
    return np.clip(from_lab(np.stack([L, C * np.cos(hr), C * np.sin(hr)], -1)), 0, 1)

def sun_fields(H, W, sun_el, sun_az=None):
    """每个像素：到太阳的角距离、和太阳方位的左右差（度）。取景和 pbr.py 一样"""
    F = 774.0 * W / 1536.0; HZ = (447 + 6.0) * H / 447.0
    if sun_az is None: sun_az = math.atan((0.885 - 0.5) * 1536 / 774.0)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = (xs + 0.5 - W / 2) / F; dy = (HZ - (ys + 0.5)) / F
    n = np.sqrt(dx * dx + dy * dy + 1)
    e = math.radians(sun_el)
    s = np.array([math.sin(sun_az) * math.cos(e), math.sin(e), math.cos(sun_az) * math.cos(e)])
    cosv = (dx * s[0] + dy * s[1] + s[2]) / n
    theta = np.degrees(np.arccos(np.clip(cosv, -1, 1)))
    phi = np.abs(np.degrees(np.arctan(dx) - sun_az))
    return theta, phi

def _stops_lch(stops, L):
    sl = np.array([s[0] for s in stops]); sh = np.array([s[1] for s in stops], float); sc = np.array([s[2] for s in stops])
    return np.interp(L, sl, sh), np.interp(L, sl, sc)

def lum_map2(y, mask, near, far, theta, t0=15.0, t1=75.0, k=0.8, kc=1.0):
    """按亮度上色，再按离太阳多远在两套颜色之间渐变：太阳那边金、橙，远处绯红、品红、紫"""
    lab = to_lab(np.clip(y, 0, None))
    L = lab[..., 0]; C = np.hypot(lab[..., 1], lab[..., 2]); h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    hn, cn = _stops_lch(near, L); hf, cf = _stops_lch(far, L)
    s = np.clip((theta - t0) / (t1 - t0), 0, 1); s = s * s * (3 - 2 * s)
    ht = (hn + angd(hf % 360, hn % 360) * s) % 360; ct = cn + (cf - cn) * s
    w = np.clip(mask, 0, 1) * k
    h = h + angd(ht, h) * w
    C = C + (ct - C) * w * kc
    hr = np.radians(h)
    return np.clip(from_lab(np.stack([L, C * np.cos(hr), C * np.sin(hr)], -1)), 0, 1)

def sky_gradient2(y, mask, near, far, phi, p0=10.0, p1=70.0, k=0.8, kl=1.0):
    """天的渐变也分两套：太阳那一侧一套、远离太阳的一侧一套，左右之间慢慢过渡"""
    lab = to_lab(np.clip(y, 0, None))
    H, W = y.shape[:2]
    w = np.clip(mask, 0, 1)
    wr = w ** 6
    ws = wr.sum(1)
    ref = (lab * wr[..., None]).sum(1) / (ws[:, None] + 1e-6)
    ok = ws > 2
    idx = np.arange(H)
    if not ok.all():
        for c in range(3): ref[:, c] = np.interp(idx, idx[ok], ref[ok, c])
    from scipy.ndimage import gaussian_filter1d
    ref = gaussian_filter1d(ref, max(1.0, H / 40.0), axis=0, mode='nearest')
    el = 1 - (np.arange(H) + 0.5) / H
    def grad(stops):
        sp = np.array([s for s, _ in stops]); sc = to_lab(lin(np.stack([hexc(c) for _, c in stops])))
        o = np.argsort(sp); sp = sp[o]; sc = sc[o]
        return np.stack([np.interp(el, sp, sc[:, c]) for c in range(3)], -1)
    gn, gf = grad(near), grad(far)
    s = np.clip((phi - p0) / (p1 - p0), 0, 1); s = (s * s * (3 - 2 * s))[..., None]
    tgt = gn[:, None, :] * (1 - s) + gf[:, None, :] * s
    d = tgt - ref[:, None, :]; d[..., 0] *= kl
    lab = lab + d * (k * w)[..., None]
    return np.clip(from_lab(lab), 0, 1)

def develop(img, ev=0.0, pct=99.6, key=0.9, sat=1.0, wb=(1, 1, 1), bloom=None, curve=None, grain=0.0, out_size=(1536, 447),
            sky=None, cloud=None, allops=None, mask_pow=0.6, black=None, hz=None, expo='all', skygrad=None, cwb=None, cmap=None,
            sun_el=None, skygrad2=None, cmap2=None):
    x = img[..., :3].astype(np.float32) * np.array(wb, np.float32)
    a = img[..., 3] if img.shape[-1] > 3 else np.zeros(img.shape[:2], np.float32)
    if cwb is not None:
        # 云和天分开定白平衡：云用 cwb，天用 wb
        ca = np.clip(a, 0, 1)[..., None]
        x = x * (1 - ca) + img[..., :3] * np.array(cwb, np.float32) * ca
    L = lum(x)
    ref = np.percentile(L[a > 0.6], pct) if expo == 'cloud' and (a > 0.6).sum() > 100 else np.percentile(L, pct)
    x = x / max(ref, 1e-12) * key * (2.0 ** ev)
    if bloom:
        thr, rad, k = bloom
        hi = np.maximum(x - thr, 0)
        b = np.zeros_like(hi)
        for i, r in enumerate((rad, rad * 3, rad * 9)):
            b += np.stack([gaussian_filter(hi[..., c], r) for c in range(3)], -1) * (0.5 ** i)
        x = x + b * k
    y = aces(x)
    cm = np.clip(a, 0, 1) ** mask_pow
    if skygrad2 or cmap2: theta, phi = sun_fields(y.shape[0], y.shape[1], sun_el)
    if skygrad: y = sky_gradient(y, 1 - cm, **skygrad)
    if skygrad2: y = sky_gradient2(y, 1 - cm, phi=phi, **skygrad2)
    if cmap: y = lum_map(y, cm, **cmap)
    if cmap2: y = lum_map2(y, cm, theta=theta, **cmap2)
    if sky: y = grade_lch(y, 1 - cm, sky)
    if cloud: y = grade_lch(y, cm, cloud)
    if allops: y = grade_lch(y, np.ones_like(cm), allops)
    if sat != 1.0:
        l = lum(y)[..., None]
        y = np.clip(l + (y - l) * sat, 0, 1)
    y = srgb(np.clip(y, 0, 1))
    if curve is not None:
        y = y + curve * (y - 0.5) * (1 - np.abs(2 * y - 1))
    if black is not None:
        y = black + y * (1 - black)
    if grain:
        rng = np.random.default_rng(7)
        y = y + rng.normal(0, grain, y.shape[:2])[..., None]
    y = np.clip(y, 0, 1)
    im = Image.fromarray((y * 255 + 0.5).astype(np.uint8))
    if out_size and im.size != tuple(out_size):
        im = im.resize(out_size, Image.LANCZOS)
    return im

if __name__ == '__main__':
    img = np.load(sys.argv[1])
    develop(img, out_size=None).save(sys.argv[2], quality=92)
