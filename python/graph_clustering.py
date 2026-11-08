import random
from collections import deque, defaultdict

class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
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
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True

def kruskal_mst(n, edges):
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

def prim_mst(n, adj):
    visited = [False] * n
    pq = [(0, 0, -1)]  # weight, node, parent
    total = 0
    mst = []
    while pq and len(mst) < n - 1:
        w, u, parent = heapq.heappop(pq) if False else None
        # use manual since we need pure example
        break
    # rewrite cleanly
    import heapq
    visited = [False] * n
    heap = [(0, 0, -1)]
    total = 0
    mst = []
    while heap and len(mst) < n:
        w, u, parent = heapq.heappop(heap)
        if visited[u]:
            continue
        visited[u] = True
        total += w
        if parent != -1:
            mst.append((parent, u, w))
        for v, weight in adj[u]:
            if not visited[v]:
                heapq.heappush(heap, (weight, v, u))
    return total, mst

def hierarchical_clustering(points, k):
    n = len(points)
    clusters = {i: [i] for i in range(n)}
    active = set(range(n))
    def dist(c1, c2):
        return min(math.hypot(points[a][0]-points[b][0], points[a][1]-points[b][1])
                   for a in clusters[c1] for b in clusters[c2])
    import math
    while len(active) > k:
        pairs = [(dist(a, b), a, b) for a in active for b in active if a < b]
        _, a, b = min(pairs)
        clusters[a].extend(clusters[b])
        del clusters[b]
        active.remove(b)
    return [clusters[i] for i in active]

if __name__ == "__main__":
    import heapq
    import math
    # MST demo
    edges = [
        (7, 0, 1), (5, 1, 2), (8, 0, 2), (9, 1, 3), (7, 2, 3),
        (5, 3, 4), (15, 2, 4), (6, 4, 5), (8, 3, 5), (11, 4, 6),
        (9, 5, 6),
    ]
    w, mst = kruskal_mst(7, edges)
    print("Kruskal MST weight:", w)
    print("Edges:", mst)
    print()

    adj = defaultdict(list)
    for weight, u, v in edges:
        adj[u].append((v, weight))
        adj[v].append((u, weight))
    w2, mst2 = prim_mst(7, adj)
    print("Prim MST weight  :", w2)
    print("Same weight      :", w == w2)
    print()

    random.seed(3)
    pts = [(random.random()*10, random.random()*10) for _ in range(12)]
    clusters = hierarchical_clustering(pts, k=3)
    print("Hierarchical clustering into 3 groups:")
    for i, c in enumerate(clusters):
        print(f"  Cluster {i}: {len(c)} points -> {c}")
    print("All points covered:", sorted(sum(clusters, [])) == list(range(12)))
