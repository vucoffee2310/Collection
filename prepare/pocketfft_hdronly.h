// START OF FILE pocketfft_hdronly.h.txt

/*
This file is part of pocketfft.

Copyright (C) 2010-2024 Max-Planck-Society
Copyright (C) 2019-2020 Peter Bell

For the odd-sized DCT-IV transforms:
  Copyright (C) 2003, 2007-14 Matteo Frigo
  Copyright (C) 2003, 2007-14 Massachusetts Institute of Technology
  
For the prev_good_size search:
  Copyright (C) 2024 Tan Ping Liang, Peter Bell

For the safeguards against integer overflow in good_size search:
  Copyright (C) 2024 Cris Luengo

Authors: Martin Reinecke, Peter Bell

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this
  list of conditions and the following disclaimer in the documentation and/or
  other materials provided with the distribution.
* Neither the name of the copyright holder nor the names of its contributors may
  be used to endorse or promote products derived from this software without
  specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#ifndef POCKETFFT_HDRONLY_H
#define POCKETFFT_HDRONLY_H

#ifndef __cplusplus
#error This file is C++ and requires a C++ compiler.
#endif

#if !(__cplusplus >= 201103L || (defined(_MSVC_LANG) && _MSVC_LANG >= 201103L))
#error This file requires at least C++11 support.
#endif

#ifndef POCKETFFT_CACHE_SIZE
#define POCKETFFT_CACHE_SIZE 0
#endif

#include <cmath>
#include <cstdlib>
#include <cstddef>
#include <cstdint>
#include <exception>
#include <stdexcept>
#include <memory>
#include <vector>
#include <complex>
#include <algorithm>
#include <limits>
#if POCKETFFT_CACHE_SIZE!=0
#include <array>
#include <mutex>
#endif

#ifndef POCKETFFT_NO_MULTITHREADING
#include <mutex>
#include <condition_variable>
#include <thread>
#include <queue>
#include <atomic>
#include <functional>
#include <new>

#ifdef POCKETFFT_PTHREADS
#  include <pthread.h>
#endif
#endif

#if defined(__GNUC__)
#define POCKETFFT_NOINLINE __attribute__((noinline))
#define POCKETFFT_RESTRICT __restrict__
#elif defined(_MSC_VER)
#define POCKETFFT_NOINLINE __declspec(noinline)
#define POCKETFFT_RESTRICT __restrict
#else
#define POCKETFFT_NOINLINE
#define POCKETFFT_RESTRICT
#endif

namespace pocketfft {

namespace detail {
using std::size_t;
using std::ptrdiff_t;

// Always use std:: for <cmath> functions
template <typename T> T cos(T) = delete;
template <typename T> T sin(T) = delete;
template <typename T> T sqrt(T) = delete;

using shape_t = std::vector<size_t>;
using stride_t = std::vector<ptrdiff_t>;

constexpr bool FORWARD  = true,
               BACKWARD = false;

// only enable vector support for gcc>=5.0 and clang>=5.0
#ifndef POCKETFFT_NO_VECTORS
#define POCKETFFT_NO_VECTORS
#if defined(__INTEL_COMPILER)
// do nothing. This is necessary because this compiler also sets __GNUC__.
#elif defined(__clang__)
// AppleClang has their own version numbering
#ifdef __apple_build_version__
#  if (__clang_major__ > 9) || (__clang_major__ == 9 && __clang_minor__ >= 1)
#     undef POCKETFFT_NO_VECTORS
#  endif
#elif __clang_major__ >= 5
#  undef POCKETFFT_NO_VECTORS
#endif
#elif defined(__GNUC__)
#if __GNUC__>=5
#undef POCKETFFT_NO_VECTORS
#endif
#endif
#endif

template<typename T> struct VLEN { static constexpr size_t val=1; };

#ifndef POCKETFFT_NO_VECTORS
#if (defined(__AVX512F__))
template<> struct VLEN<float> { static constexpr size_t val=16; };
template<> struct VLEN<double> { static constexpr size_t val=8; };
#elif (defined(__AVX__))
template<> struct VLEN<float> { static constexpr size_t val=8; };
template<> struct VLEN<double> { static constexpr size_t val=4; };
#elif (defined(__SSE2__))
template<> struct VLEN<float> { static constexpr size_t val=4; };
template<> struct VLEN<double> { static constexpr size_t val=2; };
#elif (defined(__VSX__))
template<> struct VLEN<float> { static constexpr size_t val=4; };
template<> struct VLEN<double> { static constexpr size_t val=2; };
#elif (defined(__ARM_NEON__) || defined(__ARM_NEON))
template<> struct VLEN<float> { static constexpr size_t val=4; };
template<> struct VLEN<double> { static constexpr size_t val=2; };
#else
#define POCKETFFT_NO_VECTORS
#endif
#endif

// std::aligned_alloc is a bit cursed ... it doesn't exist on MacOS < 10.15
// and in musl, and other OSes seem to have even more peculiarities.
// Let's unconditionally work around it for now.
# if 0
//#if (__cplusplus >= 201703L) && (!defined(__MINGW32__)) && (!defined(_MSC_VER)) && (__MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_15)
inline void *aligned_alloc(size_t align, size_t size)
  {
  // aligned_alloc() requires that the requested size is a multiple of "align"
  void *ptr = ::aligned_alloc(align,(size+align-1)&(~(align-1)));
  if (!ptr) throw std::bad_alloc();
  return ptr;
  }
inline void aligned_dealloc(void *ptr)
    { free(ptr); }
#else // portable emulation
inline void *aligned_alloc(size_t align, size_t size)
  {
  align = std::max(align, alignof(max_align_t));
  void *ptr = malloc(size+align);
  if (!ptr) throw std::bad_alloc();
  void *res = reinterpret_cast<void *>
    ((reinterpret_cast<uintptr_t>(ptr) & ~(uintptr_t(align-1))) + uintptr_t(align));
  (reinterpret_cast<void**>(res))[-1] = ptr;
  return res;
  }
inline void aligned_dealloc(void *ptr)
  { if (ptr) free((reinterpret_cast<void**>(ptr))[-1]); }
#endif

template<typename T> class arr
  {
  private:
    T *p;
    size_t sz;

#if defined(POCKETFFT_NO_VECTORS)
    static T *ralloc(size_t num)
      {
      if (num==0) return nullptr;
      void *res = malloc(num*sizeof(T));
      if (!res) throw std::bad_alloc();
      return reinterpret_cast<T *>(res);
      }
    static void dealloc(T *ptr)
      { free(ptr); }
#else
    static T *ralloc(size_t num)
      {
      if (num==0) return nullptr;
      void *ptr = aligned_alloc(64, num*sizeof(T));
      return static_cast<T*>(ptr);
      }
    static void dealloc(T *ptr)
      { aligned_dealloc(ptr); }
#endif

  public:
    arr() : p(0), sz(0) {}
    arr(size_t n) : p(ralloc(n)), sz(n) {}
    arr(arr &&other)
      : p(other.p), sz(other.sz)
      { other.p=nullptr; other.sz=0; }
    ~arr() { dealloc(p); }

    void resize(size_t n)
      {
      if (n==sz) return;
      dealloc(p);
      p = ralloc(n);
      sz = n;
      }

    T &operator[](size_t idx) { return p[idx]; }
    const T &operator[](size_t idx) const { return p[idx]; }

    T *data() { return p; }
    const T *data() const { return p; }

    size_t size() const { return sz; }
  };

template<typename T> struct cmplx {
  T r, i;
  cmplx() {}
  cmplx(T r_, T i_) : r(r_), i(i_) {}
  void Set(T r_, T i_) { r=r_; i=i_; }
  void Set(T r_) { r=r_; i=T(0); }
  cmplx &operator+= (const cmplx &other)
    { r+=other.r; i+=other.i; return *this; }
  template<typename T2>cmplx &operator*= (T2 other)
    { r*=other; i*=other; return *this; }
  template<typename T2>cmplx &operator*= (const cmplx<T2> &other)
    {
    T tmp = r*other.r - i*other.i;
    i = r*other.i + i*other.r;
    r = tmp;
    return *this;
    }
  template<typename T2>cmplx &operator+= (const cmplx<T2> &other)
    { r+=other.r; i+=other.i; return *this; }
  template<typename T2>cmplx &operator-= (const cmplx<T2> &other)
    { r-=other.r; i-=other.i; return *this; }
  template<typename T2> auto operator* (const T2 &other) const
    -> cmplx<decltype(r*other)>
    { return {r*other, i*other}; }
  template<typename T2> auto operator+ (const cmplx<T2> &other) const
    -> cmplx<decltype(r+other.r)>
    { return {r+other.r, i+other.i}; }
  template<typename T2> auto operator- (const cmplx<T2> &other) const
    -> cmplx<decltype(r+other.r)>
    { return {r-other.r, i-other.i}; }
  template<typename T2> auto operator* (const cmplx<T2> &other) const
    -> cmplx<decltype(r+other.r)>
    { return {r*other.r-i*other.i, r*other.i + i*other.r}; }
  template<bool fwd, typename T2> auto special_mul (const cmplx<T2> &other) const
    -> cmplx<decltype(r+other.r)>
    {
    using Tres = cmplx<decltype(r+other.r)>;
    return fwd ? Tres(r*other.r+i*other.i, i*other.r-r*other.i)
               : Tres(r*other.r-i*other.i, r*other.i+i*other.r);
    }
};
template<typename T> inline void PM(T &a, T &b, T c, T d)
  { a=c+d; b=c-d; }
template<typename T> inline void PMINPLACE(T &a, T &b)
  { T t = a; a+=b; b=t-b; }
template<typename T> inline void MPINPLACE(T &a, T &b)
  { T t = a; a-=b; b=t+b; }
template<typename T> cmplx<T> conj(const cmplx<T> &a)
  { return {a.r, -a.i}; }
template<bool fwd, typename T, typename T2> void special_mul (const cmplx<T> &v1, const cmplx<T2> &v2, cmplx<T> &res)
  {
  res = fwd ? cmplx<T>(v1.r*v2.r+v1.i*v2.i, v1.i*v2.r-v1.r*v2.i)
            : cmplx<T>(v1.r*v2.r-v1.i*v2.i, v1.r*v2.i+v1.i*v2.r);
  }

template<typename T> void ROT90(cmplx<T> &a)
  { auto tmp_=a.r; a.r=-a.i; a.i=tmp_; }
template<bool fwd, typename T> void ROTX90(cmplx<T> &a)
  { auto tmp_= fwd ? -a.r : a.r; a.r = fwd ? a.i : -a.i; a.i=tmp_; }

//
// twiddle factor section
//
template<typename T> class sincos_2pibyn
  {
  private:
    using Thigh = typename std::conditional<(sizeof(T)>sizeof(double)), T, double>::type;
    size_t N, mask, shift;
    arr<cmplx<Thigh>> v1, v2;

    static cmplx<Thigh> calc(size_t x, size_t n, Thigh ang)
      {
      x<<=3;
      if (x<4*n) // first half
        {
        if (x<2*n) // first quadrant
          {
          if (x<n) return cmplx<Thigh>(std::cos(Thigh(x)*ang), std::sin(Thigh(x)*ang));
          return cmplx<Thigh>(std::sin(Thigh(2*n-x)*ang), std::cos(Thigh(2*n-x)*ang));
          }
        else // second quadrant
          {
          x-=2*n;
          if (x<n) return cmplx<Thigh>(-std::sin(Thigh(x)*ang), std::cos(Thigh(x)*ang));
          return cmplx<Thigh>(-std::cos(Thigh(2*n-x)*ang), std::sin(Thigh(2*n-x)*ang));
          }
        }
      else
        {
        x=8*n-x;
        if (x<2*n) // third quadrant
          {
          if (x<n) return cmplx<Thigh>(std::cos(Thigh(x)*ang), -std::sin(Thigh(x)*ang));
          return cmplx<Thigh>(std::sin(Thigh(2*n-x)*ang), -std::cos(Thigh(2*n-x)*ang));
          }
        else // fourth quadrant
          {
          x-=2*n;
          if (x<n) return cmplx<Thigh>(-std::sin(Thigh(x)*ang), -std::cos(Thigh(x)*ang));
          return cmplx<Thigh>(-std::cos(Thigh(2*n-x)*ang), -std::sin(Thigh(2*n-x)*ang));
          }
        }
      }

  public:
    POCKETFFT_NOINLINE sincos_2pibyn(size_t n)
      : N(n)
      {
      constexpr auto pi = 3.141592653589793238462643383279502884197L;
      Thigh ang = Thigh(0.25L*pi/n);
      size_t nval = (n+2)/2;
      shift = 1;
      while((size_t(1)<<shift)*(size_t(1)<<shift) < nval) ++shift;
      mask = (size_t(1)<<shift)-1;
      v1.resize(mask+1);
      v1[0].Set(Thigh(1), Thigh(0));
      for (size_t i=1; i<v1.size(); ++i)
        v1[i]=calc(i,n,ang);
      v2.resize((nval+mask)/(mask+1));
      v2[0].Set(Thigh(1), Thigh(0));
      for (size_t i=1; i<v2.size(); ++i)
        v2[i]=calc(i*(mask+1),n,ang);
      }

    cmplx<T> operator[](size_t idx) const
      {
      if (2*idx<=N)
        {
        auto x1=v1[idx&mask], x2=v2[idx>>shift];
        return cmplx<T>(T(x1.r*x2.r-x1.i*x2.i), T(x1.r*x2.i+x1.i*x2.r));
        }
      idx = N-idx;
      auto x1=v1[idx&mask], x2=v2[idx>>shift];
      return cmplx<T>(T(x1.r*x2.r-x1.i*x2.i), -T(x1.r*x2.i+x1.i*x2.r));
      }
  };

struct util // hack to avoid duplicate symbols
  {
  static POCKETFFT_NOINLINE size_t largest_prime_factor (size_t n)
    {
    size_t res=1;
    while ((n&1)==0)
      { res=2; n>>=1; }
    for (size_t x=3; x*x<=n; x+=2)
      while ((n%x)==0)
        { res=x; n/=x; }
    if (n>1) res=n;
    return res;
    }

  static POCKETFFT_NOINLINE double cost_guess (size_t n)
    {
    constexpr double lfp=1.1; // penalty for non-hardcoded larger factors
    size_t ni=n;
    double result=0.;
    while ((n&1)==0)
      { result+=2; n>>=1; }
    for (size_t x=3; x*x<=n; x+=2)
      while ((n%x)==0)
        {
        result+= (x<=5) ? double(x) : lfp*double(x); // penalize larger prime factors
        n/=x;
        }
    if (n>1) result+=(n<=5) ? double(n) : lfp*double(n);
    return result*double(ni);
    }

  /* inner workings of good_size_cmplx() */
  template<typename UIntT>
  static POCKETFFT_NOINLINE UIntT good_size_cmplx_typed(UIntT n)
    {
    static_assert(std::numeric_limits<UIntT>::is_integer && (!std::numeric_limits<UIntT>::is_signed),
      "type must be unsigned integer");
    if (n<=12) return n;
    if (n>std::numeric_limits<UIntT>::max()/11/2)
      {
      // The algorithm below doesn't work for this value, the multiplication can overflow.
      if (sizeof(UIntT)<sizeof(std::uint64_t))
        {
        // We can try using this algorithm with 64-bit integers:
        std::uint64_t res = good_size_cmplx_typed<std::uint64_t>(n);
        if (res<=std::numeric_limits<UIntT>::max())
          return static_cast<UIntT>(res);
        }
      // Otherwise, this size is ridiculously large, people shouldn't be computing FFTs this large.
      throw std::runtime_error("FFT size is too large.");
      }

    UIntT bestfac=2*n;
    for (UIntT f11=1; f11<bestfac; f11*=11)
      for (UIntT f117=f11; f117<bestfac; f117*=7)
        for (UIntT f1175=f117; f1175<bestfac; f1175*=5)
          {
          UIntT x=f1175;
          while (x<n) x*=2;
          for (;;)
            {
            if (x<n)
              x*=3;
            else if (x>n)
              {
              if (x<bestfac) bestfac=x;
              if (x&1) break;
              x>>=1;
              }
            else
              return n;
            }
          }
    return bestfac;
    }
  /* returns the smallest composite of 2, 3, 5, 7 and 11 which is >= n */
  static POCKETFFT_NOINLINE size_t good_size_cmplx(size_t n)
    {
    return good_size_cmplx_typed(n);
    }
  /* returns the smallest composite of 2, 3, 5, 7 and 11 which is >= n
     and a multiple of required_factor. */
  static POCKETFFT_NOINLINE size_t good_size_cmplx(size_t n,
    size_t required_factor)
    {
    if (required_factor<1)
      throw std::runtime_error("required factor must not be 0");
    return good_size_cmplx((n+required_factor-1)/required_factor) * required_factor;
    }

  /* inner workings of prev_good_size_cmplx() */
  template<typename UIntT>
  static POCKETFFT_NOINLINE UIntT prev_good_size_cmplx_typed(UIntT n)
    {
    static_assert(std::numeric_limits<UIntT>::is_integer && (!std::numeric_limits<UIntT>::is_signed),
      "type must be unsigned integer");
    if (n<=12) return n;
    if (n>std::numeric_limits<UIntT>::max()/11)
    {
      // The algorithm below doesn't work for this value, the multiplication can overflow.
      if (sizeof(UIntT)<sizeof(std::uint64_t))
      {
        // We can try using this algorithm with 64-bit integers:
        std::uint64_t res = prev_good_size_cmplx_typed<std::uint64_t>(n);
        if (res<=std::numeric_limits<UIntT>::max())
          return static_cast<UIntT>(res);
      }
      // Otherwise, this size is ridiculously large, people shouldn't be computing FFTs this large.
      throw std::runtime_error("FFT size is too large.");
    }

    UIntT bestfound = 1;
    for (UIntT f11 = 1;f11 <= n; f11 *= 11)
      for (UIntT f117 = f11; f117 <= n; f117 *= 7)
        for (UIntT f1175 = f117; f1175 <= n; f1175 *= 5)
          {
          UIntT x = f1175;
          while (x*2 <= n) x *= 2;
          if (x > bestfound) bestfound = x;
          while (true) 
            {
            if (x * 3 <= n) x *= 3;
            else if (x % 2 == 0) x /= 2;
            else break;
              
            if (x > bestfound) bestfound = x;
            }
          }
    return bestfound;
    }
  /* returns the largest composite of 2, 3, 5, 7 and 11 which is <= n */
  static POCKETFFT_NOINLINE size_t prev_good_size_cmplx(size_t n)
    {
    return prev_good_size_cmplx_typed(n);
    }

  static size_t prod(const shape_t &shape)
    {
    size_t res=1;
    for (auto sz: shape)
      res*=sz;
    return res;
    }

  static POCKETFFT_NOINLINE void sanity_check(const shape_t &shape,
    const stride_t &stride_in, const stride_t &stride_out, bool inplace)
    {
    auto ndim = shape.size();
    if (ndim<1) throw std::runtime_error("ndim must be >= 1");
    if ((stride_in.size()!=ndim) || (stride_out.size()!=ndim))
      throw std::runtime_error("stride dimension mismatch");
    if (inplace && (stride_in!=stride_out))
      throw std::runtime_error("stride mismatch");
    }

  static POCKETFFT_NOINLINE void sanity_check(const shape_t &shape,
    const stride_t &stride_in, const stride_t &stride_out, bool inplace,
    const shape_t &axes)
    {
    sanity_check(shape, stride_in, stride_out, inplace);
    auto ndim = shape.size();
    shape_t tmp(ndim,0);
    for (auto ax : axes)
      {
      if (ax>=ndim) throw std::invalid_argument("bad axis number");
      if (++tmp[ax]>1) throw std::invalid_argument("axis specified repeatedly");
      }
    }

  static POCKETFFT_NOINLINE void sanity_check(const shape_t &shape,
    const stride_t &stride_in, const stride_t &stride_out, bool inplace,
    size_t axis)
    {
    sanity_check(shape, stride_in, stride_out, inplace);
    if (axis>=shape.size()) throw std::invalid_argument("bad axis number");
    }

