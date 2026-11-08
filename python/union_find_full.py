class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, i):
        if self.parent[i] != i:
            self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1

def kruskal_mst(n, edges):
    uf = UnionFind(n)
    mst = []
    edges.sort(key=lambda x: x[2])
    for u, v, weight in edges:
        if uf.find(u) != uf.find(v):
            uf.union(u, v)
            mst.append((u, v, weight))
    return mst

if __name__ == "__main__":
    edges = [
        (0, 1, 10), (0, 2, 6), (0, 3, 5),
        (1, 3, 15), (2, 3, 4)
    ]
    mst = kruskal_mst(4, edges)
    print("MST Edges:", mst)
    print("Total Weight:", sum(w for _, _, w in mst))
    print("Test passed:", sum(w for _, _, w in mst) == 19)

# ==============================================================================
# EXTENDED UNION FIND OPERATIONS
# ==============================================================================

class UnionFindExtended:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n
        self.components = n

    def find(self, i):
        if self.parent[i] != i:
            self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
                self.size[root_j] += self.size[root_i]
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
                self.size[root_i] += self.size[root_j]
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
                self.size[root_i] += self.size[root_j]
            self.components -= 1

    def connected(self, i, j):
        return self.find(i) == self.find(j)

    def component_size(self, i):
        return self.size[self.find(i)]

    def count_components(self):
        return self.components

def test_union_find_extended():
    uf = UnionFindExtended(10)
    uf.union(0, 1)
    uf.union(2, 3)
    uf.union(1, 3)
    print("Connected (0, 2):", uf.connected(0, 2))
    print("Component size of 0:", uf.component_size(0))
    print("Total components:", uf.count_components())

if __name__ == "__main__":
    test_union_find_extended()
