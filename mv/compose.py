# 合成（第四部，2K·60 帧）：把拍好的帧按时间排好，加上 post.json 里的闪、推、震、色散、径向模糊、黑场、遮幅、分屏、去色、辉光和字，
# 和歌一起压成 MP4。
#   python3 compose.py                                   全片 → out/dusktrain-mv2.mp4
#   python3 compose.py --from 30 --to 60 --out t.mp4     只压一段
#   python3 compose.py --stills 9.6,36.0,182.3           只导出这几个时刻的成片静帧（检查用）
import json, math, os, subprocess, sys, argparse
import numpy as np
import cv2

ap = argparse.ArgumentParser()
ap.add_argument('--frames', default='frames')
ap.add_argument('--layers', default='layers')
ap.add_argument('--from', dest='t0', type=float, default=0)
ap.add_argument('--to', dest='t1', type=float, default=None)
ap.add_argument('--out', default=None)
ap.add_argument('--crf', type=float, default=20)
ap.add_argument('--preset', default='medium')
ap.add_argument('--stills', default='')
ap.add_argument('--stilldir', default='stills')
ap.add_argument('--noaudio', action='store_true')   # 分段合成：只出画面，最后拼起来再配一次声音
a = ap.parse_args()

CONF = json.load(open('mvconf.json'))
FPS, W, H = CONF['FPS'], CONF['W'], CONF['H']
U = W / 1920                                   # post.json 里的像素量按 1080p 写，这里放大到实际尺寸
HALF = 0.5 / FPS                               # 半帧：比较时刻时的容差
POST = json.load(open('post.json'))
END = POST.get('end') or float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', CONF['song']]).decode().strip())
N = round(END * FPS)
if a.out is None: a.out = 'out/' + CONF['title'] + '.mp4'

def clamp(x, lo=0.0, hi=1.0): return lo if x < lo else hi if x > hi else x
EASE = {
    'lin': lambda p: p,
    'smooth': lambda p: p * p * (3 - 2 * p),
    'sine': lambda p: .5 - .5 * math.cos(math.pi * p),
    'out': lambda p: 1 - (1 - p) ** 2.2,
    'in': lambda p: p * p,
    'xo': lambda p: (1 - 2 ** (-9 * p)) / (1 - 2 ** -9),
    'step': lambda p: 1.0 if p >= 1 else 0.0,
}
def track(name, t, default=0.0):
    keys = POST['tracks'].get(name)
    if not keys: return default
    if t <= keys[0][0]: return keys[0][1]
    for i in range(1, len(keys)):
        if t <= keys[i][0]:
            k0, k1 = keys[i - 1], keys[i]
            e = EASE[k1[2] if len(k1) > 2 else 'smooth']
            p = clamp((t - k0[0]) / max(1e-6, k1[0] - k0[0]))
            return k0[1] + (k1[1] - k0[1]) * e(p)
    return keys[-1][1]

def decays(lst, t, span=7.0):
    out = []
    for e in lst:
        t0, amp, d = e[0], e[1], e[2]
        if t >= t0 - HALF and t - t0 < d * span: out.append((max(0.0, t - t0), amp * math.exp(-max(0.0, t - t0) / d), e))
    return out

def ramp(t, a0, a1, b0, b1):
    if t < a0 or t > b1: return 0.0
    if t < a1: return EASE['smooth']((t - a0) / max(1e-6, a1 - a0))
    if t > b0: return 1 - EASE['smooth']((t - b0) / max(1e-6, b1 - b0))
    return 1.0

# ---- 字：透明 PNG，只取有字的那一块（BGR + alpha）
OV = {}
def ov(name):
    if name not in OV:
        im = cv2.imread(f'ov/{name}.png', cv2.IMREAD_UNCHANGED)
        ys, xs = np.nonzero(im[..., 3] > 0)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = im[y0:y1, x0:x1].astype(np.float32)
        OV[name] = (x0, y0, crop[..., :3], crop[..., 3:4] / 255.0)
    return OV[name]

