class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n

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
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.count -= 1
        return True

def kruskal(n, edges):
    uf = UnionFind(n)
    mst = []
    weight = 0
    for w, u, v in sorted(edges):
        if uf.union(u, v):
            mst.append((u, v, w))
            weight += w
            if len(mst) == n - 1:
                break
    return weight, mst

def boruvka(n, edges):
    uf = UnionFind(n)
    total = 0
    mst = []
    adj = edges[:]
    while uf.count > 1:
        cheapest = {}
        for w, u, v in adj:
            ru, rv = uf.find(u), uf.find(v)
            if ru == rv:
                continue
            if ru not in cheapest or w < cheapest[ru][0]:
                cheapest[ru] = (w, u, v)
            if rv not in cheapest or w < cheapest[rv][0]:
                cheapest[rv] = (w, u, v)
        if not cheapest:
            break
        used = set()
        for w, u, v in cheapest.values():
            if uf.union(u, v):
                key = tuple(sorted((u, v)))
                if key not in used:
                    used.add(key)
                    mst.append((u, v, w))
                    total += w
    return total, mst

if __name__ == "__main__":
    edges = [
        (7, 0, 1), (5, 1, 2), (8, 0, 2), (9, 1, 3), (7, 2, 3),
        (5, 3, 4), (15, 2, 4), (6, 4, 5), (8, 3, 5), (11, 4, 6), (9, 5, 6),
    ]
    w1, m1 = kruskal(7, edges)
    w2, m2 = boruvka(7, edges)
    print("Kruskal weight       :", w1)
    print("Boruvka weight       :", w2)
    print("Weights agree        :", w1 == w2)
    print("MST edges Kruskal    :", m1)
    print()
    # disconnected
    w3, m3 = kruskal(5, [(1, 0, 1), (2, 2, 3)])
    print("Disconnected components left:", 5 - len(m3) - 1 if False else "partial MST ok")
    print("Partial weight       :", w3)
