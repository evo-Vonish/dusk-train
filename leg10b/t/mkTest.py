import pathlib, re
src = pathlib.Path('dusktrain-10.html').read_text(encoding='utf-8')
hook = """window.__drawKs = drawKeepsake; window.__T = () => ({ S, TW, NX, SKY2, SKYGL, SKYMIX, FROZEN, SKY_ART, seasonWeight, seasonPos, townSeasons, NCH, SEAMO, ENCOUNTERS, PEEL, PX, store, CARD, CARDS, ALBUM, DEV, bottle, boat, shoal, meteors, tryPeel, pickHit, renderRegion, draw, update, setDev, openAlbum, closeAlbum, closeCard, devEncounter, waitAt, ridersArrive, journey, depart, beginEncounter, G, townPos, setPieces, layoutTown, syncDash, journeyNight, stationName, nudge, peel, hitGot, focusNext, peelFocused, invalidate, spawnMeteor, KUN, kunPose, modeNightNow, stationNight, nightLoopOf, nightLoopQ });
window.__frames = 0; window.__err = []; window.__E = s => eval(s);
"""
anchor = "/* ---------------- go ---------------- */"
assert src.count(anchor) == 1
src = src.replace(anchor, hook + anchor)
src = src.replace("function frame(now) {\n  raf = 0;", "function frame(now) {\n  raf = 0; window.__frames++;")
src = src.replace("  draw();\n  if (!S.paused && !document.hidden && !S.pageHidden) raf = requestAnimationFrame(frame);", "  { const t0 = performance.now(); draw(); const d = performance.now() - t0; window.__drawMs = (window.__drawMs || 0) + d; window.__drawN = (window.__drawN || 0) + 1; window.__maxDraw = Math.max(window.__maxDraw || 0, d); }\n  if (!S.paused && !document.hidden && !S.pageHidden) raf = requestAnimationFrame(frame);")
pathlib.Path('test.html').write_text(src, encoding='utf-8')
# syntax check of the main script
m = re.findall(r'<script>(.*?)</script>', src, re.S)
pathlib.Path('main.js').write_text(m[-1] if m else '', encoding='utf-8')
print('ok', len(src), len(m))
