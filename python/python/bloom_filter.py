import hashlib
import math


class BloomFilter:
    def __init__(self, capacity, error_rate=0.01):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        if not 0 < error_rate < 1:
            raise ValueError("error_rate must be in (0, 1)")
        self.capacity = capacity
        self.error_rate = error_rate
        self.size = self._optimal_size(capacity, error_rate)
        self.hash_count = self._optimal_hashes(self.size, capacity)
        self.bits = bytearray((self.size + 7) // 8)
        self.items = 0

    @staticmethod
    def _optimal_size(n, p):
        return max(1, int(-n * math.log(p) / (math.log(2) ** 2)))

    @staticmethod
    def _optimal_hashes(m, n):
        return max(1, int((m / n) * math.log(2)))

    def _hashes(self, item):
        data = str(item).encode()
        h1 = int(hashlib.md5(data).hexdigest(), 16)
        h2 = int(hashlib.sha1(data).hexdigest(), 16)
        for i in range(self.hash_count):
            yield (h1 + i * h2) % self.size

    def add(self, item):
        for pos in self._hashes(item):
            self.bits[pos // 8] |= 1 << (pos % 8)
        self.items += 1

    def might_contain(self, item):
        return all(
            self.bits[pos // 8] & (1 << (pos % 8))
            for pos in self._hashes(item)
        )

    def estimated_false_positive_rate(self):
        if self.items == 0:
            return 0.0
        # approximation: (1 - e^(-k*n/m))^k
        return (1 - math.exp(-self.hash_count * self.items / self.size)) ** self.hash_count


if __name__ == "__main__":
    bf = BloomFilter(1000, 0.01)
    present = [f"user_{i}" for i in range(500)]
    absent = [f"ghost_{i}" for i in range(500)]

    for x in present:
        bf.add(x)

    print("Size (bits)            :", bf.size)
    print("Hash functions         :", bf.hash_count)
    print("All present found      :", all(bf.might_contain(x) for x in present))
    false_positives = sum(1 for x in absent if bf.might_contain(x))
    print("False positives        :", false_positives, "out of", len(absent))
    print("Estimated FPR          :", round(bf.estimated_false_positive_rate(), 4))
    print("Observed FPR           :", round(false_positives / len(absent), 4))

    # empty filter
    empty = BloomFilter(100)
    print("Empty never contains   :", not empty.might_contain("anything"))

    import random
    rng = random.Random(13)
    ok = True
    for _ in range(50):
        n = rng.randint(50, 300)
        filt = BloomFilter(n, 0.05)
        items = {rng.randint(0, 10_000) for _ in range(n // 2)}
        for x in items:
            filt.add(x)
        if not all(filt.might_contain(x) for x in items):
            ok = False
    print("50 capacity trials ok  :", ok)