#ifdef POCKETFFT_NO_MULTITHREADING
  static size_t thread_count (size_t /*nthreads*/, const shape_t &/*shape*/,
    size_t /*axis*/, size_t /*vlen*/)
    { return 1; }
#else
  static size_t thread_count (size_t nthreads, const shape_t &shape,
    size_t axis, size_t vlen)
    {
    if (nthreads==1) return 1;
    size_t size = prod(shape);
    size_t parallel = size / (shape[axis] * vlen);
    if (shape[axis] < 1000)
      parallel /= 4;
    size_t max_threads = nthreads == 0 ?
      std::thread::hardware_concurrency() : nthreads;
    return std::max(size_t(1), std::min(parallel, max_threads));
    }
#endif
  };

namespace threading {

#ifdef POCKETFFT_NO_MULTITHREADING

constexpr inline size_t thread_id() { return 0; }
constexpr inline size_t num_threads() { return 1; }

template <typename Func>
void thread_map(size_t /* nthreads */, Func f)
  { f(); }

#else

inline size_t &thread_id()
  {
  static thread_local size_t thread_id_=0;
  return thread_id_;
  }
inline size_t &num_threads()
  {
  static thread_local size_t num_threads_=1;
  return num_threads_;
  }
static const size_t max_threads = std::max(1u, std::thread::hardware_concurrency());

class latch
  {
    std::atomic<size_t> num_left_;
    std::mutex mut_;
    std::condition_variable completed_;
    using lock_t = std::unique_lock<std::mutex>;

