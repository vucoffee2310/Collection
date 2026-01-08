import numpy as np, subprocess
from scipy.signal import spectrogram, find_peaks

PAT, SRC, SR, TH = (
    r"C:\Users\My computer.DESKTOP-I6I43CB\Desktop\Fulo\output_1.ogg",
    r"C:\Users\My computer.DESKTOP-I6I43CB\Desktop\Fulo\output.ogg",
    8000,
    0.8,
)

# 1. Define parameters globally so the math stays consistent
NPERSEG = 1024
NOVERLAP = 512

def get(f):
    cmd = [
        "ffmpeg",
        "-i",
        f,
        "-f",
        "f32le",
        "-ac",
        "1",
        "-ar",
        str(SR),
        "-v",
        "0",
        "pipe:1",
    ]
    y = np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, dtype=np.float32)
    
    # 2. Use the global parameters here
    return (
        (np.log10(spectrogram(y, fs=SR, nperseg=NPERSEG, noverlap=NOVERLAP)[2] + 1e-10), len(y))
        if len(y) > NPERSEG
        else (None, 0)
    )

(pat, _), (src, slen) = get(PAT), get(SRC)
if pat is None or src is None:
    exit("Error: Invalid files")

p = pat.flatten() - pat.mean()
pn, w, sc = np.linalg.norm(p), pat.shape[1], []

for i in range(src.shape[1] - w):
    v = src[:, i : i + w].flatten()
    v -= v.mean()
    sc.append(np.dot(v, p) / (np.linalg.norm(v) * pn + 1e-10))

sc = np.array(sc)
if (rng := np.ptp(sc)) > 0:
    sc = (sc - sc.min()) / rng

peaks, _ = find_peaks(sc, height=TH, distance=w)
print(f"Matches: {len(peaks)}")

# 3. CORRECT CALCULATION
# Time per frame = Hop Length / Sample Rate
# Hop Length = nperseg - noverlap
k = (NPERSEG - NOVERLAP) / SR

[print(f"T: {i*k:.2f}s | Sc: {sc[i]:.4f}") for i in peaks]
