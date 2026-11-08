import math

def is_prime(n):
    if n < 2: return False
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]:
        if n % p == 0: return n == p
    d = n - 1
    s = 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in [2, 3, 5, 7, 11, 13]:
        if a >= n: continue
        x = pow(a, d, n)
        if x == 1 or x == n - 1: continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1: break
        else:
            return False
    return True

def generate_prime(bits):
    import secrets
    while True:
        p = secrets.randbits(bits) | (1 << (bits - 1)) | 1
        if is_prime(p):
            return p

def mod_inverse(e, phi):
    def egcd(a, b):
        if a == 0: return (b, 0, 1)
        g, y, x = egcd(b % a, a)
        return (g, x - (b // a) * y, y)
    g, x, _ = egcd(e, phi)
    if g != 1: raise Exception('Modular inverse does not exist')
    return x % phi

if __name__ == "__main__":
    print("Testing Miller-Rabin primality:")
    print("7 is prime:", is_prime(7))
    print("9 is prime:", is_prime(9))
    p = generate_prime(64)
    q = generate_prime(64)
    n = p * q
    phi = (p - 1) * (q - 1)
    e = 65537
    d = mod_inverse(e, phi)
    msg = 42
    ciphertext = pow(msg, e, n)
    decrypted = pow(ciphertext, d, n)
    print("\nRSA Simulation (64-bit primes):")
    print(f"Original Message: {msg}")
    print(f"Decrypted Message: {decrypted}")
    print("RSA works:", msg == decrypted)
