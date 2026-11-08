class BloomFilter:
    def __init__(self, size, hash_count):
        self.size = size
        self.hash_count = hash_count
        self.bit_array = [0] * size

    def _hashes(self, item):
        h1 = hash(item)
        h2 = hash(item + "salt")
        return [(h1 + i * h2) % self.size for i in range(self.hash_count)]

    def add(self, item):
        for index in self._hashes(item):
            self.bit_array[index] = 1

    def contains(self, item):
        return all(self.bit_array[index] == 1 for index in self._hashes(item))

if __name__ == "__main__":
    bf = BloomFilter(100, 3)
    words = ["apple", "banana", "cherry"]
    for w in words:
        bf.add(w)
        
    print("Contains apple:", bf.contains("apple"))
    print("Contains grape:", bf.contains("grape"))
    print("Test passed:", bf.contains("apple") and not bf.contains("grape"))
