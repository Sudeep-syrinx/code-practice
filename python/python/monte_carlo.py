import math
import random


def estimate_pi(samples):
    inside = 0
    for _ in range(samples):
        x = random.random()
        y = random.random()
        if x * x + y * y <= 1.0:
            inside += 1
    return 4.0 * inside / samples


def estimate_integral(f, a, b, samples):
    total = 0.0
    for _ in range(samples):
        x = a + (b - a) * random.random()
        total += f(x)
    return (b - a) * total / samples


def birthday_collision(people, trials=5000):
    hits = 0
    for _ in range(trials):
        days = [random.randint(1, 365) for _ in range(people)]
        if len(days) != len(set(days)):
            hits += 1
    return hits / trials


def coupon_collector(n, trials=2000):
    total = 0
    for _ in range(trials):
        seen = set()
        steps = 0
        while len(seen) < n:
            seen.add(random.randint(0, n - 1))
            steps += 1
        total += steps
    return total / trials


def random_walk_2d(steps, trials=3000):
    distances = []
    for _ in range(trials):
        x = y = 0
        for _ in range(steps):
            d = random.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
            x += d[0]
            y += d[1]
        distances.append(math.hypot(x, y))
    return sum(distances) / len(distances)


if __name__ == "__main__":
    random.seed(2026)

    pi_est = estimate_pi(200_000)
    print("Pi estimate (200k)     :", round(pi_est, 5))
    print("Error from real pi     :", round(abs(pi_est - math.pi), 5))

    # integral of x^2 from 0 to 1 = 1/3
    integral = estimate_integral(lambda x: x * x, 0, 1, 100_000)
    print("Integral x^2 [0,1]     :", round(integral, 5))
    print("Close to 1/3           :", abs(integral - 1 / 3) < 0.01)

    # birthday paradox
    p23 = birthday_collision(23)
    p50 = birthday_collision(50)
    print("Birthday 23 people     :", round(p23, 3))
    print("Birthday 50 people     :", round(p50, 3))
    print("P(23) roughly 0.5      :", 0.4 < p23 < 0.6)

    # coupon collector E[T] ≈ n * H_n
    n = 20
    avg = coupon_collector(n)
    harmonic = sum(1 / i for i in range(1, n + 1))
    expected = n * harmonic
    print("Coupon n=20 average    :", round(avg, 1))
    print("Theoretical            :", round(expected, 1))
    print("Relative error < 10%   :", abs(avg - expected) / expected < 0.1)

    # 2D random walk
    dist = random_walk_2d(100)
    print("Avg distance after 100 :", round(dist, 2))
    print("Roughly near sqrt(100) :", 7 < dist < 13)