  public:
    latch(size_t n): num_left_(n) {}

    void count_down()
      {
      lock_t lock(mut_);
      if (--num_left_)
        return;
      completed_.notify_all();
      }

    void wait()
      {
      lock_t lock(mut_);
      completed_.wait(lock, [this]{ return is_ready(); });
      }
    bool is_ready() { return num_left_ == 0; }
  };

template <typename T> class concurrent_queue
  {
    std::queue<T> q_;
    std::mutex mut_;
    std::atomic<size_t> size_;
    using lock_t = std::lock_guard<std::mutex>;

  public:

    void push(T val)
      {
      lock_t lock(mut_);
      ++size_;
      q_.push(std::move(val));
      }

    bool try_pop(T &val)
      {
      if (size_ == 0) return false;
      lock_t lock(mut_);
      // Queue might have been emptied while we acquired the lock
      if (q_.empty()) return false;

      val = std::move(q_.front());
      --size_;
      q_.pop();
      return true;
      }

    bool empty() const { return size_==0; }
  };

// C++ allocator with support for over-aligned types
template <typename T> struct aligned_allocator
  {
  using value_type = T;
  template <class U>
  aligned_allocator(const aligned_allocator<U>&) {}
  aligned_allocator() = default;

  T *allocate(size_t n)
    {
    void* mem = aligned_alloc(alignof(T), n*sizeof(T));
    return static_cast<T*>(mem);
    }

  void deallocate(T *p, size_t /*n*/)
    { aligned_dealloc(p); }
  };

class thread_pool
  {
    // A reasonable guess, probably close enough for most hardware
    static constexpr size_t cache_line_size = 64;
    struct alignas(cache_line_size) worker
      {
      std::thread thread;
      std::condition_variable work_ready;
      std::mutex mut;
      std::atomic_flag busy_flag = ATOMIC_FLAG_INIT;
      std::function<void()> work;

      void worker_main(
        std::atomic<bool> &shutdown_flag,
        std::atomic<size_t> &unscheduled_tasks,
        concurrent_queue<std::function<void()>> &overflow_work)
        {
        using lock_t = std::unique_lock<std::mutex>;
        bool expect_work = true;
        while (!shutdown_flag || expect_work)
          {
          std::function<void()> local_work;
          if (expect_work || unscheduled_tasks == 0)
            {
            lock_t lock(mut);
            // Wait until there is work to be executed
            work_ready.wait(lock, [&]{ return (work || shutdown_flag); });
            local_work.swap(work);
            expect_work = false;
            }

          bool marked_busy = false;
          if (local_work)
            {
            marked_busy = true;
            local_work();
            }

          if (!overflow_work.empty())
            {
            if (!marked_busy && busy_flag.test_and_set())
              {
              expect_work = true;
              continue;
              }
            marked_busy = true;

            while (overflow_work.try_pop(local_work))
              {
              --unscheduled_tasks;
              local_work();
              }
            }

          if (marked_busy) busy_flag.clear();
          }
        }
      };

    concurrent_queue<std::function<void()>> overflow_work_;
    std::mutex mut_;
    std::vector<worker, aligned_allocator<worker>> workers_;
    std::atomic<bool> shutdown_;
    std::atomic<size_t> unscheduled_tasks_;
    using lock_t = std::lock_guard<std::mutex>;

    void create_threads()
      {
      lock_t lock(mut_);
      size_t nthreads=workers_.size();
      for (size_t i=0; i<nthreads; ++i)
        {
        try
          {
          auto *worker = &workers_[i];
          worker->busy_flag.clear();
          worker->work = nullptr;
          worker->thread = std::thread([worker, this]
            {
            worker->worker_main(shutdown_, unscheduled_tasks_, overflow_work_);
            });
          }
        catch (...)
          {
          shutdown_locked();
          throw;
          }
        }
      }

    void shutdown_locked()
      {
      shutdown_ = true;
      for (auto &worker : workers_)
        worker.work_ready.notify_all();

      for (auto &worker : workers_)
        if (worker.thread.joinable())
          worker.thread.join();
      }

  public:
    explicit thread_pool(size_t nthreads):
      workers_(nthreads)
      { create_threads(); }

    thread_pool(): thread_pool(max_threads) {}

    ~thread_pool() { shutdown(); }

    void submit(std::function<void()> work)
      {
      lock_t lock(mut_);
      if (shutdown_)
        throw std::runtime_error("Work item submitted after shutdown");

      ++unscheduled_tasks_;

      // First check for any idle workers and wake those
      for (auto &worker : workers_)
        if (!worker.busy_flag.test_and_set())
          {
          --unscheduled_tasks_;
          {
          lock_t lock(worker.mut);
          worker.work = std::move(work);
          }
          worker.work_ready.notify_one();
          return;
          }

      // If no workers were idle, push onto the overflow queue for later
      overflow_work_.push(std::move(work));
      }

    void shutdown()
      {
      lock_t lock(mut_);
      shutdown_locked();
      }

    void restart()
      {
      shutdown_ = false;
      create_threads();
      }
  };

inline thread_pool & get_pool()
  {
  static thread_pool pool;
#ifdef POCKETFFT_PTHREADS
  static std::once_flag f;
  std::call_once(f,
    []{
    pthread_atfork(
      +[]{ get_pool().shutdown(); },  // prepare
      +[]{ get_pool().restart(); },   // parent
      +[]{ get_pool().restart(); }    // child
      );
    });
#endif

  return pool;
  }

/** Map a function f over nthreads */
template <typename Func>
void thread_map(size_t nthreads, Func f)
  {
  if (nthreads == 0)
    nthreads = max_threads;

  if (nthreads == 1)
    { f(); return; }

  auto & pool = get_pool();
  latch counter(nthreads);
  std::exception_ptr ex;
  std::mutex ex_mut;
  for (size_t i=0; i<nthreads; ++i)
    {
    pool.submit(
      [&f, &counter, &ex, &ex_mut, i, nthreads] {
      thread_id() = i;
      num_threads() = nthreads;
      try { f(); }
      catch (...)
        {
        std::lock_guard<std::mutex> lock(ex_mut);
        ex = std::current_exception();
        }
      counter.count_down();
      });
    }
  counter.wait();
  if (ex)
    std::rethrow_exception(ex);
  }

#endif

}

//
// complex FFTPACK transforms
//

template<typename T0> class cfftp
  {
  private:
    struct fctdata
      {
      size_t fct;
      cmplx<T0> *tw, *tws;
      };

    size_t length;
    arr<cmplx<T0>> mem;
    std::vector<fctdata> fact;

    void add_factor(size_t factor)
      { fact.push_back({factor, nullptr, nullptr}); }

template<bool fwd, typename T> void pass2 (size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+2*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      CH(0,k,0) = CC(0,0,k)+CC(0,1,k);
      CH(0,k,1) = CC(0,0,k)-CC(0,1,k);
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      CH(0,k,0) = CC(0,0,k)+CC(0,1,k);
      CH(0,k,1) = CC(0,0,k)-CC(0,1,k);
      for (size_t i=1; i<ido; ++i)
        {
        CH(i,k,0) = CC(i,0,k)+CC(i,1,k);
        special_mul<fwd>(CC(i,0,k)-CC(i,1,k),WA(0,i),CH(i,k,1));
        }
      }
  }

