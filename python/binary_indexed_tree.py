class Fenwick:
    def __init__(self, size):
        self.size = size
        self.tree = [0] * (size + 1)

    def update(self, index, delta):
        if not 1 <= index <= self.size:
            raise IndexError("index out of range")
        i = index
        while i <= self.size:
            self.tree[i] += delta
            i += i & -i

    def prefix_sum(self, index):
        total = 0
        i = min(index, self.size)
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total

    def range_sum(self, left, right):
        if left > right:
            return 0
        return self.prefix_sum(right) - self.prefix_sum(left - 1)


class RangeUpdateFenwick:
    def __init__(self, size):
        self.size = size
        self.a = [0] * (size + 1)
        self.b = [0] * (size + 1)

    def _add(self, arr, i, delta):
        while i <= self.size:
            arr[i] += delta
            i += i & -i

    def update_range(self, left, right, delta):
        self._add(self.a, left, delta)
        self._add(self.a, right + 1, -delta)
        self._add(self.b, left, delta * (left - 1))
        self._add(self.b, right + 1, -delta * right)

    def _prefix(self, arr, i):
        total = 0
        while i > 0:
            total += arr[i]
            i -= i & -i
        return total

    def point_query(self, index):
        return self._prefix(self.a, index)

    def range_query(self, left, right):
        return (right * self._prefix(self.a, right) - self._prefix(self.b, right)) - \
               ((left - 1) * self._prefix(self.a, left - 1) - self._prefix(self.b, left - 1))


if __name__ == "__main__":
    fw = Fenwick(8)
    for i, v in enumerate([3, 2, 5, 1, 4, 6, 2, 7], start=1):
        fw.update(i, v)
    print("Prefix 4   :", fw.prefix_sum(4))
    print("Range 3-6  :", fw.range_sum(3, 6))
    print("Full sum   :", fw.prefix_sum(8), sum([3, 2, 5, 1, 4, 6, 2, 7]))
    rf = RangeUpdateFenwick(10)
    rf.update_range(2, 5, 3)
    rf.update_range(4, 8, 2)
    print("Point 3    :", rf.point_query(3))
    print("Range 3-6  :", rf.range_query(3, 6))
    print("Point 9    :", rf.point_query(9))
