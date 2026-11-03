# 第五版的天：离线「照着物理」地画——大气（瑞利、米氏、臭氧，再加上多次散射）和一层一层的体积云。
# 太阳贴着地平线；云被它从下面、从侧面照着，照不到的那一面是天的颜色；远处的云沉进地平线的霾里。
# 画出来的仍是一张「天」（不含地面），和原来那张画一样大、一样的取景：
#   宽 1536、高 447，地平线在画布下面一点点；太阳在右边（x ≈ 0.885）。
# 只输出线性的光（.npy），调色在 look.py 里做，改颜色不用重画。
import math, os, sys, time, json
import numpy as np
from numba import njit, prange

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
os.makedirs(CACHE, exist_ok=True)

W0, H0, F0 = 1536, 447, 774.0
HZ0 = H0 + 6.0
SUN_X = 0.885
SUN_AZ = math.atan((SUN_X - 0.5) * W0 / F0)          # 太阳的方位：视线往右 37° 左右

RG, RT = 6360.0, 6460.0                              # 地球、大气顶（千米）
HT = math.sqrt(RT * RT - RG * RG)
HR = 8.0
BR0, BR1, BR2 = 5.802e-3, 13.558e-3, 33.1e-3          # 瑞利散射（每千米）
BMS, BMA = 3.996e-3, 0.444e-3                         # 米氏散射、吸收
OZ0, OZ1, OZ2 = 0.650e-3, 1.881e-3, 0.085e-3          # 臭氧吸收（黄昏天顶的那种蓝靠它）
PI = math.pi
NT = 128                                              # 噪声体素边长

# ---------------------------------------------------------------- 小工具
@njit(cache=True, fastmath=True, inline='always')
def clamp01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)

@njit(cache=True, fastmath=True, inline='always')
def sstep(a, b, x):
    t = clamp01((x - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)

@njit(cache=True, fastmath=True, inline='always')
def remap01(v, lo, hi):
    return clamp01((v - lo) / (hi - lo))

@njit(cache=True, inline='always')
def ihash(x):
    x = x & 0xffffffff
    x = (((x >> 16) ^ x) * 0x45d9f3b) & 0xffffffff
    x = (((x >> 16) ^ x) * 0x45d9f3b) & 0xffffffff
    return (x >> 16) ^ x

@njit(cache=True, inline='always')
def h3(ix, iy, iz, s):
    return ihash(ix * 1619 + ihash(iy * 31337 + ihash(iz * 6971 + ihash(s * 1013 + 7))))

@njit(cache=True, inline='always')
def rnd3(ix, iy, iz, s):
    return h3(ix, iy, iz, s) / 4294967296.0

# ---------------------------------------------------------------- 可以无缝平铺的三维噪声
@njit(cache=True, inline='always')
def _grad(h, x, y, z):
    k = h & 15
    u = x if k < 8 else y
    v = y if k < 4 else (x if (k == 12 or k == 14) else z)
    return (u if (k & 1) == 0 else -u) + (v if (k & 2) == 0 else -v)

@njit(cache=True, inline='always')
def _fade(t):
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)

@njit(cache=True)
def perlin3(x, y, z, P, s):
    xf = math.floor(x); yf = math.floor(y); zf = math.floor(z)
    fx = x - xf; fy = y - yf; fz = z - zf
    ix = int(xf) % P; iy = int(yf) % P; iz = int(zf) % P
    jx = (ix + 1) % P; jy = (iy + 1) % P; jz = (iz + 1) % P
    u = _fade(fx); v = _fade(fy); w = _fade(fz)
    a0 = _grad(h3(ix, iy, iz, s), fx, fy, fz); a1 = _grad(h3(jx, iy, iz, s), fx - 1, fy, fz)
    b0 = _grad(h3(ix, jy, iz, s), fx, fy - 1, fz); b1 = _grad(h3(jx, jy, iz, s), fx - 1, fy - 1, fz)
    c0 = _grad(h3(ix, iy, jz, s), fx, fy, fz - 1); c1 = _grad(h3(jx, iy, jz, s), fx - 1, fy, fz - 1)
    d0 = _grad(h3(ix, jy, jz, s), fx, fy - 1, fz - 1); d1 = _grad(h3(jx, jy, jz, s), fx - 1, fy - 1, fz - 1)
    a = a0 + (a1 - a0) * u; b = b0 + (b1 - b0) * u; c = c0 + (c1 - c0) * u; d = d0 + (d1 - d0) * u
    e = a + (b - a) * v; f = c + (d - c) * v
    return e + (f - e) * w

@njit(cache=True)
def worley3(x, y, z, C, s):
    xi = int(math.floor(x)); yi = int(math.floor(y)); zi = int(math.floor(z))
    best = 9.0
    for oz in range(-1, 2):
        for oy in range(-1, 2):
            for ox in range(-1, 2):
                cx = xi + ox; cy = yi + oy; cz = zi + oz
                hx = cx % C; hy = cy % C; hz = cz % C
                px = cx + rnd3(hx, hy, hz, s); py = cy + rnd3(hx, hy, hz, s + 1); pz = cz + rnd3(hx, hy, hz, s + 2)
                d = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2
                if d < best: best = d
    return math.sqrt(best)

