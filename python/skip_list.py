import random
from collections import defaultdict

class SkipNode:
    def __init__(self, key, value, level):
        self.key = key
        self.value = value
        self.forward = [None] * (level + 1)

class SkipList:
    def __init__(self, max_level=16, p=0.5):
        self.max_level = max_level
        self.p = p
        self.header = SkipNode(None, None, max_level)
        self.level = 0
        self.size = 0

    def _random_level(self):
        level = 0
        while random.random() < self.p and level < self.max_level:
            level += 1
        return level

    def insert(self, key, value=None):
        update = [None] * (self.max_level + 1)
        current = self.header
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].key < key:
                current = current.forward[i]
            update[i] = current
        current = current.forward[0]
        if current and current.key == key:
            current.value = value
            return
        level = self._random_level()
        if level > self.level:
            for i in range(self.level + 1, level + 1):
                update[i] = self.header
            self.level = level
        node = SkipNode(key, value, level)
        for i in range(level + 1):
            node.forward[i] = update[i].forward[i]
            update[i].forward[i] = node
        self.size += 1

    def search(self, key):
        current = self.header
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].key < key:
                current = current.forward[i]
        current = current.forward[0]
        if current and current.key == key:
            return current.value
        return None

    def delete(self, key):
        update = [None] * (self.max_level + 1)
        current = self.header
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].key < key:
                current = current.forward[i]
            update[i] = current
        current = current.forward[0]
        if current and current.key == key:
            for i in range(self.level + 1):
                if update[i].forward[i] != current:
                    break
                update[i].forward[i] = current.forward[i]
            while self.level > 0 and self.header.forward[self.level] is None:
                self.level -= 1
            self.size -= 1
            return True
        return False

    def contains(self, key):
        return self.search(key) is not None

    def keys(self):
        result = []
        current = self.header.forward[0]
        while current:
            result.append(current.key)
            current = current.forward[0]
        return result

    def __len__(self):
        return self.size

if __name__ == "__main__":
    random.seed(42)
    sl = SkipList()
    data = list(range(0, 100, 3)) + list(range(1, 100, 7))
    random.shuffle(data)
    for x in data:
        sl.insert(x, x * x)
    print("Inserted          :", len(data), "unique expected ~", len(set(data)))
    print("SkipList size     :", len(sl))
    print("Level             :", sl.level)
    print("Contains 21       :", sl.contains(21))
    print("Search 21         :", sl.search(21))
    print("Search 22         :", sl.search(22))
    print()
    keys = sl.keys()
    print("First 15 keys     :", keys[:15])
    print("Sorted correctly  :", keys == sorted(keys))
    print()
    deleted = 0
    for x in range(0, 100, 5):
        if sl.delete(x):
            deleted += 1
    print("Deleted multiples of 5:", deleted)
    print("Size after delete :", len(sl))
    print("Still sorted      :", sl.keys() == sorted(sl.keys()))
    print("21 still present  :", sl.contains(21))
    print("20 present        :", sl.contains(20))
    print()
    big = SkipList(max_level=20)
    for i in range(5000):
        big.insert(random.randint(0, 100000))
    print("5000 random inserts:")
    print("  size  :", len(big))
    print("  level :", big.level)
    sample = [random.randint(0, 100000) for _ in range(20)]
    hits = sum(1 for s in sample if big.contains(s))
    print("  random hits in sample of 20:", hits)
