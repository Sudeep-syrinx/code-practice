from collections import defaultdict


def tarjan_scc(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)

    index = 0
    stack = []
    onstack = [False] * n
    indices = [-1] * n
    lowlink = [0] * n
    sccs = []

    def strongconnect(v):
        nonlocal index
        indices[v] = lowlink[v] = index
        index += 1
        stack.append(v)
        onstack[v] = True

        for w in adj[v]:
            if indices[w] == -1:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif onstack[w]:
                lowlink[v] = min(lowlink[v], indices[w])

        if lowlink[v] == indices[v]:
            comp = []
            while True:
                w = stack.pop()
                onstack[w] = False
                comp.append(w)
                if w == v:
                    break
            sccs.append(sorted(comp))

    for v in range(n):
        if indices[v] == -1:
            strongconnect(v)
    return sorted(sccs, key=lambda c: c[0])


def kosaraju(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        radj[v].append(u)

    order = []
    visited = [False] * n

    def dfs1(v):
        visited[v] = True
        for w in adj[v]:
            if not visited[w]:
                dfs1(w)
        order.append(v)

    for v in range(n):
        if not visited[v]:
            dfs1(v)

    visited = [False] * n
    sccs = []

    def dfs2(v, comp):
        visited[v] = True
        comp.append(v)
        for w in radj[v]:
            if not visited[w]:
                dfs2(w, comp)

    for v in reversed(order):
        if not visited[v]:
            comp = []
            dfs2(v, comp)
            sccs.append(sorted(comp))
    return sorted(sccs, key=lambda c: c[0])


if __name__ == "__main__":
    edges = [
        (0, 1), (1, 2), (2, 0),   # component 0-1-2
        (1, 3),
        (3, 4), (4, 5), (5, 3),   # component 3-4-5
        (5, 6),
    ]
    t = tarjan_scc(7, edges)
    k = kosaraju(7, edges)
    print("Tarjan SCCs          :", t)
    print("Kosaraju SCCs        :", k)
    print("Both agree           :", t == k)
    print("Expected 3 non-trivial + singles")

    # single nodes
    print()
    print("Empty graph          :", tarjan_scc(3, []) == [[0], [1], [2]])
    print("Chain                :", tarjan_scc(3, [(0, 1), (1, 2)]))

    # complete mutual
    edges2 = [(i, j) for i in range(4) for j in range(4) if i != j]
    scc = tarjan_scc(4, edges2)
    print("Complete digraph     :", scc)
    print("One big component    :", scc == [[0, 1, 2, 3]])

    # random agreement
    import random
    rng = random.Random(11)
    ok = True
    for _ in range(50):
        n = rng.randint(3, 12)
        e = []
        for _ in range(rng.randint(0, n * 2)):
            u, v = rng.randrange(n), rng.randrange(n)
            if u != v:
                e.append((u, v))
        if tarjan_scc(n, e) != kosaraju(n, e):
            ok = False
    print("50 random graphs ok  :", ok)
