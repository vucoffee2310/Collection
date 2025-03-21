import librosa
import numpy as np
from scipy.signal import fftconvolve, find_peaks

# File paths and target sampling rate
pattern_path = r"F:\STR\output1.ogg"
search_path = r"F:\STR\output2.ogg"
target_sr = 8000 # 11.025 kHz

# Load audio
pattern, _ = librosa.load(pattern_path, sr=target_sr, mono=True)
search, _ = librosa.load(search_path, sr=target_sr, mono=True)

# Normalize audio
pattern = librosa.util.normalize(pattern)
search = librosa.util.normalize(search)
sr = target_sr

# Validate lengths
if len(pattern) > len(search):
    raise ValueError("Pattern longer than search file")

# Cross-correlation and normalization
correlation = fftconvolve(search, pattern[::-1], mode='valid') / np.sum(pattern ** 2)

# Find peaks
peaks, _ = find_peaks(correlation, height=0.5, distance=0.25*len(pattern))

# Calculate matches with RMS
matches = []
for peak in peaks:
    start = peak / sr
    end = (peak + len(pattern)) / sr
    similarity = correlation[peak]
    
    # RMS for last 20% of match
    end_sample = min(int(peak + len(pattern)), len(search))
    start_sample = max(0, end_sample - int(0.25 * len(pattern)))
    rms = np.sqrt(np.mean(search[start_sample:end_sample]**2))
    
    matches.append((start, end, similarity, rms))

# Print results
for i, (start, end, sim, rms) in enumerate(matches):
    print(f"Match {i+1}: Start = {start:.2f}s, End = {end:.2f}s, Sim = {sim:.2f}, RMS = {rms:.2f}")