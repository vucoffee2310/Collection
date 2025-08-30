// This script will execute when the popup (viewer.html) is opened.

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const runButton = document.getElementById('run-button');
    const patternInput = document.getElementById('pattern-file');
    const searchInput = document.getElementById('search-file');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    let wasmApi = null;

    // --- Start: Load the WASM Module ---
    statusDiv.textContent = 'Loading WASM FFT module...';
    createFFTModule().then(Module => {
        // Wrap the C++ functions for easier use
        const wasm_fft = Module.cwrap('wasm_fft', null, ['number', 'number', 'number', 'number', 'number']);
        const wasm_ifft = Module.cwrap('wasm_ifft', null, ['number', 'number', 'number', 'number', 'number']);
        
        wasmApi = {
            Module,
            fft: wasm_fft,
            ifft: wasm_ifft
        };

        statusDiv.textContent = 'Ready. Select files and click "Find Matches".';
        runButton.disabled = false;
    }).catch(e => {
        statusDiv.textContent = 'Error loading WASM module. See console.';
        console.error(e);
    });
    // --- End: Load the WASM Module ---

    runButton.disabled = true; // Disabled until WASM is loaded
    runButton.addEventListener('click', runMatch);

    // ===================================================================
    //  HELPER FUNCTIONS (JavaScript replacements for Python/NumPy/SciPy)
    // ===================================================================
    
    /**
     * Loads and resamples an audio file using the Web Audio API.
     * @param {File} file - The audio file object from an input element.
     * @param {number} targetSr - The target sample rate.
     * @returns {Promise<Float32Array>} - A promise that resolves with the audio data.
     */
    async function loadAudio(file, targetSr) {
        const audioContext = new OfflineAudioContext(1, 1, targetSr);
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer.getChannelData(0);
    }
    
    /**
     * A direct JavaScript translation of the provided find_peaks function.
     */
    function findPeaks(x, height, distance) {
        const n = x.length;
        if (n === 0) return [];

        let allIndices = [];
        if (n > 1 && x[0] > x[1]) allIndices.push(0);
        for (let i = 1; i < n - 1; i++) {
            if (x[i] > x[i-1] && x[i] > x[i+1]) {
                allIndices.push(i);
            }
        }
        if (n > 1 && x[n-1] > x[n-2]) allIndices.push(n-1);
        if (n === 1) allIndices.push(0);
        
        const indices = height === null ? allIndices : allIndices.filter(i => x[i] >= height);
        
        if (distance !== null && indices.length > 0) {
            const dist = Math.floor(distance);
            if (dist < 1) return indices.sort((a, b) => a - b);

            const peaksSorted = indices.map(i => ({ val: x[i], idx: i }))
                                       .sort((a, b) => b.val - a.val);
            
            const isSuppressed = new Array(n).fill(false);
            const finalPeakIndices = [];

            for (const peak of peaksSorted) {
                if (!isSuppressed[peak.idx]) {
                    finalPeakIndices.push(peak.idx);
                    const start = Math.max(0, peak.idx - dist);
                    const end = Math.min(n, peak.idx + dist + 1);
                    for (let i = start; i < end; i++) {
                        isSuppressed[i] = true;
                    }
                }
            }
            return finalPeakIndices.sort((a, b) => a - b);
        }
        
        return indices.sort((a, b) => a - b);
    }

    /**
     * Performs FFT-based convolution, mimicking scipy.signal.fftconvolve.
     * @param {Float32Array} in1 - The first signal (longer).
     * @param {Float32Array} in2 - The second signal (shorter).
     * @returns {Float32Array} - The 'valid' part of the convolution result.
     */
    function fftConvolve(in1, in2) {
        const n1 = in1.length;
        const n2 = in2.length;
        const n_fft = n1 + n2 - 1;
        
        // Pad signals to the required FFT size
        const in1_padded_real = new Float32Array(n_fft);
        in1_padded_real.set(in1);
        const in1_padded_imag = new Float32Array(n_fft);

        const in2_padded_real = new Float32Array(n_fft);
        in2_padded_real.set(in2);
        const in2_padded_imag = new Float32Array(n_fft);

        // --- Allocate memory in WASM heap ---
        const BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
        const ptr1_real = wasmApi.Module._malloc(n_fft * BYTES_PER_ELEMENT);
        const ptr1_imag = wasmApi.Module._malloc(n_fft * BYTES_PER_ELEMENT);
        const ptr2_real = wasmApi.Module._malloc(n_fft * BYTES_PER_ELEMENT);
        const ptr2_imag = wasmApi.Module._malloc(n_fft * BYTES_PER_ELEMENT);
        
        // --- Copy data to WASM ---
        wasmApi.Module.HEAPF32.set(in1_padded_real, ptr1_real / BYTES_PER_ELEMENT);
        wasmApi.Module.HEAPF32.set(in1_padded_imag, ptr1_imag / BYTES_PER_ELEMENT);
        wasmApi.Module.HEAPF32.set(in2_padded_real, ptr2_real / BYTES_PER_ELEMENT);
        wasmApi.Module.HEAPF32.set(in2_padded_imag, ptr2_imag / BYTES_PER_ELEMENT);

        // --- Perform FFT on both signals ---
        // Pointers for output are the same as input, FFT is done in-place.
        wasmApi.fft(n_fft, ptr1_real, ptr1_imag, ptr1_real, ptr1_imag);
        wasmApi.fft(n_fft, ptr2_real, ptr2_imag, ptr2_real, ptr2_imag);
        
        // --- Get frequency domain data back from WASM ---
        const fft1_real = new Float32Array(wasmApi.Module.HEAPF32.buffer, ptr1_real, n_fft);
        const fft1_imag = new Float32Array(wasmApi.Module.HEAPF32.buffer, ptr1_imag, n_fft);
        const fft2_real = new Float32Array(wasmApi.Module.HEAPF32.buffer, ptr2_real, n_fft);
        const fft2_imag = new Float32Array(wasmApi.Module.HEAPF32.buffer, ptr2_imag, n_fft);

        // --- Perform complex multiplication in frequency domain ---
        const conv_freq_real = new Float32Array(n_fft);
        const conv_freq_imag = new Float32Array(n_fft);
        for (let i = 0; i < n_fft; i++) {
            conv_freq_real[i] = fft1_real[i] * fft2_real[i] - fft1_imag[i] * fft2_imag[i];
            conv_freq_imag[i] = fft1_real[i] * fft2_imag[i] + fft1_imag[i] * fft2_real[i];
        }

        // --- Copy multiplied data back to WASM for IFFT ---
        // We can reuse ptr1 for the output of the convolution.
        wasmApi.Module.HEAPF32.set(conv_freq_real, ptr1_real / BYTES_PER_ELEMENT);
        wasmApi.Module.HEAPF32.set(conv_freq_imag, ptr1_imag / BYTES_PER_ELEMENT);

        // --- Perform Inverse FFT ---
        wasmApi.ifft(n_fft, ptr1_real, ptr1_imag, ptr1_real, ptr1_imag);
        
        // --- Get the final time-domain result ---
        // The result is the real part after IFFT. We need to create a copy.
        const full_conv = new Float32Array(wasmApi.Module.HEAPF32.buffer, ptr1_real, n_fft).slice();

        // --- IMPORTANT: Free all allocated WASM memory ---
        wasmApi.Module._free(ptr1_real);
        wasmApi.Module._free(ptr1_imag);
        wasmApi.Module._free(ptr2_real);
        wasmApi.Module._free(ptr2_imag);

        // Extract the 'valid' part of the convolution and return
        return full_conv.subarray(n2 - 1, n1);
    }
    
    // ===================================================================
    //  MAIN MATCHING LOGIC
    // ===================================================================

    async function runMatch() {
        resultsDiv.textContent = '';
        const patternFile = patternInput.files[0];
        const searchFile = searchInput.files[0];

        if (!patternFile || !searchFile) {
            statusDiv.textContent = 'Error: Please select both a pattern and a search file.';
            return;
        }

        try {
            const target_sr = 4000;
            
            // --- 1. Load and prepare audio ---
            statusDiv.textContent = 'Loading and resampling audio...';
            let pattern = await loadAudio(patternFile, target_sr);
            let search = await loadAudio(searchFile, target_sr);

            if (pattern.length > search.length) {
                throw new Error("Pattern length cannot exceed search signal length.");
            }
            
            // --- 2. Normalize audio ---
            statusDiv.textContent = 'Normalizing audio signals...';
            let max_abs = 0;
            for (const val of pattern) max_abs = Math.max(max_abs, Math.abs(val));
            for (let i = 0; i < pattern.length; i++) pattern[i] /= (max_abs + 1e-10);
            
            max_abs = 0;
            for (const val of search) max_abs = Math.max(max_abs, Math.abs(val));
            for (let i = 0; i < search.length; i++) search[i] /= (max_abs + 1e-10);
            
            // --- 3. Compute normalized cross-correlation (NCC) ---
            statusDiv.textContent = 'Calculating cross-correlation... (this may take a moment)';
            
            // Allow the UI to update before this heavy computation
            await new Promise(resolve => setTimeout(resolve, 10));

            const M = pattern.length;
            const pattern_mean = pattern.reduce((a, b) => a + b) / M;
            const pattern_centered = pattern.map(x => x - pattern_mean);
            
            let pattern_energy = 0;
            for (const val of pattern_centered) pattern_energy += val * val;
            
            const pattern_reversed = pattern_centered.slice().reverse();
            const conv = fftConvolve(search, pattern_reversed);
            
            // --- 4. Compute sliding statistics for normalization ---
            const window = new Float32Array(M).fill(1.0);
            const sliding_sum = fftConvolve(search, window);
            
            const search_squared = search.map(x => x * x);
            const sliding_sum_squares = fftConvolve(search_squared, window);
            
            const ncc = new Float32Array(conv.length);
            const sqrt_pattern_energy = Math.sqrt(pattern_energy);

            for (let i = 0; i < ncc.length; i++) {
                const local_mean = sliding_sum[i] / M;
                const local_variance = (sliding_sum_squares[i] / M) - (local_mean * local_mean);
                const denominator = Math.sqrt(local_variance * M) * sqrt_pattern_energy + 1e-10;
                ncc[i] = conv[i] / denominator;
            }
            
            // --- 5. Find peaks in the NCC result ---
            statusDiv.textContent = 'Finding peaks...';
            const peaks = findPeaks(ncc, 0.7, 0.25 * M);
            
            // --- 6. Format and display results ---
            if (peaks.length === 0) {
                resultsDiv.textContent = 'No matches found with similarity > 0.7';
            } else {
                let resultText = '';
                peaks.forEach((peak, i) => {
                    const start = peak / target_sr;
                    const end = (peak + M) / target_sr;
                    const similarity = ncc[peak];
                    
                    const match_segment = search.subarray(peak, peak + M);
                    let rms_sum_sq = 0;
                    for(const val of match_segment) rms_sum_sq += val * val;
                    const rms = Math.sqrt(rms_sum_sq / match_segment.length);
                    
                    resultText += `Match ${i + 1}:\n`;
                    resultText += `  Start: ${start.toFixed(2)}s\n`;
                    resultText += `  End:   ${end.toFixed(2)}s\n`;
                    resultText += `  Sim:   ${similarity.toFixed(2)}\n`;
                    resultText += `  RMS:   ${rms.toFixed(3)}\n\n`;
                });
                resultsDiv.textContent = resultText;
            }
            statusDiv.textContent = `Done. Found ${peaks.length} match(es).`;

        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            console.error(error);
        }
    }
});
