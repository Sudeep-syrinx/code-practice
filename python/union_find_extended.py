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
    total = 0
    chosen = []
    for w, u, v in sorted(edges):
        if uf.union(u, v):
            total += w
            chosen.append((u, v, w))
            if len(chosen) == n - 1:
                break
    return total, chosen


def count_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    uf = UnionFind(rows * cols)
    water = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                water += 1
                continue
            idx = r * cols + c
            if r + 1 < rows and grid[r + 1][c]:
                uf.union(idx, (r + 1) * cols + c)
            if c + 1 < cols and grid[r][c + 1]:
                uf.union(idx, r * cols + c + 1)
    return uf.components - water


if __name__ == "__main__":
    uf = UnionFind(10)
    uf.union(0, 1)
    uf.union(2, 3)
    uf.union(1, 3)
    print("Connected  :", uf.connected(0, 2))
    print("Components :", uf.components)
    print("Size of 0  :", uf.component_size(0))
    edges = [(1, 0, 1), (4, 0, 2), (2, 1, 2), (5, 1, 3), (3, 2, 3)]
    print("Kruskal    :", kruskal(4, edges))
    grid = [[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1], [0, 0, 0, 0]]
    print("Islands    :", count_islands(grid))
