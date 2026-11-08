import hashlib
import math
import random


class CountMinSketch:
    def __init__(self, width, depth):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]
        self.seeds = [random.getrandbits(32) for _ in range(depth)]

    def _hash(self, item, seed):
        h = hashlib.sha256(f"{seed}:{item}".encode()).hexdigest()
        return int(h, 16) % self.width

    def add(self, item, count=1):
        for i in range(self.depth):
            j = self._hash(item, self.seeds[i])
            self.table[i][j] += count

    def estimate(self, item):
        return min(self.table[i][self._hash(item, self.seeds[i])] for i in range(self.depth))

    def merge(self, other):
        if self.width != other.width or self.depth != other.depth:
            raise ValueError("Incompatible sketches")
        for i in range(self.depth):
            for j in range(self.width):
                self.table[i][j] += other.table[i][j]


def relative_error(true, est):
    if true == 0:
        return 0.0 if est == 0 else float("inf")
    return abs(est - true) / true


if __name__ == "__main__":
    random.seed(15)
    cms = CountMinSketch(width=200, depth=5)

    true_counts = {}
    items = [f"item_{i}" for i in range(50)]
    for _ in range(5000):
        x = random.choice(items)
        cms.add(x)
        true_counts[x] = true_counts.get(x, 0) + 1

    errors = [relative_error(true_counts[x], cms.estimate(x)) for x in items]
    print("Average relative err :", round(sum(errors) / len(errors), 4))
    print("Max relative err     :", round(max(errors), 4))
    print("Never underestimates :", all(cms.estimate(x) >= true_counts[x] for x in items))

    # heavy hitter
    for _ in range(3000):
        cms.add("hot")
    true_counts["hot"] = true_counts.get("hot", 0) + 3000
    print()
    print("Hot item true        :", true_counts["hot"])
    print("Hot item estimate    :", cms.estimate("hot"))
    print("Hot relative err     :", round(relative_error(true_counts["hot"], cms.estimate("hot")), 4))

    # merge
    other = CountMinSketch(200, 5)
    other.seeds = cms.seeds[:]          # same hash functions for test
    for _ in range(1000):
        other.add("hot")
    cms.merge(other)
    print("After merge estimate :", cms.estimate("hot"))

    # empty
    empty = CountMinSketch(100, 3)
    print("Empty estimate       :", empty.estimate("missing") == 0)
