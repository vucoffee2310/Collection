import librosa
import numpy as np
from scipy.signal import fftconvolve, find_peaks
import soundfile as sf # Import soundfile
import time

# --- Helper function to load audio using soundfile and resample with librosa ---
def load_audio_custom(path, target_sr_hz):
    try:
        data, sr_original = sf.read(path, dtype='float32')
    except Exception as e:
        print(f"Error loading with soundfile: {e}. Falling back to librosa.load for {path}")
        # Fallback to librosa.load if soundfile fails (e.g., format not supported by sf on system)
        data, sr_original = librosa.load(path, sr=None, mono=False) # Load native and then handle
        if data.ndim > 1: # If librosa returned stereo (e.g. shape (2, N))
            data = data.mean(axis=0) # Average channels to make it (N,)
        # Ensure it's float32 after librosa potentially using float64
        data = data.astype(np.float32)


    # Ensure mono: soundfile gives (samples, channels) or (samples,)
    if data.ndim > 1:
        data = np.mean(data, axis=1)  # Average across channels if stereo
    
    # Resample if necessary using librosa
    if sr_original != target_sr_hz:
        data = librosa.resample(data, orig_sr=sr_original, target_sr=target_sr_hz)
    
    # librosa.util.normalize will be applied later
    return data
# --- End helper function ---

# File paths and target sampling rate
pattern_path = r"/home/user/test/ABCDE.mp3"
search_path = r"/home/user/test/transcript.mp3"
target_sr = 4000  # 4 kHz

print("Loading audio...")
t_start_load = time.time()

# Load audio using the custom function
pattern = load_audio_custom(pattern_path, target_sr)
search = load_audio_custom(search_path, target_sr)

print(f"Audio loaded and preprocessed in {time.time() - t_start_load:.2f}s")

# Normalize audio to have max amplitude of 1 (as in original)
# This is done after both files are loaded to maintain consistency.
pattern = librosa.util.normalize(pattern)
search = librosa.util.normalize(search)

# Cast to float32 for performance optimization (soundfile + resample should maintain this, but good to be sure)
# sf.read(dtype='float32') makes it float32. librosa.resample/normalize should preserve it.
# These lines are likely redundant if the load_audio_custom works as expected,
# but do not harm.
pattern = pattern.astype(np.float32)
search = search.astype(np.float32)


# Sampling rate (already known as target_sr)
sr = target_sr

# Validate lengths
if len(pattern) == 0:
    raise ValueError("Pattern is empty. Cannot perform matching.")
if len(pattern) > len(search):
    raise ValueError("Pattern length exceeds search signal length.")

print("Starting NCC computation...")
t_ncc_start = time.time()

M = len(pattern)
pattern_mean = np.mean(pattern)
pattern_centered = pattern - pattern_mean
pattern_std_dev = np.std(pattern_centered)

if pattern_std_dev < 1e-9: # Threshold for pattern being effectively silent/constant
    print("Pattern has near-zero standard deviation (likely silent or constant). No matches possible.")
    matches = []
else:
    pattern_energy = np.sum(pattern_centered ** 2)

    # Cross-correlation numerator
    conv_numerator = fftconvolve(search, pattern_centered[::-1], mode='valid')

    # ---- OPTIMIZED Sliding Window Statistics using np.cumsum ----
    search_sq = search ** 2
    
    search_cumsum = np.cumsum(search, dtype=np.float32)
    search_sq_cumsum = np.cumsum(search_sq, dtype=np.float32)
    
    # Sum of search[i:i+M]
    # Concatenate with a zero element at the beginning for the subtraction
    offset_search_cumsum = np.concatenate((np.array([0], dtype=np.float32), search_cumsum[:-M]))
    sliding_sum = search_cumsum[M-1:] - offset_search_cumsum
    
    # Sum of search[i:i+M]^2
    offset_search_sq_cumsum = np.concatenate((np.array([0], dtype=np.float32), search_sq_cumsum[:-M]))
    sliding_sum_squares = search_sq_cumsum[M-1:] - offset_search_sq_cumsum
    # ---- END OPTIMIZATION ----

    local_mean = sliding_sum / M
    # Ensure variance is not negative due to floating point inaccuracies
    local_variance = np.maximum(0, (sliding_sum_squares / M) - (local_mean ** 2))
    
    # Denominator for normalized cross-correlation
    # sqrt(sum_squares_local_centered_window * sum_squares_pattern_centered)
    # sum_squares_local_centered_window = M * local_variance
    local_energy_term = local_variance * M # This is sum_squares of local centered window
    
    # Denominator combines energy of local search window and pattern
    # Adding epsilon inside sqrt for local_energy_term and for pattern_energy (implicitly handled by pattern_std_dev check)
    denominator = np.sqrt(local_energy_term) * np.sqrt(pattern_energy) + 1e-9 # Epsilon for stability

    ncc = np.zeros_like(conv_numerator, dtype=np.float32)
    # Only compute ncc where denominator is reasonably large
    valid_den_mask = denominator > 1e-8 # Avoid division by zero or very small numbers
    ncc[valid_den_mask] = conv_numerator[valid_den_mask] / denominator[valid_den_mask]

    # Clip NCC values to be strictly within [-1, 1] due to potential float precision issues
    ncc = np.clip(ncc, -1.0, 1.0)

    print(f"NCC computation took {time.time() - t_ncc_start:.2f}s")

    # Find peaks in the normalized cross-correlation
    # Using original parameters for height and distance.
    # distance=0.25*M can lead to multiple detections for a single event if NCC is broad or M is small.
    # Consider distance=M for non-overlapping matches.
    peaks, _ = find_peaks(ncc, height=0.7, distance=int(max(1, 0.25 * M))) # Ensure distance is at least 1

    matches = []
    if len(peaks) > 0:
        print(f"Found {len(peaks)} potential peaks. Calculating RMS...")
        for peak_idx in peaks:
            start_sample = peak_idx
            end_sample = peak_idx + M
            
            start_time = start_sample / sr
            end_time = end_sample / sr
            similarity = ncc[peak_idx]
            
            match_segment = search[start_sample : end_sample]
            # RMS calculation should be safe as M > 0 and segment length will be M
            rms = np.sqrt(np.mean(match_segment ** 2)) if M > 0 else 0.0
            
            matches.append((start_time, end_time, similarity, rms))
    else:
        print("No peaks found matching criteria.")

# Output results
if matches:
    for i, (start, end, sim, rms_val) in enumerate(matches):
        print(f"Match {i+1}: Start = {start:.2f}s, End = {end:.2f}s, Sim = {sim:.2f}, RMS = {rms_val:.4f}")
else:
    print("No matches found.")