@njit(parallel=True, cache=True)
def _gen_tex(N, seed):
    PF = np.empty((N, N, N), np.float32); PW = np.empty((N, N, N), np.float32)
    W1 = np.empty((N, N, N), np.float32); WF = np.empty((N, N, N), np.float32)
    for k in prange(N):
        for j in range(N):
            for i in range(N):
                x = (i + 0.5) / N; y = (j + 0.5) / N; z = (k + 0.5) / N
                pf = 0.0; amp = 1.0; norm = 0.0; f = 4
                for o in range(5):
                    pf += amp * perlin3(x * f, y * f, z * f, f, seed + o * 7); norm += amp; amp *= 0.5; f *= 2
                PF[i, j, k] = pf / norm
                p3 = 0.0; amp = 1.0; norm = 0.0; f = 4
                for o in range(3):
                    p3 += amp * perlin3(x * f, y * f, z * f, f, seed + 50 + o * 7); norm += amp; amp *= 0.5; f *= 2
                p3 = p3 / norm * 0.9 + 0.5
                w4 = 1.0 - worley3(x * 4, y * 4, z * 4, 4, seed + 100)
                w8 = 1.0 - worley3(x * 8, y * 8, z * 8, 8, seed + 103)
                w16 = 1.0 - worley3(x * 16, y * 16, z * 16, 16, seed + 106)
                w32 = 1.0 - worley3(x * 32, y * 32, z * 32, 32, seed + 109)
                wlow = w4 * 0.625 + w8 * 0.25 + w16 * 0.125
                PW[i, j, k] = (p3 - (wlow - 1.0)) / (1.0 - (wlow - 1.0))      # 珀林–沃利：鼓鼓的一团一团
                W1[i, j, k] = 1.0 - worley3(x * 8, y * 8, z * 8, 8, seed + 200)
                WF[i, j, k] = w8 * 0.625 + w16 * 0.25 + w32 * 0.125
    return PF, PW, W1, WF

def textures(seed=3):
    path = os.path.join(CACHE, 'tex%d_%d.npz' % (NT, seed))
    if os.path.exists(path):
        z = np.load(path); return z['PF'], z['PW'], z['W1'], z['WF']
    t = time.time()
    PF, PW, W1, WF = _gen_tex(NT, seed)
    def norm(a, lo=0.5, hi=99.5):
        a0, a1 = np.percentile(a, [lo, hi]); return np.clip((a - a0) / (a1 - a0), 0, 1).astype(np.float32)
    PF, PW, W1, WF = norm(PF), norm(PW), np.clip(W1, 0, 1).astype(np.float32), norm(WF)
    np.savez(path, PF=PF, PW=PW, W1=W1, WF=WF)
    print('textures %.1fs' % (time.time() - t))
    return PF, PW, W1, WF

@njit(cache=True, fastmath=True, inline='always')
def tex3(T, x, y, z):
    n = T.shape[0]
    xf = math.floor(x); yf = math.floor(y); zf = math.floor(z)
    fx = x - xf; fy = y - yf; fz = z - zf
    ix = int(xf) % n; iy = int(yf) % n; iz = int(zf) % n
    jx = ix + 1 if ix + 1 < n else 0; jy = iy + 1 if iy + 1 < n else 0; jz = iz + 1 if iz + 1 < n else 0
    a = T[ix, iy, iz]; b = T[jx, iy, iz]; c = T[ix, jy, iz]; d = T[jx, jy, iz]
    e = T[ix, iy, jz]; f = T[jx, iy, jz]; g = T[ix, jy, jz]; h = T[jx, jy, jz]
    l0 = a + (b - a) * fx; l1 = c + (d - c) * fx; l2 = e + (f - e) * fx; l3 = g + (h - g) * fx
    m0 = l0 + (l1 - l0) * fy; m1 = l2 + (l3 - l2) * fy
    return m0 + (m1 - m0) * fz

# ---------------------------------------------------------------- 大气
# atm: [米氏倍数, 米氏标高, 瑞利倍数, 臭氧倍数, 米氏 g, 地面反照率]
@njit(cache=True, fastmath=True, inline='always')
def air_dens(h, atm):
    if h < 0.0: h = 0.0
    oz = 1.0 - abs(h - 25.0) / 15.0
    return math.exp(-h / HR) * atm[2], math.exp(-h / atm[1]) * atm[0], (oz if oz > 0.0 else 0.0) * atm[3]

@njit(cache=True)
def build_trans(atm, NR, NM):
    out = np.zeros((NR, NM, 3))
    for i in range(NR):
        xr = i / (NR - 1)
        rho = HT * xr; r = math.sqrt(rho * rho + RG * RG)
        for j in range(NM):
            xm = j / (NM - 1)
            dmin = RT - r; dmax = rho + HT
            d = dmin + xm * (dmax - dmin)
            mu = 1.0 if d <= 0.0 else (HT * HT - rho * rho - d * d) / (2.0 * r * d)
            mu = min(1.0, max(-1.0, mu))
            n = 1200; dt = d / n; o0 = 0.0; o1 = 0.0; o2 = 0.0
            for k in range(n):
                t = (k + 0.5) * dt
                rt = math.sqrt(max(t * t + 2.0 * r * mu * t + r * r, 0.0))
                ra, mi, oz = air_dens(rt - RG, atm)
                o0 += (BR0 * ra + (BMS + BMA) * mi + OZ0 * oz) * dt
                o1 += (BR1 * ra + (BMS + BMA) * mi + OZ1 * oz) * dt
                o2 += (BR2 * ra + (BMS + BMA) * mi + OZ2 * oz) * dt
            out[i, j, 0] = math.exp(-o0); out[i, j, 1] = math.exp(-o1); out[i, j, 2] = math.exp(-o2)
    return out

