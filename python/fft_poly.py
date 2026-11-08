import cmath
import math

def fft(a, invert=False):
    n = len(a)
    if n == 1:
        return a
    a0 = fft(a[0::2], invert)
    a1 = fft(a[1::2], invert)
    ang = 2 * math.pi / n * (-1 if invert else 1)
    w, wn = 1, cmath.exp(complex(0, ang))
    y = [0] * n
    for i in range(n // 2):
        y[i] = a0[i] + w * a1[i]
        y[i + n // 2] = a0[i] - w * a1[i]
        if invert:
            y[i] /= 2
            y[i + n // 2] /= 2
        w *= wn
    return y

def multiply_poly(a, b):
    # a, b are coefficient lists
    n = 1
    while n < len(a) + len(b):
        n <<= 1
    fa = a + [0] * (n - len(a))
    fb = b + [0] * (n - len(b))
    fa = fft([complex(x) for x in fa])
    fb = fft([complex(x) for x in fb])
    fc = [fa[i] * fb[i] for i in range(n)]
    fc = fft(fc, invert=True)
    result = [round(x.real) for x in fc]
    # trim trailing zeros
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result

def poly_eval(coeffs, x):
    result = 0
    for c in reversed(coeffs):
        result = result * x + c
    return result

def add_poly(a, b):
    n = max(len(a), len(b))
    a = a + [0] * (n - len(a))
    b = b + [0] * (n - len(b))
    return [a[i] + b[i] for i in range(n)]

def naive_multiply(a, b):
    result = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            result[i + j] += x * y
    return result

if __name__ == "__main__":
    # (1 + 2x + 3x^2) * (2 + x) = 2 + 5x + 8x^2 + 3x^3
    a = [1, 2, 3]
    b = [2, 1]
    print("A(x) =", a)
    print("B(x) =", b)
    print("FFT multiply   :", multiply_poly(a, b))
    print("Naive multiply :", naive_multiply(a, b))
    print("Agree          :", multiply_poly(a, b) == naive_multiply(a, b))
    print()

    # larger
    p = list(range(1, 9))
    q = list(range(1, 6))
    fft_r = multiply_poly(p, q)
    naive_r = naive_multiply(p, q)
    print("Degree 7 * degree 4")
    print("FFT  :", fft_r)
    print("Naive:", naive_r)
    print("Agree:", fft_r == naive_r)
    print()

    # evaluate
    coeffs = [1, 0, 1]  # 1 + x^2
    print("P(x) = 1 + x^2")
    for x in range(5):
        print(f"  P({x}) = {poly_eval(coeffs, x)}")
    print()

    # FFT round-trip
    data = [1, 2, 3, 4, 0, 0, 0, 0]
    transformed = fft([complex(x) for x in data])
    recovered = fft(transformed, invert=True)
    recovered = [round(x.real) for x in recovered]
    print("FFT round-trip :", recovered[:4], "original", data[:4])
    print("Match          :", recovered[:4] == data[:4])
    print()

    # stress
    import random
    random.seed(3)
    big_a = [random.randint(-10, 10) for _ in range(32)]
    big_b = [random.randint(-10, 10) for _ in range(16)]
    r1 = multiply_poly(big_a, big_b)
    r2 = naive_multiply(big_a, big_b)
    print("Random 32 x 16 agree:", r1 == r2)
