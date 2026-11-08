import hashlib
import random


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.components = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        self.components -= 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)

    def component_size(self, x):
        return self.size[self.find(x)]


def kruskal(n, edges):
    uf = UnionFind(n)
    total = 0
    chosen = []
    for weight, a, b in sorted(edges):
        if uf.union(a, b):
            total += weight
            chosen.append((a, b, weight))
    return total, chosen, uf.components


class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    @classmethod
    def from_list(cls, values):
        ft = cls(len(values))
        for i, v in enumerate(values):
            ft.add(i, v)
        return ft

    def add(self, i, delta):
        i += 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def prefix(self, i):
        i += 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total

    def range_sum(self, left, right):
        before = self.prefix(left - 1) if left > 0 else 0
        return self.prefix(right) - before


class SegmentTree:
    def __init__(self, values, func=min, identity=float("inf")):
        self.n = len(values)
        self.func = func
        self.identity = identity
        self.tree = [identity] * (2 * self.n)
        for i, v in enumerate(values):
            self.tree[self.n + i] = v
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = func(self.tree[2 * i], self.tree[2 * i + 1])

    def update(self, i, value):
        i += self.n
        self.tree[i] = value
        while i > 1:
            i //= 2
            self.tree[i] = self.func(self.tree[2 * i], self.tree[2 * i + 1])

    def query(self, left, right):
        result = self.identity
        left += self.n
        right += self.n + 1
        while left < right:
            if left & 1:
                result = self.func(result, self.tree[left])
                left += 1
            if right & 1:
                right -= 1
                result = self.func(result, self.tree[right])
            left //= 2
            right //= 2
        return result


class BloomFilter:
    def __init__(self, bits=2048, hashes=4):
        self.bits = bits
        self.hashes = hashes
        self.array = bytearray(bits)
        self.count = 0

    def _positions(self, item):
        digest = hashlib.sha256(item.encode()).digest()
        for i in range(self.hashes):
            chunk = int.from_bytes(digest[i * 4:(i + 1) * 4], "big")
            yield chunk % self.bits

    def add(self, item):
        for p in self._positions(item):
            self.array[p] = 1
        self.count += 1

    def might_contain(self, item):
        return all(self.array[p] for p in self._positions(item))

    def fill_ratio(self):
        return sum(self.array) / self.bits


if __name__ == "__main__":
    uf = UnionFind(10)
    for a, b in [(0, 1), (2, 3), (1, 3), (4, 5), (6, 7), (5, 7)]:
        uf.union(a, b)
    print("Components        :", uf.components)
    print("0 and 2 connected :", uf.connected(0, 2))
    print("0 and 4 connected :", uf.connected(0, 4))
    print("Size of set of 4  :", uf.component_size(4))
    print("Duplicate union   :", uf.union(0, 3))

    edges = [
        (7, 0, 1), (5, 1, 2), (8, 0, 2), (9, 1, 3), (7, 2, 3),
        (5, 3, 4), (15, 2, 4), (6, 4, 5), (8, 3, 5), (11, 4, 6),
    ]
    total, chosen, parts = kruskal(7, edges)
    print()
    print("MST weight        :", total)
    print("MST edges         :", chosen)
    print("Spans all nodes   :", parts == 1 and len(chosen) == 6)

    rng = random.Random(11)
    values = [rng.randint(-50, 50) for _ in range(200)]
    ft = FenwickTree.from_list(values)
    seg_min = SegmentTree(values)
    seg_sum = SegmentTree(values, func=lambda a, b: a + b, identity=0)
    fenwick_ok = min_ok = sum_ok = True
    for _ in range(400):
        left = rng.randint(0, 199)
        right = rng.randint(left, 199)
        part = values[left:right + 1]
        if ft.range_sum(left, right) != sum(part):
            fenwick_ok = False
        if seg_min.query(left, right) != min(part):
            min_ok = False
        if seg_sum.query(left, right) != sum(part):
            sum_ok = False
        idx = rng.randint(0, 199)
        new = rng.randint(-50, 50)
        ft.add(idx, new - values[idx])
        values[idx] = new
        seg_min.update(idx, new)
        seg_sum.update(idx, new)

    print()
    print("Fenwick matches brute force    :", fenwick_ok)
    print("Segment min matches brute force:", min_ok)
    print("Segment sum matches brute force:", sum_ok)

    bloom = BloomFilter(bits=4096, hashes=4)
    members = [f"user{i}" for i in range(300)]
    for m in members:
        bloom.add(m)
    outsiders = [f"guest{i}" for i in range(2000)]
    false_positives = sum(bloom.might_contain(o) for o in outsiders)
    print()
    print("No false negatives :", all(bloom.might_contain(m) for m in members))
    print("False positives    :", false_positives, "of", len(outsiders))
    print("Rate under 5%      :", false_positives / len(outsiders) < 0.05)
    print("Bits set           :", round(bloom.fill_ratio() * 100, 1), "%")
