class FenwickTree:
    def __init__(self, size):
        self.size = size
        self.tree = [0] * (size + 1)

    def update(self, index, delta):
        while index <= self.size:
            self.tree[index] += delta
            index += index & -index

    def query(self, index):
        total = 0
        while index > 0:
            total += self.tree[index]
            index -= index & -index
        return total

    def range_query(self, left, right):
        return self.query(right) - self.query(left - 1)

class SegmentTree:
    def __init__(self, data):
        self.n = len(data)
        self.tree = [0] * (2 * self.n)
        for i in range(self.n):
            self.tree[self.n + i] = data[i]
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self.tree[i << 1] + self.tree[i << 1 | 1]

    def update(self, pos, value):
        pos += self.n
        self.tree[pos] = value
        while pos > 1:
            self.tree[pos >> 1] = self.tree[pos] + self.tree[pos ^ 1]
            pos >>= 1

    def query(self, left, right):
        res = 0
        left += self.n
        right += self.n
        while left < right:
            if left & 1:
                res += self.tree[left]
                left += 1
            if right & 1:
                right -= 1
                res += self.tree[right]
            left >>= 1
            right >>= 1
        return res

if __name__ == "__main__":
    arr = [1, 3, 5, 7, 9, 11]
    ft = FenwickTree(len(arr))
    for i, val in enumerate(arr):
        ft.update(i + 1, val)
    print("Fenwick query 1-3:", ft.range_query(1, 3))
    
    st = SegmentTree(arr)
    print("Segment Tree query 1-3:", st.query(1, 4))
    print("Test passed:", ft.range_query(1, 3) == 9 and st.query(1, 4) == 15)
