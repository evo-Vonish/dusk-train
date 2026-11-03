# 秋 · 远（体积云版）：满天的高积云被刚落下的太阳从下面烧红；地平线上几条低云
import sys, time, numpy as np
from sky import *
from vol import *
ss = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
N2 = Noise(11); N3 = Noise3(7)
dx, dy, rx, ry, rz = rays(ss)
base = sky_base(dx, dy, [(0.0, '#ffcc8c'), (0.035, '#ffa26e'), (0.09, '#e66a6a'), (0.17, '#a44b86'), (0.3, '#5c3b8f'),
                         (0.5, '#2b3188'), (0.75, '#1b2676'), (1.0, '#11195a')],
                glow=dict(color='#ffc890', power=0.7, width=0.045, band=(0.03, 0.22, 0.45), below=0.02))
sx = (SUN_X * W - W / 2) / F
sd = np.array([sx, -0.03, 1.0]); sd = sd / np.linalg.norm(sd)
sd_ = sun_dist(dx, dy)
# 太阳那边金、远一点橘红、再远粉红、最远紫红
sunc = ramp(sd_, [(0.0, '#ffc870'), (0.25, '#ff9446'), (0.6, '#ff6236'), (1.0, '#ec4658'), (1.5, '#b63c7c'), (2.2, '#6e3a8c')])
Y0, Y1 = 3.0, 3.4
def ac(x, y, z):
    C = smooth(0.44, 0.62, N2.fbm(x * 0.07 + 1.3, z * 0.07 + 0.4, 4))
    wx = (N2.fbm(x * 0.4, z * 0.4, 3) - 0.5) * 0.5; wz = (N2.fbm(x * 0.4 + 4.1, z * 0.4 + 2.3, 3) - 0.5) * 0.5
    cell = 1 - N2.worley((x + wx) / 0.42, (z + wz) / 0.32, 0.95)
    hp = smooth(Y0, Y0 + 0.1, y) * smooth(Y1, Y1 - 0.2, y)
    det = N3.fbm(x * 4.0, y * 4.0, z * 4.0, 4)
    return np.clip((cell * 1.0 + det * 0.55 - 0.9) * 4.0, 0, 1) * C * hp
B0, B1 = 0.9, 1.3
def low(x, y, z):
    n = N2.fbm(x * 0.12 + 8.1, z * 0.35, 5, rot=0.2)
    band = smooth(16, 24, z) * smooth(70, 45, z)
    hp = smooth(B0, B0 + 0.08, y) * smooth(B1, B1 - 0.25, y)
    det = N3.fbm(x * 1.2, y * 1.2, z * 1.2, 3)
    return np.clip((n * 0.8 + det * 0.4 - 0.72) * 3.0, 0, 1) * band * hp
t0 = time.time()
img = layers(base, (rx, ry, rz), [
    dict(y0=Y0, y1=Y1, density=ac, sun_dir=sd, sun=sunc * 0.95, amb=hexc('#3a3684')[None, None, :] * 0.42, fog=40.0,
         kw=dict(steps=18, lsteps=(0.05, 0.12, 0.25, 0.45), sigma=14.0, lsigma=7.0, tmax=80.0, phase=(0.6, -0.15, 0.75, 1.2))),
    dict(y0=B0, y1=B1, density=low, sun_dir=sd, sun=sunc * 0.8, amb=hexc('#262358')[None, None, :] * 0.55, fog=60.0, fogk=0.6,
         kw=dict(steps=12, lsteps=(0.05, 0.15, 0.35), sigma=7.0, lsigma=5.0, tmax=90.0, phase=(0.6, -0.15, 0.75, 1.4))),
])
img = filmic(img * 1.05)
print('time', round(time.time() - t0, 1))
save(post(img, blur=0.5 * ss, bloom=(0.72, 14 * ss, 0.25), curve=0.08), sys.argv[1])
