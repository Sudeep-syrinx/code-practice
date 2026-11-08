class Node:
    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        if capacity <= 0:
            raise ValueError("Capacity must be positive")
        self.capacity = capacity
        self.map = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head
        self.hits = 0
        self.misses = 0

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            self.misses += 1
            return -1
        self.hits += 1
        self._remove(node)
        self._add_front(node)
        return node.value

    def put(self, key, value):
        node = self.map.get(key)
        if node is not None:
            node.value = value
            self._remove(node)
            self._add_front(node)
            return
        if len(self.map) >= self.capacity:
            oldest = self.tail.prev
            self._remove(oldest)
            del self.map[oldest.key]
        node = Node(key, value)
        self.map[key] = node
        self._add_front(node)

    def keys(self):
        result = []
        cur = self.head.next
        while cur is not self.tail:
            result.append(cur.key)
            cur = cur.next
        return result

    def hit_rate(self):
        total = self.hits + self.misses
        return round(self.hits / total, 2) if total else 0.0

    def __len__(self):
        return len(self.map)


class HashMap:
    def __init__(self, buckets=4):
        self.buckets = [[] for _ in range(buckets)]
        self.size = 0

    def _index(self, key):
        return hash(key) % len(self.buckets)

    def _resize(self):
        old = self.buckets
        self.buckets = [[] for _ in range(len(old) * 2)]
        for bucket in old:
            for key, value in bucket:
                self.buckets[self._index(key)].append((key, value))

    def put(self, key, value):
        bucket = self.buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self.size += 1
        if self.size / len(self.buckets) > 0.75:
            self._resize()

    def get(self, key, default=None):
        for k, v in self.buckets[self._index(key)]:
            if k == key:
                return v
        return default

    def remove(self, key):
        bucket = self.buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                del bucket[i]
                self.size -= 1
                return True
        return False

    def items(self):
        return [pair for bucket in self.buckets for pair in bucket]

    def __len__(self):
        return self.size


if __name__ == "__main__":
    cache = LRUCache(3)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("c", 3)
    print("Keys            :", cache.keys())
    print("Get a           :", cache.get("a"))
    cache.put("d", 4)
    print("Get b (evicted) :", cache.get("b"))
    print("Keys            :", cache.keys())
    cache.put("c", 30)
    print("Get c           :", cache.get("c"))
    print("Keys            :", cache.keys())
    print("Hits / misses   :", cache.hits, cache.misses)
    print("Hit rate        :", cache.hit_rate())
    print("Length          :", len(cache))

    print()
    hm = HashMap()
    for i, word in enumerate(["apple", "banana", "cherry", "date", "elder", "fig", "grape"]):
        hm.put(word, i)
    print("Size            :", len(hm))
    print("Buckets         :", len(hm.buckets))
    print("Get cherry      :", hm.get("cherry"))
    print("Get missing     :", hm.get("zebra", "not found"))
    hm.put("cherry", 99)
    print("Updated cherry  :", hm.get("cherry"))
    print("Remove date     :", hm.remove("date"))
    print("Remove date     :", hm.remove("date"))
    print("Size            :", len(hm))
    print("Sorted items    :", sorted(hm.items()))
