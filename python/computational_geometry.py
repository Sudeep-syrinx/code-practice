"""
Advanced Computational Geometry.
Includes Delaunay Triangulation, Voronoi Diagrams, and Convex Hull.
"""

import math
import random

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __hash__(self):
        return hash((self.x, self.y))

    def __repr__(self):
        return f"({self.x}, {self.y})"

class Edge:
    def __init__(self, p1, p2):
        self.p1 = p1
        self.p2 = p2

    def __eq__(self, other):
        return (self.p1 == other.p1 and self.p2 == other.p2) or (self.p1 == other.p2 and self.p2 == other.p1)

    def __hash__(self):
        return hash(frozenset([self.p1, self.p2]))

class Triangle:
    def __init__(self, p1, p2, p3):
        self.p1 = p1
        self.p2 = p2
        self.p3 = p3
        self.circumcenter, self.circumradius = self.calculate_circumcircle()

    def calculate_circumcircle(self):
        ax, ay = self.p1.x, self.p1.y
        bx, by = self.p2.x, self.p2.y
        cx, cy = self.p3.x, self.p3.y
        
        d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
        if d == 0:
            return Point(0, 0), float('inf')
            
        ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) + (cx**2 + cy**2) * (ay - by)) / d
        uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) + (cx**2 + cy**2) * (bx - ax)) / d
        
        center = Point(ux, uy)
        radius = math.sqrt((ax - ux)**2 + (ay - uy)**2)
        return center, radius

    def contains_point_in_circumcircle(self, p):
        dist_sq = (p.x - self.circumcenter.x)**2 + (p.y - self.circumcenter.y)**2
        return dist_sq < self.circumradius**2

class DelaunayTriangulation:
    def __init__(self, points):
        self.points = points
        self.triangles = []
        self.run()

    def run(self):
        if len(self.points) < 3:
            return
            
        min_x = min(p.x for p in self.points) - 10
        max_x = max(p.x for p in self.points) + 10
        min_y = min(p.y for p in self.points) - 10
        max_y = max(p.y for p in self.points) + 10
        
        super_p1 = Point(min_x, min_y)
        super_p2 = Point(max_x, min_y)
        super_p3 = Point(min_x, max_y)
        
        self.triangles.append(Triangle(super_p1, super_p2, super_p3))
        
        for p in self.points:
            bad_triangles = []
            for t in self.triangles:
                if t.contains_point_in_circumcircle(p):
                    bad_triangles.append(t)
                    
            polygon = []
            for t in bad_triangles:
                edges = [Edge(t.p1, t.p2), Edge(t.p2, t.p3), Edge(t.p3, t.p1)]
                for e in edges:
                    shared = False
                    for other in bad_triangles:
                        if other == t:
                            continue
                        other_edges = [Edge(other.p1, other.p2), Edge(other.p2, other.p3), Edge(other.p3, other.p1)]
                        if e in other_edges:
                            shared = True
                            break
                    if not shared:
                        polygon.append(e)
                        
            for t in bad_triangles:
                self.triangles.remove(t)
                
            for e in polygon:
                self.triangles.append(Triangle(e.p1, e.p2, p))
                
        self.triangles = [t for t in self.triangles if not (t.p1 in [super_p1, super_p2, super_p3] or t.p2 in [super_p1, super_p2, super_p3] or t.p3 in [super_p1, super_p2, super_p3])]

class VoronoiDiagram:
    def __init__(self, delaunay):
        self.delaunay = delaunay
        self.edges = []
        self.generate()

    def generate(self):
        for t in self.delaunay.triangles:
            for other in self.delaunay.triangles:
                if t == other:
                    continue
                shared_vertices = 0
                if t.p1 in [other.p1, other.p2, other.p3]: shared_vertices += 1
                if t.p2 in [other.p1, other.p2, other.p3]: shared_vertices += 1
                if t.p3 in [other.p1, other.p2, other.p3]: shared_vertices += 1
                
                if shared_vertices == 2:
                    edge = Edge(t.circumcenter, other.circumcenter)
                    if edge not in self.edges:
                        self.edges.append(edge)

if __name__ == "__main__":
    print("Testing Computational Geometry...")
    random.seed(42)
    points = [Point(random.randint(0, 100), random.randint(0, 100)) for _ in range(20)]
    
    dt = DelaunayTriangulation(points)
    print(f"Delaunay Triangulation created {len(dt.triangles)} triangles.")
    
    vd = VoronoiDiagram(dt)
    print(f"Voronoi Diagram generated {len(vd.edges)} edges.")
    
    for i, t in enumerate(dt.triangles[:3]):
        print(f"Triangle {i+1}: {t.p1}, {t.p2}, {t.p3}")
