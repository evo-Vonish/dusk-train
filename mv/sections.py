import librosa, numpy as np, json
y, sr = librosa.load('song.wav', sr=22050, mono=True)
B = json.load(open('beats.json'))
bt = np.array(B['beats']); hop = 512
beats_f = librosa.time_to_frames(bt, sr=sr, hop_length=hop)
# tempo check
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tg = librosa.feature.tempogram(onset_envelope=oenv, sr=sr, hop_length=hop)
bpms = librosa.tempo_frequencies(tg.shape[0], sr=sr, hop_length=hop)
avg = tg.mean(axis=1)
top = np.argsort(avg)[::-1]
cands = []
for i in top:
    if 50 < bpms[i] < 260 and all(abs(bpms[i] - c) > 4 for c in cands): cands.append(bpms[i])
    if len(cands) >= 6: break
print('tempogram peaks (BPM):', ['%.1f' % c for c in cands])
# beat-synchronous features
chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
feat = np.vstack([librosa.util.normalize(chroma, axis=0), mfcc / 50])
bs = librosa.util.sync(feat, beats_f, aggregate=np.median)
for k in (10, 14):
    bounds = librosa.segment.agglomerative(bs, k)
    bound_t = [bt[min(b, len(bt) - 1)] for b in bounds]
    print('k=%d boundaries (s):' % k, ' '.join('%.1f' % t for t in bound_t))
# novelty from self-similarity (checkerboard)
R = librosa.segment.recurrence_matrix(bs, mode='affinity', sym=True, width=4)
n = R.shape[0]; K = 16
ker = np.kron(np.array([[1, -1], [-1, 1]]), np.ones((K, K)))
nov = np.zeros(n)
Rp = np.pad(R, K)
for i in range(n): nov[i] = (Rp[i:i + 2 * K, i:i + 2 * K] * ker).sum()
peaks = librosa.util.peak_pick(nov, pre_max=8, post_max=8, pre_avg=8, post_avg=8, delta=0.5, wait=16)
print('novelty peaks (s):', ' '.join('%.1f' % bt[min(p, len(bt) - 1)] for p in peaks))
# onset density per bar (drum activity)
on = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units='time')
bars = np.array(B['bars'])
dens = [int(((on >= bars[i]) & (on < bars[i + 1])).sum()) for i in range(len(bars) - 1)]
print('onsets per bar:', dens)
# spectral centroid & high-frequency energy per bar (brightness)
cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
ct = librosa.frames_to_time(np.arange(len(cent)), sr=sr, hop_length=hop)
cb = [int(cent[(ct >= bars[i]) & (ct < bars[i + 1])].mean()) for i in range(len(bars) - 1)]
print('centroid per bar:', cb)
json.dump({'onsets': on.tolist()}, open('onsets.json', 'w'))
