# 试画：python3 prev.py <场景名> <输出.jpg> [ss] [ev] [key]
import sys, os, importlib, numpy as np
import pbr, look

name, out = sys.argv[1], sys.argv[2]
ss = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25
sc = getattr(importlib.import_module('scenes'), name)
npy = os.path.join(pbr.CACHE, '%s_%g.npy' % (name, ss))
img = pbr.render_scene(sc, ss=ss, out=npy, stepk=float(os.environ.get('STEPK', '1')), nair=int(os.environ.get('NAIR', '24')))
g = sc.get('look', {})
im = look.develop(img, out_size=None, sun_el=sc['sun'], **g)
w, h = im.size
if w < 1000: im = im.resize((w * 1536 // w // 1 if w < 768 else w * 2, h * 1536 // w if w < 768 else h * 2))
im.save(out, quality=92)
print('saved', out, im.size)
