import soundfile as sf
import resampy
import numpy as np
from scipy.signal import fftconvolve, find_peaks

# File paths and target sampling rate
pattern_path = r"/content/output1.ogg"
search_path = r"/content/output2.ogg"
target_sr = 8000  # 8 kHz

# Load audio using soundfile
pattern, original_sr_pattern = sf.read(pattern_path)
search, original_sr_search = sf.read(search_path)

# Convert to mono if stereo
if pattern.ndim == 2:
    pattern = np.mean(pattern, axis=1)
if search.ndim == 2:
    search = np.mean(search, axis=1)

# Resample to target_sr
pattern = resampy.resample(pattern, original_sr_pattern, target_sr)
search = resampy.resample(search, original_sr_search, target_sr)

# Normalize audio
pattern = pattern / np.max(np.abs(pattern))
search = search / np.max(np.abs(search))

sr = target_sr

# Validate lengths
if len(pattern) > len(search):
    raise ValueError("Pattern longer than search file")

# Cross-correlation and normalization
correlation = fftconvolve(search, pattern[::-1], mode='valid') / np.sum(pattern ** 2)

# Find peaks
peaks, _ = find_peaks(correlation, height=0.5, distance=len(pattern))

# Calculate matches with RMS
matches = []
for peak in peaks:
    start = peak / sr
    end = (peak + len(pattern)) / sr
    similarity = correlation[peak]
    
    # RMS for last 20% of match
    end_sample = min(int(peak + len(pattern)), len(search))
    start_sample = max(0, end_sample - int(0.2 * len(pattern)))
    rms = np.sqrt(np.mean(search[start_sample:end_sample]**2))
    
    matches.append((start, end, similarity, rms))

# Print results
for i, (start, end, sim, rms) in enumerate(matches):
    print(f"Match {i+1}: Start = {start:.2f}s, End = {end:.2f}s, Sim = {sim:.2f}, RMS = {rms:.2f}")