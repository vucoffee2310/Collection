import librosa
import numpy as np
from scipy.signal import fftconvolve, find_peaks

# File paths and target sampling rate
pattern_path = r"/home/user/test/ABCDE.mp3"
search_path = r"/home/user/test/transcript.mp3"
target_sr = 4000  # 4 kHz

# Load audio
pattern, _ = librosa.load(pattern_path, sr=target_sr, mono=True)
search, _ = librosa.load(search_path, sr=target_sr, mono=True)

# Normalize audio to have max amplitude of 1
pattern = librosa.util.normalize(pattern)
search = librosa.util.normalize(search)

# Cast to float32 for performance optimization
pattern = pattern.astype(np.float32)
search = search.astype(np.float32)

# Sampling rate
sr = target_sr

# Validate lengths
if len(pattern) > len(search):
    raise ValueError("Pattern length exceeds search signal length")

# Compute normalized cross-correlation
M = len(pattern)
pattern_mean = np.mean(pattern)
pattern_centered = pattern - pattern_mean
pattern_energy = np.sum(pattern_centered ** 2)

# Cross-correlation with centered pattern
conv = fftconvolve(search, pattern_centered[::-1], mode='valid')

# Compute sliding statistics for normalization
window = np.ones(M, dtype=np.float32)
sliding_sum = fftconvolve(search, window, mode='valid')
sliding_sum_squares = fftconvolve(search ** 2, window, mode='valid')

# Local mean and variance
local_mean = sliding_sum / M
local_variance = (sliding_sum_squares / M) - (local_mean ** 2)

# Denominator for normalized cross-correlation
denominator = np.sqrt(local_variance * M) * np.sqrt(pattern_energy) + 1e-10

# Normalized cross-correlation (values between -1 and 1)
ncc = conv / denominator

# Find peaks in the normalized cross-correlation
peaks, _ = find_peaks(ncc, height=0.7, distance=0.25 * M)

# Store matches with start time, end time, similarity, and RMS
matches = []
for peak in peaks:
    start = peak / sr
    end = (peak + M) / sr
    similarity = ncc[peak]
    
    # Compute RMS over the entire matched segment
    match_segment = search[peak: peak + M]
    rms = np.sqrt(np.mean(match_segment ** 2))
    
    matches.append((start, end, similarity, rms))

# Output results
for i, (start, end, sim, rms) in enumerate(matches):
    print(f"Match {i+1}: Start = {start:.2f}s, End = {end:.2f}s, Sim = {sim:.2f}, RMS = {rms:.2f}")