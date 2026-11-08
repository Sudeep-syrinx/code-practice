import heapq
import random
from itertools import combinations


def merge_intervals(intervals):
    result = []
    for s, e in sorted(intervals):
        if result and s <= result[-1][1]:
            result[-1][1] = max(result[-1][1], e)
        else:
            result.append([s, e])
    return [tuple(r) for r in result]


def min_meeting_rooms(meetings):
    heap = []
    for s, e in sorted(meetings):
        if heap and heap[0] <= s:
            heapq.heapreplace(heap, e)
        else:
            heapq.heappush(heap, e)
    return len(heap)


def max_overlap(intervals):
    events = []
    for s, e in intervals:
        events.append((s, 1))
        events.append((e, -1))
    events.sort(key=lambda ev: (ev[0], ev[1]))
    current = best = 0
    when = None
    for t, delta in events:
        current += delta
        if current > best:
            best = current
            when = t
    return best, when


def intersect(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        lo = max(a[i][0], b[j][0])
        hi = min(a[i][1], b[j][1])
        if lo <= hi:
            out.append((lo, hi))
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return out


def free_slots(busy, day_start, day_end):
    gaps = []
    cursor = day_start
    for s, e in merge_intervals(busy):
        if s > cursor:
            gaps.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < day_end:
        gaps.append((cursor, day_end))
    return gaps


def common_free(schedules, day_start, day_end, duration):
    busy = [slot for person in schedules.values() for slot in person]
    return [(s, e) for s, e in free_slots(busy, day_start, day_end) if e - s >= duration]


def skyline(buildings):
    events = []
    for left, right, height in buildings:
        events.append((left, -height, right))
        events.append((right, 0, 0))
    events.sort()
    result = []
    heap = [(0, float("inf"))]
    for x, neg_height, right in events:
        while heap[0][1] <= x:
            heapq.heappop(heap)
        if neg_height:
            heapq.heappush(heap, (neg_height, right))
        height = -heap[0][0]
        if not result or result[-1][1] != height:
            result.append((x, height))
    return result


def max_non_overlapping(intervals):
    count = 0
    last_end = float("-inf")
    for s, e in sorted(intervals, key=lambda i: (i[1], i[0])):
        if s >= last_end:
            count += 1
            last_end = e
    return count


def overlaps(a, b):
    return a[0] < b[1] and b[0] < a[1]


def brute_best_selection(intervals):
    for size in range(len(intervals), 0, -1):
        for combo in combinations(intervals, size):
            if all(not overlaps(a, b) for a, b in combinations(combo, 2)):
                return size
    return 0


def covered(intervals):
    points = set()
    for s, e in intervals:
        points.update(range(s, e))
    return points


def height_at(buildings, x):
    return max((h for l, r, h in buildings if l <= x < r), default=0)


def skyline_value(points, x):
    value = 0
    for px, h in points:
        if px <= x:
            value = h
        else:
            break
    return value


def hhmm(minutes):
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


if __name__ == "__main__":
    print("Merge              :", merge_intervals([(1, 3), (2, 6), (8, 10), (15, 18), (17, 20), (6, 7)]))
    print("Touching merge     :", merge_intervals([(1, 4), (4, 5)]))
    print("Insert (4,8)       :", merge_intervals([(1, 2), (3, 5), (6, 7), (8, 10), (12, 16)] + [(4, 8)]))
    print("Empty              :", merge_intervals([]))

    rng = random.Random(14)
    merge_ok = rooms_ok = pick_ok = sky_ok = True
    for _ in range(300):
        items = []
        for _ in range(rng.randint(1, 12)):
            s = rng.randint(0, 50)
            items.append((s, s + rng.randint(1, 10)))
        merged = merge_intervals(items)
        if covered(merged) != covered(items):
            merge_ok = False
        if any(merged[i + 1][0] <= merged[i][1] for i in range(len(merged) - 1)):
            merge_ok = False
        brute_rooms = max(sum(1 for s, e in items if s <= t < e) for t in range(0, 70))
        if min_meeting_rooms(items) != brute_rooms:
            rooms_ok = False
    for _ in range(150):
        items = []
        for _ in range(rng.randint(1, 8)):
            s = rng.randint(0, 20)
            items.append((s, s + rng.randint(1, 6)))
        if max_non_overlapping(items) != brute_best_selection(items):
            pick_ok = False
    for _ in range(200):
        blocks = []
        for _ in range(rng.randint(1, 8)):
            left = rng.randint(0, 30)
            blocks.append((left, left + rng.randint(1, 10), rng.randint(1, 15)))
        points = skyline(blocks)
        for x in range(0, 45):
            if skyline_value(points, x) != height_at(blocks, x):
                sky_ok = False

    print()
    print("Merge matches brute force      :", merge_ok)
    print("Meeting rooms match brute force:", rooms_ok)
    print("Greedy selection is optimal    :", pick_ok)
    print("Skyline matches brute force    :", sky_ok)

    print()
    meetings = [(0, 30), (5, 10), (15, 20), (10, 15), (25, 40)]
    print("Rooms needed       :", min_meeting_rooms(meetings))
    print("Back to back       :", min_meeting_rooms([(0, 10), (10, 20), (20, 30)]))
    print("Peak overlap       :", max_overlap(meetings))
    print("Max meetings to attend:", max_non_overlapping(meetings))

    print()
    towers = [(2, 9, 10), (3, 7, 15), (5, 12, 12), (15, 20, 10), (19, 24, 8)]
    expected = [(2, 10), (3, 15), (7, 12), (12, 0), (15, 10), (20, 8), (24, 0)]
    print("Skyline            :", skyline(towers))
    print("Known answer       :", skyline(towers) == expected)

    print()
    first = [(0, 2), (5, 10), (13, 23), (24, 25)]
    second = [(1, 5), (8, 12), (15, 24), (25, 26)]
    print("Intersections      :", intersect(first, second))
    print("Known answer       :", intersect(first, second) == [(1, 2), (5, 5), (8, 10), (15, 23), (24, 24), (25, 25)])

    print()
    schedules = {
        "asha": [(540, 600), (780, 840)],
        "ravi": [(570, 630), (900, 960)],
        "meena": [(480, 540), (660, 720), (840, 900)],
    }
    gaps = free_slots([s for person in schedules.values() for s in person], 480, 1080)
    print("Common free time")
    for s, e in gaps:
        print(f"  {hhmm(s)} - {hhmm(e)}  ({e - s} min)")
    hour_slots = common_free(schedules, 480, 1080, 60)
    print("One hour or longer :", [(hhmm(s), hhmm(e)) for s, e in hour_slots])
    print("Known answer       :", hour_slots == [(720, 780), (960, 1080)])
