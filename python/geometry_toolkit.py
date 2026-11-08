import math
import random


def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def convex_hull(points):
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def polygon_area(poly):
    total = 0
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2


def perimeter(poly):
    return sum(dist(poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))


def centroid(poly):
    area2 = cx = cy = 0
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        c = x1 * y2 - x2 * y1
        area2 += c
        cx += (x1 + x2) * c
        cy += (y1 + y2) * c
    return cx / (3 * area2), cy / (3 * area2)


def on_segment(p, a, b):
    return (
        cross(a, b, p) == 0
        and min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
        and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])
    )


def point_in_polygon(p, poly):
    n = len(poly)
    inside = False
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if on_segment(p, a, b):
            return "boundary"
        if (a[1] > p[1]) != (b[1] > p[1]):
            x_at = a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if x_at > p[0]:
                inside = not inside
    return "inside" if inside else "outside"


def convex_class(p, poly):
    signs = [cross(poly[i], poly[(i + 1) % len(poly)], p) for i in range(len(poly))]
    if min(signs) > 0:
        return "inside"
    if min(signs) < 0:
        return "outside"
    return "boundary"


def orientation(a, b, c):
    v = cross(a, b, c)
    return (v > 0) - (v < 0)


def segments_intersect(p1, p2, p3, p4):
    o1 = orientation(p1, p2, p3)
    o2 = orientation(p1, p2, p4)
    o3 = orientation(p3, p4, p1)
    o4 = orientation(p3, p4, p2)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and on_segment(p3, p1, p2):
        return True
    if o2 == 0 and on_segment(p4, p1, p2):
        return True
    if o3 == 0 and on_segment(p1, p3, p4):
        return True
    if o4 == 0 and on_segment(p2, p3, p4):
        return True
    return False


def point_segment_distance(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return dist(p, a)
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))
    return dist(p, (a[0] + t * dx, a[1] + t * dy))


def closest_pair_brute(points):
    best = (float("inf"), None, None)
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            d = dist(points[i], points[j])
            if d < best[0]:
                best = (d, points[i], points[j])
    return best


def closest_pair(points):
    pts = sorted(points)

    def solve(lo, hi):
        if hi - lo <= 3:
            return closest_pair_brute(pts[lo:hi])
        mid = (lo + hi) // 2
        mid_x = pts[mid][0]
        left = solve(lo, mid)
        right = solve(mid, hi)
        best = min(left, right, key=lambda r: r[0])
        strip = sorted(
            (p for p in pts[lo:hi] if abs(p[0] - mid_x) < best[0]),
            key=lambda p: p[1],
        )
        for i in range(len(strip)):
            for j in range(i + 1, len(strip)):
                if strip[j][1] - strip[i][1] >= best[0]:
                    break
                d = dist(strip[i], strip[j])
                if d < best[0]:
                    best = (d, strip[i], strip[j])
        return best

    return solve(0, len(pts))


if __name__ == "__main__":
    rng = random.Random(8)
    points = [(rng.randint(0, 40), rng.randint(0, 40)) for _ in range(60)]
    hull = convex_hull(points)
    n = len(hull)
    print("Points             :", len(points))
    print("Hull vertices      :", n)
    print("Hull               :", hull)
    print("Hull area          :", polygon_area(hull))
    print("Hull perimeter     :", round(perimeter(hull), 3))
    turns = [cross(hull[i], hull[(i + 1) % n], hull[(i + 2) % n]) for i in range(n)]
    print("Counter-clockwise  :", all(t > 0 for t in turns))
    print("No point outside   :", all(point_in_polygon(p, hull) != "outside" for p in points))

    boundary = sum(
        math.gcd(abs(hull[(i + 1) % n][0] - hull[i][0]), abs(hull[(i + 1) % n][1] - hull[i][1]))
        for i in range(n)
    )
    interior = sum(
        1 for x in range(41) for y in range(41) if point_in_polygon((x, y), hull) == "inside"
    )
    print("Boundary / interior:", boundary, interior)
    print("Pick's theorem     :", polygon_area(hull) == interior + boundary / 2 - 1)

    agree = True
    for _ in range(500):
        p = (rng.randint(-5, 45), rng.randint(-5, 45))
        if point_in_polygon(p, hull) != convex_class(p, hull):
            agree = False
    print("Ray casting agrees with half-plane test:", agree)

    print()
    notch = [(0, 0), (10, 0), (10, 10), (5, 4), (0, 10)]
    print("Notched polygon area :", polygon_area(notch))
    for p, expected in [((5, 8), "outside"), ((5, 2), "inside"), ((1, 9), "outside"),
                        ((1, 5), "inside"), ((0, 5), "boundary"), ((5, 4), "boundary")]:
        result = point_in_polygon(p, notch)
        print(f"  {p!s:<8} {result:<9} {result == expected}")

    square = [(0, 0), (10, 0), (10, 10), (0, 10)]
    print()
    print("Square area / perimeter:", polygon_area(square), perimeter(square))
    print("Square centroid        :", centroid(square))
    print("Triangle area          :", polygon_area([(0, 0), (6, 0), (0, 8)]))

    print()
    cases = [
        (((0, 0), (4, 4), (0, 4), (4, 0)), True),
        (((0, 0), (1, 1), (2, 2), (3, 3)), False),
        (((0, 0), (2, 2), (1, 1), (3, 3)), True),
        (((0, 0), (4, 0), (2, 0), (2, 5)), True),
        (((0, 0), (4, 0), (0, 1), (4, 1)), False),
        (((0, 0), (4, 0), (5, 0), (9, 0)), False),
    ]
    for pts, expected in cases:
        result = segments_intersect(*pts)
        print(f"  {str(pts):<40} {result!s:<6} {result == expected}")

    print()
    print("Point to segment 1 :", point_segment_distance((5, 5), (0, 0), (10, 0)))
    print("Point to segment 2 :", point_segment_distance((-3, 4), (0, 0), (10, 0)))
    print("Degenerate segment :", point_segment_distance((3, 4), (0, 0), (0, 0)))

    matches = True
    for trial in range(20):
        cloud = [(rng.randint(0, 1000), rng.randint(0, 1000)) for _ in range(80)]
        fast = closest_pair(cloud)
        slow = closest_pair_brute(cloud)
        if not math.isclose(fast[0], slow[0]):
            matches = False
    print("Closest pair matches brute force:", matches)
    big = [(rng.randint(0, 100000), rng.randint(0, 100000)) for _ in range(2000)]
    d, a, b = closest_pair(big)
    print("Closest of 2000 points :", round(d, 3), a, b)
