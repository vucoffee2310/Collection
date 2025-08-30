// pocketfft.js - Translation of _pocketfft.py.txt, with WASM integration

// --- 1. Basic Classes for Complex Numbers and NdArrays (NumPy-like) ---

/** Represents a complex number (real + imag*j). */
class Complex {
    constructor(re, im = 0) {
        this.re = re;
        this.im = im;
    }

    /** Returns the real part. */
    get real() { return this.re; }
    /** Returns the imaginary part. */
    get imag() { return this.im; }

    /** Returns a string representation, e.g., "1+2j". */
    toString() {
        return `${this.re}${this.im >= 0 ? '+' : ''}${this.im}j`;
    }
    // Add other complex operations (add, sub, mul, div, conjugate) if needed by other parts of the system
    // The current FFT functions will work directly with interleaved typed arrays.
}

/**
 * Minimal NdArray class mimicking NumPy's array structure for real numbers.
 * Data is stored in a flat TypedArray.
 */
class NdArray {
    /**
     * @param {Array|TypedArray|number|null} data Initial data or value to fill. If null, initializes with zeros.
     * @param {number[]} shape Shape of the array.
     * @param {Float32ArrayConstructor|Float64ArrayConstructor} dtype Underlying TypedArray type.
     */
    constructor(data, shape, dtype = Float64Array) {
        if (!Array.isArray(shape) || shape.some(d => !Number.isInteger(d) || d < 0)) {
            throw new Error('Shape must be an array of non-negative integers.');
        }

        const size = shape.reduce((acc, dim) => acc * dim, 1);
        this.shape = shape;
        this.ndim = shape.length;
        this.dtype = dtype;
        this.size = size;

        this.data = new dtype(size);
        if (data instanceof dtype && data.length === size) {
            this.data.set(data);
        } else if (Array.isArray(data) || data instanceof Float32Array || data instanceof Float64Array) {
            this.data.set(data.slice(0, Math.min(size, data.length)));
            // Remaining elements are zeros by TypedArray default
        } else if (typeof data === 'number') {
            this.data.fill(data);
        }

        this.strides = new Array(this.ndim);
        let stride = dtype.BYTES_PER_ELEMENT; // Stride in bytes
        for (let i = this.ndim - 1; i >= 0; i--) {
            this.strides[i] = stride;
            stride *= this.shape[i];
        }
    }

    /**
     * Creates an empty NdArray with a given shape and dtype, similar to numpy.empty_like.
     * @param {NdArray} a Reference array.
     * @param {number[]} [newShape=null] New shape. Defaults to `a.shape`.
     * @param {Float32ArrayConstructor|Float64ArrayConstructor} [newDtype=null] New dtype. Defaults to `a.dtype`.
     * @returns {NdArray}
     */
    static empty_like(a, newShape = null, newDtype = null) {
        const finalShape = newShape || a.shape;
        const finalDtype = newDtype || a.dtype;
        return new NdArray(null, finalShape, finalDtype);
    }
}

/**
 * Minimal NdArray class mimicking NumPy's array structure for complex numbers.
 * Complex data is stored in an interleaved flat TypedArray: [re1, im1, re2, im2, ...].
 */
