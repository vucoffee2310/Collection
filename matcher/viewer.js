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
        const fft = Module.cwrap('wasm_fft', null, ['number', 'number', 'number', 'number', 'number']);
        const ifft = Module.cwrap('wasm_ifft', null, ['number', 'number', 'number', 'number', 'number']);
        const wasm = { Module, fft, ifft };
        const BYTES_F32 = Float32Array.BYTES_PER_ELEMENT;
        
        let heapBuffer = null;
        let buf = null;
        // Key array to manage WASM memory buffers programmatically.
        const bufferKeys = ['s_r', 's_i', 'p_r', 'p_i'];

        function syncViews() {
            if (!buf) return;
            const b = Module.memory.buffer;
            if (b !== heapBuffer) {
                heapBuffer = b;
                const n = buf.capacity;
                // Update all buffer views in a loop.
                bufferKeys.forEach(key => {
                    buf.view[key] = new Float32Array(b, buf.ptr[key], n);
                });
            }
        }

        function ensureBuffers(n) {
            if (!buf || n > buf.capacity) {
                if (buf) {
                    // Free old buffers in a loop.
                    bufferKeys.forEach(key => Module._free(buf.ptr[key]));
                }
                const bytes = n * BYTES_F32;
                heapBuffer = Module.memory.buffer;

                // Allocate pointers and create views programmatically.
                const ptr = {};
                const view = {};
                bufferKeys.forEach(key => {
                    ptr[key] = Module._malloc(bytes);
                    view[key] = new Float32Array(heapBuffer, ptr[key], n);
                });

                buf = { capacity: n, ptr, view };
            } else {
                syncViews();
            }
            return buf;
        }
        
        // --- Utility functions (largely unchanged for performance/clarity) ---
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
        
        function parsePcmWavMono(ab) {
            const dv = new DataView(ab);
            if (dv.byteLength < 44) return null; // Min header size
            if (dv.getUint32(0, false) !== 0x52494646 || dv.getUint32(8, false) !== 0x57415645) return null; // 'RIFF'/'WAVE'
            
            let fmt = null, data = null;
            for (let offset = 12; offset + 8 <= dv.byteLength;) {
                const id = dv.getUint32(offset, false);
                const size = dv.getUint32(offset + 4, true);
                const chunkStart = offset + 8;
                if (id === 0x666d7420) { // 'fmt '
                    fmt = {
                        audioFormat: dv.getUint16(chunkStart, true),
                        numChannels: dv.getUint16(chunkStart + 2, true),
                        sampleRate: dv.getUint32(chunkStart + 4, true),
                        blockAlign: dv.getUint16(chunkStart + 12, true),
                        bitsPerSample: dv.getUint16(chunkStart + 14, true),
                    };
                } else if (id === 0x64617461) { // 'data'
                    data = { offset: chunkStart, size };
                }
                offset = chunkStart + size + (size & 1); // Respect chunk padding
            }
            
            if (!fmt || !data || (fmt.audioFormat !== 1 && fmt.audioFormat !== 3) || fmt.numChannels < 1) return null;

            const frameCount = Math.floor(data.size / fmt.blockAlign);
            const out = new Float32Array(frameCount);
            let readFn;

            if (fmt.audioFormat === 1) { // PCM
                switch (fmt.bitsPerSample) {
                    case 16: readFn = pos => dv.getInt16(pos, true) / 32768; break;
                    case 24: readFn = pos => ((dv.getUint8(pos+2)<<16)|(dv.getUint8(pos+1)<<8)|dv.getUint8(pos)) << 8 >> 8 / 8388608; break;
                    case 32: readFn = pos => dv.getInt32(pos, true) / 2147483648; break;
                    default: return null;
                }
            } else { // IEEE Float
                if (fmt.bitsPerSample !== 32) return null;
                readFn = pos => dv.getFloat32(pos, true);
            }

            for (let i = 0, p = data.offset; i < frameCount; i++, p += fmt.blockAlign) {
                out[i] = readFn(p); // Assuming mono, read first channel of frame
            }
            return { samples: out, sampleRate: fmt.sampleRate };
        }

        function lowpassSinglePole(x, srIn, cutoffHz) { /* Unchanged */
            if (x.length === 0) return x;
            const out = new Float32Array(x.length);
            const dt = 1 / srIn, RC = 1 / (2 * Math.PI * cutoffHz), alpha = dt / (RC + dt);
            let y = x[0];
            out[0] = y;
            for (let i = 1; i < x.length; i++) {
                y += alpha * (x[i] - y);
                out[i] = y;
            }
            return out;
        }

        function resampleLinear(x, srIn, srOut, lowpass = true) { /* Unchanged */
            if (x.length === 0 || srIn === srOut) return x.slice();
            const ratio = srOut / srIn;
            const outLen = Math.max(1, Math.floor(x.length * ratio));
            let src = (lowpass && srOut < srIn) ? lowpassSinglePole(x, srIn, 0.45 * srOut) : x;
            const out = new Float32Array(outLen);
            const step = srIn / srOut;
            for (let i = 0, pos = 0; i < outLen; i++, pos += step) {
                const i0 = pos | 0, i1 = i0 + 1;
                const a = src[i0] || 0, b = src[i1] || a;
                out[i] = a + (pos - i0) * (b - a);
            }
            return out;
        }
        
        async function loadAudio(file, targetSr) {
            const ab = await file.arrayBuffer();
            const parsed = parsePcmWavMono(ab);
            if (parsed) {
                return { 
                    samples: resampleLinear(parsed.samples, parsed.sampleRate, targetSr), 
                    inSampleRate: parsed.sampleRate 
                };
            }
            const ctx = getDecoderCtx(targetSr);
            const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
            return {
                samples: audioBuffer.getChannelData(0),
                inSampleRate: audioBuffer.sampleRate,
            };
        }
        
        function findPeaks(x, height, distance) { /* Unchanged */
            const n = x.length;
            if (!n) return [];
            const peaks = [];
            for (let i = 0; i < n; i++) {
                if (x[i] >= height) {
                    if ((i === 0 || x[i] > x[i - 1]) && (i === n - 1 || x[i] > x[i + 1])) {
                        peaks.push({ idx: i, val: x[i] });
                    }
                }
            }
            if (!distance || !peaks.length) return peaks.map(p => p.idx);
            peaks.sort((a, b) => b.val - a.val);
            const suppressed = new Uint8Array(n);
            const out = [];
            for (const p of peaks) {
                if (!suppressed[p.idx]) {
                    out.push(p.idx);
                    suppressed.fill(1, Math.max(0, p.idx - distance), Math.min(n, p.idx + distance + 1));
                }
            }
            return out.sort((a, b) => a - b);
        }

        function calculateNCC(search, pattern) { /* Unchanged - performance critical */
            const n1 = search.length, M = pattern.length, N = n1 + M - 1, Nfft = nextPow2(N);
            let ps = 0, psq = 0;
            for (let i = 0; i < M; i++) { const v = pattern[i]; ps += v; psq += v * v; }
            const pMean = ps / M, pVar = Math.max(0, psq / M - pMean * pMean), pEnergy = Math.sqrt(pVar * M) || 0;
            const b = ensureBuffers(Nfft);
            let sr = b.view.s_r, si = b.view.s_i, pr = b.view.p_r, pi = b.view.p_i;
            sr.set(search, 0); sr.fill(0, n1);
            for (let i = 0, j = M - 1; i < M; i++, j--) si[i] = pattern[j] - pMean;
            si.fill(0, M);
            wasm.fft(Nfft, b.ptr.s_r, b.ptr.s_i, b.ptr.s_r, b.ptr.s_i);
            syncViews();
            sr = b.view.s_r; si = b.view.s_i; pr = b.view.p_r; pi = b.view.p_i;
            const half = Nfft >>> 1;
            for (let k = 0; k <= half; k++) {
                const km = (k === 0) ? 0 : Nfft - k;
                const xr = sr[k], xi = si[k], yr = sr[km], yi = si[km];
                const Ar = 0.5 * (xr + yr), Ai = 0.5 * (xi - yi);
                const Br = 0.5 * (xi + yi), Bi = 0.5 * (yr - xr);
                const prk = Ar * Br - Ai * Bi, pik = Ar * Bi + Ai * Br;
                pr[k] = prk; pi[k] = pik;
                if (k !== 0 && k !== half) { pr[km] = prk; pi[km] = -pik; }
            }
            wasm.ifft(Nfft, b.ptr.p_r, b.ptr.p_i, b.ptr.p_r, b.ptr.p_i);
            syncViews();
            const conv = b.view.p_r;
            const ncc = new Float32Array(n1 - M + 1);
            let ss = 0, ssq = 0;
            for (let i = 0; i < M; i++) { const v = search[i]; ss += v; ssq += v * v; }
            const Minv = 1 / M, eps = 1e-10;
            for (let i = 0; i <= n1 - M; i++) {
                if (i > 0) {
                    const add = search[i + M - 1], rem = search[i - 1];
                    ss += add - rem;
                    ssq += add * add - rem * rem;
                }
                const mean = ss * Minv, v = Math.max(0, ssq * Minv - mean * mean);
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
            const target_sr = parseInt(srSelect.value, 10) || 2000;
            try {
                statusDiv.textContent = 'Loading and downsampling audio...';
                const [patPack, seaPack] = await Promise.all([
                    loadAudio(patternFile, target_sr),
                    loadAudio(searchFile, target_sr)
                ]);
                
                const { samples: pattern } = patPack;
                const { samples: search } = seaPack;
                if (pattern.length > search.length) {
                    throw new Error('Pattern cannot be longer than search signal.');
                }
                
                normalizeSignal(pattern);
                normalizeSignal(search);
                
                statusDiv.textContent = 'Computing correlation...';
                const ncc = calculateNCC(search, pattern);
                const peaks = findPeaks(ncc, 0.7, Math.floor(0.25 * pattern.length));
                
                if (peaks.length === 0) {
                    resultsDiv.textContent = 'No matches found.';
                } else {
                    // Use .map() for a functional and concise way to build the report string.
                    const report = peaks.map((p, i) => {
                        const start = (p / target_sr).toFixed(2);
                        const end = ((p + pattern.length) / target_sr).toFixed(2);
                        const sim = ncc[p].toFixed(2);
                        return `Match ${i + 1}: Start: ${start}s, End: ${end}s, Similarity: ${sim}`;
                    }).join('\n');
                    resultsDiv.textContent = report;
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
