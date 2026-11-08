import math
import random
import statistics
from collections import Counter


def mean(xs):
    return sum(xs) / len(xs)


def median(xs):
    s = sorted(xs)
    mid = len(s) // 2
    return s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2


def modes(xs):
    counts = Counter(xs)
    top = max(counts.values())
    return sorted(k for k, v in counts.items() if v == top)


def variance(xs, sample=False):
    m = mean(xs)
    d = len(xs) - (1 if sample else 0)
    return sum((x - m) ** 2 for x in xs) / d


def stdev(xs, sample=False):
    return math.sqrt(variance(xs, sample))


def percentile(xs, p):
    s = sorted(xs)
    k = (len(s) - 1) * p / 100
    lo, hi = math.floor(k), math.ceil(k)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def covariance(xs, ys):
    mx, my = mean(xs), mean(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (len(xs) - 1)


def correlation(xs, ys):
    return covariance(xs, ys) / (stdev(xs, True) * stdev(ys, True))


def linear_regression(xs, ys):
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx
    intercept = my - slope * mx
    ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, ys))
    ss_tot = sum((y - my) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot else 1.0
    return slope, intercept, r2


def zscores(xs):
    m, s = mean(xs), stdev(xs)
    return [(x - m) / s for x in xs]


def iqr_outliers(xs):
    q1, q3 = percentile(xs, 25), percentile(xs, 75)
    iqr = q3 - q1
    low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    return sorted(x for x in xs if x < low or x > high)


def moving_average(xs, k):
    return [sum(xs[i:i + k]) / k for i in range(len(xs) - k + 1)]


def histogram(xs, bins):
    lo, hi = min(xs), max(xs)
    width = (hi - lo) / bins or 1
    counts = [0] * bins
    for x in xs:
        counts[min(int((x - lo) / width), bins - 1)] += 1
    return counts


def same(a, b):
    return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)


if __name__ == "__main__":
    rng = random.Random(21)
    data = [round(rng.gauss(50, 12), 2) for _ in range(500)] + [150, -40]

    print("Count              :", len(data))
    print("Mean               :", round(mean(data), 4), same(mean(data), statistics.mean(data)))
    print("Median             :", median(data), median(data) == statistics.median(data))
    print("Population variance:", round(variance(data), 4), same(variance(data), statistics.pvariance(data)))
    print("Sample variance    :", round(variance(data, True), 4), same(variance(data, True), statistics.variance(data)))
    print("Population stdev   :", round(stdev(data), 4), same(stdev(data), statistics.pstdev(data)))
    print("Sample stdev       :", round(stdev(data, True), 4), same(stdev(data, True), statistics.stdev(data)))

    quartiles = statistics.quantiles(data, n=4, method="inclusive")
    mine = [percentile(data, p) for p in (25, 50, 75)]
    print("Quartiles          :", [round(q, 3) for q in mine])
    print("Quartiles match    :", all(same(a, b) for a, b in zip(mine, quartiles)))

    print()
    sample = [1, 2, 2, 3, 3, 4]
    print("Modes of", sample, ":", modes(sample))
    print("Modes match module :", modes(sample) == sorted(statistics.multimode(sample)))
    print("Single mode        :", modes([5, 1, 5, 2, 5]))

    print()
    outliers = iqr_outliers(data)
    print("Outliers           :", outliers)
    print("Planted outliers found:", 150 in outliers and -40 in outliers)
    z = zscores(data)
    print("Z-score mean is 0  :", same(mean(z), 0))
    print("Z-score stdev is 1 :", same(stdev(z), 1))

    print()
    xs = list(range(100))
    ys = [3 * x + 7 + rng.gauss(0, 5) for x in xs]
    slope, intercept, r2 = linear_regression(xs, ys)
    ref = statistics.linear_regression(xs, ys)
    print("Slope / intercept  :", round(slope, 4), round(intercept, 4))
    print("R squared          :", round(r2, 4))
    print("Regression matches module:", same(slope, ref.slope) and same(intercept, ref.intercept))
    print("Correlation        :", round(correlation(xs, ys), 4))
    print("Correlation matches module:", same(correlation(xs, ys), statistics.correlation(xs, ys)))

    exact_slope, exact_intercept, exact_r2 = linear_regression([1, 2, 3, 4, 5], [3, 5, 7, 9, 11])
    print("Perfect line       :", round(exact_slope, 6), round(exact_intercept, 6), round(exact_r2, 6))
    print("Perfect line is y = 2x + 1:", same(exact_slope, 2) and same(exact_intercept, 1) and same(exact_r2, 1))
    print("Negative correlation:", round(correlation([1, 2, 3, 4], [8, 6, 4, 2]), 6))

    print()
    print("Moving average     :", moving_average(list(range(1, 11)), 3))
    print("Moving average ok  :", moving_average(list(range(1, 11)), 3) == [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0])

    counts = histogram(data, 8)
    low = min(data)
    width = (max(data) - low) / 8
    print()
    print("Histogram")
    for i, c in enumerate(counts):
        print(f"  {low + i * width:>8.1f}  {c:>4}  {'*' * (c // 4)}")
    print("Histogram adds up  :", sum(counts) == len(data))
