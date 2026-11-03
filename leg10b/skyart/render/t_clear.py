# 先只画天（没有云），看几个太阳高度下的黄昏
import sys, time, numpy as np
from PIL import Image
import pbr, look

out = sys.argv[1]
ss = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
rows = []
for e in (1.0, -1.0, -3.0, -5.0):
    img = pbr.render_scene(dict(sun=e, mie=1.0, layers=[]), ss=ss, nair=24)
    im = look.develop(img, out_size=(768, 223))
    rows.append(np.asarray(im))
    L = look.lum(img)
    print('sun %.1f  max %.4g  p99 %.4g  median %.4g' % (e, L.max(), np.percentile(L, 99), np.median(L)))
Image.fromarray(np.concatenate(rows, 0)).save(out, quality=92)