#define POCKETFFT_PREP3(idx) \
        T t0 = CC(idx,0,k), t1, t2; \
        PM (t1,t2,CC(idx,1,k),CC(idx,2,k)); \
        CH(idx,k,0)=t0+t1;
#define POCKETFFT_PARTSTEP3a(u1,u2,twr,twi) \
        { \
        T ca=t0+t1*twr; \
        T cb{-t2.i*twi, t2.r*twi}; \
        PM(CH(0,k,u1),CH(0,k,u2),ca,cb) ;\
        }
#define POCKETFFT_PARTSTEP3b(u1,u2,twr,twi) \
        { \
        T ca=t0+t1*twr; \
        T cb{-t2.i*twi, t2.r*twi}; \
        special_mul<fwd>(ca+cb,WA(u1-1,i),CH(i,k,u1)); \
        special_mul<fwd>(ca-cb,WA(u2-1,i),CH(i,k,u2)); \
        }
template<bool fwd, typename T> void pass3 (size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  constexpr T0 tw1r=-0.5,
               tw1i= (fwd ? -1: 1) * T0(0.8660254037844386467637231707529362L);

  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+3*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      POCKETFFT_PREP3(0)
      POCKETFFT_PARTSTEP3a(1,2,tw1r,tw1i)
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      {
      POCKETFFT_PREP3(0)
      POCKETFFT_PARTSTEP3a(1,2,tw1r,tw1i)
      }
      for (size_t i=1; i<ido; ++i)
        {
        POCKETFFT_PREP3(i)
        POCKETFFT_PARTSTEP3b(1,2,tw1r,tw1i)
        }
      }
  }

#undef POCKETFFT_PARTSTEP3b
#undef POCKETFFT_PARTSTEP3a
#undef POCKETFFT_PREP3

template<bool fwd, typename T> void pass4 (size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+4*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      T t1, t2, t3, t4;
      PM(t2,t1,CC(0,0,k),CC(0,2,k));
      PM(t3,t4,CC(0,1,k),CC(0,3,k));
      ROTX90<fwd>(t4);
      PM(CH(0,k,0),CH(0,k,2),t2,t3);
      PM(CH(0,k,1),CH(0,k,3),t1,t4);
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      {
      T t1, t2, t3, t4;
      PM(t2,t1,CC(0,0,k),CC(0,2,k));
      PM(t3,t4,CC(0,1,k),CC(0,3,k));
      ROTX90<fwd>(t4);
      PM(CH(0,k,0),CH(0,k,2),t2,t3);
      PM(CH(0,k,1),CH(0,k,3),t1,t4);
      }
      for (size_t i=1; i<ido; ++i)
        {
        T t1, t2, t3, t4;
        T cc0=CC(i,0,k), cc1=CC(i,1,k),cc2=CC(i,2,k),cc3=CC(i,3,k);
        PM(t2,t1,cc0,cc2);
        PM(t3,t4,cc1,cc3);
        ROTX90<fwd>(t4);
        CH(i,k,0) = t2+t3;
        special_mul<fwd>(t1+t4,WA(0,i),CH(i,k,1));
        special_mul<fwd>(t2-t3,WA(1,i),CH(i,k,2));
        special_mul<fwd>(t1-t4,WA(2,i),CH(i,k,3));
        }
      }
  }

#define POCKETFFT_PREP5(idx) \
        T t0 = CC(idx,0,k), t1, t2, t3, t4; \
        PM (t1,t4,CC(idx,1,k),CC(idx,4,k)); \
        PM (t2,t3,CC(idx,2,k),CC(idx,3,k)); \
        CH(idx,k,0).r=t0.r+t1.r+t2.r; \
        CH(idx,k,0).i=t0.i+t1.i+t2.i;

#define POCKETFFT_PARTSTEP5a(u1,u2,twar,twbr,twai,twbi) \
        { \
        T ca,cb; \
        ca.r=t0.r+twar*t1.r+twbr*t2.r; \
        ca.i=t0.i+twar*t1.i+twbr*t2.i; \
        cb.i=twai*t4.r twbi*t3.r; \
        cb.r=-(twai*t4.i twbi*t3.i); \
        PM(CH(0,k,u1),CH(0,k,u2),ca,cb); \
        }

#define POCKETFFT_PARTSTEP5b(u1,u2,twar,twbr,twai,twbi) \
        { \
        T ca,cb,da,db; \
        ca.r=t0.r+twar*t1.r+twbr*t2.r; \
        ca.i=t0.i+twar*t1.i+twbr*t2.i; \
        cb.i=twai*t4.r twbi*t3.r; \
        cb.r=-(twai*t4.i twbi*t3.i); \
        special_mul<fwd>(ca+cb,WA(u1-1,i),CH(i,k,u1)); \
        special_mul<fwd>(ca-cb,WA(u2-1,i),CH(i,k,u2)); \
        }
template<bool fwd, typename T> void pass5 (size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  constexpr T0 tw1r= T0(0.3090169943749474241022934171828191L),
               tw1i= (fwd ? -1: 1) * T0(0.9510565162951535721164393333793821L),
               tw2r= T0(-0.8090169943749474241022934171828191L),
               tw2i= (fwd ? -1: 1) * T0(0.5877852522924731291687059546390728L);

  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+5*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      POCKETFFT_PREP5(0)
      POCKETFFT_PARTSTEP5a(1,4,tw1r,tw2r,+tw1i,+tw2i)
      POCKETFFT_PARTSTEP5a(2,3,tw2r,tw1r,+tw2i,-tw1i)
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      {
      POCKETFFT_PREP5(0)
      POCKETFFT_PARTSTEP5a(1,4,tw1r,tw2r,+tw1i,+tw2i)
      POCKETFFT_PARTSTEP5a(2,3,tw2r,tw1r,+tw2i,-tw1i)
      }
      for (size_t i=1; i<ido; ++i)
        {
        POCKETFFT_PREP5(i)
        POCKETFFT_PARTSTEP5b(1,4,tw1r,tw2r,+tw1i,+tw2i)
        POCKETFFT_PARTSTEP5b(2,3,tw2r,tw1r,+tw2i,-tw1i)
        }
      }
  }

#undef POCKETFFT_PARTSTEP5b
#undef POCKETFFT_PARTSTEP5a
#undef POCKETFFT_PREP5

#define POCKETFFT_PREP7(idx) \
        T t1 = CC(idx,0,k), t2, t3, t4, t5, t6, t7; \
        PM (t2,t7,CC(idx,1,k),CC(idx,6,k)); \
        PM (t3,t6,CC(idx,2,k),CC(idx,5,k)); \
        PM (t4,t5,CC(idx,3,k),CC(idx,4,k)); \
        CH(idx,k,0).r=t1.r+t2.r+t3.r+t4.r; \
        CH(idx,k,0).i=t1.i+t2.i+t3.i+t4.i;

#define POCKETFFT_PARTSTEP7a0(u1,u2,x1,x2,x3,y1,y2,y3,out1,out2) \
        { \
        T ca,cb; \
        ca.r=t1.r+x1*t2.r+x2*t3.r+x3*t4.r; \
        ca.i=t1.i+x1*t2.i+x2*t3.i+x3*t4.i; \
        cb.i=y1*t7.r y2*t6.r y3*t5.r; \
        cb.r=-(y1*t7.i y2*t6.i y3*t5.i); \
        PM(out1,out2,ca,cb); \
        }
#define POCKETFFT_PARTSTEP7a(u1,u2,x1,x2,x3,y1,y2,y3) \
        POCKETFFT_PARTSTEP7a0(u1,u2,x1,x2,x3,y1,y2,y3,CH(0,k,u1),CH(0,k,u2))
#define POCKETFFT_PARTSTEP7(u1,u2,x1,x2,x3,y1,y2,y3) \
        { \
        T da,db; \
        POCKETFFT_PARTSTEP7a0(u1,u2,x1,x2,x3,y1,y2,y3,da,db) \
        special_mul<fwd>(da,WA(u1-1,i),CH(i,k,u1)); \
        special_mul<fwd>(db,WA(u2-1,i),CH(i,k,u2)); \
        }

template<bool fwd, typename T> void pass7(size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  constexpr T0 tw1r= T0(0.6234898018587335305250048840042398L),
               tw1i= (fwd ? -1 : 1) * T0(0.7818314824680298087084445266740578L),
               tw2r= T0(-0.2225209339563144042889025644967948L),
               tw2i= (fwd ? -1 : 1) * T0(0.9749279121818236070181316829939312L),
               tw3r= T0(-0.9009688679024191262361023195074451L),
               tw3i= (fwd ? -1 : 1) * T0(0.433883739117558120475768332848359L);

  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+7*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      POCKETFFT_PREP7(0)
      POCKETFFT_PARTSTEP7a(1,6,tw1r,tw2r,tw3r,+tw1i,+tw2i,+tw3i)
      POCKETFFT_PARTSTEP7a(2,5,tw2r,tw3r,tw1r,+tw2i,-tw3i,-tw1i)
      POCKETFFT_PARTSTEP7a(3,4,tw3r,tw1r,tw2r,+tw3i,-tw1i,+tw2i)
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      {
      POCKETFFT_PREP7(0)
      POCKETFFT_PARTSTEP7a(1,6,tw1r,tw2r,tw3r,+tw1i,+tw2i,+tw3i)
      POCKETFFT_PARTSTEP7a(2,5,tw2r,tw3r,tw1r,+tw2i,-tw3i,-tw1i)
      POCKETFFT_PARTSTEP7a(3,4,tw3r,tw1r,tw2r,+tw3i,-tw1i,+tw2i)
      }
      for (size_t i=1; i<ido; ++i)
        {
        POCKETFFT_PREP7(i)
        POCKETFFT_PARTSTEP7(1,6,tw1r,tw2r,tw3r,+tw1i,+tw2i,+tw3i)
        POCKETFFT_PARTSTEP7(2,5,tw2r,tw3r,tw1r,+tw2i,-tw3i,-tw1i)
        POCKETFFT_PARTSTEP7(3,4,tw3r,tw1r,tw2r,+tw3i,-tw1i,+tw2i)
        }
      }
  }