@njit(cache=True, fastmath=True, inline='always')
def trans_lut(TL, r, mu):
    rho = math.sqrt(max(r * r - RG * RG, 0.0))
    disc = r * r * (mu * mu - 1.0) + RT * RT
    d = -r * mu + math.sqrt(max(disc, 0.0))
    if d < 0.0: d = 0.0
    dmin = RT - r; dmax = rho + HT
    xm = (d - dmin) / (dmax - dmin) if dmax > dmin else 0.0
    xr = rho / HT
    NR = TL.shape[0]; NM = TL.shape[1]
    fx = clamp01(xr) * (NR - 1); fy = clamp01(xm) * (NM - 1)
    ix = int(fx); iy = int(fy)
    if ix > NR - 2: ix = NR - 2
    if iy > NM - 2: iy = NM - 2
    ax = fx - ix; ay = fy - iy
    r0 = (TL[ix, iy, 0] * (1 - ax) + TL[ix + 1, iy, 0] * ax) * (1 - ay) + (TL[ix, iy + 1, 0] * (1 - ax) + TL[ix + 1, iy + 1, 0] * ax) * ay
    r1 = (TL[ix, iy, 1] * (1 - ax) + TL[ix + 1, iy, 1] * ax) * (1 - ay) + (TL[ix, iy + 1, 1] * (1 - ax) + TL[ix + 1, iy + 1, 1] * ax) * ay
    r2 = (TL[ix, iy, 2] * (1 - ax) + TL[ix + 1, iy, 2] * ax) * (1 - ay) + (TL[ix, iy + 1, 2] * (1 - ax) + TL[ix + 1, iy + 1, 2] * ax) * ay
    return r0, r1, r2

@njit(cache=True, fastmath=True, inline='always')
def sun_trans(TL, r, mu_s, sun_r):
    """这一点看得见多少太阳（地球挡住的那一部分不算）×穿过大气剩下的光"""
    q = RG / r
    mu_h = -math.sqrt(max(0.0, 1.0 - q * q))
    a = math.asin(max(-1.0, min(1.0, mu_s))) - math.asin(mu_h)
    vis = sstep(-sun_r, sun_r, a)
    if vis <= 0.0: return 0.0, 0.0, 0.0
    t0, t1, t2 = trans_lut(TL, r, max(mu_s, mu_h + 2e-5))
    return t0 * vis, t1 * vis, t2 * vis

@njit(cache=True)
def build_ms(TL, atm, NH, NMU):
    out = np.zeros((NH, NMU, 3))
    ND = 256
    ga = PI * (3.0 - math.sqrt(5.0))
    for i in range(NH):
        h = max(0.005, (i / (NH - 1)) ** 2 * (RT - RG))
        r = RG + h
        for j in range(NMU):
            mu_s = -1.0 + 2.0 * j / (NMU - 1)
            sx = math.sqrt(max(0.0, 1.0 - mu_s * mu_s)); sy = mu_s
            Ls0 = 0.0; Ls1 = 0.0; Ls2 = 0.0; F0_ = 0.0; F1_ = 0.0; F2_ = 0.0
            for k in range(ND):
                wy = 1.0 - 2.0 * (k + 0.5) / ND
                rr = math.sqrt(max(0.0, 1.0 - wy * wy))
                wx = math.cos(ga * k) * rr; wz = math.sin(ga * k) * rr
                b = r * wy
                dg = b * b - r * r + RG * RG
                hit = False; tend = 0.0
                if dg >= 0.0:
                    tg = -b - math.sqrt(dg)
                    if tg > 0.0: hit = True; tend = tg
                if not hit: tend = -b + math.sqrt(max(b * b - r * r + RT * RT, 0.0))
                n = 24; T0 = 1.0; T1 = 1.0; T2 = 1.0
                L0 = 0.0; L1 = 0.0; L2 = 0.0; f0 = 0.0; f1 = 0.0; f2 = 0.0
                for s in range(n):
                    ta = tend * (s / n) ** 2; tb = tend * ((s + 1) / n) ** 2
                    t = 0.5 * (ta + tb); dt = tb - ta
                    px = wx * t; py = r + wy * t; pz = wz * t
                    rp = math.sqrt(px * px + py * py + pz * pz)
                    ra, mi, oz = air_dens(rp - RG, atm)
                    ss0 = BR0 * ra + BMS * mi; ss1 = BR1 * ra + BMS * mi; ss2 = BR2 * ra + BMS * mi
                    st0 = BR0 * ra + (BMS + BMA) * mi + OZ0 * oz + 1e-9
                    st1 = BR1 * ra + (BMS + BMA) * mi + OZ1 * oz + 1e-9
                    st2 = BR2 * ra + (BMS + BMA) * mi + OZ2 * oz + 1e-9
                    mus = (px * sx + py * sy) / rp
                    u0, u1, u2 = sun_trans(TL, rp, mus, 0.0047)
                    e0 = math.exp(-st0 * dt); e1 = math.exp(-st1 * dt); e2 = math.exp(-st2 * dt)
                    i0 = (1 - e0) / st0; i1 = (1 - e1) / st1; i2 = (1 - e2) / st2
                    L0 += T0 * ss0 * u0 / (4 * PI) * i0; L1 += T1 * ss1 * u1 / (4 * PI) * i1; L2 += T2 * ss2 * u2 / (4 * PI) * i2
                    f0 += T0 * ss0 * i0; f1 += T1 * ss1 * i1; f2 += T2 * ss2 * i2
                    T0 *= e0; T1 *= e1; T2 *= e2
                if hit:
                    px = wx * tend; py = r + wy * tend; pz = wz * tend
                    rp = math.sqrt(px * px + py * py + pz * pz)
                    mug = (px * sx + py * sy) / rp
                    u0, u1, u2 = sun_trans(TL, rp, mug, 0.0047)
                    k_ = max(mug, 0.0) * atm[5] / PI
                    L0 += T0 * u0 * k_; L1 += T1 * u1 * k_; L2 += T2 * u2 * k_
                Ls0 += L0; Ls1 += L1; Ls2 += L2; F0_ += f0; F1_ += f1; F2_ += f2
            Ls0 /= ND; Ls1 /= ND; Ls2 /= ND
            F0_ /= ND; F1_ /= ND; F2_ /= ND
            out[i, j, 0] = Ls0 / (1.0 - F0_); out[i, j, 1] = Ls1 / (1.0 - F1_); out[i, j, 2] = Ls2 / (1.0 - F2_)
    return out

