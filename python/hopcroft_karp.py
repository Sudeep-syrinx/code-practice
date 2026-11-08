from collections import deque


def hopcroft_karp(graph, n_left, n_right):
    """
    graph: dict left_node -> list of right_nodes
    left nodes: 0..n_left-1
    right nodes: 0..n_right-1
    Returns size of maximum matching and pair_u, pair_v
    """
    pair_u = [-1] * n_left
    pair_v = [-1] * n_right
    dist = [0] * n_left

    def bfs():
        q = deque()
        for u in range(n_left):
            if pair_u[u] == -1:
                dist[u] = 0
                q.append(u)
            else:
                dist[u] = float("inf")
        found = False
        while q:
            u = q.popleft()
            for v in graph.get(u, []):
                if pair_v[v] == -1:
                    found = True
                elif dist[pair_v[v]] == float("inf"):
                    dist[pair_v[v]] = dist[u] + 1
                    q.append(pair_v[v])
        return found

    def dfs(u):
        for v in graph.get(u, []):
            if pair_v[v] == -1 or (dist[pair_v[v]] == dist[u] + 1 and dfs(pair_v[v])):
                pair_u[u] = v
                pair_v[v] = u
                return True
        dist[u] = float("inf")
        return False

    matching = 0
    while bfs():
        for u in range(n_left):
            if pair_u[u] == -1 and dfs(u):
                matching += 1
    return matching, pair_u, pair_v


if __name__ == "__main__":
    # classic
    g = {
        0: [0, 1],
        1: [0, 2],
        2: [1, 2],
        3: [2],
    }
    size, pu, pv = hopcroft_karp(g, 4, 3)
    print("Matching size        :", size)
    print("pair_u               :", pu)
    print("Expected size 3      :", size == 3)

    # complete bipartite K_{3,3}
    g2 = {i: list(range(3)) for i in range(3)}
    size2, _, _ = hopcroft_karp(g2, 3, 3)
    print()
    print("K3,3 matching        :", size2)
    print("Expected 3           :", size2 == 3)

    # empty
    size3, _, _ = hopcroft_karp({}, 2, 2)
    print("Empty                :", size3 == 0)

    # chain
    g4 = {0: [0], 1: [0, 1], 2: [1, 2]}
    size4, pu4, _ = hopcroft_karp(g4, 3, 3)
    print("Chain size           :", size4)
    print("Expected 3           :", size4 == 3)