#undef POCKETFFT_PARTSTEP7
#undef POCKETFFT_PARTSTEP7a0
#undef POCKETFFT_PARTSTEP7a
#undef POCKETFFT_PREP7

template <bool fwd, typename T> void ROTX45(T &a) const
  {
  constexpr T0 hsqt2=T0(0.707106781186547524400844362104849L);
  if (fwd)
    { auto tmp_=a.r; a.r=hsqt2*(a.r+a.i); a.i=hsqt2*(a.i-tmp_); }
  else
    { auto tmp_=a.r; a.r=hsqt2*(a.r-a.i); a.i=hsqt2*(a.i+tmp_); }
  }
template <bool fwd, typename T> void ROTX135(T &a) const
  {
  constexpr T0 hsqt2=T0(0.707106781186547524400844362104849L);
  if (fwd)
    { auto tmp_=a.r; a.r=hsqt2*(a.i-a.r); a.i=hsqt2*(-tmp_-a.i); }
  else
    { auto tmp_=a.r; a.r=hsqt2*(-a.r-a.i); a.i=hsqt2*(tmp_-a.i); }
  }

template<bool fwd, typename T> void pass8 (size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+8*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      T a0, a1, a2, a3, a4, a5, a6, a7;
      PM(a1,a5,CC(0,1,k),CC(0,5,k));
      PM(a3,a7,CC(0,3,k),CC(0,7,k));
      PMINPLACE(a1,a3);
      ROTX90<fwd>(a3);

      ROTX90<fwd>(a7);
      PMINPLACE(a5,a7);
      ROTX45<fwd>(a5);
      ROTX135<fwd>(a7);

      PM(a0,a4,CC(0,0,k),CC(0,4,k));
      PM(a2,a6,CC(0,2,k),CC(0,6,k));
      PM(CH(0,k,0),CH(0,k,4),a0+a2,a1);
      PM(CH(0,k,2),CH(0,k,6),a0-a2,a3);
      ROTX90<fwd>(a6);
      PM(CH(0,k,1),CH(0,k,5),a4+a6,a5);
      PM(CH(0,k,3),CH(0,k,7),a4-a6,a7);
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      {
      T a0, a1, a2, a3, a4, a5, a6, a7;
      PM(a1,a5,CC(0,1,k),CC(0,5,k));
      PM(a3,a7,CC(0,3,k),CC(0,7,k));
      PMINPLACE(a1,a3);
      ROTX90<fwd>(a3);

      ROTX90<fwd>(a7);
      PMINPLACE(a5,a7);
      ROTX45<fwd>(a5);
      ROTX135<fwd>(a7);

      PM(a0,a4,CC(0,0,k),CC(0,4,k));
      PM(a2,a6,CC(0,2,k),CC(0,6,k));
      PM(CH(0,k,0),CH(0,k,4),a0+a2,a1);
      PM(CH(0,k,2),CH(0,k,6),a0-a2,a3);
      ROTX90<fwd>(a6);
      PM(CH(0,k,1),CH(0,k,5),a4+a6,a5);
      PM(CH(0,k,3),CH(0,k,7),a4-a6,a7);
      }
      for (size_t i=1; i<ido; ++i)
        {
        T a0, a1, a2, a3, a4, a5, a6, a7;
        PM(a1,a5,CC(i,1,k),CC(i,5,k));
        PM(a3,a7,CC(i,3,k),CC(i,7,k));
        ROTX90<fwd>(a7);
        PMINPLACE(a1,a3);
        ROTX90<fwd>(a3);
        PMINPLACE(a5,a7);
        ROTX45<fwd>(a5);
        ROTX135<fwd>(a7);
        PM(a0,a4,CC(i,0,k),CC(i,4,k));
        PM(a2,a6,CC(i,2,k),CC(i,6,k));
        PMINPLACE(a0,a2);
        CH(i,k,0) = a0+a1;
        special_mul<fwd>(a0-a1,WA(3,i),CH(i,k,4));
        special_mul<fwd>(a2+a3,WA(1,i),CH(i,k,2));
        special_mul<fwd>(a2-a3,WA(5,i),CH(i,k,6));
        ROTX90<fwd>(a6);
        PMINPLACE(a4,a6);
        special_mul<fwd>(a4+a5,WA(0,i),CH(i,k,1));
        special_mul<fwd>(a4-a5,WA(4,i),CH(i,k,5));
        special_mul<fwd>(a6+a7,WA(2,i),CH(i,k,3));
        special_mul<fwd>(a6-a7,WA(6,i),CH(i,k,7));
        }
      }
   }


#define POCKETFFT_PREP11(idx) \
        T t1 = CC(idx,0,k), t2, t3, t4, t5, t6, t7, t8, t9, t10, t11; \
        PM (t2,t11,CC(idx,1,k),CC(idx,10,k)); \
        PM (t3,t10,CC(idx,2,k),CC(idx, 9,k)); \
        PM (t4,t9 ,CC(idx,3,k),CC(idx, 8,k)); \
        PM (t5,t8 ,CC(idx,4,k),CC(idx, 7,k)); \
        PM (t6,t7 ,CC(idx,5,k),CC(idx, 6,k)); \
        CH(idx,k,0).r=t1.r+t2.r+t3.r+t4.r+t5.r+t6.r; \
        CH(idx,k,0).i=t1.i+t2.i+t3.i+t4.i+t5.i+t6.i;

#define POCKETFFT_PARTSTEP11a0(u1,u2,x1,x2,x3,x4,x5,y1,y2,y3,y4,y5,out1,out2) \
        { \
        T ca = t1 + t2*x1 + t3*x2 + t4*x3 + t5*x4 +t6*x5, \
          cb; \
        cb.i=y1*t11.r y2*t10.r y3*t9.r y4*t8.r y5*t7.r; \
        cb.r=-(y1*t11.i y2*t10.i y3*t9.i y4*t8.i y5*t7.i ); \
        PM(out1,out2,ca,cb); \
        }
#define POCKETFFT_PARTSTEP11a(u1,u2,x1,x2,x3,x4,x5,y1,y2,y3,y4,y5) \
        POCKETFFT_PARTSTEP11a0(u1,u2,x1,x2,x3,x4,x5,y1,y2,y3,y4,y5,CH(0,k,u1),CH(0,k,u2))
#define POCKETFFT_PARTSTEP11(u1,u2,x1,x2,x3,x4,x5,y1,y2,y3,y4,y5) \
        { \
        T da,db; \
        POCKETFFT_PARTSTEP11a0(u1,u2,x1,x2,x3,x4,x5,y1,y2,y3,y4,y5,da,db) \
        special_mul<fwd>(da,WA(u1-1,i),CH(i,k,u1)); \
        special_mul<fwd>(db,WA(u2-1,i),CH(i,k,u2)); \
        }