@njit(cache=True, fastmath=True, inline='always')
def ms_lut(MS, h, mu_s):
    NH = MS.shape[0]; NMU = MS.shape[1]
    fx = math.sqrt(clamp01(h / (RT - RG))) * (NH - 1); fy = clamp01(mu_s * 0.5 + 0.5) * (NMU - 1)
    ix = int(fx); iy = int(fy)
    if ix > NH - 2: ix = NH - 2
    if iy > NMU - 2: iy = NMU - 2
    ax = fx - ix; ay = fy - iy
    r0 = (MS[ix, iy, 0] * (1 - ax) + MS[ix + 1, iy, 0] * ax) * (1 - ay) + (MS[ix, iy + 1, 0] * (1 - ax) + MS[ix + 1, iy + 1, 0] * ax) * ay
    r1 = (MS[ix, iy, 1] * (1 - ax) + MS[ix + 1, iy, 1] * ax) * (1 - ay) + (MS[ix, iy + 1, 1] * (1 - ax) + MS[ix + 1, iy + 1, 1] * ax) * ay
    r2 = (MS[ix, iy, 2] * (1 - ax) + MS[ix + 1, iy, 2] * ax) * (1 - ay) + (MS[ix, iy + 1, 2] * (1 - ax) + MS[ix + 1, iy + 1, 2] * ax) * ay
    return r0, r1, r2

@njit(cache=True, fastmath=True, inline='always')
def ph_ray(c):
    return 3.0 / (16.0 * PI) * (1.0 + c * c)

@njit(cache=True, fastmath=True, inline='always')
def ph_cs(c, g):
    k = 1.0 + g * g - 2.0 * g * c
    return 3.0 / (8.0 * PI) * (1.0 - g * g) * (1.0 + c * c) / ((2.0 + g * g) * k * math.sqrt(k))

@njit(cache=True, fastmath=True, inline='always')
def ph_hg(c, g):
    k = 1.0 + g * g - 2.0 * g * c
    return (1.0 - g * g) / (4.0 * PI * k * math.sqrt(k))

@njit(cache=True, fastmath=True)
def air_seg(ox, oy, oz, dx, dy, dz, ta, tb, n, sun, cosv, atm, TL, MS, T0, T1, T2, L0, L1, L2, quad):
    """沿视线从 ta 走到 tb：只有空气。返回走完以后的透过率和攒下的光"""
    if tb <= ta: return T0, T1, T2, L0, L1, L2
    pR = ph_ray(cosv); pM = ph_cs(cosv, atm[4])
    sx = sun[0]; sy = sun[1]; sz = sun[2]; sr = sun[3]
    for i in range(n):
        if quad:
            s0 = i / n; s1 = (i + 1) / n
            t0 = ta + (tb - ta) * s0 * s0; t1 = ta + (tb - ta) * s1 * s1
        else:
            t0 = ta + (tb - ta) * i / n; t1 = ta + (tb - ta) * (i + 1) / n
        t = 0.5 * (t0 + t1); dt = t1 - t0
        px = ox + dx * t; py = oy + dy * t; pz = oz + dz * t
        r = math.sqrt(px * px + py * py + pz * pz); h = r - RG
        mus = (px * sx + py * sy + pz * sz) / r
        ra, mi, ozn = air_dens(h, atm)
        sR0 = BR0 * ra; sR1 = BR1 * ra; sR2 = BR2 * ra; sM = BMS * mi
        st0 = sR0 + (BMS + BMA) * mi + OZ0 * ozn + 1e-9
        st1 = sR1 + (BMS + BMA) * mi + OZ1 * ozn + 1e-9
        st2 = sR2 + (BMS + BMA) * mi + OZ2 * ozn + 1e-9
        u0, u1, u2 = sun_trans(TL, r, mus, sr)
        m0, m1, m2 = ms_lut(MS, h, mus)
        S0 = (sR0 * pR + sM * pM) * u0 + (sR0 + sM) * m0
        S1 = (sR1 * pR + sM * pM) * u1 + (sR1 + sM) * m1
        S2 = (sR2 * pR + sM * pM) * u2 + (sR2 + sM) * m2
        e0 = math.exp(-st0 * dt); e1 = math.exp(-st1 * dt); e2 = math.exp(-st2 * dt)
        L0 += T0 * S0 * (1 - e0) / st0; L1 += T1 * S1 * (1 - e1) / st1; L2 += T2 * S2 * (1 - e2) / st2
        T0 *= e0; T1 *= e1; T2 *= e2
    return T0, T1, T2, L0, L1, L2

# ---------------------------------------------------------------- 云
# 每一层云一行参数（下标见 P_* 常量）
P_TYPE, P_H0, P_H1, P_COV, P_COVVAR, P_SIGMA, P_COS, P_SIN, P_SX, P_SZ, P_WARP, P_WS, P_ERO, P_DS, P_OFFU, P_OFFV, \
    P_D0, P_D1, P_D2, P_D3, P_ROWK, P_ROWLEN, P_GF, P_GB, P_WB, P_AMBK, P_SUNK, P_LSTEP, P_NMAX, P_AZ, P_AZK, P_AZW, \
    P_HSHAPE, P_DENSK, P_MSA, P_MSB, P_MSC, P_VST, P_SEED, P_RIDGE, P_TINTR, P_TINTG, P_TINTB, P_WARP2, P_DET2, \
    P_BANDK, P_BANDLEN, P_BANDC, P_BANDS, P_CELL2, P_CELL2K, P_LOD0, P_LOD1, P_FINE = range(54)
NP = 56

