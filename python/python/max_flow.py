from collections import deque


def edmonds_karp(capacity, source, sink):
    n = len(capacity)
    residual = [row[:] for row in capacity]
    parent = [-1] * n
    max_flow = 0

    def bfs():
        visited = [False] * n
        q = deque([source])
        visited[source] = True
        parent[source] = -2
        while q:
            u = q.popleft()
            for v in range(n):
                if not visited[v] and residual[u][v] > 0:
                    visited[v] = True
                    parent[v] = u
                    if v == sink:
                        return True
                    q.append(v)
        return False

    while bfs():
        path_flow = float("inf")
        v = sink
        while v != source:
            u = parent[v]
            path_flow = min(path_flow, residual[u][v])
            v = u
        v = sink
        while v != source:
            u = parent[v]
            residual[u][v] -= path_flow
            residual[v][u] += path_flow
            v = u
        max_flow += path_flow
    return max_flow


def build_graph(n, edges):
    cap = [[0] * n for _ in range(n)]
    for u, v, c in edges:
        cap[u][v] += c
    return cap


if __name__ == "__main__":
    # classic example
    edges = [
        (0, 1, 16), (0, 2, 13),
        (1, 2, 10), (1, 3, 12),
        (2, 1, 4), (2, 4, 14),
        (3, 2, 9), (3, 5, 20),
        (4, 3, 7), (4, 5, 4),
    ]
    graph = build_graph(6, edges)
    flow = edmonds_karp(graph, 0, 5)
    print("Max flow (classic)     :", flow)
    print("Expected 23            :", flow == 23)

    # simple path
    simple = build_graph(3, [(0, 1, 5), (1, 2, 3)])
    print("Simple path flow       :", edmonds_karp(simple, 0, 2))
    print("Expected 3             :", edmonds_karp(simple, 0, 2) == 3)

    # disconnected
    disc = build_graph(4, [(0, 1, 10), (2, 3, 5)])
    print("Disconnected flow      :", edmonds_karp(disc, 0, 3))
    print("Expected 0             :", edmonds_karp(disc, 0, 3) == 0)

    # multiple edges
    multi = build_graph(3, [(0, 1, 4), (0, 1, 6), (1, 2, 7)])
    print("Multi-edge flow        :", edmonds_karp(multi, 0, 2))
    print("Expected 7             :", edmonds_karp(multi, 0, 2) == 7)

    import random
    rng = random.Random(21)
    ok = True
    for _ in range(100):
        n = rng.randint(3, 12)
        edges = []
        for _ in range(rng.randint(n, n * 3)):
            u, v = rng.sample(range(n), 2)
            edges.append((u, v, rng.randint(1, 20)))
        g = build_graph(n, edges)
        f = edmonds_karp(g, 0, n - 1)
        if f < 0:
            ok = False
    print("100 random graphs ok   :", ok)
