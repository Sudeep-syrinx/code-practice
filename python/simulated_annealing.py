import math
import random


def simulated_annealing(
    cost_fn,
    neighbor_fn,
    initial,
    t0=100.0,
    t_min=1e-3,
    alpha=0.995,
    max_iter=10000,
):
    current = initial
    current_cost = cost_fn(current)
    best = current
    best_cost = current_cost
    t = t0
    history = [current_cost]

    for _ in range(max_iter):
        if t < t_min:
            break
        candidate = neighbor_fn(current)
        cand_cost = cost_fn(candidate)
        delta = cand_cost - current_cost
        if delta < 0 or random.random() < math.exp(-delta / t):
            current = candidate
            current_cost = cand_cost
            if current_cost < best_cost:
                best = current
                best_cost = current_cost
        t *= alpha
        history.append(best_cost)
    return best, best_cost, history


def tsp_cost(tour, dist):
    n = len(tour)
    return sum(dist[tour[i]][tour[(i + 1) % n]] for i in range(n))


def tsp_neighbor(tour):
    a, b = sorted(random.sample(range(len(tour)), 2))
    new = tour[:]
    new[a : b + 1] = reversed(new[a : b + 1])
    return new


def make_distance(n, seed=0):
    rng = random.Random(seed)
    pts = [(rng.random(), rng.random()) for _ in range(n)]
    dist = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])
            dist[i][j] = dist[j][i] = d
    return dist, pts


if __name__ == "__main__":
    random.seed(7)
    n = 15
    dist, pts = make_distance(n, seed=1)
    initial = list(range(n))
    random.shuffle(initial)

    best, cost, hist = simulated_annealing(
        lambda t: tsp_cost(t, dist),
        tsp_neighbor,
        initial,
        t0=10.0,
        alpha=0.997,
        max_iter=8000,
    )
    print("TSP cities           :", n)
    print("Initial cost         :", round(tsp_cost(initial, dist), 3))
    print("Best cost            :", round(cost, 3))
    print("Improvement          :", round(tsp_cost(initial, dist) - cost, 3))
    print("Tour length          :", len(best))
    print("Valid permutation    :", sorted(best) == list(range(n)))

    # sphere function
    def sphere(x):
        return sum(v * v for v in x)

    def sphere_neighbor(x):
        y = x[:]
        i = random.randrange(len(y))
        y[i] += random.gauss(0, 0.3)
        return y

    start = [random.uniform(-5, 5) for _ in range(5)]
    sol, val, _ = simulated_annealing(sphere, sphere_neighbor, start, t0=5.0, alpha=0.99, max_iter=3000)
    print()
    print("Sphere start cost    :", round(sphere(start), 4))
    print("Sphere final cost    :", round(val, 4))
    print("Close to zero        :", val < 0.5)