@njit(cache=True, fastmath=True)
def cdens(Lp, x, h, z, PF, PW, W1, WF):
    h0 = Lp[P_H0]; h1 = Lp[P_H1]
    if h <= h0 or h >= h1: return 0.0
    hf = (h - h0) / (h1 - h0)
    typ = int(Lp[P_TYPE])
    ca = Lp[P_COS]; sa = Lp[P_SIN]
    u = ca * x - sa * z + Lp[P_OFFU]; v = sa * x + ca * z + Lp[P_OFFV]
    sd = Lp[P_SEED]
    N = 128.0
    # 天上的「天气」：哪儿有云、哪儿是空的
    ws = N / Lp[P_WS]
    wm = tex3(PF, u * ws, 17.0 + sd, v * ws)
    cov = Lp[P_COV] + (wm - 0.5) * Lp[P_COVVAR]
    dist = math.sqrt(x * x + z * z)
    if Lp[P_AZK] != 0.0:
        az = math.atan2(x, z) - Lp[P_AZ]
        cov += Lp[P_AZK] * math.exp(-az * az / (Lp[P_AZW] * Lp[P_AZW]))
    if Lp[P_D1] > Lp[P_D0]: cov *= sstep(Lp[P_D0], Lp[P_D1], dist)
    if Lp[P_D3] > Lp[P_D2]: cov *= 1.0 - sstep(Lp[P_D2], Lp[P_D3], dist)
    if Lp[P_BANDK] != 0.0:
        bu = Lp[P_BANDC] * x - Lp[P_BANDS] * z
        cov += Lp[P_BANDK] * math.cos(2.0 * PI * (bu / Lp[P_BANDLEN] + (wm - 0.5) * 0.7))
    if cov <= 0.002: return 0.0
    if cov > 1.0: cov = 1.0
    wk = Lp[P_WARP]
    if typ == 0:
        # 鳞云 / 高积云：一格一格的小云，排成一行一行
        wu = (tex3(PF, u * N / 9.0, 3.0 + sd, v * N / 9.0) - 0.5) * wk
        wv = (tex3(PF, u * N / 9.0 + 41.0, 7.0 + sd, v * N / 9.0) - 0.5) * wk
        uu = u + wu; vv = v + wv
        cu = uu / (8.0 * Lp[P_SX]) * N; cv = vv / (8.0 * Lp[P_SZ]) * N
        # 纹理是平铺的：竖的那一维跟着横的位置慢慢漂（无理数的比例），远处就不会一模一样地重复
        cell = tex3(W1, cu, hf * Lp[P_VST] + 31.0 + sd + cu * 0.0577 + cv * 0.0931, cv)
        if Lp[P_CELL2K] > 0.0:
            k2 = Lp[P_CELL2]
            c2 = tex3(W1, cu * k2 + 17.0, hf * Lp[P_VST] * k2 + 5.0 + sd + cu * k2 * 0.0613 + cv * k2 * 0.0879, cv * k2 + 3.0)
            cell = cell * (1.0 - Lp[P_CELL2K]) + c2 * Lp[P_CELL2K]
        if Lp[P_ROWK] > 0.0:
            rw = 0.5 + 0.5 * math.cos(2.0 * PI * (vv / Lp[P_ROWLEN] + (wm - 0.5) * 0.8))
            cell *= 1.0 - Lp[P_ROWK] + Lp[P_ROWK] * rw
        e = abs(2.0 * hf - 1.0)
        prof = 1.0 - e ** Lp[P_HSHAPE]
        base = cell * prof
        d = remap01(base, 1.0 - cov, 1.0)
    elif typ == 1:
        # 卷云：细细长长的丝，末梢打个钩
        wu = (tex3(PF, u * N / 60.0, 5.0 + sd, v * N / 60.0) - 0.5) * wk
        wv = (tex3(PF, u * N / 37.0 + 19.0, 9.0 + sd, v * N / 37.0) - 0.5) * Lp[P_WARP2]
        uu = u + wu; vv = v + wv
        n1 = tex3(PF, uu * N / Lp[P_SX], hf * Lp[P_VST] + 3.0 + sd + uu * N / Lp[P_SX] * 0.071 + vv * N / Lp[P_SZ] * 0.137, vv * N / Lp[P_SZ])
        n2 = tex3(PF, uu * N / (Lp[P_SX] * 0.27), hf * Lp[P_VST] + 11.0 + sd + uu * N / (Lp[P_SX] * 0.27) * 0.053 + vv * N / (Lp[P_SZ] * 0.21) * 0.113, vv * N / (Lp[P_SZ] * 0.21))
        n = n1 * (1.0 - Lp[P_FINE]) + n2 * Lp[P_FINE]
        rk = Lp[P_RIDGE]
        if Lp[P_LOD1] > Lp[P_LOD0]:
            fl = 1.0 - sstep(Lp[P_LOD0], Lp[P_LOD1], dist)
            n = n1 + (n - n1) * fl; rk *= fl
        if rk > 0.0:
            rg = 1.0 - abs(2.0 * n2 - 1.0)
            n = n * (1.0 - rk) + (n1 * 0.5 + rg * 0.5) * rk
        prof = sstep(0.0, 0.35, hf) * sstep(1.0, 0.45, hf)
        d = remap01(n * prof, 1.0 - cov, 1.0)
    elif typ == 2:
        # 积云 / 层积云：一团一团，底平，顶圆
        wu = (tex3(PF, u * N / 12.0, 13.0 + sd, v * N / 12.0) - 0.5) * wk
        wv = (tex3(PF, u * N / 12.0 + 7.0, 23.0 + sd, v * N / 12.0) - 0.5) * wk
        base = tex3(PW, (u + wu) * N / Lp[P_SX], hf * Lp[P_VST] + sd + (u + wu) * N / Lp[P_SX] * 0.061 + (v + wv) * N / Lp[P_SZ] * 0.083, (v + wv) * N / Lp[P_SZ])
        prof = sstep(0.0, 0.08, hf) * sstep(1.0, 0.35, hf)
        base = base * prof - hf * Lp[P_HSHAPE]
        d = remap01(base, 1.0 - cov, 1.0) * (0.35 + 0.65 * cov)
    else:
        # 一层薄薄的纱（高层云 / 卷层云）：起伏、透光
        wu = (tex3(PF, u * N / 30.0, 29.0 + sd, v * N / 30.0) - 0.5) * wk
        uu = u + wu
        n = tex3(PF, uu * N / Lp[P_SX], hf * Lp[P_VST] + 47.0 + sd + uu * N / Lp[P_SX] * 0.057 + v * N / Lp[P_SZ] * 0.089, v * N / Lp[P_SZ])
        fk = Lp[P_RIDGE]
        if Lp[P_LOD1] > Lp[P_LOD0]: fk *= 1.0 - sstep(Lp[P_LOD0], Lp[P_LOD1], dist)
        if fk > 0.0:
            # 细细的纹理（纤维、斑驳），纱才不像一块糊开的颜色；远处不要（一压就是噪点）
            nf = tex3(PF, uu * N / (Lp[P_SX] * 0.16) + 13.0, hf * Lp[P_VST] * 2.0 + 61.0 + sd + uu * N / (Lp[P_SX] * 0.16) * 0.049 + v * N / (Lp[P_SZ] * 0.11) * 0.101, v * N / (Lp[P_SZ] * 0.11))
            n = n * (1.0 - fk) + nf * fk
        rk3 = Lp[P_ROWK]
        if Lp[P_LOD1] > Lp[P_LOD0]: rk3 *= 1.0 - sstep(Lp[P_LOD0], Lp[P_LOD1], dist)
        if rk3 > 0.0:
            rw = 0.5 + 0.5 * math.cos(2.0 * PI * (uu / Lp[P_ROWLEN] + (n - 0.5) * 1.2))
            n *= 1.0 - rk3 + rk3 * rw
        prof = sstep(0.0, 0.4, hf) * sstep(1.0, 0.6, hf)
        d = remap01(n * prof, 1.0 - cov, 1.0)
    if d <= 0.0: return 0.0
    ero = Lp[P_ERO]
    if Lp[P_LOD1] > Lp[P_LOD0]: ero *= 1.0 - sstep(Lp[P_LOD0], Lp[P_LOD1], dist)    # 远处的云不要细碎的边（透视一压就成了噪点）
    if ero > 0.0:
        dsc = N / Lp[P_DS]
        det = tex3(WF, x * dsc, h * dsc * 1.7 + sd * 3.0, z * dsc)
        if Lp[P_DET2] > 0.0:
            det = det * (1.0 - Lp[P_DET2]) + tex3(WF, x * dsc * 3.1 + 5.0, h * dsc * 5.0, z * dsc * 3.1) * Lp[P_DET2]
        d = remap01(d, det * ero, 1.0)
    return d * Lp[P_DENSK]

