import math


def compare_strings(a, b):
    if len(a) != len(b):
        return -1 if len(a) < len(b) else 1
    return (a > b) - (a < b)


def add_strings(a, b):
    result = []
    carry = 0
    i, j = len(a) - 1, len(b) - 1
    while i >= 0 or j >= 0 or carry:
        total = carry
        if i >= 0:
            total += int(a[i])
            i -= 1
        if j >= 0:
            total += int(b[j])
            j -= 1
        result.append(str(total % 10))
        carry = total // 10
    return "".join(reversed(result))


def subtract_strings(a, b):
    if compare_strings(a, b) < 0:
        return "-" + subtract_strings(b, a)
    result = []
    borrow = 0
    i, j = len(a) - 1, len(b) - 1
    while i >= 0:
        digit = int(a[i]) - borrow - (int(b[j]) if j >= 0 else 0)
        if digit < 0:
            digit += 10
            borrow = 1
        else:
            borrow = 0
        result.append(str(digit))
        i -= 1
        j -= 1
    text = "".join(reversed(result)).lstrip("0")
    return text or "0"


def multiply_strings(a, b):
    if a == "0" or b == "0":
        return "0"
    digits = [0] * (len(a) + len(b))
    for i in range(len(a) - 1, -1, -1):
        for j in range(len(b) - 1, -1, -1):
            product = int(a[i]) * int(b[j])
            total = product + digits[i + j + 1]
            digits[i + j + 1] = total % 10
            digits[i + j] += total // 10
    text = "".join(map(str, digits)).lstrip("0")
    return text or "0"


def power_string(base, exp):
    result = "1"
    while exp:
        if exp & 1:
            result = multiply_strings(result, base)
        base = multiply_strings(base, base)
        exp >>= 1
    return result


def factorial_string(n):
    result = "1"
    for i in range(2, n + 1):
        result = multiply_strings(result, str(i))
    return result


def fibonacci_string(n):
    a, b = "0", "1"
    for _ in range(n):
        a, b = b, add_strings(a, b)
    return a


def digit_sum_string(text):
    return sum(int(d) for d in text)


def mod_pow(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result


def extended_gcd(a, b):
    if b == 0:
        return a, 1, 0
    g, x, y = extended_gcd(b, a % b)
    return g, y, x - (a // b) * y


def mod_inverse(a, m):
    g, x, _ = extended_gcd(a, m)
    if g != 1:
        raise ValueError("No inverse exists")
    return x % m


def miller_rabin(n):
    if n < 2:
        return False
    bases = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    for p in bases:
        if n % p == 0:
            return n == p
    d, r = n - 1, 0
    while d % 2 == 0:
        d //= 2
        r += 1
    for a in bases:
        x = mod_pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def crt(remainders, moduli):
    product = 1
    for m in moduli:
        product *= m
    total = 0
    for r, m in zip(remainders, moduli):
        partial = product // m
        total += r * mod_inverse(partial, m) * partial
    return total % product


def isqrt(n):
    if n < 2:
        return n
    x = n
    y = (x + 1) // 2
    while y < x:
        x = y
        y = (x + n // x) // 2
    return x


if __name__ == "__main__":
    a, b = "98765432109876543210", "12345678901234567890"
    print("Add            :", add_strings(a, b))
    print("Add matches    :", add_strings(a, b) == str(int(a) + int(b)))
    print("Subtract       :", subtract_strings(a, b))
    print("Negative       :", subtract_strings(b, a))
    print("Sub matches    :", subtract_strings(b, a) == str(int(b) - int(a)))
    print("Multiply       :", multiply_strings(a, b))
    print("Mul matches    :", multiply_strings(a, b) == str(int(a) * int(b)))

    print()
    f100 = factorial_string(100)
    print("100! digits    :", len(f100))
    print("100! digit sum :", digit_sum_string(f100))
    print("100! matches   :", f100 == str(math.factorial(100)))
    p = power_string("2", 1000)
    print("2^1000 digits  :", len(p))
    print("2^1000 sum     :", digit_sum_string(p))
    print("2^1000 matches :", p == str(2 ** 1000))
    print("Fib(300)       :", fibonacci_string(300))
    x, y = 0, 1
    for _ in range(300):
        x, y = y, x + y
    print("Fib matches    :", fibonacci_string(300) == str(x))

    print()
    print("mod_pow        :", mod_pow(7, 128, 13), pow(7, 128, 13))
    print("Large mod_pow  :", mod_pow(123456789, 987654321, 1000000007) == pow(123456789, 987654321, 1000000007))
    print("gcd(240, 46)   :", extended_gcd(240, 46))
    print("Inverse 3 mod 11:", mod_inverse(3, 11))
    print("CRT            :", crt([2, 3, 2], [3, 5, 7]))
    print("isqrt          :", isqrt(10 ** 40), isqrt(99), isqrt(10 ** 20 + 1))
    print("isqrt matches  :", isqrt(10 ** 40 + 12345) == math.isqrt(10 ** 40 + 12345))

    print()
    primes = [n for n in range(2, 60) if miller_rabin(n)]
    print("Primes < 60    :", primes)
    print("2^61 - 1       :", miller_rabin(2 ** 61 - 1))
    print("2^61 + 1       :", miller_rabin(2 ** 61 + 1))
    print("2^89 - 1       :", miller_rabin(2 ** 89 - 1))
    print("Carmichael 561 :", miller_rabin(561))

    print()
    p, q = 1000000007, 998244353
    n = p * q
    phi = (p - 1) * (q - 1)
    e = 65537
    d = mod_inverse(e, phi)
    message = 123456789012345
    cipher = mod_pow(message, e, n)
    print("RSA modulus    :", n)
    print("Ciphertext     :", cipher)
    print("Decrypted      :", mod_pow(cipher, d, n))
    print("RSA works      :", mod_pow(cipher, d, n) == message)
