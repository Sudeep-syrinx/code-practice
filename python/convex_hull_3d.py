import random
import math


class Point3D:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

    def subtract(self, other):
        return Point3D(self.x - other.x, self.y - other.y, self.z - other.z)

    def cross(self, other):
        return Point3D(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x
        )

    def dot(self, other):
        return self.x * other.x + self.y * other.y + self.z * other.z

    def norm(self):
        return math.sqrt(self.dot(self))

    def __repr__(self):
        return f"({self.x:.1f}, {self.y:.1f}, {self.z:.1f})"


class Face:
    def __init__(self, a, b, c):
        self.a, self.b, self.c = a, b, c
        normal = b.subtract(a).cross(c.subtract(a))
        if normal.dot(a) > 0:
            self.a, self.b = self.b, self.a
            normal = b.subtract(a).cross(c.subtract(a))
        self.normal = normal

    def outside(self, p):
        return self.normal.dot(p.subtract(self.a)) > 1e-9

    def __repr__(self):
        return f"Face[{self.a}, {self.b}, {self.c}]"


def initial_hull(points):
    p0 = min(points, key=lambda p: p.x)
    p1 = max(points, key=lambda p: p.x)
    if abs(p0.x - p1.x) < 1e-9:
        p1 = max(points, key=lambda p: p.y)
    p2 = max(points, key=lambda p: p.subtract(p0).cross(p1.subtract(p0)).norm())
    
    hull = [Face(p0, p1, p2)]
    for p in points:
        if p not in (p0, p1, p2):
            visible = [f for f in hull if f.outside(p)]
            if visible:
                edges = []
                for f in visible:
                    for e in [(f.a, f.b), (f.b, f.c), (f.c, f.a)]:
                        edges.append(e)
                boundary = []
                for e in edges:
                    if (e[1], e[0]) not in edges:
                        boundary.append(e)
                hull = [f for f in hull if f not in visible]
                for e in boundary:
                    hull.append(Face(e[0], e[1], p))
    return hull


if __name__ == "__main__":
    rng = random.Random(42)
    pts = [Point3D(rng.uniform(-10, 10), rng.uniform(-10, 10), rng.uniform(-10, 10)) for _ in range(50)]
    
    points = pts[:4]
    hull = initial_hull(points)
    print(f"Initial points: {len(points)}")
    print(f"Initial faces: {len(hull)}")
    
    print("\nFaces normal lengths (all should be > 0):")
    for f in hull:
        print(f"  Normal norm: {f.normal.norm():.4f}")