class NdComplexArray {
    /**
     * @param {Array<Complex>|TypedArray|null} complexData Initial complex data (array of Complex objects or interleaved TypedArray).
     * @param {number[]} shape Shape of the array.
     * @param {Float32ArrayConstructor|Float64ArrayConstructor} dtype Underlying TypedArray type for real/imag parts.
     */
    constructor(complexData, shape, dtype = Float64Array) {
        if (!Array.isArray(shape) || shape.some(d => !Number.isInteger(d) || d < 0)) {
            throw new Error('Shape must be an array of non-negative integers.');
        }

        const size = shape.reduce((acc, dim) => acc * dim, 1);
        this.shape = shape;
        this.ndim = shape.length;
        this.dtype = dtype; // The underlying float type (Float32Array or Float64Array)
        this.size = size;   // Number of complex elements

        this.interleavedData = new dtype(size * 2); // [re1, im1, re2, im2, ...]

        if (complexData) {
            if (complexData instanceof dtype && complexData.length === size * 2) {
                // Assume `complexData` is already an interleaved TypedArray
                this.interleavedData.set(complexData);
            } else if (Array.isArray(complexData)) {
                // Assume `complexData` is an array of {re, im} objects or Complex instances
                for (let i = 0; i < Math.min(size, complexData.length); i++) {
                    const val = complexData[i];
                    this.interleavedData[2 * i] = val.re || val.real || 0;
                    this.interleavedData[2 * i + 1] = val.im || val.imag || 0;
                }
                // Elements beyond min(size, complexData.length) are zeros by default
            } else {
                 throw new Error('Invalid complexData input: must be Array of Complex or interleaved TypedArray.');
            }
        }

        // Calculate strides in bytes for row-major order of complex elements
        this.strides = new Array(this.ndim);
        let stride = 2 * dtype.BYTES_PER_ELEMENT; // Stride for a single complex element (2 floats/doubles)
        for (let i = this.ndim - 1; i >= 0; i--) {
            this.strides[i] = stride;
            stride *= this.shape[i];
        }
    }

    /**
     * Creates an empty NdComplexArray with a given shape and dtype, similar to numpy.empty_like.
     * @param {NdComplexArray} a Reference array.
     * @param {number[]} [newShape=null] New shape. Defaults to `a.shape`.
     * @param {Float32ArrayConstructor|Float64ArrayConstructor} [newDtype=null] New dtype. Defaults to `a.dtype`.
     * @returns {NdComplexArray}
     */
    static empty_like(a, newShape = null, newDtype = null) {
        const finalShape = newShape || a.shape;
        const finalDtype = newDtype || a.dtype;
        return new NdComplexArray(null, finalShape, finalDtype);
    }

    /**
     * Get a Complex object at a specific complex index.
     * @param {number} complexIndex The 0-based index of the complex number.
     * @returns {Complex}
     */
    get(complexIndex) {
        const idx = complexIndex * 2;
        return new Complex(this.interleavedData[idx], this.interleavedData[idx + 1]);
    }

    /**
     * Set a Complex object at a specific complex index.
     * @param {number} complexIndex The 0-based index of the complex number.
     * @param {Complex} complexVal The complex value to set.
     */
    set(complexIndex, complexVal) {
        const idx = complexIndex * 2;
        this.interleavedData[idx] = complexVal.re;
        this.interleavedData[idx + 1] = complexVal.im;
    }

    /** Returns an NdArray containing only the real parts. */
    get real() {
        const realParts = new this.dtype(this.size);
        for(let i = 0; i < this.size; ++i) {
            realParts[i] = this.interleavedData[2 * i];
        }
        return new NdArray(realParts, this.shape, this.dtype);
    }
}

// Custom Error class for value-related errors
class ValueError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValueError";
    }
}

// --- 2. NumPy-like Utility Functions ---

/**
 * Converts input to an NdArray or NdComplexArray.
 * @param {any} input Input value.
 * @param {Float32ArrayConstructor|Float64ArrayConstructor} [dtype=null] Desired dtype.
 * @returns {NdArray|NdComplexArray}
 */
function asarray(input, dtype = null) {
    if (input instanceof NdComplexArray || input instanceof NdArray) {
        // If dtype is specified and different, create a new array with new dtype
        if (dtype && input.dtype !== dtype) {
            if (input instanceof NdComplexArray) {
                const newInterleaved = new dtype(input.interleavedData.length);
                newInterleaved.set(input.interleavedData);
                return new NdComplexArray(newInterleaved, input.shape, dtype);
            } else { // NdArray
                const newData = new dtype(input.data.length);
                newData.set(input.data);
                return new NdArray(newData, input.shape, dtype);
            }
        }
        return input; // No dtype change needed
    }

    // Handle plain JS arrays
    if (Array.isArray(input)) {
        if (input.length === 0) {
            return new NdArray([], [0], dtype || Float64Array);
        }
        const inferredDtype = dtype || result_type(...input); // Try to infer dtype from array contents
        const firstElement = input[0];
        if (typeof firstElement === 'number') {
            return new NdArray(input, [input.length], inferredDtype);
        } else if (typeof firstElement === 'object' && ('re' in firstElement || 'real' in firstElement)) {
            const complexData = input.map(val => new Complex(val.re || val.real || 0, val.im || val.imag || 0));
            return new NdComplexArray(complexData, [input.length], inferredDtype);
        }
    }

    // Default to a single-element NdArray
    return new NdArray([input], [1], dtype || Float64Array);
}

