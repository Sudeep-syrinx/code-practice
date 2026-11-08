class BinaryLifting:
    def __init__(self, n, root, edges):
        self.n = n
        self.LOG = (n).bit_length()
        self.up = [[-1] * self.LOG for _ in range(n)]
        self.depth = [0] * n
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        self._dfs(root, -1)

    def _dfs(self, u, p):
        self.up[u][0] = p
        for k in range(1, self.LOG):
            if self.up[u][k - 1] != -1:
                self.up[u][k] = self.up[self.up[u][k - 1]][k - 1]
        for v in self.adj[u]:
            if v != p:
                self.depth[v] = self.depth[u] + 1
                self._dfs(v, u)

    def lift(self, u, dist):
        for k in range(self.LOG):
            if dist & (1 << k):
                u = self.up[u][k]
                if u == -1:
                    return -1
        return u

    def lca(self, a, b):
        if self.depth[a] < self.depth[b]:
            a, b = b, a
        a = self.lift(a, self.depth[a] - self.depth[b])
        if a == b:
            return a
        for k in range(self.LOG - 1, -1, -1):
            if self.up[a][k] != self.up[b][k]:
                a = self.up[a][k]
                b = self.up[b][k]
        return self.up[a][0]

    def dist(self, a, b):
        return self.depth[a] + self.depth[b] - 2 * self.depth[self.lca(a, b)]


if __name__ == "__main__":
    # Tree: 0-1-3
    #         \-4
    #       2-5
    edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5)]
    bl = BinaryLifting(6, 0, edges)

    print("LCA(3,4)             :", bl.lca(3, 4))
    print("LCA(3,5)             :", bl.lca(3, 5))
    print("LCA(4,5)             :", bl.lca(4, 5))
    print("Dist(3,5)            :", bl.dist(3, 5))
    print("Dist(4,4)            :", bl.dist(4, 4))
    print("Ancestor of 5 up 1   :", bl.lift(5, 1))
    print("Ancestor of 3 up 2   :", bl.lift(3, 2))

    print("Expected LCA(3,4)=1  :", bl.lca(3, 4) == 1)
    print("Expected LCA(3,5)=0  :", bl.lca(3, 5) == 0)
    print("Expected dist(3,5)=4 :", bl.dist(3, 5) == 4)

    # deeper chain
    chain = [(i, i + 1) for i in range(15)]
    bl2 = BinaryLifting(16, 0, chain)
    print("Chain LCA(5,12)      :", bl2.lca(5, 12))
    print("Chain dist(3,14)     :", bl2.dist(3, 14))
    print("Chain checks         :", bl2.lca(5, 12) == 5 and bl2.dist(3, 14) == 11)
