from functools import cmp_to_key

def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def graham_scan(points):
    points = sorted(set(map(tuple, points)))
    if len(points) <= 1:
        return points
    # lower hull
    lower = []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    # upper hull
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]

def jarvis_march(points):
    points = list(set(map(tuple, points)))
    n = len(points)
    if n <= 2:
        return points
    # find leftmost
    start = min(points)
    hull = []
    current = start
    while True:
        hull.append(current)
        next_p = points[0]
        for p in points[1:]:
            c = cross(current, next_p, p)
            if next_p == current or c > 0 or (c == 0 and dist(current, p) > dist(current, next_p)):
                next_p = p
        current = next_p
        if current == start:
            break
    return hull

def dist(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

def point_in_hull(point, hull):
    n = len(hull)
    if n < 3:
        return False
    for i in range(n):
        if cross(hull[i], hull[(i + 1) % n], point) < 0:
            return False
    return True

def polygon_area(hull):
    area = 0
    n = len(hull)
    for i in range(n):
        j = (i + 1) % n
        area += hull[i][0] * hull[j][1]
        area -= hull[j][0] * hull[i][1]
    return abs(area) / 2

if __name__ == "__main__":
    points = [
        (0, 0), (1, 1), (2, 2), (3, 1), (3, 3),
        (2, 4), (1, 3), (0, 2), (4, 0), (5, 2),
        (4, 3), (2, 0), (1, 0), (3, 4), (0, 4),
    ]
    print("Input points:", len(points))
    print()

    hull1 = graham_scan(points)
    print("Graham scan hull:")
    for p in hull1:
        print(" ", p)
    print("Hull size:", len(hull1))
    print("Area:", polygon_area(hull1))
    print()

    hull2 = jarvis_march(points)
    print("Jarvis march hull:")
    for p in hull2:
        print(" ", p)
    print("Hull size:", len(hull2))
    print()

    print("Same hull points (ignoring order):", set(hull1) == set(hull2))
    print()

    test_points = [(2, 2), (1, 1), (4, 4), (0, 1), (5, 5)]
    print("Point in hull tests:")
    for p in test_points:
        print(f"  {p}: {point_in_hull(p, hull1)}")
    print()

    # Collinear case
    collinear = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]
    print("Collinear points hull:", graham_scan(collinear))
    print("Single point:", graham_scan([(5, 5)]))
    print("Two points:", graham_scan([(0, 0), (1, 1)]))