/**
 * Returns a new array with the same shape and type as a given array, filled with zeros.
 * @param {NdArray|NdComplexArray} a The array to base the new array's properties on.
 * @param {number[]} [shape=null] Overrides the shape of the new array.
 * @param {Float32ArrayConstructor|Float64ArrayConstructor} [dtype=null] Overrides the dtype of the new array.
 * @returns {NdArray|NdComplexArray}
 */
function empty_like(a, shape = null, dtype = null) {
    if (a instanceof NdComplexArray) {
        return NdComplexArray.empty_like(a, shape, dtype);
    }
    return NdArray.empty_like(a, shape, dtype);
}

/**
 * Returns the data type that results from applying simplified NumPy type promotion rules.
 * This determines the underlying Float32Array or Float64Array constructor for the
 * real/imaginary parts of the computed arrays.
 *
 * It promotes to Float64Array if any of the arguments are:
 * - A JavaScript `number` (which are inherently 64-bit floats).
 * - The `Float64Array` constructor itself.
 * - An `NdArray` or `NdComplexArray` instance that uses `Float64Array`.
 * Otherwise, it defaults to `Float32Array`.
 *
 * @param {...(number|Float32ArrayConstructor|Float64ArrayConstructor|NdArray|NdComplexArray)} args
 *        Arguments whose types are to be considered for promotion.
 * @returns {Float32ArrayConstructor|Float64ArrayConstructor} The resulting underlying float TypedArray constructor.
 */
function result_type(...args) {
    let promoteToFloat64 = false;

    for (const arg of args) {
        if (typeof arg === 'number') {
            // All JavaScript numbers are double-precision (Float64).
            // So, if any number is involved, promote to Float64Array.
            promoteToFloat64 = true;
            break;
        } else if (arg === Float64Array) {
            // Explicitly requesting Float64Array.
            promoteToFloat64 = true;
            break;
        } else if (arg instanceof NdArray || arg instanceof NdComplexArray) {
            // Check the underlying dtype of custom array instances.
            if (arg.dtype === Float64Array) {
                promoteToFloat64 = true;
                break;
            }
        }
        // If arg is Float32Array, it doesn't force promotion to Float64, so continue.
        // Other types (like raw `Complex` objects if passed, though not expected by current calls)
        // are implicitly handled by not triggering `promoteToFloat64`.
    }

    return promoteToFloat64 ? Float64Array : Float32Array;
}


/**
 * Computes the reciprocal (1/x) element-wise.
 * @param {number|NdArray} val The input value or NdArray.
 * @param {Float32ArrayConstructor|Float64ArrayConstructor} [dtype=Float64Array] The dtype for the output NdArray.
 * @returns {number|NdArray} The reciprocal.
 */
function reciprocal(val, dtype = Float64Array) {
    if (val instanceof NdArray) {
        const result = new NdArray(null, val.shape, dtype);
        for (let i = 0; i < val.size; i++) {
            if (val.data[i] === 0) {
                // Handle division by zero similar to NumPy (might yield Infinity)
                result.data[i] = 1.0 / val.data[i]; // +Infinity or -Infinity
            } else {
                result.data[i] = 1.0 / val.data[i];
            }
        }
        return result;
    }
    if (val === 0) {
        return 1.0 / val; // +Infinity or -Infinity
    }
    return 1.0 / val;
}