template<bool fwd, typename T> void pass11 (size_t ido, size_t l1,
  const T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa) const
  {
  constexpr T0 tw1r= T0(0.8412535328311811688618116489193677L),
               tw1i= (fwd ? -1 : 1) * T0(0.5406408174555975821076359543186917L),
               tw2r= T0(0.4154150130018864255292741492296232L),
               tw2i= (fwd ? -1 : 1) * T0(0.9096319953545183714117153830790285L),
               tw3r= T0(-0.1423148382732851404437926686163697L),
               tw3i= (fwd ? -1 : 1) * T0(0.9898214418809327323760920377767188L),
               tw4r= T0(-0.6548607339452850640569250724662936L),
               tw4i= (fwd ? -1 : 1) * T0(0.7557495743542582837740358439723444L),
               tw5r= T0(-0.9594929736144973898903680570663277L),
               tw5i= (fwd ? -1 : 1) * T0(0.2817325568414296977114179153466169L);

  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+11*c)]; };
  auto WA = [wa, ido](size_t x, size_t i)
    { return wa[i-1+x*(ido-1)]; };

  if (ido==1)
    for (size_t k=0; k<l1; ++k)
      {
      POCKETFFT_PREP11(0)
      POCKETFFT_PARTSTEP11a(1,10,tw1r,tw2r,tw3r,tw4r,tw5r,+tw1i,+tw2i,+tw3i,+tw4i,+tw5i)
      POCKETFFT_PARTSTEP11a(2, 9,tw2r,tw4r,tw5r,tw3r,tw1r,+tw2i,+tw4i,-tw5i,-tw3i,-tw1i)
      POCKETFFT_PARTSTEP11a(3, 8,tw3r,tw5r,tw2r,tw1r,tw4r,+tw3i,-tw5i,-tw2i,+tw1i,+tw4i)
      POCKETFFT_PARTSTEP11a(4, 7,tw4r,tw3r,tw1r,tw5r,tw2r,+tw4i,-tw3i,+tw1i,+tw5i,-tw2i)
      POCKETFFT_PARTSTEP11a(5, 6,tw5r,tw1r,tw4r,tw2r,tw3r,+tw5i,-tw1i,+tw4i,-tw2i,+tw3i)
      }
  else
    for (size_t k=0; k<l1; ++k)
      {
      {
      POCKETFFT_PREP11(0)
      POCKETFFT_PARTSTEP11a(1,10,tw1r,tw2r,tw3r,tw4r,tw5r,+tw1i,+tw2i,+tw3i,+tw4i,+tw5i)
      POCKETFFT_PARTSTEP11a(2, 9,tw2r,tw4r,tw5r,tw3r,tw1r,+tw2i,+tw4i,-tw5i,-tw3i,-tw1i)
      POCKETFFT_PARTSTEP11a(3, 8,tw3r,tw5r,tw2r,tw1r,tw4r,+tw3i,-tw5i,-tw2i,+tw1i,+tw4i)
      POCKETFFT_PARTSTEP11a(4, 7,tw4r,tw3r,tw1r,tw5r,tw2r,+tw4i,-tw3i,+tw1i,+tw5i,-tw2i)
      POCKETFFT_PARTSTEP11a(5, 6,tw5r,tw1r,tw4r,tw2r,tw3r,+tw5i,-tw1i,+tw4i,-tw2i,+tw3i)
      }
      for (size_t i=1; i<ido; ++i)
        {
        POCKETFFT_PREP11(i)
        POCKETFFT_PARTSTEP11(1,10,tw1r,tw2r,tw3r,tw4r,tw5r,+tw1i,+tw2i,+tw3i,+tw4i,+tw5i)
        POCKETFFT_PARTSTEP11(2, 9,tw2r,tw4r,tw5r,tw3r,tw1r,+tw2i,+tw4i,-tw5i,-tw3i,-tw1i)
        POCKETFFT_PARTSTEP11(3, 8,tw3r,tw5r,tw2r,tw1r,tw4r,+tw3i,-tw5i,-tw2i,+tw1i,+tw4i)
        POCKETFFT_PARTSTEP11(4, 7,tw4r,tw3r,tw1r,tw5r,tw2r,+tw4i,-tw3i,+tw1i,+tw5i,-tw2i)
        POCKETFFT_PARTSTEP11(5, 6,tw5r,tw1r,tw4r,tw2r,tw3r,+tw5i,-tw1i,+tw4i,-tw2i,+tw3i)
        }
      }
  }

#undef POCKETFFT_PARTSTEP11
#undef POCKETFFT_PARTSTEP11a0
#undef POCKETFFT_PARTSTEP11a
#undef POCKETFFT_PREP11

template<bool fwd, typename T> void passg (size_t ido, size_t ip,
  size_t l1, T * POCKETFFT_RESTRICT cc, T * POCKETFFT_RESTRICT ch,
  const cmplx<T0> * POCKETFFT_RESTRICT wa,
  const cmplx<T0> * POCKETFFT_RESTRICT csarr) const
  {
  const size_t cdim=ip;
  size_t ipph = (ip+1)/2;
  size_t idl1 = ido*l1;

  auto CH = [ch,ido,l1](size_t a, size_t b, size_t c) -> T&
    { return ch[a+ido*(b+l1*c)]; };
  auto CC = [cc,ido,cdim](size_t a, size_t b, size_t c) -> const T&
    { return cc[a+ido*(b+cdim*c)]; };
  auto CX = [cc, ido, l1](size_t a, size_t b, size_t c) -> T&
    { return cc[a+ido*(b+l1*c)]; };
  auto CX2 = [cc, idl1](size_t a, size_t b) -> T&
    { return cc[a+idl1*b]; };
  auto CH2 = [ch, idl1](size_t a, size_t b) -> const T&
    { return ch[a+idl1*b]; };

  arr<cmplx<T0>> wal(ip);
  wal[0] = cmplx<T0>(1., 0.);
  for (size_t i=1; i<ip; ++i)
    wal[i]=cmplx<T0>(csarr[i].r,fwd ? -csarr[i].i : csarr[i].i);

  for (size_t k=0; k<l1; ++k)
    for (size_t i=0; i<ido; ++i)
      CH(i,k,0) = CC(i,0,k);
  for (size_t j=1, jc=ip-1; j<ipph; ++j, --jc)
    for (size_t k=0; k<l1; ++k)
      for (size_t i=0; i<ido; ++i)
        PM(CH(i,k,j),CH(i,k,jc),CC(i,j,k),CC(i,jc,k));
  for (size_t k=0; k<l1; ++k)
    for (size_t i=0; i<ido; ++i)
      {
      T tmp = CH(i,k,0);
      for (size_t j=1; j<ipph; ++j)
        tmp+=CH(i,k,j);
      CX(i,k,0) = tmp;
      }
  for (size_t l=1, lc=ip-1; l<ipph; ++l, --lc)
    {
    // j=0
    for (size_t ik=0; ik<idl1; ++ik)
      {
      CX2(ik,l).r = CH2(ik,0).r+wal[l].r*CH2(ik,1).r+wal[2*l].r*CH2(ik,2).r;
      CX2(ik,l).i = CH2(ik,0).i+wal[l].r*CH2(ik,1).i+wal[2*l].r*CH2(ik,2).i;
      CX2(ik,lc).r=-wal[l].i*CH2(ik,ip-1).i-wal[2*l].i*CH2(ik,ip-2).i;
      CX2(ik,lc).i=wal[l].i*CH2(ik,ip-1).r+wal[2*l].i*CH2(ik,ip-2).r;
      }

    size_t iwal=2*l;
    size_t j=3, jc=ip-3;
    for (; j<ipph-1; j+=2, jc-=2)
      {
      iwal+=l; if (iwal>ip) iwal-=ip;
      cmplx<T0> xwal=wal[iwal];
      iwal+=l; if (iwal>ip) iwal-=ip;
      cmplx<T0> xwal2=wal[iwal];
      for (size_t ik=0; ik<idl1; ++ik)
        {
        CX2(ik,l).r += CH2(ik,j).r*xwal.r+CH2(ik,j+1).r*xwal2.r;
        CX2(ik,l).i += CH2(ik,j).i*xwal.r+CH2(ik,j+1).i*xwal2.r;
        CX2(ik,lc).r -= CH2(ik,jc).i*xwal.i+CH2(ik,jc-1).i*xwal2.i;
        CX2(ik,lc).i += CH2(ik,jc).r*xwal.i+CH2(ik,jc-1).r*xwal2.i;
        }
      }
    for (; j<ipph; ++j, --jc)
      {
      iwal+=l; if (iwal>ip) iwal-=ip;
      cmplx<T0> xwal=wal[iwal];
      for (size_t ik=0; ik<idl1; ++ik)
        {
        CX2(ik,l).r += CH2(ik,j).r*xwal.r;
        CX2(ik,l).i += CH2(ik,j).i*xwal.r;
        CX2(ik,lc).r -= CH2(ik,jc).i*xwal.i;
        CX2(ik,lc).i += CH2(ik,jc).r*xwal.i;
        }
      }
    }

  // shuffling and twiddling
  if (ido==1)
    for (size_t j=1, jc=ip-1; j<ipph; ++j, --jc)
      for (size_t ik=0; ik<idl1; ++ik)
        {
        T t1=CX2(ik,j), t2=CX2(ik,jc);
        PM(CX2(ik,j),CX2(ik,jc),t1,t2);
        }
  else
    {
    for (size_t j=1, jc=ip-1; j<ipph; ++j,--jc)
      for (size_t k=0; k<l1; ++k)
        {
        T t1=CX(0,k,j), t2=CX(0,k,jc);
        PM(CX(0,k,j),CX(0,k,jc),t1,t2);
        for (size_t i=1; i<ido; ++i)
          {
          T x1, x2;
          PM(x1,x2,CX(i,k,j),CX(i,k,jc));
          size_t idij=(j-1)*(ido-1)+i-1;
          special_mul<fwd>(x1,wa[idij],CX(i,k,j));
          idij=(jc-1)*(ido-1)+i-1;
          special_mul<fwd>(x2,wa[idij],CX(i,k,jc));
          }
        }
    }
  }

