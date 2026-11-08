import math

class SegmentTree:
    def __init__(self, data, merge_func):
        self.n = len(data)
        self.merge = merge_func
        self.tree = [None] * (4 * self.n)
        self._build(0, 0, self.n - 1, data)

    def _build(self, node, start, end, data):
        if start == end:
            self.tree[node] = data[start]
        else:
            mid = (start + end) // 2
            self._build(2 * node + 1, start, mid, data)
            self._build(2 * node + 2, mid + 1, end, data)
            self.tree[node] = self.merge(self.tree[2 * node + 1], self.tree[2 * node + 2])

    def update(self, idx, val):
        self._update(0, 0, self.n - 1, idx, val)

    def _update(self, node, start, end, idx, val):
        if start == end:
            self.tree[node] = val
        else:
            mid = (start + end) // 2
            if start <= idx <= mid:
                self._update(2 * node + 1, start, mid, idx, val)
            else:
                self._update(2 * node + 2, mid + 1, end, idx, val)
            self.tree[node] = self.merge(self.tree[2 * node + 1], self.tree[2 * node + 2])

    def query(self, l, r):
        return self._query(0, 0, self.n - 1, l, r)

    def _query(self, node, start, end, l, r):
        if r < start or l > end:
            return float('inf')
        if l <= start and end <= r:
            return self.tree[node]
        mid = (start + end) // 2
        left = self._query(2 * node + 1, start, mid, l, r)
        right = self._query(2 * node + 2, mid + 1, end, l, r)
        return self.merge(left, right)

if __name__ == "__main__":
    arr = [1, 3, 5, 7, 9, 11]
    st = SegmentTree(arr, min)
    print("Min in [1, 3]:", st.query(1, 3))
    st.update(1, 0)
    print("Min in [1, 3] after update:", st.query(1, 3))
    print("Min in [0, 5]:", st.query(0, 5))
    print("Correct:", st.query(0, 5) == 0)