/**
 * Computes the positive square-root element-wise.
 * @param {number|NdArray} val The input value or NdArray.
 * @param {Float32ArrayConstructor|Float64ArrayConstructor} [dtype=Float64Array] The dtype for the output NdArray.
 * @returns {number|NdArray} The square root.
 */
function sqrt(val, dtype = Float64Array) {
    if (val instanceof NdArray) {
        const result = new NdArray(null, val.shape, dtype);
        for (let i = 0; i < val.size; i++) {
            result.data[i] = Math.sqrt(val.data[i]);
        }
        return result;
    }
    return Math.sqrt(val);
}

/**
 * Normalizes an axis index to be positive and within bounds.
 * @param {number} axis The axis index, can be negative.
 * @param {number} ndim The number of dimensions of the array.
 * @returns {number} The normalized axis index.
 */
function normalize_axis_index(axis, ndim) {
    if (ndim === 0) { // Scalar case
        if (axis !== 0 && axis !== -1) {
            throw new Error(`Axis ${axis} is out of bounds for a 0-dimensional array.`);
        }
        return 0; // The only logical axis
    }
    if (axis < -ndim || axis >= ndim) {
        throw new Error(`Axis ${axis} is out of bounds for an array with ${ndim} dimensions.`);
    }
    return (axis < 0) ? axis + ndim : axis;
}

// --- 3. WASM Module Loading and Interfacing ---

let PocketFFTWasmInstance = null; // The Emscripten WASM module instance
let c2cDouble = null;             // Wrapped `pocketfft_c2c_double` function
let c2cFloat = null;              // Wrapped `pocketfft_c2c_float` function

// Module-level references to Emscripten HEAP views
let HEAPF32 = null;
let HEAPF64 = null;
let HEAPU8 = null; // For byte-level data transfer

/** Loads the WebAssembly module. This must be awaited before calling FFT functions. */
async function loadWasmModule() {
    // Dynamically import the WASM module generated by emcc
    // Assumes `pocketfft_wasm.js` is in the same directory as `pocketfft.js`
    const PocketFFTModuleFactory = await import('./pocketfft_wasm.js');

    // The default export is a factory that returns a promise.
    // We must await this promise to get the fully initialized module instance.
    PocketFFTWasmInstance = await PocketFFTModuleFactory.default();

    // Now, get all the necessary functions and HEAP views from the instance
    c2cDouble = PocketFFTWasmInstance.cwrap('pocketfft_c2c_double', null, [
        'number', // data_in_interleaved_ptr (double*)
        'number', // data_out_interleaved_ptr (double*)
        'number', // ndim (size_t)
        'number', // shape_ptr (const size_t*)
        'number', // stride_in_ptr (const ptrdiff_t*)
        'number', // stride_out_ptr (const ptrdiff_t*)
        'number', // n_axes (size_t)
        'number', // axes_ptr (const size_t*)
        'boolean',// forward (bool)
        'number'  // fct (double)
    ]);
    c2cFloat = PocketFFTWasmInstance.cwrap('pocketfft_c2c_float', null, [
        'number', // data_in_interleaved_ptr (float*)
        'number', // data_out_interleaved_ptr (float*)
        'number', // ndim (size_t)
        'number', // shape_ptr (const size_t*)
        'number', // stride_in_ptr (const ptrdiff_t*)
        'number', // stride_out_ptr (const ptrdiff_t*)
        'number', // n_axes (size_t)
        'number', // axes_ptr (const size_t*)
        'boolean',// forward (bool)
        'number'  // fct (float)
    ]);

    // Also make the HEAP views available directly for cleaner access
    HEAPF32 = PocketFFTWasmInstance.HEAPF32;
    HEAPF64 = PocketFFTWasmInstance.HEAPF64;
    HEAPU8 = PocketFFTWasmInstance.HEAPU8;

    // --- DIAGNOSTIC LOG ---
    console.log("HEAP variables assigned:", { HEAPU8, HEAPF32, HEAPF64 });

    console.log("PocketFFT WASM module loaded.");
}