template<bool fwd, typename T> void pass_all(T c[], T0 fct) const
  {
  if (length==1) { c[0]*=fct; return; }
  size_t l1=1;
  arr<T> ch(length);
  T *p1=c, *p2=ch.data();

  for(size_t k1=0; k1<fact.size(); k1++)
    {
    size_t ip=fact[k1].fct;
    size_t l2=ip*l1;
    size_t ido = length/l2;
    if     (ip==4)
      pass4<fwd> (ido, l1, p1, p2, fact[k1].tw);
    else if(ip==8)
      pass8<fwd>(ido, l1, p1, p2, fact[k1].tw);
    else if(ip==2)
      pass2<fwd>(ido, l1, p1, p2, fact[k1].tw);
    else if(ip==3)
      pass3<fwd> (ido, l1, p1, p2, fact[k1].tw);
    else if(ip==5)
      pass5<fwd> (ido, l1, p1, p2, fact[k1].tw);
    else if(ip==7)
      pass7<fwd> (ido, l1, p1, p2, fact[k1].tw);
    else if(ip==11)
      pass11<fwd> (ido, l1, p1, p2, fact[k1].tw);
    else
      {
      passg<fwd>(ido, ip, l1, p1, p2, fact[k1].tw, fact[k1].tws);
      std::swap(p1,p2);
      }
    std::swap(p1,p2);
    l1=l2;
    }
  if (p1!=c)
    {
    if (fct!=1.)
      for (size_t i=0; i<length; ++i)
        c[i] = ch[i]*fct;
    else
      std::copy_n (p1, length, c);
    }
  else
    if (fct!=1.)
      for (size_t i=0; i<length; ++i)
        c[i] *= fct;
  }

  public:
    template<typename T> void exec(T c[], T0 fct, bool fwd) const
      { fwd ? pass_all<true>(c, fct) : pass_all<false>(c, fct); }

  private:
    POCKETFFT_NOINLINE void factorize()
      {
      size_t len=length;
      while ((len&7)==0)
        { add_factor(8); len>>=3; }
      while ((len&3)==0)
        { add_factor(4); len>>=2; }
      if ((len&1)==0)
        {
        len>>=1;
        // factor 2 should be at the front of the factor list
        add_factor(2);
        std::swap(fact[0].fct, fact.back().fct);
        }
      for (size_t divisor=3; divisor*divisor<=len; divisor+=2)
        while ((len%divisor)==0)
          {
          add_factor(divisor);
          len/=divisor;
          }
      if (len>1) add_factor(len);
      }

    size_t twsize() const
      {
      size_t twsize=0, l1=1;
      for (size_t k=0; k<fact.size(); ++k)
        {
        size_t ip=fact[k].fct, ido= length/(l1*ip);
        twsize+=(ip-1)*(ido-1);
        if (ip>11)
          twsize+=ip;
        l1*=ip;
        }
      return twsize;
      }

    void comp_twiddle()
      {
      sincos_2pibyn<T0> twiddle(length);
      size_t l1=1;
      size_t memofs=0;
      for (size_t k=0; k<fact.size(); ++k)
        {
        size_t ip=fact[k].fct, ido=length/(l1*ip);
        fact[k].tw=mem.data()+memofs;
        memofs+=(ip-1)*(ido-1);
        for (size_t j=1; j<ip; ++j)
          for (size_t i=1; i<ido; ++i)
            fact[k].tw[(j-1)*(ido-1)+i-1] = twiddle[j*l1*i];
        if (ip>11)
          {
          fact[k].tws=mem.data()+memofs;
      memofs+=ip;
          for (size_t j=0; j<ip; ++j)
            fact[k].tws[j] = twiddle[j*l1*ido];
          }
        l1*=ip;
        }
      }

  public:
    POCKETFFT_NOINLINE cfftp(size_t length_)
      : length(length_)
      {
      if (length==0) throw std::runtime_error("zero-length FFT requested");
      if (length==1) return;
      factorize();
      mem.resize(twsize());
      comp_twiddle();
      }
  };

//
// complex Bluestein transforms
//

template<typename T0> class fftblue
  {
  private:
    size_t n, n2;
    cfftp<T0> plan;
    arr<cmplx<T0>> mem;
    cmplx<T0> *bk, *bkf;

    template<bool fwd, typename T> void fft(cmplx<T> c[], T0 fct) const
      {
      arr<cmplx<T>> akf(n2);

      /* initialize a_k and FFT it */
      for (size_t m=0; m<n; ++m)
        special_mul<fwd>(c[m],bk[m],akf[m]);
      auto zero = akf[0]*T0(0);
      for (size_t m=n; m<n2; ++m)
        akf[m]=zero;

      plan.exec (akf.data(),1.,true);

      /* do the convolution */
      akf[0] = akf[0].template special_mul<!fwd>(bkf[0]);
      for (size_t m=1; m<(n2+1)/2; ++m)
        {
        akf[m] = akf[m].template special_mul<!fwd>(bkf[m]);
        akf[n2-m] = akf[n2-m].template special_mul<!fwd>(bkf[m]);
        }
      if ((n2&1)==0)
        akf[n2/2] = akf[n2/2].template special_mul<!fwd>(bkf[n2/2]);

      /* inverse FFT */
      plan.exec (akf.data(),1.,false);

      /* multiply by b_k */
      for (size_t m=0; m<n; ++m)
        c[m] = akf[m].template special_mul<fwd>(bk[m])*fct;
      }

  public:
    POCKETFFT_NOINLINE fftblue(size_t length)
      : n(length), n2(util::good_size_cmplx(n*2-1)), plan(n2), mem(n+n2/2+1),
        bk(mem.data()), bkf(mem.data()+n)
      {
      /* initialize b_k */
      sincos_2pibyn<T0> tmp(2*n);
      bk[0].Set(1, 0);

      size_t coeff=0;
      for (size_t m=1; m<n; ++m)
        {
        coeff+=2*m-1;
        if (coeff>=2*n) coeff-=2*n;
        bk[m] = tmp[coeff];
        }

      /* initialize the zero-padded, Fourier transformed b_k. Add normalisation. */
      arr<cmplx<T0>> tbkf(n2);
      T0 xn2 = T0(1)/T0(n2);
      tbkf[0] = bk[0]*xn2;
      for (size_t m=1; m<n; ++m)
        tbkf[m] = tbkf[n2-m] = bk[m]*xn2;
      for (size_t m=n;m<=(n2-n);++m)
        tbkf[m].Set(0.,0.);
      plan.exec(tbkf.data(),1.,true);
      for (size_t i=0; i<n2/2+1; ++i)
        bkf[i] = tbkf[i];
      }

    template<typename T> void exec(cmplx<T> c[], T0 fct, bool fwd) const
      { fwd ? fft<true>(c,fct) : fft<false>(c,fct); }

  };

//
// flexible (FFTPACK/Bluestein) complex 1D transform
//

template<typename T0> class pocketfft_c
  {
  private:
    std::unique_ptr<cfftp<T0>> packplan;
    std::unique_ptr<fftblue<T0>> blueplan;
    size_t len;

  public:
    POCKETFFT_NOINLINE pocketfft_c(size_t length)
      : len(length)
      {
      if (length==0) throw std::runtime_error("zero-length FFT requested");
      size_t tmp = (length<50) ? 0 : util::largest_prime_factor(length);
      if (tmp*tmp <= length)
        {
        packplan=std::unique_ptr<cfftp<T0>>(new cfftp<T0>(length));
        return;
        }
      double comp1 = util::cost_guess(length);
      double comp2 = 2*util::cost_guess(util::good_size_cmplx(2*length-1));
      comp2*=1.5; /* fudge factor that appears to give good overall performance */
      if (comp2<comp1) // use Bluestein
        blueplan=std::unique_ptr<fftblue<T0>>(new fftblue<T0>(length));
      else
        packplan=std::unique_ptr<cfftp<T0>>(new cfftp<T0>(length));
      }

    template<typename T> POCKETFFT_NOINLINE void exec(cmplx<T> c[], T0 fct, bool fwd) const
      { packplan ? packplan->exec(c,fct,fwd) : blueplan->exec(c,fct,fwd); }

    size_t length() const { return len; }
  };


//
// multi-D infrastructure
//

template<typename T> std::shared_ptr<T> get_plan(size_t length)
  {
#if POCKETFFT_CACHE_SIZE==0
  return std::make_shared<T>(length);
#else
  constexpr size_t nmax=POCKETFFT_CACHE_SIZE;
  static std::array<std::shared_ptr<T>, nmax> cache;
  static std::array<size_t, nmax> last_access{{0}};
  static size_t access_counter = 0;
  static std::mutex mut;

  auto find_in_cache = [&]() -> std::shared_ptr<T>
    {
    for (size_t i=0; i<nmax; ++i)
      if (cache[i] && (cache[i]->length()==length))
        {
        // no need to update if this is already the most recent entry
        if (last_access[i]!=access_counter)
          {
          last_access[i] = ++access_counter;
          // Guard against overflow
          if (access_counter == 0)
            last_access.fill(0);
          }
        return cache[i];
        }

    return nullptr;
    };

  {
  std::lock_guard<std::mutex> lock(mut);
  auto p = find_in_cache();
  if (p) return p;
  }
  auto plan = std::make_shared<T>(length);
  {
  std::lock_guard<std::mutex> lock(mut);
  auto p = find_in_cache();
  if (p) return p;

  size_t lru = 0;
  for (size_t i=1; i<nmax; ++i)
    if (last_access[i] < last_access[lru])
      lru = i;

  cache[lru] = plan;
  last_access[lru] = ++access_counter;
  }
  return plan;
#endif
  }

class arr_info
  {
  protected:
    shape_t shp;
    stride_t str;

  public:
    arr_info(const shape_t &shape_, const stride_t &stride_)
      : shp(shape_), str(stride_) {}
    size_t ndim() const { return shp.size(); }
    size_t size() const { return util::prod(shp); }
    const shape_t &shape() const { return shp; }
    size_t shape(size_t i) const { return shp[i]; }
    const stride_t &stride() const { return str; }
    const ptrdiff_t &stride(size_t i) const { return str[i]; }
  };

template<typename T> class cndarr: public arr_info
  {
  protected:
    const char *d;

  public:
    cndarr(const void *data_, const shape_t &shape_, const stride_t &stride_)
      : arr_info(shape_, stride_),
        d(reinterpret_cast<const char *>(data_)) {}
    const T &operator[](ptrdiff_t ofs) const
      { return *reinterpret_cast<const T *>(d+ofs); }
  };

template<typename T> class ndarr: public cndarr<T>
  {
  public:
    ndarr(void *data_, const shape_t &shape_, const stride_t &stride_)
      : cndarr<T>::cndarr(const_cast<const void *>(data_), shape_, stride_)
      {}
    T &operator[](ptrdiff_t ofs)
      { return *reinterpret_cast<T *>(const_cast<char *>(cndarr<T>::d+ofs)); }
  };

