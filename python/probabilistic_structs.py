import math
from collections import deque

class BloomFilter:
    def __init__(self, size=1024, hashes=3):
        self.size = size
        self.hashes = hashes
        self.bits = [0] * size
        self.count = 0

    def _hashes(self, item):
        h1 = hash(item) & 0xFFFFFFFF
        h2 = hash(str(item) + "#") & 0xFFFFFFFF
        for i in range(self.hashes):
            yield (h1 + i * h2) % self.size

    def add(self, item):
        for h in self._hashes(item):
            self.bits[h] = 1
        self.count += 1

    def __contains__(self, item):
        return all(self.bits[h] for h in self._hashes(item))

    def fill_ratio(self):
        return sum(self.bits) / self.size

class CountMinSketch:
    def __init__(self, width=256, depth=4):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _hashes(self, item):
        h1 = hash(item) & 0xFFFFFFFF
        h2 = hash(str(item)[::-1]) & 0xFFFFFFFF
        for i in range(self.depth):
            yield (h1 + i * h2) % self.width

    def add(self, item, count=1):
        for i, h in enumerate(self._hashes(item)):
            self.table[i][h] += count

    def estimate(self, item):
        return min(self.table[i][h] for i, h in enumerate(self._hashes(item)))

class HyperLogLog:
    def __init__(self, b=8):
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m
        self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def add(self, item):
        h = hash(item) & 0xFFFFFFFFFFFFFFFF
        idx = h & (self.m - 1)
        w = h >> self.b
        rank = 1
        while w & 1 == 0 and rank <= 64 - self.b:
            rank += 1
            w >>= 1
        if rank > self.registers[idx]:
            self.registers[idx] = rank

    def estimate(self):
        inv = sum(2.0 ** -r for r in self.registers)
        E = self.alpha * self.m * self.m / inv
        if E <= 2.5 * self.m:
            zeros = self.registers.count(0)
            if zeros:
                return self.m * math.log(self.m / zeros)
        return E

if __name__ == "__main__":
    import random
    random.seed(3)

    bf = BloomFilter(size=2048, hashes=4)
    items = [f"user{i}" for i in range(200)]
    for x in items:
        bf.add(x)
    false_pos = sum(1 for i in range(1000, 3000) if f"user{i}" in bf)
    print("BloomFilter")
    print("  all members present :", all(x in bf for x in items))
    print("  false positives     :", false_pos, "of 2000")
    print("  fill ratio          :", round(bf.fill_ratio(), 3))
    print()

    cms = CountMinSketch(width=512, depth=5)
    stream = [random.randint(1, 50) for _ in range(5000)]
    true = defaultdict(int)
    for x in stream:
        cms.add(x)
        true[x] += 1
    errors = [abs(cms.estimate(k) - v) for k, v in true.items()]
    print("CountMinSketch")
    print("  avg absolute error  :", round(sum(errors) / len(errors), 2))
    print("  max estimate/true   :", max(cms.estimate(k) / v for k, v in true.items() if v))
    print("  never underestimates:", all(cms.estimate(k) >= v for k, v in true.items()))
    print()

    hll = HyperLogLog(b=10)
    unique = set()
    for i in range(10000):
        x = f"id-{random.randint(0, 5000)}"
        hll.add(x)
        unique.add(x)
    est = hll.estimate()
    print("HyperLogLog")
    print("  true unique         :", len(unique))
    print("  estimated           :", round(est))
    print("  relative error      :", round(abs(est - len(unique)) / len(unique), 3))
