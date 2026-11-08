import random
from collections import deque

class CircularBuffer:
    def __init__(self, capacity):
        self.buf = [None] * capacity
        self.capacity = capacity
        self.head = 0
        self.tail = 0
        self.size = 0

    def push(self, item):
        self.buf[self.tail] = item
        self.tail = (self.tail + 1) % self.capacity
        if self.size < self.capacity:
            self.size += 1
        else:
            self.head = (self.head + 1) % self.capacity

    def pop(self):
        if self.size == 0:
            raise IndexError("empty")
        item = self.buf[self.head]
        self.head = (self.head + 1) % self.capacity
        self.size -= 1
        return item

    def __len__(self):
        return self.size

    def to_list(self):
        result = []
        i = self.head
        for _ in range(self.size):
            result.append(self.buf[i])
            i = (i + 1) % self.capacity
        return result

class LRUCacheSimple:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = {}
        self.order = deque()

    def get(self, key):
        if key not in self.data:
            return None
        self.order.remove(key)
        self.order.append(key)
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.order.remove(key)
        elif len(self.data) >= self.capacity:
            old = self.order.popleft()
            del self.data[old]
        self.data[key] = value
        self.order.append(key)

class MinStack:
    def __init__(self):
        self.stack = []
        self.mins = []

    def push(self, x):
        self.stack.append(x)
        if not self.mins or x <= self.mins[-1]:
            self.mins.append(x)

    def pop(self):
        x = self.stack.pop()
        if x == self.mins[-1]:
            self.mins.pop()
        return x

    def top(self):
        return self.stack[-1]

    def get_min(self):
        return self.mins[-1]

if __name__ == "__main__":
    cb = CircularBuffer(5)
    for i in range(8):
        cb.push(i)
    print("CircularBuffer")
    print("  contents :", cb.to_list())
    print("  len      :", len(cb))
    print("  pop      :", cb.pop(), "->", cb.to_list())
    print()
    cache = LRUCacheSimple(3)
    for k, v in [(1,"a"),(2,"b"),(3,"c"),(1,"a2"),(4,"d")]:
        cache.put(k, v)
    print("LRUCache")
    print("  get 1    :", cache.get(1))
    print("  get 2    :", cache.get(2))
    print("  data keys:", list(cache.data.keys()))
    print()
    ms = MinStack()
    for x in [3, 1, 4, 1, 5, 9, 2]:
        ms.push(x)
    print("MinStack")
    print("  min      :", ms.get_min())
    ms.pop(); ms.pop()
    print("  after 2 pops min:", ms.get_min())
    print("  top      :", ms.top())
