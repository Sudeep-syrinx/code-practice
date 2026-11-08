from collections import OrderedDict, defaultdict
import time

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        if key not in self.cache:
            self.misses += 1
            return None
        self.hits += 1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def stats(self):
        total = self.hits + self.misses
        rate = self.hits / total * 100 if total else 0
        return {"hits": self.hits, "misses": self.misses, "hit_rate": round(rate, 1)}

class LFUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.values = {}
        self.freq = defaultdict(int)
        self.group = defaultdict(OrderedDict)
        self.min_freq = 0
        self.hits = 0
        self.misses = 0

    def _update_freq(self, key):
        f = self.freq[key]
        del self.group[f][key]
        if not self.group[f] and f == self.min_freq:
            self.min_freq += 1
        self.freq[key] = f + 1
        self.group[f + 1][key] = None

    def get(self, key):
        if key not in self.values:
            self.misses += 1
            return None
        self.hits += 1
        self._update_freq(key)
        return self.values[key]

    def put(self, key, value):
        if self.capacity <= 0:
            return
        if key in self.values:
            self.values[key] = value
            self._update_freq(key)
            return
        if len(self.values) >= self.capacity:
            # evict least frequent, oldest
            evict_key, _ = self.group[self.min_freq].popitem(last=False)
            del self.values[evict_key]
            del self.freq[evict_key]
        self.values[key] = value
        self.freq[key] = 1
        self.group[1][key] = None
        self.min_freq = 1

    def stats(self):
        total = self.hits + self.misses
        rate = self.hits / total * 100 if total else 0
        return {"hits": self.hits, "misses": self.misses, "hit_rate": round(rate, 1)}

class FIFOCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        if key not in self.cache:
            self.misses += 1
            return None
        self.hits += 1
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache[key] = value
            return
        if len(self.cache) >= self.capacity:
            self.cache.popitem(last=False)
        self.cache[key] = value

    def stats(self):
        total = self.hits + self.misses
        rate = self.hits / total * 100 if total else 0
        return {"hits": self.hits, "misses": self.misses, "hit_rate": round(rate, 1)}

def simulate(cache, operations):
    for op, *args in operations:
        if op == "get":
            cache.get(args[0])
        else:
            cache.put(args[0], args[1])
    return cache.stats()

if __name__ == "__main__":
    ops = [
        ("put", 1, "A"), ("put", 2, "B"), ("put", 3, "C"),
        ("get", 1), ("get", 2), ("put", 4, "D"),
        ("get", 1), ("get", 3), ("get", 4),
        ("put", 5, "E"), ("get", 2), ("get", 5),
        ("get", 1), ("put", 6, "F"), ("get", 4),
    ]
    print("Operations:", len(ops))
    print()
    for name, cls in [("LRU", LRUCache), ("LFU", LFUCache), ("FIFO", FIFOCache)]:
        cache = cls(3)
        stats = simulate(cache, ops)
        print(f"{name:5}  hits={stats['hits']:2}  misses={stats['misses']:2}  hit_rate={stats['hit_rate']}%")
    print()

    # Stress test
    import random
    random.seed(1)
    heavy = []
    for _ in range(500):
        if random.random() < 0.6:
            heavy.append(("get", random.randint(1, 20)))
        else:
            heavy.append(("put", random.randint(1, 20), random.randint(1, 100)))
    print("Heavy workload (500 ops, capacity 8):")
    for name, cls in [("LRU", LRUCache), ("LFU", LFUCache), ("FIFO", FIFOCache)]:
        cache = cls(8)
        stats = simulate(cache, heavy)
        print(f"  {name:5}  hit_rate={stats['hit_rate']}%  hits={stats['hits']}  misses={stats['misses']}")
