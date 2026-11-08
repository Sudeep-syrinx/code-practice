def gcd(a, b):
    while b:
        a, b = b, a % b
    return abs(a)


def lcm(a, b):
    return abs(a * b) // gcd(a, b)


def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True


def factorize(n):
    out = []
    d = 2
    while d * d <= n:
        while n % d == 0:
            out.append(d)
            n //= d
        d += 1
    if n > 1:
        out.append(n)
    return out


def digit_sum(n):
    return sum(int(ch) for ch in str(abs(n)))


def collatz_steps(n):
    steps = 0
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        steps += 1
    return steps


def divisor_sum(n):
    if n < 2:
        return 0
    total = 1
    i = 2
    while i * i <= n:
        if n % i == 0:
            total += i
            j = n // i
            if j != i:
                total += j
        i += 1
    return total


def perfect_numbers(limit):
    return [n for n in range(2, limit + 1) if divisor_sum(n) == n]


def fibonacci(count):
    out = []
    a, b = 0, 1
    for _ in range(count):
        out.append(a)
        a, b = b, a + b
    return out


def sieve(limit):
    if limit < 2:
        return []
    flags = [True] * (limit + 1)
    flags[0] = flags[1] = False
    i = 2
    while i * i <= limit:
        if flags[i]:
            for j in range(i * i, limit + 1, i):
                flags[j] = False
        i += 1
    return [k for k, f in enumerate(flags) if f]


def factorial(n):
    result = 1
    for k in range(2, n + 1):
        result *= k
    return result


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    check("gcd", gcd(48, 18), 6)
    check("gcd with zero", gcd(7, 0), 7)
    check("lcm", lcm(4, 6), 12)
    check("prime 97", is_prime(97), True)
    check("not prime 91", is_prime(91), False)
    check("one is not prime", is_prime(1), False)
    check("factorize 360", factorize(360), [2, 2, 2, 3, 3, 5])
    check("factorize prime", factorize(13), [13])
    check("digit sum", digit_sum(12345), 15)
    check("collatz 27", collatz_steps(27), 111)
    check("collatz 1", collatz_steps(1), 0)
    check("perfect numbers", perfect_numbers(10000), [6, 28, 496, 8128])
    check("fibonacci", fibonacci(10), [0, 1, 1, 2, 3, 5, 8, 13, 21, 34])
    check("sieve to 30", sieve(30), [2, 3, 5, 7, 11, 13, 17, 19, 23, 29])
    check("sieve matches is_prime", sieve(500), [n for n in range(501) if is_prime(n)])
    check("factorial 10", factorial(10), 3628800)
    check("factorial 0", factorial(0), 1)

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
