# 秋 · 远：天最高最透，满天鳞云被刚落下的太阳从下面烧红（火烧云）
import sys, numpy as np
from sky import *

def render(seed=11):
    N = Noise(seed)
    xs, ys, dx, dy = grid()
    base = sky_base(dx, dy, [(0.0, '#ffc98a'), (0.035, '#ff9f6c'), (0.09, '#e3696c'), (0.17, '#a24b86'), (0.3, '#5c3b8f'),
                             (0.5, '#2b3188'), (0.75, '#1b2676'), (1.0, '#11195a')],
                    glow=dict(color='#ffc890', power=0.7, width=0.045, band=(0.03, 0.22, 0.45), below=0.02))
    sx = (SUN_X * W - W / 2) / F
    L = np.array([sx, 1.0]); L = L / np.linalg.norm(L)
    img = base.copy()
    el = np.clip(dy / (HZ / F), 0, 1)
    def mackerel(u, v):
        wu = N.fbm(u * 0.5, v * 0.5, 4) - 0.5; wv = N.fbm(u * 0.5 + 5.3, v * 0.5 + 2.1, 4) - 0.5
        uu, vv = u + wu * 0.6, v + wv * 0.6
        rows = 0.5 + 0.5 * np.sin((vv * 6.0 + uu * 1.4 + (N.fbm(uu * 1.3, vv * 1.3, 3) - 0.5) * 3.0) * np.pi * 2)
        cells = 1 - N.worley(uu / 0.085, vv / 0.065, 0.95)
        blob = N.fbm(uu * 9.0, vv * 9.0, 4)
        cl = np.clip((cells * 0.8 + blob * 0.55 + rows * 0.3 - 0.86) * 3.2, 0, 1)
        sweep = N.fbm(u * 0.28 + v * 0.16 + 1.7, v * 0.45 - u * 0.08 + 0.3, 5)
        cover = smooth(0.3, 0.5, sweep)
        return cl * cover * smooth(11.0, 2.6, v)
    earth = smooth(1.0, 0.62, el)          # 太阳已经落下：最高处的云照不到了
    c, a = deck3(dx, dy, 1.0, mackerel, L, 0.07,
                 [(0.0, '#fff2c0'), (0.2, '#ffcf80'), (0.45, '#ff9558'), (0.8, '#ff6a66'), (1.2, '#e85582'), (1.7, '#b04a92'), (2.3, '#6a4596')],
                 hexc('#2e2c74'), base, 9.0, alpha_k=3.0, edge=0.25, core=0.18, ambient=0.3, shade_far=0.45 + 0.55 * earth, occ=(3, 6), occ_k=0.35, gain=1.25)
    img = over(img, c, a)
    def band(u, v):
        n = N.fbm(u * 0.22 + 8.1, v * 0.8, 6, rot=0.25)
        streak = N.fbm(u * 0.05 + 2.0, v * 2.5, 4, rot=0.05)
        b = smooth(6.5, 10.0, v) * smooth(45.0, 22.0, v)
        return np.clip((n * 0.6 + streak * 0.6 - 0.55) * 3.0, 0, 1) * b
    c, a = deck3(dx, dy, 0.32, band, L, 0.9,
                 [(0.0, '#ffd890'), (0.15, '#ff8c52'), (0.4, '#de4f6a'), (0.8, '#7e3a76')],
                 hexc('#211f55'), base, 70.0, alpha_k=2.6, edge=0.6, core=0.6, ambient=0.6, gain=0.75)
    img = over(img, c, a)
    return post(img, blur=0.6, bloom=(0.68, 16 * SCALE, 0.3), curve=0.12)

if __name__ == '__main__':
    save(render(), sys.argv[1] if len(sys.argv) > 1 else 'autumn.jpg')
