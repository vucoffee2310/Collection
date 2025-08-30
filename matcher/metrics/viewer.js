document.addEventListener('DOMContentLoaded', () => {
    const runButton = document.getElementById('run-button');
    const patternInput = document.getElementById('pattern-file');
    const searchInput = document.getElementById('search-file');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');
    const metricsDiv = document.getElementById('metrics');
    const srSelect = document.getElementById('sample-rate');

    const fmtMs = (ms) => `${ms.toFixed(2)} ms`;
    const fmtSec = (s) => `${s.toFixed(3)} s`;
    const fmtHz = (hz) => `${hz} Hz`;
    const fmtBytes = (b) => {
        if (b < 1024) return `${b} B`;
        if (b < 1024*1024) return `${(b/1024).toFixed(1)} KiB`;
        return `${(b/(1024*1024)).toFixed(2)} MiB`;
    };

    const envInfo = {
        userAgent: navigator.userAgent,
        cores: (navigator.hardwareConcurrency || 'n/a'),
        jsHeapSupported: !!(performance && performance.memory),
    };

    function renderMetrics(perf) {
        const lines = [];

        // WASM
        if (perf.wasm) {
            lines.push('WASM');
            if ('loadMs' in perf.wasm) lines.push(`  load: ${fmtMs(perf.wasm.loadMs)}`);
            if ('heapBytes' in perf.wasm) lines.push(`  heap: ${fmtBytes(perf.wasm.heapBytes)} (${perf.wasm.heapBytes} B)`);
            if ('fftBufferCapacity' in perf.wasm) lines.push(`  fft buffer capacity: ${perf.wasm.fftBufferCapacity} floats`);
            lines.push('');
        }

        // Audio
        if (perf.audio) {
            lines.push('Audio');
            lines.push(`  target SR: ${fmtHz(perf.audio.targetSr)}`);
            lines.push(`  total load (both files): ${fmtMs(perf.audio.totalBothMs)}`);
            for (const key of ['pattern', 'search']) {
                const a = perf.audio[key];
                if (!a) continue;
                lines.push(`  ${key}`);
                lines.push(`    file: ${a.filename || '(n/a)'}`);
                lines.push(`    method: ${a.method}`);
                if (a.readMs != null) lines.push(`    read: ${fmtMs(a.readMs)}`);
                if (a.parseMs != null) lines.push(`    parse: ${fmtMs(a.parseMs)}`);
                if (a.decodeMs != null) lines.push(`    decode: ${fmtMs(a.decodeMs)}`);
                if (a.resampleMs != null) lines.push(`    resample: ${fmtMs(a.resampleMs)}`);
                if (a.normalizeMs != null) lines.push(`    normalize: ${fmtMs(a.normalizeMs)}`);
                lines.push(`    in SR: ${a.inSampleRate ? fmtHz(a.inSampleRate) : 'n/a'}   out SR: ${fmtHz(perf.audio.targetSr)}`);
                lines.push(`    length: ${a.lengthSamples} samples   duration: ${fmtSec(a.durationSec)}`);
                lines.push(`    total: ${fmtMs(a.totalMs)}`);
            }
            lines.push('');
        }

        // Compute
        if (perf.compute) {
            const c = perf.compute;
            lines.push('Compute (correlation)');
            if (c.Nfft) lines.push(`  Nfft: ${c.Nfft}`);
            if (c.prepareMs != null) lines.push(`  prepare (pad/zero/copy): ${fmtMs(c.prepareMs)}`);
            if (c.fftSearchMs != null) lines.push(`  FFT(search): ${fmtMs(c.fftSearchMs)}`);
            if (c.fftPatternMs != null) lines.push(`  FFT(pattern): ${fmtMs(c.fftPatternMs)}`);
            if (c.multiplyMs != null) lines.push(`  complex multiply: ${fmtMs(c.multiplyMs)}`);
            if (c.ifftMs != null) lines.push(`  IFFT: ${fmtMs(c.ifftMs)}`);
            if (c.slidingStatsMs != null) lines.push(`  sliding stats + NCC: ${fmtMs(c.slidingStatsMs)}`);
            if (c.totalMs != null) lines.push(`  compute total: ${fmtMs(c.totalMs)}`);
            lines.push('');
        }

        // Peaks
        if (perf.peaks) {
            const p = perf.peaks;
            lines.push('Peaks');
            lines.push(`  threshold: ${p.threshold}`);
            lines.push(`  min distance: ${p.minDistance} samples (${fmtSec(p.minDistance / (perf.audio?.targetSr || 1))})`);
            lines.push(`  count: ${p.count}`);
            lines.push(`  findPeaks: ${fmtMs(p.ms)}`);
            lines.push('');
        }

        // Totals and environment
        if (perf.totals) {
            lines.push('Totals');
            lines.push(`  end-to-end: ${fmtMs(perf.totals.endToEndMs)}`);
            if (perf.jsHeap) lines.push(`  JS heap used: ${fmtBytes(perf.jsHeap.used)} of ${fmtBytes(perf.jsHeap.total)} (${fmtBytes(perf.jsHeap.limit)} limit)`);
            lines.push('');
        }

        lines.push('Environment');
        lines.push(`  cores: ${envInfo.cores}`);
        lines.push(`  userAgent: ${envInfo.userAgent}`);

        metricsDiv.textContent = lines.join('\n');
    }

    statusDiv.textContent = 'Loading WASM FFT module...';
    runButton.disabled = true;

    const wasmStart = performance.now();
    createFFTModule().then(Module => {
        // C-APIs
        const fft = Module.cwrap('wasm_fft', null, ['number', 'number', 'number', 'number', 'number']);
        const ifft = Module.cwrap('wasm_ifft', null, ['number', 'number', 'number', 'number', 'number']);

        const wasm = { Module, fft, ifft };
        const BYTES_F32 = Float32Array.BYTES_PER_ELEMENT;

        // Track WASM load
        const perf = {
            wasm: {
                loadMs: performance.now() - wasmStart,
                heapBytes: Module.HEAP8?.buffer?.byteLength || 0
            }
        };
        renderMetrics(perf);

        // Simple buffer manager
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
                perf.wasm.heapBytes = Module.HEAP8?.buffer?.byteLength || perf.wasm.heapBytes;
                perf.wasm.fftBufferCapacity = n;
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
            return dv.getUint32(0, false) === 0x52494646 && dv.getUint32(8, false) === 0x57415645; // 'RIFF' ... 'WAVE'
        }

        function parsePcmWavMono(ab) {
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
                offset = chunkStart + size + (size & 1);
            }

            if (!fmt || !data) return null;
            if (fmt.audioFormat !== 1 && fmt.audioFormat !== 3) return null; // PCM or IEEE float
            if (fmt.numChannels < 1) return null;

            const dv2 = new DataView(ab);
            const bytesPerSample = fmt.bitsPerSample >>> 3;
            const frameCount = Math.floor(data.size / fmt.blockAlign);
            const out = new Float32Array(frameCount);

            const chStride = bytesPerSample;
            const frameStride = fmt.blockAlign;
            const chIndex = 0;

            let readFn;
            if (fmt.audioFormat === 1) {
                if (fmt.bitsPerSample === 16) {
                    readFn = (pos) => dv2.getInt16(pos, true) / 32768;
                } else if (fmt.bitsPerSample === 24) {
                    readFn = (pos) => {
                        const b0 = dv2.getUint8(pos);
                        const b1 = dv2.getUint8(pos + 1);
                        const b2 = dv2.getUint8(pos + 2);
                        let val = (b2 << 16) | (b1 << 8) | b0;
                        if (val & 0x800000) val |= ~0xFFFFFF;
                        return val / 8388608;
                    };
                } else if (fmt.bitsPerSample === 32) {
                    readFn = (pos) => dv2.getInt32(pos, true) / 2147483648;
                } else {
                    return null;
                }
            } else if (fmt.audioFormat === 3) {
                if (fmt.bitsPerSample !== 32) return null;
                readFn = (pos) => dv2.getFloat32(pos, true);
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
            const t0 = performance.now();
            const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
            const decodeMs = performance.now() - t0;
            // Zero-copy view of channel data
            const ch0 = audioBuffer.getChannelData(0);
            return { samples: ch0, decodeMs, inSr: audioBuffer.sampleRate };
        }

        async function loadAudioFastWithMetrics(file, targetSr) {
            const start = performance.now();
            const name = file.name || '';
            const tRead0 = performance.now();
            const ab = await file.arrayBuffer();
            const readMs = performance.now() - tRead0;

            const tParse0 = performance.now();
            const parsed = parsePcmWavMono(ab);
            const parseMs = performance.now() - tParse0;

            let method = 'wav-fast';
            let inSampleRate = null;
            let resampleMs = 0;
            let decodeMs = 0;
            let out;

            if (parsed) {
                inSampleRate = parsed.sampleRate;
                const tRes0 = performance.now();
                out = resampleLinear(parsed.samples, parsed.sampleRate, targetSr, true);
                resampleMs = performance.now() - tRes0;
            } else {
                method = 'webaudio';
                const dec = await decodeViaWebAudio(ab, targetSr);
                out = dec.samples; // zero-copy
                decodeMs = dec.decodeMs;
                inSampleRate = dec.inSr;
            }

            const totalMs = performance.now() - start;
            return {
                samples: out,
                meta: {
                    filename: name,
                    method,
                    readMs,
                    parseMs: parsed ? parseMs : null,
                    decodeMs: parsed ? null : decodeMs,
                    resampleMs: parsed ? resampleMs : null,
                    inSampleRate,
                    lengthSamples: out.length,
                    durationSec: out.length / targetSr,
                    totalMs
                }
            };
        }

        // ------- Peak finding and NCC with metrics -------
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

        // Single-FFT NCC via dual-real packing
        function calculateNCCWithMetrics(search, pattern) {
            const tStart = performance.now();
            const n1 = search.length;
            const M = pattern.length;
            const N = n1 + M - 1;
            const Nfft = nextPow2(N);

            // Pattern stats (mean/energy)
            let t0 = performance.now();
            let ps = 0, psq = 0;
            for (let i = 0; i < M; i++) { const v = pattern[i]; ps += v; psq += v * v; }
            const pMean = ps / M;
            const pVar = Math.max(0, psq / M - pMean * pMean);
            const pEnergy = Math.sqrt(pVar * M) || 0; // L2 norm of zero-mean pattern
            const patternStatsMs = performance.now() - t0;

            // Buffers + prepare (minimal zeroing)
            t0 = performance.now();
            const b = ensureBuffers(Nfft);
            let sr = b.view.s_r, si = b.view.s_i, pr = b.view.p_r, pi = b.view.p_i;

            // Real part: search
            sr.set(search, 0);
            if (n1 < Nfft) sr.fill(0, n1); // zero tail only

            // Imag part: reversed, zero-mean pattern
            for (let i = 0, j = M - 1; i < M; i++, j--) si[i] = pattern[j] - pMean;
            if (M < Nfft) si.fill(0, M);   // zero tail only
            // pr/pi will be fully overwritten; no need to clear
            const prepareMs = performance.now() - t0;

            // Single FFT for both real signals packed in real/imag
            t0 = performance.now();
            wasm.fft(Nfft, b.ptr.s_r, b.ptr.s_i, b.ptr.s_r, b.ptr.s_i);
            syncViews(); // memory could have grown; refresh views
            sr = b.view.s_r; si = b.view.s_i; pr = b.view.p_r; pi = b.view.p_i;
            const fftPairMs = performance.now() - t0;

            // Recover spectra and compute product in one pass, enforce Hermitian symmetry
            t0 = performance.now();
            const half = Nfft >>> 1;
            for (let k = 0; k <= half; k++) {
                const km = (k === 0) ? 0 : Nfft - k;

                const xr = sr[k], xi = si[k];
                const yr = sr[km], yi = si[km]; // C[N-k]

                // X_k = 0.5*(C[k] + conj(C[N-k]))
                const Ar = 0.5 * (xr + yr);
                const Ai = 0.5 * (xi - yi);

                // Y_k = (C[k] - conj(C[N-k])) / (2i)
                const Br = 0.5 * (xi + yi);
                const Bi = 0.5 * (yr - xr);

                // Product: X_k * Y_k
                const prk = Ar * Br - Ai * Bi;
                const pik = Ar * Bi + Ai * Br;

                pr[k] = prk;  pi[k] = pik;
                if (k !== 0 && k !== half) {
                    pr[km] = prk;  pi[km] = -pik;
                }
            }
            const multiplyMs = performance.now() - t0;

            // IFFT
            t0 = performance.now();
            wasm.ifft(Nfft, b.ptr.p_r, b.ptr.p_i, b.ptr.p_r, b.ptr.p_i);
            syncViews();
            const ifftMs = performance.now() - t0;

            // NCC (sliding stats) over valid region
            t0 = performance.now();
            const conv = b.view.p_r;
            const ncc = new Float32Array(n1 - M + 1);
            let ss = 0, ssq = 0;
            for (let i = 0; i < M; i++) { const v = search[i]; ss += v; ssq += v * v; }
            const Minv = 1 / M, eps = 1e-10, off = M - 1;
            for (let i = 0; i <= n1 - M; i++) {
                if (i) {
                    const add = search[i + M - 1], rem = search[i - 1];
                    ss += add - rem;
                    ssq += add * add - rem * rem;
                }
                const mean = ss * Minv;
                const v = Math.max(0, ssq * Minv - mean * mean);
                const denom = Math.sqrt(v * M) * pEnergy;
                ncc[i] = denom > eps ? conv[off + i] / denom : 0;
            }
            const slidingStatsMs = performance.now() - t0;

            const totalMs = performance.now() - tStart;
            return {
                ncc,
                metrics: {
                    Nfft,
                    patternStatsMs,
                    prepareMs,
                    fftPairMs,
                    multiplyMs,
                    ifftMs,
                    slidingStatsMs,
                    totalMs
                }
            };
        }

        statusDiv.textContent = 'Ready. Select files and click "Find Matches".';
        runButton.disabled = false;

        runButton.addEventListener('click', async () => {
            resultsDiv.textContent = '';
            metricsDiv.textContent = '';
            const patternFile = patternInput.files[0];
            const searchFile = searchInput.files[0];

            if (!patternFile || !searchFile) {
                statusDiv.textContent = 'Error: Please select both files.';
                return;
            }

            const runStart = performance.now();
            const target_sr = parseInt(srSelect.value, 10) || 2000;

            try {
                statusDiv.textContent = `Loading and downsampling audio @ ${target_sr} Hz...`;

                // Load both in parallel and time the combined span
                const audioBothStart = performance.now();
                const [patPack, seaPack] = await Promise.all([
                    loadAudioFastWithMetrics(patternFile, target_sr),
                    loadAudioFastWithMetrics(searchFile, target_sr)
                ]);
                const audioBothMs = performance.now() - audioBothStart;

                const pattern = patPack.samples;
                const search = seaPack.samples;

                if (pattern.length > search.length) throw new Error('Pattern cannot be longer than search signal.');

                // Normalize (timed)
                const tNormP = performance.now();
                normalizeSignal(pattern);
                const normPMs = performance.now() - tNormP;

                const tNormS = performance.now();
                normalizeSignal(search);
                const normSMs = performance.now() - tNormS;

                statusDiv.textContent = 'Computing correlation...';

                // Correlation with detailed metrics (single FFT)
                const { ncc, metrics: comp } = calculateNCCWithMetrics(search, pattern);

                // Peak finding (timed)
                const threshold = 0.7;
                const minDist = Math.floor(0.25 * pattern.length);
                const tPk = performance.now();
                const peaks = findPeaks(ncc, threshold, minDist);
                const peaksMs = performance.now() - tPk;

                // Render results
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

                // Build metrics object and render
                const endToEndMs = performance.now() - runStart;

                // Update WASM memory stats post-run
                perf.wasm.heapBytes = Module.HEAP8?.buffer?.byteLength || perf.wasm.heapBytes;
                perf.wasm.fftBufferCapacity = buf?.capacity || perf.wasm.fftBufferCapacity;

                // Audio metrics
                perf.audio = {
                    targetSr: target_sr,
                    totalBothMs: audioBothMs,
                    pattern: {
                        ...patPack.meta,
                        normalizeMs: normPMs
                    },
                    search: {
                        ...seaPack.meta,
                        normalizeMs: normSMs
                    }
                };

                // Compute metrics (map single FFT to 'FFT(search)', leave pattern FFT as 0)
                perf.compute = {
                    Nfft: comp.Nfft,
                    prepareMs: comp.prepareMs,
                    fftSearchMs: comp.fftPairMs,
                    fftPatternMs: 0,
                    multiplyMs: comp.multiplyMs,
                    ifftMs: comp.ifftMs,
                    slidingStatsMs: comp.slidingStatsMs,
                    totalMs: comp.totalMs
                };

                // Peak metrics
                perf.peaks = {
                    threshold,
                    minDistance: minDist,
                    count: peaks.length,
                    ms: peaksMs
                };

                // Totals + JS heap
                perf.totals = { endToEndMs };
                if (envInfo.jsHeapSupported) {
                    const m = performance.memory;
                    perf.jsHeap = { used: m.usedJSHeapSize, total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit };
                }

                renderMetrics(perf);

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