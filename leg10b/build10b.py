# -*- coding: utf-8 -*-
"""第十棒「沿途」第二版（打磨）：画面细节与流畅度。
在第十棒成品（../leg10/dusktrain-10.html）之上：
  1. fns/*.js 里每一个函数声明，替换主脚本里的同名函数；主脚本里没有的，作为新函数插在「frame」之前；
  2. PATCHES 里是小改动（锚点必须恰好出现给定次数）。
用法：python3 build10b.py → dusktrain-10b.html"""
import re, sys, json, pathlib, subprocess
HERE = pathlib.Path(__file__).parent
html = (HERE.parent / 'leg10' / 'dusktrain-10.html').read_text(encoding='utf-8')
scripts = list(re.finditer(r'<script>(.*?)</script>', html, re.S)); sm = scripts[-1]
js = sm.group(1)

def fnmap(code):
    p = HERE / '_tmp.js'; p.write_text(code, encoding='utf-8')
    return json.loads(subprocess.check_output(['node', str(HERE / 'jsfn.js'), str(p)]).decode())

def rep(old, new, count=1):
    global js
    n = js.count(old)
    if n != count: raise SystemExit('anchor count %d != %d for:\n%s' % (n, count, old[:300]))
    js = js.replace(old, new)

# ---- 1. 整个函数的替换与新增
added = []
for f in sorted((HERE / 'fns').glob('*.js')):
    code = f.read_text(encoding='utf-8')
    news = fnmap(code)
    # 文件顶层的函数逐个处理（只看最外层的函数声明：起点不被别的包含）
    tops = sorted(((n, r[0]) for n, rs in news.items() for r in rs), key=lambda q: q[1])
    spans = [(n, s, next(e for (s2, e) in news[n] if s2 == s)) for n, s in tops]
    outer = [q for q in spans if not any(o[1] < q[1] and q[2] <= o[2] for o in spans if o is not q)]
    # 紧挨在函数上面的注释跟着函数走（不然会掉在插入块的末尾，和函数分开）
    def lead(s0):
        i = s0
        while True:
            j = i
            while j > 0 and code[j - 1] in ' \t': j -= 1
            if j > 0 and code[j - 1] == '\n': j -= 1
            while j > 0 and code[j - 1] in ' \t\r': j -= 1
            if code[:j].endswith('*/'):
                k = code.rfind('/*', 0, j - 2)
                ls = code.rfind('\n', 0, k) + 1
                if k < 0 or code[ls:k].strip(): return i
                i = ls; continue
            ls = code.rfind('\n', 0, j) + 1
            if code[ls:j].lstrip().startswith('//') and j > 0: i = ls; continue
            return i
    outer = [(n, lead(s0), e) for (n, s0, e) in outer]
    cur = 0; extras = []
    for name, s, e in outer:
        body = code[s:e]
        have = fnmap(js).get(name)
        if have:
            if len(have) != 1: raise SystemExit('ambiguous function ' + name)
            a, b = have[0]; js = js[:a] + body + js[b:]
        else:
            added.append(name); extras.append(body)
        cur = e
    # 文件里函数之外的代码（常量等）一并插入
    rest = code
    for name, s, e in sorted(outer, key=lambda q: -q[1]): rest = rest[:s] + rest[e:]
    rest = rest.strip()
    block = ('\n'.join(extras) + ('\n' + rest if rest else '')).strip()
    if block:
        anchor = "/* ---------------- frame ---------------- */"
        rep(anchor, '/* ---- 第十棒第二版 · ' + f.stem + ' ---- */\n' + block + '\n' + anchor)

# ---- 2. 小改动
PATCHES = HERE / 'patches10b.py'
if PATCHES.exists(): exec(PATCHES.read_text(encoding='utf-8'))

out = html[:sm.start(1)] + js + html[sm.end(1):]
if globals().get("HTML_PATCHES"):
    for old, new, cnt in HTML_PATCHES:
        if out.count(old) != cnt: raise SystemExit('html anchor count mismatch: ' + old[:120])
        out = out.replace(old, new)
(HERE / 'dusktrain-10b.html').write_text(out, encoding='utf-8')
(HERE / 'main10b.js').write_text(js, encoding='utf-8')
subprocess.check_call(['node', '--check', str(HERE / 'main10b.js')])
print('ok', len(out), 'added', added)
