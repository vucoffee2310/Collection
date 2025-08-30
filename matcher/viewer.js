document.addEventListener('DOMContentLoaded', () => {
    const runButton = document.getElementById('run-button');
    const patternInput = document.getElementById('pattern-file');
    const searchInput = document.getElementById('search-file');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');
    const srSelect = document.getElementById('sample-rate');

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

        // ------- Performance helpers -------

        const offlineCtxCache = new Map();
        function getDecoderCtx(targetSr) {
            const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            if (!offlineCtxCache.has(targetSr)) {
                offlineCtxCache.set(targetSr, new Ctx(1, 1, targetSr));
            }
            return offlineCtxCache.get(targetSr);
        }

        function nextPow2(n) {
            let p = 1;
            while (p < n) p <<= 1;
            return p;
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

        // ------- Faster decoding/resampling -------

        function looksLikeWav(dv) {
            if (dv.byteLength < 12) return false;
            // 'RIFF' .... 'WAVE'
            return dv.getUint32(0, false) === 0x52494646 && dv.getUint32(8, false) === 0x57415645;
        }

        function parsePcmWavMono(ab) {
            // Returns {samples: Float32Array, sampleRate} or null if unsupported
            const dv = new DataView(ab);
            if (!looksLikeWav(dv)) return null;

            let offset = 12;
            let fmt = null;
            let data = null;

            while (offset + 8 <= dv.byteLength) {
                const id = dv.getUint32(offset, false);
                const size = dv.getUint32(offset + 4, true);
                const chunkStart = offset + 8;
                if (id === 0x666d7420) { // 'fmt '
                    const audioFormat = dv.getUint16(chunkStart + 0, true);
                    const numChannels = dv.getUint16(chunkStart + 2, true);
                    const sampleRate = dv.getUint32(chunkStart + 4, true);
                    const blockAlign = dv.getUint16(chunkStart + 12, true);
                    const bitsPerSample = dv.getUint16(chunkStart + 14, true);
                    fmt = { audioFormat, numChannels, sampleRate, blockAlign, bitsPerSample };
                } else if (id === 0x64617461) { // 'data'
                    data = { offset: chunkStart, size };
                }
                // Chunks are word-aligned
                offset = chunkStart + size + (size & 1);
            }

            if (!fmt || !data) return null;
            // Support PCM int16 (1) and float32 (3). Common, fast.
            if (fmt.audioFormat !== 1 && fmt.audioFormat !== 3) return null;
            if (fmt.numChannels < 1) return null;

            const bytesPerSample = fmt.bitsPerSample >>> 3;
            const frameCount = Math.floor(data.size / fmt.blockAlign);
            const out = new Float32Array(frameCount);

            const chStride = bytesPerSample;
            const frameStride = fmt.blockAlign;
            const chIndex = 0; // take first channel

            let readFn;
            if (fmt.audioFormat === 1) {
                // PCM int
                if (fmt.bitsPerSample === 16) {
                    readFn = (pos) => dv.getInt16(pos, true) / 32768;
                } else if (fmt.bitsPerSample === 24) {
                    // 24-bit PCM: sign-extend manually
                    readFn = (pos) => {
                        const b0 = dv.getUint8(pos);
                        const b1 = dv.getUint8(pos + 1);
                        const b2 = dv.getUint8(pos + 2);
                        let val = (b2 << 16) | (b1 << 8) | b0;
                        if (val & 0x800000) val |= ~0xFFFFFF; // sign extend
                        return val / 8388608; // 2^23
                    };
                } else if (fmt.bitsPerSample === 32) {
                    readFn = (pos) => dv.getInt32(pos, true) / 2147483648;
                } else {
                    return null; // unsupported PCM bit depth; fall back
                }
            } else if (fmt.audioFormat === 3) {
                if (fmt.bitsPerSample !== 32) return null;
                readFn = (pos) => dv.getFloat32(pos, true);
            }

            let p = data.offset;
            for (let i = 0; i < frameCount; i++) {
                const samplePos = p + chIndex * chStride;
                out[i] = readFn(samplePos);
                p += frameStride;
            }
            return { samples: out, sampleRate: fmt.sampleRate };
        }

        function lowpassSinglePole(x, srIn, cutoffHz) {
            if (x.length === 0) return x;
            const out = new Float32Array(x.length);
            const dt = 1 / srIn;
            const RC = 1 / (2 * Math.PI * cutoffHz);
            const alpha = dt / (RC + dt);
            let y = x[0];
            out[0] = y;
            for (let i = 1; i < x.length; i++) {
                y += alpha * (x[i] - y);
                out[i] = y;
            }
            return out;
        }

        function resampleLinear(x, srIn, srOut, lowpass = true) {
            if (x.length === 0 || srIn === srOut) return x.slice();
            const ratio = srOut / srIn;
            const outLen = Math.max(1, Math.floor(x.length * ratio));
            let src = x;
            if (lowpass && srOut < srIn) {
                // Keep most energy under ~0.45*Nyq of new rate to avoid aliasing.
                const cutoff = 0.45 * srOut;
                src = lowpassSinglePole(x, srIn, cutoff);
            }
            const out = new Float32Array(outLen);
            const step = srIn / srOut;
            let pos = 0;
            for (let i = 0; i < outLen; i++) {
                const i0 = pos | 0;
                const frac = pos - i0;
                const i1 = i0 + 1;
                const a = src[i0] || 0;
                const b = src[i1] || a;
                out[i] = a + frac * (b - a);
                pos += step;
            }
            return out;
        }

        async function decodeViaWebAudio(ab, targetSr) {
            const ctx = getDecoderCtx(targetSr);
            const audioBuffer = await ctx.decodeAudioData(ab.slice(0)); // slice to avoid detachment side-effects
            return audioBuffer.getChannelData(0).slice();
        }

        async function loadAudioFast(file, targetSr) {
            const ab = await file.arrayBuffer();
            // Fast path for PCM WAV
            const parsed = parsePcmWavMono(ab);
            if (parsed) {
                const resampled = resampleLinear(parsed.samples, parsed.sampleRate, targetSr, true);
                return resampled;
            }
            // Fallback for compressed formats (mp3, m4a, flac, etc.)
            return await decodeViaWebAudio(ab, targetSr);
        }

        // ------- Peak finding and NCC -------

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
            const Nfft = nextPow2(N); // pad to speed up FFT

            // Pattern stats
            let ps = 0, psq = 0;
            for (let i = 0; i < M; i++) { const v = pattern[i]; ps += v; psq += v * v; }
            const pMean = ps / M;
            const pVar = Math.max(0, psq / M - pMean * pMean);
            const pEnergy = Math.sqrt(pVar * M) || 0;

            // Reverse and center pattern
            const pRev = new Float32Array(Nfft);
            for (let i = 0; i < M; i++) pRev[M - 1 - i] = pattern[i] - pMean;

            const b = ensureBuffers(Nfft);
            // Zero only needed slice
            b.view.s_r.fill(0, 0, Nfft);
            b.view.s_i.fill(0, 0, Nfft);
            b.view.p_r.fill(0, 0, Nfft);
            b.view.p_i.fill(0, 0, Nfft);

            // Copy input
            b.view.s_r.set(search, 0);
            b.view.p_r.set(pRev, 0);

            // FFTs
            wasm.fft(Nfft, b.ptr.s_r, b.ptr.s_i, b.ptr.s_r, b.ptr.s_i);
            syncViews();
            wasm.fft(Nfft, b.ptr.p_r, b.ptr.p_i, b.ptr.p_r, b.ptr.p_i);
            syncViews();

            // Complex multiply: S * P
            const sr = b.view.s_r, si = b.view.s_i, pr = b.view.p_r, pi = b.view.p_i;
            for (let i = 0; i < Nfft; i++) {
                const a = sr[i], b1 = si[i], c = pr[i], d = pi[i];
                pr[i] = a * c - b1 * d;
                pi[i] = a * d + b1 * c;
            }

            // IFFT
            wasm.ifft(Nfft, b.ptr.p_r, b.ptr.p_i, b.ptr.p_r, b.ptr.p_i);
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
                const target_sr = parseInt(srSelect.value, 10) || 2000;
                statusDiv.textContent = `Loading and downsampling audio @ ${target_sr} Hz...`;
                const [pattern, search] = await Promise.all([
                    loadAudioFast(patternFile, target_sr),
                    loadAudioFast(searchFile, target_sr)
                ]);

                if (pattern.length > search.length) throw new Error('Pattern cannot be longer than search signal.');

                normalizeSignal(pattern);
                normalizeSignal(search);

                statusDiv.textContent = 'Computing correlation...';
                const ncc = calculateNCC(search, pattern);

                // Keep the spacing conservative at 25% of pattern length (in samples)
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