// Ensure WASM is loaded before attempting any FFT operations.
// This Promise should be awaited by any function that uses the WASM module.
const wasmLoadedPromise = loadWasmModule();

// --- 4. Core FFT Logic (Translated from _pocketfft.py.txt) ---

const _SWAP_DIRECTION_MAP = {
    "backward": "forward",
    null: "forward", // NumPy's default if norm is not specified
    "ortho": "ortho",
    "forward": "backward"
};

function _swap_direction(norm) {
    if (!_SWAP_DIRECTION_MAP.hasOwnProperty(norm)) {
        throw new ValueError(`Invalid norm value ${norm}; should be "backward", "ortho" or "forward".`);
    }
    return _SWAP_DIRECTION_MAP[norm];
}

/**
 * Internal raw FFT function, handling data marshalling to/from WASM.
 * @param {NdComplexArray} a Input complex array.
 * @param {number} n Length of the transformed axis in the output.
 * @param {number} axis Axis over which to compute the FFT.
 * @param {boolean} is_forward True for forward FFT, false for inverse.
 * @param {string|null} norm Normalization mode.
 * @param {NdComplexArray|null} out Optional output array.
 * @returns {Promise<NdComplexArray>} The transformed output array.
 */
async function _raw_fft(a, n, axis, is_forward, norm, out = null) {
    if (n < 1) {
        throw new ValueError(`Invalid number of FFT data points (${n}) specified.`);
    }

    await wasmLoadedPromise; // Ensure WASM module is fully loaded

    axis = normalize_axis_index(axis, a.ndim);

    // Determine output shape and initialize output array
    const outputShape = [...a.shape];
    if (a.ndim > 0) { // Handle 0-D array case
        outputShape[axis] = n;
    } else if (n > 0) {
        outputShape.push(n); // Scalar becomes a 1D array
    }


    let finalOut = out;
    if (finalOut === null) {
        finalOut = empty_like(a, outputShape, a.dtype);
    } else if (JSON.stringify(finalOut.shape) !== JSON.stringify(outputShape)) {
        throw new ValueError("Output array has wrong shape.");
    }
    if (!(finalOut instanceof NdComplexArray)) {
         throw new Error("Output 'out' must be an NdComplexArray or null.");
    }

    // *** FIX: Determine computation dtype based on output array, and convert input if necessary ***
    const real_dtype = finalOut.dtype;
    const isDouble = (real_dtype === Float64Array);
    
    // Calculate the normalization factor
    let effectiveNorm = norm;
    if (!is_forward) {
        effectiveNorm = _swap_direction(norm);
    }

    let fct;
    if (effectiveNorm === null || effectiveNorm === "backward") {
        fct = 1.0;
    } else if (effectiveNorm === "ortho") {
        const s = sqrt(n, real_dtype);
        fct = reciprocal(s, real_dtype);
        fct = (fct instanceof NdArray) ? fct.data[0] : fct; // Extract scalar if reciprocal returned NdArray
    } else if (effectiveNorm === "forward") {
        fct = reciprocal(n, real_dtype);
        fct = (fct instanceof NdArray) ? fct.data[0] : fct; // Extract scalar
    } else {
        throw new ValueError(`Invalid norm value ${norm}; should be "backward", "ortho" or "forward".`);
    }

    // Handle padding and truncation
    let temp_input = a;
    const len_in = a.ndim > 0 ? a.shape[axis] : 1;
    
    if (n > len_in) { // Zero-padding is required
        const padded_shape = [...a.shape];
        if (a.ndim > 0) {
            padded_shape[axis] = n;
        } else {
            padded_shape.push(n);
        }
        
        const padded_input = new NdComplexArray(null, padded_shape, a.dtype);

        const src_shape = a.shape;
        const dst_shape = padded_input.shape;

        const dst_strides_elem = new Array(a.ndim);
        dst_strides_elem[a.ndim - 1] = 1;
        for (let d = a.ndim - 2; d >= 0; d--) {
            dst_strides_elem[d] = dst_strides_elem[d + 1] * dst_shape[d + 1];
        }

        const counters = new Array(a.ndim).fill(0);
        for (let i_flat_src = 0; i_flat_src < a.size; i_flat_src++) {
            let i_flat_dst = 0;
            for (let d = 0; d < a.ndim; d++) {
                i_flat_dst += counters[d] * dst_strides_elem[d];
            }
            
            const src_re = a.interleavedData[i_flat_src * 2];
            const src_im = a.interleavedData[i_flat_src * 2 + 1];
            padded_input.interleavedData[i_flat_dst * 2] = src_re;
            padded_input.interleavedData[i_flat_dst * 2 + 1] = src_im;

            let d_inc = a.ndim - 1;
            while (d_inc >= 0) {
                counters[d_inc]++;
                if (counters[d_inc] < src_shape[d_inc]) break;
                counters[d_inc] = 0;
                d_inc--;
            }
        }
        temp_input = padded_input;
    }
    
    // *** FIX: Convert input data to the computation dtype if they differ ***
    let input_arr_for_wasm = temp_input;
    if (temp_input.dtype !== real_dtype) {
        input_arr_for_wasm = new NdComplexArray(null, temp_input.shape, real_dtype);
        // Manual conversion, as TypedArray.set() would misinterpret the bits
        for (let i = 0; i < temp_input.interleavedData.length; i++) {
            input_arr_for_wasm.interleavedData[i] = temp_input.interleavedData[i];
        }
    }
    
    // Allocate and Transfer Data to WASM Heap
    const inputByteSize = input_arr_for_wasm.interleavedData.byteLength;
    const outputByteSize = finalOut.interleavedData.byteLength;

    const inputPtr = PocketFFTWasmInstance._malloc(inputByteSize);
    const outputPtr = PocketFFTWasmInstance._malloc(outputByteSize);

    HEAPU8.set(new Uint8Array(input_arr_for_wasm.interleavedData.buffer), inputPtr);

    const ndim = input_arr_for_wasm.ndim;
    const n_axes = (ndim > 0) ? 1 : 0; // Don't transform a 0-d array

    const shapePtr = PocketFFTWasmInstance._malloc(ndim * Uint32Array.BYTES_PER_ELEMENT);
    const strideInPtr = PocketFFTWasmInstance._malloc(ndim * Int32Array.BYTES_PER_ELEMENT);
    const strideOutPtr = PocketFFTWasmInstance._malloc(ndim * Int32Array.BYTES_PER_ELEMENT);
    const axesPtr = PocketFFTWasmInstance._malloc(Math.max(1, n_axes) * Uint32Array.BYTES_PER_ELEMENT);

    const shapeArr = new Uint32Array(outputShape);
    const strideInArr = new Int32Array(input_arr_for_wasm.strides);
    const strideOutArr = new Int32Array(finalOut.strides);
    const axesArr = new Uint32Array([axis]);

    HEAPU8.set(new Uint8Array(shapeArr.buffer), shapePtr);
    HEAPU8.set(new Uint8Array(strideInArr.buffer), strideInPtr);
    HEAPU8.set(new Uint8Array(strideOutArr.buffer), strideOutPtr);
    HEAPU8.set(new Uint8Array(axesArr.buffer), axesPtr);

    try {
        if (ndim === 0) {
            // Special case: FFT of a scalar is itself, with normalization.
            const val = input_arr_for_wasm.get(0);
            finalOut.set(0, new Complex(val.re * fct, val.im * fct));
        } else {
             if (isDouble) {
                c2cDouble(inputPtr, outputPtr, ndim, shapePtr, strideInPtr, strideOutPtr,
                          n_axes, axesPtr, is_forward, fct);
            } else {
                c2cFloat(inputPtr, outputPtr, ndim, shapePtr, strideInPtr, strideOutPtr,
                         n_axes, axesPtr, is_forward, fct);
            }

            // Copy Result Back from WASM Heap
            // *** FIX: Use a heap view corresponding to the *output* dtype ***
            const resultView = isDouble ? HEAPF64 : HEAPF32;
            const offset = outputPtr / resultView.BYTES_PER_ELEMENT;
            finalOut.interleavedData.set(resultView.subarray(offset, offset + finalOut.interleavedData.length));
        }

    } catch (e) {
        console.error("Error during WASM FFT execution:", e);
        throw e;
    } finally {
        // Free WASM Heap Memory
        PocketFFTWasmInstance._free(inputPtr);
        PocketFFTWasmInstance._free(outputPtr);
        PocketFFTWasmInstance._free(shapePtr);
        PocketFFTWasmInstance._free(strideInPtr);
        PocketFFTWasmInstance._free(strideOutPtr);
        PocketFFTWasmInstance._free(axesPtr);
    }

    return finalOut;
}


