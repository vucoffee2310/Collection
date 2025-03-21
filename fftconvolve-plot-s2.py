import soundfile as sf
import resampy
import numpy as np
from scipy.signal import fftconvolve, find_peaks
import matplotlib.pyplot as plt

# Define audio paths as provided
pattern_path = r"F:\STR\output1.ogg"
search_path = r"F:\STR\output2.ogg"

# Set target sampling rate for downsampling to speed up computation
target_sr = 8000  # 8 kHz (note: comment saying 11.025 kHz seems to be a typo)

# Load audio files with soundfile
pattern, sr_pattern = sf.read(pattern_path)
if pattern.ndim > 1:
    pattern = np.mean(pattern, axis=1)
pattern = resampy.resample(pattern, sr_pattern, target_sr)
pattern = pattern / np.max(np.abs(pattern))

search, sr_search = sf.read(search_path)
if search.ndim > 1:
    search = np.mean(search, axis=1)
search = resampy.resample(search, sr_search, target_sr)
search = search / np.max(np.abs(search))

# Set sampling rate to target after resampling
sr = target_sr

# Check if pattern is longer than search file
if len(pattern) > len(search):
    print("Pattern is longer than the search file. No matches possible.")
else:
    # Compute cross-correlation efficiently
    correlation = fftconvolve(search, pattern[::-1], mode='valid')

    # Compute autocorrelation of the pattern for normalization
    auto_corr = fftconvolve(pattern, pattern[::-1], mode='valid')

    # Set threshold to 0.1 as requested
    threshold = 0.1

    # Normalize correlation
    correlation_normalized = correlation / auto_corr[0]

    # Find peaks (matches) in the correlation signal
    peaks, _ = find_peaks(correlation_normalized, height=threshold, distance=0.5 * len(pattern))

    # Calculate pattern duration in seconds
    pattern_duration = len(pattern) / sr

    # Store match details with RMS amplitude
    matches = []
    for peak in peaks:
        start_time = peak / sr
        end_time = start_time + pattern_duration
        similarity = correlation_normalized[peak]

        # Compute RMS amplitude of the matched segment, interval near end, 0.2% length
        original_end_sample = int(peak + len(pattern))
        interval_length = int(0.2 * len(pattern))  # 0.2% of pattern length
        start_sample = original_end_sample - interval_length
        end_sample = original_end_sample

        if start_sample < 0:
            start_sample = 0
        if end_sample > len(search):
            end_sample = len(search)
        if start_sample >= end_sample:  # Handle edge case where interval is invalid
            start_sample = original_end_sample - 1 if original_end_sample > 0 else 0
            end_sample = original_end_sample

        segment = search[start_sample:end_sample]
        rms = np.sqrt(np.mean(segment**2))  # RMS calculation

        matches.append((start_time, end_time, similarity, rms))

    # Sort matches by similarity (highest first)
    matches.sort(key=lambda x: x[2], reverse=True)

    # Print results with RMS
    if len(matches) == 0:
        print("No matches found above the threshold.")
    else:
        print(f"Found {len(matches)} matches:")
        for i, (start, end, similarity, rms) in enumerate(matches):
            print(f"Match {i+1}: Start = {start:.2f} s, End = {end:.2f} s, Similarity = {similarity:.2f}, RMS = {rms:.2f}")

    # --- Visualization ---
    # Time arrays for plotting
    t_search = np.arange(len(search)) / sr
    t_corr = t_search[:len(correlation)]

    # Create subplots
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

    # Plot search waveform with match markers
    ax1.plot(t_search, search, label='Search Waveform')
    for start, end, _, rms in matches:
        ax1.axvline(start, color='blue', linestyle='-', label='Match Start' if 'Match Start' not in ax1.get_legend_handles_labels()[1] else "")
        ax1.axvline(end, color='purple', linestyle='--', label='Match End' if 'Match End' not in ax1.get_legend_handles_labels()[1] else "")
        ax1.text(start, 1.1, f'RMS: {rms:.2f}', ha='center', va='bottom')
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Amplitude')
    ax1.legend()

    # Plot correlation signal with peaks
    ax2.plot(t_corr, correlation_normalized, label='Normalized Correlation')
    ax2.axhline(threshold, color='green', linestyle='--', label=f'Threshold ({threshold})')
    ax2.plot(t_corr[peaks], correlation_normalized[peaks], 'ro', label='Detected Peaks')
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Normalized Correlation')
    ax2.legend()

    plt.tight_layout()
    plt.show()