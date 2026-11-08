import math
import random
from collections import defaultdict


def euclidean(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def dbscan(points, eps, min_pts):
    n = len(points)
    labels = [-1] * n          # -1 = noise, >=0 cluster id
    cluster_id = 0
    visited = [False] * n

    def region_query(i):
        return [j for j in range(n) if euclidean(points[i], points[j]) <= eps]

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        neighbors = region_query(i)
        if len(neighbors) < min_pts:
            labels[i] = -1
            continue
        labels[i] = cluster_id
        seed = list(neighbors)
        k = 0
        while k < len(seed):
            j = seed[k]
            if not visited[j]:
                visited[j] = True
                j_neighbors = region_query(j)
                if len(j_neighbors) >= min_pts:
                    seed.extend(j_neighbors)
            if labels[j] == -1:
                labels[j] = cluster_id
            if labels[j] == -1 or labels[j] is None:
                labels[j] = cluster_id
            if labels[j] < 0:
                labels[j] = cluster_id
            k += 1
        # fix: only assign unlabelled
        # rewrite cleaner below
        cluster_id += 1

    # cleaner re-implementation for correctness
    return _dbscan_clean(points, eps, min_pts)


def _dbscan_clean(points, eps, min_pts):
    n = len(points)
    labels = [None] * n
    cluster = 0

    def neighbors(i):
        return [j for j in range(n) if euclidean(points[i], points[j]) <= eps]

    for i in range(n):
        if labels[i] is not None:
            continue
        neigh = neighbors(i)
        if len(neigh) < min_pts:
            labels[i] = -1
            continue
        labels[i] = cluster
        queue = list(neigh)
        seen = set(neigh)
        while queue:
            j = queue.pop()
            if labels[j] == -1:
                labels[j] = cluster
            if labels[j] is not None:
                continue
            labels[j] = cluster
            j_neigh = neighbors(j)
            if len(j_neigh) >= min_pts:
                for k in j_neigh:
                    if k not in seen:
                        seen.add(k)
                        queue.append(k)
        cluster += 1
    return labels


if __name__ == "__main__":
    random.seed(10)
    # two blobs + noise
    blob1 = [(random.gauss(0, 0.4), random.gauss(0, 0.4)) for _ in range(40)]
    blob2 = [(random.gauss(5, 0.4), random.gauss(5, 0.4)) for _ in range(40)]
    noise = [(random.uniform(-2, 7), random.uniform(-2, 7)) for _ in range(8)]
    data = blob1 + blob2 + noise

    labels = _dbscan_clean(data, eps=0.9, min_pts=4)
    clusters = defaultdict(list)
    for i, lab in enumerate(labels):
        clusters[lab].append(i)

    print("Cluster sizes        :", {k: len(v) for k, v in sorted(clusters.items())})
    print("Found 2 main clusters:", sum(1 for k, v in clusters.items() if k >= 0 and len(v) > 10) == 2)
    print("Noise points         :", len(clusters.get(-1, [])))

    # single dense cluster
    dense = [(random.gauss(0, 0.2), random.gauss(0, 0.2)) for _ in range(30)]
    lab2 = _dbscan_clean(dense, eps=0.5, min_pts=3)
    print()
    print("Dense all one cluster:", len(set(l for l in lab2 if l >= 0)) == 1)
    print("No noise in dense    :", all(l >= 0 for l in lab2))
