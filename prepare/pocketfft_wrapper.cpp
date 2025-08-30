// pocketfft_wrapper.cpp

#include <vector>
#include <complex>
#include <cstddef> // for size_t, ptrdiff_t
#include <stdexcept> // For std::exception

// Ensure POCKETFFT_NO_MULTITHREADING is defined for simpler WASM builds
// (assuming single-threaded execution in browser main thread or single Web Worker)
#define POCKETFFT_NO_MULTITHREADING

// Include the original header-only pocketfft library
#include "pocketfft_hdronly.h"

// Emscripten specific includes for exporting functions and error handling
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#include <emscripten/html5.h> // For EM_ASM_
#else
// Define EMSCRIPTEN_KEEPALIVE for non-Emscripten compilation, though not strictly needed here
#define EMSCRIPTEN_KEEPALIVE
#endif

extern "C" {

/**
 * @brief Performs a complex-to-complex FFT for double-precision floating-point numbers.
 *
 * This function serves as a WASM-callable wrapper for pocketfft::c2c.
 * Data is assumed to be interleaved (real, imag, real, imag, ...).
 *
 * @param data_in_interleaved_ptr Pointer to the interleaved input complex data (re, im, re, im, ...)
 * @param data_out_interleaved_ptr Pointer to the interleaved output complex data
 * @param ndim Number of dimensions in the array.
 * @param shape_ptr Pointer to an array of sizes for each dimension.
 * @param stride_in_ptr Pointer to an array of input strides (in bytes) for each dimension.
 * @param stride_out_ptr Pointer to an array of output strides (in bytes) for each dimension.
 * @param n_axes Number of axes to transform.
 * @param axes_ptr Pointer to an array of axis indices to transform.
 * @param forward Boolean, true for forward FFT, false for inverse.
 * @param fct Normalization factor.
 */
EMSCRIPTEN_KEEPALIVE
void pocketfft_c2c_double(
    double* data_in_interleaved_ptr,
    double* data_out_interleaved_ptr,
    size_t ndim,
    const size_t* shape_ptr,
    const ptrdiff_t* stride_in_ptr,
    const ptrdiff_t* stride_out_ptr,
    size_t n_axes,
    const size_t* axes_ptr,
    bool forward,
    double fct
) {
    // Reconstruct std::vector objects from raw pointers for pocketfft
    pocketfft::shape_t shape(shape_ptr, shape_ptr + ndim);
    pocketfft::stride_t stride_in(stride_in_ptr, stride_in_ptr + ndim);
    pocketfft::stride_t stride_out(stride_out_ptr, stride_out_ptr + ndim);
    pocketfft::shape_t axes(axes_ptr, axes_ptr + n_axes);

    // Cast raw double pointers to std::complex<double>* assuming interleaved data
    std::complex<double>* data_in_complex = reinterpret_cast<std::complex<double>*>(data_in_interleaved_ptr);
    std::complex<double>* data_out_complex = reinterpret_cast<std::complex<double>*>(data_out_interleaved_ptr);

    try {
        // Call the original pocketfft::c2c function
        pocketfft::c2c(shape, stride_in, stride_out, axes, forward,
                      data_in_complex, data_out_complex, fct);
    } catch (const std::exception& e) {
        // Log error to browser console and re-throw to propagate to JavaScript
        EM_ASM_({
            console.error("pocketfft WASM (double) error:", UTF8ToString($0));
        }, e.what());
        throw;
    }
}

/**
 * @brief Performs a complex-to-complex FFT for single-precision floating-point numbers.
 *
 * @param data_in_interleaved_ptr Pointer to the interleaved input complex data (re, im, re, im, ...)
 * @param data_out_interleaved_ptr Pointer to the interleaved output complex data
 * @param ndim Number of dimensions in the array.
 * @param shape_ptr Pointer to an array of sizes for each dimension.
 * @param stride_in_ptr Pointer to an array of input strides (in bytes) for each dimension.
 * @param stride_out_ptr Pointer to an array of output strides (in bytes) for each dimension.
 * @param n_axes Number of axes to transform.
 * @param axes_ptr Pointer to an array of axis indices to transform.
 * @param forward Boolean, true for forward FFT, false for inverse.
 * @param fct Normalization factor.
 */
EMSCRIPTEN_KEEPALIVE
void pocketfft_c2c_float(
    float* data_in_interleaved_ptr,
    float* data_out_interleaved_ptr,
    size_t ndim,
    const size_t* shape_ptr,
    const ptrdiff_t* stride_in_ptr,
    const ptrdiff_t* stride_out_ptr,
    size_t n_axes,
    const size_t* axes_ptr,
    bool forward,
    float fct
) {
    pocketfft::shape_t shape(shape_ptr, shape_ptr + ndim);
    pocketfft::stride_t stride_in(stride_in_ptr, stride_in_ptr + ndim);
    pocketfft::stride_t stride_out(stride_out_ptr, stride_out_ptr + ndim);
    pocketfft::shape_t axes(axes_ptr, axes_ptr + n_axes);

    std::complex<float>* data_in_complex = reinterpret_cast<std::complex<float>*>(data_in_interleaved_ptr);
    std::complex<float>* data_out_complex = reinterpret_cast<std::complex<float>*>(data_out_interleaved_ptr);

    try {
        pocketfft::c2c(shape, stride_in, stride_out, axes, forward,
                      data_in_complex, data_out_complex, fct);
    } catch (const std::exception& e) {
        EM_ASM_({
            console.error("pocketfft WASM (float) error:", UTF8ToString($0));
        }, e.what());
        throw;
    }
}

} // extern "C"