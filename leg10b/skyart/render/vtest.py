import sys, time, numpy as np
from sky import *
from vol import *
ss = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35
N2 = Noise(11); N3 = Noise3(7)
dx, dy, rx, ry, rz = rays(ss)
# 底色（和 2.5D 那版一样）
import sky as SK
def base_sky(dx, dy):
    return sky_base(dx, dy, [(0.0, '#ffc98a'), (0.035, '#ff9f6c'), (0.09, '#e3696c'), (0.17, '#a24b86'), (0.3, '#5c3b8f'),
                             (0.5, '#2b3188'), (0.75, '#1b2676'), (1.0, '#11195a')],
                    glow=dict(color='#ffc890', power=0.7, width=0.045, band=(0.03, 0.22, 0.45), below=0.02))
base = base_sky(dx, dy)
sx = (SUN_X * W - W / 2) / F
sd = np.array([sx, -0.03, 1.0]); sd = sd / np.linalg.norm(sd)
Y0, Y1 = 3.0, 3.4
def dens(x, y, z):
    C = smooth(0.38, 0.6, N2.fbm(x * 0.07 + 1.3, z * 0.07 + 0.4, 4))
    wx = (N2.fbm(x * 0.4, z * 0.4, 3) - 0.5) * 0.5; wz = (N2.fbm(x * 0.4 + 4.1, z * 0.4 + 2.3, 3) - 0.5) * 0.5
    cell = 1 - N2.worley((x + wx) / 0.55, (z + wz) / 0.42, 0.95)
    hp = smooth(Y0, Y0 + 0.1, y) * smooth(Y1, Y1 - 0.2, y)
    det = N3.fbm(x * 3.0, y * 3.0, z * 3.0, 3)
    return np.clip((cell * 0.95 + det * 0.45 - 0.78) * 3.2, 0, 1) * C * hp
amb = hexc('#3d3a8c')[None, None, :] * 0.55
t0 = time.time()
col, T, tt = march((rx, ry, rz), Y0, Y1, dens, sd, hexc('#ffa860') * 2.6, amb, steps=14, lsteps=(0.05, 0.12, 0.25, 0.45), sigma=9.0, lsigma=6.0, tmax=80.0)
fog = (1 - np.exp(-tt / 45.0))[..., None]
img = base * T[..., None] + col
img = img * (1 - fog * 0.75) + base * fog * 0.75
print('time', round(time.time() - t0, 1), 's', img.shape)
save(np.clip(img, 0, 1), sys.argv[1])
