import hashlib
import math
import random
import struct


class HyperLogLog:
    def __init__(self, b=12):
        """b = number of bits for register index (4..16). m = 2^b registers."""
        if not 4 <= b <= 16:
            raise ValueError("b must be in 4..16")
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m
        self.alpha = self._alpha(self.m)

    @staticmethod
    def _alpha(m):
        if m == 16:
            return 0.673
        if m == 32:
            return 0.697
        if m == 64:
            return 0.709
        return 0.7213 / (1 + 1.079 / m)

    def _hash(self, value):
        h = hashlib.sha1(str(value).encode()).digest()
        return struct.unpack(">Q", h[:8])[0]

    def add(self, value):
        x = self._hash(value)
        j = x >> (64 - self.b)
        w = x & ((1 << (64 - self.b)) - 1)
        rho = (64 - self.b - w.bit_length() + 1) if w else (64 - self.b + 1)
        if rho > self.registers[j]:
            self.registers[j] = rho

    def cardinality(self):
        raw = self.alpha * self.m * self.m / sum(2.0 ** -r for r in self.registers)
        if raw <= 2.5 * self.m:
            zeros = self.registers.count(0)
            if zeros > 0:
                return self.m * math.log(self.m / zeros)
        if raw > (1 / 30) * (1 << 32):
            return -(1 << 32) * math.log(1 - raw / (1 << 32))
        return raw

    def merge(self, other):
        if self.m != other.m:
            raise ValueError("Different precision")
        for i in range(self.m):
            if other.registers[i] > self.registers[i]:
                self.registers[i] = other.registers[i]


if __name__ == "__main__":
    random.seed(123)
    hll = HyperLogLog(b=12)

    n = 10000
    for i in range(n):
        hll.add(f"user_{i}")

    est = hll.cardinality()
    err = abs(est - n) / n
    print("True cardinality     :", n)
    print("HLL estimate         :", round(est))
    print("Relative error       :", round(err, 4))
    print("Error under 5%       :", err < 0.05)

    # smaller set
    hll2 = HyperLogLog(b=10)
    for i in range(500):
        hll2.add(i)
    est2 = hll2.cardinality()
    print()
    print("Small set true 500   :", round(est2), "err", round(abs(est2 - 500) / 500, 3))

    # merge
    a = HyperLogLog(b=12)
    b = HyperLogLog(b=12)
    for i in range(3000):
        a.add(i)
    for i in range(2000, 6000):
        b.add(i)
    a.merge(b)
    merged_est = a.cardinality()
    print("Merged estimate      :", round(merged_est))
    print("Expected ~6000       :", abs(merged_est - 6000) / 6000 < 0.08)

    # empty
    empty = HyperLogLog(b=8)
    print("Empty estimate ~0    :", empty.cardinality() < 1)
