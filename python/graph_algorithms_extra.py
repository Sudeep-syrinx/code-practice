from collections import defaultdict, deque
import math

class Graph:
    def __init__(self):
        self.adj = defaultdict(list)

    def add_edge(self, u, v, w=1, directed=False):
        self.adj[u].append((v, w))
        if not directed:
            self.adj[v].append((u, w))

def bellman_ford(graph, start):
    nodes = list(graph.adj.keys())
    for u in list(graph.adj.keys()):
        for v, _ in graph.adj[u]:
            if v not in nodes:
                nodes.append(v)
    dist = {n: float("inf") for n in nodes}
    dist[start] = 0
    pred = {n: None for n in nodes}
    for _ in range(len(nodes) - 1):
        updated = False
        for u in nodes:
            if dist[u] == float("inf"):
                continue
            for v, w in graph.adj[u]:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    pred[v] = u
                    updated = True
        if not updated:
            break
    # negative cycle check
    for u in nodes:
        if dist[u] == float("inf"):
            continue
        for v, w in graph.adj[u]:
            if dist[u] + w < dist[v]:
                return None, None, True
    return dist, pred, False

def floyd_warshall(n, edges):
    dist = [[float("inf")] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist

def topological_sort(n, edges):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1
    q = deque([i for i in range(n) if indeg[i] == 0])
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else None

if __name__ == "__main__":
    g = Graph()
    for u, v, w in [(0,1,4),(0,2,5),(1,2,-3),(2,3,4),(1,3,2)]:
        g.add_edge(u, v, w, directed=True)
    dist, pred, neg = bellman_ford(g, 0)
    print("Bellman-Ford from 0")
    print("  distances :", dist)
    print("  neg cycle :", neg)
    print()
    edges = [(0,1,3),(0,2,8),(1,2,2),(1,3,5),(2,3,1),(3,0,10)]
    fw = floyd_warshall(4, edges)
    print("Floyd-Warshall")
    for row in fw:
        print(" ", [round(x,1) if x != float("inf") else "inf" for x in row])
    print()
    order = topological_sort(6, [(0,1),(0,2),(1,3),(2,3),(3,4),(2,5)])
    print("Topo sort         :", order)
    print("Cycle returns None:", topological_sort(3, [(0,1),(1,2),(2,0)]))
