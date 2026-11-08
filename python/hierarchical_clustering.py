import math
import random
from collections import defaultdict


def euclidean(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def hierarchical_clustering(points, n_clusters=2, linkage="average"):
    n = len(points)
    clusters = {i: [i] for i in range(n)}
    active = set(range(n))
    next_id = n

    def cluster_dist(c1, c2):
        dists = [euclidean(points[i], points[j]) for i in c1 for j in c2]
        if linkage == "single":
            return min(dists)
        if linkage == "complete":
            return max(dists)
        return sum(dists) / len(dists)

    while len(active) > n_clusters:
        best = None
        best_d = float("inf")
        ids = list(active)
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, b = ids[i], ids[j]
                d = cluster_dist(clusters[a], clusters[b])
                if d < best_d:
                    best_d = d
                    best = (a, b)
        a, b = best
        new = clusters[a] + clusters[b]
        clusters[next_id] = new
        active.remove(a)
        active.remove(b)
        active.add(next_id)
        next_id += 1

    labels = [-1] * n
    for lab, cid in enumerate(sorted(active)):
        for idx in clusters[cid]:
            labels[idx] = lab
    return labels


if __name__ == "__main__":
    random.seed(12)
    blob1 = [(random.gauss(0, 0.4), random.gauss(0, 0.4)) for _ in range(25)]
    blob2 = [(random.gauss(4, 0.4), random.gauss(4, 0.4)) for _ in range(25)]
    data = blob1 + blob2

    labels = hierarchical_clustering(data, n_clusters=2, linkage="average")
    from collections import Counter
    print("Cluster sizes        :", Counter(labels))
    print("Two clusters         :", len(set(labels)) == 2)

    # check separation roughly
    c0 = [data[i] for i, l in enumerate(labels) if l == 0]
    c1 = [data[i] for i, l in enumerate(labels) if l == 1]
    mean0 = (sum(p[0] for p in c0) / len(c0), sum(p[1] for p in c0) / len(c0))
    mean1 = (sum(p[0] for p in c1) / len(c1), sum(p[1] for p in c1) / len(c1))
    print("Means distance       :", round(euclidean(mean0, mean1), 2))
    print("Well separated       :", euclidean(mean0, mean1) > 3)

    # single linkage on chain
    chain = [(i, 0) for i in range(10)]
    lab_chain = hierarchical_clustering(chain, n_clusters=3, linkage="single")
    print()
    print("Chain 3 clusters     :", len(set(lab_chain)) == 3)
