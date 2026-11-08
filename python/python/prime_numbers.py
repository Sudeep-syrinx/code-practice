def is_prime(n):
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0:
        return False
    i = 3
    while i * i <= n:
        if n % i == 0:
            return False
        i += 2
    return True


def sieve(limit):
    flags = [True] * (limit + 1)
    flags[0:2] = [False, False]
    for i in range(2, int(limit ** 0.5) + 1):
        if flags[i]:
            for j in range(i * i, limit + 1, i):
                flags[j] = False
    return [i for i, ok in enumerate(flags) if ok]


def prime_factors(n):
    factors = []
    d = 2
    while d * d <= n:
        while n % d == 0:
            factors.append(d)
            n //= d
        d += 1
    if n > 1:
        factors.append(n)
    return factors


def gcd(a, b):
    while b:
        a, b = b, a % b
    return a


def lcm(a, b):
    return a * b // gcd(a, b)


def nth_prime(n):
    count = 0
    candidate = 1
    while count < n:
        candidate += 1
        if is_prime(candidate):
            count += 1
    return candidate


if __name__ == "__main__":
    print(is_prime(97))         # expected True
    print(is_prime(100))        # expected False
    print(sieve(30))            # expected [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    print(prime_factors(84))    # expected [2, 2, 3, 7]
    print(gcd(48, 18))          # expected 6
    print(lcm(4, 6))            # expected 12
    print(nth_prime(10))        # expected 29
