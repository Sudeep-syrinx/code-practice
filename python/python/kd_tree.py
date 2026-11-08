import math
import random


class KDNode:
    def __init__(self, point, axis, left=None, right=None):
        self.point = point
        self.axis = axis
        self.left = left
        self.right = right


class KDTree:
    def __init__(self, points):
        self.k = len(points[0]) if points else 0
        self.root = self._build(points, 0)

    def _build(self, points, depth):
        if not points:
            return None
        axis = depth % self.k
        points = sorted(points, key=lambda p: p[axis])
        median = len(points) // 2
        return KDNode(
            points[median],
            axis,
            self._build(points[:median], depth + 1),
            self._build(points[median + 1 :], depth + 1),
        )

    def nearest(self, target, n=1):
        best = []

        def dist(a, b):
            return sum((x - y) ** 2 for x, y in zip(a, b))

        def search(node):
            if node is None:
                return
            d = dist(node.point, target)
            if len(best) < n:
                best.append((d, node.point))
                best.sort()
            elif d < best[-1][0]:
                best[-1] = (d, node.point)
                best.sort()

            axis = node.axis
            diff = target[axis] - node.point[axis]
            near, far = (node.left, node.right) if diff < 0 else (node.right, node.left)
            search(near)
            if len(best) < n or diff * diff < best[-1][0]:
                search(far)

        search(self.root)
        return [p for _, p in best]


def brute_nearest(points, target, n=1):
    scored = sorted(points, key=lambda p: sum((a - b) ** 2 for a, b in zip(p, target)))
    return scored[:n]


if __name__ == "__main__":
    pts = [(2, 3), (5, 4), (9, 6), (4, 7), (8, 1), (7, 2)]
    tree = KDTree(pts)
    q = (9, 2)
    print("Query point          :", q)
    print("Nearest              :", tree.nearest(q))
    print("Brute force          :", brute_nearest(pts, q))
    print("Match                :", tree.nearest(q) == brute_nearest(pts, q))

    print()
    print("3 nearest            :", tree.nearest(q, 3))

    rng = random.Random(42)
    ok = True
    for _ in range(60):
        dim = rng.randint(2, 4)
        cloud = [tuple(rng.uniform(-50, 50) for _ in range(dim)) for _ in range(80)]
        tree = KDTree(cloud)
        target = tuple(rng.uniform(-50, 50) for _ in range(dim))
        k = rng.randint(1, 5)
        if tree.nearest(target, k) != brute_nearest(cloud, target, k):
            ok = False
    print("60 random trials ok  :", ok)

    empty = KDTree([])
    print("Empty tree safe      :", empty.nearest((0, 0)) == [])
