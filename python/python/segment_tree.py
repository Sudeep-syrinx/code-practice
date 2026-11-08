class SegmentTree:
    def __init__(self, data):
        self.n = len(data)
        self.tree = [0] * (4 * self.n)
        if self.n:
            self._build(1, 0, self.n - 1, data)

    def _build(self, node, lo, hi, data):
        if lo == hi:
            self.tree[node] = data[lo]
            return
        mid = (lo + hi) // 2
        self._build(node * 2, lo, mid, data)
        self._build(node * 2 + 1, mid + 1, hi, data)
        self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]

    def update(self, index, value):
        self._update(1, 0, self.n - 1, index, value)

    def _update(self, node, lo, hi, index, value):
        if lo == hi:
            self.tree[node] = value
            return
        mid = (lo + hi) // 2
        if index <= mid:
            self._update(node * 2, lo, mid, index, value)
        else:
            self._update(node * 2 + 1, mid + 1, hi, index, value)
        self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]

    def query(self, left, right):
        return self._query(1, 0, self.n - 1, left, right)

    def _query(self, node, lo, hi, left, right):
        if right < lo or hi < left:
            return 0
        if left <= lo and hi <= right:
            return self.tree[node]
        mid = (lo + hi) // 2
        return self._query(node * 2, lo, mid, left, right) + self._query(
            node * 2 + 1, mid + 1, hi, left, right
        )


if __name__ == "__main__":
    data = [1, 3, 5, 7, 9, 11]
    st = SegmentTree(data)
    print("Full sum               :", st.query(0, 5))
    print("Sum [1..4]             :", st.query(1, 4))
    print("Sum [0..0]             :", st.query(0, 0))
    st.update(2, 10)
    print("After update index 2   :", st.query(0, 5))
    print("Sum [2..3] after update:", st.query(2, 3))

    import random
    rng = random.Random(7)
    ok = True
    for _ in range(300):
        n = rng.randint(1, 80)
        arr = [rng.randint(-50, 50) for _ in range(n)]
        tree = SegmentTree(arr)
        for _ in range(40):
            if rng.random() < 0.4:
                i = rng.randrange(n)
                v = rng.randint(-50, 50)
                arr[i] = v
                tree.update(i, v)
            else:
                l = rng.randrange(n)
                r = rng.randrange(l, n)
                if tree.query(l, r) != sum(arr[l : r + 1]):
                    ok = False
    print("300 random tests ok    :", ok)

    empty = SegmentTree([])
    print("Empty tree query safe  :", empty.query(0, 0) == 0)
