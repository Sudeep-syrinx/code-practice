import random


class CuckooHash:
    def __init__(self, capacity=16, max_kicks=500):
        self.capacity = capacity
        self.max_kicks = max_kicks
        self.t1 = [None] * capacity
        self.t2 = [None] * capacity
        self.size = 0

    def _h1(self, key):
        return hash((key, 1)) % self.capacity

    def _h2(self, key):
        return hash((key, 2)) % self.capacity

    def _rehash(self):
        old = []
        for t in (self.t1, self.t2):
            for item in t:
                if item is not None:
                    old.append(item)
        self.capacity *= 2
        self.t1 = [None] * self.capacity
        self.t2 = [None] * self.capacity
        self.size = 0
        for k, v in old:
            self.insert(k, v)

    def insert(self, key, value=True):
        if self.lookup(key) is not None:
            # update
            i1 = self._h1(key)
            if self.t1[i1] and self.t1[i1][0] == key:
                self.t1[i1] = (key, value)
                return True
            i2 = self._h2(key)
            if self.t2[i2] and self.t2[i2][0] == key:
                self.t2[i2] = (key, value)
                return True

        for _ in range(self.max_kicks):
            i1 = self._h1(key)
            if self.t1[i1] is None:
                self.t1[i1] = (key, value)
                self.size += 1
                return True
            key, value, self.t1[i1] = self.t1[i1][0], self.t1[i1][1], (key, value)

            i2 = self._h2(key)
            if self.t2[i2] is None:
                self.t2[i2] = (key, value)
                self.size += 1
                return True
            key, value, self.t2[i2] = self.t2[i2][0], self.t2[i2][1], (key, value)

        self._rehash()
        return self.insert(key, value)

    def lookup(self, key):
        i1 = self._h1(key)
        if self.t1[i1] and self.t1[i1][0] == key:
            return self.t1[i1][1]
        i2 = self._h2(key)
        if self.t2[i2] and self.t2[i2][0] == key:
            return self.t2[i2][1]
        return None

    def delete(self, key):
        i1 = self._h1(key)
        if self.t1[i1] and self.t1[i1][0] == key:
            self.t1[i1] = None
            self.size -= 1
            return True
        i2 = self._h2(key)
        if self.t2[i2] and self.t2[i2][0] == key:
            self.t2[i2] = None
            self.size -= 1
            return True
        return False


if __name__ == "__main__":
    ch = CuckooHash(capacity=8)
    for i in range(20):
        ch.insert(f"k{i}", i * 10)

    print("Size                 :", ch.size)
    print("Lookup k5            :", ch.lookup("k5"))
    print("Lookup missing       :", ch.lookup("missing"))
    print("Delete k5            :", ch.delete("k5"))
    print("After delete         :", ch.lookup("k5"))
    print("Size after delete    :", ch.size)

    # stress
    import random
    rng = random.Random(99)
    ok = True
    table = CuckooHash(capacity=16)
    reference = {}
    for _ in range(300):
        k = rng.randint(0, 200)
        if rng.random() < 0.7:
            v = rng.randint(0, 1000)
            table.insert(k, v)
            reference[k] = v
        else:
            table.delete(k)
            reference.pop(k, None)
        for key, val in list(reference.items())[:10]:
            if table.lookup(key) != val:
                ok = False
    print()
    print("300 mixed ops ok     :", ok)
    print("Final size match     :", table.size == len(reference))