def paste(x, name, alpha, scale=1.0, at=None):
    x0, y0, rgb, al = ov(name)
    h, w = al.shape[:2]
    if at is not None: x0, y0 = at[0] - w // 2, at[1] - h // 2
    if abs(scale - 1) > 1e-3:
        cx, cy = x0 + w / 2, y0 + h / 2
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        rgb = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_LINEAR)
        al = cv2.resize(al, (nw, nh), interpolation=cv2.INTER_LINEAR)[..., None]
        x0, y0, w, h = int(cx - nw / 2), int(cy - nh / 2), nw, nh
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xb <= xa or yb <= ya: return
    sub_rgb = rgb[ya - y0:yb - y0, xa - x0:xb - x0]; sub_a = al[ya - y0:yb - y0, xa - x0:xb - x0] * alpha
    reg = x[ya:yb, xa:xb]
    x[ya:yb, xa:xb] = reg * (1 - sub_a) + sub_rgb * sub_a

def src_frame(f):
    """第 f 帧实际用哪一帧拍好的画：一闪而过的回顾从前面取；一顿一顿的那几段每 hold 帧停一下"""
    t = f / FPS
    for t0, t1, hold in POST.get('stutter', []):
        if t0 - HALF <= t < t1 - HALF:
            f0 = round(t0 * FPS); f = f0 + ((f - f0) // int(hold)) * int(hold); t = f / FPS; break
    for t0, t1, s0 in POST.get('recap', []):
        if t0 - HALF <= t < t1 - HALF: return round((s0 + (t - t0)) * FPS)
    return f

def whip(x, t):
    """切点前后几帧横着甩一下：横向的运动模糊，再顺着方向挪一点"""
    amt, dirn = 0.0, 1
    for t0, a, d, dur in POST.get('whip', []):
        dt = abs(t - t0)
        if dt < dur:
            k = (1 - dt / dur) ** 1.5 * a
            if k > amt: amt, dirn = k, d * (1 if t >= t0 else -1)
    if amt < 2: return x
    n = max(3, int(amt * U)) | 1
    y = cv2.blur(x, (n, 1), borderType=cv2.BORDER_REFLECT)
    M = np.float32([[1, 0, dirn * amt * U * .25], [0, 1, 0]])
    return cv2.warpAffine(y, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def load(path):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None: raise FileNotFoundError(path)
    if im.shape[1] != W or im.shape[0] != H: im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    return im

# ---- 分屏：同一刻的四季各拍一张，竖着切成四条；某一条换季的时候，新的一季从上面推下来
def strip_frame(sp, f, t):
    tags = sp['layers']
    flips = [(sp['t0'], sp['init'])] + [(ft, l) for ft, l in sp['flips']]
    cur_i = max(i for i, (ft, _) in enumerate(flips) if t >= ft - HALF)
    cur = flips[cur_i][1]; prev = flips[cur_i - 1][1] if cur_i > 0 else cur; tf = flips[cur_i][0]
    imgs = {}
    def L(k):
        if k not in imgs: imgs[k] = load(os.path.join(a.layers, tags[k], f'f{f:05d}.jpg')).astype(np.float32)
        return imgs[k]
    out = np.empty((H, W, 3), np.float32); sw = W // 4
    q = EASE['out'](clamp((t - tf) / (6 / FPS)))
    cen = sp.get('center')                                    # 四个不同的场：每一条取那一场画面正中的一条，而不是同一列
    for s in range(4):
        x0, x1 = s * sw, (s + 1) * sw
        if cen: sx0 = W // 2 - sw // 2; new, old = L(cur[s])[:, sx0:sx0 + sw], L(prev[s])[:, sx0:sx0 + sw]
        else: new, old = L(cur[s])[:, x0:x1], L(prev[s])[:, x0:x1]
        if cur[s] == prev[s] or q >= 1: out[:, x0:x1] = new; continue
        cut = int(round(q * H))
        out[:cut, x0:x1] = new[H - cut:]
        out[cut:, x0:x1] = old[:H - cut]
    distinct = len(set(cur)) > 1
    if distinct:
        for s in range(1, 4):
            xs = s * sw
            out[:, xs - round(2 * U):xs + round(2 * U)] *= 0.18
    if len(set(cur)) == 4 and sp.get('labels', True) and os.path.exists('ov/lab0.png'):
        la = clamp((t - tf) / 0.25) if len(set(prev)) < 4 else 1.0
        for s in range(4): paste(out, 'lab' + str(cur[s]), 0.92 * la, at=(s * sw + sw // 2, H - round(120 * U)))
    return out

SCRIM = {}
def scrim(cx, cy, rx, ry):
    key = (cx, cy, rx, ry)
    if key not in SCRIM:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
        SCRIM[key] = (np.exp(-d * 1.4))[..., None]
    return SCRIM[key]

def zoom_blur(x, k):
    # 径向模糊：几张略微放大的叠在一起（猛推猛拉的那几帧）
    acc = x.copy(); n = 4
    for i in range(1, n):
        s = 1 + k * 0.022 * i
        M = np.float32([[s, 0, (1 - s) * W / 2], [0, s, (1 - s) * H / 2]])
        acc += cv2.warpAffine(x, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / n

def bloom(x, amt):
    small = cv2.resize(x, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    lum = small.max(axis=2, keepdims=True)
    hi = small * np.clip((lum - 150.0) / 90.0, 0, 1)
    g = cv2.GaussianBlur(hi, (0, 0), 7) * 0.65 + cv2.GaussianBlur(hi, (0, 0), 20) * 0.6
    return x + cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR) * amt

def frame(f):
    t = f / FPS
    for b0, b1 in POST['black']:
        if b0 - HALF <= t < b1 - HALF: return np.zeros((H, W, 3), np.uint8)
    sp = next((s for s in POST['strips'] if s['t0'] - HALF <= t < s['t1'] - HALF), None)
    x = strip_frame(sp, f, t) if sp else load(os.path.join(a.frames, f'f{src_frame(f):05d}.jpg')).astype(np.float32)
    x = whip(x, t)
    # 去色（定格的那两秒慢慢褪成黑白）
    ds = track('desat', t)
    if ds > 0.002:
        g = x[..., 0:1] * 0.114 + x[..., 1:2] * 0.587 + x[..., 2:3] * 0.299
        x = x * (1 - ds) + g * ds
    bl = track('bloom', t)
    if bl > 0.01: x = bloom(x, bl)
    # 推、震、径向模糊
    s = 1.0
    for _, v, e in decays(POST['punch'], t): s += v
    dx = dy = 0.0
    for dt_, v, e in decays(POST['shake'], t):
        dx += v * U * math.sin(2 * math.pi * 13 * dt_ + e[0] * 7.1); dy += v * U * 0.8 * math.cos(2 * math.pi * 11 * dt_ + e[0] * 3.3)
    if dx or dy: s = max(s, 1 + 2.2 * (abs(dx) / W + abs(dy) / H) + 0.004)
    if abs(s - 1) > 1e-4 or dx or dy:
        M = np.float32([[s, 0, (1 - s) * W / 2 + dx], [0, s, (1 - s) * H / 2 + dy]])
        x = cv2.warpAffine(x, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    zb = 0.0
    for z0, z1, amp in POST['zblur']:
        if z0 - HALF <= t < z1: zb = max(zb, amp * (1 - (t - z0) / max(1e-6, z1 - z0)))
    if zb > 0.02: x = zoom_blur(x, zb)
    # 色散：红、蓝两路往外、往里各放一点
    rg = sum(v for _, v, e in decays(POST['rgb'], t)) * U
    if rg > 0.3:
        k = rg / (W / 2)
        Mr = np.float32([[1 + k, 0, -k * W / 2], [0, 1 + k, -k * H / 2]]); Mb = np.float32([[1 - k, 0, k * W / 2], [0, 1 - k, k * H / 2]])
        r = cv2.warpAffine(np.ascontiguousarray(x[..., 2]), Mr, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        b = cv2.warpAffine(np.ascontiguousarray(x[..., 0]), Mb, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        x = np.dstack([b, x[..., 1], r])
    k = track('bright', t, 1.0)
    if k < 0.999: x *= k
    # 字（片尾字后面垫一层很淡的暗，免得被亮的天吃掉）
    for o in POST['text']:
        al = ramp(t, o['a0'], o['a1'], o['b0'], o['b1'])
        if al <= 0.002: continue
        if o.get('scrim'): x *= 1 - scrim(*[round(v * U) for v in o['scrim'][:4]]) * o['scrim'][4] * al
        sc = 1.0
        if o.get('slam'): sc = 1 + 0.34 * (1 - EASE['out'](clamp((t - o['a0']) / 0.16)))
        paste(x, o['name'], al, sc)
    # 闪、白场
    fl, col = 0.0, (255, 250, 242)
    for _, v, e in decays(POST['flash'], t):
        if v > fl: fl, col = v, e[3]
    wh = track('white', t)
    if wh > fl: fl, col = wh, (255, 252, 246)
    if fl > 0.002:
        c = np.array([col[2], col[1], col[0]], np.float32)
        x = x + (c - x) * min(1.0, fl)
    # 遮幅、亮度
    lb = int(round(track('lb', t) * U))
    if lb > 0: x[:lb] = 0; x[H - lb:] = 0
    fd = track('fade', t, 1.0)
    if fd < 0.999: x *= fd
    return np.clip(x + 0.5, 0, 255).astype(np.uint8)

if a.stills:
    os.makedirs(a.stilldir, exist_ok=True)
    for sv in a.stills.split(','):
        f = round(float(sv) * FPS)
        cv2.imwrite(os.path.join(a.stilldir, f'final_{f:05d}.jpg'), frame(f), [cv2.IMWRITE_JPEG_QUALITY, 92]); print('still', f, flush=True)
    sys.exit(0)

f0 = round(a.t0 * FPS); f1 = N if a.t1 is None else min(N, round(a.t1 * FPS))
def need(f):
    t = f / FPS
    if any(b0 - HALF <= t < b1 - HALF for b0, b1 in POST['black']): return []
    sp = next((s for s in POST['strips'] if s['t0'] - HALF <= t < s['t1'] - HALF), None)
    if sp: return [os.path.join(a.layers, tg, f'f{f:05d}.jpg') for tg in sp['layers']]
    return [os.path.join(a.frames, f'f{src_frame(f):05d}.jpg')]
missing = [p for f in range(f0, f1) for p in need(f) if not os.path.exists(p)]
if missing: sys.exit(f'missing {len(missing)} frames, first {missing[:5]}')

os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
       '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
       '-ss', f'{f0 / FPS:.4f}', '-t', f'{(f1 - f0) / FPS + (0.07 if f1 == N else 0):.4f}', '-i', CONF['song'],
       '-map', '0:v:0', '-map', '1:a:0',
       '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
       '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-tune', 'film', '-profile:v', 'high', '-level', '5.1',
       '-x264-params', f'keyint={FPS * 2}:min-keyint={FPS // 4}:scenecut=60',
       '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
       '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', a.out]
if a.noaudio:
    i = cmd.index('-ss'); del cmd[i:i + 6]                        # 去掉第二路输入（歌）
    cmd.remove('1:a:0'); i = cmd.index('-map', cmd.index('0:v:0') - 2) + 2; del cmd[i:i + 1]
    j = cmd.index('-c:a'); cmd[j:j + 4] = ['-an']
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for f in range(f0, f1):
    p.stdin.write(frame(f).tobytes())
    if f % 600 == 0: print(f'compose {f}/{f1}', flush=True)
p.stdin.close(); p.wait()
print('done', a.out, p.returncode)
