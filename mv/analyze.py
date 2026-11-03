import librosa, numpy as np, json
y, sr = librosa.load('song.wav', sr=22050, mono=True)
dur = len(y) / sr
hop = 512
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, tightness=120)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
tempo = float(np.atleast_1d(tempo)[0])
print('duration %.2f s, tempo %.2f BPM, beats %d' % (dur, tempo, len(bt)))
ib = np.diff(bt); print('beat interval median %.4f, std %.4f, min %.3f max %.3f' % (np.median(ib), np.std(ib), ib.min(), ib.max()))
# RMS energy per beat
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
rt = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
def seg_mean(a, t, t0, t1):
    m = (t >= t0) & (t < t1); return float(a[m].mean()) if m.any() else 0.0
# low-frequency (kick) energy for downbeat estimation
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[(freqs > 30) & (freqs < 150)].sum(axis=0)
lt = librosa.frames_to_time(np.arange(len(low)), sr=sr, hop_length=hop)
lowb = np.array([seg_mean(low, lt, b - 0.03, b + 0.07) for b in bt])
phase_score = [lowb[p::4].mean() for p in range(4)]
print('kick energy by beat phase', ['%.1f' % v for v in phase_score])
# energy per 4-beat bar (using best phase)
p0 = int(np.argmax(phase_score))
bars = bt[p0::4]
print('bar phase', p0, 'bars', len(bars), 'first bar at %.3f' % bars[0])
energy = [seg_mean(rms, rt, bars[i], bars[i + 1]) for i in range(len(bars) - 1)]
emax = max(energy)
line = ''
for i, e in enumerate(energy):
    line += '%3d %6.2fs %s\n' % (i, bars[i], '#' * int(e / emax * 50))
print(line)
json.dump({'duration': dur, 'tempo': tempo, 'beats': bt.tolist(), 'bar_phase': p0, 'bars': bars.tolist(), 'bar_energy': energy}, open('beats.json', 'w'))