@njit(cache=True, fastmath=True)
def cloud_seg(ox, oy, oz, dx, dy, dz, ta, tb, n, jit, sun, cosv, atm, TL, MS, Lp, amb, PF, PW, W1, WF, T0, T1, T2, L0, L1, L2, Tc):
    if tb <= ta: return T0, T1, T2, L0, L1, L2, Tc
    dt = (tb - ta) / n
    pR = ph_ray(cosv); pM = ph_cs(cosv, atm[4])
    sx = sun[0]; sy = sun[1]; sz = sun[2]; sr = sun[3]
    sig = Lp[P_SIGMA]
    # 云的相函数：往前亮一大截（太阳那边的云镶金边），往回也有一点
    msa = Lp[P_MSA]; msb = Lp[P_MSB]; msc = Lp[P_MSC]
    gf = Lp[P_GF]; gb = Lp[P_GB]; wb = Lp[P_WB]
    ph = [0.0, 0.0, 0.0, 0.0]
    for o in range(4):
        cg = msc ** o
        ph[o] = (1.0 - wb) * ph_hg(cosv, gf * cg) + wb * ph_hg(cosv, gb * cg)
    lstep = Lp[P_LSTEP]
    tr = Lp[P_TINTR]; tg = Lp[P_TINTG]; tbl = Lp[P_TINTB]
    sunk = Lp[P_SUNK]; ambk = Lp[P_AMBK]
    for i in range(n):
        t = ta + (i + jit) * dt
        px = ox + dx * t; py = oy + dy * t; pz = oz + dz * t
        r = math.sqrt(px * px + py * py + pz * pz); h = r - RG
        mus = (px * sx + py * sy + pz * sz) / r
        ra, mi, ozn = air_dens(h, atm)
        sR0 = BR0 * ra; sR1 = BR1 * ra; sR2 = BR2 * ra; sM = BMS * mi
        st0 = sR0 + (BMS + BMA) * mi + OZ0 * ozn + 1e-9
        st1 = sR1 + (BMS + BMA) * mi + OZ1 * ozn + 1e-9
        st2 = sR2 + (BMS + BMA) * mi + OZ2 * ozn + 1e-9
        u0, u1, u2 = sun_trans(TL, r, mus, sr)
        m0, m1, m2 = ms_lut(MS, h, mus)
        S0 = (sR0 * pR + sM * pM) * u0 + (sR0 + sM) * m0
        S1 = (sR1 * pR + sM * pM) * u1 + (sR1 + sM) * m1
        S2 = (sR2 * pR + sM * pM) * u2 + (sR2 + sM) * m2
        cd = cdens(Lp, px, h, pz, PF, PW, W1, WF)
        if cd > 0.0:
            sc = cd * sig
            hf = (h - Lp[P_H0]) / (Lp[P_H1] - Lp[P_H0])
            c0 = 0.0; c1 = 0.0; c2 = 0.0
            if u0 + u1 + u2 > 1e-7:
                od = 0.0; l0 = 0.0; l = lstep
                for k in range(6):
                    lm = l0 + 0.5 * l
                    qx = px + sx * lm; qy = py + sy * lm; qz = pz + sz * lm
                    hq = math.sqrt(qx * qx + qy * qy + qz * qz) - RG
                    od += cdens(Lp, qx, hq, qz, PF, PW, W1, WF) * l
                    l0 += l; l *= 2.0
                od *= sig
                ms = 0.0; a_ = 1.0; b_ = 1.0
                for o in range(4):
                    ms += b_ * math.exp(-od * a_) * ph[o]
                    a_ *= msa; b_ *= msb
                ms *= sunk
                c0 = u0 * ms; c1 = u1 * ms; c2 = u2 * ms
            # 天光：上半球的天（蓝）和下半球（地平线、海）照进来
            fu = 0.45 + 0.55 * hf; fd = 0.45 + 0.55 * (1.0 - hf)
            k_ = ambk * (1.0 - 0.35 * cd)
            c0 = (c0 + (amb[0] * fu + amb[3] * fd) * k_) * tr
            c1 = (c1 + (amb[1] * fu + amb[4] * fd) * k_) * tg
            c2 = (c2 + (amb[2] * fu + amb[5] * fd) * k_) * tbl
            S0 += sc * c0; S1 += sc * c1; S2 += sc * c2
            st0 += sc; st1 += sc; st2 += sc
            Tc *= math.exp(-sc * dt)
        e0 = math.exp(-st0 * dt); e1 = math.exp(-st1 * dt); e2 = math.exp(-st2 * dt)
        L0 += T0 * S0 * (1 - e0) / st0; L1 += T1 * S1 * (1 - e1) / st1; L2 += T2 * S2 * (1 - e2) / st2
        T0 *= e0; T1 *= e1; T2 *= e2
        if T0 + T1 + T2 < 0.003: break
    return T0, T1, T2, L0, L1, L2, Tc

