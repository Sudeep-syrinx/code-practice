"""
A Complete Implementation of Elliptic Curve Cryptography (ECC) 
and the Elliptic Curve Digital Signature Algorithm (ECDSA).
Includes Point Addition, Scalar Multiplication, and Key Generation.
"""

import math
import random
import hashlib

class ECPoint:
    def __init__(self, x, y, infinity=False):
        self.x = x
        self.y = y
        self.infinity = infinity

    def __eq__(self, other):
        if self.infinity and other.infinity:
            return True
        if self.infinity or other.infinity:
            return False
        return self.x == other.x and self.y == other.y

    def __repr__(self):
        if self.infinity:
            return "Infinity"
        return f"({self.x}, {self.y})"

class EllipticCurve:
    def __init__(self, a, b, p):
        self.a = a
        self.b = b
        self.p = p
        self.infinity = ECPoint(None, None, True)

    def is_on_curve(self, point):
        if point.infinity:
            return True
        left = (point.y * point.y) % self.p
        right = (point.x * point.x * point.x + self.a * point.x + self.b) % self.p
        return left == right

    def point_add(self, P, Q):
        if P.infinity:
            return Q
        if Q.infinity:
            return P
        if P.x == Q.x and (P.y + Q.y) % self.p == 0:
            return self.infinity
        if P == Q:
            m = (3 * P.x * P.x + self.a) * pow(2 * P.y, -1, self.p)
        else:
            m = (Q.y - P.y) * pow(Q.x - P.x, -1, self.p)
        m %= self.p
        x_r = (m * m - P.x - Q.x) % self.p
        y_r = (m * (P.x - x_r) - P.y) % self.p
        return ECPoint(x_r, y_r)

    def scalar_mult(self, k, P):
        result = self.infinity
        addend = P
        while k:
            if k & 1:
                result = self.point_add(result, addend)
            addend = self.point_add(addend, addend)
            k >>= 1
        return result

class ECDSA:
    def __init__(self, curve, base_point, n):
        self.curve = curve
        self.G = base_point
        self.n = n

    def generate_keys(self):
        private_key = random.randint(1, self.n - 1)
        public_key = self.curve.scalar_mult(private_key, self.G)
        return private_key, public_key

    def sign(self, private_key, message):
        z = int(hashlib.sha256(message.encode()).hexdigest(), 16)
        while True:
            k = random.randint(1, self.n - 1)
            R = self.curve.scalar_mult(k, self.G)
            r = R.x % self.n
            if r == 0:
                continue
            s = (pow(k, -1, self.n) * (z + r * private_key)) % self.n
            if s != 0:
                return (r, s)

    def verify(self, public_key, message, signature):
        r, s = signature
        if not (1 <= r <= self.n - 1 and 1 <= s <= self.n - 1):
            return False
        z = int(hashlib.sha256(message.encode()).hexdigest(), 16)
        w = pow(s, -1, self.n)
        u1 = (z * w) % self.n
        u2 = (r * w) % self.n
        P1 = self.curve.scalar_mult(u1, self.G)
        P2 = self.curve.scalar_mult(u2, public_key)
        P = self.curve.point_add(P1, P2)
        if P.infinity:
            return False
        return (P.x % self.n) == r

if __name__ == "__main__":
    print("Testing ECC and ECDSA...")
    p = 97
    a = 2
    b = 3
    curve = EllipticCurve(a, b, p)
    G = ECPoint(3, 6)
    n = 5
    
    ecdsa = ECDSA(curve, G, n)
    private_key, public_key = ecdsa.generate_keys()
    
    message = "Hello, Elliptic Curve Cryptography!"
    signature = ecdsa.sign(private_key, message)
    is_valid = ecdsa.verify(public_key, message, signature)
    
    print(f"Private Key: {private_key}")
    print(f"Public Key: {public_key}")
    print(f"Signature: {signature}")
    print(f"Verification successful: {is_valid}")
    
    tampered_valid = ecdsa.verify(public_key, "Tampered message", signature)
    print(f"Tampered message verification: {tampered_valid}")
