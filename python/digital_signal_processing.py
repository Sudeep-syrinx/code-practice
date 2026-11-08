"""
Digital Signal Processing and Image Compression.
Includes FFT, IFFT, DCT, and a basic JPEG-like compressor.
"""

import math
import cmath

class Complex:
    def __init__(self, real, imag=0.0):
        self.real = real
        self.imag = imag

    def __add__(self, other):
        return Complex(self.real + other.real, self.imag + other.imag)

    def __sub__(self, other):
        return Complex(self.real - other.real, self.imag - other.imag)

    def __mul__(self, other):
        return Complex(self.real * other.real - self.imag * other.imag,
                       self.real * other.imag + self.imag * other.real)

    def __truediv__(self, scalar):
        return Complex(self.real / scalar, self.imag / scalar)

    def magnitude(self):
        return math.sqrt(self.real**2 + self.imag**2)

    def __repr__(self):
        return f"({self.real:.2f} + {self.imag:.2f}j)"

class SignalProcessing:
    @staticmethod
    def fft(signal):
        n = len(signal)
        if n <= 1:
            return signal
        even = SignalProcessing.fft([signal[i] for i in range(0, n, 2)])
        odd = SignalProcessing.fft([signal[i] for i in range(1, n, 2)])
        
        t = [Complex(math.cos(-2 * math.pi * k / n), math.sin(-2 * math.pi * k / n)) * odd[k] for k in range(n // 2)]
        return [even[k] + t[k] for k in range(n // 2)] + [even[k] - t[k] for k in range(n // 2)]

    @staticmethod
    def ifft(signal):
        n = len(signal)
        conjugated = [Complex(s.real, -s.imag) for s in signal]
        result = SignalProcessing.fft(conjugated)
        return [Complex(s.real / n, -s.imag / n) for s in result]

    @staticmethod
    def dct(signal):
        n = len(signal)
        result = []
        for k in range(n):
            sum_val = 0.0
            for i in range(n):
                sum_val += signal[i] * math.cos(math.pi * k * (2 * i + 1) / (2 * n))
            if k == 0:
                result.append(sum_val / math.sqrt(n))
            else:
                result.append(sum_val * math.sqrt(2 / n))
        return result

    @staticmethod
    def idct(dct_coeffs):
        n = len(dct_coeffs)
        result = []
        for i in range(n):
            sum_val = 0.0
            for k in range(n):
                if k == 0:
                    sum_val += dct_coeffs[k] / math.sqrt(n)
                else:
                    sum_val += dct_coeffs[k] * math.sqrt(2 / n) * math.cos(math.pi * k * (2 * i + 1) / (2 * n))
            result.append(sum_val)
        return result

class JPEGCompressor:
    def __init__(self, block_size=8):
        self.block_size = block_size
        self.quantization_matrix = [
            [16, 11, 10, 16, 24, 40, 51, 61],
            [12, 12, 14, 19, 26, 58, 60, 55],
            [14, 13, 16, 24, 40, 57, 69, 56],
            [14, 17, 22, 29, 51, 87, 80, 62],
            [18, 22, 37, 56, 68, 109, 103, 77],
            [24, 35, 55, 64, 81, 104, 113, 92],
            [49, 64, 78, 87, 103, 121, 120, 101],
            [72, 92, 95, 98, 112, 100, 103, 99]
        ]

    def compress_block(self, block):
        dct_block = [SignalProcessing.dct(row) for row in block]
        quantized = []
        for i in range(self.block_size):
            q_row = []
            for j in range(self.block_size):
                q_row.append(round(dct_block[i][j] / self.quantization_matrix[i][j]))
            quantized.append(q_row)
        return quantized

if __name__ == "__main__":
    print("Testing Digital Signal Processing...")
    signal = [Complex(math.sin(2 * math.pi * i / 8)) for i in range(8)]
    fft_result = SignalProcessing.fft(signal)
    ifft_result = SignalProcessing.ifft(fft_result)
    
    print("Original Signal:", [f"{s.real:.2f}" for s in signal])
    print("FFT Result:", [f"{s.magnitude():.2f}" for s in fft_result])
    print("IFFT Recovered:", [f"{s.real:.2f}" for s in ifft_result])
    
    print("Testing JPEG Compression Block...")
    jpeg = JPEGCompressor()
    test_block = [
        [52, 55, 61, 66, 70, 61, 64, 73],
        [63, 59, 55, 90, 109, 85, 69, 72],
        [62, 59, 68, 113, 144, 104, 66, 73],
        [63, 58, 71, 122, 154, 106, 70, 69],
        [67, 61, 68, 104, 126, 88, 68, 70],
        [79, 65, 60, 70, 77, 68, 58, 75],
        [85, 71, 64, 59, 55, 61, 65, 83],
        [87, 79, 69, 68, 65, 76, 78, 94]
    ]
    compressed = jpeg.compress_block(test_block)
    print("Compressed Block Sample:", compressed[0])
    print("DSP and Compression complete.")
