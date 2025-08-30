document.addEventListener('DOMContentLoaded', () => {
    const runButton = document.getElementById('run-button');
    const patternInput = document.getElementById('pattern-file');
    const searchInput = document.getElementById('search-file');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    let wasmApi = null;
    let wasmBuffers = null;
    let maxBufferSize = 0;

    statusDiv.textContent = 'Loading WASM FFT module...';
    createFFTModule().then(Module => {
        const wasm_fft = Module.cwrap('wasm_fft', null, ['number', 'number', 'number', 'number', 'number']);
        const wasm_ifft = Module.cwrap('wasm_ifft', null, ['number', 'number', 'number', 'number', 'number']);
        
        wasmApi = {
            Module,
            fft: wasm_fft,
            ifft: wasm_ifft,
            HEAPF32: new Float32Array(Module.memory.buffer),
            HEAPU8: new Uint8Array(Module.memory.buffer),
        };

        statusDiv.textContent = 'Ready. Select files and click "Find Matches".';
        runButton.disabled = false;
    }).catch(e => {
        statusDiv.textContent = 'Error loading WASM module.';
        console.error(e);
    });

    runButton.disabled = true;
    runButton.addEventListener('click', runMatch);

    function updateWasmMemoryViews() {
        if (wasmApi.HEAPF32.buffer !== wasmApi.Module.memory.buffer) {
            wasmApi.HEAPF32 = new Float32Array(wasmApi.Module.memory.buffer);
            wasmApi.HEAPU8 = new Uint8Array(wasmApi.Module.memory.buffer);
            if (wasmBuffers) {
                const BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
                wasmBuffers.views = wasmBuffers.pointers.map(p => 
                    new Float32Array(wasmApi.Module.memory.buffer, p, maxBufferSize / BYTES_PER_ELEMENT)
                );
            }
        }
    }

    function ensureWasmBuffers(requiredSize) {
        const BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
        const bufferSize = requiredSize * BYTES_PER_ELEMENT;
        
        if (!wasmBuffers || bufferSize > maxBufferSize) {
            if (wasmBuffers) {
                wasmBuffers.pointers.forEach(p => wasmApi.Module._free(p));
            }
            maxBufferSize = bufferSize;
            const pointers = Array.from({ length: 6 }, () => wasmApi.Module._malloc(bufferSize));
            updateWasmMemoryViews();
            const views = pointers.map(p => 
                new Float32Array(wasmApi.Module.memory.buffer, p, requiredSize)
            );
            wasmBuffers = { pointers, views };
        }
        return wasmBuffers;
    }

    async function loadAudio(file, targetSr) {
        const arrayBuffer = await file.arrayBuffer();
        const tempContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, targetSr);
        const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);
        return audioBuffer.getChannelData(0);
    }

    function findPeaks(x, height, distance) {
        const n = x.length;
        if (n === 0) return [];

        const peaks = [];
        if (n > 1 && x[0] > x[1] && x[0] >= height) peaks.push({ idx: 0, val: x[0] });
        
        for (let i = 1; i < n - 1; i++) {
            const xi = x[i];
            if (xi >= height && xi > x[i-1] && xi > x[i+1]) {
                peaks.push({ idx: i, val: xi });
            }
        }
        
        if (n > 1 && x[n-1] > x[n-2] && x[n-1] >= height) {
            peaks.push({ idx: n-1, val: x[n-1] });
        }
        
        if (!distance || peaks.length === 0) {
            return peaks.map(p => p.idx);
        }

        const dist = Math.floor(distance);
        if (dist < 1) return peaks.map(p => p.idx);

        peaks.sort((a, b) => b.val - a.val);
        const isSuppressed = new Uint8Array(n);
        const finalPeaks = [];

        for (const peak of peaks) {
            if (!isSuppressed[peak.idx]) {
                finalPeaks.push(peak.idx);
                const start = Math.max(0, peak.idx - dist);
                const end = Math.min(n, peak.idx + dist + 1);
                isSuppressed.fill(1, start, end);
            }
        }
        
        return finalPeaks.sort((a, b) => a - b);
    }

    function calculateNormalizedCrossCorrelation(search, pattern) {
        const n1 = search.length;
        const M = pattern.length;
        const n_fft = n1 + M - 1;

        let pattern_sum = 0, pattern_sum_sq = 0;
        for (let i = 0; i < M; i++) {
            pattern_sum += pattern[i];
            pattern_sum_sq += pattern[i] * pattern[i];
        }
        const pattern_mean = pattern_sum / M;
        const pattern_variance = (pattern_sum_sq / M) - (pattern_mean * pattern_mean);
        const sqrt_pattern_energy = Math.sqrt(pattern_variance * M);

        const pattern_centered_reversed = new Float32Array(M);
        for (let i = 0; i < M; i++) {
            pattern_centered_reversed[M - 1 - i] = pattern[i] - pattern_mean;
        }

        const buffers = ensureWasmBuffers(n_fft);
        const [ptr_s_r, ptr_s_i, ptr_p_r, ptr_p_i] = buffers.pointers;
        const views = buffers.views;
        
        views.forEach(view => view.fill(0));

        const s_r = views[0], p_r = views[2];
        
        for (let i = 0; i < n1; i++) {
            s_r[i] = search[i];
        }
        p_r.set(pattern_centered_reversed);

        updateWasmMemoryViews();
        wasmApi.fft(n_fft, ptr_s_r, ptr_s_i, ptr_s_r, ptr_s_i);
        wasmApi.fft(n_fft, ptr_p_r, ptr_p_i, ptr_p_r, ptr_p_i);
        updateWasmMemoryViews();

        const [s_r_view, s_i_view, p_r_view, p_i_view] = buffers.views;
        
        for (let i = 0; i < n_fft; i++) {
            const sr = s_r_view[i], si = s_i_view[i];
            const pr = p_r_view[i], pi = p_i_view[i];
            p_r_view[i] = sr * pr - si * pi;
            p_i_view[i] = sr * pi + si * pr;
        }

        wasmApi.ifft(n_fft, ptr_p_r, ptr_p_i, ptr_p_r, ptr_p_i);
        updateWasmMemoryViews();

        const conv = buffers.views[2];
        const ncc = new Float32Array(n1 - M + 1);
        
        let sum = 0, sum_sq = 0;
        for (let i = 0; i < M; i++) {
            sum += search[i];
            sum_sq += search[i] * search[i];
        }
        
        const M_inv = 1.0 / M;
        const epsilon = 1e-10;
        
        for (let i = 0; i <= n1 - M; i++) {
            if (i > 0) {
                sum += search[i + M - 1] - search[i - 1];
                sum_sq += search[i + M - 1] * search[i + M - 1] - search[i - 1] * search[i - 1];
            }
            
            const local_mean = sum * M_inv;
            const local_variance = Math.max(0, (sum_sq * M_inv) - (local_mean * local_mean));
            const denominator = Math.sqrt(local_variance * M) * sqrt_pattern_energy;
            
            ncc[i] = (denominator > epsilon) ? (conv[M - 1 + i] / denominator) : 0;
        }
        
        return ncc;
    }

    function normalizeSignal(signal) {
        let max_abs = 0;
        for (let i = 0; i < signal.length; i++) {
            max_abs = Math.max(max_abs, Math.abs(signal[i]));
        }
        if (max_abs > 1e-10) {
            const scale = 1.0 / max_abs;
            for (let i = 0; i < signal.length; i++) {
                signal[i] *= scale;
            }
        }
    }

    async function runMatch() {
        resultsDiv.textContent = '';
        const patternFile = patternInput.files[0];
        const searchFile = searchInput.files[0];

        if (!patternFile || !searchFile) {
            statusDiv.textContent = 'Error: Please select both files.';
            return;
        }

        try {
            const target_sr = 4000;
            statusDiv.textContent = 'Loading audio...';
            
            const [pattern, search] = await Promise.all([
                loadAudio(patternFile, target_sr),
                loadAudio(searchFile, target_sr)
            ]);

            if (pattern.length > search.length) {
                throw new Error("Pattern cannot be longer than search signal.");
            }
            
            normalizeSignal(pattern);
            normalizeSignal(search);
            
            statusDiv.textContent = 'Computing correlation...';
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const ncc = calculateNormalizedCrossCorrelation(search, pattern);
            const peaks = findPeaks(ncc, 0.7, 0.25 * pattern.length);
            
            if (peaks.length === 0) {
                resultsDiv.textContent = 'No matches found.';
            } else {
                let resultText = '';
                peaks.forEach((peak, i) => {
                    const start = peak / target_sr;
                    const end = (peak + pattern.length) / target_sr;
                    const similarity = ncc[peak];
                    
                    resultText += `Match ${i + 1}:\n`;
                    resultText += `  Start: ${start.toFixed(2)}s\n`;
                    resultText += `  End:   ${end.toFixed(2)}s\n`;
                    resultText += `  Sim:   ${similarity.toFixed(2)}\n\n`;
                });
                resultsDiv.textContent = resultText;
            }
            
            statusDiv.textContent = `Found ${peaks.length} match(es).`;

        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            console.error(error);
        }
    }
});