# 把定稿的三张天压成 JPEG，写进 fns/skyart.js（data URI）；顺便量一量每张画的颜色，给季节的调色板用
import base64, io, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FINAL = os.path.join(HERE, '..', 'final')
FNS = os.path.join(HERE, '..', '..', 'fns')
Q = int(os.environ.get('Q', '86'))
names = ['spring', None, 'autumn', 'winter']
uris = []
for n in names:
    if n is None: uris.append(None); continue
    im = Image.open(os.path.join(FINAL, n + '.png')).convert('RGB')
    assert im.size == (1536, 447), im.size
    # 最底下两行会被拉长到地平线（skyMixed）：先把最下面一小截横着抹匀，拉下去才不会是一根根竖条
    a = np.asarray(im).astype(np.float32); H = a.shape[0]; nb = 16
    from scipy.ndimage import gaussian_filter1d
    R = gaussian_filter1d(a[H - 6:].mean(0), 22, axis=0, mode='nearest')
    for y in range(H - nb, H):
        t = min(1.0, (y - (H - nb)) / (nb - 3)); w = t * t * (3 - 2 * t)
        a[y] = a[y] * (1 - w) + R * w
    im = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=Q, optimize=True, subsampling=1)
    b = buf.getvalue()
    open(os.path.join(FINAL, n + '_q%d.jpg' % Q), 'wb').write(b)
    uris.append('data:image/jpeg;base64,' + base64.b64encode(b).decode())
    print(n, len(b) // 1024, 'KB')

js = ['/* 第十棒第五版 · 春、秋、冬三片天（夏天是原来那张画）。离线算好的，1536×447，取景和原来那张一样。 */',
      'const SKY_SEASON_DATA = [']
for n, u in zip(['春', '夏', '秋', '冬'], uris):
    js.append("  %s, // %s" % ("'" + u + "'" if u else 'null', n))
js.append('];')
open(os.path.join(FNS, 'skyart.js'), 'w').write('\n'.join(js) + '\n')
print('wrote fns/skyart.js', os.path.getsize(os.path.join(FNS, 'skyart.js')) // 1024, 'KB')

# 量颜色：SKY_STOPS 上每一档的平均色（天占 0..0.82，再往下是最底下那一行拉下去），太阳那团光
STOPS = [0, 0.3, 0.52, 0.7, 0.84, 0.93, 1]
def hexs(c): return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)
srcs = {'spring': os.path.join(FINAL, 'spring.png'), 'summer': os.path.join(HERE, '..', 'sky.png'),
        'autumn': os.path.join(FINAL, 'autumn.png'), 'winter': os.path.join(FINAL, 'winter.png')}
for n, p in srcs.items():
    a = np.asarray(Image.open(p).convert('RGB')).astype(float)
    H = a.shape[0]
    cols = []
    for s in STOPS:
        y = min(H - 1, int(s / 0.82 * (H - 1)))
        cols.append(hexs(np.median(a[max(0, y - 3):y + 4, int(a.shape[1] * 0.3):int(a.shape[1] * 0.9)].reshape(-1, 3), 0)))
    glow = np.median(a[H - 30:H, 1250:1460].reshape(-1, 3), 0)
    top = np.median(a[:40].reshape(-1, 3), 0)
    print('%-7s dusk %s  glow %s  top %s' % (n, cols, hexs(glow), hexs(top)))