/**
 * Compute the one-dimensional discrete Fourier Transform.
 * @param {Array|NdArray|NdComplexArray} a Input array.
 * @param {number|null} [n=null] Length of the transformed axis of the output.
 * @param {number} [axis=-1] Axis over which to compute the FFT.
 * @param {string|null} [norm=null] Normalization mode ("backward", "ortho", "forward").
 * @param {NdComplexArray|null} [out=null] Optional output array.
 * @returns {Promise<NdComplexArray>} The transformed output array.
 */
export async function fft(a, n = null, axis = -1, norm = null, out = null) {
    let inputArr = asarray(a);

    if (inputArr.size === 0) {
        // For empty arrays, create an output that matches the shape with the transformed axis changed
        const outShape = [...inputArr.shape];
        if (n !== null && inputArr.ndim > 0) {
            outShape[normalize_axis_index(axis, inputArr.ndim)] = n;
        }
        return new NdComplexArray(null, outShape, inputArr.dtype);
    }

    if (inputArr instanceof NdArray) {
        const complexData = new Array(inputArr.size);
        for(let i=0; i < inputArr.size; ++i) {
            complexData[i] = new Complex(inputArr.data[i], 0);
        }
        inputArr = new NdComplexArray(complexData, inputArr.shape, inputArr.dtype);
    }

    if (n === null) {
        // *** FIX: Handle 0-D array case for `n` ***
        if (inputArr.ndim === 0) {
            n = 1;
        } else {
            n = inputArr.shape[normalize_axis_index(axis, inputArr.ndim)];
        }
    }
    const output = await _raw_fft(inputArr, n, axis, true, norm, out);
    return output;
}

