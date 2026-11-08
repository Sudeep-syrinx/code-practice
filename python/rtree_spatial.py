import math

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class RTree:
    def __init__(self):
        self.root = []
        self.children = []

    def insert(self, point):
        if not self.root:
            self.root = [Point(point.x, point.y), Point(point.x, point.y)]
            self.children.append([point])
        else:
            if point.x < self.root[0].x: self.root[0].x = point.x
            if point.y < self.root[0].y: self.root[0].y = point.y
            if point.x > self.root[1].x: self.root[1].x = point.x
            if point.y > self.root[1].y: self.root[1].y = point.y
            self.children.append([point])

    def search(self, target):
        results = []
        for child in self.children:
            for pt in child:
                if pt.x == target.x and pt.y == target.y:
                    results.append(pt)
        return results

if __name__ == "__main__":
    rtree = RTree()
    points = [(1, 2), (3, 4), (5, 6), (-1, -2)]
    for x, y in points:
        rtree.insert(Point(x, y))
    
    search_pt = Point(3, 4)
    results = rtree.search(search_pt)
    print("Search for (3,4) found:", len(results), "result(s)")
    print("Bounding Box Min:", rtree.root[0].x, rtree.root[0].y)
    print("Bounding Box Max:", rtree.root[1].x, rtree.root[1].y)
    print("Test passed:", len(results) == 1)