@njit(cache=True, fastmath=True, inline='always')
def shell_t(b, r0, R):
    return -b + math.sqrt(max(b * b - r0 * r0 + R * R, 0.0))

@njit(parallel=True, cache=True, fastmath=True)
def render(Wp, Hp, Fp, HZp, sun, atm, TL, MS, LAY, AMB, PF, PW, W1, WF, camh, seed, nair, stepk, disc):
    out = np.zeros((Hp, Wp, 4), np.float32)
    nl = LAY.shape[0]
    r0 = RG + camh
    sx = sun[0]; sy = sun[1]; sz = sun[2]
    for j in prange(Hp):
        for i in range(Wp):
            dx = (i + 0.5 - Wp * 0.5) / Fp; dy = (HZp - (j + 0.5)) / Fp; dz = 1.0
            inv = 1.0 / math.sqrt(dx * dx + dy * dy + 1.0)
            dx *= inv; dy *= inv; dz *= inv
            cosv = dx * sx + dy * sy + dz * sz
            T0 = 1.0; T1 = 1.0; T2 = 1.0; L0 = 0.0; L1 = 0.0; L2 = 0.0
            b = r0 * dy
            ttop = shell_t(b, r0, RT)
            tprev = 0.0; Tc = 1.0
            jit = rnd3(i, j, seed, 5)
            for l in range(nl):
                Lp = LAY[l]
                ta = shell_t(b, r0, RG + Lp[P_H0]); tb = shell_t(b, r0, RG + Lp[P_H1])
                T0, T1, T2, L0, L1, L2 = air_seg(0.0, r0, 0.0, dx, dy, dz, tprev, ta, nair, sun, cosv, atm, TL, MS, T0, T1, T2, L0, L1, L2, l == 0)
                th = (Lp[P_H1] - Lp[P_H0]) / 14.0
                n = int(min(Lp[P_NMAX], max(10.0, (tb - ta) / th)) * stepk)
                if n < 4: n = 4
                T0, T1, T2, L0, L1, L2, Tc = cloud_seg(0.0, r0, 0.0, dx, dy, dz, ta, tb, n, jit, sun, cosv, atm, TL, MS, Lp, AMB[l], PF, PW, W1, WF, T0, T1, T2, L0, L1, L2, Tc)
                tprev = tb
                if T0 + T1 + T2 < 0.003: break
            T0, T1, T2, L0, L1, L2 = air_seg(0.0, r0, 0.0, dx, dy, dz, tprev, ttop, nair, sun, cosv, atm, TL, MS, T0, T1, T2, L0, L1, L2, nl == 0)
            # 太阳本身（可以画得比真的大一点，春天那颗软软的）
            if disc[0] > 0.0:
                ang = math.acos(min(1.0, cosv))
                if ang < disc[1] * 3.0:
                    q = ang / disc[1]
                    core = 0.0
                    if q < 1.0:
                        core = 1.0 - 0.55 * (1.0 - math.sqrt(1.0 - q * q))
                    edge = math.exp(-((q - 1.0) if q > 1.0 else 0.0) * disc[2])
                    k_ = disc[0] * (core if q < 1.0 else edge * 0.45)
                    L0 += T0 * k_; L1 += T1 * k_; L2 += T2 * k_
            out[j, i, 0] = L0; out[j, i, 1] = L1; out[j, i, 2] = L2; out[j, i, 3] = 1.0 - Tc
    return out

