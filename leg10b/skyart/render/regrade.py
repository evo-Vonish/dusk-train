# 只重新冲洗（不重画）：读 cache/<季>_final.npy，按 scenes.py 里现在的 look 出图
import sys, os, importlib, numpy as np
import pbr, look
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'final')
for n in sys.argv[1:]:
    sc = getattr(importlib.import_module('scenes'), n)
    img = np.load(os.path.join(pbr.CACHE, n + '_final.npy'))
    im = look.develop(img, out_size=(1536, 447), sun_el=sc['sun'], **sc.get('look', {}))
    im.save(os.path.join(OUT, n + '.png')); im.save(os.path.join(OUT, n + '.jpg'), quality=90)
    print(n, 'regraded')
