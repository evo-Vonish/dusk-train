# 定稿：两倍超采样画三季的天，冲洗、缩到 1536×447，存 PNG 和 JPEG
import sys, os, time, importlib
import pbr, look
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'final')
os.makedirs(OUT, exist_ok=True)
names = sys.argv[1:] or ['spring', 'autumn', 'winter']
ss = float(os.environ.get('SS', '2'))
for n in names:
    sc = getattr(importlib.import_module('scenes'), n)
    t = time.time()
    img = pbr.render_scene(sc, ss=ss, stepk=float(os.environ.get('STEPK', '1.5')), nair=32, out=os.path.join(pbr.CACHE, n + '_final.npy'))
    im = look.develop(img, out_size=(1536, 447), sun_el=sc['sun'], **sc.get('look', {}))
    im.save(os.path.join(OUT, n + '.png'))
    im.save(os.path.join(OUT, n + '.jpg'), quality=90)
    print(n, '%.0fs' % (time.time() - t))
