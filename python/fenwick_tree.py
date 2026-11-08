class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.bit = [0] * (n + 1)

    def add(self, index, delta):
        i = index + 1
        while i <= self.n:
            self.bit[i] += delta
            i += i & -i

    def prefix(self, index):
        s = 0
        i = index + 1
        while i > 0:
            s += self.bit[i]
            i -= i & -i
        return s

    def range_sum(self, left, right):
        if left > right:
            return 0
        return self.prefix(right) - (self.prefix(left - 1) if left else 0)

    def set(self, index, value):
        self.add(index, value - self.range_sum(index, index))


if __name__ == "__main__":
    ft = FenwickTree(10)
    data = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    for i, v in enumerate(data):
        ft.add(i, v)

    print("Prefix 0..4          :", ft.prefix(4))
    print("Range 2..6           :", ft.range_sum(2, 6))
    print("Single 7             :", ft.range_sum(7, 7))
    ft.add(3, 10)
    print("After +10 at index 3 :", ft.range_sum(0, 9))
    ft.set(0, 100)
    print("After set index 0=100:", ft.range_sum(0, 0))

    import random
    rng = random.Random(11)
    ok = True
    for _ in range(300):
        n = rng.randint(1, 80)
        arr = [0] * n
        tree = FenwickTree(n)
        for _ in range(50):
            if rng.random() < 0.5:
                i = rng.randrange(n)
                d = rng.randint(-20, 20)
                arr[i] += d
                tree.add(i, d)
            else:
                l = rng.randrange(n)
                r = rng.randrange(l, n)
                if tree.range_sum(l, r) != sum(arr[l:r+1]):
                    ok = False
    print("300 random tests ok  :", ok)
