import heapq


def dijkstra(graph, source):
    dist = {node: float("inf") for node in graph}
    prev = {node: None for node in graph}
    dist[source] = 0
    pq = [(0, source)]
    settled = set()
    while pq:
        d, node = heapq.heappop(pq)
        if node in settled:
            continue
        settled.add(node)
        for nxt, weight in graph[node]:
            if weight < 0:
                raise ValueError("Negative weights are not allowed")
            cand = d + weight
            if cand < dist[nxt]:
                dist[nxt] = cand
                prev[nxt] = node
                heapq.heappush(pq, (cand, nxt))
    return dist, prev


def reconstruct(prev, source, target):
    if prev[target] is None and target != source:
        return None
    path = [target]
    while path[-1] != source:
        path.append(prev[path[-1]])
    return path[::-1]


def bellman_ford(graph, source):
    dist = {node: float("inf") for node in graph}
    dist[source] = 0
    edges = [(u, v, w) for u in graph for v, w in graph[u]]
    for _ in range(len(graph) - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:
            break
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            raise ValueError("Graph has a negative cycle")
    return dist


if __name__ == "__main__":
    graph = {
        "a": [("b", 4), ("c", 1)],
        "b": [("d", 1)],
        "c": [("b", 2), ("d", 5)],
        "d": [("e", 3)],
        "e": [],
    }
    dist, prev = dijkstra(graph, "a")
    print("Distances  :", dist)
    print("Path a->e  :", reconstruct(prev, "a", "e"))
    print("Bellman    :", bellman_ford(graph, "a"))
    print("Agree      :", dist == bellman_ford(graph, "a"))
    try:
        dijkstra({"a": [("b", -1)], "b": []}, "a")
    except ValueError as e:
        print("Caught     :", e)
