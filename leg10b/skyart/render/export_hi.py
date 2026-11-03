# 拍片版用的高清天：从两倍超采样的线性光冲洗出 3072×894（和游戏里那三张同一个调子），写成 data URI 的 JSON
import base64, io, os, json, importlib, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d
import pbr, look
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'final')
uris = {}
for n in ('spring', 'autumn', 'winter'):
    sc = getattr(importlib.import_module('scenes'), n)
    img = np.load(os.path.join(pbr.CACHE, n + '_final.npy'))
    im = look.develop(img, out_size=(3072, 894), sun_el=sc['sun'], **sc.get('look', {}))
    a = np.asarray(im).astype(np.float32); H = a.shape[0]; nb = 32
    R = gaussian_filter1d(a[H - 12:].mean(0), 44, axis=0, mode='nearest')
    for y in range(H - nb, H):
        t = min(1.0, (y - (H - nb)) / (nb - 6)); w = t * t * (3 - 2 * t)
        a[y] = a[y] * (1 - w) + R * w
    im = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    im.save(os.path.join(OUT, n + '_3072.png'))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90, optimize=True, subsampling=0)
    uris[n] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    print(n, len(buf.getvalue()) // 1024, 'KB')
json.dump(uris, open(os.path.join(OUT, 'sky_hi.json'), 'w'))
