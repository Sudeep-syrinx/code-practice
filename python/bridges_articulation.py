from collections import defaultdict


def find_bridges_and_articulation(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    time = 0
    disc = [-1] * n
    low = [-1] * n
    parent = [-1] * n
    bridges = []
    articulation = set()

    def dfs(u):
        nonlocal time
        children = 0
        disc[u] = low[u] = time
        time += 1
        for v in adj[u]:
            if disc[v] == -1:
                parent[v] = u
                children += 1
                dfs(v)
                low[u] = min(low[u], low[v])
                if parent[u] == -1 and children > 1:
                    articulation.add(u)
                if parent[u] != -1 and low[v] >= disc[u]:
                    articulation.add(u)
                if low[v] > disc[u]:
                    bridges.append((min(u, v), max(u, v)))
            elif v != parent[u]:
                low[u] = min(low[u], disc[v])

    for i in range(n):
        if disc[i] == -1:
            dfs(i)

    return sorted(bridges), sorted(articulation)


if __name__ == "__main__":
    # classic example
    edges = [
        (0, 1), (1, 2), (2, 0),   # triangle
        (1, 3), (3, 4), (4, 5), (5, 3),  # another cycle attached by bridge 1-3
    ]
    bridges, arts = find_bridges_and_articulation(6, edges)
    print("Bridges                :", bridges)
    print("Articulation points    :", arts)
    print("Expected bridge (1,3)  :", bridges == [(1, 3)])
    print("Expected arts 1 and 3  :", arts == [1, 3])

    # simple chain
    chain = [(0, 1), (1, 2), (2, 3)]
    b, a = find_bridges_and_articulation(4, chain)
    print()
    print("Chain bridges          :", b)
    print("Chain articulations    :", a)
    print("All edges are bridges  :", len(b) == 3)
    print("Middle nodes are arts  :", a == [1, 2])

    # complete graph K4 - no bridges, no articulation
    k4 = [(i, j) for i in range(4) for j in range(i + 1, 4)]
    b, a = find_bridges_and_articulation(4, k4)
    print()
    print("K4 bridges             :", b)
    print("K4 articulations       :", a)
    print("K4 has none            :", b == [] and a == [])

    # two triangles connected by one edge
    edges2 = [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3)]
    b, a = find_bridges_and_articulation(6, edges2)
    print()
    print("Two triangles bridge   :", b)
    print("Two triangles arts     :", a)
    print("Bridge is (2,3)        :", b == [(2, 3)])
