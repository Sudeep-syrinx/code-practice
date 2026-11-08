import heapq

def karger_min_cut(vertices, edges, trials=100):
    import random
    best_cut = float('inf')
    for _ in range(trials):
        parent = {i: i for i in range(vertices)}
        def find(i):
            if parent[i] != i:
                parent[i] = find(parent[i])
            return parent[i]
        def union(i, j):
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        current_edges = list(edges)
        while len(set(find(i) for i in range(vertices))) > 2:
            u, v = random.choice(current_edges)
            ru, rv = find(u), find(v)
            if ru != rv:
                union(ru, rv)
                new_edges = []
                for a, b in current_edges:
                    if find(a) != find(b):
                        new_edges.append((a, b))
                current_edges = new_edges

        cut_size = len(current_edges)
        if cut_size < best_cut:
            best_cut = cut_size
    return best_cut

if __name__ == "__main__":
    vertices = 6
    edges = [(0, 1), (0, 2), (1, 2), (2, 3), (3, 4), (3, 5), (4, 5)]
    min_cut = karger_min_cut(vertices, edges)
    print("Estimated Min Cut:", min_cut)
    print("Is valid:", min_cut >= 2)