/**
 * Compute the one-dimensional inverse discrete Fourier Transform.
 * @param {Array|NdArray|NdComplexArray} a Input array.
 * @param {number|null} [n=null] Length of the transformed axis of the output.
 * @param {number} [axis=-1] Axis over which to compute the inverse FFT.
 * @param {string|null} [norm=null] Normalization mode ("backward", "ortho", "forward").
 * @param {NdComplexArray|null} [out=null] Optional output array.
 * @returns {Promise<NdComplexArray>} The transformed output array.
 */
export async function ifft(a, n = null, axis = -1, norm = null, out = null) {
    let inputArr = asarray(a);

    if (inputArr.size === 0) {
        const outShape = [...inputArr.shape];
        if (n !== null && inputArr.ndim > 0) {
            outShape[normalize_axis_index(axis, inputArr.ndim)] = n;
        }
        return new NdComplexArray(null, outShape, inputArr.dtype);
    }

    if (inputArr instanceof NdArray) {
        const complexData = new Array(inputArr.size);
        for(let i=0; i < inputArr.size; ++i) {
            complexData[i] = new Complex(inputArr.data[i], 0);
        }
        inputArr = new NdComplexArray(complexData, inputArr.shape, inputArr.dtype);
    }

    if (n === null) {
        // *** FIX: Handle 0-D array case for `n` ***
        if (inputArr.ndim === 0) {
            n = 1;
        } else {
            n = inputArr.shape[normalize_axis_index(axis, inputArr.ndim)];
        }
    }
    const output = await _raw_fft(inputArr, n, axis, false, norm, out);
    return output;
}

// Export the helper classes if users need to create arrays manually
export { NdComplexArray, NdArray, Complex, ValueError };