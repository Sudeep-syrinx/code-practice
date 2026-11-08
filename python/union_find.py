from collections import defaultdict


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n
        self.components = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True

    def connected(self, a, b):
        return self.find(a) == self.find(b)

    def component_size(self, x):
        return self.size[self.find(x)]


def kruskal(n, edges):
    uf = UnionFind(n)
    mst = []
    weight = 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if uf.union(u, v):
            mst.append((u, v, w))
            weight += w
            if uf.components == 1:
                break
    return mst, weight, uf.components == 1


if __name__ == "__main__":
    uf = UnionFind(10)
    pairs = [(0, 1), (1, 2), (3, 4), (5, 6), (6, 7), (8, 9), (2, 3)]
    for a, b in pairs:
        uf.union(a, b)

    print("Components after unions :", uf.components)
    print("0 and 4 connected       :", uf.connected(0, 4))
    print("0 and 5 connected       :", uf.connected(0, 5))
    print("Size of component 0     :", uf.component_size(0))
    print("Size of component 5     :", uf.component_size(5))

    edges = [
        (0, 1, 4), (0, 2, 3), (1, 2, 1), (1, 3, 2),
        (2, 3, 4), (3, 4, 2), (4, 5, 6),
    ]
    mst, total, connected = kruskal(6, edges)
    print()
    print("MST edges               :", mst)
    print("MST weight              :", total)
    print("Graph becomes connected :", connected)
    print("Expected weight 12      :", total == 12)

    # random connectivity stress
    import random
    rng = random.Random(42)
    ok = True
    for _ in range(200):
        n = rng.randint(5, 40)
        uf = UnionFind(n)
        for _ in range(rng.randint(0, n * 2)):
            uf.union(rng.randrange(n), rng.randrange(n))
        roots = {uf.find(i) for i in range(n)}
        if len(roots) != uf.components:
            ok = False
        sizes = sum(uf.component_size(r) for r in roots)
        if sizes != n:
            ok = False
    print("200 random instances ok :", ok)
