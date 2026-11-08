import math
import cmath

def fft(a):
    n = len(a)
    if n <= 1:
        return a
    even = fft(a[0::2])
    odd = fft(a[1::2])
    T = [cmath.exp(-2j * cmath.pi * k / n) * odd[k] for k in range(n // 2)]
    return [even[k] + T[k] for k in range(n // 2)] + \
           [even[k] - T[k] for k in range(n // 2)]

def ifft(a):
    n = len(a)
    a = [x.conjugate() for x in a]
    result = fft(a)
    return [x.conjugate() / n for x in result]

if __name__ == "__main__":
    signal = [1, 1, 1, 1, 0, 0, 0, 0]
    transformed = fft(signal)
    restored = ifft(transformed)
    print("Original:", signal)
    print("FFT Magnitudes:", [round(abs(x), 4) for x in transformed])
    print("Restored:", [round(x.real, 4) for x in restored])
    print("Test passed:", all(abs(signal[i] - restored[i].real) < 1e-9 for i in range(len(signal))))
