from collections import defaultdict, deque
import math


def min_cost_max_flow(n, edges, source, sink):
    """
    edges: list of (u, v, capacity, cost)
    Returns (max_flow, min_cost)
    """
    graph = defaultdict(list)
    for u, v, cap, cost in edges:
        graph[u].append([v, cap, cost, len(graph[v])])
        graph[v].append([u, 0, -cost, len(graph[u]) - 1])

    flow = cost = 0
    while True:
        dist = [math.inf] * n
        dist[source] = 0
        parent = [-1] * n
        pe = [-1] * n
        inq = [False] * n
        q = deque([source])
        inq[source] = True
        while q:
            u = q.popleft()
            inq[u] = False
            for i, (v, cap, c, _) in enumerate(graph[u]):
                if cap > 0 and dist[v] > dist[u] + c:
                    dist[v] = dist[u] + c
                    parent[v] = u
                    pe[v] = i
                    if not inq[v]:
                        q.append(v)
                        inq[v] = True
        if dist[sink] == math.inf:
            break
        # find bottleneck
        f = math.inf
        v = sink
        while v != source:
            u = parent[v]
            f = min(f, graph[u][pe[v]][1])
            v = u
        # apply
        v = sink
        while v != source:
            u = parent[v]
            edge = graph[u][pe[v]]
            edge[1] -= f
            graph[v][edge[3]][1] += f
            v = u
        flow += f
        cost += f * dist[sink]
    return flow, cost


if __name__ == "__main__":
    # simple example
    # 0 -> 1 (cap 2, cost 2)
    # 0 -> 2 (cap 4, cost 6)
    # 1 -> 2 (cap 3, cost 1)
    # 1 -> 3 (cap 5, cost 3)
    # 2 -> 3 (cap 2, cost 2)
    edges = [
        (0, 1, 2, 2),
        (0, 2, 4, 6),
        (1, 2, 3, 1),
        (1, 3, 5, 3),
        (2, 3, 2, 2),
    ]
    flow, cost = min_cost_max_flow(4, edges, 0, 3)
    print("Max flow             :", flow)
    print("Min cost             :", cost)
    print("Expected flow 6      :", flow == 6)

    # single path
    edges2 = [(0, 1, 5, 3), (1, 2, 4, 2)]
    f2, c2 = min_cost_max_flow(3, edges2, 0, 2)
    print()
    print("Single path flow     :", f2)
    print("Single path cost     :", c2)
    print("Expected 4 / 20      :", f2 == 4 and c2 == 20)

    # no path
    f3, c3 = min_cost_max_flow(3, [(0, 1, 1, 1)], 0, 2)
    print("No path              :", f3 == 0 and c3 == 0)
