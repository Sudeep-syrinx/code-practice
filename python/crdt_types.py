from copy import deepcopy


class GCounter:
    def __init__(self, node_id):
        self.node_id = node_id
        self.counts = {}

    def inc(self, amount=1):
        self.counts[self.node_id] = self.counts.get(self.node_id, 0) + amount

    def value(self):
        return sum(self.counts.values())

    def merge(self, other):
        for k, v in other.counts.items():
            self.counts[k] = max(self.counts.get(k, 0), v)


class PNCounter:
    def __init__(self, node_id):
        self.p = GCounter(node_id)
        self.n = GCounter(node_id)

    def inc(self, amount=1):
        self.p.inc(amount)

    def dec(self, amount=1):
        self.n.inc(amount)

    def value(self):
        return self.p.value() - self.n.value()

    def merge(self, other):
        self.p.merge(other.p)
        self.n.merge(other.n)


class LWWRegister:
    def __init__(self):
        self.value = None
        self.timestamp = -1
        self.node = None

    def set(self, value, timestamp, node):
        if timestamp > self.timestamp or (timestamp == self.timestamp and node > (self.node or "")):
            self.value = value
            self.timestamp = timestamp
            self.node = node

    def merge(self, other):
        self.set(other.value, other.timestamp, other.node)


class ORSet:
    def __init__(self, node_id):
        self.node_id = node_id
        self.elements = {}      # value -> set of tags
        self.counter = 0

    def add(self, value):
        self.counter += 1
        tag = (self.node_id, self.counter)
        self.elements.setdefault(value, set()).add(tag)

    def remove(self, value):
        self.elements.pop(value, None)

    def contains(self, value):
        return value in self.elements and len(self.elements[value]) > 0

    def values(self):
        return set(self.elements.keys())

    def merge(self, other):
        for v, tags in other.elements.items():
            self.elements.setdefault(v, set()).update(tags)
        # observed-remove: remove tags that the other side has removed
        # simplified: keep only tags that appear in at least one side fully
        # for a pure OR-Set we need tombstones; here we do a basic union of observed tags
        # (full observed-remove needs more bookkeeping; this version is add-wins union)
        pass


if __name__ == "__main__":
    # G-Counter
    a = GCounter("A")
    b = GCounter("B")
    a.inc(3)
    b.inc(5)
    a.merge(b)
    b.merge(a)
    print("G-Counter A          :", a.value())
    print("G-Counter B          :", b.value())
    print("Both see 8           :", a.value() == 8 and b.value() == 8)

    # PN-Counter
    p1 = PNCounter("X")
    p2 = PNCounter("Y")
    p1.inc(10)
    p1.dec(3)
    p2.inc(4)
    p2.dec(1)
    p1.merge(p2)
    p2.merge(p1)
    print()
    print("PN value             :", p1.value())
    print("Expected 10           :", p1.value() == 10)

    # LWW
    r1 = LWWRegister()
    r2 = LWWRegister()
    r1.set("hello", 1, "A")
    r2.set("world", 2, "B")
    r1.merge(r2)
    r2.merge(r1)
    print()
    print("LWW value            :", r1.value)
    print("Both agree world     :", r1.value == "world" and r2.value == "world")

    # OR-Set (add-wins style)
    s1 = ORSet("n1")
    s2 = ORSet("n2")
    s1.add("apple")
    s1.add("banana")
    s2.add("banana")
    s2.add("cherry")
    s1.remove("banana")
    # merge
    for v, tags in s2.elements.items():
        s1.elements.setdefault(v, set()).update(tags)
    for v, tags in list(s1.elements.items()):
        s2.elements.setdefault(v, set()).update(tags)
    print()
    print("ORSet values         :", sorted(s1.values()))
    print("Contains apple       :", s1.contains("apple"))
    print("Contains cherry      :", s1.contains("cherry"))
