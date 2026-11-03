# 预览接触印样：python3 psheet.py preview out_prefix [from_s] [to_s] [cols] [w]
import sys, os, re, json, bisect
FPS = json.load(open('mvconf.json'))['FPS']
BT = json.load(open('grid.json'))['beats']
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; pre = sys.argv[2]
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0; t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 1e9
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4; W = int(sys.argv[6]) if len(sys.argv) > 6 else 480
H = W * 9 // 16
fs = sorted(f for f in os.listdir(d) if re.match(r'f\d{5}\.jpg', f))
fs = [f for f in fs if t0 <= int(f[1:6]) / FPS < t1]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
per = cols * 6
for k in range(0, len(fs), per):
    chunk = fs[k:k + per]; rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * (H + 18)), (16, 16, 20)); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        im = Image.open(os.path.join(d, f)).convert('RGB').resize((W, H), Image.BILINEAR)
        x, y = (i % cols) * W, (i // cols) * (H + 18)
        sheet.paste(im, (x, y + 18)); n = int(f[1:6]); tt = n / FPS; bi = max(0, bisect.bisect_right(BT, tt + 0.01) - 1); dr.text((x + 4, y + 2), f'{n}  {tt:.2f}s  B{bi}+{tt - BT[bi]:.2f}', fill=(235, 235, 235), font=font)
    out = f'{pre}{k // per + 1}.jpg'; sheet.save(out, quality=85); print(out, len(chunk))
