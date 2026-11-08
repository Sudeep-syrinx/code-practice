import random

class Bitset:
    def __init__(self, size):
        self.size = size
        self.words = [0] * ((size + 63) // 64)

    def set(self, i):
        self.words[i // 64] |= (1 << (i % 64))

    def clear(self, i):
        self.words[i // 64] &= ~(1 << (i % 64))

    def get(self, i):
        return (self.words[i // 64] & (1 << (i % 64))) != 0

    def count(self):
        return sum(bin(w).count('1') for w in self.words)

class BloomFilter:
    def __init__(self, size=1000, hash_count=3):
        self.size = size
        self.hash_count = hash_count
        self.bit_array = Bitset(size)

    def _hashes(self, item):
        h1 = hash(item)
        h2 = hash(item + "salt")
        return [(h1 + i * h2) % self.size for i in range(self.hash_count)]

    def add(self, item):
        for h in self._hashes(item):
            self.bit_array.set(h)

    def contains(self, item):
        return all(self.bit_array.get(h) for h in self._hashes(item))

if __name__ == "__main__":
    bf = BloomFilter(size=1000, hash_count=3)
    words = ["apple", "banana", "cherry"]
    for w in words:
        bf.add(w)
        
    print("Contains apple:", bf.contains("apple"))
    print("Contains grape:", bf.contains("grape"))
    print("False positive test (might be true):", bf.contains("durian"))
    print("No false negatives:", all(bf.contains(w) for w in words))
