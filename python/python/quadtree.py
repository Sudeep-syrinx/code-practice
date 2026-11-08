class QuadNode:
    def __init__(self, x, y, w, h, capacity=4, depth=0, max_depth=8):
        self.x, self.y, self.w, self.h = x, y, w, h
        self.capacity = capacity
        self.depth = depth
        self.max_depth = max_depth
        self.points = []
        self.children = None  # NW, NE, SW, SE

    def contains(self, px, py):
        return self.x <= px < self.x + self.w and self.y <= py < self.y + self.h

    def intersects(self, rx, ry, rw, rh):
        return not (rx + rw <= self.x or rx >= self.x + self.w or
                    ry + rh <= self.y or ry >= self.y + self.h)

    def subdivide(self):
        hw, hh = self.w / 2, self.h / 2
        d = self.depth + 1
        self.children = [
            QuadNode(self.x, self.y, hw, hh, self.capacity, d, self.max_depth),          # NW
            QuadNode(self.x + hw, self.y, hw, hh, self.capacity, d, self.max_depth),     # NE
            QuadNode(self.x, self.y + hh, hw, hh, self.capacity, d, self.max_depth),     # SW
            QuadNode(self.x + hw, self.y + hh, hw, hh, self.capacity, d, self.max_depth) # SE
        ]

    def insert(self, point):
        px, py = point[0], point[1]
        if not self.contains(px, py):
            return False
        if self.children is None:
            self.points.append(point)
            if len(self.points) > self.capacity and self.depth < self.max_depth:
                self.subdivide()
                old = self.points
                self.points = []
                for p in old:
                    self._insert_into_children(p)
            return True
        return self._insert_into_children(point)

    def _insert_into_children(self, point):
        for child in self.children:
            if child.insert(point):
                return True
        return False

    def query_range(self, rx, ry, rw, rh):
        result = []
        if not self.intersects(rx, ry, rw, rh):
            return result
        for p in self.points:
            if rx <= p[0] < rx + rw and ry <= p[1] < ry + rh:
                result.append(p)
        if self.children:
            for child in self.children:
                result.extend(child.query_range(rx, ry, rw, rh))
        return result

    def count_nodes(self):
        total = 1
        if self.children:
            for c in self.children:
                total += c.count_nodes()
        return total

class QuadTree:
    def __init__(self, width, height, capacity=4):
        self.root = QuadNode(0, 0, width, height, capacity)
        self.size = 0

    def insert(self, x, y, data=None):
        point = (x, y, data) if data is not None else (x, y)
        if self.root.insert(point):
            self.size += 1
            return True
        return False

    def query(self, x, y, w, h):
        return self.root.query_range(x, y, w, h)

    def count_nodes(self):
        return self.root.count_nodes()

if __name__ == "__main__":
    import random
    random.seed(42)
    qt = QuadTree(1000, 1000, capacity=4)
    points = [(random.uniform(0, 1000), random.uniform(0, 1000)) for _ in range(500)]
    for x, y in points:
        qt.insert(x, y)
    print("Inserted          :", qt.size)
    print("Tree nodes        :", qt.count_nodes())
    print()

    region = qt.query(200, 200, 100, 100)
    print("Points in [200,200,100,100]:", len(region))
    # brute force check
    brute = [p for p in points if 200 <= p[0] < 300 and 200 <= p[1] < 300]
    print("Brute force count :", len(brute))
    print("Match             :", len(region) == len(brute))
    print()

    region2 = qt.query(0, 0, 1000, 1000)
    print("Full area query   :", len(region2))
    print("Should equal size :", len(region2) == qt.size)
    print()

    # empty region
    empty = qt.query(5000, 5000, 10, 10)
    print("Empty region      :", len(empty))
    print()

    # many small queries
    total = 0
    for _ in range(100):
        x = random.uniform(0, 900)
        y = random.uniform(0, 900)
        total += len(qt.query(x, y, 50, 50))
    print("100 random 50x50 queries total points found:", total)
