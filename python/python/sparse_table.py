import math


class SparseTable:
    def __init__(self, data, op=min):
        self.n = len(data)
        self.op = op
        self.log = [0] * (self.n + 1)
        for i in range(2, self.n + 1):
            self.log[i] = self.log[i // 2] + 1
        k = self.log[self.n] + 1
        self.st = [[0] * self.n for _ in range(k)]
        self.st[0] = data[:]
        for j in range(1, k):
            for i in range(self.n - (1 << j) + 1):
                self.st[j][i] = op(self.st[j - 1][i], self.st[j - 1][i + (1 << (j - 1))])

    def query(self, left, right):
        if left > right:
            raise ValueError("left > right")
        j = self.log[right - left + 1]
        return self.op(self.st[j][left], self.st[j][right - (1 << j) + 1])


if __name__ == "__main__":
    arr = [4, 2, 3, 7, 1, 5, 3, 3, 9, 6]
    st_min = SparseTable(arr, min)
    st_max = SparseTable(arr, max)

    print("Min [0..9]             :", st_min.query(0, 9))
    print("Min [2..5]             :", st_min.query(2, 5))
    print("Max [0..9]             :", st_max.query(0, 9))
    print("Max [4..7]             :", st_max.query(4, 7))
    print("Single element         :", st_min.query(3, 3))

    import random
    rng = random.Random(5)
    ok = True
    for _ in range(250):
        n = rng.randint(1, 100)
        data = [rng.randint(-100, 100) for _ in range(n)]
        table = SparseTable(data, min)
        for _ in range(30):
            l = rng.randrange(n)
            r = rng.randrange(l, n)
            if table.query(l, r) != min(data[l : r + 1]):
                ok = False
    print("250 random min queries :", ok)

    # max version
    ok_max = True
    for _ in range(100):
        n = rng.randint(1, 60)
        data = [rng.randint(0, 200) for _ in range(n)]
        table = SparseTable(data, max)
        for _ in range(20):
            l = rng.randrange(n)
            r = rng.randrange(l, n)
            if table.query(l, r) != max(data[l : r + 1]):
                ok_max = False
    print("100 random max queries :", ok_max)