@njit(parallel=True, cache=True, fastmath=True)
def ambient(hs, sun, atm, TL, MS):
    """每一层云的高度上，天从上半球、下半球照过来的平均光（按各向同性算）"""
    out = np.zeros((hs.shape[0], 6))
    ND = 192
    ga = PI * (3.0 - math.sqrt(5.0))
    for l in prange(hs.shape[0]):
        r = RG + hs[l]
        u0 = 0.0; u1 = 0.0; u2 = 0.0; d0 = 0.0; d1 = 0.0; d2 = 0.0
        for k in range(ND):
            wy = 1.0 - 2.0 * (k + 0.5) / ND
            rr = math.sqrt(max(0.0, 1.0 - wy * wy))
            wx = math.cos(ga * k) * rr; wz = math.sin(ga * k) * rr
            cosv = wx * sun[0] + wy * sun[1] + wz * sun[2]
            b = r * wy
            dg = b * b - r * r + RG * RG
            tend = -b + math.sqrt(max(b * b - r * r + RT * RT, 0.0))
            if dg >= 0.0 and -b - math.sqrt(dg) > 0.0: tend = -b - math.sqrt(dg)
            T0, T1, T2, L0, L1, L2 = air_seg(0.0, r, 0.0, wx, wy, wz, 0.0, tend, 32, sun, cosv, atm, TL, MS, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, True)
            if wy >= 0.0:
                u0 += L0; u1 += L1; u2 += L2
            else:
                d0 += L0; d1 += L1; d2 += L2
        k_ = 4.0 * PI / ND / (4.0 * PI) * 2.0           # 每半球的平均亮度
        out[l, 0] = u0 * k_; out[l, 1] = u1 * k_; out[l, 2] = u2 * k_
        out[l, 3] = d0 * k_; out[l, 4] = d1 * k_; out[l, 5] = d2 * k_
    return out

# ---------------------------------------------------------------- 场景
LAYER_DEFAULT = dict(type=0, h0=4.0, h1=4.6, cov=0.5, covvar=0.6, sigma=30.0, rot=0.0, sx=0.8, sz=0.8, warp=0.4, ws=40.0,
                     ero=0.3, ds=2.0, offu=0.0, offv=0.0, d0=0, d1=0, d2=0, d3=0, rowk=0.0, rowlen=1.0, gf=0.8, gb=-0.3, wb=0.25,
                     ambk=1.0, sunk=1.0, lstep=0.05, nmax=96, az=0.0, azk=0.0, azw=0.3, hshape=2.0, densk=1.0, msa=0.5, msb=0.5, msc=0.5,
                     vst=8.0, seed=0.0, ridge=0.0, tint=(1.0, 1.0, 1.0), warp2=0.0, det2=0.0, bandk=0.0, bandlen=30.0, bandrot=0.0,
                     cell2=2.3, cell2k=0.0, lod0=0.0, lod1=0.0, fine=0.38)
KEYS = ['type', 'h0', 'h1', 'cov', 'covvar', 'sigma', None, None, 'sx', 'sz', 'warp', 'ws', 'ero', 'ds', 'offu', 'offv', 'd0', 'd1', 'd2', 'd3',
        'rowk', 'rowlen', 'gf', 'gb', 'wb', 'ambk', 'sunk', 'lstep', 'nmax', 'az', 'azk', 'azw', 'hshape', 'densk', 'msa', 'msb', 'msc', 'vst', 'seed',
        'ridge', None, None, None, 'warp2', 'det2', 'bandk', 'bandlen', None, None, 'cell2', 'cell2k', 'lod0', 'lod1', 'fine']

def pack_layers(layers):
    A = np.zeros((max(1, len(layers)), NP))
    for l, L in enumerate(layers):
        P = dict(LAYER_DEFAULT); P.update(L)
        for k, name in enumerate(KEYS):
            if name: A[l, k] = float(P[name])
        A[l, P_COS] = math.cos(P['rot']); A[l, P_SIN] = math.sin(P['rot'])
        A[l, P_TINTR], A[l, P_TINTG], A[l, P_TINTB] = P['tint']
        A[l, P_BANDC] = math.cos(P['bandrot']); A[l, P_BANDS] = math.sin(P['bandrot'])
    return A[:len(layers)] if layers else np.zeros((0, NP))

def sun_vec(elev_deg, sun_r_deg=0.27):
    e = math.radians(elev_deg)
    return np.array([math.sin(SUN_AZ) * math.cos(e), math.sin(e), math.cos(SUN_AZ) * math.cos(e), math.radians(sun_r_deg)])

def luts(atm):
    key = '_'.join('%.4g' % a for a in atm)
    path = os.path.join(CACHE, 'atm_%s.npz' % key)
    if os.path.exists(path):
        z = np.load(path); return z['TL'], z['MS']
    t = time.time()
    TL = build_trans(atm, 128, 512)
    MS = build_ms(TL, atm, 32, 64)
    np.savez(path, TL=TL, MS=MS)
    print('luts %.1fs' % (time.time() - t))
    return TL, MS

def render_scene(sc, ss=0.5, stepk=1.0, nair=20, out=None, quiet=False):
    atm = np.array([sc.get('mie', 1.0), sc.get('mieH', 1.2), sc.get('ray', 1.0), sc.get('oz', 1.0), sc.get('g', 0.8), sc.get('albedo', 0.06)])
    TL, MS = luts(atm)
    PF, PW, W1, WF = textures(sc.get('texseed', 3))
    sun = sun_vec(sc['sun'], sc.get('sunr', 0.27))
    layers = sorted(sc.get('layers', []), key=lambda L: L.get('h0', 4.0))
    LAY = pack_layers(layers)
    AMB = ambient(np.array([0.5 * (L[P_H0] + L[P_H1]) for L in LAY]) if len(LAY) else np.zeros(0), sun, atm, TL, MS) if len(LAY) else np.zeros((0, 6))
    disc = np.array(sc.get('disc', (0.0, 0.0047, 3.0)), dtype=np.float64)
    Wp, Hp = int(round(W0 * ss)), int(round(H0 * ss))
    t = time.time()
    img = render(Wp, Hp, F0 * ss, HZ0 * ss, sun, atm, TL, MS, LAY, AMB, PF, PW, W1, WF, sc.get('camh', 0.01), int(sc.get('seed', 1)), nair, stepk, disc)
    if not quiet: print('render %dx%d %.1fs' % (Wp, Hp, time.time() - t))
    if out: np.save(out, img)
    return img

if __name__ == '__main__':
    import importlib
    name = sys.argv[1]; ss = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(CACHE, name + '.npy')
    mod = importlib.import_module('scenes')
    render_scene(getattr(mod, name), ss=ss, out=out, stepk=float(os.environ.get('STEPK', '1')))
