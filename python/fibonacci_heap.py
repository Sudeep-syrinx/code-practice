import math
from collections import defaultdict


class FibNode:
    def __init__(self, key, value=None):
        self.key = key
        self.value = value
        self.degree = 0
        self.mark = False
        self.parent = None
        self.child = None
        self.left = self
        self.right = self


class FibonacciHeap:
    def __init__(self):
        self.min = None
        self.n = 0

    def insert(self, key, value=None):
        node = FibNode(key, value)
        self._add_to_root_list(node)
        if self.min is None or node.key < self.min.key:
            self.min = node
        self.n += 1
        return node

    def _add_to_root_list(self, node):
        if self.min is None:
            self.min = node
            node.left = node.right = node
        else:
            node.left = self.min
            node.right = self.min.right
            self.min.right.left = node
            self.min.right = node

    def find_min(self):
        return None if self.min is None else (self.min.key, self.min.value)

    def extract_min(self):
        z = self.min
        if z is None:
            return None
        if z.child:
            children = []
            c = z.child
            while True:
                children.append(c)
                c = c.right
                if c == z.child:
                    break
            for c in children:
                c.parent = None
                self._add_to_root_list(c)
        z.left.right = z.right
        z.right.left = z.left
        if z == z.right:
            self.min = None
        else:
            self.min = z.right
            self._consolidate()
        self.n -= 1
        return z.key, z.value

    def _consolidate(self):
        A = [None] * (int(math.log2(self.n or 1)) + 3)
        roots = []
        x = self.min
        if x:
            while True:
                roots.append(x)
                x = x.right
                if x == self.min:
                    break
        for w in roots:
            x = w
            d = x.degree
            while A[d] is not None:
                y = A[d]
                if x.key > y.key:
                    x, y = y, x
                self._link(y, x)
                A[d] = None
                d += 1
            A[d] = x
        self.min = None
        for y in A:
            if y is not None:
                y.left = y.right = y
                self._add_to_root_list(y)
                if self.min is None or y.key < self.min.key:
                    self.min = y

    def _link(self, y, x):
        y.left.right = y.right
        y.right.left = y.left
        y.parent = x
        if x.child is None:
            x.child = y
            y.left = y.right = y
        else:
            y.left = x.child
            y.right = x.child.right
            x.child.right.left = y
            x.child.right = y
        x.degree += 1
        y.mark = False

    def decrease_key(self, node, new_key):
        if new_key > node.key:
            raise ValueError("new key is greater")
        node.key = new_key
        parent = node.parent
        if parent and node.key < parent.key:
            self._cut(node, parent)
            self._cascading_cut(parent)
        if node.key < self.min.key:
            self.min = node

    def _cut(self, x, y):
        if x.right == x:
            y.child = None
        else:
            x.left.right = x.right
            x.right.left = x.left
            if y.child == x:
                y.child = x.right
        y.degree -= 1
        self._add_to_root_list(x)
        x.parent = None
        x.mark = False

    def _cascading_cut(self, y):
        z = y.parent
        if z:
            if not y.mark:
                y.mark = True
            else:
                self._cut(y, z)
                self._cascading_cut(z)


if __name__ == "__main__":
    h = FibonacciHeap()
    nodes = {}
    for k in [5, 3, 8, 1, 9, 2, 7]:
        nodes[k] = h.insert(k, f"v{k}")
    print("Min                    :", h.find_min())
    print("Extract                :", h.extract_min())
    print("New min                :", h.find_min())
    h.decrease_key(nodes[9], 0)
    print("After decrease 9->0    :", h.find_min())
    extracted = []
    while h.n:
        extracted.append(h.extract_min()[0])
    print("Extract order          :", extracted)
    print("Sorted                 :", extracted == sorted(extracted))

    # stress vs sorted list
    import random
    rng = random.Random(4)
    ok = True
    for _ in range(30):
        heap = FibonacciHeap()
        data = [rng.randint(0, 1000) for _ in range(40)]
        for x in data:
            heap.insert(x)
        got = []
        while heap.n:
            got.append(heap.extract_min()[0])
        if got != sorted(data):
            ok = False
    print("30 random extract ok   :", ok)
