from collections import defaultdict, deque
import math

class Edge:
    def __init__(self, to, rev, cap):
        self.to = to
        self.rev = rev
        self.cap = cap

class Dinic:
    def __init__(self, n):
        self.n = n
        self.graph = [[] for _ in range(n)]
        self.level = [0] * n
        self.it = [0] * n

    def add_edge(self, fr, to, cap):
        forward = Edge(to, len(self.graph[to]), cap)
        backward = Edge(fr, len(self.graph[fr]), 0)
        self.graph[fr].append(forward)
        self.graph[to].append(backward)

    def bfs(self, s, t):
        self.level = [-1] * self.n
        self.level[s] = 0
        q = deque([s])
        while q:
            v = q.popleft()
            for e in self.graph[v]:
                if e.cap > 0 and self.level[e.to] < 0:
                    self.level[e.to] = self.level[v] + 1
                    q.append(e.to)
        return self.level[t] >= 0

    def dfs(self, v, t, f):
        if v == t:
            return f
        for i in range(self.it[v], len(self.graph[v])):
            self.it[v] = i
            e = self.graph[v][i]
            if e.cap > 0 and self.level[v] < self.level[e.to]:
                d = self.dfs(e.to, t, min(f, e.cap))
                if d > 0:
                    e.cap -= d
                    self.graph[e.to][e.rev].cap += d
                    return d
        return 0

    def max_flow(self, s, t):
        flow = 0
        while self.bfs(s, t):
            self.it = [0] * self.n
            while True:
                f = self.dfs(s, t, float("inf"))
                if f == 0:
                    break
                flow += f
        return flow

    def min_cut(self, s):
        # nodes reachable from s in residual
        visited = [False] * self.n
        q = deque([s])
        visited[s] = True
        while q:
            v = q.popleft()
            for e in self.graph[v]:
                if e.cap > 0 and not visited[e.to]:
                    visited[e.to] = True
                    q.append(e.to)
        return visited

def edmonds_karp(n, edges, s, t):
    graph = defaultdict(dict)
    for u, v, c in edges:
        graph[u][v] = graph[u].get(v, 0) + c
        graph[v][u] = graph[v].get(u, 0)
    maxflow = 0
    while True:
        parent = {s: None}
        q = deque([s])
        found = False
        while q and not found:
            u = q.popleft()
            for v, cap in graph[u].items():
                if v not in parent and cap > 0:
                    parent[v] = u
                    if v == t:
                        found = True
                        break
                    q.append(v)
        if not found:
            break
        # bottleneck
        v = t
        bottleneck = float("inf")
        while parent[v] is not None:
            u = parent[v]
            bottleneck = min(bottleneck, graph[u][v])
            v = u
        v = t
        while parent[v] is not None:
            u = parent[v]
            graph[u][v] -= bottleneck
            graph[v][u] += bottleneck
            v = u
        maxflow += bottleneck
    return maxflow

if __name__ == "__main__":
    # classic example
    # 0=s, 1,2,3,4,5=t
    edges = [
        (0, 1, 10), (0, 2, 10),
        (1, 2, 2), (1, 3, 4), (1, 4, 8),
        (2, 4, 9),
        (3, 5, 10),
        (4, 3, 6), (4, 5, 10),
    ]
    n = 6
    dinic = Dinic(n)
    for u, v, c in edges:
        dinic.add_edge(u, v, c)
    flow = dinic.max_flow(0, 5)
    print("Dinic max flow     :", flow)
    print("Edmonds-Karp flow  :", edmonds_karp(n, edges, 0, 5))
    print("Flows agree        :", flow == edmonds_karp(n, edges, 0, 5))
    cut = dinic.min_cut(0)
    print("Min-cut S side     :", [i for i, v in enumerate(cut) if v])
    print("Min-cut T side     :", [i for i, v in enumerate(cut) if not v])
    print()

    # bipartite matching via flow
    # left 0..2, right 3..5, s=6, t=7
    n2 = 8
    d2 = Dinic(n2)
    for i in range(3):
        d2.add_edge(6, i, 1)
    for i in range(3, 6):
        d2.add_edge(i, 7, 1)
    pairs = [(0, 3), (0, 4), (1, 4), (1, 5), (2, 5)]
    for u, v in pairs:
        d2.add_edge(u, v, 1)
    matching = d2.max_flow(6, 7)
    print("Bipartite matching :", matching)
    print()

    # larger random-ish
    import random
    random.seed(1)
    n3 = 20
    d3 = Dinic(n3)
    ek_edges = []
    for _ in range(60):
        u, v = random.randint(0, 18), random.randint(0, 18)
        if u != v:
            c = random.randint(1, 20)
            d3.add_edge(u, v, c)
            ek_edges.append((u, v, c))
    f1 = d3.max_flow(0, 19)
    f2 = edmonds_karp(n3, ek_edges, 0, 19)
    print("Random graph flow  :", f1, "vs", f2, "agree:", f1 == f2)
