import heapq
from collections import deque


def kahn(graph):
    indegree = {node: 0 for node in graph}
    for node in graph:
        for nxt in graph[node]:
            indegree[nxt] = indegree.get(nxt, 0) + 1
    ready = [n for n in graph if indegree.get(n, 0) == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        node = heapq.heappop(ready)
        order.append(node)
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                heapq.heappush(ready, nxt)
    if len(order) != len(graph):
        raise ValueError("Graph has a cycle")
    return order


def dfs_order(graph):
    visited = {}
    order = []

    def visit(node):
        visited[node] = "gray"
        for nxt in graph.get(node, []):
            state = visited.get(nxt)
            if state == "gray":
                raise ValueError("Graph has a cycle")
            if state is None:
                visit(nxt)
        visited[node] = "black"
        order.append(node)

    for node in graph:
        if visited.get(node) is None:
            visit(node)
    return order[::-1]


def longest_path(graph, weights):
    order = kahn(graph)
    dist = {node: float("-inf") for node in graph}
    dist[order[0]] = 0
    for node in order:
        if dist[node] == float("-inf"):
            continue
        for nxt in graph[node]:
            candidate = dist[node] + weights[(node, nxt)]
            if candidate > dist[nxt]:
                dist[nxt] = candidate
    return dist


if __name__ == "__main__":
    courses = {
        "algo": ["data"],
        "data": [],
        "os": ["data"],
        "net": ["os"],
        "ml": ["algo", "data"],
        "capstone": ["ml", "net"],
    }
    print("Kahn order   :", kahn(courses))
    print("DFS order    :", dfs_order(courses))
    print("Both valid   :", set(kahn(courses)) == set(dfs_order(courses)))
    weighted = {"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []}
    w = {("a", "b"): 3, ("a", "c"): 2, ("b", "d"): 4, ("c", "d"): 6}
    print("Longest path :", longest_path(weighted, w))
    try:
        kahn({"a": ["b"], "b": ["a"]})
    except ValueError as e:
        print("Cycle caught :", e)
