import json, numpy as np, librosa
B = json.load(open('beats.json')); bt = np.array(B['beats'])
y, sr = librosa.load('song.wav', sr=22050); hop = 256
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
ot = librosa.frames_to_time(np.arange(len(oenv)), sr=sr, hop_length=hop)
def strength(t, w=0.06):
    m = (ot > t - w) & (ot < t + w); return float(oenv[m].max()) if m.any() else 0
bounds = [2.07, 7.66, 11.73, 15.79, 19.88, 32.07, 48.34, 52.41, 64.62, 68.68, 76.81, 105.30, 109.37, 125.64, 137.83, 141.90, 170.39, 189.2]
idx = [int(np.argmin(abs(bt - b))) for b in bounds]
print('boundary beat idx:', list(zip(bounds, idx, ['%.3f' % bt[i] for i in idx])))
st = np.array([strength(t) for t in bt]); half = np.array([strength((bt[i] + bt[i + 1]) / 2) for i in range(len(bt) - 1)] + [0])
med = np.median(st)
print('median beat onset %.2f, 90th pct %.2f' % (med, np.percentile(st, 90)))
# 每一拍的强度画成一行一行（每行 8 拍），方便看重音
for r in range(0, len(bt), 8):
    row = ''.join(('#' if st[i] > med * 1.8 else '+' if st[i] > med * 1.25 else '.') + ('*' if half[i] > med * 1.8 else ' ') for i in range(r, min(r + 8, len(bt))))
    print('%3d %6.2f  %s' % (r, bt[r], row))
json.dump({'beats': bt.tolist(), 'strength': st.tolist(), 'half': half.tolist(), 'bounds_idx': idx}, open('grid.json', 'w'))
