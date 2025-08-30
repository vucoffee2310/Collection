document.addEventListener('DOMContentLoaded', () => {
    const runButton = document.getElementById('run-button');
    const patternInput = document.getElementById('pattern-file');
    const searchInput = document.getElementById('search-file');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    statusDiv.textContent = 'Loading WASM FFT module...';
    runButton.disabled = true;

    createFFTModule().then(Module => {
        // C-APIs
        const fft = Module.cwrap('wasm_fft', null, ['number', 'number', 'number', 'number', 'number']);
        const ifft = Module.cwrap('wasm_ifft', null, ['number', 'number', 'number', 'number', 'number']);

        const wasm = { Module, fft, ifft };
        const BYTES_F32 = Float32Array.BYTES_PER_ELEMENT;

        // Simple buffer manager: only 4 buffers, rewrap views on mem growth, zero only needed ranges.
        let heapBuffer = null;
        let buf = null; // { capacity, ptr:{s_r,s_i,p_r,p_i}, view:{s_r,s_i,p_r,p_i} }

        function syncViews() {
            if (!buf) return;
            const b = Module.memory.buffer;
            if (b !== heapBuffer) {
                heapBuffer = b;
                const n = buf.capacity;
                buf.view.s_r = new Float32Array(b, buf.ptr.s_r, n);
                buf.view.s_i = new Float32Array(b, buf.ptr.s_i, n);
                buf.view.p_r = new Float32Array(b, buf.ptr.p_r, n);
                buf.view.p_i = new Float32Array(b, buf.ptr.p_i, n);
            }
        }

        function ensureBuffers(n) {
            if (!buf || n > buf.capacity) {
                if (buf) {
                    Module._free(buf.ptr.s_r);
                    Module._free(buf.ptr.s_i);
                    Module._free(buf.ptr.p_r);
                    Module._free(buf.ptr.p_i);
                }
                const bytes = n * BYTES_F32;
                const ptr = {
                    s_r: Module._malloc(bytes),
                    s_i: Module._malloc(bytes),
                    p_r: Module._malloc(bytes),
                    p_i: Module._malloc(bytes),
                };
                heapBuffer = Module.memory.buffer;
                const view = {
                    s_r: new Float32Array(heapBuffer, ptr.s_r, n),
                    s_i: new Float32Array(heapBuffer, ptr.s_i, n),
                    p_r: new Float32Array(heapBuffer, ptr.p_r, n),
                    p_i: new Float32Array(heapBuffer, ptr.p_i, n),
                };
                buf = { capacity: n, ptr, view };
            } else {
                syncViews();
            }
            return buf;
        }

        async function loadAudio(file, targetSr) {
            const arrayBuffer = await file.arrayBuffer();
            const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            const ctx = new Ctx(1, 1, targetSr);
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            return audioBuffer.getChannelData(0);
        }

        function normalizeSignal(signal) {
            let maxAbs = 0;
            for (let i = 0; i < signal.length; i++) {
                const v = Math.abs(signal[i]);
                if (v > maxAbs) maxAbs = v;
            }
            if (maxAbs > 1e-10) {
                const s = 1 / maxAbs;
                for (let i = 0; i < signal.length; i++) signal[i] *= s;
            }
        }

        function findPeaks(x, height, distance) {
            const n = x.length;
            if (!n) return [];

            const peaks = [];
            if (n > 1 && x[0] > x[1] && x[0] >= height) peaks.push({ idx: 0, val: x[0] });
            for (let i = 1; i < n - 1; i++) {
                const v = x[i];
                if (v >= height && v > x[i - 1] && v > x[i + 1]) peaks.push({ idx: i, val: v });
            }
            if (n > 1 && x[n - 1] > x[n - 2] && x[n - 1] >= height) peaks.push({ idx: n - 1, val: x[n - 1] });

            if (!distance || peaks.length === 0) return peaks.map(p => p.idx);

            const dist = Math.max(1, Math.floor(distance));
            peaks.sort((a, b) => b.val - a.val);
            const suppressed = new Uint8Array(n);
            const out = [];

            for (const p of peaks) {
                if (!suppressed[p.idx]) {
                    out.push(p.idx);
                    const s = Math.max(0, p.idx - dist);
                    const e = Math.min(n, p.idx + dist + 1);
                    suppressed.fill(1, s, e);
                }
            }
            out.sort((a, b) => a - b);
            return out;
        }

        function calculateNCC(search, pattern) {
            const n1 = search.length;
            const M = pattern.length;
            const N = n1 + M - 1;

            // Pattern stats
            let ps = 0, psq = 0;
            for (let i = 0; i < M; i++) { const v = pattern[i]; ps += v; psq += v * v; }
            const pMean = ps / M;
            const pVar = Math.max(0, psq / M - pMean * pMean);
            const pEnergy = Math.sqrt(pVar * M) || 0;

            // Reverse and center pattern
            const pRev = new Float32Array(M);
            for (let i = 0; i < M; i++) pRev[M - 1 - i] = pattern[i] - pMean;

            const b = ensureBuffers(N);
            // Zero only needed slice
            b.view.s_r.fill(0, 0, N);
            b.view.s_i.fill(0, 0, N);
            b.view.p_r.fill(0, 0, N);
            b.view.p_i.fill(0, 0, N);

            // Copy input
            b.view.s_r.set(search, 0);
            b.view.p_r.set(pRev, 0);

            // FFTs
            wasm.fft(N, b.ptr.s_r, b.ptr.s_i, b.ptr.s_r, b.ptr.s_i);
            syncViews();
            wasm.fft(N, b.ptr.p_r, b.ptr.p_i, b.ptr.p_r, b.ptr.p_i);
            syncViews();

            // Complex multiply: S * P
            const sr = b.view.s_r, si = b.view.s_i, pr = b.view.p_r, pi = b.view.p_i;
            for (let i = 0; i < N; i++) {
                const a = sr[i], b1 = si[i], c = pr[i], d = pi[i];
                pr[i] = a * c - b1 * d;
                pi[i] = a * d + b1 * c;
            }

            // IFFT
            wasm.ifft(N, b.ptr.p_r, b.ptr.p_i, b.ptr.p_r, b.ptr.p_i);
            syncViews();

            const conv = b.view.p_r;
            const ncc = new Float32Array(n1 - M + 1);

            // Sliding window stats for search
            let ss = 0, ssq = 0;
            for (let i = 0; i < M; i++) { const v = search[i]; ss += v; ssq += v * v; }
            const Minv = 1 / M, eps = 1e-10;

            for (let i = 0; i <= n1 - M; i++) {
                if (i) {
                    const add = search[i + M - 1], rem = search[i - 1];
                    ss += add - rem;
                    ssq += add * add - rem * rem;
                }
                const mean = ss * Minv;
                const v = Math.max(0, ssq * Minv - mean * mean);
                const denom = Math.sqrt(v * M) * pEnergy;
                ncc[i] = denom > eps ? conv[M - 1 + i] / denom : 0;
            }
            return ncc;
        }

        statusDiv.textContent = 'Ready. Select files and click "Find Matches".';
        runButton.disabled = false;

        runButton.addEventListener('click', async () => {
            resultsDiv.textContent = '';
            const patternFile = patternInput.files[0];
            const searchFile = searchInput.files[0];

            if (!patternFile || !searchFile) {
                statusDiv.textContent = 'Error: Please select both files.';
                return;
            }

            try {
                const target_sr = 4000; // decode both to the same SR for correct timing
                statusDiv.textContent = 'Loading audio...';
                const [pattern, search] = await Promise.all([
                    loadAudio(patternFile, target_sr),
                    loadAudio(searchFile, target_sr)
                ]);

                if (pattern.length > search.length) throw new Error('Pattern cannot be longer than search signal.');

                normalizeSignal(pattern);
                normalizeSignal(search);

                statusDiv.textContent = 'Computing correlation...';
                const ncc = calculateNCC(search, pattern);
                const peaks = findPeaks(ncc, 0.7, Math.floor(0.25 * pattern.length));

                if (!peaks.length) {
                    resultsDiv.textContent = 'No matches found.';
                } else {
                    const lines = [];
                    for (let i = 0; i < peaks.length; i++) {
                        const p = peaks[i];
                        const start = p / target_sr;
                        const end = (p + pattern.length) / target_sr;
                        lines.push(`Match ${i + 1}:\n  Start: ${start.toFixed(2)}s\n  End:   ${end.toFixed(2)}s\n  Sim:   ${ncc[p].toFixed(2)}\n`);
                    }
                    resultsDiv.textContent = lines.join('\n');
                }
                statusDiv.textContent = `Found ${peaks.length} match(es).`;

            } catch (error) {
                statusDiv.textContent = `Error: ${error.message}`;
                console.error(error);
            }
        });
    }).catch(e => {
        statusDiv.textContent = 'Error loading WASM module.';
        console.error(e);
    });
});