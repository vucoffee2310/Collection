import numpy as np
import subprocess

PAT = r"C:\Users\My computer.DESKTOP-I6I43CB\Desktop\Fulo\vi-VN-Wavenet-D_1.mp3"
SRC = r"C:\Users\My computer.DESKTOP-I6I43CB\Desktop\Fulo\vi-VN-Wavenet-D.mp3"
SR = 8000
TOP_N = 6  # Get top 6 matches

def load_audio(f, sr):
    """Load audio file"""
    cmd = ["ffmpeg", "-i", f, "-f", "f32le", "-ac", "1", "-ar", str(sr), "-v", "0", "pipe:1"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, dtype=np.float32)

def energy_envelope(audio):
    """Compute energy envelope"""
    return np.array([np.sqrt(np.mean(audio[i:i+512]**2)) for i in range(0, len(audio)-512, 256)])

def match(pattern, source):
    """Match pattern to source"""
    p = pattern - pattern.mean()
    return np.array([np.dot(p, (w := source[i:i+len(p)]) - w.mean()) / 
                     (np.linalg.norm(w) * np.linalg.norm(p) + 1e-9) 
                     for i in range(len(source) - len(p) + 1)])

def find_top_peaks(scores, top_n):
    """Find top N peaks sorted by score, then re-sorted by time"""
    # 1. Find all local maxima
    peaks = [i for i in range(1, len(scores)-1) 
            if scores[i] > scores[i-1] and scores[i] > scores[i+1]]
    
    # 2. Sort peaks by score (descending) to find the BEST matches
    peaks_by_score = sorted(peaks, key=lambda i: scores[i], reverse=True)
    
    # 3. Take the top N best matches
    top_candidates = peaks_by_score[:top_n]
    
    # 4. Re-sort the final selection by index (Time) ascending
    return sorted(top_candidates)

def main():
    print("="*70)
    print("SIMPLIFIED ENERGY ENVELOPE MATCHING - TOP 6 (SORTED BY TIME)")
    print("="*70)
    
    # Load
    print("\n[1/4] Loading audio files...")
    pat_audio = load_audio(PAT, SR)
    src_audio = load_audio(SRC, SR)
    print(f"  Pattern: {len(pat_audio):,} samples ({len(pat_audio)/SR:.2f}s)")
    print(f"  Source:  {len(src_audio):,} samples ({len(src_audio)/SR:.2f}s)")
    
    # Extract energy
    print("\n[2/4] Computing energy envelopes...")
    pat_env = energy_envelope(pat_audio)
    src_env = energy_envelope(src_audio)
    
    # Match
    print("\n[3/4] Matching pattern to source...")
    scores = match(pat_env, src_env)
    
    # Normalize
    scores = (scores - scores.min()) / np.ptp(scores)
    
    # Find top peaks
    print(f"\n[4/4] Finding top {TOP_N} matches...")
    top_peaks = find_top_peaks(scores, TOP_N)
    
    # Results
    print("\n" + "="*70)
    print(f"RESULTS: Top {len(top_peaks)} Match(es) - Chronological Order")
    print("="*70)
    
    if top_peaks:
        for idx, peak in enumerate(top_peaks, 1):
            time_sec = peak * 256 / SR
            score = scores[peak]
            print(f"\nMatch #{idx}:")
            print(f"  Time:  {time_sec:.3f}s")
            print(f"  Score: {score:.4f}")
    else:
        print("\nNo peaks found in the audio.")

if __name__ == "__main__":
    main()