template<size_t N> class multi_iter
  {
  private:
    shape_t pos;
    const arr_info &iarr, &oarr;
    ptrdiff_t p_ii, p_i[N], str_i, p_oi, p_o[N], str_o;
    size_t idim, rem;

    void advance_i()
      {
      for (int i_=int(pos.size())-1; i_>=0; --i_)
        {
        auto i = size_t(i_);
        if (i==idim) continue;
        p_ii += iarr.stride(i);
        p_oi += oarr.stride(i);
        if (++pos[i] < iarr.shape(i))
          return;
        pos[i] = 0;
        p_ii -= ptrdiff_t(iarr.shape(i))*iarr.stride(i);
        p_oi -= ptrdiff_t(oarr.shape(i))*oarr.stride(i);
        }
      }

  public:
    multi_iter(const arr_info &iarr_, const arr_info &oarr_, size_t idim_)
      : pos(iarr_.ndim(), 0), iarr(iarr_), oarr(oarr_), p_ii(0),
        str_i(iarr.stride(idim_)), p_oi(0), str_o(oarr.stride(idim_)),
        idim(idim_), rem(iarr.size()/iarr.shape(idim))
      {
      auto nshares = threading::num_threads();
      if (nshares==1) return;
      if (nshares==0) throw std::runtime_error("can't run with zero threads");
      auto myshare = threading::thread_id();
      if (myshare>=nshares) throw std::runtime_error("impossible share requested");
      size_t nbase = rem/nshares;
      size_t additional = rem%nshares;
      size_t lo = myshare*nbase + ((myshare<additional) ? myshare : additional);
      size_t hi = lo+nbase+(myshare<additional);
      size_t todo = hi-lo;

      size_t chunk = rem;
      for (size_t i=0; i<pos.size(); ++i)
        {
        if (i==idim) continue;
        chunk /= iarr.shape(i);
        size_t n_advance = lo/chunk;
        pos[i] += n_advance;
        p_ii += ptrdiff_t(n_advance)*iarr.stride(i);
        p_oi += ptrdiff_t(n_advance)*oarr.stride(i);
        lo -= n_advance*chunk;
        }
      rem = todo;
      }
    void advance(size_t n)
      {
      if (rem<n) throw std::runtime_error("underrun");
      for (size_t i=0; i<n; ++i)
        {
        p_i[i] = p_ii;
        p_o[i] = p_oi;
        advance_i();
        }
      rem -= n;
      }
    ptrdiff_t iofs(size_t i) const { return p_i[0] + ptrdiff_t(i)*str_i; }
    ptrdiff_t iofs(size_t j, size_t i) const { return p_i[j] + ptrdiff_t(i)*str_i; }
    ptrdiff_t oofs(size_t i) const { return p_o[0] + ptrdiff_t(i)*str_o; }
    ptrdiff_t oofs(size_t j, size_t i) const { return p_o[j] + ptrdiff_t(i)*str_o; }
    size_t length_in() const { return iarr.shape(idim); }
    size_t length_out() const { return oarr.shape(idim); }
    ptrdiff_t stride_in() const { return str_i; }
    ptrdiff_t stride_out() const { return str_o; }
    size_t remaining() const { return rem; }
  };

template<typename T> struct VTYPE {};
template <typename T> using vtype_t = typename VTYPE<T>::type;

#ifndef POCKETFFT_NO_VECTORS
template<> struct VTYPE<float>
  {
  using type = float __attribute__ ((vector_size (VLEN<float>::val*sizeof(float))));
  };
template<> struct VTYPE<double>
  {
  using type = double __attribute__ ((vector_size (VLEN<double>::val*sizeof(double))));
  };
template<> struct VTYPE<long double>
  {
  using type = long double __attribute__ ((vector_size (VLEN<long double>::val*sizeof(long double))));
  };
#endif

template<typename T> arr<char> alloc_tmp(const shape_t &shape,
  size_t axsize, size_t elemsize)
  {
  auto othersize = util::prod(shape)/axsize;
  auto tmpsize = axsize*((othersize>=VLEN<T>::val) ? VLEN<T>::val : 1);
  return arr<char>(tmpsize*elemsize);
  }
template<typename T> arr<char> alloc_tmp(const shape_t &shape,
  const shape_t &axes, size_t elemsize)
  {
  size_t fullsize=util::prod(shape);
  size_t tmpsize=0;
  for (size_t i=0; i<axes.size(); ++i)
    {
    auto axsize = shape[axes[i]];
    auto othersize = fullsize/axsize;
    auto sz = axsize*((othersize>=VLEN<T>::val) ? VLEN<T>::val : 1);
    if (sz>tmpsize) tmpsize=sz;
    }
  return arr<char>(tmpsize*elemsize);
  }

template <typename T, size_t vlen> void copy_input(const multi_iter<vlen> &it,
  const cndarr<cmplx<T>> &src, cmplx<vtype_t<T>> *POCKETFFT_RESTRICT dst)
  {
  for (size_t i=0; i<it.length_in(); ++i)
    for (size_t j=0; j<vlen; ++j)
      {
      dst[i].r[j] = src[it.iofs(j,i)].r;
      dst[i].i[j] = src[it.iofs(j,i)].i;
      }
  }

template <typename T, size_t vlen> void copy_input(const multi_iter<vlen> &it,
  const cndarr<T> &src, T *POCKETFFT_RESTRICT dst)
  {
  if (dst == &src[it.iofs(0)]) return;  // in-place
  for (size_t i=0; i<it.length_in(); ++i)
    dst[i] = src[it.iofs(i)];
  }

template<typename T, size_t vlen> void copy_output(const multi_iter<vlen> &it,
  const cmplx<vtype_t<T>> *POCKETFFT_RESTRICT src, ndarr<cmplx<T>> &dst)
  {
  for (size_t i=0; i<it.length_out(); ++i)
    for (size_t j=0; j<vlen; ++j)
      dst[it.oofs(j,i)].Set(src[i].r[j],src[i].i[j]);
  }

template<typename T, size_t vlen> void copy_output(const multi_iter<vlen> &it,
  const T *POCKETFFT_RESTRICT src, ndarr<T> &dst)
  {
  if (src == &dst[it.oofs(0)]) return;  // in-place
  for (size_t i=0; i<it.length_out(); ++i)
    dst[it.oofs(i)] = src[i];
  }

template <typename T> struct add_vec { using type = vtype_t<T>; };
template <typename T> struct add_vec<cmplx<T>>
  { using type = cmplx<vtype_t<T>>; };
template <typename T> using add_vec_t = typename add_vec<T>::type;

template<typename Tplan, typename T, typename T0, typename Exec>
POCKETFFT_NOINLINE void general_nd(const cndarr<T> &in, ndarr<T> &out,
  const shape_t &axes, T0 fct, size_t nthreads, const Exec & exec,
  const bool allow_inplace=true)
  {
  std::shared_ptr<Tplan> plan;

  for (size_t iax=0; iax<axes.size(); ++iax)
    {
    size_t len=in.shape(axes[iax]);
    if ((!plan) || (len!=plan->length()))
      plan = get_plan<Tplan>(len);

    threading::thread_map(
      util::thread_count(nthreads, in.shape(), axes[iax], VLEN<T>::val),
      [&] {
        constexpr auto vlen = VLEN<T0>::val;
        auto storage = alloc_tmp<T0>(in.shape(), len, sizeof(T));
        const auto &tin(iax==0? in : out);
        multi_iter<vlen> it(tin, out, axes[iax]);
#ifndef POCKETFFT_NO_VECTORS
        if (vlen>1)
          while (it.remaining()>=vlen)
            {
            it.advance(vlen);
            auto tdatav = reinterpret_cast<add_vec_t<T> *>(storage.data());
            exec(it, tin, out, tdatav, *plan, fct);
            }
#endif
        while (it.remaining()>0)
          {
          it.advance(1);
          auto buf = allow_inplace && it.stride_out() == sizeof(T) ?
            &out[it.oofs(0)] : reinterpret_cast<T *>(storage.data());
          exec(it, tin, out, buf, *plan, fct);
          }
      });  // end of parallel region
    fct = T0(1); // factor has been applied, use 1 for remaining axes
    }
  }

struct ExecC2C
  {
  bool forward;

  template <typename T0, typename T, size_t vlen> void operator () (
    const multi_iter<vlen> &it, const cndarr<cmplx<T0>> &in,
    ndarr<cmplx<T0>> &out, T * buf, const pocketfft_c<T0> &plan, T0 fct) const
    {
    copy_input(it, in, buf);
    plan.exec(buf, fct, forward);
    copy_output(it, buf, out);
    }
  };

template<typename T> void c2c(const shape_t &shape, const stride_t &stride_in,
  const stride_t &stride_out, const shape_t &axes, bool forward,
  const std::complex<T> *data_in, std::complex<T> *data_out, T fct,
  size_t nthreads=1)
  {
  if (util::prod(shape)==0) return;
  util::sanity_check(shape, stride_in, stride_out, data_in==data_out, axes);
  cndarr<cmplx<T>> ain(data_in, shape, stride_in);
  ndarr<cmplx<T>> aout(data_out, shape, stride_out);
  general_nd<pocketfft_c<T>>(ain, aout, axes, fct, nthreads, ExecC2C{forward});
  }

} // namespace detail

using detail::FORWARD;
using detail::BACKWARD;
using detail::shape_t;
using detail::stride_t;
using detail::c2c;

} // namespace pocketfft

#undef POCKETFFT_NOINLINE
#undef POCKETFFT_RESTRICT

#endif // POCKETFFT_HDRONLY_H